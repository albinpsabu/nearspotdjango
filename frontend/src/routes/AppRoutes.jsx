import { BrowserRouter, Routes, Route } from "react-router-dom";

import App from "../App";
import SpotDetails from "../pages/public/SpotDetails";
import Login from "../pages/auth/Login";

// ============================================================
// APPLICATION ROUTES
// ============================================================

function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>

        {/* ====================================================
            PUBLIC MAP
        ===================================================== */}

        <Route
          path="/"
          element={<App />}
        />

        {/* ====================================================
            SPOT DETAILS
        ===================================================== */}

        <Route
          path="/spot/:id"
          element={<SpotDetails />}
        />

        {/* ====================================================
            LOGIN
        ===================================================== */}

        <Route
          path="/login"
          element={<Login />}
        />

      </Routes>
    </BrowserRouter>
  );
}

// ============================================================
// EXPORT
// ============================================================

export default AppRoutes;