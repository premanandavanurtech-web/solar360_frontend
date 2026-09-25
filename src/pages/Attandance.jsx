// pages/Attendance.jsx (Dark Theme matching exact target screenshot design)
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
import { toBackendAssetUrl } from "../utils/backendAssetUrl";
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
import { API_ORIGIN } from "../utils/apiConfig";

// ─── Constants & Dark Palette ──────────────────────────────────────────────────
const API = API_ORIGIN;

// ─── Theme Colors ──────────────────────────────────────────────────────────────
const PALETTE = {
  blue: "#3b82f6",
  green: "#10b981",
  amber: "#f59e0b",
  red: "#ef4444",
  orange: "#d97706",
};

const getColors = (isDark) => ({
  isDark,
  bg: isDark ? "#060a12" : "#f6f8fc",
  card: isDark ? "#0e1424" : "#ffffff",
  cardHover: isDark ? "#131b30" : "#f8fafc",
  cardHeader: isDark ? "#0b101c" : "#ffffff",
  tableHead: isDark ? "#090d18" : "#f8fafc",
  border: isDark ? "rgba(255, 255, 255, 0.08)" : "#e2e8f0",
  inputBg: isDark ? "#0e1424" : "#f8fafc",
  inputBorder: isDark ? "rgba(255, 255, 255, 0.15)" : "#cbd5e1",
  text: isDark ? "#f8fafc" : "#0f172a",
  textSub: isDark ? "#94a3b8" : "#475569",
  textMuted: isDark ? "#64748b" : "#64748b",
  blue: PALETTE.blue,
  green: PALETTE.green,
  amber: PALETTE.amber,
  red: PALETTE.red,
  orange: PALETTE.orange,
});

const MANAGER_ROLES = ["ADMIN", "PROJECT_HEAD", "MANAGER", "SUPERVISOR"];

const PERIOD_OPTIONS = [
  { value: "Today", label: "Today" },
  { value: "This Week", label: "This Week" },
  { value: "This Month", label: "This Month" },
  { value: "All", label: "All Time" },
];

const STATUS_CONFIG = {
  present: { bg: "rgba(16, 185, 129, 0.12)", color: PALETTE.green, icon: <CheckCircle sx={{ fontSize: 14 }} />, label: "Present" },
  absent: { bg: "rgba(239, 68, 68, 0.12)", color: PALETTE.red, icon: <ErrorIcon sx={{ fontSize: 14 }} />, label: "Absent" },
  late: { bg: "rgba(245, 158, 11, 0.12)", color: PALETTE.amber, icon: <Warning sx={{ fontSize: 14 }} />, label: "Late" },
  leave: { bg: "rgba(168, 85, 247, 0.12)", color: "#c084fc", icon: <Person sx={{ fontSize: 14 }} />, label: "Leave" },
  holiday: { bg: "rgba(59, 130, 246, 0.12)", color: PALETTE.blue, icon: <CalendarToday sx={{ fontSize: 14 }} />, label: "Holiday" },
};

const DOW = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

const DEMO_FALLBACK_ROWS = [
  { dateKey: "2026-08-01", dateFormatted: "Aug 01, 2026", punchInTime: "09:08 AM", punchOutTime: "Ongoing", hours: "00:00", status: "Present" },
  { dateKey: "2026-07-31", dateFormatted: "Jul 31, 2026", punchInTime: "—", punchOutTime: "—", hours: "00:00", status: "Absent" },
  { dateKey: "2026-07-30", dateFormatted: "Jul 30, 2026", punchInTime: "—", punchOutTime: "—", hours: "00:00", status: "Absent" },
  { dateKey: "2026-07-29", dateFormatted: "Jul 29, 2026", punchInTime: "—", punchOutTime: "—", hours: "00:00", status: "Absent" },
  { dateKey: "2026-07-28", dateFormatted: "Jul 28, 2026", punchInTime: "09:45 AM", punchOutTime: "06:44 PM", hours: "07:59", status: "Present" },
  { dateKey: "2026-07-27", dateFormatted: "Jul 27, 2026", punchInTime: "—", punchOutTime: "—", hours: "00:00", status: "Absent" },
  { dateKey: "2026-07-26", dateFormatted: "Jul 26, 2026", punchInTime: "—", punchOutTime: "—", hours: "00:00", status: "Absent" },
  { dateKey: "2026-07-25", dateFormatted: "Jul 25, 2026", punchInTime: "09:49 AM", punchOutTime: "Ongoing", hours: "00:00", status: "Present" },
];

const fmtDate = (ts) =>
  !ts ? "—" : new Date(ts).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });

const fmtTime = (ts) =>
  !ts ? "—" : new Date(ts).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });

// ─── StatusBadge ──────────────────────────────────────────────────────────────
const StatusBadge = ({ status, size = "small" }) => {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.present;
  return (
    <Chip
      size={size}
      label={cfg.label}
      icon={cfg.icon}
      sx={{
        bgcolor: cfg.bg,
        color: cfg.color,
        fontWeight: 800,
        border: `1px solid ${alpha(cfg.color, 0.3)}`,
        borderRadius: "999px",
        height: 24,
        fontSize: "0.72rem",
        "& .MuiChip-icon": { color: cfg.color },
      }}
    />
  );
};

// ─── useWorkTimer ─────────────────────────────────────────────────────────────
function useWorkTimer() {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [startTime, setStartTime] = useState(null);
  const [isActive, setIsActive] = useState(false);
  const timerRef = useRef(null);
  const pad = (n) => String(n).padStart(2, "0");
  const formatTimeStr = useCallback(
    (s) => `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`, []
  );
  const start = useCallback((ts = new Date()) => { setStartTime(ts); setIsActive(true); }, []);
  const stop = useCallback(() => {
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
        () => setElapsedSeconds(differenceInSeconds(new Date(), new Date(startTime))), 1000
      );
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isActive, startTime]);
  return { elapsedSeconds, formattedTime: formatTimeStr(elapsedSeconds), isActive, start, stop, reset };
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Attendance() {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const COLOR = useMemo(() => getColors(isDark), [isDark]);
  const navigate = useNavigate();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const { userId: paramUserId } = useParams();
  const location = useLocation();
  const memberInfo = location.state || {};
  const isAdminView = !!paramUserId;

  const { user, getCanonicalUserRole, safeFetchAPI } = useAuth();
  const { socketRef } = useSocket();
  const {
    attendances, loading, error, success, pagination, summary,
    fetchAttendances, punchIn, punchOut, clearMessages,
  } = useAttendance();
  const geo = useGeo();
  const timer = useWorkTimer();

  const userRole = getCanonicalUserRole();
  const isTeam = userRole === "INSTALLER";
  const isManagerRole = MANAGER_ROLES.includes(userRole);
  const showPunchControls = !isAdminView && !isManagerRole;

  const [todayAtt, setTodayAtt] = useState(null);
  useEffect(() => {
    const ts = new Date().toDateString();
    const found = attendances?.find((a) => new Date(a.date).toDateString() === ts) || null;
    setTodayAtt(found);
    if (!isAdminView) {
      if (found?.punchIn && !found?.punchOut) timer.start(found.punchIn.time);
      else if (found?.punchOut) timer.stop();
      else timer.reset();
    }
  }, [attendances]);

  const hasPunchedIn = !!todayAtt?.punchIn;
  const hasPunchedOut = !!todayAtt?.punchOut;

  const [period, setPeriod] = useState("This Month");
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [filters, setFilters] = useState({ page: 1, limit: 200, status: "", search: "" });
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
  const [exportAnchorEl, setExportAnchorEl] = useState(null);
  const [tablePage, setTablePage] = useState(1);
  const rowsPerPage = 8;
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedAttendance, setSelectedAttendance] = useState(null);

  const showSnack = useCallback((msg, sev = "success") => setSnackbar({ open: true, message: msg, severity: sev }), []);

  // Fetch full employee profile to guarantee joiningDate & createdAt are never lost on month change
  const [profileUser, setProfileUser] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const loadUserProfile = async () => {
      const targetId = paramUserId || user?._id || user?.id;
      if (!targetId) return;
      try {
        const res = await safeFetchAPI(`/user/getUserById/${targetId}`);
        const uData = res?.data || res?.result || (res?.success ? res?.user : null);
        if (isMounted && uData) {
          setProfileUser(uData);
        }
      } catch (e) {
        console.error("Failed to load user profile in attendance:", e);
      }
    };
    loadUserProfile();
    return () => { isMounted = false; };
  }, [paramUserId, user, safeFetchAPI]);

  // Employee Joining Date - persistent from profileUser, memberInfo, user, or attendance payload
  const targetUserObj = profileUser || attendances?.[0]?.user || (!isAdminView ? user : null);
  const rawJoinDate =
    memberInfo.joiningDate ||
    memberInfo.memberCreatedAt ||
    memberInfo.createdAt ||
    profileUser?.joiningDate ||
    profileUser?.createdAt ||
    targetUserObj?.joiningDate ||
    targetUserObj?.createdAt;
  const joiningDateObj = useMemo(() => (rawJoinDate ? new Date(rawJoinDate) : null), [rawJoinDate]);
  const isValidJoinDate = joiningDateObj && !Number.isNaN(joiningDateObj.getTime());
  const joiningDateKey = isValidJoinDate ? format(joiningDateObj, "yyyy-MM-dd") : null;
  const joiningDateFormatted = isValidJoinDate ? fmtDate(joiningDateObj) : null;

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
    const currentView = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    return currentView.getTime() > minMonth.getTime();
  }, [minMonth, currentMonth]);

  const canGoNextMonth = useMemo(() => {
    const currentView = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    return currentView.getTime() < maxMonth.getTime();
  }, [maxMonth, currentMonth]);

  // Clamp currentMonth strictly within [minMonth, maxMonth] boundaries
  // If the view was in June 2024 or earlier, this immediately snaps it back to joining month
  useEffect(() => {
    const currentView = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    if (minMonth && currentView.getTime() < minMonth.getTime()) {
      setCurrentMonth(new Date(minMonth));
      setSelectedDate(null);
    } else if (currentView.getTime() > maxMonth.getTime()) {
      setCurrentMonth(new Date(maxMonth));
      setSelectedDate(null);
    }
  }, [minMonth, maxMonth, currentMonth]);

  const currentMonthYear = currentMonth.getFullYear();
  const currentMonthMonth = currentMonth.getMonth();

  const loadData = useCallback(async () => {
    const dates = {};
    if (period === "Today") {
      const todayStr = format(new Date(), "yyyy-MM-dd");
      dates.startDate = todayStr;
      dates.endDate = todayStr;
    } else if (period === "This Week") {
      const now = new Date();
      const firstDayOfWeek = new Date(now);
      firstDayOfWeek.setDate(now.getDate() - now.getDay());
      const lastDayOfWeek = new Date(firstDayOfWeek);
      lastDayOfWeek.setDate(firstDayOfWeek.getDate() + 6);
      dates.startDate = format(firstDayOfWeek, "yyyy-MM-dd");
      dates.endDate = format(lastDayOfWeek, "yyyy-MM-dd");
    } else if (period === "All") {
      if (joiningDateObj && !Number.isNaN(joiningDateObj.getTime())) {
        dates.startDate = format(joiningDateObj, "yyyy-MM-dd");
      }
      dates.endDate = format(new Date(), "yyyy-MM-dd");
    } else {
      // Default & "This Month": fetch records for the active currentMonth
      const isJoiningMonth = joiningDateObj && currentMonthYear === joiningDateObj.getFullYear() && currentMonthMonth === joiningDateObj.getMonth();
      const startDay = isJoiningMonth ? joiningDateObj.getDate() : 1;
      dates.startDate = format(new Date(currentMonthYear, currentMonthMonth, startDay), "yyyy-MM-dd");
      dates.endDate = format(new Date(currentMonthYear, currentMonthMonth + 1, 0), "yyyy-MM-dd");
    }

    const q = {
      page: 1,
      limit: 200,
      ...(paramUserId ? { userId: paramUserId } : isTeam && user?._id ? { userId: user._id } : {}),
      ...dates,
    };
    await fetchAttendances(q);
  }, [period, currentMonthYear, currentMonthMonth, isTeam, user?._id, fetchAttendances, paramUserId, rawJoinDate]);

  useEffect(() => { loadData(); }, [loadData]);

  // Combined Rows for the active month view
  const mergedRows = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // If month is prior to joining month, return no rows
    if (minMonth && new Date(year, month, 1).getTime() < minMonth.getTime()) {
      return [];
    }

    // Map existing records from API by dateKey (yyyy-MM-dd)
    const existingMap = new Map();
    (attendances || []).forEach((item) => {
      const itemDate = new Date(item.date || item.createdAt);
      const dateKey = format(itemDate, "yyyy-MM-dd");
      const dateFormatted = fmtDate(itemDate);
      const punchInTime = item.punchIn?.time ? fmtTime(item.punchIn.time) : "—";
      const punchOutTime = item.punchOut?.time ? fmtTime(item.punchOut.time) : item.punchIn?.time ? "Ongoing" : "—";
      const hoursNum = Number(item.workHours || 0);
      const h = Math.floor(hoursNum);
      const m = Math.round((hoursNum - h) * 60);
      const hours = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
      const status = item.status
        ? item.status.charAt(0).toUpperCase() + item.status.slice(1).toLowerCase()
        : item.punchIn?.time
        ? "Present"
        : "Absent";

      existingMap.set(dateKey, {
        dateKey,
        dateFormatted,
        punchInTime,
        punchOutTime,
        hours,
        status,
        rawDate: itemDate,
      });
    });

    // Build daily rows for currentMonth
    const rows = [];
    const isCurrentCalendarMonth = year === today.getFullYear() && month === today.getMonth();
    const isPastCalendarMonth = new Date(year, month + 1, 0) < today;

    const maxDay = isCurrentCalendarMonth
      ? today.getDate()
      : isPastCalendarMonth
      ? daysInMonth
      : 0;

    // In the joining month, start strictly from the joining day (no rows prior to joining date)
    const isJoiningMonth = joiningDateObj && year === joiningDateObj.getFullYear() && month === joiningDateObj.getMonth();
    const minDay = isJoiningMonth ? joiningDateObj.getDate() : 1;

    for (let d = maxDay; d >= minDay; d--) {
      const cellDate = new Date(year, month, d);
      const dateKey = format(cellDate, "yyyy-MM-dd");
      const isJoiningDate = dateKey === joiningDateKey;

      if (existingMap.has(dateKey)) {
        const row = existingMap.get(dateKey);
        rows.push({
          ...row,
          isJoiningDate,
        });
      } else {
        const isSunday = cellDate.getDay() === 0;
        rows.push({
          dateKey,
          dateFormatted: fmtDate(cellDate),
          punchInTime: "—",
          punchOutTime: "—",
          hours: "00:00",
          status: isSunday ? "Holiday" : "Absent",
          rawDate: cellDate,
          isJoiningDate,
          isBeforeJoining: false,
        });
      }
    }

    return rows;
  }, [attendances, currentMonth, joiningDateKey, joiningDateObj, minMonth]);

  // Filtered rows
  const filteredRows = useMemo(() => {
    return mergedRows.filter((r) => {
      if (selectedDate) {
        const selKey = format(selectedDate, "yyyy-MM-dd");
        if (r.dateKey !== selKey) return false;
      }
      if (filters.status && r.status.toLowerCase() !== filters.status.toLowerCase()) return false;
      if (filters.search) {
        const q = filters.search.toLowerCase();
        if (!r.dateFormatted.toLowerCase().includes(q) && !r.status.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [mergedRows, selectedDate, filters.search, filters.status]);

  // Paginated Table rows
  const totalTablePages = Math.ceil(filteredRows.length / rowsPerPage) || 1;
  const paginatedRows = useMemo(() => {
    const start = (tablePage - 1) * rowsPerPage;
    return filteredRows.slice(start, start + rowsPerPage);
  }, [filteredRows, tablePage]);

  // Summary counts
  const totalDaysCount = mergedRows.length;
  const presentCount = mergedRows.filter((r) => r.status.toLowerCase() === "present" || (r.punchInTime && r.punchInTime !== "—")).length;
  const lateCount = mergedRows.filter((r) => r.status.toLowerCase() === "late").length;
  const absentCount = mergedRows.filter((r) => r.status.toLowerCase() === "absent").length;
  let workHoursTotal = 0;
  mergedRows.forEach((r) => {
    if (r.hours && r.hours !== "00:00") {
      const [h, m] = r.hours.split(":").map(Number);
      workHoursTotal += (h || 0) + (m || 0) / 60;
    }
  });

  // Calendar Day Cells
  const calendarCells = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const cells = [];
    const prevDays = new Date(year, month, 0).getDate();
    for (let i = firstDay - 1; i >= 0; i--) {
      cells.push({ day: prevDays - i, isCurrent: false });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const cellDate = new Date(year, month, d, 0, 0, 0, 0);
      const isPast = cellDate < today;
      const isToday = cellDate.getTime() === today.getTime();
      const isFuture = cellDate > today;
      const isSunday = cellDate.getDay() === 0;

      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const isJoiningDate = dateStr === joiningDateKey;
      const isBeforeJoiningMonth = minMonth && new Date(year, month, 1).getTime() < minMonth.getTime();
      const isBeforeJoiningDay = isValidJoinDate && cellDate < new Date(joiningDateObj.getFullYear(), joiningDateObj.getMonth(), joiningDateObj.getDate());
      const isBeforeJoining = isBeforeJoiningMonth || isBeforeJoiningDay;

      const match = mergedRows.find((r) => r.dateKey === dateStr);

      let dayStatus = null;
      if (isBeforeJoining) {
        dayStatus = null;
      } else if (match) {
        dayStatus = match.status.toLowerCase();
      } else if (isSunday) {
        dayStatus = "holiday";
      } else if (isPast) {
        dayStatus = "absent";
      } else if (isToday) {
        dayStatus = todayAtt?.punchIn ? "present" : "absent";
      } else {
        dayStatus = null;
      }

      cells.push({
        day: d,
        isCurrent: true,
        status: dayStatus,
        dateKey: dateStr,
        isPast,
        isToday,
        isFuture,
        isJoiningDate,
        isBeforeJoining,
      });
    }
    const remaining = 35 - cells.length;
    const extra = remaining < 0 ? 42 - cells.length : remaining;
    for (let d = 1; d <= extra; d++) {
      cells.push({ day: d, isCurrent: false });
    }
    return cells;
  }, [currentMonth, mergedRows, todayAtt, joiningDateKey, joiningDateObj]);

  // Display metadata
  const displayName =
    (profileUser?.firstName ? `${profileUser.firstName} ${profileUser.lastName || ""}`.trim() : profileUser?.name) ||
    memberInfo.memberName ||
    (user?.firstName ? `${user.firstName} ${user.lastName || ""}`.trim() : user?.name) ||
    "Employee";
  const displayRole = profileUser?.role || memberInfo.memberRole || user?.role || "TEAM";
  const displayPhone = profileUser?.phoneNumber || profileUser?.phone || memberInfo.memberPhone || user?.phone || user?.phoneNumber || "";
  const displayEmail = profileUser?.email || memberInfo.memberEmail || user?.email || "";
  const displayAvatar = displayName.charAt(0).toUpperCase();
  const displayAvatarUrl = toBackendAssetUrl(
    profileUser?.profileImage || profileUser?.avatar || memberInfo.memberAvatar || memberInfo.profileImage || memberInfo.avatar || (!isAdminView ? (user?.avatar || user?.profileImage || user?.photo) : null)
  );

  const targetEmployeeId = paramUserId || profileUser?._id || user?._id || user?.id;
  const resolvedTargetUser = useMemo(() => ({
    _id: targetEmployeeId,
    name: displayName,
    email: displayEmail,
    phone: displayPhone,
    role: displayRole,
    firstName: profileUser?.firstName || user?.firstName || displayName,
    lastName: profileUser?.lastName || user?.lastName || "",
  }), [targetEmployeeId, displayName, displayEmail, displayPhone, displayRole, profileUser, user]);

  // Helper to open AttendanceDetails modal for a clicked date or table row
  const openAttendanceForDate = useCallback((dateStr, cellDate, optionalRow = null) => {
    const matchRow = optionalRow || mergedRows.find((r) => r.dateKey === dateStr);
    const matchedAtt = attendances?.find((a) => {
      const aDate = new Date(a.date || a.createdAt);
      return format(aDate, "yyyy-MM-dd") === dateStr;
    });

    const isToday = format(new Date(), "yyyy-MM-dd") === dateStr;
    const defaultStatus = matchRow?.status || (cellDate.getDay() === 0 ? "Holiday" : cellDate > new Date() ? "Upcoming" : isToday && todayAtt?.punchIn ? "Present" : "Absent");

    const attToDisplay = matchedAtt ? {
      ...matchedAtt,
      userId: targetEmployeeId,
      user: matchedAtt.user?._id ? matchedAtt.user : { ...resolvedTargetUser, ...(matchedAtt.user || {}) },
    } : {
      _id: `rec-${dateStr}`,
      userId: targetEmployeeId,
      date: cellDate,
      status: defaultStatus,
      workHours: matchRow?.hours || "00:00",
      workHoursFormatted: matchRow?.hours || "00:00",
      punchIn: matchRow?.punchInTime && matchRow?.punchInTime !== "—" ? { time: matchRow.punchInTime } : (isToday && todayAtt?.punchIn ? todayAtt.punchIn : null),
      punchOut: matchRow?.punchOutTime && matchRow?.punchOutTime !== "—" && matchRow?.punchOutTime !== "Ongoing" ? { time: matchRow.punchOutTime } : (isToday && todayAtt?.punchOut ? todayAtt.punchOut : null),
      user: resolvedTargetUser,
      createdAt: cellDate,
      updatedAt: cellDate,
    };

    setSelectedAttendance(attToDisplay);
    setDetailsOpen(true);
  }, [attendances, mergedRows, targetEmployeeId, resolvedTargetUser, todayAtt]);

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: COLOR.bg, color: COLOR.text, p: { xs: 1.5, md: 3 } }}>
      <Box sx={{ maxWidth: 1400, mx: "auto" }}>

        {/* ── Breadcrumb ── */}
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
          <Typography
            sx={{ fontSize: "0.78rem", color: COLOR.textMuted, cursor: "pointer", "&:hover": { color: COLOR.blue } }}
            onClick={() => navigate("/team-attendance")}
          >
            Team
          </Typography>
          <Typography sx={{ fontSize: "0.78rem", color: COLOR.textMuted }}>&gt;</Typography>
          <Typography sx={{ fontSize: "0.78rem", fontWeight: 700, color: COLOR.text }}>
            {displayName}
          </Typography>
        </Stack>

        {/* ── Header Banner Card ── */}
        <Paper
          elevation={0}
          sx={{
            p: { xs: 2, md: 2.5 },
            borderRadius: "18px",
            background: "linear-gradient(135deg, #090e1a 0%, #111736 40%, #1f1347 100%)",
            border: `1px solid ${COLOR.border}`,
            boxShadow: "0 12px 32px rgba(0, 0, 0, 0.4)",
            mb: 2.5,
          }}
        >
          <Stack direction={{ xs: "column", md: "row" }} spacing={2} justifyContent="space-between" alignItems={{ xs: "flex-start", md: "center" }}>
            <Stack direction="row" spacing={2} alignItems="center">
              <IconButton
                onClick={() => navigate(-1)}
                sx={{
                  bgcolor: "rgba(255,255,255,0.08)",
                  color: "#fff",
                  width: 38,
                  height: 38,
                  borderRadius: "50%",
                  border: "1px solid rgba(255,255,255,0.12)",
                  "&:hover": { bgcolor: "rgba(255,255,255,0.16)" },
                }}
              >
                <ArrowBack sx={{ fontSize: 18 }} />
              </IconButton>
              
              <Avatar
                src={displayAvatarUrl}
                sx={{
                  width: { xs: 54, md: 66 },
                  height: { xs: 54, md: 66 },
                  bgcolor: "#3b82f6",
                  color: "#fff",
                  fontWeight: 800,
                  fontSize: "1.4rem",
                  border: "2.5px solid rgba(255, 255, 255, 0.25)",
                  boxShadow: "0 6px 20px rgba(0, 0, 0, 0.4)",
                  flexShrink: 0,
                }}
              >
                {displayAvatar}
              </Avatar>

              <Box>
                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                  <Typography variant="h6" fontWeight={800} sx={{ color: "#fff", letterSpacing: "-0.01em" }}>
                    {displayName}
                  </Typography>
                  <Chip
                    label={displayRole}
                    size="small"
                    sx={{
                      bgcolor: "rgba(59, 130, 246, 0.18)",
                      color: "#93c5fd",
                      fontWeight: 800,
                      height: 22,
                      fontSize: "0.68rem",
                      border: "1px solid rgba(59, 130, 246, 0.3)",
                    }}
                  />
                  {displayPhone && (
                    <Stack direction="row" spacing={0.5} alignItems="center" sx={{ color: COLOR.textSub, fontSize: "0.78rem", ml: 1 }}>
                      <Phone sx={{ fontSize: 13 }} />
                      <span>{displayPhone}</span>
                    </Stack>
                  )}
                  {displayEmail && (
                    <Stack direction="row" spacing={0.5} alignItems="center" sx={{ color: COLOR.textSub, fontSize: "0.78rem" }}>
                      <Email sx={{ fontSize: 13 }} />
                      <span>{displayEmail}</span>
                    </Stack>
                  )}
                  {joiningDateFormatted && (
                    <Chip
                      label={`Joined: ${joiningDateFormatted}`}
                      size="small"
                      sx={{
                        bgcolor: "rgba(168, 85, 247, 0.18)",
                        color: "#d8b4fe",
                        fontWeight: 800,
                        height: 22,
                        fontSize: "0.68rem",
                        border: "1px solid rgba(168, 85, 247, 0.35)",
                        ml: { xs: 0, sm: 1 },
                      }}
                    />
                  )}
                </Stack>
              </Box>
            </Stack>

            <Stack direction="row" spacing={1.5} alignItems="center">
              <Button
                variant="outlined"
                endIcon={<ExpandMore />}
                onClick={(e) => setExportAnchorEl(e.currentTarget)}
                sx={{
                  color: "#fff",
                  borderColor: "rgba(255,255,255,0.2)",
                  bgcolor: "rgba(255,255,255,0.06)",
                  borderRadius: "10px",
                  height: 38,
                  px: 2,
                  textTransform: "none",
                  fontWeight: 700,
                  fontSize: "0.82rem",
                  "&:hover": { bgcolor: "rgba(255,255,255,0.12)" },
                }}
              >
                Export
              </Button>
              <Menu
                anchorEl={exportAnchorEl}
                open={Boolean(exportAnchorEl)}
                onClose={() => setExportAnchorEl(null)}
                PaperProps={{
                  sx: { bgcolor: COLOR.card, color: COLOR.text, border: `1px solid ${COLOR.border}`, borderRadius: "12px" },
                }}
              >
                <MenuItem onClick={() => { generateCSV(attendances); setExportAnchorEl(null); }} sx={{ fontSize: "0.85rem", fontWeight: 600 }}>
                  Export as CSV (.csv)
                </MenuItem>
              </Menu>

              <Button
                variant="outlined"
                startIcon={<Refresh />}
                onClick={loadData}
                sx={{
                  color: "#fff",
                  borderColor: "rgba(255,255,255,0.2)",
                  bgcolor: "rgba(255,255,255,0.06)",
                  borderRadius: "10px",
                  height: 38,
                  px: 2,
                  textTransform: "none",
                  fontWeight: 700,
                  fontSize: "0.82rem",
                  "&:hover": { bgcolor: "rgba(255,255,255,0.12)" },
                }}
              >
                Refresh
              </Button>
            </Stack>
          </Stack>

          <Stack direction="row" spacing={4} sx={{ mt: 2.5, pt: 2, borderTop: "1px solid rgba(255,255,255,0.08)" }}>
            <Box>
              <Typography variant="caption" sx={{ color: COLOR.textMuted, fontSize: "0.7rem", fontWeight: 600, display: "block" }}>
                Total Records
              </Typography>
              <Typography variant="h6" fontWeight={900} sx={{ color: "#fff", lineHeight: 1.2 }}>
                {mergedRows.length}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" sx={{ color: COLOR.textMuted, fontSize: "0.7rem", fontWeight: 600, display: "block" }}>
                Period
              </Typography>
              <Typography variant="h6" fontWeight={900} sx={{ color: "#fff", lineHeight: 1.2 }}>
                {period}
              </Typography>
            </Box>
          </Stack>
        </Paper>

        {/* ── 5 Stat Summary Cards Grid ── */}
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "repeat(2, 1fr)", sm: "repeat(3, 1fr)", md: "repeat(5, 1fr)" }, gap: 1.5, mb: 2.5 }}>
          
          {/* Card 1: Total Days */}
          <Paper elevation={0} sx={{ p: 2, borderRadius: "16px", bgcolor: COLOR.card, border: `1px solid ${COLOR.border}`, position: "relative", overflow: "hidden" }}>
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
              <Box sx={{ width: 36, height: 36, borderRadius: "10px", bgcolor: "rgba(255,255,255,0.06)", display: "grid", placeItems: "center", color: COLOR.textSub }}>
                <CalendarToday sx={{ fontSize: 18 }} />
              </Box>
              <Typography variant="h4" fontWeight={900} sx={{ color: COLOR.text }}>
                {totalDaysCount}
              </Typography>
            </Stack>
            <Box sx={{ mt: 1.5 }}>
              <Typography variant="body2" fontWeight={800} sx={{ color: COLOR.text, fontSize: "0.82rem" }}>
                Total Days
              </Typography>
              <Typography variant="caption" sx={{ color: COLOR.textMuted, fontSize: "0.7rem" }}>
                All records
              </Typography>
            </Box>
            <Box sx={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 3, bgcolor: COLOR.blue }} />
          </Paper>

          {/* Card 2: Work Hours */}
          <Paper elevation={0} sx={{ p: 2, borderRadius: "16px", bgcolor: COLOR.card, border: `1px solid ${COLOR.border}`, position: "relative", overflow: "hidden" }}>
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
              <Box sx={{ width: 36, height: 36, borderRadius: "10px", bgcolor: alpha(COLOR.blue, 0.12), display: "grid", placeItems: "center", color: COLOR.blue }}>
                <AccessTime sx={{ fontSize: 18 }} />
              </Box>
              <Typography variant="h4" fontWeight={900} sx={{ color: COLOR.blue }}>
                {workHoursTotal.toFixed(1)}h
              </Typography>
            </Stack>
            <Box sx={{ mt: 1.5 }}>
              <Typography variant="body2" fontWeight={800} sx={{ color: COLOR.text, fontSize: "0.82rem" }}>
                Work Hours
              </Typography>
              <Typography variant="caption" sx={{ color: COLOR.textMuted, fontSize: "0.7rem" }}>
                Total logged
              </Typography>
            </Box>
            <Box sx={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 3, bgcolor: COLOR.blue }} />
          </Paper>

          {/* Card 3: Present */}
          <Paper elevation={0} sx={{ p: 2, borderRadius: "16px", bgcolor: COLOR.card, border: `1px solid ${COLOR.border}`, position: "relative", overflow: "hidden" }}>
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
              <Box sx={{ width: 36, height: 36, borderRadius: "10px", bgcolor: alpha(COLOR.green, 0.15), display: "grid", placeItems: "center", color: COLOR.green }}>
                <CheckCircle sx={{ fontSize: 18 }} />
              </Box>
              <Typography variant="h4" fontWeight={900} sx={{ color: COLOR.green }}>
                {presentCount}
              </Typography>
            </Stack>
            <Box sx={{ mt: 1.5 }}>
              <Typography variant="body2" fontWeight={800} sx={{ color: COLOR.text, fontSize: "0.82rem" }}>
                Present
              </Typography>
              <Typography variant="caption" sx={{ color: COLOR.textMuted, fontSize: "0.7rem" }}>
                On time days
              </Typography>
            </Box>
            <Box sx={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 3, bgcolor: COLOR.green }} />
          </Paper>

          {/* Card 4: Late */}
          <Paper elevation={0} sx={{ p: 2, borderRadius: "16px", bgcolor: COLOR.card, border: `1px solid ${COLOR.border}`, position: "relative", overflow: "hidden" }}>
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
              <Box sx={{ width: 36, height: 36, borderRadius: "10px", bgcolor: alpha(COLOR.amber, 0.15), display: "grid", placeItems: "center", color: COLOR.amber }}>
                <Warning sx={{ fontSize: 18 }} />
              </Box>
              <Typography variant="h4" fontWeight={900} sx={{ color: COLOR.amber }}>
                {lateCount}
              </Typography>
            </Stack>
            <Box sx={{ mt: 1.5 }}>
              <Typography variant="body2" fontWeight={800} sx={{ color: COLOR.text, fontSize: "0.82rem" }}>
                Late
              </Typography>
              <Typography variant="caption" sx={{ color: COLOR.textMuted, fontSize: "0.7rem" }}>
                Late arrivals
              </Typography>
            </Box>
            <Box sx={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 3, bgcolor: COLOR.amber }} />
          </Paper>

          {/* Card 5: Absent */}
          <Paper elevation={0} sx={{ p: 2, borderRadius: "16px", bgcolor: COLOR.card, border: `1px solid ${COLOR.border}`, position: "relative", overflow: "hidden" }}>
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
              <Box sx={{ width: 36, height: 36, borderRadius: "10px", bgcolor: alpha(COLOR.red, 0.15), display: "grid", placeItems: "center", color: COLOR.red }}>
                <ErrorIcon sx={{ fontSize: 18 }} />
              </Box>
              <Typography variant="h4" fontWeight={900} sx={{ color: COLOR.red }}>
                {absentCount}
              </Typography>
            </Stack>
            <Box sx={{ mt: 1.5 }}>
              <Typography variant="body2" fontWeight={800} sx={{ color: COLOR.text, fontSize: "0.82rem" }}>
                Absent
              </Typography>
              <Typography variant="caption" sx={{ color: COLOR.textMuted, fontSize: "0.7rem" }}>
                Days missed
              </Typography>
            </Box>
            <Box sx={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 3, bgcolor: COLOR.red }} />
          </Paper>

        </Box>

        {/* ── Search & Filter Control Bar ── */}
        <Paper
          elevation={0}
          sx={{
            p: 1.75,
            px: 2,
            borderRadius: "16px",
            bgcolor: COLOR.cardHeader,
            border: `1px solid ${COLOR.border}`,
            mb: 2.5,
          }}
        >
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems="center" justifyContent="space-between" flexWrap="wrap">
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems="center" sx={{ width: { xs: "100%", sm: "auto" } }}>
              <TextField
                placeholder="Search records..."
                value={filters.search}
                onChange={(e) => setFilters((p) => ({ ...p, search: e.target.value }))}
                size="small"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search sx={{ color: COLOR.textMuted, fontSize: 18 }} />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  width: { xs: "100%", sm: 260 },
                  "& .MuiOutlinedInput-root": {
                    bgcolor: COLOR.inputBg,
                    borderRadius: "10px",
                    color: COLOR.text,
                    fontSize: "0.85rem",
                    "& fieldset": { borderColor: COLOR.inputBorder },
                    "&:hover fieldset": { borderColor: COLOR.blue },
                    "&.Mui-focused fieldset": { borderColor: COLOR.blue },
                    "& input": { color: COLOR.text },
                    "& input::placeholder": { color: COLOR.textMuted, opacity: 1 },
                  },
                }}
              />

              <Select
                value={filters.status}
                onChange={(e) => setFilters((p) => ({ ...p, status: e.target.value }))}
                size="small"
                displayEmpty
                sx={{
                  minWidth: 130,
                  bgcolor: COLOR.inputBg,
                  borderRadius: "10px",
                  color: COLOR.text,
                  fontSize: "0.85rem",
                  "& .MuiSelect-select": { color: COLOR.text, fontWeight: 500 },
                  "& .MuiOutlinedInput-notchedOutline": { borderColor: COLOR.inputBorder },
                  "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: COLOR.blue },
                  "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: COLOR.blue },
                  "& .MuiSvgIcon-root": { color: COLOR.textMuted },
                }}
              >
                <MenuItem value="">Status: All</MenuItem>
                <MenuItem value="present">Status: Present</MenuItem>
                <MenuItem value="absent">Status: Absent</MenuItem>
                <MenuItem value="late">Status: Late</MenuItem>
              </Select>

              <Select
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                size="small"
                sx={{
                  minWidth: 150,
                  bgcolor: COLOR.inputBg,
                  borderRadius: "10px",
                  color: COLOR.text,
                  fontSize: "0.85rem",
                  "& .MuiSelect-select": { color: COLOR.text, fontWeight: 500 },
                  "& .MuiOutlinedInput-notchedOutline": { borderColor: COLOR.inputBorder },
                  "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: COLOR.blue },
                  "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: COLOR.blue },
                  "& .MuiSvgIcon-root": { color: COLOR.textMuted },
                }}
              >
                {PERIOD_OPTIONS.map((o) => (
                  <MenuItem key={o.value} value={o.value}>Period: {o.label}</MenuItem>
                ))}
              </Select>
            </Stack>

            {(filters.search || filters.status || (period && period !== "All" && period !== "all") || selectedDate) && (
              <Button
                size="small"
                onClick={() => { setFilters({ page: 1, limit: 200, status: "", search: "" }); setPeriod("All"); setSelectedDate(null); }}
                startIcon={<Close sx={{ fontSize: 14 }} />}
                sx={{ color: COLOR.red, textTransform: "none", fontWeight: 700, fontSize: "0.82rem" }}
              >
                Clear All
              </Button>
            )}
          </Stack>

          {/* Active filter badges - only show when filters are actually active */}
          {(filters.search || filters.status || (period && period !== "All" && period !== "all") || selectedDate) && (
            <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mt: 1.5, pt: 1.25, borderTop: `1px solid ${COLOR.border}` }}>
              {selectedDate && (
                <Chip
                  size="small"
                  label={`Date: ${format(selectedDate, "MMM dd, yyyy")}`}
                  onDelete={() => setSelectedDate(null)}
                  sx={{
                    bgcolor: COLOR.isDark ? "rgba(16, 185, 129, 0.15)" : "#e6f4ea",
                    color: COLOR.green,
                    border: `1px solid rgba(16, 185, 129, 0.3)`,
                    borderRadius: "8px",
                    fontSize: "0.72rem",
                    fontWeight: 700,
                    "& .MuiChip-deleteIcon": { color: COLOR.green, "&:hover": { color: COLOR.text } },
                  }}
                />
              )}
              {period && period !== "All" && period !== "all" && (
                <Chip
                  size="small"
                  label={`Period: ${period}`}
                  onDelete={() => setPeriod("All")}
                  sx={{
                    bgcolor: COLOR.isDark ? "rgba(255,255,255,0.08)" : "#f1f5f9",
                    color: COLOR.text,
                    border: `1px solid ${COLOR.border}`,
                    borderRadius: "8px",
                    fontSize: "0.72rem",
                    fontWeight: 700,
                    "& .MuiChip-deleteIcon": { color: COLOR.textSub, "&:hover": { color: COLOR.text } },
                  }}
                />
              )}
              {filters.status && (
                <Chip
                  size="small"
                  label={`Status: ${filters.status}`}
                  onDelete={() => setFilters((p) => ({ ...p, status: "" }))}
                  sx={{
                    bgcolor: COLOR.isDark ? "rgba(255,255,255,0.08)" : "#f1f5f9",
                    color: COLOR.text,
                    border: `1px solid ${COLOR.border}`,
                    borderRadius: "8px",
                    fontSize: "0.72rem",
                    fontWeight: 700,
                    "& .MuiChip-deleteIcon": { color: COLOR.textSub, "&:hover": { color: COLOR.text } },
                  }}
                />
              )}
              {filters.search && (
                <Chip
                  size="small"
                  label={`Search: "${filters.search}"`}
                  onDelete={() => setFilters((p) => ({ ...p, search: "" }))}
                  sx={{
                    bgcolor: COLOR.isDark ? "rgba(255,255,255,0.08)" : "#f1f5f9",
                    color: COLOR.text,
                    border: `1px solid ${COLOR.border}`,
                    borderRadius: "8px",
                    fontSize: "0.72rem",
                    fontWeight: 700,
                    "& .MuiChip-deleteIcon": { color: COLOR.textSub, "&:hover": { color: COLOR.text } },
                  }}
                />
              )}
            </Stack>
          )}
        </Paper>

        {/* ── 2-Column Content Layout ── */}
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "340px 1fr" }, gap: 2.5 }}>
          
          {/* Left Column: Monthly Calendar View */}
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              borderRadius: "18px",
              bgcolor: COLOR.card,
              border: `1px solid ${COLOR.border}`,
              height: "fit-content",
            }}
          >
            {/* Header */}
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
              <Box>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Box sx={{ width: 28, height: 28, borderRadius: "8px", bgcolor: "rgba(147, 51, 234, 0.15)", color: "#c084fc", display: "grid", placeItems: "center" }}>
                    <CalendarToday sx={{ fontSize: 15 }} />
                  </Box>
                  <Typography variant="subtitle1" fontWeight={800} sx={{ color: COLOR.text }}>
                    {currentMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                  </Typography>
                </Stack>
                <Typography variant="caption" sx={{ color: COLOR.textMuted, fontSize: "0.72rem", display: "block", mt: 0.2 }}>
                  Monthly attendance overview
                </Typography>
              </Box>

              <Stack direction="row" spacing={0.5}>
                <Tooltip title={!canGoPrevMonth ? "Cannot go before joining month" : "Previous Month"}>
                  <span>
                    <IconButton
                      size="small"
                      disabled={!canGoPrevMonth}
                      onClick={() => {
                        if (!canGoPrevMonth) return;
                        setCurrentMonth((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
                        setSelectedDate(null);
                        setTablePage(1);
                      }}
                      sx={{
                        color: canGoPrevMonth ? COLOR.textSub : COLOR.textMuted,
                        border: `1px solid ${COLOR.border}`,
                        borderRadius: "8px",
                        opacity: canGoPrevMonth ? 1 : 0.25,
                        cursor: canGoPrevMonth ? "pointer" : "not-allowed",
                        "&.Mui-disabled": {
                          opacity: 0.25,
                          cursor: "not-allowed",
                          pointerEvents: "auto",
                        },
                      }}
                    >
                      <ChevronLeft sx={{ fontSize: 16 }} />
                    </IconButton>
                  </span>
                </Tooltip>
                <Tooltip title={!canGoNextMonth ? "Cannot go to future months" : "Next Month"}>
                  <span>
                    <IconButton
                      size="small"
                      disabled={!canGoNextMonth}
                      onClick={() => {
                        if (!canGoNextMonth) return;
                        setCurrentMonth((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));
                        setSelectedDate(null);
                        setTablePage(1);
                      }}
                      sx={{
                        color: canGoNextMonth ? COLOR.textSub : COLOR.textMuted,
                        border: `1px solid ${COLOR.border}`,
                        borderRadius: "8px",
                        opacity: canGoNextMonth ? 1 : 0.25,
                        cursor: canGoNextMonth ? "pointer" : "not-allowed",
                        "&.Mui-disabled": {
                          opacity: 0.25,
                          cursor: "not-allowed",
                          pointerEvents: "auto",
                        },
                      }}
                    >
                      <ChevronRight sx={{ fontSize: 16 }} />
                    </IconButton>
                  </span>
                </Tooltip>
              </Stack>
            </Stack>

            {/* Days Header */}
            <Box sx={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 0.5, mb: 1, textAlign: "center" }}>
              {DOW.map((day) => (
                <Typography key={day} variant="caption" fontWeight={800} sx={{ color: COLOR.textMuted, fontSize: "0.65rem" }}>
                  {day}
                </Typography>
              ))}
            </Box>

            {/* Calendar Cells Grid */}
            <Box sx={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 0.75, mb: 3 }}>
              {calendarCells.map((cell, idx) => {
                if (!cell.isCurrent) {
                  return (
                    <Box
                      key={`empty-${idx}`}
                      sx={{
                        height: 36,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: isDark ? "rgba(255,255,255,0.2)" : "#cbd5e1",
                        fontSize: "0.75rem",
                        fontWeight: 600,
                      }}
                    >
                      {cell.day}
                    </Box>
                  );
                }

                const isSelected = selectedDate ? cell.dateKey === format(selectedDate, "yyyy-MM-dd") : false;
                const isJoining = cell.isJoiningDate;
                const isBeforeJoining = cell.isBeforeJoining;
                const isPresent = cell.status === "present";
                const isAbsent = cell.status === "absent";
                const isHoliday = cell.status === "holiday";
                const isLate = cell.status === "late";

                return (
                  <Box
                    key={`day-${cell.day}`}
                    onClick={() => {
                      if (isBeforeJoining) return;
                      const cellDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), cell.day);
                      const cellDateStr = format(cellDate, "yyyy-MM-dd");
                      setSelectedDate(cellDate);
                      setTablePage(1);
                      openAttendanceForDate(cellDateStr, cellDate);
                    }}
                    title={isBeforeJoining ? "Before joining date" : isJoining ? "Employee Joining Date (Click to view details)" : "Click to view attendance details"}
                    sx={{
                      height: 36,
                      borderRadius: "10px",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: isBeforeJoining ? "not-allowed" : "pointer",
                      opacity: isBeforeJoining ? 0.28 : 1,
                      fontSize: "0.78rem",
                      fontWeight: 800,
                      position: "relative",
                      transition: "all 0.15s ease",
                      bgcolor: isBeforeJoining
                        ? "transparent"
                        : isSelected
                        ? "rgba(16, 185, 129, 0.18)"
                        : isJoining
                        ? "rgba(168, 85, 247, 0.2)"
                        : isPresent
                        ? "rgba(16, 185, 129, 0.1)"
                        : isAbsent
                        ? "rgba(239, 68, 68, 0.1)"
                        : isHoliday
                        ? "rgba(59, 130, 246, 0.1)"
                        : "rgba(255,255,255,0.03)",
                      color: isBeforeJoining
                        ? COLOR.textMuted
                        : isJoining
                        ? "#c084fc"
                        : isPresent
                        ? COLOR.green
                        : isAbsent
                        ? COLOR.red
                        : isHoliday
                        ? COLOR.blue
                        : COLOR.text,
                      border: isBeforeJoining
                        ? `1px dashed ${COLOR.border}`
                        : isSelected
                        ? `2px solid ${COLOR.green}`
                        : isJoining
                        ? `2px solid #a855f7`
                        : isPresent
                        ? `1px solid rgba(16, 185, 129, 0.3)`
                        : isAbsent
                        ? `1px solid rgba(239, 68, 68, 0.3)`
                        : `1px solid ${COLOR.border}`,
                      "&:hover": {
                        transform: isBeforeJoining ? "none" : "translateY(-1px)",
                        bgcolor: isBeforeJoining
                          ? "transparent"
                          : isJoining
                          ? "rgba(168, 85, 247, 0.3)"
                          : isPresent
                          ? "rgba(16, 185, 129, 0.2)"
                          : "rgba(255,255,255,0.08)",
                      },
                    }}
                  >
                    {cell.day}
                    {isJoining && (
                      <Box
                        sx={{
                          position: "absolute",
                          top: 2,
                          right: 2,
                          width: 5,
                          height: 5,
                          borderRadius: "50%",
                          bgcolor: "#a855f7",
                          boxShadow: "0 0 6px #a855f7",
                        }}
                      />
                    )}
                    {!isBeforeJoining && (isPresent || isAbsent || isHoliday || isLate) && (
                      <Box
                        sx={{
                          position: "absolute",
                          bottom: 3,
                          width: 4,
                          height: 4,
                          borderRadius: "50%",
                          bgcolor: isPresent ? COLOR.green : isAbsent ? COLOR.red : isHoliday ? COLOR.blue : COLOR.amber,
                        }}
                      />
                    )}
                  </Box>
                );
              })}
            </Box>

            {/* Calendar Legend */}
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ pt: 2, borderTop: `1px solid ${COLOR.border}` }}>
              <Chip
                size="small"
                icon={<Box sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: COLOR.green, ml: "8px !important" }} />}
                label="Present"
                sx={{ bgcolor: COLOR.cardHeader, color: COLOR.textSub, border: `1px solid ${COLOR.border}`, fontSize: "0.7rem", fontWeight: 700, height: 26 }}
              />
              <Chip
                size="small"
                icon={<Box sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: "#a855f7", ml: "8px !important" }} />}
                label="Joining Date"
                sx={{ bgcolor: COLOR.cardHeader, color: COLOR.textSub, border: `1px solid ${COLOR.border}`, fontSize: "0.7rem", fontWeight: 700, height: 26 }}
              />
              <Chip
                size="small"
                icon={<Box sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: COLOR.amber, ml: "8px !important" }} />}
                label="Leave"
                sx={{ bgcolor: COLOR.cardHeader, color: COLOR.textSub, border: `1px solid ${COLOR.border}`, fontSize: "0.7rem", fontWeight: 700, height: 26 }}
              />
              <Chip
                size="small"
                icon={<Box sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: COLOR.blue, ml: "8px !important" }} />}
                label="Holiday"
                sx={{ bgcolor: COLOR.cardHeader, color: COLOR.textSub, border: `1px solid ${COLOR.border}`, fontSize: "0.7rem", fontWeight: 700, height: 26 }}
              />
              <Chip
                size="small"
                icon={<Box sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: COLOR.red, ml: "8px !important" }} />}
                label="Absent"
                sx={{ bgcolor: COLOR.cardHeader, color: COLOR.textSub, border: `1px solid ${COLOR.border}`, fontSize: "0.7rem", fontWeight: 700, height: 26 }}
              />
            </Stack>
          </Paper>

          {/* Right Column: Attendance Log Table Card */}
          <Paper
            elevation={0}
            sx={{
              borderRadius: "18px",
              bgcolor: COLOR.card,
              border: `1px solid ${COLOR.border}`,
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {/* Table Header Bar */}
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ px: 3, py: 2, borderBottom: `1px solid ${COLOR.border}`, bgcolor: COLOR.cardHeader }}>
              <Box>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Box sx={{ width: 28, height: 28, borderRadius: "8px", bgcolor: alpha(COLOR.blue, 0.15), color: COLOR.blue, display: "grid", placeItems: "center" }}>
                    <AccessTime sx={{ fontSize: 16 }} />
                  </Box>
                  <Typography variant="subtitle1" fontWeight={800} sx={{ color: COLOR.text }}>
                    Attendance Log — {selectedDate ? format(selectedDate, "MMM dd, yyyy") : currentMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                  </Typography>
                </Stack>
                <Typography variant="caption" sx={{ color: COLOR.textMuted, fontSize: "0.72rem", display: "block", mt: 0.2 }}>
                  {filteredRows.length} record{filteredRows.length === 1 ? "" : "s"} for {selectedDate ? format(selectedDate, "MMM dd, yyyy") : currentMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                </Typography>
              </Box>

              <Button
                variant="contained"
                disableElevation
                startIcon={<History sx={{ fontSize: 16 }} />}
                onClick={() =>
                  navigate(isAdminView ? `/attendance-history/${paramUserId}` : "/attendance-history/me", {
                    state: {
                      userId: paramUserId || user?._id || user?.id,
                      memberName:
                        memberInfo.memberName ||
                        (user?.name || `${user?.firstName || ""} ${user?.lastName || ""}`).trim(),
                      memberRole: memberInfo.memberRole || userRole,
                      memberCreatedAt: user?.createdAt,
                      initialAttendances: attendances,
                    },
                  })
                }
                sx={{
                  bgcolor: COLOR.orange,
                  color: "#fff",
                  fontWeight: 800,
                  fontSize: "0.78rem",
                  borderRadius: "10px",
                  height: 34,
                  px: 2,
                  textTransform: "none",
                  boxShadow: "0 4px 12px rgba(217, 119, 6, 0.25)",
                  "&:hover": { bgcolor: "#b45309" },
                }}
              >
                History
              </Button>
            </Stack>

            {/* Table Content */}
            <TableContainer sx={{ flex: 1 }}>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: COLOR.bg }}>
                    {["DATE", "PUNCH IN", "PUNCH OUT", "HOURS", "STATUS"].map((head) => (
                      <TableCell key={head} sx={{ color: COLOR.textMuted, fontWeight: 800, fontSize: "0.68rem", letterSpacing: "0.05em", py: 1.5, borderColor: COLOR.border }}>
                        {head}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>

                <TableBody>
                  {loading && mergedRows.length === 0 ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell colSpan={5} sx={{ borderColor: COLOR.border, py: 1.5 }}>
                          <Skeleton variant="text" width="100%" height={30} sx={{ bgcolor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)" }} />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : paginatedRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} sx={{ textAlign: "center", py: 6, color: COLOR.textMuted, borderColor: COLOR.border }}>
                        No records match your filters.
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedRows.map((row, idx) => {
                      const isPresent = row.status.toLowerCase() === "present";
                      const isAbsent = row.status.toLowerCase() === "absent";
                      const isLate = row.status.toLowerCase() === "late";

                      return (
                        <TableRow
                          key={row.dateKey + idx}
                          onClick={() => {
                            const cellDate = new Date(row.rawDate || row.dateKey);
                            openAttendanceForDate(row.dateKey, cellDate, row);
                          }}
                          sx={{
                            borderBottom: `1px solid ${COLOR.border}`,
                            cursor: "pointer",
                            transition: "background-color 0.15s ease",
                            "&:hover": { bgcolor: COLOR.cardHover },
                          }}
                        >
                          {/* Date */}
                          <TableCell sx={{ color: COLOR.text, fontWeight: 700, fontSize: "0.82rem", borderColor: COLOR.border, py: 1.75 }}>
                            <Stack direction="row" spacing={1} alignItems="center">
                              <span>{row.dateFormatted}</span>
                              {row.isJoiningDate && (
                                <Chip
                                  label="Joined 🎉"
                                  size="small"
                                  sx={{
                                    height: 20,
                                    fontSize: "0.65rem",
                                    fontWeight: 800,
                                    bgcolor: "rgba(168, 85, 247, 0.18)",
                                    color: "#c084fc",
                                    border: "1px solid rgba(168, 85, 247, 0.35)",
                                  }}
                                />
                              )}
                            </Stack>
                          </TableCell>

                          {/* Punch In */}
                          <TableCell sx={{ borderColor: COLOR.border, py: 1.75 }}>
                            {row.punchInTime !== "—" ? (
                              <Box
                                sx={{
                                  display: "inline-flex",
                                  px: 1.2,
                                  py: 0.4,
                                  borderRadius: "8px",
                                  bgcolor: "rgba(16, 185, 129, 0.12)",
                                  border: "1px solid rgba(16, 185, 129, 0.3)",
                                  color: "#34d399",
                                  fontWeight: 700,
                                  fontSize: "0.75rem",
                                }}
                              >
                                {row.punchInTime}
                              </Box>
                            ) : (
                              <Typography sx={{ color: COLOR.textMuted, fontSize: "0.82rem" }}>—</Typography>
                            )}
                          </TableCell>

                          {/* Punch Out */}
                          <TableCell sx={{ borderColor: COLOR.border, py: 1.75 }}>
                            {row.punchOutTime === "Ongoing" ? (
                              <Box
                                sx={{
                                  display: "inline-flex",
                                  px: 1.2,
                                  py: 0.4,
                                  borderRadius: "8px",
                                  bgcolor: "rgba(59, 130, 246, 0.15)",
                                  border: "1px solid rgba(59, 130, 246, 0.3)",
                                  color: "#60a5fa",
                                  fontWeight: 700,
                                  fontSize: "0.75rem",
                                }}
                              >
                                Ongoing
                              </Box>
                            ) : row.punchOutTime !== "—" ? (
                              <Box
                                sx={{
                                  display: "inline-flex",
                                  px: 1.2,
                                  py: 0.4,
                                  borderRadius: "8px",
                                  bgcolor: "rgba(245, 158, 11, 0.12)",
                                  border: "1px solid rgba(245, 158, 11, 0.3)",
                                  color: "#fbbf24",
                                  fontWeight: 700,
                                  fontSize: "0.75rem",
                                }}
                              >
                                {row.punchOutTime}
                              </Box>
                            ) : (
                              <Typography sx={{ color: COLOR.textMuted, fontSize: "0.82rem" }}>—</Typography>
                            )}
                          </TableCell>

                          {/* Hours */}
                          <TableCell sx={{ color: COLOR.text, fontWeight: 700, fontSize: "0.82rem", borderColor: COLOR.border, py: 1.75 }}>
                            {row.hours}
                          </TableCell>

                          {/* Status Badge */}
                          <TableCell sx={{ borderColor: COLOR.border, py: 1.75 }}>
                            {(() => {
                              const isHoliday = row.status.toLowerCase() === "holiday";
                              const chipBg = isPresent
                                ? "rgba(16, 185, 129, 0.12)"
                                : isAbsent
                                ? "rgba(239, 68, 68, 0.12)"
                                : isHoliday
                                ? "rgba(59, 130, 246, 0.12)"
                                : "rgba(245, 158, 11, 0.12)";
                              const chipColor = isPresent
                                ? COLOR.green
                                : isAbsent
                                ? COLOR.red
                                : isHoliday
                                ? COLOR.blue
                                : COLOR.amber;

                              return (
                                <Chip
                                  size="small"
                                  icon={
                                    isPresent ? (
                                      <CheckCircle sx={{ fontSize: "14px !important", color: `${chipColor} !important` }} />
                                    ) : isAbsent ? (
                                      <ErrorIcon sx={{ fontSize: "14px !important", color: `${chipColor} !important` }} />
                                    ) : isHoliday ? (
                                      <CalendarToday sx={{ fontSize: "14px !important", color: `${chipColor} !important` }} />
                                    ) : (
                                      <Warning sx={{ fontSize: "14px !important", color: `${chipColor} !important` }} />
                                    )
                                  }
                                  label={row.status}
                                  sx={{
                                    height: 24,
                                    borderRadius: "999px",
                                    fontWeight: 800,
                                    fontSize: "0.72rem",
                                    bgcolor: chipBg,
                                    color: chipColor,
                                    border: `1px solid ${alpha(chipColor, 0.35)}`,
                                  }}
                                />
                              );
                            })()}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Pagination Bar */}
            <Stack direction="row" justifyContent="center" alignItems="center" spacing={1} sx={{ py: 2, px: 3, borderTop: `1px solid ${COLOR.border}`, bgcolor: COLOR.cardHeader }}>
              <IconButton
                size="small"
                disabled={tablePage === 1}
                onClick={() => setTablePage((prev) => Math.max(prev - 1, 1))}
                sx={{ color: COLOR.textSub, "&.Mui-disabled": { opacity: 0.3 } }}
              >
                <ChevronLeft sx={{ fontSize: 18 }} />
              </IconButton>

              {Array.from({ length: totalTablePages }, (_, i) => i + 1).map((pageNum) => (
                <Box
                  key={pageNum}
                  onClick={() => setTablePage(pageNum)}
                  sx={{
                    width: 28,
                    height: 28,
                    borderRadius: "8px",
                    display: "grid",
                    placeItems: "center",
                    cursor: "pointer",
                    fontSize: "0.78rem",
                    fontWeight: 800,
                    bgcolor: tablePage === pageNum ? COLOR.blue : "transparent",
                    color: tablePage === pageNum ? "#fff" : COLOR.textSub,
                    "&:hover": { bgcolor: tablePage === pageNum ? COLOR.blue : "rgba(255,255,255,0.06)" },
                  }}
                >
                  {pageNum}
                </Box>
              ))}

              <IconButton
                size="small"
                disabled={tablePage === totalTablePages}
                onClick={() => setTablePage((prev) => Math.min(prev + 1, totalTablePages))}
                sx={{ color: COLOR.textSub, "&.Mui-disabled": { opacity: 0.3 } }}
              >
                <ChevronRight sx={{ fontSize: 18 }} />
              </IconButton>
            </Stack>

          </Paper>

        </Box>

      </Box>

      {/* ── Attendance Details Modal Dialog ── */}
      <AttendanceDetails
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        attendance={selectedAttendance}
        canEdit={isAdminView}
        canDelete={isAdminView}
        onEdit={() => loadData()}
      />
    </Box>
  );
}
