
import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import UserRegisterForm from "./UserRegisterForm";
import UserLoginForm from "./UserLoginForm";

export default function UserRegisterModal({ isOpen, onClose }) {
  const { isAuthenticated } = useAuth();
  const [showLogin, setShowLogin] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    const previousOverflow = document.body.style.overflow;

    document.addEventListener("keydown", handleEscape);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isAuthenticated && isOpen) {
      onClose();
      setShowLogin(false);
    }
  }, [isAuthenticated, isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) {
      setShowLogin(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center p-3"
      style={{ zIndex: 1055 }}
      role="dialog"
      aria-modal="true"
      aria-label={showLogin ? "Login to NearSpot" : "Register for NearSpot"}
    >
      {/* Backdrop */}
      <div
        className="position-absolute top-0 start-0 w-100 h-100"
        onClick={onClose}
        aria-hidden="true"
        style={{
          backgroundColor: "rgba(15, 30, 28, 0.55)",
          backdropFilter: "blur(4px)",
        }}
      />

      {/* Modal Content */}
      <div
        className="position-relative bg-white rounded-4 shadow-lg w-100 p-4 p-md-5"
        style={{
          maxWidth: "460px",
          maxHeight: "90vh",
          overflowY: "auto",
          animation: "nearSpotModalIn 0.2s ease-out",
        }}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="btn btn-light border-0 rounded-circle position-absolute d-flex align-items-center justify-content-center"
          aria-label="Close modal"
          style={{
            top: "16px",
            right: "16px",
            width: "36px",
            height: "36px",
            color: "#687779",
            fontSize: "20px",
          }}
        >
          <i className="bi bi-x-lg" aria-hidden="true" />
        </button>

        {/* Brand */}
        <div className="text-center mb-4">
          <div
            className="rounded-circle d-flex align-items-center justify-content-center mx-auto mb-3 text-white fw-bold"
            style={{
              width: "52px",
              height: "52px",
              backgroundColor: "#20cfa7",
              fontSize: "23px",
              boxShadow: "0 4px 12px rgba(32, 207, 167, 0.2)",
            }}
          >
            N
          </div>

          <h4 className="fw-bold mb-1" style={{ color: "#1d2b2e" }}>
            Near<span style={{ color: "#12b995" }}>Spot</span>
          </h4>

          <p className="small mb-0" style={{ color: "#7c8b8e" }}>
            {showLogin
              ? "Welcome back. Sign in to continue."
              : "Discover and share hidden places."}
          </p>
        </div>

        {/* Login / Registration Form */}
        {showLogin ? (
          <UserLoginForm
            onSwitchToRegister={() => setShowLogin(false)}
          />
        ) : (
          <UserRegisterForm
            onSwitchToLogin={() => setShowLogin(true)}
          />
        )}
      </div>

      <style>{`
        @keyframes nearSpotModalIn {
          from {
            opacity: 0;
            transform: translateY(8px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .nearspot-modal-content {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}
