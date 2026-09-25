import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Alert, alpha, Autocomplete, Box, Button, Chip, CircularProgress, Dialog, Divider, FormControl,
  IconButton, InputLabel, MenuItem, Paper, Select, Stack, Switch,
  TextField, Typography, Tooltip, useTheme,
} from "@mui/material";
import {
  Add, ArrowBack, ArrowForward, BuildCircleOutlined, CalculateOutlined, DeleteOutline,
  DescriptionOutlined, HighlightOff, LayersOutlined, PaymentsOutlined,
  SettingsOutlined, TuneOutlined, VisibilityOutlined, VisibilityOffOutlined, VerifiedOutlined,
  CheckCircleOutline, InfoOutlined, Inventory2, Refresh, PhotoCameraOutlined, StarBorderOutlined,
} from "@mui/icons-material";
import { useAuth } from "../contexts/AuthContext";
import axiosInstance from "../utils/axiosConfig";
import { buildQuotationRecord, loadCurrentQuotation, upsertQuotation } from "../utils/quotationStorage";
import { LiveQuotationPane, QuotationProposalPreview } from "./Quotation";

// ─── constants ──────────────────────────────────────────────────────────────
const BRAND = "#2563eb";
const BRAND_LIGHT = "#e6f1fb";
const BRAND_TEXT = "#0c447c";

const steps = [
  { id: 1, label: "Customer & overview",  icon: <SettingsOutlined fontSize="small" /> },
  { id: 2, label: "System configuration", icon: <LayersOutlined fontSize="small" /> },
  { id: 3, label: "Warranty & BOS",       icon: <VerifiedOutlined fontSize="small" /> },
  { id: 4, label: "Financial",            icon: <CalculateOutlined fontSize="small" /> },
  { id: 5, label: "Payment schedule",     icon: <PaymentsOutlined fontSize="small" /> },
  { id: 6, label: "Testimonials",         icon: <StarBorderOutlined fontSize="small" /> },
  { id: 7, label: "Installation",         icon: <BuildCircleOutlined fontSize="small" /> },
  { id: 8, label: "Terms & conditions",   icon: <DescriptionOutlined fontSize="small" /> },
  { id: 9, label: "Sections to show",     icon: <VisibilityOutlined fontSize="small" /> },
];

const subsidyOptions     = ["No subsidy","PM Surya Ghar (First 2kW) (₹30,000/kW)","PM Surya Ghar (Additional 1kW) (₹30,000/kW)","PM Surya Ghar (Max for >3kW) (₹78,000)"];
const batteryBrands      = ["Luminous","Deye","UTL"];
const batteryTypes       = ["LFP","Lead Acid","Lithium-ion"];
const customerTypes      = ["Residential","Commercial"];
const salutations        = ["None","Mr.","Mrs.","Ms.","M/s"];
const systemTypes        = ["On-grid","Off-grid","Hybrid"];
const panelBrands        = ["Waaree Energies","Goldi Solar","Axitec Solar","Renewsys India","Panasonic Solar","EMVEE","Havells","Premier Energies","UTL","Adani Solar","Vikram Solar","Tata Power Solar"];
const panelCategories    = ["Bifacial","TopCon (N-Type)","Mono PERC","Polycrystalline"];
const inverterBrands     = ["Havells Solar","Luminous","Sungrow","Goodwe","Solis","Microtek","Polycab Solar","Deye Solar","Ksolar","Growatt","Fronius"];
const cableBrands        = ["Havells","Polycab","KEI Industries","RR Kabel","V-Guard","Lapp India","Anchor by Panasonic","Standard by Havells"];
const structureTypes     = ["GI Hot Dip Galvanized - Elevated Tilt","Aluminium Alloy - Roof Mount","GI - RCC Roof Ballast","Mono rail","Pre GI structures"];
const structureBrands    = ["Apollo","Jindal","Tata Structura"];
const structureSizes     = ["120*40","80*40","100*50"];
const phaseOptions       = ["Single Phase","Three Phase"];
const inverterTypes      = ["String","Micro","Central","Hybrid"];
const orientationOptions = ["South Facing","East-West","South-East","South-West","True South","North-South"];
const tiltOptions        = ["Optimal Tilt","15° Optimal Tilt","20° Optimal Tilt","Flush Rooftop Mount","Elevated Tilt"];
const netMeterOptions    = ["HPL","Genus","Secure","L&T","Schneider"];

const inventoryItemsCatalog = [
  // Solar Panels
  { id: "p1", category: "Solar Panels", subcategory: "TopCon (N-Type)", itemName: "Waaree 540W TopCon (N-Type)", brand: "Waaree Energies", wattPeak: "540", price: 14500, stock: 420 },
  { id: "p2", category: "Solar Panels", subcategory: "TopCon (N-Type)", itemName: "Goldi 550W TopCon (N-Type)", brand: "Goldi Solar", wattPeak: "550", price: 15200, stock: 180 },
  { id: "p3", category: "Solar Panels", subcategory: "Bifacial Mono PERC", itemName: "Adani 540W Bifacial Dual Glass", brand: "Adani Solar", wattPeak: "540", price: 16000, stock: 95 },
  { id: "p4", category: "Solar Panels", subcategory: "Bifacial Mono PERC", itemName: "Vikram 545W Bifacial Mono PERC", brand: "Vikram Solar", wattPeak: "545", price: 15500, stock: 230 },
  { id: "p5", category: "Solar Panels", subcategory: "Mono PERC", itemName: "Renewsys 540W Mono PERC", brand: "Renewsys India", wattPeak: "540", price: 13800, stock: 310 },
  { id: "p6", category: "Solar Panels", subcategory: "Mono PERC", itemName: "Premier 535W Mono PERC", brand: "Premier Energies", wattPeak: "535", price: 13500, stock: 60 },

  // Inverters
  { id: "i1", category: "Inverters", subcategory: "On-Grid String", itemName: "Havells 5kW 3-Phase String Inverter", brand: "Havells Solar", size: "5", phase: "Three Phase", type: "String", price: 42000, stock: 45 },
  { id: "i2", category: "Inverters", subcategory: "On-Grid String", itemName: "Sungrow 10kW 3-Phase Inverter", brand: "Sungrow", size: "10", phase: "Three Phase", type: "String", price: 68000, stock: 22 },
  { id: "i3", category: "Inverters", subcategory: "Hybrid", itemName: "Deye 8kW Hybrid Inverter LFP", brand: "Deye Solar", size: "8", phase: "Three Phase", type: "Micro", price: 95000, stock: 12 },
  { id: "i4", category: "Inverters", subcategory: "Off-Grid", itemName: "Luminous 3kW Off-Grid Inverter", brand: "Luminous", size: "3", phase: "Single Phase", type: "String", price: 28000, stock: 35 },
];

const sectionShowDefaults = [
  { label: "Rooftop Layout & Design (page)", enabled: true },
  { label: "Site Survey Photos (page)", enabled: true },
  { label: "Technical Specifications (page)", enabled: true },
  { label: "Energy & Financial Summary (page)", enabled: true },
  { label: "Monthly Energy Generation Chart", enabled: true },
  { label: "Year-wise Savings & Payback Table", enabled: true },
  { label: "25-Year Savings Impact", enabled: true },
  { label: "Customer Testimonials & Gallery (page)", enabled: true },
  { label: "Payment Schedule (milestones)", enabled: true },
  { label: "Why Go Solar (page)", enabled: true },
  { label: "Installation Process (page)", enabled: true },
  { label: "Warranty & Support (page)", enabled: true },
  { label: "Terms & Conditions (page)", enabled: true },
];

const initialTestimonials = [
  {
    name: "Binapani Panda",
    scheme: "PM-Suryaghar Scheme",
    location: "Bidyadharapur, Cuttack",
    rating: 5,
    systemCapacity: "RTS On-Grid 4kW",
    structureType: "Ballast Type Structure",
    text: "RTS On-Grid 4KW Installation done under PM-Suryaghar Scheme with Ballast Type Structure at her Bidyadharapur, Cuttack residence.",
    image: "/solar-rooftop-cover-4k.png",
  },
  {
    name: "ULA- Paper",
    scheme: "ULA Model",
    location: "Kurujanga, Salipur, Odisha",
    rating: 5,
    systemCapacity: "ULA-1kW Model",
    structureType: "Affordable Rooftop Solar",
    text: "First Solar EPC Integrator & Vendor of Odisha to launch ULA-1kw Model In Odisha. TPCODL brings affordable rooftop solar to Kurujanga village under ULA Model.",
    image: "/solar-rooftop-cover-4k.png",
  },
  {
    name: "Nayana Mohanty",
    scheme: "PM-Suryaghar Scheme",
    location: "Tulasipur, Cuttack",
    rating: 5,
    systemCapacity: "RTS On-Grid 4.5kW",
    structureType: "High Rise Structure",
    text: "RTS On-Grid 4.5KW Installation done under PM-Suryaghar Scheme with High Rise Structure at her Tulasipur, Cuttack residence.",
    image: "/solar-rooftop-cover-4k.png",
  },
];

const initialInstallationSteps = [
  { title: "1. Site Survey & Engineering Assessment", description: "Detailed structural assessment of rooftop, shading analysis, load audit, electrical panel inspection, and preparation of site-specific layout drawing and single-line diagram (SLD)." },
  { title: "2. DISCOM Application", description: "Submission of DISCOM application along with all required documentation and approvals. Our team handles all paperwork end-to-end." },
  { title: "3. Material Procurement", description: "All materials procured from authorised distributors. Each component undergoes incoming quality inspection." },
  { title: "4. Mounting Structure Installation", description: "Precision drilling and anchor fixing. Structure assembled at engineered tilt angle. Waterproofing applied at all roof penetration points." },
  { title: "5. Panel, Inverter & Electrical Installation", description: "Solar panel placement, MC4 connector crimping, inverter wall mounting, AC cabling to ACDB, RCCB, and main distribution board. Earthing and lightning protection installed." },
  { title: "6. Net Metering", description: "DISCOM inspection, net meter installation and grid synchronisation. Final testing, commissioning, client walkthrough and handover with training on the monitoring portal." },
];

const initialTermsGroups = [
  { heading: "Quotation Validity", points: ["This quotation is valid for the number of days stated above from the date of issue.","Prices are subject to change after validity period due to panel cost fluctuations and GST policy revisions.","Subsidy amounts are based on MNRE guidelines as of the date of issue and are subject to Government revision."] },
  { heading: "Installation & Scope", points: ["Scope includes supply, installation, testing, commissioning, and net metering documentation only.","Civil works, if required, will be quoted separately after site survey.","Customer to provide access to rooftop, electrical panel, and parking for installation vehicles throughout the installation period."] },
  { heading: "Performance & Liability", points: ["Generation estimates are based on solar irradiance data for the installation location. Actual generation may vary by +/-10%.","We are not liable for generation losses due to grid downtime, excessive shading from new construction, or acts of God.","All warranties are subject to the customer maintaining the system in accordance with the maintenance guidelines."] },
  { heading: "Cancellation Policy", points: ["Order cancellation before material dispatch: 5% of advance amount will be retained as processing charges.","Cancellation post material dispatch: 30% of project value will be retained to cover material, logistics, and engineering costs, and material needs to be returned."] },
];

// ─── design tokens & theme helper ──────────────────────────────────────────
const getInputSx = (isDark) => ({
  "& .MuiOutlinedInput-root": {
    borderRadius: 2,
    bgcolor: isDark ? "#0f172a" : "#fff",
    color: isDark ? "#f1f5f9" : "#1f2937",
    fontSize: "0.875rem",
    "& fieldset": { borderColor: isDark ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.14)" },
    "&:hover fieldset": { borderColor: isDark ? "#60a5fa" : BRAND },
    "&.Mui-focused fieldset": { borderColor: isDark ? "#60a5fa" : BRAND, borderWidth: 1.5 },
    "& .MuiSelect-icon": { color: isDark ? "#94a3b8" : "inherit" },
  },
  "& .MuiInputLabel-root.Mui-focused": { color: isDark ? "#60a5fa" : BRAND },
  "& .MuiInputLabel-root": { fontSize: "0.875rem", color: isDark ? "#94a3b8" : "inherit" },
});

// ─── shared small components ─────────────────────────────────────────────────
function Block({ label, children, sx }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  return (
    <Paper
      elevation={0}
      sx={{
        p: 2.5,
        mb: 2,
        borderRadius: 3,
        border: isDark ? "1px solid rgba(255,255,255,0.08)" : "0.5px solid rgba(0,0,0,0.09)",
        bgcolor: isDark ? "#1e293b" : "#fff",
        boxShadow: "none",
        ...sx,
      }}
    >
      {label && (
        <Typography
          sx={{
            fontSize: "0.7rem",
            fontWeight: 700,
            letterSpacing: "0.07em",
            textTransform: "uppercase",
            color: isDark ? "#94a3b8" : "#94a3b8",
            mb: 1.75,
          }}
        >
          {label}
        </Typography>
      )}
      {children}
    </Paper>
  );
}

function G({ cols = 4, children, sx }) {
  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "1fr", sm: `repeat(${Math.min(cols, 2)}, minmax(0,1fr))`, md: `repeat(${cols}, minmax(0,1fr))` },
        gap: 2,
        ...sx,
      }}
    >
      {children}
    </Box>
  );
}

function F({ label, children, span, hint }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  return (
    <Box sx={span ? { gridColumn: `span ${span}` } : {}}>
      {children}
      {hint && (
        <Typography variant="caption" sx={{ color: isDark ? "#64748b" : "#94a3b8", mt: 0.5, display: "block" }}>
          {hint}
        </Typography>
      )}
    </Box>
  );
}

function TF({ label, sx, ...props }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  return <TextField label={label} size="small" fullWidth sx={{ ...getInputSx(isDark), ...sx }} {...props} />;
}

function Sel({ label, value, onChange, options }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  return (
    <FormControl fullWidth size="small" sx={getInputSx(isDark)}>
      <InputLabel sx={{ fontSize: "0.875rem", color: isDark ? "#94a3b8" : undefined }}>{label}</InputLabel>
      <Select
        value={value}
        label={label}
        onChange={onChange}
        sx={{
          borderRadius: 2,
          fontSize: "0.875rem",
          bgcolor: isDark ? "#0f172a" : "#fff",
          color: isDark ? "#f1f5f9" : "#1f2937",
          "& .MuiSelect-icon": { color: isDark ? "#94a3b8" : undefined },
        }}
        MenuProps={{
          PaperProps: {
            sx: {
              bgcolor: isDark ? "#1e293b" : "#fff",
              color: isDark ? "#f1f5f9" : "#1f2937",
              "& .MuiMenuItem-root": {
                "&:hover": { bgcolor: isDark ? "rgba(255,255,255,0.08)" : undefined },
                "&.Mui-selected": { bgcolor: isDark ? "rgba(59,130,246,0.2)" : undefined },
              },
            },
          },
        }}
      >
        {options.map((o) => (
          <MenuItem key={o} value={o} sx={{ fontSize: "0.875rem" }}>
            {o === "None" ? "— None —" : o}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}

function ChipAC({ label, value, options, onChange, freeSolo, placeholder }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  return (
    <Autocomplete
      multiple
      freeSolo={freeSolo}
      options={options}
      value={value ? [value] : []}
      onChange={(_, vals) => onChange(vals[vals.length - 1] || "")}
      onInputChange={freeSolo ? (_, v) => onChange(v || "") : undefined}
      filterSelectedOptions
      fullWidth
      size="small"
      renderTags={(vals, getTagProps) =>
        vals.map((opt, i) => (
          <Chip
            {...getTagProps({ index: i })}
            key={opt}
            label={opt}
            size="small"
            sx={{
              borderRadius: 1.5,
              bgcolor: isDark ? "rgba(59,130,246,0.2)" : undefined,
              color: isDark ? "#93c5fd" : undefined,
            }}
          />
        ))
      }
      renderInput={(params) => <TextField {...params} label={label} placeholder={placeholder} sx={getInputSx(isDark)} />}
      PaperComponent={(props) => (
        <Paper
          {...props}
          sx={{
            bgcolor: isDark ? "#1e293b" : "#fff",
            color: isDark ? "#f1f5f9" : "#1f2937",
            border: isDark ? "1px solid rgba(255,255,255,0.1)" : undefined,
            "& .MuiAutocomplete-option": {
              "&:hover": { bgcolor: isDark ? "rgba(255,255,255,0.08)" : undefined },
              "&[aria-selected='true']": { bgcolor: isDark ? "rgba(59,130,246,0.2)" : undefined },
            },
          }}
        />
      )}
    />
  );
}

function SectionHeader({ icon, title }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  return (
    <Box sx={{ mb: 2.5 }}>
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1.5 }}>
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: 2.5,
            bgcolor: isDark ? "rgba(59, 130, 246, 0.2)" : BRAND_LIGHT,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: isDark ? "#60a5fa" : BRAND,
            flexShrink: 0,
          }}
        >
          {icon}
        </Box>
        <Typography sx={{ fontSize: "1.05rem", fontWeight: 700, color: isDark ? "#f8fafc" : "#1f2937" }}>
          {title}
        </Typography>
      </Stack>
      <Divider sx={{ borderColor: isDark ? "rgba(255,255,255,0.1)" : undefined }} />
    </Box>
  );
}

function BlockLabel({ title, hint }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  return (
    <Typography
      sx={{
        fontSize: "0.7rem",
        fontWeight: 700,
        letterSpacing: "0.07em",
        textTransform: "uppercase",
        color: isDark ? "#94a3b8" : "#94a3b8",
        mb: 1.75,
      }}
    >
      {title}
      {hint && (
        <Box component="span" sx={{ fontWeight: 400, textTransform: "none", letterSpacing: 0, color: isDark ? "#64748b" : "#b0bec5", ml: 0.75 }}>
          — {hint}
        </Box>
      )}
    </Typography>
  );
}

function ToggleRow({ label, checked, onChange }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  return (
    <Box
      sx={{
        border: isDark ? "1px solid rgba(255,255,255,0.1)" : "0.5px solid rgba(0,0,0,0.1)",
        borderRadius: 999,
        px: 2,
        py: 1.1,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        bgcolor: isDark ? "#0f172a" : "#fff",
      }}
    >
      <Typography sx={{ fontSize: "0.875rem", color: isDark ? "#e2e8f0" : "#475569" }}>{label}</Typography>
      <Switch
        checked={checked}
        onChange={onChange}
        size="small"
        sx={{
          "& .MuiSwitch-thumb": { width: 14, height: 14 },
          "& .Mui-checked .MuiSwitch-thumb": { bgcolor: isDark ? "#60a5fa" : BRAND },
          "& .Mui-checked + .MuiSwitch-track": { bgcolor: isDark ? "#3b82f6" : BRAND },
        }}
      />
    </Box>
  );
}

// ─── step renderers ──────────────────────────────────────────────────────────
function StepCustomer({ form, updateField, updateValue, pricePerKw }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const inputSx = getInputSx(isDark);

  return (
    <Stack spacing={0}>
      <SectionHeader icon={<TuneOutlined />} title="Customer & system" />

      {/* ── Client & Site Details ── */}
      <Block label="Client & Site Details (Page 01 Overview)">
        <G cols={3} sx={{ mb: 2 }}>
          <TF
            label="Customer / Client Name *"
            value={form.customerName || ""}
            onChange={updateField("customerName")}
            placeholder="e.g. Rahul Das"
          />
          <TF
            label="Contact Phone *"
            value={form.customerPhone || ""}
            onChange={updateField("customerPhone")}
            placeholder="e.g. 9938849920"
          />
          <TF
            label="Quotation Validity (Days) *"
            value={form.validityDays || ""}
            onChange={updateField("validityDays")}
            placeholder="e.g. 14"
          />
        </G>
        <G cols={1} sx={{ mb: 2 }}>
          <TF
            label="Installation Site Address *"
            value={form.customerAddress || ""}
            onChange={updateField("customerAddress")}
            placeholder="e.g. Itanagar, Arunachal Pradesh - 754120"
          />
        </G>
        <G cols={4}>
          <Sel label="Salutation" value={form.salutation} onChange={updateField("salutation")} options={salutations} />
          <Sel label="Customer type *" value={form.customerType} onChange={updateField("customerType")} options={customerTypes} />
          <TF label="Monthly bill (₹)" value={form.monthlyBill} onChange={updateField("monthlyBill")} placeholder="Optional" />
          <TF label="Roof area (sq ft) *" value={form.roofArea} onChange={updateField("roofArea")} />
        </G>
      </Block>

      {/* ── Proposal Headline & Summary ── */}
      <Block label="Proposal Headline & Overview Summary">
        <G cols={1} sx={{ mb: 2 }}>
          <TF
            label="Proposal Headline / Custom Title"
            value={form.proposalTitle || ""}
            onChange={updateField("proposalTitle")}
            placeholder="Defaults to '[Size] kWp [Type] solar power system for [Client]'"
          />
        </G>
        <G cols={1}>
          <TF
            label="Proposal Summary Note / Scope Description"
            value={form.proposalDescription || ""}
            onChange={updateField("proposalDescription")}
            multiline
            rows={2.5}
            placeholder="Defaults to: This proposal covers design, supply, installation, testing, commissioning and net metering support..."
          />
        </G>
      </Block>

      {/* ── System Overview ── */}
      <Block label="System overview">
        <G cols={4} sx={{ mb: 2 }}>
          <TF label="System size (kW) *" value={form.systemSize} onChange={updateField("systemSize")} />
          <TF label="Total cost (₹) *" value={form.totalCost} onChange={updateField("totalCost")} />
          <TF
            label="Price per kW"
            value={pricePerKw}
            InputProps={{ readOnly: true }}
            sx={{
              ...inputSx,
              "& .MuiOutlinedInput-root": {
                ...inputSx["& .MuiOutlinedInput-root"],
                bgcolor: isDark ? "#0f172a" : "#f8fafc",
                color: isDark ? "#94a3b8" : "#64748b",
              },
            }}
          />
          <F hint="Leave blank to match system size">
            <TF label="Structure capacity (kW)" value={form.structureCapacity} onChange={updateField("structureCapacity")} placeholder="Defaults to system size" />
          </F>
        </G>
        <G cols={3} sx={{ mb: 2 }}>
          <Sel label="Government subsidy" value={form.governmentSubsidy} onChange={updateField("governmentSubsidy")} options={subsidyOptions} />
          <F hint="Auto-calculated from scheme, editable">
            <TF label="Subsidy amount (₹)" value={form.subsidyAmount} onChange={updateField("subsidyAmount")} />
          </F>
          <Sel label="System type" value={form.systemType} onChange={updateField("systemType")} options={systemTypes} />
        </G>
        <G cols={2}>
          <ToggleRow label="Battery backup" checked={form.batteryBackup} onChange={updateField("batteryBackup")} />
          <ToggleRow label="Finance required" checked={form.financeRequired} onChange={updateField("financeRequired")} />
        </G>
      </Block>

      {/* ── Battery Details ── */}
      <Block label="Battery details">
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "2fr 1fr 1fr 80px 80px" }, gap: 2, mb: 2 }}>
          <ChipAC label="Battery brand" options={batteryBrands} value={form.batteryBrand} onChange={updateValue("batteryBrand")} />
          <TF label="Capacity (kWh)" value={form.batteryCapacity} onChange={updateField("batteryCapacity")} />
          <Sel label="Type" value={form.batteryType} onChange={updateField("batteryType")} options={batteryTypes} />
          <TF label="Qty" value={form.batteryQty} onChange={updateField("batteryQty")} />
          <TF label="Wty (yr)" value={form.batteryWarranty} onChange={updateField("batteryWarranty")} />
        </Box>
        <Alert
          severity="info"
          icon={<InfoOutlined fontSize="small" />}
          sx={{
            borderRadius: 2,
            bgcolor: isDark ? "rgba(59, 130, 246, 0.15)" : BRAND_LIGHT,
            color: isDark ? "#93c5fd" : BRAND_TEXT,
            border: isDark ? "1px solid rgba(59, 130, 246, 0.3)" : "0.5px solid #b5d4f4",
            fontSize: "0.8rem",
            "& .MuiAlert-icon": { color: isDark ? "#93c5fd" : BRAND_TEXT },
          }}
        >
          Site survey incomplete. Missing equipment fields must be filled manually.
        </Alert>
      </Block>

      {/* ── Prepared By (Company Details) ── */}
      <Block label="Prepared By (Company Details)">
        <G cols={2} sx={{ mb: 2 }}>
          <TF
            label="Company / Vendor Name"
            value={form.companyName || ""}
            onChange={updateField("companyName")}
            placeholder="M/S SAHOO CONSTRUCTION"
          />
          <TF
            label="Company Contact Phone"
            value={form.companyPhone || ""}
            onChange={updateField("companyPhone")}
            placeholder="7008790475"
          />
        </G>
        <G cols={2}>
          <TF
            label="Company Email"
            value={form.companyEmail || ""}
            onChange={updateField("companyEmail")}
            placeholder="sahooconstruction00@gmail.com"
          />
          <TF
            label="Company Location / City"
            value={form.companyLocation || ""}
            onChange={updateField("companyLocation")}
            placeholder="Cuttack, Odisha"
          />
        </G>
      </Block>
    </Stack>
  );
}

function StepComponents({ form, updateField, updateValue }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  const [liveItems, setLiveItems] = useState(inventoryItemsCatalog);
  const [fetchingInventory, setFetchingInventory] = useState(false);
  const getItemStock = (item) => {
    const stockRows = Array.isArray(item?.warehouseStock) ? item.warehouseStock : [];
    const rowStock = stockRows.reduce(
      (sum, row) => sum + Number(row.availableQty ?? row.quantity ?? row.qty ?? 0),
      0,
    );
    return Number(item?.availableStock ?? item?.totalStock ?? item?.openingStock ?? rowStock ?? 0);
  };
  const renderInventoryOption = (props, option) => (
    <Box component="li" {...props} key={option.id || option.itemName}>
      <Stack spacing={0.4} sx={{ width: "100%", minWidth: 0 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
          <Typography fontWeight={800} noWrap sx={{ color: isDark ? "#f8fafc" : "#0f172a" }}>
            {option.itemName}
          </Typography>
          <Chip
            size="small"
            label={`Stock: ${option.stock}`}
            sx={{
              flexShrink: 0,
              height: 22,
              fontWeight: 800,
              bgcolor: option.stock > 0 ? alpha("#22c55e", isDark ? 0.18 : 0.12) : alpha("#ef4444", isDark ? 0.18 : 0.12),
              color: option.stock > 0 ? (isDark ? "#86efac" : "#15803d") : "#ef4444",
            }}
          />
        </Stack>
        <Typography variant="caption" noWrap sx={{ color: isDark ? "#94a3b8" : "#64748b" }}>
          Category: {option.category || "-"} | Subcategory: {option.subcategory || "-"}
        </Typography>
      </Stack>
    </Box>
  );

  useEffect(() => {
    let isMounted = true;
    const fetchLiveInventory = async () => {
      try {
        setFetchingInventory(true);
        const res = await axiosInstance.get("/inventory/items", { params: { limit: 500 } });
        const data = res.data?.result?.items || (Array.isArray(res.data?.result) ? res.data.result : []);
        if (isMounted && Array.isArray(data) && data.length > 0) {
          const parsed = data.map((item) => {
            const rawCat = typeof item.category === "object" ? item.category?.category : item.category;
            const priceVal = item.pricing?.sellingPrice || item.pricing?.purchaseCost || item.price || 0;
            const stockVal = getItemStock(item);
            return {
              id: item._id,
              category: rawCat || "Solar Panels",
              subcategory: item.subcategory || "General",
              itemName: item.itemName || item.name,
              brand: item.purchaseInfo?.vendorName || item.brand || item.itemName?.split(" ")[0] || "Standard",
              wattPeak: item.wattPeak || String(item.itemName?.match(/\d{3}/)?.[0] || "540"),
              size: item.size || String(item.itemName?.match(/\d+(\.\d+)?\s*k[wW]/i)?.[0]?.replace(/k[wW]/i, "") || "5"),
              price: Number(priceVal),
              stock: Number(stockVal),
            };
          });
          setLiveItems((prev) => {
            const merged = [...parsed];
            prev.forEach((p) => {
              if (!merged.some((m) => m.itemName === p.itemName)) merged.push(p);
            });
            return merged;
          });
        }
      } catch (err) {
        console.warn("Using fallback inventory catalog", err);
      } finally {
        if (isMounted) setFetchingInventory(false);
      }
    };
    fetchLiveInventory();
    return () => { isMounted = false; };
  }, []);

  const componentItems = Array.isArray(form.componentItems) ? form.componentItems : [];
  const [componentCategory, setComponentCategory] = useState("");
  const [componentSubcategory, setComponentSubcategory] = useState("");
  const [selectedComponentItem, setSelectedComponentItem] = useState(null);
  const [componentQty, setComponentQty] = useState("1");

  const allCategoriesList = useMemo(() => {
    const set = new Set(liveItems.map((i) => i.category).filter(Boolean));
    return Array.from(set).sort();
  }, [liveItems]);

  const subcategoryOptions = useMemo(() => {
    const set = new Set(
      liveItems
        .filter((i) => !componentCategory || i.category === componentCategory)
        .map((i) => i.subcategory)
        .filter(Boolean),
    );
    return Array.from(set).sort();
  }, [liveItems, componentCategory]);

  const availableComponentItems = useMemo(() => {
    return liveItems.filter(
      (i) =>
        (!componentCategory || i.category === componentCategory) &&
        (!componentSubcategory || i.subcategory === componentSubcategory),
    );
  }, [liveItems, componentCategory, componentSubcategory]);

  const componentTotal = useMemo(
    () => componentItems.reduce((sum, item) => sum + (Number(item.qty) || 0) * (Number(item.price) || 0), 0),
    [componentItems],
  );

  const syncLegacyComponentFields = (item, qty) => {
    const categoryText = `${item.category || ""} ${item.subcategory || ""}`.toLowerCase();
    if (categoryText.includes("solar") || categoryText.includes("panel")) {
      if (item.wattPeak) updateValue("wattPeak")(item.wattPeak);
      if (qty) updateValue("panelQty")(String(qty));
      if (item.brand) updateValue("panelBrand")(item.brand);
      if (item.subcategory) updateValue("panelCategory")(item.subcategory);
      if (item.price) updateValue("panelUnitPrice")(item.price);
    }
    if (categoryText.includes("inverter")) {
      if (item.size) updateValue("inverterSize")(item.size);
      if (qty) updateValue("inverterQty")(String(qty));
      if (item.brand) updateValue("inverterBrand")(item.brand);
      if (item.phase) updateValue("phase")(item.phase);
      if (item.type) updateValue("inverterType")(item.type);
      if (item.price) updateValue("inverterUnitPrice")(item.price);
    }
  };

  const handleAddComponentItem = () => {
    if (!selectedComponentItem) return;
    const qty = Math.max(1, Number(componentQty) || 1);
    const nextRow = {
      id: `${selectedComponentItem.id || selectedComponentItem.itemName}-${Date.now()}`,
      inventoryId: selectedComponentItem.id || "",
      itemName: selectedComponentItem.itemName || "",
      category: selectedComponentItem.category || "",
      subcategory: selectedComponentItem.subcategory || "",
      brand: selectedComponentItem.brand || "",
      qty,
      price: Number(selectedComponentItem.price || 0),
      stock: Number(selectedComponentItem.stock || 0),
      wattPeak: selectedComponentItem.wattPeak || "",
      size: selectedComponentItem.size || "",
    };

    updateValue("componentItems")([...componentItems, nextRow]);
    syncLegacyComponentFields(selectedComponentItem, qty);
    setSelectedComponentItem(null);
    setComponentQty("1");
  };

  const handleRemoveComponentItem = (rowId) => {
    updateValue("componentItems")(componentItems.filter((item) => item.id !== rowId));
  };

  const InventorySummary = ({ item, stockWarningAt = 20 }) => {
    if (!item) {
      return (
        <Paper elevation={0} sx={{ p: 2, borderRadius: 2.5, bgcolor: isDark ? "rgba(15,23,42,0.82)" : "#f8fafc", border: `1px dashed ${isDark ? "rgba(148,163,184,0.28)" : "#cbd5e1"}` }}>
          <Typography variant="body2" sx={{ color: isDark ? "#94a3b8" : "#64748b" }}>
            Select an inventory item to see category, subcategory, price, and stock.
          </Typography>
        </Paper>
      );
    }

    const stock = Number(item.stock || 0);
    const stockColor = stock <= 0 ? "#ef4444" : stock <= stockWarningAt ? "#f59e0b" : "#22c55e";

    return (
      <Paper elevation={0} sx={{ p: 2, borderRadius: 2.5, bgcolor: isDark ? "rgba(15,23,42,0.84)" : "#f8fafc", border: `1px solid ${isDark ? "rgba(148,163,184,0.22)" : "#dbe5ef"}` }}>
        <Stack direction={{ xs: "column", md: "row" }} alignItems={{ xs: "stretch", md: "center" }} justifyContent="space-between" spacing={2}>
          <Stack direction="row" spacing={1.5} alignItems="center" sx={{ minWidth: 0 }}>
            <Box sx={{ width: 42, height: 42, borderRadius: 2, bgcolor: alpha(BRAND, isDark ? 0.22 : 0.12), color: isDark ? "#93c5fd" : BRAND, display: "grid", placeItems: "center", flexShrink: 0 }}>
              <Inventory2 fontSize="small" />
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="subtitle2" fontWeight={900} noWrap color={isDark ? "#f8fafc" : "#0f172a"}>
                {item.itemName}
              </Typography>
              <Stack direction="row" flexWrap="wrap" gap={0.75} sx={{ mt: 0.8 }}>
                <Chip size="small" label={item.category || "-"} sx={{ height: 23, fontWeight: 800, bgcolor: alpha("#3b82f6", isDark ? 0.18 : 0.1), color: isDark ? "#93c5fd" : "#1d4ed8" }} />
                <Chip size="small" label={item.subcategory || "-"} sx={{ height: 23, fontWeight: 800, bgcolor: isDark ? "rgba(148,163,184,0.12)" : "#eef2f7", color: isDark ? "#cbd5e1" : "#475569" }} />
                <Chip size="small" label={`Brand: ${item.brand || "-"}`} sx={{ height: 23, fontWeight: 800, bgcolor: isDark ? "rgba(148,163,184,0.12)" : "#eef2f7", color: isDark ? "#cbd5e1" : "#475569" }} />
              </Stack>
            </Box>
          </Stack>
          <Stack direction="row" spacing={1} flexWrap="wrap" justifyContent={{ xs: "flex-start", md: "flex-end" }}>
            <Chip icon={<PaymentsOutlined sx={{ fontSize: 16 }} />} label={`Price: Rs ${Number(item.price || 0).toLocaleString("en-IN")}`} sx={{ fontWeight: 900, bgcolor: alpha("#10b981", isDark ? 0.18 : 0.12), color: isDark ? "#86efac" : "#047857", border: `1px solid ${alpha("#10b981", 0.32)}` }} />
            <Chip icon={<LayersOutlined sx={{ fontSize: 16 }} />} label={`Stock: ${stock} units`} sx={{ fontWeight: 900, bgcolor: alpha(stockColor, isDark ? 0.18 : 0.12), color: stockColor, border: `1px solid ${alpha(stockColor, 0.38)}` }} />
          </Stack>
        </Stack>
      </Paper>
    );
  };

  return (
    <Stack spacing={0}>
      <SectionHeader icon={<LayersOutlined />} title="System configuration & components" />

      {/* ── System Equipment Configuration (Page 02 Highlights) ── */}
      <Block label="System Equipment Configuration (Page 02)">
        <Typography variant="caption" sx={{ color: isDark ? "#94a3b8" : "#64748b", mb: 2, display: "block" }}>
          Configure the primary solar module specs, inverters, orientation and tilt shown on the System Configuration proposal page.
        </Typography>

        {/* Solar Panels */}
        <Typography sx={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", color: isDark ? "#60a5fa" : BRAND, mb: 1 }}>
          Solar Modules
        </Typography>
        <G cols={4} sx={{ mb: 2 }}>
          <ChipAC
            label="Panel brand *"
            options={panelBrands}
            value={form.panelBrand}
            onChange={updateValue("panelBrand")}
            freeSolo
          />
          <TF
            label="Wattage per panel (Wp) *"
            value={form.wattPeak}
            onChange={updateField("wattPeak")}
            placeholder="540"
          />
          <TF
            label="Total panels count *"
            value={form.panelQty}
            onChange={updateField("panelQty")}
            placeholder="200"
          />
          <Sel
            label="Panel technology / category"
            value={form.panelCategory || "TopCon (N-Type)"}
            onChange={updateField("panelCategory")}
            options={panelCategories}
          />
        </G>

        {/* Inverters */}
        <Typography sx={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", color: isDark ? "#60a5fa" : BRAND, mb: 1 }}>
          Inverter System
        </Typography>
        <G cols={4} sx={{ mb: 2 }}>
          <ChipAC
            label="Inverter brand *"
            options={inverterBrands}
            value={form.inverterBrand}
            onChange={updateValue("inverterBrand")}
            freeSolo
          />
          <TF
            label="Inverter size (kW) *"
            value={form.inverterSize}
            onChange={updateField("inverterSize")}
            placeholder="200.00"
          />
          <TF
            label="Inverter quantity"
            value={form.inverterQty}
            onChange={updateField("inverterQty")}
            placeholder="1"
          />
          <Sel
            label="Electrical phase"
            value={form.phase || "Three Phase"}
            onChange={updateField("phase")}
            options={phaseOptions}
          />
        </G>

        {/* Orientation & Tilt */}
        <Typography sx={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", color: isDark ? "#60a5fa" : BRAND, mb: 1 }}>
          Orientation & Mounting
        </Typography>
        <G cols={3}>
          <ChipAC
            label="Rooftop orientation"
            options={orientationOptions}
            value={form.orientation || "South Facing"}
            onChange={updateValue("orientation")}
            freeSolo
          />
          <ChipAC
            label="Installation tilt angle"
            options={tiltOptions}
            value={form.tilt || "Optimal Tilt"}
            onChange={updateValue("tilt")}
            freeSolo
          />
          <Sel
            label="Inverter type"
            value={form.inverterType || "String"}
            onChange={updateField("inverterType")}
            options={inverterTypes}
          />
        </G>
      </Block>

      {/* ── Site Survey Photos & Documentation (Line-Wise / Grid) ── */}
      <Block label="Site Survey Photos (Page 02 — Line-Wise Grid)">
        <Stack spacing={2}>
          <Stack direction={{ xs: "column", sm: "row" }} alignItems={{ xs: "flex-start", sm: "center" }} justifyContent="space-between" spacing={1.5}>
            <Box>
              <Typography variant="subtitle2" fontWeight={700} sx={{ color: isDark ? "#f1f5f9" : "#1e293b" }}>
                Site Assessment Photos
              </Typography>
              <Typography variant="caption" sx={{ color: isDark ? "#94a3b8" : "#64748b" }}>
                Photos are shown in a clean line-wise grid (up to 3 in a row) on <strong>Page 02 (System Configuration)</strong>.
              </Typography>
            </Box>
            <ToggleRow
              label="Show on Page 02"
              checked={form.showSiteSurveyPhoto !== false && form.siteSurveyPhotoUrl !== "none"}
              onChange={(e) => {
                const checked = e.target.checked;
                updateValue("showSiteSurveyPhoto")(checked);
                if (!checked) {
                  updateValue("siteSurveyPhotoUrl")("none");
                } else if (form.siteSurveyPhotoUrl === "none") {
                  updateValue("siteSurveyPhotoUrl")("");
                }
              }}
            />
          </Stack>

          {form.showSiteSurveyPhoto !== false && form.siteSurveyPhotoUrl !== "none" ? (
            <Stack spacing={2}>
              {/* Line-wise photo grid */}
              {(() => {
                const photoList = Array.isArray(form.siteSurveyPhotos) && form.siteSurveyPhotos.length > 0
                  ? form.siteSurveyPhotos.filter((p) => p && p !== "none")
                  : (form.siteSurveyPhotoUrl && form.siteSurveyPhotoUrl !== "none" ? [form.siteSurveyPhotoUrl] : ["/solar-rooftop-cover-4k.png"]);

                return (
                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", md: "repeat(3, 1fr)" },
                      gap: 1.5,
                    }}
                  >
                    {photoList.map((photoUrl, idx) => (
                      <Paper
                        key={idx}
                        elevation={0}
                        sx={{
                          p: 1.25,
                          borderRadius: 2.5,
                          bgcolor: isDark ? "rgba(15,23,42,0.7)" : "#f8fafc",
                          border: isDark ? "1px solid rgba(255,255,255,0.12)" : "1px solid #cbd5e1",
                          overflow: "hidden",
                        }}
                      >
                        <Box
                          sx={{
                            width: "100%",
                            height: 110,
                            borderRadius: 1.5,
                            overflow: "hidden",
                            bgcolor: isDark ? "#0f172a" : "#e2e8f0",
                            mb: 1,
                          }}
                        >
                          <img
                            src={photoUrl}
                            alt={`Survey ${idx + 1}`}
                            style={{ width: "100%", height: "100%", objectFit: "cover" }}
                            onError={(e) => {
                              e.currentTarget.onerror = null;
                              e.currentTarget.src = "/solar-rooftop-cover-4k.png";
                            }}
                          />
                        </Box>

                        <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
                          <Typography variant="caption" fontWeight={700} sx={{ color: isDark ? "#94a3b8" : "#64748b" }}>
                            Photo {idx + 1}
                          </Typography>
                          <Stack direction="row" spacing={0.5}>
                            <Tooltip title="Change this photo">
                              <IconButton
                                size="small"
                                component="label"
                                sx={{ color: isDark ? "#93c5fd" : "#2563eb" }}
                              >
                                <PhotoCameraOutlined sx={{ fontSize: 16 }} />
                                <input
                                  type="file"
                                  hidden
                                  accept="image/*"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (!file) return;
                                    const reader = new FileReader();
                                    reader.onload = (evt) => {
                                      const updated = [...photoList];
                                      updated[idx] = evt.target?.result;
                                      updateValue("siteSurveyPhotos")(updated);
                                      updateValue("siteSurveyPhotoUrl")(updated[0] || "");
                                    };
                                    reader.readAsDataURL(file);
                                  }}
                                />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Delete this photo">
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => {
                                  const updated = photoList.filter((_, i) => i !== idx);
                                  updateValue("siteSurveyPhotos")(updated);
                                  updateValue("siteSurveyPhotoUrl")(updated[0] || (updated.length === 0 ? "none" : ""));
                                  if (updated.length === 0) {
                                    updateValue("showSiteSurveyPhoto")(false);
                                  }
                                }}
                              >
                                <DeleteOutline sx={{ fontSize: 16 }} />
                              </IconButton>
                            </Tooltip>
                          </Stack>
                        </Stack>
                      </Paper>
                    ))}
                  </Box>
                );
              })()}

              {/* Action Toolbar to Add/Upload Photos */}
              <Box
                sx={{
                  p: 2,
                  borderRadius: 2,
                  bgcolor: isDark ? "rgba(15,23,42,0.5)" : "#f1f5f9",
                  border: isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid #e2e8f0",
                }}
              >
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems="center" flexWrap="wrap">
                  <Button
                    variant="contained"
                    component="label"
                    size="small"
                    startIcon={<PhotoCameraOutlined fontSize="small" />}
                    sx={{
                      borderRadius: 2,
                      textTransform: "none",
                      fontWeight: 700,
                      bgcolor: BRAND,
                      "&:hover": { bgcolor: "#1d4ed8" },
                      whiteSpace: "nowrap",
                    }}
                  >
                    + Upload Images (Multiple)
                    <input
                      type="file"
                      hidden
                      multiple
                      accept="image/*"
                      onChange={(e) => {
                        const files = Array.from(e.target.files || []);
                        if (!files.length) return;
                        const readPromises = files.map((file) => new Promise((resolve) => {
                          const reader = new FileReader();
                          reader.onload = (evt) => resolve(evt.target?.result);
                          reader.readAsDataURL(file);
                        }));
                        Promise.all(readPromises).then((results) => {
                          const currentPhotos = Array.isArray(form.siteSurveyPhotos) && form.siteSurveyPhotos.length > 0
                            ? form.siteSurveyPhotos.filter((p) => p && p !== "none")
                            : (form.siteSurveyPhotoUrl && form.siteSurveyPhotoUrl !== "none" ? [form.siteSurveyPhotoUrl] : []);
                          const nextPhotos = [...currentPhotos, ...results.filter(Boolean)];
                          updateValue("siteSurveyPhotos")(nextPhotos);
                          updateValue("siteSurveyPhotoUrl")(nextPhotos[0] || "");
                          updateValue("showSiteSurveyPhoto")(true);
                        });
                      }}
                    />
                  </Button>

                  <Button
                    variant="outlined"
                    color="error"
                    size="small"
                    startIcon={<DeleteOutline fontSize="small" />}
                    onClick={() => {
                      updateValue("siteSurveyPhotos")([]);
                      updateValue("siteSurveyPhotoUrl")("none");
                      updateValue("showSiteSurveyPhoto")(false);
                    }}
                    sx={{ borderRadius: 2, textTransform: "none", fontWeight: 700, whiteSpace: "nowrap" }}
                  >
                    Clear All
                  </Button>

                  <Button
                    variant="text"
                    size="small"
                    startIcon={<Refresh fontSize="small" />}
                    onClick={() => {
                      updateValue("siteSurveyPhotos")([]);
                      updateValue("siteSurveyPhotoUrl")("");
                      updateValue("showSiteSurveyPhoto")(true);
                    }}
                    sx={{ borderRadius: 2, textTransform: "none", color: isDark ? "#94a3b8" : "#64748b", whiteSpace: "nowrap" }}
                  >
                    Reset to Default
                  </Button>
                </Stack>
              </Box>
            </Stack>
          ) : (
            <Paper
              elevation={0}
              sx={{
                p: 2,
                borderRadius: 2,
                bgcolor: isDark ? "rgba(15,23,42,0.6)" : "#f8fafc",
                border: `1px dashed ${isDark ? "rgba(148,163,184,0.25)" : "#cbd5e1"}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Typography variant="body2" sx={{ color: isDark ? "#94a3b8" : "#64748b" }}>
                Site survey photos are currently deleted / hidden from Page 02.
              </Typography>
              <Button
                variant="outlined"
                size="small"
                startIcon={<Add fontSize="small" />}
                onClick={() => {
                  updateValue("siteSurveyPhotos")([]);
                  updateValue("siteSurveyPhotoUrl")("");
                  updateValue("showSiteSurveyPhoto")(true);
                }}
                sx={{ borderRadius: 2, textTransform: "none", fontWeight: 700 }}
              >
                Add Photos
              </Button>
            </Paper>
          )}
        </Stack>
      </Block>

      {/* ── Cables & Structure ── */}
      <Block label="Cables & mounting structure">
        <G cols={4} sx={{ mb: 2 }}>
          <ChipAC label="Cable brand" options={cableBrands} value={form.cableBrand} onChange={updateValue("cableBrand")} />
          <TF label="DC cable spec" value={form.dcCableSpec} onChange={updateField("dcCableSpec")} />
          <TF label="AC cable spec" value={form.acCableSpec} onChange={updateField("acCableSpec")} />
          <Autocomplete
            freeSolo
            options={structureTypes}
            value={form.structureType}
            onChange={(_, v) => updateValue("structureType")(v || "")}
            onInputChange={(_, v) => updateValue("structureType")(v)}
            size="small"
            fullWidth
            renderInput={(p) => <TextField {...p} label="Structure type" placeholder="Select or type..." sx={getInputSx(isDark)} />}
            PaperComponent={(props) => (
              <Paper
                {...props}
                sx={{
                  bgcolor: isDark ? "#1e293b" : "#fff",
                  color: isDark ? "#f1f5f9" : "#1f2937",
                  border: isDark ? "1px solid rgba(255,255,255,0.1)" : undefined,
                }}
              />
            )}
          />
        </G>
        <G cols={4}>
          <ChipAC label="Structure size" options={structureSizes} value={form.structureSize} onChange={updateValue("structureSize")} />
          <ChipAC label="Structure brand" options={structureBrands} value={form.structureBrand} onChange={updateValue("structureBrand")} />
        </G>
      </Block>

      {/* ── Page 03: Rooftop Layout & 3D Design ── */}
      <Block label="Page 03: Rooftop Layout & 3D Design">
        <Stack spacing={2}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1}>
            <Box>
              <Typography variant="subtitle2" fontWeight={800} sx={{ color: isDark ? "#f8fafc" : "#0f172a" }}>
                3D Rooftop Layout & Layout Details
              </Typography>
              <Typography variant="caption" sx={{ color: isDark ? "#94a3b8" : "#64748b" }}>
                Upload or replace the 3D design render and customize the layout notes displayed on Page 03.
              </Typography>
            </Box>
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography variant="caption" sx={{ color: isDark ? "#94a3b8" : "#64748b" }}>
                {form.showRooftopLayout !== false ? "Visible on Quote" : "Hidden"}
              </Typography>
              <Switch
                size="small"
                checked={form.showRooftopLayout !== false}
                onChange={(e) => updateValue("showRooftopLayout")(e.target.checked)}
              />
            </Stack>
          </Stack>

          {form.showRooftopLayout !== false && (
            <Stack spacing={2}>
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr", md: "260px 1fr" },
                  gap: 2,
                  p: 1.5,
                  borderRadius: 2.5,
                  bgcolor: isDark ? "rgba(15,23,42,0.6)" : "#f8fafc",
                  border: isDark ? "1px solid rgba(255,255,255,0.1)" : "1px solid #cbd5e1",
                }}
              >
                {/* 3D Image Preview */}
                <Box>
                  <Box
                    sx={{
                      width: "100%",
                      height: 150,
                      borderRadius: 2,
                      overflow: "hidden",
                      bgcolor: isDark ? "#0f172a" : "#e2e8f0",
                      mb: 1.5,
                      border: isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid #e2e8f0",
                    }}
                  >
                    <img
                      src={form.rooftopLayoutImage || form.threeDDesignCaptureUrl || "/solar-rooftop-cover-4k.png"}
                      alt="3D Rooftop Layout"
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = "/solar-rooftop-cover-4k.png";
                      }}
                    />
                  </Box>

                  <Stack direction="row" spacing={1}>
                    <Button
                      variant="contained"
                      component="label"
                      size="small"
                      fullWidth
                      startIcon={<PhotoCameraOutlined fontSize="small" />}
                      sx={{
                        borderRadius: 2,
                        textTransform: "none",
                        fontWeight: 700,
                        bgcolor: BRAND,
                        "&:hover": { bgcolor: "#1d4ed8" },
                        fontSize: 12,
                      }}
                    >
                      Change 3D Image
                      <input
                        type="file"
                        hidden
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const reader = new FileReader();
                          reader.onload = (evt) => {
                            updateValue("rooftopLayoutImage")(evt.target?.result);
                            updateValue("threeDDesignCaptureUrl")(evt.target?.result);
                          };
                          reader.readAsDataURL(file);
                        }}
                      />
                    </Button>
                    <Tooltip title="Reset to Default Image">
                      <IconButton
                        size="small"
                        onClick={() => {
                          updateValue("rooftopLayoutImage")("");
                          updateValue("threeDDesignCaptureUrl")("");
                        }}
                        sx={{ color: isDark ? "#94a3b8" : "#64748b", border: `1px solid ${isDark ? "rgba(255,255,255,0.12)" : "#cbd5e1"}` }}
                      >
                        <Refresh fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                </Box>

                {/* Text Notes Customization */}
                <Stack spacing={1.5}>
                  <TF
                    label="Layout Headline / Title"
                    value={form.layoutDesignTitle ?? "Solar panel layout design will be prepared after site survey."}
                    onChange={updateField("layoutDesignTitle")}
                  />
                  <TF
                    label="Layout Description Note"
                    value={
                      form.layoutDesignNote ??
                      `${form.panelQty || 200} panels x ${form.wattPeak || 540}Wp planned for the proposed ${form.systemSize || "2000.00"} kWp system.`
                    }
                    onChange={updateField("layoutDesignNote")}
                  />
                  <G cols={3}>
                    <TF
                      label="Shadow-Free Zone Note"
                      value={form.shadowFreeNote ?? "Optimised for your location's latitude for maximum solar capture throughout the year."}
                      onChange={updateField("shadowFreeNote")}
                    />
                    <TF
                      label="Elevated Mounting Note"
                      value={
                        form.elevatedMountingNote ??
                        `${form.structureSize || "120*40"} ${form.structureBrand || "Apollo"} Elevated Structure with adequate clearance and waterproofed penetrations.`
                      }
                      onChange={updateField("elevatedMountingNote")}
                    />
                    <TF
                      label="Sun-Path Window Note"
                      value={form.sunPathNote ?? "No obstructions within the critical 9 AM – 3 PM window. Shadow loss < 2%."}
                      onChange={updateField("sunPathNote")}
                    />
                  </G>
                </Stack>
              </Box>
            </Stack>
          )}
        </Stack>
      </Block>

      {/* ── Inventory Quick Add ── */}
      <Block sx={{ p: 0, overflow: "hidden", bgcolor: isDark ? "#172033" : "#fff", border: isDark ? "1px solid rgba(148,163,184,0.16)" : "1px solid #e2e8f0" }}>
        <Box sx={{ px: 2.5, py: 2, borderBottom: isDark ? "1px solid rgba(148,163,184,0.14)" : "1px solid #e2e8f0" }}>
          <Stack direction={{ xs: "column", sm: "row" }} alignItems={{ xs: "flex-start", sm: "center" }} justifyContent="space-between" spacing={1.5}>
            <Box>
              <Typography fontWeight={900} color={isDark ? "#f8fafc" : "#0f172a"}>Add inventory items</Typography>
              <Typography variant="caption" sx={{ color: isDark ? "#94a3b8" : "#64748b" }}>
                Select an item, enter quantity, then press Add item. Repeat for multiple products.
              </Typography>
            </Box>
            <Chip size="small" label={`${componentItems.length} added`} sx={{ fontWeight: 900, bgcolor: alpha(BRAND, isDark ? 0.2 : 0.1), color: isDark ? "#93c5fd" : BRAND }} />
          </Stack>
        </Box>

        <Box sx={{ p: 2.5 }}>
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "0.8fr 0.8fr 1.6fr 0.45fr auto" }, gap: 1.5, alignItems: "center" }}>
            <ChipAC
              label="Category"
              options={allCategoriesList}
              value={componentCategory}
              onChange={(val) => {
                setComponentCategory(val || "");
                setComponentSubcategory("");
                setSelectedComponentItem(null);
              }}
            />
            <ChipAC
              label="Subcategory"
              options={subcategoryOptions}
              value={componentSubcategory}
              onChange={(val) => {
                setComponentSubcategory(val || "");
                setSelectedComponentItem(null);
              }}
            />
            <Autocomplete
              options={availableComponentItems}
              getOptionLabel={(opt) => (typeof opt === "string" ? opt : `${opt.itemName} (Stock: ${opt.stock})`)}
              renderOption={renderInventoryOption}
              value={selectedComponentItem}
              onChange={(_, newItem) => {
                setSelectedComponentItem(newItem);
                if (newItem?.category) setComponentCategory(newItem.category);
                if (newItem?.subcategory) setComponentSubcategory(newItem.subcategory);
              }}
              size="small"
              fullWidth
              loading={fetchingInventory}
              renderInput={(p) => <TextField {...p} label="Item" placeholder="Search inventory item" sx={getInputSx(isDark)} />}
              PaperComponent={(props) => (
                <Paper
                  {...props}
                  sx={{
                    bgcolor: isDark ? "#1e293b" : "#fff",
                    color: isDark ? "#f1f5f9" : "#1f2937",
                    border: isDark ? "1px solid rgba(255,255,255,0.1)" : undefined,
                  }}
                />
              )}
            />
            <TF label="Qty" type="number" value={componentQty} onChange={(e) => setComponentQty(e.target.value)} inputProps={{ min: 1 }} />
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={handleAddComponentItem}
              disabled={!selectedComponentItem}
              sx={{ minHeight: 40, px: 2.5, borderRadius: 2, fontWeight: 900, whiteSpace: "nowrap", bgcolor: BRAND, "&:hover": { bgcolor: "#1d4ed8" } }}
            >
              Add item
            </Button>
          </Box>

          <Box sx={{ mt: 2 }}>
            <InventorySummary item={selectedComponentItem} stockWarningAt={20} />
          </Box>
        </Box>
      </Block>

      {/* ── Added Items ── */}
      <Block label="Added items">
        {componentItems.length === 0 ? (
          <Paper elevation={0} sx={{ p: 2, borderRadius: 2, bgcolor: isDark ? "rgba(15,23,42,0.65)" : "#f8fafc", border: `1px dashed ${isDark ? "rgba(148,163,184,0.25)" : "#cbd5e1"}` }}>
            <Typography variant="body2" sx={{ color: isDark ? "#94a3b8" : "#64748b" }}>
              No item added yet. Use the form above to add solar panels, inverters, cables, or any other inventory item.
            </Typography>
          </Paper>
        ) : (
          <Stack spacing={1.25}>
            {componentItems.map((row, index) => {
              const amount = (Number(row.qty) || 0) * (Number(row.price) || 0);
              return (
                <Paper
                  key={row.id || `${row.itemName}-${index}`}
                  elevation={0}
                  sx={{
                    p: 1.5,
                    borderRadius: 2,
                    bgcolor: isDark ? "rgba(15,23,42,0.72)" : "#f8fafc",
                    border: `1px solid ${isDark ? "rgba(148,163,184,0.18)" : "#e2e8f0"}`,
                  }}
                >
                  <Stack direction={{ xs: "column", md: "row" }} alignItems={{ xs: "stretch", md: "center" }} spacing={1.5}>
                    <Stack direction="row" spacing={1.25} alignItems="center" sx={{ flex: 1, minWidth: 0 }}>
                      <Box sx={{ width: 38, height: 38, borderRadius: 2, bgcolor: alpha(BRAND, isDark ? 0.2 : 0.1), color: isDark ? "#93c5fd" : BRAND, display: "grid", placeItems: "center", flexShrink: 0 }}>
                        <Inventory2 fontSize="small" />
                      </Box>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography fontWeight={900} noWrap color={isDark ? "#f8fafc" : "#0f172a"}>
                          {row.itemName}
                        </Typography>
                        <Stack direction="row" flexWrap="wrap" gap={0.75} sx={{ mt: 0.6 }}>
                          <Chip size="small" label={row.category || "-"} sx={{ height: 22, fontWeight: 800, bgcolor: alpha("#3b82f6", isDark ? 0.18 : 0.1), color: isDark ? "#93c5fd" : "#1d4ed8" }} />
                          <Chip size="small" label={row.subcategory || "-"} sx={{ height: 22, fontWeight: 800, bgcolor: isDark ? "rgba(148,163,184,0.12)" : "#eef2f7", color: isDark ? "#cbd5e1" : "#475569" }} />
                          {row.brand && <Chip size="small" label={row.brand} sx={{ height: 22, fontWeight: 800, bgcolor: isDark ? "rgba(148,163,184,0.12)" : "#eef2f7", color: isDark ? "#cbd5e1" : "#475569" }} />}
                        </Stack>
                      </Box>
                    </Stack>

                    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "repeat(2, minmax(0, 1fr))", sm: "repeat(4, minmax(88px, 1fr))" }, gap: 1, minWidth: { md: 430 } }}>
                      <Box>
                        <Typography variant="caption" sx={{ color: isDark ? "#94a3b8" : "#64748b" }}>Qty</Typography>
                        <Typography fontWeight={900} color={isDark ? "#f8fafc" : "#0f172a"}>{row.qty}</Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" sx={{ color: isDark ? "#94a3b8" : "#64748b" }}>Price</Typography>
                        <Typography fontWeight={900} color={isDark ? "#f8fafc" : "#0f172a"}>Rs {Number(row.price || 0).toLocaleString("en-IN")}</Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" sx={{ color: isDark ? "#94a3b8" : "#64748b" }}>Stock</Typography>
                        <Typography fontWeight={900} color={Number(row.stock) > 0 ? (isDark ? "#86efac" : "#15803d") : "#ef4444"}>{row.stock}</Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" sx={{ color: isDark ? "#94a3b8" : "#64748b" }}>Amount</Typography>
                        <Typography fontWeight={900} color={isDark ? "#f8fafc" : "#0f172a"}>Rs {amount.toLocaleString("en-IN")}</Typography>
                      </Box>
                    </Box>

                    <Tooltip title="Remove item">
                      <IconButton onClick={() => handleRemoveComponentItem(row.id)} color="error" sx={{ alignSelf: { xs: "flex-end", md: "center" } }}>
                        <DeleteOutline />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                </Paper>
              );
            })}

            <Divider sx={{ borderColor: isDark ? "rgba(148,163,184,0.14)" : "#e2e8f0" }} />
            <Stack direction="row" alignItems="center" justifyContent="flex-end" spacing={1}>
              <Typography variant="body2" sx={{ color: isDark ? "#94a3b8" : "#64748b" }}>Items total</Typography>
              <Typography fontWeight={900} color={isDark ? "#f8fafc" : "#0f172a"}>Rs {componentTotal.toLocaleString("en-IN")}</Typography>
            </Stack>
          </Stack>
        )}
      </Block>
    </Stack>
  );
}

function StepWarranty({ form, updateField, updateValue }) {
  return (
    <Stack spacing={0}>
      <SectionHeader icon={<VerifiedOutlined />} title="Warranty & BOS" />

      <Block label="Warranty periods">
        <G cols={4}>
          <TF label="Panel (years)" value={form.panelWarrantyYears} onChange={updateField("panelWarrantyYears")} />
          <TF label="Inverter (years)" value={form.inverterWarrantyYears} onChange={updateField("inverterWarrantyYears")} />
          <TF label="BOS (years)" value={form.bosWarrantyYears} onChange={updateField("bosWarrantyYears")} />
          <TF label="Cables (years)" value={form.cableWarrantyYears} onChange={updateField("cableWarrantyYears")} />
        </G>
        <Box sx={{ mt: 2 }}>
          <F hint="Shown on the warranty table in the PDF. Leave blank to use your company template default.">
            <TF label="Performance guarantee" placeholder="e.g. 30 Yr Linear (80% at yr 25)" value={form.performanceGuarantee} onChange={updateField("performanceGuarantee")} />
          </F>
        </Box>
      </Block>

      <Block label="Balance of system">
        <G cols={3} sx={{ mb: 2 }}>
          <ChipAC label="Net & solar meter" options={netMeterOptions} value={form.netSolarMeter} onChange={updateValue("netSolarMeter")} freeSolo placeholder="Select or type brand…" />
          <TF label="DC cables & conduits" value={form.dcCablesConduits} onChange={updateField("dcCablesConduits")} />
          <TF label="DCDB / ACDB" value={form.dcdbAcdb} onChange={updateField("dcdbAcdb")} />
        </G>
        <G cols={2}>
          <TF label="Earthing (pits, strips, cables)" value={form.earthing} onChange={updateField("earthing")} />
          <TF label="Lightning arrestor" value={form.lightningArrestor} onChange={updateField("lightningArrestor")} />
        </G>
      </Block>
    </Stack>
  );
}

function StepFinancial({ form, updateField }) {
  return (
    <Stack spacing={0}>
      <SectionHeader icon={<CalculateOutlined />} title="Financial assumptions" />
      <Block>
        <BlockLabel title="Financial assumptions" hint="Leave blank to use defaults" />
        <G cols={3}>
          <TF label="Electricity tariff (₹/unit)" placeholder="Default 8" value={form.electricityTariff} onChange={updateField("electricityTariff")} />
          <TF label="Tariff escalation (%/year)" placeholder="Default 3" value={form.tariffEscalation} onChange={updateField("tariffEscalation")} />
          <TF label="Panel degradation (%/year)" placeholder="Default 0.5" value={form.panelDegradation} onChange={updateField("panelDegradation")} />
          <TF label="Projection years" placeholder="Default 5" value={form.projectionYears} onChange={updateField("projectionYears")} />
          <TF label="Generation per kW (units/year)" placeholder="Default 1500" value={form.generationPerKw} onChange={updateField("generationPerKw")} />
        </G>
      </Block>
    </Stack>
  );
}

function StepPayment({ paymentMilestones, updateMilestone, addMilestone, removeMilestone, paymentTotal, form, updateField }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const inputSx = getInputSx(isDark);

  return (
    <Stack spacing={0}>
      <SectionHeader icon={<PaymentsOutlined />} title="Payment schedule" />

      <Block>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
          <BlockLabel title="Payment milestones" />
          <Chip
            label={`Total: ${paymentTotal}%`}
            sx={{
              bgcolor: paymentTotal === 100
                ? (isDark ? "rgba(16, 185, 129, 0.2)" : "#e6f8f4")
                : (isDark ? "rgba(245, 158, 11, 0.2)" : "#fff3e0"),
              color: paymentTotal === 100
                ? (isDark ? "#34d399" : "#085041")
                : (isDark ? "#fbbf24" : "#854f0b"),
              fontWeight: 700,
              borderRadius: 2,
              height: 26,
              fontSize: "0.78rem",
            }}
          />
        </Box>
        <Stack spacing={1}>
          {paymentMilestones.map((item, i) => (
            <Stack key={i} direction="row" spacing={1} alignItems="center">
              <Typography sx={{ width: 20, color: isDark ? "#64748b" : "#94a3b8", fontSize: "0.8rem", textAlign: "center", flexShrink: 0 }}>{i + 1}</Typography>
              <TF value={item.label} onChange={(e) => updateMilestone(i, "label", e.target.value)} />
              <TF value={item.percent} onChange={(e) => updateMilestone(i, "percent", e.target.value)} sx={{ ...inputSx, width: 90, flexShrink: 0 }} />
              <Typography sx={{ color: isDark ? "#64748b" : "#94a3b8", fontWeight: 700, flexShrink: 0 }}>%</Typography>
              <IconButton onClick={() => removeMilestone(i)} size="small" sx={{ color: "#f9735b", flexShrink: 0 }}>
                <HighlightOff fontSize="small" />
              </IconButton>
            </Stack>
          ))}
        </Stack>
        <Button
          variant="outlined"
          startIcon={<Add />}
          onClick={addMilestone}
          sx={{
            mt: 1.5,
            borderRadius: 2,
            textTransform: "none",
            borderColor: isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.18)",
            color: isDark ? "#cbd5e1" : "#475569",
          }}
        >
          Add milestone
        </Button>
      </Block>

      <Block>
        <BlockLabel title="GST / payment note" hint="Shown below the milestones" />
        <TextField
          multiline
          minRows={2}
          fullWidth
          size="small"
          placeholder="e.g. GST is included in the quoted amount. Leave blank to use the standard GST note."
          value={form.paymentNote}
          onChange={updateField("paymentNote")}
          sx={inputSx}
        />
      </Block>
    </Stack>
  );
}

function StepSections({ sectionsToShow, toggle }) {
  return (
    <Stack spacing={0}>
      <SectionHeader icon={<VisibilityOutlined />} title="Sections to show" />
      <Block>
        <BlockLabel title="Sections to show in the quotation" hint="Turn off to hide from PDF" />
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 1.25 }}>
          {sectionsToShow.map((item, i) => (
            <ToggleRow key={item.label} label={item.label} checked={item.enabled} onChange={() => toggle(i)} />
          ))}
        </Box>
      </Block>
    </Stack>
  );
}

function StepTestimonials({ testimonials, update, add, remove, reset }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const inputSx = getInputSx(isDark);

  return (
    <Stack spacing={0}>
      <SectionHeader icon={<StarBorderOutlined />} title="Customer testimonials & project gallery" />
      <Block>
        <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2} flexWrap="wrap" gap={1}>
          <BlockLabel
            title="Customer reviews & installed project cards"
            hint="Displayed right before the Installation Process page on the quotation"
          />
          <Button
            variant="text"
            size="small"
            startIcon={<Refresh fontSize="small" />}
            onClick={reset}
            sx={{ borderRadius: 2, textTransform: "none", color: isDark ? "#94a3b8" : "#64748b" }}
          >
            Reset to Defaults
          </Button>
        </Stack>

        <Stack spacing={2.5}>
          {testimonials.map((t, i) => (
            <Paper
              key={i}
              variant="outlined"
              sx={{
                p: 2.5,
                borderRadius: 2.5,
                borderColor: isDark ? "rgba(255,255,255,0.09)" : "rgba(0,0,0,0.1)",
                bgcolor: isDark ? "#0f172a" : "#f8fafc",
              }}
            >
              <Stack direction={{ xs: "column", md: "row" }} spacing={2.5} alignItems="flex-start">
                {/* Image Upload Box */}
                <Box sx={{ width: { xs: "100%", md: 180 }, shrink: 0 }}>
                  <Box
                    sx={{
                      width: "100%",
                      height: 125,
                      borderRadius: 2,
                      overflow: "hidden",
                      bgcolor: isDark ? "#1e293b" : "#e2e8f0",
                      mb: 1,
                      border: isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid #cbd5e1",
                    }}
                  >
                    <img
                      src={t.image || "/solar-rooftop-cover-4k.png"}
                      alt={t.name || "Testimonial"}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = "/solar-rooftop-cover-4k.png";
                      }}
                    />
                  </Box>
                  <Button
                    variant="contained"
                    component="label"
                    size="small"
                    fullWidth
                    startIcon={<PhotoCameraOutlined sx={{ fontSize: 16 }} />}
                    sx={{
                      borderRadius: 2,
                      textTransform: "none",
                      fontWeight: 700,
                      fontSize: 11.5,
                      bgcolor: BRAND,
                      "&:hover": { bgcolor: "#1d4ed8" },
                    }}
                  >
                    Change Image
                    <input
                      type="file"
                      hidden
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = (evt) => {
                          update(i, "image", evt.target?.result);
                        };
                        reader.readAsDataURL(file);
                      }}
                    />
                  </Button>
                </Box>

                {/* Form Fields */}
                <Box sx={{ flex: 1, width: "100%" }}>
                  <Stack spacing={1.5}>
                    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1.5fr 1fr 0.9fr" }, gap: 1.5 }}>
                      <TF
                        value={t.name}
                        onChange={(e) => update(i, "name", e.target.value)}
                        label="Customer / Client name"
                        placeholder="e.g. Binapani Panda"
                      />
                      <TF
                        value={t.location}
                        onChange={(e) => update(i, "location", e.target.value)}
                        label="Location / City"
                        placeholder="e.g. Bidyadharapur, Cuttack"
                      />
                      <FormControl size="small" fullWidth sx={inputSx}>
                        <InputLabel>Rating</InputLabel>
                        <Select
                          value={t.rating || 5}
                          label="Rating"
                          onChange={(e) => update(i, "rating", e.target.value)}
                        >
                          <MenuItem value={5}>⭐⭐⭐⭐⭐ (5 Star)</MenuItem>
                          <MenuItem value={4}>⭐⭐⭐⭐ (4 Star)</MenuItem>
                          <MenuItem value={3}>⭐⭐⭐ (3 Star)</MenuItem>
                        </Select>
                      </FormControl>
                    </Box>

                    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 1.5 }}>
                      <TF
                        value={t.systemCapacity || ""}
                        onChange={(e) => update(i, "systemCapacity", e.target.value)}
                        label="System capacity / Scheme badge"
                        placeholder="e.g. RTS On-Grid 4kW / PM-Suryaghar"
                      />
                      <TF
                        value={t.structureType || ""}
                        onChange={(e) => update(i, "structureType", e.target.value)}
                        label="Structure type / Verified tag"
                        placeholder="e.g. Ballast Type Structure"
                      />
                    </Box>

                    <TextField
                      multiline
                      minRows={2}
                      fullWidth
                      size="small"
                      label="Testimonial / Installation story"
                      placeholder="Enter customer feedback or installation story..."
                      value={t.text}
                      onChange={(e) => update(i, "text", e.target.value)}
                      sx={inputSx}
                    />

                    <Stack direction="row" justifyContent="flex-end">
                      <Button
                        variant="text"
                        color="error"
                        size="small"
                        startIcon={<DeleteOutline fontSize="small" />}
                        onClick={() => remove(i)}
                        sx={{ textTransform: "none", fontWeight: 700 }}
                      >
                        Delete Testimonial
                      </Button>
                    </Stack>
                  </Stack>
                </Box>
              </Stack>
            </Paper>
          ))}
        </Stack>

        <Button
          variant="outlined"
          startIcon={<Add />}
          onClick={add}
          sx={{
            mt: 2,
            borderRadius: 2,
            textTransform: "none",
            fontWeight: 700,
            borderColor: isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.18)",
            color: isDark ? "#cbd5e1" : "#475569",
          }}
        >
          Add New Testimonial
        </Button>
      </Block>
    </Stack>
  );
}

function StepInstallation({ steps: isteps, update, add, remove }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const inputSx = getInputSx(isDark);

  return (
    <Stack spacing={0}>
      <SectionHeader icon={<BuildCircleOutlined />} title="Installation process" />
      <Block>
        <BlockLabel title="Installation steps" hint="Shown on the quotation" />
        <Stack spacing={1.5}>
          {isteps.map((step, i) => (
            <Paper
              key={i}
              variant="outlined"
              sx={{
                p: 2,
                borderRadius: 2.5,
                borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.09)",
                bgcolor: isDark ? "#0f172a" : "#fff",
                display: "grid",
                gridTemplateColumns: "1fr auto",
                gap: 1.5,
              }}
            >
              <Stack spacing={1.25}>
                <TF value={step.title} onChange={(e) => update(i, "title", e.target.value)} label="Step title" />
                <TextField
                  multiline
                  minRows={2}
                  fullWidth
                  size="small"
                  label="Description"
                  value={step.description}
                  onChange={(e) => update(i, "description", e.target.value)}
                  sx={inputSx}
                />
              </Stack>
              <IconButton onClick={() => remove(i)} size="small" sx={{ color: "#f9735b", alignSelf: "flex-start", mt: 0.5 }}>
                <HighlightOff fontSize="small" />
              </IconButton>
            </Paper>
          ))}
        </Stack>
        <Button
          variant="outlined"
          startIcon={<Add />}
          onClick={add}
          sx={{
            mt: 1.5,
            borderRadius: 2,
            textTransform: "none",
            borderColor: isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.18)",
            color: isDark ? "#cbd5e1" : "#475569",
          }}
        >
          Add step
        </Button>
      </Block>
    </Stack>
  );
}

function StepTerms({ termsGroups, updateHeading, updatePoint, addPoint, removePoint, addGroup, removeGroup }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  return (
    <Stack spacing={0}>
      <SectionHeader icon={<DescriptionOutlined />} title="Terms & conditions" />
      <Block>
        <BlockLabel title="Terms groups" hint="Groups of bullet points shown on the quotation" />
        <Stack spacing={2}>
          {termsGroups.map((group, gi) => (
            <Paper
              key={gi}
              variant="outlined"
              sx={{
                p: 2,
                borderRadius: 2.5,
                borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.09)",
                bgcolor: isDark ? "#0f172a" : "#fff",
              }}
            >
              <Stack spacing={1.25}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <TF value={group.heading} onChange={(e) => updateHeading(gi, e.target.value)} label="Group heading" />
                  <IconButton onClick={() => removeGroup(gi)} size="small" sx={{ color: "#f9735b", flexShrink: 0 }}>
                    <DeleteOutline fontSize="small" />
                  </IconButton>
                </Stack>
                {group.points.map((pt, pi) => (
                  <Stack key={pi} direction="row" spacing={1} alignItems="center">
                    <Typography sx={{ color: isDark ? "#64748b" : "#94a3b8", fontSize: "1.2rem", lineHeight: 1, flexShrink: 0 }}>·</Typography>
                    <TF value={pt} onChange={(e) => updatePoint(gi, pi, e.target.value)} />
                    <IconButton onClick={() => removePoint(gi, pi)} size="small" sx={{ color: "#f9735b", flexShrink: 0 }}>
                      <HighlightOff fontSize="small" />
                    </IconButton>
                  </Stack>
                ))}
                <Button
                  variant="text"
                  startIcon={<Add fontSize="small" />}
                  onClick={() => addPoint(gi)}
                  sx={{ alignSelf: "flex-start", textTransform: "none", color: isDark ? "#94a3b8" : "#64748b", fontSize: "0.8rem" }}
                >
                  Add point
                </Button>
              </Stack>
            </Paper>
          ))}
        </Stack>
        <Button
          variant="outlined"
          startIcon={<Add />}
          onClick={addGroup}
          sx={{
            mt: 1.5,
            borderRadius: 2,
            textTransform: "none",
            borderColor: isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.18)",
            color: isDark ? "#cbd5e1" : "#475569",
          }}
        >
          Add terms group
        </Button>
      </Block>
    </Stack>
  );
}

function FooterActions({ onCancel, onSave, onTogglePreview, splitPreview, saveLabel, activeStep, onStepChange, totalSteps = 9 }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  return (
    <Box
      sx={{
        mt: 4,
        pt: 2.5,
        pb: 1,
        borderTop: isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.08)",
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 2,
      }}
    >
      <Stack direction="row" spacing={1.5} alignItems="center">
        <Button
          variant="outlined"
          onClick={onCancel}
          sx={{
            borderRadius: 2,
            textTransform: "none",
            borderColor: isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.18)",
            color: isDark ? "#cbd5e1" : "#475569",
            fontWeight: 600,
            fontSize: "0.85rem",
          }}
        >
          Cancel
        </Button>
        {activeStep > 1 && (
          <Button
            variant="outlined"
            startIcon={<ArrowBack fontSize="small" />}
            onClick={() => onStepChange(activeStep - 1)}
            sx={{
              borderRadius: 2,
              textTransform: "none",
              borderColor: isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.18)",
              color: isDark ? "#cbd5e1" : "#475569",
              fontWeight: 600,
              fontSize: "0.85rem",
            }}
          >
            Previous
          </Button>
        )}
      </Stack>

      <Stack direction="row" spacing={1.5} alignItems="center">
        <Button
          variant={splitPreview ? "contained" : "outlined"}
          startIcon={splitPreview ? <VisibilityOffOutlined fontSize="small" /> : <VisibilityOutlined fontSize="small" />}
          onClick={onTogglePreview}
          sx={{
            borderRadius: 2,
            textTransform: "none",
            borderColor: isDark ? "#3b82f6" : BRAND,
            color: splitPreview ? "#fff" : (isDark ? "#60a5fa" : BRAND),
            bgcolor: splitPreview ? BRAND : (isDark ? "rgba(59, 130, 246, 0.1)" : "rgba(37, 99, 235, 0.04)"),
            fontWeight: 600,
            fontSize: "0.85rem",
            "&:hover": {
              borderColor: isDark ? "#60a5fa" : "#1d4ed8",
              bgcolor: splitPreview ? "#1d4ed8" : (isDark ? "rgba(59, 130, 246, 0.2)" : "rgba(37, 99, 235, 0.08)"),
            },
          }}
        >
          {splitPreview ? "Hide preview" : "Live preview"}
        </Button>

        {activeStep < totalSteps && (
          <Button
            variant="contained"
            endIcon={<ArrowForward fontSize="small" />}
            onClick={() => onStepChange(activeStep + 1)}
            sx={{
              borderRadius: 2,
              textTransform: "none",
              bgcolor: isDark ? "#334155" : "#e2e8f0",
              color: isDark ? "#f8fafc" : "#1e293b",
              boxShadow: "none",
              fontWeight: 600,
              fontSize: "0.85rem",
              "&:hover": { bgcolor: isDark ? "#475569" : "#cbd5e1", boxShadow: "none" },
            }}
          >
            Next
          </Button>
        )}

        <Button
          variant="contained"
          startIcon={<CheckCircleOutline fontSize="small" />}
          onClick={onSave}
          sx={{
            borderRadius: 2,
            textTransform: "none",
            bgcolor: isDark ? "#2563eb" : BRAND,
            boxShadow: "none",
            fontWeight: 600,
            fontSize: "0.85rem",
            "&:hover": { bgcolor: "#1d4ed8", boxShadow: "none" },
          }}
        >
          {saveLabel}
        </Button>
      </Stack>
    </Box>
  );
}

// ─── main component ───────────────────────────────────────────────────────────
export default function QuotationEditor({ initialMode = null }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const sectionBg = isDark ? "#0f172a" : "#f5f7fa";

  const navigate = useNavigate();
  const location = useLocation();
  const { fetchAPI } = useAuth();
  const savedQuotation = location.state?.quotationData || loadCurrentQuotation();
  const mode = initialMode || location.state?.mode || null;
  const sourceLead = location.state?.lead || savedQuotation?.lead || null;
  const quotationTitle = savedQuotation?.quotationTitle || location.state?.quotationTitle || "test 1";
  const isCreateMode = mode === "create" || !savedQuotation?.savedAt;
  const pageTitle = isCreateMode ? "Create quotation" : "Edit quotation";
  const helperText = isCreateMode
    ? "Fill in customer, system, pricing, warranty, and payment details"
    : "Update quote parameters, components, warranty, pricing, or preview";
  const saveLabel = isCreateMode ? "Create quotation" : "Save changes";

  const [activeStep, setActiveStep] = useState(1);
  const [splitPreview, setSplitPreview] = useState(false);
  const [form, setForm] = useState(() => {
    const rawLeadAddress = [
      sourceLead?.address,
      sourceLead?.city,
      sourceLead?.state,
      sourceLead?.pincode,
    ].filter(Boolean).join(", ");

    const leadName = sourceLead?.customerName || sourceLead?.name || sourceLead?.fullName || savedQuotation?.leadName || "";
    const leadPhone = sourceLead?.phone || sourceLead?.mobile || sourceLead?.whatsappNumber || "";
    const leadSurveyPhotos = (Array.isArray(sourceLead?.siteSurvey?.photos) ? sourceLead.siteSurvey.photos : [])
      .map((p) => (typeof p === "string" ? p : p?.url || p?.uri || p?.path || p?.src || ""))
      .filter(Boolean);

    const baseDefaults = {
      customerName: leadName || "Rahul Das",
      customerPhone: leadPhone || "9938849920",
      customerAddress: rawLeadAddress || "Itanagar, Arunachal Pradesh - 754120",
      validityDays: savedQuotation?.validityDays ? String(savedQuotation.validityDays) : "14",
      proposalTitle: "",
      proposalDescription: "",
      companyName: "M/S SAHOO CONSTRUCTION",
      companyPhone: "7008790475",
      companyEmail: "sahooconstruction00@gmail.com",
      companyLocation: "Cuttack, Odisha",
      systemSize: "2000.00", totalCost: "2000.00", structureCapacity: "",
      governmentSubsidy: subsidyOptions[0], subsidyAmount: "0", systemType: "Off-grid",
      batteryBackup: true, financeRequired: true, batteryBrand: "Luminous",
      batteryCapacity: "200", batteryType: "LFP", batteryQty: "200", batteryWarranty: "2",
      salutation: "None", customerType: "Commercial", monthlyBill: "", roofArea: "2000.00",
      wattPeak: "540", panelQty: "200", panelBrand: "Waaree Energies", panelCategory: "TopCon (N-Type)",
      inverterSize: "200.00", inverterQty: "1", phase: "Three Phase", inverterType: "String",
      inverterBrand: "Havells Solar", cableBrand: "Havells", dcCableSpec: "4 sq mm",
      acCableSpec: "As per design", structureType: "", structureSize: "120*40", structureBrand: "Apollo",
      orientation: "South Facing", tilt: "Optimal Tilt",
      siteSurveyPhotos: leadSurveyPhotos.length ? leadSurveyPhotos : [],
      siteSurveyPhotoUrl: leadSurveyPhotos[0] || "",
      showSiteSurveyPhoto: true,
      rooftopLayoutImage: "",
      threeDDesignCaptureUrl: "",
      showRooftopLayout: true,
      layoutDesignTitle: "Solar panel layout design will be prepared after site survey.",
      layoutDesignNote: "",
      shadowFreeNote: "Optimised for your location's latitude for maximum solar capture throughout the year.",
      elevatedMountingNote: "",
      sunPathNote: "No obstructions within the critical 9 AM – 3 PM window. Shadow loss < 2%.",
      componentItems: [],
      panelWarrantyYears: "12", inverterWarrantyYears: "7", bosWarrantyYears: "5",
      cableWarrantyYears: "1", performanceGuarantee: "", netSolarMeter: "",
      dcCablesConduits: "Reputed Make", dcdbAcdb: "Reputed Make",
      earthing: "Reputed Make — 3 Nos.", lightningArrestor: "Reputed Make — 1 No.",
      electricityTariff: "", tariffEscalation: "", panelDegradation: "",
      projectionYears: "", generationPerKw: "", paymentNote: "",
    };

    return {
      ...baseDefaults,
      ...(savedQuotation?.form || {}),
    };
  });

  const [paymentMilestones, setPaymentMilestones] = useState(() => savedQuotation?.paymentMilestones || [
    { label: "Advance — on order confirmation", percent: "30" },
    { label: "On delivery of materials at site", percent: "50" },
    { label: "On completion of installation", percent: "10" },
    { label: "On commissioning & net meter installation", percent: "10" },
  ]);
  const [testimonials, setTestimonials] = useState(() => savedQuotation?.testimonials || initialTestimonials);
  const [sectionsToShow, setSectionsToShow] = useState(() => savedQuotation?.sectionsToShow || sectionShowDefaults);
  const [installationSteps, setInstallationSteps] = useState(() => savedQuotation?.installationSteps || initialInstallationSteps);
  const [termsGroups, setTermsGroups] = useState(() => savedQuotation?.termsGroups || initialTermsGroups);

  const pricePerKw = useMemo(() => {
    const size = Number(form.systemSize), total = Number(form.totalCost);
    if (!size || isNaN(size) || isNaN(total)) return "₹0/kW";
    return `₹${Math.round(total / size).toLocaleString("en-IN")}/kW`;
  }, [form.systemSize, form.totalCost]);

  const paymentTotal = useMemo(
    () => paymentMilestones.reduce((sum, m) => sum + (Number(m.percent) || 0), 0),
    [paymentMilestones],
  );

  const currentPreviewRecord = useMemo(() => {
    const editingQuotation = mode === "edit" ? savedQuotation : null;
    return buildQuotationRecord({
      existingQuotation: editingQuotation,
      lead: sourceLead,
      quotationTitle,
      form,
      paymentMilestones,
      testimonials,
      sectionsToShow,
      installationSteps,
      termsGroups,
    });
  }, [mode, savedQuotation, sourceLead, quotationTitle, form, paymentMilestones, testimonials, sectionsToShow, installationSteps, termsGroups]);

  const updateField = (field) => (e) => {
    const value = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setForm((prev) => ({ ...prev, [field]: value }));
  };
  const updateValue = (field) => (value) => setForm((prev) => ({ ...prev, [field]: value }));
  const updateMilestone = (i, key, val) => setPaymentMilestones((prev) => prev.map((m, idx) => idx === i ? { ...m, [key]: val } : m));
  const addMilestone = () => setPaymentMilestones((prev) => [...prev, { label: "", percent: "0" }]);
  const removeMilestone = (i) => setPaymentMilestones((prev) => prev.filter((_, idx) => idx !== i));
  const updateTestimonial = (i, key, val) => setTestimonials((prev) => prev.map((t, idx) => idx === i ? { ...t, [key]: val } : t));
  const addTestimonial = () => setTestimonials((prev) => [
    ...prev,
    {
      name: "New Client",
      location: "Cuttack, Odisha",
      rating: 5,
      systemCapacity: "RTS On-Grid 5kW",
      structureType: "Standard Mounting",
      text: "Excellent solar rooftop installation and timely handover.",
      image: "/solar-rooftop-cover-4k.png",
    },
  ]);
  const removeTestimonial = (i) => setTestimonials((prev) => prev.filter((_, idx) => idx !== i));
  const resetTestimonials = () => setTestimonials(initialTestimonials);
  const toggleSection = (i) => setSectionsToShow((prev) => prev.map((s, idx) => idx === i ? { ...s, enabled: !s.enabled } : s));
  const updateStep = (i, key, val) => setInstallationSteps((prev) => prev.map((s, idx) => idx === i ? { ...s, [key]: val } : s));
  const addStep = () => setInstallationSteps((prev) => [...prev, { title: `${prev.length + 1}. New step`, description: "" }]);
  const removeStep = (i) => setInstallationSteps((prev) => prev.filter((_, idx) => idx !== i));
  const updateTermsHeading = (gi, val) => setTermsGroups((prev) => prev.map((g, i) => i === gi ? { ...g, heading: val } : g));
  const updateTermsPoint = (gi, pi, val) => setTermsGroups((prev) => prev.map((g, i) => i === gi ? { ...g, points: g.points.map((p, j) => j === pi ? val : p) } : g));
  const addTermsPoint = (gi) => setTermsGroups((prev) => prev.map((g, i) => i === gi ? { ...g, points: [...g.points, ""] } : g));
  const removeTermsPoint = (gi, pi) => setTermsGroups((prev) => prev.map((g, i) => i === gi ? { ...g, points: g.points.filter((_, j) => j !== pi) } : g));
  const addTermsGroup = () => setTermsGroups((prev) => [...prev, { heading: "New group", points: [""] }]);
  const removeTermsGroup = (gi) => setTermsGroups((prev) => prev.filter((_, i) => i !== gi));

  const saveQuotation = async () => {
    const editingQuotation = mode === "edit" ? savedQuotation : null;
    let latestLead = sourceLead;
    if (sourceLead?._id) {
      try {
        const response = await fetchAPI(`/lead/getLeadById/${sourceLead._id}`);
        latestLead = response?.result || response?.lead || sourceLead;
      } catch {
        latestLead = sourceLead;
      }
    }

    const nextQuotation = buildQuotationRecord({
      existingQuotation: editingQuotation,
      lead: latestLead,
      quotationTitle,
      form,
      paymentMilestones,
      testimonials,
      sectionsToShow,
      installationSteps,
      termsGroups,
    });

    upsertQuotation(nextQuotation);

    if (latestLead?._id) {
      try {
        await fetchAPI(`/lead/${latestLead._id}/activity`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "Quotation",
            title: isCreateMode ? "Quotation created" : "Quotation updated",
            message: `${nextQuotation.quotationNumber || "Quotation"} saved for ${nextQuotation.leadName || "lead"}`,
            status: nextQuotation.status || "draft",
            quotationId: nextQuotation.id,
            totalCost: nextQuotation.totalCost || nextQuotation.form?.totalCost || "",
            actionDetails: {
              quotationNumber: nextQuotation.quotationNumber,
              systemSize: nextQuotation.systemSize || nextQuotation.form?.systemSize,
              totalCost: nextQuotation.totalCost || nextQuotation.form?.totalCost,
            },
          }),
        });
      } catch (error) {
        console.warn("Failed to sync quotation activity:", error);
      }
      navigate(`/all-leads/${latestLead._id}`, {
        replace: true,
        state: {
          lead: latestLead,
          initialTab: "quotations",
          quotationId: nextQuotation.id,
          quotationUpdatedAt: nextQuotation.savedAt,
        },
      });
      return;
    }

    navigate(`/quotation?quoteId=${nextQuotation.id}`, {
      replace: true,
      state: {
        quotationId: nextQuotation.id,
        quotationUpdatedAt: nextQuotation.savedAt,
      },
    });
  };

  const renderStep = () => {
    switch (activeStep) {
      case 1: return <StepCustomer form={form} updateField={updateField} updateValue={updateValue} pricePerKw={pricePerKw} />;
      case 2: return <StepComponents form={form} updateField={updateField} updateValue={updateValue} />;
      case 3: return <StepWarranty form={form} updateField={updateField} updateValue={updateValue} />;
      case 4: return <StepFinancial form={form} updateField={updateField} />;
      case 5: return <StepPayment paymentMilestones={paymentMilestones} updateMilestone={updateMilestone} addMilestone={addMilestone} removeMilestone={removeMilestone} paymentTotal={paymentTotal} form={form} updateField={updateField} />;
      case 6: return <StepTestimonials testimonials={testimonials} update={updateTestimonial} add={addTestimonial} remove={removeTestimonial} reset={resetTestimonials} />;
      case 7: return <StepInstallation steps={installationSteps} update={updateStep} add={addStep} remove={removeStep} />;
      case 8: return <StepTerms termsGroups={termsGroups} updateHeading={updateTermsHeading} updatePoint={updateTermsPoint} addPoint={addTermsPoint} removePoint={removeTermsPoint} addGroup={addTermsGroup} removeGroup={removeTermsGroup} />;
      case 9: return <StepSections sectionsToShow={sectionsToShow} toggle={toggleSection} />;
      default: return null;
    }
  };

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: sectionBg, p: { xs: 1, md: 2 } }}>
      <Paper
        elevation={0}
        sx={{
          minHeight: "calc(100vh - 32px)",
          borderRadius: 3.5,
          border: isDark ? "1px solid rgba(255,255,255,0.08)" : "0.5px solid rgba(0,0,0,0.09)",
          overflow: "hidden",
          bgcolor: isDark ? "#1e293b" : "#fff",
        }}
      >
        {/* ── top bar ── */}
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{
            px: { xs: 2, md: 3 },
            py: 1.75,
            borderBottom: isDark ? "1px solid rgba(255,255,255,0.08)" : "0.5px solid rgba(0,0,0,0.08)",
            bgcolor: isDark ? "#1e293b" : "#fff",
          }}
        >
          <Stack direction="row" spacing={1.5} alignItems="center">
            <IconButton
              onClick={() => navigate(-1)}
              sx={{
                border: isDark ? "1px solid rgba(255,255,255,0.16)" : "0.5px solid rgba(0,0,0,0.16)",
                borderRadius: 2,
                color: isDark ? "#f1f5f9" : "#1f2937",
                p: 0.75,
              }}
            >
              <ArrowBack fontSize="small" />
            </IconButton>
            <Box>
              <Typography sx={{ fontWeight: 700, fontSize: "0.95rem", color: isDark ? "#f8fafc" : "#1f2937" }}>
                {pageTitle} - <Box component="span" sx={{ color: isDark ? "#60a5fa" : BRAND }}>{quotationTitle}</Box>
              </Typography>
              <Typography variant="caption" sx={{ color: isDark ? "#94a3b8" : "#6b7280" }}>
                {helperText}
              </Typography>
            </Box>
          </Stack>
          <Stack direction="row" spacing={1} alignItems="center">
            <Button
              variant="outlined"
              onClick={() => navigate(-1)}
              sx={{
                borderRadius: 2,
                textTransform: "none",
                borderColor: isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.18)",
                color: isDark ? "#cbd5e1" : "#475569",
                fontSize: "0.85rem",
              }}
            >
              Cancel
            </Button>
            <Button
              variant={splitPreview ? "contained" : "outlined"}
              startIcon={splitPreview ? <VisibilityOffOutlined fontSize="small" /> : <VisibilityOutlined fontSize="small" />}
              onClick={() => setSplitPreview((prev) => !prev)}
              sx={{
                borderRadius: 2,
                textTransform: "none",
                borderColor: isDark ? "#3b82f6" : "#2563eb",
                color: splitPreview ? "#fff" : (isDark ? "#60a5fa" : "#2563eb"),
                bgcolor: splitPreview ? BRAND : (isDark ? "rgba(59, 130, 246, 0.1)" : "rgba(37, 99, 235, 0.04)"),
                fontWeight: 600,
                fontSize: "0.85rem",
                "&:hover": {
                  borderColor: isDark ? "#60a5fa" : "#1d4ed8",
                  bgcolor: splitPreview ? "#1d4ed8" : (isDark ? "rgba(59, 130, 246, 0.2)" : "rgba(37, 99, 235, 0.08)"),
                },
              }}
            >
              {splitPreview ? "Hide Preview" : "Preview"}
            </Button>
            <Button
              variant="contained"
              startIcon={<CheckCircleOutline fontSize="small" />}
              onClick={saveQuotation}
              sx={{
                borderRadius: 2,
                textTransform: "none",
                bgcolor: isDark ? "#2563eb" : BRAND,
                boxShadow: "none",
                fontSize: "0.85rem",
                "&:hover": { bgcolor: "#1d4ed8", boxShadow: "none" },
              }}
            >
              {saveLabel}
            </Button>
          </Stack>
        </Stack>

        {/* ── Main content area: split side-by-side or single column ── */}
        <Box
          sx={{
            display: "flex",
            minHeight: "calc(100vh - 85px)",
            maxHeight: { md: "calc(100vh - 85px)" },
            flexDirection: { xs: "column", md: "row" },
            overflow: "hidden",
          }}
        >
          {/* ── Left Half: Form Steps & Editor Inputs ── */}
          <Box
            sx={{
              display: "flex",
              flexDirection: { xs: "column", sm: "row" },
              width: splitPreview ? { xs: "100%", md: "50%" } : "100%",
              maxWidth: splitPreview ? { md: "50%" } : "100%",
              flexShrink: 0,
              borderRight: splitPreview ? (isDark ? "1px solid rgba(255,255,255,0.12)" : "1.5px solid rgba(0,0,0,0.12)") : "none",
              height: { md: "calc(100vh - 85px)" },
              overflow: "hidden",
              transition: "width 0.2s ease",
            }}
          >
            {/* ── Step Sidebar ── */}
            <Box
              sx={{
                width: { xs: "100%", sm: splitPreview ? 215 : 245 },
                borderRight: { xs: "none", sm: isDark ? "1px solid rgba(255,255,255,0.08)" : "0.5px solid rgba(0,0,0,0.08)" },
                borderBottom: { xs: isDark ? "1px solid rgba(255,255,255,0.08)" : "0.5px solid rgba(0,0,0,0.08)", sm: "none" },
                p: { xs: 1.25, md: splitPreview ? 1.5 : 2 },
                bgcolor: isDark ? "#1e293b" : "#fff",
                flexShrink: 0,
                overflowY: "auto",
                maxHeight: { md: "calc(100vh - 85px)" },
              }}
            >
              <Stack spacing={0.5}>
                {steps.map((step) => {
                  const active = step.id === activeStep;
                  return (
                    <Button
                      key={step.id}
                      fullWidth
                      variant="text"
                      onClick={() => setActiveStep(step.id)}
                      startIcon={
                        <Stack direction="row" spacing={0.75} alignItems="center">
                          <Box
                            sx={{
                              width: 22,
                              height: 22,
                              borderRadius: "50%",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: "0.7rem",
                              fontWeight: 700,
                              flexShrink: 0,
                              bgcolor: active
                                ? (isDark ? "#3b82f6" : BRAND)
                                : (isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.06)"),
                              color: active ? "#fff" : (isDark ? "#94a3b8" : "#64748b"),
                              transition: "all .15s",
                            }}
                          >
                            {step.id}
                          </Box>
                          <Box sx={{ color: active ? (isDark ? "#60a5fa" : BRAND) : (isDark ? "#64748b" : "#94a3b8"), display: "flex", alignItems: "center" }}>
                            {step.icon}
                          </Box>
                        </Stack>
                      }
                      sx={{
                        justifyContent: "flex-start",
                        textTransform: "none",
                        py: 1,
                        px: 1.25,
                        borderRadius: 2,
                        bgcolor: active
                          ? (isDark ? "rgba(59,130,246,0.2)" : BRAND_LIGHT)
                          : "transparent",
                        color: active
                          ? (isDark ? "#93c5fd" : BRAND_TEXT)
                          : (isDark ? "#94a3b8" : "#64748b"),
                        fontSize: splitPreview ? "0.81rem" : "0.84rem",
                        fontWeight: active ? 700 : 500,
                        textAlign: "left",
                        "& .MuiButton-startIcon": { mr: 1 },
                        "&:hover": {
                          bgcolor: active
                            ? (isDark ? "rgba(59,130,246,0.25)" : "#dfe9ff")
                            : (isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)"),
                        },
                        transition: "all .15s",
                      }}
                    >
                      <Typography
                        sx={{
                          fontSize: "inherit",
                          fontWeight: "inherit",
                          lineHeight: 1.25,
                          textAlign: "left",
                          whiteSpace: "normal",
                          wordBreak: "break-word",
                        }}
                      >
                        {step.label}
                      </Typography>
                    </Button>
                  );
                })}
              </Stack>
            </Box>

            {/* ── Form Inputs Container ── */}
            <Box
              sx={{
                flex: 1,
                p: { xs: 2, md: splitPreview ? 2.5 : 3.5 },
                bgcolor: sectionBg,
                overflowY: "auto",
                height: { md: "calc(100vh - 85px)" },
              }}
            >
              {renderStep()}
              <FooterActions
                onCancel={() => navigate(-1)}
                onSave={saveQuotation}
                onTogglePreview={() => setSplitPreview((prev) => !prev)}
                splitPreview={splitPreview}
                saveLabel={saveLabel}
                activeStep={activeStep}
                onStepChange={setActiveStep}
              />
            </Box>
          </Box>

          {/* ── Right Half: Live Rendered Quotation Proposal ── */}
          {splitPreview && (
            <Box
              sx={{
                width: { xs: "100%", md: "50%" },
                maxWidth: { md: "50%" },
                height: { xs: 650, md: "calc(100vh - 85px)" },
                display: "flex",
                flexDirection: "column",
                flexShrink: 0,
                bgcolor: isDark ? "#0b132b" : "#f8fafc",
                overflow: "hidden",
              }}
            >
              <LiveQuotationPane
                quotationRecord={currentPreviewRecord}
                activeStep={activeStep}
                onClose={() => setSplitPreview(false)}
              />
            </Box>
          )}
        </Box>
      </Paper>
    </Box>
  );
}
