
import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";

// ============================================================
// AUTHENTICATION MODAL
// ============================================================

function AuthModal({
  show,
  onClose,
  onSuccess,
  initialTab = "login",
}) {
  const { login, register } = useAuth();

  const [activeTab, setActiveTab] = useState(initialTab);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Reset the form whenever the modal opens.
  useEffect(() => {
    if (show) {
      setActiveTab(initialTab);
      setName("");
      setEmail("");
      setPassword("");
      setConfirmPassword("");
      setRememberMe(false);
      setError("");
    }
  }, [show, initialTab]);

  // Close on Escape and prevent background scrolling.
  useEffect(() => {
    if (!show) return;

    const handleEscape = (event) => {
      if (event.key === "Escape" && !loading) {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [show, loading, onClose]);

  // Extract a useful message from Django validation errors.
  const getErrorMessage = (requestError) => {
    const data = requestError?.response?.data;

    if (typeof data?.detail === "string") {
      return data.detail;
    }

    if (data && typeof data === "object") {
      for (const value of Object.values(data)) {
        if (Array.isArray(value) && value.length > 0) {
          return String(value[0]);
        }

        if (typeof value === "string") {
          return value;
        }
      }
    }

    return requestError?.message || "Something went wrong.";
  };

  // Switch between Login and Register.
  const switchTab = (tab) => {
    if (loading) return;

    setActiveTab(tab);
    setError("");
    setPassword("");
    setConfirmPassword("");
  };

  // Submit login or registration.
  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (loading) return;

    if (activeTab === "register") {
      if (!name.trim()) {
        setError("Please enter your name.");
        return;
      }

      if (password.length < 8) {
        setError("Password must contain at least 8 characters.");
        return;
      }

      if (password !== confirmPassword) {
        setError("Passwords do not match.");
        return;
      }
    }

    setLoading(true);

    try {
      let currentUser;

      if (activeTab === "register") {
        // Create a user through Django REST Framework.
        await register(name, email, password);

        // Registration does not return JWT tokens,
        // so sign in using the existing login function.
        currentUser = await login(
          email,
          password,
          rememberMe
        );
      } else {
        currentUser = await login(
          email,
          password,
          rememberMe
        );
      }

      // Notify the parent component after authentication.
      onSuccess?.(currentUser);

      onClose();
    } catch (requestError) {
      console.error("Authentication failed:", requestError);

      setError(getErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  };

  if (!show) return null;

  return (
    <>
      {/* MODAL BACKDROP */}
      <div
        className="modal-backdrop fade show"
        style={{ zIndex: 2000 }}
        onClick={() => {
          if (!loading) onClose();
        }}
      />

      {/* AUTH MODAL */}
      <div
        className="modal fade show d-block"
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="nearspot-auth-title"
        style={{ zIndex: 2001 }}
        onMouseDown={(event) => {
          if (event.target === event.currentTarget && !loading) {
            onClose();
          }
        }}
      >
        <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable">
          <div
            className="modal-content border-0 shadow-lg"
            style={{ borderRadius: "24px" }}
          >
            {/* HEADER */}
            <div className="modal-header border-0 px-4 pt-4 pb-2">
              <div className="d-flex align-items-center gap-3">
                <div
                  className="d-flex align-items-center justify-content-center text-white"
                  style={{
                    width: "48px",
                    height: "48px",
                    backgroundColor: "#20cfa7",
                    borderRadius: "14px",
                  }}
                >
                  <i className="bi bi-geo-alt-fill fs-4" />
                </div>

                <div>
                  <div className="fw-bold fs-5">
                    NearSpot
                  </div>

                  <div className="small text-secondary">
                    Discover hidden places
                  </div>
                </div>
              </div>

              <button
                type="button"
                className="btn-close"
                aria-label="Close"
                disabled={loading}
                onClick={onClose}
              />
            </div>

            {/* BODY */}
            <div className="modal-body px-4 pb-4">
              <h4
                id="nearspot-auth-title"
                className="fw-bold mt-3 mb-2"
              >
                {activeTab === "login"
                  ? "Welcome back!"
                  : "Join NearSpot"}
              </h4>

              <p className="text-secondary small mb-4">
                {activeTab === "login"
                  ? "Sign in to share your hidden discoveries."
                  : "Create an account to explore and contribute hidden places."}
              </p>

              {/* LOGIN / REGISTER TABS */}
              <div className="d-flex bg-light rounded-3 p-1 mb-4">
                <button
                  type="button"
                  className={`btn flex-fill rounded-3 ${
                    activeTab === "login"
                      ? "btn-white bg-white shadow-sm fw-semibold"
                      : "text-secondary"
                  }`}
                  onClick={() => switchTab("login")}
                  disabled={loading}
                >
                  Login
                </button>

                <button
                  type="button"
                  className={`btn flex-fill rounded-3 ${
                    activeTab === "register"
                      ? "btn-white bg-white shadow-sm fw-semibold"
                      : "text-secondary"
                  }`}
                  onClick={() => switchTab("register")}
                  disabled={loading}
                >
                  Register
                </button>
              </div>

              {/* ERROR MESSAGE */}
              {error && (
                <div
                  className="alert alert-danger small rounded-3"
                  role="alert"
                >
                  <i className="bi bi-exclamation-circle me-2" />
                  {error}
                </div>
              )}

              {/* FORM */}
              <form onSubmit={handleSubmit}>
                {/* NAME - REGISTER ONLY */}
                {activeTab === "register" && (
                  <div className="mb-3">
                    <label
                      htmlFor="auth-name"
                      className="form-label small fw-semibold"
                    >
                      Full name
                    </label>

                    <input
                      id="auth-name"
                      type="text"
                      className="form-control rounded-3 py-2"
                      placeholder="Enter your name"
                      value={name}
                      onChange={(event) =>
                        setName(event.target.value)
                      }
                      autoComplete="name"
                      required
                      disabled={loading}
                    />
                  </div>
                )}

                {/* EMAIL */}
                <div className="mb-3">
                  <label
                    htmlFor="auth-email"
                    className="form-label small fw-semibold"
                  >
                    Email address
                  </label>

                  <input
                    id="auth-email"
                    type="email"
                    className="form-control rounded-3 py-2"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(event) =>
                      setEmail(event.target.value)
                    }
                    autoComplete="email"
                    required
                    disabled={loading}
                  />
                </div>

                {/* PASSWORD */}
                <div className="mb-3">
                  <label
                    htmlFor="auth-password"
                    className="form-label small fw-semibold"
                  >
                    Password
                  </label>

                  <input
                    id="auth-password"
                    type="password"
                    className="form-control rounded-3 py-2"
                    placeholder={
                      activeTab === "register"
                        ? "Minimum 8 characters"
                        : "Enter your password"
                    }
                    value={password}
                    onChange={(event) =>
                      setPassword(event.target.value)
                    }
                    autoComplete={
                      activeTab === "register"
                        ? "new-password"
                        : "current-password"
                    }
                    minLength={
                      activeTab === "register" ? 8 : undefined
                    }
                    required
                    disabled={loading}
                  />
                </div>

                {/* CONFIRM PASSWORD - REGISTER ONLY */}
                {activeTab === "register" && (
                  <div className="mb-3">
                    <label
                      htmlFor="auth-confirm-password"
                      className="form-label small fw-semibold"
                    >
                      Confirm password
                    </label>

                    <input
                      id="auth-confirm-password"
                      type="password"
                      className="form-control rounded-3 py-2"
                      placeholder="Re-enter your password"
                      value={confirmPassword}
                      onChange={(event) =>
                        setConfirmPassword(event.target.value)
                      }
                      autoComplete="new-password"
                      required
                      disabled={loading}
                    />
                  </div>
                )}

                {/* REMEMBER ME */}
                <div className="form-check mb-4">
                  <input
                    id="auth-remember"
                    type="checkbox"
                    className="form-check-input"
                    checked={rememberMe}
                    onChange={(event) =>
                      setRememberMe(event.target.checked)
                    }
                    disabled={loading}
                  />

                  <label
                    htmlFor="auth-remember"
                    className="form-check-label small text-secondary"
                  >
                    Remember me
                  </label>
                </div>

                {/* SUBMIT BUTTON */}
                <button
                  type="submit"
                  className="btn btn-success w-100 rounded-3 py-3 fw-semibold"
                  disabled={loading}
                  style={{
                    backgroundColor: "#20cfa7",
                    borderColor: "#20cfa7",
                  }}
                >
                  {loading ? (
                    <>
                      <span
                        className="spinner-border spinner-border-sm me-2"
                        role="status"
                      />
                      Please wait...
                    </>
                  ) : activeTab === "login" ? (
                    "Sign In"
                  ) : (
                    "Create Account"
                  )}
                </button>
              </form>

              {/* FOOTER */}
              <p className="text-center text-secondary small mt-4 mb-0">
                {activeTab === "login"
                  ? "New to NearSpot?"
                  : "Already have an account?"}

                <button
                  type="button"
                  className="btn btn-link btn-sm text-success fw-semibold text-decoration-none"
                  onClick={() =>
                    switchTab(
                      activeTab === "login"
                        ? "register"
                        : "login"
                    )
                  }
                  disabled={loading}
                >
                  {activeTab === "login"
                    ? "Create account"
                    : "Login"}
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default AuthModal;
