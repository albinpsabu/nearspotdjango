
import axios from "axios";

// ============================================================
// AXIOS API CONFIGURATION
// ============================================================

// Create one reusable Axios instance for all Django API calls.
//
// VITE_API_URL allows us to change the backend URL
// for development, testing, or production.
//
// Default backend:
// http://127.0.0.1:8000/api
const api = axios.create({
  baseURL:
    import.meta.env.VITE_API_URL ||
    "http://127.0.0.1:8000/api",

  headers: {
    Accept: "application/json",
  },

  // Maximum time to wait for a response.
  // Routing requests may take longer than normal CRUD requests.
  timeout: 30000,
});

// ============================================================
// REQUEST INTERCEPTOR — JWT AUTHENTICATION
// ============================================================

// This interceptor runs automatically before every API request.
//
// It retrieves the stored JWT access token and attaches it
// to the Authorization header.
//
// Example:
// Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
api.interceptors.request.use(
  (config) => {
    const token =
      localStorage.getItem("access_token") ||
      localStorage.getItem("access") ||
      localStorage.getItem("accessToken") ||
      sessionStorage.getItem("access_token") ||
      sessionStorage.getItem("access") ||
      sessionStorage.getItem("accessToken");

    // Attach JWT token if available.
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    } else {
      // Prevent sending an outdated Authorization header.
      delete config.headers.Authorization;
    }

    // ========================================================
    // FILE UPLOAD HANDLING
    // ========================================================

    // When uploading FormData, the browser/Axios should set
    // the multipart Content-Type and boundary automatically.
    if (config.data instanceof FormData) {
      delete config.headers["Content-Type"];
    }

    return config;
  },

  (error) => Promise.reject(error)
);

// ============================================================
// RESPONSE INTERCEPTOR — ERROR HANDLING
// ============================================================

// Return successful responses unchanged.
//
// Preserve rejected errors so individual components can
// display appropriate messages.
//
// We are not implementing automatic token refresh here,
// because it must match the existing NearSpot auth flow.
api.interceptors.response.use(
  (response) => response,

  (error) => {
    if (error.response?.status === 401) {
      console.warn(
        "Unauthorized request. Login or token refresh may be required."
      );
    }

    return Promise.reject(error);
  }
);

// ============================================================
// EXPORT
// ============================================================

export default api;
