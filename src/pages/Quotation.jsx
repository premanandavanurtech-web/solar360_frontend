"use client"

import React, { useEffect, useMemo, useState } from "react"
import { useLocation, useNavigate, useParams } from "react-router-dom"
import {
  Sun,
  Phone,
  Mail,
  MapPin,
  Zap,
  Leaf,
  TrendingUp,
  Gauge,
  Download,
  Loader2,
  IndianRupee,
  CalendarClock,
  BatteryCharging,
  CheckCircle2,
  Wrench,
  ShieldCheck,
  TreePine,
  Droplets,
  Wind,
  X,
  Cpu,
  Layers,
  CreditCard,
  ToggleLeft,
  FileText,
  Send,
  PencilLine,
  Share2,
  ExternalLink,
  Printer,
  LayoutGrid,
  Copy,
  MessageCircle,
  ArrowLeft,
  Star,
} from "lucide-react"
import "./Quotation.css"
import { toBackendAssetUrl } from "../utils/backendAssetUrl"
import {
  ensureQuotationShareToken,
  findQuotationById,
  findQuotationByShareToken,
  loadCurrentQuotation,
  setCurrentQuotation,
} from "../utils/quotationStorage"

/* ----------------------------------------------------------------------------
 * DATA — real project data (M/S SAHOO CONSTRUCTION → narayan reddy)
 * -------------------------------------------------------------------------- */

let company = {
  name: "M/S SAHOO CONSTRUCTION",
  tagline: "Powering Your Future with Clean Energy",
  location: "Cuttack, Odisha",
  phone: "7008790475",
  email: "sahooconstruction00@gmail.com",
  emailAlt: "scspmsgops@gmail.com",
  logo: "/solar360-logo-clean.png",
}

let quote = {
  number: "QT-0429/2026",
  date: "08 Jun 2026",
  validFrom: "08 Jun 2026",
  validUntil: "23 Jun 2026",
}

let client = {
  name: "narayan reddy",
  phone: "8839938839",
  address: "Itanagar, Arunachal Pradesh - 754120",
}

let system = {
  type: "On-grid Rooftop",
  sizeKw: 100,
  panelCount: 3,
  panelWattage: 540,
  inverter: "100.00 kW Sungrow",
  annualGenerationUnits: 150000,
  paybackYears: 0,
  lifespanYears: 25,
  offsetLow: 90,
  offsetHigh: 95,
  orientation: "South Facing",
  tilt: "Optimal Tilt",
  mounting: "80*40 Elevated Structure",
}

let techSpecs = [
  {
    group: "Solar Panels",
    rows: [
      { label: "Type", value: "Bifacial" },
      { label: "Wattage", value: "540 Wp" },
      { label: "Quantity", value: "3 Panels" },
      { label: "Certification", value: "ALMM / IEC 61215 / IEC 61730" },
    ],
  },
  {
    group: "Inverter",
    rows: [
      { label: "Brand", value: "Sungrow" },
      { label: "Rated Power", value: "100.00 kW" },
      { label: "Monitoring", value: "Wifi Enabled" },
      { label: "Protection", value: "SPD Integrated" },
    ],
  },
  {
    group: "Mounting Structure",
    rows: [
      { label: "Brand", value: "Apollo" },
      { label: "Size", value: "80*40" },
      { label: "Capacity", value: "100.00 kW" },
      { label: "Standard", value: "Hot-Dip Galvanised" },
    ],
  },
  {
    group: "Cables & Protection",
    rows: [
      { label: "DC Cable", value: "4 sq mm" },
      { label: "AC Cable", value: "As per design" },
      { label: "ACDB / DCDB", value: "Reputed Make" },
      { label: "Certification", value: "BIS / IS 16169" },
    ],
  },
]

let monthlyGeneration = [
  { month: "JAN", units: 12245, peak: false },
  { month: "FEB", units: 12245, peak: false },
  { month: "MAR", units: 13776, peak: true },
  { month: "APR", units: 13776, peak: true },
  { month: "MAY", units: 15306, peak: true },
  { month: "JUN", units: 10714, peak: false },
  { month: "JUL", units: 9184, peak: false },
  { month: "AUG", units: 10714, peak: false },
  { month: "SEP", units: 12245, peak: false },
  { month: "OCT", units: 13776, peak: true },
  { month: "NOV", units: 13776, peak: true },
  { month: "DEC", units: 12245, peak: false },
]

let financials = {
  totalProjectCost: 100000,
  preGst: 87873,
  gstRate: 13.8,
  gstAmount: 12127,
  costPerKwp: 1000,
  subsidy: 78000,
  effectiveCost: 22000,
  annualSavings: 1168000,
  lifetimeSavings: 29199900,
}

let yearProjection = [
  { year: "Year 1", generation: "150,000 Units", tariff: "8.00", annualSavings: 1200000, cumulativeSavings: 1200000 },
  { year: "Year 2", generation: "149,250 Units", tariff: "8.24", annualSavings: 1229820, cumulativeSavings: 2429820 },
  { year: "Year 3", generation: "148,504 Units", tariff: "8.49", annualSavings: 1260799, cumulativeSavings: 3690619 },
  { year: "Year 4", generation: "147,761 Units", tariff: "8.74", annualSavings: 1291431, cumulativeSavings: 4982050 },
  { year: "Year 5", generation: "147,022 Units", tariff: "9.00", annualSavings: 1323198, cumulativeSavings: 6305248 },
]

const benefits = [
  {
    icon: Zap,
    title: "Near-Zero Electricity Bills",
    text: "Generate up to 95% of your consumed electricity, virtually eliminating your monthly bill.",
  },
  {
    icon: Leaf,
    title: "Clean Green Energy",
    text: "Replace carbon-heavy grid power with 100% clean energy. Each unit prevents ~0.82 kg of CO₂.",
  },
  {
    icon: IndianRupee,
    title: "Government Subsidies",
    text: "Avail PM-Surya Ghar subsidy, reducing your upfront investment significantly.",
  },
  {
    icon: Wrench,
    title: "Low Maintenance",
    text: "No moving parts and minimal maintenance — just periodic cleaning keeps it running.",
  },
  {
    icon: TrendingUp,
    title: "Property Value Boost",
    text: "Homes with solar command 3-6% higher resale value — a visible, tangible upgrade.",
  },
  {
    icon: ShieldCheck,
    title: "Energy Independence",
    text: "Shield yourself from rising electricity costs, power cuts, and grid instability.",
  },
]

const environmental = [
  { icon: TreePine, value: "3,300", label: "Trees Saved / Year" },
  { icon: Wind, value: "150 T", label: "CO₂ Offset / Year" },
  { icon: Droplets, value: "1,875,000 L", label: "Water Saved (vs Thermal)" },
  { icon: Leaf, value: "3,750 T", label: "CO₂ Offset Over 25 Yrs" },
]

let installSteps = [
  {
    title: "Site Survey & Engineering Assessment",
    text: "Structural assessment of rooftop, shading analysis, load audit, electrical panel inspection, and preparation of site-specific layout drawing and single-line diagram (SLD).",
  },
  {
    title: "DISCOM Application",
    text: "Submission of DISCOM application with all required documentation and approvals. Our team handles all paperwork end-to-end.",
  },
  {
    title: "Material Procurement",
    text: "All materials procured from authorised distributors. Each component undergoes incoming quality inspection.",
  },
  {
    title: "Mounting Structure Installation",
    text: "Precision drilling and anchor fixing. Structure assembled at engineered tilt angle. Waterproofing applied at all roof penetration points.",
  },
  {
    title: "Panel, Inverter & Electrical Installation",
    text: "Panel placement, MC4 connector crimping, inverter wall mounting, AC cabling to ACDB, RCCB, and main distribution board. Earthing and lightning protection installed.",
  },
  {
    title: "Net Metering & Commissioning",
    text: "DISCOM inspection, net meter installation, grid synchronisation, final testing, client walkthrough and handover with monitoring portal training.",
  },
]

let warranties = [
  { component: "Solar Panels", brand: "Tata Power Solar", product: "12 Years", performance: "25 Years" },
  { component: "Inverter", brand: "Sungrow", product: "10 Years", performance: "As per brand policy" },
  { component: "Mounting Structure", brand: "Apollo (80*40)", product: "5 Years", performance: "As per brand policy" },
  { component: "DC / AC Cables", brand: "KEI Industries", product: "1 Year", performance: "As per brand policy" },
  { component: "ACDB / DCDB", brand: "Reputed Make", product: "5 Years", performance: "As per brand policy" },
  { component: "Installation Work", brand: company.name, product: "5 Years", performance: "As per Solar Corner Policy" },
]

let paymentSchedule = [
  { share: "20%", milestone: "With the Purchase Order", amount: 20000 },
  { share: "60%", milestone: "Before Dispatch", amount: 60000 },
  { share: "10%", milestone: "After Installation", amount: 10000 },
  { share: "10%", milestone: "After Commissioning", amount: 10000 },
]

let terms = [
  {
    heading: "Quotation Validity",
    points: [
      `This quotation is valid for 14 days from the date of issue (${quote.validFrom} – ${quote.validUntil}).`,
      "Prices are subject to change after the validity period due to panel cost fluctuations and GST policy revisions.",
      "Subsidy amounts are based on MNRE guidelines as of the date of issue and are subject to Government revision.",
    ],
  },
  {
    heading: "Installation & Scope",
    points: [
      "Scope includes supply, installation, testing, commissioning, and net metering documentation only.",
      "Civil works, if required, will be quoted separately after site survey.",
      "Customer to provide access to rooftop, electrical panel, and parking for installation vehicles throughout the installation period.",
    ],
  },
  {
    heading: "Performance & Liability",
    points: [
      "Generation estimates are based on solar irradiance data for the installation location. Actual generation may vary by ±10%.",
      "M/S SAHOO CONSTRUCTION is not liable for generation losses due to grid downtime, excessive shading from new construction, or acts of God.",
      "All warranties are subject to the customer maintaining the system per M/S SAHOO CONSTRUCTION's maintenance guidelines.",
    ],
  },
  {
    heading: "Cancellation Policy",
    points: [
      "Order cancellation before material dispatch: 5% of advance amount retained as processing charges.",
      "Cancellation post material dispatch: 30% of project value retained to cover material, logistics, and engineering costs, and material must be returned.",
    ],
  },
]
export const defaultTestimonials = [
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
]
let testimonials = defaultTestimonials
let showTestimonials = true

let showSiteSurveyPhoto = true
let siteSurveyPhotos = []
let siteSurveyPhotoUrl = ""
let threeDDesignCaptureUrl = ""
let layoutDesignTitle = "Solar panel layout design will be prepared after site survey."
let layoutDesignNote = ""
let shadowFreeNote = "Optimised for your location's latitude for maximum solar capture throughout the year."
let elevatedMountingNote = ""
let sunPathNote = "No obstructions within the critical 9 AM – 3 PM window. Shadow loss < 2%."
let showRooftopLayout = true

const defaultQuotationData = {
  company,
  quote,
  client,
  system,
  techSpecs,
  monthlyGeneration,
  financials,
  yearProjection,
  installSteps,
  warranties,
  paymentSchedule,
  terms,
  testimonials,
  showTestimonials,
  showSiteSurveyPhoto,
  siteSurveyPhotos,
  siteSurveyPhotoUrl,
  threeDDesignCaptureUrl,
  layoutDesignTitle,
  layoutDesignNote,
  shadowFreeNote,
  elevatedMountingNote,
  sunPathNote,
  showRooftopLayout,
}

const safeNumber = (value, fallback = 0) => {
  if (value === "" || value === null || value === undefined) return fallback
  const number = Number(value)
  return Number.isFinite(number) && !Number.isNaN(number) ? number : fallback
}

const loadSavedQuotation = (locationState, search = "", shareToken = "") => {
  const searchParams = new URLSearchParams(search || "")
  const quotationIdFromQuery = searchParams.get("quotationId") || searchParams.get("quoteId")

  if (shareToken) {
    return locationState?.quotationData || findQuotationByShareToken(shareToken) || null
  }

  return (
    locationState?.quotationData ||
    (locationState?.quotationId ? findQuotationById(locationState.quotationId) : null) ||
    (quotationIdFromQuery ? findQuotationById(quotationIdFromQuery) : null) ||
    loadCurrentQuotation()
  )
}

const formatQuotationDate = (value) => {
  const parsed = value ? new Date(value) : new Date()
  if (Number.isNaN(parsed.getTime())) return defaultQuotationData.quote.date
  return parsed.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

const addDays = (value, days) => {
  const parsed = value ? new Date(value) : new Date()
  if (Number.isNaN(parsed.getTime())) return new Date()
  const nextDate = new Date(parsed)
  nextDate.setDate(nextDate.getDate() + days)
  return nextDate
}

const buildQuotationData = (saved) => {
  if (!saved?.form) return defaultQuotationData

  const form = saved.form
  const rawSurveyPhotos = getAllSiteSurveyPhotos(saved.lead)
  const isSurveyPhotoExplicitlyHidden = form.showSiteSurveyPhoto === false || form.siteSurveyPhotoUrl === "none"

  let siteSurveyPhotos = []
  if (!isSurveyPhotoExplicitlyHidden) {
    if (Array.isArray(form.siteSurveyPhotos) && form.siteSurveyPhotos.length > 0) {
      siteSurveyPhotos = form.siteSurveyPhotos.filter((p) => p && p !== "none")
    } else if (form.siteSurveyPhotoUrl && form.siteSurveyPhotoUrl !== "none") {
      siteSurveyPhotos = [form.siteSurveyPhotoUrl]
    } else if (rawSurveyPhotos.length > 0) {
      siteSurveyPhotos = rawSurveyPhotos
    }
  }

  const showSiteSurveyPhoto = !isSurveyPhotoExplicitlyHidden && siteSurveyPhotos.length > 0
  const siteSurveyPhotoUrl = siteSurveyPhotos[0] || ""
  const threeDDesignCaptureUrl = getThreeDDesignCaptureUrl(saved.lead)
  const paymentMilestones = Array.isArray(saved.paymentMilestones) ? saved.paymentMilestones : []
  const installationSteps = Array.isArray(saved.installationSteps) ? saved.installationSteps : []
  const termsGroups = Array.isArray(saved.termsGroups) ? saved.termsGroups : []
  const systemSize = safeNumber(form.systemSize, defaultQuotationData.system.sizeKw)
  const panelCount = safeNumber(form.panelQty, defaultQuotationData.system.panelCount)
  const panelWattage = safeNumber(form.wattPeak, defaultQuotationData.system.panelWattage)
  const totalCost = safeNumber(form.totalCost, defaultQuotationData.financials.totalProjectCost)
  const subsidy = safeNumber(form.subsidyAmount, 0)
  const generationPerKw = safeNumber(form.generationPerKw, 1500)
  const annualGenerationUnits = Math.round(systemSize * (generationPerKw || 1500))
  const tariff = safeNumber(form.electricityTariff, 8)
  const annualSavings = Math.round(annualGenerationUnits * (tariff || 8))
  const preGst = Math.round(totalCost / 1.138)
  const gstAmount = Math.max(0, totalCost - preGst)
  const issueDate = saved.savedAt || saved.createdAt || new Date().toISOString()
  const validityDays = safeNumber(form.validityDays, safeNumber(saved.validityDays, 14))
  const validUntil = addDays(issueDate, validityDays)

  const clientName = form.customerName || saved.quotationTitle || (saved.lead?.customerName || saved.lead?.name || saved.lead?.fullName) || defaultQuotationData.client.name
  const leadPhone = form.customerPhone || saved.lead?.phone || saved.lead?.mobile || saved.lead?.whatsappNumber || defaultQuotationData.client.phone
  const rawLeadAddress = [
    saved.lead?.address,
    saved.lead?.city,
    saved.lead?.state,
    saved.lead?.pincode,
  ]
    .filter(Boolean)
    .join(", ")
  const clientAddress = form.customerAddress || rawLeadAddress || defaultQuotationData.client.address

  const companyName = form.companyName || defaultQuotationData.company.name
  const companyPhone = form.companyPhone || defaultQuotationData.company.phone
  const companyEmail = form.companyEmail || defaultQuotationData.company.email
  const companyLocation = form.companyLocation || defaultQuotationData.company.location

  const monthFactors = [
    { month: "JAN", factor: 0.0816, peak: false },
    { month: "FEB", factor: 0.0816, peak: false },
    { month: "MAR", factor: 0.0918, peak: true },
    { month: "APR", factor: 0.0918, peak: true },
    { month: "MAY", factor: 0.1020, peak: true },
    { month: "JUN", factor: 0.0714, peak: false },
    { month: "JUL", factor: 0.0612, peak: false },
    { month: "AUG", factor: 0.0714, peak: false },
    { month: "SEP", factor: 0.0816, peak: false },
    { month: "OCT", factor: 0.0918, peak: true },
    { month: "NOV", factor: 0.0918, peak: true },
    { month: "DEC", factor: 0.0816, peak: false },
  ]
  const dynamicMonthlyGeneration = monthFactors.map((m) => ({
    month: m.month,
    units: Math.round(annualGenerationUnits * m.factor),
    peak: m.peak,
  }))

  const degradation = safeNumber(form.panelDegradation, 0.5) / 100
  const escalation = safeNumber(form.tariffEscalation, 3.0) / 100
  const yearsCount = Math.max(1, safeNumber(form.projectionYears, 5))

  let cumulativeSavings = 0
  const dynamicYearProjection = Array.from({ length: yearsCount }, (_, i) => {
    const yearNum = i + 1
    const gen = Math.round(annualGenerationUnits * Math.pow(1 - degradation, i))
    const t = (tariff * Math.pow(1 + escalation, i)).toFixed(2)
    const sav = Math.round(gen * Number(t))
    cumulativeSavings += sav
    return {
      year: `Year ${yearNum}`,
      generation: `${gen.toLocaleString("en-IN")} Units`,
      tariff: t,
      annualSavings: sav,
      cumulativeSavings,
    }
  })

  return {
    ...defaultQuotationData,
    company: {
      ...defaultQuotationData.company,
      name: companyName,
      phone: companyPhone,
      email: companyEmail,
      location: companyLocation,
    },
    quote: {
      ...defaultQuotationData.quote,
      number: saved.quotationNumber || defaultQuotationData.quote.number,
      date: formatQuotationDate(issueDate),
      validFrom: formatQuotationDate(issueDate),
      validUntil: formatQuotationDate(validUntil),
      proposalTitle: form.proposalTitle || "",
      proposalDescription: form.proposalDescription || "",
    },
    client: {
      ...defaultQuotationData.client,
      name: clientName,
      phone: leadPhone,
      address: clientAddress,
    },
    system: {
      ...defaultQuotationData.system,
      type: `${form.systemType || "Off-grid"} Rooftop`,
      sizeKw: systemSize,
      panelCount,
      panelWattage,
      inverter: `${form.inverterSize || systemSize} kW ${form.inverterBrand || "Havells Solar"}`,
      annualGenerationUnits,
      orientation: form.orientation || defaultQuotationData.system.orientation || "South Facing",
      tilt: form.tilt || defaultQuotationData.system.tilt || "Optimal Tilt",
      mounting: `${form.structureSize || "80*40"} ${form.structureBrand || ""} ${form.structureType || "Elevated Structure"}`.trim(),
    },
    financials: {
      ...defaultQuotationData.financials,
      totalProjectCost: totalCost,
      preGst,
      gstAmount,
      costPerKwp: systemSize ? Math.round(totalCost / systemSize) : 0,
      subsidy,
      effectiveCost: Math.max(0, totalCost - subsidy),
      annualSavings,
      lifetimeSavings: annualSavings * 25,
    },
    monthlyGeneration: dynamicMonthlyGeneration,
    yearProjection: dynamicYearProjection,
    techSpecs: [
      {
        group: "Solar Panels",
        rows: [
          { label: "Category", value: form.panelCategory || "Bifacial" },
          { label: "Wattage", value: `${panelWattage} Wp` },
          { label: "Quantity", value: `${panelCount} Panels` },
          { label: "Brand", value: form.panelBrand || "Waaree Energies" },
          { label: "Total Power", value: `${((panelCount * panelWattage) / 1000).toFixed(1)} kWp` },
        ],
      },
      {
        group: "Inverter",
        rows: [
          { label: "Brand", value: form.inverterBrand || "Havells Solar" },
          { label: "Rated Power", value: `${form.inverterSize || systemSize} kW` },
          { label: "Phase", value: form.phase || "Three Phase" },
          { label: "Type", value: form.inverterType || "String" },
        ],
      },
      {
        group: "Mounting Structure",
        rows: [
          { label: "Brand", value: form.structureBrand || "Apollo" },
          { label: "Size", value: form.structureSize || "120*40" },
          { label: "Capacity", value: `${form.structureCapacity || systemSize} kW` },
          { label: "Type", value: form.structureType || "GI Elevated Tilt" },
        ],
      },
      {
        group: "DC & AC Cables",
        rows: [
          { label: "Brand", value: form.cableBrand || "Havells" },
          { label: "DC Cable", value: form.dcCableSpec || "4 sq mm" },
          { label: "AC Cable", value: form.acCableSpec || "As per design" },
          { label: "Certification", value: "BIS / IS 16169" },
        ],
      },
      {
        group: "ACDB / DCDB & Protection",
        rows: [
          { label: "ACDB / DCDB", value: form.dcdbAcdb || "Reputed Make" },
          { label: "Earthing", value: form.earthing || "Reputed Make — 3 Nos." },
          { label: "Lightning Protection", value: form.lightningArrestor || "Reputed Make — 1 No." },
          { label: "Net Solar Meter", value: form.netSolarMeter || "As per DISCOM" },
        ],
      },
      {
        group: "Battery Storage",
        rows: form.batteryBackup
          ? [
              { label: "Brand", value: form.batteryBrand || "Luminous" },
              { label: "Capacity", value: `${form.batteryCapacity || "200"} Ah/kWh` },
              { label: "Type", value: form.batteryType || "LFP" },
              { label: "Quantity", value: `${form.batteryQty || "200"} Units` },
            ]
          : [
              { label: "Status", value: "Not Included" },
              { label: "System", value: `${form.systemType || "On-grid"} Rooftop` },
            ],
      },
    ],
    warranties: [
      { component: "Solar Panels", brand: form.panelBrand || "Waaree Energies", product: `${form.panelWarrantyYears || 12} Years`, performance: "25 Years" },
      { component: "Inverter", brand: form.inverterBrand || "Havells Solar", product: `${form.inverterWarrantyYears || 7} Years`, performance: "As per brand policy" },
      { component: "Mounting Structure", brand: `${form.structureBrand || "Apollo"} (${form.structureSize || "120*40"})`, product: `${form.bosWarrantyYears || 5} Years`, performance: "As per brand policy" },
      { component: "DC / AC Cables", brand: form.cableBrand || "Havells", product: `${form.cableWarrantyYears || 1} Year`, performance: "As per brand policy" },
      { component: "Installation Work", brand: defaultQuotationData.company.name, product: "5 Years", performance: "As per policy" },
    ],
    paymentSchedule: paymentMilestones.length
      ? paymentMilestones.map((item) => {
          const percent = safeNumber(item.percent, 0)
          return {
            share: `${percent}%`,
            milestone: item.label || "Payment milestone",
            amount: Math.round((totalCost * percent) / 100),
          }
        })
      : defaultQuotationData.paymentSchedule,
    installSteps: installationSteps.length
      ? installationSteps.map((step) => ({
          title: step.title || "Installation step",
          text: step.description || "",
        }))
      : defaultQuotationData.installSteps,
    terms: termsGroups.length ? termsGroups : defaultQuotationData.terms,
    testimonials: Array.isArray(saved.testimonials) && saved.testimonials.length > 0
      ? saved.testimonials
      : (Array.isArray(form.testimonials) && form.testimonials.length > 0 ? form.testimonials : defaultTestimonials),
    showTestimonials: form.showTestimonials !== false && saved.showTestimonials !== false,
    showSiteSurveyPhoto,
    siteSurveyPhotos,
    siteSurveyPhotoUrl,
    threeDDesignCaptureUrl:
      (form.rooftopLayoutImage && form.rooftopLayoutImage !== "none" ? form.rooftopLayoutImage : "") ||
      (form.threeDDesignCaptureUrl && form.threeDDesignCaptureUrl !== "none" ? form.threeDDesignCaptureUrl : "") ||
      threeDDesignCaptureUrl ||
      "/solar-rooftop-cover-4k.png",
    layoutDesignTitle: form.layoutDesignTitle || "Solar panel layout design will be prepared after site survey.",
    layoutDesignNote: form.layoutDesignNote || `${panelCount} panels x ${panelWattage}Wp planned for the proposed ${systemSize} kWp system.`,
    shadowFreeNote: form.shadowFreeNote || "Optimised for your location's latitude for maximum solar capture throughout the year.",
    elevatedMountingNote: form.elevatedMountingNote || `${form.structureSize || "120*40"} ${form.structureBrand || "Apollo"} Elevated Structure with adequate clearance and waterproofed penetrations.`,
    sunPathNote: form.sunPathNote || "No obstructions within the critical 9 AM – 3 PM window. Shadow loss < 2%.",
    showRooftopLayout: form.showRooftopLayout !== false,
  }
}

const getThreeDDesignCaptureUrl = (lead) =>
  typeof lead?.threeDDesign?.captureImage === "string" ? lead.threeDDesign.captureImage : ""

const getAllSiteSurveyPhotos = (lead) => {
  const photos = Array.isArray(lead?.siteSurvey?.photos) ? lead.siteSurvey.photos : []
  return photos
    .map((photo) => {
      const photoUrl =
        typeof photo === "string"
          ? photo
          : photo?.url || photo?.uri || photo?.path || photo?.location || photo?.src || ""
      return toBackendAssetUrl(photoUrl) || ""
    })
    .filter(Boolean)
}

const getSiteSurveyPhotoUrl = (lead) => {
  const all = getAllSiteSurveyPhotos(lead)
  return all[0] || ""
}

const applyQuotationData = (data) => {
  company = data.company
  quote = data.quote
  client = data.client
  system = data.system
  techSpecs = data.techSpecs
  monthlyGeneration = data.monthlyGeneration
  financials = data.financials
  yearProjection = data.yearProjection
  installSteps = data.installSteps
  warranties = data.warranties
  paymentSchedule = data.paymentSchedule
  terms = data.terms
  testimonials = Array.isArray(data.testimonials) && data.testimonials.length > 0
    ? data.testimonials
    : defaultTestimonials
  showTestimonials = data.showTestimonials !== false
  siteSurveyPhotos = Array.isArray(data.siteSurveyPhotos)
    ? data.siteSurveyPhotos
    : (data.siteSurveyPhotoUrl ? [data.siteSurveyPhotoUrl] : [])
  showSiteSurveyPhoto = data.showSiteSurveyPhoto !== false && siteSurveyPhotos.length > 0
  siteSurveyPhotoUrl = siteSurveyPhotos[0] || data.siteSurveyPhotoUrl || ""
  threeDDesignCaptureUrl = data.threeDDesignCaptureUrl || ""
  layoutDesignTitle = data.layoutDesignTitle || "Solar panel layout design will be prepared after site survey."
  layoutDesignNote = data.layoutDesignNote || ""
  shadowFreeNote = data.shadowFreeNote || "Optimised for your location's latitude for maximum solar capture throughout the year."
  elevatedMountingNote = data.elevatedMountingNote || ""
  sunPathNote = data.sunPathNote || "No obstructions within the critical 9 AM – 3 PM window. Shadow loss < 2%."
  showRooftopLayout = data.showRooftopLayout !== false
}

/* ----------------------------------------------------------------------------
 * HELPERS
 * -------------------------------------------------------------------------- */

const inr = (n) =>
  "₹" + n.toLocaleString("en-IN", { maximumFractionDigits: 0 })

const fmtNum = (n) => n.toLocaleString("en-IN")

function SectionTitle({ index, title, subtitle }) {
  return (
  <div className="mb-5 flex items-start gap-3 border-b border-border pb-4">
  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
  {index}
  </span>
  <div className="flex-1">
  <h2 className="text-xl font-bold leading-tight tracking-tight text-foreground text-balance">{title}</h2>
  {subtitle ? <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p> : null}
  </div>
  <div className="hidden shrink-0 items-center gap-2 sm:flex">
  <img
  src={company.logo}
  alt={`${company.name} logo`}
  className="h-8 w-8 object-contain"
  crossOrigin="anonymous"
  />
  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{company.name}</span>
  </div>
  </div>
  )
  }

/* ----------------------------------------------------------------------------
 * DOWNLOAD BUTTON
 * -------------------------------------------------------------------------- */

function loadLocalScript(src, globalCheck) {
  if (globalCheck()) return Promise.resolve()

  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`)
    if (existing) {
      existing.addEventListener("load", resolve, { once: true })
      existing.addEventListener("error", reject, { once: true })
      return
    }

    const script = document.createElement("script")
    script.src = src
    script.async = true
    script.onload = resolve
    script.onerror = reject
    document.body.appendChild(script)
  })
}

async function downloadQuotationPdf(targetId) {
  await Promise.all([
    loadLocalScript("/vendor/jspdf.umd.min.js", () => window.jspdf?.jsPDF),
    loadLocalScript("/vendor/html2canvas.min.js", () => window.html2canvas),
  ])

  const jsPDF = window.jspdf?.jsPDF
  const html2canvas = window.html2canvas
  if (!jsPDF || !html2canvas) throw new Error("PDF libraries failed to load")

  const el = document.getElementById(targetId)
  if (!el) return

  if (document.fonts?.ready) {
    await document.fonts.ready
  }

  const pages = Array.from(
    el.querySelectorAll(".quotation-page-sheet, .quotation-pages > section:not(.hidden), .quotation-pages > footer"),
  )
  const captureTargets = pages.length ? pages : [el]
  const pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4", compress: true })
  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()

  for (let pageIndex = 0; pageIndex < captureTargets.length; pageIndex += 1) {
    const canvas = await html2canvas(captureTargets[pageIndex], {
      scale: 2,
      useCORS: true,
      allowTaint: false,
      backgroundColor: "#ffffff",
      windowWidth: document.documentElement.scrollWidth,
    })

    const imgData = canvas.toDataURL("image/jpeg", 0.95)
    const imgHeight = (canvas.height * pageWidth) / canvas.width

    if (pageIndex > 0) pdf.addPage()

    if (imgHeight <= pageHeight) {
      const y = (pageHeight - imgHeight) / 2
      pdf.addImage(imgData, "JPEG", 0, y, pageWidth, imgHeight)
    } else {
      pdf.addImage(imgData, "JPEG", 0, 0, pageWidth, pageHeight)
    }
  }

  pdf.save("SAHOO-Construction-Solar-Quotation.pdf")
}

function DownloadButton({ targetId }) {
  const [loading, setLoading] = useState(false)

  async function handleDownload() {
    setLoading(true)
    try {
      await downloadQuotationPdf(targetId)
    } catch (e) {
      console.log("[v0] PDF generation error:", e)
      alert("PDF download failed. Please try again after the page fully loads.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleDownload}
      disabled={loading}
      className="inline-flex min-h-[50px] items-center justify-center gap-2 rounded-2xl bg-accent px-5 py-3 text-sm font-semibold text-accent-foreground shadow-sm transition-colors hover:opacity-90 disabled:opacity-60"
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
      ) : (
        <Download className="h-4 w-4" aria-hidden="true" />
      )}
      {loading ? "Generating PDF…" : "Download PDF"}
    </button>
  )
}

/* ----------------------------------------------------------------------------
 * QUOTATION DOCUMENT
 * -------------------------------------------------------------------------- */

function ProjectOverviewSection() {
  return (
    <section id="quote-step-1">
      <SectionTitle index="01" title="Project Overview" subtitle="Customer, site and proposal summary" />

      <div className="rounded-lg bg-primary p-6 text-primary-foreground">
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-accent">Solar rooftop proposal</p>
        <h3 className="mt-3 text-2xl font-extrabold leading-tight">
          {quote.proposalTitle || `${system.sizeKw} kWp ${system.type} solar power system for ${client.name}`}
        </h3>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-primary-foreground/75">
          {quote.proposalDescription || `This proposal covers design, supply, installation, testing, commissioning and net metering support for the proposed rooftop solar plant at ${client.address}. The system is planned to reduce grid electricity dependency and deliver long-term savings through clean energy generation.`}
        </p>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { icon: Zap, label: "Plant Capacity", value: `${system.sizeKw} kWp` },
          { icon: Sun, label: "Solar Modules", value: `${system.panelCount} x ${system.panelWattage} Wp` },
          { icon: Gauge, label: "Yearly Generation", value: `${fmtNum(system.annualGenerationUnits)} Units` },
          { icon: IndianRupee, label: "Estimated Savings", value: inr(financials.annualSavings) },
        ].map((item) => (
          <div key={item.label} className="rounded-lg border border-border bg-card p-4">
            <item.icon className="h-5 w-5 text-accent" aria-hidden="true" />
            <p className="mt-3 text-lg font-extrabold text-foreground">{item.value}</p>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{item.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        <div className="rounded-lg border border-border p-5">
          <p className="mb-4 text-xs font-bold uppercase tracking-wider text-accent">Client & Site Details</p>
          <p className="text-base font-bold capitalize text-foreground">{client.name}</p>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <Phone className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
              <span>{client.phone}</span>
            </li>
            <li className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
              <span>{client.address}</span>
            </li>
            <li className="flex items-start gap-2">
              <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
              <span>Quotation valid from {quote.validFrom} to {quote.validUntil}</span>
            </li>
          </ul>
        </div>

        <div className="rounded-lg border border-border p-5">
          <p className="mb-4 text-xs font-bold uppercase tracking-wider text-accent">Proposal Scope</p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            {[
              "Site survey and rooftop layout planning",
              "Solar module, inverter and mounting structure supply",
              "Installation, earthing, protection and wiring work",
              "Testing, commissioning and net metering documentation",
            ].map((scope) => (
              <li key={scope} className="flex gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
                <span>{scope}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        <div className="rounded-lg border border-border bg-secondary/40 p-5">
          <p className="mb-3 text-xs font-bold uppercase tracking-wider text-accent">Expected Outcome</p>
          <p className="text-sm leading-relaxed text-muted-foreground">
            The proposed system is designed to offset approximately {system.offsetLow}-{system.offsetHigh}% of
            electricity usage, with an estimated yearly generation of {fmtNum(system.annualGenerationUnits)} units
            and projected annual savings of {inr(financials.annualSavings)}.
          </p>
        </div>

        <div className="rounded-lg border border-border bg-secondary/40 p-5">
          <p className="mb-3 text-xs font-bold uppercase tracking-wider text-accent">Prepared By</p>
          <p className="font-bold text-foreground">{company.name}</p>
          <div className="mt-3 space-y-2 text-sm text-muted-foreground">
            <p className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-primary" aria-hidden="true" />
              {company.phone}
            </p>
            <p className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-primary" aria-hidden="true" />
              {company.email}
            </p>
            <p className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" aria-hidden="true" />
              {company.location}
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

function QuotationDocument() {
  const maxGen = Math.max(...monthlyGeneration.map((m) => m.units))

  return (
    <div id="quotation-document" className="quotation-document mx-auto w-full max-w-[820px] text-card-foreground">
      {/* COVER */}
      <section id="quote-step-1" className="quotation-page-sheet quotation-cover-page relative overflow-hidden bg-primary px-10 py-12 text-primary-foreground">
        <div className="relative z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-lg bg-card">
                <img
                  src={company.logo}
                  alt={`${company.name} logo`}
                  className="h-full w-full object-contain"
                  crossOrigin="anonymous"
                />
              </span>
              <div>
                <p className="text-lg font-bold leading-tight">{company.name}</p>
                <p className="text-sm text-primary-foreground/70">{company.location}</p>
              </div>
            </div>
            <div className="rounded-md bg-accent px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-accent-foreground">
              Proposal
            </div>
          </div>

          <div className="mt-10 max-w-lg">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-accent">
              Proposal for Solar Energy
            </p>
            <h1 className="mt-3 text-pretty text-4xl font-extrabold leading-tight">
              Powering Your Future with Clean Energy
            </h1>
            <p className="mt-4 leading-relaxed text-primary-foreground/80">
              A custom-engineered {system.sizeKw} kWp {system.type} Solar PV System for {client.name},
              designed to offset {system.offsetLow}–{system.offsetHigh}% of your electricity consumption.
            </p>
          </div>

          <div className="mt-8 grid grid-cols-2 gap-x-8 gap-y-4 text-sm sm:grid-cols-4">
            <div>
              <p className="text-2xl font-extrabold text-accent">{system.sizeKw}kWp</p>
              <p className="text-primary-foreground/60">Proposed Capacity</p>
            </div>
            <div>
              <p className="text-2xl font-extrabold text-accent">{fmtNum(system.annualGenerationUnits)}</p>
              <p className="text-primary-foreground/60">Units / Year</p>
            </div>
            <div>
              <p className="text-2xl font-extrabold text-accent">{inr(financials.annualSavings)}</p>
              <p className="text-primary-foreground/60">Annual Savings</p>
            </div>
            <div>
              <p className="text-2xl font-extrabold text-accent">{system.lifespanYears} Yr</p>
              <p className="text-primary-foreground/60">System Lifespan</p>
            </div>
          </div>
        </div>

        <div className="relative z-10 mx-auto mt-8 w-full overflow-hidden rounded-lg border border-primary-foreground/15 bg-primary">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/solar-rooftop-cover-4k.png"
            alt="Aerial view of a rooftop solar installation"
            width={820}
            height={380}
            className="h-[380px] w-full object-cover"
            style={{ objectPosition: "center center" }}
            crossOrigin="anonymous"
          />
        </div>

        <div className="relative z-10 mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-primary-foreground/15 pt-5 text-sm">
          <div className="flex items-center gap-2 text-primary-foreground/80">
            <MapPin className="h-4 w-4 text-accent" aria-hidden="true" />
            {client.address}
          </div>
          <div className="text-primary-foreground/80">
            <span className="font-semibold">REF:</span> {quote.number} · {quote.date}
          </div>
        </div>
      </section>

      <div className="quotation-pages space-y-6">
        <ProjectOverviewSection />
        {/* EXECUTIVE SUMMARY */}
        <section className="hidden">
          <SectionTitle index="01" title="Project Overview" subtitle="Key highlights of the proposed solar rooftop solution" />
          <div className="rounded-lg border border-border bg-secondary/40 p-5 text-sm leading-relaxed text-muted-foreground">
            <p>
              {company.name} is pleased to present this comprehensive proposal for the design, supply,
              installation, testing, and commissioning of a {system.sizeKw} kWp {system.type} Solar PV System at
              your property in Itanagar. The system is engineered to offset up to {system.offsetLow}–{system.offsetHigh}%
              of your current electricity consumption. Excess energy will be exported to the grid via net metering,
              earning credit on your monthly bill. All components are sourced from globally recognised manufacturers,
              and installation will be executed by our certified engineering team.
            </p>
          </div>

          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <div className="rounded-lg border border-border p-5">
              <p className="mb-3 text-xs font-bold uppercase tracking-wider text-accent">Client Details</p>
              <p className="text-base font-bold text-foreground">{client.name}</p>
              <ul className="mt-3 space-y-1.5 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <Phone className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                  {client.phone}
                </li>
                <li className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                  {client.address}
                </li>
              </ul>
            </div>
            <div className="rounded-lg border border-border p-5">
              <p className="mb-3 text-xs font-bold uppercase tracking-wider text-accent">Proposed By</p>
              <p className="text-base font-bold text-foreground">{company.name}</p>
              <ul className="mt-3 space-y-1.5 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <Phone className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                  {company.phone}
                </li>
                <li className="flex items-center gap-2">
                  <Mail className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                  {company.email}
                </li>
                <li className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                  {company.location}
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* SYSTEM CONFIGURATION */}
        <section id="quote-step-2">
          <SectionTitle index="02" title="System Configuration" subtitle="Lifetime savings opportunity over a 25-year lifespan" />
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[
              { icon: Zap, label: "System Capacity", value: `${system.sizeKw} kWp` },
              { icon: Gauge, label: "Annual Generation", value: `${fmtNum(system.annualGenerationUnits)} Units` },
              { icon: Sun, label: "Solar Modules", value: `${system.panelCount} Panels` },
              { icon: BatteryCharging, label: "Inverter", value: system.inverter },
            ].map((s) => (
              <div key={s.label} className="rounded-lg border border-border p-4">
                <s.icon className="h-5 w-5 text-accent" aria-hidden="true" />
                <p className="mt-3 text-2xl font-extrabold text-foreground">{s.value}</p>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-x-8 gap-y-3 rounded-lg bg-secondary/40 p-5 text-sm sm:grid-cols-4">
            <div>
              <p className="text-muted-foreground">System Type</p>
              <p className="font-semibold text-foreground">{system.type}</p>
            </div>
            <div>
              <p className="text-muted-foreground">No. of Panels</p>
              <p className="font-semibold text-foreground">
                {system.panelCount} × {system.panelWattage} Wp
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Inverter</p>
              <p className="font-semibold text-foreground">{system.inverter}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Orientation</p>
              <p className="font-semibold text-foreground">{system.orientation}</p>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-4 rounded-lg border border-accent/30 bg-accent/10 p-5">
            <TrendingUp className="h-8 w-8 shrink-0 text-accent" aria-hidden="true" />
            <div>
              <p className="text-sm text-muted-foreground">Estimated Annual Savings</p>
              <p className="text-3xl font-extrabold text-foreground">{inr(financials.annualSavings)}</p>
            </div>
          </div>
          {showSiteSurveyPhoto && siteSurveyPhotos.length > 0 && (
            <div className="mt-6">
              <div className="mb-3 flex items-start gap-2.5 border-b border-border pb-2">
                <span className="mt-1 h-2.5 w-2.5 rounded-full bg-accent" />
                <div>
                  <h3 className="text-base font-extrabold leading-tight text-foreground">
                    {siteSurveyPhotos.length > 1 ? "Site Survey Photos" : "Site Survey Photo"}
                  </h3>
                  <p className="text-xs text-muted-foreground">Photographs captured during the site assessment visit</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3 w-full">
                {siteSurveyPhotos.map((photoUrl, idx) => (
                  <div key={idx} className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
                    <img
                      src={photoUrl}
                      alt={`Site survey reference ${idx + 1}`}
                      className="h-28 sm:h-32 w-full object-cover"
                      crossOrigin="anonymous"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = "/solar-rooftop-cover-4k.png";
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* ROOFTOP LAYOUT */}
        {showRooftopLayout && (
          <section id="quote-step-layout">
            <SectionTitle index="03" title="Rooftop Layout & Design" subtitle="Panel placement, orientation and shadow analysis for optimal yield" />
            <div className="mb-4 overflow-hidden rounded-xl bg-primary p-5 text-primary-foreground">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs font-extrabold uppercase tracking-[0.28em] text-accent">
                  Rooftop Plan - {system.sizeKw} kWp - {system.panelCount} Panels
                </p>
                <div className="flex items-center gap-4 text-[10px] uppercase tracking-wider text-primary-foreground/60">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-sm bg-accent" />
                    Solar Panel
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-sm bg-primary-foreground/70" />
                    Inverter
                  </span>
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-[1fr_150px]">
                <div className="overflow-hidden rounded-lg border border-primary-foreground/15 bg-primary-foreground/5">
                  <img
                    src={threeDDesignCaptureUrl || "/solar-rooftop-cover-4k.png"}
                    alt="Rooftop solar layout preview"
                    className="h-72 w-full object-cover"
                    crossOrigin="anonymous"
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = "/solar-rooftop-cover-4k.png";
                    }}
                  />
                </div>
                <div className="flex flex-col justify-center rounded-lg border border-primary-foreground/15 bg-primary-foreground/5 p-4">
                  <p className="text-lg font-semibold leading-tight text-primary-foreground/85">
                    {layoutDesignTitle || "Solar panel layout design will be prepared after site survey."}
                  </p>
                  <p className="mt-4 text-xs leading-relaxed text-primary-foreground/60">
                    {layoutDesignNote || `${system.panelCount} panels x ${system.panelWattage}Wp planned for the proposed ${system.sizeKw} kWp system.`}
                  </p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  { label: "Total Panels", value: `${system.panelCount}` },
                  { label: "Panel Wattage", value: `${system.panelWattage}W` },
                  { label: "kWp Capacity", value: `${system.sizeKw}` },
                  { label: "Orientation", value: system.orientation.replace(" Facing", "") },
                ].map((s) => (
                  <div key={s.label} className="rounded-lg border border-primary-foreground/10 bg-primary-foreground/5 p-4 text-center">
                    <p className="text-xl font-extrabold text-accent">{s.value}</p>
                    <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-primary-foreground/45">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {[
                { title: "Shadow-Free Zone", text: shadowFreeNote || "Optimised for your location's latitude for maximum solar capture throughout the year." },
                { title: "Elevated Mounting", text: elevatedMountingNote || `${system.mounting} with adequate clearance and waterproofed penetrations.` },
                { title: "Sun-Path Window", text: sunPathNote || "No obstructions within the critical 9 AM – 3 PM window. Shadow loss < 2%." },
              ].map((c) => (
                <div key={c.title} className="rounded-lg border border-border bg-secondary/40 p-4">
                  <p className="font-semibold text-foreground">{c.title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{c.text}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* TECHNICAL SPECIFICATIONS */}
        <section id="quote-step-2-specs">
          <SectionTitle index="04" title="Technical Specifications" subtitle="Premium components from globally certified manufacturers" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {techSpecs.map((spec) => {
              const specIcon = spec.group.includes("Panel")
                ? Sun
                : spec.group.includes("Inverter")
                ? BatteryCharging
                : spec.group.includes("Structure")
                ? Wrench
                : spec.group.includes("Cable")
                ? Zap
                : spec.group.includes("Battery")
                ? BatteryCharging
                : ShieldCheck

              const brandRow = spec.rows.find((r) => r.label === "Brand") || spec.rows.find((r) => r.label === "Category") || spec.rows[0]

              return (
                <div key={spec.group} className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
                  <div className="flex items-center gap-3 bg-primary px-4 py-3 text-primary-foreground">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-accent/20 text-accent">
                      {React.createElement(specIcon, { className: "h-5 w-5", "aria-hidden": "true" })}
                    </span>
                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-[0.28em] text-primary-foreground/50">Component</p>
                      <p className="text-sm font-extrabold leading-tight">{spec.group}</p>
                    </div>
                  </div>

                  <div className="min-h-[150px] p-4">
                    {brandRow?.value && (
                      <div className="mb-3 inline-flex text-sm font-extrabold uppercase tracking-wide text-primary">
                        {brandRow.value}
                      </div>
                    )}
                    <table className="w-full text-xs">
                      <tbody>
                        {spec.rows.map((row) => (
                          <tr key={row.label} className="border-b border-dashed border-border last:border-b-0">
                            <td className="py-1.5 text-muted-foreground">{row.label}</td>
                            <td className="py-1.5 text-right font-bold text-foreground">{row.value}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )
            })}
          </div>
          <div className="mt-5 rounded-lg border border-border bg-secondary/40 p-4">
            <div className="flex flex-wrap items-center gap-3">
              <p className="mr-3 text-[10px] font-extrabold uppercase tracking-[0.28em] text-primary">
                Certifications & Standards
              </p>
              {["IEC 61215", "IEC 61730", "MNRE Approved", "BIS Certified", "CE Marked", "ALMM Listed", "IS 16169", "DISCOM Approved"].map(
              (cert) => (
                <span
                  key={cert}
                  className="inline-flex rounded border border-border bg-card px-3 py-1 text-[10px] font-bold tracking-wide text-foreground"
                >
                  {cert}
                </span>
              ),
              )}
            </div>
          </div>
        </section>

        {/* ENERGY & FINANCIAL ANALYSIS */}
        <section id="quote-step-4">
          <SectionTitle index="05" title="Energy Generation & Financial Summary" subtitle="Month-wise generation forecast and investment return analysis" />

          {/* Monthly generation chart */}
          <div className="rounded-lg border border-border p-5">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm font-semibold text-foreground">Estimated Monthly Generation (Units)</p>
              <p className="text-sm text-muted-foreground">
                Total: <span className="font-semibold text-foreground">{fmtNum(system.annualGenerationUnits)} Units</span>
              </p>
            </div>
            <div className="flex h-52 items-end gap-1.5">
              {monthlyGeneration.map((m) => (
                <div key={m.month} className="flex h-full flex-1 flex-col items-center gap-1.5">
                  <div className="flex min-h-0 w-full flex-1 items-end">
                    <div
                      className={`relative w-full rounded-t ${m.peak ? "bg-accent" : "bg-primary"}`}
                      style={{ height: `${Math.max((m.units / maxGen) * 100, 8)}%` }}
                      title={`${m.month}: ${fmtNum(m.units)} Units`}
                    >
                      <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[9px] font-semibold text-muted-foreground">
                        {Math.round(m.units / 1000)}k
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] font-medium text-muted-foreground">{m.month}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-primary" /> Normal Season
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-accent" /> Peak Season
              </span>
            </div>
          </div>

          {/* Financial cards */}
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg border border-accent/30 bg-accent/10 p-5">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Total Project Cost</p>
              <p className="mt-2 text-2xl font-extrabold text-foreground">{inr(financials.totalProjectCost)}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                GST @{financials.gstRate}% incl. ({inr(financials.gstAmount)}) · {inr(financials.costPerKwp)}/kWp
              </p>
            </div>
            <div className="rounded-lg border border-border p-5">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Annual Savings</p>
              <p className="mt-2 text-2xl font-extrabold text-foreground">{inr(financials.annualSavings)}</p>
              <p className="mt-1 text-xs text-muted-foreground">Based on {fmtNum(system.annualGenerationUnits)} Units/year</p>
            </div>
            <div className="rounded-lg border border-border p-5">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">25-Year Lifetime Savings</p>
              <p className="mt-2 text-2xl font-extrabold text-foreground">{inr(financials.lifetimeSavings)}</p>
              <p className="mt-1 text-xs text-muted-foreground">0.5% annual degradation factored</p>
            </div>
          </div>

          {/* Subsidy breakdown */}
          <div className="mt-4 overflow-hidden rounded-lg border border-border">
            <table className="w-full text-left text-sm">
              <tbody>
                <tr className="border-b border-border">
                  <td className="px-5 py-3 text-foreground">Total Project Cost</td>
                  <td className="px-5 py-3 text-right font-medium text-foreground">{inr(financials.totalProjectCost)}</td>
                </tr>
                <tr className="border-b border-border bg-secondary/40">
                  <td className="px-5 py-3 text-muted-foreground">Less: Government Subsidy</td>
                  <td className="px-5 py-3 text-right text-muted-foreground">− {inr(financials.subsidy)}</td>
                </tr>
                <tr className="bg-primary text-primary-foreground">
                  <td className="px-5 py-3 font-bold">Effective Cost to Customer</td>
                  <td className="px-5 py-3 text-right text-lg font-extrabold">{inr(financials.effectiveCost)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Year-wise projection */}
          <div className="mt-4 overflow-hidden rounded-lg border border-border">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-primary text-primary-foreground">
                  <th className="px-4 py-3 font-semibold">Year</th>
                  <th className="px-4 py-3 font-semibold">Generation</th>
                  <th className="px-4 py-3 text-right font-semibold">Tariff (₹)</th>
                  <th className="px-4 py-3 text-right font-semibold">Annual Savings</th>
                  <th className="hidden px-4 py-3 text-right font-semibold sm:table-cell">Cumulative</th>
                </tr>
              </thead>
              <tbody>
                {yearProjection.map((r, i) => (
                  <tr key={r.year} className={i % 2 === 0 ? "bg-card" : "bg-secondary/40"}>
                    <td className="px-4 py-3 font-medium text-foreground">{r.year}</td>
                    <td className="px-4 py-3 text-muted-foreground">{r.generation}</td>
                    <td className="px-4 py-3 text-right text-muted-foreground">{r.tariff}</td>
                    <td className="px-4 py-3 text-right font-medium text-foreground">{inr(r.annualSavings)}</td>
                    <td className="hidden px-4 py-3 text-right text-muted-foreground sm:table-cell">
                      {inr(r.cumulativeSavings)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Cost breakdown */}
          <div className="mt-4 overflow-hidden rounded-lg border border-border">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-secondary/60">
                  <th className="px-5 py-3 font-semibold text-foreground">Description of Work / Service</th>
                  <th className="px-5 py-3 text-right font-semibold text-foreground">Amount (₹)</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-border">
                  <td className="px-5 py-3 text-muted-foreground">
                    Procurement, Installation & Commissioning of {system.sizeKw} kW On-grid Solar Plant at Itanagar.
                  </td>
                  <td className="px-5 py-3 text-right font-medium text-foreground">{inr(financials.preGst)}</td>
                </tr>
                <tr className="border-t border-border bg-secondary/40">
                  <td className="px-5 py-3 text-muted-foreground">GST @ {financials.gstRate}%</td>
                  <td className="px-5 py-3 text-right text-muted-foreground">{inr(financials.gstAmount)}</td>
                </tr>
                <tr className="border-t border-border bg-primary text-primary-foreground">
                  <td className="px-5 py-3 font-bold">Grand Total</td>
                  <td className="px-5 py-3 text-right text-lg font-extrabold">{inr(financials.totalProjectCost)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* BENEFITS */}
        <section id="quote-step-6">
          <SectionTitle index="06" title="Why Go Solar Today?" subtitle="Every sunrise is an opportunity to save money and protect our planet" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {benefits.map((b) => (
              <div key={b.title} className="rounded-lg border border-border p-4">
                <span className="flex h-9 w-9 items-center justify-center rounded-md bg-accent/15 text-accent">
                  <b.icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <p className="mt-3 font-semibold text-foreground">{b.title}</p>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{b.text}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-4 rounded-lg bg-primary p-5 text-primary-foreground sm:grid-cols-4">
            {environmental.map((e) => (
              <div key={e.label} className="text-center">
                <e.icon className="mx-auto h-6 w-6 text-accent" aria-hidden="true" />
                <p className="mt-2 text-xl font-extrabold">{e.value}</p>
                <p className="text-xs text-primary-foreground/70">{e.label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* TESTIMONIALS */}
        {showTestimonials && (
          <section id="quote-step-testimonials">
            <SectionTitle
              index="07"
              title="Customer Testimonials & Verified Installations"
              subtitle="Real installations and feedback from delighted solar homeowners"
            />
            <div className="space-y-4">
              {testimonials.map((t, idx) => (
                <div
                  key={idx}
                  className="overflow-hidden rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-sm transition-all hover:shadow-md"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                    {/* Testimonial Photo */}
                    <div className="relative h-44 w-full shrink-0 overflow-hidden rounded-xl border border-border bg-secondary/30 sm:h-36 sm:w-44">
                      <img
                        src={t.image || "/solar-rooftop-cover-4k.png"}
                        alt={t.name || "Testimonial Photo"}
                        className="h-full w-full object-cover"
                        crossOrigin="anonymous"
                        onError={(e) => {
                          e.currentTarget.onerror = null
                          e.currentTarget.src = "/solar-rooftop-cover-4k.png"
                        }}
                      />
                      {(t.systemCapacity || t.scheme) && (
                        <span className="absolute bottom-1.5 left-1.5 rounded bg-primary/90 px-2 py-0.5 text-[10px] font-bold text-primary-foreground backdrop-blur-sm">
                          {t.systemCapacity || t.scheme}
                        </span>
                      )}
                    </div>

                    {/* Testimonial Content */}
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <h4 className="text-base font-extrabold text-foreground">
                            {t.name}
                          </h4>
                          {(t.location || t.scheme) && (
                            <p className="text-xs font-medium text-accent">
                              {[t.location, t.scheme].filter(Boolean).join(" • ")}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-amber-500">
                          {Array.from({ length: Number(t.rating) || 5 }).map((_, sIdx) => (
                            <Star key={sIdx} className="h-4 w-4 fill-amber-400 text-amber-400" />
                          ))}
                        </div>
                      </div>

                      <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">
                        "{t.text}"
                      </p>

                      {t.structureType && (
                        <div className="mt-3 flex items-center gap-2">
                          <span className="inline-flex items-center gap-1 rounded-md bg-secondary px-2.5 py-1 text-[11px] font-semibold text-secondary-foreground">
                            <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                            {t.structureType}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* INSTALLATION PROCESS */}
        <section id="quote-step-7">
          <SectionTitle index="08" title="Installation Process" subtitle="From site survey to grid connection — a seamless journey" />
          <ol className="space-y-3">
            {installSteps.map((step, i) => (
              <li key={step.title} className="flex gap-4 rounded-lg border border-border p-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-bold text-accent-foreground">
                  {i + 1}
                </span>
                <div>
                  <p className="font-semibold text-foreground">{step.title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{step.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* WARRANTY */}
        <section id="quote-step-3">
          <SectionTitle index="09" title="Warranty & After-Sales Support" subtitle="Industry-leading warranty coverage across all components" />
          <div className="overflow-hidden rounded-lg border border-border">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-primary text-primary-foreground">
                  <th className="px-4 py-3 font-semibold">Component</th>
                  <th className="px-4 py-3 font-semibold">Brand</th>
                  <th className="px-4 py-3 font-semibold">Product Warranty</th>
                  <th className="hidden px-4 py-3 font-semibold sm:table-cell">Performance Guarantee</th>
                </tr>
              </thead>
              <tbody>
                {warranties.map((w, i) => (
                  <tr key={w.component} className={i % 2 === 0 ? "bg-card" : "bg-secondary/40"}>
                    <td className="px-4 py-3 font-medium text-foreground">{w.component}</td>
                    <td className="px-4 py-3 text-muted-foreground">{w.brand}</td>
                    <td className="px-4 py-3 text-muted-foreground">{w.product}</td>
                    <td className="hidden px-4 py-3 text-muted-foreground sm:table-cell">{w.performance}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* PAYMENT TERMS */}
        <section id="quote-step-5">
          <SectionTitle index="10" title="Payment Terms" subtitle="Milestone-based payment schedule" />
          <div className="overflow-hidden rounded-lg border border-border">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-primary text-primary-foreground">
                  <th className="px-4 py-3 font-semibold">#</th>
                  <th className="px-4 py-3 font-semibold">Share</th>
                  <th className="px-4 py-3 font-semibold">Milestone</th>
                  <th className="px-4 py-3 text-right font-semibold">Amount (₹)</th>
                </tr>
              </thead>
              <tbody>
                {paymentSchedule.map((p, i) => (
                  <tr key={p.milestone} className={i % 2 === 0 ? "bg-card" : "bg-secondary/40"}>
                    <td className="px-4 py-3 text-muted-foreground">{i + 1}</td>
                    <td className="px-4 py-3 font-bold text-accent">{p.share}</td>
                    <td className="px-4 py-3 text-foreground">{p.milestone}</td>
                    <td className="px-4 py-3 text-right font-medium text-foreground">{inr(p.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            GST @{financials.gstRate}% is included in the quoted amount. A valid GST invoice will be provided for each
            payment milestone.
          </p>
        </section>

        {/* TERMS, SIGN-OFF & FOOTER */}
        <section id="quote-step-8" className="quotation-page-sheet space-y-5 rounded-[28px] border border-border bg-white p-6">
          <div>
            <SectionTitle index="10" title="Terms & Conditions" subtitle="Please read these terms carefully before confirming your order" />
            <div className="grid gap-4 sm:grid-cols-2">
              {terms.map((t) => (
                <div key={t.heading} className="rounded-lg border border-border p-4">
                  <p className="mb-2 text-xs font-bold uppercase tracking-wider text-accent">{t.heading}</p>
                  <ul className="space-y-1.5 text-sm leading-relaxed text-muted-foreground">
                    {t.points.map((pt, idx) => (
                      <li key={idx} className="flex gap-2">
                        <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary" />
                        {pt}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CalendarClock className="h-4 w-4 text-accent" aria-hidden="true" />
              Quotation valid: {quote.validFrom} – {quote.validUntil}
            </div>
            <div className="mt-4 grid gap-5 sm:grid-cols-2">
              <div className="rounded-lg border border-border p-5">
                <p className="mb-6 text-xs font-bold uppercase tracking-wider text-accent">For & On Behalf of Customer</p>
                <div className="mt-10 border-t border-border pt-2">
                  <p className="font-semibold text-foreground">{client.name}</p>
                  <p className="text-xs text-muted-foreground">Name &amp; Signature — Date</p>
                </div>
              </div>
              <div className="rounded-lg border border-border p-5">
                <p className="mb-6 text-xs font-bold uppercase tracking-wider text-accent">
                  For & On Behalf of {company.name}
                </p>
                <div className="mt-10 border-t border-border pt-2">
                  <p className="font-semibold text-foreground">Authorised Signatory</p>
                  <p className="text-xs text-muted-foreground">{company.name} — Date</p>
                </div>
              </div>
            </div>
          </div>

          <footer className="border-t border-border pt-5 text-center text-xs text-muted-foreground">
            <img
              src={company.logo}
              alt={`${company.name} logo`}
              className="mx-auto mb-3 h-10 w-10 object-contain"
              crossOrigin="anonymous"
            />
            <p className="font-semibold text-foreground">CONFIDENTIAL — {company.name}</p>
            <p className="mt-1">
              {company.location} · {company.phone} · {company.email}
            </p>
            <p className="mt-1">
              Reference {quote.number} · Valid {quote.validFrom} – {quote.validUntil}
            </p>
          </footer>
        </section>
      </div>
    </div>
  )
}

/* ----------------------------------------------------------------------------
 * PAGE
 * -------------------------------------------------------------------------- */

export default function Page() {
  const { shareToken = "" } = useParams()
  const isSharedView = Boolean(shareToken)
  const location = useLocation()
  const navigate = useNavigate()
  const [savedQuotation, setSavedQuotation] = useState(() => loadSavedQuotation(location.state, location.search, shareToken))
  const [shareDialogOpen, setShareDialogOpen] = useState(false)
  const [shareLink, setShareLink] = useState("")
  const quotationData = useMemo(() => buildQuotationData(savedQuotation), [savedQuotation])
  applyQuotationData(quotationData)

  useEffect(() => {
    const nextQuotation = loadSavedQuotation(location.state, location.search, shareToken)
    if (nextQuotation) {
      setSavedQuotation(nextQuotation)
      setCurrentQuotation(nextQuotation)
    }
  }, [location.search, location.state, shareToken])

  useEffect(() => {
    if (!savedQuotation) return
    setCurrentQuotation(savedQuotation)
  }, [savedQuotation])

  useEffect(() => {
    if (!location.state?.autoPrint && !location.state?.autoDownload) return

    const actionTimer = window.setTimeout(async () => {
      try {
        if (location.state?.autoPrint) {
          window.print()
        }
        if (location.state?.autoDownload) {
          await downloadQuotationPdf("quotation")
        }
      } catch (error) {
        console.log("[v0] quotation action failed:", error)
      } finally {
        navigate(savedQuotation?.id ? `/quotation?quoteId=${savedQuotation.id}` : "/quotation", {
          replace: true,
          state: savedQuotation?.id ? { quotationId: savedQuotation.id } : {},
        })
      }
    }, 250)

    return () => window.clearTimeout(actionTimer)
  }, [location.state, navigate, savedQuotation?.id])

  const detailPageHref = savedQuotation?.id ? `/quotation?quoteId=${savedQuotation.id}` : "/quotation"

  const handleShareLink = () => {
    if (!savedQuotation?.id) return
    const nextQuotation = ensureQuotationShareToken(savedQuotation.id)
    if (!nextQuotation?.shareToken) {
      window.alert("Could not create a share link.")
      return
    }

    setSavedQuotation(nextQuotation)
    setCurrentQuotation(nextQuotation)
    setShareLink(`${window.location.origin}/q/${nextQuotation.shareToken}`)
    setShareDialogOpen(true)
  }

  const handleCopyShareLink = async () => {
    if (!shareLink) return
    try {
      await navigator.clipboard.writeText(shareLink)
      window.alert("Quote link copied.")
    } catch {
      window.alert("Could not copy the quote link.")
    }
  }

  const whatsappShareUrl = shareLink
    ? `https://wa.me/?text=${encodeURIComponent(`Please view this quotation: ${shareLink}`)}`
    : ""

  if (isSharedView && !savedQuotation) {
    return (
      <main className="grid min-h-screen place-items-center bg-background p-6">
        <div className="w-full max-w-md rounded-3xl border border-border bg-white p-8 text-center shadow-sm">
          <h1 className="text-2xl font-bold text-foreground">Quotation Not Found</h1>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">
            This shared quotation link is invalid or is no longer available in this browser.
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-background py-8">
      {!isSharedView && (
        <div className="mx-auto w-full max-w-[1320px] px-4">
          <div className="overflow-hidden rounded-[28px] border border-border bg-card/95 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
            <div className="border-b border-border bg-gradient-to-r from-slate-50 via-white to-slate-50/70 px-5 py-5 sm:px-7">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="mb-3 flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() => navigate(-1)}
                      className="inline-flex items-center gap-2 rounded-xl border border-border bg-white px-4 py-2 text-sm font-semibold text-foreground shadow-sm transition-colors hover:bg-secondary/50"
                    >
                      <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                      Back
                    </button>
                    <span className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600">
                      Quote Preview
                    </span>
                  </div>
                  <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-[2rem]">Quote Details</h1>
                  <p className="mt-2 text-sm text-muted-foreground sm:text-[15px]">
                    {quote.number} · Prepared for <span className="font-semibold text-foreground">{client.name}</span>
                  </p>
                  <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                    <span className="font-medium">Template</span>
                    <span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-foreground">Platinum</span>
                    {savedQuotation?.savedAt && (
                      <>
                        <span className="hidden text-slate-300 sm:inline">•</span>
                        <span className="font-medium text-sky-700">Last edited quotation loaded</span>
                        <button
                          type="button"
                          onClick={() => {
                            setCurrentQuotation(null)
                            setSavedQuotation(null)
                          }}
                          className="rounded-lg border border-border bg-white px-3 py-1 text-xs font-semibold text-foreground transition-colors hover:bg-secondary/50"
                        >
                          Reset
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <div className="w-full max-w-[720px]">
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    <button
                      onClick={() =>
                        navigate("/quotation/edit", {
                          state: {
                            mode: "edit",
                            quotationTitle: client.name,
                            quotationData: savedQuotation,
                          },
                        })
                      }
                      className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-2xl border border-border bg-secondary/70 px-5 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-secondary"
                    >
                      <PencilLine className="h-4 w-4" aria-hidden="true" />
                      Edit
                    </button>
                    <button
                      onClick={() => window.alert("Template switching is not connected yet.")}
                      className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-2xl border border-border bg-white px-5 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-secondary/50"
                    >
                      <LayoutGrid className="h-4 w-4" aria-hidden="true" />
                      Choose Template
                    </button>
                    <button
                      onClick={handleShareLink}
                      className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-2xl bg-slate-800 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-700"
                    >
                      <Share2 className="h-4 w-4" aria-hidden="true" />
                      Share Link
                    </button>
                  </div>

                  <div className="mt-3 grid gap-3 sm:grid-cols-3">
                    <button
                      onClick={() => window.open(detailPageHref, "_blank", "noopener,noreferrer")}
                      className="inline-flex min-h-[50px] items-center justify-center gap-2 rounded-2xl border border-border bg-white px-5 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-secondary/50"
                    >
                      <ExternalLink className="h-4 w-4" aria-hidden="true" />
                      Open in New Tab
                    </button>
                    <button
                      onClick={() => window.print()}
                      className="inline-flex min-h-[50px] items-center justify-center gap-2 rounded-2xl border border-border bg-white px-5 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-secondary/50"
                    >
                      <Printer className="h-4 w-4" aria-hidden="true" />
                      Print
                    </button>
                    <DownloadButton targetId="quotation" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      <div id="quotation" className="mx-auto w-full max-w-[1320px] px-4">
        <QuotationDocument />
      </div>

      {shareDialogOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-950/35 p-4 backdrop-blur-sm">
          <div className="w-full max-w-[660px] overflow-hidden rounded-[28px] bg-white shadow-[0_30px_80px_rgba(15,23,42,0.24)]">
            <div className="flex items-center justify-between border-b border-border px-7 py-6">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-full bg-slate-100 text-slate-700">
                  <Share2 className="h-5 w-5" aria-hidden="true" />
                </div>
                <h2 className="text-[1.15rem] font-bold text-slate-800">Share Quotation</h2>
              </div>
              <button
                type="button"
                onClick={() => setShareDialogOpen(false)}
                className="rounded-full p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            <div className="px-7 py-7">
              <p className="max-w-[560px] text-[1rem] leading-8 text-slate-500">
                Anyone with this link can view the quotation as a flip-book brochure — no login needed. It works great on mobile too.
              </p>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <div className="flex min-h-[54px] flex-1 items-center rounded-2xl border border-slate-200 px-5 text-[1.05rem] text-slate-700 shadow-sm">
                  <span className="truncate">{shareLink}</span>
                </div>
                <button
                  type="button"
                  onClick={handleCopyShareLink}
                  className="inline-flex min-h-[54px] items-center justify-center gap-2 rounded-2xl bg-slate-100 px-6 text-[1.05rem] font-semibold text-slate-700 transition-colors hover:bg-slate-200"
                >
                  <Copy className="h-5 w-5" aria-hidden="true" />
                  Copy
                </button>
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => window.open(whatsappShareUrl, "_blank", "noopener,noreferrer")}
                  className="inline-flex items-center gap-2 rounded-2xl bg-emerald-500 px-5 py-3 text-[1.05rem] font-semibold text-white transition-colors hover:bg-emerald-600"
                >
                  <MessageCircle className="h-5 w-5" aria-hidden="true" />
                  Send on WhatsApp
                </button>
                <button
                  type="button"
                  onClick={() => window.open(shareLink, "_blank", "noopener,noreferrer")}
                  className="inline-flex items-center gap-2 rounded-2xl bg-indigo-50 px-5 py-3 text-[1.05rem] font-semibold text-indigo-600 transition-colors hover:bg-indigo-100"
                >
                  <ExternalLink className="h-5 w-5" aria-hidden="true" />
                  Open
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

export { QuotationDocument, buildQuotationData, applyQuotationData, downloadQuotationPdf }

export function LiveQuotationPane({ quotationRecord, activeStep = 1, onClose }) {
  const quotationData = useMemo(() => buildQuotationData(quotationRecord), [quotationRecord])
  applyQuotationData(quotationData)

  const [downloading, setDownloading] = useState(false)
  const scrollContainerRef = React.useRef(null)

  useEffect(() => {
    if (!activeStep) return
    const timer = setTimeout(() => {
      const targetElement = document.getElementById(`quote-step-${activeStep}`)
      if (targetElement) {
        targetElement.scrollIntoView({ behavior: "smooth", block: "start" })
      }
    }, 100)
    return () => clearTimeout(timer)
  }, [activeStep])

  const handleDownload = async () => {
    setDownloading(true)
    try {
      await downloadQuotationPdf("quotation-split-preview")
    } catch (e) {
      console.log("PDF generation error:", e)
      alert("PDF download failed. Please try again.")
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="flex flex-col h-full bg-slate-100/90 border-l border-slate-200">
      {/* Header bar of split view */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-white border-b border-slate-200 shadow-sm shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-800 shrink-0">
            Live Quotation Preview
          </span>
          <span className="hidden sm:inline text-xs text-slate-300">|</span>
          <span className="truncate text-xs font-semibold text-slate-600">
            {quotationData?.client?.name} ({quotationData?.system?.sizeKw} kWp)
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => window.print()}
            title="Print Proposal"
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
          >
            <Printer className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Print</span>
          </button>
          <button
            type="button"
            onClick={handleDownload}
            disabled={downloading}
            title="Download PDF"
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            {downloading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
            <span className="hidden sm:inline">{downloading ? "PDF..." : "PDF"}</span>
          </button>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              title="Close Preview Pane"
              className="inline-flex items-center justify-center h-7 w-7 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Scrollable document area */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-3 sm:p-5 scroll-smooth">
        <div id="quotation-split-preview" className="mx-auto w-full max-w-[820px] rounded-xl overflow-hidden shadow-sm bg-white">
          <QuotationDocument key={JSON.stringify(quotationData)} />
        </div>
      </div>
    </div>
  )
}

export function QuotationProposalPreview({
  quotationRecord,
  onBack,
  onSave,
  saveLabel = "Create quotation",
}) {
  const quotationData = useMemo(() => buildQuotationData(quotationRecord), [quotationRecord])
  applyQuotationData(quotationData)

  const [shareDialogOpen, setShareDialogOpen] = useState(false)
  const [shareLink, setShareLink] = useState("")

  const handleShareLink = () => {
    if (!quotationRecord?.id) return
    const nextQuotation = ensureQuotationShareToken(quotationRecord.id)
    if (!nextQuotation?.shareToken) {
      window.alert("Could not create a share link.")
      return
    }
    setShareLink(`${window.location.origin}/q/${nextQuotation.shareToken}`)
    setShareDialogOpen(true)
  }

  const handleCopyShareLink = async () => {
    if (!shareLink) return
    try {
      await navigator.clipboard.writeText(shareLink)
      window.alert("Quote link copied.")
    } catch {
      window.alert("Could not copy the quote link.")
    }
  }

  const whatsappShareUrl = shareLink
    ? `https://wa.me/?text=${encodeURIComponent(`Please view this quotation: ${shareLink}`)}`
    : ""

  return (
    <div className="min-h-screen bg-slate-100/70 pb-16 pt-4">
      <div className="mx-auto w-full max-w-[1320px] px-4">
        {/* Sticky top action toolbar */}
        <div className="sticky top-3 z-50 mb-6 overflow-hidden rounded-2xl border border-slate-200/80 bg-white/95 px-5 py-3.5 shadow-[0_12px_40px_rgba(15,23,42,0.08)] backdrop-blur-md">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {onBack && (
                <button
                  type="button"
                  onClick={onBack}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:bg-slate-100 hover:shadow"
                >
                  <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                  Back to Editing
                </button>
              )}
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
                    Live Proposal Preview
                  </span>
                  <h2 className="text-base font-bold text-slate-800">
                    {quotationData?.client?.name || "Quotation Preview"}
                  </h2>
                </div>
                <p className="text-xs text-slate-500">
                  {quotationData?.system?.sizeKw} kWp · {quotationData?.quote?.number} · Real-time preview of your form edits
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-100"
              >
                <Printer className="h-4 w-4" aria-hidden="true" />
                Print
              </button>
              <DownloadButton targetId="quotation-preview-container" />
              {onSave && (
                <button
                  type="button"
                  onClick={onSave}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-md transition-all hover:bg-blue-700"
                >
                  <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                  {saveLabel}
                </button>
              )}
            </div>
          </div>
        </div>

        <div id="quotation-preview-container" className="mx-auto w-full max-w-[1320px]">
          <QuotationDocument />
        </div>
      </div>
    </div>
  )
}
