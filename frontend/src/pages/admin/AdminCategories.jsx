
import { useCallback, useEffect, useMemo, useState } from "react";
import AdminLayout from "../../components/admin/AdminLayout";
import AdminStatCard from "../../components/admin/AdminStatCard";
import api from "../../services/api";

// ============================================================
// HELPERS
// ============================================================

function normalizeList(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.categories)) return data.categories;
  if (Array.isArray(data?.spots)) return data.spots;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

function getCategoryId(spot) {
  if (spot?.category && typeof spot.category === "object") {
    return spot.category.id;
  }
  return spot?.category;
}

function getApiError(error, fallback) {
  if (error.response?.status === 401) {
    return "Authentication failed. Please log in again.";
  }

  if (error.response?.status === 403) {
    return "Access denied. Administrator permission is required.";
  }

  const data = error.response?.data;
  const detail =
    data?.detail ||
    data?.error ||
    data?.message ||
    data?.name?.[0] ||
    data?.is_active?.[0] ||
    data?.non_field_errors?.[0];

  if (typeof detail === "string") return detail;
  if (detail) return JSON.stringify(detail);

  return error.message || fallback;
}

// ============================================================
// ADMIN CATEGORIES
// ============================================================

function AdminCategories() {
  const [categories, setCategories] = useState([]);
  const [spots, setSpots] = useState([]);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [formError, setFormError] = useState("");

  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    is_active: true,
  });

  const [viewingCategory, setViewingCategory] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);

  // ============================================================
  // FETCH CATEGORIES AND SPOTS
  // ============================================================

  const fetchData = useCallback(async (isRefresh = false, signal) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError("");

    try {
      const categoryResponse = await api.get("/spots/categories/", {
        signal,
      });

      if (signal?.aborted) return;

      setCategories(normalizeList(categoryResponse.data));

      // A spots request failure should not prevent categories loading.
      try {
        const spotResponse = await api.get("/spots/admin/spots/", {
          signal,
        });

        if (!signal?.aborted) {
          setSpots(normalizeList(spotResponse.data));
        }
      } catch (spotError) {
        if (signal?.aborted) return;

        console.error("Failed to load spots:", spotError);
        setSpots([]);
        setError(
          "Categories loaded, but spots could not be loaded. " +
          getApiError(spotError, "Please try refreshing.")
        );
      }
    } catch (err) {
      if (signal?.aborted || err.code === "ERR_CANCELED") return;

      console.error("Failed to load categories:", err);
      setError(getApiError(err, "Unable to load categories."));
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    fetchData(false, controller.signal);

    return () => controller.abort();
  }, [fetchData]);

  // ============================================================
  // STATISTICS
  // ============================================================

  const statistics = useMemo(
    () => ({
      total: categories.length,
      active: categories.filter((category) => category.is_active).length,
      inactive: categories.filter((category) => !category.is_active).length,
      categorizedSpots: spots.filter(
        (spot) =>
          getCategoryId(spot) !== undefined &&
          getCategoryId(spot) !== null
      ).length,
    }),
    [categories, spots]
  );

  // ============================================================
  // SEARCH AND FILTER
  // ============================================================

  const filteredCategories = useMemo(() => {
    const query = search.trim().toLowerCase();

    return categories.filter((category) => {
      const matchesSearch =
        !query ||
        String(category.name || "").toLowerCase().includes(query) ||
        String(category.description || "").toLowerCase().includes(query);

      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "ACTIVE" && category.is_active) ||
        (statusFilter === "INACTIVE" && !category.is_active);

      return matchesSearch && matchesStatus;
    });
  }, [categories, search, statusFilter]);

  // ============================================================
  // SPOT HELPERS
  // ============================================================

  const getSpotsForCategory = (categoryId) =>
    spots.filter(
      (spot) => String(getCategoryId(spot)) === String(categoryId)
    );

  const getSpotCount = (categoryId) =>
    getSpotsForCategory(categoryId).length;

  // ============================================================
  // ADD / EDIT MODAL
  // ============================================================

  const openAddModal = () => {
    setEditingCategory(null);
    setFormData({
      name: "",
      description: "",
      is_active: true,
    });
    setFormError("");
    setError("");
    setSuccess("");
    setShowCategoryModal(true);
  };

  const startEdit = (category) => {
    if (!category) return;

    setEditingCategory(category);
    setFormData({
      name: category.name || "",
      description: category.description || "",
      is_active: category.is_active ?? true,
    });

    setFormError("");
    setError("");
    setSuccess("");
    setShowCategoryModal(true);
  };

  const closeCategoryModal = () => {
    if (saving) return;

    setShowCategoryModal(false);
    setEditingCategory(null);
    setFormError("");
    setFormData({
      name: "",
      description: "",
      is_active: true,
    });
  };

  // ============================================================
  // CREATE / UPDATE CATEGORY
  // ============================================================

  const handleSaveCategory = async (event) => {
    event.preventDefault();
    if (saving) return;

    setFormError("");
    setError("");
    setSuccess("");

    const name = formData.name.trim();
    const description = formData.description.trim();

    if (!name) {
      setFormError("Please enter a category name.");
      return;
    }

    const duplicate = categories.some(
      (category) =>
        category.name?.trim().toLowerCase() === name.toLowerCase() &&
        String(category.id) !== String(editingCategory?.id)
    );

    if (duplicate) {
      setFormError("A category with this name already exists.");
      return;
    }

    setSaving(true);

    try {
      const isEditing = Boolean(editingCategory);

      const payload = {
        name,
        description,
        is_active: formData.is_active,
      };

      const response = isEditing
        ? await api.patch(
            `/spots/categories/${editingCategory.id}/`,
            payload
          )
        : await api.post("/spots/categories/", payload);

      const savedCategory = response.data || {};

      setShowCategoryModal(false);
      setEditingCategory(null);

      await fetchData(true);

      setSuccess(
        isEditing
          ? `Category "${savedCategory.name || name}" updated successfully.`
          : `Category "${savedCategory.name || name}" created successfully.`
      );
    } catch (err) {
      console.error("Failed to save category:", err);
      setFormError(getApiError(err, "Unable to save category."));
    } finally {
      setSaving(false);
    }
  };

  // ============================================================
  // ACTIVATE / DEACTIVATE CATEGORY
  // ============================================================

  const handleToggleStatus = async (category) => {
    if (!category || actionLoading) return;

    setActionLoading(true);
    setError("");
    setSuccess("");

    try {
      await api.patch(`/spots/categories/${category.id}/`, {
        is_active: !category.is_active,
      });

      setConfirmAction(null);

      await fetchData(true);

      setSuccess(
        `Category "${category.name}" ${
          !category.is_active ? "activated" : "deactivated"
        } successfully.`
      );
    } catch (err) {
      console.error("Failed to update category status:", err);
      setError(
        getApiError(err, "Unable to update category status.")
      );
      setConfirmAction(null);
    } finally {
      setActionLoading(false);
    }
  };

  // ============================================================
  // DELETE CATEGORY
  // ============================================================

  const handleDeleteCategory = async (category) => {
    if (!category || actionLoading) return;

    setActionLoading(true);
    setError("");
    setSuccess("");

    try {
      await api.delete(`/spots/categories/${category.id}/`);

      setConfirmAction(null);

      await fetchData(true);

      setSuccess(
        `Category "${category.name}" deleted successfully.`
      );
    } catch (err) {
      console.error("Failed to delete category:", err);
      setError(getApiError(err, "Unable to delete category."));
      setConfirmAction(null);
    } finally {
      setActionLoading(false);
    }
  };

  // ============================================================
  // PAGE UI
  // ============================================================

  return (
    <AdminLayout>
      {/* PAGE HEADER */}
      <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3 mb-4">
        <div>
          <h1
            className="fw-bold mb-1"
            style={{ color: "#1d2b2e", fontSize: "24px" }}
          >
            Category Management
          </h1>

          <p
            className="mb-0"
            style={{ color: "#7c8b8e", fontSize: "13px" }}
          >
            Create, edit, and manage the categories used for hidden spots.
          </p>
        </div>

        <div className="d-flex gap-2">
          <button
            type="button"
            className="btn btn-light border rounded-3 px-3"
            onClick={() => fetchData(true)}
            disabled={loading || refreshing}
          >
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>

          <button
            type="button"
            className="btn rounded-3 px-3"
            style={{
              backgroundColor: "#20d9ae",
              borderColor: "#20d9ae",
              color: "#06352b",
              fontSize: "12px",
              fontWeight: 600,
            }}
            onClick={openAddModal}
          >
            + Add Category
          </button>
        </div>
      </div>

      {/* ALERTS */}
      {error && (
        <div className="alert alert-danger rounded-3" role="alert">
          <div className="d-flex justify-content-between gap-2">
            <span>{error}</span>
            <button
              type="button"
              className="btn-close"
              aria-label="Dismiss error"
              onClick={() => setError("")}
            />
          </div>
        </div>
      )}

      {success && (
        <div className="alert alert-success rounded-3" role="status">
          <div className="d-flex justify-content-between gap-2">
            <span>{success}</span>
            <button
              type="button"
              className="btn-close"
              aria-label="Dismiss success"
              onClick={() => setSuccess("")}
            />
          </div>
        </div>
      )}

      {/* CATEGORY STATISTICS */}
      <div className="row g-3 mb-4">
        <AdminStatCard
          title="TOTAL CATEGORIES"
          value={statistics.total}
          color="#1d2b2e"
          description="All configured categories"
        />

        <AdminStatCard
          title="ACTIVE CATEGORIES"
          value={statistics.active}
          color="#16866d"
          description="Available for new spots"
        />

        <AdminStatCard
          title="INACTIVE CATEGORIES"
          value={statistics.inactive}
          color="#9a6700"
          description="Unavailable for new spots"
        />

        <AdminStatCard
          title="SPOTS USING CATEGORIES"
          value={statistics.categorizedSpots}
          color="#2f6f9f"
          description="Spots with a category assigned"
        />
      </div>

      {/* SEARCH AND FILTERS */}
      <div className="card border-0 shadow-sm rounded-4 mb-3">
        <div className="card-body p-3 p-md-4">
          <div className="row g-2">
            <div className="col-12 col-lg-8">
              <input
                type="text"
                className="form-control"
                placeholder="Search categories..."
                aria-label="Search categories"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>

            <div className="col-12 col-lg-4">
              <select
                className="form-select"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                aria-label="Filter categories"
              >
                <option value="ALL">All categories</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* CATEGORIES TABLE */}
      <div className="card border-0 shadow-sm rounded-4 overflow-hidden">
        <div className="card-body p-0">
          <div className="p-3 p-md-4 border-bottom">
            <h5
              className="fw-semibold mb-1"
              style={{ color: "#1d2b2e", fontSize: "16px" }}
            >
              Categories
            </h5>

            <p
              className="mb-0"
              style={{ color: "#8a989a", fontSize: "12px" }}
            >
              View assigned spots and manage category details and availability.
            </p>
          </div>

          <div className="table-responsive">
            <table className="table align-middle mb-0">
              <thead>
                <tr>
                  {[
                    "CATEGORY",
                    "DESCRIPTION",
                    "SPOTS",
                    "STATUS",
                    "ACTIONS",
                  ].map((heading) => (
                    <th
                      key={heading}
                      className="px-3 py-3"
                      style={{
                        color: "#7c8b8e",
                        fontSize: "10px",
                        fontWeight: 700,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan="5"
                      className="text-center py-5 text-muted"
                    >
                      Loading categories...
                    </td>
                  </tr>
                ) : filteredCategories.length === 0 ? (
                  <tr>
                    <td
                      colSpan="5"
                      className="text-center py-5 text-muted"
                    >
                      {error && categories.length === 0
                        ? "Categories could not be loaded."
                        : categories.length === 0
                          ? "No categories found. Add your first category."
                          : "No categories match your search or filter."}
                    </td>
                  </tr>
                ) : (
                  filteredCategories.map((category) => (
                    <tr key={category.id}>
                      <td className="px-3 py-3">
                        <div className="fw-semibold">
                          {category.name}
                        </div>
                        <small className="text-muted">
                          ID: {category.id}
                        </small>
                      </td>

                      <td
                        style={{
                          minWidth: "180px",
                          maxWidth: "350px",
                        }}
                      >
                        {category.description || "No description"}
                      </td>

                      <td className="fw-semibold text-primary">
                        {getSpotCount(category.id)}
                      </td>

                      <td>
                        <span
                          className="badge rounded-pill px-3 py-2"
                          style={{
                            color: category.is_active
                              ? "#16866d"
                              : "#687779",
                            background: category.is_active
                              ? "#e6f7f1"
                              : "#f0f2f3",
                          }}
                        >
                          {category.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>

                      <td className="py-3 pe-3">
                        <div className="d-flex flex-wrap gap-1">
                          <button
                            type="button"
                            className="btn btn-sm btn-light border"
                            onClick={() =>
                              setViewingCategory(category)
                            }
                          >
                            View Spots
                          </button>

                          <button
                            type="button"
                            className="btn btn-sm btn-outline-primary"
                            onClick={() => startEdit(category)}
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            className={`btn btn-sm ${
                              category.is_active
                                ? "btn-outline-warning"
                                : "btn-outline-success"
                            }`}
                            disabled={actionLoading}
                            onClick={() =>
                              setConfirmAction({
                                type: "toggle",
                                category,
                              })
                            }
                          >
                            {category.is_active
                              ? "Deactivate"
                              : "Activate"}
                          </button>

                          <button
                            type="button"
                            className="btn btn-sm btn-outline-danger"
                            disabled={actionLoading}
                            onClick={() =>
                              setConfirmAction({
                                type: "delete",
                                category,
                              })
                            }
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {!loading && filteredCategories.length > 0 && (
            <div className="px-3 px-md-4 py-3 border-top text-muted small">
              Showing {filteredCategories.length} of {categories.length} categories
            </div>
          )}
        </div>
      </div>

      {/* ADD / EDIT CATEGORY MODAL */}
      {showCategoryModal && (
        <div
          className="modal d-block"
          tabIndex="-1"
          role="dialog"
          aria-modal="true"
          style={{
            backgroundColor: "rgba(10, 20, 25, 0.60)",
            zIndex: 1060,
          }}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeCategoryModal();
            }
          }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 rounded-4 shadow">
              <div className="modal-header px-4 py-3">
                <div>
                  <h5
                    className="modal-title fw-bold"
                    style={{ color: "#1d2b2e" }}
                  >
                    {editingCategory
                      ? "Edit Category"
                      : "Add New Category"}
                  </h5>

                  <p className="mb-0 mt-1 text-muted small">
                    {editingCategory
                      ? "Update the category details."
                      : "Create a category for hidden spots."}
                  </p>
                </div>

                <button
                  type="button"
                  className="btn-close"
                  aria-label="Close"
                  onClick={closeCategoryModal}
                  disabled={saving}
                />
              </div>

              <div className="modal-body p-4">
                {formError && (
                  <div
                    className="alert alert-danger py-2"
                    role="alert"
                  >
                    {formError}
                  </div>
                )}

                <form onSubmit={handleSaveCategory}>
                  <div className="mb-3">
                    <label
                      htmlFor="categoryName"
                      className="form-label fw-semibold"
                    >
                      Category Name *
                    </label>

                    <input
                      id="categoryName"
                      type="text"
                      className="form-control"
                      placeholder="e.g. Waterfalls"
                      maxLength={100}
                      required
                      autoFocus
                      value={formData.name}
                      onChange={(event) =>
                        setFormData((previous) => ({
                          ...previous,
                          name: event.target.value,
                        }))
                      }
                    />
                  </div>

                  <div className="mb-3">
                    <label
                      htmlFor="categoryDescription"
                      className="form-label fw-semibold"
                    >
                      Description
                    </label>

                    <textarea
                      id="categoryDescription"
                      className="form-control"
                      rows="3"
                      placeholder="Describe this category"
                      value={formData.description}
                      onChange={(event) =>
                        setFormData((previous) => ({
                          ...previous,
                          description: event.target.value,
                        }))
                      }
                    />
                  </div>

                  <div className="form-check mb-4">
                    <input
                      id="categoryActive"
                      className="form-check-input"
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={(event) =>
                        setFormData((previous) => ({
                          ...previous,
                          is_active: event.target.checked,
                        }))
                      }
                    />

                    <label
                      htmlFor="categoryActive"
                      className="form-check-label"
                    >
                      Active category
                    </label>
                  </div>

                  <div className="d-flex justify-content-end gap-2">
                    <button
                      type="button"
                      className="btn btn-light border rounded-3"
                      onClick={closeCategoryModal}
                      disabled={saving}
                    >
                      Cancel
                    </button>

                    <button
                      type="submit"
                      className="btn rounded-3 px-4"
                      style={{
                        backgroundColor: "#20d9ae",
                        borderColor: "#20d9ae",
                        color: "#06352b",
                        fontWeight: 600,
                      }}
                      disabled={saving}
                    >
                      {saving
                        ? "Saving..."
                        : editingCategory
                          ? "Save Changes"
                          : "Create Category"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW SPOTS MODAL */}
      {viewingCategory && (
        <div
          className="modal d-block"
          tabIndex="-1"
          role="dialog"
          aria-modal="true"
          style={{
            backgroundColor: "rgba(10, 20, 25, 0.60)",
            zIndex: 1060,
          }}
        >
          <div className="modal-dialog modal-dialog-centered modal-lg modal-dialog-scrollable">
            <div className="modal-content border-0 rounded-4 shadow">
              <div className="modal-header">
                <div>
                  <h5 className="modal-title fw-bold">
                    {viewingCategory.name}
                  </h5>

                  <p className="mb-0 mt-1 text-muted small">
                    {getSpotCount(viewingCategory.id)} assigned spot(s)
                  </p>
                </div>

                <button
                  type="button"
                  className="btn-close"
                  aria-label="Close"
                  onClick={() => setViewingCategory(null)}
                />
              </div>

              <div className="modal-body">
                {getSpotCount(viewingCategory.id) === 0 ? (
                  <div className="text-center py-4 text-muted">
                    No spots are assigned to this category yet.
                  </div>
                ) : (
                  <div className="table-responsive">
                    <table className="table align-middle">
                      <thead>
                        <tr>
                          <th>SPOT</th>
                          <th>STATUS</th>
                          <th>DESCRIPTION</th>
                        </tr>
                      </thead>

                      <tbody>
                        {getSpotsForCategory(viewingCategory.id).map(
                          (spot) => (
                            <tr key={spot.id}>
                              <td>
                                <div className="fw-semibold">
                                  {spot.name || `Spot #${spot.id}`}
                                </div>
                                <small className="text-muted">
                                  ID: {spot.id}
                                </small>
                              </td>

                              <td>
                                <span className="badge bg-light text-dark border">
                                  {spot.status || "Unknown"}
                                </span>
                              </td>

                              <td>
                                {spot.description || "No description"}
                              </td>
                            </tr>
                          )
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-light border"
                  onClick={() => setViewingCategory(null)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL */}
      {confirmAction && (
        <div
          className="modal d-block"
          tabIndex="-1"
          role="dialog"
          aria-modal="true"
          style={{
            backgroundColor: "rgba(10, 20, 25, 0.60)",
            zIndex: 1060,
          }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 rounded-4 shadow">
              <div className="modal-header">
                <h5 className="modal-title fw-bold">
                  {confirmAction.type === "delete"
                    ? "Delete category?"
                    : confirmAction.category.is_active
                      ? "Deactivate category?"
                      : "Activate category?"}
                </h5>

                <button
                  type="button"
                  className="btn-close"
                  aria-label="Close"
                  disabled={actionLoading}
                  onClick={() => setConfirmAction(null)}
                />
              </div>

              <div className="modal-body">
                {confirmAction.type === "delete" ? (
                  <>
                    Are you sure you want to delete{" "}
                    <strong>{confirmAction.category.name}</strong>?

                    {getSpotCount(confirmAction.category.id) > 0 && (
                      <div className="alert alert-warning mt-3 mb-0">
                        This category is assigned to{" "}
                        {getSpotCount(confirmAction.category.id)} spot(s).
                        The backend may prevent deletion while spots are assigned.
                      </div>
                    )}
                  </>
                ) : confirmAction.category.is_active ? (
                  <>
                    Deactivate{" "}
                    <strong>{confirmAction.category.name}</strong>?
                    It should no longer be available for new spot submissions.
                    Existing spots will remain assigned.
                  </>
                ) : (
                  <>
                    Activate{" "}
                    <strong>{confirmAction.category.name}</strong>?
                    Users will be able to select it for new spot submissions.
                  </>
                )}
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-light border"
                  disabled={actionLoading}
                  onClick={() => setConfirmAction(null)}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  className={`btn ${
                    confirmAction.type === "delete"
                      ? "btn-danger"
                      : confirmAction.category.is_active
                        ? "btn-warning"
                        : "btn-success"
                  }`}
                  disabled={actionLoading}
                  onClick={() =>
                    confirmAction.type === "delete"
                      ? handleDeleteCategory(confirmAction.category)
                      : handleToggleStatus(confirmAction.category)
                  }
                >
                  {actionLoading
                    ? "Please wait..."
                    : confirmAction.type === "delete"
                      ? "Delete Category"
                      : confirmAction.category.is_active
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

export default AdminCategories;
