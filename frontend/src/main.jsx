
import React from "react";
import ReactDOM from "react-dom/client";

import AppRoutes from "./routes/AppRoutes";
import { AuthProvider } from "./context/AuthContext";

// Bootstrap 5
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap/dist/js/bootstrap.bundle.min.js";

// Bootstrap Icons
import "bootstrap-icons/font/bootstrap-icons.css";

// Leaflet
import "leaflet/dist/leaflet.css";

// ============================================================
// APPLICATION ENTRY POINT
// ============================================================

ReactDOM.createRoot(
  document.getElementById("root")
).render(
  <React.StrictMode>
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  </React.StrictMode>
);
