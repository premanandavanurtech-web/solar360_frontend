// pages/TotalVisitsPage.jsx (Redesigned — Clean Modern + Gradient-Heavy)
import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import {
  Box,
  Typography,
  Card,
  Grid,
  Stack,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Snackbar,
  Alert,
  AlertTitle,
  CircularProgress,
  Button,
  Tooltip,
  InputAdornment,
  FormControlLabel,
  Checkbox,
  useTheme,
  useMediaQuery,
  alpha,
  Avatar,
  Divider,
  Paper,
  LinearProgress,
  CardContent,
  Tab,
  Tabs,
  Skeleton,
  FormHelperText,
  Pagination,
  SwipeableDrawer,
  Badge,
  Fab,
  Zoom,
  Fade,
  Slide,
  Collapse,
  BottomNavigation,
  BottomNavigationAction,
} from "@mui/material";
import {
  Edit,
  Visibility,
  Close,
  CheckCircle,
  Search,
  FilterList,
  Clear,
  ArrowUpward,
  ArrowDownward,
  Phone,
  Email,
  Schedule,
  CheckCircleOutline,
  PendingActions,
  Cancel,
  Chat,
  Refresh,
  Tune,
  Download,
  People,
  TrendingUp,
  Warning,
  Info,
  LocationOn,
  Notes,
  CalendarToday,
  AccessTime,
  Person,
  HowToReg,
  SupervisorAccount,
  AdminPanelSettings,
  WorkspacePremium,
  Groups,
  ExpandMore,
  ExpandLess,
  Dashboard,
  FilterAlt,
  Sort,
  ViewList,
  ViewModule,
  DateRange,
  KeyboardArrowLeft,
  KeyboardArrowRight,
  FiberManualRecord,
} from "@mui/icons-material";
import { useAuth } from "../contexts/AuthContext";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { TimePicker } from "@mui/x-date-pickers/TimePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import {
  format,
  isValid,
  parseISO,
  startOfDay,
  endOfDay,
  subDays,
  subWeeks,
  subMonths,
} from "date-fns";
import { useNavigate } from "react-router-dom";
import Save from "@mui/icons-material/Save";

// ========== DESIGN TOKENS ==========
const PRIMARY = "#0f1f3d";
const PRIMARY_2 = "#1a3a6b";
const ACCENT = "#2563eb";
const ACCENT_LIGHT = "#3b82f6";

const GRAD_MAIN = `linear-gradient(135deg, ${PRIMARY} 0%, ${PRIMARY_2} 60%, ${ACCENT} 100%)`;
const GRAD_BLUE = `linear-gradient(135deg, #1e40af 0%, ${ACCENT_LIGHT} 100%)`;
const GRAD_CARD = `linear-gradient(135deg, #f8faff 0%, #eff6ff 100%)`;
const GRAD_DARK = `linear-gradient(135deg, ${PRIMARY} 0%, ${ACCENT} 100%)`;

const ERROR_COLOR = "#f44336";
const ITEMS_PER_PAGE_OPTIONS = [10, 20, 50, 100];
const DEFAULT_ITEMS_PER_PAGE = 10;

const ALLOWED_ROLES = ["Admin_panel", "ZSM", "Incharge", "TEAM"];
const hasAccess = (userRole) => ALLOWED_ROLES.includes(userRole);

// ========== STATUS CONFIG ==========
const STATUS_CONFIG = {
  "Not Assigned": {
    bg: "#f1f5f9",
    color: "#475569",
    gradBg: "linear-gradient(135deg,#f1f5f9,#e2e8f0)",
    border: "#cbd5e1",
    dotColor: "#94a3b8",
    icon: <PendingActions sx={{ fontSize: 15 }} />,
    label: "Not Assigned",
    description: "Visit not yet assigned or scheduled",
    order: 1, progress: 0,
  },
  Scheduled: {
    bg: "#dbeafe",
    color: "#1d4ed8",
    gradBg: "linear-gradient(135deg,#dbeafe,#eff6ff)",
    border: "#bfdbfe",
    dotColor: "#3b82f6",
    icon: <Schedule sx={{ fontSize: 15 }} />,
    label: "Scheduled",
    description: "Visit scheduled for future date",
    order: 2, progress: 25,
  },
  Completed: {
    bg: "#d1fae5",
    color: "#065f46",
    gradBg: "linear-gradient(135deg,#d1fae5,#ecfdf5)",
    border: "#a7f3d0",
    dotColor: "#10b981",
    icon: <CheckCircleOutline sx={{ fontSize: 15 }} />,
    label: "Completed",
    description: "Visit successfully completed",
    order: 3, progress: 100,
  },
  Cancelled: {
    bg: "#fee2e2",
    color: "#991b1b",
    gradBg: "linear-gradient(135deg,#fee2e2,#fef2f2)",
    border: "#fca5a5",
    dotColor: "#ef4444",
    icon: <Cancel sx={{ fontSize: 15 }} />,
    label: "Cancelled",
    description: "Visit cancelled or postponed",
    order: 4, progress: 0,
  },
  "Follow Up": {
    bg: "#fef3c7",
    color: "#92400e",
    gradBg: "linear-gradient(135deg,#fef3c7,#fffbeb)",
    border: "#fde68a",
    dotColor: "#f59e0b",
    icon: <Phone sx={{ fontSize: 15 }} />,
    label: "Follow Up",
    description: "Follow up required",
    order: 5, progress: 50,
  },
};

const FOLLOW_UP_OPTIONS = [
  { value: "Call", label: "Call", icon: <Phone sx={{ fontSize: 15 }} /> },
  { value: "Message", label: "Message", icon: <Chat sx={{ fontSize: 15 }} /> },
  { value: "Note", label: "Note", icon: <Notes sx={{ fontSize: 15 }} /> },
];

const LEAD_STATUS_CONFIG = {
  Visit: {
    bg: "linear-gradient(135deg,#ede9fe,#ddd6fe)", color: "#5b21b6", icon: <Person sx={{ fontSize: 15 }} />,
    label: "Visit", description: "Visit scheduled or completed",
  },
  Registration: {
    bg: "linear-gradient(135deg,#dcfce7,#bbf7d0)", color: "#14532d", icon: <HowToReg sx={{ fontSize: 15 }} />,
    label: "Registration", description: "Lead registered after visit",
  },
  "Missed Leads": {
    bg: "linear-gradient(135deg,#fee2e2,#fecaca)", color: "#7f1d1d", icon: <Warning sx={{ fontSize: 15 }} />,
    label: "Missed", description: "Lead missed or lost",
  },
  Other: {
    bg: "linear-gradient(135deg,#f0fdf4,#dcfce7)", color: "#166534", icon: <Info sx={{ fontSize: 15 }} />,
    label: "Other", description: "Other visit type",
  },
};

const ROLE_CONFIG = {
  Admin_panel: { label: "Admin Panel", icon: <AdminPanelSettings sx={{ fontSize: 15 }} /> },
  ZSM: { label: "Operation Lead", icon: <WorkspacePremium sx={{ fontSize: 15 }} /> },
  Incharge: { label: "Incharge", icon: <SupervisorAccount sx={{ fontSize: 15 }} /> },
  TEAM: { label: "Team Member", icon: <Groups sx={{ fontSize: 15 }} /> },
};

const PERIOD_OPTIONS = [
  { value: "Today", label: "Today" },
  { value: "This Week", label: "This Week" },
  { value: "This Month", label: "This Month" },
  { value: "All", label: "All Time" },
];

const SUMMARY_CARD_CONFIG = [
  {
    key: "overdueVisits",
    label: "Overdue visits",
    subText: "Past visit date · not yet completed",
    icon: <Info />,
    stripGrad: "linear-gradient(90deg,#64748b,#94a3b8)",
    iconBg: "linear-gradient(135deg,#e2e8f0,#cbd5e1)",
    iconColor: "#64748b",
  },
  {
    key: "todayVisits",
    label: "Today's visits",
    subText: "Visits scheduled today · crews on site",
    icon: <CalendarToday />,
    stripGrad: "linear-gradient(90deg,#f97316,#fb923c)",
    iconBg: "linear-gradient(135deg,#ffedd5,#fed7aa)",
    iconColor: "#f97316",
  },
  {
    key: "awaitingApproval",
    label: "Awaiting approval",
    subText: "Completed · awaiting manager approval",
    icon: <CheckCircleOutline />,
    stripGrad: "linear-gradient(90deg,#2563eb,#60a5fa)",
    iconBg: "linear-gradient(135deg,#dbeafe,#bfdbfe)",
    iconColor: "#2563eb",
  },
  {
    key: "unassignedVisits",
    label: "Unassigned",
    subText: "Visits without assigned inspector",
    icon: <SupervisorAccount />,
    stripGrad: "linear-gradient(90deg,#16a34a,#4ade80)",
    iconBg: "linear-gradient(135deg,#dcfce7,#bbf7d0)",
    iconColor: "#16a34a",
  },
];

// ========== HELPERS ==========
const getStatusConfig = (status) =>
  STATUS_CONFIG[status] || {
    bg: "#f1f5f9", color: "#475569", gradBg: "linear-gradient(135deg,#f1f5f9,#e2e8f0)",
    border: "#cbd5e1", dotColor: "#94a3b8",
    icon: <PendingActions sx={{ fontSize: 15 }} />,
    label: status || "Unknown", description: "Unknown status", order: 99, progress: 0,
  };

const getLeadStatusConfig = (status) =>
  LEAD_STATUS_CONFIG[status] || {
    bg: "linear-gradient(135deg,#f1f5f9,#e2e8f0)", color: "#475569",
    icon: <Info sx={{ fontSize: 15 }} />,
    label: status || "Unknown", description: "Unknown",
  };

const getRoleConfig = (role) =>
  ROLE_CONFIG[role] || { label: "Unknown", icon: <Person sx={{ fontSize: 15 }} /> };

const formatDate = (dateString, formatStr = "dd MMM yyyy, hh:mm a") => {
  if (!dateString) return "Not set";
  try {
    const date = parseISO(dateString);
    return isValid(date) ? format(date, formatStr) : "Invalid Date";
  } catch { return "Invalid Date"; }
};

const formatTime = (timeString) => timeString || "Not set";

const parseVisitTime = (timeString) => {
  if (!timeString) return null;
  const today = new Date();
  const twelveHr = String(timeString).trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (twelveHr) {
    let h = Number(twelveHr[1]);
    const m = Number(twelveHr[2]);
    const mer = twelveHr[3].toUpperCase();
    if (mer === "PM" && h < 12) h += 12;
    if (mer === "AM" && h === 12) h = 0;
    return new Date(today.getFullYear(), today.getMonth(), today.getDate(), h, m, 0, 0);
  }
  const twentyFourHr = String(timeString).trim().match(/^(\d{1,2}):(\d{2})$/);
  if (twentyFourHr) {
    return new Date(today.getFullYear(), today.getMonth(), today.getDate(),
      Number(twentyFourHr[1]), Number(twentyFourHr[2]), 0, 0);
  }
  return null;
};

const formatVisitTimeForSave = (value) => {
  if (!value || !isValid(value)) return "";
  return format(value, "hh:mm a");
};

const getInitials = (firstName, lastName) =>
  `${firstName?.charAt(0) || ""}${lastName?.charAt(0) || ""}`.toUpperCase();

// ========== STATUS PILL ==========
const StatusPill = ({ status }) => {
  const cfg = getStatusConfig(status);
  return (
    <Box sx={{
      display: "inline-flex", alignItems: "center", gap: "5px",
      px: 1.25, py: 0.5, borderRadius: "20px",
      background: cfg.gradBg,
      border: `1px solid ${cfg.border}`,
      fontSize: "12px", fontWeight: 600, color: cfg.color,
      whiteSpace: "nowrap",
    }}>
      <Box sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: cfg.dotColor, flexShrink: 0 }} />
      {cfg.label}
    </Box>
  );
};

// ========== LEAD PILL ==========
const LeadPill = ({ status }) => {
  const cfg = getLeadStatusConfig(status);
  return (
    <Box sx={{
      display: "inline-flex", alignItems: "center", gap: "5px",
      px: 1, py: 0.4, borderRadius: "20px",
      background: cfg.bg, color: cfg.color,
      fontSize: "11.5px", fontWeight: 600,
    }}>
      {React.cloneElement(cfg.icon, { sx: { fontSize: 13 } })}
      {cfg.label}
    </Box>
  );
};

// ========== MOBILE FILTER DRAWER ==========
const MobileFilterDrawer = ({
  open, onClose, period, setPeriod, statusFilter, setStatusFilter,
  dateFilter, setDateFilter, selectedStatuses, handleStatusCheckboxChange,
  handleClearFilters, dateFilterError, searchQuery, setSearchQuery,
  sortConfig, setSortConfig, viewMode, setViewMode, activeFilterCount,
}) => {
  const [expandedSection, setExpandedSection] = useState("search");
  const toggleSection = (s) => setExpandedSection(expandedSection === s ? null : s);

  const sectionStyle = {
    border: `1px solid ${alpha(PRIMARY, 0.1)}`,
    borderRadius: 2, overflow: "hidden", mb: 2,
  };
  const sectionHeaderStyle = {
    p: 2, background: GRAD_CARD,
    display: "flex", justifyContent: "space-between", alignItems: "center",
    cursor: "pointer",
  };

  return (
    <SwipeableDrawer
      anchor="bottom" open={open} onClose={onClose} onOpen={() => {}}
      PaperProps={{ sx: { borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: "90vh", overflow: "hidden" } }}
    >
      <Box>
        <Box sx={{ width: 40, height: 4, bgcolor: "grey.300", borderRadius: 2, mx: "auto", my: 1.5 }} />
        <Box sx={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          px: 3, pb: 2, borderBottom: `1px solid ${alpha(PRIMARY, 0.1)}`,
        }}>
          <Box>
            <Typography variant="h6" fontWeight={700} sx={{ background: GRAD_MAIN, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Filter Visits
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {activeFilterCount} active filter{activeFilterCount !== 1 && "s"}
            </Typography>
          </Box>
          <IconButton onClick={onClose} size="small" sx={{ background: GRAD_CARD, border: `1px solid ${alpha(PRIMARY, 0.1)}` }}>
            <Close />
          </IconButton>
        </Box>

        <Box sx={{ maxHeight: "calc(90vh - 120px)", overflow: "auto", p: 2 }}>
          {/* Search */}
          <Paper elevation={0} sx={sectionStyle}>
            <Box sx={sectionHeaderStyle} onClick={() => toggleSection("search")}>
              <Stack direction="row" spacing={1} alignItems="center">
                <Search sx={{ color: ACCENT, fontSize: 20 }} />
                <Typography variant="subtitle2" fontWeight={600}>Search</Typography>
              </Stack>
              {expandedSection === "search" ? <ExpandLess /> : <ExpandMore />}
            </Box>
            <Collapse in={expandedSection === "search"}>
              <Box sx={{ p: 2 }}>
                <TextField
                  fullWidth size="small"
                  placeholder="Search by name, email, phone, location..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  InputProps={{
                    startAdornment: <InputAdornment position="start"><Search sx={{ fontSize: 18, color: "text.secondary" }} /></InputAdornment>,
                    endAdornment: searchQuery && (
                      <InputAdornment position="end">
                        <IconButton size="small" onClick={() => setSearchQuery("")}><Close fontSize="small" /></IconButton>
                      </InputAdornment>
                    ),
                  }}
                  sx={{ "& .MuiOutlinedInput-root": { borderRadius: "10px" } }}
                />
              </Box>
            </Collapse>
          </Paper>

          {/* Period */}
          <Paper elevation={0} sx={sectionStyle}>
            <Box sx={sectionHeaderStyle} onClick={() => toggleSection("period")}>
              <Stack direction="row" spacing={1} alignItems="center">
                <DateRange sx={{ color: ACCENT, fontSize: 20 }} />
                <Typography variant="subtitle2" fontWeight={600}>Time Period</Typography>
              </Stack>
              {expandedSection === "period" ? <ExpandLess /> : <ExpandMore />}
            </Box>
            <Collapse in={expandedSection === "period"}>
              <Box sx={{ p: 2 }}>
                <Grid container spacing={1}>
                  {PERIOD_OPTIONS.map((opt) => (
                    <Grid item xs={6} key={opt.value}>
                      <Button fullWidth size="small" variant={period === opt.value ? "contained" : "outlined"}
                        onClick={() => setPeriod(opt.value)}
                        sx={{
                          background: period === opt.value ? GRAD_BLUE : "transparent",
                          color: period === opt.value ? "#fff" : ACCENT,
                          borderColor: ACCENT, borderRadius: "20px",
                          boxShadow: period === opt.value ? "0 2px 8px rgba(37,99,235,.25)" : "none",
                          "&:hover": { background: period === opt.value ? GRAD_DARK : alpha(ACCENT, 0.05) },
                        }}>
                        {opt.label}
                      </Button>
                    </Grid>
                  ))}
                </Grid>
              </Box>
            </Collapse>
          </Paper>

          {/* Status */}
          <Paper elevation={0} sx={sectionStyle}>
            <Box sx={sectionHeaderStyle} onClick={() => toggleSection("status")}>
              <Stack direction="row" spacing={1} alignItems="center">
                <FilterAlt sx={{ color: ACCENT, fontSize: 20 }} />
                <Typography variant="subtitle2" fontWeight={600}>Visit Status</Typography>
              </Stack>
              {expandedSection === "status" ? <ExpandLess /> : <ExpandMore />}
            </Box>
            <Collapse in={expandedSection === "status"}>
              <Box sx={{ p: 2 }}>
                <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                  <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
                    sx={{ borderRadius: "10px" }}>
                    <MenuItem value="All">All Statuses</MenuItem>
                    {Object.keys(STATUS_CONFIG).map((s) => (
                      <MenuItem key={s} value={s}>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          {getStatusConfig(s).icon}<span>{s}</span>
                        </Stack>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <Grid container spacing={1}>
                  {Object.keys(STATUS_CONFIG).map((s) => (
                    <Grid item xs={6} key={s}>
                      <FormControlLabel
                        control={
                          <Checkbox checked={selectedStatuses[s]} onChange={() => handleStatusCheckboxChange(s)}
                            size="small" sx={{ color: ACCENT, "&.Mui-checked": { color: ACCENT } }} />
                        }
                        label={<Typography variant="caption">{s}</Typography>}
                      />
                    </Grid>
                  ))}
                </Grid>
              </Box>
            </Collapse>
          </Paper>

          {/* Date Range */}
          <Paper elevation={0} sx={sectionStyle}>
            <Box sx={sectionHeaderStyle} onClick={() => toggleSection("date")}>
              <Stack direction="row" spacing={1} alignItems="center">
                <CalendarToday sx={{ color: ACCENT, fontSize: 20 }} />
                <Typography variant="subtitle2" fontWeight={600}>Custom Date Range</Typography>
              </Stack>
              {expandedSection === "date" ? <ExpandLess /> : <ExpandMore />}
            </Box>
            <Collapse in={expandedSection === "date"}>
              <Box sx={{ p: 2 }}>
                <Stack spacing={2}>
                  <DatePicker label="Start Date" value={dateFilter.startDate}
                    onChange={(v) => setDateFilter((p) => ({ ...p, startDate: v }))}
                    slotProps={{ textField: { fullWidth: true, size: "small", error: !!dateFilterError } }} />
                  <DatePicker label="End Date" value={dateFilter.endDate}
                    onChange={(v) => setDateFilter((p) => ({ ...p, endDate: v }))}
                    slotProps={{ textField: { fullWidth: true, size: "small", error: !!dateFilterError } }} />
                  {dateFilterError && <Alert severity="error" sx={{ fontSize: "0.75rem" }}>{dateFilterError}</Alert>}
                </Stack>
              </Box>
            </Collapse>
          </Paper>
        </Box>

        <Box sx={{ p: 2.5, borderTop: `1px solid ${alpha(PRIMARY, 0.1)}`, bgcolor: "#fff" }}>
          <Stack direction="row" spacing={2}>
            <Button fullWidth variant="outlined" onClick={() => { handleClearFilters(); onClose(); }} startIcon={<Clear />}
              sx={{ borderColor: PRIMARY, color: PRIMARY, borderRadius: "10px" }}>
              Clear All
            </Button>
            <Button fullWidth variant="contained" onClick={onClose}
              sx={{ background: GRAD_MAIN, borderRadius: "10px", boxShadow: "0 2px 10px rgba(15,31,61,.25)", "&:hover": { background: GRAD_DARK } }}>
              Apply Filters
            </Button>
          </Stack>
        </Box>
      </Box>
    </SwipeableDrawer>
  );
};

// ========== MOBILE VISIT CARD ==========
const MobileVisitCard = ({ visit, onView, onEdit }) => {
  const [expanded, setExpanded] = useState(false);
  const visitStatusConfig = getStatusConfig(visit.visitStatus);
  const leadStatusConfig = getLeadStatusConfig(visit.status);
  const initials = getInitials(visit.firstName, visit.lastName);

  return (
    <Paper elevation={0} sx={{
      mb: 1.5, borderRadius: 3,
      border: `1px solid ${alpha(PRIMARY, 0.1)}`,
      overflow: "hidden",
      transition: "box-shadow .2s",
      "&:hover": { boxShadow: "0 4px 20px rgba(15,31,61,.1)" },
    }}>
      <Box sx={{ height: 3, background: visitStatusConfig.gradBg.replace("135deg", "90deg") }} />
      <Box sx={{ p: 2 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 1.5 }}>
          <Box sx={{ display: "flex", gap: 1.5, alignItems: "center" }}>
            <Avatar sx={{
              background: GRAD_BLUE, color: "#fff", width: 44, height: 44, fontWeight: 600, fontSize: "14px",
            }}>
              {initials}
            </Avatar>
            <Box>
              <Typography variant="subtitle1" fontWeight={700} sx={{ color: PRIMARY }}>
                {visit.firstName} {visit.lastName}
              </Typography>
              <Typography variant="caption" color="text.secondary">ID: {visit._id?.slice(-8) || "N/A"}</Typography>
            </Box>
          </Box>
          <IconButton size="small" onClick={() => setExpanded(!expanded)}
            sx={{ background: GRAD_CARD, border: `1px solid ${alpha(PRIMARY, 0.1)}`, transition: "transform .3s", transform: expanded ? "rotate(180deg)" : "none" }}>
            <ExpandMore sx={{ fontSize: 18 }} />
          </IconButton>
        </Box>

        <Grid container spacing={1} sx={{ mb: 1.5 }}>
          <Grid item xs={6}>
            <Stack direction="row" spacing={0.5} alignItems="center">
              <Phone sx={{ fontSize: 13, color: alpha(PRIMARY, 0.5) }} />
              <Typography variant="caption" noWrap>{visit.phone || "No phone"}</Typography>
            </Stack>
          </Grid>
          <Grid item xs={6}>
            <Stack direction="row" spacing={0.5} alignItems="center">
              <Email sx={{ fontSize: 13, color: alpha(PRIMARY, 0.5) }} />
              <Typography variant="caption" noWrap>{visit.email || "No email"}</Typography>
            </Stack>
          </Grid>
        </Grid>

        <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mb: 0.5 }}>
          <CalendarToday sx={{ fontSize: 13, color: alpha(PRIMARY, 0.5) }} />
          <Typography variant="body2" fontWeight={500}>
            {visit.visitDate ? formatDate(visit.visitDate, "dd MMM yyyy") : formatDate(visit.createdAt, "dd MMM yyyy")}
          </Typography>
          <FiberManualRecord sx={{ fontSize: 4, color: "text.disabled" }} />
          <AccessTime sx={{ fontSize: 13, color: alpha(PRIMARY, 0.5) }} />
          <Typography variant="body2" fontWeight={500}>
            {visit.visitTime ? formatTime(visit.visitTime) : formatDate(visit.createdAt, "hh:mm a")}
          </Typography>
        </Stack>

        {visit.visitLocation && (
          <Stack direction="row" spacing={0.5} alignItems="flex-start" sx={{ mb: 1.5 }}>
            <LocationOn sx={{ fontSize: 13, color: alpha(PRIMARY, 0.5), mt: 0.3 }} />
            <Typography variant="caption" color="text.secondary" noWrap>{visit.visitLocation}</Typography>
          </Stack>
        )}

        <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap" }}>
          <StatusPill status={visit.visitStatus} />
          <LeadPill status={visit.status} />
        </Box>

        <Collapse in={expanded}>
          <Box sx={{ mt: 2, pt: 2, borderTop: `1px solid ${alpha(PRIMARY, 0.08)}` }}>
            {(visit.visitNotes || visit.remarks) && (
              <Box sx={{ mb: 1.5, p: 1.5, background: GRAD_CARD, borderRadius: 2, border: `1px solid ${alpha(ACCENT, 0.15)}` }}>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
                  {visit.status === "Other" ? "Description" : "Notes"}
                </Typography>
                <Typography variant="body2" sx={{ wordBreak: "break-word" }}>
                  {visit.visitNotes || visit.remarks}
                </Typography>
              </Box>
            )}
            <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
              <Button fullWidth size="small" variant="contained" startIcon={<Visibility sx={{ fontSize: 15 }} />}
                onClick={() => onView(visit)}
                sx={{ background: GRAD_MAIN, borderRadius: "10px", boxShadow: "0 2px 8px rgba(15,31,61,.2)", fontSize: "12px", "&:hover": { background: GRAD_DARK } }}>
                View
              </Button>
              <Button fullWidth size="small" variant="outlined" startIcon={<Edit sx={{ fontSize: 15 }} />}
                onClick={() => onEdit(visit)}
                sx={{ borderColor: ACCENT, color: ACCENT, borderRadius: "10px", fontSize: "12px", "&:hover": { background: alpha(ACCENT, 0.05) } }}>
                Edit
              </Button>
            </Stack>
          </Box>
        </Collapse>
      </Box>
    </Paper>
  );
};

// ========== VIEW MODAL ==========
const ViewVisitModal = React.memo(({ open, onClose, visit, userRole, showSnackbar }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [activeTab, setActiveTab] = useState(0);
  const userRoleConfig = useMemo(() => getRoleConfig(userRole), [userRole]);
  const visitStatusConfig = useMemo(() => getStatusConfig(visit?.visitStatus), [visit?.visitStatus]);
  const leadStatusConfig = useMemo(() => getLeadStatusConfig(visit?.status), [visit?.status]);

  if (!visit) return null;
  const notesLabel = visit.status === "Other" ? "Description" : "Visit Notes";
  const visitNotes = visit.visitNotes || visit.remarks || "";

  const infoSectionSx = {
    p: 2.5, borderRadius: 3,
    background: GRAD_CARD,
    border: `1px solid ${alpha(ACCENT, 0.18)}`,
    mb: 2,
  };
  const infoSectionTitleSx = {
    display: "flex", alignItems: "center", gap: 1, mb: 2,
    fontSize: "12px", fontWeight: 700, color: ACCENT,
    textTransform: "uppercase", letterSpacing: ".06em",
  };
  const infoRowSx = {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    py: 0.9, borderBottom: `0.5px solid ${alpha(ACCENT, 0.1)}`,
    "&:last-child": { borderBottom: "none", pb: 0 },
  };

  const tabs = [
    {
      label: "Basic Info", icon: <Person sx={{ fontSize: 18 }} />,
      content: (
        <Stack spacing={2}>
          <Box sx={infoSectionSx}>
            <Typography sx={infoSectionTitleSx}><Person sx={{ fontSize: 16 }} /> Personal information</Typography>
            <Stack>
              <Box sx={infoRowSx}>
                <Typography variant="body2" color="text.secondary">Full name</Typography>
                <Typography variant="body2" fontWeight={600}>{visit.firstName} {visit.lastName}</Typography>
              </Box>
              <Box sx={infoRowSx}>
                <Typography variant="body2" color="text.secondary">Email</Typography>
                <Typography variant="body2" sx={{ wordBreak: "break-all" }}>{visit.email || "Not set"}</Typography>
              </Box>
              <Box sx={infoRowSx}>
                <Typography variant="body2" color="text.secondary">Phone</Typography>
                <Typography variant="body2">{visit.phone || "Not set"}</Typography>
              </Box>
            </Stack>
          </Box>
          <Box sx={infoSectionSx}>
            <Typography sx={infoSectionTitleSx}><CalendarToday sx={{ fontSize: 16 }} /> Visit information</Typography>
            <Stack>
              <Box sx={infoRowSx}>
                <Typography variant="body2" color="text.secondary">Visit status</Typography>
                <StatusPill status={visit.visitStatus} />
              </Box>
              <Box sx={infoRowSx}>
                <Typography variant="body2" color="text.secondary">Lead status</Typography>
                <LeadPill status={visit.status} />
              </Box>
              <Box sx={infoRowSx}>
                <Typography variant="body2" color="text.secondary">Visit date</Typography>
                <Typography variant="body2" fontWeight={500}>
                  {visit.visitDate ? formatDate(visit.visitDate, "dd MMM yyyy") : formatDate(visit.createdAt, "dd MMM yyyy")}
                  {" · "}
                  {visit.visitTime ? formatTime(visit.visitTime) : formatDate(visit.createdAt, "hh:mm a")}
                </Typography>
              </Box>
            </Stack>
          </Box>
        </Stack>
      ),
    },
    {
      label: "Location & Notes", icon: <LocationOn sx={{ fontSize: 18 }} />,
      content: (
        <Stack spacing={2}>
          {visit.visitLocation && (
            <Box sx={infoSectionSx}>
              <Typography sx={infoSectionTitleSx}><LocationOn sx={{ fontSize: 16 }} /> Visit location</Typography>
              <Typography variant="body2" sx={{ wordBreak: "break-word" }}>{visit.visitLocation}</Typography>
            </Box>
          )}
          {visitNotes ? (
            <Box sx={infoSectionSx}>
              <Typography sx={infoSectionTitleSx}><Notes sx={{ fontSize: 16 }} /> {notesLabel}</Typography>
              <Typography variant="body2" style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{visitNotes}</Typography>
            </Box>
          ) : (
            <Box sx={infoSectionSx}>
              <Typography variant="body2" color="text.secondary" fontStyle="italic">
                No notes or description provided.
              </Typography>
            </Box>
          )}
        </Stack>
      ),
    },
    {
      label: "Timeline", icon: <AccessTime sx={{ fontSize: 18 }} />,
      content: (
        <Box sx={infoSectionSx}>
          <Typography sx={infoSectionTitleSx}><AccessTime sx={{ fontSize: 16 }} /> Activity timeline</Typography>
          <Stack>
            <Box sx={infoRowSx}>
              <Typography variant="body2" color="text.secondary">Created</Typography>
              <Stack alignItems="flex-end">
                <Typography variant="body2" fontWeight={500}>{formatDate(visit.createdAt, "dd MMM yyyy")}</Typography>
                <Typography variant="caption" color="text.secondary">{formatDate(visit.createdAt, "hh:mm a")}</Typography>
              </Stack>
            </Box>
            <Box sx={infoRowSx}>
              <Typography variant="body2" color="text.secondary">Last updated</Typography>
              <Stack alignItems="flex-end">
                <Typography variant="body2" fontWeight={500}>{formatDate(visit.updatedAt, "dd MMM yyyy")}</Typography>
                <Typography variant="caption" color="text.secondary">{formatDate(visit.updatedAt, "hh:mm a")}</Typography>
              </Stack>
            </Box>
          </Stack>
        </Box>
      ),
    },
  ];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth fullScreen={isMobile}
      PaperProps={{ sx: { borderRadius: isMobile ? 0 : "20px", maxHeight: isMobile ? "100%" : "90vh", margin: isMobile ? 0 : 3 } }}
      TransitionComponent={isMobile ? Slide : Fade} transitionDuration={300}>
      <DialogTitle sx={{ background: GRAD_MAIN, color: "white", pb: 2, px: { xs: 2, sm: 3 } }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Box display="flex" alignItems="center" gap={2}>
            <Avatar sx={{
              background: "rgba(255,255,255,0.2)", border: "2px solid rgba(255,255,255,0.35)",
              color: "#fff", width: { xs: 40, sm: 48 }, height: { xs: 40, sm: 48 }, fontWeight: 600,
            }}>
              {getInitials(visit.firstName, visit.lastName)}
            </Avatar>
            <Box>
              <Typography variant="h6" fontWeight={700} sx={{ fontSize: { xs: "1rem", sm: "1.2rem" } }}>
                {visit.firstName} {visit.lastName}
              </Typography>
              <Typography variant="caption" sx={{ opacity: 0.8 }}>
                Visit Details · ID: {visit._id?.slice(-8)}
                {visit.status === "Other" && " · Other Visit"}
              </Typography>
            </Box>
          </Box>
          <IconButton onClick={onClose} size="small"
            sx={{ color: "white", background: "rgba(255,255,255,0.15)", "&:hover": { background: "rgba(255,255,255,0.25)" } }}>
            <Close />
          </IconButton>
        </Stack>
      </DialogTitle>

      <DialogContent sx={{ p: 0 }}>
        <Box sx={{ borderBottom: 1, borderColor: "divider", background: GRAD_CARD }}>
          <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} variant="scrollable" scrollButtons="auto"
            sx={{
              "& .MuiTab-root": { minHeight: { xs: 48, sm: 54 }, fontSize: { xs: "0.75rem", sm: "0.85rem" }, fontWeight: 600, textTransform: "none" },
              "& .MuiTabs-indicator": { background: GRAD_BLUE, height: 3, borderRadius: "3px 3px 0 0" },
            }}>
            {tabs.map((tab, i) => (
              <Tab key={i} icon={tab.icon} label={tab.label} />
            ))}
          </Tabs>
        </Box>
        <Box sx={{ p: { xs: 2, sm: 3 }, maxHeight: { xs: "calc(100vh - 180px)", sm: "60vh" }, overflow: "auto" }}>
          {tabs[activeTab].content}
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: { xs: 2, sm: 3 }, pt: { xs: 1.5, sm: 2 }, borderTop: 1, borderColor: "divider", background: GRAD_CARD }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" width="100%">
          <Chip
            label={userRoleConfig.label} icon={userRoleConfig.icon} size="small"
            sx={{ background: "linear-gradient(135deg,#dbeafe,#eff6ff)", color: ACCENT, border: `1px solid ${alpha(ACCENT, 0.2)}`, fontWeight: 600 }}
          />
          <Button onClick={onClose} variant="contained"
            sx={{ background: GRAD_MAIN, borderRadius: "10px", boxShadow: "0 2px 8px rgba(15,31,61,.2)", "&:hover": { background: GRAD_DARK } }}>
            Close
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
});
ViewVisitModal.displayName = "ViewVisitModal";

// ========== EDIT MODAL ==========
const EditVisitModal = React.memo(({ open, onClose, visit, onSave, userRole, showSnackbar, updating }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const { fetchAPI } = useAuth();

  const [editForm, setEditForm] = useState({
    visitStatus: "Not Assigned", visitDate: null, visitTime: null,
    visitLocation: "", status: "Visit", visitNotes: "",
    followUpAction: "", followUpNotes: "",
    locationImage: null, locationImagePreview: null,
  });
  const [validationErrors, setValidationErrors] = useState({});

  useEffect(() => {
    if (open && visit) {
      setEditForm({
        visitStatus: visit.visitStatus || "Not Assigned",
        visitDate: visit.visitDate && isValid(parseISO(visit.visitDate)) ? parseISO(visit.visitDate) : null,
        visitTime: parseVisitTime(visit.visitTime),
        visitLocation: visit.visitLocation || "",
        status: visit.status || "Visit",
        visitNotes: visit.visitNotes || "",
        followUpAction: visit.followUpAction || "",
        followUpNotes: visit.followUpNotes || "",
        locationImage: null, locationImagePreview: visit.locationImageUrl || null,
      });
      setValidationErrors({});
    }
  }, [open, visit]);

  const handleLocationImageChange = useCallback((event) => {
    const file = event.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { showSnackbar("Image must be under 5MB", "error"); return; }
    if (!["image/jpeg", "image/jpg", "image/png"].includes(file.type)) { showSnackbar("Only JPG and PNG allowed", "error"); return; }
    setEditForm((prev) => ({ ...prev, locationImage: file, locationImagePreview: URL.createObjectURL(file) }));
  }, [showSnackbar]);

  const validateForm = useCallback(() => {
    const errors = {};
    if (!editForm.visitStatus) errors.visitStatus = "Visit status is required";
    if (["Scheduled", "Follow Up"].includes(editForm.visitStatus) && !editForm.visitDate) errors.visitDate = "Visit date is required";
    if (["Scheduled", "Follow Up"].includes(editForm.visitStatus) && !editForm.visitTime) errors.visitTime = "Visit time is required";
    if (editForm.visitStatus === "Follow Up" && !editForm.followUpAction) errors.followUpAction = "Follow up type is required";
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  }, [editForm]);

  const handleSubmit = useCallback(async () => {
    if (!validateForm()) { showSnackbar("Please fix the errors in the form", "error"); return; }
    try {
      let body, headers = { "Content-Type": "application/json" };
      const payload = {
        visitStatus: editForm.visitStatus,
        ...(editForm.visitDate && { visitDate: format(editForm.visitDate, "yyyy-MM-dd") }),
        ...(editForm.visitTime && { visitTime: formatVisitTimeForSave(editForm.visitTime) }),
        ...(editForm.visitLocation && { visitLocation: editForm.visitLocation.trim() }),
        status: editForm.status,
        ...(editForm.visitNotes && { visitNotes: editForm.visitNotes.trim() }),
        followUpAction: editForm.visitStatus === "Follow Up" ? editForm.followUpAction : "",
        followUpNotes: editForm.visitStatus === "Follow Up" ? editForm.followUpNotes.trim() : "",
        followUpDate: editForm.visitStatus === "Follow Up" && editForm.visitDate && editForm.visitTime
          ? new Date(editForm.visitDate.getFullYear(), editForm.visitDate.getMonth(), editForm.visitDate.getDate(),
              editForm.visitTime.getHours(), editForm.visitTime.getMinutes(), 0, 0).toISOString()
          : null,
      };
      if (editForm.locationImage) {
        const formData = new FormData();
        Object.entries(payload).forEach(([k, v]) => formData.append(k, v));
        formData.append("locationImage", editForm.locationImage);
        body = formData; headers = {};
      } else {
        body = JSON.stringify(payload);
      }
      const response = await fetchAPI(`/lead/updateLead/${visit._id}`, { method: "PUT", headers, body });
      if (response?.success) { showSnackbar("Visit updated successfully", "success"); onSave(response.result); onClose(); }
      else throw new Error(response?.message || "Update failed");
    } catch (error) {
      console.error("Update error:", error);
      showSnackbar(error.message || "Update failed", "error");
    }
  }, [editForm, validateForm, visit, fetchAPI, showSnackbar, onSave, onClose]);

  const handleChange = useCallback((field) => (event) => {
    setEditForm((prev) => ({ ...prev, [field]: event.target.value }));
    if (validationErrors[field]) setValidationErrors((prev) => ({ ...prev, [field]: "" }));
  }, [validationErrors]);

  if (!visit) return null;
  const notesLabel = visit.status === "Other" ? "Description" : "Visit Notes";
  const notesPlaceholder = visit.status === "Other" ? "Add or update the description for this visit" : "Add any notes related to this visit";

  const fieldSx = { "& .MuiOutlinedInput-root": { borderRadius: "10px" } };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth fullScreen={isMobile}
      PaperProps={{ sx: { borderRadius: isMobile ? 0 : "20px", margin: isMobile ? 0 : 3 } }}
      TransitionComponent={isMobile ? Slide : Fade} transitionDuration={300}>
      <DialogTitle sx={{ background: GRAD_CARD, borderBottom: `1px solid ${alpha(ACCENT, 0.15)}`, pb: 2, px: { xs: 2, sm: 3 } }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Box display="flex" alignItems="center" gap={1.5}>
            <Box sx={{
              width: 44, height: 44, borderRadius: "11px",
              background: GRAD_BLUE, color: "#fff",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 4px 12px rgba(37,99,235,.3)",
            }}>
              <Edit sx={{ fontSize: 22 }} />
            </Box>
            <Box>
              <Typography variant="h6" fontWeight={700} sx={{ fontSize: { xs: "1rem", sm: "1.1rem" } }}>Edit Visit</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: "0.75rem", sm: "0.85rem" } }}>
                {visit.firstName} {visit.lastName}{visit.status === "Other" && " · Other Visit"}
              </Typography>
            </Box>
          </Box>
          <IconButton onClick={onClose} size="small"
            sx={{ background: alpha(PRIMARY, 0.06), "&:hover": { background: alpha(PRIMARY, 0.12) } }}>
            <Close />
          </IconButton>
        </Stack>
      </DialogTitle>

      <DialogContent sx={{ py: { xs: 2, sm: 3 }, px: { xs: 2, sm: 3 } }}>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <FormControl fullWidth size="small" error={!!validationErrors.visitStatus} sx={fieldSx}>
            <InputLabel>Visit Status</InputLabel>
            <Select value={editForm.visitStatus} label="Visit Status" onChange={handleChange("visitStatus")}>
              {Object.keys(STATUS_CONFIG).map((s) => (
                <MenuItem key={s} value={s}>
                  <Stack direction="row" alignItems="center" spacing={1.5}>
                    {getStatusConfig(s).icon}<span>{s}</span>
                  </Stack>
                </MenuItem>
              ))}
            </Select>
            {validationErrors.visitStatus && <FormHelperText>{validationErrors.visitStatus}</FormHelperText>}
          </FormControl>

          <DatePicker label="Visit Date" value={editForm.visitDate}
            onChange={(v) => setEditForm((p) => ({ ...p, visitDate: v }))}
            slotProps={{ textField: { fullWidth: true, size: "small", sx: fieldSx, error: !!validationErrors.visitDate, helperText: validationErrors.visitDate } }} />

          <TimePicker label="Visit Time" value={editForm.visitTime} ampm
            onChange={(v) => { setEditForm((p) => ({ ...p, visitTime: v })); if (validationErrors.visitTime) setValidationErrors((p) => ({ ...p, visitTime: "" })); }}
            slotProps={{ textField: { fullWidth: true, size: "small", sx: fieldSx, error: !!validationErrors.visitTime, helperText: validationErrors.visitTime } }} />

          <TextField label="Visit Location" value={editForm.visitLocation} onChange={handleChange("visitLocation")}
            multiline rows={isMobile ? 2 : 3} fullWidth size="small" placeholder="Enter visit location address" sx={fieldSx} />

          <TextField label={notesLabel} value={editForm.visitNotes} onChange={handleChange("visitNotes")}
            multiline rows={isMobile ? 2 : 3} fullWidth size="small" placeholder={notesPlaceholder} sx={fieldSx} />

          {editForm.visitStatus === "Follow Up" && (
            <>
              <FormControl fullWidth size="small" error={!!validationErrors.followUpAction} sx={fieldSx}>
                <InputLabel>Follow Up Type</InputLabel>
                <Select value={editForm.followUpAction} label="Follow Up Type" onChange={handleChange("followUpAction")}>
                  {FOLLOW_UP_OPTIONS.map((opt) => (
                    <MenuItem key={opt.value} value={opt.value}>
                      <Stack direction="row" alignItems="center" spacing={1.5}>{opt.icon}<span>{opt.label}</span></Stack>
                    </MenuItem>
                  ))}
                </Select>
                {validationErrors.followUpAction && <FormHelperText>{validationErrors.followUpAction}</FormHelperText>}
              </FormControl>

              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {FOLLOW_UP_OPTIONS.map((opt) => {
                  const isActive = editForm.followUpAction === opt.value;
                  return (
                    <Box key={opt.value} onClick={() => {
                      setEditForm((p) => ({ ...p, followUpAction: opt.value }));
                      if (validationErrors.followUpAction) setValidationErrors((p) => ({ ...p, followUpAction: "" }));
                    }} sx={{
                      display: "flex", alignItems: "center", gap: 0.75,
                      px: 1.5, py: 0.75, borderRadius: "20px", cursor: "pointer",
                      border: `1px solid ${isActive ? "transparent" : alpha(PRIMARY, 0.2)}`,
                      background: isActive ? GRAD_BLUE : "transparent",
                      color: isActive ? "#fff" : "text.secondary",
                      fontSize: "13px", fontWeight: 500,
                      boxShadow: isActive ? "0 2px 8px rgba(37,99,235,.25)" : "none",
                      transition: "all .15s",
                    }}>
                      {React.cloneElement(opt.icon, { sx: { fontSize: 14, color: "inherit" } })}
                      {opt.label}
                    </Box>
                  );
                })}
              </Stack>

              <TextField label="Follow Up Details" value={editForm.followUpNotes} onChange={handleChange("followUpNotes")}
                multiline rows={isMobile ? 2 : 3} fullWidth size="small" placeholder="Add follow up details" sx={fieldSx} />

              <Alert severity="info" sx={{
                background: "linear-gradient(135deg,#dbeafe,#eff6ff)",
                border: `1px solid ${alpha(ACCENT, 0.2)}`, borderRadius: "10px",
                color: "#1d4ed8", "& .MuiAlert-icon": { color: ACCENT },
              }}>
                Follow up reminder will use the visit date and visit time.
              </Alert>
            </>
          )}

          {editForm.visitStatus === "Completed" && (
            <Box>
              <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1, color: PRIMARY }}>
                Location Image
                <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>(JPG/PNG, max 5MB)</Typography>
              </Typography>
              {editForm.locationImagePreview ? (
                <Box>
                  <Box component="img" src={editForm.locationImagePreview} alt="Location"
                    sx={{ width: "100%", maxHeight: 200, objectFit: "cover", borderRadius: 2, border: `1px solid ${alpha(ACCENT, 0.2)}`, display: "block" }} />
                  <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                    <Button size="small" variant="outlined" component="label"
                      sx={{ borderColor: ACCENT, color: ACCENT, flex: 1, borderRadius: "8px" }}>
                      Change Image
                      <input type="file" hidden accept="image/jpeg,image/jpg,image/png" onChange={handleLocationImageChange} />
                    </Button>
                    <Button size="small" variant="outlined"
                      onClick={() => setEditForm((p) => ({ ...p, locationImage: null, locationImagePreview: null }))}
                      sx={{ borderColor: "error.main", color: "error.main", flex: 1, borderRadius: "8px" }}>
                      Remove
                    </Button>
                  </Stack>
                </Box>
              ) : (
                <Box component="label" sx={{
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 1,
                  border: "2px dashed", borderColor: alpha(ACCENT, 0.3), borderRadius: 2,
                  p: 3, cursor: "pointer", background: GRAD_CARD,
                  "&:hover": { borderColor: ACCENT, background: alpha(ACCENT, 0.04) }, transition: "all .2s",
                }}>
                  <input type="file" hidden accept="image/jpeg,image/jpg,image/png" onChange={handleLocationImageChange} />
                  <LocationOn sx={{ fontSize: 36, color: alpha(ACCENT, 0.5) }} />
                  <Typography variant="body2" color="text.secondary">Click to upload location photo</Typography>
                  <Typography variant="caption" color="text.disabled">JPG or PNG, max 5MB</Typography>
                </Box>
              )}
            </Box>
          )}

          <FormControl fullWidth size="small" sx={fieldSx}>
            <InputLabel>Lead Status</InputLabel>
            <Select value={editForm.status} label="Lead Status" onChange={handleChange("status")}>
              {Object.keys(LEAD_STATUS_CONFIG).map((s) => (
                <MenuItem key={s} value={s}>
                  <Stack direction="row" alignItems="center" spacing={1.5}>
                    {getLeadStatusConfig(s).icon}<span>{s}</span>
                  </Stack>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>
      </DialogContent>

      <DialogActions sx={{
        p: { xs: 2, sm: 3 }, pt: { xs: 1.5, sm: 2 }, borderTop: 1, borderColor: "divider",
        gap: 1.5, flexDirection: { xs: "column", sm: "row" }, background: GRAD_CARD,
      }}>
        <Button onClick={onClose} variant="outlined" fullWidth={isMobile}
          sx={{ borderColor: alpha(PRIMARY, 0.3), color: PRIMARY, borderRadius: "10px", "&:hover": { background: alpha(PRIMARY, 0.04) } }}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} variant="contained" fullWidth={isMobile} disabled={updating}
          startIcon={updating ? <CircularProgress size={16} sx={{ color: "#fff" }} /> : <Save />}
          sx={{ background: GRAD_MAIN, borderRadius: "10px", boxShadow: "0 2px 10px rgba(15,31,61,.25)", "&:hover": { background: GRAD_DARK } }}>
          {updating ? "Saving..." : "Save Changes"}
        </Button>
      </DialogActions>
    </Dialog>
  );
});
EditVisitModal.displayName = "EditVisitModal";

// ========== LOADING SKELETON ==========
const LoadingSkeleton = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  return (
    <Box sx={{ p: { xs: 2, sm: 3 } }}>
      <Skeleton variant="rectangular" height={90} sx={{ borderRadius: 3, mb: 2 }} />
      <Grid container spacing={isMobile ? 1.5 : 2} sx={{ mb: 3 }}>
        {[1, 2, 3, 4].map((i) => <Grid item xs={6} sm={6} md={3} key={i}><Skeleton variant="rectangular" height={120} sx={{ borderRadius: 3 }} /></Grid>)}
      </Grid>
      <Skeleton variant="rectangular" height={isMobile ? 400 : 500} sx={{ borderRadius: 3, mb: 2 }} />
      <Skeleton variant="rectangular" height={56} sx={{ borderRadius: 2 }} />
    </Box>
  );
};

// ========== EMPTY STATE ==========
const EmptyState = ({ onClearFilters, hasFilters }) => (
  <Box sx={{ textAlign: "center", py: 8, px: 2 }}>
    <Box sx={{
      width: 100, height: 100, borderRadius: "50%",
      background: GRAD_CARD, border: `1px solid ${alpha(ACCENT, 0.2)}`,
      display: "flex", alignItems: "center", justifyContent: "center",
      mx: "auto", mb: 3,
    }}>
      <Search sx={{ fontSize: 44, color: alpha(ACCENT, 0.5) }} />
    </Box>
    <Typography variant="h6" fontWeight={700} gutterBottom sx={{ color: PRIMARY }}>No visits found</Typography>
    <Typography variant="body2" color="text.secondary" sx={{ mb: 3, maxWidth: 380, mx: "auto" }}>
      {hasFilters ? "No visits match your current filters. Try adjusting your search criteria." : "No visits have been scheduled yet."}
    </Typography>
    {hasFilters && (
      <Button variant="contained" onClick={onClearFilters} startIcon={<Clear />}
        sx={{ background: GRAD_MAIN, borderRadius: "10px", boxShadow: "0 2px 10px rgba(15,31,61,.2)", "&:hover": { background: GRAD_DARK } }}>
        Clear All Filters
      </Button>
    )}
  </Box>
);

// ========== MAIN COMPONENT ==========
export default function TotalVisitsPage() {
  const theme = useTheme();
  const navigate = useNavigate();
  const { fetchAPI, getUserRole } = useAuth();
  const userRole = getUserRole();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const [period, setPeriod] = useState("All");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
  const [allVisits, setAllVisits] = useState([]);
  const [summary, setSummary] = useState({ overdueVisits: 0, todayVisits: 0, awaitingApproval: 0, unassignedVisits: 0, totalVisits: 0, conversionRate: 0 });
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [dateFilter, setDateFilter] = useState({ startDate: null, endDate: null });
  const [dateFilterError, setDateFilterError] = useState("");
  const [selectedStatuses, setSelectedStatuses] = useState(
    Object.keys(STATUS_CONFIG).reduce((acc, s) => { acc[s] = true; return acc; }, {})
  );
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(isMobile ? 10 : DEFAULT_ITEMS_PER_PAGE);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedVisit, setSelectedVisit] = useState(null);
  const [updating, setUpdating] = useState(false);
  const [viewMode, setViewMode] = useState(isMobile ? "card" : "table");
  const containerRef = useRef(null);

  const showSnackbar = useCallback((message, severity = "success") => setSnackbar({ open: true, message, severity }), []);

  const fetchVisitsData = useCallback(async () => {
    try {
      setLoading(true); setError(null);
      const params = new URLSearchParams();
      const today = new Date();
      if (period === "Today") { params.append("startDate", format(today, "yyyy-MM-dd")); params.append("endDate", format(today, "yyyy-MM-dd")); }
      else if (period === "This Week") { const w = subWeeks(today, 1); params.append("startDate", format(w, "yyyy-MM-dd")); params.append("endDate", format(today, "yyyy-MM-dd")); }
      else if (period === "This Month") { const m = subMonths(today, 1); params.append("startDate", format(m, "yyyy-MM-dd")); params.append("endDate", format(today, "yyyy-MM-dd")); }

      const leadQ = new URLSearchParams(params); leadQ.set("page","1"); leadQ.set("limit","100");
      const visitQ = new URLSearchParams(params); visitQ.set("page","1"); visitQ.set("limit","100"); visitQ.set("isLeadCreate","false");

      const [response, visitResponse] = await Promise.all([
        fetchAPI(`/lead/visitSummary?${leadQ.toString()}`),
        fetchAPI(`/visit?${visitQ.toString()}`),
      ]);

      if (response?.success) {
        const leadVisits = response.result?.visits || response.result || [];
        const rawVisits = visitResponse?.result?.visits || [];
        const otherVisits = rawVisits.map((v) => ({
          _id: v._id, firstName: v.contactPerson || v.user?.firstName || "", lastName: v.contactPerson ? "" : (v.user?.lastName || ""),
          phone: v.phone || "", email: v.email || "", status: "Other",
          visitStatus: v.status || "Completed", visitDate: v.visitDate || v.createdAt,
          visitTime: v.checkInTime || v.createdAt, visitLocation: v.locationName || "",
          visitNotes: v.remarks || "", createdAt: v.createdAt, updatedAt: v.updatedAt,
          assignedUser: v.user ? { _id: v.user._id, firstName: v.user.firstName, lastName: v.user.lastName } : null,
          assignedManager: null,
        }));

        const visits = [...leadVisits, ...otherVisits].sort(
          (a, b) => new Date(b.createdAt || b.visitDate || 0) - new Date(a.createdAt || a.visitDate || 0)
        );

        const totalVisits = visits.length;
        const completedVisits = visits.filter((v) => (v.visitStatus || "").toLowerCase() === "completed").length;
        const conversionRate = totalVisits > 0 ? Math.round((completedVisits / totalVisits) * 100) : 0;
        const todayStart = startOfDay(new Date()); const todayEnd = endOfDay(new Date());

        const overdueVisits = visits.filter((v) => {
          if (!v.visitDate) return false;
          try {
            const d = parseISO(v.visitDate); if (!isValid(d)) return false;
            const ns = (v.visitStatus || "").toLowerCase();
            return d < todayStart && ns !== "completed" && ns !== "cancelled";
          } catch { return false; }
        }).length;

        const todayVisits = visits.filter((v) => {
          if (!v.visitDate) return false;
          try { const d = parseISO(v.visitDate); return isValid(d) && d >= todayStart && d <= todayEnd; } catch { return false; }
        }).length;

        const awaitingApproval = visits.filter((v) => (v.visitStatus || "").toLowerCase() === "completed").length;
        const unassignedVisits = visits.filter((v) => !v.assignedUser && !v.assignedManager).length;

        setAllVisits(visits);
        setSummary({ overdueVisits, todayVisits, awaitingApproval, unassignedVisits, totalVisits, conversionRate });
      } else {
        throw new Error(response?.message || "Failed to fetch visits");
      }
    } catch (err) {
      console.error("Error fetching visits:", err);
      setError(err.message || "Network error. Please try again.");
      showSnackbar(err.message || "Failed to fetch visits data", "error");
      setAllVisits([]);
      setSummary({ overdueVisits: 0, todayVisits: 0, awaitingApproval: 0, unassignedVisits: 0, totalVisits: 0, conversionRate: 0 });
    } finally { setLoading(false); }
  }, [period, fetchAPI, showSnackbar]);

  const applyFilters = useCallback(() => {
    try {
      let filtered = [...allVisits];
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        filtered = filtered.filter((v) =>
          (v.firstName?.toLowerCase() || "").includes(q) || (v.lastName?.toLowerCase() || "").includes(q) ||
          (v.email?.toLowerCase() || "").includes(q) || (v.phone || "").includes(q) ||
          (v.visitLocation?.toLowerCase() || "").includes(q) || (v.visitNotes?.toLowerCase() || "").includes(q)
        );
      }
      if (statusFilter !== "All") filtered = filtered.filter((v) => v.visitStatus === statusFilter);
      if (dateFilter.startDate && isValid(dateFilter.startDate)) {
        const start = startOfDay(new Date(dateFilter.startDate));
        filtered = filtered.filter((v) => { try { const d = parseISO(v.visitDate); return isValid(d) && d >= start; } catch { return false; } });
      }
      if (dateFilter.endDate && isValid(dateFilter.endDate)) {
        const end = endOfDay(new Date(dateFilter.endDate));
        filtered = filtered.filter((v) => { try { const d = parseISO(v.visitDate); return isValid(d) && d <= end; } catch { return false; } });
      }
      const active = Object.keys(selectedStatuses).filter((s) => selectedStatuses[s]);
      if (active.length < Object.keys(STATUS_CONFIG).length) {
        filtered = filtered.filter((v) => active.includes(v.visitStatus || "Not Assigned"));
      }
      if (sortConfig.key) {
        filtered.sort((a, b) => {
          let av = a[sortConfig.key], bv = b[sortConfig.key];
          if (sortConfig.key === "visitDate") { av = av ? parseISO(av) : new Date(0); bv = bv ? parseISO(bv) : new Date(0); }
          else if (sortConfig.key === "firstName") { av = `${a.firstName || ""} ${a.lastName || ""}`.toLowerCase(); bv = `${b.firstName || ""} ${b.lastName || ""}`.toLowerCase(); }
          else if (sortConfig.key === "visitStatus") { av = STATUS_CONFIG[av]?.order || 0; bv = STATUS_CONFIG[bv]?.order || 0; }
          if (av < bv) return sortConfig.direction === "asc" ? -1 : 1;
          if (av > bv) return sortConfig.direction === "asc" ? 1 : -1;
          return 0;
        });
      }
      return filtered;
    } catch (err) { console.error("Filter error:", err); return []; }
  }, [allVisits, searchQuery, statusFilter, dateFilter, selectedStatuses, sortConfig]);

  const filteredVisits = useMemo(() => applyFilters(), [applyFilters]);
  const paginatedVisits = useMemo(() => filteredVisits.slice(page * rowsPerPage, (page + 1) * rowsPerPage), [filteredVisits, page, rowsPerPage]);

  const activeFilterCount = useMemo(() => {
    let c = 0;
    if (searchQuery) c++; if (statusFilter !== "All") c++;
    if (dateFilter.startDate) c++; if (dateFilter.endDate) c++;
    if (Object.values(selectedStatuses).some((v) => !v)) c++;
    return c;
  }, [searchQuery, statusFilter, dateFilter, selectedStatuses]);

  const visitPipeline = useMemo(() => {
    const counts = allVisits.reduce((acc, v) => {
      const ns = (v.visitStatus || "").toLowerCase();
      if (ns === "scheduled") acc.scheduled += 1;
      else if (ns === "completed") acc.completed += 1;
      else if (ns === "approved") acc.approved += 1;
      return acc;
    }, { scheduled: 0, completed: 0, approved: 0 });
    return [
      { key: "scheduled", label: "Scheduled", value: counts.scheduled, gradBg: "linear-gradient(135deg,#dbeafe,#eff6ff)", border: "#bfdbfe", dotColor: "#3b82f6" },
      { key: "completed", label: "Completed", value: counts.completed, gradBg: "linear-gradient(135deg,#fef3c7,#fffbeb)", border: "#fde68a", dotColor: "#f59e0b" },
      { key: "approved", label: "Approved", value: counts.approved, gradBg: "linear-gradient(135deg,#d1fae5,#ecfdf5)", border: "#a7f3d0", dotColor: "#10b981" },
    ];
  }, [allVisits]);

  useEffect(() => { if (hasAccess(userRole)) fetchVisitsData(); }, [fetchVisitsData, userRole]);
  useEffect(() => {
    if (dateFilter.startDate && dateFilter.endDate) {
      setDateFilterError(new Date(dateFilter.startDate) > new Date(dateFilter.endDate) ? "Start date cannot be after end date" : "");
    } else setDateFilterError("");
  }, [dateFilter.startDate, dateFilter.endDate]);
  useEffect(() => { setRowsPerPage(isMobile ? 10 : DEFAULT_ITEMS_PER_PAGE); }, [isMobile]);
  useEffect(() => { setViewMode(isMobile ? "card" : "table"); }, [isMobile]);

  const handleViewClick = useCallback((visit) => { if (!visit?._id) { showSnackbar("Invalid visit data", "error"); return; } setSelectedVisit(visit); setViewModalOpen(true); }, [showSnackbar]);
  const handleEditClick = useCallback((visit) => { if (!visit?._id) { showSnackbar("Invalid visit data", "error"); return; } setSelectedVisit(visit); setEditModalOpen(true); }, [showSnackbar]);
  const handleVisitUpdate = useCallback(async () => { try { await fetchVisitsData(); } catch (err) { showSnackbar("Failed to refresh data", "error"); } }, [fetchVisitsData, showSnackbar]);
  const handleCloseSnackbar = useCallback(() => setSnackbar((p) => ({ ...p, open: false })), []);
  const handleStatusCheckboxChange = useCallback((s) => setSelectedStatuses((p) => ({ ...p, [s]: !p[s] })), []);
  const handleClearFilters = useCallback(() => {
    setSearchQuery(""); setStatusFilter("All"); setDateFilter({ startDate: null, endDate: null }); setDateFilterError("");
    setSelectedStatuses(Object.keys(STATUS_CONFIG).reduce((acc, s) => { acc[s] = true; return acc; }, {}));
    setSortConfig({ key: null, direction: "asc" }); setPage(0);
  }, []);

  const handleSort = useCallback((key) => {
    setSortConfig((p) => ({ key, direction: p.key === key && p.direction === "asc" ? "desc" : "asc" }));
  }, []);

  if (!hasAccess(userRole)) {
    return (
      <Box sx={{ p: 3, textAlign: "center", minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Alert severity="error" sx={{ maxWidth: 500, borderRadius: 3 }}>
          <AlertTitle>Access Denied</AlertTitle>
          You don't have permission to access this page.
          <Button sx={{ mt: 2 }} variant="contained" onClick={() => navigate("/dashboard")}
            sx={{ background: GRAD_MAIN, mt: 2 }}>
            Go to Dashboard
          </Button>
        </Alert>
      </Box>
    );
  }
  if (loading && allVisits.length === 0) return <LoadingSkeleton />;
  if (error && allVisits.length === 0) {
    return (
      <Box sx={{ p: 3, maxWidth: 600, mx: "auto" }}>
        <Alert severity="error" sx={{ borderRadius: 3 }}
          action={<Button color="inherit" size="small" onClick={fetchVisitsData}>Retry</Button>}>
          <AlertTitle>Error</AlertTitle>{error}
        </Alert>
      </Box>
    );
  }

  const SortableHeader = ({ label, sortKey }) => (
    <TableCell onClick={() => handleSort(sortKey)} sx={{
      background: "linear-gradient(180deg,#f8faff 0%,#f0f6ff 100%)",
      fontWeight: 700, py: 1.75, cursor: sortKey ? "pointer" : "default",
      fontSize: "11.5px", textTransform: "uppercase", letterSpacing: ".06em",
      color: sortConfig.key === sortKey ? ACCENT : "text.secondary",
      userSelect: "none",
      "&:first-of-type": { pl: 3 }, "&:last-of-type": { pr: 3 },
      "&:hover": sortKey ? { color: ACCENT } : {},
    }}>
      <Stack direction="row" alignItems="center" spacing={0.5}>
        <span>{label}</span>
        {sortKey && sortConfig.key === sortKey && (
          sortConfig.direction === "asc" ? <ArrowUpward sx={{ fontSize: 14 }} /> : <ArrowDownward sx={{ fontSize: 14 }} />
        )}
      </Stack>
    </TableCell>
  );

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <ViewVisitModal open={viewModalOpen} onClose={() => setViewModalOpen(false)} visit={selectedVisit} userRole={userRole} showSnackbar={showSnackbar} />
      <EditVisitModal open={editModalOpen} onClose={() => setEditModalOpen(false)} visit={selectedVisit} onSave={handleVisitUpdate} userRole={userRole} showSnackbar={showSnackbar} updating={updating} />
      <MobileFilterDrawer
        open={mobileFilterOpen} onClose={() => setMobileFilterOpen(false)}
        period={period} setPeriod={setPeriod} statusFilter={statusFilter} setStatusFilter={setStatusFilter}
        dateFilter={dateFilter} setDateFilter={setDateFilter} selectedStatuses={selectedStatuses}
        handleStatusCheckboxChange={handleStatusCheckboxChange} handleClearFilters={handleClearFilters}
        dateFilterError={dateFilterError} searchQuery={searchQuery} setSearchQuery={setSearchQuery}
        sortConfig={sortConfig} setSortConfig={setSortConfig} viewMode={viewMode} setViewMode={setViewMode}
        activeFilterCount={activeFilterCount}
      />

      <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: isMobile ? "top" : "bottom", horizontal: isMobile ? "center" : "right" }}>
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} variant="filled"
          sx={{ width: "100%", borderRadius: 2, color: "#fff" }}>
          {snackbar.message}
        </Alert>
      </Snackbar>

      <Box ref={containerRef} sx={{ p: { xs: 1.5, sm: 2, md: 3 }, minHeight: "100vh", pb: { xs: 10, sm: 3 }, bgcolor: "#f0f4fa" }}>

        {/* ── HEADER ── */}
        <Paper elevation={0} sx={{
          p: { xs: 2, sm: 2.5, md: 3 }, mb: 2.5, borderRadius: "20px",
          background: GRAD_MAIN, color: "#fff",
          boxShadow: "0 8px 32px rgba(15,31,61,.22)",
        }}>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2} justifyContent="space-between" alignItems={{ xs: "flex-start", sm: "center" }}>
            <Box>
              <Typography variant={isMobile ? "h6" : "h5"} fontWeight={700} gutterBottom>Visit Management</Typography>
              <Typography variant="body2" sx={{ opacity: 0.82 }}>Track and manage all visit activities and schedules</Typography>
            </Box>
            <Box sx={{ display: "flex", gap: 1 }}>
              {isMobile && (
                <Button variant="contained" startIcon={<FilterAlt />} onClick={() => setMobileFilterOpen(true)} size="small"
                  sx={{ bgcolor: "rgba(255,255,255,0.18)", color: "#fff", border: "1px solid rgba(255,255,255,0.25)", borderRadius: "10px", "&:hover": { bgcolor: "rgba(255,255,255,0.28)" } }}>
                  <Badge badgeContent={activeFilterCount} color="error">Filter</Badge>
                </Button>
              )}
              <Button variant="contained" startIcon={<Refresh />} onClick={fetchVisitsData} disabled={loading} size={isMobile ? "small" : "medium"}
                sx={{ bgcolor: "rgba(255,255,255,0.18)", color: "#fff", border: "1px solid rgba(255,255,255,0.25)", borderRadius: "10px", "&:hover": { bgcolor: "rgba(255,255,255,0.28)" } }}>
                Refresh
              </Button>
            </Box>
          </Stack>
        </Paper>

        {/* ── SUMMARY CARDS ── */}
        <Grid container spacing={isMobile ? 1.5 : 2} sx={{ mb: 2.5 }}>
          {SUMMARY_CARD_CONFIG.map((card, i) => (
            <Grid item xs={6} sm={6} md={3} key={card.key}>
              <Fade in timeout={400 + i * 100}>
                <Paper elevation={0} sx={{
                  borderRadius: "18px", overflow: "hidden",
                  border: "1px solid rgba(15,31,61,.07)",
                  boxShadow: "0 4px 20px rgba(15,31,61,.08)",
                  bgcolor: "#fff", height: "100%",
                  transition: "transform .2s, box-shadow .2s",
                  "&:hover": { transform: "translateY(-3px)", boxShadow: "0 10px 30px rgba(15,31,61,.13)" },
                }}>
                  <Box sx={{ height: 4, background: card.stripGrad }} />
                  <Box sx={{ p: { xs: 1.75, sm: 2.25 } }}>
                    <Box sx={{
                      width: { xs: 38, sm: 44 }, height: { xs: 38, sm: 44 }, borderRadius: "11px",
                      background: card.iconBg, color: card.iconColor,
                      display: "flex", alignItems: "center", justifyContent: "center", mb: 1.5,
                      boxShadow: `0 2px 8px ${alpha(card.iconColor, 0.25)}`,
                    }}>
                      {React.cloneElement(card.icon, { sx: { fontSize: { xs: 18, sm: 20 } } })}
                    </Box>
                    <Typography sx={{ fontSize: { xs: "1.8rem", sm: "2.2rem" }, fontWeight: 700, color: PRIMARY, lineHeight: 1, mb: 0.4 }}>
                      {summary[card.key]}
                    </Typography>
                    <Typography variant="subtitle2" fontWeight={600} sx={{ color: PRIMARY, fontSize: { xs: "0.85rem", sm: "0.95rem" }, mb: 0.4 }}>
                      {card.label}
                    </Typography>
                    <Typography variant="caption" sx={{ color: "text.secondary", fontSize: { xs: "0.72rem", sm: "0.82rem" }, lineHeight: 1.4 }}>
                      {card.subText}
                    </Typography>
                  </Box>
                </Paper>
              </Fade>
            </Grid>
          ))}
        </Grid>

        {/* ── VISIT PIPELINE ── */}
        <Paper elevation={0} sx={{
          mb: 2.5, borderRadius: "18px", border: "1px solid rgba(15,31,61,.07)",
          boxShadow: "0 4px 20px rgba(15,31,61,.06)", bgcolor: "#fff", overflow: "hidden",
        }}>
          <Box sx={{ px: 2.5, pt: 2, pb: 1.5, background: GRAD_CARD, borderBottom: `1px solid ${alpha(ACCENT, 0.12)}` }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography sx={{ fontSize: "11.5px", fontWeight: 700, color: ACCENT, textTransform: "uppercase", letterSpacing: ".08em" }}>
                Visit Pipeline
              </Typography>
              <Stack direction="row" spacing={2}>
                {[{ label: "Scheduled", color: "#3b82f6" }, { label: "Completed", color: "#f59e0b" }, { label: "Approved", color: "#10b981" }].map((l) => (
                  <Stack key={l.label} direction="row" spacing={0.75} alignItems="center">
                    <Box sx={{ width: 10, height: 10, borderRadius: "3px", bgcolor: l.color }} />
                    <Typography variant="caption" color="text.secondary" fontWeight={500}>{l.label}</Typography>
                  </Stack>
                ))}
              </Stack>
            </Stack>
          </Box>
          <Box sx={{ p: 2, display: "grid", gridTemplateColumns: { xs: "1fr", md: "110px 1fr" }, gap: 2, alignItems: "center" }}>
            <Box sx={{
              background: GRAD_DARK, borderRadius: "14px", color: "#fff",
              textAlign: "center", py: 2.5, px: 1.5,
              boxShadow: "0 4px 16px rgba(15,31,61,.2)",
            }}>
              <Typography sx={{ fontSize: "2.2rem", fontWeight: 700, lineHeight: 1 }}>{allVisits.length}</Typography>
              <Typography sx={{ mt: 0.75, fontSize: "10.5px", fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", opacity: .9 }}>All Visits</Typography>
            </Box>
            <Grid container spacing={1.5}>
              {visitPipeline.map((stage) => (
                <Grid item xs={4} key={stage.key}>
                  <Box sx={{
                    borderRadius: "12px", p: 1.75, border: `1px solid ${stage.border}`,
                    background: stage.gradBg, minHeight: 76,
                    display: "flex", flexDirection: "column", justifyContent: "space-between",
                  }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Typography sx={{ fontSize: "12.5px", fontWeight: 600, color: alpha(PRIMARY, 0.8) }}>{stage.label}</Typography>
                      <Box sx={{ width: 12, height: 12, borderRadius: "50%", border: `2px solid ${stage.dotColor}`, bgcolor: "#fff" }} />
                    </Stack>
                    <Typography sx={{ fontSize: { xs: "1.6rem", sm: "1.9rem" }, fontWeight: 500, color: alpha(PRIMARY, 0.85), lineHeight: 1, mt: 1 }}>
                      {stage.value}
                    </Typography>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </Box>
        </Paper>

        {/* ── DESKTOP FILTERS ── */}
        {!isMobile && (
          <Paper elevation={0} sx={{ p: 2.5, mb: 2.5, borderRadius: "18px", border: "1px solid rgba(15,31,61,.07)", boxShadow: "0 4px 20px rgba(15,31,61,.06)", bgcolor: "#fff" }}>
            <Stack spacing={2}>
              <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap">
                <TextField
                  size="small" placeholder="Search by name, email, phone, location or description…"
                  value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                  InputProps={{
                    startAdornment: <InputAdornment position="start"><Search sx={{ color: "text.secondary", fontSize: 18 }} /></InputAdornment>,
                    endAdornment: searchQuery && (
                      <InputAdornment position="end">
                        <Tooltip title="Clear Search"><IconButton size="small" onClick={() => setSearchQuery("")}><Close fontSize="small" /></IconButton></Tooltip>
                      </InputAdornment>
                    ),
                  }}
                  sx={{ maxWidth: 380, flex: 1, "& .MuiOutlinedInput-root": { borderRadius: "10px" } }}
                />

                <Stack direction="row" spacing={0.75}>
                  {PERIOD_OPTIONS.map((opt) => (
                    <Box key={opt.value} onClick={() => setPeriod(opt.value)} sx={{
                      px: 1.5, py: 0.75, borderRadius: "20px", cursor: "pointer", fontSize: "13px", fontWeight: 500,
                      border: `1px solid ${period === opt.value ? "transparent" : alpha(PRIMARY, 0.2)}`,
                      background: period === opt.value ? GRAD_BLUE : "transparent",
                      color: period === opt.value ? "#fff" : "text.secondary",
                      boxShadow: period === opt.value ? "0 2px 8px rgba(37,99,235,.25)" : "none",
                      transition: "all .15s",
                    }}>
                      {opt.label}
                    </Box>
                  ))}
                </Stack>

                <Button variant="outlined" startIcon={<Tune />} onClick={() => setShowFilterPanel(!showFilterPanel)}
                  sx={{ borderColor: ACCENT, color: ACCENT, borderRadius: "10px", "&:hover": { background: alpha(ACCENT, 0.05) } }}>
                  {showFilterPanel ? "Hide Filters" : "More Filters"}
                </Button>

                {activeFilterCount > 0 && (
                  <Button variant="text" startIcon={<Clear />} onClick={handleClearFilters} sx={{ color: ERROR_COLOR }}>
                    Clear All
                  </Button>
                )}
              </Stack>

              <Collapse in={showFilterPanel}>
                <Box sx={{ p: 2.5, borderRadius: "12px", background: GRAD_CARD, border: `1px solid ${alpha(ACCENT, 0.15)}` }}>
                  <Grid container spacing={2.5}>
                    <Grid item xs={12} md={4}>
                      <Typography variant="caption" fontWeight={700} sx={{ color: ACCENT, textTransform: "uppercase", letterSpacing: ".06em", mb: 1, display: "block" }}>
                        Visit Status
                      </Typography>
                      <FormControl fullWidth size="small" sx={{ "& .MuiOutlinedInput-root": { borderRadius: "10px" } }}>
                        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                          <MenuItem value="All">All Statuses</MenuItem>
                          {Object.keys(STATUS_CONFIG).map((s) => (
                            <MenuItem key={s} value={s}>
                              <Stack direction="row" alignItems="center" spacing={1}>{getStatusConfig(s).icon}<span>{s}</span></Stack>
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <Typography variant="caption" fontWeight={700} sx={{ color: ACCENT, textTransform: "uppercase", letterSpacing: ".06em", mb: 1, display: "block" }}>Start Date</Typography>
                      <DatePicker value={dateFilter.startDate}
                        onChange={(v) => setDateFilter((p) => ({ ...p, startDate: v }))}
                        slotProps={{ textField: { fullWidth: true, size: "small", error: !!dateFilterError, sx: { "& .MuiOutlinedInput-root": { borderRadius: "10px" } } } }} />
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <Typography variant="caption" fontWeight={700} sx={{ color: ACCENT, textTransform: "uppercase", letterSpacing: ".06em", mb: 1, display: "block" }}>End Date</Typography>
                      <DatePicker value={dateFilter.endDate}
                        onChange={(v) => setDateFilter((p) => ({ ...p, endDate: v }))}
                        slotProps={{ textField: { fullWidth: true, size: "small", error: !!dateFilterError, sx: { "& .MuiOutlinedInput-root": { borderRadius: "10px" } } } }} />
                    </Grid>
                    <Grid item xs={12}>
                      <Typography variant="caption" fontWeight={700} sx={{ color: ACCENT, textTransform: "uppercase", letterSpacing: ".06em", mb: 1, display: "block" }}>
                        Multiple Status Selection
                      </Typography>
                      <Stack direction="row" spacing={2} flexWrap="wrap">
                        {Object.keys(STATUS_CONFIG).map((s) => (
                          <FormControlLabel key={s}
                            control={<Checkbox checked={selectedStatuses[s]} onChange={() => handleStatusCheckboxChange(s)} size="small" sx={{ color: ACCENT, "&.Mui-checked": { color: ACCENT } }} />}
                            label={<Stack direction="row" alignItems="center" spacing={0.5}>{getStatusConfig(s).icon}<Typography variant="body2">{s}</Typography></Stack>}
                          />
                        ))}
                      </Stack>
                    </Grid>
                  </Grid>
                  {dateFilterError && <Alert severity="error" sx={{ mt: 2, borderRadius: "10px" }}>{dateFilterError}</Alert>}
                </Box>
              </Collapse>

              {activeFilterCount > 0 && (
                <Stack direction="row" spacing={1} flexWrap="wrap" alignItems="center">
                  <Typography variant="caption" color="text.secondary">Active filters:</Typography>
                  {searchQuery && (
                    <Chip label={`Search: ${searchQuery}`} size="small" onDelete={() => setSearchQuery("")}
                      sx={{ background: "linear-gradient(135deg,#dbeafe,#eff6ff)", color: "#1d4ed8", border: `1px solid ${alpha(ACCENT, 0.2)}` }} />
                  )}
                  {statusFilter !== "All" && (
                    <Chip label={`Status: ${statusFilter}`} size="small" onDelete={() => setStatusFilter("All")}
                      sx={{ background: "linear-gradient(135deg,#dbeafe,#eff6ff)", color: "#1d4ed8", border: `1px solid ${alpha(ACCENT, 0.2)}` }} />
                  )}
                  {dateFilter.startDate && (
                    <Chip label={`From: ${format(dateFilter.startDate, "dd MMM yyyy")}`} size="small"
                      onDelete={() => setDateFilter((p) => ({ ...p, startDate: null }))}
                      sx={{ background: "linear-gradient(135deg,#dbeafe,#eff6ff)", color: "#1d4ed8", border: `1px solid ${alpha(ACCENT, 0.2)}` }} />
                  )}
                  {dateFilter.endDate && (
                    <Chip label={`To: ${format(dateFilter.endDate, "dd MMM yyyy")}`} size="small"
                      onDelete={() => setDateFilter((p) => ({ ...p, endDate: null }))}
                      sx={{ background: "linear-gradient(135deg,#dbeafe,#eff6ff)", color: "#1d4ed8", border: `1px solid ${alpha(ACCENT, 0.2)}` }} />
                  )}
                </Stack>
              )}
            </Stack>
          </Paper>
        )}

        {/* ── MAIN TABLE / CARD LIST ── */}
        <Paper elevation={0} sx={{ borderRadius: "18px", overflow: "hidden", border: "1px solid rgba(15,31,61,.07)", boxShadow: "0 4px 20px rgba(15,31,61,.06)" }}>
          {/* Table Header */}
          <Box sx={{
            px: 2.5, py: 2, background: GRAD_CARD,
            borderBottom: `1px solid ${alpha(ACCENT, 0.12)}`,
            display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 1.5,
          }}>
            <Typography variant="h6" fontWeight={700} sx={{ color: PRIMARY, fontSize: { xs: "0.95rem", sm: "1.1rem" } }}>
              Visit Records
              <Box component="span" sx={{
                ml: 1, px: 1.25, py: 0.3, borderRadius: "20px",
                background: "linear-gradient(135deg,#dbeafe,#bfdbfe)", color: "#1d4ed8",
                fontSize: "11.5px", fontWeight: 700, verticalAlign: "middle",
              }}>
                {filteredVisits.length} total
              </Box>
            </Typography>
            {!isMobile && (
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Typography variant="body2" color="text.secondary">Rows per page:</Typography>
                <Select size="small" value={rowsPerPage} onChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
                  sx={{ minWidth: 80, "& .MuiOutlinedInput-root": { borderRadius: "8px" } }}>
                  {ITEMS_PER_PAGE_OPTIONS.map((opt) => <MenuItem key={opt} value={opt}>{opt}</MenuItem>)}
                </Select>
              </Stack>
            )}
          </Box>

          {/* TABLE VIEW */}
          {viewMode === "table" && !isMobile ? (
            <TableContainer sx={{ maxHeight: "70vh", overflow: "auto", position: "relative", bgcolor: "#fff" }}>
              {loading && allVisits.length > 0 && <LinearProgress sx={{ position: "absolute", top: 0, left: 0, right: 0, zIndex: 2 }} />}
              <Table stickyHeader>
                <TableHead>
                  <TableRow>
                    <SortableHeader label="Customer" sortKey="firstName" />
                    <SortableHeader label="Date & Time" sortKey="visitDate" />
                    <TableCell sx={{ background: "linear-gradient(180deg,#f8faff,#f0f6ff)", fontWeight: 700, fontSize: "11.5px", textTransform: "uppercase", letterSpacing: ".06em", color: "text.secondary", py: 1.75 }}>Location</TableCell>
                    <TableCell sx={{ background: "linear-gradient(180deg,#f8faff,#f0f6ff)", fontWeight: 700, fontSize: "11.5px", textTransform: "uppercase", letterSpacing: ".06em", color: "text.secondary", py: 1.75 }}>Notes</TableCell>
                    <SortableHeader label="Status" sortKey="visitStatus" />
                    <TableCell sx={{ background: "linear-gradient(180deg,#f8faff,#f0f6ff)", fontWeight: 700, fontSize: "11.5px", textTransform: "uppercase", letterSpacing: ".06em", color: "text.secondary", py: 1.75 }}>Lead</TableCell>
                    <TableCell sx={{ background: "linear-gradient(180deg,#f8faff,#f0f6ff)", fontWeight: 700, fontSize: "11.5px", textTransform: "uppercase", letterSpacing: ".06em", color: "text.secondary", py: 1.75 }}>Assigned To</TableCell>
                    <TableCell sx={{ background: "linear-gradient(180deg,#f8faff,#f0f6ff)", fontWeight: 700, fontSize: "11.5px", textTransform: "uppercase", letterSpacing: ".06em", color: "text.secondary", py: 1.75, pr: 3 }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginatedVisits.length > 0 ? paginatedVisits.map((visit, idx) => (
                    <TableRow key={visit._id} hover sx={{
                      borderBottom: "0.5px solid rgba(15,31,61,.06)",
                      transition: "background .12s",
                      "&:hover": { bgcolor: "#f8faff" },
                      "&:last-child td": { borderBottom: "none" },
                    }}>
                      <TableCell sx={{ pl: 3 }}>
                        <Stack direction="row" alignItems="center" spacing={1.5}>
                          <Avatar sx={{
                            background: [GRAD_BLUE, "linear-gradient(135deg,#ec4899,#f43f5e)", "linear-gradient(135deg,#6366f1,#8b5cf6)", "linear-gradient(135deg,#f97316,#ef4444)", "linear-gradient(135deg,#10b981,#059669)"][idx % 5],
                            color: "#fff", width: 36, height: 36, fontSize: "13px", fontWeight: 600,
                          }}>
                            {getInitials(visit.firstName, visit.lastName)}
                          </Avatar>
                          <Box>
                            <Typography variant="body2" fontWeight={600} sx={{ color: PRIMARY }}>{visit.firstName} {visit.lastName}</Typography>
                            {visit.status === "Other" && <Typography variant="caption" color="text.secondary">(Other visit)</Typography>}
                          </Box>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={500} sx={{ color: PRIMARY }}>
                          {visit.visitDate ? formatDate(visit.visitDate, "dd MMM yyyy") : formatDate(visit.createdAt, "dd MMM yyyy")}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {visit.visitTime ? formatTime(visit.visitTime) : formatDate(visit.createdAt, "hh:mm a")}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 150, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {visit.visitLocation || "—"}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {visit.visitNotes || visit.remarks || "—"}
                        </Typography>
                      </TableCell>
                      <TableCell><StatusPill status={visit.visitStatus} /></TableCell>
                      <TableCell><LeadPill status={visit.status} /></TableCell>
                      <TableCell>
                        {visit.assignedUser || visit.assignedManager ? (
                          <Box>
                            <Typography variant="body2" fontWeight={600}>
                              {visit.assignedUser
                                ? `${visit.assignedUser.firstName || ""} ${visit.assignedUser.lastName || ""}`.trim()
                                : `${visit.assignedManager?.firstName || ""} ${visit.assignedManager?.lastName || ""}`.trim()}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {visit.assignedUser ? visit.assignedUser.role || "Assigned User" : visit.assignedManager?.role || "Manager"}
                            </Typography>
                          </Box>
                        ) : (
                          <Typography variant="body2" color="text.secondary" fontStyle="italic">Unassigned</Typography>
                        )}
                      </TableCell>
                      <TableCell sx={{ pr: 3 }}>
                        <Stack direction="row" spacing={0.75}>
                          <Tooltip title="View Visit">
                            <IconButton size="small" onClick={() => handleViewClick(visit)} sx={{
                              background: GRAD_DARK, color: "#fff", width: 32, height: 32, borderRadius: "8px",
                              transition: "all .15s", "&:hover": { background: GRAD_BLUE, boxShadow: "0 2px 8px rgba(37,99,235,.3)" },
                            }}>
                              <Visibility sx={{ fontSize: 15 }} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Edit Visit">
                            <IconButton size="small" onClick={() => handleEditClick(visit)} sx={{
                              background: "linear-gradient(135deg,#eff6ff,#dbeafe)", color: ACCENT,
                              border: `1px solid ${alpha(ACCENT, 0.25)}`,
                              width: 32, height: 32, borderRadius: "8px",
                              transition: "all .15s", "&:hover": { background: alpha(ACCENT, 0.12) },
                            }}>
                              <Edit sx={{ fontSize: 15 }} />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={8}>
                        <EmptyState onClearFilters={handleClearFilters} hasFilters={activeFilterCount > 0} />
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            /* CARD VIEW */
            <Box sx={{ p: { xs: 1.5, sm: 2 }, bgcolor: "#fff" }}>
              {loading && allVisits.length > 0 && <LinearProgress sx={{ mb: 2, borderRadius: 2 }} />}
              {paginatedVisits.length > 0
                ? paginatedVisits.map((visit) => <MobileVisitCard key={visit._id} visit={visit} onView={handleViewClick} onEdit={handleEditClick} />)
                : <EmptyState onClearFilters={handleClearFilters} hasFilters={activeFilterCount > 0} />
              }
            </Box>
          )}

          {/* PAGINATION */}
          {filteredVisits.length > 0 && (
            <Box sx={{
              px: 2.5, py: 2, background: GRAD_CARD, borderTop: `1px solid ${alpha(ACCENT, 0.12)}`,
              display: "flex", flexDirection: { xs: "column", sm: "row" }, justifyContent: "space-between", alignItems: "center", gap: 2,
            }}>
              <Typography variant="body2" color="text.secondary">
                Showing {page * rowsPerPage + 1}–{Math.min((page + 1) * rowsPerPage, filteredVisits.length)} of {filteredVisits.length}
              </Typography>
              <Pagination
                count={Math.ceil(filteredVisits.length / rowsPerPage)}
                page={page + 1}
                onChange={(_, v) => { setPage(v - 1); containerRef.current?.scrollIntoView({ behavior: "smooth" }); }}
                color="primary" size={isMobile ? "small" : "medium"}
                sx={{
                  "& .MuiPaginationItem-root": { borderRadius: "8px", fontWeight: 500 },
                  "& .MuiPaginationItem-root.Mui-selected": { background: GRAD_BLUE, color: "#fff", boxShadow: "0 2px 6px rgba(37,99,235,.25)" },
                }}
              />
            </Box>
          )}
        </Paper>

        {/* FOOTER */}
        <Box sx={{ mt: 2.5, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 1 }}>
          <Typography variant="caption" color="text.secondary">Last updated: {format(new Date(), "dd MMM yyyy, hh:mm a")}</Typography>
          <Typography variant="caption" color="text.secondary">{summary.totalVisits} total visits · {summary.conversionRate}% conversion rate</Typography>
        </Box>
      </Box>

      {/* MOBILE FAB */}
      {isMobile && (
        <Zoom in>
          <Fab size="medium" onClick={() => setMobileFilterOpen(true)}
            sx={{
              position: "fixed", bottom: 24, right: 16, zIndex: 1000,
              background: GRAD_MAIN, color: "#fff",
              boxShadow: "0 6px 20px rgba(15,31,61,.35)",
              "&:hover": { background: GRAD_DARK },
            }}>
            <Badge badgeContent={activeFilterCount} color="error">
              <FilterAlt />
            </Badge>
          </Fab>
        </Zoom>
      )}
    </LocalizationProvider>
  );
}
