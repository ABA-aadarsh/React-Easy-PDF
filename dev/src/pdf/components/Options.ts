import type { DocumentInitParameters } from "pdfjs-dist/types/src/display/api";
export const PDFOptions: Partial<Omit<DocumentInitParameters, "data" | "range" | "url">> = {
        cMapUrl: '/cmaps/',
        standardFontDataUrl: '/standard_fonts/',
        wasmUrl: '/wasm/',
        disableStream: true,
        disableAutoFetch: true,
};