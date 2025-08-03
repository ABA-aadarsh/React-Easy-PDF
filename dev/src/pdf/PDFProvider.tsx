import { createContext, useContext, useState } from "react";

interface PDFContextType {
  zoom: number;
  setZoom: (z: number) => void;
}

const PDFContext = createContext<PDFContextType | undefined>(undefined);

export const PDFProvider = ({ children }: { children: React.ReactNode }) => {
  const [zoom, setZoom] = useState(1);

  return (
    <PDFContext.Provider value={{ zoom, setZoom }}>
      {children}
    </PDFContext.Provider>
  );
};

export const usePDF = () => {
  const ctx = useContext(PDFContext);
  if (!ctx) throw new Error("usePDF must be used within PDFProvider");
  return ctx;
};