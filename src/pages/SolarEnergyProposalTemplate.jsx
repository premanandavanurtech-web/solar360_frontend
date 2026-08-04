import React from "react";
import "./SolarEnergyProposalTemplate.css";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  CartesianGrid,
} from "recharts";
import {
  Award,
  BadgeIndianRupee,
  BatteryCharging,
  ClipboardCheck,
  CloudSun,
  Factory,
  FileCheck2,
  Gauge,
  Hammer,
  Home,
  IndianRupee,
  Leaf,
  LineChart,
  MonitorSmartphone,
  PlugZap,
  ReceiptText,
  ShieldCheck,
  Signature,
  Sun,
  Trees,
  TrendingUp,
  User,
  WalletCards,
  Wrench,
  Zap,
} from "lucide-react";

export const solarProposalData = {
  customer_name: "Suresh Kumar",
  customer_contact: "+91 98765 43210",
  installation_address: "Plot No. 42, Patia, Bhubaneswar, Odisha 751024",

  company_name: "VanurTech Solar Energy Pvt. Ltd.",
  company_email: "proposal@vanurtechsolar.in",
  company_phone: "+91 98765 00000",
  company_logo_url: "/solar360-logo.png",
  company_tagline: "Engineering reliable clean-energy outcomes for Indian rooftops.",

  quote_ref: "VSE/ON-GRID/2026/0142",
  quote_date: "2026-06-08",
  valid_days: 14,
  proposed_by: "VanurTech Solar Engineering Team",

  system_capacity_kwp: 5.5,
  system_lifespan_years: 25,
  system_type: "On-Grid Rooftop Solar System",
  panel_qty: 10,
  panel_wattage: 550,
  panel_brand: "Adani Solar",
  panel_category: "Mono PERC Half-Cut",
  inverter_brand: "Sungrow",
  inverter_size: "5 kW",

  mounting_brand: "VanurTech HDG Structure",
  mounting_capacity: "Wind Load 180 km/h",
  mounting_type: "Elevated Hot-Dip Galvanized",
  mounting_size: "40 x 40 mm MS rail",
  cable_brand: "Polycab",
  dc_cable_spec: "1C x 4 sq.mm copper solar DC cable",
  ac_cable_spec: "4C x 6 sq.mm copper armoured AC cable",
  dcdb_spec: "1000V DC isolator, SPD, fuse protection",
  acdb_spec: "MCB, SPD, energy meter, earthing terminal",
  monitoring_platform: "VanurTech Solar Cloud",
  monitoring_data_logger: "Wi-Fi + 4G enabled logger",
  monitoring_app: "Mobile app and web dashboard",
  monitoring_reports: "Daily, monthly, and yearly generation reports",

  total_cost: 385000,
  subsidy_amount: 78000,
  gst_rate: 18,
  annual_generation_units: 7520,
  annual_savings: 75000,
  payback_years: 3.9,
  lifetime_savings: 1850000,

  monthly_generation_data: [
    { month: "Jan", units: 520, season: "normal" },
    { month: "Feb", units: 575, season: "normal" },
    { month: "Mar", units: 690, season: "peak" },
    { month: "Apr", units: 710, season: "peak" },
    { month: "May", units: 760, season: "peak" },
    { month: "Jun", units: 660, season: "normal" },
    { month: "Jul", units: 610, season: "normal" },
    { month: "Aug", units: 620, season: "normal" },
    { month: "Sep", units: 670, season: "peak" },
    { month: "Oct", units: 705, season: "peak" },
    { month: "Nov", units: 650, season: "normal" },
    { month: "Dec", units: 600, season: "normal" },
  ],
  year_wise_savings: [
    {
      year: 1,
      annual_generation: 7520,
      tariff: 8.0,
      annual_savings: 60160,
      cumulative_savings: 60160,
      net_investment: 246840,
    },
    {
      year: 2,
      annual_generation: 7482,
      tariff: 8.24,
      annual_savings: 61676,
      cumulative_savings: 121836,
      net_investment: 185164,
    },
    {
      year: 3,
      annual_generation: 7445,
      tariff: 8.49,
      annual_savings: 63218,
      cumulative_savings: 185054,
      net_investment: 121946,
    },
    {
      year: 4,
      annual_generation: 7408,
      tariff: 8.74,
      annual_savings: 64746,
      cumulative_savings: 249800,
      net_investment: 57200,
    },
    {
      year: 5,
      annual_generation: 7371,
      tariff: 9.0,
      annual_savings: 66339,
      cumulative_savings: 316139,
      net_investment: 0,
    },
  ],
};

const PAGE_WIDTH = 794;
const PAGE_HEIGHT = 1123;
const PEAK = "#f5a623";
const NORMAL = "#1a5c3a";

const formatNumber = (value) => Number(value || 0).toLocaleString("en-IN");
const formatCurrency = (value) => `Rs. ${formatNumber(value)}`;

const formatDate = (value) =>
  new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));

const addDays = (dateValue, days) => {
  const next = new Date(dateValue);
  next.setDate(next.getDate() + Number(days || 0));
  return next;
};

const effectiveCost = (data) =>
  Number(data.total_cost || 0) - Number(data.subsidy_amount || 0);

const gstAmount = (data) =>
  Math.round((Number(data.total_cost || 0) * Number(data.gst_rate || 0)) / 100);

const StatCard = ({ label, value, helper, icon: Icon, dark = false }) => (
  <div
    className={`rounded-2xl border p-4 shadow-sm ${
      dark
        ? "border-white/15 bg-white/10 text-white"
        : "border-slate-100 bg-white text-slate-950"
    }`}
  >
    <div className="flex items-center justify-between gap-3">
      <div>
        <p className={`text-[10px] font-bold uppercase tracking-[0.22em] ${dark ? "text-white/60" : "text-slate-500"}`}>
          {label}
        </p>
        <p className="mt-2 text-2xl font-black leading-none">{value}</p>
      </div>
      {Icon ? (
        <div className={`grid h-10 w-10 place-items-center rounded-xl ${dark ? "bg-white/10" : "bg-[#1a5c3a]/10"}`}>
          <Icon className={dark ? "text-[#f5a623]" : "text-[#1a5c3a]"} size={20} />
        </div>
      ) : null}
    </div>
    {helper ? (
      <p className={`mt-3 text-xs ${dark ? "text-white/65" : "text-slate-500"}`}>{helper}</p>
    ) : null}
  </div>
);

const SectionHeader = ({ number, title, subtitle }) => (
  <div className="mb-6 flex items-start gap-4">
    <div className="grid h-10 min-w-10 place-items-center rounded-xl bg-[#f5a623]/15 text-sm font-black text-[#f5a623]">
      {number}
    </div>
    <div>
      <p className="text-[11px] font-black uppercase tracking-[0.28em] text-[#1a5c3a]">
        Section {number}
      </p>
      <h2 className="mt-1 text-3xl font-black leading-tight text-slate-950">
        {title}
      </h2>
      {subtitle ? <p className="mt-2 text-sm leading-6 text-slate-500">{subtitle}</p> : null}
    </div>
  </div>
);

const ProposalLogo = ({ data, invert = false }) => (
  <div className="flex items-center gap-3">
    <div className={`grid h-12 w-12 place-items-center overflow-hidden rounded-2xl border ${invert ? "border-white/20 bg-white" : "border-[#1a5c3a]/15 bg-white"}`}>
      {data.company_logo_url ? (
        <img
          src={data.company_logo_url}
          alt={`${data.company_name} logo`}
          className="h-full w-full object-contain p-1.5"
        />
      ) : (
        <Sun className="text-[#f5a623]" size={26} />
      )}
    </div>
    <div>
      <p className={`text-base font-black leading-tight ${invert ? "text-white" : "text-slate-950"}`}>
        {data.company_name}
      </p>
      <p className={`text-[10px] font-bold uppercase tracking-[0.24em] ${invert ? "text-white/55" : "text-[#1a5c3a]"}`}>
        Solar Energy Proposal
      </p>
    </div>
  </div>
);

const Page = ({ data, number, children, cover = false }) => (
  <section
    className={`solar-proposal-page relative mx-auto mb-8 overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-2xl shadow-slate-900/10 ${
      cover ? "text-white" : "text-slate-950"
    }`}
    style={{ width: PAGE_WIDTH, minHeight: PAGE_HEIGHT }}
  >
    {children}
    {!cover ? (
      <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between border-t border-slate-100 px-10 py-5 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
        <span>{data.company_name}</span>
        <span>
          Page {number} / 8
        </span>
      </div>
    ) : null}
  </section>
);

const PageBody = ({ children, compact = false }) => (
  <div className={`relative z-10 ${compact ? "px-9 py-8" : "px-10 py-9"} pb-20`}>
    {children}
  </div>
);

const InfoTable = ({ rows }) => (
  <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
    {rows.map((row) => (
      <div key={row.label} className="grid grid-cols-[190px_1fr] border-b border-slate-100 last:border-b-0">
        <div className="bg-slate-50 px-4 py-3 text-xs font-black uppercase tracking-[0.16em] text-slate-500">
          {row.label}
        </div>
        <div className="px-4 py-3 text-sm font-bold text-slate-900">{row.value}</div>
      </div>
    ))}
  </div>
);

const ComponentCard = ({ icon: Icon, title, badge, rows }) => (
  <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-lg shadow-slate-900/5">
    <div className="mb-4 flex items-start justify-between gap-3">
      <div className="flex items-center gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-xl bg-[#1a5c3a]/10">
          <Icon className="text-[#1a5c3a]" size={21} />
        </div>
        <div>
          <h3 className="text-base font-black text-slate-950">{title}</h3>
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#f5a623]">
            {badge}
          </p>
        </div>
      </div>
    </div>
    <div className="space-y-2">
      {rows.map((row) => (
        <div key={row.label} className="flex items-start justify-between gap-4 border-b border-slate-100 pb-2 last:border-b-0 last:pb-0">
          <span className="text-xs font-bold text-slate-500">{row.label}</span>
          <span className="max-w-[160px] text-right text-xs font-black text-slate-900">{row.value}</span>
        </div>
      ))}
    </div>
  </div>
);

const BenefitCard = ({ icon: Icon, title, body }) => (
  <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-lg shadow-slate-900/5">
    <div className="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-[#f5a623]/15">
      <Icon className="text-[#1a5c3a]" size={23} />
    </div>
    <h3 className="text-base font-black text-slate-950">{title}</h3>
    <p className="mt-2 text-xs leading-5 text-slate-500">{body}</p>
  </div>
);

const CoverPage = ({ data }) => {
  const validUntil = formatDate(addDays(data.quote_date, data.valid_days));

  return (
    <Page data={data} number={1} cover>
      <div className="absolute inset-0 bg-[#0f271c]" />
      <div className="absolute -right-20 -top-20 h-80 w-80 rounded-full bg-[#f5a623]/25 blur-3xl" />
      <div className="absolute -bottom-28 -left-20 h-96 w-96 rounded-full bg-[#1a5c3a]/60 blur-3xl" />
      <div className="absolute inset-0 opacity-10">
        <div className="absolute left-16 top-64 h-[420px] w-[560px] rotate-[-12deg] rounded-[40px] border border-white" />
        <div className="absolute left-28 top-72 h-[420px] w-[560px] rotate-[-12deg] rounded-[40px] border border-white" />
      </div>

      <div className="relative z-10 flex h-full min-h-[1123px] flex-col px-10 py-10">
        <header className="flex items-start justify-between">
          <ProposalLogo data={data} invert />
          <div className="rounded-2xl border border-white/15 bg-white/10 px-5 py-4 text-right shadow-xl shadow-black/10 backdrop-blur">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/60">
              Quotation Reference
            </p>
            <p className="mt-1 text-sm font-black">{data.quote_ref}</p>
            <p className="mt-3 text-xs font-bold text-[#f5a623]">
              Valid Until: {data.valid_days} Days
            </p>
            <p className="mt-1 text-[11px] text-white/60">{validUntil}</p>
          </div>
        </header>

        <main className="mt-20">
          <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.22em] text-[#f5a623]">
            <User size={15} />
            Prepared For: {data.customer_name}
          </div>
          <h1 className="max-w-[600px] text-6xl font-black leading-[0.95] tracking-[-0.04em]">
            Powering Your Future with Clean Energy
          </h1>
          <p className="mt-6 text-lg font-black uppercase tracking-[0.3em] text-[#f5a623]">
            On-Grid Rooftop Solar System
          </p>
          <p className="mt-5 max-w-[560px] text-base leading-7 text-white/70">
            A premium, print-ready proposal for a {data.system_capacity_kwp} kWp solar PV
            system designed to reduce grid dependence and deliver predictable savings.
          </p>
        </main>

        <div className="mt-16 grid grid-cols-5 gap-3">
          <StatCard
            dark
            label="System Capacity"
            value={`${data.system_capacity_kwp} kWp`}
            helper="Grid tied"
            icon={Gauge}
          />
          <StatCard
            dark
            label="Units / Year"
            value={formatNumber(data.annual_generation_units)}
            helper="Expected"
            icon={Zap}
          />
          <StatCard
            dark
            label="Annual Savings"
            value={formatCurrency(data.annual_savings)}
            helper="Estimated"
            icon={IndianRupee}
          />
          <StatCard
            dark
            label="Payback"
            value={`${data.payback_years} yrs`}
            helper="Simple"
            icon={TrendingUp}
          />
          <StatCard
            dark
            label="Lifespan"
            value={`${data.system_lifespan_years} yrs`}
            helper="System life"
            icon={ShieldCheck}
          />
        </div>

        <div className="mt-auto grid grid-cols-3 gap-4 rounded-3xl border border-white/10 bg-white/10 p-5 backdrop-blur">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/50">
              Installation Address
            </p>
            <p className="mt-2 text-sm font-bold leading-6 text-white">{data.installation_address}</p>
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/50">
              Date of Issue
            </p>
            <p className="mt-2 text-sm font-bold text-white">{formatDate(data.quote_date)}</p>
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/50">
              Proposed By
            </p>
            <p className="mt-2 text-sm font-bold text-white">{data.proposed_by}</p>
          </div>
        </div>

        <footer className="mt-6 flex items-center justify-between text-[11px] font-bold uppercase tracking-[0.18em] text-white/50">
          <span>{data.company_tagline}</span>
          <span>Page 1 / 8</span>
        </footer>
      </div>
    </Page>
  );
};

const ProjectOverviewPage = ({ data }) => (
  <Page data={data} number={2}>
    <PageBody>
      <SectionHeader
        number="01"
        title="Project Overview"
        subtitle="Executive summary of the proposed rooftop solar PV system."
      />

      <div className="grid grid-cols-[1.05fr_1fr] gap-5 rounded-[28px] bg-[#0f271c] p-6 text-white shadow-2xl shadow-[#1a5c3a]/20">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.28em] text-[#f5a623]">
            About This Proposal
          </p>
          <h3 className="mt-4 text-3xl font-black leading-tight">
            A bankable solar system for long-term savings.
          </h3>
          <p className="mt-4 text-sm leading-7 text-white/68">
            {data.company_name} proposes the design, supply, installation, testing,
            and commissioning of a {data.system_capacity_kwp} kWp {data.system_type}
            at the client site. The system is sized for dependable generation, safe
            operation, DISCOM compliance, and strong lifecycle returns.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <StatCard dark label="System Capacity" value={`${data.system_capacity_kwp} kWp`} icon={Gauge} />
          <StatCard dark label="Solar Modules" value={`${data.panel_qty} Nos.`} icon={Sun} />
          <StatCard dark label="Annual Generation" value={`${formatNumber(data.annual_generation_units)} kWh`} icon={LineChart} />
          <StatCard dark label="Payback Period" value={`${data.payback_years} Years`} icon={TrendingUp} />
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-5">
        <div>
          <h3 className="mb-3 text-sm font-black uppercase tracking-[0.2em] text-[#1a5c3a]">
            Client Details
          </h3>
          <InfoTable
            rows={[
              { label: "Name", value: data.customer_name },
              { label: "Contact", value: data.customer_contact },
              { label: "Installation Site", value: data.installation_address },
            ]}
          />
        </div>
        <div>
          <h3 className="mb-3 text-sm font-black uppercase tracking-[0.2em] text-[#1a5c3a]">
            System Configuration
          </h3>
          <InfoTable
            rows={[
              { label: "System Type", value: data.system_type },
              { label: "Capacity", value: `${data.system_capacity_kwp} kWp` },
              { label: "No. of Panels", value: `${data.panel_qty} x ${data.panel_wattage} Wp` },
              { label: "Inverter", value: `${data.inverter_brand} ${data.inverter_size}` },
            ]}
          />
        </div>
      </div>

      <div className="mt-7 overflow-hidden rounded-[28px] border border-[#f5a623]/30 bg-gradient-to-r from-[#fff7e8] to-white p-6 shadow-lg shadow-[#f5a623]/10">
        <div className="flex items-center justify-between gap-6">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.28em] text-[#f5a623]">
              Lifetime Savings Opportunity
            </p>
            <p className="mt-3 max-w-[430px] text-sm leading-6 text-slate-600">
              The proposed system can offset electricity costs over its 25-year
              useful life while improving energy predictability for the property.
            </p>
          </div>
          <div className="text-right">
            <p className="text-5xl font-black tracking-[-0.04em] text-[#1a5c3a]">
              {formatCurrency(data.lifetime_savings)}
            </p>
            <p className="mt-2 text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
              Estimated 25-year savings
            </p>
          </div>
        </div>
      </div>
    </PageBody>
  </Page>
);

const RooftopLayoutPage = ({ data }) => (
  <Page data={data} number={3}>
    <PageBody>
      <SectionHeader
        number="02"
        title="Rooftop Layout & Design"
        subtitle="Indicative engineering layout for optimized generation and safe maintenance access."
      />

      <div className="relative overflow-hidden rounded-[30px] bg-[#0f271c] p-6 text-white shadow-2xl shadow-[#1a5c3a]/20">
        <div className="absolute right-8 top-8 h-24 w-24 rounded-full bg-[#f5a623] shadow-[0_0_60px_rgba(245,166,35,0.55)]" />
        <div className="absolute inset-0 opacity-[0.12]">
          <div className="absolute left-10 top-28 h-80 w-[620px] rotate-[-10deg] rounded-[40px] border border-white" />
          <div className="absolute left-20 top-36 h-80 w-[620px] rotate-[-10deg] rounded-[40px] border border-white" />
        </div>

        <div className="relative z-10 h-[460px] rounded-[24px] border border-white/10 bg-white/5 p-5">
          <div className="absolute left-16 top-24 h-64 w-[520px] rotate-[-8deg] rounded-[28px] bg-gradient-to-br from-slate-700 to-slate-950 shadow-2xl shadow-black/50">
            <div className="absolute inset-x-6 top-7 grid grid-cols-5 gap-3">
              {Array.from({ length: data.panel_qty }).map((_, index) => (
                <div
                  key={index}
                  className="h-24 rounded-xl border border-cyan-200/20 bg-gradient-to-br from-[#153a5a] to-[#081827] shadow-inner"
                >
                  <div className="grid h-full grid-cols-2 grid-rows-3 gap-px p-2 opacity-60">
                    {Array.from({ length: 6 }).map((__, cellIndex) => (
                      <span key={cellIndex} className="rounded-sm bg-cyan-200/20" />
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="absolute bottom-6 left-8 right-8 h-4 rounded-full bg-black/35" />
          </div>
          <div className="absolute bottom-7 left-7 rounded-2xl border border-white/10 bg-black/25 p-4 backdrop-blur">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#f5a623]">
              3D Rooftop Layout Placeholder
            </p>
            <p className="mt-2 max-w-[250px] text-xs leading-5 text-white/65">
              Replace this visual block with a site-specific rooftop render or drone view.
            </p>
          </div>
        </div>

        <div className="relative z-10 mt-5 grid grid-cols-4 gap-3 rounded-2xl border border-white/10 bg-white/10 p-4">
          {[
            ["Total Panels", `${data.panel_qty} Nos.`],
            ["Panel Wattage", `${data.panel_wattage} Wp`],
            ["kWp Capacity", `${data.system_capacity_kwp} kWp`],
            ["Orientation", "South / South-West"],
          ].map(([label, value]) => (
            <div key={label}>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/50">{label}</p>
              <p className="mt-2 text-lg font-black">{value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-3 gap-5">
        {[
          {
            icon: Sun,
            title: "South Facing Optimal Tilt",
            text: "Panels are positioned for strong daily irradiation and stable annual generation.",
          },
          {
            icon: Hammer,
            title: "Elevated Mounting Structure",
            text: "Hot-dip galvanized structure improves ventilation, drainage, and service access.",
          },
          {
            icon: CloudSun,
            title: "Shadow-Free Zone",
            text: "Layout keeps active module zones clear from parapet and obstruction shadows.",
          },
        ].map((item) => (
          <div key={item.title} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-lg shadow-slate-900/5">
            <item.icon className="text-[#f5a623]" size={28} />
            <h3 className="mt-4 text-base font-black text-slate-950">{item.title}</h3>
            <p className="mt-2 text-xs leading-5 text-slate-500">{item.text}</p>
          </div>
        ))}
      </div>
    </PageBody>
  </Page>
);

const TechnicalSpecsPage = ({ data }) => (
  <Page data={data} number={4}>
    <PageBody compact>
      <SectionHeader
        number="03"
        title="Technical Specifications"
        subtitle="Premium-grade components selected for Indian rooftop conditions."
      />

      <div className="grid grid-cols-3 gap-4">
        <ComponentCard
          icon={Sun}
          title="Solar Panels"
          badge={data.panel_brand}
          rows={[
            { label: "Category", value: data.panel_category },
            { label: "Wattage", value: `${data.panel_wattage} Wp` },
            { label: "Quantity", value: `${data.panel_qty} Nos.` },
            { label: "Total", value: `${data.system_capacity_kwp} kWp` },
          ]}
        />
        <ComponentCard
          icon={PlugZap}
          title="Inverter"
          badge={data.inverter_brand}
          rows={[
            { label: "Rated Power", value: data.inverter_size },
            { label: "Type", value: "Single / Three Phase Grid-Tie" },
            { label: "Protection", value: "Anti-islanding, SPD, AFCI" },
            { label: "Monitoring", value: "Wi-Fi enabled" },
          ]}
        />
        <ComponentCard
          icon={Wrench}
          title="Mounting Structure"
          badge={data.mounting_brand}
          rows={[
            { label: "Capacity", value: data.mounting_capacity },
            { label: "Type", value: data.mounting_type },
            { label: "Size", value: data.mounting_size },
            { label: "Finish", value: "Hot-dip galvanized" },
          ]}
        />
        <ComponentCard
          icon={BatteryCharging}
          title="DC & AC Cables"
          badge={data.cable_brand}
          rows={[
            { label: "DC Cable", value: data.dc_cable_spec },
            { label: "AC Cable", value: data.ac_cable_spec },
            { label: "Conduits", value: "UV-resistant PVC / GI" },
            { label: "Routing", value: "Clamped and labelled" },
          ]}
        />
        <ComponentCard
          icon={ShieldCheck}
          title="ACDB / DCDB"
          badge="Protection System"
          rows={[
            { label: "DCDB", value: data.dcdb_spec },
            { label: "ACDB", value: data.acdb_spec },
            { label: "Earthing", value: "Chemical earthing included" },
            { label: "Safety", value: "Surge and fault isolation" },
          ]}
        />
        <ComponentCard
          icon={MonitorSmartphone}
          title="Monitoring System"
          badge={data.company_name}
          rows={[
            { label: "Platform", value: data.monitoring_platform },
            { label: "Data Logger", value: data.monitoring_data_logger },
            { label: "App", value: data.monitoring_app },
            { label: "Reports", value: data.monitoring_reports },
          ]}
        />
      </div>

      <div className="mt-7 rounded-[26px] bg-[#0f271c] p-5 text-white">
        <p className="mb-4 text-[11px] font-black uppercase tracking-[0.28em] text-[#f5a623]">
          Certifications & Compliance
        </p>
        <div className="flex flex-wrap gap-3">
          {[
            "IEC 61215",
            "IEC 61730",
            "MNRE Approved",
            "BIS Certified",
            "CE Marked",
            "ALMM Listed",
            "IS 16169",
            "DISCOM Approved",
          ].map((item) => (
            <span
              key={item}
              className="rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-black"
            >
              {item}
            </span>
          ))}
        </div>
      </div>
    </PageBody>
  </Page>
);

const FinancialAnalysisPage = ({ data }) => {
  const breakdownRows = [
    ["Total Project Cost", formatCurrency(data.total_cost)],
    ["Less: Government Subsidy", formatCurrency(data.subsidy_amount)],
    ["Effective Customer Cost", formatCurrency(effectiveCost(data))],
  ];

  return (
    <Page data={data} number={5}>
      <PageBody compact>
        <SectionHeader
          number="04"
          title="Energy Generation & Financial Summary"
          subtitle="Expected generation and savings model for the first five years."
        />

        <div className="rounded-[26px] border border-slate-100 bg-white p-5 shadow-lg shadow-slate-900/5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-base font-black text-slate-950">Monthly Energy Generation</h3>
              <p className="text-xs text-slate-500">Normal season vs peak season generation profile</p>
            </div>
            <div className="flex items-center gap-4 text-xs font-bold text-slate-500">
              <span className="inline-flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-[#1a5c3a]" />
                Normal
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-[#f5a623]" />
                Peak
              </span>
            </div>
          </div>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.monthly_generation_data} margin={{ top: 12, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                <Tooltip
                  cursor={{ fill: "rgba(26,92,58,0.08)" }}
                  formatter={(value) => [`${formatNumber(value)} units`, "Generation"]}
                  contentStyle={{
                    border: "1px solid #e2e8f0",
                    borderRadius: 14,
                    boxShadow: "0 12px 30px rgba(15,23,42,0.12)",
                  }}
                />
                <Bar dataKey="units" radius={[10, 10, 0, 0]}>
                  {data.monthly_generation_data.map((entry) => (
                    <Cell key={entry.month} fill={entry.season === "peak" ? PEAK : NORMAL} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-4 gap-4">
          <StatCard label="Total Project Cost" value={formatCurrency(data.total_cost)} icon={ReceiptText} />
          <StatCard label="Annual Savings" value={formatCurrency(data.annual_savings)} icon={WalletCards} />
          <StatCard label="Payback Period" value={`${data.payback_years} Years`} icon={TrendingUp} />
          <StatCard label="25-Year Savings" value={formatCurrency(data.lifetime_savings)} icon={BadgeIndianRupee} />
        </div>

        <div className="mt-5 grid grid-cols-[0.8fr_1.2fr] gap-5">
          <div className="rounded-[24px] border border-[#f5a623]/30 bg-[#fff7e8] p-5">
            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[#f5a623]">
              Cost Breakdown
            </p>
            <div className="mt-4 space-y-3">
              {breakdownRows.map(([label, value], index) => (
                <div key={label} className="flex items-center justify-between rounded-xl bg-white px-4 py-3 shadow-sm">
                  <span className="text-xs font-bold text-slate-500">{label}</span>
                  <span className={`text-sm font-black ${index === 2 ? "text-[#1a5c3a]" : "text-slate-950"}`}>
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="overflow-hidden rounded-[24px] border border-slate-100 bg-white shadow-lg shadow-slate-900/5">
            <div className="bg-[#1a5c3a] px-4 py-3 text-xs font-black uppercase tracking-[0.22em] text-white">
              Year-Wise Cumulative Savings
            </div>
            <table className="w-full text-left text-[11px]">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  {["Year", "Generation", "Tariff", "Savings", "Cumulative", "Net"].map((header) => (
                    <th key={header} className="px-3 py-3 font-black">{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.year_wise_savings.map((row) => (
                  <tr key={row.year} className="border-t border-slate-100">
                    <td className="px-3 py-3 font-black">{row.year}</td>
                    <td className="px-3 py-3">{formatNumber(row.annual_generation)}</td>
                    <td className="px-3 py-3">Rs. {row.tariff.toFixed(2)}</td>
                    <td className="px-3 py-3">{formatCurrency(row.annual_savings)}</td>
                    <td className="px-3 py-3">{formatCurrency(row.cumulative_savings)}</td>
                    <td className="px-3 py-3">{formatCurrency(row.net_investment)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-5 overflow-hidden rounded-[24px] border border-slate-100 bg-white shadow-sm">
          <div className="bg-slate-50 px-4 py-3 text-xs font-black uppercase tracking-[0.22em] text-[#1a5c3a]">
            Description of Work with GST
          </div>
          <table className="w-full text-left text-xs">
            <tbody>
              {[
                ["Design, supply, installation, testing and commissioning", formatCurrency(data.total_cost)],
                [`GST @ ${data.gst_rate}%`, formatCurrency(gstAmount(data))],
                ["Subsidy support and documentation", `-${formatCurrency(data.subsidy_amount)}`],
                ["Net payable after subsidy adjustment", formatCurrency(effectiveCost(data) + gstAmount(data))],
              ].map(([label, value], index) => (
                <tr key={label} className="border-t border-slate-100 first:border-t-0">
                  <td className="px-4 py-3 font-bold text-slate-600">{label}</td>
                  <td className={`px-4 py-3 text-right font-black ${index === 3 ? "text-[#1a5c3a]" : "text-slate-950"}`}>
                    {value}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </PageBody>
    </Page>
  );
};

const WhySolarPage = ({ data }) => (
  <Page data={data} number={6}>
    <PageBody>
      <SectionHeader
        number="05"
        title="Why Go Solar Today?"
        subtitle="Solar is now a financial upgrade, not just an environmental decision."
      />

      <div className="overflow-hidden rounded-[30px] bg-gradient-to-r from-[#f5a623] via-[#f8b84b] to-[#1a5c3a] p-7 text-white shadow-2xl shadow-[#f5a623]/20">
        <p className="text-[11px] font-black uppercase tracking-[0.3em] text-white/75">
          India's Solar Revolution is Here
        </p>
        <h3 className="mt-3 text-4xl font-black tracking-[-0.03em]">
          Lower bills, cleaner energy, stronger property value.
        </h3>
        <p className="mt-4 max-w-[620px] text-sm leading-7 text-white/80">
          Rooftop solar gives Indian homes and businesses a direct path to
          long-term electricity savings, lower grid exposure, and measurable
          environmental impact from day one.
        </p>
      </div>

      <div className="mt-7 grid grid-cols-3 gap-5">
        <BenefitCard icon={Zap} title="Zero Electricity Bills" body="Offset a major part of monthly consumption through captive rooftop generation." />
        <BenefitCard icon={FileCheck2} title="Government Subsidies" body="Eligible systems can benefit from subsidy support and guided documentation." />
        <BenefitCard icon={Home} title="Property Value Boost" body="A commissioned solar asset improves the long-term utility value of the property." />
        <BenefitCard icon={Leaf} title="Clean Green Energy" body="Produce renewable power on site and reduce dependency on fossil-fuel electricity." />
        <BenefitCard icon={Wrench} title="Low Maintenance" body="Modern PV systems need minimal maintenance with periodic cleaning and inspection." />
        <BenefitCard icon={BatteryCharging} title="Energy Independence" body="Reduce grid exposure and protect against future electricity tariff escalation." />
      </div>

      <div className="mt-7 rounded-[28px] bg-[#0f271c] p-6 text-white">
        <p className="mb-5 text-[11px] font-black uppercase tracking-[0.28em] text-[#f5a623]">
          Environmental Impact
        </p>
        <div className="grid grid-cols-4 gap-4">
          {[
            ["Trees Saved / Year", "280+", Trees],
            ["CO2 Offset / Year", "6.1 Tonnes", Factory],
            ["Water Saved", "1.2 Lakh L", CloudSun],
            ["CO2 Offset over 25 Years", "152 Tonnes", Leaf],
          ].map(([label, value, Icon]) => (
            <div key={label} className="rounded-2xl border border-white/10 bg-white/10 p-4">
              <Icon className="text-[#f5a623]" size={24} />
              <p className="mt-4 text-2xl font-black">{value}</p>
              <p className="mt-2 text-[10px] font-black uppercase tracking-[0.18em] text-white/50">{label}</p>
            </div>
          ))}
        </div>
      </div>
    </PageBody>
  </Page>
);

const InstallationWarrantyPage = ({ data }) => {
  const steps = [
    "Site Survey & Engineering Assessment",
    "DISCOM Application",
    "Material Procurement",
    "Mounting Structure Installation",
    "Panel, Inverter & Electrical Installation",
    "Net Metering",
  ];

  return (
    <Page data={data} number={7}>
      <PageBody compact>
        <SectionHeader
          number="06"
          title="Installation Process"
          subtitle="A controlled project workflow from survey to net-metering handover."
        />

        <div className="rounded-[28px] border border-slate-100 bg-white p-5 shadow-lg shadow-slate-900/5">
          <div className="relative">
            <div className="absolute bottom-8 left-5 top-8 w-px bg-slate-200" />
            <div className="space-y-4">
              {steps.map((step, index) => (
                <div key={step} className="relative flex items-center gap-4">
                  <div className={`relative z-10 grid h-10 w-10 place-items-center rounded-full font-black text-white ${index % 2 === 0 ? "bg-[#1a5c3a]" : "bg-[#f5a623]"}`}>
                    {index + 1}
                  </div>
                  <div className="flex-1 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                    <p className="text-sm font-black text-slate-950">{step}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {index === 0
                        ? "Measurements, shadow study, electrical assessment, and layout confirmation."
                        : "Handled by the project team with document tracking and customer updates."}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-7">
          <SectionHeader
            number="07"
            title="Warranty & After-Sales Support"
            subtitle="Structured warranty coverage with post-installation service support."
          />
          <div className="overflow-hidden rounded-[26px] border border-slate-100 bg-white shadow-lg shadow-slate-900/5">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#0f271c] text-white">
                <tr>
                  {["Component", "Brand", "Product Warranty", "Performance Guarantee"].map((header) => (
                    <th key={header} className="px-5 py-4 text-xs font-black uppercase tracking-[0.18em]">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  ["Solar Modules", data.panel_brand, "12 Years", "25 Years linear output"],
                  ["Inverter", data.inverter_brand, "10 Years", "As per OEM policy"],
                  ["Mounting Structure", data.mounting_brand, "10 Years", "Corrosion-resistant HDG finish"],
                  ["BOS & Electricals", data.cable_brand, "2 Years", "Safe operation and protection"],
                  ["Workmanship", data.company_name, "5 Years", "Installation service support"],
                ].map((row) => (
                  <tr key={row[0]} className="border-t border-slate-100">
                    <td className="px-5 py-4 font-black text-slate-950">{row[0]}</td>
                    <td className="px-5 py-4 text-slate-600">{row[1]}</td>
                    <td className="px-5 py-4">
                      <span className="rounded-full bg-[#1a5c3a]/10 px-3 py-1 text-xs font-black text-[#1a5c3a]">
                        {row[2]}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-slate-600">{row[3]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </PageBody>
    </Page>
  );
};

const TermsPage = ({ data }) => {
  const validUntil = formatDate(addDays(data.quote_date, data.valid_days));
  const paymentTerms = [
    ["20%", "With Purchase Order", "Advance booking and project initiation"],
    ["60%", "Before Material Dispatch", "Against invoice before dispatch"],
    ["10%", "After Installation", "After rooftop installation completion"],
    ["10%", "After Commissioning", "After testing, net meter, and handover"],
  ];

  return (
    <Page data={data} number={8}>
      <PageBody compact>
        <SectionHeader
          number="08"
          title="Terms & Conditions"
          subtitle="Commercial terms, project scope, and sign-off."
        />

        <div className="overflow-hidden rounded-[26px] border border-slate-100 bg-white shadow-lg shadow-slate-900/5">
          <div className="bg-[#1a5c3a] px-5 py-4 text-xs font-black uppercase tracking-[0.22em] text-white">
            Payment Terms
          </div>
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                {["Milestone", "Stage", "Description"].map((header) => (
                  <th key={header} className="px-5 py-3 text-xs font-black uppercase tracking-[0.18em]">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paymentTerms.map(([percent, stage, note]) => (
                <tr key={stage} className="border-t border-slate-100">
                  <td className="px-5 py-4">
                    <span className="rounded-full bg-[#f5a623]/15 px-3 py-1 text-xs font-black text-[#9a6408]">
                      {percent}
                    </span>
                  </td>
                  <td className="px-5 py-4 font-black text-slate-950">{stage}</td>
                  <td className="px-5 py-4 text-slate-600">{note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4">
          {[
            ["Quotation Validity", `This quotation is valid for ${data.valid_days} days from ${formatDate(data.quote_date)} and expires on ${validUntil}.`],
            ["Installation & Scope", "Scope includes standard rooftop installation, electrical integration, testing, commissioning, and handover documentation."],
            ["Performance & Liability", "Generation values are estimated using available site assumptions. Final output depends on weather, shading, grid availability, and maintenance."],
            ["Cancellation Policy", "Orders cancelled after material procurement may attract deductions for logistics, documentation, and committed vendor costs."],
          ].map(([title, body]) => (
            <div key={title} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
              <div className="border-l-4 border-[#f5a623] pl-4">
                <h3 className="text-sm font-black text-slate-950">{title}</h3>
                <p className="mt-2 text-xs leading-5 text-slate-500">{body}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-7 grid grid-cols-2 gap-5">
          {[
            ["Customer Acceptance", data.customer_name, Signature],
            ["Company Authorization", data.company_name, Award],
          ].map(([title, name, Icon]) => (
            <div key={title} className="rounded-[24px] border border-slate-100 bg-white p-5 shadow-sm">
              <div className="mb-10 flex items-center gap-3">
                <Icon className="text-[#1a5c3a]" size={22} />
                <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-500">
                  {title}
                </p>
              </div>
              <div className="border-t border-slate-800 pt-3">
                <p className="text-sm font-black text-slate-950">{name}</p>
                <p className="mt-1 text-xs text-slate-500">Name, Signature, and Date</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 rounded-[26px] bg-[#0f271c] p-5 text-white">
          <div className="grid grid-cols-[1.1fr_0.9fr_1fr] gap-5">
            <div>
              <ProposalLogo data={data} invert />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/50">Contact</p>
              <p className="mt-2 text-sm font-bold">{data.company_phone}</p>
              <p className="text-sm font-bold">{data.company_email}</p>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/50">Reference</p>
              <p className="mt-2 text-sm font-bold">{data.quote_ref}</p>
              <p className="text-xs text-white/60">Validity: {formatDate(data.quote_date)} to {validUntil}</p>
            </div>
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-[#f5a623]/30 bg-[#fff7e8] px-6 py-4 text-center">
          <p className="text-sm font-bold italic text-slate-700">
            "Thank you for choosing clean energy. Together, let us build a sustainable future one rooftop at a time."
          </p>
        </div>
      </PageBody>
    </Page>
  );
};

const SolarEnergyProposalTemplate = ({ data = solarProposalData }) => {
  const pages = [
    CoverPage,
    ProjectOverviewPage,
    RooftopLayoutPage,
    TechnicalSpecsPage,
    FinancialAnalysisPage,
    WhySolarPage,
    InstallationWarrantyPage,
    TermsPage,
  ];

  return (
    <div className="solar-proposal-shell min-h-screen bg-slate-100 px-4 py-8 font-['Inter',Arial,sans-serif] text-slate-950">
      <style>
        {`
          .solar-proposal-page {
            page-break-after: always;
            break-after: page;
          }

          .solar-proposal-page:last-child {
            page-break-after: auto;
            break-after: auto;
          }

          @page {
            size: A4;
            margin: 0;
          }

          @media print {
            html,
            body,
            #root {
              background: #ffffff !important;
              margin: 0 !important;
              padding: 0 !important;
            }

            .solar-proposal-shell {
              background: #ffffff !important;
              padding: 0 !important;
            }

            .solar-proposal-page {
              width: ${PAGE_WIDTH}px !important;
              min-height: ${PAGE_HEIGHT}px !important;
              margin: 0 auto !important;
              border: 0 !important;
              border-radius: 0 !important;
              box-shadow: none !important;
            }
          }
        `}
      </style>

      <div className="mx-auto mb-6 flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm" style={{ width: PAGE_WIDTH }}>
        <div>
          <p className="text-xs font-black uppercase tracking-[0.28em] text-[#1a5c3a]">
            Print-Ready Proposal Template
          </p>
          <h1 className="mt-1 text-xl font-black text-slate-950">
            8-Page Solar Energy Proposal
          </h1>
        </div>
        <div className="flex items-center gap-2 text-sm font-bold text-slate-500">
          <ClipboardCheck className="text-[#f5a623]" size={19} />
          A4: {PAGE_WIDTH}px x {PAGE_HEIGHT}px
        </div>
      </div>

      <div className="space-y-8">
        {pages.map((PageComponent, index) => (
          <PageComponent key={index} data={data} />
        ))}
      </div>
    </div>
  );
};

export default SolarEnergyProposalTemplate;
