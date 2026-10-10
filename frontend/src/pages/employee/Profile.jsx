
import { useEffect, useState } from "react";
import api from "../../services/api";
import EmployeeLayout from "../../components/employee/EmployeeLayout";

function Profile() {
  const [profile, setProfile] = useState(null);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const accent = "#20cfa7";

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/accounts/profile/");
      setProfile(response.data);
      setName(response.data.name || "");
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Unable to load your profile."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (event) => {
    event.preventDefault();

    if (!name.trim()) {
      setError("Full name is required.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const response = await api.put("/accounts/profile/", {
        name: name.trim(),
      });

      const updated = {
        ...profile,
        ...response.data,
        name: response.data.name ?? name.trim(),
      };

      setProfile(updated);
      setName(updated.name);
      setEditing(false);
      setSuccess("Profile updated successfully.");
    } catch (err) {
      const data = err.response?.data;

      setError(
        data?.name?.[0] ||
          data?.detail ||
          "Unable to update your profile."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setName(profile?.name || "");
    setEditing(false);
    setError("");
    setSuccess("");
  };

  const initials = (profile?.name || profile?.email || "E")
    .trim()
    .charAt(0)
    .toUpperCase();

  return (
    <EmployeeLayout>
      <div className="container-fluid px-0">
        {/* Page heading */}
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
          <div>
            <h4
              className="fw-bold mb-1"
              style={{ color: "#1d2b2e" }}
            >
              My Profile
            </h4>
            <p className="text-secondary small mb-0">
              View and manage your employee account information.
            </p>
          </div>

          {!loading && profile && !editing && (
            <button
              type="button"
              className="btn btn-sm px-3 py-2"
              style={{
                backgroundColor: accent,
                color: "#103b32",
                border: "none",
                fontWeight: 600,
              }}
              onClick={() => {
                setEditing(true);
                setError("");
                setSuccess("");
              }}
            >
              <i className="bi bi-pencil-square me-2" />
              Edit Profile
            </button>
          )}
        </div>

        {error && (
          <div className="alert alert-danger py-2" role="alert">
            {error}
          </div>
        )}

        {success && (
          <div className="alert alert-success py-2" role="status">
            {success}
          </div>
        )}

        {loading ? (
          <div className="card border-0 shadow-sm">
            <div className="card-body text-center py-5">
              <div
                className="spinner-border"
                style={{ color: accent }}
                role="status"
              >
                <span className="visually-hidden">Loading...</span>
              </div>
              <p className="text-secondary small mt-3 mb-0">
                Loading your profile...
              </p>
            </div>
          </div>
        ) : profile ? (
          <>
            {/* Profile summary */}
            <div className="card border-0 shadow-sm mb-4">
              <div className="card-body p-4">
                <div className="d-flex flex-column flex-sm-row align-items-center align-items-sm-start gap-3">
                  <div
                    className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0 fw-bold"
                    style={{
                      width: "72px",
                      height: "72px",
                      backgroundColor: "#e8f8f3",
                      color: "#087f68",
                      border: `2px solid ${accent}`,
                      fontSize: "27px",
                    }}
                  >
                    {initials}
                  </div>

                  <div className="text-center text-sm-start">
                    <h5
                      className="fw-bold mb-1"
                      style={{ color: "#1d2b2e" }}
                    >
                      {profile.name || "Employee"}
                    </h5>
                    <p className="text-secondary small mb-2">
                      {profile.email}
                    </p>
                    <span
                      className="badge rounded-pill px-3 py-2"
                      style={{
                        backgroundColor: "#e8f8f3",
                        color: "#087f68",
                      }}
                    >
                      {profile.role || "EMPLOYEE"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Account information */}
            <div className="card border-0 shadow-sm">
              <div className="card-header bg-white border-bottom p-4">
                <h6
                  className="fw-bold mb-1"
                  style={{ color: "#26373a" }}
                >
                  Account Information
                </h6>
                <p className="text-secondary small mb-0">
                  Your personal and account details.
                </p>
              </div>

              <div className="card-body p-4">
                <form onSubmit={handleSave}>
                  <div className="row g-4">
                    <div className="col-12 col-md-6">
                      <label
                        htmlFor="profileName"
                        className="form-label small fw-semibold"
                      >
                        Full Name
                      </label>
                      <input
                        id="profileName"
                        type="text"
                        className="form-control"
                        value={editing ? name : profile.name || ""}
                        onChange={(event) =>
                          setName(event.target.value)
                        }
                        disabled={!editing || saving}
                        maxLength={150}
                        required
                      />
                    </div>

                    <div className="col-12 col-md-6">
                      <label
                        htmlFor="profileEmail"
                        className="form-label small fw-semibold"
                      >
                        Email Address
                      </label>
                      <input
                        id="profileEmail"
                        type="email"
                        className="form-control bg-light"
                        value={profile.email || ""}
                        disabled
                        readOnly
                      />
                    </div>

                    <div className="col-12 col-md-6">
                      <label
                        htmlFor="profileRole"
                        className="form-label small fw-semibold"
                      >
                        Account Role
                      </label>
                      <input
                        id="profileRole"
                        type="text"
                        className="form-control bg-light"
                        value={profile.role || ""}
                        disabled
                        readOnly
                      />
                    </div>

                    {profile.id != null && (
                      <div className="col-12 col-md-6">
                        <label
                          htmlFor="profileId"
                          className="form-label small fw-semibold"
                        >
                          Employee ID
                        </label>
                        <input
                          id="profileId"
                          type="text"
                          className="form-control bg-light"
                          value={profile.id}
                          disabled
                          readOnly
                        />
                      </div>
                    )}
                  </div>

                  {editing && (
                    <div className="d-flex flex-wrap justify-content-end gap-2 mt-4 pt-3 border-top">
                      <button
                        type="button"
                        className="btn btn-outline-secondary btn-sm px-3"
                        onClick={handleCancel}
                        disabled={saving}
                      >
                        Cancel
                      </button>

                      <button
                        type="submit"
                        className="btn btn-sm px-3"
                        style={{
                          backgroundColor: accent,
                          color: "#103b32",
                          border: "none",
                          fontWeight: 600,
                        }}
                        disabled={saving}
                      >
                        {saving ? "Saving..." : "Save Changes"}
                      </button>
                    </div>
                  )}
                </form>
              </div>
            </div>
          </>
        ) : (
          <div className="card border-0 shadow-sm">
            <div className="card-body text-center py-5">
              <p className="text-secondary mb-3">
                Your profile could not be loaded.
              </p>
              <button
                type="button"
                className="btn btn-outline-success"
                onClick={loadProfile}
              >
                Try Again
              </button>
            </div>
          </div>
        )}
      </div>
    </EmployeeLayout>
  );
}

export default Profile;
