import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../services/api";

// ============================================================
// SPOT DETAILS PAGE
// ============================================================

function SpotDetails() {
  // ============================================================
  // URL PARAMETERS
  // ============================================================

  const { id } = useParams();
  const navigate = useNavigate();

  // ============================================================
  // STATE
  // ============================================================

  const [spot, setSpot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // ============================================================
  // FETCH SPOT DETAILS
  // ============================================================

  useEffect(() => {
    const fetchSpotDetails = async () => {
      setLoading(true);
      setError("");

      try {
        const response = await api.get(`/spots/${id}/`);
        setSpot(response.data);
      } catch (err) {
        console.error("Spot details error:", err);

        if (err.response?.status === 404) {
          setError("Spot not found.");
        } else {
          setError("Unable to load spot details.");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchSpotDetails();
  }, [id]);

  // ============================================================
  // FORMAT DISTANCE
  // ============================================================

  const formatDistance = (meters) => {
    if (meters === undefined || meters === null) {
      return null;
    }

    if (meters < 1000) {
      return `${Math.round(meters)} m away`;
    }

    return `${(meters / 1000).toFixed(1)} km away`;
  };

  // ============================================================
  // GET IMAGE MEDIA
  // ============================================================

  const getImageMedia = () => {
    if (!spot?.media || !Array.isArray(spot.media)) {
      return [];
    }

    return spot.media.filter(
      (media) => media.media_type === "IMAGE"
    );
  };

  // ============================================================
  // LOADING STATE
  // ============================================================

  if (loading) {
    return (
      <div
        className="min-vh-100 d-flex align-items-center justify-content-center"
        style={{
          background: "#f4f8f7",
        }}
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
        style={{
          background: "#f4f8f7",
        }}
      >
        <div
          className="bg-white text-center"
          style={{
            width: "100%",
            maxWidth: "430px",
            padding: "35px 28px",
            borderRadius: "24px",
            boxShadow: "0 15px 45px rgba(25, 45, 48, 0.10)",
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

          <div
            className="mt-4"
            style={{
              color: "#1d2c2f",
              fontSize: "21px",
              fontWeight: 800,
            }}
          >
            {error || "Spot not found."}
          </div>

          <div
            className="mt-2"
            style={{
              color: "#7a898b",
              fontSize: "13px",
              lineHeight: "1.6",
            }}
          >
            This spot may have been removed or is no longer
            available.
          </div>

          <button
            type="button"
            className="btn mt-4"
            onClick={() => navigate("/")}
            style={{
              background: "#10bfa0",
              color: "#ffffff",
              border: "none",
              borderRadius: "12px",
              padding: "11px 22px",
              fontWeight: 700,
            }}
          >
            Back to Explore
          </button>
        </div>
      </div>
    );
  }

  // ============================================================
  // SPOT DATA
  // ============================================================

  const imageMedia = getImageMedia();
  const mainImage = imageMedia[0]?.url || null;
  const distance = formatDistance(spot.distance_meters);

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
      ======================================================= */}

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
          {/* BACK */}

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
            <span style={{ fontSize: "16px" }}>←</span>
            <span className="d-none d-sm-inline">
              Back to Map
            </span>
          </button>

          {/* LOGO */}

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

          {/* TOP ACTIONS */}

          <div className="d-flex align-items-center gap-2">
            <button
              type="button"
              className="btn btn-light d-flex align-items-center justify-content-center"
              title="Save spot"
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "12px",
                border:
                  "1px solid rgba(30,50,55,0.08)",
                fontSize: "18px",
              }}
            >
              ♡
            </button>

            <button
              type="button"
              className="btn btn-light d-flex align-items-center justify-content-center"
              title="Share spot"
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "12px",
                border:
                  "1px solid rgba(30,50,55,0.08)",
                fontSize: "17px",
              }}
            >
              ↗
            </button>
          </div>
        </div>
      </div>

      {/* ======================================================
          MAIN CONTENT
      ======================================================= */}

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
            boxShadow:
              "0 20px 60px rgba(25,45,48,0.16)",
            background:
              "linear-gradient(135deg, #e9f8f4, #f5f8f8)",
          }}
        >
          {/* IMAGE */}

          {mainImage ? (
            <img
              src={mainImage}
              alt={spot.name}
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                objectFit: "cover",
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

          {/* DARK GRADIENT */}

          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(180deg, rgba(0,0,0,0.04) 25%, rgba(0,0,0,0.78) 100%)",
            }}
          />

          {/* IMAGE COUNT */}

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
              ▧ {imageMedia.length}{" "}
              {imageMedia.length === 1
                ? "photo"
                : "photos"}
            </div>
          )}

          {/* HERO CONTENT */}

          <div
            className="position-absolute"
            style={{
              left: "28px",
              right: "28px",
              bottom: "28px",
              color: "#ffffff",
            }}
          >
            {/* CATEGORY */}

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

            {/* NAME */}

            <h1
              style={{
                margin: 0,
                fontSize: "clamp(28px, 5vw, 46px)",
                fontWeight: 900,
                lineHeight: "1.05",
                letterSpacing: "-1px",
                textShadow:
                  "0 3px 20px rgba(0,0,0,0.25)",
              }}
            >
              {spot.name}
            </h1>

            {/* META */}

            <div
              className="d-flex flex-wrap align-items-center gap-3 mt-3"
              style={{
                fontSize: "13px",
                fontWeight: 700,
              }}
            >
              {distance && (
                <span
                  className="d-flex align-items-center gap-1"
                >
                  <span>📍</span>
                  {distance}
                </span>
              )}

              {spot.media &&
                spot.media.length > 0 && (
                  <span
                    className="d-flex align-items-center gap-1"
                  >
                    <span>▧</span>
                    {spot.media.length}{" "}
                    {spot.media.length === 1
                      ? "image"
                      : "images"}
                  </span>
                )}

              {spot.status && (
                <span
                  style={{
                    padding: "5px 9px",
                    borderRadius: "10px",
                    background:
                      "rgba(255,255,255,0.16)",
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
          style={{
            borderRadius: "20px",
            boxShadow:
              "0 10px 35px rgba(25,45,48,0.08)",
          }}
        >
          <div className="row g-2">
            <div className="col-12 col-md-6">
              <button
                type="button"
                className="btn w-100"
                onClick={() => navigate("/")}
                style={{
                  background: "#10bfa0",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "13px",
                  minHeight: "48px",
                  fontWeight: 800,
                  fontSize: "13px",
                }}
              >
                🗺 View on Map
              </button>
            </div>

            <div className="col-6 col-md-3">
              <button
                type="button"
                className="btn btn-light w-100"
                style={{
                  minHeight: "48px",
                  borderRadius: "13px",
                  border:
                    "1px solid rgba(30,50,55,0.08)",
                  color: "#344548",
                  fontWeight: 700,
                  fontSize: "13px",
                }}
              >
                ♡ Save
              </button>
            </div>

            <div className="col-6 col-md-3">
              <button
                type="button"
                className="btn btn-light w-100"
                style={{
                  minHeight: "48px",
                  borderRadius: "13px",
                  border:
                    "1px solid rgba(30,50,55,0.08)",
                  color: "#344548",
                  fontWeight: 700,
                  fontSize: "13px",
                }}
              >
                ↗ Share
              </button>
            </div>
          </div>
        </section>

        {/* ====================================================
            INFORMATION GRID
        ===================================================== */}

        <div className="row g-4 mt-1">
          {/* ==================================================
              ABOUT
          ================================================== */}

          <div className="col-12 col-lg-7">
            <section
              className="bg-white h-100 p-4"
              style={{
                borderRadius: "22px",
                boxShadow:
                  "0 10px 35px rgba(25,45,48,0.08)",
              }}
            >
              <div
                style={{
                  color: "#1d2c2f",
                  fontSize: "18px",
                  fontWeight: 900,
                }}
              >
                About this spot
              </div>

              {spot.description ? (
                <p
                  className="mt-3 mb-0"
                  style={{
                    color: "#687779",
                    fontSize: "14px",
                    lineHeight: "1.8",
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
                  No description available for this
                  spot.
                </p>
              )}
            </section>
          </div>

          {/* ==================================================
              QUICK INFORMATION
          ================================================== */}

          <div className="col-12 col-lg-5">
            <section
              className="bg-white p-4"
              style={{
                borderRadius: "22px",
                boxShadow:
                  "0 10px 35px rgba(25,45,48,0.08)",
              }}
            >
              <div
                style={{
                  color: "#1d2c2f",
                  fontSize: "18px",
                  fontWeight: 900,
                }}
              >
                Spot information
              </div>

              {/* CATEGORY */}

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
                  {spot.category_name ||
                    "Hidden Spot"}
                </span>
              </div>

              {/* DISTANCE */}

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

              {/* COORDINATES */}

              {spot.latitude !== undefined &&
                spot.latitude !== null &&
                spot.longitude !== undefined &&
                spot.longitude !== null && (
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
                      {Number(spot.latitude).toFixed(
                        6
                      )}
                      ,{" "}
                      {Number(spot.longitude).toFixed(
                        6
                      )}
                    </div>
                  </div>
                )}
            </section>
          </div>
        </div>

        {/* ====================================================
            PHOTOS
        ===================================================== */}

        {imageMedia.length > 0 && (
          <section
            className="bg-white mt-4 p-4"
            style={{
              borderRadius: "22px",
              boxShadow:
                "0 10px 35px rgba(25,45,48,0.08)",
            }}
          >
            <div className="d-flex align-items-center justify-content-between">
              <div>
                <div
                  style={{
                    color: "#1d2c2f",
                    fontSize: "18px",
                    fontWeight: 900,
                  }}
                >
                  Photos
                </div>

                <div
                  className="mt-1"
                  style={{
                    color: "#899698",
                    fontSize: "12px",
                  }}
                >
                  {imageMedia.length}{" "}
                  {imageMedia.length === 1
                    ? "photo"
                    : "photos"}{" "}
                  of this spot
                </div>
              </div>
            </div>

            {/* PHOTO GRID */}

            <div className="row g-3 mt-1">
              {imageMedia.map((media) => (
                <div
                  className="col-6 col-md-4 col-lg-3"
                  key={media.id}
                >
                  <div
                    style={{
                      width: "100%",
                      aspectRatio: "1 / 1",
                      borderRadius: "15px",
                      overflow: "hidden",
                      background: "#edf4f2",
                    }}
                  >
                    <img
                      src={media.url}
                      alt={spot.name}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        display: "block",
                      }}
                      onError={(event) => {
                        event.currentTarget.style.display =
                          "none";
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ====================================================
            BOTTOM NAVIGATION
        ===================================================== */}

        <div
          className="d-flex justify-content-center mt-4"
        >
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
    </div>
  );
}

export default SpotDetails;