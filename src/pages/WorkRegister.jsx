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
  useTheme,
} from "@mui/material";
import {
  AccessTimeRounded,
  ArrowBackRounded,
  ArrowForwardRounded,
  BadgeRounded,
  CalendarTodayRounded,
  CheckCircleRounded,
  CloseRounded,
  DateRangeRounded,
  EngineeringRounded,
  ExpandLessRounded,
  ExpandMoreRounded,
  FilterListRounded,
  FmdGoodRounded,
  GroupRounded,
  ImageRounded,
  OpenInNewRounded,
  PersonRounded,
  PhoneRounded,
  PictureAsPdfRounded,
  RefreshRounded,
  RestartAltRounded,
  SearchRounded,
  ShieldRounded,
  SolarPowerRounded,
  SpeedRounded,
  SupervisorAccountRounded,
  WorkOutlineRounded,
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
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) {
      return trimmed;
    }
    const ddmmyyyy = trimmed.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
    if (ddmmyyyy) {
      const [, d, m, y] = ddmmyyyy;
      return `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${y}`;
    }
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return typeof value === "string" ? value : "-";
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const formatTime = (value) => {
  if (!value) return "-";
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (/^\d{1,2}:\d{2}(:\d{2})?(\s*[AaPp][Mm])?$/.test(trimmed)) {
      return trimmed;
    }
  }
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
  let clean = String(url).trim();
  if (clean.includes("solar-backend-6vaa.onrender.com")) {
    clean = clean.replace(/https?:\/\/solar-backend-6vaa\.onrender\.com/i, API_ORIGIN);
  }
  if (clean.startsWith("http://") || clean.startsWith("https://") || clean.startsWith("data:")) {
    return clean;
  }
  const cleanPath = clean.startsWith("/") ? clean : `/${clean}`;
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

const isAdminRole = (roleOrUser) => {
  const role = typeof roleOrUser === "string" ? roleOrUser : roleOrUser?.role;
  const r = String(role || "").trim().toUpperCase();
  return ["ADMIN", "ADMIN_PANEL", "HEAD_OFFICE", "SUPER_ADMIN"].includes(r);
};

const isManagerRole = (roleOrUser) => {
  const role = typeof roleOrUser === "string" ? roleOrUser : roleOrUser?.role;
  const r = String(role || "").trim().toUpperCase();
  return ["MANAGER", "PROJECT_HEAD"].includes(r);
};

const isSupervisorRole = (roleOrUser) => {
  const role = typeof roleOrUser === "string" ? roleOrUser : roleOrUser?.role;
  const r = String(role || "").trim().toUpperCase();
  return r === "SUPERVISOR";
};

const isInchargeRole = (roleOrUser) => {
  const role = typeof roleOrUser === "string" ? roleOrUser : roleOrUser?.role;
  const r = String(role || "").trim().toUpperCase();
  return ["INCHARGE", "TEAM", "INSTALLER", "ASM"].includes(r) || (!isSupervisorRole(roleOrUser) && !isManagerRole(roleOrUser) && !isAdminRole(roleOrUser) && r !== "");
};

const isSupervisorSubmitter = (user) => isSupervisorRole(user);
const isInchargeSubmitter = (user) => isInchargeRole(user);

const getWorksheetTimestamp = (row) => {
  const raw = row?.submittedAt || row?.createdAt || row?.updatedAt;
  if (!raw) return "-";
  return formatTime(raw);
};

const getWorksheetDateTime = (row) => {
  const dateStr = formatDate(row?.workDate || row?.createdAt);
  const timeStr = getWorksheetTimestamp(row);
  return { date: dateStr, time: timeStr, full: `${dateStr} at ${timeStr}` };
};

const getProjectTimestamp = (project, parentRow) => {
  const raw =
    project?.capturedAt ||
    project?.createdAt ||
    project?.timestamp ||
    project?.time ||
    project?.createdTime ||
    project?.photos?.[0]?.capturedAt ||
    project?.gpsLocation?.recordedAt ||
    parentRow?.submittedAt ||
    parentRow?.createdAt;
  if (!raw) return "-";
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

// ─── GROUP BY DATE HELPER ───────────────────────────────────────────────────

const groupWorksheetsByDate = (worksheets = []) => {
  const map = new Map();

  worksheets.forEach((w) => {
    const rawDate = w.workDate || w.createdAt;
    const formatted = formatDate(rawDate);
    const dateKey = formatted && formatted !== "-" ? formatted : "Unknown Date";

    if (!map.has(dateKey)) {
      map.set(dateKey, {
        _id: `group-${dateKey.replace(/[^a-zA-Z0-9]/g, "-")}`,
        dateKey,
        workDate: rawDate,
        formattedDate: dateKey,
        worksheets: [],
        projects: [],
        submitters: [],
        supervisors: new Set(),
        incharges: new Set(),
        hasMissedProject: false,
        timestamps: [],
        isDateGroup: true,
      });
    }

    const group = map.get(dateKey);
    group.worksheets.push(w);

    if (Boolean(w.hasMissedProject || w.missedForDate || w.projects?.some((p) => p.isMissedProject || p.missedForDate))) {
      group.hasMissedProject = true;
    }

    const subName = personName(w.user);
    const isSup = isSupervisorSubmitter(w.user);
    if (subName && subName !== "-" && !group.submitters.some((s) => s.name === subName)) {
      group.submitters.push({
        name: subName,
        role: isSup ? "Supervisor" : "Incharge",
        isSup,
      });
    }

    const timeStr = getWorksheetTimestamp(w);
    const rawTime = new Date(w.submittedAt || w.createdAt || rawDate).getTime();
    if (timeStr && timeStr !== "-") {
      group.timestamps.push({
        timeStr,
        rawTime: !Number.isNaN(rawTime) ? rawTime : 0,
      });
    }

    (w.projects || []).forEach((p) => {
      group.projects.push({
        ...p,
        parentWorksheet: w,
      });

      const sup = personName(p.supervisor);
      if (sup && sup !== "-") group.supervisors.add(sup);

      if (Array.isArray(p.incharges)) {
        p.incharges.forEach((inc) => {
          const incName = personName(inc);
          if (incName && incName !== "-") group.incharges.add(incName);
        });
      }
      if (p.incharge) {
        const incName = personName(p.incharge);
        if (incName && incName !== "-") group.incharges.add(incName);
      }
    });
  });

  const list = Array.from(map.values());

  list.sort((a, b) => {
    const parseDateToMs = (dStr) => {
      const match = String(dStr).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
      if (match) {
        return new Date(`${match[3]}-${match[2]}-${match[1]}`).getTime();
      }
      const t = new Date(dStr).getTime();
      return Number.isNaN(t) ? 0 : t;
    };
    return parseDateToMs(b.formattedDate) - parseDateToMs(a.formattedDate);
  });

  list.forEach((g) => {
    g.projects.sort((p1, p2) => {
      const t1 = new Date(p1.capturedAt || p1.createdAt || p1.parentWorksheet?.createdAt || g.workDate).getTime();
      const t2 = new Date(p2.capturedAt || p2.createdAt || p2.parentWorksheet?.createdAt || g.workDate).getTime();
      return (Number.isNaN(t2) ? 0 : t2) - (Number.isNaN(t1) ? 0 : t1);
    });

    g.supervisorNames = Array.from(g.supervisors).join(", ") || "-";
    g.inchargeNames = Array.from(g.incharges).join(", ") || "-";

    if (g.timestamps.length > 1) {
      g.timestamps.sort((t1, t2) => t1.rawTime - t2.rawTime);
      const earliest = g.timestamps[0].timeStr;
      const latest = g.timestamps[g.timestamps.length - 1].timeStr;
      g.submissionTime = earliest === latest ? earliest : `${earliest} – ${latest}`;
    } else if (g.timestamps.length === 1) {
      g.submissionTime = g.timestamps[0].timeStr;
    } else {
      g.submissionTime = "-";
    }

    if (g.submitters.length === 1) {
      g.submittedBy = g.submitters[0].name;
      g.submitterRoleLabel = g.submitters[0].role;
      g.isSup = g.submitters[0].isSup;
    } else if (g.submitters.length > 1) {
      g.submittedBy = g.submitters.map((s) => s.name).join(", ");
      g.submitterRoleLabel = `${g.submitters.length} Submitters`;
      g.isSup = g.submitters.some((s) => s.isSup);
    } else {
      g.submittedBy = "-";
      g.submitterRoleLabel = "Submitter";
      g.isSup = false;
    }

    g.user = g.worksheets[0]?.user || { name: g.submittedBy };
  });

  return list;
};

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────

export default function WorkRegister() {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const { fetchAPI } = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [roleTab, setRoleTab] = useState("INCHARGE"); // "INCHARGE" | "SUPERVISOR" | "MANAGER" | "ALL"
  const [selectedUser, setSelectedUser] = useState(null); // When user clicks an incharge / supervisor / manager
  const [userSearchTerm, setUserSearchTerm] = useState("");
  const [userSortBy, setUserSortBy] = useState("worksheets"); // "worksheets" | "projects" | "recent" | "name"
  const [selectedSupervisor, setSelectedSupervisor] = useState("ALL");
  const [selectedIncharge, setSelectedIncharge] = useState("ALL");
  const [selectedProjectType, setSelectedProjectType] = useState("ALL");
  const [selectedDate, setSelectedDate] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [expandedRows, setExpandedRows] = useState({});
  const [groupByDate, setGroupByDate] = useState(true); // Default: Group into 1 box per date
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

  // Group all distinct users with their full worksheet list for each role
  const roleUsers = useMemo(() => {
    const inchargeMap = new Map();
    const supervisorMap = new Map();
    const managerMap = new Map();

    const normalizeDisplayRole = (rawRole, defaultRole) => {
      const r = String(rawRole || "").trim().toUpperCase();
      if (!r || r === "ZSM" || r === "OPERATION_LEAD" || r === "OPERATIONLEAD") {
        return defaultRole;
      }
      return rawRole;
    };

    const registerUser = (map, rawUser, worksheet, defaultRole) => {
      if (!rawUser) return;
      const name = personName(rawUser);
      if (!name || name === "-" || name.toLowerCase() === "n/a") return;
      const id = String(rawUser?._id || rawUser?.employeeId || name).trim();

      const resolvedRole = normalizeDisplayRole(rawUser?.role, defaultRole);

      let entry = map.get(id);
      if (!entry) {
        entry = {
          id,
          _id: rawUser?._id || null,
          name,
          role: resolvedRole,
          employeeId: rawUser?.employeeId || "",
          email: rawUser?.email || "",
          phoneNumber: rawUser?.phoneNumber || "",
          worksheets: [],
          totalProjects: 0,
          totalPhotos: 0,
          latestDate: null,
          latestTime: null,
          earliestDate: null,
        };
        map.set(id, entry);
      } else {
        if (!entry.employeeId && rawUser?.employeeId) entry.employeeId = rawUser.employeeId;
        if (!entry.email && rawUser?.email) entry.email = rawUser.email;
        if (!entry.phoneNumber && rawUser?.phoneNumber) entry.phoneNumber = rawUser.phoneNumber;
        if (resolvedRole && (!entry.role || entry.role === defaultRole)) entry.role = resolvedRole;
      }

      // Add worksheet if not already added
      if (!entry.worksheets.some((w) => w._id === worksheet._id)) {
        entry.worksheets.push(worksheet);
        const projCount = worksheet.projects?.length || 0;
        entry.totalProjects += projCount;
        (worksheet.projects || []).forEach((p) => {
          entry.totalPhotos += p.photos?.length || 0;
        });

        const rawWDate = worksheet.workDate || worksheet.createdAt;
        const wDate = new Date(rawWDate);
        if (!Number.isNaN(wDate.getTime())) {
          if (!entry.latestDate || wDate > new Date(entry.latestDate)) {
            entry.latestDate = rawWDate;
            entry.latestTime = worksheet.submittedAt || worksheet.createdAt;
          }
          if (!entry.earliestDate || wDate < new Date(entry.earliestDate)) {
            entry.earliestDate = rawWDate;
          }
        }
      }
    };

    rows.forEach((r) => {
      // 1. Submitter analysis
      const submitter = r.user;
      if (submitter) {
        if (isManagerRole(submitter)) {
          registerUser(managerMap, submitter, r, "Manager");
        } else if (isSupervisorRole(submitter)) {
          registerUser(supervisorMap, submitter, r, "Supervisor");
        } else if (isInchargeRole(submitter)) {
          registerUser(inchargeMap, submitter, r, "Incharge");
        }
      }

      // 2. ApprovedBy analysis (Managers only — exclude Admin_panel)
      if (r.approvedBy && isManagerRole(r.approvedBy)) {
        registerUser(managerMap, r.approvedBy, r, "Manager");
      }

      // 3. Projects breakdown
      (r.projects || []).forEach((p) => {
        // Supervisor on project — only add to supervisorMap if user's role is actually SUPERVISOR
        if (p.supervisor) {
          if (isSupervisorRole(p.supervisor)) {
            registerUser(supervisorMap, p.supervisor, r, "Supervisor");
          } else if (isManagerRole(p.supervisor)) {
            registerUser(managerMap, p.supervisor, r, "Manager");
          } else if (isInchargeRole(p.supervisor)) {
            registerUser(inchargeMap, p.supervisor, r, "Incharge");
          }
        }
        // Incharges on project
        if (Array.isArray(p.incharges) && p.incharges.length > 0) {
          p.incharges.forEach((inc) => {
            if (isInchargeRole(inc)) {
              registerUser(inchargeMap, inc, r, "Incharge");
            }
          });
        }
        if (p.incharge && isInchargeRole(p.incharge)) {
          registerUser(inchargeMap, p.incharge, r, "Incharge");
        }
      });
    });

    const finalizeList = (map) => {
      const list = Array.from(map.values());
      list.forEach((u) => {
        u.worksheets.sort((a, b) => new Date(b.workDate || b.createdAt) - new Date(a.workDate || a.createdAt));
      });
      return list.sort((a, b) => {
        if (b.worksheets.length !== a.worksheets.length) {
          return b.worksheets.length - a.worksheets.length;
        }
        return b.totalProjects - a.totalProjects;
      });
    };

    return {
      incharges: finalizeList(inchargeMap),
      supervisors: finalizeList(supervisorMap),
      managers: finalizeList(managerMap),
    };
  }, [rows]);

  // Tab counts
  const tabCounts = useMemo(() => {
    return {
      incharge: roleUsers.incharges.length,
      supervisor: roleUsers.supervisors.length,
      manager: roleUsers.managers.length,
      all: rows.length,
    };
  }, [roleUsers, rows.length]);

  const handleTabChange = (newTab) => {
    setRoleTab(newTab);
    setSelectedUser(null);
    setUserSearchTerm("");
    setSearchTerm("");
    setSelectedDate("");
  };

  const openUserDetail = (targetNameOrId, preferredRole = "INCHARGE") => {
    if (!targetNameOrId) return;
    const cleanTarget = String(targetNameOrId).toLowerCase().trim();

    let pool = [];
    if (preferredRole === "INCHARGE") pool = roleUsers.incharges;
    else if (preferredRole === "SUPERVISOR") pool = roleUsers.supervisors;
    else if (preferredRole === "MANAGER") pool = roleUsers.managers;
    else pool = [...roleUsers.incharges, ...roleUsers.supervisors, ...roleUsers.managers];

    let found = pool.find(
      (u) =>
        u.name.toLowerCase() === cleanTarget ||
        u.id.toLowerCase() === cleanTarget ||
        (u.employeeId && u.employeeId.toLowerCase() === cleanTarget)
    );
    if (!found) {
      found = [...roleUsers.incharges, ...roleUsers.supervisors, ...roleUsers.managers].find(
        (u) =>
          u.name.toLowerCase().includes(cleanTarget) ||
          cleanTarget.includes(u.name.toLowerCase()) ||
          u.id.toLowerCase() === cleanTarget
      );
    }

    if (found) {
      const targetRole = preferredRole || (isSupervisorRole(found.role) ? "SUPERVISOR" : "INCHARGE");
      setRoleTab(targetRole);
      setSelectedUser(found);
      window.scrollTo({ top: 380, behavior: "smooth" });
    }
  };

  // Filtered users for the active role tab
  const activeRoleUsers = useMemo(() => {
    let list = [];
    if (roleTab === "INCHARGE") list = roleUsers.incharges;
    else if (roleTab === "SUPERVISOR") list = roleUsers.supervisors;
    else if (roleTab === "MANAGER") list = roleUsers.managers;
    else return [];

    if (userSearchTerm.trim()) {
      const q = userSearchTerm.toLowerCase().trim();
      list = list.filter((u) => {
        return (
          u.name.toLowerCase().includes(q) ||
          (u.employeeId || "").toLowerCase().includes(q) ||
          (u.role || "").toLowerCase().includes(q) ||
          (u.phoneNumber || "").toLowerCase().includes(q) ||
          (u.email || "").toLowerCase().includes(q)
        );
      });
    }

    const sorted = [...list];
    if (userSortBy === "worksheets") {
      sorted.sort((a, b) => b.worksheets.length - a.worksheets.length);
    } else if (userSortBy === "projects") {
      sorted.sort((a, b) => b.totalProjects - a.totalProjects);
    } else if (userSortBy === "recent") {
      sorted.sort((a, b) => new Date(b.latestTime || b.latestDate || 0) - new Date(a.latestTime || a.latestDate || 0));
    } else if (userSortBy === "name") {
      sorted.sort((a, b) => a.name.localeCompare(b.name));
    }

    return sorted;
  }, [roleTab, roleUsers, userSearchTerm, userSortBy]);

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
    setUserSearchTerm("");
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
      incharges: roleUsers.incharges.length,
      supervisors: roleUsers.supervisors.length,
      managers: roleUsers.managers.length,
    };
  }, [rows, roleUsers]);

  // Worksheets filtered for the selected user
  const userFilteredWorksheets = useMemo(() => {
    if (!selectedUser) return [];
    let list = selectedUser.worksheets || [];

    if (selectedDate) {
      list = list.filter((r) => {
        if (!r.workDate && !r.createdAt) return false;
        const d = new Date(r.workDate || r.createdAt);
        if (Number.isNaN(d.getTime())) return false;
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}` === selectedDate;
      });
    }

    if (selectedProjectType !== "ALL") {
      list = list.filter((r) =>
        (r.projects || []).some((p) => (p.projectType || "Others") === selectedProjectType)
      );
    }

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      list = list.filter((r) => {
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
          formatDate(r.workDate).includes(q) ||
          getWorksheetTimestamp(r).toLowerCase().includes(q)
        );
      });
    }

    return list;
  }, [selectedUser, selectedDate, selectedProjectType, searchTerm]);

  // Combined / Grouped by Date view (1 Box per Date) for Selected User
  const userDisplayWorksheets = useMemo(() => {
    if (!groupByDate) return userFilteredWorksheets;
    return groupWorksheetsByDate(userFilteredWorksheets);
  }, [userFilteredWorksheets, groupByDate]);

  // Filtered rows for "All Worksheets" view
  const filteredRows = useMemo(() => {
    let list = rows;

    if (selectedSupervisor !== "ALL") {
      list = list.filter((r) => {
        const sup = uniqueSupervisorNames(r.projects);
        const subName = personName(r.user);
        return sup === selectedSupervisor || subName === selectedSupervisor;
      });
    }

    if (selectedIncharge !== "ALL") {
      list = list.filter((r) => {
        const inc = uniqueInchargeNames(r.projects);
        const subName = personName(r.user);
        return inc.includes(selectedIncharge) || subName === selectedIncharge;
      });
    }

    if (selectedProjectType !== "ALL") {
      list = list.filter((r) =>
        (r.projects || []).some((p) => (p.projectType || "Others") === selectedProjectType)
      );
    }

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
        formatDate(r.workDate).includes(q) ||
        getWorksheetTimestamp(r).toLowerCase().includes(q)
      );
    });
  }, [
    rows,
    selectedSupervisor,
    selectedIncharge,
    selectedProjectType,
    selectedDate,
    searchTerm,
  ]);

  // Combined / Grouped by Date view (1 Box per Date) for All Worksheets view
  const allDisplayWorksheets = useMemo(() => {
    if (!groupByDate) return filteredRows;
    return groupWorksheetsByDate(filteredRows);
  }, [filteredRows, groupByDate]);

  return (
    <Box sx={{ p: { xs: 2, md: 3.5 }, bgcolor: isDark ? "#060a12" : "#f8fafc", minHeight: "100vh" }}>
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
                <Typography variant="h5" sx={{ fontWeight: 800, color: isDark ? "#f8fafc" : "#0f2f57", letterSpacing: -0.5 }}>
                  Daily Worksheet & Site Verification
                </Typography>
                <Typography variant="body2" sx={{ color: isDark ? "#94a3b8" : "#64748b" }}>
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
                borderColor: isDark ? "rgba(255,255,255,0.15)" : "#cbd5e1",
                color: isDark ? "#f8fafc" : "#334155",
                bgcolor: isDark ? "#0e1424" : "#fff",
                "&:hover": { borderColor: isDark ? "rgba(255,255,255,0.25)" : "#94a3b8", bgcolor: isDark ? "#131b30" : "#f1f5f9" },
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
              border: isDark ? "1px solid rgba(255, 255, 255, 0.08)" : "1px solid #e2e8f0",
              bgcolor: isDark ? "#0e1424" : "#ffffff",
              boxShadow: isDark ? "0 4px 20px rgba(0, 0, 0, 0.3)" : "0 2px 8px rgba(15, 23, 42, 0.04)",
            }}
          >
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Box>
                <Typography variant="caption" sx={{ color: isDark ? "#94a3b8" : "#64748b", fontWeight: 700, textTransform: "uppercase" }}>
                  Total Worksheets
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 800, color: isDark ? "#60a5fa" : "#0f2f57", mt: 0.5 }}>
                  {stats.worksheets}
                </Typography>
              </Box>
              <Avatar sx={{ bgcolor: isDark ? "rgba(37,99,235,0.2)" : "#eff6ff", color: isDark ? "#60a5fa" : "#004792", width: 48, height: 48 }}>
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
              border: isDark ? "1px solid rgba(255, 255, 255, 0.08)" : "1px solid #e2e8f0",
              bgcolor: isDark ? "#0e1424" : "#ffffff",
              boxShadow: isDark ? "0 4px 20px rgba(0, 0, 0, 0.3)" : "0 2px 8px rgba(15, 23, 42, 0.04)",
            }}
          >
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Box>
                <Typography variant="caption" sx={{ color: isDark ? "#94a3b8" : "#64748b", fontWeight: 700, textTransform: "uppercase" }}>
                  Projects Completed
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 800, color: "#0284c7", mt: 0.5 }}>
                  {stats.projects}
                </Typography>
              </Box>
              <Avatar sx={{ bgcolor: isDark ? "rgba(2,132,199,0.2)" : "#f0f9ff", color: "#0284c7", width: 48, height: 48 }}>
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
              border: isDark ? "1px solid rgba(255, 255, 255, 0.08)" : "1px solid #e2e8f0",
              bgcolor: isDark ? "#0e1424" : "#ffffff",
              boxShadow: isDark ? "0 4px 20px rgba(0, 0, 0, 0.3)" : "0 2px 8px rgba(15, 23, 42, 0.04)",
            }}
          >
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Box>
                <Typography variant="caption" sx={{ color: isDark ? "#94a3b8" : "#64748b", fontWeight: 700, textTransform: "uppercase" }}>
                  Geo-Tagged Photos
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 800, color: "#059669", mt: 0.5 }}>
                  {stats.photos}
                </Typography>
              </Box>
              <Avatar sx={{ bgcolor: isDark ? "rgba(5,150,105,0.2)" : "#ecfdf5", color: "#059669", width: 48, height: 48 }}>
                <ImageRounded />
              </Avatar>
            </Stack>
          </Card>
        </Grid>
      </Grid>

      {/* ─── ROLE TABS ─── */}
      <Card
        elevation={0}
        sx={{
          p: 1.2,
          mb: 3,
          borderRadius: 3,
          border: isDark ? "1px solid rgba(255, 255, 255, 0.08)" : "1px solid #e2e8f0",
          bgcolor: isDark ? "#0e1424" : "#f8fafc",
          boxShadow: isDark ? "0 4px 16px rgba(0, 0, 0, 0.2)" : "0 2px 8px rgba(15, 23, 42, 0.03)",
        }}
      >
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1}
          alignItems={{ xs: "stretch", sm: "center" }}
          sx={{ flexWrap: "wrap", gap: 1 }}
        >
          <Button
            variant={roleTab === "INCHARGE" ? "contained" : "text"}
            size="small"
            startIcon={<PersonRounded sx={{ fontSize: "17px !important" }} />}
            onClick={() => handleTabChange("INCHARGE")}
            sx={{
              borderRadius: 2.2,
              textTransform: "none",
              fontWeight: 700,
              px: 2.4,
              py: 0.9,
              bgcolor: roleTab === "INCHARGE" ? "#16a34a" : "transparent",
              color: roleTab === "INCHARGE" ? "#ffffff" : (isDark ? "#94a3b8" : "#475569"),
              boxShadow: roleTab === "INCHARGE" ? "0 4px 14px rgba(22, 163, 74, 0.3)" : "none",
              "&:hover": {
                bgcolor: roleTab === "INCHARGE" ? "#15803d" : (isDark ? "rgba(255,255,255,0.06)" : "#e2e8f0"),
                color: roleTab === "INCHARGE" ? "#ffffff" : (isDark ? "#f8fafc" : "#0f172a"),
              },
            }}
          >
            Incharges ({tabCounts.incharge})
          </Button>

          <Button
            variant={roleTab === "SUPERVISOR" ? "contained" : "text"}
            size="small"
            startIcon={<ShieldRounded sx={{ fontSize: "17px !important" }} />}
            onClick={() => handleTabChange("SUPERVISOR")}
            sx={{
              borderRadius: 2.2,
              textTransform: "none",
              fontWeight: 700,
              px: 2.4,
              py: 0.9,
              bgcolor: roleTab === "SUPERVISOR" ? "#ca8a04" : "transparent",
              color: roleTab === "SUPERVISOR" ? "#ffffff" : (isDark ? "#94a3b8" : "#475569"),
              boxShadow: roleTab === "SUPERVISOR" ? "0 4px 14px rgba(202, 138, 4, 0.3)" : "none",
              "&:hover": {
                bgcolor: roleTab === "SUPERVISOR" ? "#a16207" : (isDark ? "rgba(255,255,255,0.06)" : "#e2e8f0"),
                color: roleTab === "SUPERVISOR" ? "#ffffff" : (isDark ? "#f8fafc" : "#0f172a"),
              },
            }}
          >
            Supervisors ({tabCounts.supervisor})
          </Button>

          <Button
            variant={roleTab === "MANAGER" ? "contained" : "text"}
            size="small"
            startIcon={<SupervisorAccountRounded sx={{ fontSize: "17px !important" }} />}
            onClick={() => handleTabChange("MANAGER")}
            sx={{
              borderRadius: 2.2,
              textTransform: "none",
              fontWeight: 700,
              px: 2.4,
              py: 0.9,
              bgcolor: roleTab === "MANAGER" ? "#4f46e5" : "transparent",
              color: roleTab === "MANAGER" ? "#ffffff" : (isDark ? "#94a3b8" : "#475569"),
              boxShadow: roleTab === "MANAGER" ? "0 4px 14px rgba(79, 70, 229, 0.3)" : "none",
              "&:hover": {
                bgcolor: roleTab === "MANAGER" ? "#4338ca" : (isDark ? "rgba(255,255,255,0.06)" : "#e2e8f0"),
                color: roleTab === "MANAGER" ? "#ffffff" : (isDark ? "#f8fafc" : "#0f172a"),
              },
            }}
          >
            Managers ({tabCounts.manager})
          </Button>

          <Box sx={{ flexGrow: 1 }} />

          <Button
            variant={roleTab === "ALL" ? "contained" : "text"}
            size="small"
            startIcon={<EngineeringRounded sx={{ fontSize: "17px !important" }} />}
            onClick={() => handleTabChange("ALL")}
            sx={{
              borderRadius: 2.2,
              textTransform: "none",
              fontWeight: 700,
              px: 2.4,
              py: 0.9,
              bgcolor: roleTab === "ALL" ? (isDark ? "#2563eb" : "#0f2f57") : "transparent",
              color: roleTab === "ALL" ? "#ffffff" : (isDark ? "#94a3b8" : "#475569"),
              boxShadow: roleTab === "ALL" ? "0 4px 14px rgba(37, 99, 235, 0.3)" : "none",
              "&:hover": {
                bgcolor: roleTab === "ALL" ? (isDark ? "#1d4ed8" : "#0a1f3a") : (isDark ? "rgba(255,255,255,0.06)" : "#e2e8f0"),
                color: roleTab === "ALL" ? "#ffffff" : (isDark ? "#f8fafc" : "#0f172a"),
              },
            }}
          >
            All Worksheets ({tabCounts.all})
          </Button>
        </Stack>
      </Card>

      {error && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
          {error}
        </Alert>
      )}

      {/* ─── CASE 1: ROLE DIRECTORY VIEW (When Role Tab active & no user selected) ─── */}
      {roleTab !== "ALL" && !selectedUser && (
        <Box sx={{ mb: 4 }}>
          {/* Search & Sort Toolbar for Role Directory */}
          <Card
            elevation={0}
            sx={{
              p: 2,
              mb: 3,
              borderRadius: 3,
              border: isDark ? "1px solid rgba(255, 255, 255, 0.08)" : "1px solid #e2e8f0",
              bgcolor: isDark ? "#0e1424" : "#ffffff",
              boxShadow: isDark ? "0 4px 16px rgba(0, 0, 0, 0.2)" : "0 2px 8px rgba(15, 23, 42, 0.04)",
            }}
          >
            <Stack
              direction={{ xs: "column", md: "row" }}
              spacing={2}
              alignItems={{ xs: "stretch", md: "center" }}
              justifyContent="space-between"
            >
              <TextField
                size="small"
                placeholder={
                  roleTab === "INCHARGE"
                    ? "Search Incharge by name, employee ID, phone..."
                    : roleTab === "SUPERVISOR"
                    ? "Search Supervisor by name, employee ID, phone..."
                    : "Search Manager by name, employee ID, phone..."
                }
                value={userSearchTerm}
                onChange={(e) => setUserSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchRounded sx={{ color: isDark ? "#64748b" : "#94a3b8" }} />
                    </InputAdornment>
                  ),
                  sx: { borderRadius: 2, bgcolor: isDark ? "#060a12" : "#f8fafc", color: isDark ? "#f8fafc" : "inherit" },
                }}
                sx={{ flex: 1 }}
              />

              <Stack direction="row" spacing={1.5} alignItems="center">
                <FormControl size="small" sx={{ minWidth: 170 }}>
                  <InputLabel id="user-sort-label" sx={{ fontSize: "0.85rem", color: isDark ? "#94a3b8" : undefined }}>
                    Sort Members
                  </InputLabel>
                  <Select
                    labelId="user-sort-label"
                    label="Sort Members"
                    value={userSortBy}
                    onChange={(e) => setUserSortBy(e.target.value)}
                    sx={{ borderRadius: 2, bgcolor: isDark ? "#060a12" : "#f8fafc", fontSize: "0.85rem", color: isDark ? "#f8fafc" : "inherit" }}
                  >
                    <MenuItem value="worksheets">Most Worksheets</MenuItem>
                    <MenuItem value="projects">Most Projects</MenuItem>
                    <MenuItem value="recent">Recent Activity</MenuItem>
                    <MenuItem value="name">Name (A-Z)</MenuItem>
                  </Select>
                </FormControl>

                {userSearchTerm && (
                  <Button
                    size="small"
                    variant="text"
                    startIcon={<RestartAltRounded />}
                    onClick={() => setUserSearchTerm("")}
                    sx={{ color: "#ef4444", fontWeight: 700, textTransform: "none" }}
                  >
                    Clear
                  </Button>
                )}
              </Stack>
            </Stack>
          </Card>

          {/* User Cards Grid */}
          {loading ? (
            <Box sx={{ p: 8, textAlign: "center" }}>
              <CircularProgress size={38} sx={{ color: "#004792" }} />
              <Typography sx={{ mt: 2, color: isDark ? "#94a3b8" : "#64748b", fontWeight: 500 }}>
                Loading personnel directory...
              </Typography>
            </Box>
          ) : activeRoleUsers.length === 0 ? (
            <Paper
              elevation={0}
              sx={{
                p: 6,
                textAlign: "center",
                borderRadius: 3,
                border: isDark ? "1px dashed rgba(255,255,255,0.15)" : "1px dashed #cbd5e1",
                bgcolor: isDark ? "#0e1424" : "#ffffff",
              }}
            >
              <GroupRounded sx={{ fontSize: 50, color: isDark ? "#475569" : "#94a3b8", mb: 1 }} />
              <Typography variant="h6" sx={{ fontWeight: 700, color: isDark ? "#f8fafc" : "#334155" }}>
                No {roleTab === "INCHARGE" ? "Incharges" : roleTab === "SUPERVISOR" ? "Supervisors" : "Managers"} found
              </Typography>
              <Typography variant="body2" sx={{ color: isDark ? "#94a3b8" : "#64748b", mt: 0.5 }}>
                {userSearchTerm
                  ? "No personnel match your search term."
                  : `No ${roleTab.toLowerCase()} records have been registered in worksheets yet.`}
              </Typography>
            </Paper>
          ) : (
            <Grid container spacing={2.5}>
              {activeRoleUsers.map((user) => {
                const roleBadgeColor =
                  roleTab === "INCHARGE"
                    ? {
                        main: "#16a34a",
                        dark: "#15803d",
                        btnHover: "#15803d",
                        bg: isDark ? "rgba(22,163,74,0.18)" : "#f0fdf4",
                        border: isDark ? "rgba(22,163,74,0.3)" : "#bbf7d0",
                        borderHover: "#86efac",
                        text: isDark ? "#4ade80" : "#166534",
                        timeColor: isDark ? "#4ade80" : "#15803d",
                        gradient: "linear-gradient(135deg, #22c55e 0%, #15803d 100%)",
                        avatarShadow: "rgba(34, 197, 94, 0.35)",
                        hoverShadow: "rgba(22, 163, 74, 0.15)",
                        btnShadow: "rgba(22, 163, 74, 0.3)",
                      }
                    : roleTab === "SUPERVISOR"
                    ? {
                        main: "#ca8a04",
                        dark: "#a16207",
                        btnHover: "#a16207",
                        bg: isDark ? "rgba(202,138,4,0.18)" : "#fefce8",
                        border: isDark ? "rgba(202,138,4,0.3)" : "#fef08a",
                        borderHover: "#fde047",
                        text: isDark ? "#facc15" : "#854d0e",
                        timeColor: isDark ? "#facc15" : "#b45309",
                        gradient: "linear-gradient(135deg, #f59e0b 0%, #b45309 100%)",
                        avatarShadow: "rgba(245, 158, 11, 0.35)",
                        hoverShadow: "rgba(202, 138, 4, 0.15)",
                        btnShadow: "rgba(202, 138, 4, 0.3)",
                      }
                    : {
                        main: "#4f46e5",
                        dark: "#4338ca",
                        btnHover: "#4338ca",
                        bg: isDark ? "rgba(79,70,229,0.18)" : "#eef2ff",
                        border: isDark ? "rgba(79,70,229,0.3)" : "#c7d2fe",
                        borderHover: "#a5b4fc",
                        text: isDark ? "#818cf8" : "#4338ca",
                        timeColor: isDark ? "#818cf8" : "#4338ca",
                        gradient: "linear-gradient(135deg, #6366f1 0%, #4338ca 100%)",
                        avatarShadow: "rgba(99, 102, 241, 0.35)",
                        hoverShadow: "rgba(79, 70, 229, 0.15)",
                        btnShadow: "rgba(79, 70, 229, 0.3)",
                      };

                const initials =
                  user.name
                    .split(" ")
                    .map((p) => p[0])
                    .filter(Boolean)
                    .slice(0, 2)
                    .join("")
                    .toUpperCase() || "U";

                const latestDateFormatted = formatDate(user.latestDate);
                const latestTimeFormatted = formatTime(user.latestTime || user.latestDate);

                return (
                  <Grid item xs={12} sm={6} md={4} key={user.id}>
                    <Card
                      elevation={0}
                      onClick={() => {
                        setSelectedUser(user);
                        window.scrollTo({ top: 380, behavior: "smooth" });
                      }}
                      sx={{
                        borderRadius: 3.5,
                        border: isDark ? "1px solid rgba(255, 255, 255, 0.08)" : "1px solid #e2e8f0",
                        bgcolor: isDark ? "#0e1424" : "#ffffff",
                        cursor: "pointer",
                        transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
                        position: "relative",
                        overflow: "hidden",
                        boxShadow: isDark ? "0 4px 16px rgba(0, 0, 0, 0.25)" : "0 2px 8px rgba(15, 23, 42, 0.04)",
                        "&:hover": {
                          transform: "translateY(-4px)",
                          boxShadow: isDark
                            ? "0 16px 32px -8px rgba(0,0,0,0.6), 0 4px 12px rgba(0,0,0,0.4)"
                            : `0 16px 32px -8px ${roleBadgeColor.hoverShadow}, 0 4px 12px rgba(15, 23, 42, 0.05)`,
                          borderColor: roleBadgeColor.borderHover,
                          "& .view-btn": {
                            bgcolor: roleBadgeColor.btnHover,
                            transform: "translateX(2px)",
                          },
                          "& .avatar-box": {
                            transform: "scale(1.04)",
                          },
                        },
                      }}
                    >
                      {/* Top Accent Line */}
                      <Box
                        sx={{
                          height: 4,
                          background: roleBadgeColor.gradient,
                          width: "100%",
                        }}
                      />

                      <Box sx={{ p: 2.5 }}>
                        {/* Header: Avatar, Name, Role badge, ID, Phone */}
                        <Stack direction="row" spacing={1.8} alignItems="center" sx={{ mb: 2 }}>
                          <Avatar
                            className="avatar-box"
                            sx={{
                              width: 50,
                              height: 50,
                              background: roleBadgeColor.gradient,
                              color: "#ffffff",
                              fontWeight: 800,
                              fontSize: "1.05rem",
                              letterSpacing: "0.5px",
                              boxShadow: `0 6px 16px ${roleBadgeColor.avatarShadow}`,
                              border: isDark ? "2px solid #1e293b" : "2px solid #ffffff",
                              transition: "transform 0.25s ease",
                              flexShrink: 0,
                            }}
                          >
                            {initials}
                          </Avatar>

                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
                              <Typography
                                variant="h6"
                                noWrap
                                sx={{
                                  fontWeight: 800,
                                  color: isDark ? "#f8fafc" : "#0f2f57",
                                  fontSize: "1.02rem",
                                  lineHeight: 1.25,
                                }}
                              >
                                {user.name}
                              </Typography>

                              <Chip
                                size="small"
                                label={user.role || (roleTab === "INCHARGE" ? "Incharge" : roleTab === "SUPERVISOR" ? "Supervisor" : "Manager")}
                                sx={{
                                  height: 22,
                                  fontWeight: 800,
                                  fontSize: "0.7rem",
                                  bgcolor: roleBadgeColor.bg,
                                  color: roleBadgeColor.text,
                                  border: `1px solid ${roleBadgeColor.border}`,
                                  borderRadius: "6px",
                                  flexShrink: 0,
                                }}
                              />
                            </Stack>

                            <Stack direction="row" spacing={1.2} alignItems="center" sx={{ mt: 0.6, flexWrap: "wrap", gap: 0.6 }}>
                              {user.employeeId && (
                                <Chip
                                  size="small"
                                  icon={<BadgeRounded sx={{ fontSize: "13px !important", color: isDark ? "#94a3b8" : "#475569" }} />}
                                  label={user.employeeId}
                                  sx={{
                                    height: 20,
                                    fontWeight: 700,
                                    fontSize: "0.7rem",
                                    bgcolor: isDark ? "rgba(255,255,255,0.06)" : "#f1f5f9",
                                    color: isDark ? "#cbd5e1" : "#334155",
                                    borderRadius: "6px",
                                    "& .MuiChip-icon": { ml: 0.4 },
                                  }}
                                />
                              )}

                              {user.phoneNumber ? (
                                <Stack direction="row" spacing={0.4} alignItems="center">
                                  <PhoneRounded sx={{ fontSize: 13, color: isDark ? "#94a3b8" : "#64748b" }} />
                                  <Typography sx={{ fontSize: "0.75rem", color: isDark ? "#94a3b8" : "#64748b", fontWeight: 600 }}>
                                    {user.phoneNumber}
                                  </Typography>
                                </Stack>
                              ) : user.email ? (
                                <Typography noWrap sx={{ fontSize: "0.75rem", color: isDark ? "#94a3b8" : "#64748b", fontWeight: 500, maxWidth: 160 }}>
                                  {user.email}
                                </Typography>
                              ) : null}
                            </Stack>
                          </Box>
                        </Stack>

                        {/* Modern Stats Grid: Equal 3-Columns with Clean Dividers */}
                        <Box
                          sx={{
                            display: "grid",
                            gridTemplateColumns: "repeat(3, 1fr)",
                            bgcolor: isDark ? "#060a12" : "#f8fafc",
                            borderRadius: 2.5,
                            border: isDark ? "1px solid rgba(255, 255, 255, 0.06)" : "1px solid #e2e8f0",
                            p: 1.2,
                            mb: 2,
                            textAlign: "center",
                          }}
                        >
                          <Box sx={{ py: 0.5 }}>
                            <Typography sx={{ fontSize: "0.65rem", fontWeight: 700, color: isDark ? "#94a3b8" : "#64748b", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                              Worksheets
                            </Typography>
                            <Typography sx={{ fontSize: "1.25rem", fontWeight: 800, color: isDark ? "#f8fafc" : "#0f2f57", mt: 0.3, lineHeight: 1 }}>
                              {user.worksheets.length}
                            </Typography>
                          </Box>

                          <Box sx={{ py: 0.5, borderLeft: isDark ? "1px solid rgba(255, 255, 255, 0.06)" : "1px solid #e2e8f0", borderRight: isDark ? "1px solid rgba(255, 255, 255, 0.06)" : "1px solid #e2e8f0" }}>
                            <Typography sx={{ fontSize: "0.65rem", fontWeight: 700, color: "#0284c7", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                              Projects
                            </Typography>
                            <Typography sx={{ fontSize: "1.25rem", fontWeight: 800, color: "#0284c7", mt: 0.3, lineHeight: 1 }}>
                              {user.totalProjects}
                            </Typography>
                          </Box>

                          <Box sx={{ py: 0.5 }}>
                            <Typography sx={{ fontSize: "0.65rem", fontWeight: 700, color: "#059669", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                              Photos
                            </Typography>
                            <Typography sx={{ fontSize: "1.25rem", fontWeight: 800, color: "#059669", mt: 0.3, lineHeight: 1 }}>
                              {user.totalPhotos}
                            </Typography>
                          </Box>
                        </Box>

                        {/* Footer: Latest Activity + Action Button */}
                        <Stack
                          direction="row"
                          justifyContent="space-between"
                          alignItems="center"
                          sx={{ pt: 1.5, borderTop: isDark ? "1px solid rgba(255, 255, 255, 0.06)" : "1px solid #f1f5f9" }}
                        >
                          <Box sx={{ minWidth: 0, pr: 1 }}>
                            <Typography sx={{ fontSize: "0.62rem", fontWeight: 700, color: isDark ? "#64748b" : "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", mb: 0.3 }}>
                              Latest Submission
                            </Typography>
                            <Stack direction="row" spacing={0.6} alignItems="center" sx={{ flexWrap: "wrap", gap: 0.4 }}>
                              <Stack direction="row" spacing={0.4} alignItems="center">
                                <CalendarTodayRounded sx={{ fontSize: 13, color: isDark ? "#94a3b8" : "#475569" }} />
                                <Typography sx={{ fontSize: "0.78rem", fontWeight: 700, color: isDark ? "#f8fafc" : "#1e293b" }}>
                                  {latestDateFormatted}
                                </Typography>
                              </Stack>
                              <Typography sx={{ fontSize: "0.75rem", color: isDark ? "#475569" : "#cbd5e1" }}>•</Typography>
                              <Stack direction="row" spacing={0.4} alignItems="center">
                                <AccessTimeRounded sx={{ fontSize: 13, color: roleBadgeColor.timeColor }} />
                                <Typography sx={{ fontSize: "0.78rem", fontWeight: 700, color: roleBadgeColor.timeColor }}>
                                  {latestTimeFormatted}
                                </Typography>
                              </Stack>
                            </Stack>
                          </Box>

                          <Button
                            className="view-btn"
                            size="small"
                            variant="contained"
                            endIcon={<ArrowForwardRounded sx={{ fontSize: "14px !important" }} />}
                            sx={{
                              borderRadius: 2,
                              textTransform: "none",
                              fontWeight: 700,
                              fontSize: "0.75rem",
                              px: 1.8,
                              py: 0.7,
                              whiteSpace: "nowrap",
                              bgcolor: roleBadgeColor.main,
                              boxShadow: `0 3px 10px ${roleBadgeColor.btnShadow}`,
                              transition: "all 0.2s ease",
                            }}
                          >
                            Worksheets
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
      )}

      {/* ─── CASE 2: SELECTED USER DRILL-DOWN VIEW (Showing Their Worksheets with Date & Time) ─── */}
      {roleTab !== "ALL" && selectedUser && (
        <Box sx={{ mb: 4 }}>
          {/* Top Breadcrumb & Back Navigation */}
          <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", sm: "center" }} spacing={1.5} sx={{ mb: 2.5 }}>
            <Button
              variant="outlined"
              size="small"
              startIcon={<ArrowBackRounded sx={{ fontSize: "16px !important" }} />}
              onClick={() => setSelectedUser(null)}
              sx={{
                borderRadius: 2.5,
                textTransform: "none",
                fontWeight: 700,
                px: 2,
                py: 0.8,
                color: isDark ? "#f8fafc" : "#0f2f57",
                borderColor: isDark ? "rgba(255,255,255,0.15)" : "#cbd5e1",
                bgcolor: isDark ? "#0e1424" : "#ffffff",
                boxShadow: "0 2px 6px rgba(0,0,0,0.04)",
                "&:hover": { bgcolor: isDark ? "#131b30" : "#f1f5f9", borderColor: isDark ? "rgba(255,255,255,0.25)" : "#94a3b8" },
              }}
            >
              Back to All {roleTab === "INCHARGE" ? "Incharges" : roleTab === "SUPERVISOR" ? "Supervisors" : "Managers"}
            </Button>

            <Stack direction="row" spacing={1} alignItems="center">
              <Chip
                size="small"
                label={`Viewing: ${selectedUser.name}`}
                sx={{
                  fontWeight: 800,
                  bgcolor: isDark ? "#1e3a8a" : "#0f2f57",
                  color: "#ffffff",
                  fontSize: "0.78rem",
                  py: 0.4,
                }}
              />
              <Chip
                size="small"
                label={
                  groupByDate
                    ? `${userDisplayWorksheets.length} ${userDisplayWorksheets.length === 1 ? "Date Box" : "Date Boxes"} (${userFilteredWorksheets.length} Reports · ${userFilteredWorksheets.reduce((acc, w) => acc + (w.projects?.length || 0), 0)} Projects)`
                    : `${userFilteredWorksheets.length} ${userFilteredWorksheets.length === 1 ? "Worksheet" : "Worksheets"}`
                }
                sx={{
                  fontWeight: 700,
                  bgcolor: isDark ? "rgba(2,132,199,0.2)" : "#e0f2fe",
                  color: isDark ? "#38bdf8" : "#0369a1",
                  fontSize: "0.78rem",
                }}
              />
            </Stack>
          </Stack>

          {/* User Profile Header Card */}
          <Card
            elevation={0}
            sx={{
              p: { xs: 2, sm: 3 },
              mb: 3,
              borderRadius: 3,
              border: isDark ? "1px solid rgba(255, 255, 255, 0.08)" : "1px solid #e2e8f0",
              bgcolor: isDark ? "#0e1424" : "#ffffff",
              boxShadow: isDark ? "0 4px 16px rgba(0,0,0,0.2)" : "0 4px 14px rgba(15, 23, 42, 0.05)",
            }}
          >
            <Grid container spacing={2.5} alignItems="center">
              <Grid item xs={12} md={6}>
                <Stack direction="row" spacing={2} alignItems="center">
                  <Avatar
                    sx={{
                      width: 64,
                      height: 64,
                      background:
                        roleTab === "INCHARGE"
                          ? "linear-gradient(135deg, #16a34a, #15803d)"
                          : roleTab === "SUPERVISOR"
                          ? "linear-gradient(135deg, #eab308, #ca8a04)"
                          : "linear-gradient(135deg, #6366f1, #4338ca)",
                      color: "#ffffff",
                      fontWeight: 800,
                      fontSize: "1.4rem",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                    }}
                  >
                    {selectedUser.name
                      .split(" ")
                      .map((p) => p[0])
                      .filter(Boolean)
                      .slice(0, 2)
                      .join("")
                      .toUpperCase() || "U"}
                  </Avatar>
                  <Box>
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.4, flexWrap: "wrap", gap: 0.5 }}>
                      <Typography variant="h5" sx={{ fontWeight: 800, color: isDark ? "#f8fafc" : "#0f2f57" }}>
                        {selectedUser.name}
                      </Typography>
                      {selectedUser.employeeId && (
                        <Chip
                          size="small"
                          label={selectedUser.employeeId}
                          sx={{
                            fontWeight: 800,
                            fontSize: "0.72rem",
                            bgcolor: isDark ? "rgba(255,255,255,0.06)" : "#f1f5f9",
                            color: isDark ? "#cbd5e1" : "#334155",
                          }}
                        />
                      )}
                      <Chip
                        size="small"
                        label={selectedUser.role || (roleTab === "INCHARGE" ? "Incharge" : roleTab === "SUPERVISOR" ? "Supervisor" : "Manager")}
                        sx={{
                          fontWeight: 800,
                          fontSize: "0.72rem",
                          bgcolor: isDark ? "rgba(255,255,255,0.08)" : (roleTab === "INCHARGE" ? "#dcfce7" : roleTab === "SUPERVISOR" ? "#fef9c3" : "#e0e7ff"),
                          color: isDark ? "#f8fafc" : (roleTab === "INCHARGE" ? "#166534" : roleTab === "SUPERVISOR" ? "#854d0e" : "#4338ca"),
                        }}
                      />
                    </Stack>
                    <Typography variant="body2" sx={{ color: isDark ? "#94a3b8" : "#64748b" }}>
                      Worksheets & Site Execution Register with Exact Timestamps
                    </Typography>
                  </Box>
                </Stack>
              </Grid>

              <Grid item xs={12} md={6}>
                <Stack direction="row" spacing={1.5} justifyContent={{ xs: "flex-start", md: "flex-end" }} sx={{ flexWrap: "wrap", gap: 1 }}>
                  <Box sx={{ bgcolor: isDark ? "#060a12" : "#f8fafc", px: 2, py: 1, borderRadius: 2.5, border: isDark ? "1px solid rgba(255,255,255,0.06)" : "1px solid #e2e8f0", textAlign: "center" }}>
                    <Typography variant="caption" sx={{ color: isDark ? "#94a3b8" : "#64748b", fontWeight: 700, display: "block" }}>
                      TOTAL WORKSHEETS
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 800, color: isDark ? "#f8fafc" : "#0f2f57" }}>
                      {selectedUser.worksheets.length}
                    </Typography>
                  </Box>

                  <Box sx={{ bgcolor: isDark ? "rgba(2,132,199,0.15)" : "#f0f9ff", px: 2, py: 1, borderRadius: 2.5, border: isDark ? "1px solid rgba(2,132,199,0.3)" : "1px solid #bae6fd", textAlign: "center" }}>
                    <Typography variant="caption" sx={{ color: isDark ? "#38bdf8" : "#0369a1", fontWeight: 700, display: "block" }}>
                      PROJECTS DONE
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 800, color: "#0284c7" }}>
                      {selectedUser.totalProjects}
                    </Typography>
                  </Box>

                  <Box sx={{ bgcolor: isDark ? "rgba(5,150,105,0.15)" : "#ecfdf5", px: 2, py: 1, borderRadius: 2.5, border: isDark ? "1px solid rgba(5,150,105,0.3)" : "1px solid #a7f3d0", textAlign: "center" }}>
                    <Typography variant="caption" sx={{ color: isDark ? "#34d399" : "#047857", fontWeight: 700, display: "block" }}>
                      GEO-PHOTOS
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 800, color: "#059669" }}>
                      {selectedUser.totalPhotos}
                    </Typography>
                  </Box>
                </Stack>
              </Grid>
            </Grid>

            {/* Filter toolbar inside user view */}
            <Divider sx={{ my: 2, borderColor: isDark ? "rgba(255,255,255,0.08)" : "#e2e8f0" }} />
            <Grid container spacing={1.5} alignItems="center">
              <Grid item xs={12} sm={6} md={3.5}>
                <Button
                  fullWidth
                  size="small"
                  variant={groupByDate ? "contained" : "outlined"}
                  onClick={() => setGroupByDate(!groupByDate)}
                  startIcon={<CalendarTodayRounded sx={{ fontSize: 15 }} />}
                  sx={{
                    height: 40,
                    borderRadius: 2,
                    textTransform: "none",
                    fontWeight: 800,
                    fontSize: "0.76rem",
                    bgcolor: groupByDate ? (isDark ? "#2563eb" : "#004792") : "transparent",
                    color: groupByDate ? "#fff" : (isDark ? "#60a5fa" : "#004792"),
                    borderColor: isDark ? "#2563eb" : "#004792",
                    boxShadow: groupByDate ? "0 2px 8px rgba(0, 71, 146, 0.25)" : "none",
                    "&:hover": { bgcolor: groupByDate ? (isDark ? "#1d4ed8" : "#003366") : (isDark ? "rgba(37,99,235,0.1)" : "rgba(0, 71, 146, 0.08)") },
                  }}
                >
                  {groupByDate ? "1 Box Per Date (Active)" : "Separate Report Boxes"}
                </Button>
              </Grid>
              <Grid item xs={12} sm={6} md={3.5}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Search consumer, account no, location, or report..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchRounded sx={{ color: isDark ? "#64748b" : "#94a3b8" }} />
                      </InputAdornment>
                    ),
                    sx: { borderRadius: 2, bgcolor: isDark ? "#060a12" : "#f8fafc", color: isDark ? "#f8fafc" : "inherit" },
                  }}
                />
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel id="user-proj-type-label" sx={{ fontSize: "0.85rem", color: isDark ? "#94a3b8" : undefined }}>
                    Project Type
                  </InputLabel>
                  <Select
                    labelId="user-proj-type-label"
                    label="Project Type"
                    value={selectedProjectType}
                    onChange={(e) => setSelectedProjectType(e.target.value)}
                    sx={{ borderRadius: 2, bgcolor: isDark ? "#060a12" : "#f8fafc", fontSize: "0.85rem", color: isDark ? "#f8fafc" : "inherit" }}
                  >
                    <MenuItem value="ALL">All Project Types</MenuItem>
                    {projectTypeFilterOptions.map((type) => (
                      <MenuItem key={type} value={type}>
                        {type}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  fullWidth
                  size="small"
                  type="date"
                  label="Filter by Date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  sx={{ borderRadius: 2, bgcolor: isDark ? "#060a12" : "#f8fafc", "& input": { fontSize: "0.85rem", color: isDark ? "#f8fafc" : "inherit" } }}
                />
              </Grid>

              {(searchTerm || selectedDate || selectedProjectType !== "ALL") && (
                <Grid item xs={12} sm={6} md={1}>
                  <Button
                    size="small"
                    variant="text"
                    startIcon={<RestartAltRounded />}
                    onClick={() => {
                      setSearchTerm("");
                      setSelectedDate("");
                      setSelectedProjectType("ALL");
                    }}
                    sx={{ color: "#ef4444", fontWeight: 700, textTransform: "none", whiteSpace: "nowrap" }}
                  >
                    Reset
                  </Button>
                </Grid>
              )}
            </Grid>
          </Card>

          {/* User's Project Worksheets List */}
          {userFilteredWorksheets.length === 0 ? (
            <Paper
              elevation={0}
              sx={{
                p: 6,
                textAlign: "center",
                borderRadius: 3,
                border: isDark ? "1px dashed rgba(255,255,255,0.15)" : "1px dashed #cbd5e1",
                bgcolor: isDark ? "#0e1424" : "#ffffff",
              }}
            >
              <SolarPowerRounded sx={{ fontSize: 50, color: isDark ? "#475569" : "#94a3b8", mb: 1 }} />
              <Typography variant="h6" sx={{ fontWeight: 700, color: isDark ? "#f8fafc" : "#334155" }}>
                No worksheets match your filters
              </Typography>
              <Typography variant="body2" sx={{ color: isDark ? "#94a3b8" : "#64748b", mt: 0.5 }}>
                {searchTerm || selectedDate || selectedProjectType !== "ALL"
                  ? "Try resetting your search query or date filter."
                  : "No worksheets registered for this user yet."}
              </Typography>
            </Paper>
          ) : (
            <Stack spacing={2.5}>
              {userDisplayWorksheets.map((row) => {
                const isExpanded = !!expandedRows[row._id];
                const isGroup = !!row.isDateGroup;
                const submittedBy = row.submittedBy || personName(row.user);
                const isSup = row.isSup !== undefined ? row.isSup : isSupervisorSubmitter(row.user);
                const submitterRoleLabel = row.submitterRoleLabel || (isSup ? "Supervisor" : "Incharge");
                const workDate = row.formattedDate || formatDate(row.workDate || row.createdAt);
                const submissionTime = row.submissionTime || getWorksheetTimestamp(row);
                const supervisorNames = row.supervisorNames || uniqueSupervisorNames(row.projects);
                const incharges = row.inchargeNames || uniqueInchargeNames(row.projects);
                const projectCount = row.projects?.length || 0;
                const reportsCount = row.worksheets ? row.worksheets.length : 1;

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
                    capturedAt: ph.capturedAt || p.createdAt || row.createdAt,
                  }))
                );

                return (
                  <Card
                    key={row._id}
                    elevation={0}
                    sx={{
                      borderRadius: 3,
                      border: isDark ? "1px solid rgba(255, 255, 255, 0.08)" : "1px solid #e2e8f0",
                      bgcolor: isDark ? "#0e1424" : "#ffffff",
                      overflow: "hidden",
                      transition: "box-shadow 0.2s ease",
                      "&:hover": {
                        boxShadow: isDark ? "0 8px 24px rgba(0, 0, 0, 0.4)" : "0 6px 20px rgba(15, 23, 42, 0.08)",
                      },
                    }}
                  >
                    {/* CARD TOP BAR - DATE AND TIME PROMINENT */}
                    <Box
                      sx={{
                        p: { xs: 2, sm: 2.5 },
                        bgcolor: isExpanded ? (isDark ? "#111a30" : "#f8fafc") : (isDark ? "#0e1424" : "#ffffff"),
                        borderBottom: isExpanded ? (isDark ? "1px solid rgba(255, 255, 255, 0.08)" : "1px solid #e2e8f0") : "none",
                      }}
                    >
                      <Grid container spacing={2} alignItems="center">
                        {/* Left: Date & Time */}
                        <Grid item xs={12} sm={3.5}>
                          <Stack direction="row" spacing={1.5} alignItems="center">
                            <Avatar
                              sx={{
                                bgcolor: isDark ? "rgba(37,99,235,0.2)" : "#eff6ff",
                                color: isDark ? "#60a5fa" : "#004792",
                                width: 44,
                                height: 44,
                                borderRadius: 2.5,
                              }}
                            >
                              <CalendarTodayRounded sx={{ fontSize: 20 }} />
                            </Avatar>
                            <Box>
                              <Typography variant="subtitle1" sx={{ fontWeight: 800, color: isDark ? "#f8fafc" : "#0f2f57", lineHeight: 1.2 }}>
                                {workDate}
                              </Typography>
                              <Stack direction="row" spacing={0.8} alignItems="center" sx={{ mt: 0.5, flexWrap: "wrap", gap: 0.6 }}>
                                <Chip
                                  size="small"
                                  label={`${projectCount} ${projectCount === 1 ? "Project" : "Projects"}`}
                                  sx={{
                                    height: 22,
                                    fontSize: "0.72rem",
                                    fontWeight: 800,
                                    bgcolor: isDark ? "rgba(255,255,255,0.08)" : "#f1f5f9",
                                    color: isDark ? "#f8fafc" : "#1e293b",
                                  }}
                                />
                                {reportsCount > 1 && (
                                  <Chip
                                    size="small"
                                    label={`${reportsCount} Reports Combined`}
                                    sx={{
                                      height: 22,
                                      fontSize: "0.70rem",
                                      fontWeight: 800,
                                      bgcolor: isDark ? "rgba(5,150,105,0.2)" : "#ecfdf5",
                                      color: isDark ? "#34d399" : "#047857",
                                      border: isDark ? "1px solid rgba(5,150,105,0.4)" : "1px solid #a7f3d0",
                                    }}
                                  />
                                )}
                                <Chip
                                  size="small"
                                  icon={<AccessTimeRounded sx={{ fontSize: "13px !important", color: isDark ? "#38bdf8" : "#0369a1" }} />}
                                  label={submissionTime}
                                  sx={{
                                    height: 22,
                                    fontSize: "0.72rem",
                                    fontWeight: 800,
                                    bgcolor: isDark ? "rgba(2,132,199,0.2)" : "#e0f2fe",
                                    color: isDark ? "#38bdf8" : "#0369a1",
                                    border: isDark ? "1px solid rgba(2,132,199,0.4)" : "1px solid #bae6fd",
                                  }}
                                />
                                {Boolean(row.hasMissedProject || row.missedForDate || row.projects?.some(p => p.isMissedProject || p.missedForDate)) && (
                                  <Chip
                                    size="small"
                                    label="Missed Project"
                                    sx={{
                                      height: 22,
                                      fontSize: "0.70rem",
                                      fontWeight: 800,
                                      bgcolor: isDark ? "rgba(245,158,11,0.2)" : "#fef3c7",
                                      color: isDark ? "#fbbf24" : "#b45309",
                                      border: isDark ? "1px solid rgba(245,158,11,0.4)" : "1px solid #fcd34d",
                                    }}
                                  />
                                )}
                              </Stack>
                            </Box>
                          </Stack>
                        </Grid>

                        {/* Middle: Submitter (Who Submitted the Report) */}
                        <Grid item xs={12} sm={5.5}>
                          <Box
                            sx={{
                              bgcolor: isDark
                                ? (isSup ? "rgba(202, 138, 4, 0.15)" : "rgba(22, 163, 74, 0.15)")
                                : (isSup ? "#fefce8" : "#f0fdf4"),
                              p: 1.1,
                              px: 1.6,
                              borderRadius: 2,
                              border: isDark
                                ? (isSup ? "1px solid rgba(202, 138, 4, 0.3)" : "1px solid rgba(22, 163, 74, 0.3)")
                                : `1px solid ${isSup ? "#fef08a" : "#bbf7d0"}`,
                            }}
                          >
                            <Stack direction="row" spacing={0.6} alignItems="center">
                              {isSup ? (
                                <ShieldRounded sx={{ fontSize: 16, color: isDark ? "#fbbf24" : "#ca8a04" }} />
                              ) : (
                                <PersonRounded sx={{ fontSize: 16, color: isDark ? "#4ade80" : "#16a34a" }} />
                              )}
                              <Typography
                                variant="caption"
                                sx={{ color: isDark ? (isSup ? "#fbbf24" : "#4ade80") : (isSup ? "#854d0e" : "#166534"), fontWeight: 700, fontSize: "0.72rem" }}
                              >
                                Submitted By ({submitterRoleLabel})
                              </Typography>
                            </Stack>
                            <Tooltip title={submittedBy} arrow>
                              <Typography
                                variant="body2"
                                sx={{
                                  fontWeight: 700,
                                  color: isDark ? "#f8fafc" : "#0f2f57",
                                  mt: 0.2,
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                  fontSize: "0.85rem",
                                  cursor: "default",
                                }}
                              >
                                {submittedBy}
                              </Typography>
                            </Tooltip>
                          </Box>
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
                                bgcolor: isDark ? "#2563eb" : "#004792",
                                boxShadow: "0 2px 8px rgba(0, 71, 146, 0.3)",
                                "&:hover": { bgcolor: isDark ? "#1d4ed8" : "#003366" },
                              }}
                            >
                              Download PDF
                            </Button>
                            <IconButton
                              onClick={() => toggleRow(row._id)}
                              sx={{
                                bgcolor: isDark ? "rgba(255,255,255,0.08)" : "#f1f5f9",
                                color: isDark ? "#f8fafc" : "#334155",
                                "&:hover": { bgcolor: isDark ? "rgba(255,255,255,0.15)" : "#e2e8f0" },
                              }}
                            >
                              {isExpanded ? <ExpandLessRounded /> : <ExpandMoreRounded />}
                            </IconButton>
                          </Stack>
                        </Grid>
                      </Grid>
                    </Box>

                    {/* EXPANDED CONTENT */}
                    <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                      <CardContent sx={{ p: { xs: 2, sm: 3 }, bgcolor: isDark ? "#0b1120" : "#ffffff" }}>
                        {/* SECTION 1: PROJECTS TABLE WITH DATE AND TIME */}
                        <Box sx={{ mb: 3.5 }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 800, color: isDark ? "#f8fafc" : "#0f2f57", mb: 1.5 }}>
                            Projects Execution Breakdown ({projectCount})
                          </Typography>
                          <TableContainer component={Paper} elevation={0} sx={{ border: isDark ? "1px solid rgba(255, 255, 255, 0.08)" : "1px solid #e2e8f0", borderRadius: 2, bgcolor: isDark ? "#090d16" : "#ffffff" }}>
                            <Table size="small">
                              <TableHead sx={{ bgcolor: isDark ? "#1d4ed8" : "#004792" }}>
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
                                  <TableRow key={project._id || idx} hover sx={{ "&:nth-of-type(even)": { bgcolor: isDark ? "rgba(255,255,255,0.02)" : "#f8fafc" } }}>
                                    <TableCell sx={{ fontWeight: 700, color: isDark ? "#cbd5e1" : "inherit", borderColor: isDark ? "rgba(255,255,255,0.06)" : undefined }}>{idx + 1}</TableCell>
                                    <TableCell sx={{ whiteSpace: "nowrap", fontSize: "0.8rem", color: isDark ? "#94a3b8" : "#64748b", fontWeight: 700, borderColor: isDark ? "rgba(255,255,255,0.06)" : undefined }}>
                                      <Stack direction="row" spacing={0.5} alignItems="center">
                                        <AccessTimeRounded sx={{ fontSize: 13, color: "#0284c7" }} />
                                        <span>{getProjectTimestamp(project, row)}</span>
                                      </Stack>
                                    </TableCell>
                                    <TableCell sx={{ borderColor: isDark ? "rgba(255,255,255,0.06)" : undefined }}>
                                      <Chip
                                        size="small"
                                        label={text(project.projectType)}
                                        sx={{
                                          fontSize: "0.72rem",
                                          fontWeight: 700,
                                          bgcolor: isDark ? "rgba(2,132,199,0.2)" : "#e0f2fe",
                                          color: isDark ? "#38bdf8" : "#0369a1",
                                        }}
                                      />
                                    </TableCell>
                                    <TableCell sx={{ fontWeight: 700, color: isDark ? "#f8fafc" : "#0f2f57", borderColor: isDark ? "rgba(255,255,255,0.06)" : undefined }}>
                                      {text(project.consumerName || project.siteLocation)}
                                    </TableCell>
                                    <TableCell sx={{ fontFamily: "monospace", fontSize: "0.8rem", color: isDark ? "#cbd5e1" : "inherit", borderColor: isDark ? "rgba(255,255,255,0.06)" : undefined }}>
                                      {text(project.consumerAccountNo)}
                                    </TableCell>
                                    <TableCell sx={{ color: isDark ? "#cbd5e1" : "inherit", borderColor: isDark ? "rgba(255,255,255,0.06)" : undefined }}>{text(project.capacityKw ? `${project.capacityKw} KW` : "-")}</TableCell>
                                    <TableCell sx={{ color: isDark ? "#cbd5e1" : "inherit", borderColor: isDark ? "rgba(255,255,255,0.06)" : undefined }}>{text(project.installationDay ? `${project.installationDay} Days` : "-")}</TableCell>
                                    <TableCell sx={{ fontWeight: 600, color: isDark ? "#facc15" : "#854d0e", borderColor: isDark ? "rgba(255,255,255,0.06)" : undefined }}>
                                      {personName(project.supervisor)}
                                    </TableCell>
                                    <TableCell sx={{ fontWeight: 700, color: isDark ? "#60a5fa" : "#1d4ed8", borderColor: isDark ? "rgba(255,255,255,0.06)" : undefined }}>
                                      {inchargeNames(project)}
                                    </TableCell>
                                    <TableCell sx={{ maxWidth: 180, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: isDark ? "#cbd5e1" : "inherit", borderColor: isDark ? "rgba(255,255,255,0.06)" : undefined }}>
                                      <Tooltip title={text(project.address || project.siteLocation || project.gpsLocation?.address)}>
                                        <span>{text(project.address || project.siteLocation || project.gpsLocation?.address)}</span>
                                      </Tooltip>
                                    </TableCell>
                                    <TableCell sx={{ maxWidth: 160, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: isDark ? "#cbd5e1" : "inherit", borderColor: isDark ? "rgba(255,255,255,0.06)" : undefined }}>
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
                            <Typography variant="subtitle2" sx={{ fontWeight: 800, color: isDark ? "#f8fafc" : "#0f2f57" }}>
                              Site Geo-Tagged Photographs ({allPhotos.length})
                            </Typography>
                          </Stack>

                          {allPhotos.length === 0 ? (
                            <Box
                              sx={{
                                p: 3,
                                textAlign: "center",
                                borderRadius: 2,
                                bgcolor: isDark ? "rgba(255,255,255,0.02)" : "#f8fafc",
                                border: isDark ? "1px dashed rgba(255,255,255,0.1)" : "1px dashed #cbd5e1",
                              }}
                            >
                              <Typography variant="body2" sx={{ color: isDark ? "#64748b" : "#94a3b8" }}>
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
                                        border: isDark ? "1px solid rgba(255, 255, 255, 0.08)" : "1px solid #e2e8f0",
                                        bgcolor: isDark ? "#0e1424" : "#ffffff",
                                        overflow: "hidden",
                                        transition: "transform 0.15s ease, box-shadow 0.15s ease",
                                        "&:hover": {
                                          transform: "translateY(-3px)",
                                          boxShadow: isDark ? "0 8px 24px rgba(0, 0, 0, 0.5)" : "0 8px 24px rgba(15, 23, 42, 0.1)",
                                        },
                                      }}
                                    >
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

                                      <Box sx={{ p: 1.8 }}>
                                        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: isDark ? "#f8fafc" : "#0f2f57", lineHeight: 1.2 }}>
                                          {photo.projectName}
                                        </Typography>
                                        <Typography variant="caption" sx={{ color: isDark ? "#94a3b8" : "#64748b", display: "block", mt: 0.4 }}>
                                          Incharge(s): <strong style={{ color: isDark ? "#60a5fa" : "#1d4ed8" }}>{photo.incharge}</strong>
                                        </Typography>
                                        {photo.address && (
                                          <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 0.3 }}>
                                            <FmdGoodRounded sx={{ fontSize: 13, color: isDark ? "#64748b" : "#64748b", flexShrink: 0 }} />
                                            <Typography
                                              variant="caption"
                                              noWrap
                                              sx={{
                                                color: isDark ? "#cbd5e1" : "#475569",
                                                display: "block",
                                              }}
                                            >
                                              {photo.address}
                                            </Typography>
                                          </Stack>
                                        )}
                                        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 1.2 }}>
                                          <Stack direction="row" spacing={0.5} alignItems="center">
                                            <AccessTimeRounded sx={{ fontSize: 13, color: "#0284c7" }} />
                                            <Typography variant="caption" sx={{ color: "#0284c7", fontSize: "0.72rem", fontWeight: 700 }}>
                                              {formatDate(photo.capturedAt)} {formatTime(photo.capturedAt)}
                                            </Typography>
                                          </Stack>
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
        </Box>
      )}

      {/* ─── CASE 3: ALL WORKSHEETS VIEW (Flat List across all roles) ─── */}
      {roleTab === "ALL" && (
        <Box sx={{ mb: 4 }}>
          {/* Search Input and Filter Action Row */}
          <Card
            elevation={0}
            sx={{
              p: 2,
              mb: 3,
              borderRadius: 3,
              border: isDark ? "1px solid rgba(255, 255, 255, 0.08)" : "1px solid #e2e8f0",
              bgcolor: isDark ? "#0e1424" : "#ffffff",
              boxShadow: isDark ? "0 4px 16px rgba(0, 0, 0, 0.2)" : "0 2px 8px rgba(15, 23, 42, 0.04)",
            }}
          >
            <Stack spacing={2}>
              <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} alignItems="center">
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Search by Employee, Supervisor, Incharge, Consumer, A/C No, or Location..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchRounded sx={{ color: isDark ? "#64748b" : "#94a3b8" }} />
                      </InputAdornment>
                    ),
                    sx: { borderRadius: 2, bgcolor: isDark ? "#060a12" : "#f8fafc", color: isDark ? "#f8fafc" : "inherit" },
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
                    bgcolor: showFilters || activeFilterCount > 0 ? (isDark ? "#2563eb" : "#0f2f57") : (isDark ? "#0e1424" : "#fff"),
                    color: showFilters || activeFilterCount > 0 ? "#fff" : (isDark ? "#f8fafc" : "#334155"),
                    borderColor: isDark ? "rgba(255,255,255,0.15)" : "#cbd5e1",
                    "&:hover": {
                      bgcolor: showFilters || activeFilterCount > 0 ? (isDark ? "#1d4ed8" : "#0a1f3a") : (isDark ? "#131b30" : "#f1f5f9"),
                      borderColor: isDark ? "rgba(255,255,255,0.25)" : "#94a3b8",
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
                      "&:hover": { bgcolor: isDark ? "rgba(239,68,68,0.1)" : "#fef2f2" },
                    }}
                  >
                    Reset
                  </Button>
                )}
              </Stack>

              {/* Collapsible Filter Panel */}
              <Collapse in={showFilters}>
                <Divider sx={{ my: 1.5, borderColor: isDark ? "rgba(255,255,255,0.08)" : "#e2e8f0" }} />
                <Grid container spacing={1.5} alignItems="center">
                  {/* Supervisor Dropdown */}
                  <Grid item xs={12} sm={6} md={3}>
                    <FormControl fullWidth size="small">
                      <InputLabel id="sup-filter-label" sx={{ fontSize: "0.85rem", color: isDark ? "#94a3b8" : "#64748b" }}>
                        Supervisor
                      </InputLabel>
                      <Select
                        labelId="sup-filter-label"
                        label="Supervisor"
                        value={selectedSupervisor}
                        onChange={(e) => setSelectedSupervisor(e.target.value)}
                        sx={{ borderRadius: 2, bgcolor: isDark ? "#060a12" : "#f8fafc", fontSize: "0.85rem", color: isDark ? "#f8fafc" : "inherit" }}
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
                      <InputLabel id="inc-filter-label" sx={{ fontSize: "0.85rem", color: isDark ? "#94a3b8" : "#64748b" }}>
                        Incharge
                      </InputLabel>
                      <Select
                        labelId="inc-filter-label"
                        label="Incharge"
                        value={selectedIncharge}
                        onChange={(e) => setSelectedIncharge(e.target.value)}
                        sx={{ borderRadius: 2, bgcolor: isDark ? "#060a12" : "#f8fafc", fontSize: "0.85rem", color: isDark ? "#f8fafc" : "inherit" }}
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
                      <InputLabel id="proj-type-filter-label" sx={{ fontSize: "0.85rem", color: isDark ? "#94a3b8" : "#64748b" }}>
                        Project Type
                      </InputLabel>
                      <Select
                        labelId="proj-type-filter-label"
                        label="Project Type"
                        value={selectedProjectType}
                        onChange={(e) => setSelectedProjectType(e.target.value)}
                        sx={{ borderRadius: 2, bgcolor: isDark ? "#060a12" : "#f8fafc", fontSize: "0.85rem", color: isDark ? "#f8fafc" : "inherit" }}
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
                      sx={{ borderRadius: 2, bgcolor: isDark ? "#060a12" : "#f8fafc", "& input": { fontSize: "0.85rem", color: isDark ? "#f8fafc" : "inherit" } }}
                    />
                  </Grid>
                </Grid>
              </Collapse>
            </Stack>
          </Card>

          {/* All Worksheets List */}
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
                border: isDark ? "1px dashed rgba(255, 255, 255, 0.15)" : "1px dashed #cbd5e1",
                bgcolor: isDark ? "#0e1424" : "#ffffff",
              }}
            >
              <SolarPowerRounded sx={{ fontSize: 50, color: isDark ? "#64748b" : "#94a3b8", mb: 1 }} />
              <Typography variant="h6" sx={{ fontWeight: 700, color: isDark ? "#f8fafc" : "#334155" }}>
                No worksheets found
              </Typography>
              <Typography variant="body2" sx={{ color: isDark ? "#94a3b8" : "#64748b", mt: 0.5 }}>
                {searchTerm
                  ? "No worksheets match your current search query."
                  : "No approved worksheets have been registered yet."}
              </Typography>
            </Paper>
          ) : (
            <Stack spacing={2.5}>
              {allDisplayWorksheets.map((row) => {
                const isExpanded = !!expandedRows[row._id];
                const isGroup = !!row.isDateGroup;
                const submittedBy = row.submittedBy || personName(row.user);
                const isSup = row.isSup !== undefined ? row.isSup : isSupervisorSubmitter(row.user);
                const submitterRoleLabel = row.submitterRoleLabel || (isSup ? "Supervisor" : "Incharge");
                const workDate = row.formattedDate || formatDate(row.workDate || row.createdAt);
                const submissionTime = row.submissionTime || getWorksheetTimestamp(row);
                const supervisorNames = row.supervisorNames || uniqueSupervisorNames(row.projects);
                const incharges = row.inchargeNames || uniqueInchargeNames(row.projects);
                const projectCount = row.projects?.length || 0;
                const reportsCount = row.worksheets ? row.worksheets.length : 1;

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
                    capturedAt: ph.capturedAt || p.createdAt || row.createdAt,
                  }))
                );

                return (
                  <Card
                    key={row._id}
                    elevation={0}
                    sx={{
                      borderRadius: 3,
                      border: isDark ? "1px solid rgba(255, 255, 255, 0.08)" : "1px solid #e2e8f0",
                      bgcolor: isDark ? "#0e1424" : "#ffffff",
                      overflow: "hidden",
                      transition: "box-shadow 0.2s ease",
                      "&:hover": {
                        boxShadow: isDark
                          ? "0 6px 20px rgba(0, 0, 0, 0.4)"
                          : "0 6px 20px rgba(15, 23, 42, 0.08)",
                      },
                    }}
                  >
                    {/* CARD TOP BAR - DATE AND TIME PROMINENT */}
                    <Box
                      sx={{
                        p: { xs: 2, sm: 2.5 },
                        bgcolor: isExpanded ? (isDark ? "#111a30" : "#f8fafc") : (isDark ? "#0e1424" : "#ffffff"),
                        borderBottom: isExpanded ? (isDark ? "1px solid rgba(255, 255, 255, 0.08)" : "1px solid #e2e8f0") : "none",
                      }}
                    >
                      <Grid container spacing={2} alignItems="center">
                        {/* Left: Date & Time */}
                        <Grid item xs={12} sm={3.5}>
                          <Stack direction="row" spacing={1.5} alignItems="center">
                            <Avatar
                              sx={{
                                bgcolor: isDark ? "rgba(37, 99, 235, 0.2)" : "#eff6ff",
                                color: isDark ? "#60a5fa" : "#004792",
                                width: 44,
                                height: 44,
                                borderRadius: 2.5,
                              }}
                            >
                              <CalendarTodayRounded sx={{ fontSize: 20 }} />
                            </Avatar>
                            <Box>
                              <Typography variant="subtitle1" sx={{ fontWeight: 800, color: isDark ? "#f8fafc" : "#0f2f57", lineHeight: 1.2 }}>
                                {workDate}
                              </Typography>
                              <Stack direction="row" spacing={0.8} alignItems="center" sx={{ mt: 0.5, flexWrap: "wrap", gap: 0.6 }}>
                                <Chip
                                  size="small"
                                  label={`${projectCount} ${projectCount === 1 ? "Project" : "Projects"}`}
                                  sx={{
                                    height: 22,
                                    fontSize: "0.72rem",
                                    fontWeight: 700,
                                    bgcolor: isDark ? "rgba(255, 255, 255, 0.06)" : "#f1f5f9",
                                    color: isDark ? "#cbd5e1" : "#475569",
                                  }}
                                />
                                <Chip
                                  size="small"
                                  icon={<AccessTimeRounded sx={{ fontSize: "13px !important", color: isDark ? "#38bdf8" : "#0369a1" }} />}
                                  label={submissionTime}
                                  sx={{
                                    height: 22,
                                    fontSize: "0.72rem",
                                    fontWeight: 800,
                                    bgcolor: isDark ? "rgba(56, 189, 248, 0.15)" : "#e0f2fe",
                                    color: isDark ? "#38bdf8" : "#0369a1",
                                    border: isDark ? "1px solid rgba(56, 189, 248, 0.3)" : "1px solid #bae6fd",
                                  }}
                                />
                                {Boolean(row.hasMissedProject || row.missedForDate || row.projects?.some(p => p.isMissedProject || p.missedForDate)) && (
                                  <Chip
                                    size="small"
                                    label="Missed Project"
                                    sx={{
                                      height: 22,
                                      fontSize: "0.70rem",
                                      fontWeight: 800,
                                      bgcolor: isDark ? "rgba(245, 158, 11, 0.15)" : "#fef3c7",
                                      color: isDark ? "#fbbf24" : "#b45309",
                                      border: isDark ? "1px solid rgba(245, 158, 11, 0.3)" : "1px solid #fcd34d",
                                    }}
                                  />
                                )}
                              </Stack>
                            </Box>
                          </Stack>
                        </Grid>

                        {/* Middle: Submitter (Who Submitted the Report) */}
                        <Grid item xs={12} sm={5.5}>
                          <Box
                            onClick={() => !isGroup && openUserDetail(submittedBy, isSup ? "SUPERVISOR" : "INCHARGE")}
                            sx={{
                              bgcolor: isDark
                                ? isSup
                                  ? "rgba(202, 138, 4, 0.12)"
                                  : "rgba(22, 163, 74, 0.12)"
                                : isSup
                                ? "#fefce8"
                                : "#f0fdf4",
                              p: 1.1,
                              px: 1.6,
                              borderRadius: 2,
                              border: `1px solid ${
                                isDark
                                  ? isSup
                                    ? "rgba(202, 138, 4, 0.3)"
                                    : "rgba(22, 163, 74, 0.3)"
                                  : isSup
                                  ? "#fef08a"
                                  : "#bbf7d0"
                              }`,
                              cursor: !isGroup ? "pointer" : "default",
                              transition: "all 0.15s ease",
                              "&:hover": !isGroup ? {
                                transform: "translateY(-1px)",
                                boxShadow: isDark ? "0 2px 8px rgba(0,0,0,0.3)" : "0 2px 8px rgba(0,0,0,0.06)",
                                borderColor: isSup ? "#eab308" : "#22c55e",
                              } : {},
                            }}
                          >
                            <Stack direction="row" spacing={0.6} alignItems="center">
                              {isSup ? (
                                <ShieldRounded sx={{ fontSize: 16, color: isDark ? "#facc15" : "#ca8a04" }} />
                              ) : (
                                <PersonRounded sx={{ fontSize: 16, color: isDark ? "#4ade80" : "#16a34a" }} />
                              )}
                              <Typography
                                variant="caption"
                                sx={{ color: isDark ? (isSup ? "#fef08a" : "#bbf7d0") : (isSup ? "#854d0e" : "#166534"), fontWeight: 700, fontSize: "0.72rem" }}
                              >
                                Submitted By ({submitterRoleLabel})
                              </Typography>
                            </Stack>
                            <Tooltip title={submittedBy} arrow>
                              <Typography
                                variant="body2"
                                sx={{
                                  fontWeight: 700,
                                  color: isDark ? "#f8fafc" : "#0f2f57",
                                  mt: 0.2,
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                  fontSize: "0.85rem",
                                }}
                              >
                                {submittedBy}
                              </Typography>
                            </Tooltip>
                          </Box>
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
                                bgcolor: isDark ? "#2563eb" : "#004792",
                                boxShadow: "0 2px 8px rgba(0, 71, 146, 0.3)",
                                "&:hover": { bgcolor: isDark ? "#1d4ed8" : "#003366" },
                              }}
                            >
                              Download PDF
                            </Button>
                            <IconButton
                              onClick={() => toggleRow(row._id)}
                              sx={{
                                bgcolor: isDark ? "rgba(255, 255, 255, 0.08)" : "#f1f5f9",
                                color: isDark ? "#f8fafc" : "#334155",
                                "&:hover": { bgcolor: isDark ? "rgba(255, 255, 255, 0.15)" : "#e2e8f0" },
                              }}
                            >
                              {isExpanded ? <ExpandLessRounded /> : <ExpandMoreRounded />}
                            </IconButton>
                          </Stack>
                        </Grid>
                      </Grid>
                    </Box>

                    {/* EXPANDED CONTENT */}
                    <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                      <CardContent sx={{ p: { xs: 2, sm: 3 }, bgcolor: isDark ? "#0b1120" : "#ffffff" }}>
                        {/* SECTION 1: PROJECTS TABLE WITH DATE AND TIME */}
                        <Box sx={{ mb: 3.5 }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 800, color: isDark ? "#f8fafc" : "#0f2f57", mb: 1.5 }}>
                            Projects Execution Breakdown ({projectCount})
                          </Typography>
                          <TableContainer component={Paper} elevation={0} sx={{ border: isDark ? "1px solid rgba(255, 255, 255, 0.08)" : "1px solid #e2e8f0", borderRadius: 2, bgcolor: isDark ? "#090d16" : "#ffffff" }}>
                            <Table size="small">
                              <TableHead sx={{ bgcolor: isDark ? "#1d4ed8" : "#004792" }}>
                                <TableRow>
                                  <TableCell sx={{ color: "#fff", fontWeight: 700, fontSize: "0.75rem", borderColor: isDark ? "rgba(255,255,255,0.08)" : undefined }}>#</TableCell>
                                  <TableCell sx={{ color: "#fff", fontWeight: 700, fontSize: "0.75rem", borderColor: isDark ? "rgba(255,255,255,0.08)" : undefined }}>Time</TableCell>
                                  <TableCell sx={{ color: "#fff", fontWeight: 700, fontSize: "0.75rem", borderColor: isDark ? "rgba(255,255,255,0.08)" : undefined }}>Project Type</TableCell>
                                  <TableCell sx={{ color: "#fff", fontWeight: 700, fontSize: "0.75rem", borderColor: isDark ? "rgba(255,255,255,0.08)" : undefined }}>Consumer Name</TableCell>
                                  <TableCell sx={{ color: "#fff", fontWeight: 700, fontSize: "0.75rem", borderColor: isDark ? "rgba(255,255,255,0.08)" : undefined }}>A/C No.</TableCell>
                                  <TableCell sx={{ color: "#fff", fontWeight: 700, fontSize: "0.75rem", borderColor: isDark ? "rgba(255,255,255,0.08)" : undefined }}>Capacity</TableCell>
                                  <TableCell sx={{ color: "#fff", fontWeight: 700, fontSize: "0.75rem", borderColor: isDark ? "rgba(255,255,255,0.08)" : undefined }}>Install Day</TableCell>
                                  <TableCell sx={{ color: "#fff", fontWeight: 700, fontSize: "0.75rem", borderColor: isDark ? "rgba(255,255,255,0.08)" : undefined }}>Supervisor</TableCell>
                                  <TableCell sx={{ color: "#fff", fontWeight: 700, fontSize: "0.75rem", borderColor: isDark ? "rgba(255,255,255,0.08)" : undefined }}>Incharge(s)</TableCell>
                                  <TableCell sx={{ color: "#fff", fontWeight: 700, fontSize: "0.75rem", borderColor: isDark ? "rgba(255,255,255,0.08)" : undefined }}>Location</TableCell>
                                  <TableCell sx={{ color: "#fff", fontWeight: 700, fontSize: "0.75rem", borderColor: isDark ? "rgba(255,255,255,0.08)" : undefined }}>Report</TableCell>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {(row.projects || []).map((project, idx) => (
                                  <TableRow key={project._id || idx} hover sx={{ "&:nth-of-type(even)": { bgcolor: isDark ? "rgba(255, 255, 255, 0.02)" : "#f8fafc" } }}>
                                    <TableCell sx={{ fontWeight: 700, color: isDark ? "#cbd5e1" : "inherit", borderColor: isDark ? "rgba(255,255,255,0.06)" : undefined }}>{idx + 1}</TableCell>
                                    <TableCell sx={{ whiteSpace: "nowrap", fontSize: "0.8rem", color: isDark ? "#94a3b8" : "#64748b", fontWeight: 700, borderColor: isDark ? "rgba(255,255,255,0.06)" : undefined }}>
                                      <Stack direction="row" spacing={0.5} alignItems="center">
                                        <AccessTimeRounded sx={{ fontSize: 13, color: isDark ? "#38bdf8" : "#0284c7" }} />
                                        <span>{getProjectTimestamp(project, row)}</span>
                                      </Stack>
                                    </TableCell>
                                    <TableCell sx={{ borderColor: isDark ? "rgba(255,255,255,0.06)" : undefined }}>
                                      <Chip
                                        size="small"
                                        label={text(project.projectType)}
                                        sx={{
                                          fontSize: "0.72rem",
                                          fontWeight: 700,
                                          bgcolor: isDark ? "rgba(56, 189, 248, 0.15)" : "#e0f2fe",
                                          color: isDark ? "#38bdf8" : "#0369a1",
                                        }}
                                      />
                                    </TableCell>
                                    <TableCell sx={{ fontWeight: 700, color: isDark ? "#f8fafc" : "#0f2f57", borderColor: isDark ? "rgba(255,255,255,0.06)" : undefined }}>
                                      {text(project.consumerName || project.siteLocation)}
                                    </TableCell>
                                    <TableCell sx={{ fontFamily: "monospace", fontSize: "0.8rem", color: isDark ? "#cbd5e1" : "inherit", borderColor: isDark ? "rgba(255,255,255,0.06)" : undefined }}>
                                      {text(project.consumerAccountNo)}
                                    </TableCell>
                                    <TableCell sx={{ color: isDark ? "#cbd5e1" : "inherit", borderColor: isDark ? "rgba(255,255,255,0.06)" : undefined }}>{text(project.capacityKw ? `${project.capacityKw} KW` : "-")}</TableCell>
                                    <TableCell sx={{ color: isDark ? "#cbd5e1" : "inherit", borderColor: isDark ? "rgba(255,255,255,0.06)" : undefined }}>{text(project.installationDay ? `${project.installationDay} Days` : "-")}</TableCell>
                                    <TableCell sx={{ fontWeight: 600, color: isDark ? "#fde047" : "#854d0e", borderColor: isDark ? "rgba(255,255,255,0.06)" : undefined }}>
                                      {personName(project.supervisor)}
                                    </TableCell>
                                    <TableCell sx={{ fontWeight: 700, color: isDark ? "#60a5fa" : "#1d4ed8", borderColor: isDark ? "rgba(255,255,255,0.06)" : undefined }}>
                                      {inchargeNames(project)}
                                    </TableCell>
                                    <TableCell sx={{ maxWidth: 180, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: isDark ? "#cbd5e1" : "inherit", borderColor: isDark ? "rgba(255,255,255,0.06)" : undefined }}>
                                      <Tooltip title={text(project.address || project.siteLocation || project.gpsLocation?.address)}>
                                        <span>{text(project.address || project.siteLocation || project.gpsLocation?.address)}</span>
                                      </Tooltip>
                                    </TableCell>
                                    <TableCell sx={{ maxWidth: 160, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: isDark ? "#cbd5e1" : "inherit", borderColor: isDark ? "rgba(255,255,255,0.06)" : undefined }}>
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
                            <Typography variant="subtitle2" sx={{ fontWeight: 800, color: isDark ? "#f8fafc" : "#0f2f57" }}>
                              Site Geo-Tagged Photographs ({allPhotos.length})
                            </Typography>
                          </Stack>

                          {allPhotos.length === 0 ? (
                            <Box
                              sx={{
                                p: 3,
                                textAlign: "center",
                                borderRadius: 2,
                                bgcolor: isDark ? "#090d16" : "#f8fafc",
                                border: isDark ? "1px dashed rgba(255, 255, 255, 0.15)" : "1px dashed #cbd5e1",
                              }}
                            >
                              <Typography variant="body2" sx={{ color: isDark ? "#64748b" : "#94a3b8" }}>
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
                                        border: isDark ? "1px solid rgba(255, 255, 255, 0.08)" : "1px solid #e2e8f0",
                                        bgcolor: isDark ? "#0e1424" : "#ffffff",
                                        overflow: "hidden",
                                        transition: "transform 0.15s ease, box-shadow 0.15s ease",
                                        "&:hover": {
                                          transform: "translateY(-3px)",
                                          boxShadow: isDark ? "0 8px 24px rgba(0, 0, 0, 0.4)" : "0 8px 24px rgba(15, 23, 42, 0.1)",
                                        },
                                      }}
                                    >
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

                                      <Box sx={{ p: 1.8 }}>
                                        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: isDark ? "#f8fafc" : "#0f2f57", lineHeight: 1.2 }}>
                                          {photo.projectName}
                                        </Typography>
                                        <Typography variant="caption" sx={{ color: isDark ? "#94a3b8" : "#64748b", display: "block", mt: 0.4 }}>
                                          Incharge(s): <strong style={{ color: isDark ? "#60a5fa" : "#1d4ed8" }}>{photo.incharge}</strong>
                                        </Typography>
                                        {photo.address && (
                                          <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 0.3 }}>
                                            <FmdGoodRounded sx={{ fontSize: 13, color: isDark ? "#94a3b8" : "#64748b", flexShrink: 0 }} />
                                            <Typography
                                              variant="caption"
                                              noWrap
                                              sx={{
                                                color: isDark ? "#cbd5e1" : "#475569",
                                                display: "block",
                                              }}
                                            >
                                              {photo.address}
                                            </Typography>
                                          </Stack>
                                        )}
                                        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 1.2 }}>
                                          <Stack direction="row" spacing={0.5} alignItems="center">
                                            <AccessTimeRounded sx={{ fontSize: 13, color: isDark ? "#38bdf8" : "#0284c7" }} />
                                            <Typography variant="caption" sx={{ color: isDark ? "#38bdf8" : "#0284c7", fontSize: "0.72rem", fontWeight: 700 }}>
                                              {formatDate(photo.capturedAt)} {formatTime(photo.capturedAt)}
                                            </Typography>
                                          </Stack>
                                          <Button
                                            size="small"
                                            variant="text"
                                            startIcon={<OpenInNewRounded sx={{ fontSize: "14px !important" }} />}
                                            onClick={() => setPreviewPhoto(photo)}
                                            sx={{ fontSize: "0.75rem", p: 0.3, textTransform: "none", fontWeight: 700, color: isDark ? "#60a5fa" : "#004792" }}
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
        </Box>
      )}

      {/* ─── PHOTO PREVIEW DIALOG ─── */}
      <Dialog
        open={Boolean(previewPhoto)}
        onClose={() => setPreviewPhoto(null)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            overflow: "hidden",
            bgcolor: isDark ? "#0e1424" : "#ffffff",
            border: isDark ? "1px solid rgba(255, 255, 255, 0.1)" : "none",
          },
        }}
      >
        {previewPhoto && (
          <>
            <DialogTitle
              sx={{
                bgcolor: isDark ? "#1d4ed8" : "#004792",
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
              <Box sx={{ p: 2.5, bgcolor: isDark ? "#0e1424" : "#ffffff" }}>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" sx={{ color: isDark ? "#94a3b8" : "#64748b", fontWeight: 700 }}>
                      CONSUMER & PROJECT
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 800, color: isDark ? "#f8fafc" : "#0f2f57" }}>
                      {previewPhoto.projectName}
                    </Typography>
                    <Typography variant="body2" sx={{ color: isDark ? "#cbd5e1" : "#475569" }}>
                      A/C No: {previewPhoto.consumerAccountNo || "N/A"} • Type: {previewPhoto.projectType || "General"}
                    </Typography>
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" sx={{ color: isDark ? "#94a3b8" : "#64748b", fontWeight: 700 }}>
                      ASSIGNED PERSONNEL (WHO IS WHO)
                    </Typography>
                    <Typography variant="body2" sx={{ color: isDark ? "#f8fafc" : "#0f2f57" }}>
                      <strong>Supervisor:</strong> {previewPhoto.supervisor}
                    </Typography>
                    <Typography variant="body2" sx={{ color: isDark ? "#60a5fa" : "#1d4ed8", fontWeight: 700 }}>
                      <strong>Incharge(s):</strong> {previewPhoto.incharge}
                    </Typography>
                  </Grid>

                  <Grid item xs={12}>
                    <Divider sx={{ my: 0.5, borderColor: isDark ? "rgba(255, 255, 255, 0.08)" : undefined }} />
                  </Grid>

                  <Grid item xs={12} sm={8}>
                    <Typography variant="caption" sx={{ color: isDark ? "#94a3b8" : "#64748b", fontWeight: 700 }}>
                      GPS LOCATION & ADDRESS
                    </Typography>
                    <Typography variant="body2" sx={{ color: isDark ? "#f8fafc" : "#0f2f57", fontWeight: 600 }}>
                      📍{" "}
                      {previewPhoto.latitude && previewPhoto.longitude
                        ? `${Number(previewPhoto.latitude).toFixed(6)}° N, ${Number(previewPhoto.longitude).toFixed(6)}° E`
                        : "Coordinates unavailable"}
                    </Typography>
                    <Typography variant="body2" sx={{ color: isDark ? "#94a3b8" : "#64748b", mt: 0.3 }}>
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
                          color: isDark ? "#60a5fa" : "#004792",
                          borderColor: isDark ? "rgba(96, 165, 250, 0.4)" : "#004792",
                          "&:hover": {
                            borderColor: isDark ? "#60a5fa" : "#003366",
                            bgcolor: isDark ? "rgba(96, 165, 250, 0.08)" : "transparent",
                          },
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