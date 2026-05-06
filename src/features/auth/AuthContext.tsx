import { useQuery } from "@tanstack/react-query";
import { createContext, type ReactNode } from "react";
import { $getSession } from "./server";
import type { UserSession } from "./types";

interface AuthContextValue {
  session: UserSession | undefined;
  isLoading: boolean;
  error: Error | null;
}

export const AuthContext = createContext<AuthContextValue | undefined>(
  undefined,
);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const {
    data: session,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["auth", "session"],
    queryFn: () => $getSession(),
    staleTime: Number.POSITIVE_INFINITY, // Session doesn't change during app lifetime
  });

  return (
    <AuthContext.Provider value={{ session, isLoading, error }}>
      {children}
    </AuthContext.Provider>
  );
}
