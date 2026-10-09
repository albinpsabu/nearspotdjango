// ============================================================
// IMPORTS
// ============================================================

import { useNavigate } from "react-router-dom";

// ============================================================
// ADMIN SIDEBAR
// ============================================================

function AdminSidebar() {
  const navigate = useNavigate();

  // ============================================================
  // NAVIGATION ITEMS
  // ============================================================

  const navigationItems = [
    {
      label: "Dashboard",
      path: "/admin",
      icon: "▦",
    },
    {
      label: "Spots",
      path: "/admin/spots",
      icon: "⌖",
    },
    {
      label: "Users",
      path: "/admin/users",
      icon: "♙",
    },
    {
      label: "Employees",
      path: "/admin/employees",
      icon: "♟",
    },
    {
      label: "Categories",
      path: "/admin/categories",
      icon: "▤",
    },
    {
      label: "Reports",
      path: "/admin/reports",
      icon: "⚑",
    },
  ];

  // ============================================================
  // NAVIGATION HANDLER
  // ============================================================

  const handleNavigation = (path) => {
    navigate(path);
  };

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <aside
      className="d-none d-lg-flex flex-column flex-shrink-0 bg-white border-end"
      style={{
        width: "250px",
        minHeight: "100vh",
      }}
    >
      {/* ======================================================
          BRAND
      ======================================================= */}

      <div
        className="d-flex align-items-center gap-2 px-4 border-bottom"
        style={{
          height: "72px",
        }}
      >
        <div
          className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold flex-shrink-0"
          style={{
            width: "36px",
            height: "36px",
            backgroundColor: "#20d9ae",
            fontSize: "17px",
          }}
        >
          N
        </div>

        <div>
          <div
            className="fw-bold lh-1"
            style={{
              color: "#162326",
              fontSize: "18px",
            }}
          >
            Near<span style={{ color: "#12cfa4" }}>Spot</span>
          </div>

          <div
            className="mt-1"
            style={{
              color: "#899597",
              fontSize: "10px",
            }}
          >
            Administration
          </div>
        </div>
      </div>

      {/* ======================================================
          NAVIGATION
      ======================================================= */}

      <nav className="flex-grow-1 p-3">
        <div
          className="text-uppercase fw-semibold px-3 mb-2"
          style={{
            color: "#9aa6a8",
            fontSize: "10px",
            letterSpacing: "0.08em",
          }}
        >
          Management
        </div>

        <div className="d-flex flex-column gap-1">
          {navigationItems.map((item) => (
            <button
              key={item.path}
              type="button"
              className="btn border-0 w-100 d-flex align-items-center gap-3 text-start rounded-3 px-3 py-2"
              onClick={() => handleNavigation(item.path)}
              style={{
                color: "#536366",
                fontSize: "13px",
                fontWeight: 500,
              }}
            >
              <span
                className="d-flex align-items-center justify-content-center flex-shrink-0"
                style={{
                  width: "22px",
                  fontSize: "17px",
                  color: "#687779",
                }}
              >
                {item.icon}
              </span>

              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* ======================================================
          BOTTOM SECTION
      ======================================================= */}

      <div className="p-3 border-top">
        <button
          type="button"
          className="btn border-0 w-100 d-flex align-items-center gap-3 text-start rounded-3 px-3 py-2"
          onClick={() => navigate("/")}
          style={{
            color: "#687779",
            fontSize: "13px",
            fontWeight: 500,
          }}
        >
          <span
            className="d-flex align-items-center justify-content-center"
            style={{
              width: "22px",
              fontSize: "16px",
            }}
          >
            ←
          </span>

          <span>Back to NearSpot</span>
        </button>
      </div>
    </aside>
  );
}

// ============================================================
// EXPORT
// ============================================================

export default AdminSidebar;