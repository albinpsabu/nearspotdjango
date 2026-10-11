
// ============================================================
// IMPORTS
// ============================================================

import { BrowserRouter, Routes, Route } from "react-router-dom";

import App from "../App";
import SpotDetails from "../pages/public/SpotDetails";
import Login from "../pages/auth/Login";

// Admin pages
import AdminDashboard from "../pages/admin/AdminDashboard";
import AdminSpots from "../pages/admin/AdminSpots";
import AdminUsers from "../pages/admin/AdminUsers";
import AdminEmployees from "../pages/admin/AdminEmployees";
import AdminCategories from "../pages/admin/AdminCategories";
import AdminReports from "../pages/admin/AdminReports";

// Employee pages
import EmployeeDashboard from "../pages/employee/Dashboard";
import PendingSpots from "../pages/employee/PendingSpots";
import Reports from "../pages/employee/Reports";
import Profile from "../pages/employee/Profile";

// User pages
import UserLayout from "../components/layout/UserLayout";
import UserDashboard from "../pages/user/UserDashboard";
import UserProfile from "../pages/user/UserProfile";
import MySubmissions from "../pages/user/MySubmissions";
import MyReviews from "../pages/user/MyReviews";
import SavedSpots from "../pages/user/SavedSpots";

// ============================================================
// APPLICATION ROUTES
// ============================================================

function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        {/* ====================================================
            PUBLIC ROUTES
        ===================================================== */}

        <Route path="/" element={<App />} />

        <Route path="/spot/:id" element={<SpotDetails />} />

        <Route path="/login" element={<Login />} />

        {/* ====================================================
            ADMIN ROUTES
        ===================================================== */}

        <Route path="/admin" element={<AdminDashboard />} />

        <Route path="/admin/spots" element={<AdminSpots />} />

        <Route path="/admin/users" element={<AdminUsers />} />

        <Route path="/admin/employees" element={<AdminEmployees />} />

        <Route path="/admin/categories" element={<AdminCategories />} />

        <Route path="/admin/reports" element={<AdminReports />} />

        {/* ====================================================
            EMPLOYEE ROUTES
        ===================================================== */}

        <Route path="/employee" element={<EmployeeDashboard />} />

        <Route path="/employee/spots" element={<PendingSpots />} />

        <Route path="/employee/reports" element={<Reports />} />

        <Route path="/employee/profile" element={<Profile />} />

        {/* ====================================================
            USER ROUTES
            UserLayout provides the common sidebar and topbar.
            Child pages render inside its Outlet.
        ===================================================== */}

        <Route path="/user" element={<UserLayout />}>
          <Route index element={<UserDashboard />} />

          <Route path="profile" element={<UserProfile />} />

          <Route path="submissions" element={<MySubmissions />} />

          <Route path="reviews" element={<MyReviews />} />

          <Route path="saved" element={<SavedSpots />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

// ============================================================
// EXPORT
// ============================================================

export default AppRoutes;
