import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

import api from "../services/api";

// ============================================================
// AUTHENTICATION CONTEXT
// ============================================================

const AuthContext = createContext(null);

// ============================================================
// AUTH PROVIDER
// ============================================================

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(
    localStorage.getItem("access_token")
  );
  const [loading, setLoading] = useState(true);

  // ============================================================
  // GET CURRENT USER
  // ============================================================

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
      console.error(
        "Failed to fetch current user:",
        error
      );

      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");

      setAccessToken(null);
      setUser(null);

      return null;
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // CHECK EXISTING LOGIN
  // ============================================================

  useEffect(() => {
    if (accessToken) {
      fetchCurrentUser(accessToken);
    } else {
      setLoading(false);
    }
  }, []);

  // ============================================================
  // LOGIN
  // ============================================================

  const login = async (email, password) => {
    const response = await api.post(
      "/accounts/login/",
      {
        email,
        password,
      }
    );

    const {
      access,
      refresh,
    } = response.data;

    // ============================================================
    // STORE TOKENS
    // ============================================================

    localStorage.setItem(
      "access_token",
      access
    );

    localStorage.setItem(
      "refresh_token",
      refresh
    );

    setAccessToken(access);

    // ============================================================
    // FETCH USER PROFILE
    // ============================================================

    const currentUser = await fetchCurrentUser(
      access
    );

    return currentUser;
  };

  // ============================================================
  // LOGOUT
  // ============================================================

  const logout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");

    setAccessToken(null);
    setUser(null);
  };

  // ============================================================
  // AUTH CONTEXT VALUE
  // ============================================================

  const value = {
    user,
    accessToken,
    loading,
    isAuthenticated: Boolean(accessToken && user),
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// ============================================================
// AUTH HOOK
// ============================================================

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth must be used inside AuthProvider"
    );
  }

  return context;
}