import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import PictureAsPdfRounded from "@mui/icons-material/PictureAsPdfRounded";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { useAuth } from "../contexts/AuthContext";

const text = (value, fallback = "-") => {
  if (value === undefined || value === null || value === "") return fallback;
  return String(value);
};

const personName = (person) =>
  [person?.firstName, person?.lastName].filter(Boolean).join(" ").trim() ||
  person?.email ||
  "-";

const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-IN");
};

const teamNames = (members = []) =>
  Array.isArray(members) && members.length
    ? members.map(personName).filter((name) => name && name !== "-").join(", ") || "-"
    : "-";

const uniqueTeamNames = (members = []) => {
  const names = Array.isArray(members)
    ? members.map(personName).filter((name) => name && name !== "-")
    : [];
  return [...new Set(names)].join(", ") || "-";
};

const projectRows = (projects = []) =>
  projects.map((project, index) => [
    index + 1,
    text(project.projectType),
    text(project.consumerName || project.siteLocation),
    text(project.consumerAccountNo),
    text(project.capacityKw ? `${project.capacityKw} KW` : ""),
    text(project.installationDay ? `${project.installationDay} Days` : ""),
    personName(project.supervisor),
    teamNames(project.teammates),
    text(project.address || project.siteLocation || project.gpsLocation?.address),
    text(project.report),
  ]);

const downloadWorkRegisterPdf = (row) => {
  const installer = personName(row.user);
  const workDate = formatDate(row.workDate);
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("Installer Work Register", 40, 40);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Date: ${workDate}`, 40, 62);
  doc.text(`Installer: ${installer}`, 180, 62);
  doc.text(`Projects: ${row.projects?.length || 0}`, 420, 62);
  doc.text(`Approved By: ${personName(row.approvedBy)}`, 540, 62);

  autoTable(doc, {
    startY: 86,
    head: [["#", "Type", "Consumer", "A/C No.", "Capacity", "Install Day", "Supervisor", "Team Members", "Location", "Report"]],
    body: projectRows(row.projects),
    styles: { fontSize: 8, cellPadding: 4, overflow: "linebreak" },
    headStyles: { fillColor: [18, 32, 75] },
    columnStyles: {
      0: { cellWidth: 24 },
      1: { cellWidth: 78 },
      2: { cellWidth: 95 },
      3: { cellWidth: 72 },
      4: { cellWidth: 64 },
      5: { cellWidth: 64 },
      6: { cellWidth: 80 },
      7: { cellWidth: 95 },
      8: { cellWidth: 155 },
      9: { cellWidth: 130 },
    },
  });

  const finalY = doc.lastAutoTable?.finalY || 100;
  doc.setFont("helvetica", "bold");
  doc.text("Daily Report", 40, finalY + 28);
  doc.setFont("helvetica", "normal");
  doc.text(doc.splitTextToSize(text(row.dailyReport), 760), 40, finalY + 46);

  const safeInstaller = installer.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "installer";
  doc.save(`installer-work-register-${safeInstaller}-${workDate.replace(/\//g, "-")}.pdf`);
};

export default function WorkRegister() {
  const { fetchAPI } = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetchAPI("/installer-worksheets/work-register");
      setRows(response?.result || []);
    } catch (err) {
      setError(err.message || "Unable to load work register");
    } finally {
      setLoading(false);
    }
  }, [fetchAPI]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      <Typography variant="h4" sx={{ mb: 1, fontWeight: 700 }}>
        Installer Work Register
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Approved daily worksheets registered by the reporting manager.
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Paper sx={{ overflow: "auto" }}>
        {loading ? (
          <Box sx={{ p: 5, textAlign: "center" }}><CircularProgress /></Box>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Installer</TableCell>
                <TableCell>Projects</TableCell>
                <TableCell>Supervisor</TableCell>
                <TableCell>Team Members</TableCell>
                <TableCell>Daily Report</TableCell>
                <TableCell>Approved By</TableCell>
                <TableCell align="right">PDF</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row._id}>
                  <TableCell>{formatDate(row.workDate)}</TableCell>
                  <TableCell>{personName(row.user)}</TableCell>
                  <TableCell>{row.projects?.length || 0}</TableCell>
                  <TableCell>{uniqueTeamNames((row.projects || []).map((project) => project.supervisor))}</TableCell>
                  <TableCell>{uniqueTeamNames((row.projects || []).flatMap((project) => project.teammates || []))}</TableCell>
                  <TableCell sx={{ whiteSpace: "pre-wrap", minWidth: 280 }}>{row.dailyReport || "-"}</TableCell>
                  <TableCell>{personName(row.approvedBy)}</TableCell>
                  <TableCell align="right">
                    <Stack direction="row" justifyContent="flex-end">
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<PictureAsPdfRounded />}
                        onClick={() => downloadWorkRegisterPdf(row)}
                      >
                        Download
                      </Button>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
              {!rows.length && (
                <TableRow>
                  <TableCell colSpan={8} align="center">No approved worksheets found.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </Paper>
    </Box>
  );
}