
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../../context/AuthContext";
import RadiusSelector from "../location/RadiusSelector";
import NearbySpotList from "../spots/NearbySpotList";

function NearSpotSidebar({
  collapsed,
  onToggle,
  radius,
  onRadiusChange,
  spots = [],
  loading = false,
  recentSearches = [],
  onRecentSearchSelect,
  onAddSpot,
  onLogin,
}) {
  const navigate = useNavigate();

  const {
    user,
    isAuthenticated,
    loading: authLoading,
    logout,
  } = useAuth();

  const [activeSection, setActiveSection] = useState("recent");

  const role = user?.role?.toUpperCase();

  const dashboardPath =
    role === "ADMIN"
      ? "/admin"
      : role === "EMPLOYEE"
      ? "/employee"
      : "/user";

  const profilePath =
    role === "EMPLOYEE"
      ? "/employee/profile"
      : role === "USER"
      ? "/user/profile"
      : dashboardPath;

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const menuItems = [
    {
      id: "recent",
      label: "Recent Searches",
      icon: "clock-history",
    },
    {
      id: "add",
      label: "Add a Hidden Spot",
      icon: "plus-circle",
    },
    {
      id: "radius",
      label: "Radius Selector",
      icon: "bullseye",
    },
    {
      id: "explore",
      label: "Explore",
      icon: "compass",
    },
  ];

  // The parent App controls authentication and spot creation.
  const handleMenuClick = (item) => {
    if (item.id === "add") {
      onAddSpot?.();
      return;
    }

    if (collapsed) {
      onToggle();
    }

    setActiveSection(item.id);
  };

  return (
    <aside
      className="position-absolute d-flex flex-column bg-white border shadow-lg"
      style={{
        top: "12px",
        bottom: "12px",
        left: "12px",
        width: collapsed ? "76px" : "320px",
        maxWidth: "calc(100vw - 24px)",
        borderRadius: "22px",
        overflow: "hidden",
        zIndex: 1100,
        transition: "width 0.3s ease",
      }}
    >
      {/* BRAND */}
      <div
        className={`d-flex align-items-center border-bottom p-3 ${
          collapsed
            ? "flex-column gap-2"
            : "justify-content-between"
        }`}
      >
        <div className="d-flex align-items-center gap-2">
          <i className="bi bi-geo-alt-fill fs-3 text-success" />

          {!collapsed && (
            <span className="fs-4 fw-bold text-dark">
              NearSpot
            </span>
          )}
        </div>

        <button
          type="button"
          className="btn btn-light rounded-3 border-0"
          onClick={onToggle}
          aria-label={
            collapsed ? "Expand sidebar" : "Collapse sidebar"
          }
        >
          <i className="bi bi-list fs-5" />
        </button>
      </div>

      {/* NAVIGATION */}
      <div className="flex-grow-1 overflow-auto p-3">
        <nav className="nav nav-pills flex-column gap-2">
          {menuItems.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`nav-link d-flex align-items-center gap-3 text-start rounded-3 ${
                collapsed ? "justify-content-center" : ""
              } ${
                activeSection === item.id
                  ? "bg-success bg-opacity-10 text-success fw-semibold"
                  : "text-dark"
              }`}
              onClick={() => handleMenuClick(item)}
              title={collapsed ? item.label : undefined}
            >
              <i className={`bi bi-${item.icon} fs-5`} />

              {!collapsed && (
                <span className="small">{item.label}</span>
              )}
            </button>
          ))}
        </nav>

        {/* RECENT SEARCHES */}
        {!collapsed && activeSection === "recent" && (
          <div className="mt-4">
            <h6 className="small fw-bold text-secondary mb-3">
              Recent Searches
            </h6>

            {recentSearches.length === 0 ? (
              <div className="bg-light rounded-3 p-3 small text-secondary">
                Your recent searches will appear here.
              </div>
            ) : (
              <div className="list-group list-group-flush">
                {recentSearches.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className="list-group-item list-group-item-action small px-2 text-start"
                    onClick={() =>
                      onRecentSearchSelect?.({
                        latitude: item.latitude,
                        longitude: item.longitude,
                      })
                    }
                  >
                    <i className="bi bi-clock-history text-success me-2" />
                    {item.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* RADIUS SELECTOR */}
        {!collapsed && activeSection === "radius" && (
          <div className="card border-0 bg-light rounded-4 mt-4">
            <div className="card-body p-3">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <span className="small fw-semibold">
                  Search Radius
                </span>

                <span className="badge text-bg-success">
                  {(radius / 1000).toFixed(1)} km
                </span>
              </div>

              <RadiusSelector
                radius={radius}
                onRadiusChange={onRadiusChange}
              />
            </div>
          </div>
        )}

        {/* EXPLORE */}
        {!collapsed && activeSection === "explore" && (
          <div className="mt-4">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h6 className="fw-bold mb-0">
                Explore HiddenSpots
              </h6>

              <span className="badge text-bg-success">
                {spots.length}
              </span>
            </div>

            {loading ? (
              <div className="text-center py-4">
                <div
                  className="spinner-border spinner-border-sm text-success"
                  role="status"
                />
                <p className="small text-secondary mt-2">
                  Finding nearby spots...
                </p>
              </div>
            ) : (
              <NearbySpotList spots={spots} />
            )}
          </div>
        )}

        {/* ACCOUNT NAVIGATION */}
        {!collapsed && !authLoading && isAuthenticated && (
          <div className="mt-4 pt-3 border-top">
            <h6 className="small fw-bold text-secondary mb-3">
              MY ACCOUNT
            </h6>

            <button
              type="button"
              className="btn btn-light w-100 text-start mb-2"
              onClick={() => navigate(dashboardPath)}
            >
              <i className="bi bi-speedometer2 me-2" />
              Dashboard
            </button>

            <button
              type="button"
              className="btn btn-light w-100 text-start mb-2"
              onClick={() => navigate(profilePath)}
            >
              <i className="bi bi-person me-2" />
              My Profile
            </button>

            {role === "USER" && (
              <>
                <button
                  type="button"
                  className="btn btn-light w-100 text-start mb-2"
                  onClick={() => navigate("/user/submissions")}
                >
                  <i className="bi bi-pin-map me-2" />
                  My Submissions
                </button>

                <button
                  type="button"
                  className="btn btn-light w-100 text-start mb-2"
                  onClick={() => navigate("/user/reviews")}
                >
                  <i className="bi bi-star me-2" />
                  My Reviews
                </button>

                <button
                  type="button"
                  className="btn btn-light w-100 text-start"
                  onClick={() => navigate("/user/saved")}
                >
                  <i className="bi bi-bookmark-heart me-2" />
                  Saved Spots
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* ACCOUNT FOOTER */}
      <div className="border-top p-3 mt-auto">
        {authLoading ? (
          <div className="text-center">
            <span
              className="spinner-border spinner-border-sm text-success"
              role="status"
            />
          </div>
        ) : isAuthenticated ? (
          <div className="d-flex flex-column gap-2">
            <button
              type="button"
              className={`btn bg-light rounded-4 d-flex align-items-center p-2 ${
                collapsed
                  ? "justify-content-center"
                  : "gap-2 text-start"
              }`}
              onClick={() => navigate(profilePath)}
              title="My profile"
            >
              <span className="rounded-circle bg-success bg-opacity-10 text-success p-2">
                <i className="bi bi-person-fill fs-5" />
              </span>

              {!collapsed && (
                <span className="overflow-hidden">
                  <strong className="d-block small text-truncate">
                    {user?.name || user?.email || "My Account"}
                  </strong>

                  <span className="d-block small text-secondary text-truncate">
                    {user?.email || role}
                  </span>
                </span>
              )}
            </button>

            <button
              type="button"
              className="btn btn-outline-danger btn-sm rounded-3"
              onClick={handleLogout}
              title="Logout"
            >
              <i className="bi bi-box-arrow-right" />
              {!collapsed && (
                <span className="ms-2">Logout</span>
              )}
            </button>
          </div>
        ) : (
          <div className="d-flex flex-column gap-2">
            {!collapsed && (
              <span className="small text-secondary text-center">
                Sign in to save and share places
              </span>
            )}

            <button
              type="button"
              className="btn btn-success rounded-3"
              onClick={() => onLogin?.()}
              title="Login"
            >
              <i className="bi bi-box-arrow-in-right" />
              {!collapsed && (
                <span className="ms-2">Login / Register</span>
              )}
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}

export default NearSpotSidebar;
