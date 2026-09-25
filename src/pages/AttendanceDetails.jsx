// pages/AttendanceDetails.jsx
import React, { useState, useCallback } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Typography,
  Box,
  Stack,
  Grid,
  Paper,
  Chip,
  Avatar,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Snackbar,
  useTheme,
  useMediaQuery,
  Slide,
  Fade,
  CircularProgress,
  alpha,
  Tooltip,
  Menu,
  ListItemIcon,
  ListItemText,
  Divider,
} from "@mui/material";
import {
  Close,
  LocationOn,
  Edit,
  Delete,
  Save,
  Cancel,
  Person,
  CalendarToday,
  CheckCircle,
  Warning,
  Error as ErrorIcon,
  Login,
  Logout,
  FileDownload,
  Print,
  ContentCopy,
  ExpandMore,
  AccessTime,
  Phone,
  Email,
  BadgeOutlined,
  FiberManualRecord,
  PhoneAndroid,
  TouchApp,
} from "@mui/icons-material";
import { useAttendance } from "../hooks/useAttendance";
import { format } from "date-fns";
import { toBackendAssetUrl } from "../utils/backendAssetUrl";

// ─── Status Configuration ─────────────────────────────────────────────────────
const STATUS_CONFIG = {
  present: { bg: "rgba(16, 185, 129, 0.15)", color: "#10b981", icon: <CheckCircle sx={{ fontSize: 15 }} />, label: "Present" },
  punch_in: { bg: "rgba(16, 185, 129, 0.2)", color: "#10b981", icon: <TouchApp sx={{ fontSize: 15 }} />, label: "Punch In (Mobile)" },
  absent: { bg: "rgba(239, 68, 68, 0.15)", color: "#ef4444", icon: <ErrorIcon sx={{ fontSize: 15 }} />, label: "Absent" },
  late: { bg: "rgba(245, 158, 11, 0.15)", color: "#f59e0b", icon: <Warning sx={{ fontSize: 15 }} />, label: "Late" },
  leave: { bg: "rgba(168, 85, 247, 0.15)", color: "#a855f7", icon: <Person sx={{ fontSize: 15 }} />, label: "Leave" },
  holiday: { bg: "rgba(59, 130, 246, 0.15)", color: "#3b82f6", icon: <CalendarToday sx={{ fontSize: 15 }} />, label: "Holiday" },
  upcoming: { bg: "rgba(148, 163, 184, 0.15)", color: "#94a3b8", icon: <CalendarToday sx={{ fontSize: 15 }} />, label: "Upcoming" },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
export const fmtDate = (ts) =>
  !ts ? "—" : new Date(ts).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

export const fmtTime = (ts) => {
  if (!ts) return "—";
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return typeof ts === "string" ? ts : "—";
  return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true });
};

export const fmtShortDate = (ts) => (!ts ? "N/A" : new Date(ts).toLocaleDateString());
export const fmtShortTime = (ts) => (!ts ? "N/A" : new Date(ts).toLocaleTimeString());
export const fmtDateTime = (ts) => (!ts ? "N/A" : new Date(ts).toLocaleString());

export const resolveAddress = (addr) => {
  if (!addr) return null;
  if (typeof addr === "string") return addr;
  return addr.full || addr.short || addr.formattedAddress || null;
};

// ─── StatusChip ───────────────────────────────────────────────────────────────
const StatusChip = ({ status }) => {
  const normKey = String(status || "present").toLowerCase();
  const cfg = STATUS_CONFIG[normKey] || STATUS_CONFIG.present;
  return (
    <Chip
      size="small"
      label={cfg.label}
      icon={cfg.icon}
      sx={{
        bgcolor: cfg.bg,
        color: cfg.color,
        fontWeight: 800,
        borderRadius: "999px",
        height: 26,
        fontSize: "0.75rem",
        border: `1px solid ${alpha(cfg.color, 0.35)}`,
        "& .MuiChip-icon": { color: `${cfg.color} !important`, fontSize: 15 },
      }}
    />
  );
};

// ─── Export Utilities ─────────────────────────────────────────────────────────
export const generateCSV = (records) => {
  const list = Array.isArray(records) ? records : [records];

  const headers = [
    "Record ID", "Employee Name", "Employee ID", "Employee Email", "Employee Phone",
    "Date", "Status", "Work Hours",
    "Punch In Time", "Punch In Address", "Punch In Lat", "Punch In Lng",
    "Punch Out Time", "Punch Out Address", "Punch Out Lat", "Punch Out Lng",
    "Remarks", "Created At", "Updated At",
  ];

  const escape = (val) => {
    const s = val == null ? "" : String(val);
    return s.includes(",") || s.includes('"') || s.includes("\n")
      ? `"${s.replace(/"/g, '""')}"` : s;
  };

  const rows = list.map((a) => [
    a._id || a.id || "",
    a.user?.name || `${a.user?.firstName || ""} ${a.user?.lastName || ""}`.trim() || "",
    a.user?.employeeId || "",
    a.user?.email || "",
    a.user?.phone || a.user?.phoneNumber || "",
    fmtShortDate(a.date),
    a.status || "",
    a.workHoursFormatted || a.workHours || "",
    fmtShortTime(a.punchIn?.time),
    resolveAddress(a.punchIn?.address) || "",
    a.punchIn?.location?.lat || a.punchIn?.latitude || "",
    a.punchIn?.location?.lng || a.punchIn?.longitude || "",
    fmtShortTime(a.punchOut?.time),
    resolveAddress(a.punchOut?.address) || "",
    a.punchOut?.location?.lat || a.punchOut?.latitude || "",
    a.punchOut?.location?.lng || a.punchOut?.longitude || "",
    a.remarks || "",
    fmtDateTime(a.createdAt),
    fmtDateTime(a.updatedAt),
  ]);

  return [headers, ...rows].map((row) => row.map(escape).join(",")).join("\n");
};

export const generateJSON = (records) => {
  const list = Array.isArray(records) ? records : [records];
  const enriched = list.map((a) => {
    const clone = JSON.parse(JSON.stringify(a));
    if (clone.date) clone.date_formatted = fmtShortDate(a.date);
    if (clone.punchIn?.time) clone.punchIn.time_formatted = fmtDateTime(a.punchIn.time);
    if (clone.punchOut?.time) clone.punchOut.time_formatted = fmtDateTime(a.punchOut.time);
    if (clone.createdAt) clone.createdAt_formatted = fmtDateTime(a.createdAt);
    if (clone.updatedAt) clone.updatedAt_formatted = fmtDateTime(a.updatedAt);
    return clone;
  });
  return JSON.stringify(list.length === 1 ? enriched[0] : enriched, null, 2);
};

export const downloadFile = (content, fileName, mimeType) => {
  const blob = new Blob([content], { type: mimeType });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

export const printRecord = (a) => {
  const win = window.open("", "_blank");
  if (!win) { alert("Please allow pop-ups to print"); return; }

  const empName = a.user?.name || `${a.user?.firstName || ""} ${a.user?.lastName || ""}`.trim() || "Employee";

  win.document.write(`
    <html>
      <head>
        <title>Attendance Record – ${empName}</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #0f172a; background: #fff; padding: 40px; }
          h1 { font-size: 20px; font-weight: 800; color: #0f172a; margin-bottom: 4px; }
          .sub { color: #64748b; font-size: 12px; margin-bottom: 24px; }
          .card { border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px 20px; margin-bottom: 16px; background: #fafafa; }
          .card-title { font-size: 11px; text-transform: uppercase; letter-spacing: 0.8px; color: #64748b; margin-bottom: 12px; font-weight: 800; }
          .row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0; font-size: 13px; }
          .row:last-child { border-bottom: none; }
          .label { color: #64748b; font-weight: 600; }
          .value { font-weight: 700; text-align: right; color: #0f172a; }
          .punch-in { border-left: 4px solid #10b981; }
          .punch-out { border-left: 4px solid #f59e0b; }
          .footer { margin-top: 30px; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 12px; }
        </style>
      </head>
      <body>
        <h1>Attendance Details</h1>
        <div class="sub">Generated on ${new Date().toLocaleString()}</div>

        <div class="card">
          <div class="card-title">Employee & Attendance Summary</div>
          <div class="row"><span class="label">Employee Name</span><span class="value">${empName}</span></div>
          <div class="row"><span class="label">Email</span><span class="value">${a.user?.email || "—"}</span></div>
          <div class="row"><span class="label">Phone</span><span class="value">${a.user?.phone || a.user?.phoneNumber || "—"}</span></div>
          <div class="row"><span class="label">Date</span><span class="value">${fmtDate(a.date)}</span></div>
          <div class="row"><span class="label">Status</span><span class="value">${a.status || "—"}</span></div>
          <div class="row"><span class="label">Work Hours</span><span class="value">${a.workHoursFormatted || a.workHours || "00:00"}</span></div>
        </div>

        <div class="card punch-in">
          <div class="card-title">Punch In</div>
          <div class="row"><span class="label">Time</span><span class="value">${fmtTime(a.punchIn?.time)}</span></div>
          <div class="row"><span class="label">Address</span><span class="value">${resolveAddress(a.punchIn?.address) || "—"}</span></div>
        </div>

        <div class="card punch-out">
          <div class="card-title">Punch Out</div>
          <div class="row"><span class="label">Time</span><span class="value">${fmtTime(a.punchOut?.time)}</span></div>
          <div class="row"><span class="label">Address</span><span class="value">${resolveAddress(a.punchOut?.address) || "—"}</span></div>
        </div>

        <div class="footer">
          Record ID: ${a._id || a.id || "—"} &nbsp;|&nbsp;
          Created: ${fmtDateTime(a.createdAt)}
        </div>
      </body>
    </html>
  `);
  win.document.close();
  win.print();
};

// ─── Export Dropdown Action ───────────────────────────────────────────────────
const ActionExportMenu = ({ attendance, onSnack, isDark }) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  const ts = format(new Date(), "yyyyMMdd_HHmmss");
  const id = attendance?._id || attendance?.id || "record";

  const handle = (fn) => () => {
    fn();
    setAnchorEl(null);
  };

  const exportCSV = handle(() => {
    try {
      downloadFile(generateCSV(attendance), `attendance_${id}_${ts}.csv`, "text/csv");
      onSnack("Exported as CSV");
    } catch { onSnack("Export failed", "error"); }
  });

  const exportJSON = handle(() => {
    try {
      downloadFile(generateJSON(attendance), `attendance_${id}_${ts}.json`, "application/json");
      onSnack("Exported as JSON");
    } catch { onSnack("Export failed", "error"); }
  });

  const copyClip = handle(() => {
    try {
      navigator.clipboard.writeText(generateJSON(attendance));
      onSnack("Copied details to clipboard");
    } catch { onSnack("Copy failed", "error"); }
  });

  const print = handle(() => {
    try {
      printRecord(attendance);
      onSnack("Print preview opened");
    } catch { onSnack("Print failed", "error"); }
  });

  return (
    <>
      <Button
        variant="outlined"
        startIcon={<FileDownload sx={{ fontSize: 16 }} />}
        endIcon={<ExpandMore sx={{ fontSize: 16 }} />}
        onClick={(e) => setAnchorEl(e.currentTarget)}
        sx={{
          borderRadius: "10px",
          borderColor: isDark ? "rgba(255,255,255,0.15)" : "#cbd5e1",
          color: isDark ? "#f8fafc" : "#0f172a",
          bgcolor: isDark ? "rgba(255,255,255,0.04)" : "#f8fafc",
          fontWeight: 700,
          textTransform: "none",
          fontSize: "0.82rem",
          height: 36,
          px: 1.75,
          "&:hover": {
            bgcolor: isDark ? "rgba(255,255,255,0.08)" : "#f1f5f9",
            borderColor: "#3b82f6",
          },
        }}
      >
        Export
      </Button>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={() => setAnchorEl(null)}
        PaperProps={{
          sx: {
            mt: 1,
            borderRadius: "14px",
            minWidth: 190,
            bgcolor: isDark ? "#0e1424" : "#ffffff",
            color: isDark ? "#f8fafc" : "#0f172a",
            border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "#e2e8f0"}`,
            boxShadow: isDark ? "0 16px 40px rgba(0,0,0,0.6)" : "0 10px 30px rgba(0,0,0,0.1)",
          },
        }}
        transformOrigin={{ horizontal: "left", vertical: "bottom" }}
        anchorOrigin={{ horizontal: "left", vertical: "top" }}
      >
        <Box sx={{ px: 2, pt: 1.25, pb: 0.5 }}>
          <Typography variant="caption" sx={{ color: isDark ? "#94a3b8" : "#64748b", fontWeight: 800, textTransform: "uppercase", fontSize: "0.65rem", letterSpacing: 0.5 }}>
            Export Attendance
          </Typography>
        </Box>
        <MenuItem onClick={exportCSV} sx={{ py: 1, fontSize: "0.82rem", fontWeight: 600 }}>
          <ListItemIcon><FileDownload fontSize="small" sx={{ color: "#10b981" }} /></ListItemIcon>
          <ListItemText primary="Export as CSV (.csv)" primaryTypographyProps={{ fontSize: "0.82rem", fontWeight: 600 }} />
        </MenuItem>
        <MenuItem onClick={exportJSON} sx={{ py: 1, fontSize: "0.82rem", fontWeight: 600 }}>
          <ListItemIcon><FileDownload fontSize="small" sx={{ color: "#3b82f6" }} /></ListItemIcon>
          <ListItemText primary="Export as JSON (.json)" primaryTypographyProps={{ fontSize: "0.82rem", fontWeight: 600 }} />
        </MenuItem>
        <Divider sx={{ my: 0.5, borderColor: isDark ? "rgba(255,255,255,0.08)" : "#e2e8f0" }} />
        <MenuItem onClick={copyClip} sx={{ py: 1, fontSize: "0.82rem", fontWeight: 600 }}>
          <ListItemIcon><ContentCopy fontSize="small" sx={{ color: isDark ? "#94a3b8" : "#64748b" }} /></ListItemIcon>
          <ListItemText primary="Copy JSON to Clipboard" primaryTypographyProps={{ fontSize: "0.82rem", fontWeight: 600 }} />
        </MenuItem>
        <MenuItem onClick={print} sx={{ py: 1, fontSize: "0.82rem", fontWeight: 600 }}>
          <ListItemIcon><Print fontSize="small" sx={{ color: isDark ? "#94a3b8" : "#64748b" }} /></ListItemIcon>
          <ListItemText primary="Print Preview" primaryTypographyProps={{ fontSize: "0.82rem", fontWeight: 600 }} />
        </MenuItem>
      </Menu>
    </>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AttendanceDetails({
  open,
  onClose,
  attendance,
  canEdit = false,
  canDelete = false,
  onEdit,
  onDelete,
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const { updateAttendance, markAttendance, deleteAttendance, allowMobilePunchIn } = useAttendance();

  const [currentAttendance, setCurrentAttendance] = useState(attendance);
  React.useEffect(() => {
    setCurrentAttendance(attendance);
  }, [attendance]);

  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState({
    status: "present",
    punchInTime: "09:30",
    punchOutTime: "18:30",
    workHours: 8,
    remarks: "",
  });
  const [editLoad, setEditLoad] = useState(false);
  const [photoOpen, setPhotoOpen] = useState(false);
  const [selPhoto, setSelPhoto] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });

  const showSnack = useCallback((message, severity = "success") =>
    setSnackbar({ open: true, message, severity }), []);

  if (!currentAttendance) return null;

  const a = currentAttendance;
  const normStatus = String(a.status || "present").toLowerCase();
  const statusCfg = STATUS_CONFIG[normStatus] || STATUS_CONFIG.present;

  const empName =
    a.user?.name ||
    (a.user?.firstName ? `${a.user.firstName} ${a.user.lastName || ""}`.trim() : null) ||
    "Attendance Details";
  const empAvatarLetter = (empName || "A").charAt(0).toUpperCase();
  const empPhone = a.user?.phone || a.user?.phoneNumber || "—";
  const empEmail = a.user?.email || "—";
  const workHoursDisplay = a.workHoursFormatted || a.workHours || (normStatus === "present" ? "08:00" : "00:00");

  const punchInAddress = resolveAddress(a.punchIn?.address);
  const punchOutAddress = resolveAddress(a.punchOut?.address);
  const punchInTimeStr = a.punchIn?.time ? fmtTime(a.punchIn.time) : null;
  const punchOutTimeStr = a.punchOut?.time ? fmtTime(a.punchOut.time) : null;

  const punchInLat = a.punchIn?.location?.lat || a.punchIn?.latitude;
  const punchInLng = a.punchIn?.location?.lng || a.punchIn?.longitude;
  const punchOutLat = a.punchOut?.location?.lat || a.punchOut?.latitude;
  const punchOutLng = a.punchOut?.location?.lng || a.punchOut?.longitude;

  const photos = [...(a.punchIn?.photos || []), ...(a.punchOut?.photos || [])];

  const toTimeString = (dateVal) => {
    if (!dateVal) return "";
    const d = new Date(dateVal);
    if (Number.isNaN(d.getTime())) return "";
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    return `${hh}:${mm}`;
  };

  const handleEditStart = () => {
    const curStatus = String(a.status || "present").toLowerCase();
    const inTime = a.punchIn?.time ? toTimeString(a.punchIn.time) : "09:30";
    const outTime = a.punchOut?.time ? toTimeString(a.punchOut.time) : (curStatus === "present" ? "18:30" : "");
    const hrs = a.workHours !== undefined && a.workHours !== null && a.workHours !== "00:00" ? a.workHours : (curStatus === "present" ? 8 : 0);

    setEditData({
      status: curStatus === "upcoming" ? "present" : curStatus,
      punchInTime: inTime,
      punchOutTime: outTime,
      workHours: hrs,
      remarks: a.remarks || (curStatus === "absent" ? "Changed from Absent to Present by Admin" : ""),
    });
    setEditMode(true);
  };

  const handleEditSave = async () => {
    if (editData.status === "punch_in") {
      await handleAllowMobilePunchIn();
      return;
    }
    setEditLoad(true);
    try {
      const id = a._id || a.id;
      const isSynthetic = !id || String(id).startsWith("rec-");
      const targetUserId = a.user?._id || a.user?.id || a.userId;

      const baseDate = new Date(a.date || Date.now());
      let finalPunchIn = null;
      let finalPunchOut = null;

      if (editData.status === "present" || editData.punchInTime) {
        const inDate = new Date(baseDate);
        if (editData.punchInTime && editData.punchInTime.includes(":")) {
          const [h, m] = editData.punchInTime.split(":").map(Number);
          inDate.setHours(h, m, 0, 0);
        } else {
          inDate.setHours(9, 30, 0, 0);
        }
        finalPunchIn = {
          time: inDate,
          address: a.punchIn?.address || "Marked Present by Admin",
        };
      }

      if (editData.punchOutTime && editData.punchOutTime.includes(":")) {
        const outDate = new Date(baseDate);
        const [h, m] = editData.punchOutTime.split(":").map(Number);
        outDate.setHours(h, m, 0, 0);
        finalPunchOut = {
          time: outDate,
          address: a.punchOut?.address || "Marked Present by Admin",
        };
      }

      const calcHours = Number(editData.workHours) || (editData.status === "present" ? 8 : 0);

      const payload = {
        userId: targetUserId,
        date: a.date,
        status: editData.status,
        workHours: calcHours,
        remarks: editData.remarks || `Marked ${editData.status} by Admin`,
        ...(finalPunchIn ? { punchIn: finalPunchIn } : {}),
        ...(finalPunchOut ? { punchOut: finalPunchOut } : {}),
      };

      let res;
      if (isSynthetic) {
        res = await markAttendance(payload);
      } else {
        res = await updateAttendance(id, payload);
      }

      if (res?.success) {
        showSnack(
          editData.status === "present"
            ? "Attendance changed to Present successfully"
            : "Attendance updated successfully"
        );
        const updatedDoc = {
          ...a,
          ...payload,
          ...(res.data || {}),
          status: editData.status,
          workHours: calcHours,
          workHoursFormatted: `${String(Math.floor(calcHours)).padStart(2, "0")}:${String(Math.round((calcHours % 1) * 60)).padStart(2, "0")}`,
          punchIn: finalPunchIn || res.data?.punchIn || a.punchIn,
          punchOut: finalPunchOut || res.data?.punchOut || a.punchOut,
          _id: res.data?._id || id,
        };
        setCurrentAttendance(updatedDoc);
        setEditMode(false);
        if (onEdit) onEdit(updatedDoc);
      } else {
        showSnack(res?.error || "Update failed", "error");
      }
    } catch (err) {
      showSnack(err?.message || "An error occurred during update", "error");
    } finally {
      setEditLoad(false);
    }
  };

  const handleAllowMobilePunchIn = async () => {
    setEditLoad(true);
    try {
      const id = a._id || a.id;
      const targetUserId = a.user?._id || a.user?.id || a.userId;
      
      const res = await allowMobilePunchIn({
        userId: targetUserId,
        attendanceId: id,
        date: a.date,
      });

      if (res?.success) {
        showSnack("Mobile Punch-In unlocked! Notification sent to employee's phone.", "success");
        onClose();
        if (onDelete) onDelete(a);
      } else {
        showSnack(res?.error || "Failed to enable mobile punch-in", "error");
      }
    } catch (err) {
      showSnack(err?.message || "Failed to enable mobile punch-in", "error");
    } finally {
      setEditLoad(false);
    }
  };

  const handleDelete = () => {
    if (onDelete) { onDelete(a); onClose(); }
  };

  const handleClose = () => {
    setEditMode(false);
    onClose();
  };

  // Color tokens
  const COLOR = {
    bg: isDark ? "#060a12" : "#ffffff",
    card: isDark ? "#0e1424" : "#f8fafc",
    cardHover: isDark ? "#131b30" : "#f1f5f9",
    border: isDark ? "rgba(255, 255, 255, 0.08)" : "#e2e8f0",
    text: isDark ? "#f8fafc" : "#0f172a",
    textSub: isDark ? "#94a3b8" : "#475569",
    textMuted: isDark ? "#64748b" : "#94a3b8",
    blue: "#3b82f6",
    green: "#10b981",
    red: "#ef4444",
    amber: "#f59e0b",
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="md"
        fullWidth
        fullScreen={isMobile}
        PaperProps={{
          sx: {
            borderRadius: isMobile ? 0 : "20px",
            bgcolor: COLOR.bg,
            color: COLOR.text,
            border: `1px solid ${COLOR.border}`,
            boxShadow: isDark ? "0 28px 70px rgba(0, 0, 0, 0.75)" : "0 20px 50px rgba(0, 0, 0, 0.14)",
            overflow: "hidden",
            maxHeight: isMobile ? "100%" : "92vh",
          },
        }}
        TransitionComponent={isMobile ? Slide : Fade}
        TransitionProps={isMobile ? { direction: "up" } : {}}
        transitionDuration={280}
      >
        {/* Top Accent Gradient Bar */}
        <Box
          sx={{
            height: 4,
            background: `linear-gradient(90deg, ${statusCfg.color} 0%, #3b82f6 50%, #a855f7 100%)`,
          }}
        />

        {/* Header Banner */}
        <DialogTitle
          sx={{
            background: "linear-gradient(135deg, #090e1a 0%, #111736 50%, #1f1347 100%)",
            color: "#ffffff",
            px: { xs: 2, sm: 3 },
            py: { xs: 2, sm: 2.25 },
            borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
          }}
        >
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Stack direction="row" spacing={1.75} alignItems="center">
              <Avatar
                sx={{
                  bgcolor: "#3b82f6",
                  color: "#ffffff",
                  width: { xs: 42, sm: 48 },
                  height: { xs: 42, sm: 48 },
                  fontWeight: 800,
                  fontSize: "1.25rem",
                  border: "2px solid rgba(255,255,255,0.25)",
                  boxShadow: "0 6px 18px rgba(0,0,0,0.35)",
                }}
              >
                {empAvatarLetter}
              </Avatar>
              <Box>
                <Typography variant="h6" fontWeight={800} sx={{ fontSize: { xs: "1.05rem", sm: "1.22rem" }, letterSpacing: "-0.01em", color: "#ffffff" }}>
                  Attendance Details
                </Typography>
                <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.75)", fontSize: "0.78rem", display: "block", mt: 0.25 }}>
                  {fmtDate(a.date)}
                </Typography>
              </Box>
            </Stack>

            <Stack direction="row" spacing={1} alignItems="center">
              <StatusChip status={a.status || "present"} />
              <IconButton
                onClick={handleClose}
                size="small"
                sx={{
                  color: "#ffffff",
                  bgcolor: "rgba(255, 255, 255, 0.08)",
                  borderRadius: "10px",
                  p: 0.75,
                  "&:hover": { bgcolor: "rgba(255, 255, 255, 0.18)" },
                }}
              >
                <Close sx={{ fontSize: 18 }} />
              </IconButton>
            </Stack>
          </Stack>
        </DialogTitle>

        {/* Content Body */}
        <DialogContent sx={{ px: { xs: 2, sm: 3 }, py: { xs: 2.5, sm: 3 } }}>
          <Stack spacing={2.5}>
            
            {/* ── 3 Summary KPI Cards: Work Hours, Phone, Email ── */}
            <Grid container spacing={1.5}>
              {/* Work Hours Card */}
              <Grid item xs={12} sm={4}>
                <Paper
                  elevation={0}
                  sx={{
                    p: 2,
                    borderRadius: "14px",
                    bgcolor: COLOR.card,
                    border: `1px solid ${COLOR.border}`,
                    transition: "all 0.2s ease",
                    "&:hover": { bgcolor: COLOR.cardHover },
                  }}
                >
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                    <Box sx={{ width: 22, height: 22, borderRadius: "6px", bgcolor: alpha(COLOR.blue, 0.12), color: COLOR.blue, display: "grid", placeItems: "center" }}>
                      <AccessTime sx={{ fontSize: 13 }} />
                    </Box>
                    <Typography variant="caption" fontWeight={800} sx={{ color: COLOR.textMuted, textTransform: "uppercase", fontSize: "0.68rem", letterSpacing: "0.05em" }}>
                      WORK HOURS
                    </Typography>
                  </Stack>
                  <Typography variant="h6" fontWeight={900} sx={{ color: COLOR.blue, pl: 0.2, fontSize: "1.2rem" }}>
                    {workHoursDisplay}
                  </Typography>
                </Paper>
              </Grid>

              {/* Phone Card */}
              <Grid item xs={12} sm={4}>
                <Paper
                  elevation={0}
                  sx={{
                    p: 2,
                    borderRadius: "14px",
                    bgcolor: COLOR.card,
                    border: `1px solid ${COLOR.border}`,
                    transition: "all 0.2s ease",
                    "&:hover": { bgcolor: COLOR.cardHover },
                  }}
                >
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                    <Box sx={{ width: 22, height: 22, borderRadius: "6px", bgcolor: "rgba(148, 163, 184, 0.12)", color: COLOR.textSub, display: "grid", placeItems: "center" }}>
                      <Phone sx={{ fontSize: 13 }} />
                    </Box>
                    <Typography variant="caption" fontWeight={800} sx={{ color: COLOR.textMuted, textTransform: "uppercase", fontSize: "0.68rem", letterSpacing: "0.05em" }}>
                      PHONE
                    </Typography>
                  </Stack>
                  <Typography variant="body1" fontWeight={800} sx={{ color: COLOR.text, pl: 0.2 }} noWrap>
                    {empPhone}
                  </Typography>
                </Paper>
              </Grid>

              {/* Email Card */}
              <Grid item xs={12} sm={4}>
                <Paper
                  elevation={0}
                  sx={{
                    p: 2,
                    borderRadius: "14px",
                    bgcolor: COLOR.card,
                    border: `1px solid ${COLOR.border}`,
                    transition: "all 0.2s ease",
                    "&:hover": { bgcolor: COLOR.cardHover },
                  }}
                >
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                    <Box sx={{ width: 22, height: 22, borderRadius: "6px", bgcolor: "rgba(148, 163, 184, 0.12)", color: COLOR.textSub, display: "grid", placeItems: "center" }}>
                      <Email sx={{ fontSize: 13 }} />
                    </Box>
                    <Typography variant="caption" fontWeight={800} sx={{ color: COLOR.textMuted, textTransform: "uppercase", fontSize: "0.68rem", letterSpacing: "0.05em" }}>
                      EMAIL
                    </Typography>
                  </Stack>
                  <Typography variant="body1" fontWeight={800} sx={{ color: COLOR.text, pl: 0.2 }} noWrap>
                    {empEmail}
                  </Typography>
                </Paper>
              </Grid>
            </Grid>

            {/* ── 2 Punch Blocks: Punch In & Punch Out ── */}
            <Grid container spacing={2}>
              
              {/* Punch In Card */}
              <Grid item xs={12} sm={6}>
                <Paper
                  elevation={0}
                  sx={{
                    p: 2.5,
                    borderRadius: "16px",
                    bgcolor: isDark ? "rgba(16, 185, 129, 0.05)" : "#f0fdf4",
                    border: `1px solid ${isDark ? "rgba(16, 185, 129, 0.25)" : "#bbf7d0"}`,
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                  }}
                >
                  <Box>
                    <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1.5 }}>
                      <Box
                        sx={{
                          width: 40,
                          height: 40,
                          borderRadius: "12px",
                          bgcolor: "rgba(16, 185, 129, 0.15)",
                          color: "#10b981",
                          display: "grid",
                          placeItems: "center",
                        }}
                      >
                        <Login sx={{ fontSize: 20 }} />
                      </Box>
                      <Box>
                        <Typography variant="caption" fontWeight={800} sx={{ color: COLOR.textMuted, textTransform: "uppercase", letterSpacing: "0.05em", fontSize: "0.7rem" }}>
                          PUNCH IN
                        </Typography>
                        <Typography variant="h6" fontWeight={900} sx={{ color: punchInTimeStr ? "#10b981" : COLOR.textMuted, lineHeight: 1.1 }}>
                          {punchInTimeStr || "Not recorded"}
                        </Typography>
                      </Box>
                    </Stack>

                    {punchInAddress ? (
                      <Stack direction="row" spacing={1} alignItems="flex-start" sx={{ mt: 1.5 }}>
                        <LocationOn sx={{ fontSize: 16, color: COLOR.textMuted, mt: 0.25, flexShrink: 0 }} />
                        <Typography variant="body2" sx={{ color: COLOR.textSub, fontSize: "0.82rem", lineHeight: 1.45 }}>
                          {punchInAddress}
                        </Typography>
                      </Stack>
                    ) : (
                      <Typography variant="caption" sx={{ color: COLOR.textMuted, display: "block", mt: 1 }}>
                        No punch in location recorded
                      </Typography>
                    )}
                  </Box>

                  {punchInLat && punchInLng && (
                    <Typography variant="caption" sx={{ color: COLOR.textMuted, fontSize: "0.7rem", fontFamily: "monospace", mt: 1.5, display: "block" }}>
                      {Number(punchInLat).toFixed(5)}, {Number(punchInLng).toFixed(5)}
                    </Typography>
                  )}
                </Paper>
              </Grid>

              {/* Punch Out Card */}
              <Grid item xs={12} sm={6}>
                <Paper
                  elevation={0}
                  sx={{
                    p: 2.5,
                    borderRadius: "16px",
                    bgcolor: isDark ? "rgba(245, 158, 11, 0.05)" : "#fffbeb",
                    border: `1px solid ${isDark ? "rgba(245, 158, 11, 0.25)" : "#fde68a"}`,
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                  }}
                >
                  <Box>
                    <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1.5 }}>
                      <Box
                        sx={{
                          width: 40,
                          height: 40,
                          borderRadius: "12px",
                          bgcolor: "rgba(245, 158, 11, 0.15)",
                          color: "#f59e0b",
                          display: "grid",
                          placeItems: "center",
                        }}
                      >
                        <Logout sx={{ fontSize: 20 }} />
                      </Box>
                      <Box>
                        <Typography variant="caption" fontWeight={800} sx={{ color: COLOR.textMuted, textTransform: "uppercase", letterSpacing: "0.05em", fontSize: "0.7rem" }}>
                          PUNCH OUT
                        </Typography>
                        <Typography variant="h6" fontWeight={900} sx={{ color: punchOutTimeStr ? "#f59e0b" : COLOR.textMuted, lineHeight: 1.1 }}>
                          {punchOutTimeStr || (normStatus === "present" && !punchOutTimeStr ? "Ongoing" : "Not punched out")}
                        </Typography>
                      </Box>
                    </Stack>

                    {punchOutAddress ? (
                      <Stack direction="row" spacing={1} alignItems="flex-start" sx={{ mt: 1.5 }}>
                        <LocationOn sx={{ fontSize: 16, color: COLOR.textMuted, mt: 0.25, flexShrink: 0 }} />
                        <Typography variant="body2" sx={{ color: COLOR.textSub, fontSize: "0.82rem", lineHeight: 1.45 }}>
                          {punchOutAddress}
                        </Typography>
                      </Stack>
                    ) : (
                      <Typography variant="caption" sx={{ color: COLOR.textMuted, display: "block", mt: 1 }}>
                        No punch out location recorded
                      </Typography>
                    )}
                  </Box>

                  {punchOutLat && punchOutLng && (
                    <Typography variant="caption" sx={{ color: COLOR.textMuted, fontSize: "0.7rem", fontFamily: "monospace", mt: 1.5, display: "block" }}>
                      {Number(punchOutLat).toFixed(5)}, {Number(punchOutLng).toFixed(5)}
                    </Typography>
                  )}
                </Paper>
              </Grid>
            </Grid>

            {/* ── Record Details Section (Record ID, Created, Updated) ── */}
            <Paper
              elevation={0}
              sx={{
                p: 2,
                px: 2.5,
                borderRadius: "16px",
                bgcolor: COLOR.card,
                border: `1px solid ${COLOR.border}`,
              }}
            >
              <Stack spacing={1.5}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="caption" fontWeight={800} sx={{ color: COLOR.textMuted, fontSize: "0.72rem", letterSpacing: "0.05em" }}>
                    RECORD ID
                  </Typography>
                  <Typography variant="body2" fontWeight={700} sx={{ color: COLOR.text, fontFamily: "monospace", fontSize: "0.82rem" }}>
                    {String(a._id || a.id || "—").slice(-10)}
                  </Typography>
                </Stack>
                <Divider sx={{ borderColor: COLOR.border }} />

                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="caption" fontWeight={800} sx={{ color: COLOR.textMuted, fontSize: "0.72rem", letterSpacing: "0.05em" }}>
                    CREATED
                  </Typography>
                  <Typography variant="body2" fontWeight={700} sx={{ color: COLOR.text, fontSize: "0.82rem" }}>
                    {a.createdAt ? format(new Date(a.createdAt), "dd MMM yyyy, hh:mm a") : fmtDate(a.date)}
                  </Typography>
                </Stack>
                <Divider sx={{ borderColor: COLOR.border }} />

                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="caption" fontWeight={800} sx={{ color: COLOR.textMuted, fontSize: "0.72rem", letterSpacing: "0.05em" }}>
                    LAST UPDATED
                  </Typography>
                  <Typography variant="body2" fontWeight={700} sx={{ color: COLOR.text, fontSize: "0.82rem" }}>
                    {a.updatedAt ? format(new Date(a.updatedAt), "dd MMM yyyy, hh:mm a") : fmtDate(a.date)}
                  </Typography>
                </Stack>
              </Stack>
            </Paper>

            {/* Remarks if any */}
            {a.remarks && !editMode && (
              <Paper
                elevation={0}
                sx={{
                  p: 2,
                  borderRadius: "14px",
                  bgcolor: isDark ? "rgba(255,255,255,0.03)" : "#f8fafc",
                  border: `1px solid ${COLOR.border}`,
                }}
              >
                <Typography variant="caption" fontWeight={800} sx={{ color: COLOR.textMuted, textTransform: "uppercase", fontSize: "0.68rem", display: "block", mb: 0.5 }}>
                  Remarks
                </Typography>
                <Typography variant="body2" sx={{ color: COLOR.text, fontSize: "0.85rem" }}>
                  {a.remarks}
                </Typography>
              </Paper>
            )}

            {/* Photos if any */}
            {photos.length > 0 && (
              <Box>
                <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1.5, color: COLOR.text }}>
                  Photos ({photos.length})
                </Typography>
                <Stack direction="row" spacing={1.5} sx={{ overflowX: "auto", pb: 0.5 }}>
                  {photos.map((p, i) => (
                    <Box
                      key={i}
                      onClick={() => { setSelPhoto(p); setPhotoOpen(true); }}
                      sx={{
                        width: 80,
                        height: 80,
                        borderRadius: "12px",
                        overflow: "hidden",
                        border: `2px solid ${COLOR.border}`,
                        flexShrink: 0,
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                        "&:hover": { transform: "scale(1.06)", borderColor: COLOR.blue },
                      }}
                    >
                      <img src={toBackendAssetUrl(p?.url || p?.path || p?.filename)} alt={`punch-${i}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    </Box>
                  ))}
                </Stack>
              </Box>
            )}

            {/* Edit Mode Form */}
            {editMode && (
              <Paper
                elevation={0}
                sx={{
                  p: 2.5,
                  borderRadius: "16px",
                  border: `1px solid ${editData.status === "present" ? "rgba(16, 185, 129, 0.4)" : "rgba(245, 158, 11, 0.4)"}`,
                  bgcolor: isDark
                    ? (editData.status === "present" ? "rgba(16, 185, 129, 0.06)" : "rgba(245, 158, 11, 0.05)")
                    : (editData.status === "present" ? "#f0fdf4" : "#fffbeb"),
                }}
              >
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: editData.status === "present" ? "#10b981" : "#f59e0b" }} />
                  <Typography variant="subtitle2" fontWeight={800} sx={{ color: editData.status === "present" ? "#10b981" : "#f59e0b" }}>
                    {normStatus === "absent" && editData.status === "present"
                      ? "Admin Override: Change Absent to Present"
                      : "Edit Attendance Record"}
                  </Typography>
                </Stack>

                {normStatus === "absent" && editData.status === "present" && (
                  <Alert severity="success" sx={{ mb: 2, borderRadius: "10px", fontSize: "0.8rem", fontWeight: 600 }}>
                    Changing status to Present will mark this employee as Present, clear the reminder timeout, and credit work hours.
                  </Alert>
                )}

                {editData.status === "punch_in" && (
                  <Alert
                    severity="success"
                    icon={<TouchApp sx={{ fontSize: 20 }} />}
                    action={
                      <Button
                        color="inherit"
                        size="small"
                        onClick={handleAllowMobilePunchIn}
                        disabled={editLoad}
                        sx={{ fontWeight: 800, textTransform: "none", bgcolor: "rgba(255,255,255,0.2)", px: 1.5 }}
                      >
                        Punch In Now
                      </Button>
                    }
                    sx={{ mb: 2, borderRadius: "10px", fontSize: "0.82rem", fontWeight: 600 }}
                  >
                    Selecting <strong>Punch In</strong> will unlock the green &quot;Punch In&quot; button on the employee&apos;s phone so they can tap Punch In manually with live GPS satellite tracking.
                  </Alert>
                )}

                <Stack spacing={2}>
                  <FormControl fullWidth size="small">
                    <InputLabel sx={{ color: COLOR.textMuted }}>Status</InputLabel>
                    <Select
                      value={editData.status}
                      onChange={(e) => {
                        const nextStatus = e.target.value;
                        setEditData((p) => ({
                          ...p,
                          status: nextStatus,
                          workHours: nextStatus === "present" ? 8 : nextStatus === "half-day" ? 4 : 0,
                        }));
                      }}
                      label="Status"
                      sx={{
                        borderRadius: "10px",
                        bgcolor: COLOR.card,
                        color: COLOR.text,
                        "& .MuiOutlinedInput-notchedOutline": { borderColor: COLOR.border },
                      }}
                    >
                      {Object.entries(STATUS_CONFIG).filter(([k]) => k !== "upcoming").map(([k, v]) => (
                        <MenuItem key={k} value={k}>
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Box sx={{ color: v.color }}>{v.icon}</Box>
                            <span style={{ fontWeight: 600 }}>{v.label}</span>
                          </Stack>
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  {/* Punch In / Out / Work Hours inputs for Present / Late / Half-Day */}
                  {["present", "late", "half-day"].includes(editData.status) && (
                    <Grid container spacing={1.5}>
                      <Grid item xs={12} sm={4}>
                        <TextField
                          size="small"
                          label="Punch In Time"
                          type="time"
                          fullWidth
                          InputLabelProps={{ shrink: true }}
                          value={editData.punchInTime}
                          onChange={(e) => setEditData((p) => ({ ...p, punchInTime: e.target.value }))}
                          sx={{
                            bgcolor: COLOR.card,
                            "& .MuiOutlinedInput-root": {
                              borderRadius: "10px",
                              color: COLOR.text,
                              "& fieldset": { borderColor: COLOR.border },
                            },
                            "& .MuiInputLabel-root": { color: COLOR.textMuted },
                          }}
                        />
                      </Grid>
                      <Grid item xs={12} sm={4}>
                        <TextField
                          size="small"
                          label="Punch Out Time"
                          type="time"
                          fullWidth
                          InputLabelProps={{ shrink: true }}
                          value={editData.punchOutTime}
                          onChange={(e) => setEditData((p) => ({ ...p, punchOutTime: e.target.value }))}
                          sx={{
                            bgcolor: COLOR.card,
                            "& .MuiOutlinedInput-root": {
                              borderRadius: "10px",
                              color: COLOR.text,
                              "& fieldset": { borderColor: COLOR.border },
                            },
                            "& .MuiInputLabel-root": { color: COLOR.textMuted },
                          }}
                        />
                      </Grid>
                      <Grid item xs={12} sm={4}>
                        <TextField
                          size="small"
                          label="Work Hours"
                          type="number"
                          fullWidth
                          inputProps={{ min: 0, max: 24, step: 0.5 }}
                          value={editData.workHours}
                          onChange={(e) => setEditData((p) => ({ ...p, workHours: e.target.value }))}
                          sx={{
                            bgcolor: COLOR.card,
                            "& .MuiOutlinedInput-root": {
                              borderRadius: "10px",
                              color: COLOR.text,
                              "& fieldset": { borderColor: COLOR.border },
                            },
                            "& .MuiInputLabel-root": { color: COLOR.textMuted },
                          }}
                        />
                      </Grid>
                    </Grid>
                  )}

                  <TextField
                    size="small"
                    label="Remarks"
                    multiline
                    rows={2}
                    fullWidth
                    value={editData.remarks}
                    onChange={(e) => setEditData((p) => ({ ...p, remarks: e.target.value }))}
                    inputProps={{ maxLength: 250 }}
                    helperText={`${editData.remarks.length}/250`}
                    FormHelperTextProps={{ sx: { textAlign: "right", color: COLOR.textMuted } }}
                    sx={{
                      bgcolor: COLOR.card,
                      "& .MuiOutlinedInput-root": {
                        borderRadius: "10px",
                        color: COLOR.text,
                        "& fieldset": { borderColor: COLOR.border },
                      },
                      "& .MuiInputLabel-root": { color: COLOR.textMuted },
                    }}
                  />
                </Stack>
              </Paper>
            )}

          </Stack>
        </DialogContent>

        {/* Dialog Actions Bar */}
        <DialogActions
          sx={{
            px: { xs: 2, sm: 3 },
            py: 2,
            borderTop: `1px solid ${COLOR.border}`,
            bgcolor: isDark ? "#090d18" : "#f8fafc",
            flexWrap: "wrap",
            gap: 1.5,
            justifyContent: "space-between",
          }}
        >
          {editMode ? (
            <Stack direction="row" spacing={1.5} sx={{ width: "100%" }} justifyContent="flex-end">
              <Button
                variant="outlined"
                startIcon={<Cancel />}
                onClick={() => setEditMode(false)}
                disabled={editLoad}
                sx={{
                  borderRadius: "10px",
                  borderColor: COLOR.border,
                  color: COLOR.text,
                  fontWeight: 700,
                  textTransform: "none",
                }}
              >
                Cancel
              </Button>
              <Button
                variant="contained"
                startIcon={editLoad ? <CircularProgress size={16} color="inherit" /> : <Save />}
                onClick={handleEditSave}
                disabled={editLoad}
                sx={{
                  borderRadius: "10px",
                  bgcolor: COLOR.blue,
                  fontWeight: 700,
                  textTransform: "none",
                  "&:hover": { bgcolor: "#2563eb" },
                }}
              >
                {editLoad ? "Saving…" : "Save Changes"}
              </Button>
            </Stack>
          ) : (
            <>
              {/* Left group: Export and Close */}
              <Stack direction="row" spacing={1.5} alignItems="center">
                <ActionExportMenu attendance={a} onSnack={showSnack} isDark={isDark} />
                <Button
                  variant="outlined"
                  onClick={handleClose}
                  sx={{
                    borderRadius: "10px",
                    borderColor: COLOR.border,
                    color: COLOR.text,
                    fontWeight: 700,
                    textTransform: "none",
                    fontSize: "0.82rem",
                    height: 36,
                    px: 2,
                    "&:hover": { bgcolor: isDark ? "rgba(255,255,255,0.06)" : "#f1f5f9" },
                  }}
                >
                  Close
                </Button>
              </Stack>

              {/* Right group: Allow Mobile Punch In, Edit, Delete if permitted */}
              <Stack direction="row" spacing={1.5} alignItems="center">
                {canEdit && normStatus === "absent" && (
                  <Tooltip title="Unlock Punch In on the employee's phone so they can tap Punch In with live GPS location" arrow>
                    <Button
                      variant="contained"
                      startIcon={<TouchApp sx={{ fontSize: 17 }} />}
                      onClick={handleAllowMobilePunchIn}
                      disabled={editLoad}
                      sx={{
                        borderRadius: "10px",
                        bgcolor: "#10b981",
                        color: "#fff",
                        fontWeight: 800,
                        textTransform: "none",
                        fontSize: "0.82rem",
                        height: 36,
                        px: 2,
                        boxShadow: "0 4px 14px rgba(16, 185, 129, 0.4)",
                        "&:hover": {
                          bgcolor: "#059669",
                        },
                      }}
                    >
                      {editLoad ? "Enabling..." : "Allow Mobile Punch-In"}
                    </Button>
                  </Tooltip>
                )}
                {canEdit && (
                  <Button
                    variant="outlined"
                    startIcon={<Edit sx={{ fontSize: 16 }} />}
                    onClick={handleEditStart}
                    sx={{
                      borderRadius: "10px",
                      borderColor: "rgba(245, 158, 11, 0.4)",
                      bgcolor: "transparent",
                      color: "#f59e0b",
                      fontWeight: 800,
                      textTransform: "none",
                      fontSize: "0.82rem",
                      height: 36,
                      px: 2,
                      "&:hover": {
                        bgcolor: "rgba(245, 158, 11, 0.1)",
                        borderColor: "#f59e0b",
                      },
                    }}
                  >
                    {normStatus === "absent" ? "Manual Edit" : "Edit"}
                  </Button>
                )}
                {canDelete && (
                  <Button
                    variant="contained"
                    color="error"
                    startIcon={<Delete sx={{ fontSize: 16 }} />}
                    onClick={handleDelete}
                    sx={{
                      borderRadius: "10px",
                      fontWeight: 700,
                      textTransform: "none",
                      fontSize: "0.82rem",
                      height: 36,
                      bgcolor: "#dc2626",
                      "&:hover": { bgcolor: "#b91c1c" },
                    }}
                  >
                    Delete
                  </Button>
                )}
              </Stack>
            </>
          )}
        </DialogActions>
      </Dialog>

      {/* Photo Lightbox */}
      <Dialog
        open={photoOpen}
        onClose={() => setPhotoOpen(false)}
        maxWidth="lg"
        fullScreen={isMobile}
        PaperProps={{ sx: { borderRadius: isMobile ? 0 : 3, bgcolor: "#000000" } }}
      >
        <IconButton
          onClick={() => setPhotoOpen(false)}
          sx={{ position: "absolute", top: 12, right: 12, bgcolor: "rgba(0,0,0,0.6)", color: "#ffffff", zIndex: 10 }}
        >
          <Close />
        </IconButton>
        {selPhoto?.url && (
          <img src={selPhoto.url} alt="attendance" style={{ width: "100%", maxHeight: "90vh", objectFit: "contain" }} />
        )}
      </Dialog>

      {/* Snackbar feedback */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert severity={snackbar.severity} variant="filled" sx={{ borderRadius: "10px", color: "#ffffff", fontWeight: 700 }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
}
