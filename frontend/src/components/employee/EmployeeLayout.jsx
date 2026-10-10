import { useState } from "react";
import EmployeeSidebar from "./EmployeeSidebar";
import EmployeeTopbar from "./EmployeeTopbar";

function EmployeeLayout({ children }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

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
        overflow: "hidden",
        fontFamily:
          'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        backgroundColor: "#f5f8f7",
      }}
    >
      {/* DESKTOP SIDEBAR */}
      <aside
        className="d-none d-lg-block flex-shrink-0 bg-white"
        style={{
          width: sidebarCollapsed ? "78px" : "250px",
          height: "100vh",
          overflowY: "auto",
          overflowX: "hidden",
          borderRight: "1px solid #e8eeee",
          transition: "width 0.25s ease",
        }}
      >
        <EmployeeSidebar
          collapsed={sidebarCollapsed}
          mobile={false}
          onNavigate={closeMobileSidebar}
        />
      </aside>

      {/* MOBILE BACKDROP */}
      {mobileSidebarOpen && (
        <div
          className="d-lg-none position-fixed top-0 start-0 w-100 h-100"
          onClick={closeMobileSidebar}
          style={{
            backgroundColor: "rgba(15, 23, 42, 0.5)",
            zIndex: 1040,
          }}
        />
      )}

      {/* MOBILE DRAWER */}
      <div
        className="d-lg-none position-fixed top-0 start-0 h-100"
        style={{
          width: "270px",
          maxWidth: "85vw",
          zIndex: 1050,
          overflowY: "auto",
          transform: mobileSidebarOpen
            ? "translateX(0)"
            : "translateX(-100%)",
          transition: "transform 0.25s ease",
          visibility: mobileSidebarOpen ? "visible" : "hidden",
        }}
      >
        <EmployeeSidebar
          collapsed={false}
          mobile
          onClose={closeMobileSidebar}
          onNavigate={closeMobileSidebar}
        />
      </div>

      {/* MAIN AREA */}
      <div
        className="d-flex flex-column flex-grow-1"
        style={{
          minWidth: 0,
          height: "100vh",
          overflow: "hidden",
        }}
      >
        {/* TOPBAR */}
        <div className="flex-shrink-0">
          <EmployeeTopbar
            sidebarCollapsed={sidebarCollapsed}
            onToggleSidebar={toggleSidebar}
            onToggleMobileSidebar={toggleMobileSidebar}
          />
        </div>

        {/* PAGE CONTENT */}
        <main
          className="flex-grow-1 p-3 p-md-4"
          style={{
            minWidth: 0,
            minHeight: 0,
            overflowY: "auto",
            overflowX: "hidden",
          }}
        >
          {children}

          <footer
            className="mt-4 pt-3 border-top"
            style={{ color: "#8a989a", fontSize: "11px" }}
          >
            NearSpot Employee Workspace
          </footer>
        </main>
      </div>
    </div>
  );
}

export default EmployeeLayout;