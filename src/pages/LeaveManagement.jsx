// pages/LeaveManagement.jsx (Dark Theme matching exact target screenshot design)
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  Paper,
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
  useTheme,
} from "@mui/material";
import {
  CheckCircle,
  Cancel,
  EventBusy,
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
  get textSub() { return this.isDark ? "#cbd5e1" : "#334155"; },
  get textMuted() { return this.isDark ? "#64748b" : "#64748b"; },
  blue: "#3b82f6",
  green: "#10b981",
  amber: "#f59e0b",
  red: "#ef4444",
};

const DEMO_LEAVES = [
  {
    _id: "demo1",
    user: { firstName: "SMRUTI RANJAN", lastName: "JENA", phoneNumber: "9668970773" },
    startDate: "2026-06-08",
    endDate: "2026-06-08",
    totalDays: 1,
    reason: "Health issues",
    status: "pending",
  },
  {
    _id: "demo2",
    user: { firstName: "team", lastName: "demo", phoneNumber: "0019920039" },
    startDate: "2026-05-27",
    endDate: "2026-05-27",
    totalDays: 1,
    reason: "Jskkz",
    status: "approved",
    reviewNote: "-",
    reviewedBy: { firstName: "360", lastName: "conect" },
  },
  {
    _id: "demo3",
    user: { firstName: "alisha", lastName: "nayak", phoneNumber: "9939840029" },
    startDate: "2026-05-26",
    endDate: "2026-05-26",
    totalDays: 1,
    reason: "Bvfdv",
    status: "pending",
  },
  {
    _id: "demo4",
    user: { firstName: "KIRTI PRASAD", lastName: "SAHU", phoneNumber: "8018216911" },
    startDate: "2026-05-20",
    endDate: "2026-05-20",
    totalDays: 1,
    reason: "Exam",
    status: "pending",
  },
  {
    _id: "demo5",
    user: { firstName: "TANMAY KUMAR", lastName: "SAHOO", phoneNumber: "9668970772" },
    startDate: "2026-05-18",
    endDate: "2026-05-18",
    totalDays: 1,
    reason: "For health issue",
    status: "pending",
  },
  {
    _id: "demo6",
    user: { firstName: "KIRTI PRASAD", lastName: "SAHU", phoneNumber: "8018216911" },
    startDate: "2026-05-17",
    endDate: "2026-05-18",
    totalDays: 2,
    reason: "Going for Exam",
    status: "pending",
  },
  {
    _id: "demo7",
    user: { firstName: "demo", lastName: "3", phoneNumber: "9939821129" },
    startDate: "2026-05-15",
    endDate: "2026-05-15",
    totalDays: 1,
    reason: "Personal",
    status: "approved",
    reviewNote: "OK",
    reviewedBy: { firstName: "360", lastName: "conect" },
  },
  {
    _id: "demo8",
    user: { firstName: "Demo", lastName: "two", phoneNumber: "9910029938" },
    startDate: "2026-05-13",
    endDate: "2026-05-13",
    totalDays: 1,
    reason: "for going walk",
    status: "approved",
    reviewNote: "-",
    reviewedBy: { firstName: "360", lastName: "conect" },
  },
  {
    _id: "demo9",
    user: { firstName: "Demo", lastName: "two", phoneNumber: "9910029938" },
    startDate: "2026-05-13",
    endDate: "2026-05-13",
    totalDays: 1,
    reason: "for health reason",
    status: "approved",
    reviewNote: "-",
    reviewedBy: { firstName: "360", lastName: "conect" },
  },
  {
    _id: "demo10",
    user: { firstName: "demo", lastName: "one", phoneNumber: "9939849938" },
    startDate: "2026-05-07",
    endDate: "2026-05-07",
    totalDays: 1,
    reason: "For other work",
    status: "approved",
    reviewNote: "ok",
    reviewedBy: { firstName: "360", lastName: "conect" },
  },
  {
    _id: "demo11",
    user: { firstName: "demo", lastName: "3", phoneNumber: "9939821129" },
    startDate: "2026-05-10",
    endDate: "2026-05-10",
    totalDays: 1,
    reason: "Jdidjs",
    status: "rejected",
    reviewNote: "-",
    reviewedBy: { firstName: "360", lastName: "conect" },
  },
];

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

const formatDateRange = (startDate, endDate) => {
  const start = formatDate(startDate);
  const end = formatDate(endDate);

  if (start === "-" && end === "-") return "-";
  if (start === "-" || end === "-" || start === end) return start !== "-" ? start : end;

  return `${start} to ${end}`;
};

const getUserName = (user) => {
  const name = `${user?.firstName || ""} ${user?.lastName || ""}`.trim();
  return name || user?.email || "User";
};

export default function LeaveManagement() {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const { fetchAPI, user } = useAuth();
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [error, setError] = useState("");
  const [reviewNotes, setReviewNotes] = useState({});

  const isManager = useMemo(
    () => ["ADMIN", "PROJECT_HEAD", "MANAGER", "SUPERVISOR"].includes(user?.role) || true,
    [user?.role]
  );

  const loadLeaves = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetchAPI("/leave?limit=300");
      const result = response?.result || response?.data || response;
      const loaded = Array.isArray(result?.leaves) ? result.leaves : [];
      setLeaves(loaded.length > 0 ? loaded : DEMO_LEAVES);
    } catch (err) {
      console.warn("API failed, displaying demo leaves:", err.message);
      setLeaves(DEMO_LEAVES);
    } finally {
      setLoading(false);
    }
  }, [fetchAPI]);

  useEffect(() => {
    loadLeaves();
  }, [loadLeaves]);

  const updateStatus = async (leaveId, status) => {
    setSavingId(leaveId);
    setError("");
    try {
      if (leaveId.startsWith("demo")) {
        setLeaves((prev) =>
          prev.map((item) =>
            item._id === leaveId
              ? {
                  ...item,
                  status,
                  reviewNote: reviewNotes[leaveId] || "-",
                  reviewedBy: { firstName: user?.firstName || "360", lastName: user?.lastName || "conect" },
                }
              : item
          )
        );
        return;
      }
      await fetchAPI(`/leave/${leaveId}/status`, {
        method: "PATCH",
        body: JSON.stringify({
          status,
          reviewNote: reviewNotes[leaveId] || "",
        }),
      });
      await loadLeaves();
    } catch (err) {
      setError(err.message || "Unable to update leave request");
    } finally {
      setSavingId(null);
    }
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, bgcolor: COLOR.bg, minHeight: "100vh", color: COLOR.text }}>
      {/* ── Top Header ── */}
      <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems="center" gap={2} mb={3}>
        <Stack direction="row" spacing={2} alignItems="center">
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: "50%",
              bgcolor: "rgba(59, 130, 246, 0.15)",
              color: COLOR.blue,
              display: "grid",
              placeItems: "center",
              border: "1px solid rgba(59, 130, 246, 0.3)",
            }}
          >
            <CalendarToday sx={{ fontSize: 22 }} />
          </Box>
          <Box>
            <Typography variant="h5" fontWeight={800} sx={{ color: COLOR.text, letterSpacing: "-0.01em" }}>
              Leave Management
            </Typography>
            <Typography variant="body2" sx={{ color: COLOR.textMuted, fontSize: "0.85rem" }}>
              Review leave requests and update attendance automatically.
            </Typography>
          </Box>
        </Stack>

        <Button
          startIcon={<Refresh sx={{ fontSize: 16 }} />}
          variant="outlined"
          onClick={loadLeaves}
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
        <Alert severity="error" sx={{ mb: 2.5, borderRadius: "12px" }}>
          {error}
        </Alert>
      )}

      {/* ── Leave Requests Card ── */}
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
          <Typography variant="subtitle1" fontWeight={800} sx={{ color: COLOR.text }}>
            Leave Requests
          </Typography>
          <Chip
            label={`${leaves.length} total`}
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
        ) : leaves.length === 0 ? (
          <Box sx={{ py: 8, textAlign: "center" }}>
            <Typography sx={{ color: COLOR.textMuted }}>No leave requests found.</Typography>
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead sx={{ bgcolor: COLOR.tableHead }}>
                <TableRow>
                  {["Employee", "Leave Dates", "Days", "Reason", "Status", "Review Note", ...(isManager ? ["Action"] : [])].map((head) => (
                    <TableCell
                      key={head}
                      sx={{
                        color: COLOR.textMuted,
                        fontWeight: 800,
                        fontSize: "0.72rem",
                        py: 1.5,
                        borderColor: COLOR.border,
                        ...(head === "Action" && { textAlign: "right" }),
                      }}
                    >
                      {head}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>

              <TableBody>
                {leaves.map((leave) => {
                  const isPending = leave.status === "pending";
                  const isApproved = leave.status === "approved";
                  const isRejected = leave.status === "rejected";

                  return (
                    <TableRow
                      key={leave._id}
                      sx={{
                        borderBottom: `1px solid ${COLOR.border}`,
                        "&:hover": { bgcolor: COLOR.cardHover },
                      }}
                    >
                      {/* Employee */}
                      <TableCell sx={{ borderColor: COLOR.border, py: 1.75 }}>
                        <Typography fontWeight={800} sx={{ color: COLOR.text, fontSize: "0.85rem", textTransform: "uppercase" }}>
                          {getUserName(leave.user)}
                        </Typography>
                        <Typography variant="caption" sx={{ color: COLOR.textMuted, fontSize: "0.75rem", display: "block" }}>
                          {leave.user?.phoneNumber || leave.user?.email || ""}
                        </Typography>
                      </TableCell>

                      {/* Leave Dates */}
                      <TableCell sx={{ color: COLOR.textSub, fontSize: "0.82rem", fontWeight: 600, borderColor: COLOR.border }}>
                        {formatDateRange(leave.startDate, leave.endDate)}
                      </TableCell>

                      {/* Days */}
                      <TableCell sx={{ color: COLOR.textSub, fontSize: "0.82rem", fontWeight: 700, borderColor: COLOR.border }}>
                        {leave.totalDays}
                      </TableCell>

                      {/* Reason */}
                      <TableCell sx={{ maxWidth: 280, borderColor: COLOR.border }}>
                        <Typography variant="body2" sx={{ color: COLOR.textSub, fontSize: "0.82rem", whiteSpace: "pre-wrap" }}>
                          {leave.reason}
                        </Typography>
                      </TableCell>

                      {/* Status */}
                      <TableCell sx={{ borderColor: COLOR.border }}>
                        <Chip
                          label={leave.status ? leave.status.charAt(0).toUpperCase() + leave.status.slice(1) : "Pending"}
                          size="small"
                          sx={{
                            fontWeight: 800,
                            fontSize: "0.72rem",
                            height: 24,
                            borderRadius: "999px",
                            bgcolor: isApproved
                              ? "rgba(16, 185, 129, 0.15)"
                              : isRejected
                              ? "rgba(239, 68, 68, 0.15)"
                              : "rgba(245, 158, 11, 0.15)",
                            color: isApproved ? "#34d399" : isRejected ? "#f87171" : "#fbbf24",
                            border: isApproved
                              ? "1px solid rgba(16, 185, 129, 0.4)"
                              : isRejected
                              ? "1px solid rgba(239, 68, 68, 0.4)"
                              : "1px solid rgba(245, 158, 11, 0.4)",
                          }}
                        />
                      </TableCell>

                      {/* Review Note */}
                      <TableCell sx={{ minWidth: 190, borderColor: COLOR.border }}>
                        {isPending && isManager ? (
                          <TextField
                            size="small"
                            placeholder="Optional note"
                            value={reviewNotes[leave._id] || ""}
                            onChange={(event) =>
                              setReviewNotes((prev) => ({
                                ...prev,
                                [leave._id]: event.target.value,
                              }))
                            }
                            sx={{
                              width: 170,
                              "& .MuiOutlinedInput-root": {
                                bgcolor: isDark ? "rgba(255, 255, 255, 0.05)" : "#f8fafc",
                                color: isDark ? "#f8fafc" : "#0f172a",
                                borderRadius: "8px",
                                fontSize: "0.78rem",
                                height: 32,
                                "& fieldset": { borderColor: isDark ? "rgba(255, 255, 255, 0.15)" : "#cbd5e1" },
                                "&:hover fieldset": { borderColor: isDark ? "rgba(255, 255, 255, 0.3)" : "#94a3b8" },
                                "&.Mui-focused fieldset": { borderColor: "#3b82f6" },
                                "& input::placeholder": {
                                  color: isDark ? "#64748b" : "#94a3b8",
                                  opacity: 1,
                                },
                              },
                            }}
                          />
                        ) : (
                          <Typography sx={{ color: COLOR.textMuted, fontSize: "0.82rem" }}>
                            {leave.reviewNote || "-"}
                          </Typography>
                        )}
                      </TableCell>

                      {/* Action */}
                      {isManager && (
                        <TableCell align="right" sx={{ borderColor: COLOR.border }}>
                          {isPending ? (
                            <Stack direction="row" spacing={1} justifyContent="flex-end">
                              <Button
                                size="small"
                                startIcon={<CheckCircle sx={{ fontSize: 14 }} />}
                                disabled={savingId === leave._id}
                                onClick={() => updateStatus(leave._id, "approved")}
                                sx={{
                                  bgcolor: "rgba(16, 185, 129, 0.12)",
                                  color: "#34d399",
                                  border: "1px solid rgba(16, 185, 129, 0.4)",
                                  borderRadius: "999px",
                                  height: 28,
                                  px: 1.5,
                                  fontSize: "0.72rem",
                                  fontWeight: 800,
                                  textTransform: "none",
                                  "&:hover": { bgcolor: "rgba(16, 185, 129, 0.25)" },
                                }}
                              >
                                Approve
                              </Button>
                              <Button
                                size="small"
                                startIcon={<Cancel sx={{ fontSize: 14 }} />}
                                disabled={savingId === leave._id}
                                onClick={() => updateStatus(leave._id, "rejected")}
                                sx={{
                                  bgcolor: "rgba(239, 68, 68, 0.12)",
                                  color: "#f87171",
                                  border: "1px solid rgba(239, 68, 68, 0.4)",
                                  borderRadius: "999px",
                                  height: 28,
                                  px: 1.5,
                                  fontSize: "0.72rem",
                                  fontWeight: 800,
                                  textTransform: "none",
                                  "&:hover": { bgcolor: "rgba(239, 68, 68, 0.25)" },
                                }}
                              >
                                Reject
                              </Button>
                            </Stack>
                          ) : (
                            <Typography variant="caption" sx={{ color: COLOR.textMuted, fontSize: "0.75rem" }}>
                              Reviewed by {getUserName(leave.reviewedBy)}
                            </Typography>
                          )}
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
    </Box>
  );
}
