import { Document, Page, Thumbnail } from "react-pdf"
import { usePDF } from "../PDFProvider"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { PDFOptions } from "./Options"
import Loader from "./Loader"
import { useVirtualizer } from "@tanstack/react-virtual"
import type { PDFDocumentProxy } from "pdfjs-dist"
import "./pdf.css"
import type { CachedPage, CachedThumbnail, PageDimensions, RotationValue } from "../interface/PDFInterface"
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
    setSidebarOpen,
    sidebarOpen,
    zoom,
    zoomCSS,
    currentPage,
    layout,
    setCurrentPage,
    setNumberOfPages,
    zoomStep,
    onCommitZoom,
    shouldPageBeScrolled,
    setShouldPageBeScrolled
  } = usePDF()
  const pdfSource = useMemo(() => src, [])

  const [cachedPageList, setCachedPageList] = useState<Map<number, CachedPage[]>>(new Map())
  const [cachedThumbnailList, setCachedThumbnailList] = useState<Map<number, CachedThumbnail>>(new Map())

  const [pageCache, setPageCache] = useState<Map<number, string>>(new Map())

  const capturePageImage = useCallback((pageNumber: number, canvas: HTMLCanvasElement) => {
    const imageURL = canvas.toDataURL("image/png", 1)
    setPageCache((prev) => {
      if (!prev.has(pageNumber)) {
        prev.set(pageNumber, imageURL)
      }
      return prev
    })

    setCachedPageList(
      (prev) => {
        if (!prev.has(pageNumber)) {
          prev.set(pageNumber, [
            {
              imageUrl: imageURL,
              rotation: layout.rotate,
              scale: zoom
            }
          ])
        } else {
          const list = prev.get(pageNumber)!
          const alreadyExists = (list.find(x => x.scale == zoom) != undefined)
          if (!alreadyExists) {
            list.push({
              imageUrl: imageURL,
              rotation: layout.rotate,
              scale: zoom
            })
            prev.set(
              pageNumber, list
            )
          }
        }
        return prev
      }
    )
  }, [layout.rotate, zoom])

  const captureThumbnailImage = useCallback((pageNumber: number, canvas: HTMLCanvasElement) => {
    const imageURL = canvas.toDataURL("image/png", 1)
    setCachedThumbnailList(
      (prev) => {
        if (!prev.has(pageNumber)) {
          prev.set(pageNumber,
            {
              imageUrl: imageURL
            }
          )
        }
        return prev
      }
    )
  }, [])

  const getBestCachedPage = useCallback((pageNumber: number) => {
    const list = cachedPageList.get(pageNumber)
    list?.sort((a, b) => Math.abs(a.rotation - b.rotation)).sort((a, b) => b.scale - a.scale)
    if (list && list.length != 0) {
      return list[0]
    }
  }, [cachedPageList])

  const onDocumentLoadSuccess = useCallback(
    async (pdf: PDFDocumentProxy) => {
      setNumberOfPages(pdf.numPages)
      const dimensionsMap = new Map<number, PageDimensions>();
      const pagesToPreload = Math.min(3, pdf.numPages); // Preload first 3 pages

      for (let i = 1; i <= pagesToPreload; i++) {
        try {
          const page = await pdf.getPage(i);
          console.log({ page })
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
    if (layout.rotate == 90 || layout.rotate == 270) {
      if (dimensions) return (dimensions.width * zoomCSS);
      else return (dimension.defaultPageWidth * zoomCSS);
    } else {
      if (dimensions) return (dimensions.height * zoomCSS);
      else return (dimension.defaultPageHeight * zoomCSS)
    }
  }, [zoomCSS, dimension.defaultPageHeight, dimension.pageDimensions, layout.rotate])

  const getThumbnailEstimatedSize = useCallback((index: number) => {
    const pageNumber = index + 1;
    const dimensions = dimension.pageDimensions.get(pageNumber)
    if (dimensions) {
      return (dimensions.height * thumbnailScale) + 20
    }
    return (dimension.defaultPageHeight * thumbnailScale) + 20
  }, [dimension.defaultPageHeight, dimension.pageDimensions])

  const pageVirtualizer = useVirtualizer(
    {
      count: numberOfPages,
      getScrollElement: () => pageVirtualizerContainer.current,
      estimateSize: getPageEstimatedSize,
      enabled: !pdfDocument.isDocumentLoading,
      overscan: 2,
      gap: 20,
      paddingStart: 10,
    }
  )

  const thumbnailVirtualizer = useVirtualizer({
    count: numberOfPages,
    getScrollElement: () => thumbnailVirtualizerContainer.current,
    enabled: !pdfDocument.isDocumentLoading,
    estimateSize: getThumbnailEstimatedSize,
    gap: 10,
    paddingStart: 5,
    
  })

  const onThumbnailRenderSuccess = useCallback((data: PageCallback, pageNumber: number) => {
    const virtualElement: HTMLDivElement | null = document.querySelector(`#virtual-thumbnail-item-${pageNumber}`)
    if (virtualElement) {
      const canvasElement = virtualElement.querySelector("canvas")
      if (canvasElement) {
        setTimeout(() => {
          captureThumbnailImage(pageNumber, canvasElement)
        }, 100)
      }
    }
  }, [])

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

  const handleScrollNoThrottle = () => {
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

  useEffect(() => {
    const prevScrollOffset = pageVirtualizer.scrollOffset
    const prevTotalHeight = pageVirtualizer.getTotalSize()
    pageVirtualizer.measure()
    const newTotalHeight = pageVirtualizer.getTotalSize()
    const newScrollOffset = (prevScrollOffset! / prevTotalHeight) * newTotalHeight
    pageVirtualizer.scrollToOffset(newScrollOffset)
    console.log("page is remeasured")
  }, [zoomCSS, dimension.defaultPageHeight, layout.rotate])

  useEffect(() => {
    thumbnailVirtualizer.measure()
  }, [thumbnailVirtualizer, dimension.defaultPageHeight])

  useEffect(() => {
    handleScrollNoThrottle()
  }, [pageVirtualizer.scrollOffset, pdfDocument.isDocumentLoading, zoom, layout.rotate])

  useEffect(()=>{
    // callback for scroll update
    if(shouldPageBeScrolled){
      const index = currentPage - 1
      pageVirtualizer.scrollToIndex(index)
      setShouldPageBeScrolled(false)
    }
  },[shouldPageBeScrolled])
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

      {/* thumbnail sidebar */}
      <div
        ref={thumbnailVirtualizerContainer}
        className="pdf-thumbnail-virtualizer-container minimal-scrollbar "
        style={{
          left: sidebarOpen ? "0px" : `-${thumbnailVirtualizerContainer.current?.offsetWidth || 0}px`,
          transition: "left 0.1s ease-in",
          height: `${layout.remainingHeightVh}vh`
        }}
      >
        <div style={{ position: "sticky", top: 0, zIndex: 10, backgroundColor: "inherit", padding: "5px 20px" }}>
          <nav className="flex gap-10">
            <div>
              <button className="no-style" onClick={() => { setSidebarOpen(prev => !prev) }} >
                <img src="/svg/thumbnail.svg" alt="page view" style={{ height: "16px", marginBlock: "auto" }} />
              </button>
            </div>
            <div>
              <button className="no-style" onClick={() => { setSidebarOpen(prev => !prev) }} >
                <img src="/svg/ContentList.svg" alt="content View" style={{ height: "20px", marginBlock: "auto" }} />
              </button>
            </div>
          </nav>
        </div>
        <div
          style={{
            height: `${thumbnailVirtualizer.getTotalSize()}px`
          }}
          className="pdf-thumbnail-virtualizer-container-innerbox "
        >
          {
            thumbnailVirtualizer.getVirtualItems().map(
              (thumbnailVirtualItem) => {
                const pageIndex = thumbnailVirtualItem.index
                const pageNumber = pageIndex + 1
                const cachedImage = cachedThumbnailList.get(pageNumber)
                const thumbnailWidth = (dimension.pageDimensions.get(pageNumber)?.width || dimension.defaultPageWidth) * thumbnailScale
                return (
                  <div
                    key={thumbnailVirtualItem.key}
                    style={{
                      width: `${thumbnailWidth + 20}px`,
                      height: `${thumbnailVirtualItem.size}px`,
                      transform: `translateY(${thumbnailVirtualItem.start}px) translateX(-50%)`,
                      overflow: "hidden"
                    }}
                    className={
                      `pdf-thumbnail-virtual-item ${currentPage == pageNumber && "pdf-thumbnail-isCurrentPage"}`
                    }
                    id={`virtual-thumbnail-item-${pageNumber}`}
                    onClick={() => {
                      const index = pageNumber - 1
                      pageVirtualizer.scrollToIndex(index)
                    }}
                  >
                    <div
                      className="pdf-thumbnail-virtual-item-innerbox"
                    >
                      {
                        cachedImage &&
                        <div className="pdf-thumbnail-cached-image-container">
                          <img
                            src={cachedImage.imageUrl}
                            alt={`Page ${pageNumber} cached`}
                            className="pdf-thumbnail-cached-image"
                          />
                        </div>
                      }
                      <Thumbnail
                        pageNumber={pageNumber}
                        scale={thumbnailScale}
                        onRenderSuccess={(data) => onThumbnailRenderSuccess(data, pageNumber)}
                      />
                      <div className="pdf-thumbnail-page-number-container">
                        <span className="pdf-thumbnail-page-number">
                          {pageNumber}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              }
            )
          }
        </div>
        <div className="" style={{
          position: "absolute",
          bottom: 0,
          float: "right",
          height: "100%",
          width: 10,
          cursor: "ew-resize",
        }} onMouseDown={(e) => {
          e.preventDefault();
          const startX = e.clientX;
          const startWidth = thumbnailVirtualizerContainer.current?.offsetWidth || 0;

          const onMouseMove = (moveEvent: MouseEvent) => {
            const newWidth = startWidth + (moveEvent.clientX - startX);
            thumbnailVirtualizerContainer.current!.style.width = `${newWidth}px`;
          };

          const onMouseUp = () => {
            document.removeEventListener("mousemove", onMouseMove);
            document.removeEventListener("mouseup", onMouseUp);
          };

          document.addEventListener("mousemove", onMouseMove);
          document.addEventListener("mouseup", onMouseUp);
        }}>

        </div>
      </div>

      <div
        ref={pageVirtualizerContainer}
        className="pdf-page-virtualizer-container"
        onWheel={(e) => {
          if(e.ctrlKey || e.metaKey) {
            e.preventDefault();
            const delta = e.deltaY > 0 ? zoomStep : -zoomStep;
            const newZoom = Math.min(Math.max(zoomCSS + delta, 0.1), 3);
            setZoomCSS(newZoom);
            onCommitZoom(newZoom);
          }

        }
        }
        style={{
          height: `${layout.remainingHeightVh}vh`
        }}
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
                const cachedImage = getBestCachedPage(pageNumber)

                let pageWidth = (dimension.pageDimensions.get(pageNumber)?.width || dimension.defaultPageWidth) * zoomCSS

                if (layout.rotate == 90 || layout.rotate == 270) {
                  pageWidth = (dimension.pageDimensions.get(pageNumber)?.height || dimension.defaultPageHeight) * zoomCSS
                }

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
                      <div
                        className="pdf-cached-image-container"
                        style={{
                          width: "100%",
                          height: "100%",
                          display: "flex",
                          justifyContent: "center",
                          alignItems: "center",
                          overflow: "hidden"
                        }}
                      >
                        <img
                          src={cachedImage.imageUrl}
                          alt={`Page ${pageNumber} cached`}
                          className="pdf-cached-image"
                          style={{
                            transform: `rotate(${((layout.rotate - cachedImage.rotation) % 360 + 360) % 360}deg)scale(${(1 / cachedImage.scale) * zoom
                              })`,
                            transformOrigin: "center center",
                            objectFit: "cover",
                          }}
                        />
                      </div>

                    }
                    <Page
                      pageNumber={pageNumber}
                      scale={zoom}
                      rotate={layout.rotate}
                      renderTextLayer={false}
                      renderAnnotationLayer={false}
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