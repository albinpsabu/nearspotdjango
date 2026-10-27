import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useMyReviews } from "../../hooks/useMyReviews";

const cardStyle = {
  borderRadius: "16px",
  border: "1px solid #e8efec",
  boxShadow: "0 4px 20px rgba(20, 50, 45, 0.04)",
  backgroundColor: "#ffffff",
};

const formatDate = (value) => {
  if (!value) return "Date unavailable";

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? "Date unavailable"
    : date.toLocaleDateString(undefined, {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
};

export default function MyReviews() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { reviews, loading, error, fetchMyReviews } = useMyReviews();

  // Authentication loading state.
  if (authLoading) {
    return (
      <div className="text-center py-5">
        <div
          className="spinner-border"
          style={{ color: "#087f68" }}
          role="status"
          aria-label="Loading account"
        />

        <p
          className="mt-3 mb-0"
          style={{ color: "#819092", fontSize: "13px" }}
        >
          Loading your account...
        </p>
      </div>
    );
  }

  // Unauthenticated users cannot view their reviews.
  if (!isAuthenticated) {
    return (
      <div className="py-5">
        <div
          className="card mx-auto text-center"
          style={{ ...cardStyle, maxWidth: "480px" }}
        >
          <div className="card-body p-4 p-md-5">
            <div
              className="rounded-circle d-flex align-items-center justify-content-center mx-auto mb-4"
              style={{
                width: "72px",
                height: "72px",
                backgroundColor: "#e6faf4",
                color: "#087f68",
              }}
            >
              <i
                className="bi bi-person-lock"
                style={{ fontSize: "28px" }}
                aria-hidden="true"
              />
            </div>

            <h5 className="fw-bold mb-2">Login Required</h5>

            <p
              className="mb-0"
              style={{
                color: "#819092",
                fontSize: "13px",
                lineHeight: 1.7,
              }}
            >
              Please log in to view your reviews.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-100" style={{ color: "#1d2b2e" }}>
      {/* Page heading */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
        <div>
          <div
            className="d-inline-flex align-items-center gap-2 rounded-pill px-3 py-2 mb-3"
            style={{
              backgroundColor: "#e6faf4",
              color: "#087f68",
              fontSize: "11px",
              fontWeight: 600,
            }}
          >
            <i className="bi bi-chat-square-text" aria-hidden="true" />
            YOUR FEEDBACK
          </div>

          <h2
            className="fw-bold mb-2"
            style={{
              fontSize: "clamp(24px, 3vw, 32px)",
              letterSpacing: "-0.8px",
            }}
          >
            My Reviews
          </h2>

          <p
            className="mb-0"
            style={{
              color: "#819092",
              fontSize: "14px",
              lineHeight: 1.7,
            }}
          >
            Your ratings and experiences shared with the NearSpot community.
          </p>
        </div>

        <span
          className="badge rounded-pill px-3 py-2 d-inline-flex align-items-center gap-2 align-self-start align-self-md-center"
          style={{
            backgroundColor: "#e6faf4",
            color: "#087f68",
            fontSize: "12px",
            fontWeight: 600,
          }}
        >
          <i className="bi bi-chat-square-text" aria-hidden="true" />
          {reviews.length} {reviews.length === 1 ? "Review" : "Reviews"}
        </span>
      </div>

      {/* Error message */}
      {error && (
        <div
          className="alert alert-danger rounded-3 d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-3 mb-4"
          role="alert"
        >
          <div className="d-flex align-items-start gap-2">
            <i
              className="bi bi-exclamation-circle mt-1"
              aria-hidden="true"
            />
            <span>{error}</span>
          </div>

          <button
            type="button"
            className="btn btn-sm btn-outline-danger align-self-start align-self-sm-center"
            onClick={fetchMyReviews}
            disabled={loading}
          >
            <i
              className="bi bi-arrow-clockwise me-2"
              aria-hidden="true"
            />
            {loading ? "Retrying..." : "Try Again"}
          </button>
        </div>
      )}

      {/* Reviews container */}
      <div className="card mb-4" style={cardStyle}>
        <div className="card-body p-3 p-md-4">
          <div className="d-flex flex-column flex-sm-row align-items-sm-center justify-content-between gap-3 mb-4">
            <div>
              <div className="d-flex align-items-center gap-2 mb-2">
                <div
                  className="d-flex align-items-center justify-content-center rounded-3"
                  style={{
                    width: "38px",
                    height: "38px",
                    backgroundColor: "#e6faf4",
                    color: "#087f68",
                  }}
                >
                  <i
                    className="bi bi-star-half"
                    aria-hidden="true"
                  />
                </div>

                <h5
                  className="fw-bold mb-0"
                  style={{ fontSize: "17px" }}
                >
                  Your Reviews
                </h5>
              </div>

              <p
                className="mb-0"
                style={{
                  color: "#819092",
                  fontSize: "12px",
                  lineHeight: 1.7,
                }}
              >
                View your reviews, ratings, and shared media.
              </p>
            </div>

            <button
              type="button"
              className="btn d-inline-flex align-items-center justify-content-center gap-2 fw-semibold px-3 py-2 align-self-start align-self-sm-center"
              onClick={fetchMyReviews}
              disabled={loading}
              style={{
                color: "#087f68",
                backgroundColor: "#ffffff",
                border: "1px solid #dce9e4",
                borderRadius: "10px",
                fontSize: "12px",
                minHeight: "40px",
              }}
            >
              <i
                className={`bi ${
                  loading ? "bi-arrow-repeat" : "bi-arrow-clockwise"
                }`}
                aria-hidden="true"
              />
              {loading ? "Refreshing..." : "Refresh"}
            </button>
          </div>

          {/* Loading state */}
          {loading && reviews.length === 0 ? (
            <div className="text-center py-5">
              <div
                className="spinner-border"
                style={{ color: "#087f68" }}
                role="status"
                aria-label="Loading reviews"
              />

              <p
                className="mt-3 mb-0"
                style={{
                  color: "#819092",
                  fontSize: "13px",
                }}
              >
                Loading reviews...
              </p>
            </div>
          ) : reviews.length === 0 && !error ? (
            /* Empty state */
            <div className="text-center py-5 px-2">
              <div
                className="rounded-circle d-flex align-items-center justify-content-center mx-auto mb-4"
                style={{
                  width: "78px",
                  height: "78px",
                  backgroundColor: "#e6faf4",
                  color: "#087f68",
                }}
              >
                <i
                  className="bi bi-chat-square-text"
                  aria-hidden="true"
                  style={{ fontSize: "30px" }}
                />
              </div>

              <h5 className="fw-bold mb-2">No reviews yet</h5>

              <p
                className="mx-auto mb-0"
                style={{
                  color: "#819092",
                  fontSize: "13px",
                  maxWidth: "420px",
                  lineHeight: 1.8,
                }}
              >
                Your reviews will appear here after you write them on a
                spot detail page.
              </p>

              <Link
                to="/"
                className="btn text-white fw-semibold px-4 py-2 mt-4"
                style={{
                  backgroundColor: "#087f68",
                  borderRadius: "10px",
                  fontSize: "13px",
                }}
              >
                <i
                  className="bi bi-compass me-2"
                  aria-hidden="true"
                />
                Explore Spots
              </Link>
            </div>
          ) : reviews.length > 0 ? (
            /* Reviews list */
            <div className="d-flex flex-column gap-3">
              {reviews.map((review) => (
                <article
                  key={review.id}
                  className="p-3 p-md-4"
                  style={{
                    border: "1px solid #e8efec",
                    borderRadius: "14px",
                    backgroundColor: "#ffffff",
                  }}
                >
                  {/* Spot details */}
                  <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start gap-3 mb-3">
                    <div
                      className="d-flex align-items-start gap-3 flex-grow-1"
                      style={{ minWidth: 0 }}
                    >
                      <div
                        className="d-flex align-items-center justify-content-center rounded-3 flex-shrink-0"
                        style={{
                          width: "42px",
                          height: "42px",
                          backgroundColor: "#f0f8f5",
                          color: "#087f68",
                        }}
                      >
                        <i
                          className="bi bi-geo-alt"
                          aria-hidden="true"
                          style={{ fontSize: "19px" }}
                        />
                      </div>

                      <div className="flex-grow-1" style={{ minWidth: 0 }}>
                        <h6
                          className="fw-bold mb-2 text-break"
                          style={{
                            color: "#26373a",
                            fontSize: "15px",
                          }}
                        >
                          {review.spot_name || "Unnamed spot"}
                        </h6>

                        {review.spot_category && (
                          <span
                            className="badge rounded-pill px-3 py-2"
                            style={{
                              backgroundColor: "#e6faf4",
                              color: "#087f68",
                              fontSize: "10px",
                              fontWeight: 600,
                            }}
                          >
                            {review.spot_category}
                          </span>
                        )}
                      </div>
                    </div>

                    <small
                      className="d-flex align-items-center gap-2 flex-shrink-0"
                      style={{
                        color: "#819092",
                        fontSize: "12px",
                      }}
                    >
                      <i
                        className="bi bi-calendar3"
                        aria-hidden="true"
                      />
                      {formatDate(review.created_at)}
                    </small>
                  </div>

                  {/* Star rating */}
                  <div
                    className="d-flex flex-wrap align-items-center gap-3 mb-3 p-3 rounded-3"
                    style={{ backgroundColor: "#fbfcfb" }}
                  >
                    <div
                      className="d-flex gap-1"
                      role="img"
                      aria-label={`Rating: ${review.rating} out of 5`}
                      style={{
                        fontSize: "22px",
                        lineHeight: 1,
                      }}
                    >
                      {[1, 2, 3, 4, 5].map((star) => (
                        <span
                          key={star}
                          aria-hidden="true"
                          style={{
                            color:
                              star <= Number(review.rating)
                                ? "#e9ad25"
                                : "#d9dfe0",
                          }}
                        >
                          {star <= Number(review.rating) ? "★" : "☆"}
                        </span>
                      ))}
                    </div>

                    <span
                      className="fw-bold"
                      style={{
                        color: "#526366",
                        fontSize: "13px",
                      }}
                    >
                      {review.rating}/5
                    </span>

                    <span
                      className="text-secondary"
                      style={{ fontSize: "11px" }}
                    >
                      Your rating
                    </span>
                  </div>

                  {/* Review comment */}
                  {review.comment && (
                    <div className="mb-0">
                      <div
                        className="d-flex align-items-center gap-2 mb-2"
                        style={{
                          color: "#526366",
                          fontSize: "12px",
                          fontWeight: 600,
                        }}
                      >
                        <i
                          className="bi bi-quote"
                          aria-hidden="true"
                        />
                        Your experience
                      </div>

                      <p
                        className="mb-0 text-break"
                        style={{
                          color: "#566568",
                          fontSize: "13px",
                          whiteSpace: "pre-wrap",
                          lineHeight: 1.8,
                        }}
                      >
                        {review.comment}
                      </p>
                    </div>
                  )}

                  {/* Review media */}
                  {review.media?.length > 0 && (
                    <div className="mt-4">
                      <div
                        className="d-flex align-items-center gap-2 mb-3"
                        style={{
                          color: "#526366",
                          fontSize: "12px",
                          fontWeight: 600,
                        }}
                      >
                        <i
                          className="bi bi-images"
                          aria-hidden="true"
                        />
                        Shared media
                      </div>

                      <div className="row g-2">
                        {review.media.map((media) => (
                          <div
                            className="col-auto"
                            key={media.id}
                          >
                            <a
                              href={media.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="d-block rounded-3 overflow-hidden"
                              aria-label={`Open review ${
                                media.media_type?.toLowerCase() || "media"
                              }`}
                              style={{
                                border: "1px solid #e8efec",
                                lineHeight: 0,
                              }}
                            >
                              {media.media_type === "IMAGE" ? (
                                <img
                                  src={media.url}
                                  alt={`Media for ${
                                    review.spot_name || "review"
                                  }`}
                                  className="img-fluid"
                                  style={{
                                    width: "110px",
                                    height: "110px",
                                    objectFit: "cover",
                                  }}
                                  loading="lazy"
                                />
                              ) : (
                                <video
                                  src={media.url}
                                  style={{
                                    width: "110px",
                                    height: "110px",
                                    objectFit: "cover",
                                  }}
                                  muted
                                  preload="metadata"
                                  aria-label="Review video preview"
                                />
                              )}
                            </a>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </article>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}