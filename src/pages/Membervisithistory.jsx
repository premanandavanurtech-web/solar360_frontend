// pages/MemberVisitHistory.jsx
import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  Box, Typography, Button, Chip, IconButton, Tooltip, alpha,
  useTheme, useMediaQuery, CircularProgress, Alert, Skeleton,
  SwipeableDrawer, Badge, Checkbox, FormControlLabel, Avatar,
  Slider, ButtonBase,
} from "@mui/material";
import {
  LocationOn, Refresh, MyLocation, FilterList,
  CheckCircle, AccessTime, Route, Timer, Close,
  Fullscreen, FullscreenExit,
  Store, PhotoCamera,
  CalendarToday, GpsFixed,
  ArrowDownward, DirectionsCar, Schedule,
  ArrowBack, OpenInNew, ReceiptLong,
  Wifi, WifiOff, SignalCellularAlt, SignalCellularOff, Lan, LocationOff,
  Speed, ZoomIn, CompareArrows, Visibility, ImageNotSupported,
  PlayArrow, Pause, SkipPrevious, SkipNext, Edit,
} from "@mui/icons-material";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { stopTracking, isCurrentlyTracking } from "../utils/Locationtracker.js";
import LiveTrackingMap from "../utils/Livetrackmap.jsx";
import { API_BASE_URL, API_ORIGIN, KNOWN_API_HOSTS, LEGACY_API_ORIGINS } from "../utils/apiConfig";
import { toBackendAssetUrl } from "../utils/backendAssetUrl";

const BASE_URL = API_BASE_URL;
const BACKEND_ORIGIN = API_ORIGIN;
const PHOTO_BACKEND_ORIGINS = [
  BACKEND_ORIGIN,
  ...LEGACY_API_ORIGINS,
].filter((origin, index, list) => origin && list.indexOf(origin) === index);
const KNOWN_BACKEND_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "::1",
  ...KNOWN_API_HOSTS,
]);

const PRIMARY = "#0f1f3d";
const SUCCESS = "#22c55e";
const WARNING = "#f59e0b";
const ERROR   = "#ef4444";
const MONGO_OBJECT_ID_RE = /^[a-f\d]{24}$/i;

const toIdString = (value) => {
  if (!value) return "";
  if (typeof value === "object") {
    return toIdString(value._id || value.id || value.userId);
  }
  return String(value).trim();
};

const isValidMongoObjectId = (value) => MONGO_OBJECT_ID_RE.test(toIdString(value));

const readStoredUserId = () => {
  try {
    const stored = JSON.parse(localStorage.getItem("user") || localStorage.getItem("userData") || "null");
    return toIdString(stored);
  } catch {
    return "";
  }
};

const getMemberStateUserId = (state = {}) =>
  toIdString(
    state.memberId ||
      state.userId ||
      state._id ||
      state.id ||
      state.user ||
      state.member
  );

const getBatteryChipStyle = (percentage, isDark = false) => {
  if (percentage === null || percentage === undefined) {
    return {
      color: isDark ? "#94a3b8" : "#64748b",
      bg: isDark ? "rgba(255, 255, 255, 0.06)" : "#f8fafc",
      border: isDark ? "rgba(255, 255, 255, 0.12)" : "#e2e8f0",
      label: "Battery N/A",
    };
  }
  if (percentage > 60) {
    return {
      color: isDark ? "#34d399" : "#059669",
      bg: alpha("#10b981", isDark ? 0.18 : 0.12),
      border: alpha("#10b981", isDark ? 0.35 : 0.22),
      label: `Battery ${percentage}%`,
    };
  }
  if (percentage > 20) {
    return {
      color: isDark ? "#fbbf24" : "#d97706",
      bg: alpha("#f59e0b", isDark ? 0.18 : 0.12),
      border: alpha("#f59e0b", isDark ? 0.35 : 0.22),
      label: `Battery ${percentage}%`,
    };
  }
  return {
    color: isDark ? "#f87171" : "#dc2626",
    bg: alpha("#ef4444", isDark ? 0.18 : 0.12),
    border: alpha("#ef4444", isDark ? 0.35 : 0.22),
    label: `Battery ${percentage}%`,
  };
};

const apiFetch = async (path, params = {}, options = {}) => {
  const token = localStorage.getItem("token") || localStorage.getItem("authToken") || localStorage.getItem("accessToken");
  const url   = new URL(`${BASE_URL}${path}`);
  if (options.method !== "POST")
    Object.entries(params).forEach(([k, v]) => v != null && v !== "" && url.searchParams.set(k, v));
  const res = await fetch(url.toString(), {
    method:  options.method || "GET",
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    ...(options.method === "POST" ? { body: JSON.stringify(params) } : {}),
  });
  if (!res.ok) {
    if (res.status === 404 && options.ignoreNotFound) return null;
    const e = await res.json().catch(() => ({}));
    if (res.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("authToken");
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
    throw new Error(e.message || `HTTP ${res.status}`);
  }
  return res.json();
};

const fmt = (d) => d ? new Date(d).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : null;
const formatCurrency = (amount) =>
  `\u20B9${Number(amount || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

const formatStatusLabel = (status, hasPunchIn, hasPunchOut) => {
  if (status) {
    return String(status)
      .replace(/[-_]+/g, " ")
      .replace(/\b\w/g, (match) => match.toUpperCase());
  }
  if (hasPunchIn && hasPunchOut) return "Present";
  if (hasPunchIn) return "On Duty";
  return "Absent";
};

const getDateRangeLabel = (dateRange) => {
  if (dateRange === "today") return "Today";
  if (dateRange === "yesterday") return "Yesterday";
  if (dateRange === "week") return "This Week";
  if (dateRange === "month") return "This Month";
  if (dateRange?.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return new Date(`${dateRange}T00:00:00`).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }
  return dateRange || "Today";
};

const normalizePhotoUrl = (rawUrl) => {
  if (!rawUrl || typeof rawUrl !== "string") return null;

  const trimmedUrl = rawUrl.trim().replace(/\\/g, "/");
  if (!trimmedUrl) return null;
  const withoutApiPrefix = trimmedUrl.replace(/^\/?api\/v1(?=\/)/i, "");

  if (withoutApiPrefix.startsWith("data:") || withoutApiPrefix.startsWith("blob:")) {
    return withoutApiPrefix;
  }

  if (withoutApiPrefix.startsWith("/public/")) {
    return `${BACKEND_ORIGIN}${withoutApiPrefix}`;
  }

  if (withoutApiPrefix.startsWith("/uploads/")) {
    return `${BACKEND_ORIGIN}/public${withoutApiPrefix}`;
  }

  if (withoutApiPrefix.startsWith("/")) {
    return `${BACKEND_ORIGIN}${withoutApiPrefix}`;
  }

  if (!/^https?:\/\//i.test(withoutApiPrefix)) {
    const cleanPath = withoutApiPrefix.replace(/^\/+/, "");
    const pathWithoutApi = cleanPath.replace(/^api\/v1\//i, "");
    return `${BACKEND_ORIGIN}/${pathWithoutApi.startsWith("uploads/") ? "public/" : ""}${pathWithoutApi}`;
  }

  try {
    const parsedUrl = new URL(withoutApiPrefix);
    const pathname = parsedUrl.pathname.replace(/^\/api\/v1(?=\/)/i, "");
    if (KNOWN_BACKEND_HOSTS.has(parsedUrl.hostname) && pathname.startsWith("/uploads/")) {
      return `${parsedUrl.origin}/public${pathname}`;
    }
    if (KNOWN_BACKEND_HOSTS.has(parsedUrl.hostname) && pathname.startsWith("/public/")) {
      return `${parsedUrl.origin}${pathname}`;
    }
    parsedUrl.pathname = pathname;
    return parsedUrl.toString();
  } catch {
    return withoutApiPrefix;
  }
};

const extractPhotoValue = (photoLike) => {
  if (!photoLike) return null;
  if (typeof photoLike === "string") return photoLike;
  if (typeof photoLike !== "object") return null;

  return (
    photoLike.url ||
    photoLike.uri ||
    photoLike.photoUrl ||
    photoLike.imageUrl ||
    photoLike.secure_url ||
    photoLike.downloadURL ||
    photoLike.path ||
    photoLike.location ||
    photoLike.filename ||
    photoLike.filePath ||
    photoLike.file_url ||
    photoLike.src ||
    null
  );
};

const getPhotoUrlCandidates = (rawPhoto) => {
  const primaryUrl = normalizePhotoUrl(extractPhotoValue(rawPhoto));
  if (!primaryUrl) return [];

  const candidates = [primaryUrl];
  const pushBackendPaths = (pathname) => {
    const normalizedPath = pathname
      .replace(/\\/g, "/")
      .replace(/^\/+/, "")
      .replace(/^api\/v1\//i, "");
    if (!normalizedPath) return;

    const filename = normalizedPath.split("/").filter(Boolean).pop();
    const pathVariants = [
      `/${normalizedPath}`,
      normalizedPath.startsWith("public/") ? `/${normalizedPath}` : `/public/${normalizedPath}`,
    ];

    if (normalizedPath.startsWith("uploads/")) {
      pathVariants.push(`/public/${normalizedPath}`);
    }

    if (filename) {
      pathVariants.push(
        `/public/${filename}`,
        `/public/uploads/${filename}`,
        `/public/uploads/images/${filename}`,
        `/uploads/${filename}`,
        `/uploads/images/${filename}`,
      );
    }

    PHOTO_BACKEND_ORIGINS.forEach((origin) => {
      pathVariants.forEach((path) => candidates.push(`${origin}${path}`));
    });
  };

  try {
    const parsedUrl = new URL(primaryUrl);
    const normalizedPathname = parsedUrl.pathname.replace(/^\/api\/v1(?=\/)/i, "");
    if (
      KNOWN_BACKEND_HOSTS.has(parsedUrl.hostname) &&
      (normalizedPathname.startsWith("/public/") || normalizedPathname.startsWith("/uploads/"))
    ) {
      const publicPath = normalizedPathname.startsWith("/uploads/")
        ? `/public${normalizedPathname}`
        : normalizedPathname;
      PHOTO_BACKEND_ORIGINS.forEach((origin) => {
        candidates.push(`${origin}${publicPath}`);
      });
    }
    if (KNOWN_BACKEND_HOSTS.has(parsedUrl.hostname)) {
      pushBackendPaths(parsedUrl.pathname.replace(/^\/api\/v1(?=\/)/i, ""));
    }
  } catch {
    pushBackendPaths(primaryUrl);
  }

  return candidates.filter((url, index, list) => url && list.indexOf(url) === index);
};

const getVisitPhotoUrls = (visit) => {
  if (!visit) return [];

  const photoSources = [
    ...(Array.isArray(visit.photos) ? visit.photos : []),
    visit.photo,
    visit.photoUrl,
    visit.image,
    visit.imageUrl,
    visit.visitPhoto,
    visit.thumbnail,
  ].filter(Boolean);

  return photoSources.flatMap((photo) => getPhotoUrlCandidates(photo))
    .filter((url, index, list) => url && list.indexOf(url) === index);
};

const getDateRange = (r) => {
  const now = new Date();
  
  // ✅ Build local midnight using local date parts (avoids UTC shift)
  const localMidnight = new Date(
    now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0
  );
  const localEndOfDay = new Date(
    now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999
  );

  if (r === "today") return {
    startDate: localMidnight.toISOString(),
    endDate:   localEndOfDay.toISOString(),   // ✅ end at 23:59 not "now"
  };

  if (r === "yesterday") {
    const yStart = new Date(localMidnight); yStart.setDate(yStart.getDate() - 1);
    const yEnd   = new Date(yStart); yEnd.setHours(23, 59, 59, 999);
    return { startDate: yStart.toISOString(), endDate: yEnd.toISOString() };
  }

  if (r === "week") {
    const w = new Date(localMidnight);
    w.setDate(localMidnight.getDate() - localMidnight.getDay());
    return { startDate: w.toISOString(), endDate: localEndOfDay.toISOString() };
  }

  if (r === "month") {
    const m = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    return { startDate: m.toISOString(), endDate: localEndOfDay.toISOString() };
  }

  if (r && r.match(/^\d{4}-\d{2}-\d{2}$/)) {
    const [yyyy, mm, dd] = r.split("-").map(Number);
    const start = new Date(yyyy, mm - 1, dd, 0, 0, 0, 0);
    const end   = new Date(yyyy, mm - 1, dd, 23, 59, 59, 999);
    return { startDate: start.toISOString(), endDate: end.toISOString() };
  }

  return {};
};

const getSelectedDayKey = (dateRange) => {
  if (dateRange && /^\d{4}-\d{2}-\d{2}$/.test(dateRange)) return dateRange;

  const date = new Date();
  if (dateRange === "yesterday") {
    date.setDate(date.getDate() - 1);
  }

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

const isSingleDayFilter = (dateRange) =>
  dateRange === "today" ||
  dateRange === "yesterday" ||
  /^\d{4}-\d{2}-\d{2}$/.test(dateRange || "");

const getRecentDays = () => {
  const days = [];
  for (let i = 0; i < 5; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    // ✅ Use local date parts instead of toISOString() which gives UTC date
    const yyyy = d.getFullYear();
    const mm   = String(d.getMonth() + 1).padStart(2, "0");
    const dd   = String(d.getDate()).padStart(2, "0");
    const value = i === 0 ? "today" : `${yyyy}-${mm}-${dd}`; // "today" for today, "2025-04-08" for others
    const label = i === 0 ? "Today"
      : i === 1 ? "Yesterday"
      : d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
    days.push({ value, label });
  }
  return days;
};

const isSystemStartLocationVisit = (visit) =>
  (visit?.locationName || "").trim().toLowerCase() === "start location";

const isVisitInDateRange = (visit, dateRange) => {
  const range = getDateRange(dateRange);
  if (!range.startDate || !range.endDate) return true;

  const rawDate = visit?.visitDate || visit?.checkInTime || visit?.createdAt;
  if (!rawDate) return true;

  const visitTime = new Date(rawDate).getTime();
  const startTime = new Date(range.startDate).getTime();
  const endTime = new Date(range.endDate).getTime();

  const tzBufferMs = 12 * 60 * 60 * 1000;

  return (
    Number.isFinite(visitTime) &&
    Number.isFinite(startTime) &&
    Number.isFinite(endTime) &&
    visitTime >= startTime - tzBufferMs &&
    visitTime <= endTime + tzBufferMs
  );
};

const formatStayDuration = (minutes) => {
  const value = Number(minutes) || 0;
  if (value >= 60) return `${Math.floor(value / 60)}h ${value % 60}m`;
  return `${value} min`;
};

// ─── Route Connector ──────────────────────────────────────────────────────────
// Shows the travel segment between two visits: distance + travel time
const RouteConnector = ({ visit }) => {
  const theme       = useTheme();
  const isDark      = theme.palette.mode === "dark";
  const primaryColor = isDark ? "#60a5fa" : PRIMARY;
  const textSub     = isDark ? "#94a3b8" : "#64748b";

  const distKm      = visit?.distanceFromPreviousKm ?? visit?.distance ?? 0;
  const travelInfo  = visit?.travelInfo;
  const travelMins  = travelInfo?.durationMinutes ?? visit?.travelTimeMinutes ?? 0;
  const isEstimated = travelInfo?.isEstimated ?? true;

  // Only render if there was a previous visit (i.e., this is not the first stop)
  if (!distKm || distKm <= 0) return null;

  const distText = travelInfo?.distanceText || `${Number(distKm).toFixed(2)} km`;
  const timeText = travelInfo?.durationText
    || (travelMins > 0
      ? travelMins >= 60
        ? `${Math.floor(travelMins / 60)}h ${travelMins % 60}m`
        : `${travelMins} min`
      : null);

  return (
    <Box sx={{
      display: "flex",
      alignItems: "stretch",
      gap: 0,
      my: 0,
    }}>
      {/* Left — dashed connector line aligned with circle column */}
      <Box sx={{
        width: 40,
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}>
        {/* Dashed animated line */}
        <Box sx={{
          width: 2,
          flex: 1,
          minHeight: 56,
          background: `repeating-linear-gradient(
            to bottom,
            ${alpha(primaryColor, 0.35)} 0px,
            ${alpha(primaryColor, 0.35)} 6px,
            transparent 6px,
            transparent 12px
          )`,
          position: "relative",
        }}>
          {/* Animated travel dot */}
          <Box sx={{
            position: "absolute",
            left: "50%",
            transform: "translateX(-50%)",
            width: 6,
            height: 6,
            borderRadius: "50%",
            bgcolor: primaryColor,
            animation: "travelDot 2s ease-in-out infinite",
            "@keyframes travelDot": {
              "0%":   { top: "0%",   opacity: 1 },
              "80%":  { top: "85%",  opacity: 1 },
              "100%": { top: "85%",  opacity: 0 },
            },
          }} />
        </Box>
      </Box>

      {/* Right — route info pill */}
      <Box sx={{
        flex: 1,
        display: "flex",
        alignItems: "center",
        pl: 2,
        py: 1,
      }}>
        <Box sx={{
          display: "inline-flex",
          alignItems: "center",
          gap: 1.25,
          bgcolor: alpha(primaryColor, isDark ? 0.12 : 0.05),
          border: `1px dashed ${alpha(primaryColor, isDark ? 0.35 : 0.25)}`,
          borderRadius: "10px",
          px: 1.5,
          py: 0.6,
        }}>
          {/* Distance */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.4 }}>
            <DirectionsCar sx={{ fontSize: 13, color: primaryColor }} />
            <Typography sx={{
              fontSize: "0.72rem",
              fontWeight: 700,
              color: primaryColor,
              letterSpacing: "-0.2px",
            }}>
              {distText}
            </Typography>
          </Box>

          {/* Travel time */}
          {timeText && (
            <>
              <Box sx={{ width: 3, height: 3, borderRadius: "50%", bgcolor: alpha(primaryColor, 0.3) }} />
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.4 }}>
                <Schedule sx={{ fontSize: 12, color: textSub }} />
                <Typography sx={{
                  fontSize: "0.68rem",
                  color: textSub,
                  fontWeight: 600,
                }}>
                  {timeText}
                </Typography>
              </Box>
            </>
          )}

          {/* Estimated badge */}
          {isEstimated && (
            <Chip
              label="est."
              size="small"
              sx={{
                height: 14,
                fontSize: "0.55rem",
                fontWeight: 700,
                bgcolor: alpha(WARNING, 0.12),
                color: WARNING,
                "& .MuiChip-label": { px: 0.75 },
              }}
            />
          )}
        </Box>
      </Box>
    </Box>
  );
};

// ─── Visit Card ───────────────────────────────────────────────────────────────
const VisitCard = ({ visit: v, index, isLast, fixedBatteryInfo, fixedBatteryChip }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const primaryColor = isDark ? "#60a5fa" : PRIMARY;
  const textTitle = isDark ? "#ffffff" : "#0f172a";
  const textSub = isDark ? "#94a3b8" : "#64748b";
  const textMuted = isDark ? "#cbd5e1" : "#475569";
  const remarksBg = isDark ? "rgba(255, 255, 255, 0.04)" : "#f8fafc";
  const remarksBorder = isDark ? "rgba(255, 255, 255, 0.12)" : "#e2e8f0";
  const imgBorder = isDark ? "rgba(255, 255, 255, 0.12)" : "#e2e8f0";

  const cur = v.status === "InProgress";
  const [imgOpen, setImgOpen] = useState(false);
  const [photoIndex, setPhotoIndex] = useState(0);

  const photoUrls = getVisitPhotoUrls(v);
  const photoUrl = photoUrls[photoIndex] || null;
  const photoCount = [
    ...(Array.isArray(v.photos) ? v.photos : []),
    v.photo,
    v.photoUrl,
    v.image,
    v.imageUrl,
    v.visitPhoto,
    v.thumbnail,
  ].filter(Boolean).length;

  const handlePhotoError = () => {
    setPhotoIndex((current) =>
      current + 1 < photoUrls.length ? current + 1 : current,
    );
  };

  useEffect(() => {
    setPhotoIndex(0);
  }, [v.id, v._id, v.photos, v.photo, v.photoUrl, v.image, v.imageUrl, v.visitPhoto, v.thumbnail]);

  const address = (() => {
    if (!v.address) return "";
    if (typeof v.address === "string") return v.address.trim();
    return (v.address?.full || v.address?.short || "").trim();
  })();

  const displayTime = v.checkInTime
    ? fmt(v.checkInTime)
    : v.createdAt
    ? fmt(v.createdAt)
    : v.visitTime || null;

  const displayDate = v.visitDate
    ? new Date(v.visitDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })
    : null;

  const distKm = v.distanceFromPreviousKm ?? v.distance ?? 0;

  return (
    <Box sx={{ display: "flex", gap: 2, position: "relative" }}>

      {/* Left — circle (no connector line here — RouteConnector handles that) */}
      <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
        <Box sx={{
          width: 40, height: 40, borderRadius: "50%",
          bgcolor: cur ? SUCCESS : primaryColor,
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0, zIndex: 1,
          boxShadow: `0 2px 8px ${alpha(cur ? SUCCESS : primaryColor, 0.3)}`,
          ...(cur && {
            animation: "pl 1.5s ease-in-out infinite",
            "@keyframes pl": { "0%,100%": { opacity: 1 }, "50%": { opacity: 0.6 } },
          }),
        }}>
          <Store sx={{ fontSize: 17, color: "#fff" }} />
        </Box>
      </Box>

      {/* Middle — details */}
      <Box sx={{ flex: 1, minWidth: 0, pt: 0.25, pb: isLast ? 0 : 0.5 }}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1, mb: 0.4 }}>
          <Typography sx={{ fontWeight: 700, color: textTitle, fontSize: "0.88rem", lineHeight: 1.3 }}>
            {v.locationName || `Stop ${index + 1}`}
          </Typography>
          {(displayTime || displayDate) && (
            <Typography sx={{ fontSize: "0.72rem", fontWeight: 600, color: textSub, flexShrink: 0 }}>
              {displayDate && displayTime
                ? `${displayDate} · ${displayTime}`
                : displayTime || displayDate}
            </Typography>
          )}
        </Box>

        {cur && (
          <Chip label="In Progress" size="small"
            sx={{ bgcolor: alpha(SUCCESS, 0.1), color: SUCCESS, fontWeight: 700, fontSize: "0.6rem", height: 18, mb: 0.5 }} />
        )}

        {fixedBatteryInfo?.percentage !== null && fixedBatteryInfo?.percentage !== undefined && (
          <Box sx={{ mb: 0.6 }}>
            <Chip
              size="small"
              label={`${fixedBatteryChip.label}${fixedBatteryInfo.isCharging ? " • Charging" : ""}`}
              sx={{ bgcolor: fixedBatteryChip.bg, color: fixedBatteryChip.color, fontWeight: 700, border: `1px solid ${fixedBatteryChip.border}`, height: 22, fontSize: "0.68rem" }}
            />
          </Box>
        )}

        {address && (
          <Box sx={{ display: "flex", alignItems: "flex-start", gap: 0.4, mb: 0.5 }}>
            <LocationOn sx={{ fontSize: 12, color: primaryColor, mt: "2px", flexShrink: 0 }} />
            <Typography sx={{
              color: textMuted, fontSize: "0.75rem", lineHeight: 1.4,
              display: "-webkit-box", WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical", overflow: "hidden",
            }}>
              {address}
            </Typography>
          </Box>
        )}

        {v.remarks && (
          <Box sx={{ bgcolor: remarksBg, borderRadius: "8px", px: 1.5, py: 1, mt: 0.25, borderLeft: `3px solid ${remarksBorder}` }}>
            <Typography sx={{ color: textSub, fontSize: "0.73rem", fontStyle: "italic", lineHeight: 1.6 }}>
              "{v.remarks}"
            </Typography>
          </Box>
        )}

        {/* Tags row */}
        <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap", mt: 0.5 }}>
          {v.timeSpentMinutes > 0 && (
            <Box sx={{
              display: "flex", alignItems: "center", gap: 0.4,
              bgcolor: alpha(WARNING, 0.07), borderRadius: "6px", px: 0.75, py: 0.3,
            }}>
              <Timer sx={{ fontSize: 11, color: WARNING }} />
              <Typography sx={{ fontSize: "0.68rem", color: WARNING, fontWeight: 600 }}>
                {v.timeSpentMinutes >= 60
                  ? `${Math.floor(v.timeSpentMinutes / 60)}h ${v.timeSpentMinutes % 60}m`
                  : `${v.timeSpentMinutes} min`}
              </Typography>
            </Box>
          )}

          {photoCount > 0 && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.3 }}>
              <PhotoCamera sx={{ fontSize: 11, color: textSub }} />
              <Typography sx={{ fontSize: "0.68rem", color: textSub }}>
                {photoCount} photo{photoCount > 1 ? "s" : ""}
              </Typography>
            </Box>
          )}
          {(v.isLeadCreate || v.isLeadCreated) && (
            <Chip label="Lead Created" size="small"
              sx={{ bgcolor: alpha(WARNING, 0.1), color: WARNING, fontWeight: 700, fontSize: "0.6rem", height: 18 }} />
          )}
        </Box>
      </Box>

      {/* Right — Photo thumbnail */}
      {photoUrl && (
        <>
          <Box
            onClick={() => setImgOpen(true)}
            sx={{
              width: 72, height: 72, borderRadius: "10px",
              overflow: "hidden", flexShrink: 0,
              border: `2px solid ${imgBorder}`,
              boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
              alignSelf: "flex-start", mt: 0.25,
              cursor: "pointer",
              transition: "transform 0.2s, box-shadow 0.2s",
              "&:hover": { transform: "scale(1.05)", boxShadow: "0 4px 16px rgba(0,0,0,0.18)", borderColor: primaryColor },
            }}
          >
            <Box component="img" src={photoUrl} alt="Visit photo" onError={handlePhotoError}
              sx={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </Box>

          {imgOpen && (
            <Box onClick={() => setImgOpen(false)}
              sx={{
                position: "fixed", inset: 0, zIndex: 9999,
                bgcolor: "rgba(0,0,0,0.92)",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "zoom-out", p: 2,
              }}
            >
              <Box sx={{
                position: "absolute", top: 16, right: 16,
                width: 36, height: 36, borderRadius: "50%",
                bgcolor: "rgba(255,255,255,0.15)",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", "&:hover": { bgcolor: "rgba(255,255,255,0.25)" },
              }}>
                <Close sx={{ color: "#fff", fontSize: 20 }} />
              </Box>
              {v.locationName && (
                <Box sx={{
                  position: "absolute", top: 16, left: 16,
                  bgcolor: "rgba(0,0,0,0.5)", borderRadius: "8px", px: 1.5, py: 0.75,
                }}>
                  <Typography sx={{ color: "#fff", fontSize: "0.82rem", fontWeight: 600 }}>
                    📍 {v.locationName}
                  </Typography>
                  {v.checkInTime && (
                    <Typography sx={{ color: "#94a3b8", fontSize: "0.7rem" }}>{fmt(v.checkInTime)}</Typography>
                  )}
                </Box>
              )}
              <Box
                component="img" src={photoUrl} alt="Visit photo"
                onError={handlePhotoError}
                onClick={(e) => e.stopPropagation()}
                sx={{ maxWidth: "95vw", maxHeight: "90vh", borderRadius: "12px", objectFit: "contain", boxShadow: "0 8px 40px rgba(0,0,0,0.5)" }}
              />
            </Box>
          )}
        </>
      )}
    </Box>
  );
};

const isCoordinateLikeValue = (val) => {
  if (!val) return true;
  const str = typeof val === "string" ? val.trim() : "";
  if (!str) return true;
  if (/^(stayed location|locating address…|fetching address…|detecting location…)$/i.test(str)) {
    return false;
  }
  return /^-?\d+(\.\d+)?[,\s]+-?\d+(\.\d+)?$/.test(str);
};

const stayGeocodeCache = new Map();

const resolveStayGeocode = async (lat, lng) => {
  if (!lat || !lng) return null;
  const numLat = Number(lat);
  const numLng = Number(lng);
  if (isNaN(numLat) || isNaN(numLng)) return null;

  const key = `${numLat.toFixed(4)},${numLng.toFixed(4)}`;
  if (stayGeocodeCache.has(key)) return stayGeocodeCache.get(key);

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${numLat}&lon=${numLng}&format=json&zoom=18&addressdetails=1`,
      { headers: { "Accept-Language": "en" } }
    );
    if (res.ok) {
      const data = await res.json();
      if (data?.display_name) {
        const addr = data.address || {};
        const parts = data.display_name
          .split(",")
          .map((s) => s.replace(/\(M\.Corp\.?\)/gi, "").replace(/Municipal Corporation/gi, "").trim())
          .filter((s) => s && !/^(south east zone|north zone|south zone|west zone|east zone|central zone|zone\s*\d*|asia\/kolkata|zone)$/i.test(s));

        const unique = Array.from(new Set(parts));
        const short = addr.suburb || addr.neighbourhood || addr.road || unique.slice(0, 2).join(", ") || "Stayed Location";
        const full = unique.join(", ") || data.display_name;
        const result = { short, full };
        stayGeocodeCache.set(key, result);
        return result;
      }
    }
  } catch (e) {}

  try {
    const res = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${numLat}&longitude=${numLng}&localityLanguage=en`
    );
    if (res.ok) {
      const data = await res.json();
      const admin = (data.localityInfo?.administrative || [])
        .filter((a) => a.order >= 4 && !/india|asia|kolkata|council|basin|railway|subcontinent/i.test(a.name))
        .reverse()
        .map((a) => a.name.replace(/\(M\.Corp\.\)/i, "").replace(/Municipal Corporation/i, "").trim());
      const locality = data.locality || data.city;
      const district = data.principalSubdivision;
      const postcode = data.postcode;
      const parts = Array.from(new Set([admin[0], locality, district, postcode])).filter(Boolean);
      if (parts.length > 0) {
        const result = { short: parts.slice(0, 2).join(", "), full: parts.join(", ") };
        stayGeocodeCache.set(key, result);
        return result;
      }
    }
  } catch (e) {}

  return null;
};

const StayedLocationCard = ({ stay, referenceAddress }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const primaryColor = isDark ? "#60a5fa" : PRIMARY;
  const textTitle = isDark ? "#ffffff" : "#0f172a";
  const textSub = isDark ? "#94a3b8" : "#64748b";
  const textMuted = isDark ? "#cbd5e1" : "#475569";
  const chipBg = isDark ? "rgba(255,255,255,0.06)" : "#f8fafc";
  const chipBorder = isDark ? "rgba(255,255,255,0.1)" : "#e2e8f0";

  const [resolvedGeo, setResolvedGeo] = useState(() => {
    const locCoord = isCoordinateLikeValue(stay?.locationName);
    const addrCoord = isCoordinateLikeValue(stay?.address);
    if (!locCoord && !addrCoord && stay?.locationName && stay?.address) {
      return { short: stay.locationName, full: stay.address };
    }
    return null;
  });

  useEffect(() => {
    if (resolvedGeo?.full && !isCoordinateLikeValue(resolvedGeo.full)) return;
    const lat = Number(stay?.lat);
    const lng = Number(stay?.lng);
    if (!lat || !lng) return;

    let active = true;
    resolveStayGeocode(lat, lng).then((res) => {
      if (active && res) {
        setResolvedGeo(res);
      }
    });

    return () => { active = false; };
  }, [stay?.lat, stay?.lng, stay?.locationName, stay?.address]);

  const rawLocIsCoord = isCoordinateLikeValue(stay?.locationName);
  const rawAddrIsCoord = isCoordinateLikeValue(stay?.address);

  const displayTitle = (!rawLocIsCoord && stay?.locationName)
    ? stay.locationName
    : resolvedGeo?.short || "Stayed Location";

  const displayAddress = (!rawAddrIsCoord && stay?.address)
    ? stay.address
    : resolvedGeo?.full || (!isCoordinateLikeValue(referenceAddress) ? referenceAddress : "Locating address…");

  const latestEvent = Array.isArray(stay?.events) && stay.events.length
    ? [...stay.events].sort((a, b) => new Date(b.endTime).getTime() - new Date(a.endTime).getTime())[0]
    : null;
  const startTime = latestEvent?.startTime || null;
  const endTime = latestEvent?.endTime || stay?.lastEndTime || null;
  const totalMinutes = Number(stay?.totalDurationMinutes) || 0;
  const visitCount = Number(stay?.visitCount) || 0;

  return (
    <Box sx={{ display: "flex", gap: 2, position: "relative", mb: 2 }}>
      <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
        <Box sx={{
          width: 40, height: 40, borderRadius: "50%",
          bgcolor: WARNING,
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: `0 2px 8px ${alpha(WARNING, 0.3)}`,
        }}>
          <Timer sx={{ fontSize: 17, color: "#fff" }} />
        </Box>
      </Box>

      <Box sx={{ flex: 1, minWidth: 0, pt: 0.25 }}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1, mb: 0.4 }}>
          <Typography sx={{ fontWeight: 700, color: textTitle, fontSize: "0.88rem", lineHeight: 1.3 }}>
            {displayTitle}
          </Typography>
          {endTime && (
            <Typography sx={{ fontSize: "0.72rem", fontWeight: 600, color: textSub, flexShrink: 0 }}>
              {fmt(endTime)}
            </Typography>
          )}
        </Box>

        {displayAddress && (
          <Box sx={{ display: "flex", alignItems: "flex-start", gap: 0.4, mb: 0.5 }}>
            <LocationOn sx={{ fontSize: 12, color: WARNING, mt: "2px", flexShrink: 0 }} />
            <Typography sx={{
              color: textMuted, fontSize: "0.75rem", lineHeight: 1.4,
              display: "-webkit-box", WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical", overflow: "hidden",
            }}>
              {displayAddress}
            </Typography>
          </Box>
        )}

        <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap", mt: 0.5 }}>
          <Chip
            size="small"
            label={`${visitCount} time${visitCount === 1 ? "" : "s"} stayed`}
            sx={{ bgcolor: alpha(WARNING, 0.1), color: WARNING, fontWeight: 700, fontSize: "0.65rem", height: 20 }}
          />
          <Chip
            size="small"
            label={`${formatStayDuration(totalMinutes)} total`}
            sx={{ bgcolor: chipBg, color: textSub, fontWeight: 700, fontSize: "0.65rem", height: 20, border: `1px solid ${chipBorder}` }}
          />
          {startTime && endTime && (
            <Chip
              size="small"
              label={`${fmt(startTime)} - ${fmt(endTime)}`}
              sx={{ bgcolor: alpha(primaryColor, isDark ? 0.15 : 0.06), color: primaryColor, fontWeight: 700, fontSize: "0.65rem", height: 20 }}
            />
          )}
        </Box>
      </Box>
    </Box>
  );
};

// ─── Color Palettes for Color-Coded Trip Recognition ────────────────────────
const TRIP_COLOR_PALETTES = [
  { main: "#2563eb", bg: "#eff6ff", darkBg: "rgba(37,99,235,0.12)", border: "#bfdbfe", darkBorder: "rgba(37,99,235,0.3)", chipText: "#ffffff", chipBg: "#2563eb", arrow: "#2563eb" },
  { main: "#059669", bg: "#ecfdf5", darkBg: "rgba(5,150,105,0.12)", border: "#a7f3d0", darkBorder: "rgba(5,150,105,0.3)", chipText: "#ffffff", chipBg: "#059669", arrow: "#059669" },
  { main: "#d97706", bg: "#fffbeb", darkBg: "rgba(217,119,6,0.12)", border: "#fde68a", darkBorder: "rgba(217,119,6,0.3)", chipText: "#ffffff", chipBg: "#d97706", arrow: "#d97706" },
  { main: "#7c3aed", bg: "#f5f3ff", darkBg: "rgba(124,58,237,0.12)", border: "#ddd6fe", darkBorder: "rgba(124,58,237,0.3)", chipText: "#ffffff", chipBg: "#7c3aed", arrow: "#7c3aed" },
  { main: "#e11d48", bg: "#fff1f2", darkBg: "rgba(225,29,72,0.12)", border: "#fecdd3", darkBorder: "rgba(225,29,72,0.3)", chipText: "#ffffff", chipBg: "#e11d48", arrow: "#e11d48" },
];

const formatTripDurationString = (startTime, endTime, durationSeconds) => {
  if (durationSeconds && durationSeconds > 0) {
    const hrs = Math.floor(durationSeconds / 3600);
    const mins = Math.floor((durationSeconds % 3600) / 60);
    if (hrs > 0) return `${hrs}h ${mins}m`;
    return `${mins}m`;
  }
  if (startTime && endTime) {
    const diffMs = new Date(endTime).getTime() - new Date(startTime).getTime();
    if (diffMs > 0) {
      const totalMins = Math.floor(diffMs / 60000);
      const hrs = Math.floor(totalMins / 60);
      const mins = totalMins % 60;
      if (hrs > 0) return `${hrs}h ${mins}m`;
      return `${mins}m`;
    }
  }
  return "--";
};

// ─── Single Odometer Point Box (Start or End) ───────────────────────────────
const TripOdometerPointBox = ({
  tagLabel,
  headerColor,
  time,
  km,
  photoPath,
  location,
  onOpenPreview,
  tripInfo,
  isOngoing = false,
}) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const textTitle = isDark ? "#ffffff" : "#0f172a";
  const textSub = isDark ? "#94a3b8" : "#64748b";
  const textMuted = isDark ? "#cbd5e1" : "#475569";
  const itemBg = isDark ? "rgba(255, 255, 255, 0.03)" : "#f8fafc";
  const itemBorder = isDark ? "rgba(255, 255, 255, 0.08)" : "#e2e8f0";

  const [candidateIndex, setCandidateIndex] = useState(0);
  const [hasImageError, setHasImageError] = useState(false);
  const candidates = React.useMemo(() => getPhotoUrlCandidates(photoPath), [photoPath]);
  const currentUrl = !hasImageError && candidates.length > 0 ? (candidates[candidateIndex] || null) : null;

  useEffect(() => {
    setCandidateIndex(0);
    setHasImageError(false);
  }, [photoPath]);

  // If this is an End box for an Ongoing trip
  if (isOngoing) {
    return (
      <Box
        sx={{
          flex: 1,
          minWidth: { xs: "100%", md: 250 },
          bgcolor: isDark ? "rgba(37, 99, 235, 0.06)" : "#f0f7ff",
          borderRadius: "14px",
          p: 1.25,
          border: `1.5px dashed ${isDark ? "rgba(59, 130, 246, 0.4)" : "#93c5fd"}`,
          display: "flex",
          alignItems: "center",
          gap: 1.5,
        }}
      >
        <Box
          sx={{
            width: 50,
            height: 50,
            borderRadius: "10px",
            bgcolor: isDark ? "rgba(37, 99, 235, 0.2)" : "#dbeafe",
            border: `1px solid ${isDark ? "rgba(37, 99, 235, 0.4)" : "#bfdbfe"}`,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 0.3,
            flexShrink: 0,
          }}
        >
          <Speed sx={{ fontSize: 20, color: "#2563eb", animation: "spinSlow 8s linear infinite", "@keyframes spinSlow": { "100%": { transform: "rotate(360deg)" } } }} />
          <Typography sx={{ fontSize: "0.52rem", fontWeight: 800, color: "#2563eb", textTransform: "uppercase" }}>
            En Route
          </Typography>
        </Box>

        <Box sx={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 0.3 }}>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1 }}>
            <Typography sx={{ fontWeight: 800, fontSize: "0.76rem", color: "#2563eb" }}>
              {tagLabel}
            </Typography>
            <Chip
              label="IN PROGRESS"
              size="small"
              sx={{
                height: 18,
                bgcolor: isDark ? "rgba(37, 99, 235, 0.25)" : "#eff6ff",
                color: isDark ? "#60a5fa" : "#2563eb",
                fontWeight: 800,
                fontSize: "0.58rem",
                border: "1px solid #bfdbfe",
                px: 0.2,
              }}
            />
          </Box>

          <Typography sx={{ fontWeight: 800, fontSize: "0.92rem", color: textTitle, lineHeight: 1.2 }}>
            Trip in Progress…
          </Typography>

          <Typography sx={{ fontSize: "0.68rem", color: textSub, fontWeight: 500, lineHeight: 1.2 }}>
            End odometer photo & KM will be recorded upon completion.
          </Typography>
        </Box>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        flex: 1,
        minWidth: { xs: "100%", md: 250 },
        bgcolor: itemBg,
        borderRadius: "14px",
        p: 1.25,
        border: `1px solid ${itemBorder}`,
        display: "flex",
        alignItems: "flex-start",
        gap: 1.5,
        transition: "all 0.2s ease",
        "&:hover": {
          borderColor: alpha(headerColor, 0.4),
          boxShadow: `0 4px 16px ${alpha(headerColor, 0.08)}`,
        },
      }}
    >
      {/* Square Thumbnail + ODOMETER label */}
      <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
        {currentUrl ? (
          <Box
            onClick={() => onOpenPreview && onOpenPreview({ title: tagLabel, km, url: currentUrl, time, location, tripInfo })}
            sx={{
              width: 52,
              height: 52,
              borderRadius: "8px",
              overflow: "hidden",
              position: "relative",
              cursor: "pointer",
              bgcolor: isDark ? "#000" : "#f1f5f9",
              border: `1px solid ${itemBorder}`,
              "&:hover .zoom-overlay": { opacity: 1 },
            }}
          >
            <Box
              component="img"
              src={currentUrl}
              alt="Odometer"
              onError={() => {
                if (candidateIndex + 1 < candidates.length) {
                  setCandidateIndex((i) => i + 1);
                } else {
                  setHasImageError(true);
                }
              }}
              sx={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                transition: "transform 0.3s ease",
                "&:hover": { transform: "scale(1.08)" },
              }}
            />
            <Box
              className="zoom-overlay"
              sx={{
                position: "absolute",
                inset: 0,
                bgcolor: "rgba(0,0,0,0.5)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                opacity: 0,
                transition: "opacity 0.2s ease",
              }}
            >
              <ZoomIn sx={{ color: "#fff", fontSize: 18 }} />
            </Box>
          </Box>
        ) : (
          <Box
            sx={{
              width: 52,
              height: 52,
              borderRadius: "8px",
              bgcolor: isDark ? "rgba(255,255,255,0.03)" : "#edf2f7",
              border: `1px dashed ${itemBorder}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <PhotoCamera sx={{ fontSize: 20, color: textSub, opacity: 0.4 }} />
          </Box>
        )}
        <Typography
          sx={{
            fontSize: "0.54rem",
            fontWeight: 800,
            color: textSub,
            letterSpacing: "0.5px",
            mt: 0.4,
            textTransform: "uppercase",
          }}
        >
          Odometer
        </Typography>
      </Box>

      {/* Details (Header, KM, Location) */}
      <Box sx={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 0.3 }}>
        {/* Top Header: Tag Label + Time */}
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1 }}>
          <Typography sx={{ fontWeight: 800, fontSize: "0.76rem", color: headerColor }}>
            {tagLabel}
          </Typography>
          {time && (
            <Typography sx={{ fontWeight: 700, fontSize: "0.72rem", color: textSub }}>
              {fmt(time)}
            </Typography>
          )}
        </Box>

        {/* Bold KM + Manual / AI Scanned Badge */}
        {(() => {
          const isStart = tagLabel && String(tagLabel).includes("START");
          const isManual = isStart
            ? Boolean(tripInfo?.isManualStartKm || (tripInfo?.manualStartKm !== undefined && tripInfo?.manualStartKm !== null && String(tripInfo?.manualStartKm).trim() !== ""))
            : Boolean(tripInfo?.isManualEndKm || (tripInfo?.manualEndKm !== undefined && tripInfo?.manualEndKm !== null && String(tripInfo?.manualEndKm).trim() !== ""));
          const aiKm = isStart ? tripInfo?.aiDetectedStartKm : tripInfo?.aiDetectedEndKm;

          return (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 0.2 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, flexWrap: "wrap", mt: 0.1 }}>
                <Typography
                  sx={{
                    fontWeight: 800,
                    fontSize: "1.05rem",
                    color: textTitle,
                    fontFamily: "monospace",
                    letterSpacing: "-0.4px",
                    lineHeight: 1.15,
                  }}
                >
                  {Number(km || 0).toLocaleString("en-IN")}{" "}
                  <Typography component="span" sx={{ fontSize: "0.70rem", fontWeight: 700, color: textSub }}>
                    KM
                  </Typography>
                </Typography>

                {isManual ? (
                  <Chip
                    icon={<Edit sx={{ fontSize: "10px !important", color: isDark ? "#fbbf24" : "#92400e" }} />}
                    label="Manual Entry"
                    size="small"
                    sx={{
                      height: 19,
                      bgcolor: isDark ? "rgba(245, 158, 11, 0.22)" : "#fef3c7",
                      color: isDark ? "#fbbf24" : "#92400e",
                      fontWeight: 800,
                      fontSize: "0.62rem",
                      borderRadius: "6px",
                      border: "1px solid rgba(245, 158, 11, 0.5)",
                      px: 0.2,
                      "& .MuiChip-icon": { ml: "4px", mr: "-4px" },
                    }}
                  />
                ) : (
                  <Chip
                    icon={<CheckCircle sx={{ fontSize: "10px !important", color: isDark ? "#34d399" : "#166534" }} />}
                    label="AI Scanned"
                    size="small"
                    sx={{
                      height: 19,
                      bgcolor: isDark ? "rgba(34, 197, 94, 0.15)" : "#dcfce7",
                      color: isDark ? "#34d399" : "#166534",
                      fontWeight: 800,
                      fontSize: "0.62rem",
                      borderRadius: "6px",
                      border: "1px solid rgba(34, 197, 94, 0.35)",
                      px: 0.2,
                      "& .MuiChip-icon": { ml: "4px", mr: "-4px" },
                    }}
                  />
                )}
              </Box>

              {isManual && aiKm && String(aiKm) !== String(km) && (
                <Typography sx={{ fontSize: "0.63rem", color: isDark ? "#fbbf24" : "#b45309", fontWeight: 700 }}>
                  AI detected: {Number(aiKm).toLocaleString("en-IN")} KM
                </Typography>
              )}
            </Box>
          );
        })()}

        {/* Location Pin + Address */}
        <Box sx={{ display: "flex", alignItems: "flex-start", gap: 0.4, mt: 0.15 }}>
          <LocationOn sx={{ fontSize: 12, color: headerColor, mt: "2px", flexShrink: 0 }} />
          <Typography
            sx={{
              fontSize: "0.68rem",
              color: textMuted,
              lineHeight: 1.3,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {location || "Location not recorded"}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

// ─── Individual Trip Card (Matching User Screenshot) ────────────────────────
const TripItemCardExact = ({ trip, index, onOpenPreview, onShowOnMap }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const textTitle = isDark ? "#ffffff" : "#0f172a";
  const textSub = isDark ? "#94a3b8" : "#64748b";
  const cardBg = isDark ? "#0e1424" : "#ffffff";
  const cardBorder = isDark ? "rgba(255, 255, 255, 0.08)" : "#e8edf2";

  const palette = TRIP_COLOR_PALETTES[index % TRIP_COLOR_PALETTES.length];
  const tripNum = index + 1;
  const isCompleted = trip.status === "completed";
  const isCancelled = trip.status === "cancelled";
  const isOngoing = trip.status === "in_progress" || (!isCompleted && !isCancelled);
  const startKm = Number(trip.startKm) || 0;
  const endKm = Number(trip.endKm) || (isCompleted ? startKm : 0);
  const diffKm = trip.totalKm !== undefined && Number(trip.totalKm) > 0
    ? Number(trip.totalKm)
    : Math.max(0, endKm - startKm);
  const durationText = formatTripDurationString(trip.startTime, trip.endTime, trip.durationSeconds);

  return (
    <Box
      sx={{
        bgcolor: cardBg,
        borderRadius: "14px",
        border: `1px solid ${cardBorder}`,
        p: { xs: 1.25, sm: 1.5 },
        display: "flex",
        flexDirection: "column",
        gap: 1.25,
        boxShadow: "0 2px 10px rgba(0,0,0,0.02)",
        transition: "all 0.2s ease",
        "&:hover": {
          borderColor: alpha(palette.main, 0.35),
          boxShadow: `0 4px 14px ${alpha(palette.main, 0.06)}`,
        },
      }}
    >
      {/* Top Header Row */}
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 1 }}>
        {/* Left: Trip #1 + Title */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Chip
            label={`Trip #${tripNum}`}
            size="small"
            sx={{
              height: 22,
              bgcolor: isCancelled ? "#94a3b8" : palette.chipBg,
              color: "#fff",
              fontWeight: 800,
              fontSize: "0.68rem",
              borderRadius: "5px",
              px: 0.3,
            }}
          />
          <Typography sx={{ fontWeight: 800, fontSize: "0.88rem", color: textTitle }}>
            {trip.title || trip.workType || "Other"}
          </Typography>
        </Box>

        {/* Right: Status badge + Show on Map button */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, flexWrap: "wrap" }}>
          {(trip.isManualStartKm || trip.isManualEndKm || trip.manualStartKm || trip.manualEndKm) && (
            <Chip
              icon={<Edit sx={{ fontSize: "11px !important", color: isDark ? "#fbbf24" : "#92400e" }} />}
              label={
                (trip.isManualStartKm || trip.manualStartKm) && (trip.isManualEndKm || trip.manualEndKm)
                  ? "Manual Start & End"
                  : (trip.isManualStartKm || trip.manualStartKm)
                  ? "Manual Start KM"
                  : "Manual End KM"
              }
              size="small"
              sx={{
                height: 22,
                bgcolor: isDark ? "rgba(245, 158, 11, 0.22)" : "#fef3c7",
                color: isDark ? "#fbbf24" : "#92400e",
                fontWeight: 800,
                fontSize: "0.68rem",
                borderRadius: "6px",
                border: "1px solid rgba(245, 158, 11, 0.45)",
                "& .MuiChip-icon": { ml: "4px", mr: "-4px" },
              }}
            />
          )}

          <Chip
            icon={isOngoing ? <Box sx={{ width: 5, height: 5, borderRadius: "50%", bgcolor: "#2563eb", animation: "livePulse 1.5s infinite", "@keyframes livePulse": { "0%,100%": { opacity: 1 }, "50%": { opacity: 0.3 } } }} /> : undefined}
            label={isCompleted ? `Completed (+${diffKm} KM)` : isCancelled ? "Cancelled / Inactive" : `Ongoing Trip (Running)`}
            size="small"
            sx={{
              height: 22,
              bgcolor: isDark
                ? (isCompleted ? palette.darkBg : isCancelled ? "rgba(239,68,68,0.18)" : "rgba(37,99,235,0.18)")
                : (isCompleted ? palette.bg : isCancelled ? "#fee2e2" : "#eff6ff"),
              color: isCompleted ? palette.main : isCancelled ? "#dc2626" : "#2563eb",
              fontWeight: 800,
              fontSize: "0.70rem",
              borderRadius: "999px",
              border: `1px solid ${isDark ? (isCompleted ? palette.darkBorder : isCancelled ? "rgba(239,68,68,0.3)" : "rgba(37,99,235,0.3)") : (isCompleted ? palette.border : isCancelled ? "#fca5a5" : "#bfdbfe")}`,
            }}
          />

          <Button
            size="small"
            variant="outlined"
            onClick={() => onShowOnMap && onShowOnMap(trip)}
            sx={{
              height: 22,
              borderRadius: "6px",
              textTransform: "none",
              fontSize: "0.70rem",
              fontWeight: 700,
              color: isDark ? "#cbd5e1" : "#475569",
              borderColor: cardBorder,
              py: 0,
              px: 1,
              "&:hover": {
                borderColor: palette.main,
                color: palette.main,
                bgcolor: alpha(palette.main, 0.06),
              },
            }}
          >
            Show on Map
          </Button>
        </Box>
      </Box>

      {/* Main Row: Start Box | Center Arrow | End Box */}
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", lg: "row" },
          alignItems: { xs: "stretch", lg: "center" },
          gap: { xs: 1, lg: 1.25 },
        }}
      >
        {/* Start Odometer Box */}
        <TripOdometerPointBox
          tagLabel={`TRIP START (T${tripNum}S)`}
          headerColor={palette.main}
          time={trip.startTime}
          km={trip.startKm}
          photoPath={trip.startKmImage || trip.startKmImageUri || trip.startImage}
          location={trip.startLocation}
          onOpenPreview={onOpenPreview}
          tripInfo={trip}
        />

        {/* Center Distance & Arrow Indicator */}
        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "row", lg: "column" },
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            gap: { xs: 1, lg: 0.2 },
            py: { xs: 0.25, lg: 0 },
            px: { xs: 0.5, lg: 0.75 },
          }}
        >
          <Typography sx={{ fontWeight: 800, fontSize: "0.76rem", color: palette.main }}>
            {isCompleted ? `${diffKm} KM` : "En Route"}
          </Typography>

          {/* Arrow graphic */}
          <Box sx={{ display: "flex", alignItems: "center", width: { xs: 40, lg: 50 } }}>
            <Box sx={{ flex: 1, height: 1.5, bgcolor: palette.main }} />
            <Box
              sx={{
                width: 0,
                height: 0,
                borderTop: "3.5px solid transparent",
                borderBottom: "3.5px solid transparent",
                borderLeft: `5px solid ${palette.main}`,
              }}
            />
          </Box>

          <Typography sx={{ fontSize: "0.66rem", color: textSub, fontWeight: 600 }}>
            {isCompleted ? durationText : "Active"}
          </Typography>
        </Box>

        {/* End Odometer Box */}
        <TripOdometerPointBox
          tagLabel={`TRIP END (T${tripNum}E)`}
          headerColor={isCompleted ? (TRIP_COLOR_PALETTES[(index + 1) % TRIP_COLOR_PALETTES.length].main) : palette.main}
          time={trip.endTime}
          km={trip.endKm}
          photoPath={trip.endKmImage || trip.endKmImageUri || trip.endImage}
          location={trip.endLocation}
          onOpenPreview={onOpenPreview}
          tripInfo={trip}
          isOngoing={!isCompleted}
        />
      </Box>
    </Box>
  );
};

const OdometerTripCard = TripItemCardExact;

// ─── Daily Trips KM Calculation Breakdown Card ──────────────────────────────
const DailyTripsBreakdownCard = ({ trips }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const primaryColor = isDark ? "#60a5fa" : PRIMARY;
  const textTitle = isDark ? "#ffffff" : "#0f172a";
  const textSub = isDark ? "#94a3b8" : "#64748b";
  const cardBg = isDark ? "#0e1424" : "#ffffff";
  const cardBorder = isDark ? "rgba(255, 255, 255, 0.08)" : "#e8edf2";

  const totalDayKm = trips.reduce((sum, t) => {
    const s = Number(t.startKm) || 0;
    const e = Number(t.endKm) || s;
    const diff = t.totalKm !== undefined && Number(t.totalKm) > 0 ? Number(t.totalKm) : Math.max(0, e - s);
    return sum + diff;
  }, 0);

  const calcFormulaParts = trips.map((t, i) => {
    const s = Number(t.startKm) || 0;
    const e = Number(t.endKm) || s;
    const diff = t.totalKm !== undefined && Number(t.totalKm) > 0 ? Number(t.totalKm) : Math.max(0, e - s);
    return `${diff} KM (T${i + 1})`;
  });

  return (
    <Box
      sx={{
        bgcolor: cardBg,
        borderRadius: "14px",
        border: `1px solid ${cardBorder}`,
        p: { xs: 1.25, sm: 1.5 },
        display: "flex",
        flexDirection: "column",
        gap: 1.25,
        boxShadow: "0 2px 10px rgba(0,0,0,0.02)",
      }}
    >
      {/* Header */}
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 1 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
          <Speed sx={{ fontSize: 18, color: primaryColor }} />
          <Typography sx={{ fontWeight: 800, fontSize: "0.85rem", color: textTitle }}>
            Daily Trips KM Calculation Breakdown
          </Typography>
        </Box>
        <Chip
          label={`Total Day KM: ${totalDayKm} KM`}
          size="small"
          sx={{
            height: 22,
            bgcolor: isDark ? "rgba(5, 150, 105, 0.15)" : "#ecfdf5",
            color: isDark ? "#34d399" : "#059669",
            fontWeight: 800,
            fontSize: "0.70rem",
            borderRadius: "999px",
            border: `1px solid ${isDark ? "rgba(5, 150, 105, 0.3)" : "#a7f3d0"}`,
          }}
        />
      </Box>

      {/* Rows for Each Trip */}
      <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
        {trips.map((trip, i) => {
          const palette = TRIP_COLOR_PALETTES[i % TRIP_COLOR_PALETTES.length];
          const startNum = Number(trip.startKm) || 0;
          const endNum = Number(trip.endKm) || startNum;
          const diff = trip.totalKm !== undefined && Number(trip.totalKm) > 0 ? Number(trip.totalKm) : Math.max(0, endNum - startNum);

          return (
            <Box
              key={trip._id || trip.id || i}
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: 0.75,
                py: 0.4,
                px: 1,
                borderRadius: "8px",
                bgcolor: isDark ? "rgba(255,255,255,0.02)" : "#f8fafc",
                border: `1px solid ${cardBorder}`,
              }}
            >
              {/* Left description */}
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, flexWrap: "wrap" }}>
                <Chip
                  label={`Trip #${i + 1}`}
                  size="small"
                  sx={{
                    height: 19,
                    bgcolor: palette.chipBg,
                    color: "#fff",
                    fontWeight: 800,
                    fontSize: "0.64rem",
                    borderRadius: "5px",
                    px: 0.2,
                  }}
                />
                <Typography sx={{ fontWeight: 800, fontSize: "0.78rem", color: textTitle }}>
                  {trip.title || trip.workType || "Other"}
                </Typography>
                {(trip.isManualStartKm || trip.isManualEndKm || trip.manualStartKm || trip.manualEndKm) && (
                  <Chip
                    icon={<Edit sx={{ fontSize: "9px !important", color: isDark ? "#fbbf24" : "#92400e" }} />}
                    label="Manual"
                    size="small"
                    sx={{
                      height: 18,
                      bgcolor: isDark ? "rgba(245, 158, 11, 0.22)" : "#fef3c7",
                      color: isDark ? "#fbbf24" : "#92400e",
                      fontWeight: 800,
                      fontSize: "0.60rem",
                      borderRadius: "5px",
                      border: "1px solid rgba(245, 158, 11, 0.45)",
                      px: 0.2,
                      "& .MuiChip-icon": { ml: "3px", mr: "-4px" },
                    }}
                  />
                )}
                <Typography sx={{ fontSize: "0.70rem", color: textSub, fontWeight: 500 }}>
                  ({startNum.toLocaleString("en-IN")} KM → {endNum.toLocaleString("en-IN")} KM)
                </Typography>
              </Box>

              {/* Right equation */}
              <Typography sx={{ fontWeight: 700, fontSize: "0.76rem", color: textSub, fontFamily: "monospace" }}>
                {endNum.toLocaleString("en-IN")} - {startNum.toLocaleString("en-IN")} ={" "}
                <Typography component="span" sx={{ fontWeight: 800, color: palette.main, fontSize: "0.80rem" }}>
                  +{diff} KM
                </Typography>
              </Typography>
            </Box>
          );
        })}
      </Box>

      {/* Dashed Separator */}
      <Box sx={{ borderTop: `1px dashed ${isDark ? "rgba(255,255,255,0.15)" : "#cbd5e1"}` }} />

      {/* Total Calculation Footer */}
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 1 }}>
        <Typography sx={{ fontSize: "0.75rem", color: textSub, fontWeight: 600 }}>
          Total Calculation:{" "}
          <Typography component="span" sx={{ fontWeight: 800, color: primaryColor }}>
            {calcFormulaParts.join(" + ")}
          </Typography>
        </Typography>

        <Typography sx={{ fontWeight: 800, fontSize: "0.90rem", color: textTitle, fontFamily: "monospace" }}>
          = {totalDayKm} KM
        </Typography>
      </Box>
    </Box>
  );
};

// ─── Odometer Lightbox Modal ────────────────────────────────────────────────
const OdometerLightboxModal = ({ previewData, onClose, memberName }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const primaryColor = isDark ? "#60a5fa" : PRIMARY;

  if (!previewData) return null;

  return (
    <Box
      onClick={onClose}
      sx={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        bgcolor: "rgba(0,0,0,0.92)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        p: { xs: 2, sm: 4 },
        cursor: "zoom-out",
      }}
    >
      {/* Close button */}
      <IconButton
        onClick={onClose}
        sx={{
          position: "absolute",
          top: 20,
          right: 20,
          color: "#fff",
          bgcolor: "rgba(255,255,255,0.15)",
          "&:hover": { bgcolor: "rgba(255,255,255,0.3)" },
        }}
      >
        <Close sx={{ fontSize: 24 }} />
      </IconButton>

      {/* Top info badge */}
      <Box
        onClick={(e) => e.stopPropagation()}
        sx={{
          position: "absolute",
          top: 20,
          left: 20,
          maxWidth: "calc(100vw - 100px)",
          bgcolor: "rgba(15, 23, 42, 0.85)",
          border: "1px solid rgba(255,255,255,0.15)",
          borderRadius: "12px",
          px: 2,
          py: 1,
          color: "#fff",
          cursor: "default",
        }}
      >
        {(() => {
          const isStart = previewData.title && String(previewData.title).includes("START");
          const tripInfo = previewData.tripInfo;
          const isManual = isStart
            ? Boolean(tripInfo?.isManualStartKm || (tripInfo?.manualStartKm !== undefined && tripInfo?.manualStartKm !== null && String(tripInfo?.manualStartKm).trim() !== ""))
            : Boolean(tripInfo?.isManualEndKm || (tripInfo?.manualEndKm !== undefined && tripInfo?.manualEndKm !== null && String(tripInfo?.manualEndKm).trim() !== ""));
          const aiKm = isStart ? tripInfo?.aiDetectedStartKm : tripInfo?.aiDetectedEndKm;

          return (
            <>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.3, flexWrap: "wrap" }}>
                <Chip
                  label={previewData.title || "Odometer Photo"}
                  size="small"
                  sx={{
                    bgcolor: alpha(primaryColor, 0.25),
                    color: "#60a5fa",
                    fontWeight: 800,
                    fontSize: "0.72rem",
                    height: 22,
                  }}
                />
                {previewData.km !== undefined && previewData.km !== null && (
                  <Typography sx={{ fontWeight: 800, fontSize: "0.95rem", color: "#fff", fontFamily: "monospace" }}>
                    {Number(previewData.km).toLocaleString("en-IN")} KM
                  </Typography>
                )}

                {isManual ? (
                  <Chip
                    icon={<Edit sx={{ fontSize: "11px !important", color: "#fbbf24" }} />}
                    label="Manual Entry"
                    size="small"
                    sx={{
                      height: 22,
                      bgcolor: "rgba(245, 158, 11, 0.25)",
                      color: "#fbbf24",
                      fontWeight: 800,
                      fontSize: "0.68rem",
                      borderRadius: "6px",
                      border: "1px solid rgba(245, 158, 11, 0.5)",
                      "& .MuiChip-icon": { ml: "4px", mr: "-4px" },
                    }}
                  />
                ) : (
                  <Chip
                    icon={<CheckCircle sx={{ fontSize: "11px !important", color: "#34d399" }} />}
                    label="AI Scanned"
                    size="small"
                    sx={{
                      height: 22,
                      bgcolor: "rgba(34, 197, 94, 0.2)",
                      color: "#34d399",
                      fontWeight: 800,
                      fontSize: "0.68rem",
                      borderRadius: "6px",
                      border: "1px solid rgba(34, 197, 94, 0.4)",
                      "& .MuiChip-icon": { ml: "4px", mr: "-4px" },
                    }}
                  />
                )}
              </Box>

              {isManual && aiKm && String(aiKm) !== String(previewData.km) && (
                <Typography sx={{ fontSize: "0.72rem", color: "#fbbf24", fontWeight: 700, mb: 0.3 }}>
                  ⚠️ User manually wrote reading (AI camera detected: {Number(aiKm).toLocaleString("en-IN")} KM)
                </Typography>
              )}
            </>
          );
        })()}
        <Typography sx={{ fontSize: "0.75rem", color: "#cbd5e1" }}>
          User: <strong>{memberName}</strong> · {previewData.time ? new Date(previewData.time).toLocaleString("en-IN") : ""}
        </Typography>
        {previewData.location && (
          <Typography sx={{ fontSize: "0.72rem", color: "#94a3b8", mt: 0.2 }}>
            📍 {previewData.location}
          </Typography>
        )}
      </Box>

      {/* Full Image */}
      <Box
        component="img"
        src={previewData.url}
        alt="Odometer preview"
        onClick={(e) => e.stopPropagation()}
        sx={{
          maxWidth: "92vw",
          maxHeight: "82vh",
          borderRadius: "16px",
          objectFit: "contain",
          boxShadow: "0 12px 48px rgba(0,0,0,0.8)",
          border: "2px solid rgba(255,255,255,0.2)",
          cursor: "default",
        }}
      />
    </Box>
  );
};

// ─── Filter Drawer ────────────────────────────────────────────────────────────
const FilterDrawer = ({ open, onClose, filters, onApply }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const primaryColor = isDark ? "#60a5fa" : PRIMARY;
  const cardBg = isDark ? "#0e1424" : "#ffffff";
  const cardBorder = isDark ? "rgba(255, 255, 255, 0.08)" : "#e8edf2";
  const textTitle = isDark ? "#ffffff" : "#0f172a";
  const textSub = isDark ? "#94a3b8" : "#64748b";
  const [local, setLocal] = useState(filters);

  useEffect(() => {
    if (open) {
      setLocal(filters);
    }
  }, [filters, open]);

  return (
    <SwipeableDrawer anchor="bottom" open={open} onClose={onClose} onOpen={() => {}}
      PaperProps={{ sx: { borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: "80vh", bgcolor: cardBg, color: textTitle, borderTop: `1px solid ${cardBorder}` } }}>
      <Box sx={{ p: 3 }}>
        <Box sx={{ width: 36, height: 4, bgcolor: isDark ? "rgba(255,255,255,0.2)" : "#e2e8f0", borderRadius: 2, mx: "auto", mb: 2.5 }} />
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2.5 }}>
          <Typography variant="h6" fontWeight={700} sx={{ color: primaryColor }}>Filter Visits</Typography>
          <IconButton onClick={onClose} size="small"><Close sx={{ color: textSub }} /></IconButton>
        </Box>
        

        {/* Date Range */}
        <Typography sx={{ fontWeight: 600, fontSize: "0.82rem", color: textTitle, mb: 1 }}>Date Range</Typography>

        {/* Recent day chips */}
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 1.5 }}>
          {getRecentDays().map(o => (
            <Chip key={o.value} label={o.label}
              onClick={() => setLocal(p => ({ ...p, dateRange: o.value }))}
              sx={{
                fontWeight: 600, fontSize: "0.78rem", cursor: "pointer",
                bgcolor: local.dateRange === o.value ? primaryColor : (isDark ? "rgba(255,255,255,0.06)" : "#f1f5f9"),
                color:   local.dateRange === o.value ? (isDark ? "#0f172a" : "#fff")  : (isDark ? "#cbd5e1" : "#374151"),
              }} />
          ))}
          {/* This Week & This Month */}
          {[{ value: "week", label: "This Week" }, { value: "month", label: "This Month" }].map(o => (
            <Chip key={o.value} label={o.label}
              onClick={() => setLocal(p => ({ ...p, dateRange: o.value }))}
              sx={{
                fontWeight: 600, fontSize: "0.78rem", cursor: "pointer",
                bgcolor: local.dateRange === o.value ? primaryColor : (isDark ? "rgba(255,255,255,0.06)" : "#f1f5f9"),
                color:   local.dateRange === o.value ? (isDark ? "#0f172a" : "#fff")  : (isDark ? "#cbd5e1" : "#374151"),
              }} />
          ))}
        </Box>

        {/* Custom date picker */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2.5 }}>
          <CalendarToday sx={{ fontSize: 15, color: primaryColor }} />
          <Typography sx={{ fontSize: "0.78rem", color: textSub, fontWeight: 500 }}>Pick a date:</Typography>
          <Box
            component="input"
            type="date"
            max={new Date().toISOString().split("T")[0]}
            value={local.dateRange?.match(/^\d{4}-\d{2}-\d{2}$/) ? local.dateRange : ""}
            onChange={e => e.target.value && setLocal(p => ({ ...p, dateRange: e.target.value }))}
            sx={{
              border: `1px solid ${isDark ? "rgba(255,255,255,0.15)" : alpha(PRIMARY, 0.3)}`,
              bgcolor: isDark ? "#060a12" : "#ffffff",
              borderRadius: "8px", px: 1.25, py: 0.6,
              fontSize: "0.78rem", color: textTitle,
              outline: "none", cursor: "pointer",
              "&:focus": { borderColor: primaryColor },
            }}
          />
        </Box>

        <Typography sx={{ fontWeight: 600, fontSize: "0.82rem", color: textTitle, mb: 1 }}>Status</Typography>
        {["Completed", "InProgress", "Cancelled"].map(s => (
          <FormControlLabel key={s}
            label={<Typography sx={{ fontSize: "0.82rem", color: textTitle }}>{s}</Typography>}
            control={
              <Checkbox
                checked={local.statuses?.includes(s) || false}
                onChange={e => {
                  const a = local.statuses || [];
                  setLocal(p => ({ ...p, statuses: e.target.checked ? [...a, s] : a.filter(x => x !== s) }));
                }}
                sx={{ color: primaryColor, "&.Mui-checked": { color: primaryColor } }}
              />
            }
            sx={{ display: "flex", mb: 0.25 }} />
        ))}
        <Box sx={{ display: "flex", gap: 1.5, mt: 3 }}>
          <Button fullWidth variant="outlined" onClick={onClose}
            sx={{ borderColor: cardBorder, color: textSub, fontWeight: 600, borderRadius: "10px", py: 1.1, "&:hover": { borderColor: primaryColor } }}>
            Cancel
          </Button>
          <Button fullWidth variant="contained" onClick={() => { onApply(local); onClose(); }}
            sx={{ bgcolor: primaryColor, color: isDark ? "#0f172a" : "#fff", fontWeight: 700, borderRadius: "10px", py: 1.1, "&:hover": { bgcolor: isDark ? "#93c5fd" : "#1d4ed8" } }}>
            Apply
          </Button>
        </Box>
      </Box>
    </SwipeableDrawer>
  );
};

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function MemberVisitHistory({ userId: propUserId }) {
  const theme    = useTheme();
  const isDark   = theme.palette.mode === "dark";
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const pageBg = isDark ? "#060a12" : "#f4f6fb";
  const cardBg = isDark ? "#0e1424" : "#ffffff";
  const cardBorder = isDark ? "rgba(255, 255, 255, 0.08)" : "#e8edf2";
  const cardHoverBorder = isDark ? "rgba(255, 255, 255, 0.15)" : alpha(PRIMARY, 0.3);
  const textTitle = isDark ? "#ffffff" : "#0f172a";
  const textSub = isDark ? "#94a3b8" : "#64748b";
  const textMuted = isDark ? "#cbd5e1" : "#475569";
  const barBg = isDark ? "#090d18" : "#fafbfc";
  const dividerBorder = isDark ? "rgba(255, 255, 255, 0.08)" : "#f1f5f9";
  const primaryColor = isDark ? "#60a5fa" : PRIMARY;
  const { userId: paramUserId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user: authUser } = useAuth();

  const selectedMember = location.state || {};
  const userId = toIdString(paramUserId || propUserId);
  const stateUserId = getMemberStateUserId(selectedMember);
  const authUserId = toIdString(authUser);
  const targetUserId = stateUserId || userId || authUserId || readStoredUserId();
  const hasValidTargetUserId = isValidMongoObjectId(targetUserId);
  const isAdminView = !!paramUserId;

  const [visits,           setVisits]           = useState([]);
  const [loading,          setLoading]          = useState(true);
  const [error,            setError]            = useState(null);
  const [page,             setPage]             = useState(1);
  const [hInchargeore,          setHInchargeore]          = useState(false);
  const [loadingMore,      setLoadingMore]      = useState(false);
  const [isPunchedIn,      setIsPunchedIn]      = useState(false);
  const [hasPunchedOut,    setHasPunchedOut]    = useState(false);
  const [attendanceRecord, setAttendanceRecord] = useState(null);
  const [punchInLocation,  setPunchInLocation]  = useState(null);
  const [punchOutLocation, setPunchOutLocation] = useState(null);
  const [expenses,         setExpenses]         = useState([]);
  const [trips,            setTrips]            = useState([]);
  const [allTrips,         setAllTrips]         = useState([]);
  const [tripViewMode,     setTripViewMode]     = useState("filtered"); // "filtered" | "all"
  const [tripsLoading,     setTripsLoading]     = useState(false);
  const [odometerPreview,  setOdometerPreview]  = useState(null);
  const [timelineTab,      setTimelineTab]      = useState("visits"); // "visits" | "odometer"
  const [filters,          setFilters]          = useState(() => {
    const defaultDate = location.state?.selectedDate || "today";
    return { dateRange: defaultDate, statuses: [] };
  });
  const [filterOpen,       setFilterOpen]       = useState(false);
  const [fullscreen,       setFullscreen]       = useState(false);
  const [lastUpdated,      setLastUpdated]      = useState(null);
  const [locateTrigger,    setLocateTrigger]    = useState(0);
  const [locating,         setLocating]         = useState(false);
  const [punchInPopupTrigger, setPunchInPopupTrigger] = useState(0);
  const [gpsDistance,      setGpsDistance]      = useState(null);
  const [mapDistance,      setMapDistance]      = useState(null);
  const [currentLocation,  setCurrentLocation]  = useState(null);
  const [replayState,      setReplayState]      = useState(null);
  const [showReplaySimulator, setShowReplaySimulator] = useState(true);

  const handleReplayUpdate = useCallback((data) => {
    setReplayState((prev) => {
      if (!data && !prev) return null;
      if (!data) return null;
      if (
        prev &&
        prev.isReplaying === data.isReplaying &&
        prev.replayIndex === data.replayIndex &&
        prev.replaySpeed === data.replaySpeed &&
        prev.replayProgress === data.replayProgress &&
        prev.replayTimeStr === data.replayTimeStr &&
        prev.replayKmStr === data.replayKmStr &&
        prev.replayWaypointLabel === data.replayWaypointLabel &&
        prev.totalPoints === data.totalPoints
      ) {
        return prev;
      }
      return data;
    });
  }, []);

  const handleMapDistanceChange = useCallback((distanceData) => {
    setMapDistance((prev) => {
      if (
        prev?.totalKm === distanceData?.totalKm &&
        prev?.totalPoints === distanceData?.totalPoints
      ) {
        return prev;
      }
      return distanceData;
    });
  }, []);
  const [resolvedAddress,  setResolvedAddress]  = useState("");
  const [networkStatus, setNetworkStatus] = useState(() => {
    if (typeof navigator === "undefined" || !navigator.onLine) {
      return { isOnline: false, type: "offline", label: "Signal Off", color: "#ef4444", bg: "rgba(239, 68, 68, 0.12)" };
    }
    const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    const type = conn ? String(conn.type || "").toLowerCase() : "";
    const effType = conn ? String(conn.effectiveType || "").toUpperCase() : "";

    if (type === "cellular" || type.includes("mobile") || type.includes("cellular")) {
      return { isOnline: true, type: "cellular", label: `Mobile Data (${effType || "4G"})`, color: "#10b981", bg: "rgba(16, 185, 129, 0.12)" };
    }
    if (type === "ethernet") {
      return { isOnline: true, type: "ethernet", label: "Ethernet", color: "#3b82f6", bg: "rgba(59, 130, 246, 0.12)" };
    }
    return { isOnline: true, type: "wifi", label: "WiFi Connected", color: "#06b6d4", bg: "rgba(6, 182, 212, 0.12)" };
  });

  useEffect(() => {
    const updateNet = () => {
      if (typeof navigator === "undefined" || !navigator.onLine) {
        setNetworkStatus({ isOnline: false, type: "offline", label: "Signal Off", color: "#ef4444", bg: "rgba(239, 68, 68, 0.12)" });
        return;
      }
      const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
      const type = conn ? String(conn.type || "").toLowerCase() : "";
      const effType = conn ? String(conn.effectiveType || "").toUpperCase() : "";

      if (type === "cellular" || type.includes("mobile") || type.includes("cellular")) {
        setNetworkStatus({ isOnline: true, type: "cellular", label: `Mobile Data (${effType || "4G"})`, color: "#10b981", bg: "rgba(16, 185, 129, 0.12)" });
        return;
      }
      if (type === "ethernet") {
        setNetworkStatus({ isOnline: true, type: "ethernet", label: "Ethernet", color: "#3b82f6", bg: "rgba(59, 130, 246, 0.12)" });
        return;
      }
      setNetworkStatus({ isOnline: true, type: "wifi", label: "WiFi Connected", color: "#06b6d4", bg: "rgba(6, 182, 212, 0.12)" });
    };

    window.addEventListener("online", updateNet);
    window.addEventListener("offline", updateNet);

    const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (conn && conn.addEventListener) {
      conn.addEventListener("change", updateNet);
    }

    return () => {
      window.removeEventListener("online", updateNet);
      window.removeEventListener("offline", updateNet);
      if (conn && conn.removeEventListener) {
        conn.removeEventListener("change", updateNet);
      }
    };
  }, []);

  const isRawCoordinateValue = (val) => {
    if (!val) return true;
    const str = typeof val === "string" ? val : val?.full || val?.short || "";
    const trimmed = str.trim();
    if (
      !trimmed ||
      trimmed === "Fetching address…" ||
      trimmed === "Location not available" ||
      trimmed === "Detecting location…"
    ) {
      return true;
    }
    return /^-?\d+(\.\d+)?[,\s]+-?\d+(\.\d+)?$/.test(trimmed);
  };

  const lastGeocodedRef = useRef(null);
  const geocodeAddressCacheRef = useRef(new Map());

  useEffect(() => {
    const lat = Number(currentLocation?.lat || punchInLocation?.lat || visits?.[0]?.coordinates?.lat || visits?.[0]?.location?.lat);
    const lng = Number(currentLocation?.lng || punchInLocation?.lng || visits?.[0]?.coordinates?.lng || visits?.[0]?.location?.lng);
    if (!lat || !lng) return;

    const coordKey = `${lat.toFixed(4)},${lng.toFixed(4)}`;
    if (lastGeocodedRef.current === coordKey) return;
    lastGeocodedRef.current = coordKey;

    if (geocodeAddressCacheRef.current.has(coordKey)) {
      setResolvedAddress(geocodeAddressCacheRef.current.get(coordKey));
      return;
    }

    let active = true;

    const resolveLocation = async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=18&addressdetails=1`,
          { headers: { "Accept-Language": "en" } }
        );
        if (res.ok) {
          const data = await res.json();
          if (data?.display_name && active) {
            geocodeAddressCacheRef.current.set(coordKey, data.display_name);
            setResolvedAddress(data.display_name);
            return;
          }
        }
      } catch (e) {}

      try {
        const res = await fetch(
          `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`
        );
        if (res.ok) {
          const data = await res.json();
          const admin = (data.localityInfo?.administrative || [])
            .filter((a) => a.order >= 4 && !/india|asia|kolkata|council|basin|railway|subcontinent/i.test(a.name))
            .reverse()
            .map((a) => a.name.replace(/\(M\.Corp\.\)/i, '').replace(/Municipal Corporation/i, '').trim());
          const locality = data.locality || data.city;
          const district = data.principalSubdivision;
          const postcode = data.postcode;

          const uniqueParts = Array.from(
            new Set([
              admin[0],
              locality,
              district,
              postcode,
            ])
          ).filter(Boolean);

          if (uniqueParts.length > 0 && active) {
            const fullAddr = uniqueParts.join(", ");
            geocodeAddressCacheRef.current.set(coordKey, fullAddr);
            setResolvedAddress(fullAddr);
            return;
          }
        }
      } catch (e) {}
    };

    const timer = setTimeout(resolveLocation, 300);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [currentLocation?.lat, currentLocation?.lng, punchInLocation?.lat, punchInLocation?.lng, visits?.[0]?.coordinates?.lat, visits?.[0]?.coordinates?.lng]);
  const [autoVisitToast,   setAutoVisitToast]   = useState(null);
  const [dwellInfo,        setDwellInfo]        = useState(null);
  const [stayedLocations,  setStayedLocations]  = useState([]);
  const [liveBatteryInfo,  setLiveBatteryInfo]  = useState({ percentage: null, isCharging: false, recordedAt: null });
  const [punchBatteryInfo, setPunchBatteryInfo] = useState({ percentage: null, isCharging: false, recordedAt: null });
  const [targetUserReady,  setTargetUserReady]  = useState(false);
  const [targetLookupRetry, setTargetLookupRetry] = useState(0);
  const canLoadTargetUser = hasValidTargetUserId && targetUserReady;

  const handleLocateMe = () => {
    setLocating(true);
    setLocateTrigger(t => t + 1);

    if (!navigator.geolocation) {
      setLocating(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const accuracy = pos.coords.accuracy;
        setCurrentLocation({
          lat,
          lng,
          accuracy,
          time: new Date().toISOString(),
        });
        // Reset geocode cache so address refreshes for new coords
        lastGeocodedRef.current = null;
        setLocating(false);
      },
      () => {
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 0 }
    );
  };

  // Pan map to punch-in location and open the info popup
  const handlePunchInFocus = () => {
    setPunchInPopupTrigger(t => t + 1);
  };

  useEffect(() => {
    const onCreated = (e) => {
      const { locationName, address, dwellMins } = e.detail;
      setAutoVisitToast({ locationName, address, dwellMins });
      setDwellInfo(null);
      setPage(1);
      setTimeout(() => setAutoVisitToast(null), 7000);
    };
    window.addEventListener("autoVisitCreated", onCreated);
    return () => window.removeEventListener("autoVisitCreated", onCreated);
  }, []);

  useEffect(() => {
    if (!isPunchedIn || hasPunchedOut) { setDwellInfo(null); return; }
    const interval = setInterval(() => window.dispatchEvent(new CustomEvent("requestDwellInfo")), 60_000);
    const onDwell  = (e) => setDwellInfo(e.detail);
    window.addEventListener("dwellInfoResponse", onDwell);
    return () => { clearInterval(interval); window.removeEventListener("dwellInfoResponse", onDwell); };
  }, [isPunchedIn, hasPunchedOut]);

  useEffect(() => { return () => { if (isCurrentlyTracking()) stopTracking(); }; }, []);

  useEffect(() => {
    setLiveBatteryInfo({ percentage: null, isCharging: false, recordedAt: null });
    setPunchBatteryInfo({ percentage: null, isCharging: false, recordedAt: null });
    setMapDistance(null);
  }, [targetUserId]);

  useEffect(() => {
    let cancelled = false;
    setTargetUserReady(false);

    if (!targetUserId) {
      setLoading(false);
      return () => {
        cancelled = true;
      };
    }

    if (!hasValidTargetUserId) {
      setLoading(false);
      setVisits([]);
      setError("Selected member is not available. Please reopen this page from Team Tracking.");
      return () => {
        cancelled = true;
      };
    }

    setLoading(true);
    setError(null);
    apiFetch(`/user/getUserById/${targetUserId}`)
      .then(() => {
        if (cancelled) return;
        setTargetUserReady(true);
        setError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setTargetUserReady(false);
        setLoading(false);
        setVisits([]);
        setError(
          err.message === "User not found"
            ? "Selected member no longer exists. Please reopen this page from Team Tracking."
            : err.message
        );
      });

    return () => {
      cancelled = true;
    };
  }, [targetUserId, hasValidTargetUserId, targetLookupRetry]);

  const fetchPunchInStatus = useCallback(async () => {
    if (!targetUserId || !canLoadTargetUser) return;
    try {
      if (!isSingleDayFilter(filters.dateRange)) {
        setIsPunchedIn(false);
        setHasPunchedOut(false);
        setAttendanceRecord(null);
        setPunchInLocation(null);
        setPunchOutLocation(null);
        setPunchBatteryInfo({ percentage: null, isCharging: false, recordedAt: null });
        return;
      }

      const selectedDay = getSelectedDayKey(filters.dateRange);
      const res   = await apiFetch("/attendance", {
        startDate: selectedDay, endDate: selectedDay, limit: 1,
        ...(isAdminView ? { userId: targetUserId } : {}),
      });
      const list = res?.data?.attendances || res?.result?.attendances || res?.data || [];
      const att  = Array.isArray(list) ? list[0] : list;
      setAttendanceRecord(att || null);

      if (att?.punchIn?.time) {
        const out = !!att?.punchOut?.time;
        const batterySnapshot =
          att.punchIn?.battery ||
          att.metadata?.batteryAtPunchIn ||
          null;
        setIsPunchedIn(!out);
        setHasPunchedOut(out);
        setPunchInLocation({
          lat:     att.punchIn?.location?.lat  || att.punchIn?.location?.latitude  || null,
          lng:     att.punchIn?.location?.lng  || att.punchIn?.location?.longitude || null,
          address: att.punchIn?.address || null,
          time:    att.punchIn?.time    || null,
        });
        const normalizedPercentage =
          batterySnapshot?.percentage !== undefined && batterySnapshot?.percentage !== null
            ? Number(batterySnapshot.percentage)
            : null;
        setPunchBatteryInfo(prev => {
          if (!Number.isFinite(normalizedPercentage) && prev.percentage !== null) {
            return prev;
          }

          return {
            percentage: Number.isFinite(normalizedPercentage) ? normalizedPercentage : null,
            isCharging: batterySnapshot?.isCharging ?? false,
            recordedAt: batterySnapshot?.recordedAt || att.punchIn?.time || null,
          };
        });
        if (out && att.punchOut?.time) {
          setPunchOutLocation({
            lat:     att.punchOut?.location?.lat  || att.punchOut?.location?.latitude  || null,
            lng:     att.punchOut?.location?.lng  || att.punchOut?.location?.longitude || null,
            address: att.punchOut?.address || null,
            time:    att.punchOut?.time    || null,
          });
        } else {
          setPunchOutLocation(null);
        }
      } else {
        setIsPunchedIn(false);
        setHasPunchedOut(false);
        setPunchInLocation(null);
        setPunchOutLocation(null);
        setPunchBatteryInfo({ percentage: null, isCharging: false, recordedAt: null });
      }
    } catch (e) { console.warn("Punch-in status failed:", e.message); }
  }, [targetUserId, canLoadTargetUser, isAdminView, filters.dateRange]);

  const fetchExpenses = useCallback(async () => {
    if (!targetUserId || !canLoadTargetUser) {
      setExpenses([]);
      return;
    }

    try {
      const res = await apiFetch("/expense/getAll", {
        userId: targetUserId,
        limit: 100,
        ...getDateRange(filters.dateRange),
      });
      const list = res?.data?.expenses || res?.result?.expenses || res?.expenses || [];
      setExpenses(Array.isArray(list) ? list : []);
    } catch (e) {
      console.warn("Expense fetch failed:", e.message);
      setExpenses([]);
    }
  }, [filters.dateRange, targetUserId, canLoadTargetUser]);

  const fetchVisits = useCallback(async (pageNum = 1, append = false) => {
    if (!targetUserId || !canLoadTargetUser) {
      setLoading(false);
      setLoadingMore(false);
      return;
    }
    try {
      if (pageNum === 1) setLoading(true); else setLoadingMore(true);
      setError(null);

      const res = await apiFetch("/visit", {
        page: pageNum, limit: 15,
        ...getDateRange(filters.dateRange),
        ...(isAdminView ? { userId: targetUserId } : {}),
        ...(filters.statuses?.length ? { status: filters.statuses.join(",") } : {}),
      });

      const fetchedVisits =
        res?.data?.visits    ||
        res?.result?.visits  ||
        res?.visits          ||
        (Array.isArray(res?.data)   ? res.data   : null) ||
        (Array.isArray(res?.result) ? res.result : null) ||
        [];

      const pagination = res?.data?.pagination || res?.result?.pagination || res?.pagination || null;

      setVisits(prev => append ? [...prev, ...fetchedVisits] : fetchedVisits);
      setHInchargeore(pagination ? pageNum < pagination.totalPages : false);
      setLastUpdated(new Date());
    } catch (err) { setError(err.message); }
    finally { setLoading(false); setLoadingMore(false); }
  }, [filters, targetUserId, canLoadTargetUser, isAdminView]);

  const fetchStats = useCallback(async () => {
    if (!targetUserId || !canLoadTargetUser) return;
    try {
      await apiFetch("/visit/stats/overview", {
        ...getDateRange(filters.dateRange),
        ...(isAdminView ? { userId: targetUserId } : {}),
      });
    } catch {}
  }, [filters, targetUserId, canLoadTargetUser, isAdminView]);

  const fetchGpsDistance = useCallback(async () => {
    if (!targetUserId || !canLoadTargetUser) return;
    if (!isSingleDayFilter(filters.dateRange)) {
      setGpsDistance(null);
      return;
    }
    try {
      const selectedDate = getSelectedDayKey(filters.dateRange);
      const res = await apiFetch("/location/distance", { date: selectedDate, salesmanId: targetUserId });
      const data  = res?.data || res?.result || res;
      setGpsDistance({ totalKm: data?.totalKm ?? 0, totalPoints: data?.totalPoints ?? 0 });
    } catch (e) { console.warn("GPS distance fetch failed:", e.message); }
  }, [filters.dateRange, targetUserId, canLoadTargetUser]);

  const fetchStayedLocations = useCallback(async () => {
    if (!targetUserId || !canLoadTargetUser || !isSingleDayFilter(filters.dateRange)) {
      setStayedLocations([]);
      return;
    }

    try {
      const selectedDate = getSelectedDayKey(filters.dateRange);
      const res = await apiFetch("/location/stays", {
        date: selectedDate,
        salesmanId: targetUserId,
        minimumStayMinutes: 15,
      });
      const data = res?.data || res?.result || res;
      const locations = data?.stayedLocations || [];
      setStayedLocations(Array.isArray(locations) ? locations : []);
    } catch (e) {
      console.warn("Stayed locations fetch failed:", e.message);
      setStayedLocations([]);
    }
  }, [filters.dateRange, targetUserId, canLoadTargetUser]);

  const fetchTrips = useCallback(async () => {
    if (!targetUserId || !canLoadTargetUser) {
      setTrips([]);
      setAllTrips([]);
      return;
    }
    try {
      setTripsLoading(true);
      const selectedDay = isSingleDayFilter(filters.dateRange) ? getSelectedDayKey(filters.dateRange) : null;
      let queryParams = { userId: targetUserId };
      if (filters.dateRange === "today") {
        queryParams.filter = "today";
      } else if (filters.dateRange === "month") {
        queryParams.filter = "month";
      } else if (selectedDay) {
        queryParams.filter = "date";
        queryParams.date = selectedDay;
      } else {
        queryParams.filter = "all";
      }

      const [filteredRes, allRes] = await Promise.allSettled([
        apiFetch("/trips", queryParams),
        apiFetch("/trips", { userId: targetUserId, filter: "all" }),
      ]);

      if (filteredRes.status === "fulfilled") {
        const list =
          filteredRes.value?.data?.trips ||
          filteredRes.value?.result?.trips ||
          filteredRes.value?.data ||
          filteredRes.value?.trips ||
          [];
        setTrips(Array.isArray(list) ? list : []);
      }

      if (allRes.status === "fulfilled") {
        const listAll =
          allRes.value?.data?.trips ||
          allRes.value?.result?.trips ||
          allRes.value?.data ||
          allRes.value?.trips ||
          [];
        setAllTrips(Array.isArray(listAll) ? listAll : []);
      }
    } catch (e) {
      console.warn("Trips fetch failed:", e.message);
      setTrips([]);
      setAllTrips([]);
    } finally {
      setTripsLoading(false);
    }
  }, [filters.dateRange, targetUserId, canLoadTargetUser]);

  const fetchLatestBattery = useCallback(async () => {
    if (!targetUserId || !canLoadTargetUser) return;
    try {
      const res = await apiFetch(`/battery/latest/${targetUserId}`, {}, { ignoreNotFound: true });
      if (!res) return;
      const data = res?.data || res?.result || res;
      if (data?.percentage !== undefined) {
        const normalizedPercentage =
          data?.percentage !== undefined && data?.percentage !== null
            ? Number(data.percentage)
            : null;
        setLiveBatteryInfo({
          percentage: Number.isFinite(normalizedPercentage) ? normalizedPercentage : null,
          isCharging: data.isCharging ?? false,
          recordedAt: data.createdAt || data.recordedAt || null,
        });
      }
    } catch {}
  }, [targetUserId, canLoadTargetUser]);

  const memberName =
    selectedMember.memberName ||
    selectedMember.userName ||
    authUser?.name ||
    authUser?.fullName ||
    "Selected User";
  const memberRole =
    selectedMember.memberRole ||
    authUser?.role ||
    (isAdminView ? "Field User" : "My Visit History");
  const memberPhone = selectedMember.memberPhone || authUser?.phoneNumber || authUser?.phone || "";
  const memberEmail = selectedMember.memberEmail || authUser?.email || "";
  const memberInitials = memberName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "SU";

  useEffect(() => {
    if (!targetUserId) return;
    if (!hasValidTargetUserId) {
      setLoading(false);
      setVisits([]);
      setError("Selected member is not available. Please reopen this page from Team Tracking.");
      return;
    }
    setPage(1);
    fetchVisits(1, false);
    fetchStats();
    fetchPunchInStatus();
    fetchExpenses();
    fetchTrips();
    fetchGpsDistance();
    fetchStayedLocations();
    fetchLatestBattery();
  }, [filters, userId, authUserId, targetUserId, hasValidTargetUserId, fetchVisits, fetchStats, fetchPunchInStatus, fetchExpenses, fetchTrips, fetchGpsDistance, fetchStayedLocations, fetchLatestBattery]);

  const handleRefresh = () => {
    if (!hasValidTargetUserId) return;
    setPage(1);
    fetchVisits(1, false);
    fetchStats();
    fetchPunchInStatus();
    fetchExpenses();
    fetchTrips();
    fetchGpsDistance();
    fetchStayedLocations();
    fetchLatestBattery();
  };

  useEffect(() => {
    if (!hasPunchedOut || !hasValidTargetUserId) return;
    const timer = setTimeout(() => { fetchVisits(1, false); fetchExpenses(); fetchTrips(); fetchGpsDistance(); fetchStayedLocations(); }, 2000);
    return () => clearTimeout(timer);
  }, [hasPunchedOut, hasValidTargetUserId, fetchVisits, fetchExpenses, fetchTrips, fetchGpsDistance, fetchStayedLocations]);

  useEffect(() => {
    if (!targetUserId || !hasValidTargetUserId) return;
    if (filters.dateRange && filters.dateRange !== "today") return;
    const interval = setInterval(() => {
      fetchVisits(1, false);
      fetchExpenses();
      fetchTrips();
      fetchGpsDistance();
      fetchStayedLocations();
      fetchPunchInStatus();
      fetchLatestBattery();
    }, 12_000);
    return () => clearInterval(interval);
  }, [targetUserId, hasValidTargetUserId, filters.dateRange, fetchVisits, fetchExpenses, fetchTrips, fetchGpsDistance, fetchStayedLocations, fetchPunchInStatus, fetchLatestBattery]);

  // ── Derived stats ──────────────────────────────────────────────────────────
  const selectedMapDate = isSingleDayFilter(filters.dateRange)
    ? getSelectedDayKey(filters.dateRange)
    : null;
  const useVisitTrailOnly = !isSingleDayFilter(filters.dateRange);

  const visibleVisits = useMemo(
    () =>
      visits.filter(
        (visit) =>
          !isSystemStartLocationVisit(visit) &&
          isVisitInDateRange(visit, filters.dateRange),
      ),
    [visits, filters.dateRange]
  );
  const totalDist       = visibleVisits.reduce((s, v) => s + (v.distanceFromPreviousKm ?? v.distance ?? 0), 0);
  const mapDistanceKm   = Number(mapDistance?.totalKm || 0);
  const gpsDistanceKm   = Number(gpsDistance?.totalKm || 0);
  const isTodayFilter   = filters.dateRange === "today" || getSelectedDayKey(filters.dateRange) === new Date().toISOString().split("T")[0];
  const displayDistanceKm = isTodayFilter && !isPunchedIn
    ? 0
    : gpsDistanceKm > 0 ? gpsDistanceKm : mapDistanceKm > 0 ? mapDistanceKm : totalDist;
  const stayedStopCount = stayedLocations.reduce(
    (sum, stay) => sum + Math.max(1, Number(stay.visitCount) || 0),
    0,
  );
  const totalStopCount = visibleVisits.length + stayedStopCount;
  const totalVisitMinutes = visibleVisits.reduce((s, v) => s + (v.timeSpentMinutes || 0), 0);
  const totalStayedMinutes = stayedLocations.reduce(
    (sum, stay) => sum + (Number(stay.totalDurationMinutes) || 0),
    0,
  );
  const avgTime = totalStopCount
    ? Math.round((totalVisitMinutes + totalStayedMinutes) / totalStopCount)
    : 0;
  const completedCount  = visibleVisits.filter(v => v.status === "Completed").length;
  const inProgressCount = visibleVisits.filter(v => v.status === "InProgress").length;
  const cancelledCount  = visibleVisits.filter(v => v.status === "Cancelled").length;
  const updatedLabel    = lastUpdated
    ? (() => { const m = Math.floor((Date.now() - lastUpdated) / 60000); return m < 1 ? "just now" : `${m}m ago`; })()
    : null;

  // ── Visits sorted oldest → newest for A→B→C display ──────────────────────
  // Keep newest visits first in the timeline.
  const sortedVisits = visibleVisits;
  const currentBatteryInfo = liveBatteryInfo.percentage !== null ? liveBatteryInfo : punchBatteryInfo;
  const timelineBatteryInfo = punchBatteryInfo;
  const currentBatteryChip = getBatteryChipStyle(currentBatteryInfo.percentage, isDark);
  const timelineBatteryChip = getBatteryChipStyle(timelineBatteryInfo.percentage, isDark);
  const batteryInfo = currentBatteryInfo;
  const batteryChip = currentBatteryChip;
  const expenseTotal = expenses.reduce((sum, item) => sum + (Number(item?.amount) || 0), 0);
  const expenseCount = expenses.length;
  const selectedStatusLabel = formatStatusLabel(attendanceRecord?.status, isPunchedIn, hasPunchedOut);
  const selectedDayLabel = getDateRangeLabel(filters.dateRange);
  const punchInTimeValue = punchInLocation?.time || attendanceRecord?.punchIn?.time || null;
  const punchOutTimeValue = punchOutLocation?.time || attendanceRecord?.punchOut?.time || null;
  const workHoursValue = attendanceRecord?.workHours !== undefined && attendanceRecord?.workHours !== null
    ? Number(attendanceRecord.workHours)
    : null;
  const summaryCards = [
    { label: "Date", value: selectedDayLabel },
    { label: "Punch In", value: punchInTimeValue ? fmt(punchInTimeValue) : "—" },
    { label: "Punch Out", value: punchOutTimeValue ? fmt(punchOutTimeValue) : "—" },
    { label: "Hours", value: workHoursValue !== null ? `${workHoursValue.toFixed(2)} hrs` : "—" },
    { label: "Status", value: selectedStatusLabel },
    { label: "KM", value: `${displayDistanceKm.toFixed(2)} km` },
    { label: "Visits", value: `${totalStopCount}` },
    { label: "Expense", value: formatCurrency(expenseTotal) },
  ];

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: pageBg, color: textTitle }}>
      <FilterDrawer open={filterOpen} onClose={() => setFilterOpen(false)} filters={filters} onApply={setFilters} />

      <Box sx={{ p: { xs: 1.5, sm: 2, lg: 2.5 }, maxWidth: 1600, mx: "auto", display: "flex", flexDirection: "column", gap: 2 }}>
        {error && (
          <Alert severity="error" sx={{ borderRadius: "10px" }}
            action={<Button size="small" onClick={handleRefresh}>Retry</Button>}>
            {error}
          </Alert>
        )}

        {/* Auto-visit toast */}
        {autoVisitToast && (
          <Box sx={{
            bgcolor: isDark ? "#1e293b" : "#0f172a", color: "#fff", borderRadius: "14px", px: 2.5, py: 1.5,
            display: "flex", alignItems: "center", gap: 2,
            boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
            animation: "fadeSlideIn 0.35s ease",
            "@keyframes fadeSlideIn": { from: { opacity: 0, transform: "translateY(-10px)" }, to: { opacity: 1, transform: "translateY(0)" } },
          }}>
            <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: SUCCESS, flexShrink: 0, animation: "avp 1.5s ease-in-out infinite", "@keyframes avp": { "0%,100%": { opacity: 1 }, "50%": { opacity: 0.4 } } }} />
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography sx={{ fontSize: "0.84rem", fontWeight: 700, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                📍 {autoVisitToast.locationName}
              </Typography>
              {autoVisitToast.address && (
                <Typography sx={{ fontSize: "0.7rem", color: "#cbd5e1", mt: 0.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {autoVisitToast.address}
                </Typography>
              )}
              <Typography sx={{ fontSize: "0.7rem", color: "#94a3b8", mt: 0.2 }}>
                Auto-visit · stopped {autoVisitToast.dwellMins} min
              </Typography>
            </Box>
            <Box sx={{ px: 1.5, py: 0.5, bgcolor: alpha(SUCCESS, 0.15), borderRadius: "8px", border: `1px solid ${alpha(SUCCESS, 0.25)}`, flexShrink: 0 }}>
              <Typography sx={{ fontSize: "0.8rem", fontWeight: 800, color: SUCCESS }}>{autoVisitToast.dwellMins} min</Typography>
            </Box>
          </Box>
        )}

        {/* ── Top Full-Width Member Profile Header ── */}
        {isAdminView && (
          <Box sx={{
            bgcolor: cardBg,
            borderRadius: "14px",
            border: `1px solid ${cardBorder}`,
            boxShadow: "0 2px 10px rgba(0,0,0,0.03)",
            px: { xs: 1.5, sm: 2 },
            py: 1.25,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 1.5,
            flexWrap: "wrap",
          }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, minWidth: 0 }}>
              <Button
                size="small"
                startIcon={<ArrowBack sx={{ fontSize: 16 }} />}
                onClick={() => navigate(-1)}
                sx={{
                  color: textSub,
                  border: `1px solid ${cardBorder}`,
                  borderRadius: "8px",
                  px: 1.2,
                  py: 0.4,
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  textTransform: "none",
                  "&:hover": { bgcolor: alpha(primaryColor, 0.08), borderColor: primaryColor, color: primaryColor }
                }}
              >
                Back
              </Button>

              <Box sx={{ position: "relative" }}>
                <Avatar
                  src={toBackendAssetUrl(selectedMember?.memberAvatar || selectedMember?.avatar || selectedMember?.profileImage)}
                  sx={{
                    width: 38,
                    height: 38,
                    borderRadius: "10px",
                    bgcolor: alpha(primaryColor, 0.12),
                    color: primaryColor,
                    fontSize: "0.9rem",
                    fontWeight: 800,
                    border: `2px solid ${isPunchedIn && !hasPunchedOut ? "#10b981" : "#ef4444"}`,
                    boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
                  }}
                >
                  {memberInitials}
                </Avatar>
                <Box sx={{
                  position: "absolute", bottom: -2, right: -2, width: 10, height: 10, borderRadius: "50%",
                  bgcolor: isPunchedIn && !hasPunchedOut ? "#10b981" : "#ef4444",
                  border: "2px solid #fff",
                }} />
              </Box>

              <Box sx={{ minWidth: 0 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                  <Typography sx={{ fontSize: "0.95rem", fontWeight: 800, color: textTitle, lineHeight: 1.2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {memberName}
                  </Typography>
                  <Chip
                    label="TEAM"
                    size="small"
                    sx={{ height: 18, fontSize: "0.62rem", fontWeight: 800, bgcolor: alpha(primaryColor, 0.1), color: primaryColor, border: `1px solid ${alpha(primaryColor, 0.2)}` }}
                  />
                </Box>
                <Typography sx={{ fontSize: "0.72rem", fontWeight: 600, color: textSub, mt: 0.1, whiteSpace: "nowrap" }}>
                  {memberRole}
                </Typography>
              </Box>
            </Box>

            <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, flexWrap: "wrap" }}>
              {/* Duty Badge */}
              {isPunchedIn && !hasPunchedOut ? (
                <Chip
                  icon={<Box sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: SUCCESS, animation: "livePulse 1.5s infinite", "@keyframes livePulse": { "0%,100%": { opacity: 1 }, "50%": { opacity: 0.3 } } }} />}
                  label="On Duty"
                  size="small"
                  sx={{ bgcolor: alpha(SUCCESS, 0.12), color: SUCCESS, fontWeight: 800, fontSize: "0.7rem", height: 24, px: 0.4, border: `1px solid ${alpha(SUCCESS, 0.25)}` }}
                />
              ) : (
                <Chip
                  icon={<LocationOff sx={{ fontSize: "12px !important", color: "#ef4444 !important" }} />}
                  label="Location Off"
                  size="small"
                  sx={{ bgcolor: "rgba(239, 68, 68, 0.12)", color: "#ef4444", fontWeight: 800, fontSize: "0.7rem", height: 24, px: 0.4, border: "1px solid rgba(239, 68, 68, 0.25)" }}
                />
              )}

              {/* Network Chip */}
              <Chip
                icon={
                  !networkStatus.isOnline ? (
                    <WifiOff sx={{ fontSize: "13px !important", color: `${networkStatus.color} !important` }} />
                  ) : networkStatus.type === "cellular" ? (
                    <SignalCellularAlt sx={{ fontSize: "13px !important", color: `${networkStatus.color} !important` }} />
                  ) : networkStatus.type === "ethernet" ? (
                    <Lan sx={{ fontSize: "13px !important", color: `${networkStatus.color} !important` }} />
                  ) : (
                    <Wifi sx={{ fontSize: "13px !important", color: `${networkStatus.color} !important` }} />
                  )
                }
                label={networkStatus.label}
                size="small"
                sx={{
                  bgcolor: networkStatus.bg,
                  color: networkStatus.color,
                  fontWeight: 700,
                  fontSize: "0.7rem",
                  height: 24,
                  px: 0.4,
                  border: `1px solid ${alpha(networkStatus.color, 0.25)}`,
                }}
              />

              {/* Battery Chip */}
              <Chip
                size="small"
                label={`${batteryChip.label}${batteryInfo.isCharging ? " • Charging" : ""}`}
                sx={{ bgcolor: batteryChip.bg, color: batteryChip.color, fontWeight: 700, fontSize: "0.7rem", height: 24, border: `1px solid ${batteryChip.border}` }}
              />

              {memberPhone && (
                <Chip
                  size="small"
                  label={memberPhone}
                  sx={{ bgcolor: isDark ? "rgba(255, 255, 255, 0.05)" : "#f8fafc", color: textMuted, fontWeight: 600, fontSize: "0.7rem", height: 24, border: `1px solid ${cardBorder}` }}
                />
              )}
              {memberEmail && (
                <Chip
                  size="small"
                  label={memberEmail}
                  sx={{ bgcolor: alpha(primaryColor, isDark ? 0.15 : 0.06), color: primaryColor, fontWeight: 600, fontSize: "0.7rem", height: 24 }}
                />
              )}
            </Box>
          </Box>
        )}

        {/* ── Top Full-Width Dual Distance Metrics Cards ── */}
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))" }, gap: 2 }}>
          {/* Card 1: Attendance Route Distance (Dark Navy Theme) */}
          <Box sx={{
            bgcolor: isDark ? "#060a12" : "#0b1329",
            borderRadius: "14px",
            px: 2,
            py: 1.5,
            border: "1px solid rgba(255, 255, 255, 0.08)",
            boxShadow: "0 4px 16px rgba(11, 19, 41, 0.12)",
            position: "relative",
            overflow: "hidden",
            transition: "all 0.2s ease",
            "&:hover": { transform: "translateY(-1px)", boxShadow: "0 6px 20px rgba(37, 99, 235, 0.2)" }
          }}>
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 0.5 }}>
              <Typography sx={{ color: "#93c5fd", fontWeight: 800, fontSize: "0.68rem", textTransform: "uppercase", letterSpacing: "0.6px" }}>
                ATTENDANCE ROUTE DISTANCE
              </Typography>
              <Box sx={{ width: 28, height: 28, borderRadius: "7px", bgcolor: "rgba(37, 99, 235, 0.25)", color: "#60a5fa", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <CompareArrows sx={{ fontSize: 16 }} />
              </Box>
            </Box>
            {loading ? <Skeleton width={80} height={28} sx={{ bgcolor: "rgba(255,255,255,0.1)" }} /> : (
              <>
                <Typography sx={{ fontSize: "1.45rem", fontWeight: 900, color: "#ffffff", letterSpacing: "-0.5px", lineHeight: 1.1 }}>
                  {displayDistanceKm.toFixed(2)}{" "}
                  <Typography component="span" sx={{ fontSize: "0.78rem", fontWeight: 700, color: "#93c5fd" }}>km</Typography>
                </Typography>
                <Typography sx={{ fontSize: "0.68rem", color: "#94a3b8", mt: 0.35, fontWeight: 500 }}>
                  Punch In → Punch Out GPS visit route
                </Typography>
              </>
            )}
          </Box>

          {/* Card 2: Vehicle Odometer Distance (Clean Light Theme) */}
          <Box sx={{
            bgcolor: cardBg,
            borderRadius: "14px",
            px: 2,
            py: 1.5,
            border: `1px solid ${cardBorder}`,
            boxShadow: "0 2px 10px rgba(0,0,0,0.03)",
            position: "relative",
            overflow: "hidden",
            transition: "all 0.2s ease",
            "&:hover": { transform: "translateY(-1px)", boxShadow: "0 6px 20px rgba(16, 185, 129, 0.12)", borderColor: alpha(SUCCESS, 0.4) }
          }}>
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 0.5 }}>
              <Typography sx={{ color: textSub, fontWeight: 800, fontSize: "0.68rem", textTransform: "uppercase", letterSpacing: "0.6px" }}>
                VEHICLE ODOMETER DISTANCE
              </Typography>
              <Box sx={{ width: 28, height: 28, borderRadius: "7px", bgcolor: isDark ? "rgba(16, 185, 129, 0.18)" : "#ecfdf5", color: isDark ? "#34d399" : "#059669", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Speed sx={{ fontSize: 16 }} />
              </Box>
            </Box>
            {tripsLoading ? <Skeleton width={80} height={28} /> : (
              <>
                <Typography sx={{ fontSize: "1.45rem", fontWeight: 900, color: textTitle, letterSpacing: "-0.5px", lineHeight: 1.1 }}>
                  {trips.reduce((sum, t) => {
                    const s = Number(t.startKm) || 0;
                    const e = Number(t.endKm) || s;
                    const diff = t.totalKm !== undefined && Number(t.totalKm) > 0 ? Number(t.totalKm) : Math.max(0, e - s);
                    return sum + diff;
                  }, 0)}{" "}
                  <Typography component="span" sx={{ fontSize: "0.78rem", fontWeight: 700, color: textSub }}>KM</Typography>
                </Typography>
                <Typography sx={{ fontSize: "0.68rem", color: textMuted, mt: 0.35, fontWeight: 500 }}>
                  {trips.length} Work Trip{trips.length === 1 ? "" : "s"} recorded
                </Typography>
              </>
            )}
          </Box>
        </Box>

        {/* ── Main 2-Column Content Grid ── */}
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "1fr 385px", xl: "1fr 410px" }, gap: 2, alignItems: "start" }}>

          {/* ── LEFT COLUMN: Map, Simulator & Trip Details ── */}
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>

            {/* Map */}
            <Box sx={{
              borderRadius: "16px", overflow: "hidden", border: `1px solid ${cardBorder}`,
              height: fullscreen ? "70vh" : { xs: 320, sm: 390, lg: 440 },
              boxShadow: "0 4px 24px rgba(0,0,0,0.06)", transition: "height 0.3s ease",
              position: "relative",
            }}>
             

              <Tooltip title={fullscreen ? "Exit fullscreen" : "Fullscreen"} placement="left">
                <Box onClick={() => setFullscreen(p => !p)} sx={{ position: "absolute", top: 50, right: 10, zIndex: 1000, bgcolor: cardBg, borderRadius: "10px", p: 0.75, cursor: "pointer", boxShadow: "0 2px 10px rgba(0,0,0,0.12)", border: `1px solid ${cardBorder}`, display: "flex", "&:hover": { bgcolor: isDark ? "rgba(255,255,255,0.08)" : "#f8fafc" } }}>
                  {fullscreen ? <FullscreenExit sx={{ fontSize: 18, color: textTitle }} /> : <Fullscreen sx={{ fontSize: 18, color: textTitle }} />}
                </Box>
              </Tooltip>

              {dwellInfo && dwellInfo.mins >= 1 && (
                <Box sx={{ position: "absolute", bottom: 48, left: 10, zIndex: 1000, bgcolor: isDark ? "rgba(14,20,36,0.95)" : "rgba(255,255,255,0.95)", borderRadius: "10px", px: 1.5, py: 0.75, display: "flex", alignItems: "center", gap: 1, boxShadow: "0 2px 10px rgba(0,0,0,0.12)", border: `1px solid ${cardBorder}` }}>
                  <Box sx={{ width: 7, height: 7, borderRadius: "50%", bgcolor: WARNING, animation: "dp 1.5s ease-in-out infinite", "@keyframes dp": { "0%,100%": { opacity: 1 }, "50%": { opacity: 0.3 } } }} />
                  <Typography sx={{ fontSize: "0.72rem", fontWeight: 700, color: textTitle }}>Stopped {dwellInfo.mins} min</Typography>
                  {dwellInfo.mins < 15 && <Typography sx={{ fontSize: "0.65rem", color: textSub }}>· visit in {15 - dwellInfo.mins} min</Typography>}
                </Box>
              )}

              <Tooltip title="Live location" placement="left">
                <Box onClick={handleLocateMe} sx={{ position: "absolute", top: 96, right: 10, zIndex: 1000, bgcolor: locating ? primaryColor : (isDark ? "#0e1424" : "#fff"), borderRadius: "10px", p: 0.75, cursor: "pointer", boxShadow: "0 2px 10px rgba(0,0,0,0.12)", border: `1px solid ${locating ? primaryColor : cardBorder}`, display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s", "&:hover": { bgcolor: locating ? primaryColor : alpha(primaryColor, 0.08), borderColor: primaryColor } }}>
                  {locating ? <CircularProgress size={18} sx={{ color: isDark ? "#060a12" : "#fff" }} /> : <GpsFixed sx={{ fontSize: 18, color: primaryColor }} />}
                </Box>
              </Tooltip>
          


{hasValidTargetUserId ? (
  <LiveTrackingMap
    isPunchedIn={isPunchedIn}
    hasPunchedOut={hasPunchedOut}
    userId={targetUserId}
    isOwner={!isAdminView}
    height="100%"
    locateTrigger={locateTrigger}
    punchInPopupTrigger={punchInPopupTrigger}
    onDistanceChange={handleMapDistanceChange}
    onCurrentLocationChange={setCurrentLocation}
    punchInLocation={punchInLocation}
    punchOutLocation={punchOutLocation}
    punchBatteryInfo={punchBatteryInfo}
    resolvedAddress={resolvedAddress}
    visits={visibleVisits}
    stayedLocations={stayedLocations}
    selectedDate={selectedMapDate}
    preferVisitTrail={useVisitTrailOnly}
    onReplayUpdate={handleReplayUpdate}
  />
) : (
  <Box
    sx={{
      height: "100%",
      display: "grid",
      placeItems: "center",
      bgcolor: isDark ? "rgba(255,255,255,0.03)" : "#f8fafc",
      borderRadius: "18px",
      p: 3,
      textAlign: "center",
    }}
  >
    <Alert severity="warning">
      Selected member is not available. Please reopen this page from Team Tracking.
    </Alert>
  </Box>
)}


            </Box>

            {/* If dismissed, offer a button to re-open simulator */}
            {!showReplaySimulator && replayState && replayState.hasPoints && (
              <Box sx={{ display: "flex", justifyContent: "flex-end", alignItems: "center" }}>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => setShowReplaySimulator(true)}
                  startIcon={<Route sx={{ fontSize: 18 }} />}
                  sx={{
                    textTransform: "none",
                    fontWeight: 800,
                    fontSize: "0.80rem",
                    borderRadius: "12px",
                    color: primaryColor,
                    borderColor: alpha(primaryColor, 0.4),
                    bgcolor: alpha(primaryColor, isDark ? 0.14 : 0.05),
                    px: 2,
                    py: 0.75,
                    boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                    transition: "all 0.2s ease",
                    "&:hover": {
                      borderColor: primaryColor,
                      bgcolor: alpha(primaryColor, isDark ? 0.22 : 0.1),
                      boxShadow: `0 4px 14px ${alpha(primaryColor, 0.18)}`,
                    },
                  }}
                >
                  ▶ Open Route Replay Simulator
                </Button>
              </Box>
            )}

            {/* Dedicated Route Replay Simulator Card */}
            {showReplaySimulator && replayState && replayState.hasPoints && (
              <Box sx={{
                bgcolor: cardBg,
                borderRadius: "20px",
                p: { xs: 2.25, sm: 2.75 },
                border: `1px solid ${cardBorder}`,
                boxShadow: "0 8px 30px rgba(0,0,0,0.05)",
                display: "flex",
                flexDirection: "column",
                gap: 2,
                transition: "all 0.25s ease",
              }}>
                {/* Header: Title + Time/Km + Speed options + Dismiss Button */}
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 1.5 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                    <Box sx={{
                      width: 44,
                      height: 44,
                      borderRadius: "14px",
                      bgcolor: alpha(primaryColor, isDark ? 0.2 : 0.1),
                      color: primaryColor,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      boxShadow: `0 2px 10px ${alpha(primaryColor, 0.2)}`,
                    }}>
                      <Route sx={{ fontSize: 24 }} />
                    </Box>
                    <Box>
                      <Typography sx={{ fontWeight: 800, fontSize: "1rem", color: textTitle, letterSpacing: "-0.2px", lineHeight: 1.2 }}>
                        Route Replay Simulator
                      </Typography>
                      <Typography sx={{ fontWeight: 500, fontSize: "0.75rem", color: textSub, mt: 0.3 }}>
                        Watch the journey along the road from Point A step-by-step
                      </Typography>
                    </Box>
                  </Box>

                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, flexWrap: "wrap" }}>
                    {/* Time & Stop Location Pill (No KM factor) */}
                    <Box sx={{
                      bgcolor: isDark ? "rgba(255,255,255,0.06)" : "#f8fafc",
                      border: `1px solid ${cardBorder}`,
                      borderRadius: "10px",
                      px: 1.5,
                      py: 0.65,
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                    }}>
                      <Typography sx={{ fontSize: "0.85rem", fontWeight: 800, color: primaryColor }}>
                        🕒 {replayState.replayTimeStr}
                      </Typography>
                      <Typography sx={{ fontSize: "0.75rem", color: textMuted }}>•</Typography>
                      <Typography sx={{ fontSize: "0.82rem", fontWeight: 800, color: textTitle }}>
                        📍 {replayState.replayWaypointLabel || "Punch In"}
                      </Typography>
                    </Box>

                    {/* Speed Selector */}
                    <Box sx={{
                      bgcolor: isDark ? "rgba(255,255,255,0.06)" : "#f1f5f9",
                      borderRadius: "10px",
                      p: 0.4,
                      display: "flex",
                      gap: 0.5,
                    }}>
                      {[1, 2, 5].map((spd) => {
                        const active = replayState.replaySpeed === spd;
                        return (
                          <ButtonBase
                            key={spd}
                            onClick={() => replayState.setSpeed(spd)}
                            sx={{
                              px: 1.25,
                              py: 0.4,
                              borderRadius: "7px",
                              fontSize: "0.75rem",
                              fontWeight: 800,
                              bgcolor: active ? primaryColor : "transparent",
                              color: active ? "#ffffff" : textSub,
                              transition: "all 0.15s ease",
                            }}
                          >
                            {spd}x
                          </ButtonBase>
                        );
                      })}
                    </Box>

                    {/* Dismiss / Normal Tracking Button */}
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => {
                        setShowReplaySimulator(false);
                        if (typeof replayState?.dismissReplay === "function") {
                          replayState.dismissReplay();
                        }
                      }}
                      startIcon={<Close sx={{ fontSize: 16 }} />}
                      sx={{
                        textTransform: "none",
                        borderRadius: "10px",
                        borderColor: isDark ? "rgba(255,255,255,0.18)" : "#e2e8f0",
                        color: isDark ? "#cbd5e1" : "#64748b",
                        fontWeight: 700,
                        fontSize: "0.75rem",
                        py: 0.45,
                        px: 1.25,
                        bgcolor: isDark ? "rgba(255,255,255,0.03)" : "#ffffff",
                        transition: "all 0.15s ease",
                        "&:hover": {
                          borderColor: "#ef4444",
                          color: "#ef4444",
                          bgcolor: alpha("#ef4444", 0.08),
                        },
                      }}
                    >
                      Dismiss / Normal Tracking
                    </Button>
                  </Box>
                </Box>

                {/* Controls & Progress Slider */}
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "nowrap" }}>
                  {/* Play / Pause button */}
                  <Button
                    variant="contained"
                    onClick={replayState.toggleReplay}
                    startIcon={replayState.isReplaying ? <Pause sx={{ fontSize: 18 }} /> : <PlayArrow sx={{ fontSize: 18 }} />}
                    sx={{
                      background: replayState.isReplaying
                        ? "linear-gradient(135deg, #475569 0%, #334155 100%)"
                        : "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
                      color: "#ffffff",
                      fontWeight: 800,
                      fontSize: "0.84rem",
                      textTransform: "none",
                      borderRadius: "12px",
                      px: 2.25,
                      py: 1,
                      boxShadow: replayState.isReplaying
                        ? "0 4px 14px rgba(71, 85, 105, 0.3)"
                        : "0 4px 14px rgba(37, 99, 235, 0.4)",
                      whiteSpace: "nowrap",
                      flexShrink: 0,
                      transition: "all 0.2s ease",
                      "&:hover": {
                        background: replayState.isReplaying
                          ? "linear-gradient(135deg, #334155 0%, #1e293b 100%)"
                          : "linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%)",
                        boxShadow: "0 6px 18px rgba(37, 99, 235, 0.5)",
                      },
                    }}
                  >
                    {replayState.isReplaying ? "Pause Route" : replayState.replayIndex > 0 && replayState.replayIndex >= replayState.totalPoints - 1 ? "Replay Again" : "Play Route"}
                  </Button>

                  {/* Waypoint Pill */}
                  <Chip
                    label={replayState.replayWaypointLabel}
                    size="medium"
                    sx={{
                      bgcolor: isDark ? "rgba(16, 185, 129, 0.15)" : "#ecfdf5",
                      color: "#059669",
                      fontWeight: 800,
                      fontSize: "0.78rem",
                      border: `1px solid ${alpha("#10b981", 0.3)}`,
                      borderRadius: "10px",
                      height: 38,
                      px: 0.5,
                      flexShrink: 0,
                    }}
                  />

                  {/* Range Slider */}
                  <Box sx={{ flex: 1, display: "flex", alignItems: "center", px: 1 }}>
                    <Slider
                      value={replayState.replayProgress}
                      onChange={(_, val) => replayState.seek(val)}
                      aria-label="Route Replay Progress"
                      sx={{
                        color: primaryColor,
                        height: 6,
                        "& .MuiSlider-thumb": {
                          width: 18,
                          height: 18,
                          transition: "0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                          "&:before": { boxShadow: "0 2px 8px rgba(0,0,0,0.25)" },
                          "&:hover, &.Mui-focusVisible": { boxShadow: `0px 0px 0px 8px ${alpha(primaryColor, 0.16)}` },
                          "&.Mui-active": { width: 22, height: 22 },
                        },
                        "& .MuiSlider-track": { border: "none" },
                        "& .MuiSlider-rail": { opacity: 0.25, bgcolor: textSub },
                      }}
                    />
                  </Box>

                  {/* Step Buttons */}
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, flexShrink: 0 }}>
                    <IconButton
                      size="small"
                      onClick={replayState.stepBackward}
                      title="Step Backward"
                      sx={{ bgcolor: isDark ? "rgba(255,255,255,0.06)" : "#f1f5f9", borderRadius: "10px", p: 1 }}
                    >
                      <SkipPrevious sx={{ fontSize: 18, color: textTitle }} />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={replayState.stepForward}
                      title="Step Forward"
                      sx={{ bgcolor: isDark ? "rgba(255,255,255,0.06)" : "#f1f5f9", borderRadius: "10px", p: 1 }}
                    >
                      <SkipNext sx={{ fontSize: 18, color: textTitle }} />
                    </IconButton>
                  </Box>
                </Box>
              </Box>
            )}


            {/* Completion bar */}
            {!loading && visibleVisits.length > 0 && (
              <Box sx={{ bgcolor: cardBg, borderRadius: "14px", p: 2.5, border: `1px solid ${cardBorder}` }}>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1.5 }}>
                  <Typography sx={{ fontWeight: 700, fontSize: "0.85rem", color: textTitle }}>Visit Completion</Typography>
                  <Typography sx={{ fontWeight: 800, fontSize: "1rem", color: primaryColor }}>
                    {Math.round((completedCount / visibleVisits.length) * 100)}%
                  </Typography>
                </Box>
                <Box sx={{ display: "flex", height: 10, borderRadius: "999px", overflow: "hidden", bgcolor: isDark ? "rgba(255,255,255,0.08)" : "#f1f5f9", mb: 1.5 }}>
                  {completedCount  > 0 && <Box sx={{ width: `${(completedCount  / visibleVisits.length) * 100}%`, bgcolor: SUCCESS, transition: "width 0.6s" }} />}
                  {inProgressCount > 0 && <Box sx={{ width: `${(inProgressCount / visibleVisits.length) * 100}%`, bgcolor: primaryColor, animation: "sh 1.5s ease-in-out infinite", "@keyframes sh": { "0%,100%": { opacity: 1 }, "50%": { opacity: 0.5 } } }} />}
                  {cancelledCount  > 0 && <Box sx={{ width: `${(cancelledCount  / visibleVisits.length) * 100}%`, bgcolor: ERROR, opacity: 0.45 }} />}
                </Box>
                <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
                  {[
                    { label: "Done",      count: completedCount,  color: SUCCESS },
                    { label: "Active",    count: inProgressCount, color: primaryColor },
                    { label: "Cancelled", count: cancelledCount,  color: ERROR   },
                  ].map(s => (
                    <Box key={s.label} sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                      <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: s.color }} />
                      <Typography sx={{ fontSize: "0.72rem", color: textSub }}>{s.label}</Typography>
                      <Box sx={{ px: 0.75, py: 0.1, borderRadius: "4px", bgcolor: alpha(s.color, 0.1) }}>
                        <Typography sx={{ fontSize: "0.68rem", fontWeight: 700, color: s.color }}>
                          {s.count} · {Math.round((s.count / visibleVisits.length) * 100)}%
                        </Typography>
                      </Box>
                    </Box>
                  ))}
                </Box>
              </Box>
            )}

            {/* Current Location Box (Bottom Position) */}
            <Box sx={{
              bgcolor: cardBg,
              borderRadius: "20px",
              border: `1px solid ${cardBorder}`,
              boxShadow: "0 8px 32px rgba(0,0,0,0.05)",
              p: { xs: 2.5, sm: 3 },
              display: "flex",
              flexDirection: "column",
              gap: 2,
            }}>
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 1.5 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                  <Box sx={{
                    width: 42, height: 42, borderRadius: "14px",
                    bgcolor: alpha(isPunchedIn && !hasPunchedOut ? SUCCESS : primaryColor, isDark ? 0.2 : 0.12),
                    color: isPunchedIn && !hasPunchedOut ? SUCCESS : primaryColor,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    boxShadow: `0 4px 12px ${alpha(isPunchedIn && !hasPunchedOut ? SUCCESS : primaryColor, 0.2)}`,
                  }}>
                    <LocationOn sx={{ fontSize: 22 }} />
                  </Box>
                  <Box>
                    <Typography sx={{ fontWeight: 800, fontSize: "0.98rem", color: textTitle, lineHeight: 1.2 }}>
                      Current Location
                    </Typography>
                    <Typography sx={{ fontSize: "0.75rem", fontWeight: 500, color: textSub, mt: 0.3 }}>
                      {isPunchedIn && !hasPunchedOut ? "Live Real-Time Duty Location" : "Last Recorded Position"}
                    </Typography>
                  </Box>
                </Box>

                <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                  {/* Network Status Chip */}
                  <Chip
                    icon={
                      !networkStatus.isOnline ? (
                        <WifiOff sx={{ fontSize: "14px !important", color: `${networkStatus.color} !important` }} />
                      ) : networkStatus.type === "cellular" ? (
                        <SignalCellularAlt sx={{ fontSize: "14px !important", color: `${networkStatus.color} !important` }} />
                      ) : networkStatus.type === "ethernet" ? (
                        <Lan sx={{ fontSize: "14px !important", color: `${networkStatus.color} !important` }} />
                      ) : (
                        <Wifi sx={{ fontSize: "14px !important", color: `${networkStatus.color} !important` }} />
                      )
                    }
                    label={networkStatus.label}
                    size="small"
                    sx={{
                      bgcolor: networkStatus.bg,
                      color: networkStatus.color,
                      fontWeight: 700,
                      fontSize: "0.72rem",
                      height: 26,
                      px: 0.5,
                      border: `1px solid ${alpha(networkStatus.color, 0.25)}`,
                    }}
                  />

                  {/* Duty Status Chip */}
                  {isPunchedIn && !hasPunchedOut ? (
                    <Chip
                      icon={<Box sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: SUCCESS, animation: "livePulse 1.5s infinite", "@keyframes livePulse": { "0%,100%": { opacity: 1 }, "50%": { opacity: 0.3 } } }} />}
                      label="On Duty"
                      size="small"
                      sx={{ bgcolor: alpha(SUCCESS, 0.12), color: SUCCESS, fontWeight: 800, fontSize: "0.72rem", height: 26, px: 0.5, border: `1px solid ${alpha(SUCCESS, 0.25)}` }}
                    />
                  ) : (
                    <Chip
                      icon={<LocationOff sx={{ fontSize: "13px !important", color: "#ef4444 !important" }} />}
                      label="Location Off"
                      size="small"
                      sx={{ bgcolor: "rgba(239, 68, 68, 0.12)", color: "#ef4444", fontWeight: 800, fontSize: "0.72rem", height: 26, px: 0.5, border: "1px solid rgba(239, 68, 68, 0.25)" }}
                    />
                  )}

                  {/* Live Location Button */}
                  <Button
                    size="small"
                    variant="contained"
                    startIcon={locating ? <CircularProgress size={14} sx={{ color: isDark ? "#060a12" : "#fff" }} /> : <GpsFixed sx={{ fontSize: 15 }} />}
                    onClick={handleLocateMe}
                    sx={{
                      bgcolor: primaryColor,
                      color: isDark ? "#060a12" : "#fff",
                      fontWeight: 800,
                      fontSize: "0.78rem",
                      textTransform: "none",
                      borderRadius: "12px",
                      px: 2,
                      py: 0.6,
                      boxShadow: `0 4px 14px ${alpha(primaryColor, 0.4)}`,
                      "&:hover": {
                        bgcolor: isDark ? "#93c5fd" : "#1d4ed8",
                        boxShadow: `0 6px 18px ${alpha(primaryColor, 0.5)}`,
                        transform: "translateY(-1px)",
                      },
                      transition: "all 0.2s ease",
                    }}
                  >
                    Live Location
                  </Button>
                </Box>
              </Box>

              {/* Address card */}
              <Box sx={{
                bgcolor: isDark ? "rgba(255,255,255,0.03)" : "#f8fafc",
                borderRadius: "14px",
                p: 2,
                border: `1px solid ${dividerBorder}`,
              }}>
                <Typography sx={{ fontSize: "0.88rem", fontWeight: 700, color: textTitle, lineHeight: 1.5, mb: 1 }}>
                  {currentLocation?.accuracy ? "📡" : "📍"} {resolvedAddress || currentLocation?.address || (typeof punchInLocation?.address === "string" ? punchInLocation.address : punchInLocation?.address?.full || punchInLocation?.address?.short) || visibleVisits[0]?.address || "Location coordinates active"}
                </Typography>

                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 1 }}>
                  {/* Coords + status row */}
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                    <Typography sx={{ fontSize: "0.78rem", color: primaryColor, fontFamily: "monospace", fontWeight: 700, bgcolor: alpha(primaryColor, isDark ? 0.18 : 0.08), px: 1.2, py: 0.3, borderRadius: "6px" }}>
                      {Number(currentLocation?.lat || punchInLocation?.lat || visibleVisits[0]?.coordinates?.lat || 20.29044).toFixed(5)},{" "}
                      {Number(currentLocation?.lng || punchInLocation?.lng || visibleVisits[0]?.coordinates?.lng || 85.86197).toFixed(5)}
                    </Typography>

                    {/* Show live badge when current location was freshly fetched */}
                    {currentLocation?.accuracy ? (
                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                        <Box sx={{
                          display: "inline-flex", alignItems: "center", gap: 0.5,
                          bgcolor: alpha("#22c55e", 0.12), border: "1px solid",
                          borderColor: alpha("#22c55e", 0.3), borderRadius: "6px",
                          px: 0.9, py: 0.25,
                        }}>
                          <Box sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: "#22c55e",
                            animation: "livePulse 1.5s ease-in-out infinite",
                            "@keyframes livePulse": { "0%,100%": { opacity: 1 }, "50%": { opacity: 0.3 } },
                          }} />
                          <Typography sx={{ fontSize: "0.68rem", fontWeight: 800, color: "#16a34a" }}>Live · Now</Typography>
                        </Box>
                        <Typography sx={{ fontSize: "0.68rem", color: textSub, fontWeight: 600 }}>
                          ±{Math.round(currentLocation.accuracy)}m
                        </Typography>
                      </Box>
                    ) : (currentLocation?.time || currentLocation?.recordedAt || punchInLocation?.time) ? (
                      <Typography sx={{ fontSize: "0.75rem", color: textSub, fontWeight: 600 }}>
                        Recorded {fmt(currentLocation?.time || currentLocation?.recordedAt || punchInLocation?.time)}
                      </Typography>
                    ) : null}
                  </Box>

                  <Button
                    component="a"
                    href={`https://www.google.com/maps/search/?api=1&query=${currentLocation?.lat || punchInLocation?.lat || 20.29044},${currentLocation?.lng || punchInLocation?.lng || 85.86197}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    endIcon={<OpenInNew sx={{ fontSize: 13 }} />}
                    sx={{ fontSize: "0.75rem", color: primaryColor, fontWeight: 700, textTransform: "none", p: 0, minWidth: 0, "&:hover": { bgcolor: "transparent", textDecoration: "underline" } }}
                  >
                    Open Google Maps
                  </Button>
                </Box>
              </Box>
            </Box>

            {/* ── Daily Trips & Odometer Tracking Section (Matching Design) ── */}
            {(() => {
              const displayTrips = tripViewMode === "filtered" ? trips : allTrips;
              const totalTripKm = displayTrips.reduce((sum, t) => {
                const s = Number(t.startKm) || 0;
                const e = Number(t.endKm) || s;
                const diff = t.totalKm !== undefined && Number(t.totalKm) > 0 ? Number(t.totalKm) : Math.max(0, e - s);
                return sum + diff;
              }, 0);

              const handleShowOnMap = (trip) => {
                if (trip.startLocation || trip.endLocation) {
                  const targetQuery = trip.startLocation || trip.endLocation;
                  window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(targetQuery)}`, "_blank");
                }
              };

              return (
                <Box sx={{
                  bgcolor: cardBg,
                  borderRadius: "16px",
                  border: `1px solid ${cardBorder}`,
                  boxShadow: "0 4px 20px rgba(0,0,0,0.03)",
                  p: { xs: 1.5, sm: 2 },
                  display: "flex",
                  flexDirection: "column",
                  gap: 1.5,
                }}>
                  {/* Header Row */}
                  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 1 }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Box sx={{
                        width: 36, height: 36, borderRadius: "10px",
                        bgcolor: isDark ? "rgba(37, 99, 235, 0.18)" : "#eff6ff",
                        color: isDark ? "#60a5fa" : "#2563eb",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        border: `1px solid ${isDark ? "rgba(37, 99, 235, 0.3)" : "#dbeafe"}`,
                      }}>
                        <DirectionsCar sx={{ fontSize: 20 }} />
                      </Box>
                      <Box>
                        <Typography sx={{ fontWeight: 800, fontSize: "0.95rem", color: textTitle, lineHeight: 1.2 }}>
                          Daily Trips & Odometer Tracking
                        </Typography>
                        <Typography sx={{ fontSize: "0.72rem", fontWeight: 500, color: textSub, mt: 0.2 }}>
                          Color-coded route recognition (Trip 1, 2, 3, 4) with start/end odometer details
                        </Typography>
                      </Box>
                    </Box>

                    {/* Right Badges & Toggle */}
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, flexWrap: "wrap" }}>
                      <Chip
                        label={`${displayTrips.length} Trip${displayTrips.length === 1 ? "" : "s"}`}
                        size="small"
                        sx={{
                          height: 24,
                          bgcolor: isDark ? "rgba(37, 99, 235, 0.15)" : "#eff6ff",
                          color: isDark ? "#60a5fa" : "#2563eb",
                          fontWeight: 800,
                          fontSize: "0.72rem",
                          borderRadius: "999px",
                          border: `1px solid ${isDark ? "rgba(37, 99, 235, 0.3)" : "#bfdbfe"}`,
                          px: 0.3,
                        }}
                      />

                      <Chip
                        label={`Trip KM: ${totalTripKm} KM`}
                        size="small"
                        sx={{
                          height: 24,
                          bgcolor: isDark ? "rgba(5, 150, 105, 0.15)" : "#ecfdf5",
                          color: isDark ? "#34d399" : "#059669",
                          fontWeight: 800,
                          fontSize: "0.72rem",
                          borderRadius: "999px",
                          border: `1px solid ${isDark ? "rgba(5, 150, 105, 0.3)" : "#a7f3d0"}`,
                          px: 0.3,
                        }}
                      />

                      {/* View mode toggle */}
                      <Button
                        size="small"
                        variant={tripViewMode === "filtered" ? "contained" : "outlined"}
                        onClick={() => setTripViewMode(tripViewMode === "filtered" ? "all" : "filtered")}
                        sx={{
                          height: 24,
                          borderRadius: "6px",
                          textTransform: "none",
                          fontSize: "0.70rem",
                          fontWeight: 700,
                          px: 1,
                          borderColor: cardBorder,
                          bgcolor: tripViewMode === "all" ? primaryColor : "transparent",
                          color: tripViewMode === "all" ? (isDark ? "#060a12" : "#fff") : textSub,
                          "&:hover": { borderColor: primaryColor },
                        }}
                      >
                        {tripViewMode === "filtered" ? "View All History" : "Current Date"}
                      </Button>
                    </Box>
                  </Box>

                  {/* Trips Cards List */}
                  {tripsLoading ? (
                    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      {[1, 2].map((i) => (
                        <Skeleton key={i} variant="rounded" width="100%" height={160} sx={{ borderRadius: "18px" }} />
                      ))}
                    </Box>
                  ) : displayTrips.length > 0 ? (
                    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      {displayTrips.map((trip, idx) => (
                        <TripItemCardExact
                          key={trip._id || trip.id || `${trip.startTime}-${idx}`}
                          trip={trip}
                          index={idx}
                          onOpenPreview={setOdometerPreview}
                          onShowOnMap={handleShowOnMap}
                        />
                      ))}

                      {/* Daily Trips KM Calculation Breakdown */}
                      <DailyTripsBreakdownCard trips={displayTrips} />
                    </Box>
                  ) : (
                    <Box
                      sx={{
                        bgcolor: isDark ? "rgba(255,255,255,0.02)" : "#f8fafc",
                        borderRadius: "18px",
                        p: 4,
                        textAlign: "center",
                        border: `1px dashed ${cardBorder}`,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 1.5,
                      }}
                    >
                      <Box
                        sx={{
                          width: 52,
                          height: 52,
                          borderRadius: "50%",
                          bgcolor: isDark ? "rgba(37, 99, 235, 0.15)" : "#eff6ff",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: primaryColor,
                        }}
                      >
                        <DirectionsCar sx={{ fontSize: 28 }} />
                      </Box>
                      <Box>
                        <Typography sx={{ fontWeight: 700, fontSize: "0.95rem", color: textTitle }}>
                          No Odometer Trips for {filters.dateRange === "today" ? "Today" : "Selected Date"}
                        </Typography>
                        <Typography sx={{ fontSize: "0.78rem", color: textSub, mt: 0.5, maxWidth: 420 }}>
                          {allTrips.length > 0
                            ? `There are ${allTrips.length} odometer trip records recorded for this member across all dates.`
                            : "This user has not submitted any trip odometer verification images yet."}
                        </Typography>
                      </Box>
                      {allTrips.length > 0 && tripViewMode === "filtered" && (
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => setTripViewMode("all")}
                          sx={{
                            borderRadius: "10px",
                            textTransform: "none",
                            fontSize: "0.78rem",
                            fontWeight: 700,
                            color: primaryColor,
                            borderColor: alpha(primaryColor, 0.4),
                            "&:hover": { borderColor: primaryColor, bgcolor: alpha(primaryColor, 0.08) },
                          }}
                        >
                          View All {allTrips.length} Odometer Records
                        </Button>
                      )}
                    </Box>
                  )}
                </Box>
              );
            })()}
          </Box>

          {/* ── RIGHT — Visit Timeline & Odometer Tabs ── */}
          <Box sx={{
            bgcolor: cardBg, borderRadius: "20px", border: `1px solid ${cardBorder}`,
            boxShadow: "0 8px 32px rgba(0,0,0,0.05)", overflow: "hidden",
            display: "flex", flexDirection: "column",
            position: { lg: "sticky" }, top: { lg: 16 },
            maxHeight: "calc(100vh - 110px)",
          }}>
            {/* Header with Switcher Tabs */}
            <Box sx={{ px: 3, py: 2, borderBottom: `1px solid ${dividerBorder}` }}>
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.5 }}>
                {/* Tabs */}
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Button
                    size="small"
                    onClick={() => setTimelineTab("visits")}
                    sx={{
                      px: 1.5,
                      py: 0.4,
                      borderRadius: "8px",
                      textTransform: "none",
                      fontSize: "0.82rem",
                      fontWeight: 800,
                      bgcolor: timelineTab === "visits" ? alpha(primaryColor, isDark ? 0.25 : 0.12) : "transparent",
                      color: timelineTab === "visits" ? primaryColor : textSub,
                      border: timelineTab === "visits" ? `1px solid ${alpha(primaryColor, 0.3)}` : "1px solid transparent",
                      "&:hover": { bgcolor: alpha(primaryColor, 0.1) },
                    }}
                  >
                    Visits ({visibleVisits.length})
                  </Button>

                  <Button
                    size="small"
                    onClick={() => setTimelineTab("odometer")}
                    startIcon={<Speed sx={{ fontSize: 15 }} />}
                    sx={{
                      px: 1.5,
                      py: 0.4,
                      borderRadius: "8px",
                      textTransform: "none",
                      fontSize: "0.82rem",
                      fontWeight: 800,
                      bgcolor: timelineTab === "odometer" ? alpha(primaryColor, isDark ? 0.25 : 0.12) : "transparent",
                      color: timelineTab === "odometer" ? primaryColor : textSub,
                      border: timelineTab === "odometer" ? `1px solid ${alpha(primaryColor, 0.3)}` : "1px solid transparent",
                      "&:hover": { bgcolor: alpha(primaryColor, 0.1) },
                    }}
                  >
                    Odometer ({trips.length})
                  </Button>
                </Box>

                <Tooltip title="Refresh">
                  <IconButton size="small" onClick={handleRefresh}
                    sx={{ color: textSub, "&:hover": { color: primaryColor, bgcolor: alpha(primaryColor, 0.06) } }}>
                    <Refresh sx={{ fontSize: 16 }} />
                  </IconButton>
                </Tooltip>
              </Box>

              {!loading && displayDistanceKm >= 0.005 && (
                <Chip
                  icon={<Route sx={{ fontSize: "13px !important" }} />}
                  label={`${displayDistanceKm.toFixed(2)} km travelled`}
                  size="small"
                  sx={{ mb: 0.75, bgcolor: alpha(primaryColor, isDark ? 0.15 : 0.08), color: primaryColor, fontWeight: 700, fontSize: "0.7rem", height: 22, "& .MuiChip-icon": { color: primaryColor } }}
                />
              )}

              {updatedLabel && (
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.4 }}>
                  <AccessTime sx={{ fontSize: 12, color: textSub }} />
                  <Typography sx={{ fontSize: "0.7rem", color: textSub }}>Updated {updatedLabel}</Typography>
                </Box>
              )}
            </Box>

            {/* Filter bar */}
            <Box sx={{ px: 3, py: 1.25, borderBottom: `1px solid ${dividerBorder}`, bgcolor: barBg, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <CalendarToday sx={{ fontSize: 13, color: primaryColor }} />
               
                <Typography sx={{ fontSize: "0.75rem", fontWeight: 600, color: primaryColor }}>
                  {filters.dateRange === "today" ? "Today"
                   : filters.dateRange === "yesterday" ? "Yesterday"
                   : filters.dateRange === "week" ? "This Week"
                   : filters.dateRange === "month" ? "This Month"
                   : filters.dateRange?.match(/^\d{4}-\d{2}-\d{2}$/)
                     ? new Date(filters.dateRange).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
                     : filters.dateRange}
                </Typography>

                <Typography sx={{ fontSize: "0.72rem", color: textSub }}>
                  · {loading ? "…" : timelineTab === "odometer" ? `${trips.length} odometer trip${trips.length !== 1 ? "s" : ""}` : `${visibleVisits.length} visit${visibleVisits.length !== 1 ? "s" : ""}`}
                  {timelineTab !== "odometer" && stayedLocations.length > 0 ? ` · ${stayedLocations.length} stayed` : ""}
                </Typography>
              </Box>
              <Badge badgeContent={filters.statuses?.length || 0} color="primary"
                sx={{ "& .MuiBadge-badge": { fontSize: "0.6rem", height: 16, minWidth: 16 } }}>
                <Box onClick={() => setFilterOpen(true)} sx={{ display: "flex", alignItems: "center", gap: 0.5, cursor: "pointer", px: 1, py: 0.4, borderRadius: "6px", "&:hover": { bgcolor: alpha(primaryColor, 0.08) } }}>
                  <FilterList sx={{ fontSize: 15, color: primaryColor }} />
                  <Typography sx={{ fontSize: "0.72rem", fontWeight: 600, color: primaryColor }}>Filter</Typography>
                </Box>
              </Badge>
            </Box>

            {/* Scrollable visits or Odometer list */}
            <Box sx={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", "&::-webkit-scrollbar": { width: 4 }, "&::-webkit-scrollbar-track": { bgcolor: isDark ? "#0e1424" : "#f8fafc" }, "&::-webkit-scrollbar-thumb": { bgcolor: isDark ? "rgba(255,255,255,0.15)" : "#e2e8f0", borderRadius: 2 } }}>
              {timelineTab === "odometer" ? (
                <Box sx={{ p: 2.5, display: "flex", flexDirection: "column", gap: 2 }}>
                  {tripsLoading ? (
                    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      <Skeleton variant="rounded" width="100%" height={140} />
                      <Skeleton variant="rounded" width="100%" height={140} />
                    </Box>
                  ) : (tripViewMode === "filtered" ? trips : allTrips).length > 0 ? (
                    (tripViewMode === "filtered" ? trips : allTrips).map((trip, idx) => (
                      <OdometerTripCard
                        key={`side-${trip._id || trip.id || `${trip.startTime}-${trip.startKm}`}`}
                        trip={trip}
                        index={idx}
                        onOpenPreview={setOdometerPreview}
                      />
                    ))
                  ) : (
                    <Box sx={{ py: 6, textAlign: "center" }}>
                      <Speed sx={{ fontSize: 36, color: textSub, opacity: 0.5, mb: 1 }} />
                      <Typography sx={{ fontSize: "0.85rem", fontWeight: 700, color: textTitle }}>
                        No Odometer Records
                      </Typography>
                      <Typography sx={{ fontSize: "0.75rem", color: textSub, mt: 0.5 }}>
                        No trips found for this date.
                      </Typography>
                    </Box>
                  )}
                </Box>
              ) : loading ? (
                <Box sx={{ p: 3 }}>
                  {[1, 2, 3].map(i => (
                    <Box key={i} sx={{ display: "flex", gap: 2, mb: 3 }}>
                      <Skeleton variant="circular" width={38} height={38} sx={{ flexShrink: 0 }} />
                      <Box sx={{ flex: 1 }}>
                        <Skeleton width="55%" height={20} />
                        <Skeleton width="80%" height={14} sx={{ mt: 0.5 }} />
                        <Skeleton width="40%" height={14} sx={{ mt: 0.5 }} />
                        <Skeleton variant="rounded" width="100%" height={40} sx={{ mt: 1 }} />
                      </Box>
                    </Box>
                  ))}
                </Box>
              ) : visibleVisits.length === 0 && stayedLocations.length === 0 ? (
                <Box sx={{ flex: 1, display: "flex", flexDirection: "column", p: 3 }}>
                  {isPunchedIn && !hasPunchedOut ? (
                    <Box sx={{ display: "flex", gap: 2 }}>
                      <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
                        <Box
                          onClick={handlePunchInFocus}
                          sx={{ width: 40, height: 40, borderRadius: "50%", bgcolor: SUCCESS, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 0 0 4px ${alpha(SUCCESS, 0.2)}`, animation: "pl 1.5s ease-in-out infinite", "@keyframes pl": { "0%,100%": { opacity: 1 }, "50%": { opacity: 0.6 } }, cursor: "pointer", transition: "transform 0.15s", "&:hover": { transform: "scale(1.12)" } }}
                        >
                          <MyLocation sx={{ fontSize: 18, color: "#fff" }} />
                        </Box>
                      </Box>
                      <Box sx={{ flex: 1, minWidth: 0, pt: 0.5 }}>
                        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 0.4 }}>
                          <Typography sx={{ fontWeight: 700, color: textTitle, fontSize: "0.88rem" }}>Punched In</Typography>
                          {punchInLocation?.time && <Typography sx={{ fontSize: "0.72rem", fontWeight: 600, color: textSub }}>{fmt(punchInLocation.time)}</Typography>}
                        </Box>
                        {timelineBatteryInfo.percentage !== null && (
                          <Box sx={{ mb: 0.8 }}>
                            <Chip
                              size="small"
                              label={`${timelineBatteryChip.label}${timelineBatteryInfo.isCharging ? " • Charging" : ""}`}
                              sx={{ bgcolor: timelineBatteryChip.bg, color: timelineBatteryChip.color, fontWeight: 700, border: `1px solid ${timelineBatteryChip.border}`, height: 24 }}
                            />
                          </Box>
                        )}
                        {/* Address (prefer resolved geocoded address, fallback to punchInLocation.address, then coords) */}
                        <Box sx={{ display: "flex", alignItems: "flex-start", gap: 0.4, mb: 0.5 }}>
                          <LocationOn sx={{ fontSize: 12, color: primaryColor, mt: "2px", flexShrink: 0 }} />
                          <Typography sx={{ fontSize: "0.75rem", color: textMuted, lineHeight: 1.5 }}>
                            {resolvedAddress ||
                              (!isRawCoordinateValue(punchInLocation?.address) ? (typeof punchInLocation?.address === "string" ? punchInLocation.address : punchInLocation?.address?.full || punchInLocation?.address?.short) : null) ||
                              (punchInLocation?.lat ? "Locating address…" : "Location not available")}
                          </Typography>
                        </Box>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mt: 0.5 }}>
                          <Box sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: SUCCESS, animation: "dp 1.5s ease-in-out infinite", "@keyframes dp": { "0%,100%": { opacity: 1 }, "50%": { opacity: 0.3 } } }} />
                          <Typography sx={{ fontSize: "0.7rem", color: SUCCESS, fontWeight: 600 }}>On Duty · No visits yet today</Typography>
                        </Box>
                      </Box>
                    </Box>
                  ) : (
                    <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flex: 1, minHeight: 200 }}>
                      <Box sx={{ width: 48, height: 48, borderRadius: "50%", bgcolor: isDark ? "rgba(255,255,255,0.06)" : "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", mb: 1.5 }}>
                        <MyLocation sx={{ fontSize: 22, color: textSub }} />
                      </Box>
                      <Typography sx={{ fontWeight: 600, color: textTitle, fontSize: "0.88rem", mb: 0.4 }}>Not Punched In</Typography>
                      <Typography sx={{ color: textSub, fontSize: "0.75rem", textAlign: "center" }}>Punch in to start tracking visits</Typography>
                    </Box>
                  )}
                </Box>
              ) : (
                <Box sx={{ p: 3 }}>

                  {/* ── Punch In header ── */}
                  {punchInLocation?.address && (
                    <Box sx={{ mb: 0 }}>
                      <Box sx={{ display: "flex", gap: 2 }}>
                        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
                          <Box
                            onClick={handlePunchInFocus}
                            sx={{ width: 40, height: 40, borderRadius: "50%", bgcolor: SUCCESS, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 2px 8px ${alpha(SUCCESS, 0.3)}`, cursor: "pointer", transition: "transform 0.15s", "&:hover": { transform: "scale(1.12)" } }}
                          >
                            <MyLocation sx={{ fontSize: 18, color: "#fff" }} />
                          </Box>
                        </Box>
                        <Box sx={{ flex: 1, minWidth: 0, pt: 0.5, pb: 0.5 }}>
                          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 0.4 }}>
                            <Typography sx={{ fontWeight: 700, color: textTitle, fontSize: "0.88rem" }}>Punched In</Typography>
                            {punchInLocation.time && <Typography sx={{ fontSize: "0.72rem", fontWeight: 600, color: textSub }}>{fmt(punchInLocation.time)}</Typography>}
                          </Box>
                          {timelineBatteryInfo.percentage !== null && (
                            <Box sx={{ mb: 0.8 }}>
                              <Chip
                                size="small"
                                label={`${timelineBatteryChip.label}${timelineBatteryInfo.isCharging ? " • Charging" : ""}`}
                                sx={{ bgcolor: timelineBatteryChip.bg, color: timelineBatteryChip.color, fontWeight: 700, border: `1px solid ${timelineBatteryChip.border}`, height: 24 }}
                              />
                            </Box>
                          )}
                          {/* Address (prefer resolved geocoded address, fallback to punchInLocation.address, then coords) */}
                          <Box sx={{ display: "flex", alignItems: "flex-start", gap: 0.4 }}>
                            <LocationOn sx={{ fontSize: 12, color: primaryColor, mt: "2px", flexShrink: 0 }} />
                            <Typography sx={{ fontSize: "0.75rem", color: textMuted, lineHeight: 1.5 }}>
                              {resolvedAddress ||
                                (!isRawCoordinateValue(punchInLocation?.address) ? (typeof punchInLocation.address === "string" ? punchInLocation.address : punchInLocation.address?.full || punchInLocation.address?.short) : null) ||
                                (punchInLocation?.lat ? "Locating address…" : "")}
                            </Typography>
                          </Box>
                        </Box>
                      </Box>

                      {/* Route connector from punch-in to first visit */}
                      {sortedVisits.length > 0 && sortedVisits[0].distanceFromPreviousKm > 0 && (
                        <RouteConnector visit={sortedVisits[0]} />
                      )}
                    </Box>
                  )}

                  {stayedLocations.length > 0 && (
                    <Box sx={{ mt: 1.5, mb: 2 }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mb: 1.25 }}>
                        <Timer sx={{ fontSize: 15, color: WARNING }} />
                        <Typography sx={{ fontSize: "0.78rem", color: textTitle, fontWeight: 800 }}>
                          Stayed 15+ Minutes
                        </Typography>
                        <Chip
                          size="small"
                          label={`${stayedLocations.length}`}
                          sx={{ height: 18, bgcolor: alpha(WARNING, 0.12), color: WARNING, fontSize: "0.62rem", fontWeight: 800 }}
                        />
                      </Box>
                      {stayedLocations.map((stay, index) => (
                        <StayedLocationCard
                          key={`${stay.lat || "stay"}-${stay.lng || index}-${stay.lastEndTime || index}`}
                          stay={stay}
                          referenceAddress={resolvedAddress || punchInLocation?.address}
                        />
                      ))}
                    </Box>
                  )}

                  {/* ── Visit cards with route connectors between them ── */}
                  {sortedVisits.map((v, i) => (
                    <Box key={v._id || i}>
                      <VisitCard
                        visit={v}
                        index={i}
                        isLast={i === sortedVisits.length - 1 && !hasPunchedOut}
                        fixedBatteryInfo={timelineBatteryInfo}
                        fixedBatteryChip={timelineBatteryChip}
                      />
                      {/* Route connector AFTER this visit, pointing to next visit */}
                      {i < sortedVisits.length - 1 && sortedVisits[i + 1]?.distanceFromPreviousKm > 0 && (
                        <RouteConnector visit={sortedVisits[i + 1]} />
                      )}
                    </Box>
                  ))}

                  {hasPunchedOut && punchOutLocation?.time && (
                    <Box sx={{ display: "flex", gap: 2, mt: 0 }}>
                      <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
                        <Box sx={{ width: 40, height: 40, borderRadius: "50%", bgcolor: WARNING, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 2px 8px ${alpha(WARNING, 0.3)}` }}>
                          <MyLocation sx={{ fontSize: 18, color: "#fff" }} />
                        </Box>
                      </Box>
                      <Box sx={{ flex: 1, minWidth: 0, pt: 0.5 }}>
                        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 0.4 }}>
                          <Typography sx={{ fontWeight: 700, color: textTitle, fontSize: "0.88rem" }}>Punched Out</Typography>
                          <Typography sx={{ fontSize: "0.72rem", fontWeight: 600, color: textSub }}>{fmt(punchOutLocation.time)}</Typography>
                        </Box>
                        {timelineBatteryInfo.percentage !== null && (
                          <Box sx={{ mb: 0.8 }}>
                            <Chip
                              size="small"
                              label={`${timelineBatteryChip.label}${timelineBatteryInfo.isCharging ? " • Charging" : ""}`}
                              sx={{ bgcolor: timelineBatteryChip.bg, color: timelineBatteryChip.color, fontWeight: 700, border: `1px solid ${timelineBatteryChip.border}`, height: 24 }}
                            />
                          </Box>
                        )}
                        {punchOutLocation?.address && (
                          <Box sx={{ display: "flex", alignItems: "flex-start", gap: 0.4 }}>
                            <LocationOn sx={{ fontSize: 12, color: WARNING, mt: "2px", flexShrink: 0 }} />
                            <Typography sx={{ fontSize: "0.75rem", color: textMuted, lineHeight: 1.5 }}>
                              {typeof punchOutLocation.address === "string" ? punchOutLocation.address : punchOutLocation.address?.full || punchOutLocation.address?.short || ""}
                            </Typography>
                          </Box>
                        )}
                      </Box>
                    </Box>
                  )}
                </Box>
              )}
            </Box>

            {/* Load more */}
            {(hInchargeore || loadingMore) && (
              <Box sx={{ px: 3, py: 2, borderTop: `1px solid ${dividerBorder}`, textAlign: "center" }}>
                <Button size="small" disabled={loadingMore}
                  startIcon={loadingMore ? <CircularProgress size={12} /> : null}
                  onClick={() => { const n = page + 1; setPage(n); fetchVisits(n, true); }}
                  sx={{ color: primaryColor, fontWeight: 600, fontSize: "0.78rem", textTransform: "none" }}>
                  {loadingMore ? "Loading…" : "Load earlier visits"}
                </Button>
              </Box>
            )}
          </Box>
        </Box>
      </Box>

      {/* Odometer Image Zoom Lightbox Modal */}
      <OdometerLightboxModal
        previewData={odometerPreview}
        onClose={() => setOdometerPreview(null)}
        memberName={memberName}
      />
    </Box>
  );
}
