import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import { PDFViewer } from './pdf/PDFViewer'

function App() {
  const [count, setCount] = useState(0)

  const url = "/sample.pdf"

  return (
    <>
      <PDFViewer
        src={{
          url: url
        }}
      />
      {/* <embed
        src='https://mozilla.github.io/pdf.js/web/viewer.html?file=https://ontheline.trincoll.edu/images/bookdown/sample-local-pdf.pdf'
        style={{
          width: "100vw",
          height: "100vh"
        }}
      /> */}
    </>
  )
}

export default App
