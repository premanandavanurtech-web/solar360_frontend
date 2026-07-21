import React, { useCallback, useEffect, useState } from "react";
import { Alert, Box, CircularProgress, Paper, Table, TableBody, TableCell, TableHead, TableRow, Typography } from "@mui/material";
import { useAuth } from "../contexts/AuthContext";

export default function WorkRegister() {
  const { fetchAPI } = useAuth();
  const [rows, setRows] = useState([]); const [loading, setLoading] = useState(true); const [error, setError] = useState("");
  const load = useCallback(async () => { setLoading(true); try { const response = await fetchAPI("/installer-worksheets/work-register"); setRows(response?.result || []); } catch (err) { setError(err.message || "Unable to load work register"); } finally { setLoading(false); } }, [fetchAPI]);
  useEffect(() => { load(); }, [load]);
  return <Box sx={{ p: { xs: 2, md: 4 } }}><Typography variant="h4" sx={{ mb: 1, fontWeight: 700 }}>Installer Work Register</Typography><Typography color="text.secondary" sx={{ mb: 3 }}>Approved daily worksheets registered by the reporting manager.</Typography>{error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}<Paper sx={{ overflow: "auto" }}>{loading ? <Box sx={{ p: 5, textAlign: "center" }}><CircularProgress /></Box> : <Table size="small"><TableHead><TableRow><TableCell>Date</TableCell><TableCell>Installer</TableCell><TableCell>Projects</TableCell><TableCell>Daily Report</TableCell><TableCell>Approved By</TableCell></TableRow></TableHead><TableBody>{rows.map(row => <TableRow key={row._id}><TableCell>{row.workDate ? new Date(row.workDate).toLocaleDateString("en-IN") : "-"}</TableCell><TableCell>{[row.user?.firstName, row.user?.lastName].filter(Boolean).join(" ") || "-"}</TableCell><TableCell>{row.projects?.length || 0}</TableCell><TableCell sx={{ whiteSpace: "pre-wrap", minWidth: 280 }}>{row.dailyReport || "-"}</TableCell><TableCell>{[row.approvedBy?.firstName, row.approvedBy?.lastName].filter(Boolean).join(" ") || "-"}</TableCell></TableRow>)}{!rows.length && <TableRow><TableCell colSpan={5} align="center">No approved worksheets found.</TableCell></TableRow>}</TableBody></Table>}</Paper></Box>;
}
