import { usePDF } from "../PDFProvider";

export default function NavBar() {
    const { zoomCSS, setZoomCSS, numberOfPages=0, zoomStep=0.3 ,currentPage, setCurrentPage } = usePDF();
  return (
    <nav 
        className="pdf-header"
      >
        <div className="" style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '10px 20px',borderBottom: '1px solid #737373ff',}}>
          <div className="flex-gap">
            <button
              onClick={() => setZoomCSS(Math.max(zoomCSS - zoomStep, 0.1))}
              className="ZoomButton"
            >
              -
            </button>
            <span className="">
              {Math.round(zoomCSS * 100)}%
            </span>
            <button
              onClick={() => setZoomCSS(Math.min(zoomCSS + zoomStep, 3))}
              className="ZoomButton"
            >
              +
            </button>
          </div>
          
          {numberOfPages > 0 && (
            <div className="text-sm text-gray-600">
              Page: <input className="input-small no-arrows" type="number" value={currentPage} onChange={(e)=>{setCurrentPage && setCurrentPage(Math.min(Math.max(parseInt(e.target.value),1),numberOfPages))}}/> of {numberOfPages}
            </div>
          )}
        </div>
      </nav>
  );
}