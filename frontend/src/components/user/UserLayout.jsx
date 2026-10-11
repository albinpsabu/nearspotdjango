
import { useState } from "react";
import { Outlet } from "react-router-dom";
import UserSidebar from "./UserSidebar";
import UserTopbar from "./UserTopbar";

function UserLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const closeMobileSidebar = () => {
    setMobileSidebarOpen(false);
  };

  const toggleSidebar = () => {
    setSidebarCollapsed((previous) => !previous);
  };

  const toggleMobileSidebar = () => {
    setMobileSidebarOpen((previous) => !previous);
  };

  return (
    <div
      className="d-flex w-100"
      style={{
        height: "100vh",
        height: "100dvh",
        overflow: "hidden",
        fontFamily:
          'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        backgroundColor: "#f5f8f7",
      }}
    >
      {/* Desktop Sidebar */}
      <aside
        className="d-none d-lg-block flex-shrink-0 bg-white"
        style={{
          width: sidebarCollapsed ? "78px" : "295px",
          height: "100%",
          overflowY: "auto",
          overflowX: "hidden",
          borderRight: "1px solid #e8eeee",
          transition: "width 0.25s ease",
        }}
      >
        <UserSidebar
          collapsed={sidebarCollapsed}
          onNavigate={closeMobileSidebar}
        />
      </aside>

      {/* Mobile Sidebar Backdrop */}
      {mobileSidebarOpen && (
        <div
          className="d-lg-none position-fixed top-0 start-0 w-100 h-100"
          onClick={closeMobileSidebar}
          style={{
            backgroundColor: "rgba(15, 23, 42, 0.45)",
            zIndex: 1040,
          }}
        />
      )}

      {/* Mobile Sidebar */}
      <aside
        className="d-lg-none position-fixed top-0 start-0 h-100 bg-white"
        style={{
          width: "295px",
          maxWidth: "85vw",
          zIndex: 1050,
          overflowY: "auto",
          overflowX: "hidden",
          transform: mobileSidebarOpen
            ? "translateX(0)"
            : "translateX(-100%)",
          transition: "transform 0.25s ease",
          visibility: mobileSidebarOpen ? "visible" : "hidden",
        }}
      >
        <UserSidebar
          collapsed={false}
          mobile
          onClose={closeMobileSidebar}
          onNavigate={closeMobileSidebar}
        />
      </aside>

      {/* Main Area */}
      <div
        className="d-flex flex-column flex-grow-1"
        style={{
          minWidth: 0,
          minHeight: 0,
          height: "100%",
          overflow: "hidden",
        }}
      >
        {/* Fixed Topbar */}
        <div
          className="flex-shrink-0 bg-white"
          style={{
            position: "relative",
            zIndex: 1030,
          }}
        >
          <UserTopbar
            sidebarCollapsed={sidebarCollapsed}
            onToggleSidebar={toggleSidebar}
            onToggleMobileSidebar={toggleMobileSidebar}
          />
        </div>

        {/* Scrollable Page Content */}
        <main
          className="flex-grow-1"
          style={{
            minWidth: 0,
            minHeight: 0,
            overflowY: "auto",
            overflowX: "hidden",
            backgroundColor: "#f5f8f7",
          }}
        >
          <div
            className="container-fluid px-3 px-md-4 py-4"
            style={{
              maxWidth: "1600px",
              margin: "0 auto",
            }}
          >
            <Outlet />
          </div>
        </main>

        {/* Footer */}
        <footer
          className="flex-shrink-0 px-3 px-md-4 py-3 border-top bg-white"
          style={{
            color: "#8a989a",
            fontSize: "11px",
          }}
        >
          NearSpot User Dashboard
        </footer>
      </div>
    </div>
  );
}

export default UserLayout;
