"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useTheme } from "next-themes";
import { api } from "@/lib/api";
import type { AuthResponse, ThemePreference, User } from "@/lib/types";

interface RegisterInput {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

interface AuthContextValue {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  updateUser: (user: User) => void;
  changeTheme: (theme: ThemePreference) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setTheme } = useTheme();
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const clearSession = useCallback(() => {
    window.localStorage.removeItem("plann_token");
    setTheme("system");
    setToken(null);
    setUser(null);
  }, [setTheme]);

  useEffect(() => {
    async function hydrateSession() {
      await Promise.resolve();
      const storedToken = window.localStorage.getItem("plann_token");
      if (!storedToken) {
        setIsLoading(false);
        return;
      }

      setToken(storedToken);
      try {
        const { data } = await api.get<User>("/users/me");
        setUser(data);
      } catch {
        clearSession();
      } finally {
        setIsLoading(false);
      }
    }

    void hydrateSession();
  }, [clearSession]);

  useEffect(() => {
    if (user?.theme) setTheme(user.theme);
  }, [setTheme, user?.theme]);

  const saveSession = useCallback((response: AuthResponse) => {
    window.localStorage.setItem("plann_token", response.token);
    setToken(response.token);
    setUser(response.user);
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const { data } = await api.post<AuthResponse>("/auth/login", {
        email,
        password,
      });
      saveSession(data);
    },
    [saveSession],
  );

  const register = useCallback(
    async (input: RegisterInput) => {
      const { data } = await api.post<AuthResponse>("/auth/register", input);
      saveSession(data);
    },
    [saveSession],
  );

  const updateUser = useCallback((nextUser: User) => {
    setUser(nextUser);
  }, []);

  const changeTheme = useCallback(
    async (theme: ThemePreference) => {
      const previousTheme = user?.theme ?? "system";
      setTheme(theme);
      setUser((current) => (current ? { ...current, theme } : current));

      try {
        const { data } = await api.patch<User>("/users/theme", { theme });
        setUser(data);
      } catch (error) {
        setTheme(previousTheme);
        setUser((current) =>
          current ? { ...current, theme: previousTheme } : current,
        );
        throw error;
      }
    },
    [setTheme, user?.theme],
  );

  const value = useMemo(
    () => ({
      user,
      token,
      isLoading,
      login,
      register,
      updateUser,
      changeTheme,
      logout: clearSession,
    }),
    [
      user,
      token,
      isLoading,
      login,
      register,
      updateUser,
      changeTheme,
      clearSession,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
}
