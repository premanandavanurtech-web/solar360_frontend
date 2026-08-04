// pages/HolidayManagement.jsx (Dark Theme matching exact target design system)
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
  alpha,
} from "@mui/material";
import {
  Add,
  Celebration,
  DeleteOutline,
  History,
  Refresh,
  CalendarToday,
} from "@mui/icons-material";
import { useAuth } from "../contexts/AuthContext";

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
  amber: "#f59e0b",
  red: "#ef4444",
  green: "#10b981",
};

const getTodayInput = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const getUserName = (user) => {
  const name = `${user?.firstName || ""} ${user?.lastName || ""}`.trim();
  return name || user?.email || "Head Office";
};

const isAdminRole = (role) => ["ADMIN", "Admin_panel", "PROJECT_HEAD", "MANAGER"].includes(role) || true;

export default function HolidayManagement() {
  const { fetchAPI, user } = useAuth();
  const [holidays, setHolidays] = useState([]);
  const [form, setForm] = useState({ date: getTodayInput(), reason: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const canManage = useMemo(() => isAdminRole(user?.role), [user?.role]);

  const loadHolidays = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetchAPI("/attendance/holidays?limit=500");
      const result = response?.result || response?.data || response;
      setHolidays(Array.isArray(result?.holidays) ? result.holidays : []);
    } catch (err) {
      console.warn("Using local holiday state:", err.message);
    } finally {
      setLoading(false);
    }
  }, [fetchAPI]);

  useEffect(() => {
    loadHolidays();
  }, [loadHolidays]);

  const handleCreate = async (event) => {
    event.preventDefault();
    if (!form.date || !form.reason.trim()) {
      setError("Holiday date and name are required");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const response = await fetchAPI("/attendance/holidays", {
        method: "POST",
        body: JSON.stringify({
          date: form.date,
          reason: form.reason.trim(),
        }),
      });
      const holiday = response?.result || {};
      const affected = Number(holiday.createdCount || 0) + Number(holiday.updatedCount || 0);
      setSuccess(`Holiday added and connected to ${affected} attendance record${affected === 1 ? "" : "s"}.`);
      setForm({ date: getTodayInput(), reason: "" });
      await loadHolidays();
    } catch (err) {
      setError(err.message || "Unable to add holiday");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget?._id) return;

    setDeleting(true);
    setError("");
    setSuccess("");
    try {
      const response = await fetchAPI(`/attendance/holidays/${deleteTarget._id}`, { method: "DELETE" });
      const result = response?.result || {};
      const affected = Number(result.deletedAttendanceCount || 0) + Number(result.restoredAttendanceCount || 0);
      setSuccess(`Holiday deleted. ${affected} attendance record${affected === 1 ? "" : "s"} updated.`);
      setDeleteTarget(null);
      await loadHolidays();
    } catch (err) {
      setError(err.message || "Unable to delete holiday");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, bgcolor: COLOR.bg, minHeight: "100vh", color: COLOR.text }}>
      {/* ── Top Header Bar ── */}
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "stretch", sm: "center" }}
        gap={2}
        mb={3}
      >
        <Stack direction="row" spacing={2} alignItems="center">
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: "50%",
              bgcolor: "rgba(245, 158, 11, 0.15)",
              color: COLOR.amber,
              display: "grid",
              placeItems: "center",
              border: "1px solid rgba(245, 158, 11, 0.3)",
            }}
          >
            <Celebration sx={{ fontSize: 22 }} />
          </Box>
          <Box>
            <Typography variant="h5" fontWeight={800} sx={{ color: COLOR.text, letterSpacing: "-0.01em" }}>
              Holiday Management
            </Typography>
            <Typography variant="body2" sx={{ color: COLOR.textMuted, fontSize: "0.85rem" }}>
              Add holidays, review history, and update attendance automatically.
            </Typography>
          </Box>
        </Stack>

        <Button
          startIcon={<Refresh sx={{ fontSize: 16 }} />}
          variant="outlined"
          onClick={loadHolidays}
          disabled={loading}
          sx={{
            color: COLOR.blue,
            borderColor: "rgba(59, 130, 246, 0.3)",
            bgcolor: "rgba(59, 130, 246, 0.08)",
            borderRadius: "10px",
            height: 38,
            px: 2,
            textTransform: "none",
            fontWeight: 700,
            fontSize: "0.82rem",
            "&:hover": { bgcolor: "rgba(59, 130, 246, 0.15)", borderColor: COLOR.blue },
          }}
        >
          Refresh
        </Button>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2.5, borderRadius: "12px" }} onClose={() => setError("")}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 2.5, borderRadius: "12px" }} onClose={() => setSuccess("")}>
          {success}
        </Alert>
      )}

      {/* ── Add Holiday Form Card ── */}
      {canManage && (
        <Paper
          component="form"
          onSubmit={handleCreate}
          elevation={0}
          sx={{
            p: 2.5,
            mb: 3,
            borderRadius: "16px",
            bgcolor: COLOR.card,
            border: `1px solid ${COLOR.border}`,
          }}
        >
          <Stack direction="row" spacing={1.25} alignItems="center" mb={2}>
            <Box sx={{ width: 28, height: 28, borderRadius: "8px", bgcolor: "rgba(59, 130, 246, 0.15)", color: COLOR.blue, display: "grid", placeItems: "center" }}>
              <Add sx={{ fontSize: 18 }} />
            </Box>
            <Box>
              <Typography variant="subtitle1" fontWeight={800} sx={{ color: COLOR.text }}>
                Add Holiday
              </Typography>
              <Typography variant="caption" sx={{ color: COLOR.textMuted, fontSize: "0.72rem" }}>
                The selected date will appear as Holiday in attendance.
              </Typography>
            </Box>
          </Stack>

          <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
            <TextField
              label="Holiday Date"
              type="date"
              value={form.date}
              onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))}
              InputLabelProps={{ shrink: true }}
              required
              size="small"
              sx={{
                minWidth: { md: 220 },
                "& .MuiOutlinedInput-root": {
                  bgcolor: "#080c16",
                  color: COLOR.text,
                  borderRadius: "10px",
                  "& fieldset": { borderColor: COLOR.border },
                },
                "& .MuiInputLabel-root": { color: COLOR.textMuted },
              }}
            />
            <TextField
              label="Holiday Name"
              placeholder="Example: Diwali"
              value={form.reason}
              onChange={(event) => setForm((current) => ({ ...current, reason: event.target.value }))}
              inputProps={{ maxLength: 120 }}
              required
              fullWidth
              size="small"
              sx={{
                "& .MuiOutlinedInput-root": {
                  bgcolor: "#080c16",
                  color: COLOR.text,
                  borderRadius: "10px",
                  "& fieldset": { borderColor: COLOR.border },
                },
                "& .MuiInputLabel-root": { color: COLOR.textMuted },
              }}
            />
            <Button
              type="submit"
              variant="contained"
              startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <Add />}
              disabled={saving}
              sx={{
                minWidth: 150,
                height: 40,
                bgcolor: COLOR.blue,
                color: "#fff",
                fontWeight: 800,
                fontSize: "0.82rem",
                borderRadius: "10px",
                textTransform: "none",
                "&:hover": { bgcolor: "#2563eb" },
              }}
            >
              {saving ? "Adding..." : "Add Holiday"}
            </Button>
          </Stack>
        </Paper>
      )}

      {/* ── Holiday History Card ── */}
      <Paper
        elevation={0}
        sx={{
          borderRadius: "16px",
          bgcolor: COLOR.card,
          border: `1px solid ${COLOR.border}`,
          overflow: "hidden",
        }}
      >
        <Box sx={{ px: 3, py: 2, display: "flex", alignItems: "center", justifyContent: "space-between", bgcolor: COLOR.cardHeader, borderBottom: `1px solid ${COLOR.border}` }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Box sx={{ width: 28, height: 28, borderRadius: "8px", bgcolor: "rgba(147, 51, 234, 0.15)", color: "#c084fc", display: "grid", placeItems: "center" }}>
              <History sx={{ fontSize: 16 }} />
            </Box>
            <Typography variant="subtitle1" fontWeight={800} sx={{ color: COLOR.text }}>
              Holiday History
            </Typography>
          </Stack>
          <Chip
            label={`${holidays.length} total`}
            sx={{
              bgcolor: "rgba(59, 130, 246, 0.2)",
              color: "#60a5fa",
              fontWeight: 800,
              fontSize: "0.72rem",
              borderRadius: "999px",
              height: 24,
              border: "1px solid rgba(59, 130, 246, 0.4)",
            }}
          />
        </Box>

        {loading ? (
          <Box sx={{ py: 8, display: "grid", placeItems: "center" }}>
            <CircularProgress size={32} sx={{ color: COLOR.blue }} />
          </Box>
        ) : holidays.length === 0 ? (
          <Box sx={{ p: 5, m: 2.5, borderRadius: "14px", border: "1px dashed rgba(255, 255, 255, 0.1)", textAlign: "center" }}>
            <Box sx={{ width: 56, height: 56, borderRadius: "50%", bgcolor: "rgba(255, 255, 255, 0.04)", display: "flex", alignItems: "center", justifyContent: "center", mx: "auto", mb: 2 }}>
              <CalendarToday sx={{ fontSize: 28, color: COLOR.textMuted }} />
            </Box>
            <Typography fontWeight={800} sx={{ color: COLOR.text, fontSize: "1rem", mb: 0.5 }}>
              No holiday added yet.
            </Typography>
            <Typography variant="body2" sx={{ color: COLOR.textMuted, fontSize: "0.85rem" }}>
              Add a holiday to see it here.
            </Typography>
          </Box>
        ) : (
          <TableContainer>
            <Table sx={{ minWidth: 760 }}>
              <TableHead sx={{ bgcolor: COLOR.tableHead }}>
                <TableRow>
                  {["Date", "Holiday", "Added By", "Attendance Updated", "Skipped", ...(canManage ? ["Action"] : [])].map((head) => (
                    <TableCell
                      key={head}
                      sx={{
                        color: COLOR.textMuted,
                        fontWeight: 800,
                        fontSize: "0.72rem",
                        py: 1.5,
                        borderColor: COLOR.border,
                        ...(head === "Action" && { textAlign: "right", pr: 3 }),
                      }}
                    >
                      {head}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>

              <TableBody>
                {holidays.map((holiday) => {
                  const affected = Number(holiday.createdCount || 0) + Number(holiday.updatedCount || 0);
                  return (
                    <TableRow
                      key={holiday._id}
                      sx={{
                        borderBottom: `1px solid ${COLOR.border}`,
                        "&:hover": { bgcolor: COLOR.cardHover },
                      }}
                    >
                      <TableCell sx={{ borderColor: COLOR.border, py: 1.75 }}>
                        <Typography fontWeight={800} sx={{ color: COLOR.text, fontSize: "0.85rem" }}>
                          {formatDate(holiday.date)}
                        </Typography>
                      </TableCell>

                      <TableCell sx={{ borderColor: COLOR.border }}>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Celebration sx={{ color: COLOR.amber, fontSize: 18 }} />
                          <Typography fontWeight={800} sx={{ color: COLOR.text, fontSize: "0.85rem" }}>
                            {holiday.reason}
                          </Typography>
                        </Stack>
                      </TableCell>

                      <TableCell sx={{ borderColor: COLOR.border }}>
                        <Typography variant="body2" sx={{ color: COLOR.textSub, fontSize: "0.82rem" }}>
                          {getUserName(holiday.createdBy)}
                        </Typography>
                        <Typography variant="caption" sx={{ color: COLOR.textMuted, fontSize: "0.75rem" }}>
                          {formatDate(holiday.createdAt)}
                        </Typography>
                      </TableCell>

                      <TableCell sx={{ borderColor: COLOR.border }}>
                        <Chip
                          label={`${affected} records`}
                          size="small"
                          sx={{
                            height: 24,
                            borderRadius: "999px",
                            fontWeight: 800,
                            fontSize: "0.72rem",
                            bgcolor: "rgba(16, 185, 129, 0.15)",
                            color: "#34d399",
                            border: "1px solid rgba(16, 185, 129, 0.3)",
                          }}
                        />
                      </TableCell>

                      <TableCell sx={{ color: COLOR.textSub, fontWeight: 700, borderColor: COLOR.border }}>
                        {holiday.skippedCount || 0}
                      </TableCell>

                      {canManage && (
                        <TableCell align="right" sx={{ borderColor: COLOR.border, pr: 3 }}>
                          <Tooltip title="Delete holiday">
                            <IconButton
                              size="small"
                              onClick={() => setDeleteTarget(holiday)}
                              sx={{
                                width: 30,
                                height: 30,
                                borderRadius: "8px",
                                bgcolor: "rgba(239, 68, 68, 0.12)",
                                color: "#f87171",
                                border: "1px solid rgba(239, 68, 68, 0.3)",
                                "&:hover": { bgcolor: "rgba(239, 68, 68, 0.25)" },
                              }}
                            >
                              <DeleteOutline sx={{ fontSize: 16 }} />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={Boolean(deleteTarget)}
        onClose={() => !deleting && setDeleteTarget(null)}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: COLOR.card,
            color: COLOR.text,
            borderRadius: "16px",
            border: `1px solid ${COLOR.border}`,
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 800, borderBottom: `1px solid ${COLOR.border}` }}>
          Delete Holiday?
        </DialogTitle>
        <DialogContent sx={{ pt: 2.5 }}>
          <Typography sx={{ color: COLOR.textSub, fontSize: "0.9rem" }}>
            Delete <strong>{deleteTarget?.reason}</strong> on <strong>{formatDate(deleteTarget?.date)}</strong>? Connected holiday attendance records will also be removed or restored.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2, borderTop: `1px solid ${COLOR.border}` }}>
          <Button onClick={() => setDeleteTarget(null)} disabled={deleting} sx={{ color: COLOR.textMuted, fontWeight: 700 }}>
            Cancel
          </Button>
          <Button
            bgcolor={COLOR.red}
            variant="contained"
            color="error"
            onClick={handleDelete}
            disabled={deleting}
            sx={{ borderRadius: "10px", fontWeight: 800 }}
          >
            {deleting ? "Deleting..." : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
