import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  alpha,
  Avatar,
  Box,
  Button,
  Chip,
  IconButton,
  InputAdornment,
  Menu,
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
  AccessTime,
  CalendarToday,
  CheckCircleOutline,
  DeleteOutline,
  DescriptionOutlined,
  DownloadOutlined,
  EditOutlined,
  MoreVert,
  OpenInNew,
  PlaceOutlined,
  RequestQuote,
  Search,
  SendOutlined,
} from "@mui/icons-material";
import {
  deleteQuotation,
  loadQuotationLibrary,
  setCurrentQuotation,
  updateQuotationStatus,
} from "../utils/quotationStorage";

const SURFACE = "#f6f8fc";
const PAPER = "#ffffff";
const BORDER = "#e6ebf4";
const TEXT = "#14213d";
const TEXT_SUB = "#5c6b85";
const TEXT_MUTED = "#91a0b8";
const NAVY = "#23314f";
const NAVY_SOFT = "#eef3ff";
const BLUE = "#3b82f6";
const GREEN = "#22a06b";
const ORANGE = "#f59e0b";
const RED = "#ef4444";
const SLATE = "#64748b";

const STATUS_META = {
  draft: { label: "Draft", color: SLATE, soft: alpha(SLATE, 0.1) },
  sent: { label: "Sent", color: BLUE, soft: alpha(BLUE, 0.1) },
  negotiation: { label: "Negotiation", color: "#7c3aed", soft: alpha("#7c3aed", 0.1) },
  accepted: { label: "Accepted", color: GREEN, soft: alpha(GREEN, 0.12) },
  rejected: { label: "Rejected", color: RED, soft: alpha(RED, 0.1) },
  expired: { label: "Expired", color: ORANGE, soft: alpha(ORANGE, 0.12) },
};

const PIPELINE_ORDER = ["all", "draft", "sent", "negotiation", "accepted", "rejected", "expired"];

const formatCurrency = (value) => {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "₹0";
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(1)}Cr`;
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
  if (amount >= 1000) return `₹${Math.round(amount / 1000)}K`;
  return `₹${Math.round(amount).toLocaleString("en-IN")}`;
};

const formatDate = (value) => {
  const parsed = value ? new Date(value) : null;
  if (!parsed || Number.isNaN(parsed.getTime())) return "—";
  return parsed.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const getValidityEndDate = (quotation) => {
  const baseDate = new Date(quotation?.createdAt || quotation?.savedAt || Date.now());
  if (Number.isNaN(baseDate.getTime())) return null;
  const nextDate = new Date(baseDate);
  nextDate.setDate(nextDate.getDate() + Number(quotation?.validityDays || 14));
  return nextDate;
};

const getResolvedStatus = (quotation) => {
  const rawStatus = String(quotation?.status || "draft").toLowerCase();
  if (rawStatus === "accepted" || rawStatus === "rejected" || rawStatus === "negotiation") return rawStatus;
  const validityEnd = getValidityEndDate(quotation);
  if (rawStatus !== "accepted" && rawStatus !== "rejected" && validityEnd && validityEnd < new Date()) {
    return "expired";
  }
  if (rawStatus === "sent") return "sent";
  return "draft";
};

const getCustomerName = (quotation) =>
  quotation?.leadName ||
  quotation?.quotationTitle ||
  quotation?.lead?.customerName ||
  quotation?.lead?.name ||
  [quotation?.lead?.firstName, quotation?.lead?.lastName].filter(Boolean).join(" ").trim() ||
  "Customer";

const getCustomerPhone = (quotation) =>
  quotation?.lead?.phone || quotation?.lead?.mobile || quotation?.lead?.whatsappNumber || "";

const getCustomerLocation = (quotation) =>
  [quotation?.lead?.city, quotation?.lead?.state].filter(Boolean).join(", ");

const getCustomerType = (quotation) => quotation?.form?.customerType || "Residential";

const getPanelBrand = (quotation) => quotation?.form?.panelBrand || "Solar";

const getQuoteValue = (quotation) => Number(quotation?.totalCost || quotation?.form?.totalCost || 0);

const getQuoteSizeLabel = (quotation) => `${Number(quotation?.systemSize || 0).toFixed(1)} kW`;

const getInitials = (name) =>
  String(name || "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "QT";

const getQuarterStart = () => {
  const now = new Date();
  const quarterMonth = Math.floor(now.getMonth() / 3) * 3;
  return new Date(now.getFullYear(), quarterMonth, 1);
};

const createCsvData = (rows) => {
  const headers = ["Quote", "Customer", "Phone", "Location", "Status", "Valid Until", "Value"];
  const lines = rows.map((quotation) => [
    quotation.quotationNumber || "",
    getCustomerName(quotation),
    getCustomerPhone(quotation),
    getCustomerLocation(quotation),
    STATUS_META[getResolvedStatus(quotation)]?.label || "Draft",
    formatDate(getValidityEndDate(quotation)),
    getQuoteValue(quotation),
  ]);

  return [headers, ...lines]
    .map((row) => row.map((value) => `"${String(value ?? "").replace(/"/g, "\"\"")}"`).join(","))
    .join("\n");
};

const StatCard = ({ icon, value, label, note, color }) => (
  <Paper
    elevation={0}
    sx={{
      p: 2.25,
      borderRadius: 2.5,
      border: `1px solid ${BORDER}`,
      bgcolor: PAPER,
      minHeight: 118,
    }}
  >
    <Stack direction="row" spacing={1.5} alignItems="flex-start">
      <Box
        sx={{
          width: 42,
          height: 42,
          borderRadius: 2,
          bgcolor: alpha(color, 0.1),
          color,
          display: "grid",
          placeItems: "center",
          flexShrink: 0,
        }}
      >
        {icon}
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography sx={{ fontSize: "1.7rem", lineHeight: 1, fontWeight: 800, color: TEXT }}>
          {value}
        </Typography>
        <Typography sx={{ mt: 0.55, fontSize: "0.8rem", fontWeight: 700, color: TEXT }}>
          {label}
        </Typography>
        <Typography sx={{ mt: 1, fontSize: "0.72rem", color: TEXT_MUTED, lineHeight: 1.45 }}>
          {note}
        </Typography>
      </Box>
    </Stack>
  </Paper>
);

export default function AllQuotes() {
  const navigate = useNavigate();
  const [quotations, setQuotations] = useState([]);
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [activeQuote, setActiveQuote] = useState(null);

  const refreshQuotations = useCallback(() => {
    setQuotations(loadQuotationLibrary());
  }, []);

  useEffect(() => {
    refreshQuotations();
  }, [refreshQuotations]);

  useEffect(() => {
    const handleFocus = () => refreshQuotations();
    const handleStorage = (event) => {
      if (!event.key || event.key === "solar-crm-quotations") {
        refreshQuotations();
      }
    };

    window.addEventListener("focus", handleFocus);
    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("storage", handleStorage);
    };
  }, [refreshQuotations]);

  const normalizedQuotations = useMemo(
    () =>
      [...quotations]
        .map((quotation) => ({
          ...quotation,
          resolvedStatus: getResolvedStatus(quotation),
          validityEnd: getValidityEndDate(quotation),
          customerName: getCustomerName(quotation),
          customerPhone: getCustomerPhone(quotation),
          customerLocation: getCustomerLocation(quotation),
          totalValue: getQuoteValue(quotation),
        }))
        .sort((leftQuote, rightQuote) => new Date(rightQuote.savedAt || 0) - new Date(leftQuote.savedAt || 0)),
    [quotations],
  );

  const summary = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekEnd = new Date(todayStart);
    weekEnd.setDate(weekEnd.getDate() + 7);
    const quarterStart = getQuarterStart();

    const totalValue = normalizedQuotations.reduce((sum, quotation) => sum + quotation.totalValue, 0);
    const activeCount = normalizedQuotations.filter((quotation) => !["rejected", "expired"].includes(quotation.resolvedStatus)).length;
    const draftCount = normalizedQuotations.filter((quotation) => quotation.resolvedStatus === "draft").length;
    const sentToday = normalizedQuotations.filter((quotation) => {
      const sentAt = quotation.sentAt ? new Date(quotation.sentAt) : null;
      return quotation.resolvedStatus === "sent" && sentAt && !Number.isNaN(sentAt.getTime()) && sentAt >= todayStart;
    }).length;
    const expiringThisWeek = normalizedQuotations.filter((quotation) => (
      quotation.validityEnd &&
      quotation.validityEnd >= todayStart &&
      quotation.validityEnd <= weekEnd &&
      !["accepted", "rejected", "expired"].includes(quotation.resolvedStatus)
    )).length;
    const readyToConvert = normalizedQuotations.filter((quotation) => quotation.resolvedStatus === "accepted").length;
    const acceptedThisQuarter = normalizedQuotations.filter((quotation) => {
      const acceptedAt = quotation.acceptedAt ? new Date(quotation.acceptedAt) : null;
      return quotation.resolvedStatus === "accepted" && acceptedAt && !Number.isNaN(acceptedAt.getTime()) && acceptedAt >= quarterStart;
    }).length;

    return {
      totalValue,
      activeCount,
      draftCount,
      sentToday,
      expiringThisWeek,
      readyToConvert,
      acceptedThisQuarter,
    };
  }, [normalizedQuotations]);

  const pipelineCounts = useMemo(() => {
    const counts = {
      all: normalizedQuotations.length,
      draft: 0,
      sent: 0,
      negotiation: 0,
      accepted: 0,
      rejected: 0,
      expired: 0,
    };

    normalizedQuotations.forEach((quotation) => {
      counts[quotation.resolvedStatus] += 1;
    });

    return counts;
  }, [normalizedQuotations]);

  const filteredQuotations = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return normalizedQuotations.filter((quotation) => {
      const matchesStatus = selectedStatus === "all" || quotation.resolvedStatus === selectedStatus;
      if (!matchesStatus) return false;
      if (!query) return true;

      const haystack = [
        quotation.quotationNumber,
        quotation.customerName,
        quotation.customerPhone,
        quotation.customerLocation,
        quotation.quotationTitle,
        quotation.lead?.email,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [normalizedQuotations, searchTerm, selectedStatus]);

  const paginatedQuotations = useMemo(() => {
    const startIndex = page * rowsPerPage;
    return filteredQuotations.slice(startIndex, startIndex + rowsPerPage);
  }, [filteredQuotations, page, rowsPerPage]);

  useEffect(() => {
    setPage(0);
  }, [searchTerm, selectedStatus]);

  const handlePreview = useCallback((quotation, extraState = {}) => {
    if (!quotation) return;
    setCurrentQuotation(quotation);
    navigate(`/quotation?quoteId=${quotation.id}`, {
      state: {
        quotationId: quotation.id,
        quotationData: quotation,
        ...extraState,
      },
    });
  }, [navigate]);

  const handleEdit = useCallback((quotation) => {
    if (!quotation) return;
    navigate("/quotation/edit", {
      state: {
        mode: "edit",
        lead: quotation.lead,
        quotationTitle: quotation.quotationTitle,
        quotationData: quotation,
      },
    });
  }, [navigate]);

  const handleStatusChange = useCallback((quotationId, status) => {
    setQuotations(updateQuotationStatus(quotationId, status));
    setMenuAnchor(null);
    setActiveQuote(null);
  }, []);

  const handleDelete = useCallback((quotationId) => {
    if (!window.confirm("Delete this quotation?")) return;
    setQuotations(deleteQuotation(quotationId));
    setMenuAnchor(null);
    setActiveQuote(null);
  }, []);

  const handleExport = useCallback(() => {
    const csvData = createCsvData(filteredQuotations);
    const blob = new Blob([csvData], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `quotes-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [filteredQuotations]);

  const openLeadDetails = useCallback((quotation) => {
    if (!quotation?.leadId) return;
    navigate(`/all-leads/${quotation.leadId}`, {
      state: {
        lead: quotation.lead,
        initialTab: "quotations",
      },
    });
  }, [navigate]);

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: SURFACE, p: { xs: 2, md: 3 } }}>
      <Stack spacing={2.5}>
        <Box>
          <Typography sx={{ fontSize: "0.72rem", fontWeight: 800, color: TEXT_MUTED, letterSpacing: "0.14em", textTransform: "uppercase" }}>
            Sales · Pipeline
          </Typography>
          <Typography sx={{ mt: 0.6, fontSize: { xs: "1.75rem", md: "2rem" }, fontWeight: 800, color: TEXT }}>
            Quotes
          </Typography>
          <Typography sx={{ mt: 0.6, fontSize: "0.82rem", color: TEXT_SUB }}>
            {`${summary.activeCount} active • ${formatCurrency(summary.totalValue)} in flight • ${summary.acceptedThisQuarter} accepted this quarter`}
          </Typography>
        </Box>

        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))", xl: "repeat(4, minmax(0, 1fr))" }, gap: 2 }}>
          <StatCard
            icon={<DescriptionOutlined sx={{ fontSize: 18 }} />}
            value={summary.draftCount}
            label="Drafts pending review"
            note="Drafts idle > 2 days can be followed up first."
            color={SLATE}
          />
          <StatCard
            icon={<SendOutlined sx={{ fontSize: 18 }} />}
            value={summary.sentToday}
            label="Sent today"
            note="Sent today • awaiting customer response."
            color={BLUE}
          />
          <StatCard
            icon={<AccessTime sx={{ fontSize: 18 }} />}
            value={summary.expiringThisWeek}
            label="Expiring this week"
            note="Quotes near validity end should be revisited."
            color={ORANGE}
          />
          <StatCard
            icon={<CheckCircleOutline sx={{ fontSize: 18 }} />}
            value={summary.readyToConvert}
            label="Ready to convert"
            note="Accepted quotes can now be moved into projects."
            color={GREEN}
          />
        </Box>

        <Paper elevation={0} sx={{ borderRadius: 3, border: `1px solid ${BORDER}`, bgcolor: PAPER, overflow: "hidden" }}>
          <Box sx={{ p: 1.75, borderBottom: `1px solid ${BORDER}` }}>
            <Typography sx={{ fontSize: "0.72rem", fontWeight: 800, color: TEXT_MUTED, letterSpacing: "0.14em", textTransform: "uppercase" }}>
              Quote Pipeline
            </Typography>
          </Box>
          <Box sx={{ p: 1.5, overflowX: "auto" }}>
            <Stack direction="row" spacing={1.25} sx={{ minWidth: 1120 }}>
              {PIPELINE_ORDER.map((statusKey) => {
                const active = selectedStatus === statusKey;
                const meta = statusKey === "all"
                  ? { label: "All Quotes", color: NAVY, soft: NAVY_SOFT }
                  : STATUS_META[statusKey];

                return (
                  <Paper
                    key={statusKey}
                    elevation={0}
                    onClick={() => setSelectedStatus(statusKey)}
                    sx={{
                      width: statusKey === "all" ? 170 : 180,
                      p: 1.4,
                      borderRadius: 2.2,
                      border: `1px solid ${active ? alpha(meta.color, 0.45) : BORDER}`,
                      bgcolor: active ? meta.soft : "#fbfcfe",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                    }}
                  >
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                      <Box>
                        <Typography sx={{ fontSize: statusKey === "all" ? "1.8rem" : "1.45rem", fontWeight: 800, lineHeight: 1, color: active ? meta.color : TEXT }}>
                          {pipelineCounts[statusKey]}
                        </Typography>
                        <Typography sx={{ mt: 0.55, fontSize: "0.74rem", fontWeight: 700, color: active ? meta.color : TEXT_SUB, lineHeight: 1.2 }}>
                          {meta.label}
                        </Typography>
                      </Box>
                      <Box sx={{ width: 9, height: 9, borderRadius: "50%", border: `1px solid ${alpha(meta.color, 0.6)}` }} />
                    </Stack>
                  </Paper>
                );
              })}
            </Stack>
          </Box>
        </Paper>

        <Paper elevation={0} sx={{ borderRadius: 3, border: `1px solid ${BORDER}`, bgcolor: PAPER, overflow: "hidden" }}>
          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={1.5}
            justifyContent="space-between"
            alignItems={{ xs: "stretch", md: "center" }}
            sx={{ p: 2.25, borderBottom: `1px solid ${BORDER}` }}
          >
            <TextField
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search by quote ID, customer name, phone..."
              size="small"
              sx={{
                width: { xs: "100%", md: 420 },
                "& .MuiOutlinedInput-root": {
                  borderRadius: 2,
                  bgcolor: "#fff",
                  "& fieldset": { borderColor: BORDER },
                },
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search sx={{ fontSize: 18, color: TEXT_MUTED }} />
                  </InputAdornment>
                ),
              }}
            />

            <Stack direction="row" spacing={1} justifyContent="flex-end">
              <Button
                variant="outlined"
                startIcon={<DownloadOutlined sx={{ fontSize: 16 }} />}
                onClick={handleExport}
                sx={{
                  borderRadius: 2,
                  borderColor: alpha(GREEN, 0.45),
                  color: GREEN,
                  fontWeight: 700,
                  "&:hover": { borderColor: GREEN, bgcolor: alpha(GREEN, 0.06) },
                }}
              >
                Export
              </Button>
              <Button
                variant="contained"
                startIcon={<RequestQuote sx={{ fontSize: 16 }} />}
                onClick={() => navigate("/quotation/create", { state: { mode: "create", quotationTitle: "Quotation" } })}
                sx={{
                  borderRadius: 2,
                  bgcolor: NAVY,
                  color: "#fff",
                  boxShadow: "none",
                  "&:hover": { bgcolor: "#16213a", boxShadow: "none" },
                }}
              >
                Create Quote
              </Button>
            </Stack>
          </Stack>

          {filteredQuotations.length ? (
            <>
              <TableContainer>
                <Table sx={{ minWidth: 1120 }}>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ width: 42, borderBottomColor: BORDER }} />
                      <TableCell sx={{ borderBottomColor: BORDER, color: TEXT_MUTED, fontWeight: 800, fontSize: "0.68rem", textTransform: "uppercase" }}>
                        Quote
                      </TableCell>
                      <TableCell sx={{ borderBottomColor: BORDER, color: TEXT_MUTED, fontWeight: 800, fontSize: "0.68rem", textTransform: "uppercase" }}>
                        Customer · Site
                      </TableCell>
                      <TableCell sx={{ borderBottomColor: BORDER, color: TEXT_MUTED, fontWeight: 800, fontSize: "0.68rem", textTransform: "uppercase" }}>
                        Status
                      </TableCell>
                      <TableCell sx={{ borderBottomColor: BORDER, color: TEXT_MUTED, fontWeight: 800, fontSize: "0.68rem", textTransform: "uppercase" }}>
                        Validity
                      </TableCell>
                      <TableCell sx={{ borderBottomColor: BORDER, color: TEXT_MUTED, fontWeight: 800, fontSize: "0.68rem", textTransform: "uppercase" }}>
                        Value
                      </TableCell>
                      <TableCell align="right" sx={{ borderBottomColor: BORDER, color: TEXT_MUTED, fontWeight: 800, fontSize: "0.68rem", textTransform: "uppercase" }}>
                        Actions
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {paginatedQuotations.map((quotation) => {
                      const statusMeta = STATUS_META[quotation.resolvedStatus] || STATUS_META.draft;

                      return (
                        <TableRow key={quotation.id} hover>
                          <TableCell sx={{ borderBottomColor: BORDER }}>
                            <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: statusMeta.color }} />
                          </TableCell>
                          <TableCell sx={{ borderBottomColor: BORDER }}>
                            <Typography sx={{ fontSize: "0.84rem", fontWeight: 800, color: TEXT }}>
                              {quotation.quotationNumber || "Quote"}
                            </Typography>
                            <Stack direction="row" spacing={0.7} alignItems="center" sx={{ mt: 0.4, flexWrap: "wrap" }} useFlexGap>
                              <Typography
                                sx={{ fontSize: "0.72rem", fontWeight: 700, color: BLUE, cursor: "pointer" }}
                                onClick={() => handlePreview(quotation)}
                              >
                                {getQuoteSizeLabel(quotation)}
                              </Typography>
                              <Typography sx={{ fontSize: "0.68rem", color: TEXT_MUTED }}>
                                {`${getCustomerType(quotation)} · ${getPanelBrand(quotation)}`}
                              </Typography>
                            </Stack>
                          </TableCell>

                          <TableCell sx={{ borderBottomColor: BORDER }}>
                            <Stack direction="row" spacing={1.1} alignItems="center">
                              <Avatar sx={{ width: 26, height: 26, bgcolor: alpha(statusMeta.color, 0.16), color: statusMeta.color, fontSize: "0.7rem", fontWeight: 800 }}>
                                {getInitials(quotation.customerName)}
                              </Avatar>
                              <Box>
                                <Typography sx={{ fontSize: "0.8rem", fontWeight: 700, color: TEXT, cursor: quotation.leadId ? "pointer" : "default" }} onClick={() => openLeadDetails(quotation)}>
                                  {quotation.customerName}
                                </Typography>
                                <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 0.2 }}>
                                  <PlaceOutlined sx={{ fontSize: 13, color: TEXT_MUTED }} />
                                  <Typography sx={{ fontSize: "0.7rem", color: TEXT_MUTED }}>
                                    {quotation.customerLocation || "Location unavailable"}
                                  </Typography>
                                </Stack>
                              </Box>
                            </Stack>
                          </TableCell>

                          <TableCell sx={{ borderBottomColor: BORDER }}>
                            <Chip
                              size="small"
                              label={statusMeta.label}
                              sx={{
                                height: 22,
                                borderRadius: 999,
                                bgcolor: statusMeta.soft,
                                color: statusMeta.color,
                                fontWeight: 800,
                                fontSize: "0.68rem",
                              }}
                            />
                          </TableCell>

                          <TableCell sx={{ borderBottomColor: BORDER }}>
                            <Typography sx={{ fontSize: "0.8rem", fontWeight: 700, color: TEXT }}>
                              {formatDate(quotation.validityEnd)}
                            </Typography>
                            <Stack direction="row" spacing={0.55} alignItems="center" sx={{ mt: 0.35 }}>
                              <CalendarToday sx={{ fontSize: 12, color: TEXT_MUTED }} />
                              <Typography sx={{ fontSize: "0.68rem", color: quotation.resolvedStatus === "expired" ? RED : TEXT_MUTED }}>
                                {quotation.resolvedStatus === "expired" ? "Expired" : formatDate(quotation.createdAt)}
                              </Typography>
                            </Stack>
                          </TableCell>

                          <TableCell sx={{ borderBottomColor: BORDER }}>
                            <Typography sx={{ fontSize: "0.84rem", fontWeight: 800, color: TEXT }}>
                              {formatCurrency(quotation.totalValue)}
                            </Typography>
                            <Typography sx={{ mt: 0.3, fontSize: "0.68rem", color: TEXT_MUTED }}>
                              {quotation.form?.subsidyAmount ? `−${formatCurrency(quotation.form.subsidyAmount)} subsidy` : "No subsidy"}
                            </Typography>
                          </TableCell>

                          <TableCell align="right" sx={{ borderBottomColor: BORDER }}>
                            <IconButton
                              size="small"
                              onClick={(event) => {
                                setMenuAnchor(event.currentTarget);
                                setActiveQuote(quotation);
                              }}
                              sx={{ color: TEXT_MUTED }}
                            >
                              <MoreVert sx={{ fontSize: 18 }} />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>

              <Stack
                direction={{ xs: "column", md: "row" }}
                spacing={1.25}
                justifyContent="space-between"
                alignItems={{ xs: "flex-start", md: "center" }}
                sx={{ px: 2.25, py: 1.5, borderTop: `1px solid ${BORDER}` }}
              >
                <Typography sx={{ fontSize: "0.72rem", color: TEXT_MUTED }}>
                  {`Showing ${filteredQuotations.length ? page * rowsPerPage + 1 : 0}-${Math.min((page + 1) * rowsPerPage, filteredQuotations.length)} of ${filteredQuotations.length} quotes`}
                </Typography>
                <Stack direction="row" spacing={1} alignItems="center">
                  <TextField
                    select
                    size="small"
                    value={rowsPerPage}
                    onChange={(event) => {
                      setRowsPerPage(Number(event.target.value));
                      setPage(0);
                    }}
                    sx={{ width: 96, "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
                  >
                    {[5, 10, 25].map((option) => (
                      <MenuItem key={option} value={option}>{`${option} / page`}</MenuItem>
                    ))}
                  </TextField>
                  <Button
                    variant="outlined"
                    size="small"
                    disabled={page === 0}
                    onClick={() => setPage((prev) => Math.max(prev - 1, 0))}
                    sx={{ borderRadius: 2, minWidth: 86 }}
                  >
                    Previous
                  </Button>
                  <Chip
                    label={page + 1}
                    sx={{ bgcolor: alpha(BLUE, 0.12), color: BLUE, fontWeight: 800, minWidth: 34 }}
                  />
                  <Button
                    variant="outlined"
                    size="small"
                    disabled={(page + 1) * rowsPerPage >= filteredQuotations.length}
                    onClick={() => setPage((prev) => prev + 1)}
                    sx={{ borderRadius: 2, minWidth: 74 }}
                  >
                    Next
                  </Button>
                </Stack>
              </Stack>
            </>
          ) : (
            <Box sx={{ py: 9, px: 3, textAlign: "center" }}>
              <Box
                sx={{
                  width: 72,
                  height: 72,
                  borderRadius: 3,
                  bgcolor: alpha(NAVY, 0.05),
                  color: alpha(NAVY, 0.4),
                  display: "grid",
                  placeItems: "center",
                  mx: "auto",
                  mb: 2,
                }}
              >
                <RequestQuote sx={{ fontSize: 32 }} />
              </Box>
              <Typography sx={{ fontSize: "1.15rem", fontWeight: 800, color: TEXT }}>
                No quotes found
              </Typography>
              <Typography sx={{ mt: 0.75, fontSize: "0.84rem", color: TEXT_SUB }}>
                Create a quotation or widen your filters to see more results.
              </Typography>
            </Box>
          )}
        </Paper>
      </Stack>

      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={() => {
          setMenuAnchor(null);
          setActiveQuote(null);
        }}
        PaperProps={{ sx: { borderRadius: 2.5, minWidth: 190, border: `1px solid ${BORDER}` } }}
      >
        <MenuItem onClick={() => handlePreview(activeQuote)}>
          <OpenInNew sx={{ fontSize: 17, mr: 1, color: NAVY }} />
          Open quote
        </MenuItem>
        <MenuItem onClick={() => handleEdit(activeQuote)}>
          <EditOutlined sx={{ fontSize: 17, mr: 1, color: NAVY }} />
          Edit quote
        </MenuItem>
        <MenuItem onClick={() => handleStatusChange(activeQuote?.id, "sent")}>
          <SendOutlined sx={{ fontSize: 17, mr: 1, color: BLUE }} />
          Mark sent
        </MenuItem>
        <MenuItem onClick={() => handleStatusChange(activeQuote?.id, "accepted")}>
          <CheckCircleOutline sx={{ fontSize: 17, mr: 1, color: GREEN }} />
          Mark accepted
        </MenuItem>
        <MenuItem onClick={() => handleDelete(activeQuote?.id)} sx={{ color: RED }}>
          <DeleteOutline sx={{ fontSize: 17, mr: 1 }} />
          Delete
        </MenuItem>
      </Menu>
    </Box>
  );
}
