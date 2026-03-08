import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles.css";

// Initialize theme before React renders to prevent flash
(function initTheme() {
  const saved = localStorage.getItem("theme");
  if (saved === "light" || saved === "dark") {
    document.body.classList.add(saved);
  } else {
    // Use OS preference
    const prefersLight = window.matchMedia("(prefers-color-scheme: light)").matches;
    document.body.classList.add(prefersLight ? "light" : "dark");
  }
})();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
