import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Collapse,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  Grid,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  CalendarTodayRounded,
  CheckCircleRounded,
  CloseRounded,
  DateRangeRounded,
  EngineeringRounded,
  ExpandLessRounded,
  ExpandMoreRounded,
  FilterListRounded,
  FmdGoodRounded,
  ImageRounded,
  OpenInNewRounded,
  PersonRounded,
  PictureAsPdfRounded,
  RefreshRounded,
  RestartAltRounded,
  SearchRounded,
  ShieldRounded,
  SolarPowerRounded,
  SpeedRounded,
} from "@mui/icons-material";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { useAuth } from "../contexts/AuthContext";
import { scsLogoBase64 } from "../assets/logoBase64";
import { API_ORIGIN } from "../utils/apiConfig";

// ─── UTILITIES & HELPERS ─────────────────────────────────────────────────────

const text = (value, fallback = "-") => {
  if (value === undefined || value === null || value === "") return fallback;
  return String(value);
};

const personName = (person) => {
  if (!person) return "-";
  if (typeof person === "string") return person;
  return (
    [person?.firstName, person?.lastName].filter(Boolean).join(" ").trim() ||
    person?.email ||
    person?.name ||
    "-"
  );
};

const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const formatTime = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

const resolvePhotoUrl = (url) => {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:")) {
    return url;
  }
  const cleanPath = url.startsWith("/") ? url : `/${url}`;
  return `${API_ORIGIN}${cleanPath}`;
};

const inchargeNames = (project) => {
  const list = [];
  if (Array.isArray(project?.incharges) && project.incharges.length > 0) {
    project.incharges.forEach((p) => {
      const name = personName(p);
      if (name && name !== "-" && !list.includes(name)) list.push(name);
    });
  }
  if (project?.incharge) {
    const single = personName(project.incharge);
    if (single && single !== "-" && !list.includes(single)) list.push(single);
  }
  return list.length > 0 ? list.join(", ") : "-";
};

const uniqueInchargeNames = (projects = []) => {
  const names = [];
  (projects || []).forEach((proj) => {
    if (Array.isArray(proj.incharges)) {
      proj.incharges.forEach((p) => {
        const name = personName(p);
        if (name && name !== "-" && !names.includes(name)) names.push(name);
      });
    }
    if (proj.incharge) {
      const single = personName(proj.incharge);
      if (single && single !== "-" && !names.includes(single)) names.push(single);
    }
  });
  return names.length > 0 ? names.join(", ") : "-";
};

const uniqueSupervisorNames = (projects = []) => {
  const names = (projects || [])
    .map((p) => personName(p.supervisor))
    .filter((n) => n && n !== "-");
  return [...new Set(names)].join(", ") || "-";
};

const isSupervisorSubmitter = (user) => {
  const r = String(user?.role || "").trim().toUpperCase();
  return ["SUPERVISOR", "ZSM", "MANAGER", "PROJECT_HEAD", "ADMIN", "ADMIN_PANEL"].includes(r);
};

const isInchargeSubmitter = (user) => {
  const r = String(user?.role || "").trim().toUpperCase();
  return ["INCHARGE", "TEAM", "INSTALLER"].includes(r) || (!isSupervisorSubmitter(user) && r !== "");
};

const getProjectTimestamp = (project, parentRow) => {
  const raw =
    project?.createdAt ||
    project?.timestamp ||
    project?.time ||
    project?.createdTime ||
    project?.photos?.[0]?.capturedAt ||
    project?.gpsLocation?.recordedAt ||
    parentRow?.submittedAt ||
    parentRow?.createdAt;
  return formatTime(raw);
};

const projectRowsForPdf = (projects = [], parentRow = null) =>
  projects.map((project, index) => [
    index + 1,
    getProjectTimestamp(project, parentRow),
    text(project.projectType),
    text(project.consumerName || project.siteLocation),
    text(project.consumerAccountNo),
    text(project.capacityKw ? `${project.capacityKw} KW` : ""),
    text(project.installationDay ? `${project.installationDay} Days` : ""),
    personName(project.supervisor),
    inchargeNames(project),
    text(project.address || project.siteLocation || project.gpsLocation?.address),
    text(project.report),
  ]);

const fetchImageDataUrl = async (url) => {
  try {
    const fullUrl = resolvePhotoUrl(url);
    const res = await fetch(fullUrl, { mode: "cors" });
    if (!res.ok) return null;
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    });
  } catch (err) {
    return null;
  }
};

// ─── PDF DRAWING HELPERS ─────────────────────────────────────────────────────

const drawCalendarIcon = (doc, x, y) => {
  doc.setFillColor(15, 47, 87);
  doc.roundedRect(x, y + 2, 16, 14, 2, 2, "F");
  doc.setFillColor(240, 246, 253);
  doc.rect(x + 2, y + 6, 12, 8, "F");
  doc.setFillColor(15, 47, 87);
  doc.rect(x + 4, y + 8, 2, 2, "F");
  doc.rect(x + 7, y + 8, 2, 2, "F");
  doc.rect(x + 10, y + 8, 2, 2, "F");
  doc.rect(x + 4, y + 11, 2, 2, "F");
  doc.rect(x + 7, y + 11, 2, 2, "F");
  doc.rect(x + 10, y + 11, 2, 2, "F");
  doc.rect(x + 4, y, 2, 3, "F");
  doc.rect(x + 10, y, 2, 3, "F");
};

const drawUserIcon = (doc, x, y) => {
  doc.setFillColor(15, 47, 87);
  doc.circle(x + 8, y + 5, 4, "F");
  doc.ellipse(x + 8, y + 15, 7, 4, "F");
};

const drawProjectsIcon = (doc, x, y) => {
  doc.setFillColor(15, 47, 87);
  doc.roundedRect(x + 1, y + 1, 14, 16, 2, 2, "F");
  doc.setFillColor(240, 246, 253);
  doc.rect(x + 4, y + 5, 8, 1.5, "F");
  doc.rect(x + 4, y + 8, 8, 1.5, "F");
  doc.rect(x + 4, y + 11, 5, 1.5, "F");
};

const drawFooter = (doc, pageNum, totalPages, workDate) => {
  const footerY = 548;
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(1);
  doc.line(36, footerY, 806, footerY);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(15, 47, 87);
  doc.text("SAHOO CONSTRUCTION & SOLAR", 36, footerY + 16);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text("Clean Energy  •  Stronger Homes  •  Brighter Future", 36, footerY + 28);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text(
    `Daily Worksheet Record — Page ${pageNum} of ${totalPages}`,
    421,
    footerY + 16,
    { align: "center" }
  );

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text("Generated securely via SCS Connect Platform", 421, footerY + 28, { align: "center" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(15, 47, 87);
  doc.text("Verified Work & Geo Inspection", 806, footerY + 16, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`Work Date: ${workDate}`, 806, footerY + 28, { align: "right" });

  doc.setFillColor(0, 102, 179);
  doc.rect(0, 591, 842, 4.3, "F");
};

// ─── PDF GENERATOR ───────────────────────────────────────────────────────────

const downloadWorkRegisterPdf = async (row) => {
  const submittedBy = personName(row.user);
  const workDate = formatDate(row.workDate);
  const supervisors = uniqueSupervisorNames(row.projects);
  const incharges = uniqueInchargeNames(row.projects);
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });

  const logoImg =
    scsLogoBase64 ||
    (await fetchImageDataUrl("/logo.png").then(
      (res) => res || fetchImageDataUrl("/solar360-logo-clean.png")
    ));

  // ── HEADER ──
  if (logoImg) {
    try {
      doc.addImage(logoImg, "PNG", 30, 8, 120, 80);
    } catch (e) {
      console.warn("Failed to render logo in PDF:", e);
    }
  }

  doc.setDrawColor(210, 225, 240);
  doc.setLineWidth(1.2);
  doc.line(156, 18, 156, 88);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(15, 47, 87);
  doc.text("Daily Worksheet", 170, 48);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text("B U I L D I N G   A   B R I G H T E R   T O M O R R O W", 170, 66);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(10, 56, 113);
  doc.text("CLEAN ENERGY", 695, 36);
  doc.text("STRONGER HOMES", 695, 48);
  doc.text("BRIGHTER FUTURE", 695, 60);

  doc.setFillColor(0, 102, 179);
  doc.roundedRect(695, 68, 36, 3, 1.5, 1.5, "F");

  // ── METADATA SUMMARY BAR ──
  const cardY = 96;
  const cardH = 50;
  doc.setFillColor(240, 246, 253);
  doc.setDrawColor(215, 230, 247);
  doc.setLineWidth(1);
  doc.roundedRect(36, cardY, 770, cardH, 6, 6, "FD");

  // Segment 1: Date
  drawCalendarIcon(doc, 50, cardY + 15);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text("Date", 74, cardY + 20);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(15, 47, 87);
  doc.text(workDate, 74, cardY + 36);

  doc.setDrawColor(215, 230, 247);
  doc.line(180, cardY + 8, 180, cardY + 42);

  // Segment 2: Submitted By (Who submitted)
  drawUserIcon(doc, 196, cardY + 15);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text("Submitted By", 218, cardY + 20);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(15, 47, 87);
  doc.text(doc.splitTextToSize(submittedBy, 130)[0] || "-", 218, cardY + 36);

  doc.line(360, cardY + 8, 360, cardY + 42);

  // Segment 3: Supervisor
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text("Supervisor", 376, cardY + 20);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(15, 47, 87);
  doc.text(doc.splitTextToSize(supervisors, 150)[0] || "-", 376, cardY + 36);

  doc.line(540, cardY + 8, 540, cardY + 42);

  // Segment 4: Incharges
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text("Incharge(s)", 556, cardY + 20);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(15, 47, 87);
  doc.text(doc.splitTextToSize(incharges, 140)[0] || "-", 556, cardY + 36);

  doc.line(710, cardY + 8, 710, cardY + 42);

  // Segment 5: Projects
  drawProjectsIcon(doc, 722, cardY + 15);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text("Projects", 744, cardY + 20);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(15, 47, 87);
  doc.text(String(row.projects?.length || 0), 744, cardY + 36);

  // ── PROJECTS TABLE (Team Members removed -> Incharge(s) added) ──
  autoTable(doc, {
    startY: 156,
    margin: { left: 36, right: 36 },
    head: [
      [
        "#",
        "Time",
        "Project Type",
        "Consumer",
        "A/C No.",
        "Capacity",
        "Install Day",
        "Supervisor",
        "Incharge(s)",
        "Location",
        "Report",
      ],
    ],
    body: projectRowsForPdf(row.projects, row),
    styles: {
      fontSize: 7.5,
      cellPadding: { top: 5, bottom: 5, left: 5, right: 5 },
      overflow: "linebreak",
    },
    headStyles: {
      fillColor: [0, 71, 146],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8,
      cellPadding: { top: 6, bottom: 6, left: 5, right: 5 },
    },
    bodyStyles: {
      textColor: [30, 41, 59],
      lineColor: [226, 232, 240],
      lineWidth: 0.5,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 253],
    },
    columnStyles: {
      0: { cellWidth: 20, halign: "center" },
      1: { cellWidth: 48, halign: "center" },
      2: { cellWidth: 70 },
      3: { cellWidth: 78 },
      4: { cellWidth: 62 },
      5: { cellWidth: 48 },
      6: { cellWidth: 50 },
      7: { cellWidth: 80 },
      8: { cellWidth: 96 },
      9: { cellWidth: 100 },
      10: { cellWidth: 118 },
    },
  });

  // ── COLLECT GEO-TAGGED PHOTOS ──
  const geoPhotos = [];
  (row.projects || []).forEach((proj, pIdx) => {
    (proj.photos || []).forEach((photo, phIdx) => {
      if (photo?.url) {
        geoPhotos.push({
          url: photo.url,
          latitude: photo.latitude || proj.gpsLocation?.latitude,
          longitude: photo.longitude || proj.gpsLocation?.longitude,
          accuracy: photo.accuracy || proj.gpsLocation?.accuracy,
          address: photo.address || proj.address || proj.siteLocation,
          capturedAt: photo.capturedAt || proj.createdAt,
          consumerName: proj.consumerName || `Project #${pIdx + 1}`,
          consumerAccountNo: proj.consumerAccountNo,
          projectType: proj.projectType,
          supervisor: personName(proj.supervisor),
          incharge: inchargeNames(proj),
        });
      }
    });
  });

  // ── PHOTO ANNEXURE PAGES ──
  if (geoPhotos.length > 0) {
    const photosPerPage = 2;
    for (let i = 0; i < geoPhotos.length; i += photosPerPage) {
      doc.addPage("a4", "landscape");

      // Page Title
      doc.setFont("helvetica", "bold");
      doc.setFontSize(15);
      doc.setTextColor(15, 47, 87);
      doc.text("Site Geo-Tagged Inspection Photos", 36, 42);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text(
        `Verified field photographs with GPS geolocation, timestamp, and assigned personnel • Work Date: ${workDate}`,
        36,
        56
      );

      doc.setDrawColor(210, 225, 240);
      doc.line(36, 64, 806, 64);

      const pageItems = geoPhotos.slice(i, i + photosPerPage);
      for (let j = 0; j < pageItems.length; j++) {
        const item = pageItems[j];
        const cardX = 36 + j * 390;
        const topY = 78;
        const boxW = 376;
        const boxH = 445;

        // Container Card
        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(cardX, topY, boxW, boxH, 6, 6, "FD");

        // Header band inside card
        doc.setFillColor(241, 245, 249);
        doc.roundedRect(cardX, topY, boxW, 26, 6, 6, "F");
        doc.rect(cardX, topY + 15, boxW, 11, "F");

        doc.setFont("helvetica", "bold");
        doc.setFontSize(8.5);
        doc.setTextColor(15, 47, 87);
        doc.text(
          `Photo #${i + j + 1} — ${item.consumerName} (${item.projectType || "Site"})`,
          cardX + 12,
          topY + 17
        );

        // Fetch & embed image
        const imgData = await fetchImageDataUrl(item.url);
        if (imgData) {
          try {
            doc.addImage(imgData, "JPEG", cardX + 14, topY + 34, boxW - 28, 230);
          } catch (imgErr) {
            console.warn("Failed embedding photo in PDF:", imgErr);
          }
        } else {
          doc.setFillColor(226, 232, 240);
          doc.roundedRect(cardX + 14, topY + 34, boxW - 28, 230, 4, 4, "F");
          doc.setFont("helvetica", "normal");
          doc.setFontSize(9);
          doc.setTextColor(148, 163, 184);
          doc.text("Site Photo Preview", cardX + boxW / 2, topY + 145, { align: "center" });
        }

        // Metadata box under photo
        const metaY = topY + 272;
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(cardX + 14, metaY, boxW - 28, 158, 4, 4, "FD");

        const line = (lbl, val, yOff, isBold = false) => {
          doc.setFont("helvetica", "bold");
          doc.setFontSize(7.5);
          doc.setTextColor(100, 116, 139);
          doc.text(lbl, cardX + 24, metaY + yOff);

          doc.setFont("helvetica", isBold ? "bold" : "normal");
          doc.setFontSize(7.5);
          doc.setTextColor(isBold ? 15 : 51, isBold ? 47 : 65, isBold ? 87 : 85);
          const safeVal = doc.splitTextToSize(String(val || "-"), boxW - 130)[0];
          doc.text(safeVal || "-", cardX + 112, metaY + yOff);
        };

        const gpsCoord =
          item.latitude && item.longitude
            ? `${Number(item.latitude).toFixed(5)}° N, ${Number(item.longitude).toFixed(5)}° E`
            : "Coordinates not logged";

        line("Consumer Name:", item.consumerName, 18, true);
        line("Consumer A/C:", item.consumerAccountNo || "N/A", 36);
        line("Supervisor:", item.supervisor, 54);
        line("Incharge(s):", item.incharge, 72, true);
        line("GPS Location:", `📍 ${gpsCoord}`, 90);
        line("Address:", item.address || "Field Site", 108);
        line(
          "Captured At:",
          `${formatDate(item.capturedAt)} at ${formatTime(item.capturedAt)}`,
          126
        );
        line("Site Status:", "Geo-Tagged & Verified", 144, true);
      }
    }
  }

  // Draw footers across all pages
  const totalPages = doc.internal.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    drawFooter(doc, p, totalPages, workDate);
  }

  const safeSubmitter =
    submittedBy.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "worksheet";
  doc.save(`daily-worksheet-${safeSubmitter}-${workDate.replace(/\//g, "-")}.pdf`);
};

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────

export default function WorkRegister() {
  const { fetchAPI } = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [roleTab, setRoleTab] = useState("ALL"); // "ALL" | "SUPERVISOR" | "INCHARGE"
  const [selectedSupervisor, setSelectedSupervisor] = useState("ALL");
  const [selectedIncharge, setSelectedIncharge] = useState("ALL");
  const [selectedProjectType, setSelectedProjectType] = useState("ALL");
  const [selectedDate, setSelectedDate] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [expandedRows, setExpandedRows] = useState({});
  const [previewPhoto, setPreviewPhoto] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetchAPI("/installer-worksheets/work-register");
      setRows(response?.result || []);
    } catch (err) {
      setError(err.message || "Unable to load daily worksheets");
    } finally {
      setLoading(false);
    }
  }, [fetchAPI]);

  useEffect(() => {
    load();
  }, [load]);

  const toggleRow = (id) => {
    setExpandedRows((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Tab counts
  const tabCounts = useMemo(() => {
    let inchargeCount = 0;
    let supervisorCount = 0;
    rows.forEach((r) => {
      if (isSupervisorSubmitter(r.user)) supervisorCount += 1;
      else inchargeCount += 1;
    });
    return {
      all: rows.length,
      supervisor: supervisorCount,
      incharge: inchargeCount,
    };
  }, [rows]);

  // Unique options for filters
  const supervisorFilterOptions = useMemo(() => {
    const set = new Set();
    rows.forEach((r) => {
      (r.projects || []).forEach((p) => {
        const name = personName(p.supervisor);
        if (name && name !== "-") set.add(name);
      });
      if (isSupervisorSubmitter(r.user)) {
        const name = personName(r.user);
        if (name && name !== "-") set.add(name);
      }
    });
    return Array.from(set).sort();
  }, [rows]);

  const inchargeFilterOptions = useMemo(() => {
    const set = new Set();
    rows.forEach((r) => {
      (r.projects || []).forEach((p) => {
        if (Array.isArray(p.incharges)) {
          p.incharges.forEach((inc) => {
            const name = personName(inc);
            if (name && name !== "-") set.add(name);
          });
        }
        if (p.incharge) {
          const name = personName(p.incharge);
          if (name && name !== "-") set.add(name);
        }
      });
      if (!isSupervisorSubmitter(r.user)) {
        const name = personName(r.user);
        if (name && name !== "-") set.add(name);
      }
    });
    return Array.from(set).sort();
  }, [rows]);

  const projectTypeFilterOptions = useMemo(() => {
    const set = new Set();
    rows.forEach((r) => {
      (r.projects || []).forEach((p) => {
        if (p.projectType) set.add(p.projectType);
      });
    });
    return Array.from(set).sort();
  }, [rows]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (selectedSupervisor !== "ALL") count++;
    if (selectedIncharge !== "ALL") count++;
    if (selectedProjectType !== "ALL") count++;
    if (selectedDate) count++;
    return count;
  }, [selectedSupervisor, selectedIncharge, selectedProjectType, selectedDate]);

  const clearAllFilters = () => {
    setSelectedSupervisor("ALL");
    setSelectedIncharge("ALL");
    setSelectedProjectType("ALL");
    setSelectedDate("");
    setSearchTerm("");
  };

  // Metrics
  const stats = useMemo(() => {
    let totalProjects = 0;
    let totalPhotos = 0;
    rows.forEach((r) => {
      totalProjects += r.projects?.length || 0;
      (r.projects || []).forEach((p) => {
        totalPhotos += p.photos?.length || 0;
      });
    });
    return {
      worksheets: rows.length,
      projects: totalProjects,
      photos: totalPhotos,
    };
  }, [rows]);

  // Filtered rows
  const filteredRows = useMemo(() => {
    let list = rows;

    // 1. Role tab filter
    if (roleTab === "SUPERVISOR") {
      list = list.filter((r) => isSupervisorSubmitter(r.user));
    } else if (roleTab === "INCHARGE") {
      list = list.filter((r) => !isSupervisorSubmitter(r.user));
    }

    // 2. Supervisor dropdown
    if (selectedSupervisor !== "ALL") {
      list = list.filter((r) => {
        const sup = uniqueSupervisorNames(r.projects);
        const subName = personName(r.user);
        return sup === selectedSupervisor || subName === selectedSupervisor;
      });
    }

    // 3. Incharge dropdown
    if (selectedIncharge !== "ALL") {
      list = list.filter((r) => {
        const inc = uniqueInchargeNames(r.projects);
        const subName = personName(r.user);
        return inc.includes(selectedIncharge) || subName === selectedIncharge;
      });
    }

    // 4. Project Type dropdown
    if (selectedProjectType !== "ALL") {
      list = list.filter((r) =>
        (r.projects || []).some((p) => (p.projectType || "Others") === selectedProjectType)
      );
    }

    // 5. Single Date Filter (e.g. specific day)
    if (selectedDate) {
      list = list.filter((r) => {
        if (!r.workDate) return false;
        const d = new Date(r.workDate);
        if (Number.isNaN(d.getTime())) return false;
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}` === selectedDate;
      });
    }

    // 6. Search term query
    if (!searchTerm.trim()) return list;
    const q = searchTerm.toLowerCase();
    return list.filter((r) => {
      const submittedBy = personName(r.user).toLowerCase();
      const sup = uniqueSupervisorNames(r.projects).toLowerCase();
      const inc = uniqueInchargeNames(r.projects).toLowerCase();
      const matchProject = (r.projects || []).some(
        (p) =>
          String(p.consumerName || "").toLowerCase().includes(q) ||
          String(p.consumerAccountNo || "").toLowerCase().includes(q) ||
          String(p.address || "").toLowerCase().includes(q) ||
          String(p.projectType || "").toLowerCase().includes(q)
      );
      return (
        submittedBy.includes(q) ||
        sup.includes(q) ||
        inc.includes(q) ||
        matchProject ||
        formatDate(r.workDate).includes(q)
      );
    });
  }, [
    rows,
    roleTab,
    selectedSupervisor,
    selectedIncharge,
    selectedProjectType,
    selectedDate,
    searchTerm,
  ]);

  return (
    <Box sx={{ p: { xs: 2, md: 3.5 }, bgcolor: "#f8fafc", minHeight: "100vh" }}>
      {/* ─── PAGE HEADER ─── */}
      <Box sx={{ mb: 3 }}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          justifyContent="space-between"
          alignItems={{ xs: "flex-start", sm: "center" }}
          spacing={2}
        >
          <Box>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Avatar
                sx={{
                  bgcolor: "#004792",
                  width: 44,
                  height: 44,
                  boxShadow: "0 4px 12px rgba(0, 71, 146, 0.25)",
                }}
              >
                <SolarPowerRounded sx={{ color: "#fff", fontSize: 26 }} />
              </Avatar>
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 800, color: "#0f2f57", letterSpacing: -0.5 }}>
                  Daily Worksheet & Site Verification
                </Typography>
                <Typography variant="body2" sx={{ color: "#64748b" }}>
                  Daily field records, site geo-tagged photographs, supervisors & incharges
                </Typography>
              </Box>
            </Stack>
          </Box>
          <Stack direction="row" spacing={1}>
            <Button
              variant="outlined"
              size="small"
              startIcon={<RefreshRounded />}
              onClick={load}
              sx={{
                borderRadius: 2,
                textTransform: "none",
                fontWeight: 600,
                borderColor: "#cbd5e1",
                color: "#334155",
                bgcolor: "#fff",
                "&:hover": { borderColor: "#94a3b8", bgcolor: "#f1f5f9" },
              }}
            >
              Refresh
            </Button>
          </Stack>
        </Stack>
      </Box>

      {/* ─── METRIC CARDS ─── */}
      <Grid container spacing={2.5} sx={{ mb: 3.5 }}>
        <Grid item xs={12} sm={4}>
          <Card
            elevation={0}
            sx={{
              p: 2.2,
              borderRadius: 3,
              border: "1px solid #e2e8f0",
              bgcolor: "#ffffff",
              boxShadow: "0 2px 8px rgba(15, 23, 42, 0.04)",
            }}
          >
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Box>
                <Typography variant="caption" sx={{ color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>
                  Total Worksheets
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 800, color: "#0f2f57", mt: 0.5 }}>
                  {stats.worksheets}
                </Typography>
              </Box>
              <Avatar sx={{ bgcolor: "#eff6ff", color: "#004792", width: 48, height: 48 }}>
                <CalendarTodayRounded />
              </Avatar>
            </Stack>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card
            elevation={0}
            sx={{
              p: 2.2,
              borderRadius: 3,
              border: "1px solid #e2e8f0",
              bgcolor: "#ffffff",
              boxShadow: "0 2px 8px rgba(15, 23, 42, 0.04)",
            }}
          >
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Box>
                <Typography variant="caption" sx={{ color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>
                  Projects Completed
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 800, color: "#0284c7", mt: 0.5 }}>
                  {stats.projects}
                </Typography>
              </Box>
              <Avatar sx={{ bgcolor: "#f0f9ff", color: "#0284c7", width: 48, height: 48 }}>
                <SpeedRounded />
              </Avatar>
            </Stack>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card
            elevation={0}
            sx={{
              p: 2.2,
              borderRadius: 3,
              border: "1px solid #e2e8f0",
              bgcolor: "#ffffff",
              boxShadow: "0 2px 8px rgba(15, 23, 42, 0.04)",
            }}
          >
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Box>
                <Typography variant="caption" sx={{ color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>
                  Geo-Tagged Photos
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 800, color: "#059669", mt: 0.5 }}>
                  {stats.photos}
                </Typography>
              </Box>
              <Avatar sx={{ bgcolor: "#ecfdf5", color: "#059669", width: 48, height: 48 }}>
                <ImageRounded />
              </Avatar>
            </Stack>
          </Card>
        </Grid>
      </Grid>

      {/* ─── ROLE TABS & SEARCH BAR ─── */}
      <Card
        elevation={0}
        sx={{
          p: 2,
          mb: 3,
          borderRadius: 3,
          border: "1px solid #e2e8f0",
          bgcolor: "#ffffff",
          boxShadow: "0 2px 8px rgba(15, 23, 42, 0.04)",
        }}
      >
        <Stack spacing={2}>
          {/* Segmented Role Filter Tabs */}
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.2} alignItems={{ xs: "stretch", sm: "center" }}>
            <Button
              variant={roleTab === "ALL" ? "contained" : "outlined"}
              size="small"
              onClick={() => setRoleTab("ALL")}
              sx={{
                borderRadius: 2.5,
                textTransform: "none",
                fontWeight: 700,
                px: 2.2,
                py: 0.9,
                bgcolor: roleTab === "ALL" ? "#0f2f57" : "#f8fafc",
                color: roleTab === "ALL" ? "#ffffff" : "#475569",
                borderColor: roleTab === "ALL" ? "#0f2f57" : "#e2e8f0",
                boxShadow: roleTab === "ALL" ? "0 4px 12px rgba(15, 47, 87, 0.25)" : "none",
                "&:hover": {
                  bgcolor: roleTab === "ALL" ? "#0a1f3a" : "#f1f5f9",
                  borderColor: roleTab === "ALL" ? "#0a1f3a" : "#cbd5e1",
                },
              }}
            >
              All Worksheets ({tabCounts.all})
            </Button>

            <Button
              variant={roleTab === "SUPERVISOR" ? "contained" : "outlined"}
              size="small"
              startIcon={<ShieldRounded sx={{ fontSize: "17px !important" }} />}
              onClick={() => setRoleTab("SUPERVISOR")}
              sx={{
                borderRadius: 2.5,
                textTransform: "none",
                fontWeight: 700,
                px: 2.2,
                py: 0.9,
                bgcolor: roleTab === "SUPERVISOR" ? "#ca8a04" : "#fefce8",
                color: roleTab === "SUPERVISOR" ? "#ffffff" : "#854d0e",
                borderColor: roleTab === "SUPERVISOR" ? "#ca8a04" : "#fef08a",
                boxShadow: roleTab === "SUPERVISOR" ? "0 4px 12px rgba(202, 138, 4, 0.25)" : "none",
                "&:hover": {
                  bgcolor: roleTab === "SUPERVISOR" ? "#a16207" : "#fef9c3",
                  borderColor: roleTab === "SUPERVISOR" ? "#a16207" : "#fde047",
                },
              }}
            >
              Supervisor Worksheets ({tabCounts.supervisor})
            </Button>

            <Button
              variant={roleTab === "INCHARGE" ? "contained" : "outlined"}
              size="small"
              startIcon={<PersonRounded sx={{ fontSize: "17px !important" }} />}
              onClick={() => setRoleTab("INCHARGE")}
              sx={{
                borderRadius: 2.5,
                textTransform: "none",
                fontWeight: 700,
                px: 2.2,
                py: 0.9,
                bgcolor: roleTab === "INCHARGE" ? "#16a34a" : "#f0fdf4",
                color: roleTab === "INCHARGE" ? "#ffffff" : "#166534",
                borderColor: roleTab === "INCHARGE" ? "#16a34a" : "#bbf7d0",
                boxShadow: roleTab === "INCHARGE" ? "0 4px 12px rgba(22, 163, 74, 0.25)" : "none",
                "&:hover": {
                  bgcolor: roleTab === "INCHARGE" ? "#15803d" : "#dcfce7",
                  borderColor: roleTab === "INCHARGE" ? "#15803d" : "#86efac",
                },
              }}
            >
              Incharge Worksheets ({tabCounts.incharge})
            </Button>
          </Stack>

          {/* Search Input and Filter Action Row */}
          <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} alignItems="center">
            <TextField
              fullWidth
              size="small"
              placeholder={
                roleTab === "SUPERVISOR"
                  ? "Search Supervisor worksheets by supervisor name, consumer, A/C No, or location..."
                  : roleTab === "INCHARGE"
                  ? "Search Incharge worksheets by incharge name, consumer, A/C No, or location..."
                  : "Search by Employee, Supervisor, Incharge, Consumer, A/C No, or Location..."
              }
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchRounded sx={{ color: "#94a3b8" }} />
                  </InputAdornment>
                ),
                sx: { borderRadius: 2, bgcolor: "#f8fafc" },
              }}
            />

            <Button
              variant={showFilters || activeFilterCount > 0 ? "contained" : "outlined"}
              size="small"
              startIcon={<FilterListRounded />}
              onClick={() => setShowFilters((prev) => !prev)}
              sx={{
                borderRadius: 2,
                textTransform: "none",
                fontWeight: 700,
                px: 2.2,
                py: 0.9,
                whiteSpace: "nowrap",
                minWidth: "fit-content",
                bgcolor: showFilters || activeFilterCount > 0 ? "#0f2f57" : "#fff",
                color: showFilters || activeFilterCount > 0 ? "#fff" : "#334155",
                borderColor: "#cbd5e1",
                "&:hover": {
                  bgcolor: showFilters || activeFilterCount > 0 ? "#0a1f3a" : "#f1f5f9",
                  borderColor: "#94a3b8",
                },
              }}
            >
              {activeFilterCount > 0 ? `Filters (${activeFilterCount})` : "Filters"}
            </Button>

            {activeFilterCount > 0 && (
              <Button
                variant="text"
                size="small"
                startIcon={<RestartAltRounded />}
                onClick={clearAllFilters}
                sx={{
                  borderRadius: 2,
                  textTransform: "none",
                  fontWeight: 600,
                  color: "#ef4444",
                  whiteSpace: "nowrap",
                  "&:hover": { bgcolor: "#fef2f2" },
                }}
              >
                Reset
              </Button>
            )}
          </Stack>

          {/* Collapsible Filter Panel */}
          <Collapse in={showFilters}>
            <Divider sx={{ my: 1.5, borderColor: "#e2e8f0" }} />
            <Grid container spacing={1.5} alignItems="center">
              {/* Supervisor Dropdown */}
              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel id="sup-filter-label" sx={{ fontSize: "0.85rem", color: "#64748b" }}>
                    Supervisor
                  </InputLabel>
                  <Select
                    labelId="sup-filter-label"
                    label="Supervisor"
                    value={selectedSupervisor}
                    onChange={(e) => setSelectedSupervisor(e.target.value)}
                    sx={{ borderRadius: 2, bgcolor: "#f8fafc", fontSize: "0.85rem" }}
                  >
                    <MenuItem value="ALL">All Supervisors</MenuItem>
                    {supervisorFilterOptions.map((name) => (
                      <MenuItem key={name} value={name}>
                        {name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              {/* Incharge Dropdown */}
              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel id="inc-filter-label" sx={{ fontSize: "0.85rem", color: "#64748b" }}>
                    Incharge
                  </InputLabel>
                  <Select
                    labelId="inc-filter-label"
                    label="Incharge"
                    value={selectedIncharge}
                    onChange={(e) => setSelectedIncharge(e.target.value)}
                    sx={{ borderRadius: 2, bgcolor: "#f8fafc", fontSize: "0.85rem" }}
                  >
                    <MenuItem value="ALL">All Incharges</MenuItem>
                    {inchargeFilterOptions.map((name) => (
                      <MenuItem key={name} value={name}>
                        {name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              {/* Project Type Dropdown */}
              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel id="proj-type-filter-label" sx={{ fontSize: "0.85rem", color: "#64748b" }}>
                    Project Type
                  </InputLabel>
                  <Select
                    labelId="proj-type-filter-label"
                    label="Project Type"
                    value={selectedProjectType}
                    onChange={(e) => setSelectedProjectType(e.target.value)}
                    sx={{ borderRadius: 2, bgcolor: "#f8fafc", fontSize: "0.85rem" }}
                  >
                    <MenuItem value="ALL">All Types</MenuItem>
                    {projectTypeFilterOptions.map((type) => (
                      <MenuItem key={type} value={type}>
                        {type}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              {/* Single Date Picker */}
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  fullWidth
                  size="small"
                  type="date"
                  label="Select Date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  sx={{ borderRadius: 2, bgcolor: "#f8fafc", "& input": { fontSize: "0.85rem" } }}
                />
              </Grid>
            </Grid>
          </Collapse>
        </Stack>
      </Card>

      {error && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
          {error}
        </Alert>
      )}

      {/* ─── WORKSHEETS LIST ─── */}
      {loading ? (
        <Box sx={{ p: 8, textAlign: "center" }}>
          <CircularProgress size={38} sx={{ color: "#004792" }} />
          <Typography sx={{ mt: 2, color: "#64748b", fontWeight: 500 }}>
            Loading daily worksheets...
          </Typography>
        </Box>
      ) : filteredRows.length === 0 ? (
        <Paper
          elevation={0}
          sx={{
            p: 6,
            textAlign: "center",
            borderRadius: 3,
            border: "1px dashed #cbd5e1",
            bgcolor: "#ffffff",
          }}
        >
          <SolarPowerRounded sx={{ fontSize: 50, color: "#94a3b8", mb: 1 }} />
          <Typography variant="h6" sx={{ fontWeight: 700, color: "#334155" }}>
            No worksheets found
          </Typography>
          <Typography variant="body2" sx={{ color: "#64748b", mt: 0.5 }}>
            {searchTerm
              ? "No worksheets match your current search query."
              : "No approved worksheets have been registered yet."}
          </Typography>
        </Paper>
      ) : (
        <Stack spacing={2.5}>
          {filteredRows.map((row) => {
            const isExpanded = !!expandedRows[row._id];
            const submittedBy = personName(row.user);
            const isSup = isSupervisorSubmitter(row.user);
            const submitterRoleLabel = isSup ? "Supervisor" : "Incharge";
            const workDate = formatDate(row.workDate);
            const supervisorNames = uniqueSupervisorNames(row.projects);
            const incharges = uniqueInchargeNames(row.projects);
            const projectCount = row.projects?.length || 0;

            const allPhotos = (row.projects || []).flatMap((p, pIdx) =>
              (p.photos || []).map((ph) => ({
                ...ph,
                projectName: p.consumerName || `Project #${pIdx + 1}`,
                consumerAccountNo: p.consumerAccountNo,
                projectType: p.projectType,
                supervisor: personName(p.supervisor),
                incharge: inchargeNames(p),
                address: ph.address || p.address || p.siteLocation,
                latitude: ph.latitude || p.gpsLocation?.latitude,
                longitude: ph.longitude || p.gpsLocation?.longitude,
                capturedAt: ph.capturedAt || p.createdAt,
              }))
            );

            return (
              <Card
                key={row._id}
                elevation={0}
                sx={{
                  borderRadius: 3,
                  border: "1px solid #e2e8f0",
                  bgcolor: "#ffffff",
                  overflow: "hidden",
                  transition: "box-shadow 0.2s ease",
                  "&:hover": {
                    boxShadow: "0 6px 20px rgba(15, 23, 42, 0.08)",
                  },
                }}
              >
                {/* ── CARD TOP BAR ── */}
                <Box
                  sx={{
                    p: { xs: 2, sm: 2.5 },
                    bgcolor: isExpanded ? "#f8fafc" : "#ffffff",
                    borderBottom: isExpanded ? "1px solid #e2e8f0" : "none",
                  }}
                >
                  <Grid container spacing={2} alignItems="center">
                    {/* Left: Date & Status */}
                    <Grid item xs={12} sm={3}>
                      <Stack direction="row" spacing={1.5} alignItems="center">
                        <Avatar
                          sx={{
                            bgcolor: "#eff6ff",
                            color: "#004792",
                            width: 42,
                            height: 42,
                            borderRadius: 2.5,
                          }}
                        >
                          <CalendarTodayRounded sx={{ fontSize: 20 }} />
                        </Avatar>
                        <Box>
                          <Typography variant="subtitle1" sx={{ fontWeight: 800, color: "#0f2f57", lineHeight: 1.2 }}>
                            {workDate}
                          </Typography>
                          <Stack direction="row" spacing={0.8} alignItems="center" sx={{ mt: 0.4, flexWrap: "wrap", gap: 0.5 }}>
                            <Chip
                              size="small"
                              label={`${projectCount} ${projectCount === 1 ? "Project" : "Projects"}`}
                              sx={{
                                height: 22,
                                fontSize: "0.72rem",
                                fontWeight: 700,
                                bgcolor: "#f1f5f9",
                                color: "#475569",
                              }}
                            />
                            {Boolean(row.hasMissedProject || row.missedForDate || row.projects?.some(p => p.isMissedProject || p.missedForDate)) && (
                              <Chip
                                size="small"
                                label={`Missed for: ${row.missedForDate ? formatDate(row.missedForDate) : workDate} • Created: ${row.createdAt ? formatDate(row.createdAt) : workDate}`}
                                sx={{
                                  height: 22,
                                  fontSize: "0.70rem",
                                  fontWeight: 800,
                                  bgcolor: "#fef3c7",
                                  color: "#b45309",
                                  border: "1px solid #fcd34d",
                                }}
                              />
                            )}
                          </Stack>
                        </Box>
                      </Stack>
                    </Grid>

                    {/* Middle: Personnel Details (Who is Who) */}
                    <Grid item xs={12} sm={6}>
                      <Grid container spacing={1.5}>
                        {/* Submitted By */}
                        <Grid item xs={12} sm={4}>
                          <Box
                            sx={{
                              bgcolor: isSup ? "#fefce8" : "#f0fdf4",
                              p: 1,
                              borderRadius: 2,
                              border: `1px solid ${isSup ? "#fef08a" : "#bbf7d0"}`,
                            }}
                          >
                            <Stack direction="row" spacing={0.8} alignItems="center">
                              {isSup ? (
                                <ShieldRounded sx={{ fontSize: 16, color: "#ca8a04" }} />
                              ) : (
                                <PersonRounded sx={{ fontSize: 16, color: "#16a34a" }} />
                              )}
                              <Typography
                                variant="caption"
                                sx={{ color: isSup ? "#854d0e" : "#166534", fontWeight: 700 }}
                              >
                                Submitted By ({submitterRoleLabel})
                              </Typography>
                            </Stack>
                            <Typography
                              variant="body2"
                              sx={{
                                fontWeight: 700,
                                color: "#0f2f57",
                                mt: 0.2,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {submittedBy}
                            </Typography>
                          </Box>
                        </Grid>

                        {/* Supervisor */}
                        <Grid item xs={12} sm={4}>
                          <Box sx={{ bgcolor: "#fefce8", p: 1, borderRadius: 2, border: "1px solid #fef08a" }}>
                            <Stack direction="row" spacing={0.8} alignItems="center">
                              <ShieldRounded sx={{ fontSize: 16, color: "#ca8a04" }} />
                              <Typography variant="caption" sx={{ color: "#854d0e", fontWeight: 700 }}>
                                Supervisor
                              </Typography>
                            </Stack>
                            <Typography
                              variant="body2"
                              sx={{ fontWeight: 700, color: "#0f2f57", mt: 0.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                            >
                              {supervisorNames}
                            </Typography>
                          </Box>
                        </Grid>

                        {/* Incharges */}
                        <Grid item xs={12} sm={4}>
                          <Box sx={{ bgcolor: "#eff6ff", p: 1, borderRadius: 2, border: "1px solid #bfdbfe" }}>
                            <Stack direction="row" spacing={0.8} alignItems="center">
                              <PersonRounded sx={{ fontSize: 16, color: "#2563eb" }} />
                              <Typography variant="caption" sx={{ color: "#1e40af", fontWeight: 700 }}>
                                Incharge(s)
                              </Typography>
                            </Stack>
                            <Typography
                              variant="body2"
                              sx={{ fontWeight: 700, color: "#0f2f57", mt: 0.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                            >
                              {incharges}
                            </Typography>
                          </Box>
                        </Grid>
                      </Grid>
                    </Grid>

                    {/* Right: Actions */}
                    <Grid item xs={12} sm={3}>
                      <Stack direction="row" spacing={1} justifyContent={{ xs: "flex-start", sm: "flex-end" }} alignItems="center">
                        <Button
                          variant="contained"
                          size="small"
                          startIcon={<PictureAsPdfRounded />}
                          onClick={() => downloadWorkRegisterPdf(row)}
                          sx={{
                            borderRadius: 2,
                            textTransform: "none",
                            fontWeight: 700,
                            bgcolor: "#004792",
                            boxShadow: "0 2px 8px rgba(0, 71, 146, 0.3)",
                            "&:hover": { bgcolor: "#003366" },
                          }}
                        >
                          Download PDF
                        </Button>
                        <IconButton
                          onClick={() => toggleRow(row._id)}
                          sx={{
                            bgcolor: "#f1f5f9",
                            color: "#334155",
                            "&:hover": { bgcolor: "#e2e8f0" },
                          }}
                        >
                          {isExpanded ? <ExpandLessRounded /> : <ExpandMoreRounded />}
                        </IconButton>
                      </Stack>
                    </Grid>
                  </Grid>
                </Box>

                {/* ── EXPANDED CONTENT ── */}
                <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                  <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                    {/* SECTION 1: PROJECTS TABLE */}
                    <Box sx={{ mb: 3.5 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "#0f2f57", mb: 1.5 }}>
                        Projects Execution Breakdown ({projectCount})
                      </Typography>
                      <TableContainer component={Paper} elevation={0} sx={{ border: "1px solid #e2e8f0", borderRadius: 2 }}>
                        <Table size="small">
                          <TableHead sx={{ bgcolor: "#004792" }}>
                            <TableRow>
                              <TableCell sx={{ color: "#fff", fontWeight: 700, fontSize: "0.75rem" }}>#</TableCell>
                              <TableCell sx={{ color: "#fff", fontWeight: 700, fontSize: "0.75rem" }}>Time</TableCell>
                              <TableCell sx={{ color: "#fff", fontWeight: 700, fontSize: "0.75rem" }}>Project Type</TableCell>
                              <TableCell sx={{ color: "#fff", fontWeight: 700, fontSize: "0.75rem" }}>Consumer Name</TableCell>
                              <TableCell sx={{ color: "#fff", fontWeight: 700, fontSize: "0.75rem" }}>A/C No.</TableCell>
                              <TableCell sx={{ color: "#fff", fontWeight: 700, fontSize: "0.75rem" }}>Capacity</TableCell>
                              <TableCell sx={{ color: "#fff", fontWeight: 700, fontSize: "0.75rem" }}>Install Day</TableCell>
                              <TableCell sx={{ color: "#fff", fontWeight: 700, fontSize: "0.75rem" }}>Supervisor</TableCell>
                              <TableCell sx={{ color: "#fff", fontWeight: 700, fontSize: "0.75rem" }}>Incharge(s)</TableCell>
                              <TableCell sx={{ color: "#fff", fontWeight: 700, fontSize: "0.75rem" }}>Location</TableCell>
                              <TableCell sx={{ color: "#fff", fontWeight: 700, fontSize: "0.75rem" }}>Report</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {(row.projects || []).map((project, idx) => (
                              <TableRow key={project._id || idx} hover sx={{ "&:nth-of-type(even)": { bgcolor: "#f8fafc" } }}>
                                <TableCell sx={{ fontWeight: 700 }}>{idx + 1}</TableCell>
                                <TableCell sx={{ whiteSpace: "nowrap", fontSize: "0.8rem", color: "#64748b" }}>
                                  {getProjectTimestamp(project, row)}
                                </TableCell>
                                <TableCell>
                                  <Chip
                                    size="small"
                                    label={text(project.projectType)}
                                    sx={{
                                      fontSize: "0.72rem",
                                      fontWeight: 700,
                                      bgcolor: "#e0f2fe",
                                      color: "#0369a1",
                                    }}
                                  />
                                </TableCell>
                                <TableCell sx={{ fontWeight: 700, color: "#0f2f57" }}>
                                  {text(project.consumerName || project.siteLocation)}
                                </TableCell>
                                <TableCell sx={{ fontFamily: "monospace", fontSize: "0.8rem" }}>
                                  {text(project.consumerAccountNo)}
                                </TableCell>
                                <TableCell>{text(project.capacityKw ? `${project.capacityKw} KW` : "-")}</TableCell>
                                <TableCell>{text(project.installationDay ? `${project.installationDay} Days` : "-")}</TableCell>
                                <TableCell sx={{ fontWeight: 600, color: "#854d0e" }}>
                                  {personName(project.supervisor)}
                                </TableCell>
                                <TableCell sx={{ fontWeight: 700, color: "#1d4ed8" }}>
                                  {inchargeNames(project)}
                                </TableCell>
                                <TableCell sx={{ maxWidth: 180, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                  <Tooltip title={text(project.address || project.siteLocation || project.gpsLocation?.address)}>
                                    <span>{text(project.address || project.siteLocation || project.gpsLocation?.address)}</span>
                                  </Tooltip>
                                </TableCell>
                                <TableCell sx={{ maxWidth: 160, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                  <Tooltip title={text(project.report)}>
                                    <span>{text(project.report)}</span>
                                  </Tooltip>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </Box>

                    {/* SECTION 2: SITE GEO-TAGGED PHOTOS GALLERY */}
                    <Box>
                      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
                        <FmdGoodRounded sx={{ color: "#ef4444", fontSize: 20 }} />
                        <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "#0f2f57" }}>
                          Site Geo-Tagged Photographs ({allPhotos.length})
                        </Typography>
                      </Stack>

                      {allPhotos.length === 0 ? (
                        <Box
                          sx={{
                            p: 3,
                            textAlign: "center",
                            borderRadius: 2,
                            bgcolor: "#f8fafc",
                            border: "1px dashed #cbd5e1",
                          }}
                        >
                          <Typography variant="body2" sx={{ color: "#94a3b8" }}>
                            No geo-tagged site images uploaded for this worksheet.
                          </Typography>
                        </Box>
                      ) : (
                        <Grid container spacing={2}>
                          {allPhotos.map((photo, pIdx) => {
                            const fullUrl = resolvePhotoUrl(photo.url);
                            const lat = photo.latitude;
                            const lng = photo.longitude;
                            const hasCoords = lat && lng;
                            return (
                              <Grid item xs={12} sm={6} md={4} key={pIdx}>
                                <Card
                                  elevation={0}
                                  sx={{
                                    borderRadius: 2.5,
                                    border: "1px solid #e2e8f0",
                                    bgcolor: "#ffffff",
                                    overflow: "hidden",
                                    transition: "transform 0.15s ease, box-shadow 0.15s ease",
                                    "&:hover": {
                                      transform: "translateY(-3px)",
                                      boxShadow: "0 8px 24px rgba(15, 23, 42, 0.1)",
                                    },
                                  }}
                                >
                                  {/* Photo display */}
                                  <Box
                                    sx={{
                                      position: "relative",
                                      height: 180,
                                      bgcolor: "#0f172a",
                                      cursor: "pointer",
                                    }}
                                    onClick={() => setPreviewPhoto(photo)}
                                  >
                                    <Box
                                      component="img"
                                      src={fullUrl}
                                      alt={photo.projectName}
                                      sx={{
                                        width: "100%",
                                        height: "100%",
                                        objectFit: "cover",
                                      }}
                                      onError={(e) => {
                                        e.target.style.display = "none";
                                      }}
                                    />
                                    {/* Overlay badge */}
                                    <Chip
                                      size="small"
                                      icon={<FmdGoodRounded sx={{ fontSize: "14px !important", color: "#fff" }} />}
                                      label={hasCoords ? `${Number(lat).toFixed(4)}°, ${Number(lng).toFixed(4)}°` : "Site Photo"}
                                      sx={{
                                        position: "absolute",
                                        bottom: 10,
                                        left: 10,
                                        bgcolor: "rgba(15, 23, 42, 0.75)",
                                        backdropFilter: "blur(4px)",
                                        color: "#ffffff",
                                        fontSize: "0.72rem",
                                        fontWeight: 700,
                                      }}
                                    />
                                  </Box>

                                  {/* Info under photo */}
                                  <Box sx={{ p: 1.8 }}>
                                    <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "#0f2f57", lineHeight: 1.2 }}>
                                      {photo.projectName}
                                    </Typography>
                                    <Typography variant="caption" sx={{ color: "#64748b", display: "block", mt: 0.4 }}>
                                      Incharge(s): <strong style={{ color: "#1d4ed8" }}>{photo.incharge}</strong>
                                    </Typography>
                                    {photo.address && (
                                      <Typography
                                        variant="caption"
                                        sx={{
                                          color: "#475569",
                                          display: "block",
                                          mt: 0.3,
                                          overflow: "hidden",
                                          textOverflow: "ellipsis",
                                          whiteSpace: "nowrap",
                                        }}
                                      >
                                        📍 {photo.address}
                                      </Typography>
                                    )}
                                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 1.2 }}>
                                      <Typography variant="caption" sx={{ color: "#94a3b8", fontSize: "0.7rem" }}>
                                        {formatDate(photo.capturedAt)} {formatTime(photo.capturedAt)}
                                      </Typography>
                                      <Button
                                        size="small"
                                        variant="text"
                                        startIcon={<OpenInNewRounded sx={{ fontSize: "14px !important" }} />}
                                        onClick={() => setPreviewPhoto(photo)}
                                        sx={{ fontSize: "0.75rem", p: 0.3, textTransform: "none", fontWeight: 700 }}
                                      >
                                        Inspect
                                      </Button>
                                    </Stack>
                                  </Box>
                                </Card>
                              </Grid>
                            );
                          })}
                        </Grid>
                      )}
                    </Box>
                  </CardContent>
                </Collapse>
              </Card>
            );
          })}
        </Stack>
      )}

      {/* ─── PHOTO PREVIEW DIALOG ─── */}
      <Dialog
        open={Boolean(previewPhoto)}
        onClose={() => setPreviewPhoto(null)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 3, overflow: "hidden" },
        }}
      >
        {previewPhoto && (
          <>
            <DialogTitle
              sx={{
                bgcolor: "#004792",
                color: "#ffffff",
                p: 2,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Stack direction="row" spacing={1} alignItems="center">
                <FmdGoodRounded sx={{ color: "#38bdf8" }} />
                <Typography variant="subtitle1" sx={{ fontWeight: 700, color: "#fff" }}>
                  Site Geo-Tagged Verification — {previewPhoto.projectName}
                </Typography>
              </Stack>
              <IconButton onClick={() => setPreviewPhoto(null)} sx={{ color: "#ffffff" }}>
                <CloseRounded />
              </IconButton>
            </DialogTitle>
            <DialogContent sx={{ p: 0, bgcolor: "#0f172a" }}>
              <Box
                component="img"
                src={resolvePhotoUrl(previewPhoto.url)}
                alt={previewPhoto.projectName}
                sx={{
                  width: "100%",
                  maxHeight: "550px",
                  objectFit: "contain",
                  display: "block",
                  bgcolor: "#0f172a",
                }}
              />
              <Box sx={{ p: 2.5, bgcolor: "#ffffff" }}>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" sx={{ color: "#64748b", fontWeight: 700 }}>
                      CONSUMER & PROJECT
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 800, color: "#0f2f57" }}>
                      {previewPhoto.projectName}
                    </Typography>
                    <Typography variant="body2" sx={{ color: "#475569" }}>
                      A/C No: {previewPhoto.consumerAccountNo || "N/A"} • Type: {previewPhoto.projectType || "General"}
                    </Typography>
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" sx={{ color: "#64748b", fontWeight: 700 }}>
                      ASSIGNED PERSONNEL (WHO IS WHO)
                    </Typography>
                    <Typography variant="body2" sx={{ color: "#0f2f57" }}>
                      <strong>Supervisor:</strong> {previewPhoto.supervisor}
                    </Typography>
                    <Typography variant="body2" sx={{ color: "#1d4ed8", fontWeight: 700 }}>
                      <strong>Incharge(s):</strong> {previewPhoto.incharge}
                    </Typography>
                  </Grid>

                  <Grid item xs={12}>
                    <Divider sx={{ my: 0.5 }} />
                  </Grid>

                  <Grid item xs={12} sm={8}>
                    <Typography variant="caption" sx={{ color: "#64748b", fontWeight: 700 }}>
                      GPS LOCATION & ADDRESS
                    </Typography>
                    <Typography variant="body2" sx={{ color: "#0f2f57", fontWeight: 600 }}>
                      📍{" "}
                      {previewPhoto.latitude && previewPhoto.longitude
                        ? `${Number(previewPhoto.latitude).toFixed(6)}° N, ${Number(previewPhoto.longitude).toFixed(6)}° E`
                        : "Coordinates unavailable"}
                    </Typography>
                    <Typography variant="body2" sx={{ color: "#64748b", mt: 0.3 }}>
                      {previewPhoto.address || "Field Site Location"}
                    </Typography>
                  </Grid>

                  <Grid item xs={12} sm={4} sx={{ display: "flex", alignItems: "center", justifyContent: "flex-end" }}>
                    {previewPhoto.latitude && previewPhoto.longitude && (
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<OpenInNewRounded />}
                        component="a"
                        href={`https://www.google.com/maps?q=${previewPhoto.latitude},${previewPhoto.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        sx={{
                          borderRadius: 2,
                          textTransform: "none",
                          fontWeight: 700,
                        }}
                      >
                        Open in Google Maps
                      </Button>
                    )}
                  </Grid>
                </Grid>
              </Box>
            </DialogContent>
          </>
        )}
      </Dialog>
    </Box>
  );
}