import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Grid,
  Paper,
  Button,
  TextField,
  IconButton,
  Divider,
  Switch,
  Snackbar,
  Alert,
  Avatar,
  InputAdornment,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  useTheme,
  Stack,
  Chip,
  MenuItem,
} from "@mui/material";
import {
  AdminPanelSettings as AdminIcon,
  DarkMode as DarkModeIcon,
  LightMode as LightModeIcon,
  Lock as LockIcon,
  Person as PersonIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  VpnKey as KeyIcon,
  CloudUpload as CloudUploadIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Save as SaveIcon,
  Delete as DeleteIcon,
  Close as CloseIcon,
  CheckCircle as CheckCircleIcon,
  CameraAlt as CameraIcon,
  Shield as ShieldIcon,
  Palette as PaletteIcon,
  Security as SecurityIcon,
  Check as CheckIcon,
  Storage as StorageIcon,
  AccessTime as AccessTimeIcon,
  NotificationsActive as NotificationsActiveIcon,
  Alarm as AlarmIcon,
  Schedule as ScheduleIcon,
  EventAvailable as EventAvailableIcon,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { API_BASE_URL } from "../utils/apiConfig";
import { toBackendAssetUrl } from "../utils/backendAssetUrl";

const API = API_BASE_URL;

const getToken = () =>
  localStorage.getItem("token") ||
  localStorage.getItem("authToken") ||
  localStorage.getItem("accessToken") ||
  "";

const formatMinutesToAmPm = (minutes) => {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  const suffix = h >= 12 ? "PM" : "AM";
  const displayH = h % 12 || 12;
  return `${displayH}:${String(m).padStart(2, "0")} ${suffix}`;
};

const parseTimeToMinutes = (value = "10:00") => {
  const [hours, minutes] = String(value || "10:00").split(":").map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return 600;
  return hours * 60 + minutes;
};

const HOURS_12 = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"];
const MINUTES_60 = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0"));

const getClockParts12 = (timeStr = "10:00") => {
  const [hStr, mStr] = String(timeStr || "10:00").split(":");
  let h = parseInt(hStr, 10);
  if (isNaN(h)) h = 10;
  let m = parseInt(mStr, 10);
  if (isNaN(m)) m = 0;
  
  const period = h >= 12 ? "PM" : "AM";
  let hour12 = h % 12;
  if (hour12 === 0) hour12 = 12;
  
  return {
    hour: String(hour12).padStart(2, "0"),
    minute: String(m).padStart(2, "0"),
    period,
  };
};

const clockPartsTo24 = (hour12, minute, period) => {
  let h = parseInt(hour12, 10) || 12;
  const m = String(parseInt(minute, 10) || 0).padStart(2, "0");
  if (period === "PM" && h < 12) h += 12;
  if (period === "AM" && h === 12) h = 0;
  return `${String(h).padStart(2, "0")}:${m}`;
};

const Time12HourInput = ({ label, value, onChange, color = "#f59e0b", isDark, presets = [] }) => {
  const { hour, minute, period } = getClockParts12(value);

  const handleHourChange = (newHour) => {
    onChange(clockPartsTo24(newHour, minute, period));
  };

  const handleMinuteChange = (newMin) => {
    onChange(clockPartsTo24(hour, newMin, period));
  };

  const handlePeriodChange = (newPeriod) => {
    onChange(clockPartsTo24(hour, minute, newPeriod));
  };

  return (
    <Box>
      <Typography variant="caption" fontWeight={700} sx={{ color: isDark ? "#94a3b8" : "#475569", mb: 0.75, display: "block" }}>
        {label}
      </Typography>

      {/* ── 12-Hour Selector Box ── */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          p: 1,
          borderRadius: "14px",
          bgcolor: isDark ? "rgba(255,255,255,0.03)" : "#f8fafc",
          border: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "#e2e8f0"}`,
        }}
      >
        {/* Hour Dropdown */}
        <TextField
          select
          size="small"
          label="Hour"
          value={hour}
          onChange={(e) => handleHourChange(e.target.value)}
          sx={{
            flex: 1,
            "& .MuiOutlinedInput-root": {
              borderRadius: "10px",
              bgcolor: isDark ? "#0f172a" : "#ffffff",
              fontWeight: 800,
            },
          }}
          SelectProps={{
            MenuProps: { PaperProps: { sx: { maxHeight: 260 } } },
          }}
        >
          {HOURS_12.map((h) => (
            <MenuItem key={h} value={h} sx={{ fontWeight: 700 }}>
              {h}
            </MenuItem>
          ))}
        </TextField>

        <Typography sx={{ fontWeight: 900, fontSize: "1.2rem", color: color }}>:</Typography>

        {/* Minute Dropdown */}
        <TextField
          select
          size="small"
          label="Minute"
          value={minute}
          onChange={(e) => handleMinuteChange(e.target.value)}
          sx={{
            flex: 1,
            "& .MuiOutlinedInput-root": {
              borderRadius: "10px",
              bgcolor: isDark ? "#0f172a" : "#ffffff",
              fontWeight: 800,
            },
          }}
          SelectProps={{
            MenuProps: { PaperProps: { sx: { maxHeight: 260 } } },
          }}
        >
          {MINUTES_60.map((m) => (
            <MenuItem key={m} value={m} sx={{ fontWeight: 700 }}>
              {m}
            </MenuItem>
          ))}
        </TextField>

        {/* AM / PM Segmented Buttons */}
        <Box
          sx={{
            display: "flex",
            borderRadius: "10px",
            p: "3px",
            bgcolor: isDark ? "#0f172a" : "#e2e8f0",
            border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "#cbd5e1"}`,
          }}
        >
          <Button
            size="small"
            onClick={() => handlePeriodChange("AM")}
            sx={{
              minWidth: 46,
              height: 36,
              borderRadius: "8px",
              fontSize: "0.8rem",
              fontWeight: 900,
              bgcolor: period === "AM" ? color : "transparent",
              color: period === "AM" ? "#ffffff" : isDark ? "#94a3b8" : "#475569",
              boxShadow: period === "AM" ? "0 2px 8px rgba(0,0,0,0.25)" : "none",
              "&:hover": {
                bgcolor: period === "AM" ? color : isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)",
              },
            }}
          >
            AM
          </Button>
          <Button
            size="small"
            onClick={() => handlePeriodChange("PM")}
            sx={{
              minWidth: 46,
              height: 36,
              borderRadius: "8px",
              fontSize: "0.8rem",
              fontWeight: 900,
              bgcolor: period === "PM" ? color : "transparent",
              color: period === "PM" ? "#ffffff" : isDark ? "#94a3b8" : "#475569",
              boxShadow: period === "PM" ? "0 2px 8px rgba(0,0,0,0.25)" : "none",
              "&:hover": {
                bgcolor: period === "PM" ? color : isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)",
              },
            }}
          >
            PM
          </Button>
        </Box>
      </Box>

      {/* Preset Chips + Formatted Text */}
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mt: 0.8, flexWrap: "wrap", gap: 0.5 }}>
        <Typography variant="caption" sx={{ color: color, fontWeight: 800 }}>
          Formatted: {formatMinutesToAmPm(parseTimeToMinutes(value))}
        </Typography>
        {presets.length > 0 && (
          <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
            {presets.map((preset) => (
              <Button
                key={preset.value}
                size="small"
                onClick={() => onChange(preset.value)}
                sx={{
                  p: "2px 6px",
                  fontSize: "0.68rem",
                  minWidth: "auto",
                  borderRadius: "6px",
                  bgcolor: value === preset.value ? color : isDark ? "#1e293b" : "#f1f5f9",
                  color: value === preset.value ? "#ffffff" : "inherit",
                  fontWeight: 700,
                }}
              >
                {preset.label}
              </Button>
            ))}
          </Box>
        )}
      </Box>
    </Box>
  );
};

const Settings = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { user, updateLocalUser } = useAuth();
  const isDark = theme.palette.mode === "dark";

  // Modal control state: null | 'profile' | 'password' | 'theme' | 'attendance_timings'
  const [activeModal, setActiveModal] = useState(null);

  // Dark Mode State
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem("appThemeMode") === "dark";
  });

  // Admin Profile Form state
  const [profileForm, setProfileForm] = useState({
    firstName: user?.firstName || "",
    lastName: user?.lastName || "",
    email: user?.email || "",
    phone: user?.phone || "",
    avatar: null,
  });

  // Password state
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  // Password Visibility toggles
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Avatar Preview
  const [avatarPreview, setAvatarPreview] = useState("");
  const [saving, setSaving] = useState(false);

  // Attendance & Notification Timings state
  const [attendanceTimings, setAttendanceTimings] = useState({
    officePunchInTime: "10:00",
    officePunchOutTime: "19:00",
    punchInReminderStartTime: "10:30",
    punchInReminderCount: 3,
    punchInReminderIntervalMinutes: 5,
    autoPunchOutEnabled: true,
    blockEarlyPunchIn: false,
  });
  const [loadingTimings, setLoadingTimings] = useState(false);
  const [savingTimings, setSavingTimings] = useState(false);

  // Snackbar Toast State
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });

  const fetchAttendanceTimings = async () => {
    try {
      setLoadingTimings(true);
      const token = getToken();
      const res = await fetch(`${API}/attendance/settings`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const payload = await res.json();
      if (payload?.data || payload?.result) {
        const data = payload.data || payload.result;
        setAttendanceTimings({
          officePunchInTime: data.officePunchInTime || "10:00",
          officePunchOutTime: data.officePunchOutTime || "19:00",
          punchInReminderStartTime: data.punchInReminderStartTime || "10:30",
          punchInReminderCount: Number(data.punchInReminderCount || 3),
          punchInReminderIntervalMinutes: Number(data.punchInReminderIntervalMinutes || 5),
          autoPunchOutEnabled: Boolean(data.autoPunchOutEnabled),
          blockEarlyPunchIn: Boolean(data.blockEarlyPunchIn),
        });
      }
    } catch (err) {
      console.error("Failed to fetch attendance settings:", err);
    } finally {
      setLoadingTimings(false);
    }
  };

  useEffect(() => {
    fetchAttendanceTimings();
  }, []);

  const handleSaveAttendanceTimings = async (e) => {
    if (e) e.preventDefault();
    try {
      setSavingTimings(true);
      const token = getToken();
      const res = await fetch(`${API}/attendance/settings`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(attendanceTimings),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload?.message || "Failed to update attendance timings");

      setSnackbar({
        open: true,
        message: "Punch-in & punch-out timings saved! Reminders and notifications will follow this schedule.",
        severity: "success",
      });
      setActiveModal(null);
    } catch (err) {
      setSnackbar({
        open: true,
        message: err.message || "Failed to update attendance timings",
        severity: "error",
      });
    } finally {
      setSavingTimings(false);
    }
  };

  useEffect(() => {
    if (user) {
      setProfileForm({
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        email: user.email || "",
        phone: user.phone || "",
        avatar: null,
      });
      if (user.avatar) {
        setAvatarPreview(toBackendAssetUrl(user.avatar));
      }
    }
  }, [user]);

  // Handle Theme Toggle
  const handleDarkModeToggle = (isDarkVal) => {
    setDarkMode(isDarkVal);
    const newMode = isDarkVal ? "dark" : "light";
    localStorage.setItem("appThemeMode", newMode);

    // Trigger instant theme update event for App.js
    window.dispatchEvent(new CustomEvent("themeModeChange", { detail: newMode }));

    setSnackbar({
      open: true,
      message: isDarkVal ? "Dark Mode Theme Applied" : "Light Mode Theme Applied",
      severity: "info",
    });
  };

  // Image Selection Handler
  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setProfileForm((prev) => ({ ...prev, avatar: file }));
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  // Remove Avatar Handler
  const handleRemoveImage = () => {
    setProfileForm((prev) => ({ ...prev, avatar: null }));
    setAvatarPreview("");
  };

  // Save Admin Profile
  const handleSaveProfile = async (e) => {
    if (e) e.preventDefault();
    try {
      setSaving(true);
      const token = getToken();

      const formData = new FormData();
      formData.append("firstName", profileForm.firstName);
      formData.append("lastName", profileForm.lastName);
      formData.append("email", profileForm.email);
      if (profileForm.phone) formData.append("phone", profileForm.phone);
      if (profileForm.avatar) formData.append("avatar", profileForm.avatar);

      const res = await fetch(`${API}/user/profile`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const payload = await res.json();
      if (!res.ok) throw new Error(payload?.message || "Failed to update profile");

      if (updateLocalUser && payload.result) {
        updateLocalUser(payload.result);
      }

      setSnackbar({ open: true, message: "Admin profile updated successfully!", severity: "success" });
      setActiveModal(null);
    } catch (err) {
      setSnackbar({ open: true, message: err.message || "Failed to save profile", severity: "error" });
    } finally {
      setSaving(false);
    }
  };

  // Save Security Password
  const handleSavePassword = async (e) => {
    if (e) e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setSnackbar({ open: true, message: "New password and confirm password do not match", severity: "error" });
      return;
    }
    if (!passwordForm.currentPassword) {
      setSnackbar({ open: true, message: "Please enter your current password", severity: "error" });
      return;
    }

    try {
      setSaving(true);
      const token = getToken();

      const formData = new FormData();
      formData.append("firstName", profileForm.firstName);
      formData.append("lastName", profileForm.lastName);
      formData.append("email", profileForm.email);
      formData.append("currentPassword", passwordForm.currentPassword);
      formData.append("newPassword", passwordForm.newPassword);

      const res = await fetch(`${API}/user/profile`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const payload = await res.json();
      if (!res.ok) throw new Error(payload?.message || "Failed to update password");

      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setSnackbar({ open: true, message: "Password updated successfully!", severity: "success" });
      setActiveModal(null);
    } catch (err) {
      setSnackbar({ open: true, message: err.message || "Failed to update password", severity: "error" });
    } finally {
      setSaving(false);
    }
  };

  const getUserInitials = () =>
    `${profileForm.firstName?.[0] || ""}${profileForm.lastName?.[0] || ""}`.toUpperCase() || "A";

  // Card definitions matching the requested grid style
  const cards = [
    {
      key: "profile",
      icon: <PersonIcon sx={{ fontSize: 30, color: "#1e40af" }} />,
      title: "Admin Profile",
      subtitle: "Manage profile photo, name, email & phone",
    },
    {
      key: "attendance_timings",
      icon: <AccessTimeIcon sx={{ fontSize: 30, color: "#f59e0b" }} />,
      title: "Punch In & Out Timings",
      subtitle: "Set office working hours & automatic notification triggers",
    },
    {
      key: "password",
      icon: <LockIcon sx={{ fontSize: 30, color: "#1e40af" }} />,
      title: "Password & Security",
      subtitle: "Change admin security password",
    },
    {
      key: "theme",
      icon: darkMode ? (
        <DarkModeIcon sx={{ fontSize: 30, color: "#3b82f6" }} />
      ) : (
        <LightModeIcon sx={{ fontSize: 30, color: "#f59e0b" }} />
      ),
      title: "Dark Mode Theme",
      subtitle: "Toggle light and dark theme mode",
    },
    {
      key: "database",
      icon: <StorageIcon sx={{ fontSize: 30, color: "#10b981" }} />,
      title: "Database Storage",
      subtitle: "MongoDB capacity, collection sizes & free space cleaners",
      isRoute: true,
      path: "/database-settings",
    },
  ];

  return (
    <Box sx={{ p: { xs: 2.5, sm: 4 }, bgcolor: theme.palette.background.default, minHeight: "100vh", maxWidth: 1200, mx: "auto" }}>
      {/* Page Title Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight={800} sx={{ color: theme.palette.text.primary, letterSpacing: "-0.02em" }}>
          Settings & Configuration
        </Typography>
        <Typography variant="body2" sx={{ color: theme.palette.text.secondary, mt: 0.5, fontSize: "0.9rem" }}>
          Manage admin profile credentials, security password, database metrics, and application appearance.
        </Typography>
      </Box>

      {/* Grid Cards Section */}
      <Grid container spacing={3}>
        {cards.map((card) => (
          <Grid item xs={12} sm={6} md={3} key={card.key}>
            <Paper
              elevation={0}
              onClick={() => (card.isRoute ? navigate(card.path) : setActiveModal(card.key))}
              sx={{
                p: 3.5,
                height: "100%",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                textAlign: "center",
                borderRadius: "16px",
                border: `1.5px dashed ${isDark ? "#334155" : "#cbd5e1"}`,
                bgcolor: theme.palette.background.paper,
                cursor: "pointer",
                position: "relative",
                overflow: "hidden",
                transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
                "&:hover": {
                  borderColor: "#1e40af",
                  bgcolor: isDark ? "rgba(30, 64, 175, 0.08)" : "rgba(30, 64, 175, 0.03)",
                  transform: "translateY(-3px)",
                  boxShadow: "0 10px 24px rgba(30, 64, 175, 0.12)",
                  "& .icon-box": {
                    bgcolor: "rgba(30, 64, 175, 0.15)",
                    transform: "scale(1.08)",
                  },
                },
              }}
            >
              {/* Glowing Icon Box */}
              <Box
                className="icon-box"
                sx={{
                  width: 60,
                  height: 60,
                  borderRadius: "16px",
                  bgcolor: isDark ? "rgba(30, 64, 175, 0.2)" : "rgba(30, 64, 175, 0.08)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  mb: 2,
                  transition: "all 0.25s ease",
                }}
              >
                {card.icon}
              </Box>

              <Typography variant="subtitle1" fontWeight={700} sx={{ color: theme.palette.text.primary, fontSize: "1rem", mb: 0.5 }}>
                {card.title}
              </Typography>
              <Typography variant="body2" sx={{ color: theme.palette.text.secondary, fontSize: "0.82rem", lineHeight: 1.45 }}>
                {card.subtitle}
              </Typography>

              {/* Inline toggle switch for Dark Mode card */}
              {card.key === "theme" && (
                <Box
                  onClick={(e) => e.stopPropagation()}
                  sx={{ display: "flex", alignItems: "center", gap: 1, mt: 2, bgcolor: isDark ? "#0f172a" : "#f1f5f9", px: 2, py: 0.5, borderRadius: 4 }}
                >
                  <Typography variant="caption" fontWeight={600} color="text.secondary">
                    Light
                  </Typography>
                  <Switch
                    checked={darkMode}
                    onChange={(e) => handleDarkModeToggle(e.target.checked)}
                    color="primary"
                    size="small"
                  />
                  <Typography variant="caption" fontWeight={600} sx={{ color: darkMode ? "#3b82f6" : "text.secondary" }}>
                    Dark
                  </Typography>
                </Box>
              )}
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* ── REDESIGNED MODAL 1: ADMIN PROFILE ── */}
      <Dialog
        open={activeModal === "profile"}
        onClose={() => setActiveModal(null)}
        fullWidth
        maxWidth="sm"
        PaperProps={{
          sx: {
            borderRadius: "24px",
            bgcolor: theme.palette.background.paper,
            boxShadow: "0 20px 60px rgba(0, 0, 0, 0.2)",
            overflow: "hidden",
          },
        }}
      >
        {/* Modal Header */}
        <Box
          sx={{
            p: 3,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: `1px solid ${isDark ? "#334155" : "#f1f5f9"}`,
            bgcolor: isDark ? "#0f172a" : "#ffffff",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Box
              sx={{
                width: 42,
                height: 42,
                borderRadius: "12px",
                background: "linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#ffffff",
                boxShadow: "0 4px 12px rgba(30, 64, 175, 0.3)",
              }}
            >
              <PersonIcon />
            </Box>
            <Box>
              <Typography variant="h6" fontWeight={800} sx={{ color: theme.palette.text.primary, lineHeight: 1.2 }}>
                Admin Profile & Photo
              </Typography>
              <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
                Update personal info and profile avatar photo
              </Typography>
            </Box>
          </Box>
          <IconButton
            onClick={() => setActiveModal(null)}
            sx={{
              bgcolor: isDark ? "#1e293b" : "#f1f5f9",
              color: theme.palette.text.secondary,
              "&:hover": { bgcolor: isDark ? "#334155" : "#e2e8f0" },
            }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>

        <Box component="form" onSubmit={handleSaveProfile}>
          <DialogContent sx={{ p: { xs: 2.5, sm: 3.5 } }}>
            {/* Avatar Photo Container */}
            <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", mb: 3.5 }}>
              <Box sx={{ position: "relative", mb: 2 }}>
                <Avatar
                  src={avatarPreview}
                  sx={{
                    width: 104,
                    height: 104,
                    bgcolor: "#1e40af",
                    fontSize: "2.5rem",
                    fontWeight: 800,
                    color: "#ffffff",
                    boxShadow: "0 0 0 4px #3b82f6, 0 8px 24px rgba(30, 64, 175, 0.3)",
                  }}
                >
                  {!avatarPreview && getUserInitials()}
                </Avatar>
                <IconButton
                  component="label"
                  sx={{
                    position: "absolute",
                    bottom: 0,
                    right: 0,
                    bgcolor: "#1e40af",
                    color: "#ffffff",
                    boxShadow: "0 4px 12px rgba(30, 64, 175, 0.4)",
                    "&:hover": { bgcolor: "#1d4ed8" },
                    width: 34,
                    height: 34,
                  }}
                >
                  <CameraIcon sx={{ fontSize: 18 }} />
                  <input hidden type="file" accept="image/*" onChange={handleImageChange} />
                </IconButton>
              </Box>

              <Stack direction="row" spacing={1.5}>
                <Button
                  variant="outlined"
                  size="small"
                  component="label"
                  startIcon={<CloudUploadIcon />}
                  sx={{
                    borderRadius: "10px",
                    textTransform: "none",
                    fontWeight: 700,
                    borderColor: "rgba(30, 64, 175, 0.4)",
                    color: isDark ? "#60a5fa" : "#1e40af",
                  }}
                >
                  Change Photo
                  <input hidden type="file" accept="image/*" onChange={handleImageChange} />
                </Button>
                {avatarPreview && (
                  <Button
                    variant="outlined"
                    size="small"
                    color="error"
                    startIcon={<DeleteIcon />}
                    onClick={handleRemoveImage}
                    sx={{ borderRadius: "10px", textTransform: "none", fontWeight: 600 }}
                  >
                    Remove
                  </Button>
                )}
              </Stack>
            </Box>

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="First Name"
                  value={profileForm.firstName}
                  onChange={(e) => setProfileForm({ ...profileForm, firstName: e.target.value })}
                  required
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <PersonIcon sx={{ color: "#94a3b8", fontSize: 20 }} />
                      </InputAdornment>
                    ),
                    sx: { borderRadius: "12px", bgcolor: isDark ? "#0f172a" : "#f8fafc" },
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Last Name"
                  value={profileForm.lastName}
                  onChange={(e) => setProfileForm({ ...profileForm, lastName: e.target.value })}
                  InputProps={{
                    sx: { borderRadius: "12px", bgcolor: isDark ? "#0f172a" : "#f8fafc" },
                  }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Email Address"
                  type="email"
                  value={profileForm.email}
                  onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                  required
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <EmailIcon sx={{ color: "#94a3b8", fontSize: 20 }} />
                      </InputAdornment>
                    ),
                    sx: { borderRadius: "12px", bgcolor: isDark ? "#0f172a" : "#f8fafc" },
                  }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Phone Number"
                  value={profileForm.phone}
                  onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <PhoneIcon sx={{ color: "#94a3b8", fontSize: 20 }} />
                      </InputAdornment>
                    ),
                    sx: { borderRadius: "12px", bgcolor: isDark ? "#0f172a" : "#f8fafc" },
                  }}
                />
              </Grid>
            </Grid>
          </DialogContent>

          {/* Modal Footer */}
          <DialogActions sx={{ px: 3.5, py: 2.5, borderTop: `1px solid ${isDark ? "#334155" : "#f1f5f9"}` }}>
            <Button
              onClick={() => setActiveModal(null)}
              sx={{
                borderRadius: "10px",
                color: theme.palette.text.secondary,
                px: 2.5,
                fontWeight: 600,
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={saving}
              startIcon={saving ? <CircularProgress size={18} color="inherit" /> : <SaveIcon />}
              sx={{
                background: "linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)",
                borderRadius: "12px",
                px: 3.5,
                py: 1,
                fontWeight: 700,
                boxShadow: "0 6px 20px rgba(30, 64, 175, 0.35)",
                "&:hover": { background: "linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)" },
              }}
            >
              {saving ? "Saving..." : "Save Profile"}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      {/* ── REDESIGNED MODAL 2: PASSWORD & SECURITY ── */}
      <Dialog
        open={activeModal === "password"}
        onClose={() => setActiveModal(null)}
        fullWidth
        maxWidth="sm"
        PaperProps={{
          sx: {
            borderRadius: "24px",
            bgcolor: theme.palette.background.paper,
            boxShadow: "0 20px 60px rgba(0, 0, 0, 0.2)",
            overflow: "hidden",
          },
        }}
      >
        {/* Header */}
        <Box
          sx={{
            p: 3,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: `1px solid ${isDark ? "#334155" : "#f1f5f9"}`,
            bgcolor: isDark ? "#0f172a" : "#ffffff",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Box
              sx={{
                width: 42,
                height: 42,
                borderRadius: "12px",
                background: "linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#ffffff",
                boxShadow: "0 4px 12px rgba(30, 64, 175, 0.3)",
              }}
            >
              <LockIcon />
            </Box>
            <Box>
              <Typography variant="h6" fontWeight={800} sx={{ color: theme.palette.text.primary, lineHeight: 1.2 }}>
                Password & Security
              </Typography>
              <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
                Update your account password for enhanced security
              </Typography>
            </Box>
          </Box>
          <IconButton
            onClick={() => setActiveModal(null)}
            sx={{
              bgcolor: isDark ? "#1e293b" : "#f1f5f9",
              color: theme.palette.text.secondary,
              "&:hover": { bgcolor: isDark ? "#334155" : "#e2e8f0" },
            }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>

        <Box component="form" onSubmit={handleSavePassword}>
          <DialogContent sx={{ p: { xs: 2.5, sm: 3.5 } }}>
            <Stack spacing={2.5}>
              <TextField
                fullWidth
                label="Current Password"
                type={showCurrentPassword ? "text" : "password"}
                value={passwordForm.currentPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                required
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <KeyIcon sx={{ color: "#94a3b8", fontSize: 20 }} />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setShowCurrentPassword((prev) => !prev)} edge="end" size="small">
                        {showCurrentPassword ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                      </IconButton>
                    </InputAdornment>
                  ),
                  sx: { borderRadius: "12px", bgcolor: isDark ? "#0f172a" : "#f8fafc" },
                }}
              />

              <TextField
                fullWidth
                label="New Password"
                type={showNewPassword ? "text" : "password"}
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                required
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockIcon sx={{ color: "#94a3b8", fontSize: 20 }} />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setShowNewPassword((prev) => !prev)} edge="end" size="small">
                        {showNewPassword ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                      </IconButton>
                    </InputAdornment>
                  ),
                  sx: { borderRadius: "12px", bgcolor: isDark ? "#0f172a" : "#f8fafc" },
                }}
              />

              <TextField
                fullWidth
                label="Confirm New Password"
                type={showConfirmPassword ? "text" : "password"}
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                required
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockIcon sx={{ color: "#94a3b8", fontSize: 20 }} />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setShowConfirmPassword((prev) => !prev)} edge="end" size="small">
                        {showConfirmPassword ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                      </IconButton>
                    </InputAdornment>
                  ),
                  sx: { borderRadius: "12px", bgcolor: isDark ? "#0f172a" : "#f8fafc" },
                }}
              />
            </Stack>

            {/* Helper Security Tip */}
            <Paper
              elevation={0}
              sx={{
                mt: 3,
                p: 2,
                borderRadius: "12px",
                bgcolor: isDark ? "rgba(30, 64, 175, 0.12)" : "#eff6ff",
                border: `1px solid ${isDark ? "rgba(30, 64, 175, 0.25)" : "#dbeafe"}`,
                display: "flex",
                alignItems: "flex-start",
                gap: 1.5,
              }}
            >
              <ShieldIcon sx={{ color: "#2563eb", fontSize: 20, mt: 0.2 }} />
              <Typography variant="caption" sx={{ color: isDark ? "#93c5fd" : "#1e40af", lineHeight: 1.4 }}>
                <strong>Security Tip:</strong> Passwords should be at least 8 characters long and combine uppercase letters, numbers, and symbols for extra safety.
              </Typography>
            </Paper>
          </DialogContent>

          {/* Modal Footer */}
          <DialogActions sx={{ px: 3.5, py: 2.5, borderTop: `1px solid ${isDark ? "#334155" : "#f1f5f9"}` }}>
            <Button
              onClick={() => setActiveModal(null)}
              sx={{
                borderRadius: "10px",
                color: theme.palette.text.secondary,
                px: 2.5,
                fontWeight: 600,
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={saving}
              startIcon={saving ? <CircularProgress size={18} color="inherit" /> : <SaveIcon />}
              sx={{
                background: "linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)",
                borderRadius: "12px",
                px: 3.5,
                py: 1,
                fontWeight: 700,
                boxShadow: "0 6px 20px rgba(30, 64, 175, 0.35)",
                "&:hover": { background: "linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)" },
              }}
            >
              {saving ? "Updating..." : "Update Password"}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      {/* ── REDESIGNED MODAL 3: DARK MODE THEME ── */}
      <Dialog
        open={activeModal === "theme"}
        onClose={() => setActiveModal(null)}
        fullWidth
        maxWidth="sm"
        PaperProps={{
          sx: {
            borderRadius: "24px",
            bgcolor: theme.palette.background.paper,
            boxShadow: "0 20px 60px rgba(0, 0, 0, 0.2)",
            overflow: "hidden",
          },
        }}
      >
        {/* Header */}
        <Box
          sx={{
            p: 3,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: `1px solid ${isDark ? "#334155" : "#f1f5f9"}`,
            bgcolor: isDark ? "#0f172a" : "#ffffff",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Box
              sx={{
                width: 42,
                height: 42,
                borderRadius: "12px",
                background: "linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#ffffff",
                boxShadow: "0 4px 12px rgba(30, 64, 175, 0.3)",
              }}
            >
              <PaletteIcon />
            </Box>
            <Box>
              <Typography variant="h6" fontWeight={800} sx={{ color: theme.palette.text.primary, lineHeight: 1.2 }}>
                Dark Mode & Theme
              </Typography>
              <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
                Select your preferred visual appearance mode
              </Typography>
            </Box>
          </Box>
          <IconButton
            onClick={() => setActiveModal(null)}
            sx={{
              bgcolor: isDark ? "#1e293b" : "#f1f5f9",
              color: theme.palette.text.secondary,
              "&:hover": { bgcolor: isDark ? "#334155" : "#e2e8f0" },
            }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>

        <DialogContent sx={{ p: 3.5 }}>
          <Grid container spacing={2.5}>
            {/* Light Mode Card */}
            <Grid item xs={6}>
              <Paper
                elevation={0}
                onClick={() => handleDarkModeToggle(false)}
                sx={{
                  p: 3,
                  borderRadius: "16px",
                  border: `2px solid ${!darkMode ? "#1e40af" : isDark ? "#334155" : "#e2e8f0"}`,
                  bgcolor: "#ffffff",
                  color: "#0f172a",
                  cursor: "pointer",
                  textAlign: "center",
                  position: "relative",
                  transition: "all 0.25s ease",
                  boxShadow: !darkMode ? "0 8px 24px rgba(30, 64, 175, 0.15)" : "none",
                  "&:hover": { borderColor: "#1e40af", transform: "translateY(-2px)" },
                }}
              >
                {!darkMode && (
                  <Chip
                    icon={<CheckIcon sx={{ fontSize: "14px !important", color: "#ffffff !important" }} />}
                    label="Active"
                    size="small"
                    sx={{
                      position: "absolute",
                      top: 12,
                      right: 12,
                      bgcolor: "#1e40af",
                      color: "#ffffff",
                      fontWeight: 700,
                      fontSize: "0.68rem",
                      height: 20,
                    }}
                  />
                )}
                <LightModeIcon sx={{ fontSize: 40, color: "#f59e0b", mb: 1 }} />
                <Typography variant="subtitle1" fontWeight={800}>
                  Light Mode
                </Typography>
              </Paper>
            </Grid>

            {/* Dark Mode Card */}
            <Grid item xs={6}>
              <Paper
                elevation={0}
                onClick={() => handleDarkModeToggle(true)}
                sx={{
                  p: 3,
                  borderRadius: "16px",
                  border: `2px solid ${darkMode ? "#3b82f6" : isDark ? "#334155" : "#e2e8f0"}`,
                  bgcolor: "#0f172a",
                  color: "#f8fafc",
                  cursor: "pointer",
                  textAlign: "center",
                  position: "relative",
                  transition: "all 0.25s ease",
                  boxShadow: darkMode ? "0 8px 24px rgba(59, 130, 246, 0.25)" : "none",
                  "&:hover": { borderColor: "#3b82f6", transform: "translateY(-2px)" },
                }}
              >
                {darkMode && (
                  <Chip
                    icon={<CheckIcon sx={{ fontSize: "14px !important", color: "#ffffff !important" }} />}
                    label="Active"
                    size="small"
                    sx={{
                      position: "absolute",
                      top: 12,
                      right: 12,
                      bgcolor: "#3b82f6",
                      color: "#ffffff",
                      fontWeight: 700,
                      fontSize: "0.68rem",
                      height: 20,
                    }}
                  />
                )}
                <DarkModeIcon sx={{ fontSize: 40, color: "#60a5fa", mb: 1 }} />
                <Typography variant="subtitle1" fontWeight={800}>
                  Dark Mode
                </Typography>
              </Paper>
            </Grid>
          </Grid>
        </DialogContent>

        <DialogActions sx={{ px: 3.5, py: 2.5, borderTop: `1px solid ${isDark ? "#334155" : "#f1f5f9"}` }}>
          <Button
            onClick={() => setActiveModal(null)}
            variant="contained"
            sx={{
              background: "linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)",
              borderRadius: "12px",
              px: 3.5,
              py: 1,
              fontWeight: 700,
            }}
          >
            Done
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── MODAL: PUNCH IN & OUT TIMINGS / AUTOMATIC NOTIFICATIONS ── */}
      <Dialog
        open={activeModal === "attendance_timings"}
        onClose={() => setActiveModal(null)}
        fullWidth
        maxWidth="md"
        PaperProps={{
          sx: {
            borderRadius: "24px",
            bgcolor: theme.palette.background.paper,
            boxShadow: "0 20px 60px rgba(0, 0, 0, 0.2)",
            overflow: "hidden",
            maxHeight: "90vh",
            display: "flex",
            flexDirection: "column",
          },
        }}
      >
        {/* Modal Header */}
        <Box
          sx={{
            p: 2.5,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: `1px solid ${isDark ? "#334155" : "#f1f5f9"}`,
            bgcolor: isDark ? "#0f172a" : "#ffffff",
            flexShrink: 0,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Box
              sx={{
                width: 44,
                height: 44,
                borderRadius: "14px",
                background: "linear-gradient(135deg, #d97706 0%, #f59e0b 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#ffffff",
                boxShadow: "0 4px 12px rgba(245, 158, 11, 0.35)",
              }}
            >
              <AccessTimeIcon />
            </Box>
            <Box>
              <Typography variant="h6" fontWeight={800} sx={{ color: theme.palette.text.primary, lineHeight: 1.2 }}>
                Punch In & Out Timings
              </Typography>
              <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
                Set working hours, grace periods, and automatic reminder notification alarms
              </Typography>
            </Box>
          </Box>
          <IconButton
            onClick={() => setActiveModal(null)}
            sx={{
              bgcolor: isDark ? "#1e293b" : "#f1f5f9",
              color: theme.palette.text.secondary,
              "&:hover": { bgcolor: isDark ? "#334155" : "#e2e8f0" },
            }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>

        <Box component="form" onSubmit={handleSaveAttendanceTimings} sx={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>
          <DialogContent sx={{ p: { xs: 2, sm: 3 }, overflowY: "auto", flex: 1 }}>
            {loadingTimings ? (
              <Box sx={{ py: 6, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                <CircularProgress size={36} sx={{ color: "#f59e0b" }} />
                <Typography variant="body2" color="text.secondary">
                  Loading attendance timing settings...
                </Typography>
              </Box>
            ) : (
              <Grid container spacing={2.5}>
                {/* ── Working Hours Section ── */}
                <Grid item xs={12}>
                  <Typography variant="subtitle2" fontWeight={800} sx={{ color: theme.palette.text.primary, mb: 0.5, display: "flex", alignItems: "center", gap: 1 }}>
                    <ScheduleIcon sx={{ fontSize: 18, color: "#f59e0b" }} /> Standard Office Working Hours
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
                    Official daily punch-in and punch-out shift schedule for employees.
                  </Typography>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Time12HourInput
                    label="Standard Punch-In Time"
                    value={attendanceTimings.officePunchInTime}
                    color="#f59e0b"
                    isDark={isDark}
                    onChange={(val) => {
                      setAttendanceTimings((prev) => ({
                        ...prev,
                        officePunchInTime: val,
                        punchInReminderStartTime: val,
                      }));
                    }}
                    presets={[
                      { label: "9:00 AM", value: "09:00" },
                      { label: "10:00 AM", value: "10:00" },
                      { label: "11:00 AM", value: "11:00" },
                      { label: "12:30 PM", value: "12:30" },
                      { label: "02:30 PM", value: "14:30" },
                    ]}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Time12HourInput
                    label="Standard Punch-Out Time"
                    value={attendanceTimings.officePunchOutTime}
                    color="#3b82f6"
                    isDark={isDark}
                    onChange={(val) => {
                      setAttendanceTimings((prev) => ({
                        ...prev,
                        officePunchOutTime: val,
                      }));
                    }}
                    presets={[
                      { label: "5:00 PM", value: "17:00" },
                      { label: "6:00 PM", value: "18:00" },
                      { label: "7:00 PM", value: "19:00" },
                      { label: "8:00 PM", value: "20:00" },
                      { label: "9:00 PM", value: "21:00" },
                    ]}
                  />
                </Grid>

                {/* Divider */}
                <Grid item xs={12}>
                  <Divider sx={{ my: 0.5, borderColor: isDark ? "#334155" : "#f1f5f9" }} />
                </Grid>

                {/* ── Automatic Reminder Alarms Section ── */}
                <Grid item xs={12}>
                  <Typography variant="subtitle2" fontWeight={800} sx={{ color: theme.palette.text.primary, mb: 0.5, display: "flex", alignItems: "center", gap: 1 }}>
                    <AlarmIcon sx={{ fontSize: 18, color: "#ef4444" }} /> Punch-In Grace Period & Alarm Notifications
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
                    Reminders automatically start at your <strong>Punch-In Time ({formatMinutesToAmPm(parseTimeToMinutes(attendanceTimings.officePunchInTime))})</strong> for employees who have not clocked in.
                  </Typography>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" fontWeight={700} sx={{ color: theme.palette.text.secondary, mb: 0.75, display: "block" }}>
                    Reminder Interval (Minutes)
                  </Typography>
                  <TextField
                    fullWidth
                    type="number"
                    size="small"
                    value={attendanceTimings.punchInReminderIntervalMinutes}
                    onChange={(e) => setAttendanceTimings((prev) => ({ ...prev, punchInReminderIntervalMinutes: Math.max(1, Number(e.target.value) || 5) }))}
                    InputProps={{ inputProps: { min: 1, max: 60 } }}
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        borderRadius: "12px",
                        bgcolor: isDark ? "rgba(255,255,255,0.03)" : "#f8fafc",
                      },
                    }}
                  />
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: "block" }}>
                    Gap between each notification (default: 5 mins)
                  </Typography>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" fontWeight={700} sx={{ color: theme.palette.text.secondary, mb: 0.75, display: "block" }}>
                    Total Reminders (Before Auto-Absent)
                  </Typography>
                  <TextField
                    fullWidth
                    type="number"
                    size="small"
                    value={attendanceTimings.punchInReminderCount}
                    onChange={(e) => setAttendanceTimings((prev) => ({ ...prev, punchInReminderCount: Math.max(1, Math.min(10, Number(e.target.value) || 3)) }))}
                    InputProps={{ inputProps: { min: 1, max: 10 } }}
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        borderRadius: "12px",
                        bgcolor: isDark ? "rgba(255,255,255,0.03)" : "#f8fafc",
                      },
                    }}
                  />
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: "block" }}>
                    Total warning alerts sent before locking (default: 3 alerts)
                  </Typography>
                </Grid>

                {/* ── Live Schedule Preview Card ── */}
                <Grid item xs={12}>
                  <Paper
                    elevation={0}
                    sx={{
                      p: 2,
                      borderRadius: "14px",
                      bgcolor: isDark ? "rgba(239, 68, 68, 0.08)" : "#fef2f2",
                      border: `1px solid ${isDark ? "rgba(239, 68, 68, 0.25)" : "#fecaca"}`,
                    }}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                      <NotificationsActiveIcon sx={{ color: "#dc2626", fontSize: 20 }} />
                      <Typography variant="subtitle2" fontWeight={800} sx={{ color: "#991b1b" }}>
                        Live Notification & Absence Timeline Schedule
                      </Typography>
                    </Box>

                    <Stack spacing={0.75}>
                      {Array.from({ length: Number(attendanceTimings.punchInReminderCount) || 3 }).map((_, idx) => {
                        const startMin = parseTimeToMinutes(attendanceTimings.officePunchInTime);
                        const interval = Number(attendanceTimings.punchInReminderIntervalMinutes) || 5;
                        const alertMin = startMin + idx * interval;
                        const isFinal = idx === (Number(attendanceTimings.punchInReminderCount) || 3) - 1;
                        return (
                          <Box key={idx} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                            <Chip
                              size="small"
                              label={`Alert #${idx + 1}`}
                              sx={{
                                bgcolor: isFinal ? "#dc2626" : "#f59e0b",
                                color: "#ffffff",
                                fontWeight: 800,
                                fontSize: "0.65rem",
                                height: 20,
                              }}
                            />
                            <Typography variant="caption" fontWeight={700} sx={{ color: isDark ? "#fca5a5" : "#7f1d1d" }}>
                              {formatMinutesToAmPm(alertMin)}: {isFinal ? `Final Warning (${interval} min left to avoid Absent)` : "Push Notification Reminder sent to employee"}
                            </Typography>
                          </Box>
                        );
                      })}

                      <Box sx={{ display: "flex", alignItems: "center", gap: 1, pt: 0.5 }}>
                        <Chip
                          size="small"
                          label="Auto-Absent"
                          sx={{
                            bgcolor: "#111827",
                            color: "#ffffff",
                            fontWeight: 800,
                            fontSize: "0.65rem",
                            height: 20,
                          }}
                        />
                        <Typography variant="caption" fontWeight={800} sx={{ color: "#b91c1c" }}>
                          {formatMinutesToAmPm(
                            parseTimeToMinutes(attendanceTimings.officePunchInTime) +
                              (Number(attendanceTimings.punchInReminderCount) || 3) *
                                (Number(attendanceTimings.punchInReminderIntervalMinutes) || 5)
                          )}
                          : Automatically marked ABSENT for the day (Admin can still change to Present).
                        </Typography>
                      </Box>
                    </Stack>
                  </Paper>
                </Grid>

                {/* ── Auto Punch-Out & Options ── */}
                <Grid item xs={12}>
                  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", p: 1.75, borderRadius: "12px", bgcolor: isDark ? "rgba(255,255,255,0.02)" : "#f8fafc", border: `1px solid ${isDark ? "#334155" : "#e2e8f0"}` }}>
                    <Box>
                      <Typography variant="body2" fontWeight={700} sx={{ color: theme.palette.text.primary, fontSize: "0.85rem" }}>
                        Automatic Punch-Out at End of Shift
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Automatically closes open attendance shifts after {formatMinutesToAmPm(parseTimeToMinutes(attendanceTimings.officePunchOutTime))}
                      </Typography>
                    </Box>
                    <Switch
                      checked={attendanceTimings.autoPunchOutEnabled}
                      onChange={(e) => setAttendanceTimings((prev) => ({ ...prev, autoPunchOutEnabled: e.target.checked }))}
                      color="primary"
                    />
                  </Box>
                </Grid>
              </Grid>
            )}
          </DialogContent>

          <DialogActions sx={{ px: 3, py: 2, borderTop: `1px solid ${isDark ? "#334155" : "#f1f5f9"}`, flexShrink: 0, bgcolor: isDark ? "#0f172a" : "#ffffff" }}>
            <Button
              onClick={() => setActiveModal(null)}
              variant="outlined"
              sx={{
                borderRadius: "10px",
                borderColor: isDark ? "#475569" : "#cbd5e1",
                color: theme.palette.text.secondary,
                fontWeight: 700,
                textTransform: "none",
                px: 2.5,
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={savingTimings || loadingTimings}
              variant="contained"
              startIcon={savingTimings ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
              sx={{
                background: "linear-gradient(135deg, #d97706 0%, #f59e0b 100%)",
                borderRadius: "10px",
                px: 3,
                py: 0.85,
                fontWeight: 700,
                textTransform: "none",
                boxShadow: "0 4px 14px rgba(245, 158, 11, 0.4)",
              }}
            >
              {savingTimings ? "Saving..." : "Save Timings & Schedule"}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      {/* Toast Alert */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert severity={snackbar.severity} variant="filled" onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Settings;
