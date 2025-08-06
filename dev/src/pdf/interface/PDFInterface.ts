export interface PDFViewerProps {
  src: {
    url?: string;
    path?: string;
    file?: File;
  };
  scale?: number;
  className?: string;
}

export interface PageDimensions {
  width: number;
  height: number;
}

export interface CachedPageData {
  imageUrl: string;
  scale: number;
  timestamp: number;
}