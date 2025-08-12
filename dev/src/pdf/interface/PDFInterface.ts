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

export type RotationValue = 0 | 90 | 180 | 270 

export interface CachedPage {
  imageUrl: string;
  scale: number;
  rotation: RotationValue;
}

export interface CachedThumbnail {
  imageUrl: string;
}