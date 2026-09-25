// pages/TeamTracking.jsx
import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Box, Typography, Button, Grid, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Avatar, Chip, IconButton, Stack,
  Tooltip, alpha, useMediaQuery, useTheme, Divider, Badge, CircularProgress,
  Skeleton, TextField, InputAdornment, InputBase,
} from "@mui/material";
import {
  FilterList, Add, Map, Groups, RadioButtonChecked, Storefront,
  AssignmentLate, FileDownload, MoreVert, LocationOn, MyLocation,
  TrendingUp, AccessTime, ChevronRight, Search, Refresh, Close, Clear,
} from "@mui/icons-material";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { API_ORIGIN } from "../utils/apiConfig";
import { toBackendAssetUrl } from "../utils/backendAssetUrl";

const API = API_ORIGIN;
const PRIMARY = "#136dec";

// ── Helpers ───────────────────────────────────────────────────────────────────
const getAuthHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("token")}`,
});

const handleAuthError = (error) => {
  if (error?.response?.status !== 401) return false;

  localStorage.removeItem("token");
  localStorage.removeItem("authToken");
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("user");
  window.location.href = "/login";
  return true;
};

const formatTime = (iso) =>
  iso
    ? new Date(iso).toLocaleTimeString("en-IN", {
        hour: "2-digit", minute: "2-digit", hour12: true,
      })
    : null;

const resolveAddress = (address) => {
  if (!address) return null;
  if (typeof address === "string") return address;
  return address.full || address.short || [address.road, address.city].filter(Boolean).join(", ") || null;
};

const avatarColors = ["#0f1f3d","#7c3aed","#0ea5e9","#f59e0b","#10b981","#f43f5e","#8b5cf6","#06b6d4"];
const getAvatarColor = (name = "") => avatarColors[name.charCodeAt(0) % avatarColors.length];

const TRACKED_ROLES = ["ZSM", "Incharge", "TEAM"];
const ROLE_LABELS = {
  ZSM: "Operation Lead",
  Incharge: "Incharge",
  TEAM: "Team Member",
};
const ROLE_SORT_ORDER = {
  ZSM: 0,
  Incharge: 1,
  TEAM: 2,
};

// Sort priority: Punched in (on-duty / completed) first, not punched in (offline) at bottom
const STATUS_SORT_ORDER = {
  active: 0,
  location_off: 1,
  no_signal: 2,
  completed: 3,
  offline: 4,
};

const normalizeUserRole = (role = "") => {
  const normalized = String(role).trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (normalized === "operation_lead" || normalized === "operationlead") return "ZSM";
  if (normalized === "asm" || normalized === "inchange" || normalized === "incharge") return "Incharge";
  if (normalized === "team") return "TEAM";
  if (normalized === "zsm") return "ZSM";
  return role || "TEAM";
};

const getRoleLabel = (role) => ROLE_LABELS[normalizeUserRole(role)] || role || "Team Member";

const getMemberHistoryState = (member) => ({
  memberId: member.id,
  userId: member.id,
  user: { _id: member.id, id: member.id },
  memberName: member.name,
  memberRole: member.roleLabel,
  memberPhone: member.phoneNumber,
  memberEmail: member.email,
  memberAvatar: member.avatar,
  memberStatus: member.status,
  fromTeam: true,
});

const uniqUsersById = (users = []) => {
  const seen = new Set();
  return users.filter((user) => {
    const id = String(user?._id || user?.id || "");
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
};

const getDutyStatus = (att, user) => {
  if (!att || !att.punchIn?.time) return "offline";
  if (att.punchIn?.time && !att.punchOut?.time) return "active";
  if (att.punchIn?.time && att.punchOut?.time) return "completed";
  return "offline";
};

const getStatusConfig = (isDark) => ({
  active: {
    label: "On Duty",
    bg: isDark ? "rgba(16, 185, 129, 0.15)" : alpha("#10b981", 0.1),
    color: isDark ? "#34d399" : "#059669",
    dotColor: "#10b981",
    border: isDark ? "rgba(16, 185, 129, 0.3)" : "rgba(16, 185, 129, 0.2)",
    pulse: true,
  },
  completed: {
    label: "Completed",
    bg: isDark ? "rgba(59, 130, 246, 0.15)" : alpha("#3b82f6", 0.1),
    color: isDark ? "#60a5fa" : "#2563eb",
    dotColor: "#3b82f6",
    border: isDark ? "rgba(59, 130, 246, 0.3)" : "rgba(59, 130, 246, 0.2)",
    pulse: false,
  },
  offline: {
    label: "Not Punched In",
    bg: isDark ? "rgba(255, 255, 255, 0.05)" : "#f1f5f9",
    color: isDark ? "#94a3b8" : "#64748b",
    dotColor: "#94a3b8",
    border: isDark ? "rgba(255, 255, 255, 0.1)" : "#e2e8f0",
    pulse: false,
  },
  location_off: {
    label: "Location Off",
    bg: isDark ? "rgba(239, 68, 68, 0.15)" : alpha("#ef4444", 0.1),
    color: isDark ? "#f87171" : "#dc2626",
    dotColor: "#ef4444",
    border: isDark ? "rgba(239, 68, 68, 0.3)" : "rgba(239, 68, 68, 0.2)",
    pulse: true,
  },
  no_signal: {
    label: "No Signal",
    bg: isDark ? "rgba(245, 158, 11, 0.15)" : alpha("#f59e0b", 0.12),
    color: isDark ? "#fbbf24" : "#d97706",
    dotColor: "#f59e0b",
    border: isDark ? "rgba(245, 158, 11, 0.3)" : "rgba(245, 158, 11, 0.2)",
    pulse: true,
  },
});

const getBatteryColor = (pct, isDark) => {
  if (pct === null || pct === undefined) return { color: "#94a3b8", bg: isDark ? "rgba(255, 255, 255, 0.05)" : "#f1f5f9", border: isDark ? "rgba(255, 255, 255, 0.1)" : "#e2e8f0", label: "N/A" };
  if (pct > 60) return { color: isDark ? "#34d399" : "#059669", bg: isDark ? "rgba(16, 185, 129, 0.15)" : alpha("#10b981", 0.1), border: isDark ? "rgba(16, 185, 129, 0.3)" : "rgba(16, 185, 129, 0.2)", label: `${pct}%` };
  if (pct > 20) return { color: isDark ? "#fbbf24" : "#d97706", bg: isDark ? "rgba(245, 158, 11, 0.15)" : alpha("#f59e0b", 0.1), border: isDark ? "rgba(245, 158, 11, 0.3)" : "rgba(245, 158, 11, 0.2)", label: `${pct}%` };
  return { color: isDark ? "#f87171" : "#dc2626", bg: isDark ? "rgba(239, 68, 68, 0.15)" : alpha("#ef4444", 0.1), border: isDark ? "rgba(239, 68, 68, 0.3)" : "rgba(239, 68, 68, 0.2)", label: `${pct}%` };
};

const BatteryChip = ({ percentage, isCharging }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const { color, bg, border, label } = getBatteryColor(percentage, isDark);
  const icon =
    percentage === null ? "🔋" :
    isCharging          ? "⚡" :
    percentage > 60     ? "🔋" :
    percentage > 20     ? "🪫" : "❗";

  return (
    <Chip
      size="small"
      label={`${icon} ${label}`}
      sx={{
        bgcolor: bg, color, fontWeight: 700,
        fontSize: "0.65rem", height: 24, borderRadius: "999px",
        border: `1px solid ${border}`,
      }}
    />
  );
};

const StatusChip = ({ status }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const statusCfg = getStatusConfig(isDark);
  const cfg = statusCfg[status] || statusCfg.offline;
  return (
    <Chip
      size="small"
      label={cfg.label}
      icon={
        <Box component="span" sx={{
          width: 6, height: 6, borderRadius: "50%", bgcolor: cfg.dotColor,
          flexShrink: 0, ml: "6px !important",
          ...(cfg.pulse && {
            animation: "dotPulse 1.5s ease-in-out infinite",
            "@keyframes dotPulse": { "0%,100%": { opacity: 1 }, "50%": { opacity: 0.3 } },
          }),
        }} />
      }
      sx={{
        bgcolor: cfg.bg, color: cfg.color, fontWeight: 700, fontSize: "0.65rem",
        height: 24, borderRadius: "999px", "& .MuiChip-icon": { mr: 0 },
      }}
    />
  );
};

const MemberCard = ({ member, onViewDetails }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const statusCfg = getStatusConfig(isDark);
  return (
    <Paper elevation={0} sx={{
      borderRadius: "1rem", border: "1px solid rgba(255, 255, 255, 0.08)", bgcolor: isDark ? "#0e1424" : "#ffffff", p: 2,
      transition: "all 0.2s",
      "&:hover": { boxShadow: "0 8px 24px rgba(19,109,236,0.08)", borderColor: alpha(PRIMARY, 0.2), transform: "translateY(-1px)" },
    }}>
      <Stack direction="row" alignItems="flex-start" justifyContent="space-between" mb={1.5}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Badge overlap="circular" anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            badgeContent={
              <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: statusCfg[member.status]?.dotColor, border: "2px solid #fff" }} />
            }>
            <Avatar
              src={toBackendAssetUrl(member.avatar)}
              sx={{ width: 46, height: 46, border: "2px solid #f0f4fa", bgcolor: member.avatarColor, fontWeight: 700, fontSize: "1rem" }}
            >
              {member.initials}
            </Avatar>
          </Badge>
          <Box>
            <Typography fontWeight={700} fontSize="0.88rem" color={isDark ? "#ffffff" : "#0f172a"} lineHeight={1.3}>{member.name}</Typography>
            <Typography fontSize="0.7rem" color={isDark ? "#94a3b8" : "#64748b"} fontWeight={500}>{member.roleLabel}</Typography>
          </Box>
        </Stack>
        <StatusChip status={member.status} />
      </Stack>

      <Divider sx={{ borderColor: isDark ? "rgba(255, 255, 255, 0.06)" : "#f1f5f9", mb: 1.5 }} />

      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1.5}>
        <Stack direction="row" spacing={0.5} alignItems="center" sx={{ flex: 1, minWidth: 0 }}>
          <LocationOn sx={{ fontSize: 14, color: member.status === "offline" ? "#94a3b8" : PRIMARY, flexShrink: 0 }} />
          <Typography fontSize="0.75rem" color={isDark ? "#cbd5e1" : "#475569"} fontWeight={500} noWrap>
            {member.location || "Location not available"}
          </Typography>
        </Stack>
        <Stack direction="row" spacing={0.5} alignItems="center" sx={{ flexShrink: 0, ml: 1 }}>
          <AccessTime sx={{ fontSize: 13, color: "#cbd5e1" }} />
          <Typography fontSize="0.7rem" color={isDark ? "#94a3b8" : "#64748b"}>{member.checkin || "—"}</Typography>
        </Stack>
      </Stack>

      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1.5}>
        <Typography fontSize="0.68rem" color={isDark ? "#94a3b8" : "#64748b"} fontWeight={700} textTransform="uppercase" letterSpacing="0.04em">
          Battery
        </Typography>
        <BatteryChip percentage={member.batteryPercentage} isCharging={member.isCharging} />
      </Stack>

      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Box sx={{ px: 1.25, py: 0.4, borderRadius: "0.375rem", bgcolor: alpha(PRIMARY, 0.06), display: "inline-flex", alignItems: "center", gap: 0.5 }}>
          <Storefront sx={{ fontSize: 12, color: PRIMARY }} />
          <Typography fontSize="0.65rem" fontWeight={700} color={PRIMARY}>
            {member.visits} visits today
          </Typography>
        </Box>
        <Button size="small" endIcon={<ChevronRight sx={{ fontSize: 14, ml: -0.5 }} />}
          onClick={onViewDetails}
          sx={{
            color: PRIMARY, border: `1px solid ${alpha(PRIMARY, 0.2)}`, bgcolor: alpha(PRIMARY, 0.05),
            fontWeight: 700, fontSize: "0.7rem", borderRadius: "0.5rem", textTransform: "none",
            px: 1.5, py: 0.55,
            "&:hover": { bgcolor: PRIMARY, color: "#fff", borderColor: PRIMARY },
          }}>
          Details
        </Button>
      </Stack>
    </Paper>
  );
};

const TableRowSkeleton = () => (
  <TableRow>
    {[1,2,3,4,5,6,7].map((i) => (
      <TableCell key={i} sx={{ py: 2.25 }}>
        <Skeleton variant="rectangular" height={36} sx={{ borderRadius: 1 }} />
      </TableCell>
    ))}
  </TableRow>
);

export default function TeamTracking() {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const navigate = useNavigate();

  const pageBg = isDark ? "#060a12" : "#f8fafc";
  const cardBg = isDark ? "#0e1424" : "#ffffff";
  const cardBorder = isDark ? "rgba(255, 255, 255, 0.08)" : "#e2e8f0";
  const cardHoverBorder = isDark ? "rgba(255, 255, 255, 0.15)" : "#cbd5e1";
  const tableHeadBg = isDark ? "#090d18" : "#f8fafc";
  const tableHeadText = isDark ? "#64748b" : "#475569";
  const textTitle = isDark ? "#ffffff" : "#0f172a";
  const textSub = isDark ? "#94a3b8" : "#64748b";
  const textBody = isDark ? "#cbd5e1" : "#334155";
  const rowHover = isDark ? "#131b30" : "#f1f5f9";
  const rowBorder = isDark ? "rgba(255, 255, 255, 0.06)" : "#f1f5f9";
  const btnBg = isDark ? "#0b101c" : "#ffffff";
  const btnText = isDark ? "#ffffff" : "#0f172a";
  const btnBorder = isDark ? "rgba(255, 255, 255, 0.15)" : "#e2e8f0";
  const statusCfg = getStatusConfig(isDark);

  const [hoveredRow, setHoveredRow] = useState(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [teamMembers, setTeamMembers] = useState([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [summary, setSummary] = useState({ total: 0, active: 0, visitsToday: 0, pending: 0 });

  const fetchData = useCallback(async (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    else setRefreshing(true);

    try {
      const headers = getAuthHeaders();
      const now = new Date();
      const today = [
        now.getFullYear(),
        String(now.getMonth() + 1).padStart(2, "0"),
        String(now.getDate()).padStart(2, "0"),
      ].join("-");

      // Step 1: Fetch field users: operation leads, incharges, and team members.
      let rawUsers = [];
      try {
        const usersRes = await axios.get(`${API}/api/v1/user/getAllUsers`, {
          headers, params: { page: 1, limit: 100 },
        });
        rawUsers = usersRes.data?.result?.users || usersRes.data?.data?.users || [];
        rawUsers = rawUsers.filter((user) => TRACKED_ROLES.includes(normalizeUserRole(user.role)));
      } catch (e) {
        if (handleAuthError(e)) return;
        console.error("Users fetch failed:", e.message);
      }

      if (rawUsers.length === 0) {
        try {
          const fallbackRes = await axios.get(`${API}/api/v1/user/getManagerUnderUserList`, {
            headers, params: { page: 1, limit: 100 },
          });
          rawUsers = fallbackRes.data?.result?.users || fallbackRes.data?.data?.users || [];
        } catch (e) {
          if (handleAuthError(e)) return;
          console.error("Fallback team users fetch failed:", e.message);
        }
      }

      rawUsers = uniqUsersById(rawUsers).sort((a, b) => {
        const roleDiff = (ROLE_SORT_ORDER[normalizeUserRole(a.role)] ?? 99) - (ROLE_SORT_ORDER[normalizeUserRole(b.role)] ?? 99);
        if (roleDiff !== 0) return roleDiff;
        return `${a.firstName || ""} ${a.lastName || ""}`.localeCompare(`${b.firstName || ""} ${b.lastName || ""}`);
      });

      // Step 2: Fetch today's attendance (for punch-in locations)
      let attendances = [];
      try {
        const attRes = await axios.get(`${API}/api/v1/attendance`, {
          headers, params: { startDate: today, endDate: today, limit: 500 },
        });
        attendances = attRes.data?.result?.attendances || attRes.data?.data?.attendances || [];
      } catch (e) {
        if (handleAuthError(e)) return;
        console.error("Attendance fetch failed:", e.message);
      }

      // Step 3: Fetch today's visit stats per user
      let visits = [];
      try {
        const visitsRes = await axios.get(`${API}/api/v1/visit`, {
          headers, params: { startDate: today, endDate: today, limit: 100 },
        });
        visits = visitsRes.data?.result?.visits || visitsRes.data?.data?.visits || [];
      } catch (e) {
        if (handleAuthError(e)) return;
        console.error("Visits fetch failed:", e.message);
      }

      // Step 4: Fetch latest battery logs for field users
      let batteryMap = {};
      try {
        const userIds = rawUsers.map((u) => String(u._id || u.id)).filter(Boolean);
        if (userIds.length > 0) {
          const battRes = await axios.get(`${API}/api/v1/battery/all-latest`, {
            headers, params: { userIds: userIds.join(",") },
          });
          const batteryLogs = battRes.data?.data || battRes.data?.result || [];
          batteryLogs.forEach((b) => {
            const key = String(b.userId || b.user?._id || b.user || b._id || "");
            if (key) {
              batteryMap[key] = {
                percentage: typeof b.percentage === "number" ? b.percentage : null,
                isCharging: b.isCharging ?? false,
                lastSeen: b.lastSeen || b.createdAt || b.updatedAt || null,
              };
            }
          });
        }
      } catch (e) {
        if (handleAuthError(e)) return;
        console.error("Battery fetch failed:", e.message);
      }

      // Step 5: Fetch tracking status for field users
      let trackingStatusMap = {};
      try {
        const userIds = rawUsers.map((u) => String(u._id || u.id)).filter(Boolean);
        if (userIds.length > 0) {
          const trackingRes = await axios.get(`${API}/api/v1/tracking-status`, {
            headers, params: { userIds: userIds.join(",") },
          });
          const trackingStatuses = trackingRes.data?.data || trackingRes.data?.result || [];
          trackingStatuses.forEach((entry) => {
            const key = String(entry.userId || entry.user?._id || entry.user || "");
            if (key) {
              trackingStatusMap[key] = entry;
            }
          });
        }
      } catch (e) {
        if (handleAuthError(e)) return;
        console.error("Tracking status fetch failed:", e.message);
      }

      // Step 6: Map attendance by userId
      const attMap = {};
      attendances.forEach((a) => {
        const uid = String(a.user?._id || a.user?.id || a.user || "");
        if (uid) attMap[uid] = a;
      });

      // Step 7: Count visits by userId
      const visitCountMap = {};
      visits.forEach((v) => {
        const uid = String(v.user?._id || v.user?.id || v.user || "");
        if (uid) visitCountMap[uid] = (visitCountMap[uid] || 0) + 1;
      });

      // Step 8: Merge into member objects
      const merged = rawUsers.map((u) => {
        const uid = String(u._id || u.id || "");
        const att = attMap[uid] || null;
        const baseStatus = getDutyStatus(att, u);
        const trackingStatus = trackingStatusMap[uid] || null;
        const batteryLastSeen = batteryMap[uid]?.lastSeen
          ? new Date(batteryMap[uid].lastSeen).getTime()
          : 0;
        const isBatteryRecent = batteryLastSeen > 0 && Date.now() - batteryLastSeen < 7 * 60 * 1000;

        let derivedTracking = trackingStatus?.derivedState;
        if (derivedTracking === "no_signal" && isBatteryRecent) {
          derivedTracking = "ok";
        }

        const status =
          baseStatus === "active" && derivedTracking === "location_off"
            ? "location_off"
            : baseStatus === "active" && derivedTracking === "no_signal"
            ? "no_signal"
            : baseStatus;
        const punchInTime = att?.punchIn?.time ? formatTime(att.punchIn.time) : null;
        const punchOutTime = att?.punchOut?.time ? formatTime(att.punchOut.time) : null;
        const punchBattery = att?.punchIn?.battery || att?.metadata?.batteryAtPunchIn || null;
        const normalizedPunchBattery =
          punchBattery?.percentage !== undefined && punchBattery?.percentage !== null
            ? Number(punchBattery.percentage)
            : null;
        const latestBattery =
          batteryMap[uid]?.percentage !== undefined && batteryMap[uid]?.percentage !== null
            ? Number(batteryMap[uid].percentage)
            : null;
        const resolvedBatteryPercentage = Number.isFinite(latestBattery)
          ? latestBattery
          : (Number.isFinite(normalizedPunchBattery) ? normalizedPunchBattery : null);
        const resolvedIsCharging = Number.isFinite(latestBattery)
          ? (batteryMap[uid]?.isCharging ?? false)
          : (punchBattery?.isCharging ?? false);

        return {
          id: uid,
          name: `${u.firstName || ""} ${u.lastName || ""}`.trim(),
          firstName: u.firstName || "",
          lastName: u.lastName || "",
          role: normalizeUserRole(u.role || "TEAM"),
          roleLabel: getRoleLabel(u.role || "TEAM"),
          email: u.email || "",
          phoneNumber: u.phoneNumber || "",
          initials: (u.firstName?.[0] || "").toUpperCase() + (u.lastName?.[0] || "").toUpperCase(),
          avatarColor: getAvatarColor(u.firstName || ""),
          avatar: u.avatar || u.profileImage || u.photo || null,
          status,
          // Punch-in address = user's location when they started
          location: resolveAddress(att?.punchIn?.address) || resolveAddress(att?.punchOut?.address) || null,
          // Punch-in coordinates for map
          punchInLat: att?.punchIn?.location?.lat || null,
          punchInLng: att?.punchIn?.location?.lng || null,
          checkin: punchInTime
            ? `${punchInTime}${punchOutTime ? ` → ${punchOutTime}` : ""}`
            : null,
          punchInTime,
          punchOutTime,
          visits: visitCountMap[uid] || 0,
          batteryPercentage: resolvedBatteryPercentage,
          isCharging: resolvedIsCharging,
          lastHeartbeatAt: trackingStatus?.lastHeartbeatAt || null,
          trackingState: trackingStatus?.derivedState || "ok",
          trackingReason: trackingStatus?.lastLocationOffReason || "",
        };
      });

      // Sort: Punched in users first, unpunched (offline) at bottom
      merged.sort((a, b) => {
        const orderA = STATUS_SORT_ORDER[a.status] ?? 99;
        const orderB = STATUS_SORT_ORDER[b.status] ?? 99;
        if (orderA !== orderB) return orderA - orderB;

        const roleDiff = (ROLE_SORT_ORDER[a.role] ?? 99) - (ROLE_SORT_ORDER[b.role] ?? 99);
        if (roleDiff !== 0) return roleDiff;

        return (a.name || "").localeCompare(b.name || "");
      });

      setTeamMembers(merged);

      // Summary stats - active includes on-duty statuses (active, location_off, no_signal)
      const activeCount = merged.filter(
        (m) =>
          m.status === "active" ||
          m.status === "location_off" ||
          m.status === "no_signal"
      ).length;
      const totalVisits = Object.values(visitCountMap).reduce((a, b) => a + b, 0);
      setSummary({
        total: merged.length,
        active: activeCount,
        visitsToday: totalVisits,
        pending: merged.filter((m) => m.status === "offline").length,
      });

    } catch (err) {
      console.error("TeamTracking fetch error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Auto-refresh every 60s
  useEffect(() => {
    const t = setInterval(() => fetchData(false), 60000);
    return () => clearInterval(t);
  }, [fetchData]);

  const filteredMembers = useMemo(() => {
    let list = teamMembers;

    // Filter by status tab
    if (statusFilter === "active") {
      list = list.filter(
        (m) =>
          m.status === "active" ||
          m.status === "location_off" ||
          m.status === "no_signal"
      );
    } else if (statusFilter === "offline") {
      list = list.filter((m) => m.status === "offline");
    }

    // Filter by search query
    const q = (searchQuery || "").trim().toLowerCase();
    if (q) {
      list = list.filter((m) =>
        (m.name && m.name.toLowerCase().includes(q)) ||
        (m.email && m.email.toLowerCase().includes(q)) ||
        (m.phoneNumber && m.phoneNumber.toLowerCase().includes(q)) ||
        (m.roleLabel && m.roleLabel.toLowerCase().includes(q)) ||
        (m.location && m.location.toLowerCase().includes(q))
      );
    }

    // Sort: Punched in users first, unpunched at bottom
    list.sort((a, b) => {
      const orderA = STATUS_SORT_ORDER[a.status] ?? 99;
      const orderB = STATUS_SORT_ORDER[b.status] ?? 99;
      if (orderA !== orderB) return orderA - orderB;

      const roleDiff = (ROLE_SORT_ORDER[a.role] ?? 99) - (ROLE_SORT_ORDER[b.role] ?? 99);
      if (roleDiff !== 0) return roleDiff;

      return (a.name || "").localeCompare(b.name || "");
    });

    return list;
  }, [teamMembers, statusFilter, searchQuery]);

  const paginationLabels = isMobile
    ? ["Prev", "1", "2", "3", "Next"]
    : ["Previous", "1", "2", "3", "Next"];

  const SUMMARY_CARDS = [
    {
      id: "all",
      title: "Total Field Users",
      value: loading ? "—" : String(summary.total),
      icon: <Groups />,
      iconBg: alpha("#3b82f6", 0.1),
      iconColor: "#2563eb",
      sub: null,
    },
    {
      id: "active",
      title: "Currently Active",
      value: loading ? "—" : String(summary.active),
      icon: <RadioButtonChecked />,
      iconBg: alpha("#10b981", 0.1),
      iconColor: "#059669",
      sub: "live",
      subText: "On duty now",
    },
    {
      id: "offline",
      title: "Not Punched In",
      value: loading ? "—" : String(summary.pending),
      icon: <AssignmentLate />,
      iconBg: alpha("#ef4444", 0.1),
      iconColor: "#dc2626",
      sub: null,
    },
  ];

  return (
    <Box sx={{ minHeight: "100vh", fontFamily: "'Inter', sans-serif" }}>

      {/* ── Mobile Top Bar ──────────────────────────────────────────────── */}
      {isMobile && (
        <Box sx={{
          bgcolor: "#fff", px: 2.5, py: 1.5, borderBottom: "1px solid #e8edf5",
          position: "sticky", top: 0, zIndex: 100, boxShadow: "0 1px 8px rgba(0,0,0,0.05)",
        }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Typography fontWeight={800} fontSize="1.05rem" color="#0f172a" letterSpacing="-0.3px">
              Team Tracking
            </Typography>
            <Tooltip title="Refresh">
              <IconButton size="small" onClick={() => fetchData(false)} sx={{ color: "#64748b", borderRadius: "0.5rem" }}>
                <Refresh sx={{
                  fontSize: 20,
                  animation: refreshing ? "spin 0.8s linear infinite" : "none",
                  "@keyframes spin": { from: { transform: "rotate(0deg)" }, to: { transform: "rotate(360deg)" } },
                }} />
              </IconButton>
            </Tooltip>
          </Stack>
        </Box>
      )}

      <Box sx={{ p: { xs: 2, sm: 3, md: 4 }, maxWidth: 1400, mx: "auto" }}>

        {/* ── Desktop Header ───────────────────────────────────────────── */}
        {!isMobile && (
          <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 2, mb: 4 }}>
            <Box>
              <Typography variant="h4" fontWeight={800} sx={{ letterSpacing: "-0.5px", color: textTitle, lineHeight: 1.1 }}>
                Team Tracking
              </Typography>
              <Typography variant="body2" sx={{ color: "#94a3b8", mt: 0.5, fontWeight: 500 }}>
                Real-time field activity and team locations
              </Typography>
            </Box>
            <Stack direction="row" spacing={1.5} alignItems="center">
              {/* Search Box / Search Button */}
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  bgcolor: btnBg,
                  border: `1px solid ${btnBorder}`,
                  borderRadius: "0.6rem",
                  px: 1.5,
                  py: 0.65,
                  minWidth: { sm: 220, md: 280 },
                  transition: "all 0.2s ease",
                  "&:focus-within": {
                    borderColor: PRIMARY,
                    boxShadow: `0 0 0 2px ${alpha(PRIMARY, 0.15)}`,
                  },
                }}
              >
                <Search sx={{ fontSize: 18, color: "#94a3b8", mr: 1, flexShrink: 0 }} />
                <InputBase
                  placeholder="Search by name, role, phone..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setPage(1);
                  }}
                  sx={{
                    fontSize: "0.82rem",
                    color: textTitle,
                    width: "100%",
                    "& input": { p: 0 },
                  }}
                />
                {searchQuery && (
                  <IconButton
                    size="small"
                    onClick={() => setSearchQuery("")}
                    sx={{ p: 0.25, color: "#94a3b8" }}
                  >
                    <Clear sx={{ fontSize: 15 }} />
                  </IconButton>
                )}
              </Box>

              <Tooltip title="Refresh">
                <IconButton onClick={() => fetchData(false)} sx={{ color: isDark ? "#60a5fa" : "#0f172a", border: `1px solid ${btnBorder}`, bgcolor: btnBg, borderRadius: "0.6rem", width: 38, height: 38 }}>
                  <Refresh sx={{
                    fontSize: 18,
                    animation: refreshing ? "spin 0.8s linear infinite" : "none",
                    "@keyframes spin": { from: { transform: "rotate(0deg)" }, to: { transform: "rotate(360deg)" } },
                  }} />
                </IconButton>
              </Tooltip>

              <Button variant="contained" startIcon={<Add sx={{ fontSize: 18 }} />}
                onClick={() => navigate("/add-visit")}
                sx={{ background: "#0f5fd4", color: "#fff", fontWeight: 700, fontSize: "0.8rem", borderRadius: "0.6rem", textTransform: "none", px: 2.5, py: 1, boxShadow: `0 2px 8px ${alpha(PRIMARY, 0.3)}` }}>
                Add Visit
              </Button>
            </Stack>
          </Box>
        )}

        {/* ── Summary Cards (Interactive Filters) ───────────────────────── */}
        <Grid container spacing={{ xs: 1.5, sm: 2, md: 2.5 }} sx={{ mb: { xs: 3, md: 4 } }}>
          {SUMMARY_CARDS.map((card) => {
            const isSelected = statusFilter === card.id;
            return (
              <Grid item xs={12} sm={4} md={4} key={card.id}>
                <Paper
                  elevation={isSelected ? 3 : 0}
                  onClick={() => {
                    setStatusFilter((prev) => (prev === card.id && card.id !== "all" ? "all" : card.id));
                  }}
                  sx={{
                    p: { xs: 1.75, sm: 2.5 },
                    borderRadius: "16px",
                    border: isSelected
                      ? `2px solid ${card.iconColor}`
                      : `1px solid ${cardBorder}`,
                    bgcolor: isSelected
                      ? alpha(card.iconColor, isDark ? 0.12 : 0.04)
                      : cardBg,
                    height: "100%",
                    cursor: "pointer",
                    userSelect: "none",
                    position: "relative",
                    transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                    "&:hover": {
                      borderColor: card.iconColor,
                      transform: "translateY(-2px)",
                      boxShadow: `0 4px 14px ${alpha(card.iconColor, 0.18)}`,
                    },
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", mb: { xs: 1.5, sm: 2 } }}>
                    <Box>
                      <Typography
                        sx={{
                          color: isSelected ? card.iconColor : textSub,
                          fontWeight: isSelected ? 700 : 500,
                          fontSize: { xs: "0.68rem", sm: "0.75rem" },
                          display: "block",
                          mb: 0.5,
                        }}
                      >
                        {card.title}
                      </Typography>
                      {loading ? (
                        <Skeleton variant="text" width={60} height={40} />
                      ) : (
                        <Typography
                          fontWeight={800}
                          sx={{
                            color: textTitle,
                            fontSize: { xs: "1.6rem", sm: "1.9rem" },
                            lineHeight: 1,
                            letterSpacing: "-0.5px",
                          }}
                        >
                          {card.value}
                        </Typography>
                      )}
                    </Box>
                    <Box
                      sx={{
                        p: { xs: 0.75, sm: 1 },
                        borderRadius: "0.6rem",
                        bgcolor: card.iconBg,
                        color: card.iconColor,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      {React.cloneElement(card.icon, { sx: { fontSize: { xs: 18, sm: 22 } } })}
                    </Box>
                  </Box>
                  {card.sub === "live" && (
                    <Stack direction="row" alignItems="center" spacing={0.75}>
                      <Box
                        sx={{
                          width: 7,
                          height: 7,
                          borderRadius: "50%",
                          bgcolor: "#10b981",
                          flexShrink: 0,
                          animation: "livePulse 1.5s ease-in-out infinite",
                          "@keyframes livePulse": { "0%,100%": { opacity: 1 }, "50%": { opacity: 0.3 } },
                        }}
                      />
                      <Typography sx={{ color: "#64748b", fontWeight: 600, fontSize: "0.68rem" }}>
                        {card.subText}
                      </Typography>
                    </Stack>
                  )}
                  {card.id === "offline" && (
                    <Typography sx={{ color: "#94a3b8", fontWeight: 500, fontSize: "0.68rem" }}>
                      Off duty or pending punch-in
                    </Typography>
                  )}
                  {card.id === "all" && (
                    <Typography sx={{ color: "#94a3b8", fontWeight: 500, fontSize: "0.68rem" }}>
                      All assigned field users
                    </Typography>
                  )}
                </Paper>
              </Grid>
            );
          })}
        </Grid>

        {/* ── Mobile Action Bar ────────────────────────────────────────── */}
        {isMobile && (
          <Stack spacing={1.5} sx={{ mb: 2.5 }}>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                bgcolor: "#fff",
                border: "1px solid #e2e8f0",
                borderRadius: "0.6rem",
                px: 1.5,
                py: 0.75,
              }}
            >
              <Search sx={{ fontSize: 18, color: "#94a3b8", mr: 1 }} />
              <InputBase
                placeholder="Search field users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                sx={{ fontSize: "0.85rem", width: "100%", "& input": { p: 0 } }}
              />
              {searchQuery && (
                <IconButton size="small" onClick={() => setSearchQuery("")} sx={{ p: 0.25 }}>
                  <Clear sx={{ fontSize: 16 }} />
                </IconButton>
              )}
            </Box>
            <Stack direction="row" spacing={1.5}>

              <Button fullWidth variant="contained" startIcon={<Add sx={{ fontSize: 16 }} />}
                onClick={() => navigate("/add-visit")}
                sx={{ bgcolor: PRIMARY, color: "#fff", fontWeight: 700, fontSize: "0.78rem", borderRadius: "0.6rem", textTransform: "none", py: 1, boxShadow: `0 2px 8px ${alpha(PRIMARY, 0.3)}` }}>
                Add Visit
              </Button>
            </Stack>
          </Stack>
        )}

        {/* ── Section Header ───────────────────────────────────────────── */}
        <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 1.5, mb: 2 }}>
          <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap">
            <Typography fontWeight={700} fontSize={{ xs: "0.9rem", md: "1rem" }} color="#0f172a">
              Field User Status
              {!loading && (
                <Typography component="span" sx={{ ml: 1, fontSize: "0.72rem", color: "#94a3b8", fontWeight: 400 }}>
                  ({filteredMembers.length} of {teamMembers.length} field users)
                </Typography>
              )}
            </Typography>
            {statusFilter !== "all" && (
              <Button
                size="small"
                onClick={() => setStatusFilter("all")}
                sx={{
                  fontSize: "0.68rem",
                  textTransform: "none",
                  py: 0.25,
                  px: 1,
                  borderRadius: "0.5rem",
                  bgcolor: isDark ? "rgba(255,255,255,0.06)" : "#f1f5f9",
                  color: isDark ? "#94a3b8" : "#64748b",
                }}
              >
                Clear Filter ✕
              </Button>
            )}
            {searchQuery && (
              <Chip
                size="small"
                label={`Search: "${searchQuery}"`}
                onDelete={() => setSearchQuery("")}
                sx={{
                  fontSize: "0.72rem",
                  height: 24,
                  bgcolor: alpha(PRIMARY, 0.1),
                  color: PRIMARY,
                  fontWeight: 600,
                }}
              />
            )}
          </Stack>
          {!isMobile && (
            <Stack direction="row" spacing={0.5}>
              <Tooltip title="Download">
                <IconButton size="small" sx={{ color: "#94a3b8", borderRadius: "0.375rem", "&:hover": { bgcolor: "#f1f5f9" } }}>
                  <FileDownload fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="More">
                <IconButton size="small" sx={{ color: "#94a3b8", borderRadius: "0.375rem", "&:hover": { bgcolor: "#f1f5f9" } }}>
                  <MoreVert fontSize="small" />
                </IconButton>
              </Tooltip>
            </Stack>
          )}
        </Box>

        {/* ── Mobile: Card List ────────────────────────────────────────── */}
        {isMobile && (
          <>
            {loading ? (
              <Stack spacing={1.5}>
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} variant="rectangular" height={160} sx={{ borderRadius: "1rem" }} />
                ))}
              </Stack>
            ) : filteredMembers.length === 0 ? (
              <Paper sx={{ p: 4, textAlign: "center", borderRadius: "1rem", bgcolor: cardBg, border: `1px solid ${cardBorder}` }}>
                <Typography color="#94a3b8" fontSize="0.85rem">No field users found</Typography>
              </Paper>
            ) : (
              <Stack spacing={1.5}>
                {filteredMembers.map((member) => (
                  <MemberCard
                    key={member.id}
                    member={member}
                    onViewDetails={() =>
                      navigate(`/member-history/${member.id}`, {
                        state: getMemberHistoryState(member),
                      })
                    }
                  />
                ))}
              </Stack>
            )}
            <Box sx={{ pt: 2, pb: 3, textAlign: "center" }}>
              <Typography variant="caption" sx={{ color: "#94a3b8", fontSize: "0.72rem", display: "block", mb: 1.5 }}>
                Showing {filteredMembers.length} field users
              </Typography>
            </Box>
          </>
        )}

        {/* ── Desktop: Table ───────────────────────────────────────────── */}
        {!isMobile && (
          <Paper elevation={0} sx={{ borderRadius: "16px", border: `1px solid ${cardBorder}`, bgcolor: cardBg, overflow: "hidden" }}>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{
                    bgcolor: "#f8fafc",
                    "& .MuiTableCell-root": { borderBottom: "1px solid #e8edf5", py: 1.75, color: "#94a3b8", fontWeight: 700, fontSize: "0.68rem", textTransform: "uppercase", letterSpacing: "0.06em" },
                  }}>
                    <TableCell sx={{ pl: 3 }}>Member</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="center">Punch-In Location</TableCell>
                    <TableCell align="center">Punch-In Time</TableCell>
                    <TableCell align="center">Battery</TableCell>
                    <TableCell align="center">Visits Today</TableCell>
                    <TableCell align="right" sx={{ pr: 3 }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading ? (
                    [1, 2, 3, 4, 5].map((i) => <TableRowSkeleton key={i} />)
                  ) : filteredMembers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center" sx={{ py: 6, color: "#94a3b8" }}>
                        No field users found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredMembers.map((member) => (
                      <TableRow key={member.id}
                        onMouseEnter={() => setHoveredRow(member.id)}
                        onMouseLeave={() => setHoveredRow(null)}
                        sx={{
                          borderBottom: `1px solid ${rowBorder}`, transition: "background 0.12s", bgcolor: cardBg,
                          "&:hover": { bgcolor: rowHover },
                          "&:last-child td": { borderBottom: "none" },
                        }}>

                        {/* Member */}
                        <TableCell sx={{ pl: 3, py: 2.25 }}>
                          <Stack direction="row" spacing={1.75} alignItems="center">
                            <Badge overlap="circular" anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                              badgeContent={
                                <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: getStatusConfig(isDark)[member.status]?.dotColor, border: "2px solid #fff" }} />
                              }>
                              <Avatar
                                src={toBackendAssetUrl(member.avatar)}
                                sx={{ width: 42, height: 42, border: "2px solid #f0f4fa", bgcolor: member.avatarColor, fontWeight: 700, fontSize: "0.9rem" }}
                              >
                                {member.initials}
                              </Avatar>
                            </Badge>
                            <Box>
                              <Typography variant="body2" fontWeight={700} sx={{ color: textTitle, fontSize: "0.85rem", lineHeight: 1.3 }}>
                                {member.name}
                              </Typography>
                              <Typography variant="caption" sx={{ color: textSub, fontSize: "0.7rem", fontWeight: 500 }}>
                                {member.roleLabel}
                              </Typography>
                            </Box>
                          </Stack>
                        </TableCell>

                        {/* Status */}
                        <TableCell sx={{ py: 2.25 }}>
                          <StatusChip status={member.status} />
                        </TableCell>

                        {/* Punch-in Location */}
                        <TableCell align="center" sx={{ py: 2.25 }}>
                          <Stack direction="row" spacing={0.5} alignItems="center" justifyContent="center">
                            <LocationOn sx={{ fontSize: 15, color: member.status === "offline" ? "#cbd5e1" : PRIMARY }} />
                            <Typography variant="body2" sx={{ color: textBody, fontSize: "0.78rem", maxWidth: 200 }} noWrap>
                              {member.location || "Not punched in"}
                            </Typography>
                          </Stack>
                          {/* Show lat/lng if available */}
                          {member.punchInLat && member.punchInLng && (
                            <Typography variant="caption" sx={{ color: "#94a3b8", fontSize: "0.62rem", display: "block", textAlign: "center", mt: 0.25 }}>
                              {member.punchInLat.toFixed(4)}, {member.punchInLng.toFixed(4)}
                            </Typography>
                          )}
                        </TableCell>

                        {/* Punch-in Time */}
                        <TableCell align="center" sx={{ py: 2.25 }}>
                          {member.punchInTime ? (
                            <Stack spacing={0.25} alignItems="center">
                              <Stack direction="row" spacing={0.5} alignItems="center">
                                <AccessTime sx={{ fontSize: 13, color: "#10b981" }} />
                                <Typography variant="body2" sx={{ color: "#064e3b", fontSize: "0.78rem", fontWeight: 600 }}>
                                  In: {member.punchInTime}
                                </Typography>
                              </Stack>
                              {member.punchOutTime && (
                                <Stack direction="row" spacing={0.5} alignItems="center">
                                  <AccessTime sx={{ fontSize: 13, color: "#f59e0b" }} />
                                  <Typography variant="body2" sx={{ color: "#78350f", fontSize: "0.75rem", fontWeight: 500 }}>
                                    Out: {member.punchOutTime}
                                  </Typography>
                                </Stack>
                              )}
                            </Stack>
                          ) : (
                            <Typography variant="body2" sx={{ color: "#cbd5e1", fontSize: "0.75rem" }}>
                              —
                            </Typography>
                          )}
                        </TableCell>

                        {/* Battery */}
                        <TableCell align="center" sx={{ py: 2.25 }}>
                          <BatteryChip
                            percentage={member.batteryPercentage}
                            isCharging={member.isCharging}
                          />
                        </TableCell>

                        {/* Visits Today */}
                        <TableCell align="center" sx={{ py: 2.25 }}>
                          <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.5, px: 1.25, py: 0.4, borderRadius: "0.375rem", bgcolor: alpha(PRIMARY, 0.06) }}>
                            <Storefront sx={{ fontSize: 13, color: PRIMARY }} />
                            <Typography fontSize="0.75rem" fontWeight={700} color={PRIMARY}>
                              {member.visits}
                            </Typography>
                          </Box>
                        </TableCell>

                        {/* Actions */}
                        <TableCell align="right" sx={{ pr: 3, py: 2.25 }}>
                          <Stack direction="row" spacing={0.75} justifyContent="flex-end" alignItems="center">
                            {member.status === "active" && (
                              <Tooltip title="Track Live Location">
                                <IconButton size="small"
                                  onClick={() => navigate(`/member-history/${member.id}`, { state: getMemberHistoryState(member) })}
                                  sx={{
                                    color: "#10b981", borderRadius: "0.5rem", width: 32, height: 32,
                                    border: `1px solid ${alpha("#10b981", 0.3)}`, bgcolor: alpha("#10b981", 0.05),
                                    "&:hover": { bgcolor: alpha("#10b981", 0.1) },
                                  }}>
                                  <MyLocation sx={{ fontSize: 17 }} />
                                </IconButton>
                              </Tooltip>
                            )}
                            <Button size="small" variant="outlined"
                              onClick={() =>
                                navigate(`/member-history/${member.id}`, {
                                  state: getMemberHistoryState(member),
                                })
                              }
                              sx={{
                                color: isDark ? "#60a5fa" : PRIMARY, borderColor: isDark ? "rgba(59, 130, 246, 0.3)" : alpha(PRIMARY, 0.25), bgcolor: isDark ? "rgba(59, 130, 246, 0.12)" : alpha(PRIMARY, 0.05),
                                fontWeight: 700, fontSize: "0.72rem", borderRadius: "0.5rem",
                                textTransform: "none", px: 1.75, py: 0.6, transition: "all 0.15s",
                                "&:hover": { bgcolor: PRIMARY, color: "#fff", borderColor: PRIMARY, boxShadow: `0 2px 8px ${alpha(PRIMARY, 0.3)}` },
                              }}>
                              View Details
                            </Button>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Pagination */}
            <Box sx={{ px: 3, py: 2, borderTop: "1px solid #f1f5f9", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <Typography variant="caption" sx={{ color: "#94a3b8", fontSize: "0.72rem" }}>
                Showing {filteredMembers.length} field users
              </Typography>
              <Stack direction="row" spacing={0.5}>
                {paginationLabels.map((label, i) => {
                  const isActive = label === String(page);
                  return (
                    <Button key={i} size="small"
                      onClick={() => { if (!["Previous", "Next"].includes(label)) setPage(Number(label)); }}
                      sx={{
                        minWidth: 0, px: 1.25, py: 0.4, fontSize: "0.72rem",
                        fontWeight: isActive ? 700 : 400, borderRadius: "0.375rem", border: "1px solid",
                        borderColor: isActive ? alpha(PRIMARY, 0.3) : "#e2e8f0", textTransform: "none",
                        color: isActive ? PRIMARY : "#475569", bgcolor: isActive ? alpha(PRIMARY, 0.07) : "#fff",
                        "&:hover": { bgcolor: "#f8fafc" }, boxShadow: "none",
                      }}>
                      {label}
                    </Button>
                  );
                })}
              </Stack>
            </Box>
          </Paper>
        )}
      </Box>
    </Box>
  );
}
