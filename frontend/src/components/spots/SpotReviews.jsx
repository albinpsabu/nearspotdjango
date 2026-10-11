import { useState } from "react";
import { useReviews } from "../../hooks/useReviews";
export function SpotReviews({ spotId }) {
  const { reviews, loading, error, fetchReviews, createReview, deleteReview } = useReviews(spotId);
  const [showForm, setShowForm] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [mediaFiles, setMediaFiles] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!rating) return;
    setSubmitting(true);
    try {
      await createReview({ rating, comment, mediaFiles, mediaTypes: mediaFiles.map(() => "IMAGE") });
      setShowForm(false);
      setRating(5);
      setComment("");
      setMediaFiles([]);
    } finally {
      setSubmitting(false);
    }
  };
  const handleDelete = async (reviewId) => {
    if (!window.confirm("Delete this review?")) return;
    await deleteReview(reviewId);
  };
  const mediaPreviews = mediaFiles.map((file, idx) => (
    <div key={idx} className="relative group">
      {file.type.startsWith("image/") ? (
        <img src={URL.createObjectURL(file)} alt="Preview" className="w-20 h-20 object-cover rounded" />
      ) : (
        <video src={URL.createObjectURL(file)} className="w-20 h-20 object-cover rounded" muted />
      )}
      <button
        type="button"
        onClick={() => setMediaFiles((prev) => prev.filter((_, i) => i !== idx))}
        className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full w-5 h-5 text-xs opacity-0 group-hover:opacity-100"
      >
        ×
      </button>
    </div>
  ));
  if (loading && reviews.length === 0) return <div className="py-4 text-center text-gray-500">Loading reviews...</div>;
  if (error) return <div className="py-4 text-center text-red-500">{error}</div>;
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Reviews ({reviews.length})</h3>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
        >
          {showForm ? "Cancel" : "Write a Review"}
        </button>
      </div>
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-gray-50 p-4 rounded-lg space-y-3 border">
          <div>
            <label className="block text-sm font-medium mb-1">Rating</label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className={`text-2xl ${star <= rating ? "text-yellow-400" : "text-gray-300"} hover:text-yellow-400`}
                >
                  ★
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Comment (optional)</label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Share your experience..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Add Photos/Videos (optional)</label>
            <input
              type="file"
              accept="image/*,video/*"
              multiple
              onChange={(e) => setMediaFiles(Array.from(e.target.files))}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {mediaFiles.length > 0 && (
              <div className="flex gap-2 mt-2 flex-wrap">{mediaPreviews}</div>
            )}
          </div>
          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {submitting ? "Posting..." : "Post Review"}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
      <div className="space-y-3">
        {reviews.length === 0 && !loading && (
          <p className="text-center text-gray-500 py-4">No reviews yet. Be the first!</p>
        )}
        {reviews.map((review) => (
          <div key={review.id} className="bg-white border rounded-lg p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-medium">{review.user_name || review.user_email}</span>
                  <span className="text-sm text-gray-500">
                    {new Date(review.created_at).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex gap-1 mb-2 text-yellow-400">
                  {[...Array(5)].map((_, i) => (
                    <span key={i} className={i < review.rating ? "" : "text-gray-300"}>★</span>
                  ))}
                </div>
                {review.comment && <p className="text-gray-700 whitespace-pre-wrap">{review.comment}</p>}
                {review.media && review.media.length > 0 && (
                  <div className="flex gap-2 mt-2 flex-wrap">
                    {review.media.map((m) => (
                      <a key={m.id} href={m.url} target="_blank" rel="noopener noreferrer" className="group">
                        {m.media_type === "IMAGE" ? (
                          <img src={m.url} alt="Review media" className="w-16 h-16 object-cover rounded border group-hover:opacity-80" />
                        ) : (
                          <video src={m.url} className="w-16 h-16 object-cover rounded border" muted />
                        )}
                      </a>
                    ))}
                  </div>
                )}
              </div>
              {/* Delete button - only show for own reviews */}
              {review.user === review.currentUserId && (
                <button
                  onClick={() => handleDelete(review.id)}
                  className="text-red-500 hover:text-red-700 text-sm font-medium flex-shrink-0"
                >
                  Delete
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}