import { isValid, parseISO, startOfDay } from "date-fns";

const DAY_MS = 24 * 60 * 60 * 1000;

const parseVisitDate = (value) => {
  if (!value) return null;

  try {
    const parsed = typeof value === "string" ? parseISO(value) : new Date(value);
    return isValid(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

const getSurveyRecord = (value) => {
  if (value?.siteSurvey && typeof value.siteSurvey === "object") {
    return value.siteSurvey;
  }

  if (!value || typeof value !== "object") return null;

  const looksLikeSurvey =
    "savedAt" in value ||
    "summary" in value ||
    "locationName" in value ||
    "latitude" in value ||
    "longitude" in value ||
    "photos" in value ||
    "general" in value ||
    "remarks" in value ||
    "status" in value;

  return looksLikeSurvey ? value : null;
};

export const hasVisitSiteSurvey = (value) => {
  const survey = getSurveyRecord(value);

  return Boolean(
    survey &&
      (
        survey.savedAt ||
        survey.summary ||
        survey.locationName ||
        survey.latitude !== undefined ||
        survey.longitude !== undefined ||
        survey.remarks ||
        String(survey.status || "").toLowerCase() === "completed" ||
        (Array.isArray(survey.photos) && survey.photos.length) ||
        (survey.general && typeof survey.general === "object" && Object.keys(survey.general).length)
      )
  );
};

export const resolveVisitStatus = (visit) => {
  const rawStatus = String(visit?.visitStatus || visit?.status || "").trim();
  const normalizedStatus = rawStatus.toLowerCase();
  const scheduledDate = parseVisitDate(visit?.visitDate || visit?.scheduledAt);
  const hasSiteSurvey = hasVisitSiteSurvey(visit);
  if (normalizedStatus === "approved") return "Approved";
  if (hasSiteSurvey || normalizedStatus === "completed") return "Completed";
  if (normalizedStatus === "cancelled") return "Cancelled";
  if (normalizedStatus === "follow up") return "Follow Up";
  if (scheduledDate || normalizedStatus === "scheduled") return "Scheduled";
  if (["visit", "site visit", "new", "project converted", "project_converted"].includes(normalizedStatus)) {
    return "Not Assigned";
  }
  if (normalizedStatus === "pending" || normalizedStatus === "not assigned" || !normalizedStatus) {
    return "Pending";
  }

  return rawStatus || "Pending";
};

export const hasTrackedVisitRecord = (visit) => {
  const normalizedStatus = String(visit?.visitStatus || visit?.status || "").trim().toLowerCase();
  const hasActionableStatus = ["scheduled", "completed", "approved", "cancelled", "follow up"].includes(normalizedStatus);
  const scheduledDate = parseVisitDate(visit?.visitDate || visit?.scheduledAt);

  return Boolean(scheduledDate || hasVisitSiteSurvey(visit) || hasActionableStatus);
};

export const buildVisitStatusInfo = (visit, now = new Date()) => {
  const status = resolveVisitStatus(visit);
  const scheduledDate = parseVisitDate(visit?.visitDate || visit?.scheduledAt);

  if (status !== "Scheduled" || !scheduledDate) {
    return {
      status,
      helperText: status === "Pending" ? "Date and time not set" : "",
      isOverdue: false,
      scheduledDate,
    };
  }

  if (scheduledDate.getTime() < now.getTime()) {
    const overdueDays = Math.round(
      (startOfDay(now).getTime() - startOfDay(scheduledDate).getTime()) / DAY_MS,
    );

    return {
      status,
      helperText: overdueDays <= 0
        ? "Delayed today"
        : `Delayed by ${overdueDays} day${overdueDays === 1 ? "" : "s"}`,
      isOverdue: true,
      scheduledDate,
    };
  }

  const remainingDays = Math.round(
    (startOfDay(scheduledDate).getTime() - startOfDay(now).getTime()) / DAY_MS,
  );

  return {
    status,
    helperText:
      remainingDays <= 0
        ? "Today"
        : `${remainingDays} day${remainingDays === 1 ? "" : "s"} left`,
    isOverdue: false,
    scheduledDate,
  };
};

export const decorateVisitForDisplay = (visit, now = new Date()) => {
  const visitStatusInfo = buildVisitStatusInfo(visit, now);

  return {
    ...visit,
    visitStatus: visitStatusInfo.status,
    visitStatusInfo,
  };
};
