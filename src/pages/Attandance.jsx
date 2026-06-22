// pages/Attendance.jsx  (handles both own view and admin /attendance/:userId view)
import React, {
  useState, useEffect, useCallback, useMemo, useRef,
} from "react";
import {
  Box, Grid, Paper, Typography, Chip, IconButton, Stack,
  Card, CardContent, Button, useTheme, useMediaQuery,
  Skeleton, Dialog, Slide, Alert, Snackbar, TextField,
  MenuItem, FormControl, InputLabel, Select, Pagination,
  Fade, Zoom, Badge, DialogTitle, DialogContent,
  CircularProgress, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Fab,
  SwipeableDrawer, BottomNavigation, BottomNavigationAction,
  InputAdornment, DialogActions, Tooltip, alpha,
  Menu, ListItemIcon, ListItemText, Divider, Avatar,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import {
  CalendarToday, ChevronLeft, ChevronRight, AccessTime,
  Person, CheckCircle, Warning, Error as ErrorIcon,
  History, Login, Logout, LocationOn, Close,
  Dashboard, ExpandMore, Search, FilterAlt, Clear,
  Refresh, GpsFixed, GpsNotFixed, Timer, PlayArrow, Home,
  Business, MyLocation, FileDownload, Print, ContentCopy,
  ArrowBack, Phone, Email,
} from "@mui/icons-material";
import axios from "axios";
import { useAuth } from "../contexts/AuthContext";
import { useAttendance } from "../hooks/useAttendance";
import { useGeo } from "../hooks/useGeo";
import AttendanceDetails, {
  generateCSV, generateJSON, downloadFile, printRecord,
} from "./AttendanceDetails";
import { format, differenceInSeconds } from "date-fns";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import {
  startTracking,
  stopTracking,
  isCurrentlyTracking,
  simulateTrackingMovement,
} from "../utils/Locationtracker";
import { useSocket } from "../utils/Usesocket.js";

// ─── Constants ────────────────────────────────────────────────────────────────
const API       = "http://localhost:9001";
const PRIMARY   = "#0f1f3d";
const SECONDARY = "#1a237e";
const SUCCESS   = "#22c55e";
const DANGER    = "#ef4444";
const WARNING   = "#f59e0b";

const MANAGER_ROLES = ["Admin_panel", "ZSM", "Incharge"];

// Office start time for "late" detection (9:00 AM)
const OFFICE_START_HOUR   = 9;
const OFFICE_START_MINUTE = 0;

const PERIOD_OPTIONS = [
  { value: "Today",      label: "Today"      },
  { value: "This Week",  label: "This Week"  },
  { value: "This Month", label: "This Month" },
  { value: "All",        label: "All Time"   },
];

const STATUS_CONFIG = {
  present: { bg: alpha(SUCCESS,    0.1), color: SUCCESS,    icon: <CheckCircle   sx={{ fontSize: 14 }} />, label: "Present" },
  absent:  { bg: alpha(DANGER,     0.1), color: DANGER,     icon: <ErrorIcon     sx={{ fontSize: 14 }} />, label: "Absent"  },
  late:    { bg: alpha(WARNING,    0.1), color: WARNING,     icon: <Warning       sx={{ fontSize: 14 }} />, label: "Late"    },
  leave:   { bg: alpha("#a855f7",  0.1), color: "#a855f7",  icon: <Person        sx={{ fontSize: 14 }} />, label: "Leave"   },
  holiday: { bg: alpha("#3b82f6",  0.1), color: "#3b82f6",  icon: <CalendarToday sx={{ fontSize: 14 }} />, label: "Holiday" },
};
const MissedPunchOutChip = () => (
  <Tooltip title="User did not punch out this day" arrow>
    <Chip
      size="small"
      icon={<Warning sx={{ fontSize: 12, color: `${WARNING} !important` }} />}
      label="Missed Punch-Out"
      sx={{
        bgcolor: alpha(WARNING, 0.1),
        color: WARNING,
        fontWeight: 700,
        fontSize: "0.65rem",
        height: 20,
        border: `1px solid ${alpha(WARNING, 0.3)}`,
      }}
    />
  </Tooltip>
);

const AutoPunchOutChip = () => (
  <Tooltip title="Auto punched out by system after 12 hours" arrow>
    <Chip
      size="small"
      label="Auto"
      sx={{
        bgcolor: alpha(WARNING, 0.1),
        color: WARNING,
        fontWeight: 700,
        fontSize: "0.62rem",
        height: 18,
        ml: 0.5,
      }}
    />
  </Tooltip>
)

const OffDayWorkChip = ({ entry }) => {
  if (!entry?.workedOnNonWorkingDay) return null;
  const type = entry.scheduledStatus === "leave" ? "Leave" : "Holiday";

  return (
    <Tooltip
      title={`Punch, travel, or visit activity was recorded during scheduled ${type.toLowerCase()} time`}
      arrow
    >
      <Chip
        size="small"
        icon={<Warning sx={{ fontSize: 12, color: `${DANGER} !important` }} />}
        label={`Worked on ${type}`}
        sx={{
          bgcolor: alpha(DANGER, 0.08),
          color: DANGER,
          border: `1px solid ${alpha(DANGER, 0.28)}`,
          fontWeight: 800,
          fontSize: "0.64rem",
          height: 21,
        }}
      />
    </Tooltip>
  );
};
// ─── Helper: decode creation date from MongoDB ObjectId ──────────────────────
const getJoinDateFromObjectId = (objectId) => {
  try {
    const id = String(objectId || "").trim();
    if (id.length < 8) return null;
    const ts = parseInt(id.substring(0, 8), 16) * 1000;
    if (isNaN(ts) || ts < 946684800000) return null; // sanity: after year 2000
    const d = new Date(ts);
    d.setHours(0, 0, 0, 0);
    return d;
  } catch {
    return null;
  }
};

// ─── Helper: resolve calendar status for a day ───────────────────────────────
const resolveCalendarStatus = (dateMs, att, todayMs, joinDateMs) => {
  const d          = new Date(dateMs);
  const isSunday   = d.getDay() === 0;
  const isPast     = dateMs < todayMs;
  const isFuture   = dateMs > todayMs;
  const isBeforeJoin = dateMs < joinDateMs;

  if (att) return att.status || "present";
  if (isSunday) return "holiday";
  if (isFuture || isBeforeJoin) return undefined;
  if (isPast) return "absent";
  return undefined;
};

// ─── useWorkTimer ─────────────────────────────────────────────────────────────
function useWorkTimer() {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [startTime, setStartTime]           = useState(null);
  const [isActive, setIsActive]             = useState(false);
  const timerRef = useRef(null);
  const pad        = (n) => String(n).padStart(2, "0");
  const formatTime = useCallback(
    (s) => `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`, [],
  );
  const start = useCallback((ts = new Date()) => { setStartTime(ts); setIsActive(true); }, []);
  const stop  = useCallback(() => {
    setIsActive(false);
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }, []);
  const reset = useCallback(() => {
    setElapsedSeconds(0); setStartTime(null); setIsActive(false);
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }, []);
  useEffect(() => {
    if (isActive && startTime) {
      timerRef.current = setInterval(
        () => setElapsedSeconds(differenceInSeconds(new Date(), new Date(startTime))), 1000,
      );
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isActive, startTime]);
  return { elapsedSeconds, formattedTime: formatTime(elapsedSeconds), isActive, start, stop, reset };
}

// ─── Styled ───────────────────────────────────────────────────────────────────
const GlassCard = styled(Card)(() => ({
  background: "rgba(255,255,255,0.96)",
  backdropFilter: "blur(18px)",
  border: `1px solid ${alpha(PRIMARY, 0.1)}`,
  boxShadow: "0 18px 45px rgba(15,23,42,0.08)",
  borderRadius: 24,
  overflow: "hidden",
}));

const PulsingDot = styled(Box)(({ dotcolor }) => ({
  width: 9, height: 9, borderRadius: "50%",
  backgroundColor: dotcolor, flexShrink: 0,
  animation: "pulseAnim 2s ease-in-out infinite",
  "@keyframes pulseAnim": {
    "0%, 100%": { boxShadow: `0 0 0 0px ${dotcolor}55` },
    "50%":       { boxShadow: `0 0 0 6px ${dotcolor}00` },
  },
}));

const TimerDisplay = styled(Box)(({ theme, isrunning }) => ({
  background: `linear-gradient(135deg, ${alpha(PRIMARY, 0.1)} 0%, ${alpha(SECONDARY, 0.1)} 100%)`,
  borderRadius: 16, padding: theme.spacing(2, 3),
  border: `1px solid ${alpha(isrunning === "true" ? SUCCESS : PRIMARY, 0.2)}`,
  boxShadow: `0 4px 12px ${alpha(isrunning === "true" ? SUCCESS : PRIMARY, 0.1)}`,
}));

// ─── StatusBadge ──────────────────────────────────────────────────────────────
const StatusBadge = ({ status, size = "small" }) => {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.present;
  return (
    <Chip size={size} label={cfg.label} icon={cfg.icon}
      sx={{
        bgcolor: cfg.bg,
        color: cfg.color,
        fontWeight: 800,
        border: `1px solid ${alpha(cfg.color, 0.22)}`,
        borderRadius: "999px",
        "& .MuiChip-icon": { color: cfg.color },
      }}
    />
  );
};

// ─── StatCard ─────────────────────────────────────────────────────────────────
const StatCard = ({ icon: Icon, label, value, color = PRIMARY, sub, loading, index }) => (
  <Fade in timeout={300 + index * 80}>
    <Paper elevation={0} sx={{ p: { xs: 1.5, sm: 2, md: 2.5 }, borderRadius: 3, height: "100%", border: `1px solid ${alpha(color, 0.12)}`, background: `linear-gradient(140deg, #fff 55%, ${alpha(color, 0.05)})`, transition: "transform .2s, box-shadow .2s", "&:hover": { transform: "translateY(-3px)", boxShadow: `0 8px 24px ${alpha(color, 0.14)}` } }}>
      {loading ? (
        <Skeleton variant="rectangular" height={80} sx={{ borderRadius: 2 }} />
      ) : (
        <Stack spacing={1}>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
            <Box sx={{ width: { xs: 34, sm: 42 }, height: { xs: 34, sm: 42 }, borderRadius: 2, bgcolor: alpha(color, 0.1), display: "flex", alignItems: "center", justifyContent: "center", color }}>
              <Icon sx={{ fontSize: { xs: 18, sm: 22 } }} />
            </Box>
            <Typography variant="h5" fontWeight={800} color={color} sx={{ fontSize: { xs: "1.2rem", sm: "1.6rem" } }}>{value}</Typography>
          </Stack>
          <Box>
            <Typography variant="body2" fontWeight={700} sx={{ fontSize: { xs: "0.72rem", sm: "0.82rem" } }}>{label}</Typography>
            {sub && <Typography variant="caption" color="text.secondary">{sub}</Typography>}
          </Box>
        </Stack>
      )}
    </Paper>
  </Fade>
);

// ─── CalCell ──────────────────────────────────────────────────────────────────
const CalCell = ({ day, isSelected, isToday, isWeekend, status, onClick, isPrev }) => {
  const cfg = STATUS_CONFIG[status];

  const statusBg = {
    present: "#dcfce7",
    late:    "#fef9c3",
    absent:  "#fecaca",
    leave:   "#f3e8ff",
    holiday: "#dbeafe",
  };
  const statusDot = {
    present: SUCCESS,
    late:    WARNING,
    absent:  DANGER,
    leave:   "#a855f7",
    holiday: "#3b82f6",
  };
  const selectedBg = status ? statusBg[status] || alpha(cfg?.color, 0.16) : PRIMARY;
  const selectedColor = status ? (statusDot[status] || cfg?.color || PRIMARY) : "#fff";

  return (
    <Box
      onClick={onClick}
      sx={{
        height: { xs: 36, sm: 44 },
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: "16px",
        cursor: isPrev ? "default" : "pointer",
        fontSize: { xs: "0.7rem", sm: "0.8rem" },
        fontWeight: 800,
        transition: "all .18s ease",
        opacity: isPrev ? 0.2 : 1,
        userSelect: "none",
        position: "relative",
        bgcolor: isSelected
          ? selectedBg
          : isToday
          ? alpha(PRIMARY, 0.12)
          : status
          ? statusBg[status] || alpha(cfg?.color, 0.12)
          : "transparent",
        color: isSelected
          ? selectedColor
          : isToday
          ? PRIMARY
          : status
          ? cfg?.color
          : isWeekend
          ? alpha("#000", 0.3)
          : "text.primary",
        border: isSelected && status
          ? `2px solid ${statusDot[status] || cfg?.color || PRIMARY}`
          : isToday && !isSelected
          ? `2px solid ${PRIMARY}`
          : status && !isSelected
          ? `1.5px solid ${alpha(statusDot[status] || cfg?.color || PRIMARY, 0.35)}`
          : "2px solid transparent",
        boxShadow: isSelected
          ? `0 10px 22px ${alpha(statusDot[status] || PRIMARY, 0.18)}`
          : "none",
        "&:hover": !isPrev
          ? {
              bgcolor: isSelected ? selectedBg : alpha(PRIMARY, 0.1),
              transform: "translateY(-2px)",
              boxShadow: `0 8px 18px ${alpha(PRIMARY, 0.12)}`,
            }
          : {},
      }}
    >
      {day}
      {status && (
        <Box sx={{
          position: "absolute", bottom: 3,
          width: 5, height: 5, borderRadius: "50%",
          bgcolor: statusDot[status] || cfg?.color,
        }} />
      )}
    </Box>
  );
};

// ─── LiveTimer ────────────────────────────────────────────────────────────────
const LiveTimer = ({ startTime, isRunning }) => {
  const [now, setNow] = useState(new Date());
  const ref = useRef(null);
  useEffect(() => {
    if (isRunning) ref.current = setInterval(() => setNow(new Date()), 1000);
    return () => { if (ref.current) clearInterval(ref.current); };
  }, [isRunning]);
  if (!startTime || !isRunning) return null;
  const ms = now - new Date(startTime);
  const p  = (n) => String(n).padStart(2, "0");
  const f  = `${p(Math.floor(ms / 3600000))}:${p(Math.floor((ms % 3600000) / 60000))}:${p(Math.floor((ms % 60000) / 1000))}`;
  return (
    <TimerDisplay isrunning="true">
      <Stack direction="row" spacing={2} alignItems="center">
        <Box sx={{ width: 40, height: 40, borderRadius: "50%", bgcolor: alpha(SUCCESS, 0.15), display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Timer sx={{ color: SUCCESS }} />
        </Box>
        <Box>
          <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.85)", fontWeight: 700 }}>Current Session Duration</Typography>
          <Typography variant="h4" fontWeight={800} color={SUCCESS}>{f}</Typography>
        </Box>
        <Box sx={{ flex: 1, textAlign: "right" }}>
          <Chip icon={<PlayArrow />} label="LIVE" size="small" sx={{ bgcolor: alpha(SUCCESS, 0.15), color: SUCCESS, fontWeight: 700, animation: "pulse 1.5s infinite", "@keyframes pulse": { "0%, 100%": { opacity: 1 }, "50%": { opacity: 0.5 } } }} />
        </Box>
      </Stack>
    </TimerDisplay>
  );
};

// ─── LocationPermissionDialog ─────────────────────────────────────────────────
const LocationPermissionDialog = ({ open, mode, onAllow, onDeny, requesting }) => {
  const isPunchIn   = mode === "in";
  const accentColor = isPunchIn ? SUCCESS : DANGER;
  const isMobile    = useMediaQuery("(max-width:600px)");
  return (
    <Dialog open={open} maxWidth="xs" fullWidth fullScreen={isMobile} TransitionComponent={isMobile ? Slide : Zoom} TransitionProps={isMobile ? { direction: "up" } : {}} PaperProps={{ sx: { borderRadius: isMobile ? 0 : 4, overflow: "hidden" } }}>
      <Box sx={{ height: 5, background: `linear-gradient(90deg, ${PRIMARY}, ${accentColor})` }} />
      <DialogContent sx={{ pt: 4, pb: 2, px: 3, textAlign: "center" }}>
        <Box sx={{ width: 80, height: 80, borderRadius: "50%", bgcolor: alpha(accentColor, 0.1), display: "flex", alignItems: "center", justifyContent: "center", mx: "auto", mb: 2.5, border: `2px solid ${alpha(accentColor, 0.25)}` }}>
          {requesting ? <CircularProgress size={36} sx={{ color: accentColor }} /> : <MyLocation sx={{ fontSize: 36, color: accentColor }} />}
        </Box>
        <Typography variant="h6" fontWeight={800} gutterBottom>{requesting ? "Getting your location…" : "Allow Location Access"}</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
          {requesting ? "Please wait while we detect your current location." : `To ${isPunchIn ? "punch in" : "punch out"}, we need your current location to verify attendance.`}
        </Typography>
        {!requesting && (
          <Box sx={{ mt: 2.5, p: 1.5, borderRadius: 2, bgcolor: alpha(PRIMARY, 0.04), border: `1px solid ${alpha(PRIMARY, 0.1)}` }}>
            <Stack direction="row" spacing={1} alignItems="center" justifyContent="center">
              <LocationOn sx={{ fontSize: 16, color: PRIMARY }} />
              <Typography variant="caption" color="primary" fontWeight={600}>GPS location required for attendance verification</Typography>
            </Stack>
          </Box>
        )}
      </DialogContent>
      {!requesting && (
        <DialogActions sx={{ px: 3, pb: 3, gap: 1.5, flexDirection: { xs: "column", sm: "row" } }}>
          <Button fullWidth={isMobile} variant="outlined" onClick={onDeny} sx={{ borderRadius: 2.5, borderColor: alpha(PRIMARY, 0.35), color: "text.secondary", order: isMobile ? 2 : 1 }}>Cancel</Button>
          <Button fullWidth={isMobile} variant="contained" onClick={onAllow} startIcon={<GpsFixed />} sx={{ borderRadius: 2.5, fontWeight: 700, bgcolor: accentColor, order: isMobile ? 1 : 2, "&:hover": { bgcolor: isPunchIn ? "#16a34a" : "#dc2626" } }}>Allow Location</Button>
        </DialogActions>
      )}
    </Dialog>
  );
};

// ─── PunchModal ───────────────────────────────────────────────────────────────
const PunchModal = ({ open, mode, onClose, onConfirm, punchLoading, geo, timer }) => {
  const theme       = useTheme();
  const isMobile    = useMediaQuery(theme.breakpoints.down("sm"));
  const isPunchIn   = mode === "in";
  const accentColor = isPunchIn ? SUCCESS : DANGER;
  const hasCoords   = geo.latitude != null && geo.longitude != null;
  const [tick, setTick]                       = useState(new Date());
  const [showFullAddress, setShowFullAddress] = useState(false);
  useEffect(() => {
    if (!open) return;
    const t = setInterval(() => setTick(new Date()), 1000);
    return () => clearInterval(t);
  }, [open]);
  const showTimer = !isPunchIn && timer?.isActive && timer?.formattedTime;
  return (
    <Dialog open={open} onClose={punchLoading ? undefined : onClose} maxWidth="xs" fullWidth fullScreen={isMobile} TransitionComponent={isMobile ? Slide : Zoom} TransitionProps={isMobile ? { direction: "up" } : {}} PaperProps={{ sx: { borderRadius: isMobile ? 0 : 4, overflow: "hidden" } }}>
      <Box sx={{ height: 5, background: `linear-gradient(90deg, ${PRIMARY}, ${accentColor})` }} />
      <DialogTitle sx={{ pb: 1, pt: 2.5, px: { xs: 2, sm: 3 }, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Box sx={{ width: 46, height: 46, borderRadius: "50%", bgcolor: alpha(accentColor, 0.12), display: "flex", alignItems: "center", justifyContent: "center" }}>
            {isPunchIn ? <Login sx={{ color: accentColor, fontSize: 24 }} /> : <Logout sx={{ color: accentColor, fontSize: 24 }} />}
          </Box>
          <Box>
            <Typography variant="h6" fontWeight={800} lineHeight={1.2}>{isPunchIn ? "Punch In" : "Punch Out"}</Typography>
            <Typography variant="caption" color="text.secondary">{format(tick, "EEEE, dd MMM yyyy")}</Typography>
          </Box>
        </Stack>
        <IconButton onClick={onClose} disabled={punchLoading} size="small" sx={{ bgcolor: alpha("#000", 0.05) }}><Close fontSize="small" /></IconButton>
      </DialogTitle>
      <DialogContent sx={{ px: { xs: 2, sm: 3 }, pt: 1.5, pb: 2 }}>
        <Stack spacing={2.5}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: 3, textAlign: "center", background: `linear-gradient(135deg, ${alpha(accentColor, 0.07)}, ${alpha(PRIMARY, 0.04)})`, border: `1px solid ${alpha(accentColor, 0.15)}` }}>
            <Typography variant="h2" fontWeight={900} lineHeight={1} sx={{ color: accentColor, fontSize: { xs: "2.8rem", sm: "3.5rem" }, letterSpacing: -2 }}>
              {format(tick, "hh:mm")}
              <Typography component="span" variant="h5" fontWeight={600} color="text.secondary" sx={{ ml: 0.75, letterSpacing: 0 }}>{format(tick, "ss")}</Typography>
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{format(tick, "a")} · Current Time</Typography>
          </Paper>
          {showTimer && (
            <Paper elevation={0} sx={{ p: 2, borderRadius: 2.5, bgcolor: alpha(SUCCESS, 0.08), border: `1px solid ${alpha(SUCCESS, 0.2)}` }}>
              <Stack direction="row" spacing={2} alignItems="center">
                <Box sx={{ width: 36, height: 36, borderRadius: "50%", bgcolor: alpha(SUCCESS, 0.15), display: "flex", alignItems: "center", justifyContent: "center" }}><Timer sx={{ color: SUCCESS, fontSize: 20 }} /></Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Current Session</Typography>
                  <Typography variant="h5" fontWeight={800} color={SUCCESS}>{timer.formattedTime}</Typography>
                </Box>
                <Chip size="small" label="LIVE" sx={{ bgcolor: alpha(SUCCESS, 0.2), color: SUCCESS, fontWeight: 700, ml: "auto" }} />
              </Stack>
            </Paper>
          )}
          <Paper elevation={0} sx={{ p: 2, borderRadius: 2.5, border: `1px solid ${alpha(geo.loading ? PRIMARY : geo.error ? DANGER : hasCoords ? SUCCESS : "#000", 0.25)}`, bgcolor: alpha(geo.loading ? PRIMARY : geo.error ? DANGER : hasCoords ? SUCCESS : "#000", 0.04) }}>
            <Stack direction="row" spacing={1.5} alignItems="flex-start">
              <Box sx={{ width: 38, height: 38, borderRadius: "50%", flexShrink: 0, bgcolor: alpha(geo.loading ? PRIMARY : geo.error ? DANGER : hasCoords ? SUCCESS : "#000", 0.1), display: "flex", alignItems: "center", justifyContent: "center" }}>
                {geo.loading ? <CircularProgress size={18} sx={{ color: PRIMARY }} /> : geo.error ? <GpsNotFixed sx={{ fontSize: 18, color: DANGER }} /> : hasCoords ? <GpsFixed sx={{ fontSize: 18, color: SUCCESS }} /> : <LocationOn sx={{ fontSize: 18, color: "text.secondary" }} />}
              </Box>
              <Box flex={1} minWidth={0}>
                <Typography variant="body2" fontWeight={700}>{geo.loading ? "Detecting your location…" : geo.error ? "Location unavailable" : hasCoords ? geo.address?.short || "Location acquired" : "Location not fetched"}</Typography>
                {geo.address?.full && (
                  <Box sx={{ mt: 0.5 }}>
                    <Stack direction="row" spacing={0.5} alignItems="center" sx={{ cursor: "pointer" }} onClick={() => setShowFullAddress((v) => !v)}>
                      <Home sx={{ fontSize: 14, color: "text.secondary" }} />
                      <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.3, ...(!showFullAddress && { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "200px" }) }}>
                        {showFullAddress ? geo.address.full : geo.address.full.split(",")[0]}
                      </Typography>
                      <ExpandMore sx={{ fontSize: 14, color: "text.secondary", transform: showFullAddress ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
                    </Stack>
                    {showFullAddress && geo.address.city && (
                      <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 0.5, ml: 2.5 }}>
                        <Business sx={{ fontSize: 12, color: "text.disabled" }} />
                        <Typography variant="caption" color="text.disabled">{[geo.address.city, geo.address.state, geo.address.country].filter(Boolean).join(", ")}</Typography>
                      </Stack>
                    )}
                  </Box>
                )}
                {hasCoords && !geo.error && !geo.address && <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>📍 {geo.latitude.toFixed(5)}, {geo.longitude.toFixed(5)}{geo.accuracy && ` (±${Math.round(geo.accuracy)}m)`}</Typography>}
                {geo.error && <Typography variant="caption" color="error" sx={{ display: "block", lineHeight: 1.3, mt: 0.25 }}>{geo.error}</Typography>}
              </Box>
              {(geo.error || !hasCoords) && !geo.loading && (
                <IconButton size="small" onClick={() => geo.fetchLocation(true)} sx={{ bgcolor: alpha(PRIMARY, 0.08), flexShrink: 0 }}><Refresh fontSize="small" sx={{ color: PRIMARY }} /></IconButton>
              )}
            </Stack>
          </Paper>
          {geo.error && <Alert severity="error" sx={{ borderRadius: 2, py: 0.75 }}>Location is required to punch in/out. Please allow access and tap retry.</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: { xs: 2, sm: 3 }, py: { xs: 2, sm: 2.5 }, gap: 1.5, flexDirection: { xs: "column", sm: "row" }, borderTop: `1px solid ${alpha(PRIMARY, 0.08)}` }}>
        <Button fullWidth={isMobile} variant="outlined" onClick={onClose} disabled={punchLoading} sx={{ borderRadius: 2.5, px: 3, borderColor: alpha(PRIMARY, 0.35), color: PRIMARY }}>Cancel</Button>
        <Button fullWidth={isMobile} variant="contained" onClick={onConfirm} disabled={punchLoading || geo.loading || !hasCoords} startIcon={punchLoading ? <CircularProgress size={16} color="inherit" /> : isPunchIn ? <Login /> : <Logout />} sx={{ borderRadius: 2.5, px: 3, fontWeight: 700, bgcolor: accentColor, "&:hover": { bgcolor: isPunchIn ? "#16a34a" : "#dc2626" } }}>
          {punchLoading ? "Processing…" : isPunchIn ? "Confirm Punch In" : "Confirm Punch Out"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// ─── BulkExportMenu ───────────────────────────────────────────────────────────
const BulkExportMenu = ({ selectedRecords, allRecords, onSnack, size = "small" }) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const open         = Boolean(anchorEl);
  const ts           = format(new Date(), "yyyyMMdd_HHmmss");
  const hasSelection = selectedRecords.length > 0;
  const exportTarget = hasSelection ? selectedRecords : allRecords;
  const count        = exportTarget.length;
  const act = (fn) => () => {
    try { fn(); onSnack(`Exported ${count} record${count !== 1 ? "s" : ""} successfully`); }
    catch { onSnack("Export failed", "error"); }
    setAnchorEl(null);
  };
  return (
    <>
      <Button variant="contained" size={size} startIcon={<FileDownload />} endIcon={<ExpandMore sx={{ fontSize: 15 }} />} onClick={(e) => setAnchorEl(e.currentTarget)} sx={{ bgcolor: "rgba(255,255,255,.15)", color: "#fff", borderRadius: 2.5, fontWeight: 600, "&:hover": { bgcolor: "rgba(255,255,255,.25)" } }}>
        Export{hasSelection ? ` (${selectedRecords.length})` : ""}
      </Button>
      <Menu anchorEl={anchorEl} open={open} onClose={() => setAnchorEl(null)} PaperProps={{ sx: { mt: 1.5, borderRadius: 2.5, minWidth: 230, boxShadow: "0 8px 24px rgba(0,0,0,0.13)" } }} transformOrigin={{ horizontal: "right", vertical: "top" }} anchorOrigin={{ horizontal: "right", vertical: "bottom" }}>
        <Box sx={{ px: 2, pt: 1.5, pb: 0.5 }}>
          <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ textTransform: "uppercase", letterSpacing: 0.5, fontSize: "0.65rem" }}>
            {hasSelection ? `${count} selected record${count !== 1 ? "s" : ""}` : `All ${count} record${count !== 1 ? "s" : ""} on this page`}
          </Typography>
        </Box>
        <MenuItem onClick={act(() => downloadFile(generateCSV(exportTarget), `attendance_${ts}.csv`, "text/csv"))} sx={{ py: 1.25 }}>
          <ListItemIcon><FileDownload fontSize="small" sx={{ color: SUCCESS }} /></ListItemIcon>
          <ListItemText primary="Export as CSV" secondary={`${count} record${count !== 1 ? "s" : ""}`} primaryTypographyProps={{ variant: "body2", fontWeight: 600 }} secondaryTypographyProps={{ variant: "caption" }} />
        </MenuItem>
        <MenuItem onClick={act(() => downloadFile(generateJSON(exportTarget), `attendance_${ts}.json`, "application/json"))} sx={{ py: 1.25 }}>
          <ListItemIcon><FileDownload fontSize="small" sx={{ color: PRIMARY }} /></ListItemIcon>
          <ListItemText primary="Export as JSON" secondary={`${count} record${count !== 1 ? "s" : ""}`} primaryTypographyProps={{ variant: "body2", fontWeight: 600 }} secondaryTypographyProps={{ variant: "caption" }} />
        </MenuItem>
        <Divider sx={{ my: 0.5 }} />
        <MenuItem onClick={() => { try { navigator.clipboard.writeText(generateJSON(exportTarget)); onSnack("Copied to clipboard"); } catch { onSnack("Copy failed", "error"); } setAnchorEl(null); }} sx={{ py: 1.25 }}>
          <ListItemIcon><ContentCopy fontSize="small" /></ListItemIcon>
          <ListItemText primary="Copy to Clipboard" primaryTypographyProps={{ variant: "body2", fontWeight: 600 }} />
        </MenuItem>
        {count === 1 && (
          <MenuItem onClick={() => { try { printRecord(exportTarget[0]); onSnack("Print preview opened"); } catch { onSnack("Print failed", "error"); } setAnchorEl(null); }} sx={{ py: 1.25 }}>
            <ListItemIcon><Print fontSize="small" /></ListItemIcon>
            <ListItemText primary="Print" primaryTypographyProps={{ variant: "body2", fontWeight: 600 }} />
          </MenuItem>
        )}
        {hasSelection && (<><Divider sx={{ my: 0.5 }} /><Box sx={{ px: 2, pt: 0.5, pb: 1 }}><Typography variant="caption" color="text.disabled" sx={{ fontSize: "0.68rem" }}>Deselect all to export the whole page</Typography></Box></>)}
      </Menu>
    </>
  );
};

// ─── MobileLogCard ────────────────────────────────────────────────────────────
const MobileLogCard = ({ entry, index }) => {
  const cfg = STATUS_CONFIG[entry.status] || STATUS_CONFIG.present;
  const d   = new Date(entry.date);
  const ft  = (ts) => ts ? new Date(ts).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true }) : "—";
  return (
    <Fade in timeout={350 + index * 50}>
      <Paper sx={{ mb: 1.5, borderRadius: 3, border: `1px solid ${alpha(cfg.color, 0.2)}`, overflow: "hidden" }}>
        <Box sx={{ p: 2 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 1.5 }}>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Box sx={{ bgcolor: cfg.bg, borderRadius: 2, px: 1.25, py: 0.75, textAlign: "center", minWidth: 52 }}>
                <Typography variant="caption" fontWeight={800} color={cfg.color} sx={{ display: "block", lineHeight: 1, fontSize: "0.62rem", textTransform: "uppercase", letterSpacing: 0.5 }}>{d.toLocaleString("default", { month: "short" })}</Typography>
                <Typography variant="h6" fontWeight={900} lineHeight={1.1} color={cfg.color}>{d.getDate()}</Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" fontWeight={700}>{d.toLocaleDateString("en-US", { weekday: "long" })}</Typography>
                <StatusBadge status={entry.status || "present"} />
              </Box>
            </Stack>
          </Stack>
          <Grid container spacing={1} sx={{ mb: 1.5 }}>
           {/* Punch In */}
<Grid item xs={4}>
  <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.25, fontSize: "0.68rem" }}>Punch In</Typography>
  <Typography variant="body2" fontWeight={700} color={SUCCESS}>{ft(entry.punchIn?.time)}</Typography>
</Grid>

{/* Punch Out */}
<Grid item xs={4}>
  <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.25, fontSize: "0.68rem" }}>Punch Out</Typography>
  {entry.punchOut ? (
    <Stack spacing={0.25}>
      <Stack direction="row" spacing={0.4} alignItems="center">
        <Typography variant="body2" fontWeight={700} color={WARNING}>{ft(entry.punchOut.time)}</Typography>
      </Stack>
      {entry.punchOut.isAutoPunchOut && (
        <Chip size="small" label="Auto" sx={{ bgcolor: alpha(WARNING, 0.1), color: WARNING, fontWeight: 700, fontSize: "0.6rem", height: 16, width: "fit-content" }} />
      )}
    </Stack>
  ) : (
    <Typography variant="body2" fontWeight={700} color={PRIMARY}>Ongoing</Typography>
  )}
</Grid>

{/* Hours */}
<Grid item xs={4}>
  <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.25, fontSize: "0.68rem" }}>Hours</Typography>
  <Typography variant="body2" fontWeight={700} color={PRIMARY}>{entry.workHoursFormatted || "—"}</Typography>
</Grid>

{entry.workedOnNonWorkingDay && (
  <Grid item xs={12}>
    <OffDayWorkChip entry={entry} />
  </Grid>
)}

{/* ✅ Missed punch-out warning — full width below the 3 cols */}
{entry.missedPunchOut && (
  <Grid item xs={12}>
    <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mt: 0.5, p: 1, borderRadius: 1.5, bgcolor: alpha(WARNING, 0.08), border: `1px solid ${alpha(WARNING, 0.25)}` }}>
      <Warning sx={{ fontSize: 14, color: WARNING }} />
      <Typography variant="caption" color={WARNING} fontWeight={700}>
        User did not punch out this day
      </Typography>
    </Stack>
  </Grid>
)}

          </Grid>
        </Box>
      </Paper>
    </Fade>
  );
};

// ─── LoadingSkeleton ──────────────────────────────────────────────────────────
const LoadingSkeleton = () => (
  <Box sx={{ p: { xs: 2, sm: 3 } }}>
    <Grid container spacing={2} sx={{ mb: 3 }}>
      {[1, 2, 3, 4].map((i) => <Grid item xs={6} sm={3} key={i}><Skeleton variant="rectangular" height={100} sx={{ borderRadius: 3 }} /></Grid>)}
    </Grid>
    <Skeleton variant="rectangular" height={56} sx={{ borderRadius: 2, mb: 2 }} />
    <Skeleton variant="rectangular" height={400} sx={{ borderRadius: 3 }} />
  </Box>
);

// ─── getPeriodDates ───────────────────────────────────────────────────────────
const getPeriodDates = (period) => {
  const now = new Date();
  if (period === "Today") {
    const s = new Date(now); s.setHours(0, 0, 0, 0);
    const e = new Date(now); e.setHours(23, 59, 59, 999);
    return { startDate: s.toISOString().split("T")[0], endDate: e.toISOString().split("T")[0] };
  }
  if (period === "This Week") {
    const day = now.getDay();
    const s = new Date(now); s.setDate(now.getDate() - day); s.setHours(0, 0, 0, 0);
    const e = new Date(now); e.setHours(23, 59, 59, 999);
    return { startDate: s.toISOString().split("T")[0], endDate: e.toISOString().split("T")[0] };
  }
  if (period === "This Month") {
    const s = new Date(now.getFullYear(), now.getMonth(), 1);
    const e = new Date(now); e.setHours(23, 59, 59, 999);
    return { startDate: s.toISOString().split("T")[0], endDate: e.toISOString().split("T")[0] };
  }
  return {};
};

// ─── Battery Helper ───────────────────────────────────────────────────────────
const saveBattery = async (userId, token) => {
  try {
    if (!("getBattery" in navigator)) return null;
    const battery    = await navigator.getBattery();
    const percentage = Math.round(battery.level * 100);
    const isCharging = battery.charging;
    await axios.post(
      `${API}/api/v1/battery/log`,
      { userId, percentage, isCharging },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return { percentage, isCharging };
  } catch (e) {
    console.error("❌ Battery save error:", e.message);
    return null;
  }
};

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Attendance() {
  const theme    = useTheme();
  const navigate = useNavigate();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [batteryInfo, setBatteryInfo] = useState({ percentage: null, isCharging: false });

  const { userId: paramUserId } = useParams();
  const location                = useLocation();
  const memberInfo              = location.state || {};
  const isAdminView             = !!paramUserId;

  const { user, getUserRole } = useAuth();
  const { socketRef } = useSocket();
  const {
    attendances, loading, error, success, pagination, summary,
    fetchAttendances, punchIn, punchOut, deleteAttendance, clearMessages,
  } = useAttendance();
  const geo   = useGeo();
  const timer = useWorkTimer();

  const userRole      = getUserRole();
  const isTeam        = userRole === "TEAM";
  const canManage     = MANAGER_ROLES.includes(userRole);
  const canDelete     = userRole === "Admin_panel";
  const isManagerRole = MANAGER_ROLES.includes(userRole);

  const showPunchControls = !isAdminView && !isManagerRole;

  // ── FIX 1: Separate calendar attendance state ─────────────────────────────
  const [calendarAttendances, setCalendarAttendances] = useState([]);

  const fetchCalendarMonth = useCallback(async (monthDate) => {
    const y         = monthDate.getFullYear();
    const m         = monthDate.getMonth();
    const startDate = new Date(y, m, 1).toISOString().split("T")[0];
    const endDate   = new Date(y, m + 1, 0).toISOString().split("T")[0];
    try {
      const token = localStorage.getItem("token");
      const res   = await axios.get(`${API}/api/v1/attendance`, {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          startDate,
          endDate,
          limit: 200,
          ...(paramUserId
            ? { userId: paramUserId }
            : isTeam && user?._id
            ? { userId: user._id }
            : {}),
        },
      });
      setCalendarAttendances(res.data?.result?.attendances || []);
    } catch (e) {
      console.error("Calendar month fetch failed:", e.message);
    }
  }, [paramUserId, isTeam, user]);

  // Re-fetch calendar whenever the displayed month changes
  useEffect(() => {
    fetchCalendarMonth(currentMonth);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // ── END FIX 1 ─────────────────────────────────────────────────────────────

  const [todayAtt, setTodayAtt] = useState(null);
  useEffect(() => {
    const ts    = new Date().toDateString();
    const found = attendances?.find((a) => new Date(a.date).toDateString() === ts) || null;
    setTodayAtt(found);
    if (!isAdminView) {
      if (found?.punchIn && !found?.punchOut) timer.start(found.punchIn.time);
      else if (found?.punchOut) timer.stop();
      else timer.reset();
    }
    // eslint-disable-next-line
  }, [attendances]);

  const hasPunchedIn  = !!todayAtt?.punchIn;
  const hasPunchedOut = !!todayAtt?.punchOut;

  const [period,       setPeriod]       = useState(
    memberInfo.historyView ? "All" : "This Month",
  );
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [filters,      setFilters]      = useState({ page: 1, limit: 10, status: "", search: "" });
  const [drawerOpen,   setDrawerOpen]   = useState(false);
  const [snackbar,     setSnackbar]     = useState({ open: false, message: "", severity: "success" });
  const [selLog,       setSelLog]       = useState(null);
  const [logOpen,      setLogOpen]      = useState(false);
  const [deleteOpen,   setDeleteOpen]   = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [navValue,     setNavValue]     = useState(0);
  const [punchLoading, setPunchLoading] = useState(false);
  const [punchState,   setPunchState]   = useState({ stage: null, mode: "in" });
  const [locationRequesting, setLocationRequesting] = useState(false);

  const containerRef = useRef(null);
  const showSnack    = useCallback((msg, sev = "success") => setSnackbar({ open: true, message: msg, severity: sev }), []);

  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (filters.search) n++;
    if (filters.status) n++;
    if (period !== "This Month") n++;
    return n;
  }, [filters, period]);

  const loadData = useCallback(async () => {
    const dates = getPeriodDates(period);
    const q = {
      page:  filters.page,
      limit: filters.limit,
      ...(filters.status && { status: filters.status }),
      ...(filters.search && { search: filters.search }),
      ...(paramUserId
        ? { userId: paramUserId }
        : isTeam && user?._id
        ? { userId: user._id }
        : {}),
      ...dates,
    };
    await fetchAttendances(q);
  }, [filters, period, isTeam, user, fetchAttendances, paramUserId]);

  useEffect(() => { loadData(); }, [loadData]);
  useEffect(() => {
    if (error)   showSnack(error,   "error");
    if (success) showSnack(success, "success");
  }, [error, success, showSnack]);

  // ── FIX 2: Re-fetch calendar when currentMonth changes ───────────────────
  useEffect(() => {
    fetchCalendarMonth(currentMonth);
  }, [currentMonth, fetchCalendarMonth]);
  // ── END FIX 2 ─────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!("getBattery" in navigator)) return;
    let battery = null;
    const update = () => {
      if (!battery) return;
      setBatteryInfo({ percentage: Math.round(battery.level * 100), isCharging: battery.charging });
    };
    navigator.getBattery().then((b) => {
      battery = b; update();
      b.addEventListener("levelchange",    update);
      b.addEventListener("chargingchange", update);
    });
    return () => {
      if (battery) {
        battery.removeEventListener("levelchange",    update);
        battery.removeEventListener("chargingchange", update);
      }
    };
  }, []);

  const getCurrentBatterySnapshot = useCallback(async () => {
    if (!("getBattery" in navigator)) return null;
    try {
      const battery = await navigator.getBattery();
      return {
        batteryPercentage: Math.round(battery.level * 100),
        isCharging: battery.charging,
      };
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    if (!user?._id || !hasPunchedIn || hasPunchedOut) return;
    if (!("getBattery" in navigator)) return;
    const token = localStorage.getItem("token");
    saveBattery(user._id, token).then((res) => { if (res) setBatteryInfo(res); });
    const interval = setInterval(async () => {
      const res = await saveBattery(user._id, token);
      if (res) setBatteryInfo(res);
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [hasPunchedIn, hasPunchedOut, user?._id]);

  // ── Auto-resume GPS tracking if page reloads while punched in ────────────
  useEffect(() => {
    if (hasPunchedIn && !hasPunchedOut && !isAdminView && user?._id && !isCurrentlyTracking()) {
      startTracking(null, socketRef, user._id);
    }
    if (hasPunchedOut && isCurrentlyTracking()) {
      stopTracking();
    }
  }, [hasPunchedIn, hasPunchedOut, isAdminView, socketRef, user?._id]);

  useEffect(() => {
    return () => {
      if (isCurrentlyTracking()) stopTracking();
    };
  }, []);

  useEffect(() => {
    if (isAdminView) return undefined;
    window.__simulateLiveTrack = simulateTrackingMovement;
    return () => {
      if (window.__simulateLiveTrack === simulateTrackingMovement) {
        delete window.__simulateLiveTrack;
      }
    };
  }, [isAdminView]);
  // ─────────────────────────────────────────────────────────────────────────

  const openPunchModal = useCallback((mode) => {
    if (mode === "in" && hasPunchedIn) {
      showSnack(hasPunchedOut ? "Attendance complete for today. See you tomorrow!" : "Already punched in. Use Punch Out when done.", "warning");
      return;
    }
    if (mode === "out" && hasPunchedOut) { showSnack("Already punched out for today.", "info"); return; }
    setPunchState({ stage: "permission", mode });
  }, [hasPunchedIn, hasPunchedOut, showSnack]);

  const handleAllowLocation = useCallback(async () => {
    setLocationRequesting(true);
    try {
      const location = await geo.fetchLocation(true);
      if (location?.latitude != null && location?.longitude != null) {
        setPunchState((s) => ({ ...s, stage: "confirm" }));
        return;
      }
      showSnack("Could not get valid location. Please retry.", "error");
    } catch (error) {
      showSnack(error?.message || "Could not get valid location. Please retry.", "error");
    } finally {
      setLocationRequesting(false);
    }
  }, [geo, showSnack]);

  const handleDenyLocation = useCallback(() => { setPunchState({ stage: null, mode: "in" }); geo.reset(); }, [geo]);

  const handlePunchConfirm = useCallback(async () => {
    const mode = punchState.mode;
    if (mode === "in"  && hasPunchedIn)  { showSnack("Already punched in.",  "warning"); setPunchState({ stage: null, mode: "in" }); return; }
    if (mode === "out" && hasPunchedOut) { showSnack("Already punched out.", "info");    setPunchState({ stage: null, mode: "in" }); return; }
    if (geo.latitude == null || geo.longitude == null) { showSnack("Could not get valid location. Please retry.", "error"); return; }

    setPunchLoading(true);
    try {
      const batterySnapshot = await getCurrentBatterySnapshot();
      const fn     = mode === "in" ? punchIn : punchOut;
      const result = await fn({
        latitude:  parseFloat(geo.latitude.toFixed(6)),
        longitude: parseFloat(geo.longitude.toFixed(6)),
        accuracy:  geo.accuracy,
        address:   geo.address,
        ...(batterySnapshot || {}),
      });

     if (result?.success) {
  showSnack(`Punch ${mode} successful!`);
  setPunchState({ stage: null, mode: "in" });
  await loadData();
  await fetchCalendarMonth(currentMonth);

  if (mode === "in") {
    timer.start(new Date());
    const token = localStorage.getItem("token");
    await saveBattery(user._id, token);

    if ("getBattery" in navigator) {
      const battery = await navigator.getBattery();
      battery.addEventListener("levelchange",    () => saveBattery(user._id, token));
      battery.addEventListener("chargingchange", () => saveBattery(user._id, token));
    }

    // ✅ Start tracking ONCE, no duplicate
    if (!isCurrentlyTracking()) {
      console.log("[Attendance] 🟢 Starting GPS tracking after punch-in");
      startTracking(null, socketRef, user._id);
    }
  }

  if (mode === "out") {
    // ✅ Stop tracking ONLY on punch-out
    if (isCurrentlyTracking()) {
      console.log("[Attendance] 🔴 Stopping GPS tracking after punch-out");
      stopTracking();
    }
  }
      } else {
        showSnack(result?.error || `Punch ${mode} failed`, "error");
      }
    } catch (e) {
      showSnack(e.message || "Punch failed", "error");
    } finally {
      setPunchLoading(false);
    }
  }, [geo, punchState.mode, hasPunchedIn, hasPunchedOut, punchIn, punchOut, loadData, fetchCalendarMonth, currentMonth, timer, showSnack, user, socketRef, getCurrentBatterySnapshot]);

  const handleCloseConfirm = useCallback(() => {
    if (!punchLoading) { setPunchState({ stage: null, mode: "in" }); geo.reset(); }
  }, [punchLoading, geo]);

  // ─── Calendar Days ────────────────────────────────────────────────────────
  const calendarDays = useMemo(() => {
    const y = currentMonth.getFullYear(), m = currentMonth.getMonth();
    const firstDay    = new Date(y, m, 1).getDay();
    const daysInMonth = new Date(y, m + 1, 0).getDate();

    const todayMidnight = new Date();
    todayMidnight.setHours(0, 0, 0, 0);
    const todayMs = todayMidnight.getTime();

    const joinDateMs = (() => {
      const raw = isAdminView
        ? (memberInfo?.createdAt || memberInfo?.memberCreatedAt || memberInfo?.joinDate)
        : (user?.createdAt || user?.joinDate || user?.joiningDate);

      if (raw) {
        const d = new Date(raw);
        d.setHours(0, 0, 0, 0);
        if (!isNaN(d.getTime())) {
          return d.getTime();
        }
      }

      const objectId = isAdminView ? String(paramUserId || "") : String(user?._id || "");
      const decoded  = getJoinDateFromObjectId(objectId);
      if (decoded) {
        return decoded.getTime();
      }

      if (calendarAttendances?.length > 0) {
        const earliest = calendarAttendances.reduce((min, a) => {
          const d = new Date(a.date);
          d.setHours(0, 0, 0, 0);
          return d.getTime() < min ? d.getTime() : min;
        }, new Date(calendarAttendances[0].date).setHours(0, 0, 0, 0));
        return earliest;
      }

      const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
      startOfMonth.setHours(0, 0, 0, 0);
      return startOfMonth.getTime();
    })();

    const days = [];

    for (let i = firstDay - 1; i >= 0; i--) {
      const d = new Date(y, m, -i);
      days.push({ day: d.getDate(), date: d, isPrev: true });
    }

    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(y, m, i);
      date.setHours(0, 0, 0, 0);
      const dateMs = date.getTime();

      const dayAttendances = (calendarAttendances || []).filter(
        (a) => new Date(a.date).toDateString() === date.toDateString()
      );
      const att =
        dayAttendances.find((a) => a.status === "leave") ||
        dayAttendances.find((a) => a.status === "holiday") ||
        dayAttendances.find((a) => a.status === "absent") ||
        dayAttendances.find((a) => a.status === "late") ||
        dayAttendances[0];

      const status = resolveCalendarStatus(dateMs, att, todayMs, joinDateMs);
      days.push({ day: i, date, status, att });
    }

    return days;
  }, [currentMonth, calendarAttendances, user, isAdminView, memberInfo, paramUserId]);

  const DOW = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

  // ── Merged log ────────────────────────────────────────────────────────────
  const mergedLog = useMemo(() => {
    const todayMidnight = new Date();
    todayMidnight.setHours(0, 0, 0, 0);
    const todayMs = todayMidnight.getTime();

    const recordedDates = new Set(
      (calendarAttendances || []).map((a) => new Date(a.date).toDateString())
    );

    const absentRows = calendarDays
      .filter((c) => !c.isPrev && c.status === "absent" && c.date)
      .filter((c) => !recordedDates.has(c.date.toDateString()))
      .map((c) => ({
        _id:            `absent-${c.date.toISOString()}`,
        date:           c.date.toISOString(),
        status:         "absent",
        punchIn:        null,
        punchOut:       null,
        workHours:      0,
        workHoursFormatted: "—",
        _isAbsentRow:   true,
      }));

    const real = attendances || [];

    if (filters.status && filters.status !== "absent") {
      return real;
    }
    if (filters.status === "absent") {
      return [...real, ...absentRows].sort(
        (a, b) => new Date(b.date) - new Date(a.date)
      );
    }

    return [...real, ...absentRows].sort(
      (a, b) => new Date(b.date) - new Date(a.date)
    );
  }, [calendarDays, calendarAttendances, attendances, filters.status]);

  const handleDateSelect = useCallback((d) => {
    setSelectedDate(d);
    const att = calendarAttendances?.find((a) => new Date(a.date).toDateString() === d.toDateString())
             || attendances?.find((a) => new Date(a.date).toDateString() === d.toDateString());
    if (att) { setSelLog(att); setLogOpen(true); }
  }, [calendarAttendances, attendances]);

  const handleDeleteOpen    = useCallback((att) => { setDeleteTarget(att); setDeleteOpen(true); }, []);
  const handleDeleteConfirm = useCallback(async () => {
    const id = deleteTarget?._id || deleteTarget?.id;
    if (!id) { setDeleteOpen(false); return; }
    const res = await deleteAttendance(id);
    if (res?.success) {
      await loadData();
      await fetchCalendarMonth(currentMonth);
    }
    setDeleteOpen(false); setDeleteTarget(null);
  }, [deleteTarget, deleteAttendance, loadData, fetchCalendarMonth, currentMonth]);

  const clearFilters = useCallback(() => { setFilters({ page: 1, limit: 10, status: "", search: "" }); setPeriod("This Month"); }, []);
  const showHistory = useCallback(() => {
    const historyUserId = paramUserId || memberInfo?.memberId || user?._id;
    if (!historyUserId) return;

    navigate(`/attendance-history/${historyUserId}`, {
      state: {
        memberId: historyUserId,
        userId: historyUserId,
        user: { _id: historyUserId, id: historyUserId },
        memberName: memberInfo.memberName || user?.name || user?.fullName || "Selected User",
        memberRole: memberInfo.memberRole || userRole,
        memberPhone: memberInfo.memberPhone || user?.phoneNumber || user?.phone || "",
        memberEmail: memberInfo.memberEmail || user?.email || "",
        fromTeam: true,
        selectedDate: "all",
      },
    });
  }, [memberInfo, navigate, paramUserId, selectedDate, user, userRole]);
  const setFilter    = (key) => (val) => setFilters((prev) => ({ ...prev, [key]: val, page: 1 }));
  const fmtDate      = (ts) => !ts ? "—" : new Date(ts).toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" });
  const fmtTime      = (ts) => !ts ? "—" : new Date(ts).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });

  if (loading && !attendances?.length) return <LoadingSkeleton />;

  return (
    <Box
      ref={containerRef}
      sx={{
        p: { xs: 1.5, sm: 2, md: 3 },
        minHeight: "100vh",
        pb: { xs: 9, sm: 3 },
        background:
          "radial-gradient(circle at top left, rgba(69,105,234,0.12), transparent 32%), linear-gradient(180deg, #f8fafc 0%, #eef2f7 100%)",
      }}
    >
      {showPunchControls && (
        <>
          <LocationPermissionDialog open={punchState.stage === "permission"} mode={punchState.mode} onAllow={handleAllowLocation} onDeny={handleDenyLocation} requesting={locationRequesting} />
          <PunchModal open={punchState.stage === "confirm"} mode={punchState.mode} onClose={handleCloseConfirm} onConfirm={handlePunchConfirm} punchLoading={punchLoading} geo={geo} timer={timer} />
        </>
      )}

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <Paper
        elevation={0}
        sx={{
          p: { xs: 2, sm: 3 },
          mb: 3,
          borderRadius: "28px",
          background: `linear-gradient(135deg, ${PRIMARY} 0%, #3150c7 52%, ${SECONDARY} 100%)`,
          color: "#fff",
          position: "relative",
          overflow: "hidden",
          boxShadow: `0 24px 55px ${alpha(PRIMARY, 0.22)}`,
          border: "1px solid rgba(255,255,255,0.18)",
        }}
      >
        {[{ w: 200, h: 200, t: -70, r: -50 }, { w: 120, h: 120, t: 20, r: 100 }].map((b, i) => (
          <Box key={i} sx={{ position: "absolute", width: b.w, height: b.h, borderRadius: "50%", bgcolor: "#fff", opacity: i === 0 ? 0.05 : 0.04, top: b.t, right: b.r, pointerEvents: "none" }} />
        ))}
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} justifyContent="space-between" alignItems={{ xs: "flex-start", sm: "center" }}>
          <Stack direction="row" spacing={2} alignItems="center">
            {isAdminView && (
              <IconButton onClick={() => navigate(-1)} sx={{ bgcolor: "rgba(255,255,255,0.15)", color: "#fff", "&:hover": { bgcolor: "rgba(255,255,255,0.25)" }, flexShrink: 0 }}>
                <ArrowBack />
              </IconButton>
            )}
            <Box>
              {isAdminView && memberInfo.fromTeam && (
                <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mb: 0.5 }}>
                  <Typography variant="caption" sx={{ opacity: 0.7, cursor: "pointer", "&:hover": { opacity: 1 } }} onClick={() => navigate("/team-attendance")}>Team</Typography>
                  <Typography variant="caption" sx={{ opacity: 0.5 }}>›</Typography>
                  <Typography variant="caption" sx={{ opacity: 0.85, fontWeight: 600 }}>{memberInfo.memberName}</Typography>
                </Stack>
              )}
              {isAdminView ? (
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <Avatar sx={{ bgcolor: "rgba(255,255,255,0.2)", border: "2px solid rgba(255,255,255,0.4)", width: isMobile ? 38 : 46, height: isMobile ? 38 : 46, fontWeight: 800, fontSize: isMobile ? "0.95rem" : "1.1rem" }}>
                    {memberInfo.memberName?.charAt(0) || "?"}
                  </Avatar>
                  <Box>
                    <Typography variant={isMobile ? "subtitle1" : "h6"} fontWeight={800} lineHeight={1.2}>{memberInfo.memberName || "Team Member"}</Typography>
                    <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap">
                      {memberInfo.memberRole && <Chip size="small" label={memberInfo.memberRole} sx={{ bgcolor: "rgba(255,255,255,0.2)", color: "#fff", fontWeight: 700, height: 20, fontSize: "0.68rem" }} />}
                      {memberInfo.memberPhone && (
                        <Stack direction="row" spacing={0.4} alignItems="center">
                          <Phone sx={{ fontSize: 12, opacity: 0.7 }} />
                          <Typography variant="caption" sx={{ opacity: 0.8 }}>{memberInfo.memberPhone}</Typography>
                        </Stack>
                      )}
                      {memberInfo.memberEmail && !isMobile && (
                        <Stack direction="row" spacing={0.4} alignItems="center">
                          <Email sx={{ fontSize: 12, opacity: 0.7 }} />
                          <Typography variant="caption" sx={{ opacity: 0.8 }}>{memberInfo.memberEmail}</Typography>
                        </Stack>
                      )}
                    </Stack>
                  </Box>
                </Stack>
              ) : (
                <>
                  <Typography variant={isMobile ? "h6" : "h5"} fontWeight={800}>Attendance Dashboard</Typography>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
                    <PulsingDot dotcolor={!isManagerRole && hasPunchedIn && !hasPunchedOut ? SUCCESS : "rgba(255,255,255,0.5)"} />
                    <Typography variant="caption" sx={{ opacity: 0.85 }}>
                      {isManagerRole ? `Managing as ${userRole}` : hasPunchedIn && !hasPunchedOut ? "Currently clocked in" : hasPunchedOut ? "Clocked out for today" : "Not clocked in today"}
                    </Typography>
                  </Stack>
                </>
              )}
            </Box>
          </Stack>
          <Stack direction="row" spacing={1} flexWrap="wrap" alignItems="center">
            {showPunchControls && (
              <>
                {!hasPunchedIn && <Button variant="contained" startIcon={<Login />} onClick={() => openPunchModal("in")} size={isMobile ? "small" : "medium"} sx={{ bgcolor: SUCCESS, fontWeight: 700, borderRadius: 2.5, "&:hover": { bgcolor: "#16a34a" }, boxShadow: `0 4px 12px ${alpha(SUCCESS, 0.4)}` }}>Punch In</Button>}
                {hasPunchedIn && !hasPunchedOut && <Button variant="contained" startIcon={<Logout />} onClick={() => openPunchModal("out")} size={isMobile ? "small" : "medium"} sx={{ bgcolor: DANGER, fontWeight: 700, borderRadius: 2.5, "&:hover": { bgcolor: "#dc2626" }, boxShadow: `0 4px 12px ${alpha(DANGER, 0.4)}` }}>Punch Out</Button>}
                {hasPunchedIn && hasPunchedOut && <Tooltip title="Attendance complete for today" arrow><span><Button variant="contained" startIcon={<CheckCircle />} disabled size={isMobile ? "small" : "medium"} sx={{ fontWeight: 700, borderRadius: 2.5, bgcolor: "rgba(255,255,255,.15) !important", color: "rgba(255,255,255,.6) !important" }}>Day Complete</Button></span></Tooltip>}
              </>
            )}
            {!isMobile && mergedLog.length > 0 && <BulkExportMenu selectedRecords={[]} allRecords={attendances || []} onSnack={showSnack} />}
            <Button variant="contained" startIcon={<Refresh />} onClick={loadData} disabled={loading} size={isMobile ? "small" : "medium"} sx={{ bgcolor: "rgba(255,255,255,.15)", color: "#fff", borderRadius: 2.5, "&:hover": { bgcolor: "rgba(255,255,255,.25)" } }}>Refresh</Button>
            {isMobile && <Button variant="contained" startIcon={<FilterAlt />} onClick={() => setDrawerOpen(true)} size="small" sx={{ bgcolor: "rgba(255,255,255,.15)", color: "#fff", borderRadius: 2.5, "&:hover": { bgcolor: "rgba(255,255,255,.25)" }, position: "relative" }}>Filter{activeFilterCount > 0 && <Badge badgeContent={activeFilterCount} color="error" sx={{ position: "absolute", top: -8, right: -8 }} />}</Button>}
          </Stack>
        </Stack>

        {showPunchControls && hasPunchedIn && !hasPunchedOut && <Box sx={{ mt: 2 }}><LiveTimer startTime={todayAtt?.punchIn?.time} isRunning={true} /></Box>}

        {!isAdminView && !isManagerRole && (hasPunchedIn || hasPunchedOut) && (
          <Box sx={{ mt: 2, pt: 2, borderTop: "1px solid rgba(255,255,255,.15)" }}>
            <Stack direction="row" spacing={3} flexWrap="wrap">
              {[
                todayAtt?.punchIn  && ["Punch In",   fmtTime(todayAtt.punchIn.time)],
                todayAtt?.punchOut && ["Punch Out",  fmtTime(todayAtt.punchOut.time)],
                todayAtt?.workHoursFormatted && ["Work Hours", todayAtt.workHoursFormatted],
                todayAtt?.status && ["Status", todayAtt.status.charAt(0).toUpperCase() + todayAtt.status.slice(1)],
              ].filter(Boolean).map(([label, value]) => (
                <Box key={label}>
                  <Typography variant="caption" sx={{ opacity: 0.7, display: "block" }}>{label}</Typography>
                  <Typography variant="body2" fontWeight={700}>{value}</Typography>
                </Box>
              ))}
            </Stack>
          </Box>
        )}

        {isAdminView && pagination?.totalItems > 0 && (
          <Box sx={{ mt: 2, pt: 2, borderTop: "1px solid rgba(255,255,255,.15)" }}>
            <Stack direction="row" spacing={3} flexWrap="wrap">
              <Box><Typography variant="caption" sx={{ opacity: 0.7, display: "block" }}>Total Records</Typography><Typography variant="body2" fontWeight={700}>{pagination.totalItems}</Typography></Box>
              <Box><Typography variant="caption" sx={{ opacity: 0.7, display: "block" }}>Period</Typography><Typography variant="body2" fontWeight={700}>{period}</Typography></Box>
            </Stack>
          </Box>
        )}
      </Paper>

      {/* ── Stats ───────────────────────────────────────────────────────── */}
      {(() => {
        const totalDays   = mergedLog.length;
        const workHours   = (summary?.totalWorkHours || 0).toFixed(1);
        const presentCount = mergedLog.filter((a) => !a._isAbsentRow && (a.status === "present" || (!a.status && a.punchIn))).length
                           + (summary?.presentCount || 0 > 0 && mergedLog.filter((a) => !a._isAbsentRow).length === 0 ? summary.presentCount : 0);
        const lateCount   = mergedLog.filter((a) => !a._isAbsentRow && a.status === "late").length
                           || summary?.lateCount || 0;
        const absentCount = mergedLog.filter((a) => a._isAbsentRow || a.status === "absent").length
                           || summary?.absentCount || 0;

        const stats = [
          {
            icon: CalendarToday,
            label: "Total Days",
            value: totalDays,
            sub: "All records",
            color: PRIMARY,
            gradFrom: "#eff6ff",
            gradTo: "#dbeafe",
            iconBg: alpha(PRIMARY, 0.12),
            border: alpha(PRIMARY, 0.18),
          },
          {
            icon: AccessTime,
            label: "Work Hours",
            value: `${workHours}h`,
            sub: "Total logged",
            color: "#0ea5e9",
            gradFrom: "#f0f9ff",
            gradTo: "#e0f2fe",
            iconBg: alpha("#0ea5e9", 0.12),
            border: alpha("#0ea5e9", 0.18),
          },
          {
            icon: CheckCircle,
            label: "Present",
            value: mergedLog.filter((a) => !a._isAbsentRow && (a.status === "present" || a.status === "late" || (a.punchIn && !a._isAbsentRow))).length || summary?.presentCount || 0,
            sub: "On time days",
            color: "#16a34a",
            gradFrom: "#f0fdf4",
            gradTo: "#dcfce7",
            iconBg: alpha(SUCCESS, 0.12),
            border: alpha(SUCCESS, 0.22),
          },
          {
            icon: Warning,
            label: "Late",
            value: lateCount,
            sub: "Late arrivals",
            color: "#d97706",
            gradFrom: "#fffbeb",
            gradTo: "#fef3c7",
            iconBg: alpha(WARNING, 0.12),
            border: alpha(WARNING, 0.22),
          },
          {
            icon: ErrorIcon,
            label: "Absent",
            value: absentCount,
            sub: "Days missed",
            color: "#dc2626",
            gradFrom: "#fef2f2",
            gradTo: "#fee2e2",
            iconBg: alpha(DANGER, 0.12),
            border: alpha(DANGER, 0.22),
          },
        ];

        return (
          <Grid container spacing={isMobile ? 1.5 : 2} sx={{ mb: 3 }}>
            {stats.map((s, idx) => (
              <Grid item xs={6} sm={4} md={isMobile ? 6 : 2.4} key={s.label}>
                <Fade in timeout={300 + idx * 80}>
                  <Paper
                    elevation={0}
                    sx={{
                      p: { xs: 1.75, sm: 2.25 },
                      borderRadius: "18px",
                      height: "100%",
                      border: `1.5px solid ${s.border}`,
                      background: `linear-gradient(145deg, ${s.gradFrom} 0%, ${s.gradTo} 100%)`,
                      position: "relative",
                      overflow: "hidden",
                      transition: "transform .2s, box-shadow .2s",
                      "&:hover": {
                        transform: "translateY(-4px)",
                        boxShadow: `0 10px 28px ${alpha(s.color, 0.16)}`,
                      },
                    }}
                  >
                    <Box sx={{
                      position: "absolute", top: -18, right: -18,
                      width: 72, height: 72, borderRadius: "50%",
                      bgcolor: alpha(s.color, 0.08),
                      pointerEvents: "none",
                    }} />
                    {loading ? (
                      <Skeleton variant="rectangular" height={80} sx={{ borderRadius: 2 }} />
                    ) : (
                      <Stack spacing={1.25}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Box sx={{
                            width: { xs: 36, sm: 42 }, height: { xs: 36, sm: 42 },
                            borderRadius: "12px",
                            bgcolor: s.iconBg,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            border: `1px solid ${alpha(s.color, 0.15)}`,
                          }}>
                            <s.icon sx={{ fontSize: { xs: 18, sm: 21 }, color: s.color }} />
                          </Box>
                          <Typography
                            fontWeight={900}
                            sx={{
                              fontSize: { xs: "1.5rem", sm: "1.9rem" },
                              lineHeight: 1,
                              color: s.color,
                              letterSpacing: "-0.03em",
                            }}
                          >
                            {s.value}
                          </Typography>
                        </Stack>
                        <Box>
                          <Typography
                            sx={{
                              fontWeight: 700,
                              fontSize: { xs: "0.78rem", sm: "0.86rem" },
                              color: "#1e293b",
                              lineHeight: 1.2,
                            }}
                          >
                            {s.label}
                          </Typography>
                          <Typography
                            variant="caption"
                            sx={{ color: "#94a3b8", fontSize: "0.7rem", mt: 0.2, display: "block" }}
                          >
                            {s.sub}
                          </Typography>
                        </Box>
                        <Box sx={{
                          height: 3, borderRadius: "999px",
                          bgcolor: alpha(s.color, 0.18),
                          overflow: "hidden",
                        }}>
                          <Box sx={{
                            height: "100%",
                            width: s.label === "Work Hours"
                              ? `${Math.min(parseFloat(workHours) / 200 * 100, 100)}%`
                              : s.label === "Total Days"
                              ? "100%"
                              : totalDays > 0
                              ? `${Math.min((Number(s.value) / totalDays) * 100, 100)}%`
                              : "0%",
                            bgcolor: s.color,
                            borderRadius: "999px",
                            transition: "width 0.8s ease",
                          }} />
                        </Box>
                      </Stack>
                    )}
                  </Paper>
                </Fade>
              </Grid>
            ))}
          </Grid>
        );
      })()}

      {isMobile && (
        <Box sx={{ mb: 2 }}>
          <TextField fullWidth size="small" placeholder="Search records…" value={filters.search} onChange={(e) => setFilter("search")(e.target.value)}
            InputProps={{ startAdornment: <InputAdornment position="start"><Search /></InputAdornment>, endAdornment: filters.search && <InputAdornment position="end"><IconButton size="small" onClick={() => setFilter("search")("")}><Close fontSize="small" /></IconButton></InputAdornment>, sx: { borderRadius: 3, bgcolor: "#fff" } }}
          />
        </Box>
      )}

      {!isMobile && (
        <Paper
          elevation={0}
          sx={{
            p: 2,
            mb: 3,
            borderRadius: "24px",
            border: `1px solid ${alpha(PRIMARY, 0.1)}`,
            background: "rgba(255,255,255,0.9)",
            backdropFilter: "blur(16px)",
            boxShadow: "0 16px 38px rgba(15,23,42,0.07)",
            "& .MuiOutlinedInput-root": {
              borderRadius: "999px",
              bgcolor: "#f8fafc",
              transition: "box-shadow .2s ease, background .2s ease",
              "& fieldset": { borderColor: alpha(PRIMARY, 0.14) },
              "&:hover": {
                bgcolor: "#fff",
                "& fieldset": { borderColor: alpha(PRIMARY, 0.3) },
              },
              "&.Mui-focused": {
                bgcolor: "#fff",
                boxShadow: `0 0 0 4px ${alpha(PRIMARY, 0.1)}`,
                "& fieldset": { borderColor: PRIMARY },
              },
            },
          }}
        >
          <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap">
            <TextField size="small" placeholder="Search records…" value={filters.search} onChange={(e) => setFilter("search")(e.target.value)} sx={{ minWidth: 300 }}
              InputProps={{ startAdornment: <InputAdornment position="start"><Search sx={{ color: PRIMARY, fontSize: 18 }} /></InputAdornment>, endAdornment: filters.search && <InputAdornment position="end"><IconButton size="small" onClick={() => setFilter("search")("")}><Close fontSize="small" /></IconButton></InputAdornment> }}
            />
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Status</InputLabel>
              <Select value={filters.status} label="Status" onChange={(e) => setFilter("status")(e.target.value)}>
                <MenuItem value="">All Statuses</MenuItem>
                {Object.entries(STATUS_CONFIG).map(([k, v]) => <MenuItem key={k} value={k}>{v.label}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Period</InputLabel>
              <Select value={period} label="Period" onChange={(e) => setPeriod(e.target.value)}>
                {PERIOD_OPTIONS.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
              </Select>
            </FormControl>
            {activeFilterCount > 0 && <Button variant="text" startIcon={<Clear />} onClick={clearFilters} sx={{ color: DANGER, fontWeight: 800, borderRadius: "999px", px: 1.5 }}>Clear All</Button>}
          </Stack>
          {activeFilterCount > 0 && (
            <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mt: 1.5 }}>
              {filters.search           && <Chip size="small" label={`Search: "${filters.search}"`} onDelete={() => setFilter("search")("")}  sx={{ bgcolor: alpha(PRIMARY, 0.08), color: PRIMARY, borderRadius: "999px", fontWeight: 700 }} />}
              {filters.status           && <Chip size="small" label={`Status: ${filters.status}`}   onDelete={() => setFilter("status")("")}  sx={{ bgcolor: alpha(PRIMARY, 0.08), color: PRIMARY, borderRadius: "999px", fontWeight: 700 }} />}
              {period !== "This Month"  && <Chip size="small" label={`Period: ${period}`}            onDelete={() => setPeriod("This Month")} sx={{ bgcolor: alpha(PRIMARY, 0.08), color: PRIMARY, borderRadius: "999px", fontWeight: 700 }} />}
            </Stack>
          )}
        </Paper>
      )}

      <Grid container spacing={isMobile ? 2 : 3}>
        {/* ── Calendar ───────────────────────────────────────────────────── */}
        <Grid item xs={12} md={5} lg={4}>
          <GlassCard sx={{ borderColor: alpha(PRIMARY, 0.12) }}>
            <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2.75 }}>
                <Stack direction="row" spacing={1.25} alignItems="center">
                  <Box
                    sx={{
                      width: 42,
                      height: 42,
                      borderRadius: "14px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#fff",
                      background: `linear-gradient(135deg, ${PRIMARY}, #7c3aed)`,
                      boxShadow: `0 12px 24px ${alpha(PRIMARY, 0.22)}`,
                    }}
                  >
                    <CalendarToday sx={{ fontSize: 20 }} />
                  </Box>
                  <Box>
                    <Typography variant="h6" fontWeight={900} sx={{ color: "#0f172a", lineHeight: 1.1 }}>
                      {currentMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                    </Typography>
                    <Typography variant="caption" sx={{ color: "#64748b", fontWeight: 600 }}>
                      Monthly attendance overview
                    </Typography>
                  </Box>
                </Stack>
                <Stack direction="row" spacing={0.5}>
                  {[{ icon: <ChevronLeft fontSize="small" />, dir: -1 }, { icon: <ChevronRight fontSize="small" />, dir: 1 }].map(({ icon, dir }) => (
                    <IconButton
                      key={dir}
                      size="small"
                      onClick={() => setCurrentMonth((d) => new Date(d.getFullYear(), d.getMonth() + dir, 1))}
                      sx={{
                        bgcolor: "#f8fafc",
                        border: `1px solid ${alpha(PRIMARY, 0.1)}`,
                        color: "#475569",
                        boxShadow: "0 6px 16px rgba(15,23,42,0.06)",
                        "&:hover": { bgcolor: alpha(PRIMARY, 0.1), color: PRIMARY },
                      }}
                    >
                      {icon}
                    </IconButton>
                  ))}
                </Stack>
              </Stack>
              <Grid container columns={7} spacing={0.5} sx={{ mb: 0.75 }}>
                {DOW.map((d) => (
                  <Grid item xs={1} key={d}>
                    <Typography
                      align="center"
                      variant="caption"
                      fontWeight={900}
                      sx={{
                        display: "block",
                        fontSize: "0.62rem",
                        color: "#94a3b8",
                        letterSpacing: "0.04em",
                      }}
                    >
                      {d}
                    </Typography>
                  </Grid>
                ))}
              </Grid>
              <Grid container columns={7} spacing={0.55}>
                {calendarDays.map((c, i) => (
                  <Grid item xs={1} key={i}>
                    <CalCell
                      day={c.day}
                      isPrev={c.isPrev}
                      isSelected={c.date?.toDateString() === selectedDate.toDateString()}
                      isToday={c.date?.toDateString() === new Date().toDateString()}
                      isWeekend={c.date && c.date.getDay() === 0}
                      status={c.status}
                      onClick={() => !c.isPrev && c.date && handleDateSelect(c.date)}
                    />
                  </Grid>
                ))}
              </Grid>
              {/* ── Legend ── */}
              <Box sx={{ mt: 2.75, pt: 2.25, borderTop: `1px solid ${alpha(PRIMARY, 0.1)}` }}>
                <Grid container spacing={1.1}>
                  {[
                    ["Present",  SUCCESS,   "#dcfce7"],
                    ["Late",     WARNING,   "#fef9c3"],
                    ["Absent",   DANGER,    "#fecaca"],
                    ["Leave",    "#a855f7", "#f3e8ff"],
                    ["Holiday",  "#3b82f6", "#dbeafe"],
                  ].map(([l, dotColor, bg]) => (
                    <Grid item xs={6} key={l}>
                      <Stack
                        direction="row"
                        spacing={0.75}
                        alignItems="center"
                        sx={{
                          px: 1,
                          py: 0.75,
                          borderRadius: "12px",
                          bgcolor: "#f8fafc",
                          border: `1px solid ${alpha(dotColor, 0.12)}`,
                        }}
                      >
                        <Box sx={{ width: 14, height: 14, borderRadius: "6px", bgcolor: bg, border: `1.5px solid ${alpha(dotColor, 0.4)}`, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <Box sx={{ width: 5, height: 5, borderRadius: "50%", bgcolor: dotColor }} />
                        </Box>
                        <Typography variant="caption" sx={{ color: "#475569", fontWeight: 700 }}>{l}</Typography>
                      </Stack>
                    </Grid>
                  ))}
                </Grid>
              </Box>
            </CardContent>
          </GlassCard>
        </Grid>

        {/* ── Log ────────────────────────────────────────────────────────── */}
        <Grid item xs={12} md={7} lg={8}>
          <GlassCard sx={{ height: "100%", borderColor: alpha(PRIMARY, 0.12) }}>
            <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2.75 }}>
                <Stack direction="row" spacing={1.25} alignItems="center">
                  <Box
                    sx={{
                      width: 42,
                      height: 42,
                      borderRadius: "14px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: PRIMARY,
                      bgcolor: alpha(PRIMARY, 0.1),
                      border: `1px solid ${alpha(PRIMARY, 0.16)}`,
                    }}
                  >
                    <AccessTime sx={{ fontSize: 21 }} />
                  </Box>
                  <Box>
                    <Typography variant="h6" fontWeight={900} sx={{ color: "#0f172a", lineHeight: 1.1 }}>Attendance Log</Typography>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography variant="caption" sx={{ color: "#64748b", fontWeight: 600 }}>{mergedLog.length} total records</Typography>
                  </Stack>
                  </Box>
                </Stack>
                <Stack direction="row" spacing={1} alignItems="center">
                  {isMobile && mergedLog.length > 0 && <BulkExportMenu selectedRecords={[]} allRecords={attendances || []} onSnack={showSnack} />}
                  <Button
                    size="small"
                    variant="contained"
                    startIcon={<History sx={{ fontSize: 17 }} />}
                    onClick={showHistory}
                    sx={{
                      borderRadius: "999px",
                      px: 1.75,
                      py: 0.8,
                      color: "#fff",
                      fontWeight: 800,
                      textTransform: "none",
                      background: "linear-gradient(135deg, #f97316, #ea580c)",
                      boxShadow: "0 8px 18px rgba(249,115,22,0.28)",
                      "&:hover": {
                        background: "linear-gradient(135deg, #ea580c, #c2410c)",
                        boxShadow: "0 10px 22px rgba(234,88,12,0.34)",
                      },
                    }}
                  >
                    History
                  </Button>
                  {loading && <CircularProgress size={20} sx={{ color: PRIMARY }} />}
                </Stack>
              </Stack>

              {mergedLog.length > 0 ? (
                <>
                  {isMobile ? (
                    <Box>
                      {mergedLog.map((a, i) => (
                        <MobileLogCard key={a._id || a.id} entry={a} index={i} />
                      ))}
                    </Box>
                  ) : (
                    <TableContainer
                      sx={{
                        maxHeight: 520,
                        overflowX: "auto",
                        borderRadius: "20px",
                        border: `1px solid ${alpha(PRIMARY, 0.1)}`,
                        bgcolor: alpha(PRIMARY, 0.025),
                        p: 1,
                        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.75)",
                        "&::-webkit-scrollbar": { height: 9, width: 9 },
                        "&::-webkit-scrollbar-track": { bgcolor: alpha(PRIMARY, 0.06), borderRadius: "999px" },
                        "&::-webkit-scrollbar-thumb": { bgcolor: alpha(PRIMARY, 0.32), borderRadius: "999px" },
                        "&::-webkit-scrollbar-thumb:hover": { bgcolor: alpha(PRIMARY, 0.46) },
                      }}
                    >
                      <Table stickyHeader size="small" sx={{ minWidth: 640, borderCollapse: "separate", borderSpacing: "0 8px" }}>
                        <TableHead
                          sx={{
                            position: "sticky",
                            top: 0,
                            zIndex: 3,
                          }}
                        >
                          <TableRow>
                            {["Date", "Punch In", "Punch Out", "Hours", "Status"].map((h) => (
                              <TableCell
                                key={h}
                                sx={{
                                  top: 0,
                                  zIndex: 4,
                                  py: 1.25,
                                  bgcolor: "#eef4ff",
                                  color: "#475569",
                                  fontWeight: 900,
                                  fontSize: "0.7rem",
                                  letterSpacing: "0.04em",
                                  textTransform: "uppercase",
                                  borderBottom: "none",
                                  ...(h === "Date" && {
                                    borderTopLeftRadius: "14px",
                                    borderBottomLeftRadius: "14px",
                                  }),
                                  ...(h === "Status" && {
                                    borderTopRightRadius: "14px",
                                    borderBottomRightRadius: "14px",
                                  }),
                                  width:
                                    h === "Date" ? 120 :
                                     h === "Punch In" ? 130 :
                                     h === "Punch Out" ? 140 :
                                     h === "Hours" ? 110 : 180,
                                }}
                              >
                                {h}
                              </TableCell>
                            ))}
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {mergedLog.map((a) => {
                            const id          = a._id || a.id;
                            const isAbsent    = a._isAbsentRow;
                            return (
                              <TableRow
                                key={id}
                                hover={!isAbsent}
                                sx={{
                                  "& td": {
                                    borderBottom: "none",
                                    bgcolor: isAbsent ? alpha(DANGER, 0.035) : "#fff",
                                    py: 1.35,
                                    boxShadow: "0 8px 20px rgba(15,23,42,0.035)",
                                    transition: "background .18s ease, box-shadow .18s ease",
                                  },
                                  "& td:first-of-type": {
                                    borderTopLeftRadius: "14px",
                                    borderBottomLeftRadius: "14px",
                                    borderLeft: isAbsent
                                      ? `4px solid ${alpha(DANGER, 0.55)}`
                                      : `4px solid ${alpha(PRIMARY, 0.2)}`,
                                  },
                                  "& td:last-of-type": {
                                    borderTopRightRadius: "14px",
                                    borderBottomRightRadius: "14px",
                                  },
                                  "&:hover td": {
                                    bgcolor: isAbsent ? alpha(DANGER, 0.06) : alpha(PRIMARY, 0.035),
                                    boxShadow: "0 12px 26px rgba(15,23,42,0.055)",
                                  },
                                  "&.Mui-selected td": { bgcolor: alpha(PRIMARY, 0.06) },
                                  "&.Mui-selected:hover td": { bgcolor: alpha(PRIMARY, 0.085) },
                                }}
                              >
                                <TableCell>
                                  <Typography
                                    variant="body2"
                                    fontWeight={600}
                                    color={isAbsent ? DANGER : "inherit"}
                                    sx={{ wordBreak: "break-word" }}
                                  >
                                    {fmtDate(a.date)}
                                  </Typography>
                                </TableCell>
                                <TableCell>
                                  {a.punchIn
                                    ? <Chip
                                        label={fmtTime(a.punchIn.time)}
                                        size="small"
                                        sx={{
                                          bgcolor: a.status === "late" ? alpha(WARNING, 0.12) : alpha(SUCCESS, 0.1),
                                          color:   a.status === "late" ? WARNING : SUCCESS,
                                          fontWeight: 700, fontSize: "0.72rem",
                                        }}
                                      />
                                    : <Typography variant="body2" color="text.disabled">—</Typography>}
                                </TableCell>
                               <TableCell>
  {a.punchOut ? (
    <Stack direction="row" spacing={0.5} alignItems="center">
      <Chip
        label={fmtTime(a.punchOut.time)}
        size="small"
        sx={{
          bgcolor: a.punchOut.isAutoPunchOut ? alpha(WARNING, 0.08) : alpha(WARNING, 0.1),
          color: WARNING,
          fontWeight: 700,
          fontSize: "0.72rem",
          border: a.punchOut.isAutoPunchOut ? `1px dashed ${alpha(WARNING, 0.5)}` : "none",
        }}
      />
      {a.punchOut.isAutoPunchOut && <AutoPunchOutChip />}
    </Stack>
  ) : a.punchIn ? (
    <Chip label="Ongoing" size="small" variant="outlined" sx={{ color: PRIMARY, borderColor: PRIMARY, fontWeight: 700 }} />
  ) : (
    <Typography variant="body2" color="text.disabled">—</Typography>
  )}
</TableCell>
                                <TableCell>
                                  <Typography
                                    variant="body2"
                                    fontWeight={700}
                                    color={isAbsent ? DANGER : PRIMARY}
                                    sx={{ wordBreak: "break-word", lineHeight: 1.2 }}
                                  >
                                    {a.workHoursFormatted || "—"}
                                  </Typography>
                                </TableCell>
                                <TableCell>
  <Stack spacing={0.5} alignItems="flex-start" sx={{ maxWidth: "100%" }}>
    <StatusBadge status={a.status || "present"} />
    {a.missedPunchOut && <MissedPunchOutChip />}
    <OffDayWorkChip entry={a} />
  </Stack>
</TableCell>

                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}

                  {pagination?.totalPages > 1 && (
                    <Box display="flex" justifyContent="center" sx={{ mt: 2.5 }}>
                      <Pagination count={pagination.totalPages} page={filters.page} onChange={(_, v) => { setFilters((p) => ({ ...p, page: v })); containerRef.current?.scrollIntoView({ behavior: "smooth" }); }} color="primary" shape="rounded" size={isMobile ? "small" : "medium"} sx={{ "& .MuiPaginationItem-root.Mui-selected": { bgcolor: PRIMARY, color: "#fff" } }} />
                    </Box>
                  )}
                </>
              ) : (
                <Box sx={{ textAlign: "center", py: 7 }}>
                  <Box sx={{ width: 80, height: 80, borderRadius: "50%", bgcolor: alpha(PRIMARY, 0.08), display: "flex", alignItems: "center", justifyContent: "center", mx: "auto", mb: 2 }}>
                    <CalendarToday sx={{ fontSize: 36, color: PRIMARY }} />
                  </Box>
                  <Typography variant="h6" fontWeight={600} gutterBottom>No records found</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: activeFilterCount ? 2.5 : 0 }}>
                    {activeFilterCount ? "No records match your current filters." : "Attendance records will appear here."}
                  </Typography>
                  {activeFilterCount > 0 && <Button variant="contained" startIcon={<Clear />} onClick={clearFilters} sx={{ bgcolor: PRIMARY, borderRadius: 2 }}>Clear Filters</Button>}
                </Box>
              )}
            </CardContent>
          </GlassCard>
        </Grid>
      </Grid>

      {/* ── Filter Drawer ───────────────────────────────────────────────── */}
      <SwipeableDrawer anchor="bottom" open={drawerOpen} onClose={() => setDrawerOpen(false)} onOpen={() => {}} PaperProps={{ sx: { borderTopLeftRadius: 24, borderTopRightRadius: 24 } }}>
        <Box sx={{ width: 40, height: 4, bgcolor: "grey.300", borderRadius: 2, mx: "auto", my: 1.5 }} />
        <Box sx={{ px: 3, pb: 3 }}>
          <Typography variant="h6" fontWeight={700} color={PRIMARY} sx={{ mb: 2.5 }}>Filter Attendance</Typography>
          <Stack spacing={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Status</InputLabel>
              <Select value={filters.status} label="Status" sx={{ borderRadius: 2 }} onChange={(e) => setFilter("status")(e.target.value)}>
                <MenuItem value="">All Statuses</MenuItem>
                {Object.entries(STATUS_CONFIG).map(([k, v]) => <MenuItem key={k} value={k}>{v.label}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl fullWidth size="small">
              <InputLabel>Period</InputLabel>
              <Select value={period} label="Period" sx={{ borderRadius: 2 }} onChange={(e) => setPeriod(e.target.value)}>
                {PERIOD_OPTIONS.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
              </Select>
            </FormControl>
            <Stack direction="row" spacing={1.5}>
              <Button fullWidth variant="outlined" startIcon={<Clear />} onClick={() => { clearFilters(); setDrawerOpen(false); }} sx={{ borderRadius: 2, borderColor: alpha(PRIMARY, 0.35), color: PRIMARY }}>Clear</Button>
              <Button fullWidth variant="contained" onClick={() => setDrawerOpen(false)} sx={{ borderRadius: 2, bgcolor: PRIMARY }}>Apply</Button>
            </Stack>
          </Stack>
        </Box>
      </SwipeableDrawer>

      {isMobile && (
        <Zoom in>
          <Fab size="medium" onClick={() => setDrawerOpen(true)} sx={{ position: "fixed", bottom: 80, right: 16, zIndex: 1000, bgcolor: PRIMARY, color: "#fff", boxShadow: `0 4px 16px ${alpha(PRIMARY, 0.38)}`, "&:hover": { bgcolor: SECONDARY } }}>
            <Badge badgeContent={activeFilterCount} color="error"><FilterAlt /></Badge>
          </Fab>
        </Zoom>
      )}

      {isMobile && (
        <Paper sx={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 1000, borderRadius: 0, borderTop: `1px solid ${alpha(PRIMARY, 0.1)}` }} elevation={3}>
          <BottomNavigation showLabels value={navValue}
            onChange={(_, v) => {
              setNavValue(v);
              if (v === 0) isAdminView ? navigate(-1) : window.scrollTo({ top: 0, behavior: "smooth" });
              else if (v === 1) navigate("/dashboard");
            }}
            sx={{ height: 60, "& .Mui-selected": { color: PRIMARY } }}
          >
            <BottomNavigationAction label={isAdminView ? "Back" : "Attendance"} icon={isAdminView ? <ArrowBack /> : <CalendarToday />} />
            <BottomNavigationAction label="Dashboard" icon={<Dashboard />} />
          </BottomNavigation>
        </Paper>
      )}

      <AttendanceDetails open={logOpen} onClose={() => setLogOpen(false)} attendance={selLog} canEdit={canManage} canDelete={canDelete} onDelete={handleDeleteOpen} />

      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 4, overflow: "hidden" } }}>
        <Box sx={{ height: 5, bgcolor: DANGER }} />
        <DialogTitle sx={{ pt: 2.5, pb: 1 }}><Typography variant="h6" fontWeight={700}>Confirm Delete</Typography></DialogTitle>
        <DialogContent>
          <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>This action cannot be undone.</Alert>
          {deleteTarget && (
            <Paper elevation={0} sx={{ p: 2, borderRadius: 2, bgcolor: alpha(DANGER, 0.04), border: `1px solid ${alpha(DANGER, 0.12)}` }}>
              <Typography variant="body2"><strong>Date:</strong> {fmtDate(deleteTarget.date)}<br /><strong>Status:</strong> {deleteTarget.status}</Typography>
            </Paper>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, gap: 1.5, borderTop: `1px solid ${alpha(DANGER, 0.08)}` }}>
          <Button variant="outlined" onClick={() => setDeleteOpen(false)} sx={{ borderRadius: 2, borderColor: alpha(PRIMARY, 0.35), color: PRIMARY }}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleDeleteConfirm} sx={{ borderRadius: 2 }}>Delete</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snackbar.open} autoHideDuration={3500} onClose={() => { setSnackbar((s) => ({ ...s, open: false })); clearMessages(); }} anchorOrigin={{ vertical: isMobile ? "top" : "bottom", horizontal: isMobile ? "center" : "right" }}>
        <Alert severity={snackbar.severity} variant="filled" sx={{ borderRadius: 2, color: "#fff", fontWeight: 600 }}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
  
}
