
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }

    if (!password) {
      setError("Please enter your password.");
      return;
    }

    try {
      setLoading(true);

      const currentUser = await login(
        email.trim(),
        password,
        rememberMe
      );

      const role = currentUser?.role;

      if (role === "ADMIN") {
        navigate("/admin", { replace: true });
      } else if (role === "EMPLOYEE") {
        navigate("/employee", { replace: true });
      } else {
        navigate("/user", { replace: true });
      }
    } catch (loginError) {
      console.error("Login failed:", loginError);

      const responseData = loginError?.response?.data;

      if (responseData?.detail) {
        setError(responseData.detail);
      } else if (responseData?.non_field_errors?.length) {
        setError(responseData.non_field_errors[0]);
      } else if (responseData?.email?.length) {
        setError(responseData.email[0]);
      } else if (responseData?.password?.length) {
        setError(responseData.password[0]);
      } else {
        setError(
          loginError?.message ===
            "Login succeeded, but the user profile could not be loaded."
            ? "Unable to load your profile. Please try again."
            : "Invalid email or password."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        .nearspot-login-page {
          min-height: 100vh;
          min-height: 100dvh;
          background:
            radial-gradient(
              circle at top left,
              rgba(32, 207, 167, 0.12),
              transparent 35%
            ),
            linear-gradient(135deg, #f5faf9 0%, #eef5f4 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
        }

        .nearspot-login-wrapper {
          width: 100%;
          max-width: 430px;
        }

        .nearspot-login-card {
          background: #fff;
          border: 1px solid #e8eeee;
          border-radius: 24px;
          box-shadow: 0 20px 60px rgba(29, 43, 46, 0.09);
          padding: 38px;
        }

        .nearspot-login-logo {
          width: 54px;
          height: 54px;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .nearspot-login-logo img {
          display: block;
          width: 100%;
          height: 100%;
          object-fit: contain;
        }

        .nearspot-login-title {
          color: #1d2b2e;
          font-size: 28px;
          font-weight: 800;
          letter-spacing: -0.5px;
        }

        .nearspot-login-subtitle {
          color: #7c8b8e;
          font-size: 14px;
        }

        .nearspot-login-label {
          color: #304346;
          font-size: 13px;
          font-weight: 700;
        }

        .nearspot-login-input {
          min-height: 50px;
          border-radius: 12px;
          border: 1px solid #dce5e4;
          padding: 12px 14px;
          font-size: 14px;
        }

        .nearspot-login-input:focus {
          border-color: #20cfa7;
          box-shadow: 0 0 0 4px rgba(32, 207, 167, 0.12);
        }

        .nearspot-login-button {
          width: 100%;
          min-height: 50px;
          border: 1px solid #20cfa7;
          border-radius: 12px;
          background: #20cfa7;
          color: #fff;
          font-size: 14px;
          font-weight: 700;
          transition: background 0.2s ease;
        }

        .nearspot-login-button:hover:not(:disabled) {
          background: #0db895;
          border-color: #0db895;
        }

        .nearspot-login-button:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .nearspot-login-link {
          color: #087f68;
          font-size: 13px;
          font-weight: 600;
          text-decoration: none;
        }

        .nearspot-login-link:hover {
          color: #065f50;
          text-decoration: underline;
        }

        @media (max-width: 576px) {
          .nearspot-login-page {
            padding: 16px;
          }

          .nearspot-login-card {
            padding: 28px 22px;
            border-radius: 20px;
          }

          .nearspot-login-title {
            font-size: 25px;
          }
        }
      `}</style>

      <div className="nearspot-login-page">
        <div className="nearspot-login-wrapper">
          <div className="nearspot-login-card">
            {/* NearSpot branding */}
            <div className="d-flex align-items-center gap-3 mb-4">
              <div className="nearspot-login-logo">
                <img
                  src="/logo.png"
                  alt="NearSpot logo"
                  onError={(event) => {
                    event.currentTarget.style.display = "none";
                  }}
                />
              </div>

              <div>
                <div
                  className="fw-bold"
                  style={{ color: "#1d2b2e", fontSize: 18 }}
                >
                  NearSpot
                </div>

                <div style={{ color: "#7c8b8e", fontSize: 12 }}>
                  Discover hidden places
                </div>
              </div>
            </div>

            <div className="mb-4">
              <h1 className="nearspot-login-title mb-2">
                Welcome back
              </h1>

              <p className="nearspot-login-subtitle mb-0">
                Sign in to continue exploring NearSpot.
              </p>
            </div>

            {error && (
              <div
                className="alert alert-danger rounded-3 small"
                role="alert"
                aria-live="polite"
              >
                <i
                  className="bi bi-exclamation-circle me-2"
                  aria-hidden="true"
                />
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label
                  htmlFor="login-page-email"
                  className="nearspot-login-label d-block mb-2"
                >
                  Email address
                </label>

                <input
                  id="login-page-email"
                  type="email"
                  className="form-control nearspot-login-input"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="email"
                  required
                  disabled={loading}
                />
              </div>

              <div className="mb-3">
                <label
                  htmlFor="login-page-password"
                  className="nearspot-login-label d-block mb-2"
                >
                  Password
                </label>

                <input
                  id="login-page-password"
                  type="password"
                  className="form-control nearspot-login-input"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="current-password"
                  required
                  disabled={loading}
                />
              </div>

              <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-4">
                <div className="form-check">
                  <input
                    id="login-page-remember"
                    type="checkbox"
                    className="form-check-input"
                    checked={rememberMe}
                    onChange={(event) =>
                      setRememberMe(event.target.checked)
                    }
                    disabled={loading}
                    style={{ accentColor: "#087f68" }}
                  />

                  <label
                    htmlFor="login-page-remember"
                    className="form-check-label small"
                    style={{ color: "#526366" }}
                  >
                    Remember me
                  </label>
                </div>

                <a
                  href="/forgot-password"
                  className="nearspot-login-link"
                >
                  Forgot password?
                </a>
              </div>

              <button
                type="submit"
                className="nearspot-login-button"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span
                      className="spinner-border spinner-border-sm me-2"
                      role="status"
                      aria-hidden="true"
                    />
                    Signing in...
                  </>
                ) : (
                  "Sign in"
                )}
              </button>
            </form>

            <div className="text-center mt-4">
              <button
                type="button"
                className="btn btn-link p-0 nearspot-login-link"
                onClick={() => navigate("/")}
              >
                <i
                  className="bi bi-arrow-left me-2"
                  aria-hidden="true"
                />
                Back to map
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default Login;
