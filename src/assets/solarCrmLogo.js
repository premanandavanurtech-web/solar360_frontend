const publicBase = (process.env.PUBLIC_URL || "").replace(/\/$/, "");
const logoPath = `${publicBase}/solar360-logo-clean.png?v=20260528`;

export const solar360LogoUri = logoPath;
export const solar360LogoFallbackUri = logoPath;

export const solarCrmLogoUri = logoPath;
export const solarCrmLogoFallbackUri = logoPath;
