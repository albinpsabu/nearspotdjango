import { BrowserRouter, Routes, Route } from "react-router-dom";

import App from "../App";
import SpotDetails from "../pages/public/SpotDetails";

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

      </Routes>
    </BrowserRouter>
  );
}

// ============================================================
// EXPORT
// ============================================================

export default AppRoutes;