
import { useSavedSpots } from "../../hooks/useSavedSpots";

export function SavedSpotsList() {
  const {
    savedSpots,
    loading,
    error,
    unsaveSpot,
    fetchSavedSpots,
  } = useSavedSpots();

  const formatDate = (value) => {
    if (!value) return "Saved";

    const date = new Date(value);

    return Number.isNaN(date.getTime())
      ? "Saved"
      : date.toLocaleDateString(undefined, {
          day: "numeric",
          month: "short",
          year: "numeric",
        });
  };

  return (
    <div className="w-100">
      {/* List Header */}
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
        <span
          className="badge rounded-pill px-3 py-2 d-inline-flex align-items-center gap-2"
          style={{
            backgroundColor: "#e6faf4",
            color: "#087f68",
            fontSize: "12px",
            fontWeight: 600,
          }}
        >
          <i
            className="bi bi-bookmark-fill"
            aria-hidden="true"
          />
          {savedSpots.length} saved
        </span>

        <button
          type="button"
          className="btn d-flex align-items-center gap-2 fw-semibold px-3 py-2"
          onClick={fetchSavedSpots}
          disabled={loading}
          style={{
            color: "#087f68",
            backgroundColor: "#e6faf4",
            border: "1px solid #c9f2e6",
            borderRadius: "10px",
            fontSize: "12px",
          }}
        >
          <i
            className="bi bi-arrow-clockwise"
            aria-hidden="true"
          />
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div
          className="alert alert-danger rounded-3 d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4"
          role="alert"
        >
          <span>
            <i
              className="bi bi-exclamation-circle me-2"
              aria-hidden="true"
            />
            {error}
          </span>

          <button
            type="button"
            className="btn btn-sm btn-outline-danger"
            onClick={fetchSavedSpots}
            disabled={loading}
          >
            Try Again
          </button>
        </div>
      )}

      {/* Initial Loading */}
      {loading && savedSpots.length === 0 ? (
        <div className="text-center py-5">
          <div
            className="spinner-border"
            style={{ color: "#20cfa7" }}
            role="status"
          >
            <span className="visually-hidden">
              Loading saved spots...
            </span>
          </div>

          <p
            className="mt-3 mb-0"
            style={{
              color: "#819092",
              fontSize: "13px",
            }}
          >
            Loading saved spots...
          </p>
        </div>
      ) : savedSpots.length === 0 && !error ? (
        /* Empty State */
        <div className="text-center py-5 px-3">
          <div
            className="rounded-circle d-inline-flex align-items-center justify-content-center mb-3"
            style={{
              width: "76px",
              height: "76px",
              backgroundColor: "#e6faf4",
              color: "#087f68",
            }}
          >
            <i
              className="bi bi-bookmark"
              aria-hidden="true"
              style={{ fontSize: "30px" }}
            />
          </div>

          <h6
            className="fw-bold mb-2"
            style={{
              color: "#26373a",
              fontSize: "16px",
            }}
          >
            No saved spots yet
          </h6>

          <p
            className="mb-0 mx-auto"
            style={{
              color: "#819092",
              fontSize: "13px",
              maxWidth: "420px",
              lineHeight: 1.7,
            }}
          >
            Explore the map and save interesting places to find them here.
          </p>
        </div>
      ) : savedSpots.length > 0 ? (
        <>
          {/* Saved Spot Cards */}
          <div className="row g-3 g-xl-4">
            {savedSpots.map((saved) => {
              const spot = saved.spot;
              const media = spot?.media?.[0];

              const category =
                spot?.category_name ||
                spot?.spot_category ||
                "Uncategorized";

              return (
                <div
                  key={saved.id}
                  className="col-12 col-sm-6 col-xl-4 col-xxl-3"
                >
                  <div
                    className="card h-100 overflow-hidden"
                    style={{
                      borderRadius: "14px",
                      border: "1px solid #edf1ef",
                      backgroundColor: "#ffffff",
                      boxShadow:
                        "0 4px 18px rgba(20, 50, 45, 0.04)",
                      transition:
                        "transform 0.2s ease, box-shadow 0.2s ease",
                    }}
                    onMouseEnter={(event) => {
                      event.currentTarget.style.transform =
                        "translateY(-3px)";
                      event.currentTarget.style.boxShadow =
                        "0 8px 24px rgba(20, 50, 45, 0.10)";
                    }}
                    onMouseLeave={(event) => {
                      event.currentTarget.style.transform =
                        "translateY(0)";
                      event.currentTarget.style.boxShadow =
                        "0 4px 18px rgba(20, 50, 45, 0.04)";
                    }}
                  >
                    {/* Spot Image */}
                    <div
                      className="position-relative"
                      style={{
                        aspectRatio: "4 / 3",
                        backgroundColor: "#f5f8f7",
                      }}
                    >
                      {media?.url ? (
                        <img
                          src={media.url}
                          alt={spot?.name || "Saved spot"}
                          className="w-100 h-100"
                          style={{
                            objectFit: "cover",
                          }}
                          loading="lazy"
                        />
                      ) : (
                        <div
                          className="d-flex flex-column align-items-center justify-content-center h-100"
                          style={{ color: "#9aa8aa" }}
                        >
                          <i
                            className="bi bi-image mb-2"
                            aria-hidden="true"
                            style={{ fontSize: "32px" }}
                          />

                          <span style={{ fontSize: "12px" }}>
                            No image available
                          </span>
                        </div>
                      )}

                      {/* Category Badge */}
                      <span
                        className="position-absolute bottom-0 end-0 m-2 badge rounded-pill px-3 py-2"
                        style={{
                          backgroundColor:
                            "rgba(29, 43, 46, 0.85)",
                          color: "#ffffff",
                          fontSize: "11px",
                          fontWeight: 500,
                        }}
                      >
                        {category}
                      </span>
                    </div>

                    {/* Card Content */}
                    <div className="card-body p-3 p-md-4 d-flex flex-column">
                      <h6
                        className="fw-bold mb-2 text-truncate"
                        style={{
                          color: "#26373a",
                          fontSize: "15px",
                        }}
                        title={spot?.name}
                      >
                        {spot?.name || "Unnamed spot"}
                      </h6>

                      <p
                        className="mb-3 d-flex align-items-center gap-2"
                        style={{
                          color: "#819092",
                          fontSize: "12px",
                        }}
                      >
                        <i
                          className="bi bi-geo-alt"
                          aria-hidden="true"
                        />
                        <span className="text-truncate">
                          {category}
                        </span>
                      </p>

                      {/* Footer */}
                      <div
                        className="mt-auto pt-3 d-flex flex-wrap align-items-center justify-content-between gap-2"
                        style={{
                          borderTop: "1px solid #edf1ef",
                        }}
                      >
                        <span
                          className="d-flex align-items-center gap-2"
                          style={{
                            color: "#819092",
                            fontSize: "11px",
                          }}
                        >
                          <i
                            className="bi bi-bookmark-check"
                            aria-hidden="true"
                          />
                          {formatDate(saved.saved_at)}
                        </span>

                        <button
                          type="button"
                          className="btn btn-sm d-flex align-items-center gap-2"
                          onClick={() =>
                            unsaveSpot(spot?.id ?? saved.spot)
                          }
                          disabled={loading}
                          aria-label={`Remove ${
                            spot?.name || "spot"
                          } from saved spots`}
                          style={{
                            borderRadius: "9px",
                            border: "1px solid #f2c9cd",
                            backgroundColor: "#fff5f5",
                            color: "#bd4651",
                            fontSize: "12px",
                            fontWeight: 600,
                            padding: "7px 10px",
                          }}
                        >
                          <i
                            className="bi bi-bookmark-x"
                            aria-hidden="true"
                          />
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Background Refresh Indicator */}
          {loading && (
            <div
              className="text-center py-3 mt-3"
              style={{
                color: "#819092",
                fontSize: "12px",
              }}
            >
              <span
                className="spinner-border spinner-border-sm me-2"
                role="status"
                aria-hidden="true"
              />
              Updating saved spots...
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
