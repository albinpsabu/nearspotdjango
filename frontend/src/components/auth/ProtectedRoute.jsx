import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

function ProtectedRoute({ allowedRoles = [] }) {
  const { user, loading, isAuthenticated } = useAuth();
  const location = useLocation();

  // Wait until authentication has been restored.
  if (loading) {
    return <div>Loading...</div>;
  }

  // Redirect guests to login.
  if (!isAuthenticated) {
    return (
      <Navigate
        to="/login"
        state={{
          from: location.pathname + location.search + location.hash,
        }}
        replace
      />
    );
  }

  // Check whether the authenticated user has permission.
  if (
    allowedRoles.length > 0 &&
    !allowedRoles.includes(user?.role)
  ) {
    return <Navigate to="/" replace />;
  }

  // Render the protected route.
  return <Outlet />;
}

export default ProtectedRoute;