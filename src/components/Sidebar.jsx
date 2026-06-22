import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Drawer,
  Box,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Collapse,
  Typography,
  Divider,
  IconButton,
  Tooltip,
  SwipeableDrawer,
  Avatar,
  useTheme,
  useMediaQuery,
  Badge,
  AppBar,
  Toolbar,
} from "@mui/material";
import {
  Dashboard,
  Groups,
  PersonAdd,
  AccountBalance,
  Description,
  ReceiptLong,
  TaskAlt,
  Warning,
  CloudUpload,
  CalendarMonth,
  FilterAlt,
  Paid,
  AdminPanelSettings,
  PendingActions,
  Insights,
  AccountTree,
  Notifications,
  Logout,
  EventBusy,
  Celebration,
  ChevronLeft,
  ChevronRight,
  ExpandMore,
  Menu as MenuIcon,
  Close as CloseIcon,
  RequestQuote,
} from "@mui/icons-material";
import { useNavigate, useLocation } from "react-router-dom";
import PeopleAltIcon from "@mui/icons-material/PeopleAlt";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import ViewInAr from "@mui/icons-material/ViewInAr";
import { useAuth } from "../contexts/AuthContext";
import sidebarLogo from "../assets/sidebar-logo.webp";

// ─── Design tokens (WHITE SIDEBAR + BLUE ACCENTS) ────────────────────────────
const NAVY        = "#0f1f3d";
const NAVY_DEEP   = "#1a237e";
const NAVY_MID    = "#1a237e";
const BLUE        = "#1e40af";          // primary blue
const BLUE_LIGHT  = "#3b82f6";          // lighter blue
const BLUE_GLOW   = "rgba(30,64,175,0.12)";
const BLUE_GRADIENT = "linear-gradient(135deg, rgba(30,64,175,0.15) 0%, rgba(59,130,246,0.05) 100%)";

const TEXT_PRIMARY   = "#1f2937";       // dark gray
const TEXT_SECONDARY = "#6b7280";       // medium gray
const BORDER_COLOR   = "rgba(30,64,175,0.12)";
const HOVER_BG       = "rgba(30,64,175,0.06)";
const ACTIVE_BG      = BLUE_GLOW;

const SIDEBAR_BG = "#ffffff";

// ─── Width Constants ──────────────────────────────────────────────────────────
const SIDEBAR_WIDTH    = 268;
const COLLAPSED_WIDTH  = 68;
const MOBILE_WIDTH     = 272;

// ─── Sidebar Component ────────────────────────────────────────────────────────
const Sidebar = ({ open, toggleDrawer, onClose }) => {
  const theme    = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const isTablet = useMediaQuery(theme.breakpoints.between("sm", "md"));
  const navigate = useNavigate();
  const location = useLocation();

  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    const saved = localStorage.getItem("sidebarCollapsed");
    return saved ? JSON.parse(saved) : false;
  });

  useEffect(() => {
    if (!isMobile && !isTablet)
      localStorage.setItem("sidebarCollapsed", JSON.stringify(isCollapsed));
  }, [isCollapsed, isMobile, isTablet]);

  const effectiveCollapsed =
    !isMobile && (!open || (!isTablet && isCollapsed));
  const { user } = useAuth();

  // ── Menu items ─────────────────────────────────────────────────────────────
  const menuItems = useMemo(
    () => [
      { text: "Dashboard",       icon: <Dashboard />,         path: "/dashboard",              roles: ["Admin_panel","ZSM","Incharge","TEAM"] },
      { text: "Lead Funnel",     icon: <AccountTree />,       path: "/lead-funnel",            roles: ["Admin_panel","ZSM","Incharge","TEAM"] },
      { text: "All Leads",       icon: <FilterAlt />,         path: "/all-leads",              roles: ["Admin_panel","ZSM","Incharge","TEAM"] },
      { text: "Projects",        icon: <TaskAlt />,           path: "/projects",               roles: ["Admin_panel","ZSM","Incharge","TEAM"] },
      { text: "Total Visits",    icon: <Groups />,            path: "/total-visits",           roles: ["Admin_panel","ZSM","Incharge","TEAM"] },
      { text: "Registration",    icon: <PersonAdd />,         path: "/registration",           roles: ["Admin_panel","ZSM","Incharge","TEAM"] },
      { text: "Document",        icon: <Description />,       path: "/document-submission",    roles: ["Admin_panel","ZSM","Incharge","TEAM"] },
      { text: "Payment",         icon: <AccountBalance />,    path: "/bank-loan-apply",        roles: ["Admin_panel","ZSM","Incharge","TEAM"] },
      { text: "Loan Pending",    icon: <PendingActions />,    path: "/bank-at-pending",        roles: ["Admin_panel","ZSM","Incharge","TEAM"] },
      { text: "Disbursement",    icon: <ReceiptLong />,       path: "/disbursement",           roles: ["Admin_panel","ZSM","Incharge","TEAM"] },
      { text: "Installation",    icon: <TaskAlt />,           path: "/installation-completion",roles: ["Admin_panel","ZSM","Incharge","TEAM"] },
      { text: "3D Design",       icon: <ViewInAr />,          path: "/3d-design",              roles: ["Admin_panel","ZSM","Incharge","TEAM"] },
      { text: "Add Quotation",   icon: <RequestQuote />,      path: "/quotation/create",       roles: ["Admin_panel","ZSM","Incharge","TEAM"] },
      { text: "All Quotes",      icon: <RequestQuote />,      path: "/all-quotes",             roles: ["Admin_panel","ZSM","Incharge","TEAM"] },
      { text: "Missed Leads",    icon: <Warning />,           path: "/missed-leads",           roles: ["Admin_panel","ZSM","Incharge","TEAM"] },
      {
        text: ["Admin_panel","ZSM","Incharge"].includes(user?.role) ? "Team Attendance" : "My Attendance",
        icon: <CalendarMonth />,
        path: ["Admin_panel","ZSM","Incharge"].includes(user?.role) ? "/team-attendance" : "/attendance",
        roles: ["Admin_panel","ZSM","Incharge","TEAM"],
      },
      { text: "Leave Management",   icon: <EventBusy />,          path: "/leave-management",   roles: ["Admin_panel","ZSM","Incharge","TEAM"] },
      { text: "Holiday Management", icon: <Celebration />,        path: "/holiday-management", roles: ["Admin_panel","ZSM","Incharge","TEAM"] },
      {
        text: "Location Visit",
        icon: <LocationOnIcon />,
        path: user?.role === "TEAM" ? "/add-visit" : "/team-tracking",
        roles: ["Admin_panel","ZSM","Incharge","TEAM"],
      },
      { text: "Expense",       icon: <Paid />,              path: "/expense",          roles: ["Admin_panel","ZSM","Incharge","TEAM"] },
      { text: "Import Leads",  icon: <CloudUpload />,       path: "/import-leads",     roles: ["Admin_panel","ZSM"] },
      { text: "Users",         icon: <AdminPanelSettings />,path: "/user-management",  roles: ["Admin_panel","ZSM","Incharge"] },
      { text: "Reports",       icon: <Insights />,          path: "/reports",          roles: ["Admin_panel","ZSM","Incharge"] },
      { text: "Notifications", icon: <Notifications />,     path: "/notifications",    roles: ["Admin_panel","ZSM","Incharge","TEAM"] },
    ],
    [user?.role],
  );

  const filteredItems = useMemo(
    () => menuItems.filter((item) => item.roles.includes(user?.role)),
    [menuItems, user?.role],
  );

  const menuSections = useMemo(
    () =>
      [
        { text: "Overview",    icon: <Dashboard />,    itemNames: ["Dashboard","Lead Funnel"] },
        { text: "Leads",       icon: <FilterAlt />,    itemNames: ["All Leads","Missed Leads","Import Leads"] },
        { text: "Projects",    icon: <TaskAlt />,      itemNames: ["Projects","Total Visits","Registration","Document","Payment","Loan Pending","Installation","Disbursement","3D Design","Add Quotation","All Quotes"] },
        { text: "Attendance",  icon: <CalendarMonth />,itemNames: ["Team Attendance","My Attendance","Leave Management","Holiday Management"] },
        { text: "Team",        icon: <Groups />,       itemNames: ["Location Visit","Expense","Users"] },
        { text: "Insights",    icon: <Insights />,     itemNames: ["Reports","Notifications"] },
      ]
        .map((section) => ({
          ...section,
          items: section.itemNames
            .map((name) => filteredItems.find((item) => item.text === name))
            .filter(Boolean),
        }))
        .filter((section) => section.items.length > 0),
    [filteredItems],
  );

  const [openSection, setOpenSection] = useState("Overview");

  useEffect(() => {
    const active = menuSections.find((s) =>
      s.items.some((item) => item.path === location.pathname),
    );
    if (active) setOpenSection(active.text);
  }, [location.pathname, menuSections]);

  const isActive  = (path) => location.pathname === path;

  const handleNavigate = useCallback(
    (path) => {
      navigate(path);
      if (isMobile || isTablet) onClose?.();
    },
    [navigate, isMobile, isTablet, onClose],
  );

  const handleLogout     = () => navigate("/login");
  const getUserInitials  = () =>
    `${user?.firstName?.[0] || ""}${user?.lastName?.[0] || ""}`.toUpperCase() || "U";

  // ── Collapsed icon button ──────────────────────────────────────────────────
  const renderMenuItem = (item) => {
    const active = isActive(item.path);
    const btn = (
      <ListItemButton
        key={item.path}
        onClick={() => handleNavigate(item.path)}
        sx={{
          pl: effectiveCollapsed ? 0 : 2,
          justifyContent: effectiveCollapsed ? "center" : "flex-start",
          borderRadius: "12px",
          mx: effectiveCollapsed ? 0.5 : 1,
          my: 0.5,
          bgcolor: active ? "rgba(30,64,175,0.1)" : "transparent",
          color: TEXT_PRIMARY,
          minHeight: isMobile ? 52 : 46,
          py: isMobile ? 1.3 : 1,
          transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
          position: "relative",
          overflow: "hidden",
          border: active ? "1.5px solid rgba(30,64,175,0.3)" : "1.5px solid transparent",
          boxShadow: active ? "0 2px 8px rgba(30,64,175,0.12)" : "none",
          "&::before": active ? {
            content: '""',
            position: "absolute",
            inset: 0,
            background: BLUE_GRADIENT,
            pointerEvents: "none",
          } : {},
          "&:hover": { 
            bgcolor: active ? "rgba(30,64,175,0.15)" : "rgba(30,64,175,0.08)",
            transform: isMobile ? "none" : "translateX(5px)",
            boxShadow: "0 4px 16px rgba(30,64,175,0.15)",
            border: `1.5px solid rgba(30,64,175,0.25)`,
          },
        }}
      >
        <ListItemIcon
          sx={{
            minWidth: effectiveCollapsed ? "auto" : 40,
            color: active ? BLUE : TEXT_SECONDARY,
            "& svg": { fontSize: isMobile ? "1.35rem" : "1.25rem" },
            transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
            transform: active ? "scale(1.1)" : "scale(1)",
          }}
        >
          {item.badge ? (
            <Badge badgeContent={item.badge} color="error" variant="dot">{item.icon}</Badge>
          ) : item.icon}
        </ListItemIcon>
        {!effectiveCollapsed && (
          <ListItemText
            primary={item.text}
            primaryTypographyProps={{
              fontSize: isMobile ? "0.92rem" : "0.875rem",
              fontWeight: active ? 700 : 500,
              letterSpacing: "0.01em",
              noWrap: true,
              color: active ? BLUE : TEXT_SECONDARY,
              transition: "all 0.25s ease",
            }}
          />
        )}
      </ListItemButton>
    );

    return effectiveCollapsed ? (
      <Tooltip key={item.path} title={item.text} placement="right" arrow>{btn}</Tooltip>
    ) : (
      <React.Fragment key={item.path}>{btn}</React.Fragment>
    );
  };

  // ── Submenu item ───────────────────────────────────────────────────────────
  const renderSubmenuItem = (item) => {
    const active = isActive(item.path);
    return (
      <ListItemButton
        key={item.path}
        onClick={() => handleNavigate(item.path)}
        sx={{
          minHeight: isMobile ? 44 : 40,
          px: 1.1, py: 0.75, my: 0.3,
          borderRadius: "10px",
          position: "relative",
          color: active ? BLUE : TEXT_SECONDARY,
          bgcolor: active ? "rgba(30,64,175,0.12)" : "transparent",
          border: active ? "1px solid rgba(30,64,175,0.25)" : "1px solid transparent",
          transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
          boxShadow: active ? "0 2px 6px rgba(30,64,175,0.1)" : "none",
          "&:hover": {
            bgcolor: active ? "rgba(30,64,175,0.18)" : "rgba(30,64,175,0.08)",
            color: active ? BLUE_LIGHT : TEXT_PRIMARY,
            transform: isMobile ? "none" : "translateX(3px)",
            boxShadow: "0 3px 10px rgba(30,64,175,0.12)",
            border: `1px solid rgba(30,64,175,0.2)`,
          },
        }}
      >
        {/* Blue indicator bar with animation */}
        {active && (
          <Box sx={{
            position: "absolute", left: 0, top: 8, bottom: 8,
            width: 3, borderRadius: 999, bgcolor: BLUE,
            animation: "slideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
            "@keyframes slideIn": {
              from: { left: -4, opacity: 0 },
              to: { left: 0, opacity: 1 },
            }
          }} />
        )}
        <ListItemIcon
          sx={{
            minWidth: 29,
            color: "inherit",
            "& svg": { fontSize: isMobile ? "1.08rem" : "1rem" },
            transition: "all 0.25s ease",
            transform: active ? "scale(1.15)" : "scale(1)",
          }}
        >
          {item.icon}
        </ListItemIcon>
        <ListItemText
          primary={item.text}
          primaryTypographyProps={{
            fontSize: isMobile ? "0.88rem" : "0.81rem",
            fontWeight: active ? 700 : 500,
            letterSpacing: "0.005em",
            noWrap: true,
          }}
        />
      </ListItemButton>
    );
  };

  // ── Section header ─────────────────────────────────────────────────────────
  const renderMenuSection = (section) => {
    const isOpen        = openSection === section.text;
    const hasActiveItem = section.items.some((item) => isActive(item.path));

    return (
      <Box key={section.text} sx={{ mb: 0.6 }}>
        <ListItemButton
          onClick={() => setOpenSection(isOpen ? null : section.text)}
          sx={{
            minHeight: isMobile ? 50 : 46,
            mx: 0.75, px: 1.25,
            borderRadius: "12px",
            color: TEXT_PRIMARY,
            bgcolor: hasActiveItem ? "rgba(30,64,175,0.1)" : "transparent",
            border: hasActiveItem ? "1.5px solid rgba(30,64,175,0.25)" : "1.5px solid transparent",
            transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
            boxShadow: hasActiveItem ? "0 2px 8px rgba(30,64,175,0.12)" : "none",
            "&:hover": { 
              bgcolor: hasActiveItem ? "rgba(30,64,175,0.15)" : "rgba(30,64,175,0.06)",
              boxShadow: "0 3px 12px rgba(30,64,175,0.12)",
              border: `1.5px solid rgba(30,64,175,0.2)`,
            },
          }}
        >
          <Box
            sx={{
              width: 36, height: 36, mr: 1.25,
              borderRadius: "10px",
              display: "grid", placeItems: "center",
              bgcolor: hasActiveItem ? "rgba(30,64,175,0.15)" : "rgba(30,64,175,0.08)",
              color: hasActiveItem ? BLUE : TEXT_SECONDARY,
              flexShrink: 0,
              border: hasActiveItem ? `1.5px solid rgba(30,64,175,0.3)` : `1.5px solid rgba(30,64,175,0.1)`,
              transition: "all 0.25s ease",
              "& svg": { fontSize: "1.15rem" },
              boxShadow: hasActiveItem ? "0 2px 6px rgba(30,64,175,0.1)" : "none",
            }}
          >
            {section.icon}
          </Box>
          <ListItemText
            primary={section.text}
            primaryTypographyProps={{
              fontSize: isMobile ? "0.92rem" : "0.84rem",
              fontWeight: 700,
              letterSpacing: "0.015em",
              noWrap: true,
              color: hasActiveItem ? BLUE : TEXT_SECONDARY,
              transition: "all 0.25s ease",
            }}
          />
          <ExpandMore
            sx={{
              fontSize: "1.25rem",
              color: hasActiveItem ? BLUE : TEXT_SECONDARY,
              transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
              transition: "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
            }}
          />
        </ListItemButton>

        <Collapse in={isOpen} timeout={300} unmountOnExit>
          <Box
            sx={{
              mt: 0.5, mb: 0.8,
              ml: isMobile ? 3.1 : 2.8,
              mr: 0.9, pl: 1.15,
              borderLeft: `2px solid rgba(30,64,175,0.15)`,
            }}
          >
            {section.items.map(renderSubmenuItem)}
          </Box>
        </Collapse>
      </Box>
    );
  };

  // ── Scroll area ────────────────────────────────────────────────────────────
  const scrollArea = (
    <Box
      sx={{
        flex: 1, overflowY: "auto", overflowX: "hidden",
        py: 1.5, px: 0.5,
        "&::-webkit-scrollbar": { width: "4px" },
        "&::-webkit-scrollbar-thumb": { 
          background: "rgba(30,64,175,0.25)", 
          borderRadius: "6px",
          "&:hover": { background: "rgba(30,64,175,0.4)" },
        },
        "&::-webkit-scrollbar-track": { background: "transparent" },
      }}
    >
      {effectiveCollapsed
        ? filteredItems.map(renderMenuItem)
        : menuSections.map((section) =>
            section.direct ? renderMenuItem(section.items[0]) : renderMenuSection(section),
          )}
    </Box>
  );

  // ── Logo bar ───────────────────────────────────────────────────────────────
  const logoBar = (
    <Box
      sx={{
        px: effectiveCollapsed ? 1 : 2.5, py: 2,
        display: "flex", alignItems: "center",
        justifyContent: effectiveCollapsed ? "center" : "flex-start",
        gap: 1.5,
        borderBottom: `1.5px solid ${BORDER_COLOR}`,
        minHeight: 68, flexShrink: 0,
        background: SIDEBAR_BG,
      }}
    >
      <Box
        sx={{
          width: effectiveCollapsed ? 36 : 42,
          height: effectiveCollapsed ? 36 : 42,
          borderRadius: "12px", 
          bgcolor: "#fff",
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0, overflow: "hidden",
          border: `1px solid ${BORDER_COLOR}`,
          boxShadow: "0 6px 16px rgba(30,64,175,0.14)",
          transition: "all 0.25s ease",
        }}
      >
        <Box
          component="img" src={sidebarLogo} alt="Solar CRM"
          onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = sidebarLogo; }}
          sx={{ width: "100%", height: "100%", objectFit: "contain", p: 0.4 }}
        />
      </Box>
      {!effectiveCollapsed && (
        <Box sx={{ overflow: "hidden" }}>
          <Typography variant="subtitle1" color={TEXT_PRIMARY} fontWeight={800}
            sx={{ lineHeight: 1.2, letterSpacing: "-0.01em", whiteSpace: "nowrap" }}>
            Vanurtech Pvt Ltd
          </Typography>
          <Typography variant="caption" sx={{ color: TEXT_SECONDARY, fontSize: "0.68rem" }}>
            Solar Software Inc
          </Typography>
        </Box>
      )}
    </Box>
  );

  // ── Mobile header ──────────────────────────────────────────────────────────
  const mobileHeader = (
    <Box
      sx={{
        px: 2.5, py: 1.8,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        borderBottom: `1.5px solid ${BORDER_COLOR}`,
        flexShrink: 0, minHeight: 68,
        background: SIDEBAR_BG,
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
        <Box sx={{
          width: 40, height: 40, borderRadius: "12px", bgcolor: "#fff",
          display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden",
          border: `1px solid ${BORDER_COLOR}`,
          boxShadow: "0 6px 16px rgba(30,64,175,0.14)",
        }}>
          <Box component="img" src={sidebarLogo} alt="Solar CRM"
            onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = sidebarLogo; }}
            sx={{ width: "100%", height: "100%", objectFit: "contain", p: 0.4 }}
          />
        </Box>
        <Box>
          <Typography variant="subtitle1" color={TEXT_PRIMARY} fontWeight={800} sx={{ lineHeight: 1.2 }}>
            Solar CRM
          </Typography>
          <Typography variant="caption" sx={{ color: TEXT_SECONDARY, fontSize: "0.68rem" }}>
            CRM Dashboard
          </Typography>
        </Box>
      </Box>
      <IconButton onClick={onClose} size="small"
        sx={{ color: TEXT_SECONDARY, bgcolor: "rgba(30,64,175,0.1)", borderRadius: "10px",
          transition: "all 0.25s ease",
          "&:hover": { bgcolor: "rgba(30,64,175,0.15)", color: BLUE, boxShadow: "0 2px 8px rgba(30,64,175,0.15)" }, 
          width: 36, height: 36 }}>
        <CloseIcon fontSize="small" />
      </IconButton>
    </Box>
  );

  // ── Footer ─────────────────────────────────────────────────────────────────
  const footer = (
    <Box sx={{ p: effectiveCollapsed ? 1.5 : 2, borderTop: `1.5px solid ${BORDER_COLOR}`,
      flexShrink: 0, background: SIDEBAR_BG }}>
      {/* Collapse toggle — desktop only */}
      {!isMobile && !isTablet && (
        <Box sx={{ display: "flex", justifyContent: "center", mb: effectiveCollapsed ? 1 : 1.5 }}>
          <Tooltip title={effectiveCollapsed ? "Expand sidebar" : "Collapse sidebar"} placement="right" arrow>
            <IconButton onClick={() => setIsCollapsed((v) => !v)} size="small"
              sx={{ color: TEXT_SECONDARY, bgcolor: "rgba(30,64,175,0.1)", borderRadius: "10px",
                transition: "all 0.25s ease",
                "&:hover": { bgcolor: "rgba(30,64,175,0.15)", color: BLUE, boxShadow: "0 2px 8px rgba(30,64,175,0.15)" }, 
                width: 36, height: 36 }}>
              {effectiveCollapsed ? <ChevronRight fontSize="small" /> : <ChevronLeft fontSize="small" />}
            </IconButton>
          </Tooltip>
        </Box>
      )}

      <Box sx={{
        display: "flex",
        justifyContent: effectiveCollapsed ? "center" : "space-between",
        alignItems: "center", gap: 1,
      }}>
        {!effectiveCollapsed && (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, overflow: "hidden", flex: 1 }}>
            <Avatar
              sx={{
                width: 36, height: 36, flexShrink: 0,
                bgcolor: "rgba(30,64,175,0.15)",
                border: `2px solid ${BLUE}`,
                fontSize: "0.75rem", fontWeight: 800,
                color: BLUE,
                boxShadow: "0 2px 6px rgba(30,64,175,0.15)",
              }}
            >
              {getUserInitials()}
            </Avatar>
            <Box sx={{ overflow: "hidden" }}>
              <Typography variant="caption"
                sx={{ color: TEXT_PRIMARY, fontWeight: 700, display: "block", lineHeight: 1.2,
                  whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {user?.firstName} {user?.lastName}
              </Typography>
              <Typography variant="caption" sx={{ color: TEXT_SECONDARY, fontSize: "0.63rem" }}>
                v2.2.0
              </Typography>
            </Box>
          </Box>
        )}
        <Tooltip title="Logout" placement={effectiveCollapsed ? "right" : "top"} arrow>
          <IconButton size="small" onClick={handleLogout}
            sx={{ color: TEXT_SECONDARY, bgcolor: "rgba(30,64,175,0.1)", borderRadius: "10px",
              transition: "all 0.25s ease",
              "&:hover": { bgcolor: "rgba(239,68,68,0.15)", color: "#ef4444", boxShadow: "0 2px 8px rgba(239,68,68,0.2)" },
              width: 36, height: 36, flexShrink: 0 }}>
            <Logout fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  );

  // ── Drawer content ─────────────────────────────────────────────────────────
  const DesktopContent = (
    <Box sx={{ height: "100vh", display: "flex", flexDirection: "column", background: SIDEBAR_BG }}>
      {logoBar}
      {scrollArea}
      {footer}
    </Box>
  );

  const MobileContent = (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column", background: SIDEBAR_BG, width: MOBILE_WIDTH }}>
      {mobileHeader}
      {scrollArea}
      {footer}
    </Box>
  );

  return (
    <>
      {!isMobile && (
        <Drawer variant="permanent"
          sx={{
            display: { xs: "none", sm: "block" },
            width: effectiveCollapsed ? COLLAPSED_WIDTH : SIDEBAR_WIDTH,
            flexShrink: 0,
            "& .MuiDrawer-paper": {
              width: effectiveCollapsed ? COLLAPSED_WIDTH : SIDEBAR_WIDTH,
              boxSizing: "border-box", overflowX: "hidden",
              transition: "width 0.3s cubic-bezier(0.4,0,0.2,1)",
              backgroundColor: "transparent", border: "none",
              boxShadow: `2px 0 12px rgba(30,64,175,0.12)`,
            },
          }}
        >
          {DesktopContent}
        </Drawer>
      )}

      {isMobile && (
        <SwipeableDrawer anchor="left" open={open} onClose={onClose} onOpen={toggleDrawer}
          swipeAreaWidth={28} disableSwipeToOpen={false}
          ModalProps={{ keepMounted: true }}
          sx={{
            zIndex: (t) => t.zIndex.drawer + 2,
            "& .MuiDrawer-paper": {
              width: MOBILE_WIDTH, maxWidth: "88vw",
              backgroundColor: "transparent", border: "none",
              boxShadow: "4px 0 16px rgba(30,64,175,0.15)",
            },
          }}
        >
          {MobileContent}
        </SwipeableDrawer>
      )}
    </>
  );
};

// ─── Mobile Top AppBar ────────────────────────────────────────────────────────
export const MobileTopBar = ({ onMenuClick, title = "Dashboard" }) => {
  const theme    = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  if (!isMobile) return null;

  return (
    <AppBar position="fixed" elevation={0}
      sx={{
        background: `linear-gradient(90deg, ${BLUE} 0%, ${NAVY} 100%)`,
        borderBottom: `1.5px solid rgba(30,64,175,0.2)`,
        zIndex: theme.zIndex.drawer + 1,
        boxShadow: "0 2px 12px rgba(30,64,175,0.15)",
      }}
    >
      <Toolbar sx={{ minHeight: "60px !important", px: { xs: 1.5, sm: 2 }, gap: 1 }}>
        <IconButton edge="start" onClick={onMenuClick}
          sx={{
            color: "#fff", mr: 0.5,
            bgcolor: "rgba(255,255,255,0.15)", borderRadius: "10px",
            width: 40, height: 40,
            transition: "all 0.25s ease",
            "&:hover": { bgcolor: "rgba(255,255,255,0.25)", boxShadow: "0 2px 8px rgba(0,0,0,0.2)" },
          }}
        >
          <MenuIcon />
        </IconButton>

        <Box sx={{ display: "flex", alignItems: "center", gap: 1, flex: 1 }}>
          <Box sx={{
            width: 32, height: 32, borderRadius: "8px", bgcolor: "#fff",
            display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden",
            boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
          }}>
            <Box component="img" src={sidebarLogo} alt="Solar CRM"
              onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = sidebarLogo; }}
              sx={{ width: "100%", height: "100%", objectFit: "contain", p: 0.35 }}
            />
          </Box>
          <Typography variant="subtitle1"
            sx={{ color: "#fff", fontWeight: 800, letterSpacing: "-0.01em", fontSize: "1rem" }}>
            Solar CRM
          </Typography>
        </Box>

        <Typography variant="caption"
          sx={{
            color: "rgba(255,255,255,0.9)", fontSize: "0.72rem", fontWeight: 600,
            bgcolor: "rgba(255,255,255,0.15)", px: 1.2, py: 0.6, borderRadius: "8px",
            letterSpacing: "0.02em", display: { xs: "none", sm: "block" },
            border: "1px solid rgba(255,255,255,0.25)",
            transition: "all 0.25s ease",
          }}
        >
          {title}
        </Typography>

        <Avatar sx={{
          width: 34, height: 34,
          bgcolor: "rgba(255,255,255,0.2)", border: `1.5px solid rgba(255,255,255,0.4)`,
          fontSize: "0.75rem", fontWeight: 800, color: "#fff",
        }}>
          ST
        </Avatar>
      </Toolbar>
    </AppBar>
  );
};

// ─── Layout Wrapper ───────────────────────────────────────────────────────────
export const AppLayout = ({ children }) => {
  const theme    = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const isTablet = useMediaQuery(theme.breakpoints.between("sm", "md"));

  const [mobileOpen, setMobileOpen] = useState(false);

  const [isCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    const s = localStorage.getItem("sidebarCollapsed");
    return s ? JSON.parse(s) : false;
  });

  const effectiveCollapsed = isCollapsed && !isMobile && !isTablet;
  const sidebarW = isMobile ? 0 : effectiveCollapsed ? COLLAPSED_WIDTH : SIDEBAR_WIDTH;

  return (
    <Box sx={{ display: "flex", minHeight: "100vh", bgcolor: "#f5f7fb" }}>
      <MobileTopBar onMenuClick={() => setMobileOpen(true)} />
      <Sidebar open={mobileOpen} toggleDrawer={() => setMobileOpen(true)} onClose={() => setMobileOpen(false)} />
      <Box component="main"
        sx={{
          flex: 1,
          ml: { xs: 0, sm: `${sidebarW}px` },
          mt: { xs: "60px", sm: 0 },
          minHeight: "100vh",
          transition: "margin-left 0.3s cubic-bezier(0.4,0,0.2,1)",
          overflow: "auto",
          pb: { xs: "env(safe-area-inset-bottom)", sm: 0 },
        }}
      >
        {children}
      </Box>
    </Box>
  );
};

export default Sidebar;
