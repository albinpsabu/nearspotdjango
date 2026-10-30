
import {
  createContext,
  useCallback,
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

function clearStoredTokens() {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
  sessionStorage.removeItem("access_token");
  sessionStorage.removeItem("refresh_token");
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(getStoredToken);
  const [loading, setLoading] = useState(true);

  const fetchCurrentUser = useCallback(
    async (token = accessToken) => {
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
        // Only clear the session if the server rejects authentication.
        // A temporary network/server error should not log the user out.
        if (error.response?.status === 401) {
          clearStoredTokens();
          setAccessToken(null);
          setUser(null);
        } else {
          console.error("Failed to refresh user profile:", error);
        }

        return null;
      } finally {
        setLoading(false);
      }
    },
    [accessToken]
  );

  const refreshUser = useCallback(() => {
    return fetchCurrentUser();
  }, [fetchCurrentUser]);

  // Load the current user on initial mount or after the token changes.
  useEffect(() => {
    if (accessToken) {
      setLoading(true);
      fetchCurrentUser(accessToken);
    } else {
      setUser(null);
      setLoading(false);
    }
  }, [accessToken, fetchCurrentUser]);

  // Refresh permissions periodically and when the tab becomes active.
  useEffect(() => {
    if (!accessToken) return undefined;

    const refreshPermissions = () => {
      if (document.visibilityState === "visible") {
        refreshUser();
      }
    };

    const intervalId = window.setInterval(refreshPermissions, 30000);

    document.addEventListener("visibilitychange", refreshPermissions);
    window.addEventListener("focus", refreshPermissions);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", refreshPermissions);
      window.removeEventListener("focus", refreshPermissions);
    };
  }, [accessToken, refreshUser]);

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

    clearStoredTokens();

    const storage = rememberMe ? localStorage : sessionStorage;
    storage.setItem("access_token", access);
    storage.setItem("refresh_token", refresh);

    setLoading(true);
    setAccessToken(access);

    // Fetch the profile using the new token immediately.
    const profileResponse = await api.get("/accounts/me/", {
      headers: {
        Authorization: `Bearer ${access}`,
      },
    });

    setUser(profileResponse.data);
    setLoading(false);

    return profileResponse.data;
  };

  const register = async (name, email, password) => {
    const response = await api.post("/accounts/register/", {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password,
    });

    return response.data;
  };

  const logout = () => {
    clearStoredTokens();
    setAccessToken(null);
    setUser(null);
    setLoading(false);
  };

  const value = {
    user,
    accessToken,
    loading,
    isAuthenticated: Boolean(accessToken && user),
    login,
    register,
    logout,
    fetchCurrentUser,
    refreshUser,
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
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}
