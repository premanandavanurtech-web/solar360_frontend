import { API_ORIGIN, KNOWN_API_HOSTS } from "./apiConfig";

const BACKEND_ORIGIN = API_ORIGIN;
const KNOWN_BACKEND_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "::1",
  "10.0.2.2",
  ...KNOWN_API_HOSTS,
]);

const isBackendHost = (hostname) => {
  if (!hostname) return false;
  if (KNOWN_BACKEND_HOSTS.has(hostname)) return true;
  if (hostname.endsWith("onrender.com")) return true;
  if (/^192\.168\.\d+\.\d+$/.test(hostname)) return true;
  if (/^10\.\d+\.\d+\.\d+$/.test(hostname)) return true;
  if (/^172\.(1[6-9]|2\d|3[01])\.\d+\.\d+$/.test(hostname)) return true;
  return false;
};

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
      const pathname = parsedUrl.pathname.replace(/^\/?api\/v1(?=\/)/i, "");
      if (isBackendHost(parsedUrl.hostname)) {
        // If URL is an external HTTPS URL (e.g. onrender.com) and local dev server doesn't host it, keep remote URL
        const isLocalDev = /localhost|127\.0\.0\.1/i.test(BACKEND_ORIGIN);
        const isRemoteHost = !/localhost|127\.0\.0\.1/i.test(parsedUrl.hostname);
        if (isLocalDev && isRemoteHost) {
          return parsedUrl.toString();
        }
        const publicPath = pathname.startsWith("/uploads/")
          ? `/public${pathname}`
          : pathname;
        return `${BACKEND_ORIGIN}${publicPath}`;
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
