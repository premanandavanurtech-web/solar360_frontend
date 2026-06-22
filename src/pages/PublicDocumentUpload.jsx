import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  IconButton,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import {
  CheckCircle,
  CloudUploadOutlined,
  DescriptionOutlined,
  InsertDriveFileOutlined,
  OpenInNew,
} from "@mui/icons-material";
import { buildApiUrl } from "../utils/apiConfig";

const DOCUMENT_FIELDS = [
  { key: "aadhaar", label: "Aadhaar Card" },
  { key: "panCard", label: "PAN Card" },
  { key: "passbook", label: "Bank Statement / Passbook" },
  { key: "otherDocuments", label: "Other Documents", multiple: true },
];

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "application/pdf"];
const IMAGE_FILE_REGEX = /\.(jpg|jpeg|png|gif|bmp|webp)(\?.*)?$/i;

const getFileNameFromUrl = (url) => {
  if (!url) return "";
  try {
    return decodeURIComponent(url.split("?")[0].split("/").pop() || "");
  } catch {
    return url.split("?")[0].split("/").pop() || "";
  }
};

export default function PublicDocumentUpload() {
  const { token } = useParams();
  const [files, setFiles] = useState({});
  const [existingDocuments, setExistingDocuments] = useState({});
  const [loadingExisting, setLoadingExisting] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);

  const selectedCount = useMemo(
    () => Object.values(files).reduce((total, value) => total + (Array.isArray(value) ? value.length : value ? 1 : 0), 0),
    [files],
  );

  const loadExistingDocuments = useCallback(async () => {
    try {
      setLoadingExisting(true);
      const response = await fetch(buildApiUrl(`/lead/public-upload/${token}/documents`));
      const data = await response.json();

      if (!response.ok || !data?.success) {
        throw new Error(data?.message || "Could not load existing documents");
      }

      setExistingDocuments(data.result?.documents || {});
    } catch (error) {
      setMessage({ severity: "error", text: error.message || "Could not load existing documents" });
    } finally {
      setLoadingExisting(false);
    }
  }, [token]);

  useEffect(() => {
    loadExistingDocuments();
  }, [loadExistingDocuments]);

  const validateFiles = (nextFiles) => {
    for (const file of nextFiles) {
      if (file.size > MAX_FILE_SIZE) return "Each file must be 5MB or less.";
      if (!ALLOWED_TYPES.includes(file.type)) return "Only JPG, PNG and PDF files are allowed.";
    }
    return "";
  };

  const handleFileChange = (field, event) => {
    const selectedFiles = Array.from(event.target.files || []);
    event.target.value = "";
    if (!selectedFiles.length) return;

    const error = validateFiles(selectedFiles);
    if (error) {
      setMessage({ severity: "error", text: error });
      return;
    }

    setMessage(null);
    setFiles((prev) => ({
      ...prev,
      [field.key]: field.multiple ? selectedFiles : selectedFiles[0],
    }));
  };

  const handleSubmit = async () => {
    if (!selectedCount) {
      setMessage({ severity: "error", text: "Please select at least one document." });
      return;
    }

    const formData = new FormData();
    formData.append("data", JSON.stringify({ documentStatus: "pending" }));

    DOCUMENT_FIELDS.forEach((field) => {
      const value = files[field.key];
      if (!value) return;
      if (Array.isArray(value)) {
        value.forEach((file) => formData.append(field.key, file));
      } else {
        formData.append(field.key, value);
      }
    });

    try {
      setSubmitting(true);
      setMessage(null);
      const response = await fetch(buildApiUrl(`/lead/public-upload/${token}/upload-documents`), {
        method: "PUT",
        body: formData,
      });
      const data = await response.json();

      if (!response.ok || !data?.success) {
        throw new Error(data?.message || "Upload failed");
      }

      setFiles({});
      setMessage({ severity: "success", text: "Documents uploaded successfully." });
      await loadExistingDocuments();
    } catch (error) {
      setMessage({ severity: "error", text: error.message || "Upload failed" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#f6f8fb", py: { xs: 3, md: 6 } }}>
      <Container maxWidth="md">
        <Paper elevation={0} sx={{ border: "1px solid #e5eaf2", borderRadius: 3, overflow: "hidden", bgcolor: "#fff" }}>
          <Box sx={{ p: { xs: 2.5, md: 3 }, borderBottom: "1px solid #e5eaf2" }}>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Box sx={{ width: 42, height: 42, borderRadius: 2, bgcolor: "#eef5ff", display: "grid", placeItems: "center" }}>
                <DescriptionOutlined sx={{ color: "#2458b8" }} />
              </Box>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 800, color: "#10213f" }}>
                  Upload Documents
                </Typography>
                <Typography variant="body2" sx={{ color: "#667085" }}>
                  Select image or PDF files and submit them securely.
                </Typography>
              </Box>
            </Stack>
          </Box>

          <Stack spacing={2} sx={{ p: { xs: 2.5, md: 3 } }}>
            {message && <Alert severity={message.severity}>{message.text}</Alert>}
            {loadingExisting && (
              <Stack direction="row" spacing={1} alignItems="center" sx={{ color: "#667085" }}>
                <CircularProgress size={16} />
                <Typography variant="caption">Loading uploaded documents...</Typography>
              </Stack>
            )}

            {DOCUMENT_FIELDS.map((field) => {
              const value = files[field.key];
              const fileNames = Array.isArray(value) ? value.map((file) => file.name) : value ? [value.name] : [];
              const uploadedDocs = existingDocuments[field.key] || [];
              const hasUploadedDocs = uploadedDocs.length > 0;

              return (
                <Paper key={field.key} elevation={0} sx={{ p: 1.5, border: "1px solid #e5eaf2", borderRadius: 2 }}>
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25} alignItems={{ xs: "stretch", sm: "center" }} justifyContent="space-between">
                    <Stack direction="row" spacing={1.25} alignItems="center" sx={{ minWidth: 0 }}>
                      <Box sx={{ width: 36, height: 36, borderRadius: 1.5, bgcolor: "#f7f9fc", display: "grid", placeItems: "center", flexShrink: 0 }}>
                        {fileNames.length || hasUploadedDocs ? <CheckCircle sx={{ color: "#16a34a", fontSize: 20 }} /> : <InsertDriveFileOutlined sx={{ color: "#667085", fontSize: 20 }} />}
                      </Box>
                      <Box sx={{ minWidth: 0 }}>
                        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                          <Typography variant="body2" sx={{ fontWeight: 800, color: "#10213f" }}>
                            {field.label}
                          </Typography>
                          {hasUploadedDocs && (
                            <Chip size="small" label="Already uploaded" sx={{ height: 20, bgcolor: "#dcfce7", color: "#15803d", fontSize: "0.68rem", fontWeight: 700 }} />
                          )}
                        </Stack>
                        <Typography variant="caption" sx={{ color: "#667085", display: "block" }} noWrap>
                          {fileNames.length
                            ? fileNames.join(", ")
                            : hasUploadedDocs
                              ? uploadedDocs.map((doc) => doc.name || getFileNameFromUrl(doc.url)).join(", ")
                              : "JPG, PNG or PDF up to 5MB"}
                        </Typography>
                      </Box>
                    </Stack>

                    <Button component="label" size="small" variant="outlined" startIcon={<CloudUploadOutlined />} sx={{ borderRadius: 2, fontWeight: 700 }}>
                      {hasUploadedDocs ? "Replace" : "Select"}
                      <input hidden type="file" multiple={field.multiple} accept=".jpg,.jpeg,.png,.pdf" onChange={(event) => handleFileChange(field, event)} />
                    </Button>
                  </Stack>
                  {hasUploadedDocs && (
                    <Stack direction="row" spacing={1} sx={{ mt: 1.25, overflowX: "auto", pb: 0.25 }}>
                      {uploadedDocs.map((doc) => {
                        const isImage = IMAGE_FILE_REGEX.test(doc.url || "");
                        return (
                          <Paper
                            key={`${field.key}-${doc.url}`}
                            elevation={0}
                            sx={{
                              width: 96,
                              flex: "0 0 auto",
                              border: "1px solid #e5eaf2",
                              borderRadius: 1.5,
                              overflow: "hidden",
                              bgcolor: "#f8fafc",
                            }}
                          >
                            <Box
                              sx={{
                                height: 62,
                                bgcolor: "#eef2f7",
                                display: "grid",
                                placeItems: "center",
                                backgroundImage: isImage ? `url(${doc.url})` : "none",
                                backgroundSize: "cover",
                                backgroundPosition: "center",
                              }}
                            >
                              {!isImage && <InsertDriveFileOutlined sx={{ color: "#667085", fontSize: 24 }} />}
                            </Box>
                            <Stack direction="row" spacing={0.5} alignItems="center" sx={{ px: 0.75, py: 0.5 }}>
                              <Typography variant="caption" noWrap sx={{ flex: 1, minWidth: 0, color: "#475467", fontSize: "0.68rem" }}>
                                {doc.name || getFileNameFromUrl(doc.url)}
                              </Typography>
                              <IconButton size="small" onClick={() => window.open(doc.url, "_blank", "noopener,noreferrer")} sx={{ width: 22, height: 22 }}>
                                <OpenInNew sx={{ fontSize: 13 }} />
                              </IconButton>
                            </Stack>
                          </Paper>
                        );
                      })}
                    </Stack>
                  )}
                </Paper>
              );
            })}

            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25} alignItems={{ xs: "stretch", sm: "center" }} justifyContent="space-between">
              <Chip label={`${selectedCount} file${selectedCount === 1 ? "" : "s"} selected`} sx={{ alignSelf: { xs: "flex-start", sm: "center" }, bgcolor: "#eef5ff", color: "#2458b8", fontWeight: 700 }} />
              <Button variant="contained" disabled={submitting} onClick={handleSubmit} sx={{ minWidth: 150, borderRadius: 2, py: 1 }}>
                {submitting ? <CircularProgress size={20} color="inherit" /> : "Upload"}
              </Button>
            </Stack>
          </Stack>
        </Paper>
      </Container>
    </Box>
  );
}
