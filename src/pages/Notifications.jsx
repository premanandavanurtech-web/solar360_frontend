import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Paper,
  Typography,
  Stack,
  Chip,
  Button,
  Divider,
  IconButton,
  alpha,
  useTheme,
  Snackbar,
  Alert,
  CircularProgress,
  TextField,
  InputAdornment,
  MenuItem,
  Select,
} from "@mui/material";
import {
  Notifications as NotificationsIcon,
  MarkEmailRead as MarkEmailReadIcon,
  FiberManualRecord as FiberManualRecordIcon,
  NotificationsActive as NotificationsActiveIcon,
  Search,
  Close,
  FilterList,
  CalendarToday,
  LocationOff,
  SignalCellularOff,
  CheckCircle,
  Person,
  Info,
  Logout,
} from "@mui/icons-material";
import { API_BASE_URL } from "../utils/apiConfig";

const PRIMARY = "#0f1f3d";
const API = API_BASE_URL;

const getToken = () =>
  localStorage.getItem("token") ||
  localStorage.getItem("authToken") ||
  localStorage.getItem("accessToken") ||
  "";

const isSameDay = (d1, d2) => {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
};

const isToday = (dateObj) => isSameDay(dateObj, new Date());

const isYesterday = (dateObj) => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return isSameDay(dateObj, yesterday);
};

const isThisWeek = (dateObj) => {
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  weekStart.setHours(0, 0, 0, 0);
  return dateObj >= weekStart && dateObj <= now;
};

const getCategoryDetails = (type = "", title = "", message = "") => {
  const t = `${type} ${title} ${message}`.toLowerCase();

  // 1. User Logout - RED THEME (High Priority)
  if (t.includes("logout") || t.includes("logged out") || t.includes("log-out")) {
    return {
      label: "User Logout",
      color: "#ef4444",
      bg: "rgba(239, 68, 68, 0.16)",
      border: "rgba(239, 68, 68, 0.45)",
      icon: <Logout sx={{ fontSize: 19, color: "#ef4444" }} />,
      isLogout: true,
    };
  }

  if (t.includes("no-signal") || t.includes("signal")) {
    return {
      label: "No Tracking Signal",
      color: "#f59e0b",
      bg: "rgba(245, 158, 11, 0.12)",
      border: "rgba(245, 158, 11, 0.25)",
      icon: <SignalCellularOff sx={{ fontSize: 18 }} />,
    };
  }
  if (t.includes("location-off") || t.includes("location")) {
    return {
      label: "Location Turned Off",
      color: "#ef4444",
      bg: "rgba(239, 68, 68, 0.12)",
      border: "rgba(239, 68, 68, 0.25)",
      icon: <LocationOff sx={{ fontSize: 18 }} />,
    };
  }
  if (t.includes("punch") || t.includes("attendance")) {
    return {
      label: "Attendance",
      color: "#10b981",
      bg: "rgba(16, 185, 129, 0.12)",
      border: "rgba(16, 185, 129, 0.25)",
      icon: <CheckCircle sx={{ fontSize: 18 }} />,
    };
  }
  if (t.includes("lead")) {
    return {
      label: "Lead Update",
      color: "#3b82f6",
      bg: "rgba(59, 130, 246, 0.12)",
      border: "rgba(59, 130, 246, 0.25)",
      icon: <Person sx={{ fontSize: 18 }} />,
    };
  }
  return {
    label: type ? type.replace(/[-_]+/g, " ") : "General",
    color: "#818cf8",
    bg: "rgba(129, 140, 248, 0.12)",
    border: "rgba(129, 140, 248, 0.25)",
    icon: <NotificationsIcon sx={{ fontSize: 18 }} />,
  };
};

export default function Notifications() {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  // Dynamic Theme Colors
  const pageBg = isDark ? "#050811" : "#f8f9fa";
  const cardBg = isDark ? "#0e1424" : "#ffffff";
  const cardBorder = isDark ? "rgba(255, 255, 255, 0.08)" : "#e8edf2";
  const textTitle = isDark ? "#ffffff" : "#0f172a";
  const textSub = isDark ? "#94a3b8" : "#64748b";
  const textBody = isDark ? "#cbd5e1" : "#475569";
  const headerBg = isDark
    ? "linear-gradient(135deg, #090e1a 0%, #111736 40%, #17203a 100%)"
    : "linear-gradient(135deg, rgba(69,105,234,0.08) 0%, rgba(255,255,255,1) 55%)";
  const itemUnreadBg = isDark ? "rgba(37, 99, 235, 0.06)" : alpha(PRIMARY, 0.04);
  const itemReadBg = isDark ? "#0e1424" : "#ffffff";
  const inputBg = isDark ? "#0a0e1a" : "#f8fafc";
  const inputBorder = isDark ? "rgba(255, 255, 255, 0.12)" : "#cbd5e1";
  const dividerBorder = isDark ? "rgba(255, 255, 255, 0.06)" : "#e2e8f0";

  const [notifications, setNotifications] = useState([]);
  const [testingPush, setTestingPush] = useState(false);
  const [loading, setLoading] = useState(true);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "info" });

  // Filter States - Default to "today" as requested!
  const [periodFilter, setPeriodFilter] = useState("today"); // 'today' | 'yesterday' | 'week' | 'all'
  const [statusFilter, setStatusFilter] = useState("all"); // 'all' | 'unread' | 'read'
  const [categoryFilter, setCategoryFilter] = useState("all"); // 'all' | 'tracking' | 'attendance' | 'leads'
  const [searchQuery, setSearchQuery] = useState("");

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const token = getToken();
      if (!token) return;

      const res = await fetch(`${API}/notifications?limit=200`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) return;
      const payload = await res.json();
      const data = payload?.data || payload?.result || {};
      const list = data?.notifications || [];
      setNotifications(
        list.map((item) => {
          const rawDate = item.createdAt ? new Date(item.createdAt) : new Date();
          return {
            id: item._id || item.id,
            title: item.title,
            message: item.message,
            rawDate,
            time: item.createdAt ? new Date(item.createdAt).toLocaleString("en-IN") : "Just now",
            type: item.type || "general",
            category: item.type ? item.type.replace(/[-_]+/g, " ") : "General",
            read: Boolean(item.read),
          };
        })
      );
    } catch (error) {
      console.error("Notifications load failed:", error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const handleMarkAllRead = () => {
    const token = getToken();
    fetch(`${API}/notifications/read-all`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    }).catch((error) => console.error("Mark all notifications failed:", error.message));

    setNotifications((prev) => prev.map((item) => ({ ...item, read: true })));
    window.dispatchEvent(new Event("notificationsUpdated"));
  };

  const handleMarkRead = (id) => {
    const token = getToken();
    fetch(`${API}/notifications/${id}/read`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    }).catch((error) => console.error("Mark notification failed:", error.message));

    setNotifications((prev) =>
      prev.map((item) => (item.id === id ? { ...item, read: true } : item))
    );
    window.dispatchEvent(new Event("notificationsUpdated"));
  };

  const handleTestPush = async () => {
    setTestingPush(true);
    try {
      const token = getToken();
      const res = await fetch(`${API}/notifications/test-push`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: "SCS Connect Test Push",
          message: "Push notification is working successfully on your mobile device!",
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setSnackbar({
          open: true,
          message: data.message || "Failed to send test push",
          severity: "warning",
        });
      } else if (data.data?.successCount > 0) {
        setSnackbar({
          open: true,
          message: `✅ Test Push Sent! Delivered to ${data.data.successCount} registered device(s).`,
          severity: "success",
        });
      } else {
        setSnackbar({
          open: true,
          message: data.message || "Push notification created! Log in to Android APK app to receive live pushes.",
          severity: "info",
        });
      }

      await loadNotifications();
    } catch (err) {
      setSnackbar({
        open: true,
        message: err.message || "Failed to send test push",
        severity: "error",
      });
    } finally {
      setTestingPush(false);
    }
  };

  // ── Filter Calculations ──────────────────────────────────────────────────
  const unreadTotal = useMemo(
    () => notifications.filter((item) => !item.read).length,
    [notifications]
  );

  const todayTotal = useMemo(
    () => notifications.filter((item) => isToday(item.rawDate)).length,
    [notifications]
  );

  const yesterdayTotal = useMemo(
    () => notifications.filter((item) => isYesterday(item.rawDate)).length,
    [notifications]
  );

  const weekTotal = useMemo(
    () => notifications.filter((item) => isThisWeek(item.rawDate)).length,
    [notifications]
  );

  // Filtered List
  const filteredNotifications = useMemo(() => {
    return notifications.filter((item) => {
      // 1. Period filter
      if (periodFilter === "today" && !isToday(item.rawDate)) return false;
      if (periodFilter === "yesterday" && !isYesterday(item.rawDate)) return false;
      if (periodFilter === "week" && !isThisWeek(item.rawDate)) return false;

      // 2. Read status filter
      if (statusFilter === "unread" && item.read) return false;
      if (statusFilter === "read" && !item.read) return false;

      // 3. Category filter
      if (categoryFilter === "logout") {
        const t = `${item.type} ${item.title} ${item.message}`.toLowerCase();
        if (!t.includes("logout") && !t.includes("logged out") && !t.includes("log-out")) return false;
      } else if (categoryFilter === "tracking") {
        const t = (item.type || "").toLowerCase();
        if (!t.includes("signal") && !t.includes("location") && !t.includes("tracking")) return false;
      } else if (categoryFilter === "attendance") {
        const t = (item.type || "").toLowerCase();
        if (!t.includes("punch") && !t.includes("attendance")) return false;
      } else if (categoryFilter === "leads") {
        const t = (item.type || "").toLowerCase();
        if (!t.includes("lead")) return false;
      }

      // 4. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = item.title.toLowerCase().includes(q);
        const matchesMessage = item.message.toLowerCase().includes(q);
        const matchesCategory = item.category.toLowerCase().includes(q);
        if (!matchesTitle && !matchesMessage && !matchesCategory) return false;
      }

      return true;
    });
  }, [notifications, periodFilter, statusFilter, categoryFilter, searchQuery]);

  const hasActiveFilters =
    periodFilter !== "today" ||
    statusFilter !== "all" ||
    categoryFilter !== "all" ||
    searchQuery.trim() !== "";

  const handleResetFilters = () => {
    setPeriodFilter("today");
    setStatusFilter("all");
    setCategoryFilter("all");
    setSearchQuery("");
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5, bgcolor: pageBg, p: { xs: 1.5, sm: 2.5 } }}>
      
      {/* ── 1. Top Header Banner ── */}
      <Paper
        elevation={0}
        sx={{
          p: { xs: 2, md: 2.75 },
          borderRadius: 4,
          border: `1px solid ${cardBorder}`,
          background: headerBg,
          boxShadow: isDark ? "0 10px 30px rgba(0,0,0,0.4)" : "0 4px 20px rgba(0,0,0,0.04)",
        }}
      >
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={2}
          alignItems={{ xs: "flex-start", sm: "center" }}
          justifyContent="space-between"
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: "14px",
                bgcolor: isDark ? "rgba(59, 130, 246, 0.15)" : alpha(PRIMARY, 0.12),
                color: isDark ? "#60a5fa" : PRIMARY,
                border: `1px solid ${isDark ? "rgba(59, 130, 246, 0.25)" : alpha(PRIMARY, 0.16)}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <NotificationsIcon sx={{ fontSize: 24 }} />
            </Box>
            <Box>
              <Typography sx={{ fontSize: { xs: "1.2rem", md: "1.45rem" }, fontWeight: 800, color: textTitle }}>
                Notifications
              </Typography>
              <Typography sx={{ mt: 0.3, color: textSub, fontSize: "0.85rem" }}>
                Track alerts, reminders, lead updates, and important team activity in real time.
              </Typography>
            </Box>
          </Box>

          <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap">
            <Chip
              icon={<NotificationsIcon sx={{ color: isDark ? "#60a5fa !important" : "inherit" }} />}
              label={`${unreadTotal} unread`}
              sx={{
                bgcolor: isDark ? "rgba(59, 130, 246, 0.12)" : alpha(PRIMARY, 0.1),
                color: isDark ? "#60a5fa" : PRIMARY,
                border: `1px solid ${isDark ? "rgba(59, 130, 246, 0.25)" : alpha(PRIMARY, 0.18)}`,
                fontWeight: 700,
                fontSize: "0.82rem",
              }}
            />
            <Button
              variant="outlined"
              disabled={testingPush}
              startIcon={testingPush ? <CircularProgress size={16} /> : <NotificationsActiveIcon />}
              onClick={handleTestPush}
              sx={{
                borderColor: isDark ? "rgba(59, 130, 246, 0.3)" : alpha(PRIMARY, 0.3),
                color: isDark ? "#60a5fa" : PRIMARY,
                borderRadius: 2.5,
                fontWeight: 700,
                px: 2,
                py: 0.8,
                fontSize: "0.82rem",
                "&:hover": { bgcolor: isDark ? "rgba(59, 130, 246, 0.12)" : alpha(PRIMARY, 0.05) },
              }}
            >
              {testingPush ? "Sending..." : "Test Push"}
            </Button>
            <Button
              variant="contained"
              startIcon={<MarkEmailReadIcon />}
              onClick={handleMarkAllRead}
              sx={{
                bgcolor: isDark ? "#2563eb" : PRIMARY,
                color: "#ffffff",
                borderRadius: 2.5,
                fontWeight: 700,
                px: 2.5,
                py: 0.8,
                fontSize: "0.82rem",
                boxShadow: "0 4px 14px rgba(37, 99, 235, 0.25)",
                "&:hover": { bgcolor: isDark ? "#1d4ed8" : "#3a5ac8" },
              }}
            >
              Mark All Read
            </Button>
          </Stack>
        </Stack>
      </Paper>

      {/* ── 2. Interactive Filter Bar ── */}
      <Paper
        elevation={0}
        sx={{
          p: 2,
          borderRadius: 3.5,
          bgcolor: cardBg,
          border: `1px solid ${cardBorder}`,
        }}
      >
        <Stack spacing={2}>
          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={1.5}
            justifyContent="space-between"
            alignItems={{ xs: "stretch", md: "center" }}
            flexWrap="wrap"
          >
            {/* Period Filter Buttons (Today by Default!) */}
            <Stack direction="row" spacing={1} flexWrap="wrap" alignItems="center">
              <Typography sx={{ fontSize: "0.78rem", fontWeight: 700, color: textSub, mr: 0.5 }}>
                Period:
              </Typography>
              
              <Button
                size="small"
                variant={periodFilter === "today" ? "contained" : "outlined"}
                onClick={() => setPeriodFilter("today")}
                sx={{
                  borderRadius: "20px",
                  height: 32,
                  px: 2,
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  textTransform: "none",
                  bgcolor: periodFilter === "today" ? "#2563eb" : "transparent",
                  color: periodFilter === "today" ? "#ffffff" : textTitle,
                  borderColor: periodFilter === "today" ? "#2563eb" : inputBorder,
                  "&:hover": { bgcolor: periodFilter === "today" ? "#1d4ed8" : isDark ? "#1e293b" : "#f1f5f9" },
                }}
              >
                Today ({todayTotal})
              </Button>

              <Button
                size="small"
                variant={periodFilter === "yesterday" ? "contained" : "outlined"}
                onClick={() => setPeriodFilter("yesterday")}
                sx={{
                  borderRadius: "20px",
                  height: 32,
                  px: 2,
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  textTransform: "none",
                  bgcolor: periodFilter === "yesterday" ? "#2563eb" : "transparent",
                  color: periodFilter === "yesterday" ? "#ffffff" : textTitle,
                  borderColor: periodFilter === "yesterday" ? "#2563eb" : inputBorder,
                  "&:hover": { bgcolor: periodFilter === "yesterday" ? "#1d4ed8" : isDark ? "#1e293b" : "#f1f5f9" },
                }}
              >
                Yesterday ({yesterdayTotal})
              </Button>

              <Button
                size="small"
                variant={periodFilter === "week" ? "contained" : "outlined"}
                onClick={() => setPeriodFilter("week")}
                sx={{
                  borderRadius: "20px",
                  height: 32,
                  px: 2,
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  textTransform: "none",
                  bgcolor: periodFilter === "week" ? "#2563eb" : "transparent",
                  color: periodFilter === "week" ? "#ffffff" : textTitle,
                  borderColor: periodFilter === "week" ? "#2563eb" : inputBorder,
                  "&:hover": { bgcolor: periodFilter === "week" ? "#1d4ed8" : isDark ? "#1e293b" : "#f1f5f9" },
                }}
              >
                This Week ({weekTotal})
              </Button>

              <Button
                size="small"
                variant={periodFilter === "all" ? "contained" : "outlined"}
                onClick={() => setPeriodFilter("all")}
                sx={{
                  borderRadius: "20px",
                  height: 32,
                  px: 2,
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  textTransform: "none",
                  bgcolor: periodFilter === "all" ? "#2563eb" : "transparent",
                  color: periodFilter === "all" ? "#ffffff" : textTitle,
                  borderColor: periodFilter === "all" ? "#2563eb" : inputBorder,
                  "&:hover": { bgcolor: periodFilter === "all" ? "#1d4ed8" : isDark ? "#1e293b" : "#f1f5f9" },
                }}
              >
                All Time ({notifications.length})
              </Button>
            </Stack>

            {/* Read / Unread Status Tabs */}
            <Stack direction="row" spacing={1} alignItems="center">
              <Button
                size="small"
                onClick={() => setStatusFilter("all")}
                sx={{
                  borderRadius: "8px",
                  px: 1.5,
                  height: 32,
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  textTransform: "none",
                  bgcolor: statusFilter === "all" ? (isDark ? "rgba(59, 130, 246, 0.15)" : "#eff6ff") : "transparent",
                  color: statusFilter === "all" ? "#3b82f6" : textSub,
                  "&:hover": { bgcolor: isDark ? "rgba(59, 130, 246, 0.25)" : "#dbeafe" },
                }}
              >
                All ({notifications.length})
              </Button>

              <Button
                size="small"
                onClick={() => setStatusFilter("unread")}
                sx={{
                  borderRadius: "8px",
                  px: 1.5,
                  height: 32,
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  textTransform: "none",
                  bgcolor: statusFilter === "unread" ? (isDark ? "rgba(59, 130, 246, 0.15)" : "#eff6ff") : "transparent",
                  color: statusFilter === "unread" ? "#3b82f6" : textSub,
                  "&:hover": { bgcolor: isDark ? "rgba(59, 130, 246, 0.25)" : "#dbeafe" },
                }}
              >
                Unread ({unreadTotal})
              </Button>

              <Button
                size="small"
                onClick={() => setStatusFilter("read")}
                sx={{
                  borderRadius: "8px",
                  px: 1.5,
                  height: 32,
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  textTransform: "none",
                  bgcolor: statusFilter === "read" ? (isDark ? "rgba(59, 130, 246, 0.15)" : "#eff6ff") : "transparent",
                  color: statusFilter === "read" ? "#3b82f6" : textSub,
                  "&:hover": { bgcolor: isDark ? "rgba(59, 130, 246, 0.25)" : "#dbeafe" },
                }}
              >
                Read ({notifications.length - unreadTotal})
              </Button>
            </Stack>
          </Stack>

          <Divider sx={{ borderColor: dividerBorder }} />

          {/* Search Bar & Category Dropdown */}
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={1.5}
            alignItems="center"
            justifyContent="space-between"
          >
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems="center" sx={{ width: { xs: "100%", sm: "auto" }, flex: 1 }}>
              <TextField
                placeholder="Search notifications..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                size="small"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search sx={{ color: textSub, fontSize: 18 }} />
                    </InputAdornment>
                  ),
                  endAdornment: searchQuery ? (
                    <InputAdornment position="end">
                      <IconButton size="small" onClick={() => setSearchQuery("")} sx={{ p: 0.5 }}>
                        <Close sx={{ fontSize: 16 }} />
                      </IconButton>
                    </InputAdornment>
                  ) : null,
                }}
                sx={{
                  width: { xs: "100%", sm: 280 },
                  "& .MuiOutlinedInput-root": {
                    bgcolor: inputBg,
                    borderRadius: "10px",
                    color: textTitle,
                    fontSize: "0.85rem",
                    "& fieldset": { borderColor: inputBorder },
                    "&:hover fieldset": { borderColor: "#3b82f6" },
                    "& input::placeholder": { color: textSub, opacity: 1 },
                  },
                }}
              />

              <Select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                size="small"
                sx={{
                  minWidth: 160,
                  bgcolor: inputBg,
                  borderRadius: "10px",
                  color: textTitle,
                  fontSize: "0.85rem",
                  "& .MuiSelect-select": { color: textTitle, fontWeight: 600 },
                  "& .MuiOutlinedInput-notchedOutline": { borderColor: inputBorder },
                  "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "#3b82f6" },
                  "& .MuiSvgIcon-root": { color: textSub },
                }}
              >
                <MenuItem value="all">Category: All</MenuItem>
                <MenuItem value="logout" sx={{ color: "#ef4444", fontWeight: 700 }}>
                  User Logout (Red Alert)
                </MenuItem>
                <MenuItem value="tracking">Category: Tracking Alerts</MenuItem>
                <MenuItem value="attendance">Category: Attendance</MenuItem>
                <MenuItem value="leads">Category: Lead Updates</MenuItem>
              </Select>
            </Stack>

            {hasActiveFilters && (
              <Button
                size="small"
                startIcon={<Close sx={{ fontSize: 14 }} />}
                onClick={handleResetFilters}
                sx={{
                  color: "#ef4444",
                  fontWeight: 700,
                  fontSize: "0.8rem",
                  textTransform: "none",
                  flexShrink: 0,
                }}
              >
                Reset Filters
              </Button>
            )}
          </Stack>
        </Stack>
      </Paper>

      {/* ── 3. Notification List ── */}
      <Paper
        elevation={0}
        sx={{
          borderRadius: 4,
          bgcolor: cardBg,
          border: `1px solid ${cardBorder}`,
          overflow: "hidden",
        }}
      >
        {loading ? (
          <Box sx={{ py: 8, display: "flex", justifyContent: "center" }}>
            <CircularProgress size={36} sx={{ color: "#3b82f6" }} />
          </Box>
        ) : filteredNotifications.length === 0 ? (
          <Box sx={{ py: 8, textAlign: "center" }}>
            <NotificationsIcon sx={{ fontSize: 48, color: textSub, opacity: 0.5, mb: 1.5 }} />
            <Typography sx={{ color: textTitle, fontWeight: 700, fontSize: "1rem" }}>
              No Notifications Found
            </Typography>
            <Typography sx={{ color: textSub, fontSize: "0.85rem", mt: 0.5 }}>
              {periodFilter === "today"
                ? "No notifications received today."
                : "No notifications match your filter criteria."}
            </Typography>
            {periodFilter === "today" && notifications.length > 0 && (
              <Button
                size="small"
                variant="outlined"
                onClick={() => setPeriodFilter("all")}
                sx={{ mt: 2, borderRadius: 2, textTransform: "none", fontWeight: 700, fontSize: "0.82rem" }}
              >
                View All Time ({notifications.length})
              </Button>
            )}
          </Box>
        ) : (
          filteredNotifications.map((item, index) => {
            const cat = getCategoryDetails(item.type, item.title, item.message);
            const isLogout = Boolean(cat.isLogout);
            return (
              <React.Fragment key={item.id}>
                <Box
                  onClick={() => {
                    if (!item.read) handleMarkRead(item.id);
                  }}
                  sx={{
                    px: { xs: 2, md: 3 },
                    py: 2.2,
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 2,
                    bgcolor: isLogout
                      ? (isDark ? "rgba(239, 68, 68, 0.08)" : "rgba(254, 242, 242, 0.95)")
                      : item.read ? itemReadBg : itemUnreadBg,
                    borderLeft: isLogout
                      ? "5px solid #ef4444"
                      : item.read ? "3px solid transparent" : "3px solid #2563eb",
                    boxShadow: isLogout
                      ? (isDark ? "inset 0 0 10px rgba(239, 68, 68, 0.12)" : "inset 0 0 8px rgba(239, 68, 68, 0.06)")
                      : "none",
                    cursor: !item.read ? "pointer" : "default",
                    transition: "all 0.2s ease",
                    "&:hover": {
                      bgcolor: isLogout
                        ? (isDark ? "rgba(239, 68, 68, 0.14)" : "rgba(254, 226, 226, 0.98)")
                        : item.read
                        ? (isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)")
                        : (isDark ? "rgba(37, 99, 235, 0.12)" : "rgba(30, 64, 175, 0.08)"),
                    },
                  }}
                >
                  {/* Category-specific Icon Box */}
                  <Box
                    sx={{
                      width: 44,
                      height: 44,
                      borderRadius: "14px",
                      bgcolor: cat.bg,
                      color: cat.color,
                      border: `1.5px solid ${cat.border}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      boxShadow: isLogout ? "0 2px 8px rgba(239, 68, 68, 0.25)" : "none",
                    }}
                  >
                    {cat.icon}
                  </Box>

                  <Box sx={{ flex: 1, minWidth: 0, pt: 0.25 }}>
                    <Stack
                      direction={{ xs: "column", sm: "row" }}
                      spacing={1}
                      alignItems={{ xs: "flex-start", sm: "center" }}
                      justifyContent="space-between"
                      sx={{ mb: 0.6 }}
                    >
                      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                        <Typography sx={{ fontSize: "0.95rem", fontWeight: 800, color: isLogout ? "#dc2626" : textTitle }}>
                          {item.title}
                        </Typography>
                        <Chip
                          size="small"
                          label={cat.label}
                          sx={{
                            height: 22,
                            bgcolor: cat.bg,
                            color: cat.color,
                            border: `1px solid ${cat.border}`,
                            fontWeight: 700,
                            fontSize: "0.72rem",
                          }}
                        />
                        {!item.read && (
                          <FiberManualRecordIcon sx={{ fontSize: 10, color: "#3b82f6" }} />
                        )}
                      </Stack>

                      <Typography sx={{ fontSize: "0.78rem", color: textSub, flexShrink: 0 }}>
                        {item.time}
                      </Typography>
                    </Stack>

                    <Typography sx={{ color: textBody, lineHeight: 1.6, fontSize: "0.88rem" }}>
                      {item.message}
                    </Typography>
                  </Box>

                  {!item.read && (
                    <IconButton
                      onClick={() => handleMarkRead(item.id)}
                      title="Mark as read"
                      sx={{
                        color: isDark ? "#60a5fa" : PRIMARY,
                        border: `1px solid ${isDark ? "rgba(59, 130, 246, 0.25)" : alpha(PRIMARY, 0.18)}`,
                        bgcolor: isDark ? "rgba(59, 130, 246, 0.12)" : alpha(PRIMARY, 0.06),
                        "&:hover": { bgcolor: isDark ? "rgba(59, 130, 246, 0.25)" : alpha(PRIMARY, 0.12) },
                      }}
                    >
                      <MarkEmailReadIcon fontSize="small" />
                    </IconButton>
                  )}
                </Box>
                {index < filteredNotifications.length - 1 && <Divider sx={{ borderColor: dividerBorder }} />}
              </React.Fragment>
            );
          })
        )}
      </Paper>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar((p) => ({ ...p, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          onClose={() => setSnackbar((p) => ({ ...p, open: false }))}
          severity={snackbar.severity}
          variant="filled"
          sx={{ width: "100%", borderRadius: 2 }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
