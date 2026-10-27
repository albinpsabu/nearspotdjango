
import { useEffect, useState } from "react";

// ============================================================
// INITIAL FORM VALUES
// ============================================================

const INITIAL_FORM = {
  name: "",
  category: "",
  description: "",
  address: "",
};

const REQUIRED_IMAGES = 3;
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

// ============================================================
// HIDDENSPOT FORM
// ============================================================

function HiddenSpotForm({
  show,
  location,
  categories = [],
  categoriesLoading = false,
  onClose,
  onBack,
  onSubmit,
  submitting = false,
}) {
  const [formData, setFormData] = useState({
    ...INITIAL_FORM,
  });

  const [images, setImages] = useState([]);
  const [errors, setErrors] = useState({});

  // ============================================================
  // RESET FORM WHEN OPENED
  // ============================================================

  useEffect(() => {
    if (show) {
      setFormData({ ...INITIAL_FORM });
      setImages([]);
      setErrors({});
    }
  }, [show]);

  // ============================================================
  // HANDLE INPUT CHANGES
  // ============================================================

  function handleChange(event) {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));

    setErrors((previous) => ({
      ...previous,
      [name]: "",
    }));
  }

  // ============================================================
  // HANDLE IMAGE SELECTION
  // ============================================================

  function handleImageChange(event) {
    const selectedFiles = Array.from(
      event.target.files || []
    );

    // Exactly three images must be selected.
    if (selectedFiles.length !== REQUIRED_IMAGES) {
      setImages([]);

      setErrors((previous) => ({
        ...previous,
        images: "Please select exactly 3 images.",
      }));

      // Allow the user to select the same files again.
      event.target.value = "";
      return;
    }

    // Validate image type and size.
    const invalidFile = selectedFiles.find(
      (file) =>
        !ALLOWED_IMAGE_TYPES.includes(file.type) ||
        file.size > MAX_IMAGE_SIZE
    );

    if (invalidFile) {
      setImages([]);

      setErrors((previous) => ({
        ...previous,
        images:
          "Only JPG, PNG, or WebP images up to 5 MB are allowed.",
      }));

      event.target.value = "";
      return;
    }

    setImages(selectedFiles);

    setErrors((previous) => ({
      ...previous,
      images: "",
    }));
  }

  // ============================================================
  // VALIDATION
  // ============================================================

  function validate() {
    const newErrors = {};

    // Validate spot name.
    if (formData.name.trim().length < 3) {
      newErrors.name =
        "Spot name must contain at least 3 characters.";
    }

    // Validate category.
    if (!formData.category) {
      newErrors.category = "Please select a category.";
    } else if (
      !categories.some(
        (category) =>
          String(category.id) === String(formData.category)
      )
    ) {
      newErrors.category =
        "Please select a valid category.";
    }

    // Validate description.
    if (formData.description.trim().length < 20) {
      newErrors.description =
        "Description must contain at least 20 characters.";
    }

    // Validate mandatory landmark.
    if (!formData.address.trim()) {
      newErrors.address = "Please enter a landmark.";
    }

    // Require exactly three images.
    if (images.length !== REQUIRED_IMAGES) {
      newErrors.images = "Exactly 3 images are required.";
    }

    // Validate every selected image again before submission.
    if (
      images.some(
        (file) =>
          !ALLOWED_IMAGE_TYPES.includes(file.type) ||
          file.size > MAX_IMAGE_SIZE
      )
    ) {
      newErrors.images =
        "One or more images have an invalid format or size.";
    }

    // Do not allow submission while category data is loading.
    if (categoriesLoading) {
      newErrors.category =
        "Please wait while categories are loading.";
    }

    setErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  }

  // ============================================================
  // SUBMIT FORM
  // ============================================================

  function handleSubmit(event) {
    event.preventDefault();

    if (submitting || !location) return;

    if (!validate()) return;

    onSubmit?.({
      name: formData.name.trim(),
      category: Number(formData.category),
      description: formData.description.trim(),
      address: formData.address.trim(),
      latitude: Number(location.latitude),
      longitude: Number(location.longitude),
      images,
    });
  }

  // ============================================================
  // RENDER
  // ============================================================

  if (!show || !location) return null;

  return (
    <>
      {/* MODAL BACKDROP */}
      <div
        className="modal-backdrop fade show"
        style={{ zIndex: 2000 }}
      />

      {/* MODAL */}
      <div
        className="modal fade show d-block"
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label="Add HiddenSpot"
        style={{
          zIndex: 2001,
          overflowY: "hidden",
        }}
      >
        <div
          className="modal-dialog modal-dialog-centered modal-lg"
          style={{
            height: "calc(100dvh - 32px)",
            maxHeight: "calc(100dvh - 32px)",
            marginTop: "16px",
            marginBottom: "16px",
          }}
        >
          <div
            className="modal-content border-0 rounded-4 shadow-lg overflow-hidden"
            style={{
              height: "100%",
              maxHeight: "100%",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {/* MODAL HEADER */}
            <div className="modal-header border-bottom flex-shrink-0">
              <div>
                <h5 className="modal-title fw-bold">
                  <i className="bi bi-geo-alt-fill text-success me-2" />
                  Add a HiddenSpot
                </h5>

                <p className="text-secondary small mb-0 mt-1">
                  Share a hidden place with the NearSpot community.
                </p>
              </div>

              <button
                type="button"
                className="btn-close"
                onClick={onClose}
                disabled={submitting}
                aria-label="Close"
              />
            </div>

            {/* FORM */}
            <form
              onSubmit={handleSubmit}
              noValidate
              className="d-flex flex-column flex-grow-1 overflow-hidden"
              style={{
                minHeight: 0,
              }}
            >
              {/* SCROLLABLE FORM BODY */}
              <div
                className="modal-body p-4 overflow-auto flex-grow-1"
                style={{
                  minHeight: 0,
                }}
              >
                {/* SELECTED LOCATION */}
                <div className="bg-light rounded-3 p-3 mb-4">
                  <div className="d-flex align-items-center justify-content-between gap-3">
                    <div>
                      <div className="fw-semibold small mb-1">
                        <i className="bi bi-pin-map-fill text-success me-2" />
                        Selected Location
                      </div>

                      <div className="small text-secondary">
                        {Number(location.latitude).toFixed(6)},{" "}
                        {Number(location.longitude).toFixed(6)}
                      </div>
                    </div>

                    <button
                      type="button"
                      className="btn btn-sm btn-outline-success"
                      onClick={onBack}
                      disabled={submitting}
                    >
                      Change
                    </button>
                  </div>
                </div>

                {/* SPOT NAME */}
                <div className="mb-3">
                  <label
                    htmlFor="hiddenSpotName"
                    className="form-label fw-semibold"
                  >
                    Spot Name <span className="text-danger">*</span>
                  </label>

                  <input
                    id="hiddenSpotName"
                    type="text"
                    name="name"
                    className={`form-control ${
                      errors.name ? "is-invalid" : ""
                    }`}
                    placeholder="e.g. Secret Sunset Viewpoint"
                    value={formData.name}
                    onChange={handleChange}
                    maxLength={150}
                    disabled={submitting}
                    required
                  />

                  {errors.name && (
                    <div className="invalid-feedback">
                      {errors.name}
                    </div>
                  )}
                </div>

                {/* CATEGORY */}
                <div className="mb-3">
                  <label
                    htmlFor="hiddenSpotCategory"
                    className="form-label fw-semibold"
                  >
                    Category <span className="text-danger">*</span>
                  </label>

                  <select
                    id="hiddenSpotCategory"
                    name="category"
                    className={`form-select ${
                      errors.category ? "is-invalid" : ""
                    }`}
                    value={formData.category}
                    onChange={handleChange}
                    disabled={submitting || categoriesLoading}
                    required
                  >
                    <option value="">
                      {categoriesLoading
                        ? "Loading categories..."
                        : "Select a category"}
                    </option>

                    {categories.map((category) => (
                      <option
                        key={category.id}
                        value={category.id}
                      >
                        {category.name}
                      </option>
                    ))}
                  </select>

                  {errors.category && (
                    <div className="invalid-feedback">
                      {errors.category}
                    </div>
                  )}

                  {!categoriesLoading &&
                    categories.length === 0 && (
                      <small className="text-danger d-block mt-1">
                        No active categories available.
                      </small>
                    )}
                </div>

                {/* DESCRIPTION */}
                <div className="mb-3">
                  <label
                    htmlFor="hiddenSpotDescription"
                    className="form-label fw-semibold"
                  >
                    Description <span className="text-danger">*</span>
                  </label>

                  <textarea
                    id="hiddenSpotDescription"
                    name="description"
                    className={`form-control ${
                      errors.description ? "is-invalid" : ""
                    }`}
                    rows={5}
                    placeholder="What makes this place special? Describe the experience, scenery, or interesting features."
                    value={formData.description}
                    onChange={handleChange}
                    maxLength={2000}
                    disabled={submitting}
                    required
                  />

                  <div className="d-flex justify-content-between mt-1 gap-2">
                    {errors.description ? (
                      <small className="text-danger">
                        {errors.description}
                      </small>
                    ) : (
                      <small className="text-secondary">
                        Minimum 20 characters
                      </small>
                    )}

                    <small className="text-secondary">
                      {formData.description.length}/2000
                    </small>
                  </div>
                </div>

                {/* MANDATORY LANDMARK */}
                <div className="mb-3">
                  <label
                    htmlFor="hiddenSpotAddress"
                    className="form-label fw-semibold"
                  >
                    Landmark <span className="text-danger">*</span>
                  </label>

                  <input
                    id="hiddenSpotAddress"
                    type="text"
                    name="address"
                    className={`form-control ${
                      errors.address ? "is-invalid" : ""
                    }`}
                    placeholder="Enter a nearby road, landmark, or area"
                    value={formData.address}
                    onChange={handleChange}
                    maxLength={255}
                    disabled={submitting}
                    required
                  />

                  {errors.address && (
                    <div className="invalid-feedback">
                      {errors.address}
                    </div>
                  )}
                </div>

                {/* IMAGES */}
                <div className="mb-3">
                  <label
                    htmlFor="hiddenSpotImages"
                    className="form-label fw-semibold"
                  >
                    Photos <span className="text-danger">*</span>
                  </label>

                  <input
                    id="hiddenSpotImages"
                    type="file"
                    className={`form-control ${
                      errors.images ? "is-invalid" : ""
                    }`}
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    onChange={handleImageChange}
                    disabled={submitting}
                    required
                  />

                  <small className="text-secondary d-block mt-1">
                    Select exactly 3 images. JPG, PNG, or WebP;
                    maximum 5 MB each.
                  </small>

                  {errors.images && (
                    <div className="text-danger small mt-1">
                      {errors.images}
                    </div>
                  )}

                  {images.length > 0 && (
                    <div className="small text-success mt-2">
                      <i className="bi bi-images me-2" />
                      {images.length} of {REQUIRED_IMAGES} images selected
                    </div>
                  )}
                </div>

                {/* APPROVAL NOTICE */}
                <div className="alert alert-info small mb-0">
                  <i className="bi bi-info-circle me-2" />
                  Your HiddenSpot will be reviewed before
                  appearing publicly on NearSpot.
                </div>
              </div>

              {/* FIXED FORM FOOTER */}
              <div
                className="modal-footer border-top bg-white flex-shrink-0 d-flex justify-content-between gap-2"
                style={{
                  position: "relative",
                  zIndex: 2,
                }}
              >
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={onBack}
                  disabled={submitting}
                >
                  <i className="bi bi-arrow-left me-2" />
                  Back
                </button>

                <button
                  type="submit"
                  className="btn btn-success px-4 fw-semibold"
                  disabled={
                    submitting ||
                    categoriesLoading ||
                    categories.length === 0
                  }
                >
                  {submitting ? (
                    <>
                      <span
                        className="spinner-border spinner-border-sm me-2"
                        role="status"
                      />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-send me-2" />
                      Submit HiddenSpot
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}

export default HiddenSpotForm;
