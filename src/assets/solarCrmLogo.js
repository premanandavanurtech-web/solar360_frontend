const publicBase = (process.env.PUBLIC_URL || "").replace(/\/$/, "");
const logoPath = `${publicBase}/solar-crm-logo-clean.png?v=20260528`;

export const solarCrmLogoUri = logoPath;

export const solarCrmLogoFallbackUri = logoPath;
