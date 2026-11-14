import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import * as SecureStore from "expo-secure-store";
import { setApiToken } from "@/lib/api";

const TOKEN_KEY = "pvrd_token";

type SessionValue = {
  token: string | null;
  ready: boolean;
  signIn: (token: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const SessionContext = createContext<SessionValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    SecureStore.getItemAsync(TOKEN_KEY)
      .then((stored) => {
        setApiToken(stored);
        setToken(stored);
      })
      .finally(() => setReady(true));
  }, []);

  const value = useMemo<SessionValue>(
    () => ({
      token,
      ready,
      async signIn(next) {
        await SecureStore.setItemAsync(TOKEN_KEY, next);
        setApiToken(next);
        setToken(next);
      },
      async signOut() {
        await SecureStore.deleteItemAsync(TOKEN_KEY);
        setApiToken(null);
        setToken(null);
      },
    }),
    [ready, token],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const value = useContext(SessionContext);
  if (!value) throw new Error("Session is unavailable.");
  return value;
}
