const normalizeOrigin = (value) => (value || "").trim().replace(/\/+$/, "");

export const API_ORIGIN =
  normalizeOrigin(process.env.REACT_APP_API_URL) ||
  (process.env.NODE_ENV === "production"
    ? "http://localhost:9001"
    : "http://localhost:9001");

export const API_BASE_URL = `${API_ORIGIN}/api/v1`;

export const buildApiUrl = (endpoint = "") => {
  const normalizedEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  return `${API_BASE_URL}${normalizedEndpoint}`;
};
