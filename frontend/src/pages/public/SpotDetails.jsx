
import { useEffect, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../services/api";
import { SpotReviews } from "../../components/spots/SpotReviews";

// ============================================================
// CONFIGURATION
// ============================================================

const API_BASE =
  import.meta.env.VITE_API_URL ||
  "http://127.0.0.1:8000/api";

const API_ORIGIN = new URL(API_BASE, window.location.origin).origin;

const cardStyle = {
  borderRadius: "22px",
  boxShadow: "0 10px 35px rgba(25,45,48,0.08)",
};

const primaryButtonStyle = {
  background: "#10bfa0",
  color: "#ffffff",
  border: "none",
  borderRadius: "13px",
  minHeight: "48px",
  fontWeight: 800,
  fontSize: "13px",
};

const secondaryButtonStyle = {
  minHeight: "48px",
  borderRadius: "13px",
  border: "1px solid rgba(30,50,55,0.08)",
  color: "#344548",
  fontWeight: 700,
  fontSize: "13px",
};

// ============================================================
// MEDIA HELPERS
// ============================================================

function getMediaUrl(media) {
  const rawUrl = media?.url || media?.file || media?.file_url;

  if (!rawUrl || typeof rawUrl !== "string") {
    return null;
  }

  try {
    return new URL(rawUrl, API_ORIGIN).href;
  } catch {
    return null;
  }
}

function getMediaType(media) {
  return String(media?.media_type || "").toUpperCase();
}

function formatDistance(meters) {
  if (meters === undefined || meters === null) {
    return null;
  }

  const value = Number(meters);

  if (!Number.isFinite(value)) {
    return null;
  }

  if (value < 1000) {
    return `${Math.round(value)} m away`;
  }

  return `${(value / 1000).toFixed(1)} km away`;
}

// ============================================================
// IMAGE VIEWER
// ============================================================

function ImageViewer({
  images,
  activeIndex,
  onClose,
  onChange,
  spotName,
}) {
  const previous = useCallback(() => {
    onChange((activeIndex - 1 + images.length) % images.length);
  }, [activeIndex, images.length, onChange]);

  const next = useCallback(() => {
    onChange((activeIndex + 1) % images.length);
  }, [activeIndex, images.length, onChange]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose();
      }

      if (event.key === "ArrowLeft" && images.length > 1) {
        previous();
      }

      if (event.key === "ArrowRight" && images.length > 1) {
        next();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose, previous, next, images.length]);

  const currentImage = images[activeIndex];

  if (!currentImage) {
    return null;
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Spot photo viewer"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 3000,
        background: "rgba(0,0,0,0.94)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "65px 55px",
      }}
    >
      <button
        type="button"
        className="btn btn-dark position-absolute"
        onClick={onClose}
        aria-label="Close photo viewer"
        style={{
          top: "20px",
          right: "20px",
          zIndex: 2,
          borderRadius: "12px",
        }}
      >
        <i className="bi bi-x-lg" />
      </button>

      <div
        className="position-absolute text-white"
        style={{
          top: "25px",
          left: "25px",
          fontSize: "13px",
          fontWeight: 700,
        }}
      >
        {activeIndex + 1} / {images.length}
      </div>

      {images.length > 1 && (
        <button
          type="button"
          className="btn btn-dark position-absolute"
          onClick={(event) => {
            event.stopPropagation();
            previous();
          }}
          aria-label="Previous photo"
          style={{
            left: "12px",
            top: "50%",
            transform: "translateY(-50%)",
            borderRadius: "12px",
          }}
        >
          <i className="bi bi-chevron-left" />
        </button>
      )}

      <img
        src={currentImage.url}
        alt={`${spotName} photo ${activeIndex + 1}`}
        onClick={(event) => event.stopPropagation()}
        style={{
          maxWidth: "100%",
          maxHeight: "85vh",
          objectFit: "contain",
          borderRadius: "10px",
        }}
      />

      {images.length > 1 && (
        <button
          type="button"
          className="btn btn-dark position-absolute"
          onClick={(event) => {
            event.stopPropagation();
            next();
          }}
          aria-label="Next photo"
          style={{
            right: "12px",
            top: "50%",
            transform: "translateY(-50%)",
            borderRadius: "12px",
          }}
        >
          <i className="bi bi-chevron-right" />
        </button>
      )}
    </div>
  );
}

// ============================================================
// SPOT DETAILS PAGE
// ============================================================

function SpotDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  // ============================================================
  // STATE
  // ============================================================

  const [spot, setSpot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const [viewerIndex, setViewerIndex] = useState(null);
  const [notification, setNotification] = useState("");

  // ============================================================
  // FETCH SPOT DETAILS
  // ============================================================

  useEffect(() => {
    let active = true;

    const fetchSpotDetails = async () => {
      setLoading(true);
      setError("");
      setSpot(null);
      setSaved(false);
      setViewerIndex(null);

      try {
        const response = await api.get(`/spots/${id}/`);

        if (active) {
          setSpot(response.data);
        }
      } catch (err) {
        console.error("Spot details error:", err);

        if (active) {
          if (err.response?.status === 404) {
            setError("Spot not found.");
          } else {
            setError("Unable to load spot details.");
          }
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    fetchSpotDetails();

    return () => {
      active = false;
    };
  }, [id]);

  // ============================================================
  // CHECK SAVED STATUS
  // ============================================================

  const checkSavedStatus = useCallback(async () => {
    try {
      const response = await api.get("/spots/saved/");
      const data = response.data;

      const savedSpots = Array.isArray(data)
        ? data
        : data?.results || [];

      const isSaved = savedSpots.some((item) => {
        const savedSpotId =
          item.spot?.id ??
          item.spot?.spot_id ??
          item.spot_id ??
          (typeof item.spot === "number" ? item.spot : null);

        return String(savedSpotId) === String(id);
      });

      setSaved(isSaved);
    } catch (err) {
      if (
        err.response?.status !== 401 &&
        err.response?.status !== 403
      ) {
        console.error("Saved status error:", err);
      }
    }
  }, [id]);

  useEffect(() => {
    checkSavedStatus();
  }, [checkSavedStatus]);

  // ============================================================
  // NOTIFICATIONS
  // ============================================================

  const showNotification = (message) => {
    setNotification(message);
  };

  // ============================================================
  // SAVE / UNSAVE
  // ============================================================

  const handleSave = async () => {
    if (saving) {
      return;
    }

    setSaving(true);

    try {
      if (saved) {
        await api.delete(`/spots/${id}/save/`);
        setSaved(false);
        showNotification("Spot removed from saved places.");
      } else {
        await api.post(`/spots/${id}/save/`);
        setSaved(true);
        showNotification("Spot saved successfully.");
      }
    } catch (err) {
      const status = err.response?.status;

      if (status === 401 || status === 403) {
        showNotification(
          "Please sign in with a user account to save spots."
        );
      } else if (
        status === 400 &&
        String(err.response?.data?.detail || "")
          .toLowerCase()
          .includes("already saved")
      ) {
        setSaved(true);
        showNotification("This spot is already saved.");
      } else {
        console.error("Save spot error:", err);
        showNotification("Unable to update saved spot.");
      }
    } finally {
      setSaving(false);
    }
  };

  // ============================================================
  // SHARE SPOT
  // ============================================================

  const handleShare = async () => {
    const url = window.location.href;

    try {
      if (navigator.share) {
        await navigator.share({
          title: spot?.name || "NearSpot",
          text: `Check out ${spot?.name || "this spot"} on NearSpot!`,
          url,
        });

        return;
      }

      await navigator.clipboard.writeText(url);
      showNotification("Spot link copied to clipboard.");
    } catch (err) {
      if (err.name !== "AbortError") {
        console.error("Share error:", err);
        showNotification("Unable to share this spot.");
      }
    }
  };

  // ============================================================
  // LOADING STATE
  // ============================================================

  if (loading) {
    return (
      <div
        className="min-vh-100 d-flex align-items-center justify-content-center"
        style={{ background: "#f4f8f7" }}
      >
        <div className="text-center">
          <div
            className="spinner-border"
            role="status"
            style={{
              width: "2rem",
              height: "2rem",
              color: "#10bfa0",
            }}
          />

          <div
            className="mt-3"
            style={{
              color: "#627274",
              fontSize: "13px",
              fontWeight: 600,
            }}
          >
            Loading spot...
          </div>
        </div>
      </div>
    );
  }

  // ============================================================
  // ERROR STATE
  // ============================================================

  if (error || !spot) {
    return (
      <div
        className="min-vh-100 d-flex align-items-center justify-content-center px-3"
        style={{ background: "#f4f8f7" }}
      >
        <div
          className="bg-white text-center"
          style={{
            width: "100%",
            maxWidth: "430px",
            padding: "35px 28px",
            borderRadius: "24px",
            boxShadow: "0 15px 45px rgba(25,45,48,0.10)",
          }}
        >
          <div
            className="d-flex align-items-center justify-content-center mx-auto"
            style={{
              width: "60px",
              height: "60px",
              borderRadius: "50%",
              background: "#eaf8f4",
              color: "#10bfa0",
              fontSize: "25px",
            }}
          >
            !
          </div>

          <h2
            className="mt-4"
            style={{
              color: "#1d2c2f",
              fontSize: "21px",
              fontWeight: 800,
            }}
          >
            {error || "Spot not found."}
          </h2>

          <p
            className="mt-2"
            style={{
              color: "#7a898b",
              fontSize: "13px",
              lineHeight: "1.6",
            }}
          >
            This spot may have been removed or is no longer available.
          </p>

          <button
            type="button"
            className="btn mt-4"
            onClick={() => navigate("/")}
            style={primaryButtonStyle}
          >
            Back to Explore
          </button>
        </div>
      </div>
    );
  }

  // ============================================================
  // PREPARE SPOT DATA
  // ============================================================

  const media = Array.isArray(spot.media) ? spot.media : [];

  const imageMedia = media
    .filter((item) => getMediaType(item) === "IMAGE")
    .map((item) => ({
      ...item,
      url: getMediaUrl(item),
    }))
    .filter((item) => item.url);

  const videoMedia = media
    .filter((item) => getMediaType(item) === "VIDEO")
    .map((item) => ({
      ...item,
      url: getMediaUrl(item),
    }))
    .filter((item) => item.url);

  const mainImage = imageMedia[0]?.url || null;
  const distance = formatDistance(spot.distance_meters);

  const coordinatesAvailable =
    spot.latitude !== undefined &&
    spot.latitude !== null &&
    spot.longitude !== undefined &&
    spot.longitude !== null &&
    Number.isFinite(Number(spot.latitude)) &&
    Number.isFinite(Number(spot.longitude));

  // ============================================================
  // MAIN UI
  // ============================================================

  return (
    <div
      className="min-vh-100"
      style={{
        background: "#f4f8f7",
        paddingBottom: "50px",
      }}
    >
      {/* ======================================================
          TOP BAR
      ====================================================== */}

      <div
        className="position-sticky top-0"
        style={{
          zIndex: 1000,
          background: "rgba(255,255,255,0.92)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid rgba(30,50,55,0.07)",
        }}
      >
        <div
          className="container d-flex align-items-center justify-content-between"
          style={{
            minHeight: "68px",
            maxWidth: "1100px",
          }}
        >
          <button
            type="button"
            className="btn btn-light d-flex align-items-center gap-2"
            onClick={() => navigate("/")}
            style={{
              border: "1px solid rgba(30,50,55,0.08)",
              borderRadius: "12px",
              color: "#263639",
              fontWeight: 700,
              fontSize: "13px",
              padding: "9px 13px",
            }}
          >
            <i className="bi bi-arrow-left" />
            <span className="d-none d-sm-inline">
              Back to Map
            </span>
          </button>

          <div
            style={{
              color: "#10bfa0",
              fontSize: "21px",
              fontWeight: 900,
              letterSpacing: "-0.5px",
            }}
          >
            NearSpot
          </div>

          <div className="d-flex align-items-center gap-2">
            <button
              type="button"
              className="btn btn-light"
              title={saved ? "Unsave spot" : "Save spot"}
              aria-label={saved ? "Unsave spot" : "Save spot"}
              onClick={handleSave}
              disabled={saving}
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "12px",
                border: "1px solid rgba(30,50,55,0.08)",
                color: saved ? "#10aa8e" : "#344548",
              }}
            >
              <i
                className={`bi ${
                  saved ? "bi-heart-fill" : "bi-heart"
                }`}
              />
            </button>

            <button
              type="button"
              className="btn btn-light"
              title="Share spot"
              aria-label="Share spot"
              onClick={handleShare}
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "12px",
                border: "1px solid rgba(30,50,55,0.08)",
              }}
            >
              <i className="bi bi-share" />
            </button>
          </div>
        </div>
      </div>

      {/* ======================================================
          MAIN CONTENT
      ====================================================== */}

      <main
        className="container"
        style={{
          maxWidth: "1050px",
          paddingTop: "25px",
        }}
      >
        {/* ====================================================
            HERO SECTION
        ===================================================== */}

        <section
          style={{
            position: "relative",
            width: "100%",
            minHeight: "500px",
            borderRadius: "28px",
            overflow: "hidden",
            boxShadow: "0 20px 60px rgba(25,45,48,0.16)",
            background:
              "linear-gradient(135deg, #e9f8f4, #f5f8f8)",
          }}
        >
          {mainImage ? (
            <img
              src={mainImage}
              alt={spot.name}
              onClick={() => setViewerIndex(0)}
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                objectFit: "cover",
                cursor: "pointer",
              }}
              onError={(event) => {
                event.currentTarget.style.display = "none";
              }}
            />
          ) : (
            <div
              className="d-flex align-items-center justify-content-center"
              style={{
                position: "absolute",
                inset: 0,
                color: "#879597",
                fontSize: "14px",
                fontWeight: 700,
              }}
            >
              No image available
            </div>
          )}

          {/* Dark gradient */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              pointerEvents: "none",
              background:
                "linear-gradient(180deg, rgba(0,0,0,0.04) 25%, rgba(0,0,0,0.78) 100%)",
            }}
          />

          {/* Image count */}
          {imageMedia.length > 0 && (
            <div
              className="position-absolute"
              style={{
                top: "18px",
                right: "18px",
                padding: "8px 12px",
                borderRadius: "12px",
                background: "rgba(20,30,32,0.55)",
                backdropFilter: "blur(8px)",
                color: "#ffffff",
                fontSize: "12px",
                fontWeight: 700,
              }}
            >
              <i className="bi bi-images me-2" />
              {imageMedia.length}{" "}
              {imageMedia.length === 1 ? "photo" : "photos"}
            </div>
          )}

          {/* Hero content */}
          <div
            className="position-absolute"
            style={{
              left: "28px",
              right: "28px",
              bottom: "28px",
              color: "#ffffff",
              pointerEvents: "none",
            }}
          >
            <div
              className="d-inline-flex align-items-center"
              style={{
                padding: "7px 11px",
                borderRadius: "20px",
                background: "rgba(16,191,160,0.90)",
                fontSize: "11px",
                fontWeight: 800,
                letterSpacing: "0.3px",
                marginBottom: "12px",
              }}
            >
              {spot.category_name || "Hidden Spot"}
            </div>

            <h1
              style={{
                margin: 0,
                fontSize: "clamp(28px, 5vw, 46px)",
                fontWeight: 900,
                lineHeight: "1.05",
                letterSpacing: "-1px",
                textShadow: "0 3px 20px rgba(0,0,0,0.25)",
              }}
            >
              {spot.name}
            </h1>

            <div
              className="d-flex flex-wrap align-items-center gap-3 mt-3"
              style={{
                fontSize: "13px",
                fontWeight: 700,
              }}
            >
              {distance && (
                <span>
                  <i className="bi bi-geo-alt-fill me-1" />
                  {distance}
                </span>
              )}

              {imageMedia.length > 0 && (
                <span>
                  <i className="bi bi-images me-1" />
                  {imageMedia.length}{" "}
                  {imageMedia.length === 1 ? "image" : "images"}
                </span>
              )}

              {videoMedia.length > 0 && (
                <span>
                  <i className="bi bi-camera-video me-1" />
                  {videoMedia.length}{" "}
                  {videoMedia.length === 1 ? "video" : "videos"}
                </span>
              )}

              {spot.status && (
                <span
                  style={{
                    padding: "5px 9px",
                    borderRadius: "10px",
                    background: "rgba(255,255,255,0.16)",
                  }}
                >
                  {spot.status}
                </span>
              )}
            </div>
          </div>
        </section>

        {/* ====================================================
            ACTION BAR
        ===================================================== */}

        <section
          className="bg-white mt-4 p-3"
          style={cardStyle}
        >
          <div className="row g-2">
            <div className="col-12 col-md-6">
              <button
                type="button"
                className="btn w-100"
                onClick={() => navigate("/")}
                style={primaryButtonStyle}
              >
                <i className="bi bi-map me-2" />
                View on Map
              </button>
            </div>

            <div className="col-6 col-md-3">
              <button
                type="button"
                className="btn btn-light w-100"
                onClick={handleSave}
                disabled={saving}
                style={secondaryButtonStyle}
              >
                <i
                  className={`bi ${
                    saved ? "bi-heart-fill" : "bi-heart"
                  } me-2`}
                />
                {saving
                  ? "Please wait..."
                  : saved
                  ? "Saved"
                  : "Save"}
              </button>
            </div>

            <div className="col-6 col-md-3">
              <button
                type="button"
                className="btn btn-light w-100"
                onClick={handleShare}
                style={secondaryButtonStyle}
              >
                <i className="bi bi-share me-2" />
                Share
              </button>
            </div>
          </div>
        </section>

        {/* ====================================================
            INFORMATION GRID
        ===================================================== */}

        <div className="row g-4 mt-1">
          {/* ABOUT */}
          <div className="col-12 col-lg-7">
            <section
              className="bg-white h-100 p-4"
              style={cardStyle}
            >
              <h2
                style={{
                  color: "#1d2c2f",
                  fontSize: "18px",
                  fontWeight: 900,
                }}
              >
                About this spot
              </h2>

              {spot.description ? (
                <p
                  className="mt-3 mb-0"
                  style={{
                    color: "#687779",
                    fontSize: "14px",
                    lineHeight: "1.8",
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {spot.description}
                </p>
              ) : (
                <p
                  className="mt-3 mb-0"
                  style={{
                    color: "#9aa6a8",
                    fontSize: "13px",
                  }}
                >
                  No description available for this spot.
                </p>
              )}
            </section>
          </div>

          {/* QUICK INFORMATION */}
          <div className="col-12 col-lg-5">
            <section
              className="bg-white p-4"
              style={cardStyle}
            >
              <h2
                style={{
                  color: "#1d2c2f",
                  fontSize: "18px",
                  fontWeight: 900,
                }}
              >
                Spot information
              </h2>

              <div
                className="d-flex justify-content-between align-items-center mt-4 pb-3"
                style={{
                  borderBottom:
                    "1px solid rgba(30,50,55,0.07)",
                }}
              >
                <span
                  style={{
                    color: "#879496",
                    fontSize: "12px",
                    fontWeight: 600,
                  }}
                >
                  Category
                </span>

                <span
                  style={{
                    color: "#10aa8e",
                    fontSize: "13px",
                    fontWeight: 800,
                  }}
                >
                  {spot.category_name || "Hidden Spot"}
                </span>
              </div>

              {distance && (
                <div
                  className="d-flex justify-content-between align-items-center py-3"
                  style={{
                    borderBottom:
                      "1px solid rgba(30,50,55,0.07)",
                  }}
                >
                  <span
                    style={{
                      color: "#879496",
                      fontSize: "12px",
                      fontWeight: 600,
                    }}
                  >
                    Distance
                  </span>

                  <span
                    style={{
                      color: "#344548",
                      fontSize: "13px",
                      fontWeight: 800,
                    }}
                  >
                    {distance}
                  </span>
                </div>
              )}

              {coordinatesAvailable && (
                <div className="pt-3">
                  <div
                    style={{
                      color: "#879496",
                      fontSize: "12px",
                      fontWeight: 600,
                      marginBottom: "7px",
                    }}
                  >
                    Coordinates
                  </div>

                  <div
                    style={{
                      color: "#344548",
                      fontSize: "13px",
                      fontWeight: 700,
                      wordBreak: "break-word",
                    }}
                  >
                    {Number(spot.latitude).toFixed(6)},{" "}
                    {Number(spot.longitude).toFixed(6)}
                  </div>
                </div>
              )}
            </section>
          </div>
        </div>

        {/* ====================================================
            PHOTO GALLERY
        ===================================================== */}

        {imageMedia.length > 0 && (
          <section
            className="bg-white mt-4 p-4"
            style={cardStyle}
          >
            <div>
              <h2
                style={{
                  color: "#1d2c2f",
                  fontSize: "18px",
                  fontWeight: 900,
                }}
              >
                Photos
              </h2>

              <p
                className="mt-1 mb-0"
                style={{
                  color: "#899698",
                  fontSize: "12px",
                }}
              >
                {imageMedia.length}{" "}
                {imageMedia.length === 1 ? "photo" : "photos"}{" "}
                of this spot. Click to enlarge.
              </p>
            </div>

            <div className="row g-3 mt-1">
              {imageMedia.map((media, index) => (
                <div
                  className="col-6 col-md-4 col-lg-3"
                  key={media.id ?? index}
                >
                  <button
                    type="button"
                    onClick={() => setViewerIndex(index)}
                    aria-label={`View photo ${index + 1}`}
                    style={{
                      width: "100%",
                      aspectRatio: "1 / 1",
                      borderRadius: "15px",
                      overflow: "hidden",
                      background: "#edf4f2",
                      border: "none",
                      padding: 0,
                      cursor: "pointer",
                    }}
                  >
                    <img
                      src={media.url}
                      alt={`${spot.name} photo ${index + 1}`}
                      loading="lazy"
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        display: "block",
                      }}
                      onError={(event) => {
                        event.currentTarget.style.display = "none";
                      }}
                    />
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ====================================================
            VIDEO GALLERY
        ===================================================== */}

        {videoMedia.length > 0 && (
          <section
            className="bg-white mt-4 p-4"
            style={cardStyle}
          >
            <h2
              style={{
                color: "#1d2c2f",
                fontSize: "18px",
                fontWeight: 900,
              }}
            >
              Videos
            </h2>

            <p
              style={{
                color: "#899698",
                fontSize: "12px",
              }}
            >
              {videoMedia.length}{" "}
              {videoMedia.length === 1 ? "video" : "videos"}{" "}
              of this spot.
            </p>

            <div className="row g-3">
              {videoMedia.map((media, index) => (
                <div
                  className="col-12 col-md-6"
                  key={media.id ?? index}
                >
                  <video
                    src={media.url}
                    controls
                    preload="metadata"
                    playsInline
                    style={{
                      width: "100%",
                      maxHeight: "350px",
                      borderRadius: "15px",
                      background: "#10191a",
                    }}
                  >
                    Your browser does not support video playback.
                  </video>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ====================================================
            REVIEWS AND RATINGS - NEW SECTION
        ===================================================== */}

        <section
          className="bg-white mt-4 p-4"
          style={cardStyle}
        >
          <SpotReviews spotId={spot.id} />
        </section>

        {/* ====================================================
            BOTTOM NAVIGATION
        ===================================================== */}

        <div className="d-flex justify-content-center mt-4">
          <button
            type="button"
            className="btn btn-link text-decoration-none"
            onClick={() => navigate("/")}
            style={{
              color: "#10aa8e",
              fontSize: "13px",
              fontWeight: 800,
            }}
          >
            ← Continue exploring NearSpot
          </button>
        </div>
      </main>

      {/* ======================================================
          IMAGE VIEWER
      ====================================================== */}

      {viewerIndex !== null && imageMedia.length > 0 && (
        <ImageViewer
          images={imageMedia}
          activeIndex={viewerIndex}
          onChange={setViewerIndex}
          onClose={() => setViewerIndex(null)}
          spotName={spot.name}
        />
      )}

      {/* ======================================================
          NOTIFICATION
      ====================================================== */}

      {notification && (
        <div
          role="status"
          className="position-fixed bottom-0 start-50 translate-middle-x mb-4"
          style={{
            zIndex: 4000,
            background: "#263639",
            color: "#ffffff",
            borderRadius: "13px",
            padding: "13px 20px",
            boxShadow: "0 10px 35px rgba(0,0,0,0.18)",
            fontSize: "13px",
            fontWeight: 700,
            maxWidth: "90vw",
            textAlign: "center",
          }}
        >
          <span className="me-3">{notification}</span>

          <button
            type="button"
            className="btn btn-sm text-white"
            onClick={() => setNotification("")}
            aria-label="Dismiss notification"
          >
            <i className="bi bi-x-lg" />
          </button>
        </div>
      )}
    </div>
  );
}

export default SpotDetails;
