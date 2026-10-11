
import { useAuth } from "../../context/AuthContext";
import { useLocation, useNavigate } from "react-router-dom";

function UserTopbar({
  sidebarCollapsed = false,
  onToggleSidebar,
  onToggleMobileSidebar,
}) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const pageTitles = [
    {
      path: "/user",
      title: "User Dashboard",
      subtitle: "Manage and explore your NearSpot account",
    },
    {
      path: "/user/submissions",
      title: "My Submissions",
      subtitle: "Track and manage your submitted spots",
    },
    {
      path: "/user/reviews",
      title: "My Reviews",
      subtitle: "View and manage your spot reviews",
    },
    {
      path: "/user/saved",
      title: "Saved Spots",
      subtitle: "Explore your bookmarked places",
    },
    {
      path: "/user/profile",
      title: "My Profile",
      subtitle: "Manage your personal information",
    },
  ];

  const currentPage =
    pageTitles.find((page) =>
      page.path === "/user"
        ? location.pathname === page.path
        : location.pathname === page.path ||
          location.pathname.startsWith(`${page.path}/`)
    ) || pageTitles[0];

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login", { replace: true });
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const initials =
    user?.name?.trim()?.charAt(0)?.toUpperCase() || "U";

  return (
    <header
      className="bg-white border-bottom d-flex align-items-center justify-content-between px-3 px-md-4 flex-shrink-0"
      style={{
        height: "84px",
        minHeight: "84px",
        zIndex: 1030,
        borderColor: "#e8eeee",
        boxShadow: "0 2px 8px rgba(20, 40, 35, 0.025)",
      }}
    >
      {/* Left: Menu Button and Page Title */}
      <div
        className="d-flex align-items-center gap-3"
        style={{ minWidth: 0 }}
      >
        {/* Desktop Sidebar Toggle */}
        <button
          type="button"
          className="btn border-0 rounded-3 d-none d-lg-flex align-items-center justify-content-center flex-shrink-0"
          onClick={onToggleSidebar}
          aria-label={
            sidebarCollapsed
              ? "Expand sidebar"
              : "Collapse sidebar"
          }
          title={
            sidebarCollapsed
              ? "Expand sidebar"
              : "Collapse sidebar"
          }
          style={{
            width: "44px",
            height: "44px",
            backgroundColor: "#f5f8f7",
            color: "#536366",
          }}
        >
          <i
            className="bi bi-list"
            style={{ fontSize: "23px" }}
            aria-hidden="true"
          />
        </button>

        {/* Mobile Sidebar Toggle */}
        <button
          type="button"
          className="btn border-0 rounded-3 d-flex d-lg-none align-items-center justify-content-center flex-shrink-0"
          onClick={onToggleMobileSidebar}
          aria-label="Open navigation menu"
          style={{
            width: "44px",
            height: "44px",
            backgroundColor: "#f5f8f7",
            color: "#536366",
          }}
        >
          <i
            className="bi bi-list"
            style={{ fontSize: "23px" }}
            aria-hidden="true"
          />
        </button>

        {/* Page Title */}
        <div style={{ minWidth: 0 }}>
          <div
            className="fw-bold text-truncate"
            style={{
              color: "#1d2b2e",
              fontSize: "20px",
              letterSpacing: "-0.4px",
              lineHeight: 1.2,
            }}
          >
            {currentPage.title}
          </div>

          <div
            className="d-none d-sm-block mt-2 text-truncate"
            style={{
              color: "#8a989a",
              fontSize: "12px",
            }}
          >
            {currentPage.subtitle}
          </div>
        </div>
      </div>

      {/* Right: User Badge and Profile */}
      <div className="d-flex align-items-center gap-2 gap-md-4 flex-shrink-0">
        {/* User Badge */}
        <div
          className="d-none d-md-flex align-items-center gap-2 px-3 py-2 rounded-pill"
          style={{
            backgroundColor: "#f0fbf8",
            color: "#247b69",
            fontSize: "12px",
            fontWeight: 600,
            minWidth: "95px",
            justifyContent: "center",
          }}
        >
          <span
            className="rounded-circle"
            style={{
              width: "8px",
              height: "8px",
              backgroundColor: "#20cfa7",
            }}
          />
          User
        </div>

        {/* Profile Dropdown */}
        <div className="dropdown">
          <button
            type="button"
            className="btn border-0 d-flex align-items-center gap-2 p-1 rounded-3"
            data-bs-toggle="dropdown"
            aria-expanded="false"
            aria-label="Open user profile menu"
          >
            {/* Avatar */}
            <div
              className="rounded-circle d-flex align-items-center justify-content-center text-white fw-semibold flex-shrink-0"
              style={{
                width: "44px",
                height: "44px",
                minWidth: "44px",
                backgroundColor: "#20cfa7",
                fontSize: "16px",
              }}
            >
              {initials}
            </div>

            {/* User Details */}
            <div className="d-none d-md-block text-start">
              <div
                className="fw-semibold text-truncate"
                style={{
                  color: "#26373a",
                  fontSize: "13px",
                  maxWidth: "180px",
                }}
              >
                {user?.name || "User"}
              </div>

              <div
                className="text-truncate"
                style={{
                  color: "#899597",
                  fontSize: "11px",
                  maxWidth: "180px",
                }}
              >
                {user?.email || "User Account"}
              </div>
            </div>

            <i
              className="bi bi-chevron-down d-none d-md-inline ms-2"
              aria-hidden="true"
              style={{
                color: "#879496",
                fontSize: "11px",
              }}
            />
          </button>

          {/* Dropdown Menu */}
          <ul
            className="dropdown-menu dropdown-menu-end border-0 shadow rounded-3 mt-2"
            style={{
              minWidth: "230px",
              zIndex: 1060,
            }}
          >
            <li>
              <div className="px-3 py-3">
                <div
                  className="fw-semibold text-break"
                  style={{
                    color: "#26373a",
                    fontSize: "13px",
                  }}
                >
                  {user?.name || "User"}
                </div>

                <div
                  className="mt-1 text-break"
                  style={{
                    color: "#8a989a",
                    fontSize: "11px",
                  }}
                >
                  {user?.email || "User Account"}
                </div>
              </div>
            </li>

            <li>
              <hr className="dropdown-divider my-1" />
            </li>

            <li>
              <button
                type="button"
                className="dropdown-item d-flex align-items-center gap-2 py-2 px-3"
                onClick={() => navigate("/user/profile")}
                style={{
                  fontSize: "13px",
                  color: "#26373a",
                }}
              >
                <i
                  className="bi bi-person"
                  aria-hidden="true"
                  style={{ fontSize: "16px" }}
                />
                My Profile
              </button>
            </li>

            <li>
              <button
                type="button"
                className="dropdown-item d-flex align-items-center gap-2 py-2 px-3"
                onClick={handleLogout}
                style={{
                  fontSize: "13px",
                  color: "#b42335",
                }}
              >
                <i
                  className="bi bi-box-arrow-right"
                  aria-hidden="true"
                  style={{ fontSize: "16px" }}
                />
                Logout
              </button>
            </li>
          </ul>
        </div>
      </div>
    </header>
  );
}

export default UserTopbar;
