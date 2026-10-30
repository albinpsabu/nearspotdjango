
import { useAuth } from "../../context/AuthContext";
import { useLocation } from "react-router-dom";
import NotificationBell from "../common/NotificationBell";

// ============================================================
// ADMIN TOPBAR
// NearSpot Premium White + Yellow Theme
// ============================================================

function AdminTopbar({
  sidebarCollapsed = false,
  onToggleSidebar,
  onToggleMobileSidebar,
}) {
  const { user, logout } = useAuth();
  const location = useLocation();

  // ============================================================
  // THEME
  // ============================================================

  const theme = {
    primary: "#292929",
    primaryHover: "#444444",
    accent: "#FFC21A",
    accentHover: "#E5AD12",
    background: "#FFFFFF",
    page: "#FAFAFA",
    muted: "#FFF5D6",
    text: "#292929",
    secondary: "#666666",
    border: "#E5E5E5",
    danger: "#B42335",
  };

  // ============================================================
  // PAGE TITLES
  // ============================================================

  const pageTitles = [
    { path: "/admin", title: "Admin Dashboard" },
    { path: "/admin/spots", title: "Spot Management" },
    { path: "/admin/users", title: "User Management" },
    { path: "/admin/employees", title: "Employee Management" },
    { path: "/admin/categories", title: "Category Management" },
    { path: "/admin/reports", title: "Reports Management" },
  ];

  const currentPage =
    pageTitles.find((page) =>
      page.path === "/admin"
        ? location.pathname === page.path
        : location.pathname === page.path ||
          location.pathname.startsWith(`${page.path}/`)
    )?.title || "Admin Dashboard";

  // ============================================================
  // LOGOUT
  // ============================================================

  const handleLogout = () => {
    logout();
    window.location.href = "/login";
  };

  // ============================================================
  // SIDEBAR TOGGLE BUTTON STYLE
  // ============================================================

  const toggleButtonStyle = {
    width: "44px",
    height: "44px",
    minWidth: "44px",
    padding: 0,
    color: theme.text,
    backgroundColor: theme.accent,
    fontSize: "21px",
    lineHeight: 1,
    border: "none",
    borderRadius: "10px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    transition:
      "background-color 0.18s ease, transform 0.18s ease",
  };

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <header
      className="d-flex align-items-center justify-content-between flex-shrink-0"
      style={{
        height: "82px",
        minHeight: "82px",
        width: "100%",
        boxSizing: "border-box",
        padding: "0 24px",
        gap: "20px",
        position: "sticky",
        top: 0,
        zIndex: 1030,
        backgroundColor: theme.background,
        borderBottom: `1px solid ${theme.border}`,
        boxShadow: "0 2px 10px rgba(41, 41, 41, 0.035)",
        fontFamily:
          'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      {/* LEFT SECTION */}

      <div
        className="d-flex align-items-center"
        style={{
          minWidth: 0,
          flex: "1 1 auto",
          gap: "18px",
          height: "100%",
        }}
      >
        {/* DESKTOP SIDEBAR TOGGLE */}

        <button
          type="button"
          className="btn d-none d-lg-flex"
          onClick={onToggleSidebar}
          aria-label={
            sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"
          }
          title={
            sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"
          }
          style={toggleButtonStyle}
          onMouseEnter={(event) => {
            event.currentTarget.style.backgroundColor =
              theme.accentHover;
          }}
          onMouseLeave={(event) => {
            event.currentTarget.style.backgroundColor = theme.accent;
          }}
        >
          <i className="bi bi-list" />
        </button>

        {/* MOBILE SIDEBAR TOGGLE */}

        <button
          type="button"
          className="btn d-lg-none"
          onClick={onToggleMobileSidebar}
          aria-label="Open navigation menu"
          style={toggleButtonStyle}
          onMouseEnter={(event) => {
            event.currentTarget.style.backgroundColor =
              theme.accentHover;
          }}
          onMouseLeave={(event) => {
            event.currentTarget.style.backgroundColor = theme.accent;
          }}
        >
          <i className="bi bi-list" />
        </button>

        {/* PAGE TITLE */}

        <div
          className="d-flex flex-column justify-content-center"
          style={{
            minWidth: 0,
            gap: "4px",
          }}
        >
          <div
            className="fw-bold text-truncate"
            style={{
              color: theme.text,
              fontSize: "18px",
              lineHeight: "22px",
              letterSpacing: "-0.3px",
            }}
          >
            {currentPage}
          </div>

          <div
            className="d-none d-sm-block text-truncate"
            style={{
              color: theme.secondary,
              fontSize: "12px",
              lineHeight: "16px",
            }}
          >
            Manage and monitor NearSpot
          </div>
        </div>
      </div>

      {/* RIGHT SECTION */}

      <div
        className="d-flex align-items-center justify-content-end flex-shrink-0"
        style={{
          height: "100%",
          gap: "16px",
        }}
      >
        {/* NOTIFICATIONS */}

        <div
          className="d-flex align-items-center justify-content-center flex-shrink-0"
          style={{
            height: "44px",
          }}
        >
          <NotificationBell />
        </div>

        {/* ADMIN STATUS */}

        <div
          className="d-none d-md-flex align-items-center justify-content-center flex-shrink-0"
          style={{
            height: "40px",
            padding: "0 16px",
            gap: "9px",
            borderRadius: "22px",
            backgroundColor: theme.muted,
            border: `1px solid ${theme.border}`,
            color: theme.text,
            fontSize: "12px",
            fontWeight: 600,
            whiteSpace: "nowrap",
            boxSizing: "border-box",
          }}
        >
          <span
            className="rounded-circle flex-shrink-0"
            style={{
              width: "8px",
              height: "8px",
              backgroundColor: theme.accent,
              boxShadow: "0 0 0 3px rgba(255, 194, 26, 0.18)",
            }}
          />
          Admin
        </div>

        {/* PROFILE DROPDOWN */}

        <div className="dropdown flex-shrink-0">
          <button
            type="button"
            className="btn border-0 d-flex align-items-center rounded-3"
            data-bs-toggle="dropdown"
            aria-expanded="false"
            aria-label="Open administrator profile menu"
            style={{
              height: "48px",
              padding: "0",
              gap: "10px",
              backgroundColor: "transparent",
              boxShadow: "none",
            }}
          >
            {/* AVATAR */}

            <div
              className="rounded-circle d-flex align-items-center justify-content-center fw-bold flex-shrink-0"
              style={{
                width: "44px",
                height: "44px",
                boxSizing: "border-box",
                backgroundColor: theme.accent,
                color: theme.text,
                fontSize: "15px",
                border: "1px solid rgba(41, 41, 41, 0.08)",
              }}
            >
              {user?.email?.charAt(0)?.toUpperCase() || "A"}
            </div>

            {/* USER DETAILS */}

            <div
              className="d-none d-md-flex flex-column justify-content-center text-start"
              style={{
                minWidth: 0,
                gap: "3px",
              }}
            >
              <div
                className="fw-semibold text-truncate"
                style={{
                  color: theme.text,
                  fontSize: "12px",
                  lineHeight: "16px",
                  maxWidth: "170px",
                }}
              >
                {user?.email || "Administrator"}
              </div>

              <div
                style={{
                  color: theme.secondary,
                  fontSize: "10px",
                  lineHeight: "13px",
                }}
              >
                Administrator
              </div>
            </div>

            {/* DROPDOWN ARROW */}

            <i
              className="bi bi-chevron-down d-none d-md-inline"
              style={{
                color: theme.secondary,
                fontSize: "11px",
                marginLeft: "2px",
              }}
            />
          </button>

          {/* DROPDOWN MENU */}

          <ul
            className="dropdown-menu dropdown-menu-end mt-2 rounded-3 p-2"
            style={{
              minWidth: "240px",
              backgroundColor: theme.background,
              border: `1px solid ${theme.border}`,
              boxShadow: "0 8px 28px rgba(41, 41, 41, 0.10)",
            }}
          >
            <li>
              <div
                className="px-3 py-2"
                style={{ minWidth: "220px" }}
              >
                <div
                  className="fw-semibold text-break"
                  style={{
                    color: theme.text,
                    fontSize: "12px",
                  }}
                >
                  {user?.email || "Administrator"}
                </div>

                <div
                  className="mt-1"
                  style={{
                    color: theme.secondary,
                    fontSize: "10px",
                    letterSpacing: "0.7px",
                  }}
                >
                  ADMINISTRATOR
                </div>
              </div>
            </li>

            <li>
              <hr
                className="dropdown-divider"
                style={{ borderColor: theme.border }}
              />
            </li>

            <li>
              <button
                type="button"
                className="dropdown-item d-flex align-items-center gap-2 py-2 rounded-2"
                onClick={handleLogout}
                style={{
                  fontSize: "12px",
                  fontWeight: 500,
                  color: theme.danger,
                }}
                onMouseEnter={(event) => {
                  event.currentTarget.style.backgroundColor = "#FFF0EF";
                }}
                onMouseLeave={(event) => {
                  event.currentTarget.style.backgroundColor =
                    "transparent";
                }}
              >
                <i className="bi bi-box-arrow-right" />
                Logout
              </button>
            </li>
          </ul>
        </div>
      </div>
    </header>
  );
}

export default AdminTopbar;
