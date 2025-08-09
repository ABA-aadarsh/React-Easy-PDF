import { usePDF } from "../PDFProvider";
import { useEffect, useRef } from "react";

export default function NavBar() {
    const {setHeaderRef, zoomCSS,layout, setZoomCSS, numberOfPages=0, zoomStep=0.3 ,currentPage=1, setCurrentPage, setSidebarOpen } = usePDF();
    const navRef = useRef<HTMLDivElement | null>(null);
    
    // Set the header ref when component mounts
    useEffect(() => {
        if (navRef.current && setHeaderRef) {
            setHeaderRef(navRef);
        }
    }, [setHeaderRef]);

    return (
        <nav 
            ref={navRef}
            className="pdf-header"
        >
            <div className="" style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '0.8rem',
                alignItems: 'center',
                padding: '5px 20px',
                borderBottom: '1px solid #595959ff',
            }}>

                {/* sidebar icon */}
                <button className="no-style" onClick={()=>{setSidebarOpen(prev => !prev)}}>
                    <img src="/svg/sidebar.svg" alt="menu" style={{height:"20px",color:"#fff",marginBlock:"auto"}} />
                </button>

                <div className="flex gap-5">
                    <button
                        onClick={() => setZoomCSS(Math.max(zoomCSS - zoomStep, 0.1))}
                        className="ZoomButton"
                    >
                        -
                    </button>
                    <button
                        onClick={() => setZoomCSS(Math.min(zoomCSS + zoomStep, 3))}
                        className="ZoomButton"
                    >
                        +
                    </button>
                    <select name="zoomlevel" style={{
                        padding: "5px",
                        borderRadius: "5px",
                        background: "#3c3c3c",
                    }} onChange={(e) => {
                        const value = parseFloat(e.target.value);
                        if (!isNaN(value)) {
                            setZoomCSS(Math.min(Math.max(value, 0.1), 3));
                        }
                    }}>
                        <option value="">Automatic</option>
                        <option value="">Original</option>
                        <option value="">Fit page</option>
                        <option value="0.7">70%</option>
                        <option value="0.9">90%</option>
                        <option value="1.0">100%</option>
                        <option value="1.2">120%</option>
                        <option value="1.5">150%</option>
                    </select>
                </div>

                <div className="flex gap-20">
                    {numberOfPages > 0 && (
                        <div className="flex-center" style={{gap:"5px"}}>
                            <button className="no-style flex-center" onClick={()=>{setCurrentPage && setCurrentPage(Math.min(Math.max((currentPage+1),1),numberOfPages))}}><img src="/svg/up.svg" alt="up" style={{height:"16px",color:"#fff"}} /></button> 
                            <button className="no-style flex-center" onClick={()=>{setCurrentPage && setCurrentPage(Math.min(Math.max((currentPage-1),1),numberOfPages))}}><img src="/svg/up.svg" alt="down" style={{height:"16px",color:"#fff",rotate:"180deg"}} /></button> 
                            <input className="input-small no-arrows" type="number" value={currentPage} onChange={(e)=>{setCurrentPage && setCurrentPage(Math.min(Math.max(parseInt(e.target.value),1),numberOfPages))}}/> of {numberOfPages}
                        </div>
                    )}

                    <div style={{marginBlock:"auto"}} className="flex gap-5">
                        <button className="no-style" onClick={()=>{layout.setRotate((prev) => (prev + 90) % 360)}}>
                            <img src="/svg/rotate.svg" alt="rotate" style={{height:"16px",color:"#fff"}} />
                        </button>
                        <button className="no-style" onClick={()=>{console.log("download Clicked")}}>
                            <img src="/svg/save.svg" alt="download" style={{height:"16px",color:"#fff"}} />
                        </button>
                        <button className="no-style" onClick={()=>{console.log("print Clicked")}}>
                            <img src="/svg/print.svg" alt="print" style={{height:"20px",color:"#fff"}} />
                        </button>
                    </div>
                </div>
            </div>
        </nav>
    );
}