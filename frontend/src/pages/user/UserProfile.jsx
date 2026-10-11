
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import api from "../../services/api";

const COLORS = {
  heading: "#1d2b2e",
  muted: "#819092",
  green: "#087f68",
  teal: "#20cfa7",
  lightGreen: "#e6faf4",
  border: "#edf1ef",
};

const cardStyle = {
  borderRadius: "16px",
  border: `1px solid ${COLORS.border}`,
  boxShadow: "0 4px 18px rgba(20, 50, 45, 0.04)",
  backgroundColor: "#ffffff",
};

export default function UserProfile() {
  const {
    user,
    isAuthenticated,
    loading: authLoading,
    fetchCurrentUser,
  } = useAuth();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [form, setForm] = useState({
    name: "",
    email: "",
  });

  // Populate the form with the current user's information.
  useEffect(() => {
    if (user) {
      setForm({
        name: user.name || user.first_name || "",
        email: user.email || "",
      });
    }
  }, [user]);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    setError("");
    setSuccess("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const name = form.name.trim();
    const email = form.email.trim();

    if (!name || !email) {
      setError("Please enter your name and email address.");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      // Update profile information through the Django API.
      const response = await api.put("/accounts/profile/", {
        name,
        email,
      });

      const updatedProfile = {
        name: response.data?.name ?? name,
        email: response.data?.email ?? email,
      };

      setForm(updatedProfile);

      // Refresh the authentication context after saving.
      const refreshedUser = await fetchCurrentUser();

      if (!refreshedUser) {
        setError(
          "Profile saved, but the session could not be refreshed. Please log in again."
        );
        return;
      }

      setSuccess("Your profile has been updated successfully.");
    } catch (err) {
      console.error("Profile update failed:", err);

      const data = err.response?.data;

      let message =
        "Failed to update your profile. Please try again.";

      if (typeof data === "string") {
        message = data;
      } else if (data?.detail || data?.message) {
        message = data.detail || data.message;
      } else if (data && typeof data === "object") {
        const firstError = Object.values(data)
          .flat()
          .find((value) => typeof value === "string");

        if (firstError) {
          message = firstError;
        }
      }

      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setForm({
      name: user?.name || user?.first_name || "",
      email: user?.email || "",
    });

    setError("");
    setSuccess("");
  };

  if (authLoading) {
    return (
      <div className="text-center py-5">
        <div
          className="spinner-border"
          style={{ color: COLORS.teal }}
          role="status"
          aria-label="Loading profile"
        />

        <p
          className="mt-3 mb-0"
          style={{
            color: COLORS.muted,
            fontSize: "13px",
          }}
        >
          Loading your profile...
        </p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="py-5">
        <div
          className="card mx-auto text-center"
          style={{
            ...cardStyle,
            maxWidth: "480px",
          }}
        >
          <div className="card-body p-4 p-md-5">
            <div
              className="rounded-circle d-flex align-items-center justify-content-center mx-auto mb-3"
              style={{
                width: "70px",
                height: "70px",
                backgroundColor: COLORS.lightGreen,
                color: COLORS.green,
              }}
            >
              <i
                className="bi bi-person-lock"
                style={{ fontSize: "28px" }}
                aria-hidden="true"
              />
            </div>

            <h5 className="fw-bold mb-2">
              Login Required
            </h5>

            <p
              className="mb-4"
              style={{
                color: COLORS.muted,
                fontSize: "13px",
              }}
            >
              Please log in to view your profile.
            </p>

            <Link
              to="/login"
              className="btn text-white fw-semibold px-4 py-2"
              style={{
                backgroundColor: COLORS.teal,
                borderRadius: "10px",
                fontSize: "13px",
              }}
            >
              Go to Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const initials = (form.name || form.email || "U")
    .trim()
    .charAt(0)
    .toUpperCase();

  return (
    <div
      className="w-100"
      style={{ color: COLORS.heading }}
    >
      {/* Page Heading */}
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
        <div>
          <h3
            className="fw-bold mb-2"
            style={{
              fontSize: "26px",
              letterSpacing: "-0.6px",
            }}
          >
            Profile Settings
          </h3>

          <p
            className="mb-0"
            style={{
              color: COLORS.muted,
              fontSize: "14px",
            }}
          >
            Manage your personal information and account details.
          </p>
        </div>

        <div
          className="d-flex align-items-center justify-content-center flex-shrink-0"
          style={{
            width: "48px",
            height: "48px",
            borderRadius: "13px",
            backgroundColor: COLORS.lightGreen,
            color: COLORS.green,
          }}
        >
          <i
            className="bi bi-person-gear"
            aria-hidden="true"
            style={{ fontSize: "21px" }}
          />
        </div>
      </div>

      <div className="row g-3 g-xl-4">
        {/* Personal Information Form */}
        <div className="col-12 col-lg-7">
          <div
            className="card h-100"
            style={cardStyle}
          >
            <div className="card-body p-3 p-md-4">
              <div className="d-flex align-items-center gap-3 mb-4">
                <div
                  className="rounded-circle d-flex align-items-center justify-content-center fw-bold flex-shrink-0"
                  style={{
                    width: "52px",
                    height: "52px",
                    backgroundColor: COLORS.lightGreen,
                    color: COLORS.green,
                    fontSize: "20px",
                  }}
                >
                  {initials}
                </div>

                <div>
                  <h5
                    className="fw-bold mb-2"
                    style={{ fontSize: "17px" }}
                  >
                    Personal Information
                  </h5>

                  <p
                    className="mb-0"
                    style={{
                      color: COLORS.muted,
                      fontSize: "12px",
                    }}
                  >
                    Update the details associated with your account.
                  </p>
                </div>
              </div>

              {/* Success Message */}
              {success && (
                <div
                  className="alert d-flex align-items-start gap-2 rounded-3"
                  role="status"
                  style={{
                    backgroundColor: COLORS.lightGreen,
                    color: COLORS.green,
                    border: "1px solid #c9f2e6",
                    fontSize: "13px",
                  }}
                >
                  <i
                    className="bi bi-check-circle-fill"
                    aria-hidden="true"
                  />
                  <span>{success}</span>
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div
                  className="alert alert-danger d-flex align-items-start gap-2 rounded-3"
                  role="alert"
                  style={{ fontSize: "13px" }}
                >
                  <i
                    className="bi bi-exclamation-circle-fill"
                    aria-hidden="true"
                  />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit}>
                {/* Full Name */}
                <div className="mb-4">
                  <label
                    htmlFor="profile-name"
                    className="form-label fw-semibold"
                    style={{
                      fontSize: "13px",
                      color: "#526366",
                    }}
                  >
                    Full Name
                  </label>

                  <div className="input-group">
                    <span
                      className="input-group-text"
                      style={{
                        backgroundColor: "#ffffff",
                        borderColor: "#e1e8e6",
                        color: COLORS.muted,
                      }}
                    >
                      <i
                        className="bi bi-person"
                        aria-hidden="true"
                      />
                    </span>

                    <input
                      id="profile-name"
                      name="name"
                      type="text"
                      className="form-control py-2"
                      placeholder="Enter your full name"
                      value={form.name}
                      onChange={handleChange}
                      autoComplete="name"
                      required
                      disabled={loading}
                      maxLength={150}
                      style={{
                        borderColor: "#e1e8e6",
                        fontSize: "13px",
                      }}
                    />
                  </div>
                </div>

                {/* Email */}
                <div className="mb-4">
                  <label
                    htmlFor="profile-email"
                    className="form-label fw-semibold"
                    style={{
                      fontSize: "13px",
                      color: "#526366",
                    }}
                  >
                    Email Address
                  </label>

                  <div className="input-group">
                    <span
                      className="input-group-text"
                      style={{
                        backgroundColor: "#ffffff",
                        borderColor: "#e1e8e6",
                        color: COLORS.muted,
                      }}
                    >
                      <i
                        className="bi bi-envelope"
                        aria-hidden="true"
                      />
                    </span>

                    <input
                      id="profile-email"
                      name="email"
                      type="email"
                      className="form-control py-2"
                      placeholder="Enter your email address"
                      value={form.email}
                      onChange={handleChange}
                      autoComplete="email"
                      required
                      disabled={loading}
                      maxLength={254}
                      style={{
                        borderColor: "#e1e8e6",
                        fontSize: "13px",
                      }}
                    />
                  </div>
                </div>

                {/* Form Actions */}
                <div className="d-flex flex-wrap align-items-center gap-2 pt-2">
                  <button
                    type="submit"
                    className="btn text-white fw-semibold d-inline-flex align-items-center gap-2 px-4 py-2"
                    disabled={loading}
                    style={{
                      backgroundColor: COLORS.teal,
                      borderRadius: "10px",
                      fontSize: "13px",
                      minHeight: "42px",
                    }}
                  >
                    {loading ? (
                      <>
                        <span
                          className="spinner-border spinner-border-sm"
                          role="status"
                          aria-hidden="true"
                        />
                        Saving...
                      </>
                    ) : (
                      <>
                        <i
                          className="bi bi-check2-circle"
                          aria-hidden="true"
                        />
                        Save Changes
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    className="btn btn-outline-secondary fw-semibold px-4 py-2"
                    disabled={loading}
                    onClick={resetForm}
                    style={{
                      borderRadius: "10px",
                      fontSize: "13px",
                      minHeight: "42px",
                    }}
                  >
                    Reset
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* Account Summary */}
        <div className="col-12 col-lg-5">
          <div className="d-flex flex-column gap-3 gap-xl-4">
            <div
              className="card"
              style={cardStyle}
            >
              <div className="card-body p-3 p-md-4">
                <div className="d-flex align-items-center gap-3 mb-3">
                  <div
                    className="d-flex align-items-center justify-content-center flex-shrink-0"
                    style={{
                      width: "42px",
                      height: "42px",
                      borderRadius: "12px",
                      backgroundColor: COLORS.lightGreen,
                      color: COLORS.green,
                    }}
                  >
                    <i
                      className="bi bi-shield-check"
                      aria-hidden="true"
                      style={{ fontSize: "19px" }}
                    />
                  </div>

                  <h5
                    className="fw-bold mb-0"
                    style={{ fontSize: "17px" }}
                  >
                    Account Summary
                  </h5>
                </div>

                <div className="d-flex justify-content-between align-items-center gap-3 py-3 border-bottom">
                  <span
                    style={{
                      color: COLORS.muted,
                      fontSize: "12px",
                    }}
                  >
                    Account Status
                  </span>

                  <span
                    className="badge rounded-pill px-3 py-2"
                    style={{
                      backgroundColor: COLORS.lightGreen,
                      color: COLORS.green,
                      fontSize: "11px",
                    }}
                  >
                    <i
                      className="bi bi-check-circle me-1"
                      aria-hidden="true"
                    />
                    Authenticated
                  </span>
                </div>

                <div className="d-flex justify-content-between align-items-start gap-3 py-3 border-bottom">
                  <span
                    style={{
                      color: COLORS.muted,
                      fontSize: "12px",
                    }}
                  >
                    Full Name
                  </span>

                  <span
                    className="fw-semibold text-end"
                    style={{
                      color: "#26373a",
                      fontSize: "12px",
                      overflowWrap: "anywhere",
                    }}
                  >
                    {user?.name || user?.first_name || "Not provided"}
                  </span>
                </div>

                <div className="d-flex justify-content-between align-items-start gap-3 py-3">
                  <span
                    style={{
                      color: COLORS.muted,
                      fontSize: "12px",
                    }}
                  >
                    Email
                  </span>

                  <span
                    className="fw-semibold text-end"
                    style={{
                      color: "#26373a",
                      fontSize: "12px",
                      overflowWrap: "anywhere",
                    }}
                  >
                    {user?.email || "Not provided"}
                  </span>
                </div>
              </div>
            </div>

            {/* Profile Tip */}
            <div
              className="card"
              style={cardStyle}
            >
              <div className="card-body p-3 p-md-4">
                <div className="d-flex align-items-start gap-3">
                  <div
                    className="d-flex align-items-center justify-content-center flex-shrink-0"
                    style={{
                      width: "42px",
                      height: "42px",
                      borderRadius: "12px",
                      backgroundColor: COLORS.lightGreen,
                      color: COLORS.green,
                    }}
                  >
                    <i
                      className="bi bi-info-circle"
                      aria-hidden="true"
                      style={{ fontSize: "19px" }}
                    />
                  </div>

                  <div>
                    <h6
                      className="fw-bold mb-2"
                      style={{ fontSize: "14px" }}
                    >
                      Keep Your Profile Updated
                    </h6>

                    <p
                      className="mb-0"
                      style={{
                        color: COLORS.muted,
                        fontSize: "12px",
                        lineHeight: 1.8,
                      }}
                    >
                      Make sure your account information is correct
                      when using NearSpot. Your changes are saved
                      when the server confirms the update.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
