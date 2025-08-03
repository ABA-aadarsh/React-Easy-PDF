import { useMemo, useRef, useState, useCallback, useEffect } from "react"
import { pdfjs, Document, Page } from 'react-pdf';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import type { DocumentInitParameters } from "pdfjs-dist/types/src/display/api";
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import "./pdf.css"
import { useVirtualizer } from "@tanstack/react-virtual";
import { usePDF } from "./PDFProvider";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

const PDFOptions: Partial<Omit<DocumentInitParameters, "data" | "range" | "url">> = {
  cMapUrl: '/cmaps/',
  standardFontDataUrl: '/standard_fonts/',
  wasmUrl: '/wasm/',
  disableStream: true,
  disableAutoFetch: true,
};

interface LoaderProps {
  isLoading?: boolean;
  progress?: { loaded: number; total: number };
}

const LoaderComponent = ({ isLoading = false, progress }: LoaderProps) => {
  if (!isLoading) return null;
  
  const percentage = progress ? Math.round((progress.loaded / progress.total) * 100) : 0;
  
  return (
    <div className="flex flex-col items-center justify-center p-8">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
      <div className="text-sm text-gray-600">Loading PDF...</div>
      {progress && (
        <div className="text-xs text-gray-500 mt-2">{percentage}%</div>
      )}
    </div>
  );
};

interface PageDimensions {
  width: number;
  height: number;
}

interface PDFViewerProps {
  src: {
    url?: string;
    path?: string;
    file?: File;
  };
  scale?: number;
  className?: string;
}

export const PDFViewer = ({ src, scale = 1, className = "" }: PDFViewerProps) => {
  const { zoom, setZoom } = usePDF();
  const [numberOfPages, setNumberOfPages] = useState<number>(0);
  const [isDocumentLoading, setIsDocumentLoading] = useState<boolean>(true);
  const [loadingProgress, setLoadingProgress] = useState<{ loaded: number; total: number }>();
  const [pageDimensions, setPageDimensions] = useState<Map<number, PageDimensions>>(new Map());
  const [defaultPageHeight, setDefaultPageHeight] = useState<number>(800);
  const [error, setError] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const headerRef = useRef<HTMLDivElement>(null);


  const pdfSource = useMemo(() => {
    return src.file || src.url || src.path;
  }, [src]);

  // Calculate estimated size for each page
  const getPageEstimatedSize = useCallback((index: number) => {
    const pageNum = index + 1;
    const dimensions = pageDimensions.get(pageNum);
    console.log({pageNum, dimensions})
    if (dimensions) {
      return (dimensions.height * scale) + 20; // 20px margin
    }
    return defaultPageHeight * scale + 20;
  }, [pageDimensions, scale, defaultPageHeight]);

  const virtualizer = useVirtualizer({
    count: numberOfPages,
    getScrollElement: () => containerRef.current,
    estimateSize: getPageEstimatedSize,
    enabled: !isDocumentLoading,
    overscan: 2, // Render 2 pages before/after visible area
  });

  // Handle document load success
  const onDocumentLoadSuccess = useCallback(async (pdf: PDFDocumentProxy) => {
    try {
      setNumberOfPages(pdf.numPages);
      setError(null);

      // Get dimensions for first few pages to establish better estimates
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

      setPageDimensions(dimensionsMap);
      
      // Set default height based on first page or fallback
      const firstPageDimensions = dimensionsMap.get(1);
      if (firstPageDimensions) {
        setDefaultPageHeight(firstPageDimensions.height);
      }

      setIsDocumentLoading(false);
    } catch (err) {
      console.error('Error loading PDF:', err);
      setError('Failed to load PDF document');
      setIsDocumentLoading(false);
    }
  }, []);

  // Handle document load error
  const onDocumentLoadError = useCallback((error: Error) => {
    console.error('PDF load error:', error);
    setError('Failed to load PDF. Please check the file and try again.');
    setIsDocumentLoading(false);
  }, []);

  // Handle page load success to get accurate dimensions
  const onPageLoadSuccess = useCallback((page: any, pageNumber: number) => {
    const viewport = page.getViewport({ scale: 1 });
    setPageDimensions(prev => new Map(prev.set(pageNumber, {
      width: viewport.width,
      height: viewport.height,
    })));
    console.log({viewport, p: "Page loaded"})
  }, []);

  // Update virtualizer when scale changes
  useEffect(() => {
    virtualizer.measure();
  }, [scale, virtualizer, defaultPageHeight]);

  if (!pdfSource) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg">
        <span className="text-gray-500">No PDF source provided</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64 bg-red-50 rounded-lg">
        <div className="text-center">
          <div className="text-red-600 font-medium mb-2">Error</div>
          <div className="text-red-500 text-sm">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`pdf-viewer ${className}`} 
      style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        height: '100%', 
        width: '100%' 
      }}
    >
      {/* Header - Fixed height */}
      <div 
        ref={headerRef}
        className="pdf-header"
      >
        <div className="" style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '10px 20px',borderBottom: '1px solid #737373ff',}}>
          <div className="flex gap-2 items-center">
            <button
              onClick={() => setZoom(Math.max(zoom - 0.1, 0.1))}
              className="px-3 py-1 bg-gray-700 text-white rounded hover:bg-gray-800 transition-colors"
            >
              -
            </button>
            <span className="px-3 py-1 bg-gray-100 rounded min-w-[60px] text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => setZoom(Math.min(zoom + 0.1, 3))}
              className="px-3 py-1 bg-gray-700 text-white rounded hover:bg-gray-800 transition-colors"
            >
              +
            </button>
          </div>
          
          {numberOfPages > 0 && (
            <div className="text-sm text-gray-600">
              Total pages: {numberOfPages}
            </div>
          )}
        </div>
      </div>
      
      {/* PDF Content - Takes remaining height */}
      <div 
        className="pdf-content" 
        style={{ 
          flex: '1 1 0%', 
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <Document
          file={pdfSource}
          options={PDFOptions}
          loading={<LoaderComponent isLoading={true} progress={loadingProgress} />}
          onLoadProgress={setLoadingProgress}
          onLoadSuccess={onDocumentLoadSuccess}
          onLoadError={onDocumentLoadError}
        >
          <div
            ref={containerRef}
            className="pdf-container"
            style={{
              height: `90vh`, // Subtract header height + padding
              width: '100%',
              display:"grid",
              gridTemplateColumns: '1fr',
              gridAutoRows: 'auto',
              gridGap: '10px',
              placeItems: 'center',
              overflow: 'auto',
              borderRadius: '8px',
            }}
          >
            {isDocumentLoading ? (
              <LoaderComponent isLoading={true} progress={loadingProgress} />
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
                        transform: `translateY(${virtualItem.start}px) translateX(-50%)`,
                      }}
                    >
                      <div className="pdf-page-wrapper">
                        <Page
                          pageNumber={pageNumber}
                          scale={zoom}
                          onLoadSuccess={(page) => onPageLoadSuccess(page, pageNumber)}
                          className="pdf-page"
                          renderTextLayer={true}
                          renderAnnotationLayer={true}
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
    </div>
  );
};