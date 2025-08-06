import { createContext, useContext, useEffect, useState } from "react";

interface PDFContextType {
  zoom: number;
  setZoom: (z: number) => void;
  zoomCSS: number;
  setZoomCSS: (z: number)=>void;
  numberOfPages?: number;
  setNumberOfPages?: (n: number) => void;
  zoomStep?: number;
  currentPage?: number;
  setCurrentPage?: (n: number) => void;
  document:{
    isDocumentLoading: boolean;
    setIsDocumentLoading: (loading: boolean) => void;
    loadingProgress?: { loaded: number; total: number };
    setLoadingProgress?: (progress: { loaded: number; total: number }) => void
  }
  error:{
    message?: string | null;
    setError?: (message: string | null) => void;
  }
  dimension:{
    pageDimensions?: Map<number, { width: number; height: number }>;
    setPageDimensions?: (dimensions: Map<number, { width: number; height: number }>) => void;
    defaultPageHeight: number;
    setDefaultPageHeight?: (height: number) => void;
    defaultPageWidth: number;
    setDefaultPageWidth?: (width: number) => void;
  }
}

const PDFContext = createContext<PDFContextType | undefined>(undefined);

export const PDFProvider = ({ children }: { children: React.ReactNode }) => {
  const zoomStep = 0.3;
  const [zoom, setZoom] = useState(1);
  const [zoomCSS, setZoomCSS] = useState<number>(1)
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [numberOfPages, setNumberOfPages] = useState<number>(10);
  const [loadingProgress, setLoadingProgress] = useState<{ loaded: number; total: number }>();
  const [isDocumentLoading, setIsDocumentLoading] = useState<boolean>(false);
  const [message, setError] = useState<string | null>(null);
  const [pageDimensions, setPageDimensions] = useState<Map<number, { width: number; height: number }>>(new Map());
  const [defaultPageHeight, setDefaultPageHeight] = useState<number>(800);
  const [defaultPageWidth, setDefaultPageWidth] = useState<number>(500);
  const document = {
    isDocumentLoading,
    setIsDocumentLoading,
    loadingProgress,
    setLoadingProgress
  };
  const error = {
    message,
    setError
  };
  const dimension = {
    pageDimensions,
    setPageDimensions,
    defaultPageHeight,
    setDefaultPageHeight,
    defaultPageWidth,
    setDefaultPageWidth
  };
  useEffect(()=>{
    setZoom(zoomCSS)
  },[zoomCSS])
  return (
    <PDFContext.Provider value={{error,dimension, zoom, setZoom, zoomCSS, setZoomCSS, numberOfPages, setNumberOfPages, zoomStep , currentPage, setCurrentPage,document}}>
      {children}
    </PDFContext.Provider>
  );
};

export const usePDF = () => {
  const ctx = useContext(PDFContext);
  if (!ctx) throw new Error("usePDF must be used within PDFProvider");
  return ctx;
};