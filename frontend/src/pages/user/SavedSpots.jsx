
import { SavedSpotsList } from "../../components/user/SavedSpotsList";

export default function SavedSpots() {
  return (
    <div className="w-100" style={{ color: "#1d2b2e" }}>
      {/* Page heading */}
      <div className="d-flex flex-column flex-sm-row align-items-sm-center justify-content-between gap-3 mb-4">
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
            <i className="bi bi-bookmark-heart" aria-hidden="true" />
            YOUR COLLECTION
          </div>

          <h2
            className="fw-bold mb-2"
            style={{
              fontSize: "clamp(24px, 3vw, 32px)",
              letterSpacing: "-0.8px",
            }}
          >
            Saved Spots
          </h2>

          <p
            className="mb-0"
            style={{
              color: "#819092",
              fontSize: "14px",
              lineHeight: 1.7,
            }}
          >
            Keep track of the hidden places you want to explore.
          </p>
        </div>

        <div
          className="d-flex align-items-center justify-content-center flex-shrink-0 rounded-4 align-self-start align-self-sm-center"
          style={{
            width: "58px",
            height: "58px",
            backgroundColor: "#e6faf4",
            color: "#087f68",
            border: "1px solid #d5f3e9",
          }}
        >
          <i
            className="bi bi-bookmark-heart"
            aria-hidden="true"
            style={{ fontSize: "25px" }}
          />
        </div>
      </div>

      {/* Saved spots section */}
      <div
        className="card mb-4"
        style={{
          borderRadius: "16px",
          border: "1px solid #e8efec",
          boxShadow: "0 4px 20px rgba(20, 50, 45, 0.04)",
          backgroundColor: "#ffffff",
        }}
      >
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
                    className="bi bi-bookmark-check"
                    aria-hidden="true"
                  />
                </div>

                <h5
                  className="fw-bold mb-0"
                  style={{ fontSize: "17px" }}
                >
                  Your Bookmarked Places
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
                Revisit and manage the places you've saved for later.
              </p>
            </div>
          </div>

          {/* Existing saved spots functionality */}
          <SavedSpotsList />
        </div>
      </div>
    </div>
  );
}
