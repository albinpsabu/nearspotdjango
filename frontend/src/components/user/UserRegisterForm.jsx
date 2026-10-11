
import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import api from "../../services/api";

export default function UserRegisterForm({ onSwitchToLogin }) {
  const { login, loading: authLoading } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const isSubmitting = loading || authLoading;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);

    try {
      await api.post("/accounts/register/", {
        name,
        email,
        password,
      });

      // Automatically log in after successful registration.
      await login(email, password);
    } catch (err) {
      console.error(err);

      const data = err.response?.data;

      if (data?.email) {
        setError(Array.isArray(data.email) ? data.email[0] : data.email);
      } else if (data?.name) {
        setError(Array.isArray(data.name) ? data.name[0] : data.name);
      } else if (data?.password) {
        setError(
          Array.isArray(data.password) ? data.password[0] : data.password
        );
      } else if (data?.detail) {
        setError(data.detail);
      } else {
        setError("Registration failed. Please try again.");
      }
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
          Create your account
        </h2>

        <p className="mb-0" style={{ color: "#7c8b8e" }}>
          Start discovering spots near you
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
        {/* Full Name */}
        <div className="mb-3">
          <label htmlFor="register-name" className="form-label fw-semibold small">
            Full Name
          </label>

          <input
            id="register-name"
            type="text"
            autoComplete="name"
            className="form-control rounded-3 py-3"
            placeholder="John Doe"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            disabled={isSubmitting}
            style={{ borderColor: "#dce5e4" }}
          />
        </div>

        {/* Email */}
        <div className="mb-3">
          <label htmlFor="register-email" className="form-label fw-semibold small">
            Email
          </label>

          <input
            id="register-email"
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
            htmlFor="register-password"
            className="form-label fw-semibold small"
          >
            Password
          </label>

          <input
            id="register-password"
            type="password"
            autoComplete="new-password"
            className="form-control rounded-3 py-3"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            disabled={isSubmitting}
            style={{ borderColor: "#dce5e4" }}
          />

          <div className="form-text">
            At least 8 characters
          </div>
        </div>

        {/* Confirm Password */}
        <div className="mb-4">
          <label
            htmlFor="register-confirm-password"
            className="form-label fw-semibold small"
          >
            Confirm Password
          </label>

          <input
            id="register-confirm-password"
            type="password"
            autoComplete="new-password"
            className="form-control rounded-3 py-3"
            placeholder="Confirm your password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            disabled={isSubmitting}
            style={{ borderColor: "#dce5e4" }}
          />
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          className="btn w-100 rounded-3 py-3 fw-semibold text-white d-flex align-items-center justify-content-center gap-2"
          disabled={isSubmitting}
          style={{
            backgroundColor: "#20cfa7",
            borderColor: "#20cfa7",
            transition: "background-color 0.2s ease",
          }}
        >
          {isSubmitting ? (
            <>
              <span
                className="spinner-border spinner-border-sm"
                role="status"
                aria-hidden="true"
              ></span>
              Creating account...
            </>
          ) : (
            "Create account"
          )}
        </button>
      </form>

      {/* Login link */}
      <p className="text-center small mt-4 mb-0" style={{ color: "#7c8b8e" }}>
        Already have an account?{" "}
        <button
          type="button"
          onClick={onSwitchToLogin}
          disabled={isSubmitting}
          className="btn btn-link p-0 text-decoration-none fw-semibold"
          style={{ color: "#087f68" }}
        >
          Sign in
        </button>
      </p>
    </div>
  );
}
