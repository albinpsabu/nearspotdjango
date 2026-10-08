import {
  useState,
} from "react";

import {
  useNavigate,
} from "react-router-dom";

import {
  useAuth,
} from "../../context/AuthContext";

// ============================================================
// LOGIN PAGE
// ============================================================

function Login() {
  const navigate = useNavigate();

  const {
    login,
  } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // ============================================================
  // HANDLE LOGIN
  // ============================================================

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");

    // ============================================================
    // BASIC VALIDATION
    // ============================================================

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
        password
      );

      // ============================================================
      // ROLE BASED REDIRECTION
      // ============================================================

      const role = currentUser?.role;

      if (role === "ADMIN") {
        navigate("/admin");
        return;
      }

      if (role === "EMPLOYEE") {
        navigate("/employee");
        return;
      }

      navigate("/");
    } catch (loginError) {
      console.error(
        "Login failed:",
        loginError
      );

      const responseData =
        loginError?.response?.data;

      if (responseData?.detail) {
        setError(responseData.detail);
      } else if (
        responseData?.non_field_errors
      ) {
        setError(
          responseData.non_field_errors[0]
        );
      } else {
        setError(
          "Invalid email or password."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* ============================================================
          PAGE STYLES
      ============================================================ */}

      <style>
        {`
          .nearspot-login-page {
            min-height: 100vh;
            background:
              radial-gradient(
                circle at top left,
                rgba(16, 205, 164, 0.12),
                transparent 35%
              ),
              linear-gradient(
                135deg,
                #f5faf9 0%,
                #eef5f4 100%
              );

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
            background: rgba(255, 255, 255, 0.96);
            border: 1px solid rgba(30, 60, 60, 0.08);
            border-radius: 24px;
            box-shadow:
              0 24px 70px rgba(24, 55, 55, 0.12);

            padding: 38px;
          }

          .nearspot-login-logo {
            width: 58px;
            height: 58px;

            border-radius: 18px;

            display: flex;
            align-items: center;
            justify-content: center;

            background: #10cda4;
            color: white;

            font-size: 25px;
            font-weight: 800;

            box-shadow:
              0 12px 28px rgba(16, 205, 164, 0.24);
          }

          .nearspot-login-title {
            color: #203336;
            font-size: 28px;
            font-weight: 800;
            letter-spacing: -0.5px;
          }

          .nearspot-login-subtitle {
            color: #718184;
            font-size: 14px;
          }

          .nearspot-login-label {
            color: #304346;
            font-size: 13px;
            font-weight: 700;
          }

          .nearspot-login-input {
            height: 50px;
            border-radius: 13px;
            border: 1px solid #dce6e5;
            padding: 0 15px;
            font-size: 14px;
            transition: all 0.2s ease;
          }

          .nearspot-login-input:focus {
            border-color: #10cda4;
            box-shadow:
              0 0 0 4px rgba(16, 205, 164, 0.10);
          }

          .nearspot-login-button {
            width: 100%;
            height: 50px;

            border: none;
            border-radius: 13px;

            background: #10cda4;
            color: white;

            font-size: 14px;
            font-weight: 700;

            transition: all 0.2s ease;
          }

          .nearspot-login-button:hover {
            background: #0db895;
            transform: translateY(-1px);
          }

          .nearspot-login-button:disabled {
            opacity: 0.65;
            cursor: not-allowed;
            transform: none;
          }

          .nearspot-login-back {
            color: #657779;
            text-decoration: none;
            font-size: 13px;
            font-weight: 600;
          }

          .nearspot-login-back:hover {
            color: #10cda4;
          }

          @media (max-width: 576px) {
            .nearspot-login-page {
              padding: 16px;
            }

            .nearspot-login-card {
              padding: 28px 22px;
              border-radius: 20px;
            }
          }
        `}
      </style>

      {/* ============================================================
          LOGIN PAGE
      ============================================================ */}

      <div className="nearspot-login-page">
        <div className="nearspot-login-wrapper">

          <div className="nearspot-login-card">

            {/* ========================================================
                BRAND
            ======================================================== */}

            <div className="d-flex align-items-center gap-3 mb-4">

              <div className="nearspot-login-logo">
                N
              </div>

              <div>
                <div
                  className="fw-bold"
                  style={{
                    color: "#203336",
                    fontSize: "18px",
                  }}
                >
                  NearSpot
                </div>

                <div
                  style={{
                    color: "#819091",
                    fontSize: "12px",
                  }}
                >
                  Discover hidden places
                </div>
              </div>

            </div>

            {/* ========================================================
                TITLE
            ======================================================== */}

            <div className="mb-4">

              <h1 className="nearspot-login-title mb-2">
                Welcome back
              </h1>

              <p className="nearspot-login-subtitle mb-0">
                Sign in to continue to NearSpot.
              </p>

            </div>

            {/* ========================================================
                ERROR
            ======================================================== */}

            {error && (
              <div
                className="alert alert-danger"
                role="alert"
                style={{
                  borderRadius: "12px",
                  fontSize: "13px",
                  border: "none",
                }}
              >
                {error}
              </div>
            )}

            {/* ========================================================
                LOGIN FORM
            ======================================================== */}

            <form onSubmit={handleSubmit}>

              {/* ======================================================
                  EMAIL
              ====================================================== */}

              <div className="mb-3">

                <label
                  htmlFor="email"
                  className="nearspot-login-label mb-2"
                >
                  Email address
                </label>

                <input
                  id="email"
                  type="email"
                  className="form-control nearspot-login-input"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(event) =>
                    setEmail(event.target.value)
                  }
                  autoComplete="email"
                  disabled={loading}
                />

              </div>

              {/* ======================================================
                  PASSWORD
              ====================================================== */}

              <div className="mb-4">

                <label
                  htmlFor="password"
                  className="nearspot-login-label mb-2"
                >
                  Password
                </label>

                <input
                  id="password"
                  type="password"
                  className="form-control nearspot-login-input"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(event) =>
                    setPassword(event.target.value)
                  }
                  autoComplete="current-password"
                  disabled={loading}
                />

              </div>

              {/* ======================================================
                  LOGIN BUTTON
              ====================================================== */}

              <button
                type="submit"
                className="nearspot-login-button"
                disabled={loading}
              >
                {loading ? (
                  <span>
                    <span
                      className="spinner-border spinner-border-sm me-2"
                      role="status"
                      aria-hidden="true"
                    />
                    Signing in...
                  </span>
                ) : (
                  "Sign In"
                )}
              </button>

            </form>

            {/* ========================================================
                BACK TO MAP
            ======================================================== */}

            <div className="text-center mt-4">

              <button
                type="button"
                className="btn btn-link nearspot-login-back p-0"
                onClick={() => navigate("/")}
              >
                ← Back to map
              </button>

            </div>

          </div>

        </div>
      </div>
    </>
  );
}

export default Login;