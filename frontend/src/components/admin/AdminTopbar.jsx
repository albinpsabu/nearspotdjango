
import { useAuth } from "../../context/AuthContext";
import { useLocation } from "react-router-dom";

// ============================================================
// ADMIN TOPBAR
// ============================================================

function AdminTopbar({
  sidebarCollapsed = false,
  onToggleSidebar,
  onToggleMobileSidebar,
}) {
  const { user, logout } = useAuth();
  const location = useLocation();

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
  // RENDER
  // ============================================================

  return (
    <header
      className="bg-white border-bottom d-flex align-items-center justify-content-between px-3 px-md-4 flex-shrink-0"
      style={{
        height: "72px",
        minHeight: "72px",
        position: "sticky",
        top: 0,
        zIndex: 1030,
        boxShadow: "0 2px 8px rgba(20, 40, 35, 0.025)",
      }}
    >
      {/* ======================================================
          LEFT SECTION
      ======================================================= */}

      <div className="d-flex align-items-center gap-3" style={{ minWidth: 0 }}>
        {/* DESKTOP SIDEBAR TOGGLE */}

        <button
          type="button"
          className="btn btn-light border-0 rounded-3 d-none d-lg-flex align-items-center justify-content-center flex-shrink-0"
          onClick={onToggleSidebar}
          aria-label={
            sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"
          }
          title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          style={{
            width: "38px",
            height: "38px",
            color: "#536366",
            fontSize: "20px",
          }}
        >
          {sidebarCollapsed ? "☰" : "☰"}
        </button>

        {/* MOBILE SIDEBAR TOGGLE */}

        <button
          type="button"
          className="btn btn-light border-0 rounded-3 d-lg-none d-flex align-items-center justify-content-center flex-shrink-0"
          onClick={onToggleMobileSidebar}
          aria-label="Open navigation menu"
          style={{
            width: "38px",
            height: "38px",
            color: "#536366",
            fontSize: "20px",
          }}
        >
          ☰
        </button>

        {/* PAGE TITLE */}

        <div style={{ minWidth: 0 }}>
          <div
            className="fw-bold text-truncate"
            style={{
              color: "#1d2b2e",
              fontSize: "17px",
              letterSpacing: "-0.3px",
            }}
          >
            {currentPage}
          </div>

          <div
            className="d-none d-sm-block mt-1 text-truncate"
            style={{
              color: "#8a989a",
              fontSize: "11px",
            }}
          >
            Manage and monitor NearSpot
          </div>
        </div>
      </div>

      {/* ======================================================
          RIGHT SECTION
      ======================================================= */}

      <div className="d-flex align-items-center gap-2 gap-md-3 flex-shrink-0">
        {/* ADMIN STATUS */}

        <div
          className="d-none d-md-flex align-items-center gap-2 px-3 py-2 rounded-pill"
          style={{
            backgroundColor: "#f0fbf8",
            color: "#247b69",
            fontSize: "11px",
            fontWeight: 600,
          }}
        >
          <span
            className="rounded-circle"
            style={{
              width: "7px",
              height: "7px",
              backgroundColor: "#20d9ae",
            }}
          />
          Admin
        </div>

        {/* ==================================================
            PROFILE DROPDOWN
        =================================================== */}

        <div className="dropdown">
          <button
            type="button"
            className="btn border-0 d-flex align-items-center gap-2 p-1 rounded-3"
            data-bs-toggle="dropdown"
            aria-expanded="false"
            aria-label="Open administrator profile menu"
          >
            <div
              className="rounded-circle d-flex align-items-center justify-content-center text-white fw-semibold flex-shrink-0"
              style={{
                width: "38px",
                height: "38px",
                backgroundColor: "#20cfa7",
                fontSize: "14px",
              }}
            >
              {user?.email?.charAt(0)?.toUpperCase() || "A"}
            </div>

            <div className="d-none d-md-block text-start">
              <div
                className="fw-semibold text-truncate"
                style={{
                  color: "#26373a",
                  fontSize: "12px",
                  maxWidth: "170px",
                }}
              >
                {user?.email || "Administrator"}
              </div>

              <div
                style={{
                  color: "#899597",
                  fontSize: "10px",
                }}
              >
                Administrator
              </div>
            </div>

            <span
              className="d-none d-md-inline ms-1"
              style={{
                color: "#879496",
                fontSize: "11px",
              }}
            >
              ▾
            </span>
          </button>

          {/* DROPDOWN MENU */}

          <ul className="dropdown-menu dropdown-menu-end border-0 shadow rounded-3 mt-2">
            <li>
              <div
                className="px-3 py-2"
                style={{ minWidth: "220px" }}
              >
                <div
                  className="fw-semibold text-break"
                  style={{
                    color: "#26373a",
                    fontSize: "12px",
                  }}
                >
                  {user?.email || "Administrator"}
                </div>

                <div
                  className="mt-1"
                  style={{
                    color: "#8a989a",
                    fontSize: "10px",
                  }}
                >
                  ADMINISTRATOR
                </div>
              </div>
            </li>

            <li>
              <hr className="dropdown-divider" />
            </li>

            <li>
              <button
                type="button"
                className="dropdown-item d-flex align-items-center gap-2 py-2"
                onClick={handleLogout}
                style={{
                  fontSize: "12px",
                  color: "#b42335",
                }}
              >
                <span>↪</span>
                Logout
              </button>
            </li>
          </ul>
        </div>
      </div>
    </header>
  );
}

// ============================================================
// EXPORT
// ============================================================

export default AdminTopbar;
