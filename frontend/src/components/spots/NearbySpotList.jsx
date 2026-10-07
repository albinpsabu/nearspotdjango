// ============================================================
// NEARBY SPOT LIST
// Displays nearby spots with images and details
// ============================================================

function NearbySpotList({ spots }) {

  // ============================================================
  // FORMAT DISTANCE
  // ============================================================

  const formatDistance = (meters) => {
    if (meters === undefined || meters === null) {
      return "";
    }

    if (meters < 1000) {
      return `${Math.round(meters)} m away`;
    }

    return `${(meters / 1000).toFixed(1)} km away`;
  };


  // ============================================================
  // GET SPOT IMAGE
  // Backend structure:
  //
  // media: [
  //   {
  //     id,
  //     media_type,
  //     url,
  //     uploaded_at
  //   }
  // ]
  // ============================================================

  const getSpotImage = (spot) => {

    if (
      !spot.media ||
      !Array.isArray(spot.media) ||
      spot.media.length === 0
    ) {
      return null;
    }

    const imageMedia = spot.media.find(
      (media) => media.media_type === "IMAGE"
    );

    return imageMedia?.url || null;
  };


  // ============================================================
  // EMPTY STATE
  // ============================================================

  if (!spots || spots.length === 0) {
    return (
      <div
        style={{
          width: "100%",
          background: "#ffffff",
          borderRadius: "18px",
          padding: "20px",
          boxShadow: "0 8px 30px rgba(0,0,0,0.14)",
        }}
      >
        <div
          style={{
            color: "#10bfa0",
            fontSize: "11px",
            fontWeight: 800,
            letterSpacing: "0.7px",
          }}
        >
          NEARBY SPOTS
        </div>

        <div
          style={{
            marginTop: "5px",
            color: "#1f2d30",
            fontSize: "18px",
            fontWeight: 800,
          }}
        >
          No spots found
        </div>

        <div
          style={{
            marginTop: "6px",
            color: "#748285",
            fontSize: "12px",
          }}
        >
          Try increasing your search radius.
        </div>
      </div>
    );
  }


  // ============================================================
  // MAIN LIST
  // ============================================================

  return (
    <div
      style={{
        width: "100%",
        background: "#ffffff",
        borderRadius: "18px",
        boxShadow: "0 8px 30px rgba(0,0,0,0.14)",
        overflow: "hidden",
      }}
    >

      {/* ======================================================
          HEADER
      ====================================================== */}

      <div
        style={{
          padding: "17px 20px",
          borderBottom:
            "1px solid rgba(20,40,45,0.08)",
        }}
      >
        <div
          style={{
            color: "#10bfa0",
            fontSize: "11px",
            fontWeight: 800,
            letterSpacing: "0.7px",
          }}
        >
          NEARBY SPOTS
        </div>

        <div
          style={{
            marginTop: "4px",
            color: "#1f2d30",
            fontSize: "19px",
            fontWeight: 800,
          }}
        >
          {spots.length}{" "}
          {spots.length === 1 ? "spot" : "spots"} nearby
        </div>
      </div>


      {/* ======================================================
          SCROLLABLE SPOT LIST
      ====================================================== */}

      <div
        style={{
          maxHeight: "430px",
          overflowY: "auto",
        }}
      >

        {spots.map((spot) => {

          const imageUrl = getSpotImage(spot);

          return (
            <div
              key={spot.id}
              style={{
                padding: "15px",
                borderBottom:
                  "1px solid rgba(20,40,45,0.08)",
                background: "#ffffff",
              }}
            >

              {/* ==================================================
                  IMAGE
              ================================================== */}

              {imageUrl ? (

                <img
                  src={imageUrl}
                  alt={spot.name}
                  style={{
                    width: "100%",
                    height: "150px",
                    objectFit: "cover",
                    borderRadius: "12px",
                    display: "block",
                  }}
                  onError={(event) => {
                    event.currentTarget.style.display = "none";
                  }}
                />

              ) : (

                <div
                  style={{
                    width: "100%",
                    height: "110px",
                    borderRadius: "12px",
                    background:
                      "linear-gradient(135deg, #e9f8f4, #f3f7f7)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#8a999b",
                    fontSize: "12px",
                    fontWeight: 600,
                  }}
                >
                  No image available
                </div>

              )}


              {/* ==================================================
                  SPOT INFORMATION
              ================================================== */}

              <div
                style={{
                  marginTop: "12px",
                }}
              >

                {/* ==================================================
                    NAME + DISTANCE
                ================================================== */}

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: "10px",
                  }}
                >

                  <div
                    style={{
                      flex: 1,
                      minWidth: 0,
                    }}
                  >

                    <div
                      style={{
                        color: "#1f2d30",
                        fontSize: "15px",
                        fontWeight: 800,
                        lineHeight: "1.35",
                      }}
                    >
                      {spot.name}
                    </div>


                    {/* ==================================================
                        CATEGORY
                    ================================================== */}

                    <div
                      style={{
                        marginTop: "5px",
                        color: "#10bfa0",
                        fontSize: "12px",
                        fontWeight: 700,
                      }}
                    >
                      {spot.category_name || "Hidden Spot"}
                    </div>

                  </div>


                  {/* ==================================================
                      DISTANCE
                  ================================================== */}

                  <div
                    style={{
                      flexShrink: 0,
                      color: "#526164",
                      fontSize: "11px",
                      fontWeight: 700,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {formatDistance(
                      spot.distance_meters
                    )}
                  </div>

                </div>


                {/* ==================================================
                    DESCRIPTION
                ================================================== */}

                {spot.description && (
                  <div
                    style={{
                      marginTop: "9px",
                      color: "#748285",
                      fontSize: "12px",
                      lineHeight: "1.5",
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {spot.description}
                  </div>
                )}


                {/* ==================================================
                    MEDIA COUNT
                ================================================== */}

                {spot.media &&
                  spot.media.length > 0 && (
                    <div
                      style={{
                        marginTop: "8px",
                        color: "#7a888a",
                        fontSize: "11px",
                        fontWeight: 600,
                      }}
                    >
                      {spot.media.length}{" "}
                      {spot.media.length === 1
                        ? "image"
                        : "images"}
                    </div>
                  )}


                {/* ==================================================
                    VIEW DETAILS
                ================================================== */}

                <div
                  style={{
                    marginTop: "12px",
                    color: "#0aaa87",
                    fontSize: "11px",
                    fontWeight: 700,
                  }}
                >
                  View Details →
                </div>

              </div>

            </div>
          );
        })}

      </div>

    </div>
  );
}


// ============================================================
// EXPORT
// ============================================================

export default NearbySpotList;