import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  alpha,
  Box,
  Button,
  Card,
  Chip,
  Divider,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormHelperText,
  Grid,
  IconButton,
  InputAdornment,
  InputLabel,
  LinearProgress,
  MenuItem,
  Paper,
  Select,
  Skeleton,
  Snackbar,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  AccessTime,
  AccountBalance,
  ArrowBack,
  Bolt,
  Build,
  CalendarMonth,
  CheckCircle,
  Clear,
  CloudUpload,
  DescriptionOutlined,
  Download,
  Edit,
  FactCheck,
  InfoOutlined,
  Link as LinkIcon,
  LocationOn,
  MoreVert,
  PhotoCameraOutlined,
  Payments,
  CurrencyRupee,
  Save,
  Summarize,
  SupportAgent,
  TaskAlt,
  TrendingUp,
  Workspaces,
} from "@mui/icons-material";
import { format, parseISO } from "date-fns";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { toBackendAssetUrl } from "../utils/backendAssetUrl";
import { getProjectStage } from "../utils/projectStage";

// ---- Design tokens ---------------------------------------------------
// A single restrained palette: one ink, one brand accent, and semantic
// status colors used only where they carry meaning (done / active / pending).
const INK = "#101828";       // primary text & headings
const INK_2 = "#1E2A44";     // secondary dark surface (panels)
const SURFACE = "#F8FAFC";   // page background
const BORDER = "#E2E8F0";    // hairlines
const MUTED = "#64748B";     // secondary text
const BRAND = "#2554C7";     // the one accent: interactive + "active" state
const SUCCESS = "#15803D";   // completed
const WARNING = "#B45309";   // attention / subsidy
const NEUTRAL = "#94A3B8";   // pending / inactive

const PROJECT_STAGES = [
  { key: "lead_converted", label: "Lead Converted", icon: Workspaces },
  { key: "registration", label: "Registration", icon: FactCheck },
  { key: "document", label: "Document", icon: DescriptionOutlined },
  { key: "payment", label: "Payment", icon: Payments },
  { key: "loan_pending", label: "Loan Pending", icon: CalendarMonth },
  { key: "disbursement", label: "Disbursement", icon: TrendingUp },
  { key: "installation", label: "Installation", icon: Bolt },
];

const ACTION_STAGES = PROJECT_STAGES.filter((stage) => stage.key !== "lead_converted");

// The Summary tab is a read-only overview, not an actual project stage,
// so it lives alongside ACTION_STAGES only for tab navigation purposes.
const WORKFLOW_TABS = [
  { key: "summary", label: "Summary", icon: Summarize },
  ...ACTION_STAGES,
];

const SOLAR_REQUIREMENT_TYPES = [
  "PMSG On Grid",
  "PMSG Residential(1-10k)",
  "Commercial (10kW  & above)",
  "Industrial (50+ kW)",
];

const REGISTRATION_STATUS_OPTIONS = [
  { value: "inProgress", label: "In Progress" },
  { value: "pending", label: "Pending" },
  { value: "completed", label: "Completed" },
];

const LEAD_STATUS_OPTIONS = ["Registration", "Document Submission", "Missed Leads"];

const PAYMENT_TYPE_OPTIONS = ["Bank Loan", "Cash", "Online Transfer", "Cheque"];

const LOAN_STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "submitted", label: "Submitted" },
];

const PAYMENT_LEAD_STATUS_OPTIONS = ["Bank Loan Apply", "Bank at Pending", "Missed Leads"];

const INSTALLATION_STATUS_OPTIONS = [
  { value: "installation_progress", label: "BOQ" },
  { value: "installation_completed", label: "Complete" },
  { value: "sent_for_jee_verification", label: "JEE Verification" },
  { value: "jee_verified", label: "JEE Verified" },
  { value: "meter_charge", label: "Approve Subsidy" },
  { value: "final_payment", label: "Final Payment" },
];

const INSTALLATION_LEAD_STATUS_OPTIONS = [
  {
    value: "Installation Completion",
    label: "Installation Completion",
    description: "Installation completed successfully",
  },
  {
    value: "Missed Leads",
    label: "Missed Leads",
    description: "Lead was not converted",
  },
];

const DISBURSEMENT_STATUS_OPTIONS = [
  { value: "pending", label: "Pending", description: "Disbursement is pending" },
  { value: "completed", label: "Completed", description: "Disbursement completed successfully" },
  { value: "cancelled", label: "Cancelled", description: "Disbursement cancelled" },
];

const DISBURSEMENT_LEAD_STATUS_OPTIONS = [
  { value: "Disbursement", label: "Disbursement", description: "Loan disbursement in progress" },
  { value: "Installation Completion", label: "Installation Completion", description: "Installation completed" },
  { value: "Missed Leads", label: "Missed Leads", description: "Lead was not converted" },
];

const BANK_STATUS_OPTIONS = [
  { value: "pending", label: "Pending", description: "Waiting for bank approval" },
  { value: "approved", label: "Approved", description: "Bank approval received" },
  { value: "rejected", label: "Rejected", description: "Bank rejected the application" },
];

const BANK_LEAD_STATUS_OPTIONS = [
  { value: "Bank at Pending", label: "Bank at Pending", description: "Awaiting bank approval" },
  { value: "Disbursement", label: "Disbursement", description: "Loan disbursement stage" },
  { value: "Missed Leads", label: "Missed Leads", description: "Lead was not converted" },
];

const BANK_LIST = [
  "State Bank of India",
  "HDFC Bank",
  "ICICI Bank",
  "Axis Bank",
  "Punjab National Bank",
  "Bank of Baroda",
  "Canara Bank",
  "Union Bank of India",
  "Bank of India",
  "IndusInd Bank",
  "Kotak Mahindra Bank",
  "Yes Bank",
  "IDFC First Bank",
  "Other",
];

const DOCUMENT_REQUIREMENTS = [
  { key: "aadhaar", label: "Aadhaar Card", fields: ["aadhaar"] },
  { key: "panCard", label: "PAN Card", fields: ["panCard"] },
  { key: "electricityBill", label: "Electricity Bill", fields: ["electricityBill"] },
  { key: "propertyTaxReceipt", label: "Property Tax Receipt", fields: ["propertyTaxReceipt"] },
  { key: "passportPhoto", label: "Passport Size Photo", fields: ["passportPhoto", "photo"] },
  { key: "cancelledCheque", label: "Cancelled Cheque", fields: ["cancelledCheque"] },
  { key: "bankStatement", label: "Bank Statement", fields: ["bankStatement", "passbook"] },
  { key: "propertyOwnershipProof", label: "Property Ownership Proof", fields: ["propertyOwnershipProof"] },
  { key: "noc", label: "NOC from Society/Bank", fields: ["noc"] },
  { key: "signedWorkOrder", label: "Signed Work Order", fields: ["signedWorkOrder"] },
  { key: "signedVendorAgreement", label: "Signed Vendor Agreement", fields: ["signedVendorAgreement"] },
  { key: "registrationDocument", label: "Registration Document", fields: ["registrationDocument", "uploadDocument"] },
];

const STAGE_ROUTES = {
  registration: "/registration",
  document: "/document-submission",
  payment: "/bank-loan-apply",
  loan_pending: "/bank-at-pending",
  installation: "/installation-completion",
  disbursement: "/disbursement",
};

const NEXT_ACTIONS = {
  lead_converted: "Project created from lead",
  registration: "Registration is active",
  document: "Document submission is active",
  payment: "Payment process is active",
  loan_pending: "Loan pending action is active",
  installation: "Installation is active",
  disbursement: "Disbursement is active",
};

// State-based color: this is what makes the pipeline read as one coherent
// system rather than seven unrelated hues.
const stateColor = (state) => {
  if (state === "done") return SUCCESS;
  if (state === "active") return BRAND;
  return NEUTRAL;
};

const normalizeProjectStage = (projectOrStage) => {
  const rawStage = typeof projectOrStage === "string" ? projectOrStage : getProjectStage(projectOrStage);
  if (rawStage === "visit") return "lead_converted";
  if (rawStage === "bank_loan") return "payment";
  if (rawStage === "handover") return "disbursement";
  return rawStage || "lead_converted";
};

const formatDate = (value, pattern = "dd MMM yyyy") => {
  if (!value) return "Not set";
  try {
    return format(typeof value === "string" ? parseISO(value) : new Date(value), pattern);
  } catch {
    return "Not set";
  }
};

const formatMoney = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const getCustomerName = (project) =>
  [project?.firstName, project?.lastName].filter(Boolean).join(" ") || project?.customerName || "Project";

const getSystemSize = (project) =>
  project?.solarRequirement || project?.systemSize || project?.capacity || project?.plantCapacity || "0.00";

const getProjectValue = (project) =>
  project?.projectValue || project?.totalProjectCost || project?.quotationAmount || project?.loanAmount || project?.disbursementAmount || 0;

const stageIndex = (key) => PROJECT_STAGES.findIndex((stage) => stage.key === key);
const getStageMeta = (key) => PROJECT_STAGES.find((stage) => stage.key === key) || PROJECT_STAGES[0];

const formatInputDate = (value) => {
  if (!value) return "";
  try {
    return format(typeof value === "string" ? parseISO(value) : new Date(value), "yyyy-MM-dd");
  } catch {
    return "";
  }
};

const formatStatusLabel = (value) => {
  const normalized = String(value || "pending")
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .trim();
  return normalized ? normalized.charAt(0).toUpperCase() + normalized.slice(1) : "Pending";
};

const getDocumentUrl = (project, requirement) => {
  for (const field of requirement.fields) {
    const value = project?.[field];
    if (typeof value === "string" && value) return value;
    if (value?.url) return value.url;
  }
  return "";
};

const getUploadedDocuments = (project) =>
  DOCUMENT_REQUIREMENTS.filter((requirement) => getDocumentUrl(project, requirement));

const getPersonName = (person) => {
  if (!person) return "";
  if (typeof person === "string") return person;
  return [person.firstName, person.lastName].filter(Boolean).join(" ") || person.name || person.email || "";
};

const getSiteSurvey = (project) =>
  project?.siteSurvey && typeof project.siteSurvey === "object" ? project.siteSurvey : null;

const hasSiteSurveyData = (project) => {
  const siteSurvey = getSiteSurvey(project);
  if (!siteSurvey) return false;
  return Boolean(
    siteSurvey.savedAt ||
      siteSurvey.status ||
      siteSurvey.general ||
      siteSurvey.locationName ||
      siteSurvey.latitude ||
      siteSurvey.longitude ||
      (Array.isArray(siteSurvey.photos) && siteSurvey.photos.length > 0)
  );
};

const formatSurveyValue = (value) => {
  if (Array.isArray(value)) return value.length ? value.join(", ") : "-";
  if (value === null || value === undefined) return "-";
  if (typeof value === "string") return value.trim() || "-";
  return String(value);
};

const getPhotoUrl = (photo) => {
  if (!photo) return "";
  if (typeof photo === "string") return toBackendAssetUrl(photo);
  return toBackendAssetUrl(
    photo.url ||
      photo.uri ||
      photo.photoUrl ||
      photo.imageUrl ||
      photo.secure_url ||
      photo.downloadURL ||
      photo.path ||
      photo.location ||
      photo.filename ||
      photo.filePath ||
      photo.file_url ||
      photo.src ||
      ""
  );
};

const getSurveyPhotoUrls = (siteSurvey) =>
  (Array.isArray(siteSurvey?.photos) ? siteSurvey.photos : [])
    .map(getPhotoUrl)
    .filter((url, index, arr) => url && arr.indexOf(url) === index);

const SITE_SURVEY_FIELDS = [
  ["roofType", "Roof Type"],
  ["roofMaterial", "Roof Material"],
  ["roofCondition", "Roof Condition"],
  ["shadingIssues", "Shading Issues"],
  ["siteAccess", "Site Access"],
  ["mainDistributionBoardLocation", "Main Distribution Board Location"],
  ["earthingAvailable", "Earthing Available"],
  ["phaseType", "Phase Type"],
  ["recommendedPanelBrand", "Recommended Panel Brand"],
  ["recommendedInverterBrand", "Recommended Inverter Brand"],
  ["inverterType", "Inverter Type"],
  ["availableRoofArea", "Available Roof Area (sq ft)"],
  ["usableRoofArea", "Usable Roof Area (sq ft)"],
  ["distanceFromRoofToDb", "Distance from Roof to DB (m)"],
  ["customerExpectations", "Customer Expectations"],
  ["specialRequirements", "Special Requirements"],
  ["challengesConcerns", "Challenges / Concerns"],
];

const getTimelineCategory = (entry = {}) => {
  const text = `${entry.stage || ""} ${entry.notes || ""} ${(entry.changes || [])
    .map((change) => `${change.field || ""} ${change.label || ""}`)
    .join(" ")}`.toLowerCase();

  if (text.includes("document") || text.includes("aadhaar") || text.includes("pan") || text.includes("passbook")) {
    return "documents";
  }
  if (
    text.includes("payment") ||
    text.includes("loan") ||
    text.includes("bank") ||
    text.includes("disbursement") ||
    text.includes("amount")
  ) {
    return "finance";
  }
  if (text.includes("comment") || text.includes("note")) return "comments";
  return "status";
};

const getTimelineTitle = (entry = {}) => {
  const statusChange = (entry.changes || []).find((change) =>
    String(change.field || change.label || "").toLowerCase().includes("status")
  );

  if (statusChange?.oldValue || statusChange?.newValue) {
    return `Status changed from '${formatStatusLabel(statusChange.oldValue || "Pending")}' to '${formatStatusLabel(statusChange.newValue || "Pending")}'`;
  }

  return entry.notes || `${entry.stage || "Project"} updated`;
};

const getTimelineTag = (entry = {}, category = "status") => {
  if (category === "documents") return "DOCUMENT_UPDATED";
  if (category === "finance") return "PAYMENT_RECORDED";
  if (category === "comments") return "COMMENT";
  if ((entry.changes || []).some((change) => String(change.field || "").toLowerCase().includes("status"))) {
    return "STATUS_UPDATED";
  }
  return String(entry.stage || "UPDATED").replace(/\s+/g, "_").toUpperCase();
};

const getActivityGroupLabel = (value) => {
  if (!value) return "UNKNOWN";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "UNKNOWN";

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const entryDay = new Date(date);
  entryDay.setHours(0, 0, 0, 0);
  const diffDays = Math.round((today - entryDay) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "TODAY";
  if (diffDays === 1) return "YESTERDAY";
  return `${diffDays} DAYS AGO`;
};

const buildProjectActivityEntries = (project) => {
  const customerName = getCustomerName(project).toUpperCase();
  const entries = [];

  (project?.stageTimeline || []).forEach((entry, index) => {
    const category = getTimelineCategory(entry);
    entries.push({
      id: `timeline-${entry.updatedAt || index}`,
      title: getTimelineTitle(entry),
      tag: getTimelineTag(entry, category),
      category,
      actor: getPersonName(entry.updatedBy) || entry.updatedRole || customerName,
      date: entry.updatedAt || project?.updatedAt || project?.createdAt,
    });
  });

  if (hasSiteSurveyData(project)) {
    entries.push({
      id: "site-survey",
      title: "Site survey completed",
      tag: "SITE_SURVEY",
      category: "status",
      actor: customerName,
      date: project.siteSurvey.savedAt || project.visitDate || project.updatedAt || project.createdAt,
    });
  }

  getUploadedDocuments(project).forEach((requirement) => {
    entries.push({
      id: `document-${requirement.key}`,
      title: `${requirement.label} uploaded`,
      tag: "DOCUMENT_UPLOADED",
      category: "documents",
      actor: customerName,
      date: project?.updatedAt || project?.createdAt,
    });
  });

  entries.push({
    id: "created",
    title: "created",
    tag: "CREATED",
    category: "status",
    actor: customerName,
    date: project?.projectConvertedAt || project?.createdAt,
  });

  return entries
    .filter((entry) => entry.date)
    .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
    .filter((entry, index, list) => {
      const key = `${entry.title}-${new Date(entry.date || 0).getTime()}`;
      return list.findIndex((item) => `${item.title}-${new Date(item.date || 0).getTime()}` === key) === index;
    });
};

const MetricCard = ({ icon, label, value, color }) => (
  <Card
    elevation={0}
    sx={{
      height: "100%",
      borderRadius: "10px",
      border: `1px solid ${BORDER}`,
      bgcolor: "#fff",
    }}
  >
    <Stack spacing={1.25} sx={{ p: 2 }}>
      <Box
        sx={{
          width: 40,
          height: 40,
          borderRadius: "10px",
          bgcolor: alpha(color, 0.1),
          color,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {icon}
      </Box>
      <Box>
        <Typography variant="h6" fontWeight={800} color={INK} lineHeight={1.15}>
          {value}
        </Typography>
        <Typography variant="caption" fontWeight={700} sx={{ color: MUTED, textTransform: "uppercase", letterSpacing: "0.04em" }}>
          {label}
        </Typography>
      </Box>
    </Stack>
  </Card>
);

const SurveyDetailModal = ({ open, project, onClose, onOpenEditor }) => {
  const siteSurvey = getSiteSurvey(project);
  const surveyGeneral = siteSurvey?.general || {};
  const photoUrls = getSurveyPhotoUrls(siteSurvey);

  if (!siteSurvey) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="lg"
      PaperProps={{
        sx: {
          borderRadius: "12px",
          overflow: "hidden",
          boxShadow: "0 24px 80px rgba(15, 23, 42, 0.22)",
        },
      }}
    >
      <DialogTitle sx={{ px: 3, py: 2, borderBottom: `1px solid ${BORDER}` }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
          <Stack direction="row" alignItems="center" spacing={1.25}>
            <FactCheck sx={{ fontSize: 18, color: "#c45a28" }} />
            <Typography variant="subtitle1" fontWeight={900} color={INK}>
              Site Survey Details
            </Typography>
            <Chip
              label={siteSurvey.status || "Completed"}
              size="small"
              sx={{ height: 22, bgcolor: alpha(SUCCESS, 0.12), color: SUCCESS, fontSize: 11, fontWeight: 900 }}
            />
          </Stack>
          <IconButton size="small" onClick={onClose}>
            <Clear sx={{ fontSize: 20 }} />
          </IconButton>
        </Stack>
      </DialogTitle>

      <DialogContent sx={{ p: 3 }}>
        <Grid container spacing={2} sx={{ p: 2, mb: 2.5, borderRadius: "8px", border: `1px solid ${BORDER}`, bgcolor: "#F8FAFC" }}>
          <Grid item xs={12} md={4}>
            <Typography variant="caption" fontWeight={900} sx={{ color: MUTED, textTransform: "uppercase" }}>
              Visit Date
            </Typography>
            <Typography variant="body2" fontWeight={900} color={INK}>
              {formatDate(siteSurvey.savedAt || project?.visitDate, "dd MMM yyyy")}
            </Typography>
          </Grid>
          <Grid item xs={12} md={4}>
            <Typography variant="caption" fontWeight={900} sx={{ color: MUTED, textTransform: "uppercase" }}>
              Inspector
            </Typography>
            <Typography variant="body2" fontWeight={900} color={INK}>
              {getPersonName(project?.assignedUser || project?.assignedManager) || "Not assigned"}
            </Typography>
          </Grid>
          <Grid item xs={12} md={4}>
            <Typography variant="caption" fontWeight={900} sx={{ color: MUTED, textTransform: "uppercase" }}>
              Customer
            </Typography>
            <Typography variant="body2" fontWeight={900} color={INK}>
              {getCustomerName(project)}
            </Typography>
          </Grid>
        </Grid>

        <Typography variant="caption" fontWeight={900} color={INK} sx={{ display: "block", mb: 1.25 }}>
          GENERAL
        </Typography>
        <Divider sx={{ mb: 1.5 }} />

        <Grid container spacing={1.5}>
          {SITE_SURVEY_FIELDS.map(([key, label]) => (
            <Grid item xs={12} sm={6} md={3} key={key}>
              <Stack
                direction="row"
                spacing={1.5}
                sx={{
                  minHeight: 74,
                  p: 1.5,
                  borderRadius: "8px",
                  border: `1px solid ${BORDER}`,
                  bgcolor: "#fff",
                }}
              >
                <Box
                  sx={{
                    width: 34,
                    height: 34,
                    flexShrink: 0,
                    borderRadius: "8px",
                    bgcolor: alpha("#c45a28", 0.1),
                    color: "#c45a28",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {["availableRoofArea", "usableRoofArea", "distanceFromRoofToDb"].includes(key) ? (
                    <Typography variant="caption" fontWeight={900}>#</Typography>
                  ) : (
                    <Edit sx={{ fontSize: 15 }} />
                  )}
                </Box>
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="caption" fontWeight={900} sx={{ color: MUTED, textTransform: "uppercase", lineHeight: 1.2 }}>
                    {label}
                  </Typography>
                  <Typography variant="body2" fontWeight={900} color={INK} sx={{ mt: 0.45, wordBreak: "break-word" }}>
                    {formatSurveyValue(surveyGeneral[key])}
                  </Typography>
                </Box>
              </Stack>
            </Grid>
          ))}
          <Grid item xs={12} sm={6} md={3}>
            <Stack direction="row" spacing={1.5} sx={{ minHeight: 74, p: 1.5, borderRadius: "8px", border: `1px solid ${BORDER}`, bgcolor: "#fff" }}>
              <Box sx={{ width: 34, height: 34, flexShrink: 0, borderRadius: "8px", bgcolor: alpha("#c45a28", 0.1), color: "#c45a28", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Typography variant="caption" fontWeight={900}>#</Typography>
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="caption" fontWeight={900} sx={{ color: MUTED, textTransform: "uppercase", lineHeight: 1.2 }}>
                  GPS Longitude
                </Typography>
                <Typography variant="body2" fontWeight={900} color={INK} sx={{ mt: 0.45 }}>
                  {formatSurveyValue(siteSurvey.longitude)}
                </Typography>
              </Box>
            </Stack>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Stack direction="row" spacing={1.5} sx={{ minHeight: 74, p: 1.5, borderRadius: "8px", border: `1px solid ${BORDER}`, bgcolor: "#fff" }}>
              <Box sx={{ width: 34, height: 34, flexShrink: 0, borderRadius: "8px", bgcolor: alpha("#c45a28", 0.1), color: "#c45a28", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Typography variant="caption" fontWeight={900}>#</Typography>
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="caption" fontWeight={900} sx={{ color: MUTED, textTransform: "uppercase", lineHeight: 1.2 }}>
                  GPS Latitude
                </Typography>
                <Typography variant="body2" fontWeight={900} color={INK} sx={{ mt: 0.45 }}>
                  {formatSurveyValue(siteSurvey.latitude)}
                </Typography>
              </Box>
            </Stack>
          </Grid>
        </Grid>

        {photoUrls.length > 0 && (
          <Box sx={{ mt: 2.5 }}>
            <Typography variant="caption" fontWeight={900} color={INK} sx={{ display: "block", mb: 1.25 }}>
              PHOTOS
            </Typography>
            <Stack direction="row" spacing={1.25} flexWrap="wrap" useFlexGap>
              {photoUrls.map((photoUrl, index) => (
                <Box
                  key={`${photoUrl}-${index}`}
                  component="img"
                  src={photoUrl}
                  alt={`Site survey ${index + 1}`}
                  onClick={() => window.open(photoUrl, "_blank", "noopener,noreferrer")}
                  sx={{
                    width: 112,
                    height: 88,
                    borderRadius: "8px",
                    objectFit: "cover",
                    cursor: "pointer",
                    border: `1px solid ${BORDER}`,
                  }}
                />
              ))}
            </Stack>
          </Box>
        )}

        {(siteSurvey.remarks || siteSurvey.summary) && (
          <Box sx={{ mt: 2.5, p: 1.5, borderRadius: "8px", border: `1px solid ${BORDER}`, bgcolor: "#F8FAFC" }}>
            <Typography variant="caption" fontWeight={900} sx={{ color: MUTED, textTransform: "uppercase" }}>
              Notes
            </Typography>
            <Typography variant="body2" sx={{ mt: 0.75, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
              {siteSurvey.remarks || siteSurvey.summary}
            </Typography>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, borderTop: `1px solid ${BORDER}` }}>
        <Button
          size="small"
          variant="contained"
          startIcon={<LinkIcon sx={{ fontSize: 15 }} />}
          onClick={onOpenEditor}
          sx={{ mr: "auto", borderRadius: "8px", bgcolor: "#E5E7EB", color: INK, boxShadow: "none", fontWeight: 800, "&:hover": { bgcolor: "#D1D5DB", boxShadow: "none" } }}
        >
          Open full editor
        </Button>
        <Button size="small" variant="outlined" onClick={onClose} sx={{ borderRadius: "8px", borderColor: BORDER, color: INK }}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const SummaryWorkspace = ({ project, onGoToStage, onOpenSurveyEditor }) => {
  const [surveyOpen, setSurveyOpen] = useState(false);
  const [activityFilter, setActivityFilter] = useState("all");
  const siteSurveyReady = hasSiteSurveyData(project);
  const activityEntries = useMemo(() => buildProjectActivityEntries(project), [project]);
  const filteredActivityEntries = useMemo(
    () => activityFilter === "all" ? activityEntries : activityEntries.filter((entry) => entry.category === activityFilter),
    [activityEntries, activityFilter]
  );
  const groupedEntries = useMemo(
    () =>
      filteredActivityEntries.reduce((acc, entry) => {
        const label = getActivityGroupLabel(entry.date);
        if (!acc[label]) acc[label] = [];
        acc[label].push(entry);
        return acc;
      }, {}),
    [filteredActivityEntries]
  );
  const installerName = getPersonName(project?.siteInstaller || project?.assignedInstaller || project?.installationUser);
  const statusLabel = formatStatusLabel(project?.status || project?.registrationStatus || "pending");
  const activityFilters = [
    { key: "all", label: "All" },
    { key: "status", label: "Status" },
    { key: "documents", label: "Documents" },
    { key: "finance", label: "Finance" },
    { key: "comments", label: "Comments" },
  ];

  return (
    <Stack spacing={2}>
      <Paper elevation={0} sx={{ p: 3, borderRadius: "12px", border: `1px solid ${BORDER}`, bgcolor: "#fff", boxShadow: "0 8px 26px rgba(15, 23, 42, 0.06)" }}>
        <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", sm: "center" }} spacing={2} sx={{ mb: 3 }}>
          <Stack direction="row" spacing={1.25} alignItems="center">
            <InfoOutlined sx={{ fontSize: 22, color: INK }} />
            <Typography variant="h6" fontWeight={900} color={INK}>
              Project Details
            </Typography>
          </Stack>
          <Tooltip title={siteSurveyReady ? "View site survey details" : "No site survey created for this project"}>
            <span>
              <Button
                variant="outlined"
                startIcon={<FactCheck sx={{ fontSize: 17 }} />}
                onClick={() => setSurveyOpen(true)}
                disabled={!siteSurveyReady}
                sx={{ borderRadius: "10px", borderColor: BORDER, color: INK, fontWeight: 900, textTransform: "none" }}
              >
                Site Survey
              </Button>
            </span>
          </Tooltip>
        </Stack>

        <Grid container spacing={4}>
          <Grid item xs={12} md={6}>
            <Stack spacing={3}>
              <Box>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.8 }}>
                  <Typography variant="body2" fontWeight={900} sx={{ color: MUTED }}>#</Typography>
                  <Typography variant="caption" fontWeight={900} sx={{ color: MUTED, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Project Code
                  </Typography>
                </Stack>
                <Typography variant="subtitle1" fontWeight={900} color={INK}>
                  {project?.projectCode || project?.leadId || project?._id?.slice(-8) || "Not set"}
                </Typography>
              </Box>

              <Box>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.8 }}>
                  <TaskAlt sx={{ fontSize: 17, color: MUTED }} />
                  <Typography variant="caption" fontWeight={900} sx={{ color: MUTED, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Status
                  </Typography>
                </Stack>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Chip
                    label={statusLabel}
                    size="small"
                    sx={{ height: 28, borderRadius: "4px", bgcolor: alpha("#339AF0", 0.13), color: "#2683D8", fontSize: 15, fontWeight: 800 }}
                  />
                  <IconButton
                    size="small"
                    onClick={() => onGoToStage?.(normalizeProjectStage(project))}
                    sx={{ width: 30, height: 30, border: `1px solid ${alpha(INK, 0.35)}`, borderRadius: "8px", color: INK }}
                  >
                    <Edit sx={{ fontSize: 15 }} />
                  </IconButton>
                </Stack>
              </Box>

              <Box>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.8 }}>
                  <CalendarMonth sx={{ fontSize: 17, color: MUTED }} />
                  <Typography variant="caption" fontWeight={900} sx={{ color: MUTED, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Created
                  </Typography>
                </Stack>
                <Typography variant="subtitle1" fontWeight={900} color={INK}>
                  {formatDate(project?.projectConvertedAt || project?.createdAt)}
                </Typography>
              </Box>
            </Stack>
          </Grid>

          <Grid item xs={12} md={6}>
            <Box>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.8 }}>
                <Build sx={{ fontSize: 17, color: MUTED }} />
                <Typography variant="caption" fontWeight={900} sx={{ color: MUTED, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Site Installer
                </Typography>
              </Stack>
              <Stack direction="row" spacing={1.25} alignItems="center" flexWrap="wrap" useFlexGap>
                <Typography variant="subtitle1" fontWeight={800} sx={{ color: installerName ? INK : MUTED }}>
                  {installerName || "Not assigned"}
                </Typography>
                {!installerName && (
                  <Button
                    size="small"
                    onClick={() => onGoToStage?.("installation")}
                    startIcon={<Typography component="span" fontWeight={900}>+</Typography>}
                    sx={{ minWidth: 0, px: 1.25, py: 0.5, borderRadius: "2px", bgcolor: alpha("#c45a28", 0.1), color: "#9f461d", fontWeight: 900 }}
                  >
                    Assign
                  </Button>
                )}
              </Stack>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      <Paper elevation={0} sx={{ p: 3, borderRadius: "12px", border: `1px solid ${BORDER}`, bgcolor: "#fff", boxShadow: "0 8px 26px rgba(15, 23, 42, 0.06)" }}>
        <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", md: "center" }} spacing={2} sx={{ mb: 2.5 }}>
          <Stack direction="row" spacing={1.25} alignItems="center">
            <AccessTime sx={{ fontSize: 22, color: INK }} />
            <Typography variant="h6" fontWeight={900} color={INK}>
              Activity Timeline
            </Typography>
          </Stack>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {activityFilters.map((filter) => {
              const active = activityFilter === filter.key;
              return (
                <Button
                  key={filter.key}
                  size="small"
                  onClick={() => setActivityFilter(filter.key)}
                  sx={{
                    minWidth: 0,
                    px: 2,
                    borderRadius: "999px",
                    color: active ? INK : "#475569",
                    bgcolor: active ? alpha(BRAND, 0.08) : "#EEF2F7",
                    border: `1px solid ${active ? alpha(BRAND, 0.3) : "transparent"}`,
                    fontWeight: 900,
                    textTransform: "none",
                  }}
                >
                  {filter.label}
                </Button>
              );
            })}
          </Stack>
        </Stack>

        {Object.entries(groupedEntries).length > 0 ? (
          <Stack spacing={2.5}>
            {Object.entries(groupedEntries).map(([groupLabel, entries]) => (
              <Box key={groupLabel}>
                <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 1.5 }}>
                  <Typography variant="caption" fontWeight={900} sx={{ color: MUTED, minWidth: 92 }}>
                    {groupLabel}
                  </Typography>
                  <Divider sx={{ flex: 1 }} />
                </Stack>
                <Stack spacing={2}>
                  {entries.map((entry) => (
                    <Stack key={entry.id} direction="row" spacing={2} alignItems="flex-start">
                      <Box
                        sx={{
                          width: 42,
                          height: 42,
                          borderRadius: "50%",
                          bgcolor: "#EEF2F7",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: INK,
                          flexShrink: 0,
                        }}
                      >
                        <TaskAlt sx={{ fontSize: 18 }} />
                      </Box>
                      <Box sx={{ minWidth: 0 }}>
                        <Stack direction="row" spacing={1.25} alignItems="center" flexWrap="wrap" useFlexGap>
                          <Typography variant="subtitle2" fontWeight={900} color={INK} sx={{ wordBreak: "break-word" }}>
                            {entry.title}
                          </Typography>
                          <Chip
                            label={entry.tag}
                            size="small"
                            sx={{ height: 21, bgcolor: "#E5EAF0", color: "#475569", fontSize: 11, fontWeight: 900 }}
                          />
                        </Stack>
                        <Typography variant="body2" sx={{ color: MUTED, mt: 0.4 }}>
                          {entry.actor || "System"} - {formatDate(entry.date, "dd MMM, hh:mm a")}
                        </Typography>
                      </Box>
                    </Stack>
                  ))}
                </Stack>
              </Box>
            ))}
          </Stack>
        ) : (
          <Typography variant="body2" sx={{ color: MUTED, py: 3, textAlign: "center" }}>
            No activity available.
          </Typography>
        )}
      </Paper>

      <SurveyDetailModal
        open={surveyOpen}
        project={project}
        onClose={() => setSurveyOpen(false)}
        onOpenEditor={onOpenSurveyEditor}
      />
    </Stack>
  );
};

const RegistrationWorkspace = ({
  project,
  formData,
  errors,
  saving,
  onChange,
  onClear,
  onCancel,
  onSave,
}) => (
  <Paper elevation={0} sx={{ p: 2.25, borderRadius: "12px", border: `1px solid ${BORDER}`, bgcolor: "#fff" }}>
    <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={1.5} sx={{ mb: 2 }}>
      <Stack direction="row" spacing={1.25} alignItems="center">
        <Box sx={{ width: 34, height: 34, borderRadius: "9px", bgcolor: alpha(BRAND, 0.1), color: BRAND, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <FactCheck sx={{ fontSize: 18 }} />
        </Box>
        <Box>
          <Typography variant="subtitle2" fontWeight={900} color={INK}>
            Registration Workspace
          </Typography>
          <Typography variant="caption" sx={{ color: MUTED }}>
            Fill in the registration details below
          </Typography>
        </Box>
      </Stack>
      <Button
        size="small"
        variant="outlined"
        startIcon={<Clear sx={{ fontSize: 16 }} />}
        onClick={onClear}
        sx={{ alignSelf: { xs: "flex-start", sm: "center" }, borderRadius: "8px", borderColor: BORDER, color: INK, fontWeight: 800 }}
      >
        Clear Form
      </Button>
    </Stack>

    <Grid container spacing={1.5}>
      <Grid item xs={12}>
        <TextField
          fullWidth
          multiline
          minRows={2}
          size="small"
          label="Address *"
          placeholder="Enter full address"
          value={formData.address}
          onChange={(event) => onChange("address", event.target.value)}
          error={!!errors.address}
          helperText={errors.address}
        />
      </Grid>
      <Grid item xs={12} md={6}>
        <TextField
          fullWidth
          size="small"
          label="City *"
          placeholder="Enter city"
          value={formData.city}
          onChange={(event) => onChange("city", event.target.value)}
          error={!!errors.city}
          helperText={errors.city}
        />
      </Grid>
      <Grid item xs={12} md={6}>
        <TextField
          fullWidth
          size="small"
          label="Pincode *"
          placeholder="Enter pincode"
          value={formData.pincode}
          onChange={(event) => onChange("pincode", event.target.value)}
          inputProps={{ maxLength: 6 }}
          error={!!errors.pincode}
          helperText={errors.pincode}
        />
      </Grid>
      <Grid item xs={12}>
        <FormControl fullWidth size="small" error={!!errors.solarRequirement}>
          <InputLabel>Solar Requirement *</InputLabel>
          <Select
            label="Solar Requirement *"
            value={formData.solarRequirement}
            onChange={(event) => onChange("solarRequirement", event.target.value)}
          >
            <MenuItem value="">
              <em>Select solar requirement</em>
            </MenuItem>
            {SOLAR_REQUIREMENT_TYPES.map((type) => (
              <MenuItem key={type} value={type}>{type}</MenuItem>
            ))}
          </Select>
          {errors.solarRequirement && <FormHelperText>{errors.solarRequirement}</FormHelperText>}
        </FormControl>
      </Grid>
      <Grid item xs={12} md={6}>
        <TextField
          fullWidth
          size="small"
          type="date"
          label="Registration Date"
          value={formData.dateOfRegistration}
          onChange={(event) => onChange("dateOfRegistration", event.target.value)}
          InputLabelProps={{ shrink: true }}
        />
      </Grid>
      <Grid item xs={12} md={6}>
        <FormControl fullWidth size="small">
          <InputLabel>Registration Status</InputLabel>
          <Select
            label="Registration Status"
            value={formData.registrationStatus}
            onChange={(event) => onChange("registrationStatus", event.target.value)}
          >
            {REGISTRATION_STATUS_OPTIONS.map((status) => (
              <MenuItem key={status.value} value={status.value}>{status.label}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Grid>
      <Grid item xs={12}>
        <FormControl fullWidth size="small">
          <InputLabel>Lead Status</InputLabel>
          <Select
            label="Lead Status"
            value={formData.status}
            onChange={(event) => onChange("status", event.target.value)}
          >
            {LEAD_STATUS_OPTIONS.map((status) => (
              <MenuItem key={status} value={status}>{status}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Grid>
      <Grid item xs={12} md={8}>
        <TextField
          fullWidth
          multiline
          minRows={2}
          size="small"
          label="Registration Notes"
          placeholder="Add notes about this registration..."
          value={formData.registrationNotes}
          onChange={(event) => onChange("registrationNotes", event.target.value)}
        />
      </Grid>
      <Grid item xs={12} md={4}>
        <Stack direction={{ xs: "column", sm: "row", md: "row" }} spacing={1} sx={{ height: "100%" }} alignItems="flex-end">
          <Button
            fullWidth
            variant="outlined"
            onClick={onCancel}
            sx={{ borderRadius: "8px", borderColor: BORDER, color: INK, fontWeight: 800 }}
          >
            Cancel
          </Button>
          <Button
            fullWidth
            variant="contained"
            startIcon={<Save sx={{ fontSize: 16 }} />}
            onClick={onSave}
            disabled={saving || !project?._id}
            sx={{ borderRadius: "8px", bgcolor: BRAND, fontWeight: 900, "&:hover": { bgcolor: "#1d4ed8" } }}
          >
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </Stack>
      </Grid>
    </Grid>
  </Paper>
);

const DocumentWorkspace = ({ project, onUpload, onCreateLink }) => {
  const uploadedDocs = getUploadedDocuments(project);
  const requiredCount = Math.max(1, DOCUMENT_REQUIREMENTS.length - uploadedDocs.length);
  const progress = Math.min(100, Math.round((uploadedDocs.length / DOCUMENT_REQUIREMENTS.length) * 100));

  return (
    <Paper elevation={0} sx={{ p: 2.25, borderRadius: "12px", border: `1px solid ${BORDER}`, bgcolor: "#fff" }}>
      <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={1.5} sx={{ mb: 2 }}>
        <Stack direction="row" spacing={1.25} alignItems="center">
          <Box sx={{ width: 34, height: 34, borderRadius: "50%", bgcolor: alpha(BRAND, 0.1), color: BRAND, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <DescriptionOutlined sx={{ fontSize: 18 }} />
          </Box>
          <Box>
            <Typography variant="subtitle2" fontWeight={900} color={INK}>
              Documents
            </Typography>
            <Typography variant="caption" sx={{ color: MUTED }}>
              Upload at least one image or file to complete this step and move ahead.
            </Typography>
          </Box>
        </Stack>
        <Button
          size="small"
          variant="outlined"
          startIcon={<LinkIcon sx={{ fontSize: 16 }} />}
          onClick={onCreateLink}
          sx={{ alignSelf: { xs: "flex-start", sm: "center" }, borderRadius: "999px", borderColor: alpha(BRAND, 0.35), color: BRAND, fontWeight: 900 }}
        >
          Create upload link
        </Button>
      </Stack>

      <Stack spacing={0.75} sx={{ mb: 1.75 }}>
        <Stack direction="row" justifyContent="space-between" spacing={1}>
          <Typography variant="caption" fontWeight={900} sx={{ color: MUTED }}>
            Upload progress
          </Typography>
          <Typography variant="caption" fontWeight={900} sx={{ color: SUCCESS }}>
            {requiredCount} file required
          </Typography>
        </Stack>
        <LinearProgress
          variant="determinate"
          value={progress}
          sx={{
            height: 5,
            borderRadius: 999,
            bgcolor: alpha(NEUTRAL, 0.18),
            "& .MuiLinearProgress-bar": { bgcolor: SUCCESS, borderRadius: 999 },
          }}
        />
      </Stack>

      <Chip
        icon={<LocationOn sx={{ fontSize: "15px !important" }} />}
        label="GPS active - photos will be location-stamped"
        size="small"
        sx={{
          mb: 2,
          bgcolor: alpha(SUCCESS, 0.1),
          color: SUCCESS,
          fontWeight: 900,
          "& .MuiChip-icon": { color: `${SUCCESS} !important` },
        }}
      />

      <Grid container spacing={1.5}>
        {DOCUMENT_REQUIREMENTS.map((requirement) => {
          const fileUrl = getDocumentUrl(project, requirement);
          const uploaded = Boolean(fileUrl);

          return (
            <Grid item xs={12} sm={6} lg={3} key={requirement.key}>
              <Card
                elevation={0}
                sx={{
                  height: "100%",
                  borderRadius: "10px",
                  border: `1px solid ${BORDER}`,
                  bgcolor: "#fff",
                  overflow: "hidden",
                }}
              >
                <Stack
                  alignItems="center"
                  justifyContent="center"
                  spacing={0.75}
                  sx={{ minHeight: 108, bgcolor: alpha(NEUTRAL, 0.08), color: NEUTRAL }}
                >
                  <PhotoCameraOutlined sx={{ fontSize: 28 }} />
                  <Typography variant="caption" fontWeight={700}>
                    {uploaded ? "File uploaded" : "No file uploaded"}
                  </Typography>
                </Stack>
                <Stack spacing={1.25} sx={{ p: 1.5 }}>
                  <Typography variant="subtitle2" fontWeight={900} color={INK} sx={{ lineHeight: 1.2 }}>
                    {requirement.label}
                  </Typography>
                  <Divider />
                  <Button
                    fullWidth
                    size="small"
                    variant="outlined"
                    startIcon={<CloudUpload sx={{ fontSize: 16 }} />}
                    onClick={() => onUpload(requirement.key)}
                    sx={{
                      borderRadius: "999px",
                      borderStyle: "dashed",
                      borderColor: alpha(BRAND, 0.35),
                      color: BRAND,
                      fontWeight: 900,
                      bgcolor: alpha(BRAND, 0.02),
                    }}
                  >
                    {uploaded ? "Replace document" : "Upload document"}
                  </Button>
                </Stack>
              </Card>
            </Grid>
          );
        })}
      </Grid>
    </Paper>
  );
};

const PaymentWorkspace = ({
  project,
  formData,
  errors,
  saving,
  onChange,
  onClear,
  onCancel,
  onSave,
}) => (
  <Paper elevation={0} sx={{ p: 2.25, borderRadius: "12px", border: `1px solid ${BORDER}`, bgcolor: "#fff" }}>
    <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={1.5} sx={{ mb: 2 }}>
      <Stack direction="row" spacing={1.25} alignItems="center">
        <Box sx={{ width: 34, height: 34, borderRadius: "9px", bgcolor: alpha(BRAND, 0.1), color: BRAND, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Payments sx={{ fontSize: 18 }} />
        </Box>
        <Box>
          <Typography variant="subtitle2" fontWeight={900} color={INK}>
            Payment Workspace
          </Typography>
          <Typography variant="caption" sx={{ color: MUTED }}>
            Fill in the payment details below
          </Typography>
        </Box>
      </Stack>
      <Button
        size="small"
        variant="outlined"
        startIcon={<Clear sx={{ fontSize: 16 }} />}
        onClick={onClear}
        sx={{ alignSelf: { xs: "flex-start", sm: "center" }, borderRadius: "8px", borderColor: BORDER, color: INK, fontWeight: 800 }}
      >
        Clear Form
      </Button>
    </Stack>

    <Grid container spacing={1.5}>
      <Grid item xs={12} md={6}>
        <FormControl fullWidth size="small">
          <InputLabel>Payment Type</InputLabel>
          <Select
            label="Payment Type"
            value={formData.paymentType}
            onChange={(event) => onChange("paymentType", event.target.value)}
          >
            {PAYMENT_TYPE_OPTIONS.map((type) => (
              <MenuItem key={type} value={type}>{type}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Grid>
      <Grid item xs={12} md={6}>
        <FormControl fullWidth size="small">
          <InputLabel>Loan Status</InputLabel>
          <Select
            label="Loan Status"
            value={formData.loanStatus}
            onChange={(event) => onChange("loanStatus", event.target.value)}
          >
            {LOAN_STATUS_OPTIONS.map((status) => (
              <MenuItem key={status.value} value={status.value}>{status.label}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Grid>
      <Grid item xs={12} md={6}>
        <TextField
          fullWidth
          size="small"
          type="number"
          label="Loan Amount *"
          value={formData.loanAmount}
          onChange={(event) => onChange("loanAmount", event.target.value)}
          error={!!errors.loanAmount}
          helperText={errors.loanAmount}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <CurrencyRupee sx={{ fontSize: 16 }} />
              </InputAdornment>
            ),
          }}
        />
      </Grid>
      <Grid item xs={12} md={6}>
        <FormControl fullWidth size="small">
          <InputLabel>Lead Status</InputLabel>
          <Select
            label="Lead Status"
            value={formData.status}
            onChange={(event) => onChange("status", event.target.value)}
          >
            {PAYMENT_LEAD_STATUS_OPTIONS.map((status) => (
              <MenuItem key={status} value={status}>{status}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Grid>
      <Grid item xs={12} md={6}>
        <FormControl fullWidth size="small" error={!!errors.bank}>
          <InputLabel>Bank</InputLabel>
          <Select
            label="Bank"
            value={formData.bank}
            onChange={(event) => onChange("bank", event.target.value)}
          >
            <MenuItem value="">
              <em>Select Bank</em>
            </MenuItem>
            {BANK_LIST.map((bank) => (
              <MenuItem key={bank} value={bank}>{bank}</MenuItem>
            ))}
          </Select>
          {errors.bank && <FormHelperText>{errors.bank}</FormHelperText>}
        </FormControl>
      </Grid>
      <Grid item xs={12} md={6}>
        <TextField
          fullWidth
          size="small"
          type="date"
          label="Loan Approval Date"
          value={formData.loanApprovalDate}
          onChange={(event) => onChange("loanApprovalDate", event.target.value)}
          InputLabelProps={{ shrink: true }}
        />
      </Grid>
      <Grid item xs={12} md={6}>
        <TextField
          fullWidth
          size="small"
          label="Branch Name *"
          value={formData.branchName}
          onChange={(event) => onChange("branchName", event.target.value)}
          error={!!errors.branchName}
          helperText={errors.branchName}
        />
      </Grid>
      <Grid item xs={12} md={6}>
        <TextField
          fullWidth
          multiline
          minRows={2}
          size="small"
          label="Loan Notes"
          value={formData.loanNotes}
          onChange={(event) => onChange("loanNotes", event.target.value)}
          placeholder="Add any comments or notes about this payment..."
        />
      </Grid>
      <Grid item xs={12}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} justifyContent="flex-end">
          <Button
            variant="outlined"
            onClick={onCancel}
            sx={{ minWidth: 120, borderRadius: "8px", borderColor: BORDER, color: INK, fontWeight: 800 }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            startIcon={<Save sx={{ fontSize: 16 }} />}
            onClick={onSave}
            disabled={saving || !project?._id}
            sx={{ minWidth: 150, borderRadius: "8px", bgcolor: BRAND, fontWeight: 900, "&:hover": { bgcolor: "#1d4ed8" } }}
          >
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </Stack>
      </Grid>
    </Grid>
  </Paper>
);

const InstallationWorkspace = ({
  project,
  formData,
  errors,
  saving,
  onChange,
  onCancel,
  onSave,
}) => {
  const currentInstallation =
    INSTALLATION_STATUS_OPTIONS.find((status) => status.value === project?.installationStatus)?.label ||
    formatStatusLabel(project?.installationStatus || "pending");
  const currentLead = project?.status || "Installation Completion";

  return (
    <Paper elevation={0} sx={{ borderRadius: "12px", border: `1px solid ${BORDER}`, bgcolor: "#fff", overflow: "hidden" }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ p: 2.25, bgcolor: alpha(BRAND, 0.05), borderBottom: `1px solid ${BORDER}` }}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Box sx={{ width: 46, height: 46, borderRadius: "50%", bgcolor: alpha(BRAND, 0.12), color: BRAND, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Build sx={{ fontSize: 26 }} />
          </Box>
          <Box>
            <Typography variant="h6" fontWeight={900} color={INK} sx={{ lineHeight: 1.15 }}>
              Update Installation Status
            </Typography>
            <Typography variant="body2" sx={{ color: MUTED }}>
              {getCustomerName(project)}
            </Typography>
          </Box>
        </Stack>
        <Button
          size="small"
          variant="text"
          onClick={onCancel}
          sx={{ minWidth: 0, color: MUTED, fontSize: 24, lineHeight: 1 }}
        >
          x
        </Button>
      </Stack>

      <Box sx={{ p: 2.25 }}>
        <Grid container spacing={2} sx={{ mb: 2.5 }}>
          <Grid item xs={12} sm={6}>
            <Typography variant="subtitle2" fontWeight={900} color={INK} sx={{ mb: 0.75 }}>
              Current Installation Status
            </Typography>
            <Chip
              icon={<Payments sx={{ fontSize: "16px !important" }} />}
              label={currentInstallation}
              size="small"
              sx={{ bgcolor: alpha(BRAND, 0.08), color: BRAND, fontWeight: 900, "& .MuiChip-icon": { color: `${MUTED} !important` } }}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="subtitle2" fontWeight={900} color={INK} sx={{ mb: 0.75 }}>
              Current Lead Status
            </Typography>
            <Chip
              icon={<CheckCircle sx={{ fontSize: "16px !important" }} />}
              label={currentLead}
              size="small"
              sx={{ bgcolor: alpha(BRAND, 0.08), color: BRAND, fontWeight: 900, "& .MuiChip-icon": { color: `${MUTED} !important` } }}
            />
          </Grid>
        </Grid>

        <Stack spacing={2}>
          <FormControl fullWidth size="small" error={!!errors.installationStatus}>
            <InputLabel>New Installation Status *</InputLabel>
            <Select
              label="New Installation Status *"
              value={formData.installationStatus}
              onChange={(event) => onChange("installationStatus", event.target.value)}
              sx={{ borderRadius: "10px" }}
            >
              <MenuItem value="">
                <em>Select status</em>
              </MenuItem>
              {INSTALLATION_STATUS_OPTIONS.map((status) => (
                <MenuItem key={status.value} value={status.value}>{status.label}</MenuItem>
              ))}
            </Select>
            {errors.installationStatus && <FormHelperText>{errors.installationStatus}</FormHelperText>}
          </FormControl>

          <FormControl fullWidth size="small">
            <InputLabel>Lead Status *</InputLabel>
            <Select
              label="Lead Status *"
              value={formData.status}
              onChange={(event) => onChange("status", event.target.value)}
              sx={{ borderRadius: "10px" }}
            >
              {INSTALLATION_LEAD_STATUS_OPTIONS.map((status) => (
                <MenuItem key={status.value} value={status.value}>
                  <Stack direction="row" spacing={1.25} alignItems="center">
                    <CheckCircle sx={{ fontSize: 17, color: INK }} />
                    <Box>
                      <Typography variant="body2">{status.label}</Typography>
                      <Typography variant="caption" sx={{ color: MUTED }}>{status.description}</Typography>
                    </Box>
                  </Stack>
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            fullWidth
            size="small"
            type="date"
            label="Installation Date"
            value={formData.installationDate}
            onChange={(event) => onChange("installationDate", event.target.value)}
            InputLabelProps={{ shrink: true }}
          />

          <TextField
            fullWidth
            multiline
            minRows={4}
            size="small"
            label="Installation Notes"
            placeholder="Add notes about this installation..."
            value={formData.installationNotes}
            onChange={(event) => onChange("installationNotes", event.target.value)}
          />

          <Stack direction="row" spacing={1.25} alignItems="center" sx={{ p: 1.75, borderRadius: "999px", bgcolor: alpha(BRAND, 0.08), color: "#24476b" }}>
            <InfoOutlined sx={{ fontSize: 20, color: "#4c9dff" }} />
            <Typography variant="body2">
              When marked as final payment, installation will be considered completed.
            </Typography>
          </Stack>
        </Stack>
      </Box>

      <Stack direction="row" justifyContent="flex-end" spacing={2} sx={{ p: 2, borderTop: `1px solid ${BORDER}`, bgcolor: "#fff" }}>
        <Button
          variant="outlined"
          onClick={onCancel}
          sx={{ minWidth: 120, borderRadius: "12px", borderColor: BRAND, color: BRAND, fontWeight: 900 }}
        >
          Cancel
        </Button>
        <Button
          variant="contained"
          startIcon={<Save sx={{ fontSize: 17 }} />}
          onClick={onSave}
          disabled={saving || !project?._id}
          sx={{ minWidth: 170, borderRadius: "12px", bgcolor: "#f47b2c", fontWeight: 900, "&:hover": { bgcolor: "#ea6b1f" } }}
        >
          {saving ? "Updating..." : "Update Status"}
        </Button>
      </Stack>
    </Paper>
  );
};

const DisbursementWorkspace = ({
  project,
  formData,
  errors,
  saving,
  onChange,
  onCancel,
  onSave,
}) => {
  const currentDisbursement =
    DISBURSEMENT_STATUS_OPTIONS.find((status) => status.value === project?.disbursementStatus)?.label ||
    formatStatusLabel(project?.disbursementStatus || "pending");
  const currentLead = project?.status || "Disbursement";
  const selectedStatus = DISBURSEMENT_STATUS_OPTIONS.find((status) => status.value === formData.disbursementStatus);
  const selectedLead = DISBURSEMENT_LEAD_STATUS_OPTIONS.find((status) => status.value === formData.status);

  return (
    <Paper elevation={0} sx={{ borderRadius: "12px", border: `1px solid ${BORDER}`, bgcolor: "#fff", overflow: "hidden" }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ p: 2.25, bgcolor: alpha(BRAND, 0.05), borderBottom: `1px solid ${BORDER}` }}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Box sx={{ width: 46, height: 46, borderRadius: "50%", bgcolor: alpha(BRAND, 0.12), color: BRAND, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Payments sx={{ fontSize: 26 }} />
          </Box>
          <Box>
            <Typography variant="h6" fontWeight={900} color={INK} sx={{ lineHeight: 1.15 }}>
              Update Disbursement Status
            </Typography>
            <Typography variant="body2" sx={{ color: MUTED }}>
              {getCustomerName(project)}
            </Typography>
          </Box>
        </Stack>
        <Button
          size="small"
          variant="text"
          onClick={onCancel}
          sx={{ minWidth: 0, color: MUTED, fontSize: 24, lineHeight: 1 }}
        >
          x
        </Button>
      </Stack>

      <Box sx={{ p: 2.25 }}>
        <Grid container spacing={2} sx={{ mb: 2.5 }}>
          <Grid item xs={12} sm={6}>
            <Typography variant="subtitle2" fontWeight={900} color={INK} sx={{ mb: 0.75 }}>
              Current Disbursement Status
            </Typography>
            <Chip
              icon={<Payments sx={{ fontSize: "16px !important" }} />}
              label={currentDisbursement}
              size="small"
              sx={{ bgcolor: alpha(BRAND, 0.08), color: BRAND, fontWeight: 900, "& .MuiChip-icon": { color: `${MUTED} !important` } }}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="subtitle2" fontWeight={900} color={INK} sx={{ mb: 0.75 }}>
              Current Lead Status
            </Typography>
            <Chip
              icon={<Payments sx={{ fontSize: "16px !important" }} />}
              label={currentLead}
              size="small"
              sx={{ bgcolor: alpha(BRAND, 0.08), color: BRAND, fontWeight: 900, "& .MuiChip-icon": { color: `${MUTED} !important` } }}
            />
          </Grid>
        </Grid>

        <Stack spacing={2}>
          <FormControl fullWidth size="small" error={!!errors.disbursementStatus}>
            <InputLabel>New Disbursement Status *</InputLabel>
            <Select
              label="New Disbursement Status *"
              value={formData.disbursementStatus}
              onChange={(event) => onChange("disbursementStatus", event.target.value)}
              sx={{ borderRadius: "10px" }}
            >
              {DISBURSEMENT_STATUS_OPTIONS.map((status) => (
                <MenuItem key={status.value} value={status.value}>
                  <Stack direction="row" spacing={1.25} alignItems="center">
                    <Payments sx={{ fontSize: 17, color: INK }} />
                    <Box>
                      <Typography variant="body2">{status.label}</Typography>
                      <Typography variant="caption" sx={{ color: MUTED }}>{status.description}</Typography>
                    </Box>
                  </Stack>
                </MenuItem>
              ))}
            </Select>
            {errors.disbursementStatus && <FormHelperText>{errors.disbursementStatus}</FormHelperText>}
          </FormControl>

          <FormControl fullWidth size="small" error={!!errors.status}>
            <InputLabel>Lead Status *</InputLabel>
            <Select
              label="Lead Status *"
              value={formData.status}
              onChange={(event) => onChange("status", event.target.value)}
              sx={{ borderRadius: "10px" }}
            >
              {DISBURSEMENT_LEAD_STATUS_OPTIONS.map((status) => (
                <MenuItem key={status.value} value={status.value}>
                  <Stack direction="row" spacing={1.25} alignItems="center">
                    <Payments sx={{ fontSize: 17, color: INK }} />
                    <Box>
                      <Typography variant="body2">{status.label}</Typography>
                      <Typography variant="caption" sx={{ color: MUTED }}>{status.description}</Typography>
                    </Box>
                  </Stack>
                </MenuItem>
              ))}
            </Select>
            {errors.status && <FormHelperText>{errors.status}</FormHelperText>}
          </FormControl>

          {formData.disbursementStatus === "completed" && (
            <Grid container spacing={1.5}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  size="small"
                  type="number"
                  label="Disbursement Amount *"
                  value={formData.disbursementAmount}
                  onChange={(event) => onChange("disbursementAmount", event.target.value)}
                  error={!!errors.disbursementAmount}
                  helperText={errors.disbursementAmount}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <CurrencyRupee sx={{ fontSize: 16 }} />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  size="small"
                  type="date"
                  label="Disbursement Date *"
                  value={formData.disbursementDate}
                  onChange={(event) => onChange("disbursementDate", event.target.value)}
                  error={!!errors.disbursementDate}
                  helperText={errors.disbursementDate}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
            </Grid>
          )}

          <TextField
            fullWidth
            multiline
            minRows={4}
            size="small"
            label="Notes"
            placeholder="Add any remarks or internal notes..."
            value={formData.disbursementNotes}
            onChange={(event) => onChange("disbursementNotes", event.target.value)}
          />

          <Stack direction="row" spacing={1.25} alignItems="center" sx={{ p: 1.75, borderRadius: "999px", bgcolor: alpha(BRAND, 0.08), color: "#24476b" }}>
            <InfoOutlined sx={{ fontSize: 20, color: "#4c9dff" }} />
            <Typography variant="body2">
              Lead remains in -> {selectedLead?.label || "Disbursement"} stage
              {selectedStatus ? ` (${selectedStatus.description.toLowerCase()})` : ""}
            </Typography>
          </Stack>
        </Stack>
      </Box>

      <Stack direction="row" justifyContent="flex-end" spacing={2} sx={{ p: 2, borderTop: `1px solid ${BORDER}`, bgcolor: "#fff" }}>
        <Button
          variant="outlined"
          onClick={onCancel}
          sx={{ minWidth: 120, borderRadius: "12px", borderColor: BRAND, color: BRAND, fontWeight: 900 }}
        >
          Cancel
        </Button>
        <Button
          variant="contained"
          startIcon={<Save sx={{ fontSize: 17 }} />}
          onClick={onSave}
          disabled={saving || !project?._id}
          sx={{ minWidth: 170, borderRadius: "12px", bgcolor: "#f47b2c", fontWeight: 900, "&:hover": { bgcolor: "#ea6b1f" } }}
        >
          {saving ? "Updating..." : "Update Status"}
        </Button>
      </Stack>
    </Paper>
  );
};

const LoanPendingWorkspace = ({
  project,
  formData,
  errors,
  saving,
  onChange,
  onCancel,
  onSave,
}) => {
  const currentBank =
    BANK_STATUS_OPTIONS.find((status) => status.value === project?.bankAtPendingStatus)?.label ||
    formatStatusLabel(project?.bankAtPendingStatus || "pending");
  const currentBankDescription =
    BANK_STATUS_OPTIONS.find((status) => status.value === project?.bankAtPendingStatus)?.description ||
    "Waiting for bank approval";
  const currentLead = project?.status || "Bank at Pending";
  const currentLeadDescription =
    BANK_LEAD_STATUS_OPTIONS.find((status) => status.value === currentLead)?.description ||
    "Awaiting bank approval";
  const selectedLead =
    BANK_LEAD_STATUS_OPTIONS.find((status) => status.value === formData.status) || BANK_LEAD_STATUS_OPTIONS[0];

  return (
    <Paper elevation={0} sx={{ borderRadius: "12px", border: `1px solid ${BORDER}`, bgcolor: "#fff", overflow: "hidden" }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ p: 2.25, bgcolor: alpha(BRAND, 0.05), borderBottom: `1px solid ${BORDER}` }}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Box sx={{ width: 46, height: 46, borderRadius: "50%", bgcolor: alpha(BRAND, 0.12), color: BRAND, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <AccountBalance sx={{ fontSize: 26 }} />
          </Box>
          <Box>
            <Typography variant="h6" fontWeight={900} color={INK} sx={{ lineHeight: 1.15 }}>
              Update Bank Status
            </Typography>
            <Typography variant="body2" sx={{ color: MUTED }}>
              {getCustomerName(project)}
            </Typography>
          </Box>
        </Stack>
        <Button
          size="small"
          variant="text"
          onClick={onCancel}
          sx={{ minWidth: 0, color: MUTED, fontSize: 24, lineHeight: 1 }}
        >
          x
        </Button>
      </Stack>

      <Box sx={{ p: 2.25 }}>
        <Stack spacing={2.5}>
          <Box>
            <Typography variant="subtitle2" fontWeight={900} color={INK} sx={{ mb: 0.75 }}>
              Current Bank Status
            </Typography>
            <Chip
              icon={<AccountBalance sx={{ fontSize: "16px !important" }} />}
              label={currentBank}
              size="small"
              sx={{ bgcolor: alpha(BRAND, 0.08), color: BRAND, fontWeight: 900, "& .MuiChip-icon": { color: `${MUTED} !important` } }}
            />
            <Typography variant="body2" sx={{ color: MUTED, mt: 1 }}>
              {currentBankDescription}
            </Typography>
          </Box>

          <Box>
            <Typography variant="subtitle2" fontWeight={900} color={INK} sx={{ mb: 0.75 }}>
              Current Lead Status
            </Typography>
            <Chip
              icon={<AccountBalance sx={{ fontSize: "16px !important" }} />}
              label={currentLead}
              size="small"
              sx={{ bgcolor: alpha(BRAND, 0.08), color: BRAND, fontWeight: 900, "& .MuiChip-icon": { color: `${MUTED} !important` } }}
            />
            <Typography variant="body2" sx={{ color: MUTED, mt: 1 }}>
              {currentLeadDescription}
            </Typography>
          </Box>

          <FormControl fullWidth size="small" error={!!errors.bankAtPendingStatus}>
            <InputLabel>New Bank Status *</InputLabel>
            <Select
              label="New Bank Status *"
              value={formData.bankAtPendingStatus}
              onChange={(event) => onChange("bankAtPendingStatus", event.target.value)}
              sx={{ borderRadius: "10px" }}
            >
              <MenuItem value="">
                <em>Select bank status</em>
              </MenuItem>
              {BANK_STATUS_OPTIONS.map((status) => (
                <MenuItem key={status.value} value={status.value}>
                  <Stack direction="row" spacing={1.25} alignItems="center">
                    <AccountBalance sx={{ fontSize: 17, color: INK }} />
                    <Box>
                      <Typography variant="body2">{status.label}</Typography>
                      <Typography variant="caption" sx={{ color: MUTED }}>{status.description}</Typography>
                    </Box>
                  </Stack>
                </MenuItem>
              ))}
            </Select>
            {errors.bankAtPendingStatus && <FormHelperText>{errors.bankAtPendingStatus}</FormHelperText>}
          </FormControl>

          <FormControl fullWidth size="small" error={!!errors.status}>
            <InputLabel>Lead Status *</InputLabel>
            <Select
              label="Lead Status *"
              value={formData.status}
              onChange={(event) => onChange("status", event.target.value)}
              sx={{ borderRadius: "10px" }}
            >
              {BANK_LEAD_STATUS_OPTIONS.map((status) => (
                <MenuItem key={status.value} value={status.value}>
                  <Stack direction="row" spacing={1.25} alignItems="center">
                    <AccountBalance sx={{ fontSize: 17, color: INK }} />
                    <Box>
                      <Typography variant="body2">{status.label}</Typography>
                      <Typography variant="caption" sx={{ color: MUTED }}>{status.description}</Typography>
                    </Box>
                  </Stack>
                </MenuItem>
              ))}
            </Select>
            {errors.status && <FormHelperText>{errors.status}</FormHelperText>}
          </FormControl>

          {formData.bankAtPendingStatus === "rejected" && (
            <TextField
              fullWidth
              size="small"
              label="Rejection Reason *"
              placeholder="Enter reason for rejection..."
              value={formData.reason}
              onChange={(event) => onChange("reason", event.target.value)}
              error={!!errors.reason}
              helperText={errors.reason}
            />
          )}

          <TextField
            fullWidth
            multiline
            minRows={4}
            size="small"
            label="Status Notes"
            placeholder="Add notes about this status update..."
            value={formData.bankAtPendingNotes}
            onChange={(event) => onChange("bankAtPendingNotes", event.target.value)}
          />

          <Stack direction="row" spacing={1.25} alignItems="center" sx={{ p: 1.75, borderRadius: "999px", bgcolor: alpha(BRAND, 0.08), color: "#24476b" }}>
            <InfoOutlined sx={{ fontSize: 20, color: "#4c9dff" }} />
            <Typography variant="body2">
              When pending, lead will stay in {selectedLead.label} stage.
            </Typography>
          </Stack>
        </Stack>
      </Box>

      <Stack direction="row" justifyContent="flex-end" spacing={2} sx={{ p: 2, borderTop: `1px solid ${BORDER}`, bgcolor: "#fff" }}>
        <Button
          variant="outlined"
          onClick={onCancel}
          sx={{ minWidth: 120, borderRadius: "12px", borderColor: BRAND, color: BRAND, fontWeight: 900 }}
        >
          Cancel
        </Button>
        <Button
          variant="contained"
          startIcon={<Save sx={{ fontSize: 17 }} />}
          onClick={onSave}
          disabled={saving || !project?._id}
          sx={{ minWidth: 170, borderRadius: "12px", bgcolor: "#f47b2c", fontWeight: 900, "&:hover": { bgcolor: "#ea6b1f" } }}
        >
          {saving ? "Updating..." : "Update Status"}
        </Button>
      </Stack>
    </Paper>
  );
};

function ProjectDetails() {
  const { projectId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { fetchAPI } = useAuth();

  const [project, setProject] = useState(location.state?.project || null);
  const [loading, setLoading] = useState(!location.state?.project);
  const [error, setError] = useState("");
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "info" });
  const [selectedWorkflowStage, setSelectedWorkflowStage] = useState(() => {
    const initialStage = normalizeProjectStage(location.state?.projectStage);
    return ACTION_STAGES.some((stage) => stage.key === initialStage) ? initialStage : "summary";
  });
  const [registrationForm, setRegistrationForm] = useState({
    address: "",
    city: "",
    pincode: "",
    solarRequirement: "",
    dateOfRegistration: "",
    registrationStatus: "inProgress",
    registrationNotes: "",
    status: "Registration",
  });
  const [registrationErrors, setRegistrationErrors] = useState({});
  const [savingRegistration, setSavingRegistration] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    paymentType: "Bank Loan",
    loanAmount: "",
    bank: "",
    branchName: "",
    loanStatus: "pending",
    loanApprovalDate: "",
    loanNotes: "",
    status: "Bank Loan Apply",
  });
  const [paymentErrors, setPaymentErrors] = useState({});
  const [savingPayment, setSavingPayment] = useState(false);
  const [installationForm, setInstallationForm] = useState({
    installationStatus: "",
    status: "Installation Completion",
    installationDate: "",
    installationNotes: "",
  });
  const [installationErrors, setInstallationErrors] = useState({});
  const [savingInstallation, setSavingInstallation] = useState(false);
  const [disbursementForm, setDisbursementForm] = useState({
    disbursementStatus: "pending",
    status: "Disbursement",
    disbursementAmount: "",
    disbursementDate: "",
    disbursementNotes: "",
  });
  const [disbursementErrors, setDisbursementErrors] = useState({});
  const [savingDisbursement, setSavingDisbursement] = useState(false);
  const [loanPendingForm, setLoanPendingForm] = useState({
    bankAtPendingStatus: "",
    status: "Bank at Pending",
    reason: "",
    bankAtPendingNotes: "",
  });
  const [loanPendingErrors, setLoanPendingErrors] = useState({});
  const [savingLoanPending, setSavingLoanPending] = useState(false);

  const fetchProject = useCallback(async () => {
    if (!projectId) {
      setError("Project ID is missing.");
      setLoading(false);
      return;
    }

    try {
      setLoading(!project);
      setError("");
      const res = await fetchAPI(`/lead/getLeadById/${projectId}`);
      const nextProject = res?.result?.lead || res?.result;
      if (res?.success && nextProject) {
        setProject(nextProject);
      } else {
        throw new Error(res?.message || "Failed to load project");
      }
    } catch (err) {
      setError(err.message || "Failed to load project");
    } finally {
      setLoading(false);
    }
  }, [fetchAPI, project, projectId]);

  useEffect(() => {
    fetchProject();
  }, [fetchProject]);

  const currentStageKey = normalizeProjectStage(project || location.state?.projectStage);
  const currentStage = getStageMeta(currentStageKey);
  const currentIndex = Math.max(stageIndex(currentStageKey), 0);
  const progress = Math.round(((currentIndex + 1) / PROJECT_STAGES.length) * 100);
  const selectedWorkflow = getStageMeta(selectedWorkflowStage);

  const getRegistrationForm = useCallback((source) => ({
    address: source?.address || "",
    city: source?.city || "",
    pincode: source?.pincode || "",
    solarRequirement: source?.solarRequirement || "",
    dateOfRegistration: formatInputDate(source?.dateOfRegistration || source?.createdAt),
    registrationStatus: source?.registrationStatus || "inProgress",
    registrationNotes: source?.registrationNotes || "",
    status: source?.status || "Registration",
  }), []);

  const getPaymentForm = useCallback((source) => ({
    paymentType: source?.paymentType || "Bank Loan",
    loanAmount: source?.loanAmount ? String(source.loanAmount) : "",
    bank: source?.bank || "",
    branchName: source?.branchName || "",
    loanStatus: source?.loanStatus || "pending",
    loanApprovalDate: formatInputDate(source?.loanApprovalDate),
    loanNotes: source?.loanNotes || "",
    status: source?.status || "Bank Loan Apply",
  }), []);

  const getInstallationForm = useCallback((source) => ({
    installationStatus: source?.installationStatus || "",
    status: source?.status || "Installation Completion",
    installationDate: formatInputDate(source?.installationDate),
    installationNotes: source?.installationNotes || "",
  }), []);

  const getDisbursementForm = useCallback((source) => ({
    disbursementStatus: source?.disbursementStatus || "pending",
    status: source?.status || "Disbursement",
    disbursementAmount: source?.disbursementAmount ? String(source.disbursementAmount) : "",
    disbursementDate: formatInputDate(source?.disbursementDate),
    disbursementNotes: source?.disbursementNotes || "",
  }), []);

  const getLoanPendingForm = useCallback((source) => ({
    bankAtPendingStatus: source?.bankAtPendingStatus || "",
    status: source?.status || "Bank at Pending",
    reason: source?.reason || "",
    bankAtPendingNotes: source?.bankAtPendingNotes || "",
  }), []);

  useEffect(() => {
    setRegistrationForm(getRegistrationForm(project));
    setRegistrationErrors({});
    setPaymentForm(getPaymentForm(project));
    setPaymentErrors({});
    setInstallationForm(getInstallationForm(project));
    setInstallationErrors({});
    setDisbursementForm(getDisbursementForm(project));
    setDisbursementErrors({});
    setLoanPendingForm(getLoanPendingForm(project));
    setLoanPendingErrors({});
  }, [getDisbursementForm, getInstallationForm, getLoanPendingForm, getPaymentForm, getRegistrationForm, project]);

  const stageState = useCallback(
    (stageKey) => {
      const index = stageIndex(stageKey);
      if (index < currentIndex) return "done";
      if (index === currentIndex) return "active";
      return "pending";
    },
    [currentIndex],
  );

  const actionState = useMemo(() => {
    if (!project) return {};
    return {
      registration: project.registrationStatus || "pending",
      document: project.documentStatus || "pending",
      payment: project.loanStatus || project.paymentStatus || "pending",
      loan_pending: project.bankAtPendingStatus || "pending",
      installation: project.installationStatus || "pending",
      disbursement: project.disbursementStatus || "pending",
    };
  }, [project]);

  const openStagePage = (stageKey) => {
    const path = STAGE_ROUTES[stageKey];
    if (!path || !project?._id) return;
    navigate(path, {
      state: {
        fromProjects: true,
        projectStage: stageKey,
        projectId: project._id,
        leadId: project._id,
        project,
      },
    });
  };

  const openSurveyEditor = useCallback(() => {
    if (!project?._id) return;
    navigate("/add-visit", {
      state: {
        lead: project,
        source: "project-details-site-survey",
      },
    });
  }, [navigate, project]);

  const validateRegistrationForm = useCallback(() => {
    const errors = {};
    if (!registrationForm.address.trim()) errors.address = "Address is required";
    if (!registrationForm.city.trim()) errors.city = "City is required";
    if (!registrationForm.pincode.trim()) {
      errors.pincode = "Pincode is required";
    } else if (!/^\d{6}$/.test(registrationForm.pincode.trim())) {
      errors.pincode = "Pincode must be 6 digits";
    }
    if (!registrationForm.solarRequirement.trim()) errors.solarRequirement = "Solar requirement is required";
    setRegistrationErrors(errors);
    return Object.keys(errors).length === 0;
  }, [registrationForm]);

  const handleRegistrationFieldChange = useCallback((field, value) => {
    setRegistrationForm((prev) => ({ ...prev, [field]: value }));
    setRegistrationErrors((prev) => ({ ...prev, [field]: "" }));
  }, []);

  const clearRegistrationForm = useCallback(() => {
    setRegistrationForm({
      address: "",
      city: "",
      pincode: "",
      solarRequirement: "",
      dateOfRegistration: "",
      registrationStatus: "inProgress",
      registrationNotes: "",
      status: "Registration",
    });
    setRegistrationErrors({});
  }, []);

  const resetRegistrationForm = useCallback(() => {
    setRegistrationForm(getRegistrationForm(project));
    setRegistrationErrors({});
  }, [getRegistrationForm, project]);

  const saveRegistration = useCallback(async () => {
    if (!project?._id) return;
    if (!validateRegistrationForm()) {
      setSnackbar({ open: true, message: "Please complete the required registration fields", severity: "error" });
      return;
    }

    setSavingRegistration(true);
    try {
      const payload = {
        address: registrationForm.address.trim(),
        city: registrationForm.city.trim(),
        pincode: registrationForm.pincode.trim(),
        solarRequirement: registrationForm.solarRequirement.trim(),
        registrationStatus: registrationForm.registrationStatus,
        registrationNotes: registrationForm.registrationNotes.trim(),
        status: registrationForm.status,
      };

      if (registrationForm.dateOfRegistration) {
        payload.dateOfRegistration = registrationForm.dateOfRegistration;
      }

      const response = await fetchAPI(`/lead/updateLead/${project._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response?.success) {
        throw new Error(response?.message || "Failed to update registration");
      }

      const updatedProject = response?.result?.lead || response?.result || { ...project, ...payload };
      setProject(updatedProject);
      setSnackbar({ open: true, message: "Registration updated successfully", severity: "success" });
    } catch (err) {
      setSnackbar({ open: true, message: err.message || "Failed to update registration", severity: "error" });
    } finally {
      setSavingRegistration(false);
    }
  }, [fetchAPI, project, registrationForm, validateRegistrationForm]);

  const validatePaymentForm = useCallback(() => {
    const errors = {};
    if (!paymentForm.loanAmount) errors.loanAmount = "Loan amount is required";
    if (!paymentForm.bank) errors.bank = "Bank name is required";
    if (!paymentForm.branchName.trim()) errors.branchName = "Branch name is required";
    setPaymentErrors(errors);
    return Object.keys(errors).length === 0;
  }, [paymentForm]);

  const handlePaymentFieldChange = useCallback((field, value) => {
    setPaymentForm((prev) => ({ ...prev, [field]: value }));
    setPaymentErrors((prev) => ({ ...prev, [field]: "" }));
  }, []);

  const clearPaymentForm = useCallback(() => {
    setPaymentForm({
      paymentType: "Bank Loan",
      loanAmount: "",
      bank: "",
      branchName: "",
      loanStatus: "pending",
      loanApprovalDate: "",
      loanNotes: "",
      status: "Bank Loan Apply",
    });
    setPaymentErrors({});
  }, []);

  const resetPaymentForm = useCallback(() => {
    setPaymentForm(getPaymentForm(project));
    setPaymentErrors({});
  }, [getPaymentForm, project]);

  const savePayment = useCallback(async () => {
    if (!project?._id) return;
    if (!validatePaymentForm()) {
      setSnackbar({ open: true, message: "Please complete the required payment fields", severity: "error" });
      return;
    }

    setSavingPayment(true);
    try {
      const payload = {
        paymentType: paymentForm.paymentType,
        loanAmount: parseFloat(paymentForm.loanAmount),
        bank: paymentForm.bank.trim(),
        branchName: paymentForm.branchName.trim(),
        loanStatus: paymentForm.loanStatus,
        loanNotes: paymentForm.loanNotes.trim(),
        status: paymentForm.status,
      };

      if (paymentForm.loanApprovalDate) {
        payload.loanApprovalDate = paymentForm.loanApprovalDate;
      }

      const response = await fetchAPI(`/lead/updateLead/${project._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response?.success) {
        throw new Error(response?.message || "Failed to update payment");
      }

      const updatedProject = response?.result?.lead || response?.result || { ...project, ...payload };
      setProject(updatedProject);
      setSnackbar({ open: true, message: "Payment updated successfully", severity: "success" });
    } catch (err) {
      setSnackbar({ open: true, message: err.message || "Failed to update payment", severity: "error" });
    } finally {
      setSavingPayment(false);
    }
  }, [fetchAPI, paymentForm, project, validatePaymentForm]);

  const validateInstallationForm = useCallback(() => {
    const errors = {};
    if (!installationForm.installationStatus) {
      errors.installationStatus = "Please select installation status";
    }
    setInstallationErrors(errors);
    return Object.keys(errors).length === 0;
  }, [installationForm]);

  const handleInstallationFieldChange = useCallback((field, value) => {
    setInstallationForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === "installationStatus" && value === "final_payment") {
        next.status = "Installation Completion";
      }
      return next;
    });
    setInstallationErrors((prev) => ({ ...prev, [field]: "" }));
  }, []);

  const resetInstallationForm = useCallback(() => {
    setInstallationForm(getInstallationForm(project));
    setInstallationErrors({});
  }, [getInstallationForm, project]);

  const saveInstallation = useCallback(async () => {
    if (!project?._id) return;
    if (!validateInstallationForm()) {
      setSnackbar({ open: true, message: "Please select installation status", severity: "error" });
      return;
    }

    setSavingInstallation(true);
    try {
      const payload = {
        installationStatus: installationForm.installationStatus,
        status: installationForm.status,
        installationNotes: installationForm.installationNotes.trim(),
      };

      if (installationForm.installationDate) {
        payload.installationDate = installationForm.installationDate;
      }

      const response = await fetchAPI(`/lead/updateLead/${project._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response?.success) {
        throw new Error(response?.message || "Failed to update installation");
      }

      const updatedProject = response?.result?.lead || response?.result || { ...project, ...payload };
      setProject(updatedProject);
      setSnackbar({ open: true, message: "Installation status updated successfully", severity: "success" });
    } catch (err) {
      setSnackbar({ open: true, message: err.message || "Failed to update installation", severity: "error" });
    } finally {
      setSavingInstallation(false);
    }
  }, [fetchAPI, installationForm, project, validateInstallationForm]);

  const validateDisbursementForm = useCallback(() => {
    const errors = {};
    if (!disbursementForm.disbursementStatus) {
      errors.disbursementStatus = "Please select disbursement status";
    }
    if (!disbursementForm.status) {
      errors.status = "Please select lead status";
    }
    if (disbursementForm.disbursementStatus === "completed") {
      if (!disbursementForm.disbursementAmount) {
        errors.disbursementAmount = "Disbursement amount is required";
      } else if (Number(disbursementForm.disbursementAmount) <= 0) {
        errors.disbursementAmount = "Enter a valid amount";
      }
      if (!disbursementForm.disbursementDate) {
        errors.disbursementDate = "Disbursement date is required";
      }
    }
    setDisbursementErrors(errors);
    return Object.keys(errors).length === 0;
  }, [disbursementForm]);

  const handleDisbursementFieldChange = useCallback((field, value) => {
    setDisbursementForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === "disbursementStatus" && value === "completed") {
        next.status = "Installation Completion";
      }
      if (field === "disbursementStatus" && value !== "completed" && prev.status === "Installation Completion") {
        next.status = "Disbursement";
      }
      return next;
    });
    setDisbursementErrors((prev) => ({ ...prev, [field]: "" }));
  }, []);

  const resetDisbursementForm = useCallback(() => {
    setDisbursementForm(getDisbursementForm(project));
    setDisbursementErrors({});
  }, [getDisbursementForm, project]);

  const saveDisbursement = useCallback(async () => {
    if (!project?._id) return;
    if (!validateDisbursementForm()) {
      setSnackbar({ open: true, message: "Please complete the required disbursement fields", severity: "error" });
      return;
    }

    setSavingDisbursement(true);
    try {
      const payload = {
        disbursementStatus: disbursementForm.disbursementStatus,
        status: disbursementForm.status,
        disbursementNotes: disbursementForm.disbursementNotes.trim(),
      };

      if (disbursementForm.disbursementStatus === "completed") {
        payload.disbursementAmount = parseFloat(disbursementForm.disbursementAmount);
        payload.disbursementDate = disbursementForm.disbursementDate;
      }

      const response = await fetchAPI(`/lead/updateLead/${project._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response?.success) {
        throw new Error(response?.message || "Failed to update disbursement");
      }

      const updatedProject = response?.result?.lead || response?.result || { ...project, ...payload };
      setProject(updatedProject);
      setSnackbar({ open: true, message: "Disbursement status updated successfully", severity: "success" });
    } catch (err) {
      setSnackbar({ open: true, message: err.message || "Failed to update disbursement", severity: "error" });
    } finally {
      setSavingDisbursement(false);
    }
  }, [disbursementForm, fetchAPI, project, validateDisbursementForm]);

  const validateLoanPendingForm = useCallback(() => {
    const errors = {};
    if (!loanPendingForm.bankAtPendingStatus) {
      errors.bankAtPendingStatus = "Please select a bank status";
    }
    if (!loanPendingForm.status) {
      errors.status = "Please select a lead status";
    }
    if (loanPendingForm.bankAtPendingStatus === "rejected" && !loanPendingForm.reason.trim()) {
      errors.reason = "Reason is required for rejection";
    }
    setLoanPendingErrors(errors);
    return Object.keys(errors).length === 0;
  }, [loanPendingForm]);

  const handleLoanPendingFieldChange = useCallback((field, value) => {
    setLoanPendingForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === "bankAtPendingStatus") {
        if (value === "approved") next.status = "Disbursement";
        if (value === "rejected") next.status = "Missed Leads";
        if (value === "pending") next.status = "Bank at Pending";
      }
      return next;
    });
    setLoanPendingErrors((prev) => ({ ...prev, [field]: "" }));
  }, []);

  const resetLoanPendingForm = useCallback(() => {
    setLoanPendingForm(getLoanPendingForm(project));
    setLoanPendingErrors({});
  }, [getLoanPendingForm, project]);

  const saveLoanPending = useCallback(async () => {
    if (!project?._id) return;
    if (!validateLoanPendingForm()) {
      setSnackbar({ open: true, message: "Please complete the required bank status fields", severity: "error" });
      return;
    }

    setSavingLoanPending(true);
    try {
      const payload = {
        bankAtPendingStatus: loanPendingForm.bankAtPendingStatus,
        status: loanPendingForm.status,
        reason: loanPendingForm.bankAtPendingStatus === "rejected" ? loanPendingForm.reason.trim() : "",
        bankAtPendingNotes: loanPendingForm.bankAtPendingNotes.trim(),
      };

      const response = await fetchAPI(`/lead/updateLead/${project._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response?.success) {
        throw new Error(response?.message || "Failed to update bank status");
      }

      const updatedProject = response?.result?.lead || response?.result || { ...project, ...payload };
      setProject(updatedProject);
      setSnackbar({ open: true, message: "Bank status updated successfully", severity: "success" });
    } catch (err) {
      setSnackbar({ open: true, message: err.message || "Failed to update bank status", severity: "error" });
    } finally {
      setSavingLoanPending(false);
    }
  }, [fetchAPI, loanPendingForm, project, validateLoanPendingForm]);

  const editProject = () => {
    if (!project?._id) return;
    navigate(`/all-leads/${project._id}`, { state: { lead: project, edit: true } });
  };

  const createDocumentUploadToken = useCallback(
    (id) => window.btoa(String(id)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, ""),
    [],
  );

  const createDocumentUploadLink = useCallback(async () => {
    if (!project?._id) {
      setSnackbar({ open: true, message: "Project is not ready for document upload", severity: "error" });
      return;
    }

    const token = createDocumentUploadToken(project._id);
    const link = `${window.location.origin}/documents/upload/${token}`;

    try {
      await navigator.clipboard?.writeText(link);
      setSnackbar({ open: true, message: "Upload link copied", severity: "success" });
    } catch {
      setSnackbar({ open: true, message: `Upload link: ${link}`, severity: "info" });
    }
  }, [createDocumentUploadToken, project?._id]);

  if (loading && !project) {
    return (
      <Box sx={{ p: { xs: 2, md: 4 }, minHeight: "100vh", bgcolor: SURFACE }}>
        <Skeleton variant="rounded" height={90} sx={{ mb: 2, borderRadius: "12px" }} />
        <Skeleton variant="rounded" height={120} sx={{ mb: 2, borderRadius: "12px" }} />
        <Skeleton variant="rounded" height={260} sx={{ borderRadius: "12px" }} />
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, minHeight: "100vh", bgcolor: SURFACE }}>
      <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={2} sx={{ mb: 2 }}>
        <Box>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
            <Typography variant="caption" sx={{ color: MUTED }}>Projects</Typography>
            <Typography variant="caption" sx={{ color: MUTED }}>/</Typography>
            <Typography variant="caption" fontWeight={800} color={INK}>
              {project?.projectCode || project?.leadId || projectId}
            </Typography>
          </Stack>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
            <Tooltip title="Back to projects">
              <IconButton size="small" onClick={() => navigate("/projects")} sx={{ border: `1px solid ${BORDER}` }}>
                <ArrowBack sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
            <Chip
              label={currentStage.label.toUpperCase()}
              size="small"
              sx={{
                bgcolor: alpha(BRAND, 0.1),
                color: BRAND,
                fontWeight: 800,
              }}
            />
            <Typography variant="caption" sx={{ color: MUTED }}>
              Created {formatDate(project?.projectConvertedAt || project?.createdAt)}
            </Typography>
          </Stack>
          <Typography variant="h5" fontWeight={900} color={INK} sx={{ lineHeight: 1.15 }}>
            {getCustomerName(project)} . {getSystemSize(project)} kW Residential Rooftop
          </Typography>
          <Typography variant="body2" sx={{ color: MUTED, mt: 0.75 }}>
            {project?.city || project?.address || "No site location"} . {project?.phone || "No phone"}
          </Typography>
        </Box>

        <Stack direction="row" spacing={1} alignItems="flex-start">
          <Button
            size="small"
            variant="outlined"
            startIcon={<Edit sx={{ fontSize: 16 }} />}
            onClick={editProject}
            sx={{ borderRadius: "8px", borderColor: BORDER, color: INK, fontWeight: 800 }}
          >
            Edit
          </Button>
          <Button
            size="small"
            variant="outlined"
            startIcon={<Download sx={{ fontSize: 16 }} />}
            onClick={() => setSnackbar({ open: true, message: "Export is not connected yet", severity: "info" })}
            sx={{ borderRadius: "8px", borderColor: BORDER, color: INK, fontWeight: 800 }}
          >
            Export
          </Button>
          <IconButton size="small" sx={{ border: `1px solid ${BORDER}`, borderRadius: "8px" }}>
            <MoreVert sx={{ fontSize: 18 }} />
          </IconButton>
        </Stack>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} md={3}>
          <MetricCard icon={<Bolt />} label="System Size" value={`${getSystemSize(project)} kW`} color={BRAND} />
        </Grid>
        <Grid item xs={12} md={3}>
          <MetricCard icon={<AccountBalance />} label="Project Value" value={formatMoney(getProjectValue(project))} color={SUCCESS} />
        </Grid>
        <Grid item xs={12} md={3}>
          <MetricCard icon={<Payments />} label="Subsidy" value={formatMoney(project?.subsidyAmount || project?.subsidy || 0)} color={WARNING} />
        </Grid>
        <Grid item xs={12} md={3}>
          <MetricCard icon={<CalendarMonth />} label="Milestones Paid" value={`${project?.milestonesPaid || 0} of ${ACTION_STAGES.length}`} color={INK_2} />
        </Grid>
      </Grid>

      <Paper
        elevation={0}
        sx={{
          p: 2,
          mb: 2,
          borderRadius: "12px",
          border: `1px solid ${alpha(INK, 0.08)}`,
          background: `linear-gradient(135deg, ${INK} 0%, ${INK_2} 100%)`,
          color: "#fff",
        }}
      >
        <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={2} alignItems={{ xs: "flex-start", md: "center" }}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Box sx={{ width: 44, height: 44, borderRadius: "10px", bgcolor: alpha("#fff", 0.14), display: "flex", alignItems: "center", justifyContent: "center" }}>
              <TaskAlt />
            </Box>
            <Box>
              <Typography variant="caption" fontWeight={900} sx={{ letterSpacing: "0.08em", opacity: 0.75 }}>
                NEXT ACTION
              </Typography>
              <Typography variant="subtitle1" fontWeight={900}>
                {NEXT_ACTIONS[currentStageKey]}
              </Typography>
              <Typography variant="caption" sx={{ opacity: 0.75 }}>
                Updated {formatDate(project?.updatedAt || project?.projectConvertedAt || project?.createdAt)}
              </Typography>
            </Box>
          </Stack>
          <Button
            size="small"
            variant="contained"
            onClick={() => setSelectedWorkflowStage(currentStageKey)}
            disabled={currentStageKey === "lead_converted"}
            sx={{
              bgcolor: "#fff",
              color: INK,
              fontWeight: 900,
              borderRadius: "8px",
              "&:hover": { bgcolor: alpha("#fff", 0.9) },
              "&.Mui-disabled": { bgcolor: alpha("#fff", 0.3), color: alpha(INK, 0.5) },
            }}
          >
            Update current stage
          </Button>
        </Stack>
      </Paper>

      <Paper elevation={0} sx={{ p: 2, mb: 2, borderRadius: "12px", border: `1px solid ${BORDER}`, bgcolor: "#fff" }}>
        <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={1} sx={{ mb: 2 }}>
          <Box>
            <Typography variant="caption" fontWeight={900} sx={{ color: MUTED, textTransform: "uppercase" }}>
              Stage Progress
            </Typography>
            <Typography variant="subtitle2" fontWeight={900} color={INK}>
              Lifecycle status of every project stage
            </Typography>
          </Box>
          <Chip label={`${progress}%`} size="small" sx={{ alignSelf: { xs: "flex-start", md: "center" }, bgcolor: alpha(BRAND, 0.1), color: BRAND, fontWeight: 900 }} />
        </Stack>

        <Box sx={{ overflowX: "auto", pb: 0.5 }}>
          <Stack direction="row" alignItems="flex-start" sx={{ minWidth: 920 }}>
            {PROJECT_STAGES.map((stage, index) => {
              const Icon = stage.icon;
              const state = stageState(stage.key);
              const color = stateColor(state);
              const done = state === "done";
              const active = state === "active";
              return (
                <React.Fragment key={stage.key}>
                  <Stack alignItems="center" spacing={0.75} sx={{ width: 128, flexShrink: 0 }}>
                    <Box
                      sx={{
                        width: 32,
                        height: 32,
                        borderRadius: "50%",
                        bgcolor: done || active ? color : "#fff",
                        border: `1px solid ${done || active ? color : BORDER}`,
                        color: done || active ? "#fff" : NEUTRAL,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        boxShadow: active ? `0 0 0 5px ${alpha(color, 0.12)}` : "none",
                      }}
                    >
                      <Icon sx={{ fontSize: 16 }} />
                    </Box>
                    <Typography variant="caption" sx={{ color: MUTED }} fontWeight={800}>
                      Stage {index + 1}
                    </Typography>
                    <Typography variant="caption" color={INK} fontWeight={900} textAlign="center" sx={{ lineHeight: 1.2 }}>
                      {stage.label}
                    </Typography>
                    <Chip
                      label={done ? "Done" : active ? "Now" : "Pending"}
                      size="small"
                      sx={{
                        height: 20,
                        fontSize: 10,
                        fontWeight: 900,
                        bgcolor: alpha(color, 0.1),
                        color,
                      }}
                    />
                  </Stack>
                  {index < PROJECT_STAGES.length - 1 && (
                    <Divider sx={{ flex: 1, minWidth: 42, mt: 2, borderColor: index < currentIndex ? alpha(SUCCESS, 0.4) : BORDER }} />
                  )}
                </React.Fragment>
              );
            })}
          </Stack>
        </Box>
      </Paper>

      <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={1.5} sx={{ mb: 1.5 }}>
        <Box>
          <Typography variant="caption" fontWeight={900} sx={{ color: MUTED, textTransform: "uppercase" }}>
            Project Workflow
          </Typography>
          <Typography variant="subtitle2" fontWeight={900} color={INK}>
            {currentIndex} of {ACTION_STAGES.length} stages complete
          </Typography>
        </Box>
        <Typography variant="subtitle2" fontWeight={900} sx={{ color: BRAND }}>
          {progress}%
        </Typography>
      </Stack>

      <Paper elevation={0} sx={{ p: 1.5, mb: 2, borderRadius: "12px", border: `1px solid ${BORDER}`, bgcolor: "#fff" }}>
        <Stack direction="row" spacing={1} sx={{ overflowX: "auto", pb: 0.5 }}>
          {WORKFLOW_TABS.map((stage) => {
            const Icon = stage.icon;
            const active = selectedWorkflowStage === stage.key;
            return (
              <Button
                key={stage.key}
                size="small"
                startIcon={<Icon sx={{ fontSize: 15 }} />}
                onClick={() => setSelectedWorkflowStage(stage.key)}
                sx={{
                  flexShrink: 0,
                  minWidth: 132,
                  justifyContent: "flex-start",
                  borderRadius: "8px",
                  px: 1.25,
                  py: 0.9,
                  fontSize: 11,
                  fontWeight: 900,
                  color: active ? BRAND : INK,
                  border: `1px solid ${active ? alpha(BRAND, 0.35) : BORDER}`,
                  bgcolor: active ? alpha(BRAND, 0.06) : "#fff",
                  "&:hover": { bgcolor: alpha(BRAND, 0.06), borderColor: alpha(BRAND, 0.35) },
                }}
              >
                <Box component="span" sx={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" }}>
                  {stage.label}
                </Box>
              </Button>
            );
          })}
        </Stack>
      </Paper>

      <Grid container spacing={2}>
        <Grid item xs={12} md={selectedWorkflowStage === "summary" ? 12 : 8}>
          {selectedWorkflowStage === "summary" ? (
            <SummaryWorkspace
              project={project}
              onGoToStage={(stageKey) => setSelectedWorkflowStage(stageKey)}
              onOpenSurveyEditor={openSurveyEditor}
            />
          ) : selectedWorkflowStage === "registration" ? (
            <RegistrationWorkspace
              project={project}
              formData={registrationForm}
              errors={registrationErrors}
              saving={savingRegistration}
              onChange={handleRegistrationFieldChange}
              onClear={clearRegistrationForm}
              onCancel={resetRegistrationForm}
              onSave={saveRegistration}
            />
          ) : selectedWorkflowStage === "document" ? (
            <DocumentWorkspace
              project={project}
              onUpload={() => openStagePage("document")}
              onCreateLink={createDocumentUploadLink}
            />
          ) : selectedWorkflowStage === "payment" ? (
            <PaymentWorkspace
              project={project}
              formData={paymentForm}
              errors={paymentErrors}
              saving={savingPayment}
              onChange={handlePaymentFieldChange}
              onClear={clearPaymentForm}
              onCancel={resetPaymentForm}
              onSave={savePayment}
            />
          ) : selectedWorkflowStage === "installation" ? (
            <InstallationWorkspace
              project={project}
              formData={installationForm}
              errors={installationErrors}
              saving={savingInstallation}
              onChange={handleInstallationFieldChange}
              onCancel={resetInstallationForm}
              onSave={saveInstallation}
            />
          ) : selectedWorkflowStage === "disbursement" ? (
            <DisbursementWorkspace
              project={project}
              formData={disbursementForm}
              errors={disbursementErrors}
              saving={savingDisbursement}
              onChange={handleDisbursementFieldChange}
              onCancel={resetDisbursementForm}
              onSave={saveDisbursement}
            />
          ) : selectedWorkflowStage === "loan_pending" ? (
            <LoanPendingWorkspace
              project={project}
              formData={loanPendingForm}
              errors={loanPendingErrors}
              saving={savingLoanPending}
              onChange={handleLoanPendingFieldChange}
              onCancel={resetLoanPendingForm}
              onSave={saveLoanPending}
            />
          ) : (
            <Paper elevation={0} sx={{ minHeight: 220, p: 3, borderRadius: "12px", border: `1px solid ${BORDER}`, bgcolor: "#fff" }}>
              <Stack alignItems="center" justifyContent="center" spacing={1.25} sx={{ minHeight: 170, textAlign: "center" }}>
                <TaskAlt sx={{ fontSize: 44, color: alpha(INK, 0.35) }} />
                <Typography variant="subtitle1" fontWeight={900} color={INK}>
                  {selectedWorkflow.label} Workspace
                </Typography>
                <Typography variant="body2" sx={{ color: MUTED, maxWidth: 520 }}>
                  This stage is available in the project workflow. Open the full page when you need the detailed update tools.
                </Typography>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => openStagePage(selectedWorkflowStage)}
                  sx={{ mt: 1, borderRadius: "8px", borderColor: BORDER, color: INK, fontWeight: 800 }}
                >
                  Open {selectedWorkflow.label}
                </Button>
              </Stack>
            </Paper>
          )}
        </Grid>
        {selectedWorkflowStage !== "summary" && (
        <Grid item xs={12} md={4}>
          <Stack spacing={2}>
            <Paper elevation={0} sx={{ p: 2.5, borderRadius: "12px", border: `1px solid ${BORDER}`, bgcolor: "#fff" }}>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
                <InfoOutlined sx={{ fontSize: 18, color: BRAND }} />
                <Typography variant="subtitle2" fontWeight={900} color={INK}>
                  Current Stage Info
                </Typography>
              </Stack>
              <Stack spacing={1}>
                {ACTION_STAGES.map((stage) => (
                  <Stack key={stage.key} direction="row" justifyContent="space-between" spacing={1}>
                    <Typography variant="caption" sx={{ color: MUTED }} fontWeight={800}>
                      {stage.label}
                    </Typography>
                    <Typography variant="caption" sx={{ color: stage.key === selectedWorkflowStage ? BRAND : INK }} fontWeight={900}>
                      {formatStatusLabel(actionState[stage.key])}
                    </Typography>
                  </Stack>
                ))}
              </Stack>
            </Paper>
            <Paper elevation={0} sx={{ p: 2.5, borderRadius: "12px", border: `1px solid ${alpha(BRAND, 0.12)}`, bgcolor: alpha(BRAND, 0.05) }}>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                <SupportAgent sx={{ fontSize: 18, color: BRAND }} />
                <Typography variant="subtitle2" fontWeight={900} color={INK}>
                  Need Help?
                </Typography>
              </Stack>
              <Typography variant="body2" sx={{ color: MUTED, mb: 1.5 }}>
                You can update the stage details or contact support for assistance.
              </Typography>
              <Button size="small" variant="outlined" sx={{ borderRadius: "8px", borderColor: BORDER, color: INK, fontWeight: 800 }}>
                Contact Support
              </Button>
            </Paper>
          </Stack>
        </Grid>
        )}
      </Grid>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
      >
        <Alert severity={snackbar.severity} sx={{ width: "100%" }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default ProjectDetails;
