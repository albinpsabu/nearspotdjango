
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

function ProtectedRoute({
  allowedRoles = [],
  requiredPermission = null,
}) {
  const { user, loading, isAuthenticated } = useAuth();
  const location = useLocation();

  // Wait until authentication has been restored.
  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center min-vh-100">
        <div className="text-center">
          <div className="spinner-border text-success" role="status" />
          <p className="text-secondary mt-3 mb-0">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect unauthenticated visitors to login.
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

  const userRole = String(user?.role || "").toUpperCase();
  const normalizedRoles = allowedRoles.map((role) =>
    String(role).toUpperCase()
  );

  // Verify the user's role.
  if (
    normalizedRoles.length > 0 &&
    !normalizedRoles.includes(userRole)
  ) {
    return <Navigate to="/" replace />;
  }

  // Verify the employee's feature permission, if required.
  if (requiredPermission) {
    const permissions = Array.isArray(user?.permissions)
      ? user.permissions
      : [];

    if (!permissions.includes(requiredPermission)) {
      // Profile is role-protected but does not require a feature permission.
      // It provides a safe destination even if dashboard access is revoked.
      if (userRole === "EMPLOYEE") {
        return <Navigate to="/employee/profile" replace />;
      }

      return <Navigate to="/" replace />;
    }
  }

  return <Outlet />;
}

export default ProtectedRoute;
