
import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

import api from "../services/api";

const AuthContext = createContext(null);

function getStoredToken() {
  return (
    localStorage.getItem("access_token") ||
    sessionStorage.getItem("access_token")
  );
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(getStoredToken);
  const [loading, setLoading] = useState(true);

  // Fetch the currently authenticated user.
  const fetchCurrentUser = async (token = accessToken) => {
    if (!token) {
      setUser(null);
      setLoading(false);
      return null;
    }

    try {
      const response = await api.get("/accounts/me/", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setUser(response.data);
      return response.data;
    } catch (error) {
      console.error("Failed to fetch current user:", error);

      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      sessionStorage.removeItem("access_token");
      sessionStorage.removeItem("refresh_token");

      setAccessToken(null);
      setUser(null);

      return null;
    } finally {
      setLoading(false);
    }
  };

  // Restore an existing session on app startup.
  useEffect(() => {
    if (accessToken) {
      fetchCurrentUser(accessToken);
    } else {
      setLoading(false);
    }

    // Run once when the provider mounts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Login with persistent or session-only storage.
  const login = async (email, password, rememberMe = false) => {
    const response = await api.post("/accounts/login/", {
      email: email.trim(),
      password,
    });

    const { access, refresh } = response.data;

    if (!access || !refresh) {
      throw new Error(
        "The login response did not contain valid tokens."
      );
    }

    // Clear previous tokens from both storage locations.
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    sessionStorage.removeItem("access_token");
    sessionStorage.removeItem("refresh_token");

    // Save tokens according to the Remember me selection.
    const storage = rememberMe ? localStorage : sessionStorage;

    storage.setItem("access_token", access);
    storage.setItem("refresh_token", refresh);

    setAccessToken(access);

    // Load the user's profile.
    const currentUser = await fetchCurrentUser(access);

    if (!currentUser) {
      throw new Error(
        "Login succeeded, but the user profile could not be loaded."
      );
    }

    return currentUser;
  };

  // Logout.
  const logout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    sessionStorage.removeItem("access_token");
    sessionStorage.removeItem("refresh_token");

    setAccessToken(null);
    setUser(null);
  };

  // Make authentication functions available to components.
  const value = {
    user,
    accessToken,
    loading,
    isAuthenticated: Boolean(accessToken && user),
    login,
    logout,
    fetchCurrentUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth must be used inside AuthProvider"
    );
  }

  return context;
}
