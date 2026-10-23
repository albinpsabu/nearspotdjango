
import { useEffect, useState } from "react";

import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";

// ============================================================
// CONFIGURATION
// ============================================================

const EXTERNAL_API = "/spots/external/";

// ============================================================
// HELPERS
// ============================================================

function getPlacePath(place) {
  return (
    `${EXTERNAL_API}` +
    `${encodeURIComponent(place.osm_type)}/` +
    `${encodeURIComponent(place.osm_id)}/`
  );
}

function formatCategory(category) {
  if (!category) return "Place";

  return String(category)
    .split(":")
    .pop()
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) =>
      character.toUpperCase()
    );
}

function getApiError(error, fallback) {
  const data = error?.response?.data;

  if (typeof data?.error === "string") {
    return data.error;
  }

  if (typeof data?.detail === "string") {
    return data.detail;
  }

  if (data && typeof data === "object") {
    const firstError = Object.values(data)[0];

    if (Array.isArray(firstError)) {
      return firstError.join(" ");
    }

    if (typeof firstError === "string") {
      return firstError;
    }
  }

  return fallback;
}

function getReviewUserId(review) {
  const value =
    review.user_id ??
    review.user?.id ??
    (typeof review.user === "number"
      ? review.user
      : null);

  return value == null ? null : String(value);
}

function getReviewAuthor(review) {
  return String(
    review.user_name ||
      review.username ||
      review.user?.name ||
      review.user?.username ||
      review.user?.email ||
      "NearSpot user"
  );
}

function formatDate(value) {
  if (!value) return "";

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleDateString();
}

// ============================================================
// DISPLAY RATING STARS
// ============================================================

function RatingStars({ rating = 0 }) {
  const normalizedRating = Math.max(
    0,
    Math.min(5, Math.round(Number(rating) || 0))
  );

  return (
    <span
      className="text-warning"
      aria-label={`${normalizedRating} out of 5 stars`}
    >
      {"★".repeat(normalizedRating)}
      {"☆".repeat(5 - normalizedRating)}
    </span>
  );
}

// ============================================================
// STAR RATING INPUT
// ============================================================

function StarRatingInput({
  value,
  onChange,
  disabled = false,
}) {
  return (
    <div
      className="d-flex align-items-center gap-1"
      role="group"
      aria-label="Choose your rating"
    >
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          className={
            "btn btn-sm border-0 px-1 fs-4 " +
            (star <= value
              ? "text-warning"
              : "text-secondary")
          }
          onClick={() => onChange(star)}
          disabled={disabled}
          aria-label={`${star} out of 5 stars`}
          aria-pressed={star === value}
        >
          {star <= value ? "★" : "☆"}
        </button>
      ))}

      <span className="small text-secondary ms-2">
        {value}/5
      </span>
    </div>
  );
}

// ============================================================
// SELECTED EXTERNAL PLACE CARD
// ============================================================

function SelectedExternalPlaceCard({
  place,
  onClose,
  onGetDirections,
  routeLoading = false,
}) {
  const { user, isAuthenticated } = useAuth();

  // ==========================================================
  // PLACE DETAILS STATE
  // ==========================================================

  const [details, setDetails] = useState(null);

  const [loadingDetails, setLoadingDetails] =
    useState(true);

  const [detailsError, setDetailsError] = useState("");

  // ==========================================================
  // SAVE STATE
  // ==========================================================

  const [isSaved, setIsSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  // ==========================================================
  // REVIEW STATE
  // ==========================================================

  const [showReviews, setShowReviews] = useState(false);

  const [showReviewForm, setShowReviewForm] =
    useState(false);

  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");

  const [editingReview, setEditingReview] =
    useState(false);

  const [submittingReview, setSubmittingReview] =
    useState(false);

  // ==========================================================
  // MESSAGES
  // ==========================================================

  const [actionError, setActionError] = useState("");

  const [actionMessage, setActionMessage] =
    useState("");

  // ==========================================================
  // DERIVED VALUES
  // ==========================================================

  const placePath = getPlacePath(place);

  const latitude = Number(place.latitude);
  const longitude = Number(place.longitude);

  const reviews = Array.isArray(details?.reviews)
    ? details.reviews
    : [];

  const userId =
    user?.id == null ? null : String(user.id);

  const myReview =
    userId === null
      ? null
      : reviews.find(
          (review) =>
            getReviewUserId(review) === userId
        ) || null;

  const averageRating = details?.average_rating;

  const reviewCount =
    details?.review_count ?? reviews.length;

  const placeName =
    details?.name || place.name || "Unnamed place";

  const placeCategory = formatCategory(
    details?.category || place.category
  );

  const placeAddress =
    details?.address || place.address;

  // ==========================================================
  // LOAD PLACE DETAILS
  // ==========================================================

  useEffect(() => {
    let active = true;

    const controller = new AbortController();

    async function loadDetails() {
      setDetails(null);
      setIsSaved(false);
      setLoadingDetails(true);
      setDetailsError("");

      setActionError("");
      setActionMessage("");

      setShowReviews(false);
      setShowReviewForm(false);

      setEditingReview(false);
      setRating(5);
      setComment("");

      try {
        const response = await api.get(placePath, {
          signal: controller.signal,
        });

        if (!active) return;

        setDetails(response.data);

        setIsSaved(
          Boolean(response.data.is_saved)
        );
      } catch (error) {
        if (!active || controller.signal.aborted) {
          return;
        }

        if (error.response?.status !== 404) {
          setDetailsError(
            getApiError(
              error,
              "Could not load place details."
            )
          );
        }
      } finally {
        if (active) {
          setLoadingDetails(false);
        }
      }
    }

    loadDetails();

    return () => {
      active = false;
      controller.abort();
    };
  }, [placePath, isAuthenticated]);

  // ==========================================================
  // CLOSE ON ESCAPE
  // ==========================================================

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, [onClose]);

  // ==========================================================
  // REFRESH DETAILS
  // ==========================================================

  async function refreshDetails() {
    const response = await api.get(placePath);

    setDetails(response.data);

    setIsSaved(
      Boolean(response.data.is_saved)
    );

    return response.data;
  }

  // ==========================================================
  // SAVE / UNSAVE
  // ==========================================================

  async function handleSaveToggle() {
    if (!isAuthenticated || saving) return;

    setSaving(true);
    setActionError("");
    setActionMessage("");

    try {
      if (isSaved) {
        await api.delete(`${placePath}save/`);

        setIsSaved(false);

        setActionMessage(
          "Place removed from saved places."
        );
      } else {
        await api.post(`${placePath}save/`);

        setIsSaved(true);

        setActionMessage(
          "Place saved successfully."
        );
      }

      await refreshDetails();
    } catch (error) {
      setActionError(
        getApiError(
          error,
          "Could not update your saved places."
        )
      );
    } finally {
      setSaving(false);
    }
  }

  // ==========================================================
  // OPEN REVIEW FORM
  // ==========================================================

  function handleOpenReviewForm() {
    if (!isAuthenticated) return;

    setActionError("");
    setActionMessage("");

    if (myReview) {
      setRating(Number(myReview.rating) || 5);
      setComment(myReview.comment || "");
      setEditingReview(true);
    } else {
      setRating(5);
      setComment("");
      setEditingReview(false);
    }

    setShowReviews(true);
    setShowReviewForm(true);
  }

  // ==========================================================
  // CLOSE REVIEW FORM
  // ==========================================================

  function handleCloseReviewForm() {
    setShowReviewForm(false);
    setEditingReview(false);

    setRating(5);
    setComment("");
  }

  // ==========================================================
  // SUBMIT / UPDATE REVIEW
  // ==========================================================

  async function handleReviewSubmit(event) {
    event.preventDefault();

    if (!isAuthenticated || submittingReview) {
      return;
    }

    setSubmittingReview(true);
    setActionError("");
    setActionMessage("");

    const payload = {
      rating: Number(rating),
      comment: comment.trim(),
    };

    try {
      if (editingReview && myReview) {
        await api.patch(
          `${placePath}review/`,
          payload
        );

        setActionMessage(
          "Review updated successfully."
        );
      } else {
        await api.post(
          `${placePath}review/`,
          payload
        );

        setActionMessage(
          "Review submitted successfully."
        );
      }

      await refreshDetails();

      setShowReviewForm(false);
      setShowReviews(true);

      setEditingReview(false);
      setRating(5);
      setComment("");
    } catch (error) {
      setActionError(
        getApiError(
          error,
          "Could not submit your review."
        )
      );
    } finally {
      setSubmittingReview(false);
    }
  }

  // ==========================================================
  // DELETE REVIEW
  // ==========================================================

  async function handleDeleteReview() {
    if (!myReview || submittingReview) return;

    const confirmed = window.confirm(
      "Are you sure you want to delete your review?"
    );

    if (!confirmed) return;

    setSubmittingReview(true);
    setActionError("");
    setActionMessage("");

    try {
      await api.delete(`${placePath}review/`);

      await refreshDetails();

      setEditingReview(false);
      setShowReviewForm(false);

      setRating(5);
      setComment("");

      setActionMessage(
        "Review deleted successfully."
      );
    } catch (error) {
      setActionError(
        getApiError(
          error,
          "Could not delete your review."
        )
      );
    } finally {
      setSubmittingReview(false);
    }
  }

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <aside
      className="
        position-absolute
        top-0
        end-0
        mt-2
        me-3
        bg-white
        rounded-4
        shadow-lg
        border
      "
      style={{
        zIndex: 2000,
        width: "min(360px, calc(100% - 24px))",
        maxHeight: "calc(100% - 64px)",
        overflowY: "auto",
        overscrollBehavior: "contain",
      }}
      aria-label="Selected place details"
      onClick={(event) =>
        event.stopPropagation()
      }
      onDoubleClick={(event) =>
        event.stopPropagation()
      }
      onWheel={(event) =>
        event.stopPropagation()
      }
    >
      {/* ======================================================
          CARD HEADER
      ====================================================== */}

      <div className="px-3 pt-3 pb-2">
        <div className="d-flex align-items-center justify-content-between gap-2 mb-2">
          <span className="badge bg-success-subtle text-success rounded-pill px-3 py-2">
            NearSpot Place
          </span>

          <button
            type="button"
            className="btn btn-light btn-sm rounded-circle border flex-shrink-0"
            onClick={onClose}
            aria-label="Close place details"
            title="Close"
          >
            ✕
          </button>
        </div>

        <span className="badge text-bg-light border text-success mb-2">
          {placeCategory}
        </span>

        <h2 className="fs-5 fw-bold text-dark mb-1 text-break">
          {placeName}
        </h2>

        {/* RATING */}

        {loadingDetails ? (
          <div className="small text-secondary">
            Loading ratings...
          </div>
        ) : averageRating != null ? (
          <div className="d-flex align-items-center gap-2 small">
            <strong>
              {Number(averageRating).toFixed(1)}
            </strong>

            <RatingStars rating={averageRating} />

            <span className="text-secondary">
              ({reviewCount})
            </span>
          </div>
        ) : (
          <div className="small text-secondary">
            ☆ No NearSpot ratings yet
          </div>
        )}

        {/* ADDRESS */}

        {placeAddress && (
          <p className="small text-secondary mt-2 mb-0 text-break">
            📍 {placeAddress}
          </p>
        )}
      </div>

      {/* ======================================================
          ACTION BUTTONS
      ====================================================== */}

      <div className="px-3 py-3">
        <div className="row g-2">
          <div
            className={
              isAuthenticated ? "col-6" : "col-12"
            }
          >
            <button
              type="button"
              className="btn btn-success btn-sm w-100 rounded-3 py-2 fw-semibold"
              onClick={() =>
                onGetDirections({
                  latitude,
                  longitude,
                })
              }
              disabled={routeLoading}
            >
              {routeLoading
                ? "Calculating..."
                : "↗ Directions"}
            </button>
          </div>

          {isAuthenticated && (
            <div className="col-6">
              <button
                type="button"
                className={
                  "btn btn-sm w-100 rounded-3 py-2 fw-semibold " +
                  (isSaved
                    ? "btn-success"
                    : "btn-outline-success")
                }
                onClick={handleSaveToggle}
                disabled={saving || loadingDetails}
              >
                {saving
                  ? "Saving..."
                  : isSaved
                  ? "♥ Saved"
                  : "♡ Save"}
              </button>
            </div>
          )}
        </div>

        {/* MESSAGES */}

        {detailsError && (
          <div
            className="alert alert-danger small py-2 mt-3 mb-0"
            role="alert"
          >
            {detailsError}
          </div>
        )}

        {actionError && (
          <div
            className="alert alert-danger small py-2 mt-3 mb-0"
            role="alert"
          >
            {actionError}
          </div>
        )}

        {actionMessage && (
          <div
            className="alert alert-success small py-2 mt-3 mb-0"
            role="status"
          >
            {actionMessage}
          </div>
        )}
      </div>

      {/* ======================================================
          REVIEWS SECTION
      ====================================================== */}

      <div className="border-top px-3 py-3">
        <div className="d-flex align-items-center justify-content-between gap-2">
          <div>
            <h3 className="fs-6 fw-bold mb-1">
              Community reviews
            </h3>

            <p className="small text-secondary mb-0">
              {reviewCount}{" "}
              {reviewCount === 1
                ? "review"
                : "reviews"}
            </p>
          </div>

          <button
            type="button"
            className="btn btn-outline-success btn-sm rounded-pill flex-shrink-0"
            onClick={() => {
              setShowReviews((previous) => {
                if (previous) {
                  setShowReviewForm(false);
                  setEditingReview(false);
                }

                return !previous;
              });
            }}
          >
            {showReviews
              ? "Hide reviews"
              : "View reviews"}
          </button>
        </div>

        {/* ====================================================
            COLLAPSED REVIEW PROMPT
        ==================================================== */}

        {!showReviews && (
          <div className="d-flex align-items-center justify-content-between gap-2 mt-3">
            <span className="small text-secondary">
              {reviewCount === 0
                ? "Be the first to review this place."
                : "See what others are saying."}
            </span>

            {isAuthenticated && (
              <button
                type="button"
                className="btn btn-success btn-sm rounded-pill flex-shrink-0"
                onClick={handleOpenReviewForm}
                disabled={loadingDetails}
              >
                {myReview
                  ? "Edit review"
                  : "+ Review"}
              </button>
            )}
          </div>
        )}

        {/* ====================================================
            EXPANDED REVIEWS
        ==================================================== */}

        {showReviews && (
          <div
            className="mt-3"
            style={{
              maxHeight: "min(45vh, 350px)",
              overflowY: "auto",
              overscrollBehavior: "contain",
            }}
          >
            {loadingDetails ? (
              <div className="text-center py-3">
                <div
                  className="spinner-border spinner-border-sm text-success"
                  role="status"
                >
                  <span className="visually-hidden">
                    Loading reviews
                  </span>
                </div>
              </div>
            ) : reviews.length === 0 ? (
              <div className="text-center bg-light rounded-3 p-3 mb-3">
                <div className="text-warning fs-4">
                  ☆
                </div>

                <p className="small fw-semibold mb-1">
                  No reviews yet
                </p>

                <p className="small text-secondary mb-0">
                  Share your experience with others.
                </p>
              </div>
            ) : (
              <div className="d-flex flex-column gap-2 mb-3">
                {reviews.map((review, index) => (
                  <div
                    key={review.id ?? index}
                    className="bg-light rounded-3 p-3"
                  >
                    <div className="d-flex align-items-center justify-content-between gap-2 mb-1">
                      <strong className="small text-break">
                        {getReviewAuthor(review)}
                      </strong>

                      <span className="small text-secondary flex-shrink-0">
                        {formatDate(
                          review.created_at
                        )}
                      </span>
                    </div>

                    <div className="small mb-1">
                      <RatingStars
                        rating={review.rating}
                      />
                    </div>

                    {review.comment && (
                      <p className="small text-secondary mb-0 text-break">
                        {review.comment}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* ================================================
                REVIEW ACTIONS
            ================================================ */}

            {isAuthenticated &&
              !loadingDetails &&
              !showReviewForm && (
                <div className="d-flex gap-2 flex-wrap">
                  <button
                    type="button"
                    className="btn btn-success btn-sm rounded-pill"
                    onClick={handleOpenReviewForm}
                  >
                    {myReview
                      ? "Edit my review"
                      : "+ Write a review"}
                  </button>

                  {myReview && (
                    <button
                      type="button"
                      className="btn btn-outline-danger btn-sm rounded-pill"
                      onClick={handleDeleteReview}
                      disabled={submittingReview}
                    >
                      {submittingReview
                        ? "Deleting..."
                        : "Delete my review"}
                    </button>
                  )}
                </div>
              )}

            {/* ================================================
                REVIEW FORM
            ================================================ */}

            {isAuthenticated &&
              !loadingDetails &&
              showReviewForm && (
                <form
                  onSubmit={handleReviewSubmit}
                  className="border rounded-3 p-3 mt-2"
                >
                  <div className="d-flex align-items-center justify-content-between gap-2 mb-2">
                    <h4 className="fs-6 fw-bold mb-0">
                      {editingReview
                        ? "Edit your review"
                        : "Write a review"}
                    </h4>

                    <button
                      type="button"
                      className="btn-close"
                      onClick={handleCloseReviewForm}
                      disabled={submittingReview}
                      aria-label="Close review form"
                    />
                  </div>

                  <label className="form-label small fw-semibold">
                    Your rating
                  </label>

                  <StarRatingInput
                    value={rating}
                    onChange={setRating}
                    disabled={submittingReview}
                  />

                  <label
                    htmlFor="nearsport-review-comment"
                    className="form-label small fw-semibold mt-3"
                  >
                    Your review
                  </label>

                  <textarea
                    id="nearsport-review-comment"
                    className="form-control form-control-sm rounded-3"
                    rows={3}
                    value={comment}
                    onChange={(event) =>
                      setComment(event.target.value)
                    }
                    placeholder="What was your experience like?"
                    disabled={submittingReview}
                  />

                  <div className="d-flex gap-2 mt-3">
                    <button
                      type="submit"
                      className="btn btn-success btn-sm rounded-3 flex-grow-1"
                      disabled={submittingReview}
                    >
                      {submittingReview
                        ? "Submitting..."
                        : editingReview
                        ? "Update review"
                        : "Post review"}
                    </button>

                    <button
                      type="button"
                      className="btn btn-light btn-sm border rounded-3"
                      onClick={handleCloseReviewForm}
                      disabled={submittingReview}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
          </div>
        )}

        {!isAuthenticated && (
          <p className="small text-secondary mt-3 mb-0">
            Log in to save places or write reviews.
          </p>
        )}
      </div>

      {/* ======================================================
          FOOTER
      ====================================================== */}

      <div className="border-top px-3 py-2 bg-light rounded-bottom-4">
        <p className="small text-secondary text-center mb-0">
          Place data © OpenStreetMap contributors
        </p>
      </div>
    </aside>
  );
}

export default SelectedExternalPlaceCard;
