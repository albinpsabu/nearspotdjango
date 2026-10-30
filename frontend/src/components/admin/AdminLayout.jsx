
import { useState } from "react";
import AdminSidebar from "./AdminSidebar";
import AdminTopbar from "./AdminTopbar";

// ============================================================
// ADMIN LAYOUT
// NearSpot White + Yellow Premium Theme
// ============================================================

function AdminLayout({ children }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const theme = {
    background: "#FAFAFA",
    surface: "#FFFFFF",
    text: "#292929",
    secondary: "#777777",
    accent: "#FFC21A",
    border: "#E5E5E5",
    overlay: "rgba(25, 25, 25, 0.40)",
  };

  const toggleSidebar = () => {
    setSidebarCollapsed((previous) => !previous);
  };

  const toggleMobileSidebar = () => {
    setMobileSidebarOpen((previous) => !previous);
  };

  const closeMobileSidebar = () => {
    setMobileSidebarOpen(false);
  };

  return (
    <div
      className="d-flex w-100"
      style={{
        height: "100vh",
        minHeight: 0,
        overflow: "hidden",
        fontFamily:
          'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        backgroundColor: theme.background,
        color: theme.text,
      }}
    >
      {/* ======================================================
          DESKTOP SIDEBAR
      ======================================================= */}

      <aside
        className="d-none d-lg-block flex-shrink-0"
        style={{
          width: sidebarCollapsed ? "78px" : "250px",
          height: "100vh",
          minHeight: 0,
          overflow: "hidden",
          backgroundColor: theme.surface,
          borderRight: `1px solid ${theme.border}`,
          transition: "width 0.25s ease",
        }}
      >
        <AdminSidebar
          collapsed={sidebarCollapsed}
          mobile={false}
          onNavigate={closeMobileSidebar}
        />
      </aside>

      {/* ======================================================
          MOBILE SIDEBAR BACKDROP
      ======================================================= */}

      {mobileSidebarOpen && (
        <div
          className="d-lg-none position-fixed top-0 start-0 w-100 h-100"
          onClick={closeMobileSidebar}
          aria-hidden="true"
          style={{
            backgroundColor: theme.overlay,
            zIndex: 1040,
            backdropFilter: "blur(2px)",
          }}
        />
      )}

      {/* ======================================================
          MOBILE SIDEBAR DRAWER
      ======================================================= */}

      <div
        className="d-lg-none position-fixed top-0 start-0 h-100"
        style={{
          width: "270px",
          maxWidth: "85vw",
          height: "100dvh",
          zIndex: 1050,
          overflow: "hidden",
          backgroundColor: theme.surface,
          boxShadow: mobileSidebarOpen
            ? "8px 0 30px rgba(0, 0, 0, 0.08)"
            : "none",
          transform: mobileSidebarOpen
            ? "translateX(0)"
            : "translateX(-100%)",
          transition:
            "transform 0.25s ease, box-shadow 0.25s ease",
          visibility: mobileSidebarOpen ? "visible" : "hidden",
          pointerEvents: mobileSidebarOpen ? "auto" : "none",
        }}
      >
        <AdminSidebar
          collapsed={false}
          mobile
          onClose={closeMobileSidebar}
          onNavigate={closeMobileSidebar}
        />
      </div>

      {/* ======================================================
          MAIN AREA
      ======================================================= */}

      <div
        className="d-flex flex-column flex-grow-1"
        style={{
          minWidth: 0,
          minHeight: 0,
          height: "100vh",
          overflow: "hidden",
          backgroundColor: theme.background,
        }}
      >
        {/* ====================================================
            TOPBAR
        ===================================================== */}

        <div
          className="flex-shrink-0"
          style={{
            height: "82px",
            minHeight: "82px",
            backgroundColor: theme.surface,
            borderBottom: `1px solid ${theme.border}`,
            position: "relative",
            zIndex: 10,
          }}
        >
          <AdminTopbar
            sidebarCollapsed={sidebarCollapsed}
            onToggleSidebar={toggleSidebar}
            onToggleMobileSidebar={toggleMobileSidebar}
          />
        </div>

        {/* ====================================================
            SCROLLABLE PAGE CONTENT
        ===================================================== */}

        <main
          className="flex-grow-1 p-3 p-md-4"
          style={{
            minWidth: 0,
            minHeight: 0,
            overflowY: "auto",
            overflowX: "hidden",
            backgroundColor: theme.background,
            color: theme.text,
            overscrollBehavior: "contain",
          }}
        >
          {children}

          {/* FOOTER */}

          <footer
            className="mt-4 pt-3"
            style={{
              color: theme.secondary,
              borderTop: `1px solid ${theme.border}`,
              fontSize: "11px",
              lineHeight: 1.6,
            }}
          >
            NearSpot Administration
          </footer>
        </main>
      </div>
    </div>
  );
}

// ============================================================
// EXPORT
// ============================================================

export default AdminLayout;
