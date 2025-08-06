import NavBar from "./components/Navbar";
import PDFViewer from "./components/PDFViewerNew";
import type { PDFViewerProps } from "./interface/PDFInterface";

const PDFTemp=({ src }: PDFViewerProps) => {
    return (
        <div>
            <NavBar/>
            <PDFViewer
                src = {src.url || ""}
            />
        </div>
    )
}


export default PDFTemp;