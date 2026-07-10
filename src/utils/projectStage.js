const isDocumentVerified = (status) =>
  ["submitted", "approved", "completed", "verified"].includes(String(status || "").toLowerCase());

export const getProjectStage = (project = {}) => {
  const inst = String(project.installationStatus || "");
  const lead = String(project.status || "");
  const leadStatus = lead.toLowerCase();
  const visitStatus = String(project.visitStatus || "").toLowerCase();
  const registrationStatus = String(project.registrationStatus || "").toLowerCase();
  const bankPendingStatus = String(project.bankAtPendingStatus || "").toLowerCase();
  const disbursementStatus = String(project.disbursementStatus || "").toLowerCase();
  const loanStatus = String(project.loanStatus || "").toLowerCase();
  const installationInProgress = [
    "final_payment",
    "meter_charge",
    "jee_verified",
    "sent_for_jee_verification",
    "installation_progress",
    "load_Enhancement",
    "load_enhancement",
  ].includes(inst);

  if (inst === "installation_completed") return "handover";

  if (leadStatus === "installation completion") return "installation";
  if (leadStatus === "disbursement") return "disbursement";
  if (leadStatus === "bank at pending" || leadStatus === "loan pending") return "loan_pending";
  if (leadStatus === "bank loan apply") return "bank_loan";
  if (leadStatus === "document submission") return "document";
  if (leadStatus === "registration") return "registration";
  if (leadStatus === "visit") return "visit";
  if (leadStatus === "new") return "visit";

  if (disbursementStatus === "completed") return "disbursement";
  if (bankPendingStatus && bankPendingStatus !== "pending") return "loan_pending";
  if (loanStatus === "submitted" || loanStatus === "approved") return "bank_loan";
  if (isDocumentVerified(project.documentStatus)) return "document";
  if (registrationStatus && registrationStatus !== "pending") return "registration";
  if (visitStatus) return "visit";
  if (installationInProgress) return "installation";
  return "visit";
};
