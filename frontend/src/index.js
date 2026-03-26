import React from "react";
import ReactDOM from "react-dom/client";
import "@/index.css";
import "@xyflow/react/dist/style.css";
import "prismjs/themes/prism-tomorrow.css";
import App from "@/App";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
