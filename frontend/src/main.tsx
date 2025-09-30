import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router";
import "./index.css";
import App from "./App.tsx";
import { I18nProvider } from "@/lib/i18n";
import AppItk from "./container/AppItk.tsx";

createRoot(document.getElementById("root")!).render(
  <I18nProvider>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/itkvs" element={<AppItk />} />
      </Routes>
    </BrowserRouter>
  </I18nProvider>
);
