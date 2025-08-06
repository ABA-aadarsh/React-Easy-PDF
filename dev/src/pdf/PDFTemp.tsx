import NavBar from "./components/Navbar";
import PDFViewer from "./components/PdfViewer";
import type { PDFViewerProps } from "./interface/PDFInterface";

const PDFTemp=({ src }: PDFViewerProps) => {
    return (
        <div>
            <NavBar/>
            <PDFViewer src={src}/>
        </div>
    )
}


export default PDFTemp;