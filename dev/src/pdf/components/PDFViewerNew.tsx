import { Document, Page, Thumbnail } from "react-pdf"
import { usePDF } from "../PDFProvider"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { PDFOptions } from "./Options"
import Loader from "./Loader"
import { useVirtualizer } from "@tanstack/react-virtual"
import type { PDFDocumentProxy } from "pdfjs-dist"
import "./pdf.css"
import type { PageDimensions } from "../interface/PDFInterface"
import type { PageCallback } from "react-pdf/dist/shared/types.js"
import { useThrottle } from "../hooks/use-throttle"


interface props {
  src: string
}
export default function PDFViewer(
  { src }: props
) {
  const {
    thumbnailScale,
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

  const capturePageImage = useCallback((pageNumber: number, canvas: HTMLCanvasElement) => {
    const imageURL = canvas.toDataURL("image/png", 1)
    setPageCache((prev) => {
      if (!prev.has(pageNumber)) {
        prev.set(pageNumber, imageURL)
      }
      return prev
    })
  }, [])

  const onDocumentLoadSuccess = useCallback(
    async (pdf: PDFDocumentProxy) => {
      setNumberOfPages(pdf.numPages)
      const dimensionsMap = new Map<number, PageDimensions>();
      const pagesToPreload = Math.min(3, pdf.numPages); // Preload first 3 pages

      for (let i = 1; i <= pagesToPreload; i++) {
        try {
          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale: 1 });
          // console.log({ viewport, page })
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
  const thumbnailVirtualizerContainer = useRef<HTMLDivElement>(null)
  const getPageEstimatedSize = useCallback((index: number) => {
    const pageNumber = index + 1;
    const dimensions = dimension.pageDimensions.get(pageNumber);
    if (dimensions) {
      return (dimensions.height * zoomCSS);
    }
    return (dimension.defaultPageHeight * zoomCSS)
  }, [zoomCSS, dimension.defaultPageHeight, dimension.pageDimensions])

  const getThumbnailEstimatedSize = useCallback((index: number) => {
    const pageNumber = index + 1;
    const dimensions = dimension.pageDimensions.get(pageNumber)
    if (dimensions) {
      return (dimensions.height * thumbnailScale)
    }
    return (dimension.defaultPageHeight * thumbnailScale)
  }, [dimension.defaultPageHeight, dimension.pageDimensions])

  const pageVirtualizer = useVirtualizer(
    {
      count: numberOfPages,
      getScrollElement: () => pageVirtualizerContainer.current,
      estimateSize: getPageEstimatedSize,
      enabled: !pdfDocument.isDocumentLoading,
      overscan: 2,
      gap: 20,
    }
  )
  const thumbnailVirtualizer = useVirtualizer({
    count: numberOfPages,
    getScrollElement: () => thumbnailVirtualizerContainer.current,
    enabled: !pdfDocument.isDocumentLoading,
    estimateSize: getThumbnailEstimatedSize,
    gap: 10
  })

  const onPageRenderSuccess = useCallback((data: PageCallback, pageNumber: number) => {

    // console.log(
    //   {
    //     pageNumber,
    //     message: "Rendered Canvas should be visible",
    //   }
    // )
    const virtualElement: HTMLDivElement | null = document.querySelector(`#virtual-page-item-${pageNumber}`)
    if (virtualElement) {
      const canvasElement = virtualElement.querySelector("canvas")
      if (canvasElement) {
        setTimeout(() => {
          capturePageImage(pageNumber, canvasElement)
        }, 100)
      }
      const pageElement = virtualElement.querySelector(".pdf-react-pdf-page")
      if (pageElement) {
        pageElement.classList.remove("invisible")
      }
    }
  }, [capturePageImage, pageCache])

  const onPageLoadSuccess = useCallback((page: PageCallback, pageNumber: number) => {
    // console.log(
    //   {
    //     pageNumber,
    //     message: "Loaded.Canvas should no be visible",
    //   }
    // )
    const viewport = page.getViewport({ scale: 1 });
    if (dimension.setPageDimensions && dimension.pageDimensions) {
      const newMap = new Map(dimension.pageDimensions);
      newMap.set(pageNumber, {
        width: viewport.width,
        height: viewport.height,
      });
      dimension.setPageDimensions(newMap);
    }
    const virtualElement: HTMLDivElement | null = document.querySelector(`#virtual-page-item-${pageNumber}`)
    if (virtualElement) {
      const pageElement = virtualElement.querySelector(".pdf-react-pdf-page")
      if (pageElement) {
        pageElement.classList.add("invisible")
      }
    }
  }, [])
  const handleScroll = useThrottle(() => {
    if (pdfDocument.isDocumentLoading) return;
    const scrollOffset = pageVirtualizer.scrollOffset || 0
    const items = pageVirtualizer
      .getVirtualItems()
      .map((x) => ({ pageNumber: x.index + 1, offset: Math.abs(x.start - scrollOffset) }))
      .sort((a, b) => a.offset - b.offset);
    if (items.length == 0) return;
    const currentPage = items[0].pageNumber
    setCurrentPage(currentPage)
  }, 100)

  const handleScrollNoThrottle = ()=>{
    console.log("No throttle scrolling")
    if (pdfDocument.isDocumentLoading) return;
    const scrollOffset = pageVirtualizer.scrollOffset || 0
    const items = pageVirtualizer
      .getVirtualItems()
      .map((x) => ({ pageNumber: x.index + 1, offset: Math.abs(x.start - scrollOffset) }))
      .sort((a, b) => a.offset - b.offset);
    if (items.length == 0) return;
    const currentPage = items[0].pageNumber
    setCurrentPage(currentPage)
  }

  const timeOutRef = useRef<number>(null)

  useEffect(() => {
    pageVirtualizer.measure()
  }, [zoomCSS, dimension.defaultPageHeight, pageVirtualizer])

  useEffect(() => {
    thumbnailVirtualizer.measure()
  }, [thumbnailVirtualizer, dimension.defaultPageHeight])

  useEffect(() => {
    handleScrollNoThrottle()
  }, [pageVirtualizer.scrollOffset, pdfDocument.isDocumentLoading])
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
        ref={thumbnailVirtualizerContainer}
        className="pdf-thumbnail-virtualizer-container"
      >
        <div
          style={{
            height: `${thumbnailVirtualizer.getTotalSize()}px`
          }}
          className="pdf-thumbnail-virtualizer-container-innerbox"
        >
          {
            thumbnailVirtualizer.getVirtualItems().map(
              (thumbnailVirtualItem) => {
                const pageNumber = thumbnailVirtualItem.index + 1
                const cachedImage = pageCache.get(pageNumber)
                const thumbnailWidth = (dimension.pageDimensions.get(pageNumber)?.width || dimension.defaultPageWidth) * thumbnailScale
                return (
                  <div
                    key={thumbnailVirtualItem.key}
                    style={{
                      width: `${thumbnailWidth}px`,
                      height: `${thumbnailVirtualItem.size}px`,
                      transform: `translateY(${thumbnailVirtualItem.start}px) translateX(-50%)`,
                      overflow: "hidden"
                    }}
                    className="pdf-thumbnail-virtual-item"
                    id={`virtual-thumbnail-item-${thumbnailVirtualItem.index + 1}`}
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
                    <Thumbnail
                      pageNumber={pageNumber}
                      scale={thumbnailScale}
                      onClick={() => {
                        pageVirtualizer.scrollToIndex(pageNumber - 1)
                      }}
                    />
                  </div>
                )
              }
            )
          }
        </div>
      </div>
      <div
        ref={pageVirtualizerContainer}
        className="pdf-page-virtualizer-container"
        // onScroll={(() => {
        //   timeOutRef.current = setTimeout(() => {
        //     const scrollOffset = pageVirtualizer.scrollOffset || 0
        //     const items = pageVirtualizer.getVirtualItems().map((x) => ({ pageNumber: x.index + 1, offset: Math.abs(x.start - scrollOffset) }))
        //       .sort((a, b) => a.offset - b.offset);
        //     console.log({ items })
        //     const currentPage = items[0].pageNumber
        //     setCurrentPage(currentPage)
        //   }, 10)
        // })}

        // onScrollEnd={() => {
        //   setTimeout(() => {
        //     const scrollOffset = pageVirtualizer.scrollOffset || 0
        //     const items = pageVirtualizer.getVirtualItems().map((x) => ({ pageNumber: x.index + 1, offset: Math.abs(x.start - scrollOffset) }))
        //       .sort((a, b) => a.offset - b.offset);
        //     console.log({ items })
        //     const currentPage = items[0].pageNumber
        //     setCurrentPage(currentPage)
        //   }, 0)
        // }}
      >
        <div
          style={{
            height: `${pageVirtualizer.getTotalSize()}px`
          }}
          className="pdf-page-virtualizer-container-innerbox"
        >
          {
            pageVirtualizer.getVirtualItems().map(
              (pageVirtualItem) => {
                const pageNumber = pageVirtualItem.index + 1;
                const cachedImage = pageCache.get(pageNumber)
                const pageWidth = (dimension.pageDimensions.get(pageNumber)?.width || dimension.defaultPageWidth) * zoomCSS
                return (
                  <div
                    key={pageVirtualItem.key}
                    style={{
                      width: `${pageWidth}px`,
                      height: `${pageVirtualItem.size}px`,
                      transform: `translateY(${pageVirtualItem.start}px) translateX(-50%)`,
                      overflow: "hidden"
                    }}
                    className="pdf-page-virtual-item"
                    id={`virtual-page-item-${pageVirtualItem.index + 1}`}
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
                      onRenderSuccess={(data: PageCallback) => {
                        onPageRenderSuccess(data, pageNumber)
                      }}
                      onLoadSuccess={(page) => {
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