
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useReviews } from "../../hooks/useReviews";

const API_ORIGIN = new URL(
  import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api"
).origin;

function getMediaUrl(file) {
  if (!file) return "";
  if (file.startsWith("blob:")) return file;

  try {
    return new URL(file, API_ORIGIN).href;
  } catch {
    return "";
  }
}

function getErrorMessage(error) {
  return error?.message || "Something went wrong. Please try again.";
}

function ReviewStars({ rating, interactive = false, onChange }) {
  return (
    <div
      className="d-flex align-items-center gap-1"
      aria-label={`${rating} out of 5 stars`}
    >
      {[1, 2, 3, 4, 5].map((star) =>
        interactive ? (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            className="btn border-0 p-0"
            style={{
              color: star <= rating ? "#e9ad25" : "#cbd5d3",
              fontSize: "27px",
              lineHeight: 1.2,
            }}
            aria-label={`Rate ${star} stars`}
          >
            ★
          </button>
        ) : (
          <span
            key={star}
            style={{
              color: star <= rating ? "#e9ad25" : "#cbd5d3",
              fontSize: "19px",
            }}
          >
            ★
          </span>
        )
      )}
    </div>
  );
}

export function SpotReviews({ spotId }) {
  const { user, isAuthenticated, loading: authLoading } = useAuth();

  const {
    reviews,
    loading,
    error,
    fetchReviews,
    createReview,
    updateReview,
    deleteReview,
  } = useReviews(spotId);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [mediaFiles, setMediaFiles] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [actionError, setActionError] = useState("");
  const [deletingId, setDeletingId] = useState(null);

  const mediaPreviews = useMemo(
    () =>
      mediaFiles.map((file) => ({
        file,
        url: URL.createObjectURL(file),
      })),
    [mediaFiles]
  );

  useEffect(() => {
    return () => {
      mediaPreviews.forEach(({ url }) => URL.revokeObjectURL(url));
    };
  }, [mediaPreviews]);

  const averageRating = useMemo(() => {
    if (!reviews.length) return 0;

    const total = reviews.reduce(
      (sum, review) => sum + Number(review.rating || 0),
      0
    );

    return total / reviews.length;
  }, [reviews]);

  const resetForm = () => {
    setShowForm(false);
    setEditingId(null);
    setRating(5);
    setComment("");
    setMediaFiles([]);
    setFormError("");
  };

  const handleWriteReview = () => {
    if (!isAuthenticated) {
      setActionError("Please log in to write a review.");
      return;
    }

    if (user?.role && user.role !== "USER") {
      setActionError("Only regular user accounts can write reviews.");
      return;
    }

    setActionError("");
    setEditingId(null);
    setRating(5);
    setComment("");
    setMediaFiles([]);
    setFormError("");
    setShowForm(true);
  };

  const handleEdit = (review) => {
    setEditingId(review.id);
    setRating(Number(review.rating));
    setComment(review.comment || "");
    setMediaFiles([]);
    setFormError("");
    setActionError("");
    setShowForm(true);
  };

  const handleFilesChange = (event) => {
    const selectedFiles = Array.from(event.target.files || []);

    const supportedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "video/mp4",
      "video/webm",
      "video/quicktime",
    ];

    const invalidFile = selectedFiles.find(
      (file) => !supportedTypes.includes(file.type)
    );

    if (invalidFile) {
      setFormError(`Unsupported file type: ${invalidFile.name}`);
      event.target.value = "";
      return;
    }

    const oversizedFile = selectedFiles.find((file) => {
      const limit = file.type.startsWith("video/")
        ? 100 * 1024 * 1024
        : 10 * 1024 * 1024;

      return file.size > limit;
    });

    if (oversizedFile) {
      setFormError(`File is too large: ${oversizedFile.name}`);
      event.target.value = "";
      return;
    }

    setMediaFiles(selectedFiles);
    setFormError("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!isAuthenticated) {
      setFormError("Please log in to submit a review.");
      return;
    }

    setSubmitting(true);
    setFormError("");

    try {
      const payload = {
        rating,
        comment,
        mediaFiles,
        mediaTypes: mediaFiles.map((file) =>
          file.type.startsWith("video/") ? "VIDEO" : "IMAGE"
        ),
      };

      if (editingId !== null) {
        await updateReview(editingId, payload);
      } else {
        await createReview(payload);
      }

      resetForm();
    } catch (err) {
      setFormError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (reviewId) => {
    if (!window.confirm("Are you sure you want to delete this review?")) {
      return;
    }

    setDeletingId(reviewId);
    setActionError("");

    try {
      await deleteReview(reviewId);

      if (editingId === reviewId) {
        resetForm();
      }
    } catch (err) {
      setActionError(getErrorMessage(err));
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (value) => {
    if (!value) return "";

    const date = new Date(value);

    return Number.isNaN(date.getTime())
      ? ""
      : date.toLocaleDateString(undefined, {
          day: "numeric",
          month: "short",
          year: "numeric",
        });
  };

  return (
    <section className="w-100" aria-label="Spot reviews">
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
        <div>
          <h4 className="fw-bold mb-2" style={{ color: "#26373a" }}>
            Reviews & Ratings
          </h4>

          <div className="d-flex align-items-center gap-2 flex-wrap">
            <span
              className="fw-bold"
              style={{ fontSize: "24px", color: "#26373a" }}
            >
              {reviews.length ? averageRating.toFixed(1) : "—"}
            </span>

            <ReviewStars rating={Math.round(averageRating)} />

            <span className="text-muted small">
              ({reviews.length} {reviews.length === 1 ? "review" : "reviews"})
            </span>
          </div>
        </div>

        {!showForm && !authLoading && (
          <button
            type="button"
            onClick={handleWriteReview}
            className="btn text-white fw-semibold"
            style={{
              backgroundColor: "#20cfa7",
              borderRadius: "10px",
            }}
          >
            <i className="bi bi-pencil-square me-2" />
            Write a Review
          </button>
        )}
      </div>

      {actionError && (
        <div className="alert alert-warning" role="alert">
          {actionError}
        </div>
      )}

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="p-3 p-md-4 mb-4"
          style={{
            border: "1px solid #e8eeee",
            borderRadius: "14px",
            backgroundColor: "#f8fbfa",
          }}
        >
          <h6 className="fw-bold mb-3">
            {editingId !== null ? "Edit Your Review" : "Write Your Review"}
          </h6>

          <div className="mb-3">
            <label className="form-label fw-semibold">Your Rating</label>
            <ReviewStars
              rating={rating}
              interactive
              onChange={setRating}
            />
          </div>

          <div className="mb-3">
            <label htmlFor="spot-review-comment" className="form-label fw-semibold">
              Your Experience
            </label>

            <textarea
              id="spot-review-comment"
              className="form-control"
              rows={4}
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              placeholder="Share your experience..."
              maxLength={2000}
            />
          </div>

          <div className="mb-3">
            <label htmlFor="spot-review-media" className="form-label fw-semibold">
              Photos / Videos (optional)
            </label>

            <input
              id="spot-review-media"
              className="form-control"
              type="file"
              accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime"
              multiple
              onChange={handleFilesChange}
            />

            <div className="form-text">
              Images up to 10 MB each; videos up to 100 MB each.
            </div>

            {editingId !== null && (
              <div className="form-text">
                Existing review media will remain unchanged when no new files
                are selected. Uploading new files will replace existing media.
              </div>
            )}
          </div>

          {mediaPreviews.length > 0 && (
            <div className="d-flex flex-wrap gap-2 mb-3">
              {mediaPreviews.map(({ file, url }, index) => (
                <div key={`${file.name}-${index}`} className="position-relative">
                  {file.type.startsWith("image/") ? (
                    <img
                      src={url}
                      alt={`Upload preview ${index + 1}`}
                      style={{
                        width: "85px",
                        height: "85px",
                        objectFit: "cover",
                        borderRadius: "8px",
                      }}
                    />
                  ) : (
                    <video
                      src={url}
                      muted
                      controls
                      style={{
                        width: "120px",
                        height: "85px",
                        objectFit: "cover",
                        borderRadius: "8px",
                      }}
                    />
                  )}

                  <button
                    type="button"
                    className="btn btn-danger btn-sm position-absolute top-0 end-0"
                    onClick={() =>
                      setMediaFiles((previous) =>
                        previous.filter((_, fileIndex) => fileIndex !== index)
                      )
                    }
                    aria-label={`Remove ${file.name}`}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          {formError && (
            <div className="alert alert-danger py-2" role="alert">
              {formError}
            </div>
          )}

          <div className="d-flex gap-2">
            <button
              type="submit"
              disabled={submitting}
              className="btn text-white"
              style={{ backgroundColor: "#20cfa7" }}
            >
              {submitting
                ? "Saving..."
                : editingId !== null
                ? "Update Review"
                : "Post Review"}
            </button>

            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={resetForm}
              disabled={submitting}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {loading && reviews.length === 0 && (
        <div className="text-center py-4">
          <div className="spinner-border spinner-border-sm me-2" />
          Loading reviews...
        </div>
      )}

      {error && (
        <div className="alert alert-warning d-flex justify-content-between align-items-center gap-3">
          <span>{error}</span>
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary"
            onClick={() => fetchReviews()}
          >
            Retry
          </button>
        </div>
      )}

      {!loading && !error && reviews.length === 0 && (
        <div className="text-center py-4 text-muted">
          No reviews yet. Be the first to share your experience!
        </div>
      )}

      <div className="d-flex flex-column gap-3">
        {reviews.map((review) => {
          const isOwner =
            isAuthenticated &&
            user?.id != null &&
            String(review.user) === String(user.id);

          return (
            <article
              key={review.id}
              className="p-3 p-md-4"
              style={{
                backgroundColor: "#fff",
                border: "1px solid #e8eeee",
                borderRadius: "12px",
              }}
            >
              <div className="d-flex justify-content-between gap-3 flex-wrap mb-2">
                <div>
                  <div className="fw-bold" style={{ color: "#26373a" }}>
                    {review.user_name || review.user_email || "NearSpot User"}
                  </div>

                  <small className="text-muted">
                    {formatDate(review.created_at)}
                  </small>
                </div>

                {isOwner && (
                  <div className="d-flex gap-2">
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-secondary"
                      onClick={() => handleEdit(review)}
                    >
                      Edit
                    </button>

                    <button
                      type="button"
                      className="btn btn-sm btn-outline-danger"
                      onClick={() => handleDelete(review.id)}
                      disabled={deletingId === review.id}
                    >
                      {deletingId === review.id ? "Deleting..." : "Delete"}
                    </button>
                  </div>
                )}
              </div>

              <ReviewStars rating={Number(review.rating)} />

              {review.comment && (
                <p
                  className="mt-3 mb-0"
                  style={{
                    color: "#566568",
                    whiteSpace: "pre-wrap",
                    lineHeight: 1.7,
                  }}
                >
                  {review.comment}
                </p>
              )}

              {Array.isArray(review.media) && review.media.length > 0 && (
                <div className="d-flex flex-wrap gap-2 mt-3">
                  {review.media.map((media) => {
                    const url = getMediaUrl(media.file || media.url);

                    if (!url) return null;

                    return (
                      <a
                        key={media.id}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {media.media_type === "IMAGE" ? (
                          <img
                            src={url}
                            alt="Review attachment"
                            loading="lazy"
                            style={{
                              width: "95px",
                              height: "95px",
                              objectFit: "cover",
                              borderRadius: "8px",
                            }}
                          />
                        ) : (
                          <video
                            src={url}
                            muted
                            preload="metadata"
                            style={{
                              width: "120px",
                              height: "95px",
                              objectFit: "cover",
                              borderRadius: "8px",
                            }}
                          />
                        )}
                      </a>
                    );
                  })}
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}

export default SpotReviews;
