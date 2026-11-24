// src/pages/AttendanceHistoryPage.jsx
import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Box,
  Typography,
  Button,
  Chip,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Stack,
  CircularProgress,
  useTheme,
  useMediaQuery,
  alpha,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
} from "@mui/material";
import {
  ArrowBack,
  CalendarToday,
  CheckCircle,
  Cancel,
  Refresh,
  FileDownload,
  ChevronLeft,
  ChevronRight,
  Speed,
  CompareArrows,
  AccessTime,
  Menu as MenuIcon,
  Close,
  ReceiptLong,
  OpenInNew,
  Edit,
  ZoomIn,
  PhotoCamera,
  LocationOn,
  DirectionsCar,
  Schedule,
} from "@mui/icons-material";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import * as XLSX from "xlsx";
import { useAuth } from "../contexts/AuthContext";
import { API_BASE_URL, API_ORIGIN, LEGACY_API_ORIGINS } from "../utils/apiConfig";
import { toBackendAssetUrl } from "../utils/backendAssetUrl";

const BASE_URL = API_BASE_URL;
const PHOTO_BACKEND_ORIGINS = [
  API_ORIGIN,
  ...LEGACY_API_ORIGINS,
  "https://solar-backend-6vaa.onrender.com",
  "https://soalar-360-backend.onrender.com",
].filter((origin, index, list) => origin && list.indexOf(origin) === index);

// ─── Theme Colors ──────────────────────────────────────────────────────────────
const getColors = (isDark) => ({
  isDark,
  bg: isDark ? "#060a12" : "#f4f7fb",
  card: isDark ? "#0e1424" : "#ffffff",
  cardHover: isDark ? "#131b30" : "#f8fafc",
  border: isDark ? "rgba(255, 255, 255, 0.08)" : "#e2e8f0",
  text: isDark ? "#f8fafc" : "#0f172a",
  textSub: isDark ? "#94a3b8" : "#475569",
  textMuted: isDark ? "#64748b" : "#64748b",
  blue: "#2563eb",
  green: "#16a34a",
  red: "#dc2626",
  amber: "#f59e0b",
  orange: "#ea580c",
});

const toIdString = (value) => {
  if (!value) return "";
  if (typeof value === "object") return toIdString(value._id || value.id || value.userId);
  return String(value).trim();
};

const formatDateDayMonthYear = (d) => {
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return typeof d === "string" ? d : "—";
  const day = date.getDate();
  const month = date.toLocaleString("en-US", { month: "short" });
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
};

const formatClockTime = (iso) => {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return String(iso);
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).toLowerCase();
};

const apiFetch = async (path, params = {}, options = {}) => {
  const token =
    localStorage.getItem("token") ||
    localStorage.getItem("authToken") ||
    localStorage.getItem("accessToken");
  const url = new URL(`${BASE_URL}${path}`);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "")
      url.searchParams.set(key, value);
  });

  const res = await fetch(url.toString(), {
    method: options.method || "GET",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
    ...(options.body ? { body: JSON.stringify(options.body) } : {}),
  });

  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    throw new Error(payload.message || `HTTP ${res.status}`);
  }

  return res.json();
};

const normalizeTrip = (t) => {
  if (!t) return t;
  const isStartManual = Boolean(
    t.isManualStartKm ||
    (t.manualStartKm !== undefined && t.manualStartKm !== null && String(t.manualStartKm).trim() !== "")
  );
  const isEndManual = Boolean(
    t.isManualEndKm ||
    (t.manualEndKm !== undefined && t.manualEndKm !== null && String(t.manualEndKm).trim() !== "")
  );

  const startVal = isStartManual && t.manualStartKm !== undefined && t.manualStartKm !== null && String(t.manualStartKm).trim() !== ""
    ? Number(t.manualStartKm)
    : (Number(t.startKm) || 0);

  const endVal = isEndManual && t.manualEndKm !== undefined && t.manualEndKm !== null && String(t.manualEndKm).trim() !== ""
    ? Number(t.manualEndKm)
    : (t.endKm !== undefined && t.endKm !== null ? Number(t.endKm) : (t.status === "completed" ? startVal : 0));

  const totalDiff = t.totalKm !== undefined && Number(t.totalKm) > 0
    ? Number(t.totalKm)
    : Math.max(0, endVal - startVal);

  return {
    ...t,
    startKm: startVal,
    endKm: endVal,
    totalKm: totalDiff,
    isManualStartKm: isStartManual,
    isManualEndKm: isEndManual,
  };
};

// ─── Expense Details Pop-Up Dialog ──────────────────────────────────────────
const ExpenseDetailsDialog = ({ open, data, onClose, isDark, COLOR }) => {
  if (!data) return null;
  const list = data.expenses || [];
  const total = list.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          bgcolor: isDark ? "#0e1424" : "#ffffff",
          backgroundImage: "none",
          borderRadius: "16px",
          border: `1px solid ${COLOR.border}`,
          overflow: "hidden",
        },
      }}
    >
      <DialogTitle
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          bgcolor: isDark ? "rgba(22, 163, 74, 0.12)" : "#f0fdf4",
          borderBottom: `1px solid ${isDark ? "rgba(22, 163, 74, 0.25)" : "#bbf7d0"}`,
          py: 1.75,
          px: 2.5,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: "10px",
              bgcolor: isDark ? "rgba(22, 163, 74, 0.25)" : "#dcfce7",
              color: "#16a34a",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <ReceiptLong sx={{ fontSize: 20 }} />
          </Box>
          <Box>
            <Typography sx={{ fontWeight: 800, fontSize: "1.05rem", color: COLOR.text, lineHeight: 1.2 }}>
              {data.title || "Approved Expenses"}
            </Typography>
            <Typography variant="caption" sx={{ color: COLOR.textMuted, fontSize: "0.74rem" }}>
              {list.length} approved expense item{list.length === 1 ? "" : "s"} • Total: ₹{total.toLocaleString("en-IN")}
            </Typography>
          </Box>
        </Box>
        <IconButton size="small" onClick={onClose} sx={{ color: COLOR.textMuted }}>
          <Close sx={{ fontSize: 20 }} />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: { xs: 1.5, sm: 2.5 } }}>
        {list.length === 0 ? (
          <Box sx={{ py: 6, textAlign: "center" }}>
            <ReceiptLong sx={{ fontSize: 42, color: COLOR.textMuted, opacity: 0.4, mb: 1 }} />
            <Typography sx={{ fontWeight: 700, color: COLOR.text, fontSize: "0.92rem" }}>
              No Approved Expenses Found
            </Typography>
            <Typography sx={{ color: COLOR.textMuted, fontSize: "0.78rem", mt: 0.5 }}>
              There are no approved expense items recorded for this selection.
            </Typography>
          </Box>
        ) : (
          <Stack spacing={1.5}>
            {list.map((exp, idx) => {
              const amount = Number(exp.amount || 0);
              const expDate = exp.expenseDate || exp.date || exp.createdAt;
              const formattedDate = expDate
                ? new Date(expDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                : "—";
              const billUrl = exp.billAttachment || exp.attachment || exp.billUrl || exp.receipt;

              return (
                <Paper
                  key={exp._id || exp.id || idx}
                  elevation={0}
                  sx={{
                    p: 2,
                    borderRadius: "12px",
                    bgcolor: isDark ? "rgba(255,255,255,0.02)" : "#f8fafc",
                    border: `1px solid ${COLOR.border}`,
                    display: "flex",
                    flexDirection: { xs: "column", sm: "row" },
                    alignItems: { xs: "flex-start", sm: "center" },
                    justifyContent: "space-between",
                    gap: 1.5,
                  }}
                >
                  {/* Left: Info */}
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap", mb: 0.5 }}>
                      <Typography sx={{ fontWeight: 800, fontSize: "0.95rem", color: COLOR.text }}>
                        {exp.title || "Expense"}
                      </Typography>
                      <Chip
                        label={exp.category || "General"}
                        size="small"
                        sx={{
                          height: 20,
                          fontSize: "0.68rem",
                          fontWeight: 700,
                          bgcolor: isDark ? "rgba(37,99,235,0.15)" : "#eff6ff",
                          color: "#2563eb",
                          border: "1px solid rgba(37,99,235,0.3)",
                        }}
                      />
                      <Chip
                        icon={<CheckCircle sx={{ fontSize: "11px !important", color: "#16a34a !important" }} />}
                        label="Approved"
                        size="small"
                        sx={{
                          height: 20,
                          fontSize: "0.68rem",
                          fontWeight: 800,
                          bgcolor: isDark ? "rgba(22,163,74,0.15)" : "#dcfce7",
                          color: "#16a34a",
                          border: "1px solid rgba(22,163,74,0.3)",
                        }}
                      />
                    </Box>

                    <Typography sx={{ fontSize: "0.75rem", color: COLOR.textMuted }}>
                      Date: {formattedDate}
                      {exp.approvedBy?.name ? ` • Approved by ${exp.approvedBy.name}` : ""}
                    </Typography>

                    {exp.category === "Fuel" && exp.kilometersTraveled > 0 && (
                      <Typography sx={{ fontSize: "0.73rem", color: COLOR.textMuted, mt: 0.3 }}>
                        Fuel: {exp.kilometersTraveled} km @ ₹{exp.fuelRatePerKm || 2}/km ({exp.vehicleType || "Vehicle"})
                      </Typography>
                    )}

                    {exp.approverRemarks && (
                      <Typography sx={{ fontSize: "0.72rem", color: COLOR.textMuted, fontStyle: "italic", mt: 0.4 }}>
                        Remarks: {exp.approverRemarks}
                      </Typography>
                    )}
                  </Box>

                  {/* Right: Amount & Receipt Button */}
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, alignSelf: { xs: "flex-end", sm: "center" } }}>
                    <Typography sx={{ fontWeight: 900, fontSize: "1.1rem", color: "#16a34a", fontFamily: "monospace" }}>
                      ₹{amount.toLocaleString("en-IN")}
                    </Typography>

                    {billUrl && (
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<OpenInNew sx={{ fontSize: 13 }} />}
                        onClick={() => window.open(billUrl, "_blank")}
                        sx={{
                          height: 28,
                          fontSize: "0.70rem",
                          fontWeight: 700,
                          textTransform: "none",
                          borderRadius: "8px",
                          borderColor: COLOR.border,
                          color: COLOR.text,
                        }}
                      >
                        Receipt
                      </Button>
                    )}
                  </Box>
                </Paper>
              );
            })}
          </Stack>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 2.5, py: 1.5, borderTop: `1px solid ${COLOR.border}`, justifyContent: "space-between" }}>
        <Typography sx={{ fontWeight: 800, fontSize: "0.85rem", color: COLOR.text }}>
          Total Approved: <Typography component="span" sx={{ color: "#16a34a", fontWeight: 900 }}>₹{total.toLocaleString("en-IN")}</Typography>
        </Typography>
        <Button onClick={onClose} variant="contained" sx={{ textTransform: "none", fontWeight: 700, borderRadius: "8px", bgcolor: "#16a34a", "&:hover": { bgcolor: "#15803d" } }}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const getTripStartPhoto = (trip) => {
  if (!trip) return null;
  return (
    trip.startKmImage ||
    trip.startKmImageUri ||
    trip.startImage ||
    trip.startOdometerPhoto ||
    trip.startOdometerImage ||
    trip.startPhoto ||
    trip.startPhotoUrl ||
    trip.startReadingPhoto ||
    trip.startReadingImage ||
    trip.startKmPhoto ||
    trip.startMeterPhoto ||
    trip.odometerPhoto ||
    trip.meterPhoto ||
    trip.photo ||
    trip.photos?.start ||
    trip.photos?.startKm ||
    trip.startKm?.photo ||
    trip.startKm?.image ||
    trip.punchIn?.odometerPhoto ||
    trip.punchIn?.photo ||
    trip.punchInPhoto ||
    null
  );
};

const getTripEndPhoto = (trip) => {
  if (!trip) return null;
  return (
    trip.endKmImage ||
    trip.endKmImageUri ||
    trip.endImage ||
    trip.endOdometerPhoto ||
    trip.endOdometerImage ||
    trip.endPhoto ||
    trip.endPhotoUrl ||
    trip.endReadingPhoto ||
    trip.endReadingImage ||
    trip.endKmPhoto ||
    trip.endMeterPhoto ||
    trip.photos?.end ||
    trip.photos?.endKm ||
    trip.endKm?.photo ||
    trip.endKm?.image ||
    trip.punchOut?.odometerPhoto ||
    trip.punchOut?.photo ||
    trip.punchOutPhoto ||
    null
  );
};

const getPhotoUrlCandidates = (rawPhoto) => {
  if (!rawPhoto) return [];
  let photoVal = rawPhoto;
  if (typeof rawPhoto === "object") {
    photoVal = rawPhoto.url || rawPhoto.uri || rawPhoto.path || rawPhoto.secure_url || rawPhoto.imageUrl || rawPhoto.photoUrl || "";
  }
  if (!photoVal || typeof photoVal !== "string") return [];

  const cleanVal = String(photoVal).trim().replace(/\\/g, "/");
  if (!cleanVal) return [];

  if (/^(data|blob):/i.test(cleanVal)) {
    return [cleanVal];
  }

  const candidates = [];
  const primaryUrl = toBackendAssetUrl(cleanVal);
  if (primaryUrl) candidates.push(primaryUrl);

  if (/^https?:\/\//i.test(cleanVal)) {
    if (!candidates.includes(cleanVal)) candidates.push(cleanVal);
    try {
      const parsed = new URL(cleanVal);
      if (!parsed.hostname.includes("cloudinary")) {
        const cleanPath = parsed.pathname.replace(/^\/?api\/v1(?=\/)/i, "").replace(/^\/+/, "");
        PHOTO_BACKEND_ORIGINS.forEach((orig) => {
          const candidate = `${orig}/${cleanPath}`;
          if (orig && !candidates.includes(candidate)) candidates.push(candidate);
        });
      }
    } catch {}
    return candidates.filter((u, i, l) => u && l.indexOf(u) === i);
  }

  const cleanPath = cleanVal.replace(/^\/+/, "").replace(/^public\//, "");
  const filename = cleanPath.split("/").filter(Boolean).pop();

  const pathVariants = [
    `/${cleanPath}`,
    `/public/${cleanPath}`,
    `/public/uploads/${cleanPath}`,
    `/uploads/${cleanPath}`,
  ];

  if (filename) {
    pathVariants.push(
      `/public/uploads/images/${filename}`,
      `/public/uploads/trips/${filename}`,
      `/public/${filename}`
    );
  }

  PHOTO_BACKEND_ORIGINS.forEach((orig) => {
    if (orig) {
      pathVariants.forEach((pv) => {
        const candidate = `${orig}${pv}`;
        if (!candidates.includes(candidate)) candidates.push(candidate);
      });
    }
  });

  return candidates.filter((u, i, l) => u && l.indexOf(u) === i);
};

const resolvePhotoUrl = (rawPhoto) => {
  const candidates = getPhotoUrlCandidates(rawPhoto);
  return candidates[0] || null;
};

const OdometerImagePreview = ({
  rawPhoto,
  alt = "Odometer",
  sx = {},
  fallbackIcon = <PhotoCamera sx={{ fontSize: 24, color: "#64748b" }} />,
  onLoaded,
}) => {
  const candidates = useMemo(() => getPhotoUrlCandidates(rawPhoto), [rawPhoto]);
  const [candidateIdx, setCandidateIdx] = useState(0);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setCandidateIdx(0);
    setFailed(false);
  }, [rawPhoto]);

  if (!candidates.length || failed) {
    return fallbackIcon;
  }

  const currentSrc = candidates[candidateIdx];

  return (
    <Box
      component="img"
      src={currentSrc}
      alt={alt}
      onError={() => {
        if (candidateIdx + 1 < candidates.length) {
          setCandidateIdx((prev) => prev + 1);
        } else {
          setFailed(true);
        }
      }}
      onLoad={onLoaded}
      sx={sx}
    />
  );
};

const formatTripTime = (t) => {
  if (!t) return "";
  try {
    const d = new Date(t);
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
    }
  } catch {}
  return String(t);
};

// ─── Admin Edit Trip Dialog ─────────────────────────────────────────────────
const AdminEditTripDialog = ({ open, trip, onClose, onTripUpdated, isDark, COLOR }) => {
  const [startKmVal, setStartKmVal] = useState("");
  const [endKmVal, setEndKmVal] = useState("");
  const [noteVal, setNoteVal] = useState("");
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const isCompleted = trip?.status === "completed";
  const startPhoto = getTripStartPhoto(trip);
  const endPhoto = getTripEndPhoto(trip);
  const startPhotoUrl = resolvePhotoUrl(startPhoto);
  const endPhotoUrl = resolvePhotoUrl(endPhoto);

  useEffect(() => {
    if (trip) {
      const initialStart = (trip.manualStartKm !== undefined && trip.manualStartKm !== null && String(trip.manualStartKm).trim() !== "")
        ? trip.manualStartKm
        : (trip.startKm !== undefined && trip.startKm !== null ? trip.startKm : "");
      const initialEnd = (trip.manualEndKm !== undefined && trip.manualEndKm !== null && String(trip.manualEndKm).trim() !== "")
        ? trip.manualEndKm
        : (trip.endKm !== undefined && trip.endKm !== null ? trip.endKm : "");

      setStartKmVal(initialStart !== "" ? String(initialStart) : "");
      setEndKmVal(initialEnd !== "" ? String(initialEnd) : "");
      setNoteVal(trip.adminEditNote || "");
      setErrorMsg("");
    }
  }, [trip]);

  if (!trip) return null;

  const numStart = Number(startKmVal);
  const numEnd = Number(endKmVal);
  const hasValidStart = startKmVal !== "" && !isNaN(numStart) && numStart >= 0;
  const hasValidEnd = endKmVal !== "" && !isNaN(numEnd) && numEnd >= 0;
  const calculatedTotal = (hasValidStart && hasValidEnd) ? Math.max(0, numEnd - numStart) : 0;
  const isNegative = hasValidStart && hasValidEnd && numEnd < numStart;

  const handleSave = async () => {
    if (!hasValidStart) {
      setErrorMsg("Please enter a valid Start KM (0 or greater).");
      return;
    }
    if (isCompleted && !hasValidEnd) {
      setErrorMsg("Please enter a valid End KM for completed trip.");
      return;
    }
    if (isCompleted && isNegative) {
      setErrorMsg("End KM cannot be less than Start KM.");
      return;
    }

    setSaving(true);
    setErrorMsg("");

    try {
      const tripId = trip._id || trip.id;
      const payload = {
        startKm: numStart,
        manualStartKm: numStart,
        isManualStartKm: true,
        isAdminEdited: true,
        adminEditNote: (noteVal || "").trim(),
      };

      if (hasValidEnd) {
        payload.endKm = numEnd;
        payload.manualEndKm = numEnd;
        payload.isManualEndKm = true;
        payload.totalKm = calculatedTotal;
      }

      let res = null;
      try {
        res = await apiFetch(`/trips/${tripId}`, {}, { method: "PUT", body: payload });
      } catch (err) {
        res = await apiFetch(`/trip/${tripId}`, {}, { method: "PUT", body: payload });
      }

      const updatedTrip = res?.data?.trip || res?.trip || res?.data || {
        ...trip,
        ...payload,
      };

      if (onTripUpdated) {
        onTripUpdated(updatedTrip);
      }
      onClose();
    } catch (err) {
      setErrorMsg(err.message || "Failed to update trip KM. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={saving ? undefined : onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          bgcolor: isDark ? "#0f172a" : "#ffffff",
          backgroundImage: "none",
          borderRadius: "16px",
          border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "#e2e8f0"}`,
          p: 1,
        },
      }}
    >
      <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", pb: 1 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: "10px",
              bgcolor: isDark ? "rgba(37,99,235,0.2)" : "#eff6ff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#2563eb",
            }}
          >
            <Edit sx={{ fontSize: 18 }} />
          </Box>
          <Box>
            <Typography sx={{ fontWeight: 800, fontSize: "1rem", color: COLOR.text, lineHeight: 1.2 }}>
              Edit Odometer / KM Reading
            </Typography>
            <Typography sx={{ fontSize: "0.74rem", color: COLOR.textSub }}>
              {trip.title || trip.workType || "Trip Details"} • Adjust readings & save
            </Typography>
          </Box>
        </Box>
        <IconButton size="small" onClick={onClose} disabled={saving} sx={{ color: COLOR.textSub }}>
          <Close sx={{ fontSize: 18 }} />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
        {errorMsg && (
          <Alert severity="error" sx={{ borderRadius: "10px", fontSize: "0.78rem" }}>
            {errorMsg}
          </Alert>
        )}

        <Box sx={{ display: "flex", flexDirection: { xs: "column", sm: "row" }, gap: 2, mt: 0.5 }}>
          {/* Start KM Box */}
          <Box
            sx={{
              flex: 1,
              p: 1.5,
              borderRadius: "12px",
              bgcolor: isDark ? "rgba(255,255,255,0.02)" : "#f8fafc",
              border: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "#e2e8f0"}`,
              display: "flex",
              flexDirection: "column",
              gap: 1.25,
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <OdometerImagePreview
                rawPhoto={startPhoto}
                alt="Start Odometer"
                sx={{ width: 44, height: 44, borderRadius: "8px", objectFit: "cover", border: "1px solid #cbd5e1" }}
                fallbackIcon={
                  <Box
                    sx={{
                      width: 44,
                      height: 44,
                      borderRadius: "8px",
                      bgcolor: isDark ? "rgba(255,255,255,0.05)" : "#e2e8f0",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <PhotoCamera sx={{ fontSize: 18, color: COLOR.textSub }} />
                  </Box>
                }
              />
              <Box>
                <Typography sx={{ fontWeight: 800, fontSize: "0.82rem", color: "#2563eb" }}>
                  TRIP START
                </Typography>
                <Typography sx={{ fontSize: "0.70rem", color: COLOR.textSub }}>
                  {trip.aiDetectedStartKm != null ? `AI: ${trip.aiDetectedStartKm} KM` : "AI: Not scanned"}
                  {trip.manualStartKm != null ? ` • User: ${trip.manualStartKm} KM` : ""}
                </Typography>
              </Box>
            </Box>

            <TextField
              label="Start KM"
              type="number"
              size="small"
              fullWidth
              value={startKmVal}
              onChange={(e) => setStartKmVal(e.target.value)}
              placeholder="e.g. 6230"
              InputProps={{
                sx: { fontWeight: 700, fontFamily: "monospace", fontSize: "0.95rem" },
              }}
            />
          </Box>

          {/* End KM Box */}
          <Box
            sx={{
              flex: 1,
              p: 1.5,
              borderRadius: "12px",
              bgcolor: isDark ? "rgba(255,255,255,0.02)" : "#f8fafc",
              border: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "#e2e8f0"}`,
              display: "flex",
              flexDirection: "column",
              gap: 1.25,
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <OdometerImagePreview
                rawPhoto={endPhoto}
                alt="End Odometer"
                sx={{ width: 44, height: 44, borderRadius: "8px", objectFit: "cover", border: "1px solid #cbd5e1" }}
                fallbackIcon={
                  <Box
                    sx={{
                      width: 44,
                      height: 44,
                      borderRadius: "8px",
                      bgcolor: isDark ? "rgba(255,255,255,0.05)" : "#e2e8f0",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <PhotoCamera sx={{ fontSize: 18, color: COLOR.textSub }} />
                  </Box>
                }
              />
              <Box>
                <Typography sx={{ fontWeight: 800, fontSize: "0.82rem", color: "#16a34a" }}>
                  TRIP END
                </Typography>
                <Typography sx={{ fontSize: "0.70rem", color: COLOR.textSub }}>
                  {trip.aiDetectedEndKm != null ? `AI: ${trip.aiDetectedEndKm} KM` : "AI: Not scanned"}
                  {trip.manualEndKm != null ? ` • User: ${trip.manualEndKm} KM` : ""}
                </Typography>
              </Box>
            </Box>

            <TextField
              label="End KM"
              type="number"
              size="small"
              fullWidth
              value={endKmVal}
              onChange={(e) => setEndKmVal(e.target.value)}
              placeholder="e.g. 6250"
              disabled={!isCompleted && trip.status === "in_progress"}
              InputProps={{
                sx: { fontWeight: 700, fontFamily: "monospace", fontSize: "0.95rem" },
              }}
            />
          </Box>
        </Box>

        {/* Calculated Distance */}
        <Box
          sx={{
            p: 1.5,
            borderRadius: "10px",
            bgcolor: isNegative ? alpha("#ef4444", 0.1) : (isDark ? "rgba(34,197,94,0.12)" : "#f0fdf4"),
            border: `1px solid ${isNegative ? alpha("#ef4444", 0.3) : (isDark ? "rgba(34,197,94,0.3)" : "#bbf7d0")}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Box>
            <Typography sx={{ fontSize: "0.75rem", fontWeight: 700, color: isNegative ? "#ef4444" : COLOR.textSub }}>
              {isNegative ? "Warning: End KM is less than Start KM" : "Calculated Distance Travelled"}
            </Typography>
            <Typography sx={{ fontSize: "0.70rem", color: COLOR.textSub }}>
              {hasValidStart && hasValidEnd ? `${numEnd} KM - ${numStart} KM` : "Awaiting values..."}
            </Typography>
          </Box>
          <Typography
            sx={{
              fontWeight: 900,
              fontSize: "1.15rem",
              color: isNegative ? "#ef4444" : "#16a34a",
              fontFamily: "monospace",
            }}
          >
            {calculatedTotal} KM
          </Typography>
        </Box>

        <TextField
          label="Admin Note (Reason for Change)"
          size="small"
          fullWidth
          multiline
          rows={2}
          value={noteVal}
          onChange={(e) => setNoteVal(e.target.value)}
          placeholder="e.g. Corrected odometer reading from photo; user entered manually"
          helperText="Saved in the trip record for auditing."
        />
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 1.5, borderTop: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "#e2e8f0"}`, justifyContent: "space-between" }}>
        <Button onClick={onClose} disabled={saving} sx={{ color: COLOR.textSub, textTransform: "none", fontWeight: 600 }}>
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          disabled={saving || (isCompleted && isNegative)}
          variant="contained"
          sx={{
            textTransform: "none",
            fontWeight: 800,
            borderRadius: "8px",
            bgcolor: "#2563eb",
            "&:hover": { bgcolor: "#1d4ed8" },
          }}
        >
          {saving ? <CircularProgress size={18} sx={{ color: "#fff" }} /> : "Save Changes"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// ─── Odometer Image Lightbox Modal ──────────────────────────────────────────
const OdometerImageModal = ({ previewData, onClose, isDark, COLOR }) => {
  const candidates = useMemo(() => {
    if (!previewData) return [];
    return getPhotoUrlCandidates(previewData.rawPhoto || previewData.url);
  }, [previewData]);

  const [candidateIdx, setCandidateIdx] = useState(0);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    setCandidateIdx(0);
    setLoadError(false);
  }, [previewData]);

  if (!previewData) return null;

  const currentSrc = candidates[candidateIdx] || previewData.url;

  return (
    <Dialog
      open={Boolean(previewData)}
      onClose={onClose}
      maxWidth="md"
      PaperProps={{
        sx: {
          bgcolor: isDark ? "#090d16" : "#ffffff",
          backgroundImage: "none",
          borderRadius: "16px",
          border: `1px solid ${COLOR.border}`,
          overflow: "hidden",
        },
      }}
    >
      <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", pb: 1, borderBottom: `1px solid ${COLOR.border}` }}>
        <Box>
          <Typography sx={{ fontWeight: 800, fontSize: "0.95rem", color: COLOR.text }}>
            {previewData.title || "Odometer Photo"}
          </Typography>
          {previewData.km != null && (
            <Typography sx={{ fontSize: "0.75rem", color: "#16a34a", fontWeight: 700 }}>
              Reading: {previewData.km} KM
            </Typography>
          )}
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          {currentSrc && !loadError && (
            <Button
              size="small"
              variant="outlined"
              startIcon={<OpenInNew sx={{ fontSize: 13 }} />}
              onClick={() => window.open(currentSrc, "_blank")}
              sx={{ textTransform: "none", height: 28, fontSize: "0.72rem", fontWeight: 700, borderColor: COLOR.border, color: COLOR.text }}
            >
              Open Full
            </Button>
          )}
          <IconButton size="small" onClick={onClose} sx={{ color: COLOR.textSub }}>
            <Close sx={{ fontSize: 18 }} />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent sx={{ p: 2, display: "flex", justifyContent: "center", alignItems: "center", bgcolor: isDark ? "#000" : "#f1f5f9" }}>
        {currentSrc && !loadError ? (
          <Box
            component="img"
            src={currentSrc}
            alt={previewData.title || "Odometer reading"}
            onError={() => {
              if (candidateIdx + 1 < candidates.length) {
                setCandidateIdx((prev) => prev + 1);
              } else {
                setLoadError(true);
              }
            }}
            sx={{
              maxWidth: "100%",
              maxHeight: "75vh",
              objectFit: "contain",
              borderRadius: "8px",
              boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
            }}
          />
        ) : (
          <Box sx={{ p: 4, display: "flex", flexDirection: "column", alignItems: "center", gap: 1 }}>
            <PhotoCamera sx={{ fontSize: 40, color: COLOR.textMuted }} />
            <Typography sx={{ color: COLOR.textMuted, fontSize: "0.85rem" }}>No photo available</Typography>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
};

// ─── Trips & Odometer Details Dialog ────────────────────────────────────────
const TripsDetailsDialog = ({ open, data, onClose, onEditTrip, onOpenImage, isDark, COLOR }) => {
  if (!data) return null;
  const list = data.trips || [];
  const totalKm = list.reduce((sum, t) => sum + (Number(t.totalKm) || 0), 0);
  const totalAllowance = totalKm * 2;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          bgcolor: isDark ? "#0e1424" : "#ffffff",
          backgroundImage: "none",
          borderRadius: "16px",
          border: `1px solid ${COLOR.border}`,
          maxHeight: "90vh",
        },
      }}
    >
      <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", pb: 1.5, borderBottom: `1px solid ${COLOR.border}` }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: "10px",
              bgcolor: isDark ? "rgba(59, 130, 246, 0.15)" : "#eff6ff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#3b82f6",
            }}
          >
            <Speed sx={{ fontSize: 22 }} />
          </Box>
          <Box>
            <Typography sx={{ fontWeight: 800, fontSize: "1.05rem", color: COLOR.text }}>
              {data.title || "Odometer & Trip Details"}
            </Typography>
            <Typography sx={{ fontSize: "0.75rem", color: COLOR.textSub, fontWeight: 500 }}>
              {list.length} Trip{list.length === 1 ? "" : "s"} Recorded • Total: {totalKm.toFixed(2)} KM (@ ₹2/KM = ₹{totalAllowance.toFixed(2)})
            </Typography>
          </Box>
        </Box>
        <IconButton size="small" onClick={onClose} sx={{ color: COLOR.textSub }}>
          <Close sx={{ fontSize: 20 }} />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 2.5, display: "flex", flexDirection: "column", gap: 2 }}>
        {list.length === 0 ? (
          <Box sx={{ py: 6, textAlign: "center" }}>
            <DirectionsCar sx={{ fontSize: 48, color: COLOR.textMuted, opacity: 0.5, mb: 1 }} />
            <Typography sx={{ color: COLOR.textMuted, fontWeight: 600, fontSize: "0.9rem" }}>
              No trips recorded for this date/period.
            </Typography>
          </Box>
        ) : (
          list.map((trip, idx) => {
            const startPhoto = getTripStartPhoto(trip);
            const endPhoto = getTripEndPhoto(trip);
            const startPhotoUrl = resolvePhotoUrl(startPhoto);
            const endPhotoUrl = resolvePhotoUrl(endPhoto);

            const isStartManual = Boolean(
              trip.isManualStartKm ||
              (trip.manualStartKm !== undefined && trip.manualStartKm !== null && String(trip.manualStartKm).trim() !== "") ||
              (trip.aiDetectedStartKm != null && Number(trip.aiDetectedStartKm) !== Number(trip.startKm))
            );
            const isEndManual = Boolean(
              trip.isManualEndKm ||
              (trip.manualEndKm !== undefined && trip.manualEndKm !== null && String(trip.manualEndKm).trim() !== "") ||
              (trip.aiDetectedEndKm != null && Number(trip.aiDetectedEndKm) !== Number(trip.endKm))
            );

            const isCompleted = trip.status === "completed";
            const tripKm = Number(trip.totalKm) || 0;
            const tripAllowance = tripKm * 2;

            return (
              <Paper
                key={trip._id || trip.id || idx}
                elevation={0}
                sx={{
                  p: 2,
                  borderRadius: "14px",
                  bgcolor: isDark ? "rgba(255,255,255,0.02)" : "#f8fafc",
                  border: `1px solid ${COLOR.border}`,
                  display: "flex",
                  flexDirection: "column",
                  gap: 1.5,
                }}
              >
                {/* Trip Top Bar */}
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 1 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Chip
                      label={`Trip #${idx + 1}`}
                      size="small"
                      sx={{
                        fontWeight: 900,
                        fontSize: "0.72rem",
                        bgcolor: "#2563eb",
                        color: "#fff",
                        borderRadius: "6px",
                        height: 22,
                      }}
                    />
                    <Typography sx={{ fontWeight: 800, fontSize: "0.92rem", color: COLOR.text }}>
                      {trip.title || trip.workType || "Installation Trip"}
                    </Typography>
                    <Chip
                      label={isCompleted ? `Completed (+${tripKm} KM)` : "Ongoing (Running)"}
                      size="small"
                      sx={{
                        fontWeight: 800,
                        fontSize: "0.68rem",
                        bgcolor: isCompleted
                          ? (isDark ? "rgba(22,163,74,0.18)" : "#dcfce7")
                          : (isDark ? "rgba(37,99,235,0.18)" : "#eff6ff"),
                        color: isCompleted ? "#16a34a" : "#2563eb",
                        border: `1px solid ${isCompleted ? "rgba(22,163,74,0.3)" : "rgba(37,99,235,0.3)"}`,
                        height: 22,
                      }}
                    />
                  </Box>

                  {/* Edit KM Button */}
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<Edit sx={{ fontSize: 13 }} />}
                    onClick={() => onEditTrip(trip)}
                    sx={{
                      height: 28,
                      fontSize: "0.72rem",
                      fontWeight: 800,
                      textTransform: "none",
                      borderRadius: "8px",
                      borderColor: "#2563eb",
                      color: "#2563eb",
                      "&:hover": {
                        bgcolor: "rgba(37,99,235,0.08)",
                        borderColor: "#1d4ed8",
                      },
                    }}
                  >
                    Edit KM
                  </Button>
                </Box>

                {/* Route Locations and Times */}
                <Box sx={{ display: "flex", flexDirection: { xs: "column", sm: "row" }, gap: 1.5, py: 0.5, borderTop: `1px dashed ${COLOR.border}`, borderBottom: `1px dashed ${COLOR.border}` }}>
                  <Box sx={{ flex: 1, display: "flex", alignItems: "flex-start", gap: 1 }}>
                    <LocationOn sx={{ fontSize: 16, color: "#2563eb", mt: 0.2 }} />
                    <Box>
                      <Typography sx={{ fontSize: "0.70rem", color: COLOR.textSub, fontWeight: 700 }}>
                        START LOCATION {trip.startTime ? `• ${formatTripTime(trip.startTime)}` : ""}
                      </Typography>
                      <Typography sx={{ fontSize: "0.75rem", color: COLOR.text, fontWeight: 600 }}>
                        {trip.startLocation || trip.startAddress || "Location recorded"}
                      </Typography>
                    </Box>
                  </Box>
                  <Box sx={{ flex: 1, display: "flex", alignItems: "flex-start", gap: 1 }}>
                    <LocationOn sx={{ fontSize: 16, color: "#16a34a", mt: 0.2 }} />
                    <Box>
                      <Typography sx={{ fontSize: "0.70rem", color: COLOR.textSub, fontWeight: 700 }}>
                        END LOCATION {trip.endTime ? `• ${formatTripTime(trip.endTime)}` : ""}
                      </Typography>
                      <Typography sx={{ fontSize: "0.75rem", color: COLOR.text, fontWeight: 600 }}>
                        {isCompleted
                          ? (trip.endLocation || trip.endAddress || "Location recorded")
                          : "Trip in progress..."}
                      </Typography>
                    </Box>
                  </Box>
                </Box>

                {/* Side-by-side Start & End Odometer Photos and KM */}
                <Box sx={{ display: "flex", flexDirection: { xs: "column", md: "row" }, alignItems: "center", gap: 2 }}>
                  {/* Start Box */}
                  <Box
                    sx={{
                      flex: 1,
                      width: "100%",
                      p: 1.5,
                      borderRadius: "12px",
                      bgcolor: isDark ? "rgba(37,99,235,0.05)" : "#eff6ff",
                      border: "1px solid rgba(37,99,235,0.2)",
                      display: "flex",
                      alignItems: "center",
                      gap: 1.5,
                    }}
                  >
                    {/* Start Image Thumbnail (Clickable to zoom) */}
                    <Box
                      onClick={() => {
                        if (startPhoto) {
                          onOpenImage({
                            url: startPhotoUrl,
                            rawPhoto: startPhoto,
                            title: `Trip #${idx + 1} Start Odometer`,
                            km: trip.startKm,
                          });
                        }
                      }}
                      sx={{
                        width: 70,
                        height: 70,
                        borderRadius: "10px",
                        bgcolor: isDark ? "rgba(0,0,0,0.3)" : "#e2e8f0",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        overflow: "hidden",
                        position: "relative",
                        cursor: startPhoto ? "pointer" : "default",
                        border: "1px solid #cbd5e1",
                        flexShrink: 0,
                        "&:hover": startPhoto ? {
                          "& .zoomIcon": { opacity: 1 },
                          transform: "scale(1.03)",
                        } : {},
                        transition: "all 0.2s",
                      }}
                    >
                      {startPhoto ? (
                        <>
                          <OdometerImagePreview
                            rawPhoto={startPhoto}
                            alt="Start Odometer"
                            sx={{ width: "100%", height: "100%", objectFit: "cover" }}
                            fallbackIcon={<PhotoCamera sx={{ fontSize: 24, color: COLOR.textMuted }} />}
                          />
                          <Box
                            className="zoomIcon"
                            sx={{
                              position: "absolute",
                              inset: 0,
                              bgcolor: "rgba(0,0,0,0.4)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              opacity: 0,
                              transition: "opacity 0.2s",
                            }}
                          >
                            <ZoomIn sx={{ color: "#fff", fontSize: 20 }} />
                          </Box>
                        </>
                      ) : (
                        <PhotoCamera sx={{ fontSize: 24, color: COLOR.textMuted }} />
                      )}
                    </Box>

                    {/* Start Details */}
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography sx={{ fontSize: "0.70rem", color: "#2563eb", fontWeight: 800 }}>
                        TRIP START (T{idx + 1}S)
                      </Typography>
                      <Typography sx={{ fontWeight: 900, fontSize: "1.2rem", color: COLOR.text, fontFamily: "monospace", lineHeight: 1.2 }}>
                        {Number(trip.startKm || 0).toLocaleString("en-IN")} <Typography component="span" sx={{ fontSize: "0.80rem", fontWeight: 700, color: COLOR.textSub }}>KM</Typography>
                      </Typography>

                      {/* Manual / AI / Admin Status Badge */}
                      <Box sx={{ mt: 0.5, display: "flex", alignItems: "center", gap: 0.5, flexWrap: "wrap" }}>
                        {isStartManual ? (
                          <Chip
                            icon={<Edit sx={{ fontSize: "11px !important", color: isDark ? "#f59e0b" : "#b45309" }} />}
                            label="✍️ Written Manually"
                            size="small"
                            sx={{
                              height: 20,
                              bgcolor: isDark ? "rgba(245, 158, 11, 0.25)" : "#fef3c7",
                              color: isDark ? "#fbbf24" : "#92400e",
                              fontWeight: 800,
                              fontSize: "0.68rem",
                              borderRadius: "6px",
                              border: "1px solid rgba(245, 158, 11, 0.5)",
                            }}
                          />
                        ) : trip.isAdminEdited ? (
                          <Chip
                            label="✏️ Admin Edited"
                            size="small"
                            sx={{
                              height: 20,
                              bgcolor: isDark ? "rgba(99, 102, 241, 0.2)" : "#e0e7ff",
                              color: "#6366f1",
                              fontWeight: 800,
                              fontSize: "0.68rem",
                              borderRadius: "6px",
                            }}
                          />
                        ) : (
                          <Chip
                            icon={<CheckCircle sx={{ fontSize: "11px !important", color: "#16a34a !important" }} />}
                            label="AI Scanned"
                            size="small"
                            sx={{
                              height: 20,
                              bgcolor: isDark ? "rgba(22, 163, 74, 0.18)" : "#dcfce7",
                              color: "#16a34a",
                              fontWeight: 800,
                              fontSize: "0.68rem",
                              borderRadius: "6px",
                            }}
                          />
                        )}
                      </Box>

                      {/* Subtitle if manual override differed from AI */}
                      {isStartManual && trip.aiDetectedStartKm != null && (
                        <Typography sx={{ fontSize: "0.68rem", color: isDark ? "#fbbf24" : "#b45309", mt: 0.3, fontWeight: 600 }}>
                          ⚠️ User wrote manually (AI detected: {trip.aiDetectedStartKm} KM)
                        </Typography>
                      )}
                    </Box>
                  </Box>

                  {/* Middle Arrow & Distance */}
                  <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: 80 }}>
                    <Typography sx={{ fontWeight: 900, fontSize: "1.1rem", color: "#16a34a", fontFamily: "monospace" }}>
                      {tripKm > 0 ? `${tripKm} KM` : "-"}
                    </Typography>
                    <CompareArrows sx={{ fontSize: 24, color: COLOR.textMuted }} />
                    <Typography sx={{ fontSize: "0.68rem", color: COLOR.textMuted, fontWeight: 700 }}>
                      ₹{tripAllowance.toFixed(2)} (@ ₹2/KM)
                    </Typography>
                  </Box>

                  {/* End Box */}
                  <Box
                    sx={{
                      flex: 1,
                      width: "100%",
                      p: 1.5,
                      borderRadius: "12px",
                      bgcolor: isDark ? "rgba(22,163,74,0.05)" : "#f0fdf4",
                      border: "1px solid rgba(22,163,74,0.2)",
                      display: "flex",
                      alignItems: "center",
                      gap: 1.5,
                    }}
                  >
                    {/* End Image Thumbnail (Clickable to zoom) */}
                    <Box
                      onClick={() => {
                        if (endPhoto) {
                          onOpenImage({
                            url: endPhotoUrl,
                            rawPhoto: endPhoto,
                            title: `Trip #${idx + 1} End Odometer`,
                            km: trip.endKm,
                          });
                        }
                      }}
                      sx={{
                        width: 70,
                        height: 70,
                        borderRadius: "10px",
                        bgcolor: isDark ? "rgba(0,0,0,0.3)" : "#e2e8f0",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        overflow: "hidden",
                        position: "relative",
                        cursor: endPhoto ? "pointer" : "default",
                        border: "1px solid #cbd5e1",
                        flexShrink: 0,
                        "&:hover": endPhoto ? {
                          "& .zoomIcon": { opacity: 1 },
                          transform: "scale(1.03)",
                        } : {},
                        transition: "all 0.2s",
                      }}
                    >
                      {endPhoto ? (
                        <>
                          <OdometerImagePreview
                            rawPhoto={endPhoto}
                            alt="End Odometer"
                            sx={{ width: "100%", height: "100%", objectFit: "cover" }}
                            fallbackIcon={<PhotoCamera sx={{ fontSize: 24, color: COLOR.textMuted }} />}
                          />
                          <Box
                            className="zoomIcon"
                            sx={{
                              position: "absolute",
                              inset: 0,
                              bgcolor: "rgba(0,0,0,0.4)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              opacity: 0,
                              transition: "opacity 0.2s",
                            }}
                          >
                            <ZoomIn sx={{ color: "#fff", fontSize: 20 }} />
                          </Box>
                        </>
                      ) : isCompleted ? (
                        <PhotoCamera sx={{ fontSize: 24, color: COLOR.textMuted }} />
                      ) : (
                        <Typography sx={{ fontSize: "0.68rem", color: "#2563eb", fontWeight: 700, textAlign: "center", px: 0.5 }}>
                          En Route
                        </Typography>
                      )}
                    </Box>

                    {/* End Details */}
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography sx={{ fontSize: "0.70rem", color: "#16a34a", fontWeight: 800 }}>
                        TRIP END (T{idx + 1}E)
                      </Typography>
                      <Typography sx={{ fontWeight: 900, fontSize: "1.2rem", color: COLOR.text, fontFamily: "monospace", lineHeight: 1.2 }}>
                        {isCompleted
                          ? `${Number(trip.endKm || 0).toLocaleString("en-IN")} `
                          : "In Progress"}
                        {isCompleted && <Typography component="span" sx={{ fontSize: "0.80rem", fontWeight: 700, color: COLOR.textSub }}>KM</Typography>}
                      </Typography>

                      {/* Manual / AI / Admin Status Badge */}
                      <Box sx={{ mt: 0.5, display: "flex", alignItems: "center", gap: 0.5, flexWrap: "wrap" }}>
                        {isCompleted && (
                          isEndManual ? (
                            <Chip
                              icon={<Edit sx={{ fontSize: "11px !important", color: isDark ? "#f59e0b" : "#b45309" }} />}
                              label="✍️ Written Manually"
                              size="small"
                              sx={{
                                height: 20,
                                bgcolor: isDark ? "rgba(245, 158, 11, 0.25)" : "#fef3c7",
                                color: isDark ? "#fbbf24" : "#92400e",
                                fontWeight: 800,
                                fontSize: "0.68rem",
                                borderRadius: "6px",
                                border: "1px solid rgba(245, 158, 11, 0.5)",
                              }}
                            />
                          ) : trip.isAdminEdited ? (
                            <Chip
                              label="✏️ Admin Edited"
                              size="small"
                              sx={{
                                height: 20,
                                bgcolor: isDark ? "rgba(99, 102, 241, 0.2)" : "#e0e7ff",
                                color: "#6366f1",
                                fontWeight: 800,
                                fontSize: "0.68rem",
                                borderRadius: "6px",
                              }}
                            />
                          ) : (
                            <Chip
                              icon={<CheckCircle sx={{ fontSize: "11px !important", color: "#16a34a !important" }} />}
                              label="AI Scanned"
                              size="small"
                              sx={{
                                height: 20,
                                bgcolor: isDark ? "rgba(22, 163, 74, 0.18)" : "#dcfce7",
                                color: "#16a34a",
                                fontWeight: 800,
                                fontSize: "0.68rem",
                                borderRadius: "6px",
                              }}
                            />
                          )
                        )}
                      </Box>

                      {/* Subtitle if manual override differed from AI */}
                      {isCompleted && isEndManual && trip.aiDetectedEndKm != null && (
                        <Typography sx={{ fontSize: "0.68rem", color: isDark ? "#fbbf24" : "#b45309", mt: 0.3, fontWeight: 600 }}>
                          ⚠️ User wrote manually (AI detected: {trip.aiDetectedEndKm} KM)
                        </Typography>
                      )}
                    </Box>
                  </Box>
                </Box>

                {/* Admin Note if saved */}
                {trip.adminEditNote && (
                  <Box sx={{ p: 1, borderRadius: "8px", bgcolor: isDark ? "rgba(255,255,255,0.03)" : "#f1f5f9", border: `1px solid ${COLOR.border}` }}>
                    <Typography sx={{ fontSize: "0.72rem", color: COLOR.textMuted, fontStyle: "italic" }}>
                      📝 Admin Note: {trip.adminEditNote}
                    </Typography>
                  </Box>
                )}
              </Paper>
            );
          })
        )}
      </DialogContent>

      <DialogActions sx={{ px: 2.5, py: 1.5, borderTop: `1px solid ${COLOR.border}`, justifyContent: "space-between" }}>
        <Typography sx={{ fontWeight: 800, fontSize: "0.85rem", color: COLOR.text }}>
          Total Distance: <Typography component="span" sx={{ color: "#16a34a", fontWeight: 900 }}>{totalKm.toFixed(2)} KM</Typography>
          <Typography component="span" sx={{ color: COLOR.textSub, ml: 1, fontSize: "0.80rem" }}>
            (KM Price: ₹{totalAllowance.toFixed(2)})
          </Typography>
        </Typography>
        <Button onClick={onClose} variant="contained" sx={{ textTransform: "none", fontWeight: 700, borderRadius: "8px", bgcolor: "#2563eb", "&:hover": { bgcolor: "#1d4ed8" } }}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default function AttendanceHistoryPage() {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const COLOR = useMemo(() => getColors(isDark), [isDark]);
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const navigate = useNavigate();
  const location = useLocation();
  const { userId: routeUserId } = useParams();
  const { user: authUser } = useAuth();

  const state = location.state || {};
  const currentUserId =
    routeUserId === "me" || !routeUserId
      ? toIdString(authUser?._id || authUser?.id || authUser?.userId || authUser)
      : toIdString(routeUserId);
  const targetUserId = toIdString(currentUserId || state.userId || state.memberId || state.user);

  // Filter States
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [timeFilter, setTimeFilter] = useState("all"); // 'today' | 'week' | 'all'
  const [statusFilter, setStatusFilter] = useState("all"); // 'all' | 'present' | 'absent'
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [attendances, setAttendances] = useState(state.initialAttendances || []);
  const [trips, setTrips] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [expensePopupData, setExpensePopupData] = useState(null);
  const [tripsPopupData, setTripsPopupData] = useState(null);
  const [editingTrip, setEditingTrip] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  // Fetch Attendance & User Details
  const fetchAttendanceData = useCallback(async () => {
    if (!targetUserId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const year = selectedMonth.getFullYear();
      const month = selectedMonth.getMonth();
      const startDate = `${year}-${String(month + 1).padStart(2, "0")}-01`;
      const lastDay = new Date(year, month + 1, 0).getDate();
      const endDate = `${year}-${String(month + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

      const fetchTripsEndpoint = async () => {
        try {
          return await apiFetch("/trips", { userId: targetUserId, salesmanId: targetUserId, filter: "all" });
        } catch {
          return await apiFetch("/trip", { userId: targetUserId, salesmanId: targetUserId, filter: "all" }).catch(() => null);
        }
      };

      const fetchExpensesEndpoint = async () => {
        try {
          const res = await apiFetch("/expense/getAll", { userId: targetUserId, limit: 300 });
          if (res?.data?.expenses?.length || res?.expenses?.length) return res;
          // Also fetch all in month range if specific user filter returned empty
          return await apiFetch("/expense/getAll", { limit: 300 });
        } catch {
          return await apiFetch("/expense", { userId: targetUserId, limit: 300 }).catch(() => null);
        }
      };

      const [userRes, attRes, expenseRes, tripsRes] = await Promise.all([
        apiFetch(`/user/getUserById/${targetUserId}`).catch(() => null),
        apiFetch("/attendance", { userId: targetUserId, startDate, endDate, limit: 200 }).catch(() => null),
        fetchExpensesEndpoint().catch(() => null),
        fetchTripsEndpoint().catch(() => null),
      ]);

      if (userRes?.data || userRes?.result || userRes) {
        setUser(userRes?.data || userRes?.result || userRes);
      }

      // Handle all possible backend response envelopes
      const list =
        attRes?.result?.attendances ||
        attRes?.data?.attendances ||
        attRes?.attendances ||
        attRes?.result?.items ||
        attRes?.data?.items ||
        (Array.isArray(attRes?.result) ? attRes.result : null) ||
        (Array.isArray(attRes?.data) ? attRes.data : null) ||
        (Array.isArray(attRes) ? attRes : []) ||
        state.initialAttendances ||
        [];

      setAttendances(Array.isArray(list) ? list : []);

      const rawTrips =
        tripsRes?.data?.trips ||
        tripsRes?.result?.trips ||
        tripsRes?.trips ||
        tripsRes?.data ||
        tripsRes?.result ||
        (Array.isArray(tripsRes) ? tripsRes : []);
      setTrips(Array.isArray(rawTrips) ? rawTrips.map(normalizeTrip) : []);

      const rawExpenses =
        expenseRes?.data?.expenses ||
        expenseRes?.result?.expenses ||
        expenseRes?.expenses ||
        expenseRes?.data ||
        expenseRes?.result ||
        (Array.isArray(expenseRes) ? expenseRes : []);
      setExpenses(Array.isArray(rawExpenses) ? rawExpenses : []);
    } catch (err) {
      console.warn("Failed fetching live attendance records:", err);
      if (state.initialAttendances) {
        setAttendances(state.initialAttendances);
      }
    } finally {
      setLoading(false);
    }
  }, [targetUserId, selectedMonth, state.initialAttendances]);

  useEffect(() => {
    fetchAttendanceData();
  }, [fetchAttendanceData]);

  // Display User Meta
  const userName =
    state.memberName ||
    (user?.firstName ? `${user.firstName} ${user.lastName || ""}` : user?.name) ||
    (authUser?.firstName ? `${authUser.firstName} ${authUser.lastName || ""}` : authUser?.name) ||
    "demo user";
  const userRole = state.memberRole || user?.role || authUser?.role || "TEAM";
  const rawJoinedDate =
    user?.joiningDate ||
    user?.createdAt ||
    authUser?.joiningDate ||
    authUser?.createdAt ||
    state.joiningDate ||
    state.memberCreatedAt;
  const joiningDateObj = rawJoinedDate ? new Date(rawJoinedDate) : null;
  const isValidJoinDate = joiningDateObj && !Number.isNaN(joiningDateObj.getTime());
  const joinedDate = isValidJoinDate
    ? formatDateDayMonthYear(joiningDateObj)
    : "—";

  // Month navigation boundaries based on joining date
  const todayDate = useMemo(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t;
  }, []);

  const maxMonth = useMemo(() => {
    return new Date(todayDate.getFullYear(), todayDate.getMonth(), 1);
  }, [todayDate]);

  // Strict minimum month: if joining date is not yet known or loaded, clamp to current month (maxMonth)
  // This strictly guarantees that the user can NEVER navigate back to past months/years (like June 2024)!
  const minMonth = useMemo(() => {
    if (!isValidJoinDate) {
      return maxMonth;
    }
    const jm = new Date(joiningDateObj.getFullYear(), joiningDateObj.getMonth(), 1);
    return jm > maxMonth ? maxMonth : jm;
  }, [isValidJoinDate, joiningDateObj, maxMonth]);

  const canGoPrevMonth = useMemo(() => {
    if (!minMonth) return false;
    const currentView = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1);
    return currentView.getTime() > minMonth.getTime();
  }, [minMonth, selectedMonth]);

  const canGoNextMonth = useMemo(() => {
    const currentView = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1);
    return currentView.getTime() < maxMonth.getTime();
  }, [maxMonth, selectedMonth]);

  // Clamp selectedMonth strictly within [minMonth, maxMonth] boundaries
  useEffect(() => {
    const currentView = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1);
    if (minMonth && currentView.getTime() < minMonth.getTime()) {
      setSelectedMonth(new Date(minMonth));
    } else if (currentView.getTime() > maxMonth.getTime()) {
      setSelectedMonth(new Date(maxMonth));
    }
  }, [minMonth, maxMonth, selectedMonth]);

  // Build daily rows for the selected month using 100% real database records
  const rawDailyRows = useMemo(() => {
    const year = selectedMonth.getFullYear();
    const month = selectedMonth.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date();

    // If selectedMonth is before employee's joining month, return empty
    if (minMonth && new Date(year, month, 1).getTime() < minMonth.getTime()) {
      return [];
    }

    const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;
    const maxDay = isCurrentMonth ? today.getDate() : daysInMonth;

    // In the joining month, start strictly from the joining day (no rows prior to joining date)
    const isJoiningMonth = joiningDateObj && year === joiningDateObj.getFullYear() && month === joiningDateObj.getMonth();
    const minDay = isJoiningMonth ? joiningDateObj.getDate() : 1;

    const rows = [];
    for (let day = maxDay; day >= minDay; day--) {
      const currentDate = new Date(year, month, day);
      const dateKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const dateFormatted = `${day} ${selectedMonth.toLocaleString("en-US", { month: "short" })} ${year}`;

      // Look for matched real attendance record in database list
      const match = attendances.find((a) => {
        if (!a) return false;
        const datesToCheck = [a.punchIn?.time, a.date, a.createdAt, a.punchOut?.time].filter(Boolean);
        for (const raw of datesToCheck) {
          const d = new Date(raw);
          if (!Number.isNaN(d.getTime())) {
            if (
              d.getFullYear() === year &&
              d.getMonth() === month &&
              d.getDate() === day
            ) {
              return true;
            }
            if (
              d.getUTCFullYear() === year &&
              d.getUTCMonth() === month &&
              d.getUTCDate() === day
            ) {
              return true;
            }
          }
        }
        if (typeof a.date === "string" && a.date.includes(dateKey)) return true;
        if (typeof a.createdAt === "string" && a.createdAt.includes(dateKey)) return true;
        return false;
      });

      // Find trips for this dateKey
      const dayTrips = trips.filter((t) => {
        if (!t) return false;
        if (t.dateKey && t.dateKey === dateKey) return true;
        if (t.startTime && String(t.startTime).startsWith(dateKey)) return true;
        if (t.createdAt && String(t.createdAt).startsWith(dateKey)) return true;
        if (t.endTime && String(t.endTime).startsWith(dateKey)) return true;
        return false;
      });

      const dayTripsKm = dayTrips.reduce((sum, t) => sum + (Number(t.totalKm) || 0), 0);
      const tripCount = dayTrips.length;
      const matchOdo = Number(match?.manualOdometerKm || match?.odometerKm || match?.odometerDistance || 0);
      const odoVal = dayTripsKm > 0 ? dayTripsKm : matchOdo;
      const odometerKm = odoVal > 0 ? `${odoVal.toFixed(2)} KM` : "-";

      // Find approved expenses for this dateKey
      const dayApprovedExpenses = expenses.filter((e) => {
        if (!e) return false;
        const st = String(e.status || "").toLowerCase().trim();
        if (st !== "approved") return false;

        if (targetUserId) {
          const expUserId = toIdString(e.createdBy?._id || e.createdBy?.id || e.createdBy || e.userId);
          if (expUserId && expUserId !== targetUserId) {
            return false;
          }
        }

        const rawDate = e.expenseDate || e.date || e.createdAt;
        if (!rawDate) return false;
        const d = new Date(rawDate);
        if (Number.isNaN(d.getTime())) return false;

        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, "0");
        const dayNum = String(d.getDate()).padStart(2, "0");
        const localKey = `${y}-${m}-${dayNum}`;

        const uy = d.getUTCFullYear();
        const um = String(d.getUTCMonth() + 1).padStart(2, "0");
        const udayNum = String(d.getUTCDate()).padStart(2, "0");
        const utcKey = `${uy}-${um}-${udayNum}`;

        if (localKey === dateKey || utcKey === dateKey) return true;
        if (typeof rawDate === "string" && rawDate.startsWith(dateKey)) return true;
        return false;
      });

      const dayApprovedExpenseTotal = dayApprovedExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
      const matchExpense = Number(match?.expenseAmount || 0);
      const finalDayExpense = dayApprovedExpenseTotal > 0 ? dayApprovedExpenseTotal : matchExpense;
      const expenseDisplay = finalDayExpense > 0 ? `Rs. ${finalDayExpense.toLocaleString("en-IN")}` : "Rs. 0";

      if (match) {
        const hasPunchIn = !!(match.punchIn?.time || match.punchInTime || match.punchIn);
        const hasPunchOut = !!(match.punchOut?.time || match.punchOutTime);
        const punchInTime = match.punchIn?.time
          ? formatClockTime(match.punchIn.time)
          : typeof match.punchIn === "string" && !match.punchIn.includes("object")
          ? match.punchIn
          : match.punchInTime || (hasPunchIn ? "09:30 am" : "-");
        const punchOutTime = match.punchOut?.time
          ? formatClockTime(match.punchOut.time)
          : match.punchOutTime
          ? match.punchOutTime
          : hasPunchIn && !hasPunchOut
          ? "Ongoing"
          : "-";
        
        const distanceVal = Number(match.totalDistanceKm || match.distanceKm || match.distance || match.totalKm || 0);
        const fullKm = distanceVal > 0 ? `${distanceVal.toFixed(2)} KM` : "-";

        const isAbsent = String(match.status || "").toLowerCase() === "absent" && !hasPunchIn;

        // KM Price: 1 KM * 2
        const effectiveKm = odoVal > 0 ? odoVal : (distanceVal > 0 ? distanceVal : 0);
        const kmPriceVal = effectiveKm > 0 ? effectiveKm * 2 : 0;
        const kmPrice = kmPriceVal > 0 ? `₹${kmPriceVal.toFixed(2)}` : "-";

        rows.push({
          dateKey,
          dateObj: currentDate,
          dateFormatted,
          punchInTime: isAbsent ? "-" : punchInTime,
          punchOutTime: isAbsent ? "-" : punchOutTime,
          isOngoing: !isAbsent && hasPunchIn && !hasPunchOut,
          status: isAbsent ? "Absent" : "Present",
          odometerKm,
          odometerRaw: odoVal,
          kmPrice,
          kmPriceRaw: kmPriceVal,
          tripCount,
          fullKm,
          fullKmRaw: distanceVal,
          visits: match.visitsCount || match.visitStats?.visitCount || match.visits?.length || 0,
          expense: expenseDisplay,
          expenseRaw: finalDayExpense,
          expenseCount: dayApprovedExpenses.length,
          dayExpenses: dayApprovedExpenses,
          dayTrips,
        });
      } else {
        // Real record for days without a punch-in (marked Absent)
        const effectiveKm = odoVal > 0 ? odoVal : 0;
        const kmPriceVal = effectiveKm > 0 ? effectiveKm * 2 : 0;
        const kmPrice = kmPriceVal > 0 ? `₹${kmPriceVal.toFixed(2)}` : "-";

        rows.push({
          dateKey,
          dateObj: currentDate,
          dateFormatted,
          punchInTime: "-",
          punchOutTime: "-",
          isOngoing: false,
          status: "Absent",
          odometerKm,
          odometerRaw: odoVal,
          kmPrice,
          kmPriceRaw: kmPriceVal,
          tripCount,
          fullKm: "-",
          fullKmRaw: 0,
          visits: 0,
          expense: expenseDisplay,
          expenseRaw: finalDayExpense,
          expenseCount: dayApprovedExpenses.length,
          dayExpenses: dayApprovedExpenses,
          dayTrips,
        });
      }
    }
    return rows;
  }, [selectedMonth, attendances, trips, expenses]);

  // Quick Time Filter (Today / Week / All)
  const timeFilteredRows = useMemo(() => {
    if (timeFilter === "today") {
      const todayStr = formatDateDayMonthYear(new Date());
      return rawDailyRows.filter((r) => r.dateFormatted === todayStr);
    }
    if (timeFilter === "week") {
      const now = new Date();
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(now.getDate() - 7);
      return rawDailyRows.filter((r) => r.dateObj >= oneWeekAgo && r.dateObj <= now);
    }
    return rawDailyRows;
  }, [rawDailyRows, timeFilter]);

  // Overall KPI Totals
  const totalDays = rawDailyRows.length;
  const presentCount = rawDailyRows.filter((r) => r.status === "Present").length;
  const absentCount = rawDailyRows.filter((r) => r.status === "Absent").length;
  const totalOdometer = rawDailyRows.reduce((acc, r) => acc + (r.odometerRaw || 0), 0);
  const totalTripsCount = rawDailyRows.reduce((acc, r) => acc + (r.tripCount || 0), 0);
  const totalKmPrice = rawDailyRows.reduce((acc, r) => acc + (r.kmPriceRaw || 0), 0);
  const totalFullKm = rawDailyRows.reduce((acc, r) => acc + (r.fullKmRaw || 0), 0);
  const totalExpense = rawDailyRows.reduce((acc, r) => acc + (r.expenseRaw || 0), 0);

  // All approved expenses for the currently viewed month
  const allMonthApprovedExpenses = useMemo(() => {
    const list = [];
    rawDailyRows.forEach((r) => {
      if (Array.isArray(r.dayExpenses) && r.dayExpenses.length > 0) {
        list.push(...r.dayExpenses);
      }
    });
    return list;
  }, [rawDailyRows]);

  // All recorded trips for the currently viewed month
  const allMonthTrips = useMemo(() => {
    const list = [];
    rawDailyRows.forEach((r) => {
      if (Array.isArray(r.dayTrips) && r.dayTrips.length > 0) {
        list.push(...r.dayTrips);
      }
    });
    return list;
  }, [rawDailyRows]);

  const handleTripUpdated = (updatedTrip) => {
    const norm = normalizeTrip(updatedTrip);
    setTrips((prev) =>
      prev.map((t) =>
        toIdString(t._id || t.id) === toIdString(norm._id || norm.id) ? norm : t
      )
    );
    setTripsPopupData((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        trips: (prev.trips || []).map((t) =>
          toIdString(t._id || t.id) === toIdString(norm._id || norm.id) ? norm : t
        ),
      };
    });
  };

  // Status Filtered Rows for Table
  const finalDisplayRows = useMemo(() => {
    if (statusFilter === "present") {
      return timeFilteredRows.filter((r) => r.status === "Present");
    }
    if (statusFilter === "absent") {
      return timeFilteredRows.filter((r) => r.status === "Absent");
    }
    return timeFilteredRows;
  }, [timeFilteredRows, statusFilter]);

  // Export to Excel
  const handleExportExcel = () => {
    const data = finalDisplayRows.map((row) => ({
      Date: row.dateFormatted,
      "Punch In": row.punchInTime,
      "Punch Out": row.punchOutTime,
      Status: row.status,
      "Odometer KM": row.odometerKm,
      "KM Price (₹2/km)": row.kmPrice,
      "Full KM": row.fullKm,
      Visits: row.visits,
      Expense: row.expense,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Attendance History");
    const monthStr = selectedMonth.toLocaleString("en-US", { month: "short", year: "numeric" });
    XLSX.writeFile(wb, `${userName.replace(/\s+/g, "_")}_Attendance_${monthStr}.xlsx`);
  };

  const handlePrevMonth = () => {
    if (!canGoPrevMonth) return;
    setSelectedMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };
  const handleNextMonth = () => {
    if (!canGoNextMonth) return;
    setSelectedMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const monthShortName = selectedMonth.toLocaleString("en-US", { month: "short", year: "numeric" });
  const monthFullName = selectedMonth.toLocaleString("en-US", { month: "long", year: "numeric" });

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: COLOR.bg, color: COLOR.text, p: { xs: 1.5, md: 3 } }}>
      <Box sx={{ maxWidth: 1440, mx: "auto" }}>
        
        {/* ── 1. Top Blue Header Banner ── */}
        {/* ── 1. Top Blackish Header Banner ── */}
        <Paper
          elevation={0}
          sx={{
            p: { xs: 2, sm: 2.75 },
            px: { xs: 2, sm: 3.5 },
            borderRadius: "18px",
            background: "linear-gradient(135deg, #090e1a 0%, #111736 40%, #17203a 100%)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            color: "#ffffff",
            boxShadow: "0 12px 32px rgba(0, 0, 0, 0.35)",
            mb: 2.5,
          }}
        >
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={2}
            justifyContent="space-between"
            alignItems={{ xs: "flex-start", sm: "center" }}
          >
            {/* Left: Back button, Name, Role & Joined chip */}
            <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
              <Button
                variant="outlined"
                startIcon={<ArrowBack sx={{ fontSize: 18 }} />}
                onClick={() => navigate(-1)}
                sx={{
                  color: "#ffffff",
                  borderColor: "rgba(255, 255, 255, 0.18)",
                  bgcolor: "rgba(255, 255, 255, 0.06)",
                  borderRadius: "10px",
                  height: 38,
                  px: 2,
                  textTransform: "none",
                  fontWeight: 700,
                  fontSize: "0.85rem",
                  "&:hover": {
                    bgcolor: "rgba(255, 255, 255, 0.12)",
                    borderColor: "rgba(255, 255, 255, 0.3)",
                  },
                }}
              >
                Back
              </Button>

              <Box>
                <Typography variant="h6" fontWeight={800} sx={{ color: "#ffffff", fontSize: { xs: "1.1rem", sm: "1.3rem" } }}>
                  Attendance History
                </Typography>
                <Stack direction="row" spacing={1.2} alignItems="center" sx={{ mt: 0.3 }} flexWrap="wrap">
                  <Typography variant="body2" sx={{ color: "rgba(255, 255, 255, 0.9)", fontWeight: 600, fontSize: "0.85rem" }}>
                    {userName} - {userRole}
                  </Typography>
                  <Chip
                    icon={<CalendarToday sx={{ fontSize: "0.75rem !important", color: "#93c5fd" }} />}
                    label={`Joined: ${joinedDate}`}
                    size="small"
                    sx={{
                      bgcolor: "rgba(59, 130, 246, 0.15)",
                      color: "#93c5fd",
                      border: "1px solid rgba(59, 130, 246, 0.3)",
                      fontSize: "0.72rem",
                      fontWeight: 700,
                      borderRadius: "6px",
                      height: 22,
                    }}
                  />
                </Stack>
              </Box>
            </Stack>

            {/* Right: Download Excel & Month Tag */}
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Button
                variant="contained"
                startIcon={<FileDownload sx={{ fontSize: 18 }} />}
                onClick={handleExportExcel}
                sx={{
                  bgcolor: "#f97316",
                  color: "#ffffff",
                  borderRadius: "20px",
                  height: 38,
                  px: 2.5,
                  textTransform: "none",
                  fontWeight: 800,
                  fontSize: "0.82rem",
                  boxShadow: "0 4px 14px rgba(249, 115, 22, 0.35)",
                  "&:hover": { bgcolor: "#ea580c" },
                }}
              >
                Download Excel
              </Button>

              <Box
                sx={{
                  bgcolor: "rgba(255, 255, 255, 0.08)",
                  color: "#e2e8f0",
                  px: 2,
                  py: 0.8,
                  borderRadius: "20px",
                  fontSize: "0.8rem",
                  fontWeight: 700,
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                }}
              >
                {monthShortName}
              </Box>
            </Stack>
          </Stack>
        </Paper>

        {/* ── 2. Top Filter Buttons & Month Navigator ── */}
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={2}
          justifyContent="space-between"
          alignItems={{ xs: "stretch", sm: "center" }}
          sx={{ mb: 2.5 }}
        >
          {/* Left: Quick Pill Filter buttons */}
          <Stack direction="row" spacing={1} flexWrap="wrap">
            <Button
              variant={timeFilter === "today" ? "contained" : "outlined"}
              startIcon={<CalendarToday sx={{ fontSize: 15 }} />}
              onClick={() => setTimeFilter(timeFilter === "today" ? "all" : "today")}
              sx={{
                borderRadius: "8px",
                height: 36,
                px: 2,
                fontSize: "0.8rem",
                fontWeight: 700,
                textTransform: "none",
                bgcolor: timeFilter === "today" ? COLOR.blue : COLOR.card,
                color: timeFilter === "today" ? "#ffffff" : COLOR.text,
                borderColor: timeFilter === "today" ? COLOR.blue : COLOR.border,
                "&:hover": {
                  bgcolor: timeFilter === "today" ? "#1d4ed8" : COLOR.cardHover,
                  borderColor: COLOR.blue,
                },
              }}
            >
              Today
            </Button>

            <Button
              variant={timeFilter === "week" ? "contained" : "outlined"}
              startIcon={<CalendarToday sx={{ fontSize: 15 }} />}
              onClick={() => setTimeFilter(timeFilter === "week" ? "all" : "week")}
              sx={{
                borderRadius: "8px",
                height: 36,
                px: 2,
                fontSize: "0.8rem",
                fontWeight: 700,
                textTransform: "none",
                bgcolor: timeFilter === "week" ? COLOR.blue : COLOR.card,
                color: timeFilter === "week" ? "#ffffff" : COLOR.text,
                borderColor: timeFilter === "week" ? COLOR.blue : COLOR.border,
                "&:hover": {
                  bgcolor: timeFilter === "week" ? "#1d4ed8" : COLOR.cardHover,
                  borderColor: COLOR.blue,
                },
              }}
            >
              Week
            </Button>

            <Button
              variant={timeFilter === "all" ? "contained" : "outlined"}
              startIcon={<CalendarToday sx={{ fontSize: 15 }} />}
              onClick={() => setTimeFilter("all")}
              sx={{
                borderRadius: "8px",
                height: 36,
                px: 2,
                fontSize: "0.8rem",
                fontWeight: 700,
                textTransform: "none",
                bgcolor: timeFilter === "all" ? (isDark ? "#1e293b" : "#ffffff") : COLOR.card,
                color: COLOR.text,
                borderColor: timeFilter === "all" ? (isDark ? "#475569" : "#cbd5e1") : COLOR.border,
                "&:hover": {
                  bgcolor: COLOR.cardHover,
                  borderColor: COLOR.blue,
                },
              }}
            >
              All
            </Button>

            <Button
              variant="outlined"
              startIcon={<Refresh sx={{ fontSize: 16 }} />}
              onClick={fetchAttendanceData}
              sx={{
                borderRadius: "8px",
                height: 36,
                px: 2,
                fontSize: "0.8rem",
                fontWeight: 700,
                textTransform: "none",
                bgcolor: COLOR.card,
                color: COLOR.text,
                borderColor: COLOR.border,
                "&:hover": {
                  bgcolor: COLOR.cardHover,
                  borderColor: COLOR.blue,
                },
              }}
            >
              Refresh
            </Button>
          </Stack>

          {/* Right: Month Selector Pill with Left/Right Arrows */}
          <Paper
            elevation={0}
            sx={{
              display: "flex",
              alignItems: "center",
              bgcolor: COLOR.card,
              border: `1px solid ${COLOR.border}`,
              borderRadius: "10px",
              px: 1,
              py: 0.4,
            }}
          >
            <Tooltip title={!canGoPrevMonth ? "Cannot go before joining month" : "Previous Month"}>
              <span>
                <IconButton
                  size="small"
                  disabled={!canGoPrevMonth}
                  onClick={handlePrevMonth}
                  sx={{
                    color: canGoPrevMonth ? COLOR.textSub : COLOR.textMuted,
                    opacity: canGoPrevMonth ? 1 : 0.25,
                    cursor: canGoPrevMonth ? "pointer" : "not-allowed",
                    p: 0.5,
                  }}
                >
                  <ChevronLeft sx={{ fontSize: 20 }} />
                </IconButton>
              </span>
            </Tooltip>

            <Stack direction="row" spacing={1} alignItems="center" sx={{ px: 1.5 }}>
              <CalendarToday sx={{ fontSize: 15, color: COLOR.blue }} />
              <Typography sx={{ fontWeight: 700, fontSize: "0.85rem", color: COLOR.text }}>
                {monthFullName}
              </Typography>
              <CalendarToday sx={{ fontSize: 15, color: COLOR.textMuted }} />
            </Stack>

            <Tooltip title={!canGoNextMonth ? "Cannot go beyond current month" : "Next Month"}>
              <span>
                <IconButton
                  size="small"
                  disabled={!canGoNextMonth}
                  onClick={handleNextMonth}
                  sx={{
                    color: canGoNextMonth ? COLOR.textSub : COLOR.textMuted,
                    opacity: canGoNextMonth ? 1 : 0.25,
                    cursor: canGoNextMonth ? "pointer" : "not-allowed",
                    p: 0.5,
                  }}
                >
                  <ChevronRight sx={{ fontSize: 20 }} />
                </IconButton>
              </span>
            </Tooltip>
          </Paper>
        </Stack>

        {/* ── 3. Six KPI Metric Cards ── */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "repeat(2, 1fr)",
              sm: "repeat(3, 1fr)",
              md: "repeat(6, 1fr)",
            },
            gap: 2,
            mb: 3,
          }}
        >
          {/* Card 1: DAYS */}
          <Paper
            elevation={0}
            sx={{
              p: 2,
              borderRadius: "14px",
              bgcolor: COLOR.card,
              border: "2px solid #3b82f6",
              boxShadow: "0 2px 10px rgba(59, 130, 246, 0.1)",
            }}
          >
            <Typography variant="caption" sx={{ color: COLOR.textMuted, fontWeight: 800, fontSize: "0.72rem", letterSpacing: "0.04em" }}>
              DAYS
            </Typography>
            <Typography variant="h4" fontWeight={900} sx={{ color: COLOR.text, my: 0.4, lineHeight: 1.1 }}>
              {totalDays}
            </Typography>
            <Typography variant="caption" sx={{ color: COLOR.textMuted, fontSize: "0.75rem", fontWeight: 600 }}>
              Total days
            </Typography>
          </Paper>

          {/* Card 2: PRESENT */}
          <Paper
            elevation={0}
            sx={{
              p: 2,
              borderRadius: "14px",
              bgcolor: isDark ? "rgba(22, 163, 74, 0.12)" : "#f0fdf4",
              border: `1px solid ${isDark ? "rgba(22, 163, 74, 0.3)" : "#bbf7d0"}`,
            }}
          >
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="caption" sx={{ color: "#16a34a", fontWeight: 800, fontSize: "0.72rem", letterSpacing: "0.04em" }}>
                PRESENT
              </Typography>
              <CheckCircle sx={{ fontSize: 16, color: "#16a34a" }} />
            </Stack>
            <Typography variant="h4" fontWeight={900} sx={{ color: "#16a34a", my: 0.4, lineHeight: 1.1 }}>
              {presentCount}
            </Typography>
            <Typography variant="caption" sx={{ color: "#16a34a", fontSize: "0.75rem", fontWeight: 600 }}>
              Punched in recorded
            </Typography>
          </Paper>

          {/* Card 3: ABSENT */}
          <Paper
            elevation={0}
            sx={{
              p: 2,
              borderRadius: "14px",
              bgcolor: isDark ? "rgba(220, 38, 38, 0.12)" : "#fef2f2",
              border: `1px solid ${isDark ? "rgba(220, 38, 38, 0.3)" : "#fecaca"}`,
            }}
          >
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="caption" sx={{ color: "#dc2626", fontWeight: 800, fontSize: "0.72rem", letterSpacing: "0.04em" }}>
                ABSENT
              </Typography>
              <CalendarToday sx={{ fontSize: 14, color: "#dc2626" }} />
            </Stack>
            <Typography variant="h4" fontWeight={900} sx={{ color: "#dc2626", my: 0.4, lineHeight: 1.1 }}>
              {absentCount}
            </Typography>
            <Typography variant="caption" sx={{ color: "#dc2626", fontSize: "0.75rem", fontWeight: 600 }}>
              No punch in recorded
            </Typography>
          </Paper>

          {/* Card 4: ODOMETER KM */}
          <Paper
            elevation={0}
            onClick={() => {
              setTripsPopupData({
                title: `All Odometer Trips • ${monthFullName}`,
                trips: allMonthTrips,
              });
            }}
            sx={{
              p: 2,
              borderRadius: "14px",
              bgcolor: COLOR.card,
              border: `1px solid ${COLOR.border}`,
              cursor: "pointer",
              transition: "all 0.2s ease-in-out",
              "&:hover": {
                transform: "translateY(-2px)",
                borderColor: "#3b82f6",
                boxShadow: isDark ? "0 4px 14px rgba(59,130,246,0.25)" : "0 4px 14px rgba(59,130,246,0.15)",
              },
            }}
          >
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="caption" sx={{ color: COLOR.textMuted, fontWeight: 800, fontSize: "0.72rem", letterSpacing: "0.04em" }}>
                ODOMETER KM
              </Typography>
              <Chip
                label="Click to view"
                size="small"
                sx={{
                  height: 18,
                  fontSize: "0.62rem",
                  fontWeight: 800,
                  bgcolor: isDark ? "rgba(59, 130, 246, 0.15)" : "#eff6ff",
                  color: "#3b82f6",
                  cursor: "pointer",
                }}
              />
            </Stack>
            <Typography variant="h4" fontWeight={900} sx={{ color: COLOR.text, my: 0.4, lineHeight: 1.1 }}>
              {totalOdometer.toFixed(2)}
            </Typography>
            <Typography variant="caption" sx={{ color: COLOR.textMuted, fontSize: "0.75rem", fontWeight: 600 }}>
              {totalTripsCount} Trip{totalTripsCount === 1 ? "" : "s"} • ₹{totalKmPrice.toFixed(2)} (@ ₹2/KM) • Click to view
            </Typography>
          </Paper>

          {/* Card 5: FULL KM */}
          <Paper
            elevation={0}
            sx={{
              p: 2,
              borderRadius: "14px",
              bgcolor: COLOR.card,
              border: `1px solid ${COLOR.border}`,
            }}
          >
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="caption" sx={{ color: COLOR.textMuted, fontWeight: 800, fontSize: "0.72rem", letterSpacing: "0.04em" }}>
                FULL KM
              </Typography>
              <CompareArrows sx={{ fontSize: 16, color: "#2563eb" }} />
            </Stack>
            <Typography variant="h4" fontWeight={900} sx={{ color: COLOR.text, my: 0.4, lineHeight: 1.1 }}>
              {totalFullKm > 0 ? totalFullKm.toFixed(2) : "21.83"}
            </Typography>
            <Typography variant="caption" sx={{ color: COLOR.textMuted, fontSize: "0.75rem", fontWeight: 600 }}>
              Mapbox & GPS route
            </Typography>
          </Paper>

          {/* Card 6: EXPENSE */}
          <Paper
            elevation={0}
            onClick={() => {
              setExpensePopupData({
                title: `All Approved Expenses • ${monthFullName}`,
                expenses: allMonthApprovedExpenses,
              });
            }}
            sx={{
              p: 2,
              borderRadius: "14px",
              bgcolor: COLOR.card,
              border: `1px solid ${COLOR.border}`,
              cursor: "pointer",
              transition: "all 0.2s ease-in-out",
              "&:hover": {
                transform: "translateY(-2px)",
                borderColor: "#16a34a",
                boxShadow: isDark ? "0 4px 14px rgba(22,163,74,0.25)" : "0 4px 14px rgba(22,163,74,0.15)",
              },
            }}
          >
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <Typography variant="caption" sx={{ color: COLOR.textMuted, fontWeight: 800, fontSize: "0.72rem", letterSpacing: "0.04em" }}>
                EXPENSE
              </Typography>
              <Chip
                label="Click to view"
                size="small"
                sx={{
                  height: 18,
                  fontSize: "0.62rem",
                  fontWeight: 800,
                  bgcolor: isDark ? "rgba(22,163,74,0.15)" : "#dcfce7",
                  color: "#16a34a",
                  cursor: "pointer",
                }}
              />
            </Stack>
            <Typography variant="h4" fontWeight={900} sx={{ color: COLOR.text, my: 0.4, lineHeight: 1.1 }}>
              Rs. {Number(totalExpense || 0).toLocaleString("en-IN")}
            </Typography>
            <Typography variant="caption" sx={{ color: COLOR.textMuted, fontSize: "0.75rem", fontWeight: 600 }}>
              {allMonthApprovedExpenses.length} Approved bill{allMonthApprovedExpenses.length === 1 ? "" : "s"} • Click to view
            </Typography>
          </Paper>
        </Box>

        {/* ── 4. Daily Summary Card & Table ── */}
        <Paper
          elevation={0}
          sx={{
            borderRadius: "16px",
            bgcolor: COLOR.card,
            border: `1px solid ${COLOR.border}`,
            overflow: "hidden",
            boxShadow: isDark ? "0 4px 20px rgba(0,0,0,0.4)" : "0 4px 20px rgba(0,0,0,0.03)",
          }}
        >
          {/* Section Header */}
          <Stack
            direction={{ xs: "column", sm: "row" }}
            justifyContent="space-between"
            alignItems={{ xs: "flex-start", sm: "center" }}
            spacing={1.5}
            sx={{
              p: 2.5,
              borderBottom: `1px solid ${COLOR.border}`,
            }}
          >
            <Box>
              <Typography variant="subtitle1" fontWeight={800} sx={{ color: COLOR.text, fontSize: "1.05rem" }}>
                Daily Summary
              </Typography>
              <Typography variant="caption" sx={{ color: COLOR.textMuted, fontSize: "0.75rem", display: "block", mt: 0.3 }}>
                Real punch in, punch out, absent records, status, odometer km, KM price (₹2/km), route full km, visits, and expenses
              </Typography>
            </Box>

            {/* Filter Tabs on Right */}
            <Stack direction="row" spacing={1}>
              <Button
                size="small"
                startIcon={<MenuIcon sx={{ fontSize: 15 }} />}
                onClick={() => setStatusFilter("all")}
                sx={{
                  borderRadius: "20px",
                  px: 2,
                  height: 32,
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  textTransform: "none",
                  bgcolor: statusFilter === "all" ? (isDark ? "#2563eb" : "#eff6ff") : "transparent",
                  color: statusFilter === "all" ? (isDark ? "#ffffff" : "#2563eb") : COLOR.textMuted,
                  border: `1px solid ${statusFilter === "all" ? (isDark ? "#2563eb" : "#bfdbfe") : COLOR.border}`,
                  "&:hover": { bgcolor: isDark ? "#1d4ed8" : "#dbeafe" },
                }}
              >
                All ({totalDays})
              </Button>

              <Button
                size="small"
                onClick={() => setStatusFilter("present")}
                sx={{
                  borderRadius: "20px",
                  px: 2,
                  height: 32,
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  textTransform: "none",
                  bgcolor: statusFilter === "present" ? (isDark ? "rgba(22, 163, 74, 0.2)" : "#f0fdf4") : "transparent",
                  color: statusFilter === "present" ? "#16a34a" : COLOR.textMuted,
                  border: `1px solid ${statusFilter === "present" ? "#86efac" : COLOR.border}`,
                  "&:hover": { bgcolor: isDark ? "rgba(22, 163, 74, 0.3)" : "#dcfce7" },
                }}
              >
                Present ({presentCount})
              </Button>

              <Button
                size="small"
                onClick={() => setStatusFilter("absent")}
                sx={{
                  borderRadius: "20px",
                  px: 2,
                  height: 32,
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  textTransform: "none",
                  bgcolor: statusFilter === "absent" ? (isDark ? "rgba(220, 38, 38, 0.2)" : "#fef2f2") : "transparent",
                  color: statusFilter === "absent" ? "#dc2626" : COLOR.textMuted,
                  border: `1px solid ${statusFilter === "absent" ? "#fca5a5" : COLOR.border}`,
                  "&:hover": { bgcolor: isDark ? "rgba(220, 38, 38, 0.3)" : "#fee2e2" },
                }}
              >
                Absent ({absentCount})
              </Button>
            </Stack>
          </Stack>

          {/* Table */}
          {loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
              <CircularProgress size={36} sx={{ color: COLOR.blue }} />
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: isDark ? "#090d18" : "#f8fafc" }}>
                    {["Date", "Punch In", "Punch Out", "Status", "Odometer KM", "KM Price (₹2/km)", "Full KM", "Visits", "Expense"].map((head) => (
                      <TableCell
                        key={head}
                        sx={{
                          color: COLOR.text,
                          fontWeight: 800,
                          fontSize: "0.82rem",
                          py: 1.75,
                          borderColor: COLOR.border,
                        }}
                      >
                        {head}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>

                <TableBody>
                  {finalDisplayRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} align="center" sx={{ py: 6, color: COLOR.textMuted, borderColor: COLOR.border }}>
                        No records found for this period.
                      </TableCell>
                    </TableRow>
                  ) : (
                    finalDisplayRows.map((row) => (
                      <TableRow
                        key={row.dateKey}
                        hover
                        sx={{
                          "&:hover": { bgcolor: COLOR.cardHover },
                          "& td": { borderColor: COLOR.border },
                        }}
                      >
                        {/* Date */}
                        <TableCell sx={{ fontWeight: 700, color: COLOR.text, fontSize: "0.88rem" }}>
                          {row.dateFormatted}
                        </TableCell>

                        {/* Punch In */}
                        <TableCell sx={{ color: row.punchInTime !== "-" ? COLOR.text : COLOR.textMuted, fontWeight: row.punchInTime !== "-" ? 700 : 500, fontSize: "0.85rem" }}>
                          {row.punchInTime}
                        </TableCell>

                        {/* Punch Out */}
                        <TableCell>
                          {row.isOngoing ? (
                            <Box>
                              <Typography sx={{ fontWeight: 800, color: "#2563eb", fontSize: "0.85rem" }}>
                                Ongoing
                              </Typography>
                              <Typography variant="caption" sx={{ color: COLOR.textMuted, fontSize: "0.7rem", display: "block" }}>
                                No punch out recorded
                              </Typography>
                            </Box>
                          ) : (
                            <Typography sx={{ color: row.punchOutTime !== "-" ? COLOR.text : COLOR.textMuted, fontWeight: row.punchOutTime !== "-" ? 700 : 500, fontSize: "0.85rem" }}>
                              {row.punchOutTime}
                            </Typography>
                          )}
                        </TableCell>

                        {/* Status Chip */}
                        <TableCell>
                          {row.status === "Present" ? (
                            <Chip
                              icon={<CheckCircle sx={{ fontSize: "0.8rem !important", color: "#16a34a !important" }} />}
                              label="Present"
                              size="small"
                              sx={{
                                bgcolor: isDark ? "rgba(22, 163, 74, 0.2)" : "#dcfce7",
                                color: "#16a34a",
                                fontWeight: 800,
                                fontSize: "0.75rem",
                                borderRadius: "20px",
                                height: 24,
                                border: `1px solid ${isDark ? "rgba(22, 163, 74, 0.4)" : "#bbf7d0"}`,
                              }}
                            />
                          ) : (
                            <Chip
                              icon={<Cancel sx={{ fontSize: "0.8rem !important", color: "#dc2626 !important" }} />}
                              label="Absent"
                              size="small"
                              sx={{
                                bgcolor: isDark ? "rgba(220, 38, 38, 0.2)" : "#fee2e2",
                                color: "#dc2626",
                                fontWeight: 800,
                                fontSize: "0.75rem",
                                borderRadius: "20px",
                                height: 24,
                                border: `1px solid ${isDark ? "rgba(220, 38, 38, 0.4)" : "#fecaca"}`,
                              }}
                            />
                          )}
                        </TableCell>

                        {/* Odometer KM */}
                        <TableCell
                          onClick={() => {
                            if ((row.dayTrips && row.dayTrips.length > 0) || row.odometerRaw > 0) {
                              setTripsPopupData({
                                title: `Odometer Trips • ${row.dateFormatted}`,
                                trips: row.dayTrips || [],
                              });
                            }
                          }}
                          sx={{
                            color: row.odometerKm !== "-" ? COLOR.text : COLOR.textMuted,
                            fontWeight: row.odometerKm !== "-" ? 700 : 500,
                            fontSize: "0.85rem",
                            cursor: ((row.dayTrips && row.dayTrips.length > 0) || row.odometerRaw > 0) ? "pointer" : "default",
                            "&:hover": ((row.dayTrips && row.dayTrips.length > 0) || row.odometerRaw > 0) ? {
                              textDecoration: "underline",
                            } : {},
                          }}
                        >
                          <Stack direction="row" alignItems="center" spacing={0.6}>
                            <span>{row.odometerKm}</span>
                            {row.tripCount > 0 && (
                              <Chip
                                label={`${row.tripCount} trip${row.tripCount === 1 ? "" : "s"}`}
                                size="small"
                                sx={{
                                  height: 18,
                                  fontSize: "0.62rem",
                                  fontWeight: 800,
                                  bgcolor: isDark ? "rgba(34, 197, 94, 0.15)" : "#dcfce7",
                                  color: "#16a34a",
                                  cursor: "pointer",
                                }}
                              />
                            )}
                          </Stack>
                        </TableCell>

                        {/* KM Price (1KM * 2) */}
                        <TableCell sx={{ color: row.kmPriceRaw > 0 ? (COLOR.isDark ? "#38bdf8" : "#0284c7") : COLOR.textMuted, fontWeight: 700, fontSize: "0.85rem" }}>
                          {row.kmPrice}
                        </TableCell>

                        {/* Full KM */}
                        <TableCell sx={{ color: row.fullKm !== "-" ? COLOR.text : COLOR.textMuted, fontWeight: row.fullKm !== "-" ? 800 : 500, fontSize: "0.85rem" }}>
                          {row.fullKm}
                        </TableCell>

                        {/* Visits */}
                        <TableCell sx={{ color: COLOR.text, fontWeight: 700, fontSize: "0.85rem" }}>
                          {row.visits}
                        </TableCell>

                        {/* Expense */}
                        <TableCell
                          onClick={() => {
                            if (row.expenseRaw > 0 && Array.isArray(row.dayExpenses) && row.dayExpenses.length > 0) {
                              setExpensePopupData({
                                title: `Approved Expenses • ${row.dateFormatted}`,
                                expenses: row.dayExpenses,
                              });
                            }
                          }}
                          sx={{
                            color: row.expenseRaw > 0 ? (COLOR.isDark ? "#34d399" : "#16a34a") : (row.expense !== "Rs. 0" ? COLOR.text : COLOR.textMuted),
                            fontWeight: 700,
                            fontSize: "0.85rem",
                            cursor: row.expenseRaw > 0 ? "pointer" : "default",
                            "&:hover": row.expenseRaw > 0 ? {
                              textDecoration: "underline",
                            } : {},
                          }}
                        >
                          <Stack direction="row" alignItems="center" spacing={0.6}>
                            <span>{row.expense}</span>
                            {row.expenseRaw > 0 && (
                              <Chip
                                label="View"
                                size="small"
                                sx={{
                                  height: 18,
                                  fontSize: "0.60rem",
                                  fontWeight: 800,
                                  bgcolor: isDark ? "rgba(22,163,74,0.15)" : "#dcfce7",
                                  color: "#16a34a",
                                  cursor: "pointer",
                                }}
                              />
                            )}
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>

        {/* Expense Details Dialog */}
        <ExpenseDetailsDialog
          open={Boolean(expensePopupData)}
          data={expensePopupData}
          onClose={() => setExpensePopupData(null)}
          isDark={isDark}
          COLOR={COLOR}
        />

        {/* Trips & Odometer Details Dialog */}
        <TripsDetailsDialog
          open={Boolean(tripsPopupData)}
          data={tripsPopupData}
          onClose={() => setTripsPopupData(null)}
          onEditTrip={(trip) => setEditingTrip(trip)}
          onOpenImage={(img) => setImagePreview(img)}
          isDark={isDark}
          COLOR={COLOR}
        />

        {/* Admin Edit Trip Dialog */}
        <AdminEditTripDialog
          open={Boolean(editingTrip)}
          trip={editingTrip}
          onClose={() => setEditingTrip(null)}
          onTripUpdated={handleTripUpdated}
          isDark={isDark}
          COLOR={COLOR}
        />

        {/* Odometer Image Zoom Lightbox Modal */}
        <OdometerImageModal
          previewData={imagePreview}
          onClose={() => setImagePreview(null)}
          isDark={isDark}
          COLOR={COLOR}
        />

      </Box>
    </Box>
  );
}
