// ============================================================
// IMPORTS
// ============================================================

import AdminSidebar from "./AdminSidebar";
import AdminTopbar from "./AdminTopbar";

// ============================================================
// ADMIN LAYOUT
// ============================================================

function AdminLayout({ children }) {
  return (
    <div
      className="d-flex w-100 min-vh-100 bg-light"
      style={{
        fontFamily:
          'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      {/* ======================================================
          SIDEBAR
      ======================================================= */}

      <AdminSidebar />

      {/* ======================================================
          MAIN AREA
      ======================================================= */}

      <div
        className="d-flex flex-column flex-grow-1 min-vh-100"
        style={{
          minWidth: 0,
        }}
      >
        {/* ====================================================
            TOPBAR
        ===================================================== */}

        <AdminTopbar />

        {/* ====================================================
            PAGE CONTENT
        ===================================================== */}

        <main
          className="flex-grow-1 p-3 p-md-4"
          style={{
            minWidth: 0,
          }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}

// ============================================================
// EXPORT
// ============================================================

export default AdminLayout;