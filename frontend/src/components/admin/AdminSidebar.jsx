
import { useLocation, useNavigate } from "react-router-dom";

// ============================================================
// ADMIN SIDEBAR
// NearSpot Premium White + Yellow Theme
// ============================================================

function AdminSidebar({
  collapsed = false,
  mobile = false,
  onClose,
  onNavigate,
}) {
  const navigate = useNavigate();
  const location = useLocation();

  // ============================================================
  // THEME
  // ============================================================

  const theme = {
    background: "#FFFFFF",
    backgroundHover: "#FFF5D6",
    backgroundActive: "#FFC21A",
    primary: "#292929",
    accent: "#FFC21A",
    text: "#292929",
    secondary: "#666666",
    muted: "#FFF5D6",
    border: "#E5E5E5",
    activeText: "#292929",
  };

  // ============================================================
  // NAVIGATION ITEMS
  // ============================================================

  const navigationItems = [
    { label: "Dashboard", path: "/admin", icon: "bi-grid-1x2" },
    { label: "Spots", path: "/admin/spots", icon: "bi-geo-alt" },
    { label: "Users", path: "/admin/users", icon: "bi-people" },
    {
      label: "Employees",
      path: "/admin/employees",
      icon: "bi-person-badge",
    },
    {
      label: "Employee Permissions",
      path: "/admin/employee-permissions",
      icon: "bi-shield-check",
    },
    {
      label: "Categories",
      path: "/admin/categories",
      icon: "bi-grid",
    },
    {
      label: "Reports",
      path: "/admin/reports",
      icon: "bi-graph-up-arrow",
    },
  ];

  // ============================================================
  // ACTIVE ROUTE
  // ============================================================

  const isActiveRoute = (path) => {
    if (path === "/admin") {
      return location.pathname === "/admin";
    }

    return (
      location.pathname === path ||
      location.pathname.startsWith(`${path}/`)
    );
  };

  // ============================================================
  // NAVIGATION HANDLER
  // ============================================================

  const handleNavigation = (path) => {
    navigate(path);

    if (onNavigate) {
      onNavigate();
    }
  };

  const isCompact = collapsed && !mobile;

  // ============================================================
  // SIDEBAR CONTENT
  // ============================================================

  return (
    <aside
      className="d-flex flex-column"
      style={{
        width: "100%",
        height: "100%",
        minHeight: "100vh",
        boxSizing: "border-box",
        backgroundColor: theme.background,
        color: theme.text,
        borderRight: `1px solid ${theme.border}`,
        overflowX: "hidden",
        overflowY: "auto",
        fontFamily:
          'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      {/* ======================================================
          BRAND HEADER
          Fixed 82px height to align with AdminTopbar
      ======================================================= */}

      <div
        className={`d-flex align-items-center flex-shrink-0 ${
          isCompact
            ? "justify-content-center px-2"
            : "justify-content-between px-3"
        }`}
        style={{
          height: "82px",
          minHeight: "82px",
          boxSizing: "border-box",
          borderBottom: `1px solid ${theme.border}`,
          backgroundColor: theme.background,
        }}
      >
        <div
          className={`d-flex align-items-center ${
            isCompact ? "" : "gap-2"
          }`}
          style={{
            minWidth: 0,
          }}
        >
          {/* NEARSPOT LOGO */}

          <div
            className="d-flex align-items-center justify-content-center flex-shrink-0"
            style={{
              width: "46px",
              height: "46px",
              boxSizing: "border-box",
              borderRadius: "13px",
              backgroundColor: "#FFF5D6",
              border: "1px solid rgba(255, 194, 26, 0.45)",
              padding: "4px",
            }}
          >
            <img
              src="/logo.png"
              alt="NearSpot"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "contain",
                display: "block",
              }}
            />
          </div>

          {/* BRAND NAME */}

          {(!collapsed || mobile) && (
            <div
              className="d-flex flex-column justify-content-center"
              style={{
                minWidth: 0,
                gap: "3px",
              }}
            >
              <div
                className="fw-bold"
                style={{
                  color: theme.primary,
                  fontSize: "19px",
                  letterSpacing: "-0.6px",
                  lineHeight: "23px",
                  whiteSpace: "nowrap",
                }}
              >
                NearSpot
              </div>

              <div
                style={{
                  color: theme.secondary,
                  fontSize: "10px",
                  fontWeight: 600,
                  letterSpacing: "1.2px",
                  lineHeight: "14px",
                  textTransform: "uppercase",
                  whiteSpace: "nowrap",
                }}
              >
                Administration
              </div>
            </div>
          )}
        </div>

        {/* MOBILE CLOSE BUTTON */}

        {mobile && (
          <button
            type="button"
            className="btn border-0 d-flex align-items-center justify-content-center flex-shrink-0"
            onClick={onClose}
            aria-label="Close sidebar"
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "10px",
              color: theme.text,
              backgroundColor: theme.muted,
              fontSize: "18px",
              padding: 0,
            }}
            onMouseEnter={(event) => {
              event.currentTarget.style.backgroundColor =
                theme.backgroundHover;
            }}
            onMouseLeave={(event) => {
              event.currentTarget.style.backgroundColor = theme.muted;
            }}
          >
            <i className="bi bi-x-lg" />
          </button>
        )}
      </div>

      {/* ======================================================
          NAVIGATION
      ======================================================= */}

      <nav
        className={`flex-grow-1 ${isCompact ? "p-2" : "p-3"}`}
        aria-label="Admin navigation"
      >
        {(!collapsed || mobile) && (
          <div
            className="text-uppercase fw-bold px-3 mb-3 mt-2"
            style={{
              color: "#777777",
              fontSize: "10px",
              letterSpacing: "1.3px",
            }}
          >
            Workspace
          </div>
        )}

        <div className="d-flex flex-column gap-1">
          {navigationItems.map((item) => {
            const active = isActiveRoute(item.path);

            return (
              <button
                key={item.path}
                type="button"
                title={isCompact ? item.label : undefined}
                aria-label={item.label}
                aria-current={active ? "page" : undefined}
                onClick={() => handleNavigation(item.path)}
                className="btn border-0 w-100 d-flex align-items-center"
                style={{
                  minHeight: "46px",
                  boxSizing: "border-box",
                  justifyContent: isCompact
                    ? "center"
                    : "flex-start",
                  gap: isCompact ? 0 : "12px",
                  padding: isCompact ? "10px 0" : "10px 12px",
                  borderRadius: "11px",
                  color: active ? theme.activeText : theme.secondary,
                  backgroundColor: active
                    ? theme.backgroundActive
                    : "transparent",
                  fontSize: "13px",
                  fontWeight: active ? 700 : 500,
                  boxShadow: active
                    ? "0 4px 12px rgba(255, 194, 26, 0.22)"
                    : "none",
                  transition:
                    "background-color 0.18s ease, color 0.18s ease",
                  textAlign: "left",
                  outlineOffset: "2px",
                }}
                onMouseEnter={(event) => {
                  if (!active) {
                    event.currentTarget.style.backgroundColor =
                      theme.backgroundHover;
                    event.currentTarget.style.color = theme.text;
                  }
                }}
                onMouseLeave={(event) => {
                  if (!active) {
                    event.currentTarget.style.backgroundColor =
                      "transparent";
                    event.currentTarget.style.color = theme.secondary;
                  }
                }}
              >
                {/* NAVIGATION ICON */}

                <span
                  className="d-flex align-items-center justify-content-center flex-shrink-0"
                  style={{
                    width: "24px",
                    height: "24px",
                    fontSize: "20px",
                    color: active ? theme.activeText : theme.primary,
                  }}
                >
                  <i className={`bi ${item.icon}`} />
                </span>

                {/* NAVIGATION LABEL */}

                {(!collapsed || mobile) && (
                  <>
                    <span className="flex-grow-1 text-start">
                      {item.label}
                    </span>

                    {active && (
                      <span
                        className="rounded-circle flex-shrink-0"
                        style={{
                          width: "7px",
                          height: "7px",
                          backgroundColor: theme.activeText,
                        }}
                      />
                    )}
                  </>
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* ======================================================
          SIDEBAR BOTTOM
      ======================================================= */}

      <div
        className={`flex-shrink-0 ${
          isCompact ? "p-2" : "p-3"
        }`}
        style={{
          borderTop: `1px solid ${theme.border}`,
          backgroundColor: theme.background,
        }}
      >
        {/* BACK TO NEARSPOT */}

        <button
          type="button"
          title={isCompact ? "Back to NearSpot" : undefined}
          aria-label="Back to NearSpot"
          className="btn border-0 w-100 d-flex align-items-center"
          onClick={() => handleNavigation("/")}
          style={{
            boxSizing: "border-box",
            justifyContent: isCompact ? "center" : "flex-start",
            gap: isCompact ? 0 : "12px",
            padding: isCompact ? "10px 0" : "10px 12px",
            borderRadius: "11px",
            color: theme.secondary,
            backgroundColor: "transparent",
            fontSize: "12px",
            fontWeight: 600,
            minHeight: "44px",
            transition:
              "background-color 0.18s ease, color 0.18s ease",
          }}
          onMouseEnter={(event) => {
            event.currentTarget.style.backgroundColor =
              theme.backgroundHover;
            event.currentTarget.style.color = theme.text;
          }}
          onMouseLeave={(event) => {
            event.currentTarget.style.backgroundColor = "transparent";
            event.currentTarget.style.color = theme.secondary;
          }}
        >
          <span
            className="d-flex align-items-center justify-content-center flex-shrink-0"
            style={{
              width: "24px",
              height: "24px",
              fontSize: "20px",
              color: theme.primary,
            }}
          >
            <i className="bi bi-arrow-left" />
          </span>

          {(!collapsed || mobile) && (
            <span>Back to NearSpot</span>
          )}
        </button>

        {/* SIDEBAR FOOTER */}

        {(!collapsed || mobile) && (
          <div
            className="mt-3 pt-3 px-2"
            style={{
              borderTop: `1px solid ${theme.border}`,
              color: "#777777",
              fontSize: "10px",
              lineHeight: 1.6,
            }}
          >
            <div
              className="fw-semibold"
              style={{
                color: theme.primary,
              }}
            >
              NearSpot Admin Panel
            </div>

            <div>Manage your workspace</div>
          </div>
        )}
      </div>
    </aside>
  );
}

export default AdminSidebar;
