import { useState } from 'react'
import { HashRouter, Route, Routes, useNavigate } from 'react-router'
import type { AozoraText } from './features/import/aozora'
import { HomePage } from './features/library/HomePage'
import { ReaderPage } from './features/reader/ReaderPage'

function AppRoutes() {
  const navigate = useNavigate()
  const [book, setBook] = useState<AozoraText | null>(null)

  function handleOpen(opened: AozoraText) {
    setBook(opened)
    navigate('/read')
  }

  return (
    <Routes>
      <Route path="/" element={<HomePage onOpen={handleOpen} />} />
      <Route path="/read" element={<ReaderPage book={book} />} />
    </Routes>
  )
}

// GitHub Pages は知らないパスを index.html に回せないので、ハッシュで画面を切り替える
function App() {
  return (
    <HashRouter>
      <AppRoutes />
    </HashRouter>
  )
}

export default App
