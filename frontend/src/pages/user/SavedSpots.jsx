
import { SavedSpotsList } from "../../components/user/SavedSpotsList";

export default function SavedSpots() {
  return (
    <div
      className="w-100"
      style={{
        color: "#1d2b2e",
      }}
    >
      {/* Page Heading */}
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
        <div>
          <h3
            className="fw-bold mb-2"
            style={{
              fontSize: "26px",
              letterSpacing: "-0.6px",
            }}
          >
            Saved Spots
          </h3>

          <p
            className="mb-0"
            style={{
              color: "#819092",
              fontSize: "14px",
            }}
          >
            Explore the hidden places you have saved for later.
          </p>
        </div>

        {/* Page Icon */}
        <div
          className="d-flex align-items-center justify-content-center flex-shrink-0"
          style={{
            width: "48px",
            height: "48px",
            borderRadius: "13px",
            backgroundColor: "#e6faf4",
            color: "#087f68",
          }}
        >
          <i
            className="bi bi-bookmark-heart"
            aria-hidden="true"
            style={{ fontSize: "21px" }}
          />
        </div>
      </div>

      {/* Saved Spots Container */}
      <div
        className="card mb-4"
        style={{
          borderRadius: "16px",
          border: "1px solid #edf1ef",
          boxShadow: "0 4px 18px rgba(20, 50, 45, 0.04)",
          backgroundColor: "#ffffff",
        }}
      >
        <div className="card-body p-3 p-md-4">
          <div className="mb-4">
            <h5
              className="fw-bold mb-2"
              style={{
                fontSize: "17px",
                color: "#26373a",
              }}
            >
              Your Bookmarked Places
            </h5>

            <p
              className="mb-0"
              style={{
                color: "#819092",
                fontSize: "12px",
              }}
            >
              View and manage the spots you've saved.
            </p>
          </div>

          {/* Existing Saved Spots Functionality */}
          <SavedSpotsList />
        </div>
      </div>
    </div>
  );
}
