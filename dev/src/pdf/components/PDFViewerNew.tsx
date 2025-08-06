import { Document, Page } from "react-pdf"
import { usePDF } from "../PDFProvider"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { PDFOptions } from "./Options"
import Loader from "./Loader"
import { useVirtualizer } from "@tanstack/react-virtual"
import type { PDFDocumentProxy } from "pdfjs-dist"
import "./pdf.css"
import type { PageDimensions } from "../interface/PDFInterface"
import type { PageCallback } from "react-pdf/dist/shared/types.js"


interface props {
  src: string
}
export default function PDFViewer(
  { src }: props
) {
  const {
    pdfDocument,
    numberOfPages,
    dimension,
    error,
    setZoom,
    setZoomCSS,
    zoom,
    zoomCSS,
    currentPage,
    setCurrentPage,
    setNumberOfPages,
    zoomStep
  } = usePDF()
  const pdfSource = useMemo(() => src, [])

  const [pageCache, setPageCache] = useState<Map<number, string>>(new Map())

  const capturePageImage = useCallback((pageNumber:number, canvas: HTMLCanvasElement)=>{
    const imageURL = canvas.toDataURL("image/png", 1)
    setPageCache((prev)=>{
      if(!prev.has(pageNumber)){
        prev.set(pageNumber, imageURL)
      }
      return prev
    })
  },[])

  const onDocumentLoadSuccess = useCallback(
    async (pdf: PDFDocumentProxy) => {
      setNumberOfPages(pdf.numPages)
      const dimensionsMap = new Map<number, PageDimensions>();
      const pagesToPreload = Math.min(3, pdf.numPages); // Preload first 3 pages

      for (let i = 1; i <= pagesToPreload; i++) {
        try {
          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale: 1 });
          console.log({viewport, page})
          dimensionsMap.set(i, {
            width: viewport.width,
            height: viewport.height,
          });
        } catch (pageError) {
          console.warn(`Failed to load dimensions for page ${i}:`, pageError);
        }
      }

      dimension.setPageDimensions(dimensionsMap);
      
      // Set default height based on first page or fallback
      const firstPageDimensions = dimensionsMap.get(1);
      if (firstPageDimensions) {
        dimension.setDefaultPageHeight(firstPageDimensions.height);
        dimension.setDefaultPageWidth(firstPageDimensions.width)
      }

      pdfDocument.setIsDocumentLoading(false);
    },
  [])
  const onDocumentLoadError = () => {

  }

  const pageVirtualizerContainer = useRef<HTMLDivElement>(null)
  const getPageEstimatedSize = useCallback((index: number) => {
    const pageNumber = index + 1;
    const dimensions = dimension.pageDimensions.get(pageNumber);
    if (dimensions) {
      return (dimensions.height * zoomCSS) + 20; // 20px margin
    }
    return (dimension.defaultPageHeight * zoomCSS + 20)
  }, [zoomCSS, dimension.defaultPageHeight, dimension.pageDimensions])

  const pageVirtualizer = useVirtualizer(
    {
      count: numberOfPages,
      getScrollElement: () => pageVirtualizerContainer.current,
      estimateSize: getPageEstimatedSize,
      enabled: !pdfDocument.isDocumentLoading,
      overscan: 2
    }
  )

  const onPageRenderSuccess = useCallback((data: PageCallback, pageNumber: number)=>{

    console.log(
      {
        pageNumber,
        message: "Rendered Canvas should be visible",
      }
    )
    const virtualElement: HTMLDivElement | null = document.querySelector(`#virtual-item-${pageNumber}`)
    if(virtualElement){
      const canvasElement = virtualElement.querySelector("canvas")
      if(canvasElement){
        setTimeout(()=>{
          capturePageImage(pageNumber, canvasElement)
        }, 100)
      }
      const pageElement = virtualElement.querySelector(".pdf-react-pdf-page")
      if(pageElement){
        pageElement.classList.remove("invisible")
      }
    }
  },[capturePageImage,pageCache])

  const onPageLoadSuccess = useCallback((page: PageCallback, pageNumber: number)=>{
    console.log(
      {
        pageNumber,
        message: "Loaded.Canvas should no be visible",
      }
    )
    const virtualElement: HTMLDivElement | null = document.querySelector(`#virtual-item-${pageNumber}`)
    if(virtualElement){
      const pageElement = virtualElement.querySelector(".pdf-react-pdf-page")
      if(pageElement){
        pageElement.classList.add("invisible")
      }
    }
  },[])

  useEffect(()=>{
    pageVirtualizer.measure()
  },[zoomCSS, dimension.defaultPageHeight, pageVirtualizer])
  return (
    <Document
      file={pdfSource}
      options={PDFOptions}
      loading={
        <Loader 
          isLoading={true} 
          progress={pdfDocument.loadingProgress?.loaded}
        />
      }
      onLoadProgress={pdfDocument.setLoadingProgress}
      onLoadSuccess={onDocumentLoadSuccess}
      onLoadError={onDocumentLoadError}
      className={"pdf-react-pdf-pdfDocument"}
    >
      <div
        ref={pageVirtualizerContainer}
        className="pdf-page-virtualizer-container"
      >
        <div
          style={{
            height: `${pageVirtualizer.getTotalSize()}px`
          }}
          className="pdf-page-virtualizer-container-innerbox"
        >
          {
            pageVirtualizer.getVirtualItems().map(
              (virtualItem) => {
                const pageNumber = virtualItem.index + 1;
                const cachedImage = pageCache.get(pageNumber)
                const pageWidth = (dimension.pageDimensions.get(pageNumber)?.width || dimension.defaultPageWidth) * zoomCSS
                return (
                  <div
                    key={virtualItem.key}
                    style={{
                      width: `${pageWidth}px`,
                      height: `${virtualItem.size}px`,
                      transform: `translateY(${virtualItem.start}px) translateX(-50%)`
                    }}
                    className="pdf-virtual-item"
                    id={`virtual-item-${virtualItem.index+1}`}
                  >
                    {
                      cachedImage && 
                      <div className="pdf-cached-image-container">
                        <img
                          src={cachedImage}
                          alt={`Page ${pageNumber} cached`}
                          className="pdf-cached-image"
                        />
                      </div>
                    }
                    <Page
                      pageNumber={pageNumber}
                      scale={zoom}
                      renderTextLayer={true}
                      renderAnnotationLayer={true}
                      className={"pdf-react-pdf-page"}
                      onRenderSuccess={(data: PageCallback)=>{
                        onPageRenderSuccess(data, pageNumber)
                      }}
                      onLoadSuccess={(page)=>{
                        onPageLoadSuccess(page, pageNumber)
                      }}
                    />
                  </div>
                )
              }
            )
          }
        </div>
      </div>
    </Document>
  )
}