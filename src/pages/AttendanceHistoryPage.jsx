import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Paper,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  alpha,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import {
  ArrowBack,
  CalendarToday,
  DirectionsCar,
  FilterList,
  ReceiptLong,
  Schedule,
  Timer,
} from "@mui/icons-material";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const BASE_URL = "http://localhost:9001/api/v1";
const PRIMARY = "#0f1f3d";
const SUCCESS = "#22c55e";
const WARNING = "#f59e0b";
const ERROR = "#ef4444";

const apiFetch = async (path, params = {}) => {
  const token = localStorage.getItem("token") || localStorage.getItem("authToken") || localStorage.getItem("accessToken");
  const url = new URL(`${BASE_URL}${path}`);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, value);
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

const formatTime = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
};

const formatDate = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const formatMoney = (amount) =>
  `₹${Number(amount || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

const labelStatus = (status, punchIn, punchOut) => {
  if (status) {
    return String(status)
      .replace(/[-_]+/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }
  if (punchIn && punchOut) return "Present";
  if (punchIn) return "On Duty";
  return "Absent";
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

const summarizeByDay = (attendances = [], visits = [], expenses = []) => {
  const map = new Map();

  const ensureRow = (dateKey) => {
    if (!map.has(dateKey)) {
      map.set(dateKey, {
        dateKey,
        attendance: null,
        visits: [],
        expenses: [],
      });
    }
    return map.get(dateKey);
  };

  attendances.forEach((attendance) => {
    const key = getDateKey(attendance?.date || attendance?.createdAt);
    if (!key) return;
    ensureRow(key).attendance = attendance;
  });

  visits.forEach((visit) => {
    const key = getDateKey(visit?.visitDate || visit?.createdAt);
    if (!key) return;
    ensureRow(key).visits.push(visit);
  });

  expenses.forEach((expense) => {
    const key = getDateKey(expense?.expenseDate || expense?.createdAt);
    if (!key) return;
    ensureRow(key).expenses.push(expense);
  });

  const baseRows = Array.from(map.values())
    .sort((a, b) => b.dateKey.localeCompare(a.dateKey))
    .map((row) => {
      const attendance = row.attendance || {};
      const punchInTime = attendance?.punchIn?.time || null;
      const punchOutTime = attendance?.punchOut?.time || null;
      const workHours = Number(attendance?.workHours || 0);
      const totalKm = Number(attendance?.distanceKm ?? row.visits.reduce((sum, visit) => sum + (Number(visit?.distanceFromPreviousKm || visit?.distance || 0)), 0));
      const visitCount = Number(attendance?.visitCount ?? row.visits.length);
      const expenseTotal = row.expenses.reduce((sum, expense) => sum + (Number(expense?.amount || 0)), 0);

      return {
        dateKey: row.dateKey,
        attendance,
        punchInTime,
        punchOutTime,
        workHours,
        status: labelStatus(attendance?.status, punchInTime, punchOutTime),
        km: Number.isFinite(totalKm) ? totalKm : 0,
        visits: visitCount,
        expenseTotal,
        expenseCount: row.expenses.length,
      };
    });

  if (!baseRows.length) return [];

  const firstKey = baseRows[baseRows.length - 1].dateKey;
  const lastKey = baseRows[0].dateKey;
  const start = new Date(`${firstKey}T00:00:00`);
  const end = new Date(`${lastKey}T00:00:00`);
  const byKey = new Map(baseRows.map((row) => [row.dateKey, row]));
  const filledRows = [];

  for (let cursor = new Date(start); cursor <= end; cursor.setDate(cursor.getDate() + 1)) {
    const key = getDateKey(cursor);
    const existing = byKey.get(key);
    if (existing) {
      filledRows.push(existing);
      continue;
    }

    filledRows.push({
      dateKey: key,
      attendance: null,
      punchInTime: null,
      punchOutTime: null,
      workHours: 0,
      status: "Absent",
      km: 0,
      visits: 0,
      expenseTotal: 0,
      expenseCount: 0,
    });
  }

  return filledRows.sort((a, b) => b.dateKey.localeCompare(a.dateKey));
};

export default function AttendanceHistoryPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const navigate = useNavigate();
  const location = useLocation();
  const { userId: routeUserId } = useParams();
  const { user: authUser } = useAuth();

  const state = location.state || {};
  const targetUserId = toIdString(routeUserId || state.userId || state.memberId || state.user || authUser);
  const initialRange = state.selectedDate === "all"
    ? "all"
    : state.selectedDate && /^\d{4}-\d{2}-\d{2}$/.test(state.selectedDate)
      ? state.selectedDate
      : "all";

  const [range, setRange] = useState(initialRange);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [user, setUser] = useState(null);
  const [attendances, setAttendances] = useState([]);
  const [visits, setVisits] = useState([]);
  const [expenses, setExpenses] = useState([]);

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
        data?.visits ||
        data?.expenses ||
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
    if (!targetUserId) return;
    setLoading(true);
    setError("");

    try {
      const query = { userId: targetUserId, ...buildRange(range) };
      const [userRes, attendanceRows, visitRows, expenseRows] = await Promise.all([
        apiFetch(`/user/getUserById/${targetUserId}`),
        fetchPagedList("/attendance", query, "attendances"),
        fetchPagedList("/visit", query, "visits"),
        fetchPagedList("/expense/getAll", query, "expenses"),
      ]);

      setUser(userRes?.data || userRes?.result || userRes || null);
      setAttendances(attendanceRows || []);
      setVisits(visitRows || []);
      setExpenses(expenseRows || []);
    } catch (err) {
      setError(err.message || "Failed to load attendance history");
      setAttendances([]);
      setVisits([]);
      setExpenses([]);
    } finally {
      setLoading(false);
    }
  }, [fetchPagedList, range, targetUserId]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const rows = useMemo(() => summarizeByDay(attendances, visits, expenses), [attendances, visits, expenses]);

  const totals = useMemo(() => {
    const dayCount = rows.length;
    const presentCount = rows.filter((row) => row.punchInTime).length;
    const totalKm = rows.reduce((sum, row) => sum + row.km, 0);
    const totalVisits = rows.reduce((sum, row) => sum + row.visits, 0);
    const totalExpense = rows.reduce((sum, row) => sum + row.expenseTotal, 0);
    return { dayCount, presentCount, totalKm, totalVisits, totalExpense };
  }, [rows]);

  const userName = state.memberName || user?.name || user?.fullName || "Selected User";
  const userRole = state.memberRole || user?.role || "Team Member";

  return (
    <Box sx={{ minHeight: "100vh", p: { xs: 1.5, sm: 2.5 }, background: "linear-gradient(180deg, #f7f9fd 0%, #eef3fb 100%)" }}>
      <Box sx={{
        maxWidth: 1440,
        mx: "auto",
        bgcolor: "#fff",
        borderRadius: "24px",
        border: "1px solid #e7edf7",
        boxShadow: "0 22px 55px rgba(15, 23, 42, 0.08)",
        overflow: "hidden",
      }}>
        <Box sx={{
          px: { xs: 2, sm: 3 },
          py: 2.5,
          background: `linear-gradient(135deg, ${PRIMARY} 0%, #2f4fcb 55%, #1d7ed8 100%)`,
          color: "#fff",
        }}>
          <Stack direction="row" spacing={1.5} alignItems="center" justifyContent="space-between" flexWrap="wrap">
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Button
                onClick={() => navigate(-1)}
                startIcon={<ArrowBack />}
                sx={{ color: "#fff", borderColor: alpha("#fff", 0.2), bgcolor: alpha("#fff", 0.12), "&:hover": { bgcolor: alpha("#fff", 0.18) } }}
                variant="outlined"
              >
                Back
              </Button>
              <Box>
                <Typography sx={{ fontSize: { xs: "1.15rem", sm: "1.5rem" }, fontWeight: 900, lineHeight: 1.1 }}>
                  Attendance History
                </Typography>
                <Typography sx={{ opacity: 0.9, fontSize: "0.88rem", mt: 0.3 }}>
                  {userName} · {userRole}
                </Typography>
              </Box>
            </Stack>
            <Chip
              label={range === "all" ? "All Time" : range === "month" ? "This Month" : range === "week" ? "This Week" : range === "today" ? "Today" : formatDate(range)}
              sx={{ bgcolor: alpha("#fff", 0.14), color: "#fff", fontWeight: 700 }}
            />
          </Stack>
        </Box>

        <Box sx={{ p: { xs: 2, sm: 3 } }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2, borderRadius: "12px" }} onClose={() => setError("")}>
              {error}
            </Alert>
          )}

          <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mb: 2 }} flexWrap="wrap">
            {[
              { value: "today", label: "Today" },
              { value: "week", label: "Week" },
              { value: "month", label: "Month" },
              { value: "all", label: "All" },
            ].map((item) => (
              <Chip
                key={item.value}
                clickable
                onClick={() => setRange(item.value)}
                icon={<CalendarToday sx={{ fontSize: 16 }} />}
                label={item.label}
                sx={{
                  px: 0.75,
                  py: 0.5,
                  fontWeight: 700,
                  bgcolor: range === item.value ? alpha(PRIMARY, 0.12) : "#f8fafc",
                  color: range === item.value ? PRIMARY : "#475569",
                  border: `1px solid ${range === item.value ? alpha(PRIMARY, 0.24) : "#e2e8f0"}`,
                }}
              />
            ))}
            <Button
              variant="outlined"
              startIcon={loading ? <CircularProgress size={14} /> : <FilterList />}
              onClick={fetchHistory}
              sx={{ borderRadius: "999px", textTransform: "none", ml: { sm: "auto" } }}
            >
              Refresh
            </Button>
          </Stack>

          <Box sx={{
            display: "grid",
            gridTemplateColumns: { xs: "repeat(2, minmax(0, 1fr))", md: "repeat(5, minmax(0, 1fr))" },
            gap: 1.5,
            mb: 2,
          }}>
            {[
              { label: "Days", value: totals.dayCount, icon: <CalendarToday sx={{ fontSize: 18 }} /> },
              { label: "Present", value: totals.presentCount, icon: <Schedule sx={{ fontSize: 18 }} /> },
              { label: "KM", value: totals.totalKm.toFixed(2), icon: <DirectionsCar sx={{ fontSize: 18 }} /> },
              { label: "Visits", value: totals.totalVisits, icon: <Timer sx={{ fontSize: 18 }} /> },
              { label: "Expense", value: formatMoney(totals.totalExpense), icon: <ReceiptLong sx={{ fontSize: 18 }} /> },
            ].map((card) => (
              <Paper
                key={card.label}
                elevation={0}
                sx={{
                  p: 1.5,
                  borderRadius: "18px",
                  border: "1px solid #e6ecf5",
                  bgcolor: "#fbfcff",
                }}
              >
                <Stack direction="row" spacing={1} alignItems="center" sx={{ color: PRIMARY, mb: 0.5 }}>
                  {card.icon}
                  <Typography sx={{ fontSize: "0.72rem", fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "#64748b" }}>
                    {card.label}
                  </Typography>
                </Stack>
                <Typography sx={{ fontSize: "1.2rem", fontWeight: 900, color: "#0f172a" }}>
                  {card.value}
                </Typography>
              </Paper>
            ))}
          </Box>

          <Paper elevation={0} sx={{ borderRadius: "20px", border: "1px solid #e6ecf5", overflow: "hidden" }}>
            <Box sx={{ px: 2.5, py: 2, borderBottom: "1px solid #eef2f7", bgcolor: "#fafbfe" }}>
              <Typography sx={{ fontSize: "1rem", fontWeight: 900, color: "#0f172a" }}>
                Daily Summary
              </Typography>
              <Typography sx={{ fontSize: "0.82rem", color: "#64748b", mt: 0.3 }}>
                Punch in, punch out, hours, status, km, visits, and expense by day
              </Typography>
            </Box>

            {loading ? (
              <Box sx={{ p: 2.5 }}>
                {[1, 2, 3].map((item) => (
                  <Stack key={item} direction="row" spacing={1} sx={{ mb: 1.5 }}>
                    <Skeleton variant="rounded" width="100%" height={56} />
                  </Stack>
                ))}
              </Box>
            ) : rows.length === 0 ? (
              <Box sx={{ p: 5, textAlign: "center" }}>
                <ReceiptLong sx={{ fontSize: 36, color: "#cbd5e1" }} />
                <Typography sx={{ fontWeight: 800, mt: 1, color: "#0f172a" }}>No history found</Typography>
                <Typography sx={{ color: "#64748b", fontSize: "0.9rem", mt: 0.5 }}>
                  Try a wider date range.
                </Typography>
              </Box>
            ) : (
              <TableContainer sx={{ maxHeight: isMobile ? "none" : 780 }}>
                <Table stickyHeader size={isMobile ? "small" : "medium"}>
                  <TableHead>
                    <TableRow>
                  {["Date", "Punch In", "Punch Out", "Hours", "Status", "KM", "Visits", "Expense"].map((header) => (
                        <TableCell key={header} sx={{ fontWeight: 900, bgcolor: "#f6f8fc", color: "#334155" }}>
                          {header}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {rows.map((row) => (
                      <TableRow
                        key={row.dateKey}
                        hover
                        sx={{
                          bgcolor: row.status === "Absent" ? alpha(ERROR, 0.05) : "inherit",
                          "&:hover": {
                            bgcolor: row.status === "Absent" ? alpha(ERROR, 0.09) : alpha(PRIMARY, 0.03),
                          },
                        }}
                      >
                        <TableCell sx={{ fontWeight: 800, color: "#0f172a" }}>{formatDate(row.dateKey)}</TableCell>
                        <TableCell>{row.punchInTime ? formatTime(row.punchInTime) : "—"}</TableCell>
                        <TableCell>
                          <Stack spacing={0.25}>
                            <Typography>{row.punchOutTime ? formatTime(row.punchOutTime) : "—"}</Typography>
                            {!row.punchOutTime && (
                              <Typography sx={{ fontSize: "0.72rem", color: row.status === "Absent" ? ERROR : "#64748b", lineHeight: 1.35 }}>
                                {row.status === "Absent"
                                  ? "Absent - no punch out, km, visits, or expense recorded"
                                  : "No punch out recorded"}
                              </Typography>
                            )}
                          </Stack>
                        </TableCell>
                        <TableCell>{row.punchInTime ? `${row.workHours.toFixed(2)} hrs` : "—"}</TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            label={row.status}
                            sx={{
                              bgcolor: row.status === "Present" ? alpha(SUCCESS, 0.12) : row.status === "Absent" ? alpha(ERROR, 0.12) : alpha(WARNING, 0.12),
                              color: row.status === "Present" ? SUCCESS : row.status === "Absent" ? ERROR : WARNING,
                              fontWeight: 800,
                            }}
                          />
                        </TableCell>
                        <TableCell>{row.km.toFixed(2)}</TableCell>
                        <TableCell>{row.visits}</TableCell>
                        <TableCell>
                          <Stack spacing={0.25}>
                            <Typography sx={{ fontWeight: 900, color: PRIMARY }}>{formatMoney(row.expenseTotal)}</Typography>
                            <Typography sx={{ fontSize: "0.72rem", color: "#64748b" }}>
                              {row.expenseCount} expense{row.expenseCount === 1 ? "" : "s"}
                            </Typography>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Paper>
        </Box>
      </Box>
    </Box>
  );
}
