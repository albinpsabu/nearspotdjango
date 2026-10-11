
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useMyReviews } from "../../hooks/useMyReviews";

const cardStyle = {
  borderRadius: "16px",
  border: "1px solid #edf1ef",
  boxShadow: "0 4px 18px rgba(20, 50, 45, 0.04)",
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
          style={{ color: "#20cfa7" }}
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
              className="rounded-circle d-flex align-items-center justify-content-center mx-auto mb-3"
              style={{
                width: "70px",
                height: "70px",
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

            <h5 className="fw-bold mb-2">
              Login Required
            </h5>

            <p
              className="mb-0"
              style={{
                color: "#819092",
                fontSize: "13px",
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
    <div
      className="w-100"
      style={{ color: "#1d2b2e" }}
    >
      {/* Page Heading */}
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
        <div>
          <h3
            className="fw-bold mb-2"
            style={{
              fontSize: "26px",
              letterSpacing: "-0.6px",
            }}
          >
            My Reviews
          </h3>

          <p
            className="mb-0"
            style={{
              color: "#819092",
              fontSize: "14px",
            }}
          >
            Your ratings and experiences shared with the NearSpot community.
          </p>
        </div>

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
            className="bi bi-chat-square-text"
            aria-hidden="true"
          />
          {reviews.length} {reviews.length === 1 ? "Review" : "Reviews"}
        </span>
      </div>

      {/* Error Message */}
      {error && (
        <div
          className="alert alert-danger rounded-3 d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4"
          role="alert"
        >
          <span>{error}</span>

          <button
            type="button"
            className="btn btn-sm btn-outline-danger"
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

      {/* Reviews Container */}
      <div
        className="card mb-4"
        style={cardStyle}
      >
        <div className="card-body p-3 p-md-4">
          <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
            <div>
              <h5
                className="fw-bold mb-2"
                style={{ fontSize: "17px" }}
              >
                Your Reviews
              </h5>

              <p
                className="mb-0"
                style={{
                  color: "#819092",
                  fontSize: "12px",
                }}
              >
                View your reviews, ratings, and shared media.
              </p>
            </div>

            <button
              type="button"
              className="btn d-flex align-items-center gap-2 fw-semibold px-3 py-2"
              onClick={fetchMyReviews}
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

          {/* Loading */}
          {loading && reviews.length === 0 ? (
            <div className="text-center py-5">
              <div
                className="spinner-border"
                style={{ color: "#20cfa7" }}
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
            /* Empty State */
            <div className="text-center py-5 px-2">
              <div
                className="rounded-circle d-flex align-items-center justify-content-center mx-auto mb-3"
                style={{
                  width: "76px",
                  height: "76px",
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

              <h6 className="fw-bold mb-2">
                No reviews yet
              </h6>

              <p
                className="mx-auto mb-0"
                style={{
                  color: "#819092",
                  fontSize: "13px",
                  maxWidth: "420px",
                  lineHeight: 1.7,
                }}
              >
                Your reviews will appear here after you write them on a
                spot detail page.
              </p>

              <Link
                to="/"
                className="btn text-white fw-semibold px-4 py-2 mt-4"
                style={{
                  backgroundColor: "#20cfa7",
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
            /* Reviews List */
            <div className="d-flex flex-column gap-3">
              {reviews.map((review) => (
                <article
                  key={review.id}
                  className="p-3 p-md-4"
                  style={{
                    border: "1px solid #e8eeee",
                    borderRadius: "12px",
                    backgroundColor: "#ffffff",
                  }}
                >
                  {/* Spot Details */}
                  <div className="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-3">
                    <div
                      className="flex-grow-1"
                      style={{ minWidth: 0 }}
                    >
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
                            fontSize: "11px",
                          }}
                        >
                          {review.spot_category}
                        </span>
                      )}
                    </div>

                    <small
                      className="d-flex align-items-center gap-2"
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

                  {/* Star Rating */}
                  <div className="d-flex align-items-center gap-3 mb-3">
                    <div
                      className="d-flex gap-1"
                      role="img"
                      aria-label={`Rating: ${review.rating} out of 5`}
                      style={{
                        fontSize: "21px",
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
                      className="fw-semibold"
                      style={{
                        color: "#526366",
                        fontSize: "12px",
                      }}
                    >
                      {review.rating}/5
                    </span>
                  </div>

                  {/* Review Comment */}
                  {review.comment && (
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
                  )}

                  {/* Review Media */}
                  {review.media?.length > 0 && (
                    <div className="d-flex flex-wrap gap-3 mt-4">
                      {review.media.map((media) => (
                        <a
                          key={media.id}
                          href={media.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="d-block rounded-3 overflow-hidden"
                          aria-label={`Open review ${
                            media.media_type?.toLowerCase() || "media"
                          }`}
                        >
                          {media.media_type === "IMAGE" ? (
                            <img
                              src={media.url}
                              alt={`Media for ${
                                review.spot_name || "review"
                              }`}
                              className="rounded-3"
                              style={{
                                width: "105px",
                                height: "105px",
                                objectFit: "cover",
                                border: "1px solid #e8eeee",
                              }}
                              loading="lazy"
                            />
                          ) : (
                            <video
                              src={media.url}
                              className="rounded-3"
                              style={{
                                width: "105px",
                                height: "105px",
                                objectFit: "cover",
                                border: "1px solid #e8eeee",
                              }}
                              muted
                              preload="metadata"
                              aria-label="Review video preview"
                            />
                          )}
                        </a>
                      ))}
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
