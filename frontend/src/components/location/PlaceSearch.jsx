import { useEffect, useRef, useState } from "react";

import api from "../../services/api";

// ============================================================
// CONFIGURATION
// ============================================================

const DEBOUNCE_DELAY = 300;

// ============================================================
// COMPONENT
// ============================================================

function PlaceSearch({ onLocationSelect }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const searchTimeoutRef = useRef(null);
  const inputRef = useRef(null);

  // ============================================================
  // SEARCH PLACES WHILE TYPING
  // ============================================================

  useEffect(() => {
    const searchQuery = query.trim();

    // ============================================================
    // CLEAR PREVIOUS TIMEOUT
    // ============================================================

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // ============================================================
    // DON'T SEARCH FOR VERY SHORT TEXT
    // ============================================================

    if (searchQuery.length < 2) {
      setResults([]);
      setLoading(false);
      setError("");
      return;
    }

    // ============================================================
    // WAIT BEFORE SENDING REQUEST
    // ============================================================

    searchTimeoutRef.current = setTimeout(async () => {
      try {
        setLoading(true);
        setError("");

        // ========================================================
        // SEARCH THROUGH DJANGO BACKEND
        // ========================================================

        const response = await api.get("/places/search/", {
          params: {
            q: searchQuery,
          },
        });

        // ========================================================
        // STORE SEARCH RESULTS
        // ========================================================

        setResults(
          Array.isArray(response.data)
            ? response.data
            : []
        );
      } catch (err) {
        console.error(
          "Place search error:",
          err
        );

        setResults([]);
        setError("Unable to search places.");
      } finally {
        setLoading(false);
      }
    }, DEBOUNCE_DELAY);

    // ============================================================
    // CLEANUP
    // ============================================================

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [query]);

  // ============================================================
  // SELECT SEARCH RESULT
  // ============================================================

  const handleSelect = (result) => {
    // ============================================================
    // GET COORDINATES
    // ============================================================

    const latitude = Number(
      result.latitude ?? result.lat
    );

    const longitude = Number(
      result.longitude ?? result.lon
    );

    // ============================================================
    // VALIDATE COORDINATES
    // ============================================================

    if (
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude)
    ) {
      console.error(
        "Invalid coordinates received from search result:",
        result
      );

      setError(
        "This place does not have valid location coordinates."
      );

      return;
    }

    // ============================================================
    // CREATE SELECTED LOCATION
    // ============================================================

    const selectedLocation = {
      latitude,
      longitude,
      displayName:
        result.display_name ||
        result.name ||
        "Selected location",
    };

    // ============================================================
    // UPDATE INPUT
    // ============================================================

    setQuery(
      result.display_name ||
      result.name ||
      ""
    );

    // ============================================================
    // CLOSE SUGGESTIONS
    // ============================================================

    setResults([]);

    // ============================================================
    // CLEAR ERROR
    // ============================================================

    setError("");

    // ============================================================
    // SEND LOCATION TO PARENT
    // ============================================================

    onLocationSelect(selectedLocation);
  };

  // ============================================================
  // HANDLE ENTER KEY
  // ============================================================

  const handleKeyDown = (event) => {
    if (event.key === "Enter") {
      event.preventDefault();

      if (results.length > 0) {
        handleSelect(results[0]);
      }
    }

    // ============================================================
    // CLOSE SUGGESTIONS WITH ESCAPE
    // ============================================================

    if (event.key === "Escape") {
      setResults([]);
    }
  };

  // ============================================================
  // CLEAR SEARCH
  // ============================================================

  const handleClear = () => {
    setQuery("");
    setResults([]);
    setError("");

    inputRef.current?.focus();
  };

  // ============================================================
  // GET SHORT DISPLAY NAME
  // ============================================================

  const getResultTitle = (result) => {
    const address = result.address || {};

    return (
      address.amenity ||
      address.shop ||
      address.tourism ||
      address.road ||
      address.city ||
      address.town ||
      address.village ||
      result.name ||
      result.display_name?.split(",")[0] ||
      "Unknown place"
    );
  };

  // ============================================================
  // GET RESULT SUBTITLE
  // ============================================================

  const getResultSubtitle = (result) => {
    const displayName =
      result.display_name || "";

    const parts = displayName.split(",");

    if (parts.length <= 1) {
      return "";
    }

    return parts
      .slice(1, 4)
      .join(",")
      .trim();
  };

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="position-relative w-100">

      {/* ========================================================
          SEARCH INPUT
      ======================================================== */}

      <div
        className="d-flex align-items-center"
        style={{
          height: "100%",
          width: "100%",
        }}
      >

        {/* ======================================================
            SEARCH ICON
        ====================================================== */}

        <span
          className="me-2"
          style={{
            fontSize: "20px",
            color: "#64748b",
            flexShrink: 0,
          }}
        >
          🔍
        </span>

        {/* ======================================================
            INPUT
        ====================================================== */}

        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(event) =>
            setQuery(event.target.value)
          }
          onKeyDown={handleKeyDown}
          placeholder="Search places, restaurants, hotels..."
          autoComplete="off"
          className="form-control border-0 shadow-none"
          style={{
            background: "transparent",
            fontSize: "15px",
            height: "100%",
            padding: "0 4px",
          }}
        />

        {/* ======================================================
            LOADING
        ====================================================== */}

        {loading && (
          <div
            className="spinner-border spinner-border-sm me-2"
            role="status"
            style={{
              color: "#0f766e",
              flexShrink: 0,
            }}
          >
            <span className="visually-hidden">
              Searching...
            </span>
          </div>
        )}

        {/* ======================================================
            CLEAR BUTTON
        ====================================================== */}

        {query && !loading && (
          <button
            type="button"
            onClick={handleClear}
            className="btn btn-sm border-0 shadow-none"
            style={{
              color: "#64748b",
              fontSize: "18px",
              padding: "4px 8px",
              flexShrink: 0,
            }}
            aria-label="Clear search"
          >
            ×
          </button>
        )}
      </div>

      {/* ========================================================
          SEARCH RESULTS DROPDOWN
      ======================================================== */}

      {results.length > 0 && (
        <div
          className="position-absolute bg-white shadow-lg"
          style={{
            top: "calc(100% + 8px)",
            left: 0,
            right: 0,
            zIndex: 5000,
            borderRadius: "14px",
            overflow: "hidden",
            border: "1px solid #e5e7eb",
            maxHeight: "420px",
            overflowY: "auto",
          }}
        >

          {results.map((result, index) => (
            <button
              key={`${
                result.place_id ||
                result.osm_id ||
                result.id ||
                index
              }-${index}`}
              type="button"
              onClick={() =>
                handleSelect(result)
              }
              className="w-100 text-start border-0 bg-white"
              style={{
                padding: "12px 15px",
                borderBottom:
                  index !== results.length - 1
                    ? "1px solid #f1f5f9"
                    : "none",
                cursor: "pointer",
                transition:
                  "background 0.15s ease",
              }}
              onMouseEnter={(event) => {
                event.currentTarget.style.background =
                  "#f8fafc";
              }}
              onMouseLeave={(event) => {
                event.currentTarget.style.background =
                  "#ffffff";
              }}
            >

              <div className="d-flex align-items-start">

                {/* ==================================================
                    LOCATION ICON
                ================================================== */}

                <div
                  className="d-flex align-items-center justify-content-center me-3"
                  style={{
                    width: "36px",
                    height: "36px",
                    minWidth: "36px",
                    borderRadius: "50%",
                    background: "#ecfdf5",
                    color: "#0f766e",
                    fontSize: "16px",
                  }}
                >
                  📍
                </div>

                {/* ==================================================
                    RESULT INFORMATION
                ================================================== */}

                <div
                  className="flex-grow-1"
                  style={{
                    minWidth: 0,
                  }}
                >

                  <div
                    style={{
                      fontSize: "14px",
                      fontWeight: 600,
                      color: "#0f172a",
                      lineHeight: 1.4,
                    }}
                  >
                    {getResultTitle(result)}
                  </div>

                  <div
                    style={{
                      fontSize: "12px",
                      color: "#64748b",
                      marginTop: "2px",
                      lineHeight: 1.4,
                    }}
                  >
                    {getResultSubtitle(result)}
                  </div>

                </div>
              </div>

            </button>
          ))}
        </div>
      )}

      {/* ========================================================
          NO RESULTS
      ======================================================== */}

      {!loading &&
        query.trim().length >= 2 &&
        results.length === 0 &&
        !error && (
          <div
            className="position-absolute bg-white shadow-lg"
            style={{
              top: "calc(100% + 8px)",
              left: 0,
              right: 0,
              zIndex: 5000,
              borderRadius: "14px",
              border: "1px solid #e5e7eb",
              padding: "18px",
            }}
          >
            <div
              className="text-center"
              style={{
                color: "#64748b",
                fontSize: "13px",
              }}
            >
              No places found
            </div>
          </div>
        )}

      {/* ========================================================
          ERROR
      ======================================================== */}

      {error && (
        <div
          className="position-absolute bg-white shadow-lg"
          style={{
            top: "calc(100% + 8px)",
            left: 0,
            right: 0,
            zIndex: 5000,
            borderRadius: "14px",
            border: "1px solid #fecaca",
            padding: "15px",
          }}
        >
          <div
            style={{
              color: "#dc2626",
              fontSize: "13px",
            }}
          >
            {error}
          </div>
        </div>
      )}

    </div>
  );
}

export default PlaceSearch;