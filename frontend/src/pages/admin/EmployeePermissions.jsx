
import { useCallback, useEffect, useMemo, useState } from "react";
import AdminLayout from "../../components/admin/AdminLayout";
import api from "../../services/api";

const PERMISSION_GROUPS = {
  dashboard: "Dashboard",
  spots: "Spots",
  reports: "Reports",
  other: "Other",
};

function getList(data, keys = []) {
  if (Array.isArray(data)) return data;

  for (const key of keys) {
    if (Array.isArray(data?.[key])) return data[key];
  }

  return [];
}

function getEmployeeId(employee) {
  return employee?.id ?? employee?.user_id ?? employee?.pk;
}

function getEmployeeName(employee) {
  return (
    employee?.name ||
    employee?.full_name ||
    employee?.username ||
    employee?.email ||
    `Employee ${getEmployeeId(employee)}`
  );
}

function getEmployeeEmail(employee) {
  return employee?.email || employee?.user?.email || "No email available";
}

function getPermissionGroup(permission) {
  const group = String(permission?.group || "").toLowerCase();
  const key = String(permission?.key || "").toLowerCase();

  if (group.includes("dashboard") || key.startsWith("dashboard.")) {
    return "dashboard";
  }

  if (group.includes("spot") || key.startsWith("spots.")) {
    return "spots";
  }

  if (group.includes("report") || key.startsWith("reports.")) {
    return "reports";
  }

  return "other";
}

function getAssignedKeys(data) {
  const assigned = Array.isArray(data)
    ? data
    : data?.permissions ||
      data?.permission_keys ||
      data?.results ||
      [];

  return assigned
    .map((item) => (typeof item === "string" ? item : item?.key))
    .filter(Boolean);
}

function PermissionBadge({ count }) {
  return (
    <span
      className="badge rounded-pill px-3 py-2"
      style={{
        color: count > 0 ? "#8A6500" : "#667779",
        backgroundColor: count > 0 ? "#FFF5D6" : "#F5F5F5",
        fontWeight: 500,
      }}
    >
      {count} permission{count === 1 ? "" : "s"}
    </span>
  );
}

function EmployeePermissionsContent() {
  const [employees, setEmployees] = useState([]);
  const [permissions, setPermissions] = useState([]);

  const [editingEmployeeId, setEditingEmployeeId] = useState(null);
  const [selectedPermissions, setSelectedPermissions] = useState([]);
  const [originalPermissions, setOriginalPermissions] = useState([]);

  const [loadingEmployees, setLoadingEmployees] = useState(true);
  const [loadingPermissions, setLoadingPermissions] = useState(true);
  const [loadingAssigned, setLoadingAssigned] = useState(false);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const editingEmployee = employees.find(
    (employee) =>
      String(getEmployeeId(employee)) === String(editingEmployeeId)
  );

  const groupedPermissions = useMemo(() => {
    const groups = {
      dashboard: [],
      spots: [],
      reports: [],
      other: [],
    };

    permissions.forEach((permission) => {
      if (permission?.is_active === false) return;

      const group = getPermissionGroup(permission);
      groups[group].push(permission);
    });

    return groups;
  }, [permissions]);

  const totalActivePermissions = useMemo(
    () =>
      permissions.filter((permission) => permission?.is_active !== false)
        .length,
    [permissions]
  );

  const loadInitialData = useCallback(async () => {
    setLoadingEmployees(true);
    setLoadingPermissions(true);
    setError("");

    try {
      const [employeesResult, permissionsResult] =
        await Promise.allSettled([
          api.get("/accounts/employees/"),
          api.get("/accounts/permissions/"),
        ]);

      if (employeesResult.status === "fulfilled") {
        const employeeList = getList(employeesResult.value.data, [
          "employees",
          "results",
          "data",
        ]);

        setEmployees(employeeList);
      } else {
        setError(
          employeesResult.reason?.response?.data?.detail ||
            "Unable to load employees. Check the employee API endpoint."
        );
      }

      if (permissionsResult.status === "fulfilled") {
        const permissionList = getList(permissionsResult.value.data, [
          "permissions",
          "results",
          "data",
        ]);

        setPermissions(permissionList);
      } else {
        setError((previous) =>
          [
            previous,
            permissionsResult.reason?.response?.data?.detail ||
              "Unable to load the permission catalogue.",
          ]
            .filter(Boolean)
            .join(" ")
        );
      }
    } finally {
      setLoadingEmployees(false);
      setLoadingPermissions(false);
    }
  }, []);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  const openEditor = async (employee) => {
    const employeeId = getEmployeeId(employee);

    if (employeeId == null) {
      setError("This employee does not have a valid ID.");
      return;
    }

    setEditingEmployeeId(String(employeeId));
    setSelectedPermissions([]);
    setOriginalPermissions([]);
    setError("");
    setSuccess("");
    setLoadingAssigned(true);

    try {
      const response = await api.get(
        `/accounts/employees/${employeeId}/permissions/`
      );

      const keys = getAssignedKeys(response.data);

      setSelectedPermissions(keys);
      setOriginalPermissions(keys);
    } catch (requestError) {
      setError(
        requestError.response?.data?.detail ||
          "Unable to load this employee's assigned permissions."
      );
    } finally {
      setLoadingAssigned(false);
    }
  };

  const returnToList = () => {
    setEditingEmployeeId(null);
    setSelectedPermissions([]);
    setOriginalPermissions([]);
    setError("");
    setSuccess("");
  };

  const togglePermission = (permissionKey) => {
    setSelectedPermissions((previous) =>
      previous.includes(permissionKey)
        ? previous.filter((key) => key !== permissionKey)
        : [...previous, permissionKey]
    );

    setError("");
    setSuccess("");
  };

  const toggleGroup = (groupPermissions) => {
    const keys = groupPermissions.map((permission) => permission.key);
    const allSelected = keys.every((key) =>
      selectedPermissions.includes(key)
    );

    setSelectedPermissions((previous) =>
      allSelected
        ? previous.filter((key) => !keys.includes(key))
        : [...new Set([...previous, ...keys])]
    );

    setError("");
    setSuccess("");
  };

  const discardChanges = () => {
    setSelectedPermissions([...originalPermissions]);
    setError("");
    setSuccess("");
  };

  const savePermissions = async () => {
    if (!editingEmployeeId || !editingEmployee) {
      setError("Please select a valid employee.");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      await api.put(
        `/accounts/employees/${editingEmployeeId}/permissions/`,
        {
          permissions: selectedPermissions,
        }
      );

      // Confirm the saved permissions by reading them back.
      const response = await api.get(
        `/accounts/employees/${editingEmployeeId}/permissions/`
      );

      const savedKeys = getAssignedKeys(response.data);

      setSelectedPermissions(savedKeys);
      setOriginalPermissions(savedKeys);

      // Return to the list after the backend confirms the saved data.
      setEditingEmployeeId(null);
      setSuccess(
        `Permissions for ${getEmployeeName(editingEmployee)} were saved successfully.`
      );
    } catch (requestError) {
      const data = requestError.response?.data;

      setError(
        data?.detail ||
          data?.error ||
          (typeof data === "object" && data
            ? JSON.stringify(data)
            : null) ||
          "Unable to save or verify permissions. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  const selectedCount = selectedPermissions.length;

  return (
    <div className="container-fluid px-0">
      {/* PAGE HEADER */}
      <div className="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-4">
        <div>
          <h2 className="fw-bold mb-2" style={{ color: "#292929" }}>
            Employee Permissions
          </h2>

          <p className="mb-0 text-secondary">
            Manage the features each NearSpot employee can access.
          </p>
        </div>

        {!editingEmployeeId && (
          <button
            type="button"
            className="btn btn-outline-secondary rounded-3"
            onClick={loadInitialData}
            disabled={loadingEmployees || loadingPermissions}
          >
            ↻ Refresh list
          </button>
        )}
      </div>

      {/* ERROR MESSAGE */}
      {error && (
        <div className="alert alert-danger rounded-3" role="alert">
          {error}
        </div>
      )}

      {/* SUCCESS MESSAGE */}
      {success && (
        <div
          className="alert rounded-3 d-flex justify-content-between align-items-center gap-3"
          role="status"
          style={{
            color: "#8A6500",
            backgroundColor: "#FFF9E8",
            border: "1px solid #F0D88D",
          }}
        >
          <span>
            <strong>Success:</strong> {success}
          </span>

          <button
            type="button"
            className="btn-close"
            aria-label="Dismiss message"
            onClick={() => setSuccess("")}
          />
        </div>
      )}

      {/* ================================================== */}
      {/* EMPLOYEE LIST */}
      {/* ================================================== */}
      {!editingEmployeeId && (
        <>
          <div className="row g-3 mb-4">
            <div className="col-12 col-md-6 col-xl-4">
              <div className="card shadow-sm rounded-4 h-100" style={{ border: "1px solid #E5E5E5", borderTop: "3px solid #FFC21A" }}>
                <div className="card-body p-4">
                  <div className="text-secondary small mb-2">
                    TOTAL EMPLOYEES
                  </div>
                  <div className="fs-3 fw-bold" style={{ color: "#292929" }}>
                    {loadingEmployees ? "..." : employees.length}
                  </div>
                  <div className="text-secondary small mt-1">
                    Employees available for permission management
                  </div>
                </div>
              </div>
            </div>

            <div className="col-12 col-md-6 col-xl-4">
              <div className="card shadow-sm rounded-4 h-100" style={{ border: "1px solid #E5E5E5", borderTop: "3px solid #FFC21A" }}>
                <div className="card-body p-4">
                  <div className="text-secondary small mb-2">
                    AVAILABLE PERMISSIONS
                  </div>
                  <div className="fs-3 fw-bold" style={{ color: "#8A6500" }}>
                    {loadingPermissions ? "..." : totalActivePermissions}
                  </div>
                  <div className="text-secondary small mt-1">
                    Active features that can be assigned
                  </div>
                </div>
              </div>
            </div>
          </div>

          <section className="card shadow-sm rounded-4" style={{ border: "1px solid #E5E5E5", borderTop: "3px solid #FFC21A" }}>
            <div className="card-body p-0">
              <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 p-4 border-bottom">
                <div>
                  <h5 className="fw-bold mb-1">Employee list</h5>
                  <p className="text-secondary small mb-0">
                    Select an employee to view and edit their permissions.
                  </p>
                </div>

                <span className="badge rounded-pill text-bg-light border px-3 py-2">
                  {employees.length} employees
                </span>
              </div>

              {loadingEmployees ? (
                <div className="text-center py-5 text-secondary">
                  <span
                    className="spinner-border spinner-border-sm me-2"
                    role="status"
                  />
                  Loading employees...
                </div>
              ) : employees.length === 0 ? (
                <div className="text-center py-5 px-3">
                  <div className="fs-2 mb-2">♙</div>
                  <h6 className="fw-bold">No employees found</h6>
                  <p className="text-secondary small mb-0">
                    Employees returned by the employee API will appear here.
                  </p>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table align-middle mb-0">
                    <thead style={{ backgroundColor: "#FFF9E8" }}>
                      <tr>
                        <th className="px-4 py-3 text-secondary small">
                          EMPLOYEE
                        </th>
                        <th className="py-3 text-secondary small">EMAIL</th>
                        <th className="py-3 text-secondary small">
                          PERMISSIONS
                        </th>
                        <th className="py-3 pe-4 text-end text-secondary small">
                          ACTION
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {employees.map((employee, index) => {
                        const id = getEmployeeId(employee);

                        return (
                          <tr key={id ?? index}>
                            <td className="px-4 py-3">
                              <div className="d-flex align-items-center gap-3">
                                <div
                                  className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0 fw-bold"
                                  style={{
                                    width: "42px",
                                    height: "42px",
                                    backgroundColor: "#FFF5D6",
                                    color: "#8A6500",
                                  }}
                                >
                                  {getEmployeeName(employee)
                                    .charAt(0)
                                    .toUpperCase()}
                                </div>

                                <div>
                                  <div
                                    className="fw-semibold"
                                    style={{ color: "#292929" }}
                                  >
                                    {getEmployeeName(employee)}
                                  </div>
                                  <div className="text-secondary small">
                                    Employee ID: {id ?? "Unavailable"}
                                  </div>
                                </div>
                              </div>
                            </td>

                            <td className="py-3 text-secondary small">
                              {getEmployeeEmail(employee)}
                            </td>

                            <td className="py-3">
                              <span className="text-secondary small">
                                Select Edit to load assigned permissions
                              </span>
                            </td>

                            <td className="py-3 pe-4 text-end">
                              <button
                                type="button"
                                className="btn btn-sm rounded-3 px-3"
                                style={{
                                  backgroundColor: "#FFC21A",
                                  color: "#292929",
                                  borderColor: "#FFC21A",
                                }}
                                onClick={() => openEditor(employee)}
                              >
                                <span className="me-1">✎</span>
                                Edit
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>
        </>
      )}

      {/* ================================================== */}
      {/* PERMISSION EDITOR */}
      {/* ================================================== */}
      {editingEmployeeId && (
        <>
          <div className="d-flex flex-wrap align-items-center gap-2 mb-4">
            <button
              type="button"
              className="btn btn-outline-secondary rounded-3"
              onClick={returnToList}
              disabled={saving}
            >
              ← Back to employees
            </button>

            <span className="text-secondary small">
              Employee management / Edit permissions
            </span>
          </div>

          <section className="card shadow-sm rounded-4 mb-4" style={{ border: "1px solid #E5E5E5", borderTop: "3px solid #FFC21A" }}>
            <div className="card-body p-4">
              <div className="d-flex flex-wrap justify-content-between align-items-center gap-3">
                <div className="d-flex align-items-center gap-3">
                  <div
                    className="rounded-circle d-flex align-items-center justify-content-center fw-bold fs-4"
                    style={{
                      width: "56px",
                      height: "56px",
                      backgroundColor: "#FFF5D6",
                      color: "#8A6500",
                    }}
                  >
                    {getEmployeeName(editingEmployee || {})
                      .charAt(0)
                      .toUpperCase()}
                  </div>

                  <div>
                    <h4 className="fw-bold mb-1">
                      {getEmployeeName(editingEmployee || {})}
                    </h4>
                    <div className="text-secondary small">
                      {getEmployeeEmail(editingEmployee || {})}
                    </div>
                    <div className="text-secondary small mt-1">
                      Employee ID: {editingEmployeeId}
                    </div>
                  </div>
                </div>

                <PermissionBadge count={selectedCount} />
              </div>
            </div>
          </section>

          <div className="mb-3">
            <h5 className="fw-bold mb-1">Edit feature permissions</h5>
            <p className="text-secondary small mb-0">
              Enable or disable individual features for this employee.
              Changes take effect after saving.
            </p>
          </div>

          {loadingAssigned || loadingPermissions ? (
            <div className="card shadow-sm rounded-4" style={{ border: "1px solid #E5E5E5", borderTop: "3px solid #FFC21A" }}>
              <div className="card-body text-center py-5 text-secondary">
                <span
                  className="spinner-border spinner-border-sm me-2"
                  role="status"
                />
                Loading permissions...
              </div>
            </div>
          ) : permissions.length === 0 ? (
            <div className="alert alert-warning rounded-3">
              No permissions were returned by the permission catalogue API.
            </div>
          ) : (
            <div className="row g-3">
              {Object.entries(groupedPermissions).map(
                ([group, groupPermissions]) => {
                  if (groupPermissions.length === 0) return null;

                  const enabledCount = groupPermissions.filter((permission) =>
                    selectedPermissions.includes(permission.key)
                  ).length;

                  const allSelected =
                    enabledCount === groupPermissions.length;

                  return (
                    <div className="col-12 col-xl-6" key={group}>
                      <section className="card shadow-sm rounded-4 h-100" style={{ border: "1px solid #E5E5E5", borderTop: "3px solid #FFC21A" }}>
                        <div className="card-header bg-white border-bottom p-3 rounded-top-4">
                          <div className="d-flex justify-content-between align-items-center gap-2">
                            <div>
                              <h6 className="fw-bold mb-1">
                                {PERMISSION_GROUPS[group]}
                              </h6>
                              <span className="text-secondary small">
                                {enabledCount} of {groupPermissions.length}{" "}
                                enabled
                              </span>
                            </div>

                            <button
                              type="button"
                              className="btn btn-sm btn-outline-success rounded-3"
                              onClick={() => toggleGroup(groupPermissions)}
                              disabled={saving}
                            >
                              {allSelected ? "Select none" : "Select all"}
                            </button>
                          </div>
                        </div>

                        <div className="card-body p-3">
                          {groupPermissions.map((permission) => {
                            const checked = selectedPermissions.includes(
                              permission.key
                            );

                            return (
                              <label
                                key={permission.key}
                                className="d-flex align-items-start gap-3 p-3 rounded-3 mb-2"
                                style={{
                                  cursor: saving ? "not-allowed" : "pointer",
                                  backgroundColor: checked
                                    ? "#FFF5D6"
                                    : "#FFF9E8",
                                  border: "1px solid #E5E5E5",
                                }}
                              >
                                <input
                                  className="form-check-input mt-1 flex-shrink-0"
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() =>
                                    togglePermission(permission.key)
                                  }
                                  disabled={saving}
                                />

                                <span className="flex-grow-1">
                                  <span className="d-block fw-semibold">
                                    {permission.name || permission.key}
                                  </span>

                                  <span className="d-block text-secondary small mt-1">
                                    {permission.description ||
                                      permission.key}
                                  </span>
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      </section>
                    </div>
                  );
                }
              )}
            </div>
          )}

          {/* SAVE / DISCARD ACTIONS */}
          <div className="d-flex flex-wrap justify-content-end gap-2 mt-4 mb-4">
            <button
              type="button"
              className="btn btn-outline-secondary rounded-3 px-4"
              onClick={discardChanges}
              disabled={
                saving || loadingAssigned || loadingPermissions
              }
            >
              Discard changes
            </button>

            <button
              type="button"
              className="btn rounded-3 px-4"
              style={{ backgroundColor: "#FFC21A", color: "#292929", borderColor: "#FFC21A" }}
              onClick={savePermissions}
              disabled={
                saving ||
                loadingAssigned ||
                loadingPermissions ||
                permissions.length === 0
              }
            >
              {saving ? (
                <>
                  <span
                    className="spinner-border spinner-border-sm me-2"
                    role="status"
                  />
                  Saving...
                </>
              ) : (
                "Save permissions"
              )}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default function EmployeePermissions() {
  return (
    <AdminLayout>
      <EmployeePermissionsContent />
    </AdminLayout>
  );
}
