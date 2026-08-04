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
} from "@mui/material";
import {
  Notifications as NotificationsIcon,
  MarkEmailRead as MarkEmailReadIcon,
  FiberManualRecord as FiberManualRecordIcon,
  NotificationsActive as NotificationsActiveIcon,
} from "@mui/icons-material";
import { API_BASE_URL } from "../utils/apiConfig";

const PRIMARY = "#0f1f3d";
const API = API_BASE_URL;

const getToken = () =>
  localStorage.getItem("token") ||
  localStorage.getItem("authToken") ||
  localStorage.getItem("accessToken") ||
  "";

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
  const headerBg = isDark ? "#0e1424" : "linear-gradient(135deg, rgba(69,105,234,0.08) 0%, rgba(255,255,255,1) 55%)";
  const itemUnreadBg = isDark ? "#0b101c" : alpha(PRIMARY, 0.04);
  const itemReadBg = isDark ? "#0e1424" : "#ffffff";
  const chipBg = isDark ? "rgba(59, 130, 246, 0.15)" : "#f8fafc";
  const chipText = isDark ? "#60a5fa" : "#475569";
  const chipBorder = isDark ? "rgba(59, 130, 246, 0.25)" : "#e2e8f0";
  const iconBoxBg = isDark ? "rgba(59, 130, 246, 0.15)" : alpha(PRIMARY, 0.12);
  const iconBoxColor = isDark ? "#60a5fa" : PRIMARY;
  const iconBoxBorder = isDark ? "rgba(59, 130, 246, 0.25)" : alpha(PRIMARY, 0.16);
  const dividerBorder = isDark ? "rgba(255, 255, 255, 0.06)" : "#e2e8f0";

  const [notifications, setNotifications] = useState([]);
  const [testingPush, setTestingPush] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "info" });

  const unreadCount = useMemo(
    () => notifications.filter((item) => !item.read).length,
    [notifications]
  );

  useEffect(() => {
    const loadNotifications = async () => {
      try {
        const token = getToken();
        if (!token) return;

        const res = await fetch(`${API}/notifications?limit=50`, {
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
          list.map((item) => ({
            id: item._id || item.id,
            title: item.title,
            message: item.message,
            time: item.createdAt ? new Date(item.createdAt).toLocaleString("en-IN") : "Just now",
            category: item.type ? item.type.replace(/_/g, " ") : "General",
            read: Boolean(item.read),
          }))
        );
      } catch (error) {
        console.error("Notifications load failed:", error.message);
      }
    };

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
          title: "Solar CRM Test Push",
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

      // Reload notifications list
      const listRes = await fetch(`${API}/notifications?limit=50`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      if (listRes.ok) {
        const payload = await listRes.json();
        const list = payload?.data?.notifications || payload?.result?.notifications || [];
        setNotifications(
          list.map((item) => ({
            id: item._id || item.id,
            title: item.title,
            message: item.message,
            time: item.createdAt ? new Date(item.createdAt).toLocaleString("en-IN") : "Just now",
            category: item.type ? item.type.replace(/_/g, " ") : "General",
            read: Boolean(item.read),
          }))
        );
      }
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

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3, bgcolor: pageBg, p: { xs: 1.5, sm: 2.5 } }}>
      <Paper
        elevation={0}
        sx={{
          p: { xs: 2, md: 3 },
          borderRadius: 4,
          border: `1px solid ${cardBorder}`,
          background: headerBg,
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
                bgcolor: iconBoxBg,
                color: iconBoxColor,
                border: `1px solid ${iconBoxBorder}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <NotificationsIcon sx={{ fontSize: 24 }} />
            </Box>
            <Box>
              <Typography sx={{ fontSize: { xs: "1.2rem", md: "1.5rem" }, fontWeight: 800, color: textTitle }}>
                Notifications
              </Typography>
              <Typography sx={{ mt: 0.4, color: textSub, fontSize: "0.88rem" }}>
                Track alerts, reminders, lead updates, and important admin activity in one place.
              </Typography>
            </Box>
          </Box>

          <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap">
            <Chip
              icon={<NotificationsIcon sx={{ color: isDark ? "#60a5fa !important" : "inherit" }} />}
              label={`${unreadCount} unread`}
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
                py: 1,
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
                py: 1,
                "&:hover": { bgcolor: isDark ? "#1d4ed8" : "#3a5ac8" },
              }}
            >
              Mark All Read
            </Button>
          </Stack>
        </Stack>
      </Paper>

      <Paper
        elevation={0}
        sx={{
          borderRadius: 4,
          bgcolor: cardBg,
          border: `1px solid ${cardBorder}`,
          overflow: "hidden",
        }}
      >
        {notifications.length === 0 ? (
          <Box sx={{ py: 8, textAlign: "center" }}>
            <NotificationsIcon sx={{ fontSize: 48, color: textSub, opacity: 0.5, mb: 1.5 }} />
            <Typography sx={{ color: textTitle, fontWeight: 700, fontSize: "1rem" }}>No Notifications</Typography>
            <Typography sx={{ color: textSub, fontSize: "0.85rem", mt: 0.5 }}>You're all caught up!</Typography>
          </Box>
        ) : (
          notifications.map((item, index) => (
            <React.Fragment key={item.id}>
              <Box
                sx={{
                  px: { xs: 2, md: 3 },
                  py: 2.2,
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 2,
                  bgcolor: item.read ? itemReadBg : itemUnreadBg,
                  transition: "background 0.2s",
                }}
              >
                <Box
                  sx={{
                    width: 44,
                    height: 44,
                    borderRadius: "14px",
                    bgcolor: iconBoxBg,
                    color: iconBoxColor,
                    border: `1px solid ${iconBoxBorder}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <NotificationsIcon sx={{ fontSize: 20 }} />
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
                      <Typography sx={{ fontSize: "0.95rem", fontWeight: 800, color: textTitle }}>
                        {item.title}
                      </Typography>
                      <Chip
                        size="small"
                        label={item.category}
                        sx={{
                          height: 22,
                          bgcolor: chipBg,
                          color: chipText,
                          border: `1px solid ${chipBorder}`,
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
              {index < notifications.length - 1 && <Divider sx={{ borderColor: dividerBorder }} />}
            </React.Fragment>
          ))
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
