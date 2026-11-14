import Constants from "expo-constants";
import { Platform } from "react-native";

export class ApiError extends Error {
  field?: string;
  status: number;

  constructor(message: string, status: number, field?: string) {
    super(message);
    this.status = status;
    this.field = field;
  }
}

let token: string | null = null;

export function setApiToken(value: string | null) {
  token = value;
}

export function apiBaseUrl() {
  const configured = process.env.EXPO_PUBLIC_API_URL?.trim().replace(/\/$/, "");
  if (configured && !/localhost|127\.0\.0\.1/.test(configured)) return configured;

  const host = Constants.expoConfig?.hostUri?.split(":")[0];
  if (host && host !== "localhost" && host !== "127.0.0.1") return `http://${host}:3000`;
  if (Platform.OS === "android") return "http://10.0.2.2:3000";
  return configured || "http://127.0.0.1:3000";
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  headers.set("Accept", "application/json");
  if (init?.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  let response: Response;
  try {
    response = await fetch(`${apiBaseUrl()}${path}`, { ...init, headers });
  } catch {
    throw new ApiError("The catalogue could not be reached. Check that the website is running.", 0);
  }

  const body = (await response.json().catch(() => null)) as { error?: string; field?: string } | null;
  if (!response.ok) throw new ApiError(body?.error || "Something went wrong.", response.status, body?.field);
  return body as T;
}

export type ProductCard = {
  id: string;
  name: string;
  brand: string;
  category: string;
  categorySlug: string;
  mrp: number;
  image: string;
  sku: string;
  price?: number;
};

export type ProductDetail = ProductCard & {
  description: string | null;
  specs: { label: string; value: string }[];
  displayRates: { label: string; formula: string; value: string | null }[];
  variants: {
    name: string;
    finish: string | null;
    size: string | null;
    image: string | null;
    mrp: string;
    points: string;
    price?: string | null;
  }[];
  related: ProductCard[];
};

export type Category = {
  id: string;
  slug: string;
  name: string;
  products: number;
  image: string;
};

export type Brand = {
  id: string;
  name: string;
  products: number;
  categories: string[];
  image: string;
};

export type Banner = {
  id: string;
  title: string;
  description: string | null;
  image: string | null;
  type: string;
};

export type Offer = {
  id: string;
  name: string;
  scope: string;
  type: string;
  startAt: string | null;
  endAt: string | null;
};

export type Catalogue = {
  id: string;
  name: string;
  slug: string;
  image: string | null;
  products: number;
  pdfUrl: string | null;
  viewUrl: string | null;
};

export type Company = {
  companyName: string;
  tagline: string;
  email: string;
  phone: string;
  website: string;
  address: string;
  logoUrl: string | null;
};

export type Account = {
  id: string;
  name: string;
  email: string | null;
  mobile: string;
  userType: "retailer" | "contractor" | "consumer";
  role: string;
  city: string | null;
  status: string;
  photoUrl: string | null;
  lastLoginAt: string | null;
  createdAt: string;
};

export type SessionPayload = {
  token: string;
  expiresAt: string;
  account: Account;
};
