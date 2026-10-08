// ============================================================
// IMPORTS
// ============================================================

import { useEffect, useState } from "react";

import useLocation from "./hooks/useLocation";
import useNearbySpots from "./hooks/useNearbySpots";

import NearSpotMap from "./components/map/NearSpotMap";
import RadiusSelector from "./components/location/RadiusSelector";
import PlaceSearch from "./components/location/PlaceSearch";
import NearbySpotList from "./components/spots/NearbySpotList";


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
  // CATEGORY LIST
  // ============================================================

  const categories = [
    "All",
    "Nature",
    "Food",
    "Waterfalls",
    "Mountains",
    "Viewpoints",
  ];


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
      className="nearsport-app"
      style={{
        width: "100%",
        height: "100dvh",
        overflow: "hidden",
        position: "relative",
        background: "#f5f7f7",
      }}
    >

      {/* ======================================================
          GLOBAL UI STYLES
      ======================================================= */}

      <style>
        {`

          /* =================================================
             MAIN APPLICATION
          ================================================= */

          .nearsport-app {

            font-family:
              Inter,
              -apple-system,
              BlinkMacSystemFont,
              "Segoe UI",
              sans-serif;

          }


          /* =================================================
             FLOATING WHITE GLASS
          ================================================= */

          .ns-floating {

            background:
              rgba(255, 255, 255, 0.96);

            border:
              1px solid rgba(20, 40, 45, 0.10);

            box-shadow:
              0 4px 18px rgba(0, 0, 0, 0.14),
              0 1px 4px rgba(0, 0, 0, 0.08);

            backdrop-filter:
              blur(14px);

            -webkit-backdrop-filter:
              blur(14px);

          }


          /* =================================================
             TOP BAR
          ================================================= */

          .ns-topbar {

            position:
              absolute;

            top:
              14px;

            left:
              16px;

            right:
              16px;

            z-index:
              1000;

            display:
              flex;

            align-items:
              center;

            gap:
              10px;

            pointer-events:
              none;

          }


          /* =================================================
             LOGO
          ================================================= */

          .ns-logo {

            height:
              54px;

            padding:
              0 17px;

            display:
              flex;

            align-items:
              center;

            gap:
              11px;

            border-radius:
              15px;

            pointer-events:
              auto;

            flex-shrink:
              0;

          }


          .ns-logo-icon {

            width:
              28px;

            height:
              28px;

            border-radius:
              50%;

            background:
              #20d9ae;

            color:
              white;

            display:
              flex;

            align-items:
              center;

            justify-content:
              center;

            font-size:
              14px;

            font-weight:
              800;

          }


          .ns-logo-title {

            font-size:
              16px;

            font-weight:
              800;

            color:
              #162326;

            line-height:
              1;

          }


          .ns-logo-title span {

            color:
              #12cfa4;

          }


          .ns-logo-subtitle {

            color:
              #7c8b8e;

            font-size:
              9px;

            margin-top:
              4px;

          }


          /* =================================================
             SEARCH
          ================================================= */

          .ns-search {

            height:
              54px;

            width:
              min(520px, 100%);

            display:
              flex;

            align-items:
              center;

            padding:
              0 18px;

            border-radius:
              15px;

            pointer-events:
              auto;

            flex:
              1;

            max-width:
              560px;

          }


          .ns-search-icon {

            color:
              #16cda5;

            font-size:
              21px;

            margin-right:
              11px;

          }


          /* =================================================
             LOCATION STATUS
          ================================================= */

          .ns-location-status {

            height:
              54px;

            padding:
              0 16px;

            border-radius:
              15px;

            display:
              flex;

            align-items:
              center;

            gap:
              8px;

            pointer-events:
              auto;

            color:
              #1f3c37;

            font-size:
              12px;

            font-weight:
              600;

            margin-left:
              auto;

          }


          .ns-location-dot {

            width:
              8px;

            height:
              8px;

            border-radius:
              50%;

            background:
              #20d9ae;

            box-shadow:
              0 0 0 4px rgba(32, 217, 174, 0.15);

          }


          /* =================================================
             PROFILE
          ================================================= */

          .ns-profile {

            width:
              54px;

            height:
              54px;

            border-radius:
              15px;

            display:
              flex;

            align-items:
              center;

            justify-content:
              center;

            pointer-events:
              auto;

            color:
              #455558;

            font-size:
              19px;

            flex-shrink:
              0;

          }


          /* =================================================
             CATEGORY BAR
          ================================================= */

          .ns-categories {

            position:
              absolute;

            top:
              78px;

            left:
              50%;

            transform:
              translateX(-50%);

            z-index:
              900;

            display:
              flex;

            gap:
              8px;

            max-width:
              calc(100% - 30px);

            overflow-x:
              auto;

            padding:
              4px;

            scrollbar-width:
              none;

          }


          .ns-categories::-webkit-scrollbar {

            display:
              none;

          }


          .ns-category {

            border:
              1px solid rgba(20, 40, 45, 0.12);

            background:
              rgba(255, 255, 255, 0.96);

            color:
              #465659;

            height:
              38px;

            padding:
              0 17px;

            border-radius:
              20px;

            white-space:
              nowrap;

            font-size:
              12px;

            font-weight:
              600;

            box-shadow:
              0 3px 12px rgba(0, 0, 0, 0.10);

            cursor:
              pointer;

          }


          .ns-category.active {

            background:
              #20d9ae;

            border-color:
              #20d9ae;

            color:
              #06352b;

          }


          /* =================================================
             LEFT MAP CONTROLS
          ================================================= */

          .ns-map-controls {

            position:
              absolute;

            left:
              16px;

            top:
              50%;

            transform:
              translateY(-50%);

            z-index:
              1000;

            display:
              flex;

            flex-direction:
              column;

            gap:
              8px;

          }


          .ns-map-button {

            width:
              48px;

            height:
              48px;

            border:
              1px solid rgba(20, 40, 45, 0.10);

            border-radius:
              14px;

            background:
              rgba(255, 255, 255, 0.97);

            color:
              #344548;

            display:
              flex;

            align-items:
              center;

            justify-content:
              center;

            font-size:
              19px;

            box-shadow:
              0 4px 16px rgba(0, 0, 0, 0.15);

            cursor:
              pointer;

          }


          .ns-map-button:hover {

            color:
              #10cda4;

            border-color:
              rgba(16, 205, 164, 0.35);

          }


          /* =================================================
             RADIUS CONTROL
          ================================================= */

          .ns-radius {

            position:
              absolute;

            left:
              18px;

            bottom:
              20px;

            z-index:
              1000;

            display:
              flex;

            align-items:
              center;

            gap:
              10px;

            padding:
              8px 10px 8px 14px;

            border-radius:
              14px;

          }


          .ns-radius-label {

            color:
              #667578;

            font-size:
              11px;

            font-weight:
              600;

          }


          /* =================================================
             SPOT COUNT
          ================================================= */

          .ns-spot-count {

            position:
              absolute;

            left:
              50%;

            bottom:
              20px;

            transform:
              translateX(-50%);

            z-index:
              1000;

            padding:
              9px 16px;

            border-radius:
              20px;

            display:
              flex;

            align-items:
              center;

            gap:
              7px;

            white-space:
              nowrap;

          }


          .ns-count-number {

            color:
              #0fcda4;

            font-size:
              14px;

            font-weight:
              800;

          }


          .ns-count-text {

            color:
              #59696c;

            font-size:
              11px;

            font-weight:
              500;

          }


          /* =================================================
             NEARBY SPOTS LIST
          ================================================= */

          .ns-nearby-list {

            position:
              absolute;

            right:
              20px;

            bottom:
              20px;

            width:
              380px;

            max-width:
              calc(100% - 40px);

            z-index:
              1000;

          }


          /* =================================================
             LOADING / ERROR
          ================================================= */

          .ns-message {

            position:
              absolute;

            top:
              140px;

            left:
              50%;

            transform:
              translateX(-50%);

            z-index:
              1200;

            background:
              white;

            border:
              1px solid rgba(20, 40, 45, 0.10);

            box-shadow:
              0 5px 20px rgba(0, 0, 0, 0.14);

            border-radius:
              13px;

            padding:
              10px 15px;

            color:
              #506164;

            font-size:
              12px;

          }


          /* =================================================
             TABLET
          ================================================= */

          @media (max-width: 900px) {

            .ns-location-status {

              display:
                none;

            }

            .ns-search {

              max-width:
                none;

            }

          }


          /* =================================================
             MOBILE
          ================================================= */

          @media (max-width: 767px) {

            .ns-topbar {

              top:
                10px;

              left:
                10px;

              right:
                10px;

              gap:
                7px;

            }


            .ns-logo {

              width:
                50px;

              height:
                50px;

              padding:
                0;

              justify-content:
                center;

            }


            .ns-logo-icon {

              width:
                27px;

              height:
                27px;

            }


            .ns-logo-title,
            .ns-logo-subtitle {

              display:
                none;

            }


            .ns-search {

              height:
                50px;

              border-radius:
                14px;

              padding:
                0 13px;

            }


            .ns-profile {

              width:
                50px;

              height:
                50px;

            }


            .ns-categories {

              top:
                70px;

              max-width:
                calc(100% - 20px);

              left:
                10px;

              right:
                10px;

              transform:
                none;

            }


            .ns-category {

              height:
                35px;

              padding:
                0 14px;

            }


            .ns-map-controls {

              left:
                12px;

              top:
                auto;

              bottom:
                155px;

              transform:
                none;

            }


            .ns-map-button {

              width:
                43px;

              height:
                43px;

            }


            .ns-radius {

              left:
                12px;

              bottom:
                14px;

            }


            .ns-spot-count {

              bottom:
                14px;

              font-size:
                10px;

            }


            .ns-nearby-list {

              left:
                12px;

              right:
                12px;

              bottom:
                67px;

              width:
                auto !important;

              max-width:
                none !important;

            }

          }


          /* =================================================
             VERY SMALL MOBILE
          ================================================= */

          @media (max-width: 480px) {

            .ns-spot-count {

              display:
                none;

            }


            .ns-radius-label {

              display:
                none;

            }


            .ns-message {

              top:
                118px;

            }

          }

        `}
      </style>


      {/* ======================================================
          FULL SCREEN MAP
      ====================================================== */}

      <div
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 1,
        }}
      >

        {mapLocation ? (

          <NearSpotMap
            location={mapLocation}
            userLocation={location}
            spots={spots}
          />

        ) : (

          <div
            className="d-flex align-items-center justify-content-center"
            style={{
              width: "100%",
              height: "100%",
              background: "#f5f7f7",
            }}
          >

            <div className="text-center">

              <div
                className="spinner-border"
                style={{
                  color: "#16cda5",
                }}
              />

              <div
                className="mt-2"
                style={{
                  color: "#687779",
                  fontSize: "13px",
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
      ====================================================== */}

      <div className="ns-topbar">

        {/* ==================================================
            LOGO
        ================================================== */}

        <div className="ns-floating ns-logo">

          <div className="ns-logo-icon">
            N
          </div>

          <div>

            <div className="ns-logo-title">
              Near
              <span>Spot</span>
            </div>

            <div className="ns-logo-subtitle">
              Discover hidden places
            </div>

          </div>

        </div>


        {/* ==================================================
            SEARCH
        ================================================== */}

        <div className="ns-floating ns-search">

          <PlaceSearch
            onLocationSelect={handlePlaceSelect}
          />

        </div>


        {/* ==================================================
            LOCATION STATUS
        ================================================== */}

        <div className="ns-floating ns-location-status">

          <span className="ns-location-dot" />

          Location active

        </div>


        {/* ==================================================
            PROFILE
        ================================================== */}

        <div className="ns-floating ns-profile">

          ◉

        </div>

      </div>


      {/* ======================================================
          CATEGORY FILTERS
      ====================================================== */}

      <div className="ns-categories">

        {categories.map((category, index) => (

          <button
            key={category}
            type="button"
            className={`
              ns-category
              ${index === 0 ? "active" : ""}
            `}
          >
            {category}
          </button>

        ))}

      </div>


      {/* ======================================================
          MAP CONTROLS
      ====================================================== */}

      <div className="ns-map-controls">

        {/* ==================================================
            MY LOCATION
        ================================================== */}

        <button
          type="button"
          className="ns-map-button"
          onClick={handleMyLocation}
          title="My location"
        >
          ◎
        </button>


        {/* ==================================================
            EXPLORE MAP
        ================================================== */}

        <button
          type="button"
          className="ns-map-button"
          title="Explore map"
        >
          ⌖
        </button>

      </div>


      {/* ======================================================
          RADIUS SELECTOR
      ====================================================== */}

      <div className="ns-floating ns-radius">

        <span className="ns-radius-label">
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
      ====================================================== */}

      <div className="ns-floating ns-spot-count">

        <span className="ns-count-number">
          {spots.length}
        </span>

        <span className="ns-count-text">
          hidden spots nearby
        </span>

      </div>


      {/* ======================================================
          NEARBY SPOTS LIST
      ====================================================== */}

      {!spotsLoading && !spotsError && (

        <div className="ns-nearby-list">

          <NearbySpotList
            spots={spots}
          />

        </div>

      )}


      {/* ======================================================
          SPOTS LOADING MESSAGE
      ====================================================== */}

      {spotsLoading && mapLocation && (

        <div className="ns-message">

          <div
            className="d-flex align-items-center gap-2"
          >

            <div
              className="spinner-border spinner-border-sm"
              style={{
                color: "#16cda5",
              }}
            />

            Loading nearby spots...

          </div>

        </div>

      )}


      {/* ======================================================
          SPOTS ERROR MESSAGE
      ====================================================== */}

      {spotsError && (

        <div
          className="ns-message"
          style={{
            color: "#b42335",
          }}
        >
          Unable to load nearby spots.
        </div>

      )}


      {/* ======================================================
          LOCATION LOADING MESSAGE
      ====================================================== */}

      {locationLoading && (

        <div className="ns-message">

          <div
            className="d-flex align-items-center gap-2"
          >

            <div
              className="spinner-border spinner-border-sm"
              style={{
                color: "#16cda5",
              }}
            />

            Getting your location...

          </div>

        </div>

      )}


      {/* ======================================================
          LOCATION ERROR
      ====================================================== */}

      {locationError && (

        <div
          className="ns-message"
          style={{
            color: "#b42335",
          }}
        >

          <div
            className="d-flex align-items-center gap-3"
          >

            <span>
              {locationError}
            </span>

            <button
              type="button"
              className="btn btn-sm btn-outline-secondary rounded-pill"
              onClick={handleMyLocation}
            >
              Retry
            </button>

          </div>

        </div>

      )}

    </div>
  );
}


// ============================================================
// EXPORT
// ============================================================

export default App;