
import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import UserLoginForm from "./UserLoginForm";
import UserRegisterForm from "./UserRegisterForm";

export default function UserLoginModal({ isOpen, onClose }) {
  const { isAuthenticated } = useAuth();
  const [showRegister, setShowRegister] = useState(false);

  // Close modal using Escape and prevent background scrolling.
  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;

    const handleEscape = (e) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen, onClose]);

  // Close modal after successful authentication.
  useEffect(() => {
    if (isAuthenticated && isOpen) {
      onClose();
      setShowRegister(false);
    }
  }, [isAuthenticated, isOpen, onClose]);

  // Reset to login form when modal closes.
  useEffect(() => {
    if (!isOpen) {
      setShowRegister(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="modal d-block"
      role="dialog"
      aria-modal="true"
      aria-labelledby="nearspot-auth-title"
      tabIndex="-1"
      style={{
        zIndex: 1055,
        backgroundColor: "rgba(0, 0, 0, 0.45)",
        backdropFilter: "blur(4px)",
        overflowY: "auto",
      }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-dialog modal-dialog-centered px-3">
        <div
          className="modal-content border-0 rounded-4 shadow-lg position-relative"
          style={{
            animation: "nearspotModalFadeIn 0.2s ease-out",
          }}
        >
          {/* Close button */}
          <button
            type="button"
            className="btn btn-light rounded-circle position-absolute d-flex align-items-center justify-content-center"
            style={{
              top: "14px",
              right: "14px",
              width: "36px",
              height: "36px",
              zIndex: 2,
              color: "#7c8b8e",
              backgroundColor: "#f5f8f7",
              border: "none",
            }}
            onClick={onClose}
            aria-label="Close login modal"
          >
            <i className="bi bi-x-lg"></i>
          </button>

          {/* Brand header */}
          <div className="text-center pt-4 px-4">
            <div
              className="d-inline-flex align-items-center justify-content-center rounded-4 mb-3"
              style={{
                width: "54px",
                height: "54px",
                backgroundColor: "#e0f8f1",
                color: "#087f68",
                fontSize: "1.5rem",
              }}
            >
              <i className="bi bi-geo-alt-fill"></i>
            </div>

            <div
              className="fw-bold fs-4 mb-1"
              id="nearspot-auth-title"
              style={{ color: "#1d2b2e" }}
            >
              <span style={{ color: "#20cfa7" }}>Near</span>Spot
            </div>

            <p className="small mb-0" style={{ color: "#7c8b8e" }}>
              {showRegister
                ? "Create an account to discover hidden places"
                : "Discover amazing places near you"}
            </p>
          </div>

          {/* Login / Register forms */}
          <div className="p-4 pt-3">
            {showRegister ? (
              <UserRegisterForm
                onSwitchToLogin={() => setShowRegister(false)}
              />
            ) : (
              <UserLoginForm
                onSwitchToRegister={() => setShowRegister(true)}
              />
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes nearspotModalFadeIn {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .modal-content {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}
