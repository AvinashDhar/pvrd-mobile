import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import { setApiToken } from "@/lib/api";

const TOKEN_KEY = "pvrd_token";

function webStorage() {
  if (typeof localStorage === "undefined") return null;
  return localStorage;
}

async function readToken() {
  try {
    if (Platform.OS === "web") return webStorage()?.getItem(TOKEN_KEY) ?? null;
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch {
    return null;
  }
}

async function writeToken(value: string) {
  if (Platform.OS === "web") {
    webStorage()?.setItem(TOKEN_KEY, value);
    return;
  }
  await SecureStore.setItemAsync(TOKEN_KEY, value);
}

async function clearToken() {
  if (Platform.OS === "web") {
    webStorage()?.removeItem(TOKEN_KEY);
    return;
  }
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

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
    readToken()
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
        await writeToken(next);
        setApiToken(next);
        setToken(next);
      },
      async signOut() {
        await clearToken();
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
