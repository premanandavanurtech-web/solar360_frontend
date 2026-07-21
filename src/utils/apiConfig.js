const normalizeOrigin = (value) => (value || "").trim().replace(/\/+$/, "");

export const API_ORIGIN =
  normalizeOrigin(process.env.REACT_APP_API_URL) ||
  (process.env.NODE_ENV === "production"
    ? "https://vanurtech-solar-backend-1.onrender.com"
    : "https://vanurtech-solar-backend-1.onrender.com");

export const API_BASE_URL = `${API_ORIGIN}/api/v1`;

export const buildApiUrl = (endpoint = "") => {
  const normalizedEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  return `${API_BASE_URL}${normalizedEndpoint}`;
};
