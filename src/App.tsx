import { HashRouter, Navigate, Route, Routes } from "react-router";
import { HomePage } from "./features/library/HomePage";
import { ShelfPage } from "./features/library/ShelfPage";
import { TabsLayout } from "./features/library/TabsLayout";
import { ReaderPage } from "./features/reader/ReaderPage";

// GitHub Pages は知らないパスを index.html に回せないので、ハッシュで画面を切り替える
function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<TabsLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/shelf" element={<ShelfPage />} />
        </Route>
        <Route path="/read/:id" element={<ReaderPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
}

export default App;
