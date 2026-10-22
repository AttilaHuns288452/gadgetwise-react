import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, HashRouter } from "react-router-dom";
import "./index.css";
import App from "./App.jsx";

// GitHub Pages is hosted under a project subpath and uses hashes.
// Vercel is deployed at the domain root and can use normal URLs, including auth callbacks.
const Router = import.meta.env.BASE_URL === "/gadgetwise-react/" ? HashRouter : BrowserRouter;

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <Router>
      <App />
    </Router>
  </StrictMode>
);
