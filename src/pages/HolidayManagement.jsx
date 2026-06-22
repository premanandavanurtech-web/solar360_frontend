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
} from "@mui/material";
import {
  Add,
  Celebration,
  DeleteOutline,
  History,
  Refresh,
} from "@mui/icons-material";
import { useAuth } from "../contexts/AuthContext";

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
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const getUserName = (user) => {
  const name = `${user?.firstName || ""} ${user?.lastName || ""}`.trim();
  return name || user?.email || "Head Office";
};

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

  const canManage = useMemo(() => user?.role === "Admin_panel", [user?.role]);

  const loadHolidays = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetchAPI("/attendance/holidays?limit=500");
      const result = response?.result || response?.data || response;
      setHolidays(Array.isArray(result?.holidays) ? result.holidays : []);
    } catch (err) {
      setError(err.message || "Unable to load holiday history");
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
      const affected =
        Number(holiday.createdCount || 0) + Number(holiday.updatedCount || 0);
      setSuccess(
        `Holiday added and connected to ${affected} attendance record${affected === 1 ? "" : "s"}.`,
      );
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
      const response = await fetchAPI(
        `/attendance/holidays/${deleteTarget._id}`,
        { method: "DELETE" },
      );
      const result = response?.result || {};
      const affected =
        Number(result.deletedAttendanceCount || 0) +
        Number(result.restoredAttendanceCount || 0);
      setSuccess(
        `Holiday deleted. ${affected} attendance record${affected === 1 ? "" : "s"} updated.`,
      );
      setDeleteTarget(null);
      await loadHolidays();
    } catch (err) {
      setError(err.message || "Unable to delete holiday");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, bgcolor: "#f5f7fb", minHeight: "100vh" }}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "stretch", sm: "center" }}
        gap={2}
        mb={3}
      >
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Box
            sx={{
              width: 46,
              height: 46,
              borderRadius: 2.5,
              bgcolor: "#fff4df",
              color: "#e88700",
              display: "grid",
              placeItems: "center",
            }}
          >
            <Celebration />
          </Box>
          <Box>
            <Typography variant="h5" fontWeight={800}>
              Holiday Management
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Add holidays, review history, and update attendance automatically.
            </Typography>
          </Box>
        </Stack>
        <Button
          startIcon={<Refresh />}
          variant="outlined"
          onClick={loadHolidays}
          disabled={loading}
        >
          Refresh
        </Button>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess("")}>
          {success}
        </Alert>
      )}

      {canManage && (
        <Card component="form" onSubmit={handleCreate} sx={{ p: 2.5, mb: 3 }}>
          <Stack direction="row" spacing={1.25} alignItems="center" mb={2}>
            <Add color="primary" />
            <Box>
              <Typography variant="h6" fontWeight={800}>
                Add Holiday
              </Typography>
              <Typography variant="body2" color="text.secondary">
                The selected date will appear as Holiday in attendance.
              </Typography>
            </Box>
          </Stack>
          <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
            <TextField
              label="Holiday Date"
              type="date"
              value={form.date}
              onChange={(event) =>
                setForm((current) => ({ ...current, date: event.target.value }))
              }
              InputLabelProps={{ shrink: true }}
              required
              sx={{ minWidth: { md: 220 } }}
            />
            <TextField
              label="Holiday Name"
              placeholder="Example: Diwali"
              value={form.reason}
              onChange={(event) =>
                setForm((current) => ({ ...current, reason: event.target.value }))
              }
              inputProps={{ maxLength: 120 }}
              required
              fullWidth
            />
            <Button
              type="submit"
              variant="contained"
              startIcon={saving ? <CircularProgress size={18} color="inherit" /> : <Add />}
              disabled={saving}
              sx={{ minWidth: 150 }}
            >
              {saving ? "Adding..." : "Add Holiday"}
            </Button>
          </Stack>
        </Card>
      )}

      <Card sx={{ overflow: "hidden" }}>
        <Box
          sx={{
            p: 2.5,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 2,
          }}
        >
          <Stack direction="row" spacing={1} alignItems="center">
            <History color="primary" />
            <Typography variant="h6" fontWeight={800}>
              Holiday History
            </Typography>
          </Stack>
          <Chip label={`${holidays.length} total`} color="primary" size="small" />
        </Box>
        <Divider />

        {loading ? (
          <Box sx={{ py: 8, display: "grid", placeItems: "center" }}>
            <CircularProgress />
          </Box>
        ) : holidays.length === 0 ? (
          <Box sx={{ py: 8, textAlign: "center" }}>
            <Celebration sx={{ fontSize: 42, color: "text.disabled", mb: 1 }} />
            <Typography color="text.secondary">No holidays added yet.</Typography>
          </Box>
        ) : (
          <TableContainer>
            <Table sx={{ minWidth: 760 }}>
              <TableHead sx={{ bgcolor: "#f3f5fb" }}>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Holiday</TableCell>
                  <TableCell>Added By</TableCell>
                  <TableCell>Attendance Updated</TableCell>
                  <TableCell>Skipped</TableCell>
                  {canManage && <TableCell align="right">Action</TableCell>}
                </TableRow>
              </TableHead>
              <TableBody>
                {holidays.map((holiday) => {
                  const affected =
                    Number(holiday.createdCount || 0) +
                    Number(holiday.updatedCount || 0);
                  return (
                    <TableRow key={holiday._id} hover>
                      <TableCell>
                        <Typography fontWeight={700}>
                          {formatDate(holiday.date)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Celebration sx={{ color: "#e88700", fontSize: 20 }} />
                          <Typography fontWeight={700}>{holiday.reason}</Typography>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {getUserName(holiday.createdBy)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {formatDate(holiday.createdAt)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={`${affected} records`}
                          color="success"
                          variant="outlined"
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{holiday.skippedCount || 0}</TableCell>
                      {canManage && (
                        <TableCell align="right">
                          <Tooltip title="Delete holiday">
                            <IconButton
                              color="error"
                              onClick={() => setDeleteTarget(holiday)}
                            >
                              <DeleteOutline />
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
      </Card>

      <Dialog
        open={Boolean(deleteTarget)}
        onClose={() => !deleting && setDeleteTarget(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Delete Holiday?</DialogTitle>
        <DialogContent>
          <Typography>
            Delete <strong>{deleteTarget?.reason}</strong> on{" "}
            <strong>{formatDate(deleteTarget?.date)}</strong>? Connected holiday
            attendance records will also be removed or restored.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDeleteTarget(null)} disabled={deleting}>
            Cancel
          </Button>
          <Button
            color="error"
            variant="contained"
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting ? "Deleting..." : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
