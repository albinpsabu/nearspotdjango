
import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function UserLoginForm({ onSwitchToRegister }) {
  const { login, loading: authLoading } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const isSubmitting = loading || authLoading;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await login(email, password);
    } catch (err) {
      setError(
        err.response?.data?.detail || "Invalid email or password."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-100 mx-auto" style={{ maxWidth: "420px" }}>
      {/* Header */}
      <div className="text-center mb-4">
        <h2
          className="fw-bold mb-2"
          style={{ color: "#1d2b2e", fontSize: "1.75rem" }}
        >
          Welcome back
        </h2>

        <p className="mb-0" style={{ color: "#7c8b8e" }}>
          Sign in to your account
        </p>
      </div>

      {/* Error message */}
      {error && (
        <div
          className="alert alert-danger rounded-3 small mb-4"
          role="alert"
        >
          <i className="bi bi-exclamation-circle me-2"></i>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Email */}
        <div className="mb-3">
          <label
            htmlFor="login-email"
            className="form-label fw-semibold small"
          >
            Email
          </label>

          <input
            id="login-email"
            type="email"
            autoComplete="email"
            className="form-control rounded-3 py-3"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={isSubmitting}
            style={{ borderColor: "#dce5e4" }}
          />
        </div>

        {/* Password */}
        <div className="mb-3">
          <label
            htmlFor="login-password"
            className="form-label fw-semibold small"
          >
            Password
          </label>

          <input
            id="login-password"
            type="password"
            autoComplete="current-password"
            className="form-control rounded-3 py-3"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={isSubmitting}
            style={{ borderColor: "#dce5e4" }}
          />
        </div>

        {/* Remember me and Forgot password */}
        <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-4">
          <div className="form-check">
            <input
              id="remember-me"
              type="checkbox"
              className="form-check-input"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              disabled={isSubmitting}
              style={{ accentColor: "#087f68" }}
            />

            <label
              htmlFor="remember-me"
              className="form-check-label small"
              style={{ color: "#526366" }}
            >
              Remember me
            </label>
          </div>

          <Link
            to="/forgot-password"
            className="small text-decoration-none fw-semibold"
            style={{ color: "#087f68" }}
          >
            Forgot password?
          </Link>
        </div>

        {/* Submit */}
        <button
          type="submit"
          className="btn w-100 rounded-3 py-3 fw-semibold text-white d-flex align-items-center justify-content-center gap-2"
          disabled={isSubmitting}
          style={{
            backgroundColor: "#20cfa7",
            borderColor: "#20cfa7",
          }}
        >
          {isSubmitting ? (
            <>
              <span
                className="spinner-border spinner-border-sm"
                role="status"
                aria-hidden="true"
              ></span>
              Signing in...
            </>
          ) : (
            "Sign in"
          )}
        </button>
      </form>

      {/* Register link */}
      <p
        className="text-center small mt-4 mb-0"
        style={{ color: "#7c8b8e" }}
      >
        Don't have an account?{" "}
        <button
          type="button"
          onClick={onSwitchToRegister}
          disabled={isSubmitting}
          className="btn btn-link p-0 text-decoration-none fw-semibold"
          style={{ color: "#087f68" }}
        >
          Sign up
        </button>
      </p>
    </div>
  );
}
