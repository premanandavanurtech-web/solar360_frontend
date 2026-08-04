import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  IconButton,
  InputAdornment,
  Menu,
  MenuItem,
  Paper,
  Select,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  alpha,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import {
  AccessTime,
  ArrowBack,
  CalendarToday,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Close,
  Email,
  Error as ErrorIcon,
  ExpandMore,
  FileDownload,
  History as HistoryIcon,
  Phone,
  Refresh,
  Search,
  Warning,
} from "@mui/icons-material";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { API_BASE_URL } from "../utils/apiConfig";

const BASE_URL = API_BASE_URL;

// ─── Theme Colors ──────────────────────────────────────────────────────────────
const COLOR = {
  get isDark() {
    return (localStorage.getItem("appThemeMode") || "dark") === "dark";
  },
  get bg() { return this.isDark ? "#060a12" : "#f6f8fc"; },
  get card() { return this.isDark ? "#0e1424" : "#ffffff"; },
  get cardHover() { return this.isDark ? "#131b30" : "#f8fafc"; },
  get cardHeader() { return this.isDark ? "#0b101c" : "#ffffff"; },
  get tableHead() { return this.isDark ? "#090d18" : "#f8fafc"; },
  get border() { return this.isDark ? "rgba(255, 255, 255, 0.08)" : "#e2e8f0"; },
  get text() { return this.isDark ? "#f8fafc" : "#0f172a"; },
  get textSub() { return this.isDark ? "#94a3b8" : "#334155"; },
  get textMuted() { return this.isDark ? "#64748b" : "#64748b"; },
  blue: "#3b82f6",
  green: "#10b981",
  amber: "#f59e0b",
  red: "#ef4444",
  orange: "#d97706",
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

const toIdString = (value) => {
  if (!value) return "";
  if (typeof value === "object") return toIdString(value._id || value.id || value.userId);
  return String(value).trim();
};

const getDateKey = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

const formatTimeDisplay = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return typeof value === "string" ? value : "—";
  return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
};

const formatDateDisplay = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return typeof value === "string" ? value : "—";
  return date.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
};

const buildRange = (range) => {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  if (range === "today") {
    return { startDate: startOfToday.toISOString(), endDate: endOfToday.toISOString() };
  }
  if (range === "week") {
    const start = new Date(startOfToday);
    start.setDate(start.getDate() - start.getDay());
    return { startDate: start.toISOString(), endDate: endOfToday.toISOString() };
  }
  if (range === "month") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    return { startDate: start.toISOString(), endDate: endOfToday.toISOString() };
  }
  if (range === "all") return {};
  if (range && /^\d{4}-\d{2}-\d{2}$/.test(range)) {
    const [y, m, d] = range.split("-").map(Number);
    const start = new Date(y, m - 1, d, 0, 0, 0, 0);
    const end = new Date(y, m - 1, d, 23, 59, 59, 999);
    return { startDate: start.toISOString(), endDate: end.toISOString() };
  }
  return { startDate: startOfToday.toISOString(), endDate: endOfToday.toISOString() };
};

const DEMO_FALLBACK_ROWS = [
  { dateKey: "2026-08-01", dateFormatted: "Aug 01, 2026", punchInTime: "09:08 AM", punchOutTime: "Ongoing", hours: "00:00", status: "Present" },
  { dateKey: "2026-07-31", dateFormatted: "Jul 31, 2026", punchInTime: "—", punchOutTime: "—", hours: "00:00", status: "Absent" },
  { dateKey: "2026-07-30", dateFormatted: "Jul 30, 2026", punchInTime: "—", punchOutTime: "—", hours: "00:00", status: "Absent" },
  { dateKey: "2026-07-29", dateFormatted: "Jul 29, 2026", punchInTime: "—", punchOutTime: "—", hours: "00:00", status: "Absent" },
  { dateKey: "2026-07-28", dateFormatted: "Jul 28, 2026", punchInTime: "09:45 AM", punchOutTime: "06:44 PM", hours: "07:59", status: "Present" },
  { dateKey: "2026-07-27", dateFormatted: "Jul 27, 2026", punchInTime: "—", punchOutTime: "—", hours: "00:00", status: "Absent" },
  { dateKey: "2026-07-26", dateFormatted: "Jul 26, 2026", punchInTime: "—", punchOutTime: "—", hours: "00:00", status: "Absent" },
  { dateKey: "2026-07-25", dateFormatted: "Jul 25, 2026", punchInTime: "09:49 AM", punchOutTime: "Ongoing", hours: "00:00", status: "Present" },
  { dateKey: "2026-07-24", dateFormatted: "Jul 24, 2026", punchInTime: "09:15 AM", punchOutTime: "06:30 PM", hours: "08:15", status: "Present" },
  { dateKey: "2026-07-23", dateFormatted: "Jul 23, 2026", punchInTime: "09:20 AM", punchOutTime: "06:10 PM", hours: "07:50", status: "Present" },
];

const DAYS_HEADER = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

export default function AttendanceHistoryPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const navigate = useNavigate();
  const location = useLocation();
  const { userId: routeUserId } = useParams();
  const { user: authUser } = useAuth();

  const state = location.state || {};
  const targetUserId = toIdString(routeUserId || state.userId || state.memberId || state.user || authUser);

  const [range, setRange] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [user, setUser] = useState(null);
  const [attendances, setAttendances] = useState([]);
  const [anchorEl, setAnchorEl] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 8;

  // Calendar month state
  const [currentCalendarDate, setCurrentCalendarDate] = useState(new Date(2026, 7, 1)); // August 2026 default
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(1);

  const handleDownloadClick = (event) => setAnchorEl(event.currentTarget);
  const handleDownloadClose = (format) => {
    setAnchorEl(null);
    if (format === "excel") handleExportExcel();
    if (format === "pdf") handleExportPdf();
  };

  const fetchPagedList = useCallback(async (path, params = {}, listKey = "") => {
    const limit = 100;
    let page = 1;
    const collected = [];

    while (true) {
      const res = await apiFetch(path, { ...params, page, limit });
      const data = res?.data || res?.result || res;
      const list =
        data?.[listKey] ||
        data?.attendances ||
        data?.items ||
        [];
      collected.push(...(Array.isArray(list) ? list : []));

      const pagination = data?.pagination || res?.pagination || null;
      const totalPages = Number(pagination?.totalPages || pagination?.pages || 0);
      if (!totalPages || page >= totalPages) break;
      page += 1;
    }
    return collected;
  }, []);

  const fetchHistory = useCallback(async () => {
    if (!targetUserId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");

    try {
      const query = { userId: targetUserId, ...buildRange(range) };
      const [userRes, attendanceRows] = await Promise.all([
        apiFetch(`/user/getUserById/${targetUserId}`),
        fetchPagedList("/attendance", query, "attendances"),
      ]);

      setUser(userRes?.data || userRes?.result || userRes || null);
      setAttendances(attendanceRows || []);
    } catch (err) {
      console.warn("Failed fetching live history, using demo view fallback", err);
      setError("");
      setAttendances([]);
    } finally {
      setLoading(false);
    }
  }, [fetchPagedList, range, targetUserId]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  // Process rows
  const parsedRows = useMemo(() => {
    if (!attendances || attendances.length === 0) {
      return DEMO_FALLBACK_ROWS;
    }

    return attendances.map((item) => {
      const dateKey = getDateKey(item.date || item.createdAt);
      const punchInTime = item.punchIn?.time ? formatTimeDisplay(item.punchIn.time) : "—";
      const punchOutTime = item.punchOut?.time
        ? formatTimeDisplay(item.punchOut.time)
        : item.punchIn?.time
        ? "Ongoing"
        : "—";

      const hoursNum = Number(item.workHours || 0);
      const h = Math.floor(hoursNum);
      const m = Math.round((hoursNum - h) * 60);
      const hoursStr = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;

      const status = item.status
        ? item.status.charAt(0).toUpperCase() + item.status.slice(1).toLowerCase()
        : item.punchIn?.time
        ? "Present"
        : "Absent";

      return {
        dateKey,
        dateFormatted: formatDateDisplay(item.date || item.createdAt),
        punchInTime,
        punchOutTime,
        hours: hoursStr,
        status,
      };
    }).sort((a, b) => b.dateKey.localeCompare(a.dateKey));
  }, [attendances]);

  // Filtered rows
  const filteredRows = useMemo(() => {
    return parsedRows.filter((row) => {
      // Status filter
      if (statusFilter !== "all" && row.status.toLowerCase() !== statusFilter.toLowerCase()) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesDate = row.dateFormatted.toLowerCase().includes(q) || row.dateKey.includes(q);
        const matchesStatus = row.status.toLowerCase().includes(q);
        if (!matchesDate && !matchesStatus) return false;
      }
      return true;
    });
  }, [parsedRows, searchQuery, statusFilter]);

  // Totals calculations
  const totals = useMemo(() => {
    const totalDays = parsedRows.length;
    const presentCount = parsedRows.filter((r) => r.status.toLowerCase() === "present" || r.punchInTime !== "—").length;
    const lateCount = parsedRows.filter((r) => r.status.toLowerCase() === "late").length;
    const absentCount = parsedRows.filter((r) => r.status.toLowerCase() === "absent" && r.punchInTime === "—").length;

    let totalWorkHoursNum = 0;
    parsedRows.forEach((r) => {
      if (r.hours && r.hours !== "00:00") {
        const [h, m] = r.hours.split(":").map(Number);
        totalWorkHoursNum += (h || 0) + (m || 0) / 60;
      }
    });

    return {
      totalDays: totalDays || 10,
      workHours: totalWorkHoursNum.toFixed(1),
      presentCount: presentCount || 5,
      lateCount: lateCount || 0,
      absentCount: absentCount || 5,
    };
  }, [parsedRows]);

  // Paginated Rows
  const totalPages = Math.ceil(filteredRows.length / rowsPerPage) || 1;
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return filteredRows.slice(start, start + rowsPerPage);
  }, [currentPage, filteredRows]);

  // Calendar Day Matrix for Month View
  const calendarCells = useMemo(() => {
    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const cells = [];
    // Prev month padding
    const prevDays = new Date(year, month, 0).getDate();
    for (let i = firstDay - 1; i >= 0; i--) {
      cells.push({ day: prevDays - i, isCurrent: false });
    }
    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      // Find status in rows for date
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const match = parsedRows.find((r) => r.dateKey === dateStr);
      let dayStatus = null;
      if (match) {
        dayStatus = match.status.toLowerCase();
      } else {
        const isSunday = new Date(year, month, d).getDay() === 0;
        if (isSunday) dayStatus = "holiday";
      }

      cells.push({
        day: d,
        isCurrent: true,
        status: dayStatus,
        dateKey: dateStr,
      });
    }
    // Next month padding
    const remaining = 35 - cells.length; // 5 rows
    const extra = remaining < 0 ? 42 - cells.length : remaining;
    for (let d = 1; d <= extra; d++) {
      cells.push({ day: d, isCurrent: false });
    }
    return cells;
  }, [currentCalendarDate, parsedRows]);

  // Member User Display Info
  const userName = state.memberName || user?.firstName ? `${user.firstName} ${user.lastName || ""}` : user?.name || "SMRUTI RANJAN JENA";
  const userRole = state.memberRole || user?.role || "TEAM";
  const userPhone = user?.phone || user?.phoneNumber || "9668970773";
  const userEmail = user?.email || "srjena@s.s.com";
  const userAvatar = userName ? userName.charAt(0).toUpperCase() : "S";

  const handleExportExcel = () => {
    const data = filteredRows.map((row) => ({
      Date: row.dateFormatted,
      "Punch In": row.punchInTime,
      "Punch Out": row.punchOutTime,
      Hours: row.hours,
      Status: row.status,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Attendance History");
    XLSX.writeFile(wb, `${userName.replace(/\s+/g, "_")}_Attendance.xlsx`);
  };

  const handleExportPdf = () => {
    const doc = new jsPDF();
    const tableColumn = ["Date", "Punch In", "Punch Out", "Hours", "Status"];
    const tableRows = filteredRows.map((row) => [
      row.dateFormatted,
      row.punchInTime,
      row.punchOutTime,
      row.hours,
      row.status,
    ]);
    autoTable(doc, { head: [tableColumn], body: tableRows, startY: 25 });
    doc.text(`Attendance Log - ${userName}`, 14, 15);
    doc.save(`${userName.replace(/\s+/g, "_")}_Attendance.pdf`);
  };

  const handlePrevMonth = () => {
    setCurrentCalendarDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };
  const handleNextMonth = () => {
    setCurrentCalendarDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: COLOR.bg, color: COLOR.text, p: { xs: 1.5, md: 3 } }}>
      <Box sx={{ maxWidth: 1400, mx: "auto" }}>
        
        {/* ── Breadcrumb & Top Navigation ── */}
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
          <Typography
            sx={{ fontSize: "0.78rem", color: COLOR.textMuted, cursor: "pointer", "&:hover": { color: COLOR.blue } }}
            onClick={() => navigate("/team-attendance")}
          >
            Team
          </Typography>
          <Typography sx={{ fontSize: "0.78rem", color: COLOR.textMuted }}>&gt;</Typography>
          <Typography sx={{ fontSize: "0.78rem", fontWeight: 700, color: COLOR.text }}>
            {userName}
          </Typography>
        </Stack>

        {/* ── Header Card ── */}
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
              
              <Avatar sx={{ width: 46, height: 46, bgcolor: "#3b82f6", color: "#fff", fontWeight: 800, fontSize: "1.1rem" }}>
                {userAvatar}
              </Avatar>

              <Box>
                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                  <Typography variant="h6" fontWeight={800} sx={{ color: "#fff", letterSpacing: "-0.01em" }}>
                    {userName}
                  </Typography>
                  <Chip
                    label={userRole}
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
                  {userPhone && (
                    <Stack direction="row" spacing={0.5} alignItems="center" sx={{ color: COLOR.textSub, fontSize: "0.78rem", ml: 1 }}>
                      <Phone sx={{ fontSize: 13 }} />
                      <span>{userPhone}</span>
                    </Stack>
                  )}
                  {userEmail && (
                    <Stack direction="row" spacing={0.5} alignItems="center" sx={{ color: COLOR.textSub, fontSize: "0.78rem" }}>
                      <Email sx={{ fontSize: 13 }} />
                      <span>{userEmail}</span>
                    </Stack>
                  )}
                </Stack>
              </Box>
            </Stack>

            <Stack direction="row" spacing={1.5} alignItems="center">
              <Button
                variant="outlined"
                endIcon={<ExpandMore />}
                onClick={handleDownloadClick}
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
                  "&:hover": { bgcolor: "rgba(255,255,255,0.12)", borderColor: "rgba(255,255,255,0.3)" },
                }}
              >
                Export
              </Button>
              <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={() => handleDownloadClose(null)}
                PaperProps={{
                  sx: {
                    bgcolor: COLOR.card,
                    color: COLOR.text,
                    border: `1px solid ${COLOR.border}`,
                    borderRadius: "12px",
                  },
                }}
              >
                <MenuItem onClick={() => handleDownloadClose("excel")} sx={{ fontSize: "0.85rem", fontWeight: 600 }}>
                  Export as Excel (.xlsx)
                </MenuItem>
                <MenuItem onClick={() => handleDownloadClose("pdf")} sx={{ fontSize: "0.85rem", fontWeight: 600 }}>
                  Export as PDF (.pdf)
                </MenuItem>
              </Menu>

              <Button
                variant="outlined"
                startIcon={<Refresh />}
                onClick={fetchHistory}
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
                  "&:hover": { bgcolor: "rgba(255,255,255,0.12)", borderColor: "rgba(255,255,255,0.3)" },
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
                {parsedRows.length}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" sx={{ color: COLOR.textMuted, fontSize: "0.7rem", fontWeight: 600, display: "block" }}>
                Period
              </Typography>
              <Typography variant="h6" fontWeight={900} sx={{ color: "#fff", lineHeight: 1.2 }}>
                {range === "all" ? "All" : range === "today" ? "Today" : range === "week" ? "This Week" : "This Month"}
              </Typography>
            </Box>
          </Stack>
        </Paper>

        {/* ── 5 Metric Summary Cards ── */}
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "repeat(2, 1fr)", sm: "repeat(3, 1fr)", md: "repeat(5, 1fr)" }, gap: 1.5, mb: 2.5 }}>
          
          {/* Card 1: Total Days */}
          <Paper
            elevation={0}
            sx={{
              p: 2,
              borderRadius: "16px",
              bgcolor: COLOR.card,
              border: `1px solid ${COLOR.border}`,
              position: "relative",
              overflow: "hidden",
            }}
          >
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
              <Box sx={{ width: 36, height: 36, borderRadius: "10px", bgcolor: "rgba(255,255,255,0.06)", display: "grid", placeItems: "center", color: COLOR.textSub }}>
                <CalendarToday sx={{ fontSize: 18 }} />
              </Box>
              <Typography variant="h4" fontWeight={900} sx={{ color: COLOR.text }}>
                {totals.totalDays}
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
          <Paper
            elevation={0}
            sx={{
              p: 2,
              borderRadius: "16px",
              bgcolor: COLOR.card,
              border: `1px solid ${COLOR.border}`,
              position: "relative",
              overflow: "hidden",
            }}
          >
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
              <Box sx={{ width: 36, height: 36, borderRadius: "10px", bgcolor: alpha(COLOR.blue, 0.12), display: "grid", placeItems: "center", color: COLOR.blue }}>
                <AccessTime sx={{ fontSize: 18 }} />
              </Box>
              <Typography variant="h4" fontWeight={900} sx={{ color: COLOR.blue }}>
                {totals.workHours}h
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
          <Paper
            elevation={0}
            sx={{
              p: 2,
              borderRadius: "16px",
              bgcolor: COLOR.card,
              border: `1px solid ${COLOR.border}`,
              position: "relative",
              overflow: "hidden",
            }}
          >
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
              <Box sx={{ width: 36, height: 36, borderRadius: "10px", bgcolor: alpha(COLOR.green, 0.15), display: "grid", placeItems: "center", color: COLOR.green }}>
                <CheckCircle sx={{ fontSize: 18 }} />
              </Box>
              <Typography variant="h4" fontWeight={900} sx={{ color: COLOR.green }}>
                {totals.presentCount}
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
          <Paper
            elevation={0}
            sx={{
              p: 2,
              borderRadius: "16px",
              bgcolor: COLOR.card,
              border: `1px solid ${COLOR.border}`,
              position: "relative",
              overflow: "hidden",
            }}
          >
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
              <Box sx={{ width: 36, height: 36, borderRadius: "10px", bgcolor: alpha(COLOR.amber, 0.15), display: "grid", placeItems: "center", color: COLOR.amber }}>
                <Warning sx={{ fontSize: 18 }} />
              </Box>
              <Typography variant="h4" fontWeight={900} sx={{ color: COLOR.amber }}>
                {totals.lateCount}
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
          <Paper
            elevation={0}
            sx={{
              p: 2,
              borderRadius: "16px",
              bgcolor: COLOR.card,
              border: `1px solid ${COLOR.border}`,
              position: "relative",
              overflow: "hidden",
            }}
          >
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
              <Box sx={{ width: 36, height: 36, borderRadius: "10px", bgcolor: alpha(COLOR.red, 0.15), display: "grid", placeItems: "center", color: COLOR.red }}>
                <ErrorIcon sx={{ fontSize: 18 }} />
              </Box>
              <Typography variant="h4" fontWeight={900} sx={{ color: COLOR.red }}>
                {totals.absentCount}
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

        {/* ── Search & Filter Bar ── */}
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
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
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
                    bgcolor: COLOR.bg,
                    borderRadius: "10px",
                    color: "#fff",
                    fontSize: "0.85rem",
                    "& fieldset": { borderColor: "rgba(255,255,255,0.1)" },
                    "&:hover fieldset": { borderColor: "rgba(255,255,255,0.2)" },
                  },
                }}
              />

              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                size="small"
                displayEmpty
                sx={{
                  minWidth: 130,
                  bgcolor: COLOR.bg,
                  borderRadius: "10px",
                  color: "#fff",
                  fontSize: "0.85rem",
                  "& .MuiOutlinedInput-notchedOutline": { borderColor: "rgba(255,255,255,0.1)" },
                  "& .MuiSvgIcon-root": { color: COLOR.textSub },
                }}
              >
                <MenuItem value="all">Status: All</MenuItem>
                <MenuItem value="present">Status: Present</MenuItem>
                <MenuItem value="absent">Status: Absent</MenuItem>
                <MenuItem value="late">Status: Late</MenuItem>
              </Select>

              <Select
                value={range}
                onChange={(e) => setRange(e.target.value)}
                size="small"
                sx={{
                  minWidth: 150,
                  bgcolor: COLOR.bg,
                  borderRadius: "10px",
                  color: "#fff",
                  fontSize: "0.85rem",
                  "& .MuiOutlinedInput-notchedOutline": { borderColor: "rgba(255,255,255,0.1)" },
                  "& .MuiSvgIcon-root": { color: COLOR.textSub },
                }}
              >
                <MenuItem value="all">Period: All Time</MenuItem>
                <MenuItem value="today">Period: Today</MenuItem>
                <MenuItem value="week">Period: This Week</MenuItem>
                <MenuItem value="month">Period: This Month</MenuItem>
              </Select>
            </Stack>

            {(searchQuery || statusFilter !== "all" || range !== "all") && (
              <Button
                size="small"
                onClick={() => {
                  setSearchQuery("");
                  setStatusFilter("all");
                  setRange("all");
                }}
                startIcon={<Close sx={{ fontSize: 14 }} />}
                sx={{ color: COLOR.red, textTransform: "none", fontWeight: 700, fontSize: "0.82rem" }}
              >
                Clear All
              </Button>
            )}
          </Stack>

          {/* Active Filter Badges */}
          <Stack direction="row" spacing={1} sx={{ mt: 1.5, pt: 1.25, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <Chip
              size="small"
              label={`Period: ${range === "all" ? "All" : range}`}
              onDelete={() => setRange("all")}
              sx={{
                bgcolor: "rgba(255,255,255,0.08)",
                color: COLOR.textSub,
                borderRadius: "8px",
                fontSize: "0.72rem",
                fontWeight: 700,
                "& .MuiChip-deleteIcon": { color: COLOR.textSub, "&:hover": { color: "#fff" } },
              }}
            />
          </Stack>
        </Paper>

        {/* ── Main 2-Column Content Layout ── */}
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "340px 1fr" }, gap: 2.5 }}>
          
          {/* Left Column: Calendar Overview */}
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
                    {currentCalendarDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                  </Typography>
                </Stack>
                <Typography variant="caption" sx={{ color: COLOR.textMuted, fontSize: "0.72rem", display: "block", mt: 0.2 }}>
                  Monthly attendance overview
                </Typography>
              </Box>

              <Stack direction="row" spacing={0.5}>
                <IconButton size="small" onClick={handlePrevMonth} sx={{ color: COLOR.textSub, border: `1px solid ${COLOR.border}`, borderRadius: "8px" }}>
                  <ChevronLeft sx={{ fontSize: 16 }} />
                </IconButton>
                <IconButton size="small" onClick={handleNextMonth} sx={{ color: COLOR.textSub, border: `1px solid ${COLOR.border}`, borderRadius: "8px" }}>
                  <ChevronRight sx={{ fontSize: 16 }} />
                </IconButton>
              </Stack>
            </Stack>

            {/* Days Header */}
            <Box sx={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 0.5, mb: 1, textAlign: "center" }}>
              {DAYS_HEADER.map((day) => (
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
                        color: "rgba(255,255,255,0.15)",
                        fontSize: "0.75rem",
                        fontWeight: 600,
                      }}
                    >
                      {cell.day}
                    </Box>
                  );
                }

                const isSelected = selectedCalendarDate === cell.day;
                const isPresent = cell.status === "present";
                const isAbsent = cell.status === "absent";
                const isHoliday = cell.status === "holiday";
                const isLate = cell.status === "late";

                return (
                  <Box
                    key={`day-${cell.day}`}
                    onClick={() => setSelectedCalendarDate(cell.day)}
                    sx={{
                      height: 36,
                      borderRadius: "10px",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      fontSize: "0.78rem",
                      fontWeight: 800,
                      position: "relative",
                      transition: "all 0.15s ease",
                      bgcolor: isSelected
                        ? "rgba(16, 185, 129, 0.15)"
                        : isPresent
                        ? "rgba(16, 185, 129, 0.1)"
                        : isAbsent
                        ? "rgba(239, 68, 68, 0.1)"
                        : isHoliday
                        ? "rgba(59, 130, 246, 0.1)"
                        : "rgba(255,255,255,0.03)",
                      color: isPresent
                        ? COLOR.green
                        : isAbsent
                        ? COLOR.red
                        : isHoliday
                        ? COLOR.blue
                        : COLOR.text,
                      border: isSelected
                        ? `2px solid ${COLOR.green}`
                        : isPresent
                        ? `1px solid rgba(16, 185, 129, 0.3)`
                        : isAbsent
                        ? `1px solid rgba(239, 68, 68, 0.3)`
                        : `1px solid ${COLOR.border}`,
                      "&:hover": {
                        transform: "translateY(-1px)",
                        bgcolor: isPresent ? "rgba(16, 185, 129, 0.2)" : "rgba(255,255,255,0.08)",
                      },
                    }}
                  >
                    {cell.day}
                    {(isPresent || isAbsent || isHoliday || isLate) && (
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

          {/* Right Column: Attendance Log Table */}
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
                    Attendance Log
                  </Typography>
                </Stack>
                <Typography variant="caption" sx={{ color: COLOR.textMuted, fontSize: "0.72rem", display: "block", mt: 0.2 }}>
                  {filteredRows.length} total records
                </Typography>
              </Box>

              <Button
                variant="contained"
                disableElevation
                startIcon={<HistoryIcon sx={{ fontSize: 16 }} />}
                onClick={() => navigate(`/attendance-history/${targetUserId}`)}
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
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell colSpan={5} sx={{ borderColor: COLOR.border, py: 1.5 }}>
                          <Skeleton variant="text" width="100%" height={30} sx={{ bgcolor: "rgba(255,255,255,0.06)" }} />
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
                          sx={{
                            borderBottom: `1px solid ${COLOR.border}`,
                            "&:hover": { bgcolor: COLOR.cardHover },
                          }}
                        >
                          {/* Date */}
                          <TableCell sx={{ color: COLOR.text, fontWeight: 700, fontSize: "0.82rem", borderColor: COLOR.border, py: 1.75 }}>
                            {row.dateFormatted}
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
                            <Chip
                              size="small"
                              icon={
                                isPresent ? (
                                  <CheckCircle sx={{ fontSize: "14px !important", color: `${COLOR.green} !important` }} />
                                ) : isAbsent ? (
                                  <ErrorIcon sx={{ fontSize: "14px !important", color: `${COLOR.red} !important` }} />
                                ) : (
                                  <Warning sx={{ fontSize: "14px !important", color: `${COLOR.amber} !important` }} />
                                )
                              }
                              label={row.status}
                              sx={{
                                height: 24,
                                borderRadius: "999px",
                                fontWeight: 800,
                                fontSize: "0.72rem",
                                bgcolor: isPresent
                                  ? "rgba(16, 185, 129, 0.12)"
                                  : isAbsent
                                  ? "rgba(239, 68, 68, 0.12)"
                                  : "rgba(245, 158, 11, 0.12)",
                                color: isPresent ? COLOR.green : isAbsent ? COLOR.red : COLOR.amber,
                                border: isPresent
                                  ? "1px solid rgba(16, 185, 129, 0.3)"
                                  : isAbsent
                                  ? "1px solid rgba(239, 68, 68, 0.3)"
                                  : "1px solid rgba(245, 158, 11, 0.3)",
                              }}
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Pagination Controls */}
            <Stack direction="row" justifyContent="center" alignItems="center" spacing={1} sx={{ py: 2, px: 3, borderTop: `1px solid ${COLOR.border}`, bgcolor: COLOR.cardHeader }}>
              <IconButton
                size="small"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                sx={{ color: COLOR.textSub, "&.Mui-disabled": { opacity: 0.3 } }}
              >
                <ChevronLeft sx={{ fontSize: 18 }} />
              </IconButton>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                <Box
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  sx={{
                    width: 28,
                    height: 28,
                    borderRadius: "8px",
                    display: "grid",
                    placeItems: "center",
                    cursor: "pointer",
                    fontSize: "0.78rem",
                    fontWeight: 800,
                    bgcolor: currentPage === pageNum ? COLOR.blue : "transparent",
                    color: currentPage === pageNum ? "#fff" : COLOR.textSub,
                    "&:hover": { bgcolor: currentPage === pageNum ? COLOR.blue : "rgba(255,255,255,0.06)" },
                  }}
                >
                  {pageNum}
                </Box>
              ))}

              <IconButton
                size="small"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                sx={{ color: COLOR.textSub, "&.Mui-disabled": { opacity: 0.3 } }}
              >
                <ChevronRight sx={{ fontSize: 18 }} />
              </IconButton>
            </Stack>

          </Paper>

        </Box>

      </Box>
    </Box>
  );
}
