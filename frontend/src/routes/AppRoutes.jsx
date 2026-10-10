// ============================================================
// IMPORTS
// ============================================================

import { BrowserRouter, Routes, Route } from "react-router-dom";

import App from "../App";
import SpotDetails from "../pages/public/SpotDetails";
import Login from "../pages/auth/Login";

import AdminDashboard from "../pages/admin/AdminDashboard";
import AdminSpots from "../pages/admin/AdminSpots";
import AdminUsers from "../pages/admin/AdminUsers";
import AdminEmployees from "../pages/admin/AdminEmployees";
import AdminCategories from "../pages/admin/AdminCategories";
import AdminReports from "../pages/admin/AdminReports";


import EmployeeDashboard  from "../pages/employee/Dashboard"
import PendingSpots from "../pages/employee/PendingSpots";
import Reports from "../pages/employee/Reports";
import Profile from "../pages/employee/Profile";
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

        {/* ====================================================
            ADMIN DASHBOARD
        ===================================================== */}

        <Route
          path="/admin"
          element={<AdminDashboard />}
        />

        {/* ====================================================
            ADMIN SPOTS
        ===================================================== */}

        <Route
          path="/admin/spots"
          element={<AdminSpots />}
        />

        {/* ====================================================
            ADMIN USERS
        ===================================================== */}

        <Route
          path="/admin/users"
          element={<AdminUsers />}
        />

        {/* ====================================================
            ADMIN EMPLOYEES
        ===================================================== */}

        <Route
          path="/admin/employees"
          element={<AdminEmployees />}
        />

        {/* ====================================================
            ADMIN CATEGORIES
        ===================================================== */}

        <Route
          path="/admin/categories"
          element={<AdminCategories />}
        />

        {/* ====================================================
            ADMIN REPORTS
        ===================================================== */}

        <Route
          path="/admin/reports"
          element={<AdminReports />}
        />

        {/* EMPLOYEE DASHBOARD */}
        <Route
          path="/employee"
          element={<EmployeeDashboard />}
        />

        <Route path="/employee/spots" 
        element={<PendingSpots />} 
        />


        <Route path="/employee/reports" 
        element={<Reports />} 
        />

        <Route path="/employee/profile" 
        element={<Profile />} 
        />

      </Routes>
    </BrowserRouter>
  );
}

// ============================================================
// EXPORT
// ============================================================

export default AppRoutes;