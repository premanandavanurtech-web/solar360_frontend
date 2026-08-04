import { API_ORIGIN } from "./apiConfig";

const BACKEND_ORIGIN = API_ORIGIN;
const LOCAL_BACKEND_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

export const toBackendAssetUrl = (value) => {
  if (!value || typeof value !== "string") return "";

  const trimmedValue = value.trim().replace(/\\/g, "/");
  if (!trimmedValue) return "";

  if (/^(data|blob):/i.test(trimmedValue)) {
    return trimmedValue;
  }

  if (/^https?:\/\//i.test(trimmedValue)) {
    try {
      const parsedUrl = new URL(trimmedValue.replace("/public/public/", "/public/"));
      if (LOCAL_BACKEND_HOSTS.has(parsedUrl.hostname)) {
        return `${BACKEND_ORIGIN}${parsedUrl.pathname}`;
      }
      return parsedUrl.toString();
    } catch {
      return trimmedValue.replace("/public/public/", "/public/");
    }
  }

  const normalizedValue = trimmedValue
    .replace(/^\/?api\/v1(?=\/)/i, "")
    .replace("/public/public/", "/public/");

  if (normalizedValue.startsWith("/public/")) {
    return `${BACKEND_ORIGIN}${normalizedValue}`;
  }

  if (normalizedValue.startsWith("/uploads/")) {
    return `${BACKEND_ORIGIN}/public${normalizedValue}`;
  }

  if (normalizedValue.startsWith("/")) {
    return `${BACKEND_ORIGIN}${normalizedValue}`;
  }

  const cleanValue = normalizedValue.replace(/^\/+/, "");

  if (cleanValue.startsWith("public/")) {
    return `${BACKEND_ORIGIN}/${cleanValue}`;
  }

  if (cleanValue.startsWith("uploads/")) {
    return `${BACKEND_ORIGIN}/public/${cleanValue}`;
  }

  return `${BACKEND_ORIGIN}/public/${cleanValue}`;
};
