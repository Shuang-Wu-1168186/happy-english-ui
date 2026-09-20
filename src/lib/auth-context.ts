import { createContext, useContext } from "react";
import type { User } from "./api";
export const AuthContext = createContext<{
  user: User | null;
  loading: boolean;
  error: string;
  audioEnabled: boolean;
  refresh: () => Promise<void>;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
} | null>(null);
export function useAuth() {
  const auth = useContext(AuthContext);
  if (!auth) throw new Error("AuthProvider missing");
  return auth;
}
