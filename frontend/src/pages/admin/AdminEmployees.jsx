
import { useCallback, useEffect, useMemo, useState } from "react";
import AdminLayout from "../../components/admin/AdminLayout";
import api from "../../services/api";

function getEmployeeList(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.employees)) return data.employees;
  return [];
}

function getEmployeeName(employee) {
  return (
    employee.name ||
    employee.full_name ||
    employee.username ||
    employee.email ||
    `Employee #${employee.id}`
  );
}

function getEmployeeStatus(employee) {
  if (employee.is_active === true) return "ACTIVE";
  if (employee.is_active === false) return "INACTIVE";
  return "UNKNOWN";
}

function formatJoinedDate(value) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getErrorMessage(error) {
  if (error.response?.status === 401) {
    return "Authentication failed. Please log in again.";
  }

  if (error.response?.status === 403) {
    return "Access denied. Administrator permission is required.";
  }

  const data = error.response?.data;

  if (typeof data?.detail === "string") return data.detail;
  if (typeof data?.message === "string") return data.message;
  if (typeof data?.error === "string") return data.error;

  if (data && typeof data === "object") {
    const message = Object.entries(data)
      .map(([key, value]) =>
        `${key}: ${Array.isArray(value) ? value.join(", ") : value}`
      )
      .join(" | ");

    if (message) return message;
  }

  return error.message || "Something went wrong. Please try again.";
}

function AdminEmployees() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  // Fetch employees using the shared authenticated Axios instance.
  const fetchEmployees = useCallback(async (showLoader = true, signal) => {
    if (showLoader) setLoading(true);
    setError("");

    try {
      const response = await api.get("/accounts/employees/", {
        signal,
      });

      if (!signal?.aborted) {
        setEmployees(getEmployeeList(response.data));
      }
    } catch (err) {
      if (signal?.aborted || err.code === "ERR_CANCELED") return;

      console.error("Failed to load employees:", err);
      setError(getErrorMessage(err));
    } finally {
      if (!signal?.aborted && showLoader) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    fetchEmployees(true, controller.signal);

    return () => controller.abort();
  }, [fetchEmployees]);

  const statistics = useMemo(() => {
    const active = employees.filter(
      (employee) => getEmployeeStatus(employee) === "ACTIVE"
    ).length;

    const inactive = employees.filter(
      (employee) => getEmployeeStatus(employee) === "INACTIVE"
    ).length;

    return {
      total: employees.length,
      active,
      inactive,
    };
  }, [employees]);

  const filteredEmployees = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return employees.filter((employee) => {
      const name = getEmployeeName(employee).toLowerCase();
      const email = String(employee.email || "").toLowerCase();
      const role = String(employee.role || "EMPLOYEE").toLowerCase();

      const matchesSearch =
        !query ||
        name.includes(query) ||
        email.includes(query) ||
        role.includes(query);

      const status = getEmployeeStatus(employee);

      const matchesStatus =
        statusFilter === "ALL" || status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [employees, searchTerm, statusFilter]);

  const handleFormChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const resetForm = () => {
    setForm({
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    });
  };

  const closeAddModal = () => {
    if (submitting) return;
    setShowAddModal(false);
    resetForm();
  };

  // Create a new employee.
  const handleCreateEmployee = async (event) => {
    event.preventDefault();

    if (submitting) return;

    setError("");
    setSuccess("");

    if (
      !form.name.trim() ||
      !form.email.trim() ||
      !form.password ||
      !form.confirmPassword
    ) {
      setError("Please complete all employee fields.");
      return;
    }

    if (form.password.length < 8) {
      setError("Password must contain at least 8 characters.");
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);

    try {
      await api.post("/accounts/employees/", {
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
      });

      setShowAddModal(false);
      resetForm();

      await fetchEmployees(false);
      setSuccess("Employee created successfully.");
    } catch (err) {
      console.error("Failed to create employee:", err);
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const openStatusModal = (employee) => {
    setError("");
    setSuccess("");
    setSelectedEmployee(employee);
  };

  const closeStatusModal = () => {
    if (updatingId !== null) return;
    setSelectedEmployee(null);
  };

  // Activate or deactivate an employee.
  const confirmStatusUpdate = async () => {
    if (!selectedEmployee || updatingId !== null) return;

    const employee = selectedEmployee;
    const nextStatus = !employee.is_active;

    setUpdatingId(employee.id);
    setError("");
    setSuccess("");

    try {
      await api.patch(
        `/accounts/employees/${employee.id}/status/`,
        { is_active: nextStatus }
      );

      setEmployees((previous) =>
        previous.map((item) =>
          item.id === employee.id
            ? { ...item, is_active: nextStatus }
            : item
        )
      );

      setSelectedEmployee(null);

      setSuccess(
        `${getEmployeeName(employee)} has been ${
          nextStatus ? "activated" : "deactivated"
        } successfully.`
      );
    } catch (err) {
      console.error("Failed to update employee status:", err);
      setError(getErrorMessage(err));
    } finally {
      setUpdatingId(null);
    }
  };

  const headingStyle = {
    color: "#292929",
    fontSize: "24px",
  };

  const labelStyle = {
    color: "#666666",
    fontSize: "10px",
    fontWeight: 700,
    whiteSpace: "nowrap",
  };

  return (
    <AdminLayout>
      <style>{`
        .employee-theme-card {
          border: 1px solid #E5E5E5 !important;
          border-top: 3px solid #FFC21A !important;
          background: #FFFFFF;
        }
        .employee-search-icon {
          background: #FFFFFF !important;
          color: #8A6500;
          border: 1px solid #E5E5E5 !important;
          border-right: 0 !important;
          border-radius: 10px 0 0 10px !important;
        }
        .employee-search-input {
          border: 1px solid #E5E5E5 !important;
          border-left: 0 !important;
          border-radius: 0 10px 10px 0 !important;
          box-shadow: none !important;
        }
        .employee-search-input:focus,
        .employee-filter-select:focus {
          border-color: #FFC21A !important;
          box-shadow: 0 0 0 3px rgba(255, 194, 26, 0.22) !important;
          outline: none;
        }
        .employee-filter-select {
          border-color: #E5E5E5;
          border-radius: 10px;
          box-shadow: none;
        }
        .employee-theme-card .card-body {
          background-color: #FFFFFF;
        }
      `}</style>
      {/* Page header */}
      <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3 mb-4">
        <div>
          <h1 className="fw-bold mb-1" style={headingStyle}>
            Employee Management
          </h1>

          <p
            className="mb-0"
            style={{ color: "#666666", fontSize: "13px" }}
          >
            Manage employees who help review and moderate NearSpot.
          </p>
        </div>

        <div className="d-flex align-items-center gap-2">
          <button
            type="button"
            className="btn btn-outline-secondary rounded-3 px-3"
            disabled={loading}
            onClick={() => fetchEmployees()}
            style={{ fontSize: "12px" }}
          >
            {loading ? "Refreshing..." : "↻ Refresh"}
          </button>

          <button
            type="button"
            className="btn rounded-3 px-3"
            onClick={() => {
              setError("");
              setSuccess("");
              setShowAddModal(true);
            }}
            style={{
              backgroundColor: "#FFC21A",
              borderColor: "#FFC21A",
              color: "#292929",
              fontSize: "12px",
              fontWeight: 600,
            }}
          >
            + Add Employee
          </button>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div
          className="alert alert-danger rounded-3 d-flex justify-content-between align-items-start gap-2"
          role="alert"
        >
          <span style={{ fontSize: "13px" }}>{error}</span>
          <button
            type="button"
            className="btn-close"
            aria-label="Dismiss error"
            onClick={() => setError("")}
          />
        </div>
      )}

      {success && (
        <div
          className="alert alert-success rounded-3 d-flex justify-content-between align-items-start gap-2"
          role="status"
        >
          <span style={{ fontSize: "13px" }}>{success}</span>
          <button
            type="button"
            className="btn-close"
            aria-label="Dismiss success message"
            onClick={() => setSuccess("")}
          />
        </div>
      )}

      {/* Statistics */}
      <div className="row g-3 mb-4">
        {[
          {
            label: "TOTAL EMPLOYEES",
            value: statistics.total,
            color: "#292929",
          },
          {
            label: "ACTIVE",
            value: statistics.active,
            color: "#8A6500",
          },
          {
            label: "INACTIVE",
            value: statistics.inactive,
            color: "#B42318",
          },
          {
            label: "PENDING INVITES",
            value: "—",
            color: "#A87400",
          },
        ].map((item) => (
          <div className="col-12 col-sm-6 col-xl-3" key={item.label}>
            <div className="card shadow-sm rounded-4 h-100 employee-theme-card">
              <div className="card-body p-4">
                <div
                  className="mb-2"
                  style={{
                    color: "#666666",
                    fontSize: "10px",
                    fontWeight: 600,
                  }}
                >
                  {item.label}
                </div>

                <div
                  className="fw-bold"
                  style={{ color: item.color, fontSize: "26px" }}
                >
                  {loading ? "…" : item.value}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Search and filters */}
      <div className="card shadow-sm rounded-4 mb-3 employee-theme-card">
        <div className="card-body p-3 p-md-4">
          <div className="row g-2">
            <div className="col-12 col-lg-7">
              <div className="input-group">
                <span className="input-group-text employee-search-icon">
                  ⌕
                </span>

                <input
                  type="search"
                  className="form-control employee-search-input"
                  placeholder="Search employees by name or email..."
                  aria-label="Search employees"
                  value={searchTerm}
                  onChange={(event) =>
                    setSearchTerm(event.target.value)
                  }
                />
              </div>
            </div>

            <div className="col-12 col-sm-6 col-lg-5">
              <select
                className="form-select employee-filter-select"
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value)
                }
                aria-label="Filter employees by status"
              >
                <option value="ALL">All statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Employee table */}
      <div className="card shadow-sm rounded-4 overflow-hidden employee-theme-card">
        <div className="card-body p-0">
          <div className="p-3 p-md-4 border-bottom d-flex flex-column flex-sm-row justify-content-between gap-2">
            <div>
              <h5
                className="fw-semibold mb-1"
                style={{ color: "#292929", fontSize: "16px" }}
              >
                Employees
              </h5>

              <p
                className="mb-0"
                style={{ color: "#777777", fontSize: "12px" }}
              >
                Manage employee accounts and access status.
              </p>
            </div>

            <div
              className="align-self-sm-center"
              style={{ color: "#666666", fontSize: "12px" }}
            >
              {loading
                ? "Loading..."
                : `${filteredEmployees.length} employee(s)`}
            </div>
          </div>

          <div className="table-responsive">
            <table className="table align-middle mb-0">
              <thead style={{ backgroundColor: "#FFF9E8" }}>
                <tr>
                  <th className="px-3 px-md-4 py-3" style={labelStyle}>
                    EMPLOYEE
                  </th>
                  <th className="py-3" style={labelStyle}>
                    ROLE
                  </th>
                  <th className="py-3" style={labelStyle}>
                    STATUS
                  </th>
                  <th className="py-3" style={labelStyle}>
                    JOINED
                  </th>
                  <th
                    className="py-3 pe-3 pe-md-4 text-end"
                    style={labelStyle}
                  >
                    ACTION
                  </th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan="5"
                      className="text-center py-5"
                      style={{ color: "#777777", fontSize: "12px" }}
                    >
                      Loading employee records...
                    </td>
                  </tr>
                ) : filteredEmployees.length === 0 ? (
                  <tr>
                    <td
                      colSpan="5"
                      className="text-center py-5"
                      style={{ color: "#777777", fontSize: "12px" }}
                    >
                      {error
                        ? "Could not load employees. Check the error above."
                        : employees.length === 0
                          ? "No employees found. Use Add Employee to create one."
                          : "No employees match your search or filter."}
                    </td>
                  </tr>
                ) : (
                  filteredEmployees.map((employee) => {
                    const active = employee.is_active === true;
                    const status = getEmployeeStatus(employee);
                    const updating = updatingId === employee.id;

                    return (
                      <tr key={employee.id}>
                        <td className="px-3 px-md-4 py-3">
                          <div className="d-flex align-items-center gap-3">
                            <div
                              className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0 fw-semibold"
                              style={{
                                width: "38px",
                                height: "38px",
                                color: "#8A6500",
                                backgroundColor: "#FFF5D6",
                                fontSize: "13px",
                              }}
                            >
                              {getEmployeeName(employee)
                                .charAt(0)
                                .toUpperCase()}
                            </div>

                            <div style={{ minWidth: 0 }}>
                              <div
                                className="fw-semibold text-break"
                                style={{
                                  color: "#292929",
                                  fontSize: "12px",
                                }}
                              >
                                {getEmployeeName(employee)}
                              </div>

                              <div
                                className="text-break"
                                style={{
                                  color: "#777777",
                                  fontSize: "11px",
                                }}
                              >
                                {employee.email || "No email provided"}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td
                          style={{
                            color: "#555555",
                            fontSize: "12px",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {employee.role || "EMPLOYEE"}
                        </td>

                        <td>
                          <span
                            className="badge rounded-pill px-3 py-2"
                            style={{
                              fontSize: "10px",
                              fontWeight: 600,
                              color: active
                                ? "#8A6500"
                                : status === "INACTIVE"
                                  ? "#b42335"
                                  : "#7c6a30",
                              backgroundColor: active
                                ? "#FFF5D6"
                                : status === "INACTIVE"
                                  ? "#fff0f0"
                                  : "#FFF5D6",
                            }}
                          >
                            {status}
                          </span>
                        </td>

                        <td
                          style={{
                            color: "#666666",
                            fontSize: "11px",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {formatJoinedDate(employee.created_at)}
                        </td>

                        <td className="text-end pe-3 pe-md-4">
                          <button
                            type="button"
                            className={`btn btn-sm rounded-3 ${
                              active
                                ? "btn-outline-danger"
                                : "btn-outline-success"
                            }`}
                            disabled={
                              updatingId !== null ||
                              status === "UNKNOWN"
                            }
                            onClick={() => openStatusModal(employee)}
                            style={{ fontSize: "11px" }}
                          >
                            {updating
                              ? "Updating..."
                              : active
                                ? "Deactivate"
                                : "Activate"}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="px-3 px-md-4 py-3 border-top d-flex justify-content-between gap-2">
            <span style={{ color: "#777777", fontSize: "11px" }}>
              Showing {filteredEmployees.length} of {employees.length} employees
            </span>

            <span style={{ color: "#777777", fontSize: "11px" }}>
              {statistics.active} active
            </span>
          </div>
        </div>
      </div>

      {/* Add employee modal */}
      {showAddModal && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center p-3"
          style={{
            zIndex: 2000,
            backgroundColor: "rgba(15, 23, 42, 0.5)",
          }}
          onClick={closeAddModal}
        >
          <div
            className="card border-0 shadow-lg rounded-4 w-100"
            style={{ maxWidth: "480px" }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-employee-title"
            onClick={(event) => event.stopPropagation()}
          >
            <form onSubmit={handleCreateEmployee}>
              <div className="card-body p-4">
                <div className="d-flex justify-content-between align-items-start mb-4">
                  <div>
                    <h5
                      id="add-employee-title"
                      className="fw-bold mb-1"
                      style={{ color: "#292929" }}
                    >
                      Add Employee
                    </h5>

                    <p
                      className="mb-0"
                      style={{ color: "#666666", fontSize: "12px" }}
                    >
                      Create a new NearSpot employee account.
                    </p>
                  </div>

                  <button
                    type="button"
                    className="btn btn-light rounded-3"
                    onClick={closeAddModal}
                    disabled={submitting}
                    aria-label="Close modal"
                  >
                    ×
                  </button>
                </div>

                <div className="mb-3">
                  <label
                    htmlFor="employee-name"
                    className="form-label"
                    style={{ fontSize: "12px" }}
                  >
                    Full name
                  </label>

                  <input
                    id="employee-name"
                    type="text"
                    name="name"
                    className="form-control rounded-3"
                    placeholder="Enter employee name"
                    value={form.name}
                    onChange={handleFormChange}
                    required
                    autoComplete="name"
                    disabled={submitting}
                  />
                </div>

                <div className="mb-3">
                  <label
                    htmlFor="employee-email"
                    className="form-label"
                    style={{ fontSize: "12px" }}
                  >
                    Email address
                  </label>

                  <input
                    id="employee-email"
                    type="email"
                    name="email"
                    className="form-control rounded-3"
                    placeholder="employee@example.com"
                    value={form.email}
                    onChange={handleFormChange}
                    required
                    autoComplete="email"
                    disabled={submitting}
                  />
                </div>

                <div className="mb-3">
                  <label
                    htmlFor="employee-password"
                    className="form-label"
                    style={{ fontSize: "12px" }}
                  >
                    Password
                  </label>

                  <input
                    id="employee-password"
                    type="password"
                    name="password"
                    className="form-control rounded-3"
                    placeholder="Minimum 8 characters"
                    value={form.password}
                    onChange={handleFormChange}
                    minLength={8}
                    required
                    autoComplete="new-password"
                    disabled={submitting}
                  />
                </div>

                <div className="mb-4">
                  <label
                    htmlFor="employee-confirm-password"
                    className="form-label"
                    style={{ fontSize: "12px" }}
                  >
                    Confirm password
                  </label>

                  <input
                    id="employee-confirm-password"
                    type="password"
                    name="confirmPassword"
                    className="form-control rounded-3"
                    placeholder="Re-enter password"
                    value={form.confirmPassword}
                    onChange={handleFormChange}
                    minLength={8}
                    required
                    autoComplete="new-password"
                    disabled={submitting}
                  />
                </div>

                <div
                  className="alert alert-light border rounded-3"
                  style={{ fontSize: "11px" }}
                >
                  The backend assigns the Employee role automatically.
                  Use a strong, unique password and share it securely
                  with the employee.
                </div>

                <div className="d-flex justify-content-end gap-2">
                  <button
                    type="button"
                    className="btn btn-light rounded-3 px-3"
                    onClick={closeAddModal}
                    disabled={submitting}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="btn rounded-3 px-3"
                    disabled={submitting}
                    style={{
                      backgroundColor: "#FFC21A",
                      borderColor: "#FFC21A",
                      color: "#292929",
                      fontSize: "12px",
                      fontWeight: 600,
                    }}
                  >
                    {submitting ? "Creating..." : "Create Employee"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Employee status confirmation modal */}
      {selectedEmployee && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center p-3"
          style={{
            zIndex: 2000,
            backgroundColor: "rgba(15, 23, 42, 0.5)",
          }}
          onClick={closeStatusModal}
        >
          <div
            className="card border-0 shadow-lg rounded-4 w-100"
            style={{ maxWidth: "420px" }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="employee-status-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="card-body p-4">
              <h5
                id="employee-status-title"
                className="fw-bold mb-2"
                style={{ color: "#292929" }}
              >
                {selectedEmployee.is_active
                  ? "Deactivate employee?"
                  : "Activate employee?"}
              </h5>

              <p
                className="mb-4"
                style={{
                  color: "#687779",
                  fontSize: "13px",
                  lineHeight: 1.6,
                }}
              >
                Are you sure you want to{" "}
                {selectedEmployee.is_active
                  ? "deactivate"
                  : "activate"}{" "}
                <strong>{getEmployeeName(selectedEmployee)}</strong>
                {selectedEmployee.is_active
                  ? "? They will no longer be able to access their account."
                  : "? They will regain access to their account."}
              </p>

              <div className="d-flex justify-content-end gap-2">
                <button
                  type="button"
                  className="btn btn-light rounded-3 px-3"
                  onClick={closeStatusModal}
                  disabled={updatingId !== null}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  className={`btn rounded-3 px-3 ${
                    selectedEmployee.is_active
                      ? "btn-danger"
                      : "btn-success"
                  }`}
                  onClick={confirmStatusUpdate}
                  disabled={updatingId !== null}
                >
                  {updatingId !== null
                    ? "Updating..."
                    : selectedEmployee.is_active
                      ? "Deactivate"
                      : "Activate"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

export default AdminEmployees;
