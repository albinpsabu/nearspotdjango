import { useCallback, useEffect, useRef, useState } from "react";

const INITIAL_FORM = {
  name: "",
  category: "",
  description: "",
  address: "",
};

const REQUIRED_IMAGES = 3;
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

function FieldLabel({ htmlFor, children, optional = false }) {
  return (
    <label
      htmlFor={htmlFor}
      className="form-label d-flex align-items-center gap-2 mb-2"
      style={{ fontSize: "0.88rem", fontWeight: 650, color: "#1e293b" }}
    >
      {children}
      {optional ? (
        <span className="badge rounded-pill bg-light text-secondary">
          OPTIONAL
        </span>
      ) : (
        <span style={{ color: "#dc5a50" }}>*</span>
      )}
    </label>
  );
}

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
  const [formData, setFormData] = useState({ ...INITIAL_FORM });
  const [images, setImages] = useState([]);
  const [errors, setErrors] = useState({});
  const [previewUrls, setPreviewUrls] = useState([]);

  // Camera state
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [cameraStarting, setCameraStarting] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);

  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const cameraStreamRef = useRef(null);

  // Release webcam tracks and camera indicator.
  const stopCamera = useCallback(() => {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((track) => track.stop());
      cameraStreamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraReady(false);
    setCameraOpen(false);
    setCameraStarting(false);
  }, []);

  // Start webcam when the camera panel is opened.
  useEffect(() => {
    if (!cameraOpen || !show) return undefined;

    let cancelled = false;
    let activeStream = null;

    async function startCamera() {
      setCameraError("");
      setCameraStarting(true);

      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error(
            "Camera access is unavailable. Use HTTPS or localhost and a supported browser."
          );
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        });

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        activeStream = stream;
        cameraStreamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setCameraReady(true);
        }
      } catch (error) {
        if (!cancelled) {
          setCameraReady(false);

          const messages = {
            NotAllowedError:
              "Camera permission was denied. Allow camera access in your browser settings.",
            NotFoundError: "No camera was found on this device.",
            NotReadableError:
              "The camera is busy or cannot be accessed. Close other apps using it and try again.",
            OverconstrainedError:
              "The requested camera settings are not supported by this device.",
          };

          setCameraError(
            messages[error.name] ||
              error.message ||
              "Unable to access the camera. Check your browser permissions."
          );
        }
      } finally {
        if (!cancelled) setCameraStarting(false);
      }
    }

    startCamera();

    return () => {
      cancelled = true;

      if (activeStream) {
        activeStream.getTracks().forEach((track) => track.stop());
      }

      if (cameraStreamRef.current === activeStream) {
        cameraStreamRef.current = null;
      }
    };
  }, [cameraOpen, show]);

  // Reset form when opened.
  useEffect(() => {
    if (show) {
      setFormData({ ...INITIAL_FORM });
      setImages([]);
      setErrors({});
      setCameraError("");
    } else {
      stopCamera();
    }
  }, [show, stopCamera]);

  // Generate image previews and release old object URLs.
  useEffect(() => {
    const urls = images.map((file) => ({
      name: file.name,
      size: file.size,
      url: URL.createObjectURL(file),
    }));

    setPreviewUrls(urls);

    return () => {
      urls.forEach(({ url }) => URL.revokeObjectURL(url));
    };
  }, [images]);

  // Close the form or camera with Escape.
  useEffect(() => {
    if (!show || submitting) return undefined;

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        if (cameraOpen) {
          stopCamera();
        } else {
          onClose?.();
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [show, submitting, cameraOpen, stopCamera, onClose]);

  function handleChange(event) {
    const { name, value } = event.target;

    setFormData((previous) => ({ ...previous, [name]: value }));
    setErrors((previous) => ({ ...previous, [name]: "" }));
  }

  // Shared validation for gallery files and camera captures.
  function addImageFiles(selectedFiles) {
    const files = Array.from(selectedFiles || []);
    if (!files.length) return;

    const invalidType = files.find(
      (file) => !ALLOWED_IMAGE_TYPES.includes(file.type)
    );

    if (invalidType) {
      setErrors((previous) => ({
        ...previous,
        images: "Use JPG, PNG, or WebP image formats only.",
      }));
      return;
    }

    const oversized = files.find((file) => file.size > MAX_IMAGE_SIZE);

    if (oversized) {
      setErrors((previous) => ({
        ...previous,
        images: `"${oversized.name}" exceeds the 10 MB limit.`,
      }));
      return;
    }

    setImages((previous) => {
      const remaining = REQUIRED_IMAGES - previous.length;

      if (files.length > remaining) {
        setErrors((current) => ({
          ...current,
          images: `You can add only ${remaining} more photo(s).`,
        }));
        return previous;
      }

      setErrors((current) => ({ ...current, images: "" }));
      return [...previous, ...files];
    });
  }

  function handleImageChange(event) {
    addImageFiles(event.target.files);
    // Allows selecting the same file again after removing it.
    event.target.value = "";
  }

  async function capturePhoto() {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas || !video.videoWidth || !video.videoHeight) {
      setCameraError("The camera is not ready yet. Please wait and try again.");
      return;
    }

    if (images.length >= REQUIRED_IMAGES) {
      setCameraError("You have already selected 3 photos.");
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const context = canvas.getContext("2d");

    if (!context) {
      setCameraError("Unable to capture the photo. Please try again.");
      return;
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setCameraError("Unable to create the photo. Please try again.");
          return;
        }

        if (blob.size > MAX_IMAGE_SIZE) {
          setCameraError(
            "This captured photo exceeds 10 MB. Try a lower-resolution camera setting."
          );
          return;
        }

        const file = new File([blob], `nearspot-${Date.now()}.jpg`, {
          type: "image/jpeg",
          lastModified: Date.now(),
        });

        addImageFiles([file]);
        setCameraError("");
        stopCamera();
      },
      "image/jpeg",
      0.92
    );
  }

  function removeImage(indexToRemove) {
    setImages((previous) =>
      previous.filter((_, index) => index !== indexToRemove)
    );
    setErrors((previous) => ({ ...previous, images: "" }));
  }

  function removeImages() {
    setImages([]);
    setErrors((previous) => ({ ...previous, images: "" }));
  }

  function validate() {
    const nextErrors = {};

    if (formData.name.trim().length < 3) {
      nextErrors.name = "Enter a name with at least 3 characters.";
    }

    if (!formData.category) {
      nextErrors.category = "Choose a category for this place.";
    } else if (
      !categories.some(
        (category) => String(category.id) === String(formData.category)
      )
    ) {
      nextErrors.category = "Choose a valid category.";
    }

    if (formData.description.trim().length < 20) {
      nextErrors.description =
        "Tell us a little more about this place (at least 20 characters).";
    }

    if (!formData.address.trim()) {
      nextErrors.address = "Add a nearby landmark or area.";
    }

    if (images.length !== REQUIRED_IMAGES) {
      nextErrors.images = "Exactly 3 photos are required.";
    }

    if (
      images.some(
        (file) =>
          !ALLOWED_IMAGE_TYPES.includes(file.type) ||
          file.size > MAX_IMAGE_SIZE
      )
    ) {
      nextErrors.images =
        "One or more photos have an unsupported format or exceed 10 MB.";
    }

    if (categoriesLoading) {
      nextErrors.category = "Please wait for categories to load.";
    }

    if (
      !location ||
      !Number.isFinite(Number(location.latitude)) ||
      !Number.isFinite(Number(location.longitude))
    ) {
      nextErrors.location = "A verified GPS location is required.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function handleSubmit(event) {
    event.preventDefault();

    if (submitting || !location || cameraOpen) return;
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

  if (!show || !location) return null;

  const inputStyle = {
    borderRadius: "12px",
    borderColor: "#dbe3e8",
    minHeight: "48px",
    padding: "12px 14px",
    fontSize: "0.9rem",
    color: "#172b25",
    boxShadow: "none",
  };

  const invalidInputStyle = { ...inputStyle, borderColor: "#dc5a50" };

  const cardLabelStyle = {
    fontSize: "0.72rem",
    color: "#64748b",
    letterSpacing: "0.07em",
    fontWeight: 650,
    textTransform: "uppercase",
  };

  return (
    <>
      <style>
        {`
          .hidden-spot-scroll-body {
            scrollbar-width: none !important;
            -ms-overflow-style: none !important;
            overscroll-behavior: contain;
          }

          .hidden-spot-scroll-body::-webkit-scrollbar {
            display: none !important;
          }

          .hidden-spot-photo-action {
            min-height: 48px;
            border-radius: 12px;
            font-weight: 600;
          }
        `}
      </style>

      <div
        className="modal-backdrop fade show"
        style={{
          zIndex: 2000,
          background: "rgba(10, 24, 19, 0.64)",
          backdropFilter: "blur(8px)",
        }}
      />

      <div
        className="modal fade show d-block"
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label="Create a Hidden Spot"
        style={{ zIndex: 2001, overflowY: "hidden" }}
      >
        <div
          className="modal-dialog modal-dialog-centered modal-lg"
          style={{
            width: "min(calc(100% - 20px), 850px)",
            maxWidth: "850px",
            height: "calc(100dvh - 24px)",
            maxHeight: "calc(100dvh - 24px)",
            margin: "12px auto",
          }}
        >
          <div
            className="modal-content border-0 overflow-hidden"
            style={{
              height: "100%",
              borderRadius: "22px",
              background: "#fff",
              boxShadow: "0 32px 100px rgba(0,0,0,.25)",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <header
              className="px-4 px-md-5 pt-4 pb-3 flex-shrink-0"
              style={{
                background: "linear-gradient(120deg,#f0f8f3,#fff 76%)",
                borderBottom: "1px solid #edf1ee",
              }}
            >
              <div className="d-flex justify-content-between align-items-start gap-3">
                <div className="d-flex align-items-center gap-3">
                  <div
                    className="d-flex align-items-center justify-content-center flex-shrink-0"
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: 16,
                      background: "#145c43",
                      color: "#fff",
                    }}
                  >
                    <i className="bi bi-geo-alt fs-3" />
                  </div>

                  <div>
                    <div
                      className="small fw-bold mb-1"
                      style={{
                        color: "#197451",
                        letterSpacing: ".12em",
                        fontSize: ".65rem",
                      }}
                    >
                      NEARSPOT · COMMUNITY
                    </div>

                    <h4 className="mb-1 fw-bold" style={{ color: "#173b2e" }}>
                      Share a hidden gem.
                    </h4>

                    <p className="small text-secondary mb-0">
                      Help others discover a place worth finding.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  className="btn d-flex align-items-center justify-content-center"
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 12,
                    background: "#f1f5f3",
                    color: "#52665d",
                    border: "none",
                  }}
                  onClick={onClose}
                  disabled={submitting}
                  aria-label="Close form"
                >
                  <i className="bi bi-x-lg" />
                </button>
              </div>

              <div className="mt-4">
                <div className="d-flex justify-content-between mb-2">
                  <span className="small fw-semibold">
                    New place submission
                  </span>
                  <span className="small text-secondary">
                    Details &amp; photos
                  </span>
                </div>

                <div className="d-flex gap-2">
                  <div
                    className="flex-fill rounded-pill"
                    style={{ height: 4, background: "#176b4d" }}
                  />
                  <div
                    className="flex-fill rounded-pill"
                    style={{ height: 4, background: "#176b4d" }}
                  />
                  <div
                    className="flex-fill rounded-pill"
                    style={{ height: 4, background: "#e4ebe6" }}
                  />
                </div>
              </div>
            </header>

            <form
              onSubmit={handleSubmit}
              noValidate
              className="d-flex flex-column flex-grow-1 overflow-hidden"
              style={{ minHeight: 0 }}
            >
              <div
                className="modal-body px-4 px-md-5 py-4 overflow-auto flex-grow-1 hidden-spot-scroll-body"
                style={{ minHeight: 0 }}
              >
                {/* GPS LOCATION */}

                <section
                  className="p-3 p-md-4 mb-4"
                  style={{
                    borderRadius: 16,
                    border: "1px solid #dcebe2",
                    background: "linear-gradient(120deg,#f2f9f4,#f9fcfa)",
                  }}
                >
                  <div className="d-flex align-items-start gap-3">
                    <div
                      className="d-flex align-items-center justify-content-center flex-shrink-0"
                      style={{
                        width: 42,
                        height: 42,
                        borderRadius: 13,
                        background: "#dcefe2",
                        color: "#176b4d",
                      }}
                    >
                      <i className="bi bi-shield-check fs-4" />
                    </div>

                    <div className="flex-grow-1">
                      <div className="d-flex flex-wrap align-items-center gap-2 mb-1">
                        <span className="fw-bold" style={{ color: "#174a35" }}>
                          Location confirmed
                        </span>
                        <span
                          className="badge rounded-pill"
                          style={{ background: "#d7f1df", color: "#176b4d" }}
                        >
                          <i className="bi bi-check-circle-fill me-1" />
                          GPS verified
                        </span>
                      </div>

                      <p className="small text-secondary mb-3">
                        This place will be registered at your confirmed device
                        location.
                      </p>

                      <div className="row g-3">
                        <div className="col-sm-6">
                          <div style={cardLabelStyle}>Latitude</div>
                          <div className="font-monospace mt-1 fw-semibold">
                            {Number(location.latitude).toFixed(6)}
                          </div>
                        </div>

                        <div className="col-sm-6">
                          <div style={cardLabelStyle}>Longitude</div>
                          <div className="font-monospace mt-1 fw-semibold">
                            {Number(location.longitude).toFixed(6)}
                          </div>
                        </div>
                      </div>

                      {Number.isFinite(Number(location.accuracy)) && (
                        <div
                          className="d-flex align-items-center gap-2 mt-3 pt-3"
                          style={{ borderTop: "1px solid #dcebe2" }}
                        >
                          <i className="bi bi-broadcast-pin" />
                          <span className="small text-secondary">
                            GPS accuracy
                          </span>
                          <span className="small fw-bold ms-auto">
                            ±{Math.round(Number(location.accuracy))} m
                          </span>
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      className="btn btn-sm flex-shrink-0"
                      onClick={onBack}
                      disabled={submitting}
                      style={{
                        color: "#176b4d",
                        border: "1px solid #c8dfd0",
                        background: "#fff",
                        borderRadius: 9,
                      }}
                    >
                      <i className="bi bi-arrow-repeat me-1" />
                      Change
                    </button>
                  </div>

                  {errors.location && (
                    <div className="small text-danger mt-2">
                      {errors.location}
                    </div>
                  )}
                </section>

                <div className="mb-4">
                  <div
                    className="fw-bold mb-1"
                    style={{ color: "#173b2e", fontSize: "1.1rem" }}
                  >
                    Tell us about the place
                  </div>
                  <p className="small text-secondary">
                    Add the details visitors need to understand and find it.
                  </p>
                </div>

                {/* PLACE NAME */}

                <div className="mb-4">
                  <FieldLabel htmlFor="hiddenSpotName">Place name</FieldLabel>
                  <input
                    id="hiddenSpotName"
                    name="name"
                    className={`form-control ${errors.name ? "is-invalid" : ""}`}
                    style={errors.name ? invalidInputStyle : inputStyle}
                    placeholder="e.g. The Secret Garden Café"
                    value={formData.name}
                    onChange={handleChange}
                    maxLength={150}
                    disabled={submitting}
                    autoComplete="off"
                    required
                  />
                  {errors.name ? (
                    <div className="invalid-feedback">{errors.name}</div>
                  ) : (
                    <div className="form-text">
                      Choose a clear, memorable name.
                    </div>
                  )}
                </div>

                {/* CATEGORY */}

                <div className="mb-4">
                  <FieldLabel htmlFor="hiddenSpotCategory">Category</FieldLabel>
                  <select
                    id="hiddenSpotCategory"
                    name="category"
                    className={`form-select ${errors.category ? "is-invalid" : ""}`}
                    style={errors.category ? invalidInputStyle : inputStyle}
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
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                  {errors.category && (
                    <div className="invalid-feedback">{errors.category}</div>
                  )}
                  {!categoriesLoading && categories.length === 0 && (
                    <div className="small text-danger mt-2">
                      No active categories are currently available.
                    </div>
                  )}
                </div>

                {/* DESCRIPTION */}

                <div className="mb-4">
                  <div className="d-flex justify-content-between align-items-center">
                    <FieldLabel htmlFor="hiddenSpotDescription">
                      About this place
                    </FieldLabel>
                    <span className="small text-secondary mb-2">
                      {formData.description.length}/2000
                    </span>
                  </div>

                  <textarea
                    id="hiddenSpotDescription"
                    name="description"
                    className={`form-control ${errors.description ? "is-invalid" : ""}`}
                    style={{
                      ...(errors.description ? invalidInputStyle : inputStyle),
                      minHeight: 140,
                      resize: "vertical",
                    }}
                    rows={5}
                    placeholder="What makes this place special? Describe the atmosphere, views, experiences, or things visitors should know..."
                    value={formData.description}
                    onChange={handleChange}
                    maxLength={2000}
                    disabled={submitting}
                    required
                  />
                  {errors.description ? (
                    <div className="invalid-feedback">{errors.description}</div>
                  ) : (
                    <div className="form-text">
                      At least 20 characters. Help visitors understand what makes
                      this place special.
                    </div>
                  )}
                </div>

                {/* NEARBY LANDMARK */}

                <div className="mb-4">
                  <FieldLabel htmlFor="hiddenSpotAddress">
                    Nearby landmark
                  </FieldLabel>
                  <div className="input-group">
                    <span
                      className="input-group-text"
                      style={{
                        borderColor: "#dbe3e8",
                        background: "#f8faf9",
                        borderRadius: "12px 0 0 12px",
                        paddingInline: 15,
                      }}
                    >
                      <i className="bi bi-signpost-2 fs-5" />
                    </span>
                    <input
                      id="hiddenSpotAddress"
                      name="address"
                      className={`form-control ${errors.address ? "is-invalid" : ""}`}
                      style={{
                        ...(errors.address ? invalidInputStyle : inputStyle),
                        borderRadius: "0 12px 12px 0",
                      }}
                      placeholder="A nearby road, landmark, or area"
                      value={formData.address}
                      onChange={handleChange}
                      maxLength={255}
                      disabled={submitting}
                      required
                    />
                  </div>
                  {errors.address ? (
                    <div className="small text-danger mt-2">
                      {errors.address}
                    </div>
                  ) : (
                    <div className="form-text">
                      Help visitors recognise the surrounding area.
                    </div>
                  )}
                </div>

                {/* PHOTO SECTION */}

                <section className="mb-4">
                  <div className="d-flex justify-content-between align-items-start gap-3 mb-3">
                    <div>
                      <FieldLabel htmlFor="hiddenSpotImages">
                        Photos of the place
                      </FieldLabel>
                      <p className="small text-secondary mb-0">
                        Choose photos from your device or take new ones.
                      </p>
                    </div>

                    <span
                      className="badge rounded-pill px-3 py-2"
                      style={{
                        background:
                          images.length === REQUIRED_IMAGES
                            ? "#d7f1df"
                            : "#f1f5f9",
                        color:
                          images.length === REQUIRED_IMAGES
                            ? "#176b4d"
                            : "#64748b",
                      }}
                    >
                      {images.length} of {REQUIRED_IMAGES}
                    </span>
                  </div>

                  <input
                    ref={fileInputRef}
                    id="hiddenSpotImages"
                    type="file"
                    className="visually-hidden"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    onChange={handleImageChange}
                    disabled={submitting || images.length >= REQUIRED_IMAGES}
                    aria-label="Choose photos from your device"
                  />

                  <div className="row g-2">
                    <div className="col-12 col-sm-6">
                      <button
                        type="button"
                        className="btn btn-outline-success w-100 d-flex align-items-center justify-content-center gap-2 hidden-spot-photo-action"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={submitting || images.length >= REQUIRED_IMAGES}
                      >
                        <i className="bi bi-images fs-5" />
                        Choose from gallery
                      </button>
                    </div>

                    <div className="col-12 col-sm-6">
                      <button
                        type="button"
                        className="btn w-100 d-flex align-items-center justify-content-center gap-2 hidden-spot-photo-action"
                        style={{
                          background: "#176b4d",
                          borderColor: "#176b4d",
                          color: "#fff",
                        }}
                        onClick={() => {
                          setCameraError("");
                          setCameraOpen(true);
                        }}
                        disabled={submitting || images.length >= REQUIRED_IMAGES}
                      >
                        <i className="bi bi-camera fs-5" />
                        Open camera
                      </button>
                    </div>
                  </div>

                  <div className="small text-secondary mt-3">
                    Select or capture up to 3 photos. Supported formats: JPG,
                    PNG, WebP.
                  </div>
                  <div
                    className="small mt-1"
                    style={{ color: "#7a8b82", fontSize: ".75rem" }}
                  >
                    Maximum file size: 10 MB per image.
                  </div>
                  <div className="form-text">
                    You can mix gallery photos and camera captures. Each photo
                    is added to the preview until all 3 slots are filled.
                  </div>

                  {errors.images && (
                    <div className="small mt-2 text-danger" role="alert">
                      <i className="bi bi-exclamation-circle me-1" />
                      {errors.images}
                    </div>
                  )}

                  {/* PREVIEWS */}

                  {previewUrls.length > 0 && (
                    <div className="row g-3 mt-2">
                      {previewUrls.map((preview, index) => (
                        <div className="col-4" key={`${preview.name}-${index}`}>
                          <div
                            className="position-relative overflow-hidden"
                            style={{
                              aspectRatio: "1 / 1",
                              borderRadius: 13,
                              background: "#f1f5f9",
                              border: "1px solid #e2e8f0",
                            }}
                          >
                            <img
                              src={preview.url}
                              alt={`Selected photo ${index + 1}`}
                              className="w-100 h-100"
                              style={{ objectFit: "cover" }}
                            />

                            <span
                              className="position-absolute top-0 start-0 m-2 d-flex align-items-center justify-content-center"
                              style={{
                                width: 26,
                                height: 26,
                                borderRadius: 8,
                                background: "rgba(17,48,35,.88)",
                                color: "#fff",
                                fontSize: ".75rem",
                                fontWeight: 700,
                              }}
                            >
                              {index + 1}
                            </span>

                            {!submitting && (
                              <button
                                type="button"
                                className="btn btn-danger btn-sm position-absolute top-0 end-0 m-2 d-flex align-items-center justify-content-center"
                                style={{
                                  width: 28,
                                  height: 28,
                                  padding: 0,
                                  borderRadius: 8,
                                }}
                                onClick={() => removeImage(index)}
                                aria-label={`Remove photo ${index + 1}`}
                              >
                                <i className="bi bi-x-lg" />
                              </button>
                            )}
                          </div>

                          <div
                            className="small text-secondary text-truncate mt-2"
                            title={preview.name}
                            style={{ fontSize: ".75rem" }}
                          >
                            {preview.name}
                          </div>
                          <div
                            className="small text-secondary"
                            style={{ fontSize: ".7rem" }}
                          >
                            {(preview.size / (1024 * 1024)).toFixed(2)} MB
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {images.length > 0 && !submitting && (
                    <button
                      type="button"
                      className="btn btn-sm mt-3"
                      style={{
                        border: "1px solid #f0d2cf",
                        color: "#b54740",
                        background: "#fff8f7",
                        borderRadius: 9,
                      }}
                      onClick={removeImages}
                    >
                      <i className="bi bi-trash3 me-2" />
                      Remove all photos
                    </button>
                  )}
                </section>

                <div
                  className="d-flex align-items-start gap-3 p-3"
                  style={{
                    borderRadius: 14,
                    background: "#f5f7fb",
                    border: "1px solid #e5eaf2",
                  }}
                >
                  <div
                    className="d-flex align-items-center justify-content-center flex-shrink-0"
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 12,
                      background: "#e6ebf7",
                      color: "#405b94",
                    }}
                  >
                    <i className="bi bi-patch-check fs-5" />
                  </div>
                  <div>
                    <div
                      className="fw-bold small mb-1"
                      style={{ color: "#263c62" }}
                    >
                      Quality matters
                    </div>
                    <p className="small text-secondary mb-0">
                      Your submission will be reviewed before becoming publicly
                      visible. Please provide accurate information and genuine
                      photos of the place.
                    </p>
                  </div>
                </div>
              </div>

              {/* FOOTER */}
              <footer
                className="px-4 px-md-5 py-3 flex-shrink-0"
                style={{
                  borderTop: "1px solid #e9efeb",
                  background: "#fff",
                  boxShadow: "0 -6px 24px rgba(23,59,46,.035)",
                }}
              >
                <div className="d-flex justify-content-between align-items-center gap-3">
                  <button
                    type="button"
                    className="btn d-inline-flex align-items-center justify-content-center gap-2"
                    style={{
                      minHeight: 46,
                      borderRadius: 12,
                      border: "1px solid #dce4df",
                      color: "#40574b",
                      background: "#fff",
                      fontWeight: 600,
                      paddingInline: 18,
                    }}
                    onClick={onBack}
                    disabled={submitting}
                  >
                    <i className="bi bi-arrow-left" />
                    Back
                  </button>

                  <button
                    type="submit"
                    className="btn d-inline-flex align-items-center justify-content-center gap-2"
                    style={{
                      minHeight: 46,
                      borderRadius: 12,
                      color: "#fff",
                      background: "#176b4d",
                      border: "1px solid #176b4d",
                      fontWeight: 650,
                      paddingInline: 22,
                    }}
                    disabled={
                      submitting ||
                      categoriesLoading ||
                      categories.length === 0 ||
                      cameraOpen
                    }
                  >
                    {submitting ? (
                      <>
                        <span
                          className="spinner-border spinner-border-sm"
                          role="status"
                          aria-hidden="true"
                        />
                        Submitting...
                      </>
                    ) : (
                      <>
                        Submit place
                        <i className="bi bi-arrow-right" />
                      </>
                    )}
                  </button>
                </div>

                <div className="text-center mt-2">
                  <span
                    className="text-secondary"
                    style={{ fontSize: ".7rem" }}
                  >
                    <i className="bi bi-lock-fill me-1" />
                    Your submission is subject to community review.
                  </span>
                </div>
              </footer>
            </form>
          </div>
        </div>
      </div>

      {/* LIVE CAMERA MODAL */}

      {cameraOpen && (
        <>
          <div
            className="modal-backdrop fade show"
            style={{
              zIndex: 2100,
              background: "rgba(5,15,10,.78)",
              backdropFilter: "blur(5px)",
            }}
          />

          <div
            className="modal d-block"
            role="dialog"
            aria-modal="true"
            aria-label="Take a photo"
            style={{
              zIndex: 2101,
              overflowY: "auto",
              background: "transparent",
            }}
          >
            <div className="modal-dialog modal-dialog-centered modal-lg px-2">
              <div
                className="modal-content border-0 overflow-hidden"
                style={{
                  borderRadius: 20,
                  background: "#fff",
                  boxShadow: "0 24px 80px rgba(0,0,0,.35)",
                }}
              >
                <div
                  className="d-flex align-items-center justify-content-between p-3"
                  style={{
                    background: "#f0f8f3",
                    borderBottom: "1px solid #e2eee6",
                  }}
                >
                  <div>
                    <h5 className="mb-1 fw-bold" style={{ color: "#173b2e" }}>
                      <i className="bi bi-camera-video me-2" />
                      Take a photo
                    </h5>
                    <div className="small text-secondary">
                      {images.length} of {REQUIRED_IMAGES} photos selected
                    </div>
                  </div>

                  <button
                    type="button"
                    className="btn btn-light"
                    onClick={stopCamera}
                    aria-label="Close camera"
                    style={{ borderRadius: 10 }}
                  >
                    <i className="bi bi-x-lg" />
                  </button>
                </div>

                <div className="p-3">
                  {cameraError ? (
                    <div className="alert alert-warning mb-3" role="alert">
                      <i className="bi bi-exclamation-triangle me-2" />
                      {cameraError}
                    </div>
                  ) : null}

                  <div
                    className="position-relative overflow-hidden"
                    style={{
                      background: "#101713",
                      borderRadius: 14,
                      minHeight: 220,
                    }}
                  >
                    <video
                      ref={videoRef}
                      autoPlay
                      muted
                      playsInline
                      aria-label="Live camera preview"
                      style={{
                        display: "block",
                        width: "100%",
                        maxHeight: "65vh",
                        minHeight: 220,
                        objectFit: "contain",
                      }}
                    />

                    {cameraStarting && (
                      <div
                        className="position-absolute top-50 start-50 translate-middle text-center text-white"
                        style={{ width: "100%" }}
                      >
                        <div
                          className="spinner-border mb-2"
                          role="status"
                          aria-label="Starting camera"
                        />
                        <div>Starting camera...</div>
                      </div>
                    )}

                    {!cameraStarting && cameraError && (
                      <div
                        className="position-absolute top-50 start-50 translate-middle text-center text-white px-3"
                        style={{ width: "100%" }}
                      >
                        <i className="bi bi-camera-video-off fs-1" />
                        <div className="mt-2">
                          Check your browser camera permission and try again.
                        </div>
                      </div>
                    )}
                  </div>

                  <canvas ref={canvasRef} className="d-none" />

                  <p className="small text-secondary mt-3 mb-0">
                    Position the place inside the frame, then capture the photo.
                    Captured photos are added to your form and can be removed
                    before submission.
                  </p>

                  <div className="d-flex gap-2 mt-3">
                    <button
                      type="button"
                      className="btn btn-outline-secondary flex-fill"
                      onClick={stopCamera}
                      style={{ minHeight: 46, borderRadius: 12 }}
                    >
                      Cancel
                    </button>

                    <button
                      type="button"
                      className="btn flex-fill"
                      onClick={capturePhoto}
                      disabled={
                        cameraStarting ||
                        !cameraReady ||
                        Boolean(cameraError) ||
                        images.length >= REQUIRED_IMAGES
                      }
                      style={{
                        minHeight: 46,
                        borderRadius: 12,
                        background: "#176b4d",
                        color: "#fff",
                        border: "1px solid #176b4d",
                      }}
                    >
                      <i className="bi bi-camera-fill me-2" />
                      Capture photo
                    </button>
                  </div>

                  {images.length >= REQUIRED_IMAGES && (
                    <div className="small text-danger mt-2">
                      You have reached the limit of 3 photos. Close the camera
                      and remove a photo if you want to replace one.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}

export default HiddenSpotForm;