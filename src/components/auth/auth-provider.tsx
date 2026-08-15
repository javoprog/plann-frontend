"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { api } from "@/lib/api";
import type { AuthResponse, User } from "@/lib/types";

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
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const clearSession = useCallback(() => {
    window.localStorage.removeItem("plann_token");
    setToken(null);
    setUser(null);
  }, []);

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
        const { data } = await api.get<User>("/auth/me");
        setUser(data);
      } catch {
        clearSession();
      } finally {
        setIsLoading(false);
      }
    }

    void hydrateSession();
  }, [clearSession]);

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

  const value = useMemo(
    () => ({ user, token, isLoading, login, register, logout: clearSession }),
    [user, token, isLoading, login, register, clearSession],
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
