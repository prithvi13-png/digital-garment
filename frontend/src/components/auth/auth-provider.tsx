"use client";

import { useRouter } from "next/navigation";
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { AUTH_CLEARED_EVENT, clearTokens, getTokens, setTokens } from "@/lib/auth-storage";
import { ROLE_HOME_PATH } from "@/lib/constants";
import { getMe, login } from "@/services/auth";
import { Role, User } from "@/types/api";

type AuthContextValue = {
  user: User | null;
  isAuthenticated: boolean;
  isBootstrapping: boolean;
  signIn: (username: string, password: string) => Promise<void>;
  signOut: () => void;
  refreshMe: () => Promise<void>;
  hasRole: (...roles: Role[]) => boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);

  const refreshMe = useCallback(async () => {
    const currentUser = await getMe();
    setUser(currentUser);
  }, []);

  useEffect(() => {
    async function bootstrap() {
      const tokens = getTokens();
      if (!tokens) {
        setIsBootstrapping(false);
        return;
      }

      try {
        await refreshMe();
      } catch {
        clearTokens();
        setUser(null);
      } finally {
        setIsBootstrapping(false);
      }
    }

    bootstrap();
  }, [refreshMe]);

  useEffect(() => {
    function handleAuthCleared() {
      setUser(null);
      router.replace("/login");
    }

    window.addEventListener(AUTH_CLEARED_EVENT, handleAuthCleared);
    return () => {
      window.removeEventListener(AUTH_CLEARED_EVENT, handleAuthCleared);
    };
  }, [router]);

  const signIn = useCallback(
    async (username: string, password: string) => {
      const response = await login({ username, password });
      setTokens({ access: response.access, refresh: response.refresh });
      setUser(response.user);
      router.replace(ROLE_HOME_PATH[response.user.role]);
    },
    [router],
  );

  const signOut = useCallback(() => {
    clearTokens();
    setUser(null);
    router.replace("/login");
  }, [router]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isBootstrapping,
      signIn,
      signOut,
      refreshMe,
      hasRole: (...roles: Role[]) => (user ? roles.includes(user.role) : false),
    }),
    [isBootstrapping, refreshMe, signIn, signOut, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
