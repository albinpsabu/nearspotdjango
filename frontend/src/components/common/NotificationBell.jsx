
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import useNotifications from "../../hooks/useNotifications";

function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);

  // Used to navigate to the appropriate page when a notification is clicked.
  const navigate = useNavigate();

  const {
    notifications,
    unreadCount,
    connectionStatus,
    error,
    markAsRead,
    markAllAsRead,
    clearNotifications,
  } = useNotifications();

  // Return the appropriate icon for each notification type.
  const getIcon = (type) => {
    if (type === "spot.pending") return "bi-clipboard-check";
    if (type === "spot.approved") return "bi-check-circle";
    if (type === "spot.rejected") return "bi-x-circle";
    return "bi-bell";
  };

  // Return the appropriate color for each notification type.
  const getStatusColor = (type) => {
    if (type === "spot.pending") return "#b7791f";
    if (type === "spot.approved") return "#16845b";
    if (type === "spot.rejected") return "#c53030";
    return "#526366";
  };

  // Format the notification timestamp for display.
  const formatTime = (value) => {
    if (!value) return "";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "";

    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Handle a click on an individual notification.
  const handleNotificationClick = async (notification) => {
    // Mark the notification as read in the backend.
    // This does not approve, reject, or delete the spot.
    try {
      await markAsRead(notification.id);
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    }

    // Close the dropdown before navigating.
    setIsOpen(false);

    // Spot status notifications take the user to their submissions.
    // The submissions page fetches the latest spot data from Django.
    if (
      notification.type === "spot.pending" ||
      notification.type === "spot.approved" ||
      notification.type === "spot.rejected"
    ) {
      navigate("/user/submissions");
    }
  };

  return (
    <div className="position-relative">
      {/* =====================================================
          NOTIFICATION BELL AND UNREAD COUNT
      ====================================================== */}
      <button
        type="button"
        className="btn border rounded-3 d-flex align-items-center justify-content-center position-relative"
        onClick={() => setIsOpen((previous) => !previous)}
        aria-label={`Notifications, ${unreadCount} unread`}
        aria-expanded={isOpen}
        title="Notifications"
        style={{
          width: "42px",
          height: "42px",
          backgroundColor: "#ffffff",
          color: "#26373a",
          borderColor: "#e5ecea",
        }}
      >
        <i
          className="bi bi-bell"
          aria-hidden="true"
          style={{ fontSize: "19px" }}
        />

        {/* Show the unread count only when unread notifications exist. */}
        {unreadCount > 0 && (
          <span
            className="position-absolute top-0 start-100 translate-middle badge rounded-pill"
            style={{
              backgroundColor: "#e5484d",
              fontSize: "10px",
              minWidth: "19px",
            }}
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* =====================================================
          NOTIFICATION DROPDOWN
      ====================================================== */}
      {isOpen && (
        <>
          {/* Transparent overlay closes the dropdown when clicked. */}
          <button
            type="button"
            aria-label="Close notifications"
            className="position-fixed border-0 p-0"
            onClick={() => setIsOpen(false)}
            style={{
              inset: 0,
              background: "transparent",
              zIndex: 1040,
              cursor: "default",
            }}
          />

          <div
            className="position-absolute end-0 mt-2 bg-white border rounded-4 shadow"
            style={{
              width: "min(360px, calc(100vw - 32px))",
              maxHeight: "440px",
              overflowY: "auto",
              zIndex: 1050,
              borderColor: "#e5ecea",
            }}
          >
            {/* Header and WebSocket connection status. */}
            <div className="d-flex align-items-center justify-content-between p-3 border-bottom">
              <div>
                <div
                  className="fw-bold"
                  style={{ color: "#26373a", fontSize: "15px" }}
                >
                  Notifications
                </div>

                <div
                  className="mt-1"
                  style={{ color: "#8a989a", fontSize: "11px" }}
                >
                  {connectionStatus === "connected"
                    ? "Live updates connected"
                    : connectionStatus === "connecting"
                    ? "Connecting..."
                    : "Not connected"}
                </div>
              </div>

              {/* Connection indicator. */}
              <span
                className="rounded-circle"
                title={connectionStatus}
                style={{
                  width: "8px",
                  height: "8px",
                  backgroundColor:
                    connectionStatus === "connected"
                      ? "#20cfa7"
                      : connectionStatus === "connecting"
                      ? "#d69e2e"
                      : "#a0aec0",
                }}
              />
            </div>

            {/* Bulk notification actions. */}
            {notifications.length > 0 && (
              <div className="d-flex justify-content-between px-3 py-2 border-bottom">
                <button
                  type="button"
                  className="btn btn-link p-0 text-decoration-none"
                  onClick={markAllAsRead}
                  style={{ fontSize: "11px" }}
                >
                  Mark all read
                </button>

                <button
                  type="button"
                  className="btn btn-link p-0 text-decoration-none text-danger"
                  onClick={clearNotifications}
                  style={{ fontSize: "11px" }}
                >
                  Clear all
                </button>
              </div>
            )}

            {/* Display backend or connection errors when present. */}
            {error && (
              <div
                className="px-3 py-2"
                role="status"
                style={{ color: "#b42335", fontSize: "12px" }}
              >
                {error}
              </div>
            )}

            {/* Empty state or notification list. */}
            {notifications.length === 0 ? (
              <div className="text-center px-3 py-5">
                <i
                  className="bi bi-bell"
                  aria-hidden="true"
                  style={{ fontSize: "28px", color: "#a0aeaf" }}
                />

                <div
                  className="mt-2 fw-semibold"
                  style={{ color: "#526366", fontSize: "13px" }}
                >
                  No notifications yet
                </div>

                <div
                  className="mt-1"
                  style={{ color: "#8a989a", fontSize: "11px" }}
                >
                  Spot updates will appear here.
                </div>
              </div>
            ) : (
              notifications.map((notification) => (
                <button
                  key={notification.id}
                  type="button"
                  className="w-100 text-start border-0 border-bottom px-3 py-3"
                  onClick={() =>
                    handleNotificationClick(notification)
                  }
                  style={{
                    backgroundColor: notification.read
                      ? "#ffffff"
                      : "#f0fbf8",
                    cursor: "pointer",
                  }}
                >
                  <div className="d-flex align-items-start gap-3">
                    {/* Icon for the notification type. */}
                    <div
                      className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
                      style={{
                        width: "36px",
                        height: "36px",
                        backgroundColor: "#f5f8f7",
                        color: getStatusColor(notification.type),
                      }}
                    >
                      <i
                        className={`bi ${getIcon(notification.type)}`}
                        aria-hidden="true"
                      />
                    </div>

                    {/* Notification title, message, and timestamp. */}
                    <div className="flex-grow-1" style={{ minWidth: 0 }}>
                      <div className="d-flex align-items-start justify-content-between gap-2">
                        <span
                          className="fw-semibold"
                          style={{
                            color: "#26373a",
                            fontSize: "12px",
                          }}
                        >
                          {notification.title ||
                            notification.name ||
                            "Spot update"}
                        </span>

                        {/* Unread indicator. */}
                        {!notification.read && (
                          <span
                            className="rounded-circle flex-shrink-0 mt-1"
                            style={{
                              width: "7px",
                              height: "7px",
                              backgroundColor: "#20cfa7",
                            }}
                          />
                        )}
                      </div>

                      <div
                        className="mt-1"
                        style={{
                          color: "#647477",
                          fontSize: "11px",
                          lineHeight: 1.5,
                        }}
                      >
                        {notification.message}
                      </div>

                      {/* Show the rejection reason when supplied. */}
                      {notification.rejection_reason && (
                        <div
                          className="mt-1"
                          style={{
                            color: "#b42335",
                            fontSize: "11px",
                          }}
                        >
                          Reason: {notification.rejection_reason}
                        </div>
                      )}

                      <div
                        className="mt-2"
                        style={{
                          color: "#98a4a5",
                          fontSize: "10px",
                        }}
                      >
                        {formatTime(
                          notification.created_at ||
                            notification.receivedAt
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default NotificationBell;
