import React, { useState, useEffect, useCallback } from "react";
import {
  Box,
  Typography,
  Paper,
  Grid,
  Stack,
  Button,
  IconButton,
  Chip,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  InputAdornment,
  Tooltip,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  useTheme,
  alpha,
} from "@mui/material";
import {
  Storage,
  Refresh,
  Speed,
  Layers,
  Article,
  FindInPage,
  CheckCircle,
  Warning,
  ErrorOutline,
  Search,
  Dns,
  CloudDone,
  DeleteSweep,
  CleaningServices,
  LocationOff,
  NotificationsActive,
  BatteryAlert,
  Security,
} from "@mui/icons-material";
import { API_BASE_URL } from "../utils/apiConfig";

const PRIMARY = "#0f1f3d";

export default function DatabaseSettingsPage() {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  // Dynamic Theme Colors
  const pageBg = isDark ? "#050811" : "#f8f9fa";
  const cardBg = isDark ? "#0e1424" : "#ffffff";
  const cardBorder = isDark ? "rgba(255, 255, 255, 0.08)" : "#e2e8f0";
  const textTitle = isDark ? "#ffffff" : "#0f172a";
  const textSub = isDark ? "#94a3b8" : "#64748b";
  const headerBg = isDark
    ? "linear-gradient(135deg, #090e1a 0%, #111736 40%, #17203a 100%)"
    : "linear-gradient(135deg, #0f1f3d 0%, #1e3a8a 60%, #2563eb 100%)";
  const tableHeaderBg = isDark ? "#111827" : "#f1f5f9";
  const inputBg = isDark ? "#0a0e1a" : "#ffffff";
  const inputBorder = isDark ? "rgba(255, 255, 255, 0.12)" : "#cbd5e1";

  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cleaning, setCleaning] = useState(false);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [lastRefreshed, setLastRefreshed] = useState(new Date());

  // Clean Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogTarget, setDialogTarget] = useState(null); // { actionType, title, collectionName, defaultDays }
  const [selectedDays, setSelectedDays] = useState(30);
  const [confirmKeyword, setConfirmKeyword] = useState("");
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const token =
        localStorage.getItem("token") ||
        localStorage.getItem("authToken") ||
        localStorage.getItem("accessToken") ||
        "";

      const res = await fetch(`${API_BASE_URL}/system/db-stats`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to load database stats");
      }

      setStats(json.data);
      setLastRefreshed(new Date());
    } catch (err) {
      setError(err.message || "Network error fetching database metrics");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const handleOpenCleanDialog = (targetConfig) => {
    setDialogTarget(targetConfig);
    setSelectedDays(targetConfig.defaultDays || 30);
    setConfirmKeyword("");
    setDialogOpen(true);
  };

  const handleExecuteClean = async () => {
    if (!dialogTarget) return;

    if (dialogTarget.requiresConfirmation && confirmKeyword !== "CONFIRM CLEAN") {
      setSnackbar({ open: true, message: "Please type 'CONFIRM CLEAN' to proceed.", severity: "warning" });
      return;
    }

    setCleaning(true);
    try {
      const token =
        localStorage.getItem("token") ||
        localStorage.getItem("authToken") ||
        localStorage.getItem("accessToken") ||
        "";

      const payload = {
        actionType: dialogTarget.actionType,
        collectionName: dialogTarget.collectionName,
        daysOlderThan: Number(selectedDays),
        confirmKeyword: confirmKeyword.trim(),
      };

      const res = await fetch(`${API_BASE_URL}/system/clean-data`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to clean database data");
      }

      setSnackbar({
        open: true,
        message: data.message || `Cleaned successfully (${data.deletedCount} records removed)!`,
        severity: "success",
      });

      setDialogOpen(false);
      await fetchStats();
    } catch (err) {
      setSnackbar({
        open: true,
        message: err.message || "Cleanup failed",
        severity: "error",
      });
    } finally {
      setCleaning(false);
    }
  };

  // Health calculation
  const percentageUsed = stats?.percentageUsed || 0;
  const isCritical = percentageUsed >= 90;
  const isWarning = percentageUsed >= 70 && percentageUsed < 90;
  const healthColor = isCritical ? "#ef4444" : isWarning ? "#f59e0b" : "#10b981";
  const healthLabel = isCritical ? "Critical" : isWarning ? "Warning" : "Healthy";

  // Filter collections by search query
  const filteredCollections = (stats?.collections || []).filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3, bgcolor: pageBg, p: { xs: 1.5, sm: 3 } }}>
      
      {/* ── 1. Top Header Banner ── */}
      <Paper
        elevation={0}
        sx={{
          p: { xs: 2.5, md: 3 },
          borderRadius: 4,
          border: `1px solid ${cardBorder}`,
          background: headerBg,
          color: "#ffffff",
          boxShadow: isDark ? "0 10px 30px rgba(0,0,0,0.5)" : "0 8px 24px rgba(15,31,61,0.15)",
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
                width: 52,
                height: 52,
                borderRadius: "16px",
                bgcolor: "rgba(255, 255, 255, 0.12)",
                backdropFilter: "blur(8px)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: "1px solid rgba(255, 255, 255, 0.2)",
              }}
            >
              <Storage sx={{ fontSize: 28, color: "#60a5fa" }} />
            </Box>
            <Box>
              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                <Typography variant="h5" sx={{ fontWeight: 800, letterSpacing: "-0.02em" }}>
                  Database Storage & Optimization
                </Typography>
                <Chip
                  size="small"
                  icon={<CloudDone sx={{ fontSize: "14px !important", color: "#60a5fa !important" }} />}
                  label={stats?.dbName ? `DB: ${stats.dbName}` : "MongoDB Cluster"}
                  sx={{
                    bgcolor: "rgba(96, 165, 250, 0.15)",
                    color: "#93c5fd",
                    fontWeight: 700,
                    border: "1px solid rgba(96, 165, 250, 0.3)",
                  }}
                />
              </Stack>
              <Typography sx={{ color: "rgba(255, 255, 255, 0.75)", fontSize: "0.85rem", mt: 0.5 }}>
                Real-time MongoDB storage metrics, collections breakdown, and data cleaning tools
              </Typography>
            </Box>
          </Box>

          <Stack direction="row" spacing={1.5} alignItems="center">
            <Typography variant="caption" sx={{ color: "rgba(255, 255, 255, 0.7)", display: { xs: "none", md: "block" } }}>
              Updated: {lastRefreshed.toLocaleTimeString("en-IN")}
            </Typography>
            <Button
              variant="contained"
              onClick={fetchStats}
              disabled={loading}
              startIcon={loading ? <CircularProgress size={16} sx={{ color: "#fff" }} /> : <Refresh />}
              sx={{
                borderRadius: 2.5,
                bgcolor: "rgba(255, 255, 255, 0.15)",
                backdropFilter: "blur(10px)",
                color: "#ffffff",
                fontWeight: 700,
                textTransform: "none",
                px: 2,
                border: "1px solid rgba(255, 255, 255, 0.25)",
                "&:hover": { bgcolor: "rgba(255, 255, 255, 0.25)" },
              }}
            >
              Refresh Stats
            </Button>
          </Stack>
        </Stack>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ borderRadius: 3 }}>
          {error}
        </Alert>
      )}

      {/* ── 2. Storage Progress & Health Card ── */}
      <Paper
        elevation={0}
        sx={{
          p: { xs: 2.5, md: 3 },
          borderRadius: 4,
          bgcolor: cardBg,
          border: `1px solid ${cardBorder}`,
          boxShadow: isDark ? "0 4px 20px rgba(0,0,0,0.3)" : "0 2px 12px rgba(0,0,0,0.03)",
        }}
      >
        <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", sm: "center" }} sx={{ mb: 2 }}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Box
              sx={{
                width: 38,
                height: 38,
                borderRadius: "10px",
                bgcolor: alpha(healthColor, 0.12),
                color: healthColor,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {isCritical ? <ErrorOutline /> : isWarning ? <Warning /> : <CheckCircle />}
            </Box>
            <Box>
              <Typography sx={{ fontWeight: 800, fontSize: "1.05rem", color: textTitle }}>
                Database Storage Capacity
              </Typography>
              <Typography sx={{ fontSize: "0.82rem", color: textSub }}>
                Allocated storage usage compared to cluster limit
              </Typography>
            </Box>
          </Stack>

          <Chip
            size="small"
            label={`Cluster Status: ${healthLabel}`}
            sx={{
              bgcolor: alpha(healthColor, 0.12),
              color: healthColor,
              border: `1px solid ${alpha(healthColor, 0.25)}`,
              fontWeight: 800,
              fontSize: "0.78rem",
              mt: { xs: 1, sm: 0 },
            }}
          />
        </Stack>

        {/* Big Progress Bar */}
        <Box sx={{ mt: 2, mb: 1 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="baseline" sx={{ mb: 1 }}>
            <Typography sx={{ fontSize: "1.4rem", fontWeight: 900, color: textTitle }}>
              {stats?.totalAllocatedMB ?? 0} MB{" "}
              <Typography component="span" sx={{ fontSize: "0.95rem", color: textSub, fontWeight: 500 }}>
                / {stats?.limitMB ?? 512} MB
              </Typography>
            </Typography>
            <Typography sx={{ fontSize: "1.2rem", fontWeight: 800, color: healthColor }}>
              {percentageUsed}% Full
            </Typography>
          </Stack>

          <LinearProgress
            variant={loading ? "indeterminate" : "determinate"}
            value={percentageUsed}
            sx={{
              height: 14,
              borderRadius: 7,
              bgcolor: isDark ? "rgba(255, 255, 255, 0.08)" : "#e2e8f0",
              "& .MuiLinearProgress-bar": {
                borderRadius: 7,
                bgcolor: healthColor,
                backgroundImage: `linear-gradient(90deg, ${alpha(healthColor, 0.7)}, ${healthColor})`,
              },
            }}
          />
        </Box>

        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} justifyContent="space-between" sx={{ mt: 2, pt: 2, borderTop: `1px solid ${cardBorder}` }}>
          <Typography sx={{ fontSize: "0.82rem", color: textSub }}>
            🟢 <b>Free Space Available:</b> {stats?.freeSpaceMB ?? 0} MB
          </Typography>
          <Typography sx={{ fontSize: "0.82rem", color: textSub }}>
            📦 <b>Document Data:</b> {stats?.dataSizeMB ?? 0} MB &bull; 🗂️ <b>Indexes:</b> {stats?.indexSizeMB ?? 0} MB
          </Typography>
          <Typography sx={{ fontSize: "0.82rem", color: textSub }}>
            ⚡ <b>Latency:</b> {stats?.pingMs ?? 0} ms
          </Typography>
        </Stack>
      </Paper>

      {/* ── 3. Quick Clean & Space Optimization Actions ── */}
      <Paper
        elevation={0}
        sx={{
          p: { xs: 2.5, md: 3 },
          borderRadius: 4,
          bgcolor: cardBg,
          border: `1px solid ${cardBorder}`,
          boxShadow: isDark ? "0 4px 20px rgba(0,0,0,0.3)" : "0 2px 12px rgba(0,0,0,0.03)",
        }}
      >
        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: "10px",
              bgcolor: alpha("#3b82f6", 0.12),
              color: "#3b82f6",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <CleaningServices sx={{ fontSize: 20 }} />
          </Box>
          <Box>
            <Typography sx={{ fontWeight: 800, fontSize: "1.05rem", color: textTitle }}>
              Quick Database Cleaners & Free Space
            </Typography>
            <Typography sx={{ fontSize: "0.82rem", color: textSub }}>
              Safely clean heavy background logs and old notifications to recover database megabytes
            </Typography>
          </Box>
        </Stack>

        <Grid container spacing={2}>
          {/* Action 1: Clean Old GPS Tracking Points */}
          <Grid item xs={12} sm={6} md={3}>
            <Paper
              elevation={0}
              sx={{
                p: 2,
                borderRadius: 3,
                border: `1px solid ${cardBorder}`,
                bgcolor: isDark ? "rgba(255,255,255,0.02)" : "#f8fafc",
                height: "100%",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
              }}
            >
              <Box>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                  <LocationOff sx={{ color: "#ef4444", fontSize: 20 }} />
                  <Typography sx={{ fontWeight: 800, fontSize: "0.9rem", color: textTitle }}>
                    Old GPS Points
                  </Typography>
                </Stack>
                <Typography sx={{ fontSize: "0.78rem", color: textSub, mb: 2 }}>
                  Cleans old salesman route points older than 30 days. Frees up significant database space.
                </Typography>
              </Box>
              <Button
                variant="outlined"
                color="error"
                size="small"
                startIcon={<DeleteSweep />}
                onClick={() =>
                  handleOpenCleanDialog({
                    actionType: "clearOldGpsPoints",
                    title: "Clean Old GPS Location Points",
                    description: "This will delete location tracking history older than the selected days.",
                    defaultDays: 30,
                    showDaysPicker: true,
                  })
                }
                sx={{ borderRadius: 2, fontWeight: 700, textTransform: "none" }}
              >
                Clean GPS Points
              </Button>
            </Paper>
          </Grid>

          {/* Action 2: Clean Read Notifications */}
          <Grid item xs={12} sm={6} md={3}>
            <Paper
              elevation={0}
              sx={{
                p: 2,
                borderRadius: 3,
                border: `1px solid ${cardBorder}`,
                bgcolor: isDark ? "rgba(255,255,255,0.02)" : "#f8fafc",
                height: "100%",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
              }}
            >
              <Box>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                  <NotificationsActive sx={{ color: "#3b82f6", fontSize: 20 }} />
                  <Typography sx={{ fontWeight: 800, fontSize: "0.9rem", color: textTitle }}>
                    Read Notifications
                  </Typography>
                </Stack>
                <Typography sx={{ fontSize: "0.78rem", color: textSub, mb: 2 }}>
                  Purges all notifications that users or admins have already marked as read.
                </Typography>
              </Box>
              <Button
                variant="outlined"
                color="primary"
                size="small"
                startIcon={<DeleteSweep />}
                onClick={() =>
                  handleOpenCleanDialog({
                    actionType: "clearReadNotifications",
                    title: "Clean Read Notifications",
                    description: "This will permanently delete all notifications that are marked as read.",
                    defaultDays: 0,
                    showDaysPicker: false,
                  })
                }
                sx={{ borderRadius: 2, fontWeight: 700, textTransform: "none" }}
              >
                Clear Read Alerts
              </Button>
            </Paper>
          </Grid>

          {/* Action 3: Clean Old Notifications */}
          <Grid item xs={12} sm={6} md={3}>
            <Paper
              elevation={0}
              sx={{
                p: 2,
                borderRadius: 3,
                border: `1px solid ${cardBorder}`,
                bgcolor: isDark ? "rgba(255,255,255,0.02)" : "#f8fafc",
                height: "100%",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
              }}
            >
              <Box>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                  <NotificationsActive sx={{ color: "#f59e0b", fontSize: 20 }} />
                  <Typography sx={{ fontWeight: 800, fontSize: "0.9rem", color: textTitle }}>
                    Notifications &gt; 30 Days
                  </Typography>
                </Stack>
                <Typography sx={{ fontSize: "0.78rem", color: textSub, mb: 2 }}>
                  Deletes all historical notification records older than 30 days.
                </Typography>
              </Box>
              <Button
                variant="outlined"
                color="warning"
                size="small"
                startIcon={<DeleteSweep />}
                onClick={() =>
                  handleOpenCleanDialog({
                    actionType: "clearOldNotifications",
                    title: "Clean Historical Notifications",
                    description: "This will delete notifications older than the chosen number of days.",
                    defaultDays: 30,
                    showDaysPicker: true,
                  })
                }
                sx={{ borderRadius: 2, fontWeight: 700, textTransform: "none" }}
              >
                Purge Old Alerts
              </Button>
            </Paper>
          </Grid>

          {/* Action 4: Clean Battery / Status Telemetry */}
          <Grid item xs={12} sm={6} md={3}>
            <Paper
              elevation={0}
              sx={{
                p: 2,
                borderRadius: 3,
                border: `1px solid ${cardBorder}`,
                bgcolor: isDark ? "rgba(255,255,255,0.02)" : "#f8fafc",
                height: "100%",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
              }}
            >
              <Box>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                  <BatteryAlert sx={{ color: "#8b5cf6", fontSize: 20 }} />
                  <Typography sx={{ fontWeight: 800, fontSize: "0.9rem", color: textTitle }}>
                    Battery &amp; Status Logs
                  </Typography>
                </Stack>
                <Typography sx={{ fontSize: "0.78rem", color: textSub, mb: 2 }}>
                  Cleans old mobile battery level logs and periodic tracking status events.
                </Typography>
              </Box>
              <Button
                variant="outlined"
                color="secondary"
                size="small"
                startIcon={<DeleteSweep />}
                onClick={() =>
                  handleOpenCleanDialog({
                    actionType: "clearOldBatteryLogs",
                    title: "Clean Mobile Battery Logs",
                    description: "This will delete battery monitoring telemetry older than 15 days.",
                    defaultDays: 15,
                    showDaysPicker: true,
                  })
                }
                sx={{ borderRadius: 2, fontWeight: 700, textTransform: "none" }}
              >
                Clean Battery Logs
              </Button>
            </Paper>
          </Grid>
        </Grid>
      </Paper>

      {/* ── 4. 6 Key Metric Cards ── */}
      <Grid container spacing={2}>
        {[
          {
            title: "Total Storage",
            value: `${stats?.totalAllocatedMB ?? 0} MB`,
            sub: `Limit: ${stats?.limitMB ?? 512} MB`,
            icon: <Storage sx={{ fontSize: 22 }} />,
            color: "#3b82f6",
          },
          {
            title: "Data Size",
            value: `${stats?.dataSizeMB ?? 0} MB`,
            sub: "Raw documents footprint",
            icon: <Article sx={{ fontSize: 22 }} />,
            color: "#8b5cf6",
          },
          {
            title: "Index Size",
            value: `${stats?.indexSizeMB ?? 0} MB`,
            sub: `${stats?.indexesCount ?? 0} Total indexes`,
            icon: <FindInPage sx={{ fontSize: 22 }} />,
            color: "#ec4899",
          },
          {
            title: "Total Documents",
            value: Number(stats?.totalObjects ?? 0).toLocaleString(),
            sub: `Avg size: ${stats?.avgObjSizeBytes ?? 0} B`,
            icon: <Layers sx={{ fontSize: 22 }} />,
            color: "#10b981",
          },
          {
            title: "Collections",
            value: stats?.collectionsCount ?? 0,
            sub: "Active database models",
            icon: <Dns sx={{ fontSize: 22 }} />,
            color: "#f59e0b",
          },
          {
            title: "Database Ping",
            value: `${stats?.pingMs ?? 0} ms`,
            sub: stats?.readyState === 1 ? "Connected & Active" : "Disconnected",
            icon: <Speed sx={{ fontSize: 22 }} />,
            color: "#06b6d4",
          },
        ].map((card, idx) => (
          <Grid item xs={12} sm={6} md={4} lg={2} key={idx}>
            <Paper
              elevation={0}
              sx={{
                p: 2,
                borderRadius: 3,
                bgcolor: cardBg,
                border: `1px solid ${cardBorder}`,
                boxShadow: isDark ? "0 4px 16px rgba(0,0,0,0.2)" : "0 2px 8px rgba(0,0,0,0.02)",
                height: "100%",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                transition: "transform 0.2s",
                "&:hover": { transform: "translateY(-2px)" },
              }}
            >
              <Stack direction="row" spacing={1.25} alignItems="center" sx={{ mb: 1 }}>
                <Box
                  sx={{
                    width: 36,
                    height: 36,
                    borderRadius: "10px",
                    bgcolor: alpha(card.color, 0.12),
                    color: card.color,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {card.icon}
                </Box>
                <Typography sx={{ fontSize: "0.82rem", fontWeight: 700, color: textSub }}>
                  {card.title}
                </Typography>
              </Stack>
              <Box>
                <Typography sx={{ fontSize: "1.25rem", fontWeight: 800, color: textTitle }}>
                  {loading ? <CircularProgress size={16} /> : card.value}
                </Typography>
                <Typography sx={{ fontSize: "0.72rem", color: textSub, mt: 0.2 }}>
                  {card.sub}
                </Typography>
              </Box>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* ── 5. Collections Storage Breakdown Table ── */}
      <Paper
        elevation={0}
        sx={{
          borderRadius: 4,
          bgcolor: cardBg,
          border: `1px solid ${cardBorder}`,
          overflow: "hidden",
          boxShadow: isDark ? "0 4px 20px rgba(0,0,0,0.3)" : "0 2px 12px rgba(0,0,0,0.03)",
        }}
      >
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={2}
          alignItems={{ xs: "flex-start", sm: "center" }}
          justifyContent="space-between"
          sx={{ p: { xs: 2, sm: 2.5 }, borderBottom: `1px solid ${cardBorder}` }}
        >
          <Box>
            <Typography sx={{ fontSize: "1.05rem", fontWeight: 800, color: textTitle }}>
              Collections Storage Breakdown
            </Typography>
            <Typography sx={{ fontSize: "0.82rem", color: textSub }}>
              Detailed usage per collection (sorted by storage size)
            </Typography>
          </Box>

          <TextField
            placeholder="Search collection name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            size="small"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search sx={{ color: textSub, fontSize: 18 }} />
                </InputAdornment>
              ),
            }}
            sx={{
              width: { xs: "100%", sm: 260 },
              "& .MuiOutlinedInput-root": {
                bgcolor: inputBg,
                borderRadius: "10px",
                color: textTitle,
                fontSize: "0.85rem",
                "& fieldset": { borderColor: inputBorder },
              },
            }}
          />
        </Stack>

        <TableContainer sx={{ maxHeight: 480 }}>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ bgcolor: tableHeaderBg, fontWeight: 800, color: textTitle, py: 1.5 }}>
                  Collection
                </TableCell>
                <TableCell align="right" sx={{ bgcolor: tableHeaderBg, fontWeight: 800, color: textTitle }}>
                  Documents
                </TableCell>
                <TableCell align="right" sx={{ bgcolor: tableHeaderBg, fontWeight: 800, color: textTitle }}>
                  Data Size (MB)
                </TableCell>
                <TableCell align="right" sx={{ bgcolor: tableHeaderBg, fontWeight: 800, color: textTitle }}>
                  Disk Storage (MB)
                </TableCell>
                <TableCell align="right" sx={{ bgcolor: tableHeaderBg, fontWeight: 800, color: textTitle }}>
                  Indexes
                </TableCell>
                <TableCell align="right" sx={{ bgcolor: tableHeaderBg, fontWeight: 800, color: textTitle }}>
                  Index Size (MB)
                </TableCell>
                <TableCell sx={{ bgcolor: tableHeaderBg, fontWeight: 800, color: textTitle, minWidth: 140 }}>
                  Share %
                </TableCell>
                <TableCell align="center" sx={{ bgcolor: tableHeaderBg, fontWeight: 800, color: textTitle }}>
                  Actions
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 6 }}>
                    <CircularProgress size={30} />
                  </TableCell>
                </TableRow>
              ) : filteredCollections.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 6, color: textSub }}>
                    No collections match your search.
                  </TableCell>
                </TableRow>
              ) : (
                filteredCollections.map((col) => {
                  const sharePct = stats?.totalAllocatedMB
                    ? Math.min(100, Number((((col.storageSizeMB + col.totalIndexSizeMB) / stats.totalAllocatedMB) * 100).toFixed(1)))
                    : 0;

                  return (
                    <TableRow
                      key={col.name}
                      sx={{
                        "&:hover": {
                          bgcolor: isDark ? "rgba(255,255,255,0.03)" : "rgba(30,64,175,0.04)",
                        },
                        "& td": { borderBottom: `1px solid ${cardBorder}` },
                      }}
                    >
                      <TableCell sx={{ fontWeight: 700, color: textTitle }}>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Layers sx={{ fontSize: 16, color: "#3b82f6" }} />
                          <Typography sx={{ fontWeight: 700, fontSize: "0.88rem" }}>
                            {col.name}
                          </Typography>
                        </Stack>
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, color: textTitle }}>
                        {Number(col.count).toLocaleString()}
                      </TableCell>
                      <TableCell align="right" sx={{ color: textSub }}>
                        {col.sizeMB} MB
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, color: isDark ? "#60a5fa" : PRIMARY }}>
                        {col.storageSizeMB} MB
                      </TableCell>
                      <TableCell align="right" sx={{ color: textSub }}>
                        {col.indexes}
                      </TableCell>
                      <TableCell align="right" sx={{ color: textSub }}>
                        {col.totalIndexSizeMB} MB
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <LinearProgress
                            variant="determinate"
                            value={sharePct}
                            sx={{
                              flex: 1,
                              height: 6,
                              borderRadius: 3,
                              bgcolor: isDark ? "rgba(255,255,255,0.06)" : "#e2e8f0",
                              "& .MuiLinearProgress-bar": { bgcolor: "#3b82f6", borderRadius: 3 },
                            }}
                          />
                          <Typography sx={{ fontSize: "0.72rem", fontWeight: 700, color: textSub, minWidth: 35 }}>
                            {sharePct}%
                          </Typography>
                        </Stack>
                      </TableCell>
                      <TableCell align="center">
                        <Button
                          size="small"
                          color="error"
                          variant="outlined"
                          onClick={() =>
                            handleOpenCleanDialog({
                              actionType: "customCollectionClean",
                              title: `Clean Collection: ${col.name}`,
                              collectionName: col.name,
                              description: `Clean old or unused records from '${col.name}' to free disk storage.`,
                              defaultDays: 30,
                              showDaysPicker: true,
                              requiresConfirmation: true,
                            })
                          }
                          sx={{
                            borderRadius: 1.5,
                            fontSize: "0.72rem",
                            py: 0.2,
                            px: 1,
                            textTransform: "none",
                            fontWeight: 700,
                          }}
                        >
                          Clean
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* ── Cleanup Confirmation Modal Dialog ── */}
      <Dialog
        open={dialogOpen}
        onClose={() => !cleaning && setDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3.5,
            bgcolor: cardBg,
            border: `1px solid ${cardBorder}`,
            p: 1,
          },
        }}
      >
        <DialogTitle sx={{ color: textTitle, fontWeight: 800, pb: 1 }}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Warning sx={{ color: "#ef4444" }} />
            <Typography variant="h6" fontWeight={800}>
              {dialogTarget?.title || "Database Cleanup Confirmation"}
            </Typography>
          </Stack>
        </DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1.5 }}>
          <Typography sx={{ fontSize: "0.9rem", color: textSub }}>
            {dialogTarget?.description}
          </Typography>

          {dialogTarget?.showDaysPicker && (
            <FormControl size="small" fullWidth sx={{ mt: 1 }}>
              <InputLabel sx={{ color: textSub }}>Delete Data Older Than</InputLabel>
              <Select
                value={selectedDays}
                onChange={(e) => setSelectedDays(e.target.value)}
                label="Delete Data Older Than"
                sx={{
                  bgcolor: inputBg,
                  borderRadius: 2,
                  color: textTitle,
                  "& .MuiOutlinedInput-notchedOutline": { borderColor: inputBorder },
                }}
              >
                <MenuItem value={15}>Older than 15 Days</MenuItem>
                <MenuItem value={30}>Older than 30 Days (Recommended)</MenuItem>
                <MenuItem value={60}>Older than 60 Days</MenuItem>
                <MenuItem value={90}>Older than 90 Days</MenuItem>
                <MenuItem value={0} sx={{ color: "#ef4444", fontWeight: 700 }}>
                  ⚠️ Delete ALL records in collection
                </MenuItem>
              </Select>
            </FormControl>
          )}

          {dialogTarget?.requiresConfirmation && (
            <Box sx={{ mt: 1 }}>
              <Typography sx={{ fontSize: "0.82rem", fontWeight: 700, color: "#ef4444", mb: 0.5 }}>
                Type <b style={{ textDecoration: "underline" }}>CONFIRM CLEAN</b> below to authorize this deletion:
              </Typography>
              <TextField
                size="small"
                fullWidth
                placeholder="CONFIRM CLEAN"
                value={confirmKeyword}
                onChange={(e) => setConfirmKeyword(e.target.value)}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    bgcolor: inputBg,
                    borderRadius: 2,
                    color: textTitle,
                    "& fieldset": { borderColor: inputBorder },
                  },
                }}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => setDialogOpen(false)}
            disabled={cleaning}
            sx={{ color: textSub, textTransform: "none", fontWeight: 700 }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            disabled={
              cleaning ||
              (dialogTarget?.requiresConfirmation && confirmKeyword !== "CONFIRM CLEAN")
            }
            onClick={handleExecuteClean}
            startIcon={cleaning ? <CircularProgress size={16} sx={{ color: "#fff" }} /> : <DeleteSweep />}
            sx={{
              borderRadius: 2,
              fontWeight: 800,
              textTransform: "none",
              px: 2.5,
            }}
          >
            {cleaning ? "Cleaning..." : "Execute Cleanup"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar alerts */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          severity={snackbar.severity}
          onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
          sx={{ borderRadius: 2.5, fontWeight: 700 }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
