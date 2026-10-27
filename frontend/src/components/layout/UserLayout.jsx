
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function UserLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const navItems = [
    { path: "/user", label: "Dashboard", end: true },
    { path: "/user/submissions", label: "My Submissions" },
    { path: "/user/reviews", label: "My Reviews" },
    { path: "/user/saved", label: "Saved Spots" },
    { path: "/user/profile", label: "Profile" },
  ];

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/", { replace: true });
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <div
      className="d-flex flex-column"
      style={{
        height: "100dvh",
        width: "100%",
        overflow: "hidden",
        backgroundColor: "#f7f9f9",
        color: "#1d2b2e",
      }}
    >
      <header
        className="bg-white border-bottom flex-shrink-0"
        style={{ zIndex: 10 }}
      >
        <nav className="navbar navbar-expand-lg py-0">
          <div className="container-fluid px-3 px-md-4 py-2">
            <NavLink
              to="/"
              className="navbar-brand fw-bold fs-4 mb-0"
              style={{ color: "#1d2b2e" }}
            >
              <span style={{ color: "#20cfa7" }}>Near</span>Spot
            </NavLink>

            <button
              className="navbar-toggler"
              type="button"
              data-bs-toggle="collapse"
              data-bs-target="#userNavigation"
              aria-controls="userNavigation"
              aria-expanded="false"
              aria-label="Toggle navigation"
            >
              <span className="navbar-toggler-icon" />
            </button>

            <div
              className="collapse navbar-collapse"
              id="userNavigation"
            >
              <ul className="navbar-nav mx-auto gap-lg-2">
                {navItems.map((item) => (
                  <li className="nav-item" key={item.path}>
                    <NavLink
                      to={item.path}
                      end={item.end}
                      className={({ isActive }) =>
                        `nav-link fw-medium px-3 ${
                          isActive ? "text-success" : "text-secondary"
                        }`
                      }
                    >
                      {item.label}
                    </NavLink>
                  </li>
                ))}
              </ul>

              <div className="d-flex align-items-center gap-3 py-2 py-lg-0">
                <div
                  className="rounded-circle d-flex align-items-center justify-content-center fw-semibold flex-shrink-0"
                  style={{
                    width: "36px",
                    height: "36px",
                    backgroundColor: "#e0f8f1",
                    color: "#087f68",
                  }}
                >
                  {user?.name?.charAt(0)?.toUpperCase() || "U"}
                </div>

                <span className="fw-medium text-truncate">
                  {user?.name || "User"}
                </span>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="btn btn-outline-secondary btn-sm flex-shrink-0"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </nav>
      </header>

      <main
        className="flex-grow-1"
        style={{
          minHeight: 0,
          overflow: "hidden",
          padding: "16px 24px",
        }}
      >
        <Outlet />
      </main>
    </div>
  );
}
