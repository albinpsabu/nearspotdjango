
import { useMemo, useState } from "react";

import RadiusSelector from "../location/RadiusSelector";
import NearbySpotList from "../spots/NearbySpotList";

// ============================================================
// EXPLORE SIDEBAR - BOOTSTRAP 5
// ============================================================

function ExploreSidebar({
  open,
  onClose,
  spots = [],
  radius,
  onRadiusChange,
  loading = false,
  error = "",
}) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [sortBy, setSortBy] = useState("nearest");

  // ============================================================
  // AVAILABLE CATEGORIES
  // ============================================================

  const categories = useMemo(() => {
    const unique = new Set();

    spots.forEach((spot) => {
      if (spot.category_name) {
        unique.add(spot.category_name);
      }
    });

    return Array.from(unique).sort();
  }, [spots]);

  // ============================================================
  // FILTER AND SORT SPOTS
  // ============================================================

  const filteredSpots = useMemo(() => {
    const query = search.trim().toLowerCase();

    const result = spots.filter((spot) => {
      const name = String(spot.name || "").toLowerCase();

      const description = String(
        spot.description || ""
      ).toLowerCase();

      const spotCategory = String(
        spot.category_name || ""
      );

      const matchesSearch =
        !query ||
        name.includes(query) ||
        description.includes(query) ||
        spotCategory.toLowerCase().includes(query);

      const matchesCategory =
        category === "all" || spotCategory === category;

      return matchesSearch && matchesCategory;
    });

    result.sort((a, b) => {
      if (sortBy === "name") {
        return String(a.name || "").localeCompare(
          String(b.name || "")
        );
      }

      if (sortBy === "rated") {
        return (
          Number(b.average_rating || 0) -
          Number(a.average_rating || 0)
        );
      }

      return (
        Number(a.distance_meters ?? Infinity) -
        Number(b.distance_meters ?? Infinity)
      );
    });

    return result;
  }, [spots, search, category, sortBy]);

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <aside
      id="nearsport-explore-sidebar"
      className="position-absolute bg-white shadow-lg d-flex flex-column"
      aria-label="Explore nearby places"
      aria-hidden={!open}
      inert={!open}
      style={{
        top: "85px",
        bottom: "15px",
        left: "15px",
        width: "390px",
        maxWidth: "calc(100vw - 30px)",
        zIndex: 1050,
        borderRadius: "20px",
        border: "1px solid #e5eeea",
        overflow: "hidden",
        transform: open
          ? "translateX(0)"
          : "translateX(calc(-100% - 35px))",
        opacity: open ? 1 : 0,
        visibility: open ? "visible" : "hidden",
        pointerEvents: open ? "auto" : "none",
        transition:
          "transform 0.3s ease, opacity 0.3s ease, visibility 0.3s ease",
      }}
    >
      {/* ======================================================
          SIDEBAR HEADER
      ======================================================= */}

      <div className="d-flex align-items-start justify-content-between gap-3 px-4 pt-4 pb-3 border-bottom">
        <div>
          <div
            className="fw-bold text-uppercase mb-1"
            style={{
              fontSize: "10px",
              letterSpacing: "1px",
              color: "#0aaa87",
            }}
          >
            Discover near you
          </div>

          <h4
            className="fw-bold mb-1"
            style={{ color: "#203a34" }}
          >
            Explore Places
          </h4>

          <p className="text-secondary small mb-0">
            Find your next favorite spot.
          </p>
        </div>

        <button
          type="button"
          className="btn btn-light border rounded-3"
          onClick={onClose}
          aria-label="Close sidebar"
          title="Close sidebar"
        >
          <i className="bi bi-x-lg" aria-hidden="true" />
        </button>
      </div>

      {/* ======================================================
          SCROLLABLE CONTENT
      ======================================================= */}

      <div
        className="flex-grow-1 overflow-auto px-3 py-3"
        style={{ minHeight: 0 }}
      >
        {/* HiddenSpots / Public Places */}

        <div
          className="d-flex gap-2 p-1 rounded-3 mb-4"
          style={{ background: "#f1f6f3" }}
        >
          <button
            type="button"
            className="btn btn-sm bg-white shadow-sm fw-semibold flex-fill"
            style={{
              color: "#078d6c",
              borderRadius: "9px",
            }}
            aria-current="page"
          >
            <i className="bi bi-compass me-2" />
            HiddenSpots
          </button>

          <button
            type="button"
            className="btn btn-sm flex-fill text-secondary"
            disabled
            title="Public Places sidebar coming next"
          >
            <i className="bi bi-geo-alt me-2" />
            Public Places
          </button>
        </div>

        {/* Search */}

        <label
          htmlFor="nearsport-spot-search"
          className="form-label small fw-semibold"
        >
          Search HiddenSpots
        </label>

        <div className="input-group mb-3">
          <span className="input-group-text bg-white">
            <i className="bi bi-search text-secondary" />
          </span>

          <input
            id="nearsport-spot-search"
            type="search"
            className="form-control"
            placeholder="Search nearby places..."
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
          />
        </div>

        {/* Category and Sort */}

        <div className="row g-2 mb-4">
          <div className="col-6">
            <label
              htmlFor="nearsport-category"
              className="form-label small fw-semibold"
            >
              Category
            </label>

            <select
              id="nearsport-category"
              className="form-select form-select-sm"
              value={category}
              onChange={(event) =>
                setCategory(event.target.value)
              }
            >
              <option value="all">All categories</option>

              {categories.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          <div className="col-6">
            <label
              htmlFor="nearsport-sort"
              className="form-label small fw-semibold"
            >
              Sort by
            </label>

            <select
              id="nearsport-sort"
              className="form-select form-select-sm"
              value={sortBy}
              onChange={(event) =>
                setSortBy(event.target.value)
              }
            >
              <option value="nearest">Nearest</option>
              <option value="rated">Highest rated</option>
              <option value="name">Name A–Z</option>
            </select>
          </div>
        </div>

        {/* ======================================================
            RADIUS SELECTOR
        ======================================================= */}

        <div
          className="border rounded-4 p-3 mb-4"
          style={{
            background: "#f4fbf7",
            borderColor: "#d9eee4",
          }}
        >
          <div className="d-flex justify-content-between align-items-center mb-3">
            <span
              className="small fw-semibold"
              style={{ color: "#31564b" }}
            >
              <i
                className="bi bi-bullseye me-2"
                style={{ color: "#0aaa87" }}
              />
              Search Radius
            </span>

            <span
              className="badge rounded-pill"
              style={{
                background: "#d9f4e8",
                color: "#078763",
              }}
            >
              {(radius / 1000).toFixed(1)} km
            </span>
          </div>

          <RadiusSelector
            radius={radius}
            onRadiusChange={onRadiusChange}
          />
        </div>

        {/* ======================================================
            NEARBY SPOTS
        ======================================================= */}

        <div className="d-flex align-items-center justify-content-between mb-3">
          <div>
            <h6 className="fw-bold mb-1">
              Nearby HiddenSpots
            </h6>

            <div className="small text-secondary">
              {filteredSpots.length}{" "}
              {filteredSpots.length === 1
                ? "place"
                : "places"}{" "}
              found
            </div>
          </div>

          <i
            className="bi bi-sliders"
            style={{ color: "#0aaa87" }}
          />
        </div>

        {loading ? (
          <div className="text-center py-4">
            <div
              className="spinner-border spinner-border-sm text-success"
              role="status"
            >
              <span className="visually-hidden">
                Loading...
              </span>
            </div>

            <p className="small text-secondary mt-2 mb-0">
              Finding nearby spots...
            </p>
          </div>
        ) : error ? (
          <div className="alert alert-danger small">
            Unable to load nearby spots.
          </div>
        ) : (
          <NearbySpotList spots={filteredSpots} />
        )}
      </div>

      {/* ======================================================
          FOOTER
      ======================================================= */}

      <div className="border-top text-center bg-light py-3">
        <small className="text-secondary">
          <i
            className="bi bi-map me-2"
            style={{ color: "#0aaa87" }}
          />
          Explore more by moving the map
        </small>
      </div>
    </aside>
  );
}

export default ExploreSidebar;
