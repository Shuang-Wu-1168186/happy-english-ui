import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { api } from "./api";
import type { Session, User } from "./api";
import { AuthContext } from "./auth-context";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [audioEnabled, setAudio] = useState(false);
  async function refresh() {
    const data = await api<Session>("/auth/session");
    setUser(data.user);
    setAudio(!!data.audio_enabled);
    setError("");
  }
  useEffect(() => {
    let active = true;
    api<Session>("/auth/session")
      .then((data) => {
        if (active) {
          setUser(data.user);
          setAudio(!!data.audio_enabled);
          setError("");
        }
      })
      .catch((e) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);
  async function login(username: string, password: string) {
    const data = await api<Session>("/auth/login", "POST", {
      username,
      password,
    });
    setUser(data.user);
  }
  async function logout() {
    await api("/auth/logout", "POST");
    setUser(null);
  }
  return (
    <AuthContext.Provider
      value={{ user, loading, error, audioEnabled, refresh, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}
