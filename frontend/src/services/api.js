
import axios from "axios";

const api = axios.create({
  baseURL:
    import.meta.env.VITE_API_URL ||
    "http://127.0.0.1:8000/api",

  headers: {
    Accept: "application/json",
  },
});

// Attach JWT access token to authenticated requests.
api.interceptors.request.use(
  (config) => {
    const token =
      localStorage.getItem("access_token") ||
      localStorage.getItem("access") ||
      localStorage.getItem("accessToken") ||
      sessionStorage.getItem("access_token") ||
      sessionStorage.getItem("access") ||
      sessionStorage.getItem("accessToken");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    } else {
      delete config.headers.Authorization;
    }

    // Let Axios/browser set multipart boundaries for FormData.
    if (config.data instanceof FormData) {
      delete config.headers["Content-Type"];
    }

    return config;
  },
  (error) => Promise.reject(error)
);

export default api;
