import { createContext, useContext, useEffect, useState } from "react";

interface PDFContextType {
  zoom: number;
  setZoom: (z: number) => void;
  zoomCSS: number;
  setZoomCSS: (z: number)=>void;
}

const PDFContext = createContext<PDFContextType | undefined>(undefined);

export const PDFProvider = ({ children }: { children: React.ReactNode }) => {
  const [zoom, setZoom] = useState(1);
  const [zoomCSS, setZoomCSS] = useState<number>(1)
  useEffect(()=>{
    setTimeout(()=>{
      setZoom(zoomCSS)
    },500)
  },[zoomCSS])
  return (
    <PDFContext.Provider value={{ zoom, setZoom, zoomCSS, setZoomCSS }}>
      {children}
    </PDFContext.Provider>
  );
};

export const usePDF = () => {
  const ctx = useContext(PDFContext);
  if (!ctx) throw new Error("usePDF must be used within PDFProvider");
  return ctx;
};