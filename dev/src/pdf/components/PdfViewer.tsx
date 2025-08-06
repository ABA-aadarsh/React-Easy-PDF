import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Document, Page } from "react-pdf";
import { PDFOptions } from "./Options";
import Loader from "./Loader";
import type { CachedPageData, PageDimensions, PDFViewerProps } from "../interface/PDFInterface";
import { usePDF } from "../PDFProvider";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { PageCallback } from "react-pdf/dist/shared/types.js";
import type { PDFDocumentProxy, PDFPageProxy } from "pdfjs-dist";
import "../pdf.css"


export default function PDFViewer({ src }: PDFViewerProps) {
    const [renderingPages, setRenderingPages] = useState<Set<number>>(new Set());
    const [pageCache, setPageCache] = useState<Map<number, CachedPageData>>(new Map());

    const { pdfDocument: document, numberOfPages = 0, zoom, dimension, zoomCSS, error, setNumberOfPages } = usePDF();
    const containerRef = useRef<HTMLDivElement>(null);
    const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map());

    const getPageEstimatedSize = useCallback((index: number) => {

        const pageNum = index + 1;
        const dimensions = dimension.pageDimensions && dimension.pageDimensions.get(pageNum);
        if (dimensions) {
            return (dimensions.height * zoomCSS) + 20; // 20px margin
        }
        return dimension.defaultPageHeight && (dimension.defaultPageHeight * zoomCSS + 20);
    }, [dimension.pageDimensions, zoomCSS, dimension.defaultPageHeight]);

    const virtualizer = useVirtualizer({
        count: numberOfPages,
        getScrollElement: () => containerRef.current,
        estimateSize: getPageEstimatedSize as () => number,
        enabled: !document.isDocumentLoading,
        overscan: 2,
    });

    const pdfSource = useMemo(() => {
        return src.file || src.url || src.path;
    }, [src]);

    const shouldShowCached = useCallback((pageNumber: number) => {
        const isRendering = renderingPages.has(pageNumber);
        const hasCache = pageCache.get(pageNumber)
        return isRendering && hasCache;
    }, [renderingPages, pageCache]);

    // const getBestCachedVersion = useCallback((pageNumber: number) => {
    //     const pageKeys = Array.from(pageCache.keys()).filter(key => 
    //         key.startsWith(`page-${pageNumber}-`)
    //     );

    //     if (pageKeys.length === 0) return null;

    //     // Find the cached version with scale closest to current zoom
    //     let bestKey = pageKeys[0];
    //     let bestScale = parseFloat(bestKey.split('-scale-')[1]);
    //     let bestDiff = Math.abs(bestScale - zoomCSS);

    //     for (const key of pageKeys) {
    //         const scale = parseFloat(key.split('-scale-')[1]);
    //         const diff = Math.abs(scale - zoomCSS);
    //         if (diff < bestDiff) {
    //             bestDiff = diff;
    //             bestKey = key;
    //             bestScale = scale;
    //         }
    //     }

    //     return pageCache.get(bestKey) || null;
    // }, [pageCache, zoomCSS]);

    const onDocumentLoadError = useCallback((err: Error) => {
        console.error('PDF load error:', err);
        error.setError && error.setError('Failed to load PDF. Please check the file and try again.');
        document.setIsDocumentLoading(false);
    }, []);

    const onDocumentLoadSuccess = useCallback(async (pdf: PDFDocumentProxy) => {

        try {

            setNumberOfPages && setNumberOfPages(pdf.numPages);
            error.setError && error.setError(null);

            // Get dimensions for first few pages to establish better estimates
            const dimensionsMap = new Map<number, PageDimensions>();
            const pagesToPreload = Math.min(3, pdf.numPages); // Preload first 3 pages

            for (let i = 1; i <= pagesToPreload; i++) {
                try {
                    const page = await pdf.getPage(i);
                    const viewport = page.getViewport({ scale: 1 });
                    console.log({ viewport, page })
                    dimensionsMap.set(i, {
                        width: viewport.width,
                        height: viewport.height,
                    });
                } catch (pageError) {
                    console.warn(`Failed to load dimensions for page ${i}:`, pageError);
                }
            }

            dimension.setPageDimensions && dimension.setPageDimensions(dimensionsMap);

            // Set default height based on first page or fallback
            const firstPageDimensions = dimensionsMap.get(1);
            if (firstPageDimensions) {
                dimension.setDefaultPageHeight && dimension.setDefaultPageHeight(firstPageDimensions.height);
                dimension.setDefaultPageWidth && dimension.setDefaultPageWidth(firstPageDimensions.width)
            }

            document.setIsDocumentLoading(false);
        } catch (err) {
            console.error('Error loading PDF:', err);
            error.setError && error.setError('Failed to load PDF document');
            document.setIsDocumentLoading(false);
        }
    }, []);

    const onPageLoadSuccess = useCallback((page: PDFPageProxy, pageNumber: number) => {
        const viewport = page.getViewport({ scale: 1 });
        if (dimension.setPageDimensions && dimension.pageDimensions) {
            const newMap = new Map(dimension.pageDimensions);
            newMap.set(pageNumber, {
                width: viewport.width,
                height: viewport.height,
            });
            dimension.setPageDimensions(newMap);
        }
        console.log({ viewport, p: "Page loaded: " + pageNumber });
    }, [dimension]);
    const capturePageImage = useCallback((pageNumber: number, canvas: HTMLCanvasElement) => {
        try {
            const imageUrl = canvas.toDataURL('image/png', 0.8);
            const cacheKey = pageNumber;

            setPageCache(prev => {
                const newCache = new Map(prev);
                newCache.set(cacheKey, {
                    imageUrl,
                    scale: 1,
                    timestamp: Date.now()
                });

                return newCache;
            });
        } catch (error) {
            console.warn(`Failed to cache page ${pageNumber}:`, error);
        }
    }, []);

    const onPageRenderSuccess = useCallback((data: PageCallback, pageNumber: number) => {
        console.log({ event: "Page Rendered", data, pageNumber });

        // Remove from rendering set
        setRenderingPages(prev => {
            const newSet = new Set(prev);
            newSet.delete(pageNumber);
            return newSet;
        });

        // Find canvas and capture it
        const pageElement = pageRefs.current.get(pageNumber);
        if (pageElement) {
            const canvas = pageElement.querySelector('canvas');
            if (canvas) {
                // Small delay to ensure canvas is fully rendered
                setTimeout(() => {
                    capturePageImage(pageNumber, canvas);
                }, 100);
            }
        }
    }, [capturePageImage, zoomCSS]);

    useEffect(() => {
        console.log("Virtualizer should re-render now")
        virtualizer.measure();
    }, [zoomCSS, virtualizer, dimension.defaultPageHeight]);


    return (
        <div>
            <Document
                file={pdfSource}
                options={PDFOptions}
                loading={<Loader isLoading={true} progress={document.loadingProgress?.loaded} />}
                onLoadProgress={document.setLoadingProgress}
                onLoadSuccess={onDocumentLoadSuccess}
                onLoadError={onDocumentLoadError}
                className={"pdf-react-pdf-document"}
            >
                <div
                    ref={containerRef}
                    className="pdf-container"
                    style={{
                        height: `90vh`, // Subtract header height + padding
                        width: '100%',
                        display: "grid",
                        gridTemplateColumns: '1fr',
                        gridAutoRows: 'auto',
                        gridGap: '10px',
                        placeItems: 'center',
                        overflow: 'auto',
                        borderRadius: '8px',
                    }}
                >
                    {document.isDocumentLoading ? (
                        <Loader isLoading={true} progress={document.loadingProgress?.loaded} />
                    ) : (
                        <div
                            style={{
                                height: `${virtualizer.getTotalSize()}px`,
                                width: '100%',
                                position: 'relative',
                            }}
                        >
                            {virtualizer.getVirtualItems().map((virtualItem) => {
                                const pageNumber = virtualItem.index + 1;
                                const pageWidth = (dimension.pageDimensions?.get(pageNumber)?.width || dimension.defaultPageWidth) * zoomCSS;
                                const pageHeight = (dimension.pageDimensions?.get(pageNumber)?.height || dimension.defaultPageHeight) * zoomCSS;
                                const showCached = shouldShowCached(pageNumber);
                                const cachedData = pageCache.get(pageNumber);

                                return (
                                    <div
                                        key={virtualItem.key}
                                        ref={(el) => {
                                            if (el) {
                                                pageRefs.current.set(pageNumber, el);
                                            }
                                        }}
                                        style={{
                                            position: 'absolute',
                                            top: 10,
                                            left: '50%',
                                            height: `${virtualItem.size}px`,
                                            width: `${pageWidth}px`,
                                            transform: `translateY(${virtualItem.start}px) translateX(-50%)`,
                                            backgroundColor: "red",
                                            border: "1px solid yellow",
                                            display: "flex",
                                            justifyContent: "center"
                                        }}
                                    >
                                        <div
                                            className="pdf-page-wrapper"
                                            style={{
                                                width: `${pageWidth}px`,
                                                height: `${pageHeight}px`,
                                                position: 'relative'
                                            }}
                                        >
                                            {/* Cached image overlay */}
                                            {cachedData && (
                                                <div
                                                    style={{
                                                        position: 'absolute',
                                                        top: 0,
                                                        left: 0,
                                                        width: '100%',
                                                        height: '100%',
                                                        zIndex: 10,
                                                        backgroundColor: 'white',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center'
                                                    }}
                                                >
                                                    <img
                                                        src={cachedData.imageUrl}
                                                        alt={`Page ${pageNumber} cached`}
                                                        style={{
                                                            maxWidth: '100%',
                                                            maxHeight: '100%',
                                                            objectFit: 'contain',
                                                            transform: `scale(${zoomCSS / cachedData.scale})`,
                                                            transformOrigin: 'center'
                                                        }}
                                                    />
                                                </div>
                                            )}

                                            {/* Actual PDF page */}
                                            <Page
                                                pageNumber={pageNumber}
                                                scale={zoom}
                                                onLoadSuccess={(page) => onPageLoadSuccess(page, pageNumber)}
                                                className={`pdf-page ${showCached ? "pdf-hide" : ""}`}
                                                renderTextLayer={true}
                                                renderAnnotationLayer={true}
                                                onRenderSuccess={(data: PageCallback) => onPageRenderSuccess(data, pageNumber)}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </Document>
        </div>
    );
}