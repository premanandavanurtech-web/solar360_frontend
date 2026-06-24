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
} from "@mui/material";
import {
  Add,
  DeleteOutline,
  EditOutlined,
  Inventory2Outlined,
} from "@mui/icons-material";

const initialLeaveTypes = [
  {
    id: 1,
    name: "Casual Leave",
    code: "CL",
    annualQuota: 12,
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
    annualQuota: 8,
    carryForward: "No",
    paid: "Yes",
    halfDay: "Yes",
    encashable: "No",
    docRequired: ">2d",
    status: "Active",
  },
  {
    id: 3,
    name: "Earned Leave",
    code: "EL",
    annualQuota: 15,
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
    annualQuota: 0,
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
    annualQuota: 182,
    carryForward: "No",
    paid: "Yes",
    halfDay: "No",
    encashable: "No",
    docRequired: ">0d",
    status: "Active",
  },
  {
    id: 6,
    name: "Paternity Leave",
    code: "PL",
    annualQuota: 5,
    carryForward: "No",
    paid: "Yes",
    halfDay: "No",
    encashable: "No",
    docRequired: ">0d",
    status: "Active",
  },
  {
    id: 7,
    name: "Loss of Pay",
    code: "LOP",
    annualQuota: 0,
    carryForward: "No",
    paid: "No",
    halfDay: "Yes",
    encashable: "No",
    docRequired: "No",
    status: "Active",
  },
];

const yesNoStyles = {
  Yes: {
    color: "#57b76a",
    backgroundColor: "#eefaf1",
  },
  No: {
    color: "#97a0b3",
    backgroundColor: "#f4f6fb",
  },
};

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

const PillCell = ({ value }) => {
  const style = yesNoStyles[value] || {
    color: "#57b76a",
    backgroundColor: "#eefaf1",
  };

  return (
    <Chip
      label={value}
      size="small"
      sx={{
        height: 22,
        borderRadius: "7px",
        fontSize: 11,
        fontWeight: 700,
        color: style.color,
        backgroundColor: style.backgroundColor,
        "& .MuiChip-label": { px: 1 },
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
        : [...prev, payload],
    );
    closeDialog();
  };

  const handleDelete = (leaveTypeId) => {
    setLeaveTypes((prev) => prev.filter((item) => item.id !== leaveTypeId));
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, bgcolor: "#f4f7fb", minHeight: "100vh" }}>
      <Card
        sx={{
          borderRadius: 4,
          border: "1px solid #e9eef7",
          boxShadow: "0 14px 34px rgba(15, 23, 42, 0.08)",
          overflow: "hidden",
        }}
      >
        <Stack
          direction={{ xs: "column", sm: "row" }}
          alignItems={{ xs: "flex-start", sm: "center" }}
          justifyContent="space-between"
          spacing={2}
          sx={{ px: { xs: 2, md: 3 }, py: 2.25 }}
        >
          <Stack direction="row" spacing={1.25} alignItems="center">
            <Box
              sx={{
                width: 26,
                height: 26,
                borderRadius: 1.5,
                bgcolor: "#f1edff",
                color: "#6f5ef9",
                display: "grid",
                placeItems: "center",
              }}
            >
              <Inventory2Outlined sx={{ fontSize: 16 }} />
            </Box>
            <Typography sx={{ fontSize: 18, fontWeight: 700, color: "#2d3348" }}>
              Leave Types
              <Box component="span" sx={{ ml: 1, color: "#7c73ff", fontSize: 14, fontWeight: 700 }}>
                {totalTypes}
              </Box>
            </Typography>
          </Stack>

          <Button
            startIcon={<Add />}
            onClick={openCreateDialog}
            sx={{
              bgcolor: "#58c2ac",
              color: "#fff",
              px: 2.25,
              py: 1,
              borderRadius: 2,
              fontWeight: 700,
              textTransform: "none",
              boxShadow: "none",
              "&:hover": {
                bgcolor: "#45b39c",
                boxShadow: "none",
              },
            }}
          >
            Add Leave Type
          </Button>
        </Stack>

        <Divider />

        <TableContainer component={Paper} elevation={0} sx={{ overflowX: "auto" }}>
          <Table sx={{ minWidth: 980 }}>
            <TableHead>
              <TableRow
                sx={{
                  "& .MuiTableCell-root": {
                    borderBottom: "1px solid #edf1f7",
                    color: "#9aa5b5",
                    fontSize: 11,
                    fontWeight: 800,
                    letterSpacing: "0.04em",
                    textTransform: "uppercase",
                    py: 1.8,
                    backgroundColor: "#ffffff",
                  },
                }}
              >
                <TableCell>NAME</TableCell>
                <TableCell>CODE</TableCell>
                <TableCell>ANNUAL QUOTA</TableCell>
                <TableCell>CARRY FORWARD</TableCell>
                <TableCell>PAID</TableCell>
                <TableCell>HALF DAY</TableCell>
                <TableCell>ENCASHABLE</TableCell>
                <TableCell>DOC REQUIRED</TableCell>
                <TableCell>STATUS</TableCell>
                <TableCell align="center">ACTIONS</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {leaveTypes.map((leaveType) => (
                <TableRow
                  key={leaveType.id}
                  hover
                  sx={{
                    "& .MuiTableCell-root": {
                      borderBottom: "1px solid #edf1f7",
                      py: 1.8,
                      fontSize: 14,
                      color: "#4b5566",
                    },
                  }}
                >
                  <TableCell sx={{ fontWeight: 700, color: "#2f3546" }}>{leaveType.name}</TableCell>
                  <TableCell sx={{ color: "#a3acba" }}>{leaveType.code}</TableCell>
                  <TableCell sx={{ color: "#2f3546", fontWeight: 600 }}>
                    {formatQuota(leaveType.annualQuota)}
                  </TableCell>
                  <TableCell>
                    <PillCell value={leaveType.carryForward} />
                  </TableCell>
                  <TableCell>
                    <PillCell value={leaveType.paid} />
                  </TableCell>
                  <TableCell>
                    <PillCell value={leaveType.halfDay} />
                  </TableCell>
                  <TableCell>
                    <PillCell value={leaveType.encashable} />
                  </TableCell>
                  <TableCell>
                    <PillCell value={leaveType.docRequired} />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={leaveType.status}
                      size="small"
                      sx={{
                        height: 24,
                        borderRadius: "999px",
                        px: 0.25,
                        fontWeight: 700,
                        color: "#57b76a",
                        backgroundColor: "#eefaf1",
                      }}
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Stack direction="row" spacing={1} justifyContent="center">
                      <IconButton
                        size="small"
                        onClick={() => openEditDialog(leaveType)}
                        sx={{
                          width: 28,
                          height: 28,
                          bgcolor: "#f5f2ff",
                          color: "#7b6dff",
                          "&:hover": { bgcolor: "#eee8ff" },
                        }}
                      >
                        <EditOutlined sx={{ fontSize: 15 }} />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleDelete(leaveType.id)}
                        sx={{
                          width: 28,
                          height: 28,
                          bgcolor: "#fff1ef",
                          color: "#ee8c7e",
                          "&:hover": { bgcolor: "#ffe7e2" },
                        }}
                      >
                        <DeleteOutline sx={{ fontSize: 15 }} />
                      </IconButton>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      <Dialog open={dialogOpen} onClose={closeDialog} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 800 }}>
          {editingId ? "Edit Leave Type" : "Add Leave Type"}
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                label="Leave Name"
                value={formValues.name}
                onChange={handleFormChange("name")}
                fullWidth
              />
              <TextField
                label="Code"
                value={formValues.code}
                onChange={handleFormChange("code")}
                fullWidth
              />
            </Stack>

            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                label="Annual Quota"
                type="number"
                value={formValues.annualQuota}
                onChange={handleFormChange("annualQuota")}
                fullWidth
              />
              <TextField
                select
                label="Status"
                value={formValues.status}
                onChange={handleFormChange("status")}
                fullWidth
              >
                <MenuItem value="Active">Active</MenuItem>
                <MenuItem value="Inactive">Inactive</MenuItem>
              </TextField>
            </Stack>

            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                select
                label="Carry Forward"
                value={formValues.carryForward}
                onChange={handleFormChange("carryForward")}
                fullWidth
              >
                <MenuItem value="No">No</MenuItem>
                <MenuItem value="Yes">Yes</MenuItem>
                <MenuItem value="Yes (10.0d)">Yes (10.0d)</MenuItem>
              </TextField>
              <TextField
                select
                label="Doc Required"
                value={formValues.docRequired}
                onChange={handleFormChange("docRequired")}
                fullWidth
              >
                <MenuItem value="No">No</MenuItem>
                <MenuItem value=">0d">&gt;0d</MenuItem>
                <MenuItem value=">2d">&gt;2d</MenuItem>
              </TextField>
            </Stack>

            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                select
                label="Paid"
                value={formValues.paid}
                onChange={handleFormChange("paid")}
                fullWidth
              >
                <MenuItem value="Yes">Yes</MenuItem>
                <MenuItem value="No">No</MenuItem>
              </TextField>
              <TextField
                select
                label="Half Day"
                value={formValues.halfDay}
                onChange={handleFormChange("halfDay")}
                fullWidth
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
              >
                <MenuItem value="Yes">Yes</MenuItem>
                <MenuItem value="No">No</MenuItem>
              </TextField>
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={closeDialog} sx={{ textTransform: "none" }}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            variant="contained"
            sx={{
              textTransform: "none",
              bgcolor: "#58c2ac",
              "&:hover": { bgcolor: "#45b39c" },
            }}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
