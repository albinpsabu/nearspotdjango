// ============================================================
// IMPORTS
// ============================================================

import { useEffect, useState } from "react";

import useLocation from "./hooks/useLocation";
import useNearbySpots from "./hooks/useNearbySpots";

import NearSpotMap from "./components/map/NearSpotMap";
import RadiusSelector from "./components/location/RadiusSelector";
import NearbySpotList from "./components/spots/NearbySpotList";
import SpotCount from "./components/spots/SpotCount";
import StatusMessage from "./components/common/StatusMessage";
import TopNavigation from "./components/layout/TopNavigation";

// ============================================================
// APP COMPONENT
// ============================================================

function App() {
  // ============================================================
  // LOCATION
  // ============================================================

  const {
    location,
    loading: locationLoading,
    error: locationError,
    getCurrentLocation,
  } = useLocation();

  // ============================================================
  // RADIUS
  // ============================================================

  const [radius, setRadius] = useState(5000);

  // ============================================================
  // ACTIVE MAP LOCATION
  // ============================================================

  const [mapLocation, setMapLocation] = useState(null);

  // ============================================================
  // NEARBY SPOTS
  // ============================================================

  const {
    spots,
    loading: spotsLoading,
    error: spotsError,
  } = useNearbySpots(mapLocation, radius);

  // ============================================================
  // GET USER LOCATION
  // ============================================================

  useEffect(() => {
    getCurrentLocation();
  }, []);

  // ============================================================
  // SYNC MAP LOCATION WITH USER LOCATION
  // ============================================================

  useEffect(() => {
    if (location && !mapLocation) {
      setMapLocation(location);
    }
  }, [location, mapLocation]);

  // ============================================================
  // HANDLE PLACE SEARCH
  // ============================================================

  const handlePlaceSelect = (selectedLocation) => {
    setMapLocation(selectedLocation);
  };

  // ============================================================
  // HANDLE MY LOCATION
  // ============================================================

  const handleMyLocation = () => {
    getCurrentLocation();
  };

  // ============================================================
  // MAIN UI
  // ============================================================

  return (
    <div
      className="w-100 h-100 position-relative overflow-hidden bg-light"
      style={{
        height: "100dvh",
        minHeight: "100dvh",
        background: "#f5f7f7",
        fontFamily:
          'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      {/* ======================================================
          FULL SCREEN MAP
      ======================================================= */}

      <div
        className="position-absolute top-0 start-0 w-100 h-100"
        style={{
          zIndex: 1,
        }}
      >
        {mapLocation ? (
          <NearSpotMap
            location={mapLocation}
            userLocation={location}
            spots={spots}
            onMyLocation={handleMyLocation}
          />
        ) : (
          <div
            className="w-100 h-100 d-flex align-items-center justify-content-center bg-light"
            style={{
              background: "#f5f7f7",
            }}
          >
            <div className="text-center">
              <div
                className="spinner-border"
                role="status"
                style={{
                  width: "2rem",
                  height: "2rem",
                  color: "#16cda5",
                }}
              >
                <span className="visually-hidden">
                  Loading...
                </span>
              </div>

              <div
                className="mt-2 small"
                style={{
                  color: "#687779",
                }}
              >
                Getting your location...
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ======================================================
          TOP NAVIGATION
      ======================================================= */}

      <TopNavigation
        onLocationSelect={handlePlaceSelect}
      />

      {/* ======================================================
          RADIUS SELECTOR
      ======================================================= */}

      <div
        className="position-absolute bottom-0 start-0 d-flex align-items-center gap-2 bg-white border rounded-4 shadow px-3 py-2"
        style={{
          left: "18px",
          bottom: "20px",
          zIndex: 1000,
          minHeight: "48px",
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
        }}
      >
        <span
          className="fw-semibold small d-none d-sm-inline"
          style={{
            color: "#667578",
            fontSize: "11px",
          }}
        >
          Radius
        </span>

        <div
          style={{
            width: "105px",
          }}
        >
          <RadiusSelector
            radius={radius}
            onRadiusChange={setRadius}
          />
        </div>
      </div>

      {/* ======================================================
          SPOT COUNT
      ======================================================= */}

      <SpotCount
        count={spots.length}
      />

      {/* ======================================================
          NEARBY SPOTS LIST
      ======================================================= */}

      {!spotsLoading && !spotsError && (
        <div
          className="position-absolute"
          style={{
            right: "20px",
            bottom: "20px",
            width: "380px",
            maxWidth: "calc(100% - 40px)",
            zIndex: 1000,
          }}
        >
          <NearbySpotList
            spots={spots}
          />
        </div>
      )}

      {/* ======================================================
          SPOTS LOADING MESSAGE
      ======================================================= */}

      {spotsLoading && mapLocation && (
        <StatusMessage
          type="loading"
          message="Loading nearby spots..."
        />
      )}

      {/* ======================================================
          SPOTS ERROR MESSAGE
      ======================================================= */}

      {spotsError && (
        <StatusMessage
          type="error"
          message="Unable to load nearby spots."
        />
      )}

      {/* ======================================================
          LOCATION LOADING MESSAGE
      ======================================================= */}

      {locationLoading && (
        <StatusMessage
          type="loading"
          message="Getting your location..."
        />
      )}

      {/* ======================================================
          LOCATION ERROR
      ======================================================= */}

      {locationError && (
        <StatusMessage
          type="error"
          message={locationError}
          onRetry={handleMyLocation}
        />
      )}
    </div>
  );
}

// ============================================================
// EXPORT
// ============================================================

export default App;