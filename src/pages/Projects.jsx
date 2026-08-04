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
  useTheme,
} from "@mui/material";
import {
  AssignmentTurnedIn,
  Bolt,
  Build,
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

const PROJECT_PIPELINE_STAGES = [
  ...PROJECT_STAGES,
  { key: "ready_handover", label: "Ready Handover", color: EMERALD, icon: AssignmentTurnedIn },
];

const PROJECT_TYPE_FILTERS = [
  { key: "all", label: "All Projects", color: "#3b82f6", icon: Workspaces },
  { key: "residential", label: "Residential", color: "#10b981", icon: SolarPower },
  { key: "commercial", label: "Commercial", color: "#06b6d4", icon: ElectricBolt },
  { key: "ula_1kw_on_grid", label: "ULA 1KW On-Grid", color: "#a855f7", icon: Bolt },
  { key: "maintenance", label: "Maintenance", color: "#f59e0b", icon: Build },
  { key: "others", label: "Other", color: "#f97316", icon: Description },
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
const getPipelineStageMeta = (key) => PROJECT_PIPELINE_STAGES.find((s) => s.key === key) || PROJECT_PIPELINE_STAGES[0];
const normalizeProjectStage = (projectOrStage) => {
  const rawStage = typeof projectOrStage === "string" ? projectOrStage : getProjectStage(projectOrStage);
  if (rawStage === "visit") return "lead_converted";
  if (rawStage === "bank_loan") return "payment";
  if (rawStage === "handover") return "disbursement";
  return rawStage;
};
const normalizePipelineStage = (projectOrStage) => {
  const rawStage = typeof projectOrStage === "string" ? projectOrStage : getProjectStage(projectOrStage);
  if (rawStage === "visit") return "lead_converted";
  if (rawStage === "bank_loan") return "payment";
  if (rawStage === "handover") return "ready_handover";
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

const getProjectName = (project) =>
  project?.projectType || project?.leadType || project?.requirementType || "Project type not selected";

const normalizeProjectType = (project) => {
  const raw = String(project?.projectType || project?.leadType || project?.requirementType || "").toLowerCase();
  if (raw.includes("residential")) return "residential";
  if (raw.includes("commercial")) return "commercial";
  if (raw.includes("ula") || raw.includes("1kw")) return "ula_1kw_on_grid";
  if (raw.includes("maintenance")) return "maintenance";
  if (raw.includes("other")) return "others";
  return "others";
};

const getProjectTypeMeta = (key) => PROJECT_TYPE_FILTERS.find((type) => type.key === key) || PROJECT_TYPE_FILTERS[0];

const getPersonName = (person) =>
  [person?.firstName, person?.lastName].filter(Boolean).join(" ") || "";

const mapWorksheetProjects = (worksheets = []) =>
  worksheets.flatMap((worksheet) => {
    const projects = Array.isArray(worksheet?.projects) ? worksheet.projects : [];
    return projects.map((project, index) => {
      const projectId = project?._id || `${worksheet?._id || "worksheet"}-${index}`;
      const customerName = project?.consumerName || project?.siteLocation || "APK Project";
      const createdDate = worksheet?.workDate || worksheet?.createdAt || new Date().toISOString();
      const projectCode = `APP-${formatDate(createdDate, "ddMMyy")}-${String(index + 1).padStart(2, "0")}`;

      return {
        ...project,
        _id: `worksheet-${worksheet?._id || "unknown"}-${projectId}`,
        source: "installerWorksheet",
        sourceLabel: "APK",
        worksheetId: worksheet?._id,
        worksheetProjectId: project?._id,
        projectCode,
        firstName: customerName,
        lastName: "",
        phone: project?.contactNo || "",
        city: project?.section || "",
        address: project?.address || project?.siteLocation || project?.gpsLocation?.address || "",
        email: "",
        status: "Visit",
        installationStatus: "",
        installationDate: worksheet?.workDate,
        projectConvertedAt: worksheet?.createdAt,
        createdAt: worksheet?.createdAt || worksheet?.workDate,
        updatedAt: worksheet?.updatedAt || worksheet?.createdAt || worksheet?.workDate,
        capacity: project?.capacityKw ? `${project.capacityKw} KW` : "",
        solarRequirement: project?.capacityKw ? `${project.capacityKw} KW` : project?.projectType,
        consumerAccountNo: project?.consumerAccountNo || "",
        assignedUser: project?.supervisor || worksheet?.user,
        assignedManager: worksheet?.user,
        supervisorName: getPersonName(project?.supervisor),
        createdByName: getPersonName(worksheet?.user),
        teammates: Array.isArray(project?.teammates) ? project.teammates : [],
      };
    });
  });

const stageIndex = (key) => PROJECT_STAGES.findIndex((s) => s.key === key);

// ── Compact metric card ────────────────────────────────────────
const MetricCard = ({ icon, label, value, note, color, onClick }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  return (
    <Card
      onClick={onClick}
      sx={{
        borderRadius: "16px",
        border: isDark ? `1px solid ${alpha(color, 0.25)}` : `1px solid ${alpha(color, 0.18)}`,
        boxShadow: isDark ? `0 4px 20px ${alpha(color, 0.15)}` : "none",
        cursor: onClick ? "pointer" : "default",
        transition: "transform 0.15s, box-shadow 0.15s",
        "&:hover": onClick ? { transform: "translateY(-2px)", boxShadow: `0 8px 24px ${alpha(color, 0.25)}` } : {},
        bgcolor: isDark ? "#0b0e1a" : "#fff",
        color: isDark ? "#f8fafc" : "inherit",
      }}
    >
      <CardContent sx={{ p: "12px 16px !important" }}>
        <Stack direction="row" spacing={2} alignItems="flex-start">
          <Box
            sx={{
              width: 36, height: 36, borderRadius: "10px",
              bgcolor: isDark ? alpha(color, 0.2) : alpha(color, 0.1), color,
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
            }}
          >
            {icon}
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="h5" fontWeight={800} color={isDark ? "#f8fafc" : NAVY} lineHeight={1}>
              {value}
            </Typography>
            <Typography variant="subtitle2" fontWeight={700} color={isDark ? "#f8fafc" : NAVY} sx={{ mt: 0.25 }}>
              {label}
            </Typography>
            <Typography variant="caption" color={isDark ? "#94a3b8" : "text.secondary"} sx={{ mt: 0.5, display: "block" }}>
              {note}
            </Typography>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
};

// ── Row / card action menu ─────────────────────────────────────
const ActionMenu = ({ project, onOpen, onCall, onEdit, color }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
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
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
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
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const stageKey = normalizeProjectStage(project);
  const progress = ((stageIndex(stageKey) + 1) / PROJECT_STAGES.length) * 100;

  return (
    <Paper
      elevation={0}
      sx={{
        p: { xs: 1.75, md: 2.25 },
        borderRadius: 0,
        borderBottom: isDark ? "1px solid rgba(255,255,255,0.08)" : `1px solid ${alpha(BORDER, 0.8)}`,
        bgcolor: highlight ? (isDark ? "rgba(16,185,129,0.1)" : alpha(EMERALD, 0.04)) : (isDark ? "#0e1220" : "#fff"),
        color: isDark ? "#f8fafc" : "inherit",
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
            <Typography variant="subtitle1" fontWeight={800} color={isDark ? "#f8fafc" : NAVY} noWrap>
              {project.projectCode || "Project"}
            </Typography>
            <Typography variant="caption" fontWeight={800} color="#8b5cf6" noWrap sx={{ display: "block", mt: 0.2 }}>
              {getProjectName(project)}
            </Typography>
            <Typography variant="h6" fontWeight={700} color={isDark ? "#f8fafc" : NAVY_LT} sx={{ lineHeight: 1.15 }}>
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
          <Typography variant="h6" fontWeight={700} color={isDark ? "#f8fafc" : NAVY} sx={{ lineHeight: 1.2 }}>
            {NEXT_ACTIONS.registration}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.35 }}>
            Updated {formatDate(project.updatedAt || getRegistrationDateValue(project))}
          </Typography>
        </Box>

        <Typography
          variant="h6"
          fontWeight={800}
          color={isDark ? "#f8fafc" : NAVY}
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
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const stage    = getStageMeta(normalizeProjectStage(project));
  const progress = ((stageIndex(stage.key) + 1) / PROJECT_STAGES.length) * 100;
  const stuck    = isStuck(project);

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2, borderRadius: "14px",
        border: `1px solid ${stuck ? alpha(RED, 0.4) : isDark ? "rgba(255,255,255,0.08)" : alpha(stage.color, 0.16)}`,
        bgcolor: isDark ? "#0e1220" : "#fff",
        color: isDark ? "#f8fafc" : "inherit",
        transition: "box-shadow 0.15s, transform 0.15s",
        "&:hover": { boxShadow: isDark ? `0 6px 20px ${alpha(stage.color, 0.25)}` : `0 6px 20px ${alpha(stage.color, 0.14)}`, transform: "translateY(-1px)" },
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
          <Typography variant="subtitle2" fontWeight={800} noWrap color={isDark ? "#f8fafc" : NAVY}>
            {project.projectCode || "Project"}
          </Typography>
          <Typography variant="caption" fontWeight={800} color={stage.color} noWrap sx={{ display: "block", mt: 0.2 }}>
            {getProjectName(project)}
          </Typography>
          <Typography variant="caption" color={isDark ? "#94a3b8" : "text.secondary"} noWrap>
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

      <Typography variant="caption" color={isDark ? "#94a3b8" : "text.secondary"} sx={{ display: "block", mb: 1.25, lineHeight: 1.4 }}>
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
        <Typography variant="body2" fontWeight={800} color={isDark ? "#f8fafc" : NAVY}>
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
}) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  return (
    <Box sx={{ p: 2.5, width: 280, bgcolor: isDark ? "#0b0e1a" : "#fff", color: isDark ? "#f8fafc" : "inherit" }}>
      <Typography variant="subtitle2" fontWeight={800} color={isDark ? "#f8fafc" : NAVY} sx={{ mb: 1.5 }}>
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
      sx={{ mb: 2, borderRadius: "10px", fontSize: 13.5, bgcolor: isDark ? "#0e1220" : "#fff", color: isDark ? "#f8fafc" : "inherit", "& .MuiOutlinedInput-notchedOutline": { borderColor: isDark ? "rgba(255,255,255,0.12)" : BORDER } }}
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
      sx={{ mb: 2.5, borderRadius: "10px", fontSize: 13.5, bgcolor: isDark ? "#0e1220" : "#fff", color: isDark ? "#f8fafc" : "inherit", "& .MuiOutlinedInput-notchedOutline": { borderColor: isDark ? "rgba(255,255,255,0.12)" : BORDER } }}
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
};

// ── Main component ─────────────────────────────────────────────
function Projects() {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const { fetchAPI } = useAuth();
  const navigate     = useNavigate();
  const location     = useLocation();

  const [projects,         setProjects]         = useState([]);
  const [loading,          setLoading]          = useState(true);
  const [viewMode,         setViewMode]         = useState("table");
  const [searchTerm,       setSearchTerm]       = useState("");
  const [selectedStage,    setSelectedStage]    = useState("all");
  const [selectedProjectType, setSelectedProjectType] = useState("all");
  const [selectedSection, setSelectedSection] = useState("all");
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
      const [leadResult, worksheetResult] = await Promise.allSettled([
        fetchAPI("/lead/getAll?isProject=true&limit=500&sortBy=projectConvertedAt&sortOrder=desc"),
        fetchAPI("/installer-worksheets?limit=500"),
      ]);

      if (leadResult.status === "rejected" && worksheetResult.status === "rejected") {
        throw leadResult.reason || worksheetResult.reason;
      }

      const leadProjects = leadResult.status === "fulfilled"
        ? leadResult.value?.result?.leads || []
        : [];
      const worksheetProjects = worksheetResult.status === "fulfilled"
        ? mapWorksheetProjects(worksheetResult.value?.result || worksheetResult.value?.data || [])
        : [];

      setProjects([...worksheetProjects, ...leadProjects]);
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
    () => projects.map((p) => ({
      ...p,
      currentStage: normalizeProjectStage(p),
      pipelineStage: normalizePipelineStage(p),
      projectTypeKey: normalizeProjectType(p),
    })),
    [projects],
  );

  const selectedTypeProjects = useMemo(
    () => enriched.filter((p) => selectedProjectType === "all" || p.projectTypeKey === selectedProjectType),
    [enriched, selectedProjectType],
  );

  const sectionOptions = useMemo(
    () =>
      Array.from(new Set(selectedTypeProjects.map((p) => p.section || p.city).filter(Boolean)))
        .sort((a, b) => String(a).localeCompare(String(b))),
    [selectedTypeProjects],
  );

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    const rangeTest = AMOUNT_RANGES.find((r) => r.key === amountRange)?.test || (() => true);
    return enriched.filter((p) => {
      if (selectedStage === "ready_handover" && p.pipelineStage !== "ready_handover") return false;
      if (selectedStage !== "all" && selectedStage !== "ready_handover" && p.currentStage !== selectedStage) return false;
      if (selectedProjectType !== "all" && p.projectTypeKey !== selectedProjectType) return false;
      if (selectedSection !== "all" && (p.section || p.city) !== selectedSection) return false;
      if (!rangeTest(getProjectAmount(p))) return false;
      if (activityFilter === "stuck" && !isStuck(p)) return false;
      if (activityFilter === "week" && !(p.installationDate && isThisWeek(new Date(p.installationDate)))) return false;
      if (!q) return true;
      return [p.projectCode, getProjectName(p), p.projectType, p.firstName, p.lastName, p.consumerName, p.consumerAccountNo, p.phone, p.email, p.city, p.section, p.address, p.siteLocation]
        .filter(Boolean).join(" ").toLowerCase().includes(q);
    });
  }, [enriched, searchTerm, selectedStage, selectedProjectType, selectedSection, amountRange, activityFilter]);

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
    const typeCounts = PROJECT_TYPE_FILTERS.reduce((acc, type) => {
      if (type.key !== "all") acc[type.key] = enriched.filter((p) => p.projectTypeKey === type.key).length;
      return acc;
    }, {});
    const pipelineCounts = PROJECT_PIPELINE_STAGES.reduce((acc, stage) => {
      acc[stage.key] = selectedTypeProjects.filter((p) => p.pipelineStage === stage.key).length;
      return acc;
    }, {});
    return {
      total:   enriched.length,
      active:  active.length,
      inFlight: active.reduce((sum, p) => sum + getProjectAmount(p), 0),
      stuck:   enriched.filter(isStuck).length,
      thisWeek: enriched.filter((p) => p.installationDate && isThisWeek(new Date(p.installationDate))).length,
      awaitingComm: counts.installation || 0,
      readyHandover: enriched.filter((p) => p.pipelineStage === "ready_handover").length,
      counts,
      typeCounts,
      pipelineCounts,
    };
  }, [enriched, selectedTypeProjects]);

  const activeFilterCount =
    (selectedStage !== "all" ? 1 : 0) +
    (selectedProjectType !== "all" ? 1 : 0) +
    (selectedSection !== "all" ? 1 : 0) +
    (amountRange !== "all" ? 1 : 0) +
    (activityFilter !== "all" ? 1 : 0);

  const clearAllFilters = () => {
    setSelectedStage("all");
    setSelectedProjectType("all");
    setSelectedSection("all");
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
    (p) => {
      if (p?.source === "installerWorksheet") {
        setSnackbar({
          open: true,
          message: "APK-created projects can be edited from the APK project screen.",
          severity: "info",
        });
        return;
      }
      navigate(`/all-leads/${p._id}`, { state: { lead: p, edit: true } });
    },
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
    <Box sx={{ p: { xs: 1, sm: 1.5 }, bgcolor: "transparent" }}>

      {/* ── Header ── */}
      <Paper
        elevation={0}
        sx={{
          mb: 1.5, borderRadius: "14px", overflow: "hidden",
          border: isDark ? "1px solid rgba(255,255,255,0.08)" : `1px solid ${BORDER}`,
          background: isDark ? "#0b0e1a" : `linear-gradient(135deg, #0f1f3d 0%, #1a237e 100%)`,
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
          sx={{ p: { xs: 1.5, md: 2 }, position: "relative" }}
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

            <Typography variant="h5" fontWeight={800} color="#fff" sx={{ lineHeight: 1.1, mb: 0.25 }}>
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
      <Grid container spacing={1.5} sx={{ mb: 1.5 }}>
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
      <Box sx={{ mb: 1.5 }}>
        <Typography variant="caption" fontWeight={900} color={isDark ? "#94a3b8" : NAVY} sx={{ mb: 0.5, display: "block", textTransform: "uppercase", letterSpacing: "0.05em" }}>
          Project Type
        </Typography>
        <Box sx={{ width: "100%", overflowX: "auto", pb: 0.75 }}>
          <Stack direction="row" spacing={1} alignItems="stretch" sx={{ minWidth: 960 }}>
            {PROJECT_TYPE_FILTERS.map((type) => {
              const active = selectedProjectType === type.key;
              const TypeIcon = type.icon;
              const count = type.key === "all" ? summary.total : summary.typeCounts[type.key] || 0;
              return (
                <Box
                  key={type.key}
                  onClick={() => { setSelectedProjectType(type.key); setSelectedStage("all"); setSelectedSection("all"); setPage(0); }}
                  sx={{
                    flex: 1,
                    minHeight: 52,
                    px: 1.5,
                    py: 0.75,
                    borderRadius: "12px",
                    cursor: "pointer",
                    border: active
                      ? `1.5px solid ${type.color}`
                      : (isDark ? `1px solid ${alpha(type.color, 0.2)}` : `1px solid ${BORDER}`),
                    background: active
                      ? (isDark
                          ? `linear-gradient(135deg, ${alpha(type.color, 0.28)} 0%, ${alpha(type.color, 0.12)} 100%)`
                          : `linear-gradient(135deg, ${type.color} 0%, ${alpha(type.color, 0.85)} 100%)`)
                      : (isDark ? "#0b0e1a" : "#fff"),
                    boxShadow: active
                      ? `0 8px 24px ${alpha(type.color, isDark ? 0.35 : 0.25)}`
                      : "0 2px 8px rgba(0,0,0,0.04)",
                    transition: "all 0.2s ease",
                    position: "relative",
                    "&:hover": {
                      transform: "translateY(-2px)",
                      borderColor: type.color,
                      boxShadow: `0 8px 20px ${alpha(type.color, 0.25)}`,
                    },
                    "&::after": active ? {
                      content: '""',
                      position: "absolute",
                      left: "50%",
                      bottom: 6,
                      width: 36,
                      height: 3,
                      borderRadius: 99,
                      bgcolor: type.color,
                      boxShadow: `0 0 10px ${type.color}`,
                      transform: "translateX(-50%)",
                    } : {},
                  }}
                >
                  <Stack spacing={0.75} alignItems="center" justifyContent="center">
                    <Stack direction="row" spacing={0.8} alignItems="center" justifyContent="center" sx={{ width: "100%" }}>
                      <Box
                        sx={{
                          width: 24,
                          height: 24,
                          borderRadius: "6px",
                          bgcolor: active ? alpha("#fff", 0.2) : alpha(type.color, 0.12),
                          color: active ? "#fff" : type.color,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <TypeIcon sx={{ fontSize: 15 }} />
                      </Box>
                      <Typography variant="body2" fontWeight={800} color={active ? "#fff" : (isDark ? "#f8fafc" : NAVY)} noWrap>
                        {type.label}
                      </Typography>
                    </Stack>
                    <Typography variant="h6" fontWeight={900} color={active ? "#fff" : (isDark ? type.color : NAVY)} sx={{ lineHeight: 1 }}>
                      {count}
                    </Typography>
                  </Stack>
                </Box>
              );
            })}
          </Stack>
        </Box>

        <Paper elevation={0} sx={{ mt: 1, p: 1.25, borderRadius: "8px", border: isDark ? "1px solid rgba(255,255,255,0.08)" : `1px solid ${alpha(BLUE, 0.3)}`, bgcolor: isDark ? "#0b0e1a" : "#fff" }}>
          <Typography variant="caption" fontWeight={900} color={isDark ? "#94a3b8" : NAVY} sx={{ mb: 0.75, display: "block", textTransform: "uppercase" }}>
            {getProjectTypeMeta(selectedProjectType).label} Pipeline Stages
          </Typography>
          <Box sx={{ width: "100%", overflowX: "auto", pb: 0.25 }}>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ minWidth: 980 }}>
              {PROJECT_PIPELINE_STAGES.map((stage, index) => {
                const StageIcon = stage.icon;
                const active = selectedStage === stage.key;
                return (
                  <React.Fragment key={stage.key}>
                    <Box
                      onClick={() => { setSelectedStage(stage.key); setPage(0); }}
                      sx={{
                        flex: 1,
                        minHeight: 54,
                        px: 1.25,
                        py: 1,
                        borderRadius: "8px",
                        border: `1px solid ${active ? alpha(stage.color, 0.55) : (isDark ? "rgba(255,255,255,0.08)" : BORDER)}`,
                        bgcolor: active ? alpha(stage.color, isDark ? 0.2 : 0.08) : (isDark ? "#0e1220" : "#fff"),
                        cursor: "pointer",
                      }}
                    >
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Box sx={{
                          width: 30,
                          height: 30,
                          borderRadius: "8px",
                          bgcolor: alpha(stage.color, 0.13),
                          color: stage.color,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}>
                          <StageIcon sx={{ fontSize: 16 }} />
                        </Box>
                        <Box sx={{ minWidth: 0 }}>
                          <Typography variant="caption" fontWeight={900} color={isDark ? "#f8fafc" : NAVY} noWrap sx={{ display: "block" }}>
                            {stage.label}
                          </Typography>
                          <Typography variant="h6" fontWeight={900} color={isDark ? "#f8fafc" : NAVY} sx={{ lineHeight: 1.05 }}>
                            {summary.pipelineCounts[stage.key] || 0}
                          </Typography>
                        </Box>
                      </Stack>
                    </Box>
                    {index < PROJECT_PIPELINE_STAGES.length - 1 && (
                      <Typography variant="caption" color="text.disabled" fontWeight={900}>
                        +
                      </Typography>
                    )}
                  </React.Fragment>
                );
              })}
            </Stack>
          </Box>
        </Paper>
      </Box>

      {/* ── Main content panel ── */}
      <Paper elevation={0} sx={{ borderRadius: "14px", border: isDark ? "1px solid rgba(255,255,255,0.08)" : `1px solid ${BORDER}`, overflow: "hidden", bgcolor: isDark ? "#0b0e1a" : "#fff" }}>

        {/* Search / filter bar */}
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={1.5}
          justifyContent="space-between"
          alignItems={{ xs: "stretch", md: "center" }}
          sx={{ p: 1.5, borderBottom: isDark ? "1px solid rgba(255,255,255,0.08)" : `1px solid ${BORDER}` }}
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
                  bgcolor: isDark ? "#0e1220" : "#fff",
                  color: isDark ? "#f8fafc" : "inherit",
                  "& fieldset": { borderColor: isDark ? "rgba(255,255,255,0.12)" : BORDER },
                  "&:hover fieldset": { borderColor: isDark ? "#3b82f6" : alpha(NAVY, 0.3) },
                  "&.Mui-focused fieldset": { borderColor: "#3b82f6" },
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

            <Select
              size="small"
              value={selectedProjectType}
              onChange={(e) => { setSelectedProjectType(e.target.value); setSelectedStage("all"); setSelectedSection("all"); setPage(0); }}
              displayEmpty
              sx={{
                minWidth: 170,
                borderRadius: "10px",
                fontSize: 13,
                fontWeight: 700,
                "& .MuiOutlinedInput-notchedOutline": { borderColor: isDark ? "rgba(255,255,255,0.12)" : BORDER }, bgcolor: isDark ? "#0e1220" : "#fff", color: isDark ? "#f8fafc" : "inherit",
              }}
            >
              {PROJECT_TYPE_FILTERS.map((type) => (
                <MenuItem key={type.key} value={type.key} sx={{ fontSize: 13 }}>
                  Project Type: {type.label}
                </MenuItem>
              ))}
            </Select>

            <Select
              size="small"
              value={selectedStage}
              onChange={(e) => { setSelectedStage(e.target.value); setPage(0); }}
              displayEmpty
              sx={{
                minWidth: 130,
                borderRadius: "10px",
                fontSize: 13,
                fontWeight: 700,
                "& .MuiOutlinedInput-notchedOutline": { borderColor: isDark ? "rgba(255,255,255,0.12)" : BORDER }, bgcolor: isDark ? "#0e1220" : "#fff", color: isDark ? "#f8fafc" : "inherit",
              }}
            >
              <MenuItem value="all" sx={{ fontSize: 13 }}>Stage: All</MenuItem>
              {PROJECT_PIPELINE_STAGES.map((stage) => (
                <MenuItem key={stage.key} value={stage.key} sx={{ fontSize: 13 }}>
                  Stage: {stage.label}
                </MenuItem>
              ))}
            </Select>

            <Select
              size="small"
              value={selectedSection}
              onChange={(e) => { setSelectedSection(e.target.value); setPage(0); }}
              displayEmpty
              sx={{
                minWidth: 130,
                borderRadius: "10px",
                fontSize: 13,
                fontWeight: 700,
                "& .MuiOutlinedInput-notchedOutline": { borderColor: isDark ? "rgba(255,255,255,0.12)" : BORDER }, bgcolor: isDark ? "#0e1220" : "#fff", color: isDark ? "#f8fafc" : "inherit",
              }}
            >
              <MenuItem value="all" sx={{ fontSize: 13 }}>Section: All</MenuItem>
              {sectionOptions.map((section) => (
                <MenuItem key={section} value={section} sx={{ fontSize: 13 }}>
                  Section: {section}
                </MenuItem>
              ))}
            </Select>

            <Button
              size="small"
              variant="outlined"
              onClick={(e) => setFilterAnchor(e.currentTarget)}
              startIcon={<FilterAlt sx={{ fontSize: 17 }} />}
              sx={{
                borderRadius: "10px", fontWeight: 700, fontSize: 13, px: 1.75,
                borderColor: activeFilterCount ? "#3b82f6" : (isDark ? "rgba(255,255,255,0.15)" : BORDER),
                color: activeFilterCount ? "#60a5fa" : (isDark ? "#f8fafc" : alpha(NAVY, 0.7)),
                bgcolor: activeFilterCount ? (isDark ? "rgba(59,130,246,0.15)" : alpha(NAVY, 0.05)) : "transparent",
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
              PaperProps={{ sx: { borderRadius: "16px", border: isDark ? "1px solid rgba(255,255,255,0.08)" : `1px solid ${BORDER}`, bgcolor: isDark ? "#0b0e1a" : "#fff", boxShadow: isDark ? "0 16px 40px rgba(0,0,0,0.5)" : "0 16px 40px rgba(15,31,61,0.14)", mt: 1 } }}
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
                label={getPipelineStageMeta(selectedStage).label}
                onDelete={() => { setSelectedStage("all"); setPage(0); }}
                size="small"
                sx={{
                  bgcolor: alpha(getPipelineStageMeta(selectedStage).color, 0.1),
                  color: getPipelineStageMeta(selectedStage).color,
                  fontWeight: 700,
                }}
              />
            )}
            {selectedProjectType !== "all" && (
              <Chip
                label={getProjectTypeMeta(selectedProjectType).label}
                onDelete={() => { setSelectedProjectType("all"); setPage(0); }}
                size="small"
                sx={{
                  bgcolor: alpha(getProjectTypeMeta(selectedProjectType).color, 0.1),
                  color: getProjectTypeMeta(selectedProjectType).color,
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
              <b style={{ color: isDark ? "#f8fafc" : NAVY }}>{filtered.length}</b>{" "}
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
                .filter((s) => selectedStage === "all" || selectedStage === s.key || (selectedStage === "ready_handover" && s.key === "disbursement"))
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
              Try adjusting filters, convert a lead, or create a project from the APK.
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
              sx={{ borderTop: isDark ? "1px solid rgba(255,255,255,0.08)" : `1px solid ${BORDER}`, color: isDark ? "#f8fafc" : alpha(NAVY, 0.7), bgcolor: isDark ? "#0b0e1a" : "#fff" }}
            />
          </>
        )}

        {/* Registration table */}
        {!loading && false && viewMode === "table" && showRegistrationRows && (
          <>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: isDark ? "#0e1220" : "#fafbfe" }}>
                    {["Customer", "Date", "Solar Requirement", "Status", "Lead Status", "Assigned To", "Actions"].map((col, i) => (
                      <TableCell
                        key={i}
                        align={i === 6 ? "right" : "left"}
                        sx={{
                          fontWeight: 800, fontSize: 12,
                          color: isDark ? "#94a3b8" : alpha(NAVY, 0.6),
                          textTransform: "uppercase",
                          letterSpacing: "0.06em",
                          borderBottom: isDark ? "1px solid rgba(255,255,255,0.08)" : `1px solid ${BORDER}`,
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
                          bgcolor: highlight ? (isDark ? "rgba(16,185,129,0.1)" : alpha(EMERALD, 0.04)) : "transparent",
                          "&:hover": { bgcolor: isDark ? "rgba(255,255,255,0.04)" : alpha(NAVY, 0.02) },
                          "& td": { borderBottom: isDark ? "1px solid rgba(255,255,255,0.06)" : `1px solid ${alpha(BORDER, 0.6)}` },
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
                              <Typography variant="subtitle2" fontWeight={800} color={isDark ? "#f8fafc" : NAVY}>
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
              sx={{ borderTop: isDark ? "1px solid rgba(255,255,255,0.08)" : `1px solid ${BORDER}`, color: isDark ? "#f8fafc" : alpha(NAVY, 0.7), bgcolor: isDark ? "#0b0e1a" : "#fff" }}
            />
          </>
        )}

        {/* Table */}
        {!loading && viewMode === "table" && !showRegistrationRows && filtered.length > 0 && (
          <>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: isDark ? "#0e1220" : "#fafbfe" }}>
                    {["Project", "Stage", "Next Action", "Amount", "Actions"].map((col, i) => (
                      <TableCell
                        key={i}
                        align={i === 4 ? "right" : "left"}
                        sx={{
                          fontWeight: 800, fontSize: 12,
                          color: isDark ? "#94a3b8" : alpha(NAVY, 0.6),
                          textTransform: "uppercase",
                          letterSpacing: "0.06em",
                          borderBottom: isDark ? "1px solid rgba(255,255,255,0.08)" : `1px solid ${BORDER}`,
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
                          bgcolor: highlight ? (isDark ? "rgba(16,185,129,0.1)" : alpha(EMERALD, 0.04)) : "transparent",
                          "&:hover": { bgcolor: isDark ? "rgba(255,255,255,0.04)" : alpha(NAVY, 0.02) },
                          "& td": { borderBottom: isDark ? "1px solid rgba(255,255,255,0.06)" : `1px solid ${alpha(BORDER, 0.6)}` },
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
                            <Box sx={{ minWidth: 0 }}>
                              <Stack direction="row" spacing={0.75} alignItems="center">
                                <Box sx={{ minWidth: 0 }}>
                                  <Typography variant="subtitle2" fontWeight={800} color={isDark ? "#f8fafc" : NAVY} noWrap>
                                    {project.projectCode || "Project"}
                                  </Typography>
                                  <Typography variant="caption" fontWeight={800} color={stage.color} noWrap sx={{ display: "block", mt: 0.15 }}>
                                    {getProjectName(project)}
                                  </Typography>
                                </Box>
                                {highlight && <Chip label="New" size="small" color="success" sx={{ height: 18, fontSize: 10 }} />}
                                {stuck && (
                                  <Tooltip title="No activity for 5+ days">
                                    <Box sx={{ width: 7, height: 7, borderRadius: "50%", bgcolor: RED }} />
                                  </Tooltip>
                                )}
                              </Stack>
                              <Typography variant="body2" fontWeight={600} color={isDark ? "#f8fafc" : alpha(NAVY, 0.75)}>
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
                          <Typography variant="body2" fontWeight={600} color={isDark ? "#f8fafc" : NAVY} sx={{ mb: 0.25 }}>
                            {NEXT_ACTIONS[project.currentStage]}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Updated {formatDate(project.updatedAt)}
                          </Typography>
                        </TableCell>

                        {/* Amount */}
                        <TableCell>
                          <Typography variant="subtitle2" fontWeight={800} color={isDark ? "#f8fafc" : NAVY}>
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
              sx={{ borderTop: isDark ? "1px solid rgba(255,255,255,0.08)" : `1px solid ${BORDER}`, color: isDark ? "#f8fafc" : alpha(NAVY, 0.7), bgcolor: isDark ? "#0b0e1a" : "#fff" }}
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
