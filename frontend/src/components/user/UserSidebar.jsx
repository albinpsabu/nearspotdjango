
import { useLocation, useNavigate } from "react-router-dom";

function UserSidebar({
  collapsed = false,
  mobile = false,
  onClose,
  onNavigate,
}) {
  const navigate = useNavigate();
  const location = useLocation();

  const navigationItems = [
    {
      label: "Dashboard",
      path: "/user",
      icon: "bi-grid-1x2",
    },
    {
      label: "My Submissions",
      path: "/user/submissions",
      icon: "bi-geo-alt",
    },
    {
      label: "My Reviews",
      path: "/user/reviews",
      icon: "bi-chat-square-text",
    },
    {
      label: "Saved Spots",
      path: "/user/saved",
      icon: "bi-bookmark",
    },
    {
      label: "Profile",
      path: "/user/profile",
      icon: "bi-person",
    },
  ];

  const isCollapsed = collapsed && !mobile;

  const isActiveRoute = (path) => {
    if (path === "/user") {
      return location.pathname === "/user";
    }

    return (
      location.pathname === path ||
      location.pathname.startsWith(`${path}/`)
    );
  };

  const handleNavigation = (path) => {
    navigate(path);
    onNavigate?.();

    if (mobile) {
      onClose?.();
    }
  };

  return (
    <aside
      className="d-flex flex-column bg-white h-100"
      style={{
        width: "100%",
        minHeight: 0,
        color: "#1d2b2e",
        fontFamily:
          'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      {/* Brand */}
      <div
        className={`d-flex align-items-center border-bottom flex-shrink-0 ${
          isCollapsed
            ? "justify-content-center px-2"
            : "justify-content-between px-3 px-xl-4"
        }`}
        style={{
          height: "84px",
          minHeight: "84px",
          borderColor: "#e8eeee",
        }}
      >
        <div className="d-flex align-items-center gap-2">
          <div
            className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0 text-white fw-bold"
            style={{
              width: "46px",
              height: "46px",
              backgroundColor: "#20cfa7",
              fontSize: "22px",
              boxShadow: "0 4px 12px rgba(32,207,167,0.16)",
            }}
          >
            N
          </div>

          {!isCollapsed && (
            <div>
              <div
                className="fw-bold"
                style={{
                  fontSize: "20px",
                  letterSpacing: "-0.6px",
                  lineHeight: 1.2,
                  color: "#162326",
                }}
              >
                Near
                <span style={{ color: "#12b995" }}>
                  Spot
                </span>
              </div>

              <div
                className="mt-1"
                style={{
                  color: "#8b999b",
                  fontSize: "11px",
                }}
              >
                User Dashboard
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
              width: "36px",
              height: "36px",
              color: "#536366",
            }}
          >
            <i
              className="bi bi-x-lg"
              style={{ fontSize: "16px" }}
            />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav
        className={`flex-grow-1 ${
          isCollapsed ? "p-2" : "px-3 py-4"
        }`}
        style={{
          minHeight: 0,
          overflowY: "auto",
          overflowX: "hidden",
        }}
        aria-label="User navigation"
      >
        {!isCollapsed && (
          <div
            className="text-uppercase fw-semibold px-3 mb-3"
            style={{
              color: "#9caaad",
              fontSize: "11px",
              letterSpacing: "0.07em",
            }}
          >
            My Account
          </div>
        )}

        <div className="d-flex flex-column gap-2">
          {navigationItems.map((item) => {
            const active = isActiveRoute(item.path);

            return (
              <button
                key={item.path}
                type="button"
                title={
                  isCollapsed ? item.label : undefined
                }
                aria-label={item.label}
                aria-current={
                  active ? "page" : undefined
                }
                onClick={() =>
                  handleNavigation(item.path)
                }
                className="btn border-0 w-100 d-flex align-items-center rounded-3"
                style={{
                  minHeight: "52px",
                  justifyContent: isCollapsed
                    ? "center"
                    : "flex-start",
                  padding: isCollapsed
                    ? "10px 0"
                    : "12px 16px",
                  color: active
                    ? "#087f68"
                    : "#637174",
                  backgroundColor: active
                    ? "#e6f7f2"
                    : "transparent",
                  fontSize: "14px",
                  fontWeight: active ? 650 : 500,
                  textAlign: "left",
                  boxShadow: active
                    ? "inset 3px 0 0 #20cfa7"
                    : "none",
                  transition:
                    "background-color 0.15s ease, color 0.15s ease",
                }}
                onMouseEnter={(event) => {
                  if (!active) {
                    event.currentTarget.style.backgroundColor =
                      "#f5f8f7";
                  }
                }}
                onMouseLeave={(event) => {
                  if (!active) {
                    event.currentTarget.style.backgroundColor =
                      "transparent";
                  }
                }}
              >
                {/* Small fixed-size icon */}
                <i
                  className={`bi ${item.icon} flex-shrink-0`}
                  aria-hidden="true"
                  style={{
                    width: "24px",
                    fontSize: "17px",
                    lineHeight: 1,
                    textAlign: "center",
                    color: active
                      ? "#087f68"
                      : "#849396",
                  }}
                />

                {!isCollapsed && (
                  <>
                    <span
                      className="flex-grow-1"
                      style={{ marginLeft: "14px" }}
                    >
                      {item.label}
                    </span>

                    {active && (
                      <span
                        className="rounded-circle flex-shrink-0"
                        style={{
                          width: "7px",
                          height: "7px",
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

      {/* Bottom Section */}
      <div
        className={`border-top flex-shrink-0 ${
          isCollapsed ? "p-2" : "px-3 py-4"
        }`}
        style={{
          borderColor: "#e8eeee",
        }}
      >
        <button
          type="button"
          title={
            isCollapsed
              ? "Back to NearSpot"
              : undefined
          }
          aria-label="Back to NearSpot"
          onClick={() => handleNavigation("/")}
          className="btn border-0 w-100 d-flex align-items-center rounded-3"
          style={{
            minHeight: "44px",
            justifyContent: isCollapsed
              ? "center"
              : "flex-start",
            padding: isCollapsed
              ? "10px 0"
              : "10px 16px",
            color: "#687779",
            backgroundColor: "transparent",
            fontSize: "13px",
            fontWeight: 500,
            textAlign: "left",
          }}
          onMouseEnter={(event) => {
            event.currentTarget.style.backgroundColor =
              "#f5f8f7";
          }}
          onMouseLeave={(event) => {
            event.currentTarget.style.backgroundColor =
              "transparent";
          }}
        >
          <i
            className="bi bi-arrow-left flex-shrink-0"
            aria-hidden="true"
            style={{
              width: "24px",
              fontSize: "18px",
              textAlign: "center",
            }}
          />

          {!isCollapsed && (
            <span style={{ marginLeft: "14px" }}>
              Back to NearSpot
            </span>
          )}
        </button>

        {!isCollapsed && (
          <div
            className="mt-4 px-3"
            style={{
              color: "#a1acab",
              fontSize: "11px",
            }}
          >
            NearSpot User Panel
          </div>
        )}
      </div>
    </aside>
  );
}

export default UserSidebar;
