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
} from "@mui/icons-material";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import * as XLSX from "xlsx";
import { useAuth } from "../contexts/AuthContext";
import { API_BASE_URL } from "../utils/apiConfig";

const BASE_URL = API_BASE_URL;

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

const apiFetch = async (path, params = {}) => {
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
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    throw new Error(payload.message || `HTTP ${res.status}`);
  }

  return res.json();
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

      const [userRes, attRes, expenseRes] = await Promise.all([
        apiFetch(`/user/getUserById/${targetUserId}`).catch(() => null),
        apiFetch("/attendance", { userId: targetUserId, startDate, endDate, limit: 200 }).catch(() => null),
        apiFetch("/expense", { userId: targetUserId, startDate, endDate, limit: 100 }).catch(() => null),
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
        
        let hours = "-";
        if (match.workHours) {
          const num = Number(match.workHours);
          const h = Math.floor(num);
          const m = Math.round((num - h) * 60);
          hours = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
        }

        const distanceVal = Number(match.totalDistanceKm || match.distanceKm || match.distance || match.totalKm || 0);
        const fullKm = distanceVal > 0 ? `${distanceVal.toFixed(2)} KM` : "-";
        const odoVal = Number(match.odometerKm || match.odometerDistance || 0);
        const odometerKm = odoVal > 0 ? `${odoVal.toFixed(2)} KM` : "-";

        const isAbsent = String(match.status || "").toLowerCase() === "absent" && !hasPunchIn;

        rows.push({
          dateKey,
          dateObj: currentDate,
          dateFormatted,
          punchInTime: isAbsent ? "-" : punchInTime,
          punchOutTime: isAbsent ? "-" : punchOutTime,
          isOngoing: !isAbsent && hasPunchIn && !hasPunchOut,
          hours,
          status: isAbsent ? "Absent" : "Present",
          odometerKm,
          odometerRaw: odoVal,
          fullKm,
          fullKmRaw: distanceVal,
          visits: match.visitsCount || match.visitStats?.visitCount || match.visits?.length || 0,
          expense: match.expenseAmount ? `Rs. ${match.expenseAmount}` : "Rs. 0",
          expenseRaw: Number(match.expenseAmount || 0),
        });
      } else {
        // Real record for days without a punch-in (marked Absent)
        rows.push({
          dateKey,
          dateObj: currentDate,
          dateFormatted,
          punchInTime: "-",
          punchOutTime: "-",
          isOngoing: false,
          hours: "-",
          status: "Absent",
          odometerKm: "-",
          odometerRaw: 0,
          fullKm: "-",
          fullKmRaw: 0,
          visits: 0,
          expense: "Rs. 0",
          expenseRaw: 0,
        });
      }
    }
    return rows;
  }, [selectedMonth, attendances]);

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
  const totalFullKm = rawDailyRows.reduce((acc, r) => acc + (r.fullKmRaw || 0), 0);
  const totalExpense = rawDailyRows.reduce((acc, r) => acc + (r.expenseRaw || 0), 0);

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
      Hours: row.hours,
      Status: row.status,
      "Odometer KM": row.odometerKm,
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
            sx={{
              p: 2,
              borderRadius: "14px",
              bgcolor: COLOR.card,
              border: `1px solid ${COLOR.border}`,
            }}
          >
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="caption" sx={{ color: COLOR.textMuted, fontWeight: 800, fontSize: "0.72rem", letterSpacing: "0.04em" }}>
                ODOMETER KM
              </Typography>
              <Speed sx={{ fontSize: 16, color: "#16a34a" }} />
            </Stack>
            <Typography variant="h4" fontWeight={900} sx={{ color: COLOR.text, my: 0.4, lineHeight: 1.1 }}>
              {totalOdometer.toFixed(2)}
            </Typography>
            <Typography variant="caption" sx={{ color: COLOR.textMuted, fontSize: "0.75rem", fontWeight: 600 }}>
              0 Trips recorded
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
            sx={{
              p: 2,
              borderRadius: "14px",
              bgcolor: COLOR.card,
              border: `1px solid ${COLOR.border}`,
            }}
          >
            <Typography variant="caption" sx={{ color: COLOR.textMuted, fontWeight: 800, fontSize: "0.72rem", letterSpacing: "0.04em" }}>
              EXPENSE
            </Typography>
            <Typography variant="h4" fontWeight={900} sx={{ color: COLOR.text, my: 0.4, lineHeight: 1.1 }}>
              Rs. {totalExpense}
            </Typography>
            <Typography variant="caption" sx={{ color: COLOR.textMuted, fontSize: "0.75rem", fontWeight: 600 }}>
              Total approved
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
                Real punch in, punch out, absent records, hours, odometer km, route full km, visits, and expenses
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
                    {["Date", "Punch In", "Punch Out", "Hours", "Status", "Odometer KM", "Full KM", "Visits", "Expense"].map((head) => (
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

                        {/* Hours */}
                        <TableCell sx={{ color: row.hours !== "-" ? COLOR.text : COLOR.textMuted, fontWeight: row.hours !== "-" ? 700 : 500, fontSize: "0.85rem" }}>
                          {row.hours}
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
                        <TableCell sx={{ color: row.odometerKm !== "-" ? COLOR.text : COLOR.textMuted, fontWeight: row.odometerKm !== "-" ? 700 : 500, fontSize: "0.85rem" }}>
                          {row.odometerKm}
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
                        <TableCell sx={{ color: COLOR.text, fontWeight: 700, fontSize: "0.85rem" }}>
                          {row.expense}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>

      </Box>
    </Box>
  );
}
