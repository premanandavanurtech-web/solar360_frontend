// pages/LeaveTypes.jsx (Dark Theme matching exact target screenshot design)
import React, { useMemo, useState } from "react";
import {
  Box,
  Button,
  Card,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  MenuItem,
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
} from "@mui/material";
import {
  Add,
  DeleteOutline,
  EditOutlined,
  CalendarToday,
} from "@mui/icons-material";

const COLOR = {
  get isDark() {
    return (localStorage.getItem("appThemeMode") || "dark") === "dark";
  },
  get bg() { return this.isDark ? "#060a12" : "#f6f8fc"; },
  get card() { return this.isDark ? "#0e1424" : "#ffffff"; },
  get cardHover() { return this.isDark ? "#131b30" : "#f8fafc"; },
  get cardHeader() { return this.isDark ? "#0b101c" : "#ffffff"; },
  get tableHead() { return this.isDark ? "#0b101c" : "#f8fafc"; },
  get border() { return this.isDark ? "rgba(255, 255, 255, 0.08)" : "#e2e8f0"; },
  get text() { return this.isDark ? "#f8fafc" : "#0f172a"; },
  get textSub() { return this.isDark ? "#94a3b8" : "#334155"; },
  get textMuted() { return this.isDark ? "#64748b" : "#64748b"; },
  blue: "#3b82f6",
  green: "#10b981",
  red: "#ef4444",
};

const initialLeaveTypes = [
  {
    id: 1,
    name: "Casual Leave",
    code: "CL",
    annualQuota: 12.0,
    carryForward: "No",
    paid: "Yes",
    halfDay: "Yes",
    encashable: "No",
    docRequired: "No",
    status: "Active",
  },
  {
    id: 2,
    name: "Sick Leave",
    code: "SL",
    annualQuota: 8.0,
    carryForward: "No",
    paid: "Yes",
    halfDay: "Yes",
    encashable: "No",
    docRequired: "+2d",
    status: "Active",
  },
  {
    id: 3,
    name: "Earned Leave",
    code: "EL",
    annualQuota: 15.0,
    carryForward: "Yes (10.0d)",
    paid: "Yes",
    halfDay: "No",
    encashable: "Yes",
    docRequired: "No",
    status: "Active",
  },
  {
    id: 4,
    name: "Compensatory Off",
    code: "CO",
    annualQuota: 0.0,
    carryForward: "No",
    paid: "Yes",
    halfDay: "Yes",
    encashable: "No",
    docRequired: "No",
    status: "Active",
  },
  {
    id: 5,
    name: "Maternity Leave",
    code: "ML",
    annualQuota: 182.0,
    carryForward: "No",
    paid: "Yes",
    halfDay: "No",
    encashable: "No",
    docRequired: "+dd",
    status: "Active",
  },
  {
    id: 6,
    name: "Paternity Leave",
    code: "PL",
    annualQuota: 5.0,
    carryForward: "No",
    paid: "Yes",
    halfDay: "No",
    encashable: "No",
    docRequired: "+dd",
    status: "Active",
  },
  {
    id: 7,
    name: "Loss of Pay",
    code: "LOP",
    annualQuota: 0.0,
    carryForward: "No",
    paid: "No",
    halfDay: "Yes",
    encashable: "No",
    docRequired: "No",
    status: "Active",
  },
];

const createEmptyForm = () => ({
  name: "",
  code: "",
  annualQuota: "",
  carryForward: "No",
  paid: "Yes",
  halfDay: "No",
  encashable: "No",
  docRequired: "No",
  status: "Active",
});

const formatQuota = (value) => Number(value || 0).toFixed(1);

const DarkPillCell = ({ value }) => {
  const isPositive = value === "Yes" || value.startsWith("Yes") || value.startsWith("+");
  return (
    <Chip
      label={value}
      size="small"
      sx={{
        height: 24,
        borderRadius: "999px",
        fontSize: "0.72rem",
        fontWeight: 700,
        px: 0.5,
        bgcolor: isPositive ? "rgba(16, 185, 129, 0.15)" : "rgba(255, 255, 255, 0.06)",
        color: isPositive ? "#34d399" : COLOR.textMuted,
        border: isPositive ? "1px solid rgba(16, 185, 129, 0.3)" : `1px solid ${COLOR.border}`,
      }}
    />
  );
};

export default function LeaveTypes() {
  const [leaveTypes, setLeaveTypes] = useState(initialLeaveTypes);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formValues, setFormValues] = useState(createEmptyForm());

  const totalTypes = useMemo(() => leaveTypes.length, [leaveTypes.length]);

  const openCreateDialog = () => {
    setEditingId(null);
    setFormValues(createEmptyForm());
    setDialogOpen(true);
  };

  const openEditDialog = (leaveType) => {
    setEditingId(leaveType.id);
    setFormValues({
      name: leaveType.name,
      code: leaveType.code,
      annualQuota: leaveType.annualQuota,
      carryForward: leaveType.carryForward,
      paid: leaveType.paid,
      halfDay: leaveType.halfDay,
      encashable: leaveType.encashable,
      docRequired: leaveType.docRequired,
      status: leaveType.status,
    });
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingId(null);
  };

  const handleFormChange = (field) => (event) => {
    setFormValues((prev) => ({
      ...prev,
      [field]: event.target.value,
    }));
  };

  const handleSave = () => {
    const payload = {
      id: editingId || Date.now(),
      name: formValues.name.trim(),
      code: formValues.code.trim().toUpperCase(),
      annualQuota: Number(formValues.annualQuota || 0),
      carryForward: formValues.carryForward,
      paid: formValues.paid,
      halfDay: formValues.halfDay,
      encashable: formValues.encashable,
      docRequired: formValues.docRequired,
      status: formValues.status,
    };

    if (!payload.name || !payload.code) {
      return;
    }

    setLeaveTypes((prev) =>
      editingId
        ? prev.map((item) => (item.id === editingId ? payload : item))
        : [...prev, payload]
    );
    closeDialog();
  };

  const handleDelete = (leaveTypeId) => {
    setLeaveTypes((prev) => prev.filter((item) => item.id !== leaveTypeId));
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, bgcolor: COLOR.bg, minHeight: "100vh", color: COLOR.text }}>
      <Paper
        elevation={0}
        sx={{
          borderRadius: "18px",
          bgcolor: COLOR.card,
          border: `1px solid ${COLOR.border}`,
          overflow: "hidden",
        }}
      >
        {/* Header Bar */}
        <Stack
          direction={{ xs: "column", sm: "row" }}
          alignItems={{ xs: "flex-start", sm: "center" }}
          justifyContent="space-between"
          spacing={2}
          sx={{ px: { xs: 2, md: 3 }, py: 2.25, bgcolor: COLOR.cardHeader, borderBottom: `1px solid ${COLOR.border}` }}
        >
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Box
              sx={{
                width: 32,
                height: 32,
                borderRadius: "8px",
                bgcolor: "rgba(147, 51, 234, 0.15)",
                color: "#c084fc",
                display: "grid",
                placeItems: "center",
              }}
            >
              <CalendarToday sx={{ fontSize: 18 }} />
            </Box>

            <Typography variant="h6" fontWeight={800} sx={{ color: COLOR.text, display: "flex", alignItems: "center", gap: 1 }}>
              Leave Types
              <Chip
                label={totalTypes}
                size="small"
                sx={{
                  bgcolor: "rgba(59, 130, 246, 0.2)",
                  color: "#60a5fa",
                  fontWeight: 800,
                  borderRadius: "999px",
                  height: 22,
                  fontSize: "0.72rem",
                  border: "1px solid rgba(59, 130, 246, 0.3)",
                }}
              />
            </Typography>
          </Stack>

          <Button
            startIcon={<Add />}
            onClick={openCreateDialog}
            sx={{
              bgcolor: COLOR.blue,
              color: "#fff",
              px: 2.25,
              height: 38,
              borderRadius: "10px",
              fontWeight: 800,
              fontSize: "0.82rem",
              textTransform: "none",
              boxShadow: "0 4px 14px rgba(59, 130, 246, 0.3)",
              "&:hover": {
                bgcolor: "#2563eb",
                boxShadow: "0 6px 18px rgba(59, 130, 246, 0.4)",
              },
            }}
          >
            Add Leave Type
          </Button>
        </Stack>

        {/* Table */}
        <TableContainer sx={{ overflowX: "auto" }}>
          <Table sx={{ minWidth: 980 }}>
            <TableHead>
              <TableRow sx={{ bgcolor: COLOR.tableHead }}>
                {["NAME", "CODE", "ANNUAL QUOTA", "CARRY FORWARD", "PAID", "HALF DAY", "ENCASHABLE", "DOC. REQUIRED", "STATUS", "ACTIONS"].map((head) => (
                  <TableCell
                    key={head}
                    sx={{
                      borderColor: COLOR.border,
                      color: COLOR.textMuted,
                      fontSize: "0.68rem",
                      fontWeight: 800,
                      letterSpacing: "0.05em",
                      py: 1.5,
                      ...(head === "ACTIONS" && { textAlign: "right", pr: 3 }),
                    }}
                  >
                    {head}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>

            <TableBody>
              {leaveTypes.map((leaveType) => (
                <TableRow
                  key={leaveType.id}
                  sx={{
                    borderBottom: `1px solid ${COLOR.border}`,
                    "&:hover": { bgcolor: COLOR.cardHover },
                  }}
                >
                  {/* Name */}
                  <TableCell sx={{ fontWeight: 800, color: COLOR.text, fontSize: "0.85rem", borderColor: COLOR.border, py: 1.75 }}>
                    {leaveType.name}
                  </TableCell>

                  {/* Code */}
                  <TableCell sx={{ color: COLOR.textSub, fontWeight: 600, fontSize: "0.82rem", borderColor: COLOR.border }}>
                    {leaveType.code}
                  </TableCell>

                  {/* Annual Quota */}
                  <TableCell sx={{ color: COLOR.text, fontWeight: 700, fontSize: "0.85rem", borderColor: COLOR.border }}>
                    {formatQuota(leaveType.annualQuota)}
                  </TableCell>

                  {/* Carry Forward */}
                  <TableCell sx={{ borderColor: COLOR.border }}>
                    <DarkPillCell value={leaveType.carryForward} />
                  </TableCell>

                  {/* Paid */}
                  <TableCell sx={{ borderColor: COLOR.border }}>
                    <DarkPillCell value={leaveType.paid} />
                  </TableCell>

                  {/* Half Day */}
                  <TableCell sx={{ borderColor: COLOR.border }}>
                    <DarkPillCell value={leaveType.halfDay} />
                  </TableCell>

                  {/* Encashable */}
                  <TableCell sx={{ borderColor: COLOR.border }}>
                    <DarkPillCell value={leaveType.encashable} />
                  </TableCell>

                  {/* Doc Required */}
                  <TableCell sx={{ borderColor: COLOR.border }}>
                    <DarkPillCell value={leaveType.docRequired} />
                  </TableCell>

                  {/* Status */}
                  <TableCell sx={{ borderColor: COLOR.border }}>
                    <Chip
                      label={leaveType.status}
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

                  {/* Actions */}
                  <TableCell align="right" sx={{ borderColor: COLOR.border, pr: 3 }}>
                    <Stack direction="row" spacing={1} justifyContent="flex-end">
                      <IconButton
                        size="small"
                        onClick={() => openEditDialog(leaveType)}
                        sx={{
                          width: 30,
                          height: 30,
                          borderRadius: "8px",
                          bgcolor: "rgba(59, 130, 246, 0.12)",
                          color: "#60a5fa",
                          border: "1px solid rgba(59, 130, 246, 0.3)",
                          "&:hover": { bgcolor: "rgba(59, 130, 246, 0.25)" },
                        }}
                      >
                        <EditOutlined sx={{ fontSize: 16 }} />
                      </IconButton>

                      <IconButton
                        size="small"
                        onClick={() => handleDelete(leaveType.id)}
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
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* ── Create / Edit Dialog ── */}
      <Dialog
        open={dialogOpen}
        onClose={closeDialog}
        maxWidth="sm"
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
          {editingId ? "Edit Leave Type" : "Add Leave Type"}
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            <TextField
              label="Leave Type Name"
              value={formValues.name}
              onChange={handleFormChange("name")}
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
            <TextField
              label="Code (e.g. CL, SL)"
              value={formValues.code}
              onChange={handleFormChange("code")}
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
            <TextField
              label="Annual Quota"
              type="number"
              value={formValues.annualQuota}
              onChange={handleFormChange("annualQuota")}
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
            <Stack direction="row" spacing={2}>
              <TextField
                select
                label="Carry Forward"
                value={formValues.carryForward}
                onChange={handleFormChange("carryForward")}
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
              >
                <MenuItem value="No">No</MenuItem>
                <MenuItem value="Yes (10.0d)">Yes (10.0d)</MenuItem>
              </TextField>

              <TextField
                select
                label="Paid"
                value={formValues.paid}
                onChange={handleFormChange("paid")}
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
              >
                <MenuItem value="Yes">Yes</MenuItem>
                <MenuItem value="No">No</MenuItem>
              </TextField>
            </Stack>

            <Stack direction="row" spacing={2}>
              <TextField
                select
                label="Half Day"
                value={formValues.halfDay}
                onChange={handleFormChange("halfDay")}
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
              >
                <MenuItem value="Yes">Yes</MenuItem>
                <MenuItem value="No">No</MenuItem>
              </TextField>

              <TextField
                select
                label="Encashable"
                value={formValues.encashable}
                onChange={handleFormChange("encashable")}
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
              >
                <MenuItem value="Yes">Yes</MenuItem>
                <MenuItem value="No">No</MenuItem>
              </TextField>
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, borderTop: `1px solid ${COLOR.border}` }}>
          <Button onClick={closeDialog} sx={{ color: COLOR.textMuted, fontWeight: 700 }}>
            Cancel
          </Button>
          <Button onClick={handleSave} variant="contained" sx={{ bgcolor: COLOR.blue, fontWeight: 800, borderRadius: "10px" }}>
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
