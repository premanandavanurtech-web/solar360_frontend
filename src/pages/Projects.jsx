import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  alpha,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Grid,
  IconButton,
  InputAdornment,
  LinearProgress,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Paper,
  Popover,
  Select,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  AssignmentTurnedIn,
  Bolt,
  CalendarMonth,
  Call,
  CloudUpload,
  Description,
  DescriptionOutlined,
  DirectionsCar,
  Edit,
  ElectricBolt,
  FactCheck,
  FilterAlt,
  FilterAltOff,
  Handshake,
  MoreVert,
  OpenInNew,
  Receipt,
  Refresh,
  Search,
  SolarPower,
  TableChart,
  TaskAlt,
  TrendingUp,
  ViewKanban,
  Visibility,
  Workspaces,
} from "@mui/icons-material";
import { format, isThisWeek, parseISO } from "date-fns";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { getProjectStage } from "../utils/projectStage";

// ── Design tokens ──────────────────────────────────────────────
const NAVY     = "#1e3a5f";
const NAVY_MID = "#1a3360";
const NAVY_LT  = "#243b6b";
const AMBER    = "#f59e0b";
const AMBER_LT = "#fcd34d";
const EMERALD  = "#059669";
const BLUE     = "#2563eb";
const RED      = "#ef4444";
const SURFACE  = "#f8fafd";
const BORDER   = "#e4eaf5";

// ── Stage config (now with icons) ───────────────────────────────
const PROJECT_STAGES = [
  { key: "lead_converted", label: "Lead Converted", color: EMERALD,   icon: Workspaces },
  { key: "registration",   label: "Registration",   color: "#8b5cf6", icon: FactCheck },
  { key: "document",       label: "Document",       color: "#06b6d4", icon: DescriptionOutlined },
  { key: "payment",        label: "Payment",        color: "#6366f1", icon: Receipt },
  { key: "loan_pending",   label: "Loan Pending",   color: AMBER,     icon: CalendarMonth },
  { key: "installation",   label: "Installation",   color: "#0ea5e9", icon: Bolt },
  { key: "disbursement",   label: "Disbursement",   color: "#f97316", icon: TrendingUp },
];

const NEXT_ACTIONS = {
  lead_converted: "Lead converted to project",
  registration: "Registration completed or in progress",
  document:     "Document review or submission in progress",
  payment:      "Payment process started",
  loan_pending: "Loan approval or pending bank action",
  installation: "Installation work is in progress",
  disbursement: "Disbursement stage is active",
};

const PROJECT_STAGE_ROUTES = {
  lead_converted: "/all-leads",
  registration: "/registration",
  document: "/document-submission",
  payment: "/bank-loan-apply",
  loan_pending: "/bank-at-pending",
  installation: "/installation-completion",
  disbursement: "/disbursement",
};

const AMOUNT_RANGES = [
  { key: "all",      label: "Any amount", test: () => true },
  { key: "lt2",      label: "Below ₹2L",   test: (v) => v < 200000 },
  { key: "2to5",     label: "₹2L – ₹5L",   test: (v) => v >= 200000 && v < 500000 },
  { key: "5to10",    label: "₹5L – ₹10L",  test: (v) => v >= 500000 && v < 1000000 },
  { key: "gt10",     label: "Above ₹10L",  test: (v) => v >= 1000000 },
];

const ACTIVITY_FILTERS = [
  { key: "all",    label: "All projects" },
  { key: "stuck",  label: "Stuck 5+ days" },
  { key: "week",   label: "Installing this week" },
];

// ── Helpers ────────────────────────────────────────────────────
const formatCurrency = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency", currency: "INR", maximumFractionDigits: 0,
  }).format(Number(value || 0));

const formatDate = (value, pattern = "dd MMM yyyy") => {
  if (!value) return "Not set";
  try {
    return format(typeof value === "string" ? parseISO(value) : new Date(value), pattern);
  } catch { return "Not set"; }
};

const getProjectAmount = (p) => Number(p.disbursementAmount || p.loanAmount || 0);

const getStageMeta = (key) => PROJECT_STAGES.find((s) => s.key === key) || PROJECT_STAGES[0];
const normalizeProjectStage = (projectOrStage) => {
  const rawStage = typeof projectOrStage === "string" ? projectOrStage : getProjectStage(projectOrStage);
  if (rawStage === "visit") return "lead_converted";
  if (rawStage === "bank_loan") return "payment";
  if (rawStage === "handover") return "disbursement";
  return rawStage;
};
const getInitials   = (p) => `${p.firstName?.[0] || ""}${p.lastName?.[0] || ""}`.toUpperCase() || "P";
const getAssignedPerson = (project) => {
  const person = project.assignedUser || project.assignedManager;
  if (!person) return null;
  return {
    name: [person.firstName, person.lastName].filter(Boolean).join(" ") || "Unknown",
    role: person.role || "",
  };
};
const getRegistrationDateValue = (project) => project.dateOfRegistration || project.createdAt || project.updatedAt;
const getRegistrationStatusMeta = (status) => {
  const value = String(status || "").toLowerCase();
  if (value === "completed") {
    return { label: "Completed", bg: alpha(EMERALD, 0.12), color: EMERALD, icon: <AssignmentTurnedIn sx={{ fontSize: 14 }} /> };
  }
  if (value === "approved") {
    return { label: "Approved", bg: alpha(BLUE, 0.12), color: BLUE, icon: <FactCheck sx={{ fontSize: 14 }} /> };
  }
  if (value === "rejected") {
    return { label: "Rejected", bg: alpha(RED, 0.1), color: RED, icon: <DescriptionOutlined sx={{ fontSize: 14 }} /> };
  }
  if (value === "pending") {
    return { label: "Pending", bg: alpha(AMBER, 0.12), color: "#9a6700", icon: <CalendarMonth sx={{ fontSize: 14 }} /> };
  }
  return { label: "In Progress", bg: alpha(BLUE, 0.12), color: BLUE, icon: <CalendarMonth sx={{ fontSize: 14 }} /> };
};
const getLeadStatusMeta = (status) => {
  const stage = normalizeProjectStage({ status });
  const meta = getStageMeta(stage);
  const LeadIcon = meta.icon;
  return {
    label: status || meta.label,
    bg: alpha(meta.color, 0.12),
    color: meta.color,
    icon: <LeadIcon sx={{ fontSize: 14 }} />,
  };
};
const isStuck = (p) => {
  const ref = p.updatedAt || p.projectConvertedAt || p.createdAt;
  if (!ref) return false;
  return Math.floor((Date.now() - new Date(ref).getTime()) / 86400000) > 5 && getProjectStage(p) !== "handover";
};

const stageIndex = (key) => PROJECT_STAGES.findIndex((s) => s.key === key);

// ── Compact metric card ────────────────────────────────────────
const MetricCard = ({ icon, label, value, note, color, onClick }) => (
  <Card
    onClick={onClick}
    sx={{
      borderRadius: "16px",
      border: `1px solid ${alpha(color, 0.18)}`,
      boxShadow: "none",
      cursor: onClick ? "pointer" : "default",
      transition: "transform 0.15s, box-shadow 0.15s",
      "&:hover": onClick ? { transform: "translateY(-2px)", boxShadow: `0 8px 24px ${alpha(color, 0.14)}` } : {},
      background: "#fff",
    }}
  >
    <CardContent sx={{ p: "20px !important" }}>
      <Stack direction="row" spacing={2} alignItems="flex-start">
        <Box
          sx={{
            width: 44, height: 44, borderRadius: "12px",
            bgcolor: alpha(color, 0.1), color,
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}
        >
          {icon}
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h4" fontWeight={800} color={NAVY} lineHeight={1}>
            {value}
          </Typography>
          <Typography variant="subtitle2" fontWeight={700} color={NAVY} sx={{ mt: 0.25 }}>
            {label}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: "block" }}>
            {note}
          </Typography>
        </Box>
      </Stack>
    </CardContent>
  </Card>
);

// ── Row / card action menu ─────────────────────────────────────
const ActionMenu = ({ project, onOpen, onCall, onEdit, color }) => {
  const [anchor, setAnchor] = useState(null);
  const close = () => setAnchor(null);

  return (
    <>
      <Tooltip title="More actions">
        <IconButton
          size="small"
          onClick={(e) => { e.stopPropagation(); setAnchor(e.currentTarget); }}
          sx={{ color: alpha(NAVY, 0.55), "&:hover": { bgcolor: alpha(NAVY, 0.06), color: NAVY } }}
        >
          <MoreVert sx={{ fontSize: 18 }} />
        </IconButton>
      </Tooltip>
      <Menu
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={close}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        PaperProps={{ sx: { borderRadius: "12px", minWidth: 190, border: `1px solid ${BORDER}`, boxShadow: "0 12px 32px rgba(15,31,61,0.12)" } }}
      >
        <MenuItem onClick={() => { close(); onOpen(project); }} sx={{ fontSize: 13.5, fontWeight: 600, py: 1 }}>
          <ListItemIcon><OpenInNew sx={{ fontSize: 18, color: NAVY_LT }} /></ListItemIcon>
          <ListItemText>Open project</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => { close(); onEdit?.(project); }} sx={{ fontSize: 13.5, fontWeight: 600, py: 1 }}>
          <ListItemIcon><Edit sx={{ fontSize: 18, color: NAVY_LT }} /></ListItemIcon>
          <ListItemText>Edit details</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => { close(); onCall?.(project); }} sx={{ fontSize: 13.5, fontWeight: 600, py: 1 }}>
          <ListItemIcon><Call sx={{ fontSize: 18, color: EMERALD }} /></ListItemIcon>
          <ListItemText>Call customer</ListItemText>
        </MenuItem>
        <Divider sx={{ my: 0.5 }} />
        <MenuItem onClick={close} sx={{ fontSize: 13.5, fontWeight: 600, py: 1 }}>
          <ListItemIcon><TaskAlt sx={{ fontSize: 18, color }} /></ListItemIcon>
          <ListItemText>Mark stage complete</ListItemText>
        </MenuItem>
      </Menu>
    </>
  );
};

// ── Kanban project card ────────────────────────────────────────
const RegistrationActionMenu = ({ project, onView, onEdit, onUpload }) => {
  const [anchor, setAnchor] = useState(null);
  const close = () => setAnchor(null);

  return (
    <>
      <IconButton
        size="small"
        onClick={(event) => {
          event.stopPropagation();
          setAnchor(event.currentTarget);
        }}
        sx={{
          color: alpha(NAVY, 0.65),
          "&:hover": { bgcolor: alpha(NAVY, 0.06), color: NAVY },
        }}
      >
        <MoreVert sx={{ fontSize: 18 }} />
      </IconButton>
      <Menu
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={close}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        PaperProps={{
          sx: {
            borderRadius: "12px",
            minWidth: 190,
            border: `1px solid ${BORDER}`,
            boxShadow: "0 12px 32px rgba(15,31,61,0.12)",
          },
        }}
      >
        <MenuItem
          onClick={() => {
            close();
            onView(project);
          }}
          sx={{ fontSize: 13.5, fontWeight: 600, py: 1 }}
        >
          <ListItemIcon><OpenInNew sx={{ fontSize: 18, color: NAVY_LT }} /></ListItemIcon>
          <ListItemText>Open registration</ListItemText>
        </MenuItem>
        <MenuItem
          onClick={() => {
            close();
            onEdit(project);
          }}
          sx={{ fontSize: 13.5, fontWeight: 600, py: 1 }}
        >
          <ListItemIcon><Edit sx={{ fontSize: 18, color: BLUE }} /></ListItemIcon>
          <ListItemText>Edit registration</ListItemText>
        </MenuItem>
        <MenuItem
          onClick={() => {
            close();
            onUpload(project);
          }}
          sx={{ fontSize: 13.5, fontWeight: 600, py: 1 }}
        >
          <ListItemIcon><CloudUpload sx={{ fontSize: 18, color: EMERALD }} /></ListItemIcon>
          <ListItemText>Upload documents</ListItemText>
        </MenuItem>
      </Menu>
    </>
  );
};

const RegistrationProjectRow = ({ project, highlight, onView, onEdit, onUpload, onCall }) => {
  const stageKey = normalizeProjectStage(project);
  const progress = ((stageIndex(stageKey) + 1) / PROJECT_STAGES.length) * 100;

  return (
    <Paper
      elevation={0}
      sx={{
        p: { xs: 1.75, md: 2.25 },
        borderRadius: 0,
        borderBottom: `1px solid ${alpha(BORDER, 0.8)}`,
        bgcolor: highlight ? alpha(EMERALD, 0.04) : "#fff",
      }}
    >
      <Stack
        direction={{ xs: "column", lg: "row" }}
        spacing={{ xs: 1.75, lg: 2.5 }}
        alignItems={{ xs: "flex-start", lg: "center" }}
      >
        <Stack
          direction="row"
          spacing={1.5}
          alignItems="center"
          sx={{ width: { xs: "100%", lg: 320 }, minWidth: 0 }}
        >
          <Avatar
            sx={{
              width: 48,
              height: 48,
              fontSize: 18,
              fontWeight: 800,
              bgcolor: alpha("#8b5cf6", 0.12),
              color: "#6d28d9",
              flexShrink: 0,
            }}
          >
            {getInitials(project)}
          </Avatar>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="subtitle1" fontWeight={800} color={NAVY} noWrap>
              {project.projectCode || "Project"}
            </Typography>
            <Typography variant="h6" fontWeight={700} color={NAVY_LT} sx={{ lineHeight: 1.15 }}>
              {[project.firstName, project.lastName].filter(Boolean).join(" ") || "—"}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {project.phone || "No phone"}
            </Typography>
          </Box>
        </Stack>

        <Box sx={{ width: { xs: "100%", lg: 280 }, minWidth: 0 }}>
          <Chip
            icon={<FactCheck sx={{ fontSize: 14 }} />}
            label="Registration"
            size="small"
            sx={{
              bgcolor: alpha("#8b5cf6", 0.10),
              color: "#8b5cf6",
              fontWeight: 700,
              mb: 1.1,
              "& .MuiChip-icon": { color: "#8b5cf6 !important" },
            }}
          />
          <LinearProgress
            variant="determinate"
            value={progress}
            sx={{
              height: 5,
              borderRadius: 999,
              bgcolor: alpha("#8b5cf6", 0.12),
              "& .MuiLinearProgress-bar": {
                bgcolor: "#8b5cf6",
                borderRadius: 999,
              },
            }}
          />
        </Box>

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="h6" fontWeight={700} color={NAVY} sx={{ lineHeight: 1.2 }}>
            {NEXT_ACTIONS.registration}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.35 }}>
            Updated {formatDate(project.updatedAt || getRegistrationDateValue(project))}
          </Typography>
        </Box>

        <Typography
          variant="h6"
          fontWeight={800}
          color={NAVY}
          sx={{ width: { xs: "auto", lg: 90 }, textAlign: { xs: "left", lg: "center" } }}
        >
          {formatCurrency(getProjectAmount(project))}
        </Typography>

        <Stack
          direction="row"
          spacing={0.5}
          alignItems="center"
          justifyContent="flex-end"
          sx={{ ml: { lg: "auto" } }}
        >
          <Tooltip title="Open registration">
            <IconButton
              size="small"
              onClick={() => onView(project)}
              sx={{ color: NAVY_LT, "&:hover": { bgcolor: alpha(NAVY, 0.08) } }}
            >
              <OpenInNew sx={{ fontSize: 20 }} />
            </IconButton>
          </Tooltip>
          <Tooltip title={project.phone ? "Call customer" : "Phone not available"}>
            <span>
              <IconButton
                size="small"
                disabled={!project.phone}
                onClick={() => onCall(project)}
                sx={{
                  color: EMERALD,
                  "&:hover": { bgcolor: alpha(EMERALD, 0.08) },
                  "&.Mui-disabled": { color: alpha(EMERALD, 0.35) },
                }}
              >
                <Call sx={{ fontSize: 20 }} />
              </IconButton>
            </span>
          </Tooltip>
          <RegistrationActionMenu
            project={project}
            onView={onView}
            onEdit={onEdit}
            onUpload={onUpload}
          />
        </Stack>
      </Stack>
    </Paper>
  );
};

const ProjectCard = ({ project, onOpen, onCall, onEdit }) => {
  const stage    = getStageMeta(normalizeProjectStage(project));
  const progress = ((stageIndex(stage.key) + 1) / PROJECT_STAGES.length) * 100;
  const stuck    = isStuck(project);

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2, borderRadius: "14px",
        border: `1px solid ${stuck ? alpha(RED, 0.3) : alpha(stage.color, 0.16)}`,
        bgcolor: "#fff",
        transition: "box-shadow 0.15s, transform 0.15s",
        "&:hover": { boxShadow: `0 6px 20px ${alpha(stage.color, 0.14)}`, transform: "translateY(-1px)" },
      }}
    >
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1.5 }}>
        <Avatar
          sx={{
            width: 36, height: 36, fontSize: 13, fontWeight: 800,
            bgcolor: alpha(stage.color, 0.12), color: stage.color,
          }}
        >
          {getInitials(project)}
        </Avatar>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography variant="subtitle2" fontWeight={800} noWrap color={NAVY}>
            {project.projectCode || "Project"}
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap>
            {[project.firstName, project.lastName].filter(Boolean).join(" ") || "—"}
          </Typography>
        </Box>
        {stuck && (
          <Tooltip title="No activity for 5+ days">
            <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: RED, flexShrink: 0 }} />
          </Tooltip>
        )}
        <ActionMenu project={project} onOpen={onOpen} onCall={onCall} onEdit={onEdit} color={stage.color} />
      </Stack>

      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1.25, lineHeight: 1.4 }}>
        {NEXT_ACTIONS[stage.key]}
      </Typography>

      <LinearProgress
        variant="determinate"
        value={progress}
        sx={{
          height: 4, borderRadius: 999, mb: 1.5,
          bgcolor: alpha(stage.color, 0.12),
          "& .MuiLinearProgress-bar": { bgcolor: stage.color, borderRadius: 999 },
        }}
      />

      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="body2" fontWeight={800} color={NAVY}>
          {formatCurrency(getProjectAmount(project))}
        </Typography>
        <Button
          size="small"
          endIcon={<OpenInNew sx={{ fontSize: "14px !important" }} />}
          onClick={() => onOpen(project)}
          sx={{
            fontSize: 12, fontWeight: 700, color: stage.color,
            "&:hover": { bgcolor: alpha(stage.color, 0.08) },
          }}
        >
          Open
        </Button>
      </Stack>
    </Paper>
  );
};

// ── Filter popover content ─────────────────────────────────────
const FilterPanel = ({
  amountRange, setAmountRange,
  activityFilter, setActivityFilter,
  onClear,
}) => (
  <Box sx={{ p: 2.5, width: 280 }}>
    <Typography variant="subtitle2" fontWeight={800} color={NAVY} sx={{ mb: 1.5 }}>
      Refine results
    </Typography>

    <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ display: "block", mb: 0.75 }}>
      DEAL SIZE
    </Typography>
    <Select
      fullWidth
      size="small"
      value={amountRange}
      onChange={(e) => setAmountRange(e.target.value)}
      sx={{ mb: 2, borderRadius: "10px", fontSize: 13.5, "& .MuiOutlinedInput-notchedOutline": { borderColor: BORDER } }}
    >
      {AMOUNT_RANGES.map((r) => (
        <MenuItem key={r.key} value={r.key} sx={{ fontSize: 13.5 }}>{r.label}</MenuItem>
      ))}
    </Select>

    <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ display: "block", mb: 0.75 }}>
      ACTIVITY
    </Typography>
    <Select
      fullWidth
      size="small"
      value={activityFilter}
      onChange={(e) => setActivityFilter(e.target.value)}
      sx={{ mb: 2.5, borderRadius: "10px", fontSize: 13.5, "& .MuiOutlinedInput-notchedOutline": { borderColor: BORDER } }}
    >
      {ACTIVITY_FILTERS.map((f) => (
        <MenuItem key={f.key} value={f.key} sx={{ fontSize: 13.5 }}>{f.label}</MenuItem>
      ))}
    </Select>

    <Button
      fullWidth
      size="small"
      startIcon={<FilterAltOff sx={{ fontSize: 16 }} />}
      onClick={onClear}
      sx={{
        fontWeight: 700, fontSize: 12.5, borderRadius: "10px",
        color: NAVY_LT, border: `1px solid ${BORDER}`,
        "&:hover": { bgcolor: alpha(NAVY, 0.04) },
      }}
    >
      Clear filters
    </Button>
  </Box>
);

// ── Main component ─────────────────────────────────────────────
function Projects() {
  const { fetchAPI } = useAuth();
  const navigate     = useNavigate();
  const location     = useLocation();

  const [projects,         setProjects]         = useState([]);
  const [loading,          setLoading]          = useState(true);
  const [viewMode,         setViewMode]         = useState("table");
  const [searchTerm,       setSearchTerm]       = useState("");
  const [selectedStage,    setSelectedStage]    = useState("all");
  const [amountRange,      setAmountRange]      = useState("all");
  const [activityFilter,   setActivityFilter]   = useState("all");
  const [filterAnchor,     setFilterAnchor]      = useState(null);
  const [page,             setPage]             = useState(0);
  const [rowsPerPage,      setRowsPerPage]      = useState(10);
  const [highlightId,      setHighlightId]      = useState(null);
  const [snackbar,         setSnackbar]         = useState({ open: false, message: "", severity: "success" });

  const fetchProjects = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetchAPI("/lead/getAll?isProject=true&limit=500&sortBy=projectConvertedAt&sortOrder=desc");
      setProjects(res.result?.leads || []);
    } catch (err) {
      setSnackbar({ open: true, message: err.message || "Failed to load projects", severity: "error" });
    } finally {
      setLoading(false);
    }
  }, [fetchAPI]);

  useEffect(() => { fetchProjects(); }, [fetchProjects]);

  useEffect(() => {
    const nextStage = location.state?.stageFilter;
    const nextHighlightId = location.state?.highlightProjectId;

    const normalizedNextStage = nextStage === "all" ? "all" : normalizeProjectStage(nextStage);
    if (nextStage && (normalizedNextStage === "all" || PROJECT_STAGES.some((stage) => stage.key === normalizedNextStage))) {
      setSelectedStage(normalizedNextStage);
      setPage(0);
    }

    if (nextHighlightId) {
      setHighlightId(nextHighlightId);
      setSnackbar({
        open: true,
        message: location.state?.message || "Lead converted to project",
        severity: "success",
      });
    }

    if (nextStage || nextHighlightId) {
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.pathname, location.state, navigate]);

  const enriched = useMemo(
    () => projects.map((p) => ({ ...p, currentStage: normalizeProjectStage(p) })),
    [projects],
  );

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    const rangeTest = AMOUNT_RANGES.find((r) => r.key === amountRange)?.test || (() => true);
    return enriched.filter((p) => {
      if (selectedStage !== "all" && p.currentStage !== selectedStage) return false;
      if (!rangeTest(getProjectAmount(p))) return false;
      if (activityFilter === "stuck" && !isStuck(p)) return false;
      if (activityFilter === "week" && !(p.installationDate && isThisWeek(new Date(p.installationDate)))) return false;
      if (!q) return true;
      return [p.projectCode, p.firstName, p.lastName, p.phone, p.email, p.city, p.address]
        .filter(Boolean).join(" ").toLowerCase().includes(q);
    });
  }, [enriched, searchTerm, selectedStage, amountRange, activityFilter]);

  const paged = useMemo(() => filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage), [filtered, page, rowsPerPage]);
  const showRegistrationRows = useMemo(
    () =>
      filtered.length > 0 &&
      (selectedStage === "registration" ||
        filtered.every((project) => project.currentStage === "registration")),
    [filtered, selectedStage],
  );

  const summary = useMemo(() => {
    const counts = PROJECT_STAGES.reduce((acc, s) => {
      acc[s.key] = enriched.filter((p) => p.currentStage === s.key).length;
      return acc;
    }, {});
    const active = enriched.filter((p) => p.currentStage !== "handover");
    return {
      total:   enriched.length,
      active:  active.length,
      inFlight: active.reduce((sum, p) => sum + getProjectAmount(p), 0),
      stuck:   enriched.filter(isStuck).length,
      thisWeek: enriched.filter((p) => p.installationDate && isThisWeek(new Date(p.installationDate))).length,
      awaitingComm: counts.installation || 0,
      readyHandover: counts.handover || 0,
      counts,
    };
  }, [enriched]);

  const activeFilterCount =
    (selectedStage !== "all" ? 1 : 0) +
    (amountRange !== "all" ? 1 : 0) +
    (activityFilter !== "all" ? 1 : 0);

  const clearAllFilters = () => {
    setSelectedStage("all");
    setAmountRange("all");
    setActivityFilter("all");
    setPage(0);
  };

  const openProject = useCallback(
    (p) => {
      const stage = normalizeProjectStage(p);
      const state = {
        fromProjects: true,
        projectStage: stage,
        projectId: p?._id || null,
        leadId: p?._id || null,
        project: p,
      };
      navigate(`/projects/${p._id}`, { state });
    },
    [navigate],
  );

  const callCustomer = useCallback((p) => {
    if (p.phone) window.location.href = `tel:${p.phone}`;
  }, []);

  const editLead = useCallback(
    (p) => navigate(`/all-leads/${p._id}`, { state: { lead: p, edit: true } }),
    [navigate],
  );

  const openRegistrationAction = useCallback(
    (project, action) => {
      navigate("/registration", {
        state: {
          registrationAction: action,
          registrationId: project?._id || null,
        },
      });
    },
    [navigate],
  );

  return (
    <Box sx={{ p: { xs: 2, sm: 3, md: 4 }, minHeight: "100vh", bgcolor: SURFACE }}>

      {/* ── Header ── */}
      <Paper
        elevation={0}
        sx={{
          mb: 3, borderRadius: "20px", overflow: "hidden",
          border: `1px solid ${BORDER}`,
          background: `linear-gradient(135deg, #0f1f3d 0%, #1a237e 100%)`,
          position: "relative",
        }}
      >
        {/* decorative glow */}
        <Box sx={{
          position: "absolute", top: -60, right: -60,
          width: 260, height: 260, borderRadius: "50%",
          background: `radial-gradient(circle, ${alpha(AMBER, 0.18)} 0%, transparent 70%)`,
          pointerEvents: "none",
        }} />
        <Box sx={{
          position: "absolute", bottom: -80, left: 80,
          width: 200, height: 200, borderRadius: "50%",
          background: `radial-gradient(circle, ${alpha(BLUE, 0.15)} 0%, transparent 70%)`,
          pointerEvents: "none",
        }} />

        <Stack
          direction={{ xs: "column", md: "row" }}
          justifyContent="space-between"
          alignItems={{ xs: "flex-start", md: "center" }}
          spacing={2}
          sx={{ p: { xs: 3, md: 4 }, position: "relative" }}
        >
          <Box>
            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1 }}>
              <Box sx={{
                width: 36, height: 36, borderRadius: "10px",
                bgcolor: alpha(AMBER, 0.2), color: AMBER,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <ElectricBolt sx={{ fontSize: 20 }} />
              </Box>
              <Typography variant="overline" sx={{ color: alpha("#fff", 0.55), letterSpacing: "0.14em", fontSize: 11 }}>
                Operations · Pipeline
              </Typography>
            </Stack>

            <Typography variant="h3" fontWeight={800} color="#fff" sx={{ lineHeight: 1.1, mb: 0.75 }}>
              Projects
            </Typography>

            <Stack direction="row" spacing={2} alignItems="center">
              <Chip
                label={`${summary.active} active`}
                size="small"
                sx={{ bgcolor: alpha(AMBER, 0.18), color: AMBER_LT, fontWeight: 700, fontSize: 12 }}
              />
              <Typography variant="body2" sx={{ color: alpha("#fff", 0.6) }}>
                {formatCurrency(summary.inFlight)} in flight
              </Typography>
            </Stack>
          </Box>

          <Stack direction="row" spacing={1.5} alignItems="center">
            <ToggleButtonGroup
              value={viewMode} exclusive size="small"
              onChange={(_, v) => v && setViewMode(v)}
              sx={{
                bgcolor: alpha("#fff", 0.08), borderRadius: "10px",
                "& .MuiToggleButton-root": {
                  color: alpha("#fff", 0.55), border: "none", px: 2, py: 0.8, borderRadius: "10px !important",
                  fontSize: 13, fontWeight: 600,
                  "&.Mui-selected": { bgcolor: alpha("#fff", 0.15), color: "#fff" },
                },
              }}
            >
              <ToggleButton value="table">
                <TableChart sx={{ mr: 0.75, fontSize: 16 }} /> Table
              </ToggleButton>
              <ToggleButton value="kanban">
                <ViewKanban sx={{ mr: 0.75, fontSize: 16 }} /> Kanban
              </ToggleButton>
            </ToggleButtonGroup>

            <Tooltip title="Refresh data">
              <IconButton
                onClick={fetchProjects}
                sx={{ bgcolor: alpha("#fff", 0.08), color: "#fff", borderRadius: "10px",
                  "&:hover": { bgcolor: alpha("#fff", 0.15) } }}
              >
                <Refresh />
              </IconButton>
            </Tooltip>
          </Stack>
        </Stack>
      </Paper>

      {/* ── KPI Cards ── */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { icon: <FilterAlt sx={{ fontSize: 20 }} />,    label: "Stuck > 5 days", value: summary.stuck, note: "Projects awaiting movement", color: RED },
          { icon: <Workspaces sx={{ fontSize: 20 }} />,   label: "Installations this week", value: summary.thisWeek, note: "Scheduled or completed", color: BLUE },
          { icon: <Bolt sx={{ fontSize: 20 }} />,         label: "Awaiting commissioning", value: summary.awaitingComm, note: "Installation still in progress", color: AMBER },
          { icon: <AssignmentTurnedIn sx={{ fontSize: 20 }} />, label: "Ready for handover", value: summary.readyHandover, note: "Net meter stage reached", color: EMERALD },
        ].map((c) => (
          <Grid item xs={12} sm={6} lg={3} key={c.label}>
            <MetricCard {...c} />
          </Grid>
        ))}
      </Grid>

      {/* ── Pipeline stages (with icons) ── */}
      <Paper elevation={0} sx={{ p: 3, borderRadius: "20px", mb: 3, border: `1px solid ${BORDER}`, bgcolor: "#fff" }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
          <Typography variant="subtitle1" fontWeight={800} color={NAVY}>
            Lifecycle Pipeline
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Click a stage to filter
          </Typography>
        </Stack>

        <Box sx={{ width: "100%", overflowX: "auto", pb: 0.5 }}>
          <Stack
            direction="row"
            spacing={0.9}
            alignItems="stretch"
            sx={{ width: "100%", minWidth: 920 }}
          >
            <Box
              onClick={() => { setSelectedStage("all"); setPage(0); }}
              sx={{
                flex: 1,
                minWidth: 0,
                px: 1.35,
                py: 1.1,
                borderRadius: "14px",
                cursor: "pointer",
                border: `1.5px solid ${selectedStage === "all" ? NAVY : BORDER}`,
                bgcolor: selectedStage === "all" ? NAVY : "#fafbfe",
                transition: "all 0.15s",
                "&:hover": { borderColor: NAVY, bgcolor: selectedStage === "all" ? NAVY : alpha(NAVY, 0.04) },
              }}
            >
              <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mb: 0.5 }}>
                <TrendingUp sx={{ fontSize: 16, color: selectedStage === "all" ? "#fff" : alpha(NAVY, 0.45) }} />
                <Typography variant="h5" fontWeight={800} color={selectedStage === "all" ? "#fff" : NAVY}>
                  {summary.total}
                </Typography>
              </Stack>
              <Typography variant="caption" fontWeight={700} color={selectedStage === "all" ? alpha("#fff", 0.82) : "text.secondary"}>
                All Projects
              </Typography>
            </Box>

            {PROJECT_STAGES.map((stage) => {
              const active = selectedStage === stage.key;
              const StageIcon = stage.icon;
              return (
                <Box
                  key={stage.key}
                  onClick={() => { setSelectedStage(stage.key); setPage(0); }}
                  sx={{
                    flex: 1,
                    minWidth: 0,
                    px: 1.35,
                    py: 1.1,
                    borderRadius: "14px",
                    cursor: "pointer",
                    border: `1.5px solid ${active ? stage.color : BORDER}`,
                    bgcolor: active ? alpha(stage.color, 0.07) : "#fafbfe",
                    transition: "all 0.15s",
                    "&:hover": { borderColor: stage.color, bgcolor: alpha(stage.color, 0.05) },
                  }}
                >
                  <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mb: 0.5 }}>
                    <Box sx={{
                      width: 22, height: 22, borderRadius: "7px",
                      bgcolor: alpha(stage.color, 0.14), color: stage.color,
                      display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                    }}>
                      <StageIcon sx={{ fontSize: 13 }} />
                    </Box>
                    <Typography variant="h5" fontWeight={800} color={stage.color}>
                      {summary.counts[stage.key] || 0}
                    </Typography>
                  </Stack>
                  <Typography
                    variant="caption"
                    fontWeight={700}
                    color="text.secondary"
                    sx={{ lineHeight: 1.15, display: "block" }}
                  >
                    {stage.label}
                  </Typography>
                </Box>
              );
            })}
          </Stack>
        </Box>
      </Paper>

      {/* ── Main content panel ── */}
      <Paper elevation={0} sx={{ borderRadius: "20px", border: `1px solid ${BORDER}`, overflow: "hidden", bgcolor: "#fff" }}>

        {/* Search / filter bar */}
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={1.5}
          justifyContent="space-between"
          alignItems={{ xs: "stretch", md: "center" }}
          sx={{ p: 2.5, borderBottom: `1px solid ${BORDER}` }}
        >
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25} sx={{ flex: 1 }}>
            <TextField
              size="small"
              placeholder="Search by project code, customer, city…"
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setPage(0); }}
              sx={{
                minWidth: { md: 340 },
                "& .MuiOutlinedInput-root": {
                  borderRadius: "10px",
                  fontSize: 14,
                  "& fieldset": { borderColor: BORDER },
                  "&:hover fieldset": { borderColor: alpha(NAVY, 0.3) },
                  "&.Mui-focused fieldset": { borderColor: NAVY_LT },
                },
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search sx={{ color: "text.secondary", fontSize: 18 }} />
                  </InputAdornment>
                ),
              }}
            />

            <Button
              size="small"
              variant="outlined"
              onClick={(e) => setFilterAnchor(e.currentTarget)}
              startIcon={<FilterAlt sx={{ fontSize: 17 }} />}
              sx={{
                borderRadius: "10px", fontWeight: 700, fontSize: 13, px: 1.75,
                borderColor: activeFilterCount ? NAVY : BORDER,
                color: activeFilterCount ? NAVY : alpha(NAVY, 0.7),
                bgcolor: activeFilterCount ? alpha(NAVY, 0.05) : "transparent",
                "&:hover": { borderColor: NAVY, bgcolor: alpha(NAVY, 0.05) },
              }}
            >
              Filters
              {activeFilterCount > 0 && (
                <Chip
                  label={activeFilterCount}
                  size="small"
                  sx={{ ml: 1, height: 18, fontSize: 11, fontWeight: 800, bgcolor: NAVY, color: "#fff" }}
                />
              )}
            </Button>

            <Popover
              open={Boolean(filterAnchor)}
              anchorEl={filterAnchor}
              onClose={() => setFilterAnchor(null)}
              anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
              PaperProps={{ sx: { borderRadius: "16px", border: `1px solid ${BORDER}`, boxShadow: "0 16px 40px rgba(15,31,61,0.14)", mt: 1 } }}
            >
              <FilterPanel
                amountRange={amountRange} setAmountRange={(v) => { setAmountRange(v); setPage(0); }}
                activityFilter={activityFilter} setActivityFilter={(v) => { setActivityFilter(v); setPage(0); }}
                onClear={() => { clearAllFilters(); setFilterAnchor(null); }}
              />
            </Popover>
          </Stack>

          <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: "wrap" }}>
            {selectedStage !== "all" && (
              <Chip
                label={getStageMeta(selectedStage).label}
                onDelete={() => { setSelectedStage("all"); setPage(0); }}
                size="small"
                sx={{
                  bgcolor: alpha(getStageMeta(selectedStage).color, 0.1),
                  color: getStageMeta(selectedStage).color,
                  fontWeight: 700,
                }}
              />
            )}
            {amountRange !== "all" && (
              <Chip
                label={AMOUNT_RANGES.find((r) => r.key === amountRange)?.label}
                onDelete={() => { setAmountRange("all"); setPage(0); }}
                size="small"
                sx={{ bgcolor: alpha(BLUE, 0.1), color: BLUE, fontWeight: 700 }}
              />
            )}
            {activityFilter !== "all" && (
              <Chip
                label={ACTIVITY_FILTERS.find((f) => f.key === activityFilter)?.label}
                onDelete={() => { setActivityFilter("all"); setPage(0); }}
                size="small"
                sx={{ bgcolor: alpha(AMBER, 0.12), color: "#92660a", fontWeight: 700 }}
              />
            )}
            <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: "nowrap" }}>
              <b style={{ color: NAVY }}>{filtered.length}</b>{" "}
              {selectedStage === "registration"
                ? `registration${filtered.length !== 1 ? "s" : ""}`
                : `project${filtered.length !== 1 ? "s" : ""}`}
            </Typography>
          </Stack>
        </Stack>

        {/* Loading */}
        {loading && <LinearProgress sx={{ "& .MuiLinearProgress-bar": { bgcolor: NAVY } }} />}

        {/* Kanban */}
        {!loading && viewMode === "kanban" && (
          <Box sx={{ p: 2.5, overflowX: "auto" }}>
            <Stack direction="row" spacing={2} sx={{ minWidth: 1100, alignItems: "flex-start" }}>
              {PROJECT_STAGES
                .filter((s) => selectedStage === "all" || selectedStage === s.key)
                .map((stage) => {
                  const cols = filtered.filter((p) => p.currentStage === stage.key);
                  const StageIcon = stage.icon;
                  return (
                    <Box key={stage.key} sx={{ width: 290, flexShrink: 0 }}>
                      {/* Column header */}
                      <Box
                        sx={{
                          px: 2, py: 1.25, mb: 1.5, borderRadius: "12px",
                          bgcolor: alpha(stage.color, 0.08),
                          border: `1px solid ${alpha(stage.color, 0.2)}`,
                        }}
                      >
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Stack direction="row" spacing={1} alignItems="center">
                            <StageIcon sx={{ fontSize: 16, color: stage.color }} />
                            <Typography variant="subtitle2" fontWeight={800} color={stage.color}>
                              {stage.label}
                            </Typography>
                          </Stack>
                          <Chip
                            label={cols.length}
                            size="small"
                            sx={{ bgcolor: alpha(stage.color, 0.12), color: stage.color, fontWeight: 800, height: 20, fontSize: 11 }}
                          />
                        </Stack>
                      </Box>

                      <Stack spacing={1.25}>
                        {cols.length === 0 ? (
                          <Box sx={{ p: 2.5, borderRadius: "12px", border: `1.5px dashed ${BORDER}`, textAlign: "center" }}>
                            <Typography variant="caption" color="text.disabled">No projects</Typography>
                          </Box>
                        ) : cols.map((p) => (
                          <ProjectCard key={p._id} project={p} onOpen={openProject} onCall={callCustomer} onEdit={editLead} />
                        ))}
                      </Stack>
                    </Box>
                  );
                })}
            </Stack>
          </Box>
        )}

        {/* Empty state */}
        {!loading && viewMode === "table" && filtered.length === 0 && (
          <Box sx={{ py: 8, textAlign: "center" }}>
            <Box sx={{
              width: 72, height: 72, borderRadius: "20px",
              bgcolor: alpha(NAVY, 0.05), mx: "auto", mb: 2,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Description sx={{ fontSize: 32, color: alpha(NAVY, 0.3) }} />
            </Box>
            <Typography variant="h6" fontWeight={700} color={NAVY}>
              No projects found
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 2 }}>
              Try adjusting filters, or convert a lead from All Leads to see it appear here.
            </Typography>
            {activeFilterCount > 0 && (
              <Button
                size="small"
                onClick={clearAllFilters}
                startIcon={<FilterAltOff sx={{ fontSize: 16 }} />}
                sx={{ fontWeight: 700, color: NAVY_LT, borderRadius: "10px", border: `1px solid ${BORDER}` }}
              >
                Clear filters
              </Button>
            )}
          </Box>
        )}

        {!loading && viewMode === "table" && showRegistrationRows && (
          <>
            <Box>
              {paged.map((project) => (
                <RegistrationProjectRow
                  key={project._id}
                  project={project}
                  highlight={highlightId === project._id}
                  onView={(item) => openRegistrationAction(item, "view")}
                  onEdit={(item) => openRegistrationAction(item, "edit")}
                  onUpload={(item) => openRegistrationAction(item, "upload")}
                  onCall={callCustomer}
                />
              ))}
            </Box>

            <TablePagination
              component="div"
              count={filtered.length}
              page={page}
              onPageChange={(_, p) => setPage(p)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
              rowsPerPageOptions={[5, 10, 25]}
              sx={{ borderTop: `1px solid ${BORDER}`, color: alpha(NAVY, 0.7) }}
            />
          </>
        )}

        {/* Registration table */}
        {!loading && false && viewMode === "table" && showRegistrationRows && (
          <>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: "#fafbfe" }}>
                    {["Customer", "Date", "Solar Requirement", "Status", "Lead Status", "Assigned To", "Actions"].map((col, i) => (
                      <TableCell
                        key={i}
                        align={i === 6 ? "right" : "left"}
                        sx={{
                          fontWeight: 800, fontSize: 12,
                          color: alpha(NAVY, 0.6),
                          textTransform: "uppercase",
                          letterSpacing: "0.06em",
                          borderBottom: `1px solid ${BORDER}`,
                          py: 1.5,
                        }}
                      >
                        {col}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>

                <TableBody>
                  {paged.map((project) => {
                    const registrationMeta = getRegistrationStatusMeta(project.registrationStatus);
                    const leadMeta = getLeadStatusMeta(project.status);
                    const assignedPerson = getAssignedPerson(project);
                    const highlight = highlightId === project._id;

                    return (
                      <TableRow
                        key={project._id}
                        sx={{
                          bgcolor: highlight ? alpha(EMERALD, 0.04) : "transparent",
                          "&:hover": { bgcolor: alpha(NAVY, 0.02) },
                          "& td": { borderBottom: `1px solid ${alpha(BORDER, 0.6)}` },
                        }}
                      >
                        <TableCell>
                          <Stack direction="row" spacing={1.5} alignItems="center">
                            <Avatar
                              sx={{
                                width: 38, height: 38, fontSize: 13, fontWeight: 800,
                                bgcolor: alpha("#1d4ed8", 0.12), color: NAVY_LT,
                              }}
                            >
                              {getInitials(project)}
                            </Avatar>
                            <Box>
                              <Typography variant="subtitle2" fontWeight={800} color={NAVY}>
                                {[project.firstName, project.lastName].filter(Boolean).join(" ") || "—"}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                {project.phone || "No phone"}
                              </Typography>
                            </Box>
                          </Stack>
                        </TableCell>

                        <TableCell>
                          <Typography variant="body2" fontWeight={600} color={NAVY}>
                            {formatDate(getRegistrationDateValue(project))}
                          </Typography>
                        </TableCell>

                        <TableCell>
                          <Stack direction="row" spacing={1} alignItems="center">
                            <SolarPower sx={{ fontSize: 18, color: alpha(NAVY, 0.75) }} />
                            <Typography variant="body2" fontWeight={600} color={NAVY}>
                              {project.solarRequirement || project.capacity || "—"}
                            </Typography>
                          </Stack>
                        </TableCell>

                        <TableCell>
                          <Chip
                            icon={registrationMeta.icon}
                            label={registrationMeta.label}
                            size="small"
                            sx={{
                              bgcolor: registrationMeta.bg,
                              color: registrationMeta.color,
                              fontWeight: 700,
                              "& .MuiChip-icon": { color: `${registrationMeta.color} !important` },
                            }}
                          />
                        </TableCell>

                        <TableCell>
                          <Chip
                            icon={leadMeta.icon}
                            label={leadMeta.label}
                            size="small"
                            sx={{
                              bgcolor: leadMeta.bg,
                              color: leadMeta.color,
                              fontWeight: 700,
                              "& .MuiChip-icon": { color: `${leadMeta.color} !important` },
                            }}
                          />
                        </TableCell>

                        <TableCell>
                          <Typography variant="subtitle2" fontWeight={700} color={NAVY}>
                            {assignedPerson?.name || "Unassigned"}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {(assignedPerson?.role || "Team").toUpperCase()}
                          </Typography>
                        </TableCell>

                        <TableCell align="right">
                          <Stack direction="row" spacing={0.75} justifyContent="flex-end" alignItems="center">
                            <Tooltip title="View details">
                              <IconButton
                                size="small"
                                onClick={() => openRegistrationAction(project, "view")}
                                sx={{ color: NAVY_LT, bgcolor: alpha(NAVY, 0.06), "&:hover": { bgcolor: alpha(NAVY, 0.12) } }}
                              >
                                <Visibility sx={{ fontSize: 18 }} />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Edit">
                              <IconButton
                                size="small"
                                onClick={() => openRegistrationAction(project, "edit")}
                                sx={{ color: BLUE, bgcolor: alpha(BLUE, 0.08), "&:hover": { bgcolor: alpha(BLUE, 0.14) } }}
                              >
                                <Edit sx={{ fontSize: 18 }} />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Upload documents">
                              <IconButton
                                size="small"
                                onClick={() => openRegistrationAction(project, "upload")}
                                sx={{ color: EMERALD, bgcolor: alpha(EMERALD, 0.1), "&:hover": { bgcolor: alpha(EMERALD, 0.16) } }}
                              >
                                <CloudUpload sx={{ fontSize: 18 }} />
                              </IconButton>
                            </Tooltip>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>

            <TablePagination
              component="div"
              count={filtered.length}
              page={page}
              onPageChange={(_, p) => setPage(p)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
              rowsPerPageOptions={[5, 10, 25]}
              sx={{ borderTop: `1px solid ${BORDER}`, color: alpha(NAVY, 0.7) }}
            />
          </>
        )}

        {/* Table */}
        {!loading && viewMode === "table" && !showRegistrationRows && filtered.length > 0 && (
          <>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: "#fafbfe" }}>
                    {["Project", "Stage", "Next Action", "Amount", "Actions"].map((col, i) => (
                      <TableCell
                        key={i}
                        align={i === 4 ? "right" : "left"}
                        sx={{
                          fontWeight: 800, fontSize: 12,
                          color: alpha(NAVY, 0.6),
                          textTransform: "uppercase",
                          letterSpacing: "0.06em",
                          borderBottom: `1px solid ${BORDER}`,
                          py: 1.5,
                        }}
                      >
                        {col}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>

                <TableBody>
                  {paged.map((project) => {
                    const stage     = getStageMeta(project.currentStage);
                    const StageIcon = stage.icon;
                    const progress  = ((stageIndex(project.currentStage) + 1) / PROJECT_STAGES.length) * 100;
                    const highlight = highlightId === project._id;
                    const stuck     = isStuck(project);

                    return (
                      <TableRow
                        key={project._id}
                        sx={{
                          bgcolor: highlight ? alpha(EMERALD, 0.04) : "transparent",
                          "&:hover": { bgcolor: alpha(NAVY, 0.02) },
                          "& td": { borderBottom: `1px solid ${alpha(BORDER, 0.6)}` },
                        }}
                      >
                        {/* Project info */}
                        <TableCell>
                          <Stack direction="row" spacing={1.5} alignItems="center">
                            <Avatar
                              sx={{
                                width: 38, height: 38, fontSize: 13, fontWeight: 800,
                                bgcolor: alpha(stage.color, 0.1), color: stage.color,
                              }}
                            >
                              {getInitials(project)}
                            </Avatar>
                            <Box>
                              <Stack direction="row" spacing={0.75} alignItems="center">
                                <Typography variant="subtitle2" fontWeight={800} color={NAVY}>
                                  {project.projectCode || "Project"}
                                </Typography>
                                {highlight && <Chip label="New" size="small" color="success" sx={{ height: 18, fontSize: 10 }} />}
                                {stuck && (
                                  <Tooltip title="No activity for 5+ days">
                                    <Box sx={{ width: 7, height: 7, borderRadius: "50%", bgcolor: RED }} />
                                  </Tooltip>
                                )}
                              </Stack>
                              <Typography variant="body2" fontWeight={600} color={alpha(NAVY, 0.75)}>
                                {[project.firstName, project.lastName].filter(Boolean).join(" ") || "—"}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {[project.city, project.phone].filter(Boolean).join(" · ") || "No location"}
                              </Typography>
                            </Box>
                          </Stack>
                        </TableCell>

                        {/* Stage + progress */}
                        <TableCell sx={{ minWidth: 190 }}>
                          <Chip
                            icon={<StageIcon sx={{ fontSize: "14px !important", color: `${stage.color} !important` }} />}
                            label={stage.label}
                            size="small"
                            sx={{
                              mb: 0.75, fontWeight: 700, fontSize: 11,
                              bgcolor: alpha(stage.color, 0.08), color: stage.color,
                            }}
                          />
                          <LinearProgress
                            variant="determinate"
                            value={progress}
                            sx={{
                              height: 4, borderRadius: 999,
                              bgcolor: alpha(stage.color, 0.1),
                              "& .MuiLinearProgress-bar": { bgcolor: stage.color, borderRadius: 999 },
                            }}
                          />
                        </TableCell>

                        {/* Next action */}
                        <TableCell sx={{ maxWidth: 240 }}>
                          <Typography variant="body2" fontWeight={600} color={NAVY} sx={{ mb: 0.25 }}>
                            {NEXT_ACTIONS[project.currentStage]}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Updated {formatDate(project.updatedAt)}
                          </Typography>
                        </TableCell>

                        {/* Amount */}
                        <TableCell>
                          <Typography variant="subtitle2" fontWeight={800} color={NAVY}>
                            {formatCurrency(getProjectAmount(project))}
                          </Typography>
                        </TableCell>

                        {/* Actions */}
                        <TableCell align="right">
                          <Stack direction="row" spacing={0.5} justifyContent="flex-end" alignItems="center">
                            <Tooltip title="Open project">
                              <IconButton
                                size="small"
                                onClick={() => openProject(project)}
                                sx={{ color: NAVY_LT, "&:hover": { bgcolor: alpha(NAVY, 0.06) } }}
                              >
                                <OpenInNew sx={{ fontSize: 18 }} />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Call customer">
                              <IconButton
                                size="small"
                                onClick={() => callCustomer(project)}
                                sx={{ color: EMERALD, "&:hover": { bgcolor: alpha(EMERALD, 0.08) } }}
                              >
                                <Call sx={{ fontSize: 17 }} />
                              </IconButton>
                            </Tooltip>
                            <ActionMenu project={project} onOpen={openProject} onCall={callCustomer} onEdit={editLead} color={stage.color} />
                          </Stack>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>

            <TablePagination
              component="div"
              count={filtered.length}
              page={page}
              onPageChange={(_, p) => setPage(p)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
              rowsPerPageOptions={[5, 10, 25]}
              sx={{ borderTop: `1px solid ${BORDER}`, color: alpha(NAVY, 0.7) }}
            />
          </>
        )}
      </Paper>

      {/* ── Snackbar ── */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((p) => ({ ...p, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          severity={snackbar.severity}
          variant="filled"
          onClose={() => setSnackbar((p) => ({ ...p, open: false }))}
          sx={{ borderRadius: "12px", fontWeight: 600 }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default Projects;
