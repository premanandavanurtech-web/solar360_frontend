// App.js
import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { ThemeProvider, createTheme, CssBaseline } from "@mui/material";
import { AuthProvider } from "./contexts/AuthContext";
import { DashboardProvider } from "./contexts/DashboardContext";
import ProtectedRoute from "./components/ProtectedRoute";
import MainLayout from "./components/MainLayout";
import Login from "./components/auth/Login";
import Dashboard from "./pages/Dashboard";
import TotalVisitsPage from "./pages/TotalVisits";
import Registration from "./pages/Registration";
import Reports from "./pages/Reports";
import UserManagement from "./pages/UserManagement";
import AddUserPage from "./pages/AddUserPage";
import ImportLead from "./pages/ImportLeads";
import AddLead from "./pages/AddLead";
import Expense from "./pages/Expense";
import LeadFunnelDashboard from "./pages/LeadFunnel";
import MissedLeads from "./pages/MissedLeads";
import Installation from "./pages/Installation";
import BankLoanApply from "./pages/BankLoanApply";
import DocumentSubmission from "./pages/DocumentSubmission";
import Disbursement from "./pages/Disbursement";
import LeadOverview from "./pages/LeadOverview";
import LeadDetailsPage from "./pages/LeadDetailsPage";
import BankAtPending from "./pages/BankAtPending";
import Attandance from "./pages/Attandance";
import AttendanceHistoryPage from "./pages/AttendanceHistoryPage";
import VisitDetails from "./pages/AddVisit";
import TeamTracking from "./pages/TeamTracking";
import MemberVisitHistory from "./pages/Membervisithistory";
import TeamAttendance from "./pages/TeamAttendance";
import Notifications from "./pages/Notifications";
import LeaveManagement from "./pages/LeaveManagement";
import LeaveTypes from "./pages/LeaveTypes";
import HolidayManagement from "./pages/HolidayManagement";
import ThreeDDesign, { SharedThreeDDesignView, ThreeDDesignDashboard, ThreeDDesignPreview } from "./pages/ThreeDDesign";
import Quotation from "./pages/Quotation";
import QuotationEditor from "./pages/QuotationEditor";
import AllQuotes from "./pages/AllQuotes";
import PublicDocumentUpload from "./pages/PublicDocumentUpload";
import Projects from "./pages/Projects";
import ProjectDetails from "./pages/ProjectDetails";


const theme = createTheme({
  palette: {
    primary: { main: "#3566bb", light: "#2172c9", dark: "#0a479b", contrastText: "#fff" },
    secondary: { main: "#1a237e", light: "#534bae", dark: "#000051", contrastText: "#fff" },
    background: { default: "#f8f9fa", paper: "#ffffff" },
    error: { main: "#f44336" },
    warning: { main: "#ff9800" },
    info: { main: "#2196f3" },
    success: { main: "#4caf50" },
    text: { primary: "#1a1a1a", secondary: "#666666", disabled: "#999999" },
    divider: "#e0e0e0",
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: { fontWeight: 700, fontSize: "2.5rem" },
    h2: { fontWeight: 700, fontSize: "2rem" },
    h3: { fontWeight: 600, fontSize: "1.75rem" },
    h4: { fontWeight: 600, fontSize: "1.5rem" },
    h5: { fontWeight: 600, fontSize: "1.25rem" },
    h6: { fontWeight: 600, fontSize: "1rem" },
    body1: { fontSize: "1rem", lineHeight: 1.5 },
    body2: { fontSize: "0.875rem", lineHeight: 1.43 },
    button: { fontWeight: 600, textTransform: "none" },
  },
  shape: { borderRadius: 12 },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: "none", borderRadius: 12, fontWeight: 600, boxShadow: "none",
          "&:hover": { boxShadow: "0 4px 12px rgba(255,140,0,0.3)" },
        },
        containedPrimary: {
          background: "linear-gradient(45deg, #ff8c00 30%, #ff6b00 90%)",
          "&:hover": { background: "linear-gradient(45deg, #ff6b00 30%, #ff5500 90%)" },
        },
      },
    },
    MuiCard: {
      styleOverrides: { root: { borderRadius: 16, boxShadow: "0 4px 20px rgba(0,0,0,0.08)", overflow: "visible" } },
    },
    MuiDrawer: {
      styleOverrides: { paper: { borderRadius: "0 20px 20px 0", borderRight: "none", boxShadow: "4px 0 20px rgba(0,0,0,0.1)" } },
    },
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <DashboardProvider>
          <Router>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/s" element={<SharedThreeDDesignView />} />
              <Route path="/solar-design/view" element={<SharedThreeDDesignView />} />
              <Route path="/q/:shareToken" element={<Quotation />} />
              <Route path="/documents/upload/:token" element={<PublicDocumentUpload />} />
              <Route path="/" element={<Navigate to="/login" replace />} />
              <Route
                path="/quotation/create"
                element={
                  <ProtectedRoute allowedRoles={["Admin_panel","ZSM","Incharge","TEAM"]}>
                    <QuotationEditor initialMode="create" />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/quotation/edit"
                element={
                  <ProtectedRoute allowedRoles={["Admin_panel","ZSM","Incharge","TEAM"]}>
                    <QuotationEditor />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/*"
                element={
                  <ProtectedRoute>
                    <MainLayout>
                      <Routes>
                        <Route path="dashboard" element={<ProtectedRoute allowedRoles={["Admin_panel","ZSM","Incharge","TEAM"]}><Dashboard /></ProtectedRoute>} />
                        <Route path="total-visits" element={<ProtectedRoute allowedRoles={["Admin_panel","ZSM","Incharge","TEAM"]}><TotalVisitsPage /></ProtectedRoute>} />
                        <Route path="registration" element={<ProtectedRoute allowedRoles={["Admin_panel","ZSM","Incharge","TEAM"]}><Registration /></ProtectedRoute>} />
                        <Route path="reports" element={<ProtectedRoute allowedRoles={["Admin_panel","ZSM","Incharge","TEAM"]}><Reports /></ProtectedRoute>} />
                        <Route path="user-management" element={<ProtectedRoute allowedRoles={["Admin_panel","ZSM","Incharge","TEAM"]}><UserManagement /></ProtectedRoute>} />
                        <Route path="add-user" element={<ProtectedRoute allowedRoles={["Admin_panel","ZSM","Incharge"]}><AddUserPage /></ProtectedRoute>} />
                        <Route path="import-leads" element={<ProtectedRoute allowedRoles={["Admin_panel","ZSM","Incharge","TEAM"]}><ImportLead /></ProtectedRoute>} />
                        <Route path="add-lead" element={<ProtectedRoute allowedRoles={["Admin_panel","ZSM","Incharge","TEAM"]}><AddLead /></ProtectedRoute>} />
                        <Route path="expense" element={<ProtectedRoute allowedRoles={["Admin_panel","ZSM","Incharge","TEAM"]}><Expense /></ProtectedRoute>} />
                        <Route path="lead-funnel" element={<ProtectedRoute allowedRoles={["Admin_panel","ZSM","Incharge","TEAM"]}><LeadFunnelDashboard /></ProtectedRoute>} />
                        <Route path="missed-leads" element={<ProtectedRoute allowedRoles={["Admin_panel","ZSM","Incharge","TEAM"]}><MissedLeads /></ProtectedRoute>} />
                        <Route path="installation-completion" element={<ProtectedRoute allowedRoles={["Admin_panel","ZSM","Incharge","TEAM"]}><Installation /></ProtectedRoute>} />
                        <Route path="3d-design" element={<ProtectedRoute allowedRoles={["Admin_panel","ZSM","Incharge","TEAM"]}><ThreeDDesignDashboard /></ProtectedRoute>} />
                        <Route path="3d-design/new" element={<ProtectedRoute allowedRoles={["Admin_panel","ZSM","Incharge","TEAM"]}><ThreeDDesign /></ProtectedRoute>} />
                        <Route path="3d-design/preview" element={<ProtectedRoute allowedRoles={["Admin_panel","ZSM","Incharge","TEAM"]}><ThreeDDesignPreview /></ProtectedRoute>} />
                        <Route path="quotation" element={<ProtectedRoute allowedRoles={["Admin_panel","ZSM","Incharge","TEAM"]}><Quotation /></ProtectedRoute>} />
                        <Route path="all-quotes" element={<ProtectedRoute allowedRoles={["Admin_panel","ZSM","Incharge","TEAM"]}><AllQuotes /></ProtectedRoute>} />
                        <Route path="bank-loan-apply" element={<ProtectedRoute allowedRoles={["Admin_panel","ZSM","Incharge","TEAM"]}><BankLoanApply /></ProtectedRoute>} />
                        <Route path="document-submission" element={<ProtectedRoute allowedRoles={["Admin_panel","ZSM","Incharge","TEAM"]}><DocumentSubmission /></ProtectedRoute>} />
                        <Route path="add-visit" element={<ProtectedRoute allowedRoles={["Admin_panel","ZSM","Incharge","TEAM"]}><VisitDetails /></ProtectedRoute>} />
                        <Route path="bank-at-pending" element={<ProtectedRoute allowedRoles={["Admin_panel","ZSM","Incharge","TEAM"]}><BankAtPending /></ProtectedRoute>} />
                        <Route path="disbursement" element={<ProtectedRoute allowedRoles={["Admin_panel","ZSM","Incharge","TEAM"]}><Disbursement /></ProtectedRoute>} />
                        

                        {/* ── ATTENDANCE ───────────────────────────────────────────────────
                            /attendance              → own attendance (any role)
                            /attendance/:userId      → view a team member's attendance (managers only)
                                                       Attandance.jsx reads useParams().userId
                            /team-attendance         → team member picker (managers only)
                        ──────────────────────────────────────────────────────────────────── */}
                        <Route
                          path="attendance"
                          element={
                            <ProtectedRoute allowedRoles={["Admin_panel","ZSM","Incharge","TEAM"]}>
                              <Attandance />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="attendance/:userId"
                          element={
                            <ProtectedRoute allowedRoles={["Admin_panel","ZSM","Incharge"]}>
                              <Attandance />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="attendance-history/:userId"
                          element={
                            <ProtectedRoute allowedRoles={["Admin_panel","ZSM","Incharge","TEAM"]}>
                              <AttendanceHistoryPage />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="team-attendance"
                          element={
                            <ProtectedRoute allowedRoles={["Admin_panel","ZSM","Incharge"]}>
                              <TeamAttendance />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="leave-management"
                          element={
                            <ProtectedRoute allowedRoles={["Admin_panel","ZSM","Incharge","TEAM"]}>
                              <LeaveManagement />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="leave-types"
                          element={
                            <ProtectedRoute allowedRoles={["Admin_panel","ZSM","Incharge","TEAM"]}>
                              <LeaveTypes />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="holiday-management"
                          element={
                            <ProtectedRoute allowedRoles={["Admin_panel","ZSM","Incharge","TEAM"]}>
                              <HolidayManagement />
                            </ProtectedRoute>
                          }
                        />

                        <Route path="team-tracking" element={<ProtectedRoute allowedRoles={["Admin_panel","ZSM","Incharge","TEAM"]}><TeamTracking /></ProtectedRoute>} />
                       <Route path="member-history/:userId" element={<ProtectedRoute allowedRoles={["Admin_panel","ZSM","Incharge","TEAM"]}><MemberVisitHistory /></ProtectedRoute>} />
                        <Route path="notifications" element={<ProtectedRoute allowedRoles={["Admin_panel","ZSM","Incharge","TEAM"]}><Notifications /></ProtectedRoute>} />
                        <Route path="all-leads/:leadId" element={<ProtectedRoute allowedRoles={["Admin_panel","ZSM","Incharge","TEAM"]}><LeadDetailsPage /></ProtectedRoute>} />
                        <Route path="all-leads" element={<ProtectedRoute allowedRoles={["Admin_panel","ZSM","Incharge","TEAM"]}><LeadOverview /></ProtectedRoute>} />
                        <Route path="projects/:projectId" element={<ProtectedRoute allowedRoles={["Admin_panel","ZSM","Incharge","TEAM"]}><ProjectDetails /></ProtectedRoute>} />
                        <Route path="projects" element={<ProtectedRoute allowedRoles={["Admin_panel","ZSM","Incharge","TEAM"]}><Projects /></ProtectedRoute>} />
                        <Route path="*" element={<Navigate to="/dashboard" replace />} />
                      </Routes>
                    </MainLayout>
                  </ProtectedRoute>
                }
              />
            </Routes>
          </Router>
        </DashboardProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
