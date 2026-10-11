
import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import UserLoginModal from "./UserLoginModal";

export default function UserNavbar() {
  const { user, isAuthenticated, logout } = useAuth();

  const [showLogin, setShowLogin] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  const navigate = useNavigate();

  // Close all navigation menus
  const closeMenus = () => {
    setShowProfileMenu(false);
    setShowMobileMenu(false);
  };

  // Logout and return to homepage
  const handleLogout = async () => {
    closeMenus();

    try {
      await logout();
    } finally {
      navigate("/", { replace: true });
    }
  };

  // Navigation link styling
  const navLinkClass = ({ isActive }) =>
    `nav-link fw-medium px-3 ${
      isActive ? "text-success" : "text-secondary"
    }`;

  return (
    <>
      {/* Main Navbar */}
      <header
        className="bg-white border-bottom sticky-top"
        style={{ zIndex: 1030 }}
      >
        <nav className="navbar navbar-expand-md py-2">
          <div className="container-xl">
            {/* Logo */}
            <NavLink
              to="/"
              end
              className="navbar-brand fw-bold fs-4 mb-0"
              style={{ color: "#1d2b2e" }}
              onClick={closeMenus}
            >
              <span style={{ color: "#20cfa7" }}>Near</span>Spot
            </NavLink>

            {/* Mobile Menu Toggle */}
            <button
              type="button"
              className="navbar-toggler border-0 shadow-none"
              aria-label="Toggle navigation"
              aria-expanded={showMobileMenu}
              onClick={() =>
                setShowMobileMenu((previous) => !previous)
              }
            >
              <i
                className="bi bi-list fs-3"
                aria-hidden="true"
                style={{ fontSize: "24px" }}
              />
            </button>

            {/* Navigation */}
            <div
              className={`collapse navbar-collapse ${
                showMobileMenu ? "show" : ""
              }`}
            >
              <ul className="navbar-nav mx-auto my-3 my-md-0 gap-md-2">
                <li className="nav-item">
                  <NavLink
                    to="/"
                    end
                    className={navLinkClass}
                    onClick={closeMenus}
                  >
                    Explore
                  </NavLink>
                </li>

                <li className="nav-item">
                  <NavLink
                    to="/categories"
                    className={navLinkClass}
                    onClick={closeMenus}
                  >
                    Categories
                  </NavLink>
                </li>

                <li className="nav-item">
                  <NavLink
                    to="/about"
                    className={navLinkClass}
                    onClick={closeMenus}
                  >
                    About
                  </NavLink>
                </li>
              </ul>

              {/* Right Side Actions */}
              <div className="d-flex align-items-md-center gap-3 pb-2 pb-md-0">
                {isAuthenticated ? (
                  <div className="dropdown">
                    {/* Profile Button */}
                    <button
                      type="button"
                      className="btn d-flex align-items-center gap-2 border-0 shadow-none p-1"
                      onClick={() =>
                        setShowProfileMenu((previous) => !previous)
                      }
                      aria-label="Open profile menu"
                      aria-expanded={showProfileMenu}
                      aria-haspopup="true"
                    >
                      {/* Profile Avatar */}
                      <span
                        className="rounded-circle d-flex align-items-center justify-content-center fw-semibold flex-shrink-0"
                        style={{
                          width: "38px",
                          height: "38px",
                          minWidth: "38px",
                          minHeight: "38px",
                          maxWidth: "38px",
                          maxHeight: "38px",
                          backgroundColor: "#e0f8f1",
                          color: "#087f68",
                          fontSize: "14px",
                          lineHeight: 1,
                          overflow: "hidden",
                        }}
                      >
                        {user?.name?.trim()?.charAt(0)?.toUpperCase() || "U"}
                      </span>

                      {/* Username */}
                      <span className="d-none d-sm-inline fw-semibold">
                        {user?.name || "User"}
                      </span>

                      {/* Dropdown Arrow */}
                      <i
                        className="bi bi-chevron-down small text-secondary"
                        aria-hidden="true"
                        style={{ fontSize: "12px" }}
                      />
                    </button>

                    {/* Profile Dropdown */}
                    {showProfileMenu && (
                      <>
                        {/* Click Outside Overlay */}
                        <button
                          type="button"
                          className="position-fixed top-0 start-0 w-100 h-100 border-0 p-0"
                          style={{
                            zIndex: 1035,
                            background: "transparent",
                            cursor: "default",
                          }}
                          aria-label="Close profile menu"
                          onClick={() => setShowProfileMenu(false)}
                        />

                        {/* Dropdown Content */}
                        <div
                          className="dropdown-menu dropdown-menu-end show mt-2 p-0 rounded-4 border-0 shadow"
                          style={{
                            minWidth: "230px",
                            zIndex: 1040,
                            position: "absolute",
                            right: 0,
                          }}
                        >
                          {/* User Details */}
                          <div className="px-3 py-3 border-bottom">
                            <div className="fw-semibold text-truncate">
                              {user?.name || "User"}
                            </div>

                            <div className="small text-secondary text-truncate">
                              {user?.email || "User Account"}
                            </div>
                          </div>

                          {/* Dashboard Navigation */}
                          {[
                            {
                              to: "/user",
                              label: "Dashboard",
                              icon: "bi-grid",
                            },
                            {
                              to: "/user/submissions",
                              label: "My Submissions",
                              icon: "bi-geo-alt",
                            },
                            {
                              to: "/user/reviews",
                              label: "My Reviews",
                              icon: "bi-chat-square-text",
                            },
                            {
                              to: "/user/saved",
                              label: "Saved Spots",
                              icon: "bi-bookmark",
                            },
                            {
                              to: "/user/profile",
                              label: "Profile",
                              icon: "bi-person",
                            },
                          ].map((item) => (
                            <NavLink
                              key={item.to}
                              to={item.to}
                              onClick={closeMenus}
                              className="dropdown-item py-2 px-3"
                            >
                              <i
                                className={`bi ${item.icon} me-2`}
                                aria-hidden="true"
                                style={{ fontSize: "14px" }}
                              />
                              {item.label}
                            </NavLink>
                          ))}

                          {/* Logout */}
                          <div className="border-top p-1">
                            <button
                              type="button"
                              onClick={handleLogout}
                              className="dropdown-item py-2 text-danger rounded-2"
                            >
                              <i
                                className="bi bi-box-arrow-right me-2"
                                aria-hidden="true"
                                style={{ fontSize: "14px" }}
                              />
                              Logout
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  /* Guest Actions */
                  <div className="d-flex align-items-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setShowLogin(true);
                        closeMenus();
                      }}
                      className="btn btn-link text-decoration-none fw-semibold p-0"
                      style={{ color: "#526366" }}
                    >
                      Sign in
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setShowLogin(true);
                        closeMenus();
                      }}
                      className="btn text-white fw-semibold rounded-3 px-3 py-2"
                      style={{
                        backgroundColor: "#20cfa7",
                        borderColor: "#20cfa7",
                      }}
                    >
                      Get Started
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </nav>
      </header>

      {/* Login Modal */}
      <UserLoginModal
        isOpen={showLogin}
        onClose={() => setShowLogin(false)}
      />
    </>
  );
}
