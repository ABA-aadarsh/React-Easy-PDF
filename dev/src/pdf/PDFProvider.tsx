import { createContext, useContext, useEffect, useRef, useState } from "react";
import type { RotationValue } from "./interface/PDFInterface";

interface PDFContextType {
  zoom: number;
  thumbnailScale: number;
  setZoom: (z: number) => void;
  zoomCSS: number;
  setZoomCSS: React.Dispatch<React.SetStateAction<number>>;
  headerRef?: React.RefObject<HTMLDivElement | null>;
  setHeaderRef?: (ref: React.RefObject<HTMLDivElement | null>) => void;
  numberOfPages: number;
  setNumberOfPages: (n: number) => void;
  sidebarOpen: boolean;
  setSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
  zoomStep: number;
  currentPage: number;
  setCurrentPage: React.Dispatch<React.SetStateAction<number>>;
  pdfDocument:{
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
    pageDimensions: Map<number, { width: number; height: number }>;
    setPageDimensions: (dimensions: Map<number, { width: number; height: number }>) => void;
    defaultPageHeight: number;
    setDefaultPageHeight: (height: number) => void;
    defaultPageWidth: number;
    setDefaultPageWidth: (width: number) => void;
  }
  layout: {
    headerHeightVh: number;
    remainingHeightVh: number;
    rotate: RotationValue;
    setRotate: React.Dispatch<React.SetStateAction<RotationValue>>;
  },
  shouldPageBeScrolled: boolean,
  setShouldPageBeScrolled: React.Dispatch<React.SetStateAction<boolean>>;
  onCommitZoom: (x:number)=>void
}

const PDFContext = createContext<PDFContextType | undefined>(undefined);

export const PDFProvider = ({ children }: { children: React.ReactNode }) => {
  const zoomStep = 0.4;
  const thumbnailScale = 0.16;
  const [zoom, setZoom] = useState(1.33);
  const [zoomCSS, setZoomCSS] = useState<number>(1.33)
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [numberOfPages, setNumberOfPages] = useState<number>(0);
  const [loadingProgress, setLoadingProgress] = useState<{ loaded: number; total: number }>();
  const [isDocumentLoading, setIsDocumentLoading] = useState<boolean>(false);
  const [message, setError] = useState<string | null>(null);
  const [pageDimensions, setPageDimensions] = useState<Map<number, { width: number; height: number }>>(new Map());
  const [defaultPageHeight, setDefaultPageHeight] = useState<number>(1000);
  const [defaultPageWidth, setDefaultPageWidth] = useState<number>(500);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [headerHeightVh, setHeaderHeightVh] = useState<number>(0);
  const [remainingHeightVh, setRemainingHeightVh] = useState<number>(100);
  const [rotate, setRotate] = useState<RotationValue>(0);

  const [shouldPageBeScrolled, setShouldPageBeScrolled] = useState<boolean>(false)
  
  const headerRef = useRef<HTMLDivElement | null>(null);
  
  const setHeaderRef = (ref: React.RefObject<HTMLDivElement | null>) => {
    headerRef.current = ref.current;
  };

  // Calculate header height and remaining space in vh
  const calculateHeaderHeight = () => {
    if (headerRef.current) {
      const headerHeight = headerRef.current.getBoundingClientRect().height;
      const viewportHeight = window.innerHeight;
      const headerHeightInVh = (headerHeight / viewportHeight) * 100;
      const remainingSpace = 100 - headerHeightInVh;
      
      setHeaderHeightVh(headerHeightInVh);
      setRemainingHeightVh(remainingSpace);
    }
  };

  // Update header height on mount and when header ref changes
  useEffect(() => {
    if (headerRef.current) {
      calculateHeaderHeight();
      
      // Recalculate on window resize
      const handleResize = () => calculateHeaderHeight();
      window.addEventListener('resize', handleResize);
      
      return () => window.removeEventListener('resize', handleResize);
    }
  }, [headerRef.current]);

  // Also recalculate when sidebar state changes (might affect header height)
  useEffect(() => {
    const timeoutId = setTimeout(calculateHeaderHeight, 10); // Small delay for layout changes
    return () => clearTimeout(timeoutId);
  }, [sidebarOpen]);

  const pdfDocument = {
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

  const layout = {
    headerHeightVh,
    remainingHeightVh,
    rotate,
    setRotate
  };

  const onCommitZoom = (newZoom: number)=> {
      setZoom(newZoom);
    console.log("Zoom committed:", newZoom);
  };
  return (
    <PDFContext.Provider value={{
      headerRef,
      setHeaderRef,
      error,
      dimension,
      zoom,
      setZoom,
      zoomCSS,
      setZoomCSS,
      numberOfPages,
      setNumberOfPages,
      zoomStep,
      currentPage,
      setCurrentPage,
      pdfDocument: pdfDocument,
      thumbnailScale,
      sidebarOpen,
      setSidebarOpen,
      layout,
      shouldPageBeScrolled,
      setShouldPageBeScrolled,
      onCommitZoom
    }}>
      {children}
    </PDFContext.Provider>
  );
};

export const usePDF = () => {
  const ctx = useContext(PDFContext);
  if (!ctx) throw new Error("usePDF must be used within PDFProvider");
  return ctx;
};