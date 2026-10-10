import { useLocation, useNavigate } from "react-router-dom";

function EmployeeSidebar({
  collapsed = false,
  mobile = false,
  onClose,
  onNavigate,
}) {
  const navigate = useNavigate();
  const location = useLocation();

  const navigationItems = [
    { label: "Dashboard", path: "/employee", icon: "▦" },
    { label: "Pending Spots", path: "/employee/spots", icon: "⌖" },
    { label: "Reports", path: "/employee/reports", icon: "⚑" },
    { label: "Profile", path: "/employee/profile", icon: "♙" },
  ];

  const isActiveRoute = (path) => {
    if (path === "/employee") {
      return location.pathname === "/employee";
    }

    return (
      location.pathname === path ||
      location.pathname.startsWith(`${path}/`)
    );
  };

  const handleNavigation = (path) => {
    navigate(path);
    onNavigate?.();
  };

  return (
    <aside
      className="d-flex flex-column h-100 bg-white"
      style={{
        width: "100%",
        minHeight: "100vh",
        borderRight: "1px solid #e8eeee",
        overflowX: "hidden",
        overflowY: "auto",
      }}
    >
      {/* BRAND */}
      <div
        className={`d-flex align-items-center ${
          collapsed && !mobile
            ? "justify-content-center px-2"
            : "justify-content-between px-3 px-xl-4"
        } border-bottom flex-shrink-0`}
        style={{ height: "72px", minHeight: "72px" }}
      >
        <div
          className={`d-flex align-items-center ${
            collapsed && !mobile ? "" : "gap-2"
          }`}
        >
          <div
            className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold flex-shrink-0"
            style={{
              width: "38px",
              height: "38px",
              backgroundColor: "#20cfa7",
              fontSize: "18px",
              boxShadow: "0 4px 12px rgba(32, 207, 167, 0.2)",
            }}
          >
            N
          </div>

          {(!collapsed || mobile) && (
            <div>
              <div
                className="fw-bold"
                style={{
                  color: "#162326",
                  fontSize: "18px",
                  letterSpacing: "-0.5px",
                  lineHeight: 1.2,
                }}
              >
                Near<span style={{ color: "#12b995" }}>Spot</span>
              </div>

              <div
                className="mt-1"
                style={{ color: "#899597", fontSize: "10px" }}
              >
                Employee Workspace
              </div>
            </div>
          )}
        </div>

        {mobile && (
          <button
            type="button"
            className="btn btn-light border-0 rounded-3"
            onClick={onClose}
            aria-label="Close sidebar"
            style={{
              width: "34px",
              height: "34px",
              color: "#536366",
              fontSize: "19px",
              lineHeight: 1,
            }}
          >
            ×
          </button>
        )}
      </div>

      {/* NAVIGATION */}
      <nav className={`flex-grow-1 ${collapsed && !mobile ? "p-2" : "p-3"}`}>
        {(!collapsed || mobile) && (
          <div
            className="text-uppercase fw-semibold px-3 mb-3 mt-1"
            style={{
              color: "#a0aaaa",
              fontSize: "10px",
              letterSpacing: "0.1em",
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
                title={collapsed && !mobile ? item.label : undefined}
                aria-label={item.label}
                aria-current={active ? "page" : undefined}
                onClick={() => handleNavigation(item.path)}
                className="btn border-0 w-100 d-flex align-items-center rounded-3"
                style={{
                  minHeight: "44px",
                  justifyContent:
                    collapsed && !mobile ? "center" : "flex-start",
                  gap: collapsed && !mobile ? 0 : "13px",
                  padding:
                    collapsed && !mobile ? "10px 0" : "10px 13px",
                  color: active ? "#087f68" : "#637174",
                  backgroundColor: active ? "#e8f8f3" : "transparent",
                  fontSize: "13px",
                  fontWeight: active ? 650 : 500,
                  boxShadow: active
                    ? "inset 3px 0 0 #20cfa7"
                    : "none",
                  transition:
                    "background-color 0.15s ease, color 0.15s ease",
                }}
                onMouseEnter={(event) => {
                  if (!active) {
                    event.currentTarget.style.backgroundColor = "#f5f8f7";
                  }
                }}
                onMouseLeave={(event) => {
                  if (!active) {
                    event.currentTarget.style.backgroundColor = "transparent";
                  }
                }}
              >
                <span
                  className="d-flex align-items-center justify-content-center flex-shrink-0"
                  style={{
                    width: "23px",
                    height: "23px",
                    fontSize: "19px",
                    color: active ? "#0b9b7d" : "#82908f",
                  }}
                >
                  {item.icon}
                </span>

                {(!collapsed || mobile) && (
                  <>
                    <span className="flex-grow-1 text-start">
                      {item.label}
                    </span>

                    {active && (
                      <span
                        className="rounded-circle flex-shrink-0"
                        style={{
                          width: "6px",
                          height: "6px",
                          backgroundColor: "#20cfa7",
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

      {/* SIDEBAR BOTTOM */}
      <div
        className={`border-top flex-shrink-0 ${
          collapsed && !mobile ? "p-2" : "p-3"
        }`}
      >
        <button
          type="button"
          title={collapsed && !mobile ? "Back to NearSpot" : undefined}
          aria-label="Back to NearSpot"
          className="btn border-0 w-100 d-flex align-items-center rounded-3"
          onClick={() => handleNavigation("/")}
          style={{
            justifyContent:
              collapsed && !mobile ? "center" : "flex-start",
            gap: collapsed && !mobile ? 0 : "13px",
            padding:
              collapsed && !mobile ? "10px 0" : "10px 13px",
            color: "#687779",
            backgroundColor: "transparent",
            fontSize: "12px",
            fontWeight: 500,
            minHeight: "44px",
          }}
        >
          <span
            className="d-flex align-items-center justify-content-center flex-shrink-0"
            style={{ width: "23px", fontSize: "19px" }}
          >
            ←
          </span>

          {(!collapsed || mobile) && (
            <span>Back to NearSpot</span>
          )}
        </button>

        {(!collapsed || mobile) && (
          <div
            className="mt-3 px-2"
            style={{ color: "#a1acab", fontSize: "10px" }}
          >
            NearSpot Employee Panel
          </div>
        )}
      </div>
    </aside>
  );
}

export default EmployeeSidebar;