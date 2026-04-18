import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./index.css";
import ScrollToTop from "./components/ScrollToTop";
import { AuthProvider } from "./context/AuthContext";

ReactDOM.createRoot(document.getElementById("root")!).render(
 
    <BrowserRouter>
     <AuthProvider>
        <ScrollToTop />
        <App />
     </AuthProvider>
    </BrowserRouter>
  
);
