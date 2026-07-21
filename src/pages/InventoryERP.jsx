import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  Collapse,
  Divider,
  Grid,
  IconButton,
  InputAdornment,
  MenuItem,
  Menu,
  Paper,
  Snackbar,
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
  alpha,
} from "@mui/material";
import {
  Add,
  ArrowBack,
  Check,
  DeleteOutline,
  EditOutlined,
  ErrorOutline,
  ExpandLess,
  ExpandMore,
  FilterAltOutlined,
  GridView,
  ImageOutlined,
  Inventory2,
  ListAlt,
  MoreVert,
  Refresh,
  Search,
  Straighten,
  TrendingUp,
  UploadFileOutlined,
  VisibilityOutlined,
} from "@mui/icons-material";
import { useLocation, useNavigate } from "react-router-dom";
import axiosInstance from "../utils/axiosConfig";
import { toBackendAssetUrl } from "../utils/backendAssetUrl";

const BLUE = "#2563eb";
const INDIGO = "#4f46e5";
const SUCCESS = "#16a34a";
const WARNING = "#d97706";
const DANGER = "#dc2626";
const TEXT = "#020617";
const MUTED = "#64748b";

const emptyCategory = {
  _id: "",
  category: "",
  description: "",
  subcategories: "",
  isActive: true,
};

const emptyItem = {
  _id: "",
  itemName: "",
  sku: "",
  category: "",
  subcategory: "",
  hsnSacCode: "",
  unit: "pcs",
  description: "",
  pricing: { purchaseCost: 0, sellingPrice: 0, taxPercent: 0, igst: 0, cgst: 0, sgst: 0 },
  tracking: { expiryDate: "" },
  dimensions: { length: "", width: "", height: "", unit: "cm" },
  weight: { value: "", unit: "kg" },
  purchaseInfo: { vendorName: "" },
  warehouseStock: [],
  image: null,
  reorderLevel: 10,
  openingStock: "",
  openingWarehouse: "",
  maxStockLevel: "",
};

const formatCurrency = (value) =>
  Number(value || 0).toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  });

const getResult = (response, fallback) => response?.data?.result ?? fallback;

const getAvailableStock = (item) =>
  item.availableStock ?? (item.warehouseStock || []).reduce((sum, row) => sum + (Number(row.availableQty) || 0), 0);

const softCard = {
  borderRadius: 2,
  border: "1px solid #e5e7eb",
  boxShadow: "0 8px 18px rgba(15,23,42,0.08)",
};

const inputSx = {
  "& .MuiOutlinedInput-root": {
    borderRadius: 1.5,
    minHeight: 45,
    bgcolor: "#fff",
    boxShadow: "0 1px 2px rgba(15,23,42,0.04)",
  },
  "& .MuiInputLabel-root": {
    color: "#8a94a6",
    fontWeight: 800,
    fontSize: 12,
    textTransform: "uppercase",
  },
};

const StatCard = ({ icon, label, value, color = BLUE }) => (
  <Card sx={softCard}>
    <CardContent sx={{ p: 2.5 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
        <Box>
          <Typography color="text.secondary" fontWeight={700}>
            {label}
          </Typography>
          <Typography variant="h5" fontWeight={900} color={TEXT} sx={{ mt: 0.4 }}>
            {value}
          </Typography>
        </Box>
        <Box sx={{ width: 46, height: 46, borderRadius: 3, display: "grid", placeItems: "center", bgcolor: alpha(color, 0.14), color }}>
          {icon}
        </Box>
      </Stack>
    </CardContent>
  </Card>
);

const PageIcon = ({ icon = <Inventory2 />, color = INDIGO }) => (
  <Box
    sx={{
      width: 50,
      height: 50,
      borderRadius: 2,
      display: "grid",
      placeItems: "center",
      bgcolor: color,
      color: "#fff",
      boxShadow: "0 10px 22px rgba(79,70,229,0.22)",
    }}
  >
    {icon}
  </Box>
);

const Field = ({ label, value, onChange, children, ...props }) => (
  <TextField
    label={label}
    value={value ?? ""}
    onChange={(event) => onChange(event.target.value)}
    fullWidth
    size="small"
    sx={{ ...inputSx, ...props.sx }}
    {...props}
  >
    {children}
  </TextField>
);

const SectionCard = ({ icon, title, color, required, defaultOpen = true, children }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Card sx={{ ...softCard, boxShadow: "none" }}>
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ px: 2.5, py: 2, cursor: "pointer" }}
        onClick={() => setOpen((prev) => !prev)}
      >
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <Box sx={{ width: 34, height: 34, borderRadius: 2, display: "grid", placeItems: "center", bgcolor: alpha(color, 0.1), color }}>
            {icon}
          </Box>
          <Typography fontWeight={900} color={TEXT}>
            {title}
          </Typography>
        </Stack>
        <Stack direction="row" alignItems="center" spacing={1}>
          {required && <Chip size="small" label="REQUIRED" sx={{ bgcolor: alpha(BLUE, 0.08), color: BLUE, fontWeight: 800 }} />}
          {open ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
        </Stack>
      </Stack>
      <Collapse in={open}>
        <Divider />
        <Box sx={{ p: 2.5 }}>{children}</Box>
      </Collapse>
    </Card>
  );
};

function InventoryERP() {
  const location = useLocation();
  const navigate = useNavigate();
  const sectionFromPath = location.pathname.split("/")[2] || "category";
  const [mode, setMode] = useState(sectionFromPath === "items" ? "items" : "categories");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [categorySearch, setCategorySearch] = useState("");
  const [itemFilter, setItemFilter] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 1 });
  const [warehouses, setWarehouses] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [summary, setSummary] = useState({});
  const [categoryForm, setCategoryForm] = useState(emptyCategory);
  const [itemForm, setItemForm] = useState(emptyItem);
  const [categoryMenuAnchor, setCategoryMenuAnchor] = useState(null);
  const [categoryMenuRow, setCategoryMenuRow] = useState(null);
  const [selectedCategoryForSub, setSelectedCategoryForSub] = useState(null);
  const [subcategorySearch, setSubcategorySearch] = useState("");
  const [toast, setToast] = useState({ open: false, message: "", severity: "success" });

  const showToast = useCallback((message, severity = "success") => {
    setToast({ open: true, message, severity });
  }, []);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [dashboardRes, categoriesRes, itemsRes, warehousesRes, vendorsRes] = await Promise.all([
        axiosInstance.get("/inventory/dashboard"),
        axiosInstance.get("/inventory/categories"),
        axiosInstance.get("/inventory/items", {
          params: {
            limit: pageSize,
            page,
            search: search || undefined,
            category: itemFilter && !["low", "out"].includes(itemFilter) ? itemFilter : undefined,
          },
        }),
        axiosInstance.get("/inventory/warehouses"),
        axiosInstance.get("/inventory/vendors"),
      ]);
      setSummary(getResult(dashboardRes, {})?.summary || {});
      setCategories(getResult(categoriesRes, []));
      const itemResult = getResult(itemsRes, { items: [], pagination: {} });
      setItems(itemResult.items || []);
      setPagination(itemResult.pagination || { page, limit: pageSize, total: itemResult.items?.length || 0, pages: 1 });
      setWarehouses(getResult(warehousesRes, []));
      setVendors(getResult(vendorsRes, []));
    } catch (error) {
      showToast(error?.response?.data?.message || "Failed to load inventory data", "error");
    } finally {
      setLoading(false);
    }
  }, [itemFilter, page, pageSize, search, showToast]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  useEffect(() => {
    setMode(sectionFromPath === "items" ? "items" : "categories");
  }, [sectionFromPath]);

  const setScreen = (nextMode) => {
    setMode(nextMode);
    if (nextMode === "categories") navigate("/inventory/category");
    if (nextMode === "items") navigate("/inventory/items");
  };

  const startCreateCategory = () => {
    setCategoryForm(emptyCategory);
    setMode("create-category");
  };

  const startEditCategory = (entry) => {
    setCategoryMenuAnchor(null);
    setCategoryForm({
      _id: entry._id,
      category: entry.category || "",
      description: entry.description || "",
      subcategories: (entry.subcategories || []).join(", "),
      isActive: entry.isActive !== false,
    });
    setMode("create-category");
  };

  const openCategoryMenu = (event, entry) => {
    setCategoryMenuAnchor(event.currentTarget);
    setCategoryMenuRow(entry);
  };

  const closeCategoryMenu = () => {
    setCategoryMenuAnchor(null);
    setCategoryMenuRow(null);
  };

  const viewSubcategories = (entry) => {
    closeCategoryMenu();
    setSelectedCategoryForSub(entry);
    setSubcategorySearch("");
    setMode("subcategories");
  };

  const selectedCategory = useMemo(
    () => categories.find((entry) => entry.category === itemForm.category),
    [categories, itemForm.category],
  );

  const categoryRows = useMemo(
    () =>
      categories
        .map((entry) => ({
          ...entry,
          itemCount: items.filter((item) => item.category === entry.category).length,
          subcategoryCount: entry.subcategories?.length || 0,
        }))
        .filter((entry) => {
          const haystack = `${entry.category} ${entry.description || ""}`.toLowerCase();
          return !categorySearch || haystack.includes(categorySearch.toLowerCase());
        }),
    [categories, categorySearch, items],
  );

  const updateItem = (path, value) => {
    setItemForm((prev) => {
      const next = { ...prev };
      const keys = path.split(".");
      let cursor = next;
      keys.slice(0, -1).forEach((key) => {
        cursor[key] = { ...(cursor[key] || {}) };
        cursor = cursor[key];
      });
      cursor[keys[keys.length - 1]] = value;
      return next;
    });
  };

  const saveCategory = async () => {
    setSaving(true);
    try {
      const payload = {
        ...categoryForm,
        subcategories: categoryForm.subcategories
          .split(",")
          .map((entry) => entry.trim())
          .filter(Boolean),
      };
      if (categoryForm._id) {
        await axiosInstance.put(`/inventory/categories/${categoryForm._id}`, payload);
      } else {
        await axiosInstance.post("/inventory/categories", payload);
      }
      setCategoryForm(emptyCategory);
      setScreen("categories");
      showToast(categoryForm._id ? "Category updated" : "Category created");
      fetchAll();
    } catch (error) {
      showToast(error?.response?.data?.message || "Failed to save category", "error");
    } finally {
      setSaving(false);
    }
  };

  const deleteCategory = async (entry) => {
    closeCategoryMenu();
    if (!window.confirm(`Delete category "${entry.category}"?`)) return;
    try {
      await axiosInstance.delete(`/inventory/categories/${entry._id}`);
      showToast("Category deleted");
      fetchAll();
    } catch (error) {
      showToast(error?.response?.data?.message || "Failed to delete category", "error");
    }
  };

  const updateCategorySubcategories = async (category, nextSubcategories) => {
    if (!category?._id) return;
    try {
      const response = await axiosInstance.put(`/inventory/categories/${category._id}`, {
        category: category.category,
        description: category.description || "",
        isActive: category.isActive !== false,
        subcategories: nextSubcategories,
      });
      const updated = getResult(response, { ...category, subcategories: nextSubcategories });
      setCategories((prev) => prev.map((entry) => entry._id === category._id ? updated : entry));
      setSelectedCategoryForSub(updated);
      showToast("Subcategories updated");
    } catch (error) {
      showToast(error?.response?.data?.message || "Failed to update subcategories", "error");
    }
  };

  const addSubcategory = () => {
    const name = window.prompt("Subcategory name");
    const value = String(name || "").trim();
    if (!value || !selectedCategoryForSub) return;
    const current = selectedCategoryForSub.subcategories || [];
    if (current.some((entry) => entry.toLowerCase() === value.toLowerCase())) {
      showToast("Subcategory already exists", "error");
      return;
    }
    updateCategorySubcategories(selectedCategoryForSub, [...current, value]);
  };

  const editSubcategory = (oldName) => {
    const name = window.prompt("Subcategory name", oldName);
    const value = String(name || "").trim();
    if (!value || !selectedCategoryForSub) return;
    const current = selectedCategoryForSub.subcategories || [];
    if (current.some((entry) => entry !== oldName && entry.toLowerCase() === value.toLowerCase())) {
      showToast("Subcategory already exists", "error");
      return;
    }
    updateCategorySubcategories(selectedCategoryForSub, current.map((entry) => entry === oldName ? value : entry));
  };

  const deleteSubcategory = (name) => {
    if (!selectedCategoryForSub || !window.confirm(`Delete subcategory "${name}"?`)) return;
    updateCategorySubcategories(selectedCategoryForSub, (selectedCategoryForSub.subcategories || []).filter((entry) => entry !== name));
  };

  const buildItemPayload = () => {
    const formData = new FormData();
    const append = (key, value) => {
      if (value !== undefined && value !== null && value !== "") formData.append(key, value);
    };
    append("itemName", itemForm.itemName);
    append("sku", itemForm.sku);
    append("category", itemForm.category);
    append("subcategory", itemForm.subcategory);
    append("hsnSacCode", itemForm.hsnSacCode);
    append("unit", itemForm.unit);
    append("description", itemForm.description);
    append("openingStock", itemForm.openingStock);
    append("openingWarehouse", itemForm.openingWarehouse);
    append("reorderLevel", itemForm.reorderLevel);
    append("maxStockLevel", itemForm.maxStockLevel);
    append("pricing", JSON.stringify(itemForm.pricing));
    append("tracking", JSON.stringify(itemForm.tracking));
    append("dimensions", JSON.stringify(itemForm.dimensions));
    append("weight", JSON.stringify(itemForm.weight));
    append("purchaseInfo", JSON.stringify(itemForm.purchaseInfo));
    if (itemForm.image) formData.append("image", itemForm.image);
    return formData;
  };

  const saveItem = async () => {
    if (!itemForm.itemName.trim() || !itemForm.sku.trim() || !itemForm.category) {
      showToast("Item name, SKU, and category are required", "error");
      return;
    }
    if (Number(itemForm.openingStock) > 0 && !itemForm.openingWarehouse) {
      showToast("Select a warehouse for opening stock", "error");
      return;
    }
    setSaving(true);
    try {
      if (itemForm._id) {
        await axiosInstance.put(`/inventory/items/${itemForm._id}`, buildItemPayload(), { headers: { "Content-Type": "multipart/form-data" } });
      } else {
        await axiosInstance.post("/inventory/items", buildItemPayload(), { headers: { "Content-Type": "multipart/form-data" } });
      }
      setItemForm(emptyItem);
      setScreen("items");
      showToast(itemForm._id ? "Inventory item updated" : "Inventory item created");
      fetchAll();
    } catch (error) {
      showToast(error?.response?.data?.message || "Failed to create item", "error");
    } finally {
      setSaving(false);
    }
  };

  const startEditItem = (item) => {
    const purchaseInfo = item.purchaseInfo || {};
    const vendorId = typeof purchaseInfo.vendor === "object" ? purchaseInfo.vendor?._id : purchaseInfo.vendor;
    setItemForm({
      ...emptyItem,
      ...item,
      pricing: { ...emptyItem.pricing, ...(item.pricing || {}) },
      tracking: {
        ...emptyItem.tracking,
        ...(item.tracking || {}),
        expiryDate: item.tracking?.expiryDate ? String(item.tracking.expiryDate).slice(0, 10) : "",
      },
      dimensions: { ...emptyItem.dimensions, ...(item.dimensions || {}) },
      weight: { ...emptyItem.weight, ...(item.weight || {}) },
      purchaseInfo: { ...emptyItem.purchaseInfo, ...purchaseInfo, vendor: vendorId || "", vendorName: purchaseInfo.vendorName || purchaseInfo.vendor?.name || "" },
      image: null,
      openingStock: "",
      openingWarehouse: "",
    });
    setMode("create-item");
  };

  const deleteItem = async (item) => {
    if (!window.confirm(`Delete item "${item.itemName}"?`)) return;
    try {
      await axiosInstance.delete(`/inventory/items/${item._id}`);
      showToast("Inventory item deleted");
      fetchAll();
    } catch (error) {
      showToast(error?.response?.data?.message || "Failed to delete item", "error");
    }
  };

  const visibleItems = useMemo(() => {
    if (itemFilter === "low") {
      return items.filter((item) => {
        const stock = getAvailableStock(item);
        return stock > 0 && stock <= Number(item.reorderLevel || 0);
      });
    }
    if (itemFilter === "out") return items.filter((item) => getAvailableStock(item) <= 0);
    return items;
  }, [itemFilter, items]);

  if (mode === "create-category") {
    return (
      <Box sx={{ p: { xs: 2, md: 5 }, bgcolor: "#fff", minHeight: "100vh" }}>
        <Button startIcon={<ArrowBack />} onClick={() => setScreen("categories")} sx={{ mb: 3, color: MUTED }}>
          Back to Categories
        </Button>
        <Stack direction="row" alignItems="center" spacing={1.6} sx={{ mb: 5 }}>
          <PageIcon icon={<Inventory2 />} />
          <Box>
            <Typography variant="h3" fontWeight={900} color="#000">
              {categoryForm._id ? "Edit Category" : "Create New Category"}
            </Typography>
            <Typography color={MUTED}>{categoryForm._id ? "Update category details and status" : "Add a new category to organize your inventory"}</Typography>
          </Box>
        </Stack>

        <Card sx={{ ...softCard, maxWidth: 780 }}>
          <CardContent sx={{ p: { xs: 2.5, md: 3.8 } }}>
            <Stack spacing={3}>
              <Field
                label="Category Name *"
                placeholder="Enter category name"
                value={categoryForm.category}
                onChange={(value) => setCategoryForm((prev) => ({ ...prev, category: value }))}
              />
              <Field
                label="Description"
                placeholder="Enter category description (optional)"
                multiline
                minRows={3}
                value={categoryForm.description}
                onChange={(value) => setCategoryForm((prev) => ({ ...prev, description: value }))}
              />
              <Field
                label="Subcategories"
                placeholder="Panels, Inverters, Batteries"
                value={categoryForm.subcategories}
                onChange={(value) => setCategoryForm((prev) => ({ ...prev, subcategories: value }))}
              />
              <Stack direction="row" alignItems="center" spacing={1}>
                <Checkbox
                  checked={categoryForm.isActive}
                  onChange={(event) => setCategoryForm((prev) => ({ ...prev, isActive: event.target.checked }))}
                  sx={{ color: BLUE, "&.Mui-checked": { color: BLUE } }}
                />
                <Typography fontWeight={900}>Active</Typography>
              </Stack>
              <Stack direction="row" spacing={1.5}>
                <Button variant="outlined" onClick={() => setScreen("categories")} sx={{ px: 2.5, borderColor: "#e5e7eb", color: "#000", fontWeight: 800 }}>
                  Cancel
                </Button>
                <Button startIcon={<Check />} variant="contained" onClick={saveCategory} disabled={saving} sx={{ px: 3, bgcolor: INDIGO, fontWeight: 900 }}>
                  {saving ? "Saving..." : categoryForm._id ? "Update Category" : "Create Category"}
                </Button>
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      </Box>
    );
  }

  if (mode === "create-item") {
    return (
      <Box sx={{ bgcolor: "#f8fafc", minHeight: "100vh" }}>
        <Paper square sx={{ px: { xs: 2, md: 4 }, py: 1.8, borderBottom: "1px solid #e5e7eb" }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
            <Stack direction="row" alignItems="center" spacing={1.5}>
              <IconButton onClick={() => setScreen("items")} sx={{ border: "1px solid #e5e7eb", borderRadius: 2 }}>
                <ArrowBack />
              </IconButton>
              <Box sx={{ width: 38, height: 38, borderRadius: 2, display: "grid", placeItems: "center", bgcolor: alpha(BLUE, 0.08), color: BLUE }}>
                <Inventory2 />
              </Box>
              <Box>
                <Typography fontWeight={900} color={TEXT}>
                  {itemForm._id ? "Edit item" : "Create item"}
                </Typography>
                <Typography variant="body2" color="#8a94a6">
                  Fill in item details, pricing, and tax settings
                </Typography>
              </Box>
            </Stack>
            <Stack direction="row" spacing={1}>
              <Button variant="outlined" onClick={() => setScreen("items")} sx={{ borderColor: "#e5e7eb", color: TEXT, fontWeight: 800 }}>
                Cancel
              </Button>
              <Button startIcon={<Check />} variant="contained" onClick={saveItem} disabled={saving} sx={{ bgcolor: BLUE, fontWeight: 900 }}>
                {saving ? "Saving..." : itemForm._id ? "Update item" : "Save item"}
              </Button>
            </Stack>
          </Stack>
        </Paper>

        <Box sx={{ maxWidth: 1220, mx: "auto", p: { xs: 2, md: 3.5 } }}>
          <Grid container spacing={2.5}>
            <Grid item xs={12} lg={8}>
              <Stack spacing={2}>
                <SectionCard icon={<Inventory2 />} title="Item details" color={BLUE} required>
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <Field label="Item Name *" placeholder="e.g. Apple iPhone 15" value={itemForm.itemName} onChange={(value) => updateItem("itemName", value)} />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Field label="SKU / Item Code" placeholder="e.g. APL-IPH15-BLK" value={itemForm.sku} onChange={(value) => updateItem("sku", value)} />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Field label="HSN / SAC Code" placeholder="e.g. 8471" value={itemForm.hsnSacCode} onChange={(value) => updateItem("hsnSacCode", value)} />
                    </Grid>
                    <Grid item xs={12}>
                      <Typography variant="caption" color="#8a94a6" fontWeight={900}>
                        ITEM TYPE
                      </Typography>
                      <Grid container spacing={1.5} sx={{ mt: 0.4 }}>
                        <Grid item xs={12} sm={6}>
                          <Button fullWidth variant="outlined" startIcon={<Inventory2 />} sx={{ height: 46, borderRadius: 1.5, bgcolor: alpha(BLUE, 0.07), borderColor: BLUE, color: BLUE, fontWeight: 900 }}>
                            Goods
                          </Button>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <Button fullWidth variant="outlined" startIcon={<TrendingUp />} sx={{ height: 46, borderRadius: 1.5, borderColor: "#e5e7eb", color: MUTED, fontWeight: 900 }}>
                            Service
                          </Button>
                        </Grid>
                      </Grid>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Field
                        select
                        label="Category *"
                        value={itemForm.category}
                        onChange={(value) => {
                          updateItem("category", value);
                          updateItem("subcategory", "");
                        }}
                      >
                        {categories.map((entry) => (
                          <MenuItem key={entry.category} value={entry.category}>
                            {entry.category}
                          </MenuItem>
                        ))}
                      </Field>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Field select label="Subcategory" value={itemForm.subcategory} onChange={(value) => updateItem("subcategory", value)} disabled={!selectedCategory?.subcategories?.length}>
                        {(selectedCategory?.subcategories || []).map((sub) => (
                          <MenuItem key={sub} value={sub}>
                            {sub}
                          </MenuItem>
                        ))}
                      </Field>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Field select label="Unit of Measure" value={itemForm.unit} onChange={(value) => updateItem("unit", value)}>
                        {["pcs", "Nos", "kg", "meter", "set", "Other (custom)"].map((unit) => (
                          <MenuItem key={unit} value={unit}>
                            {unit}
                          </MenuItem>
                        ))}
                      </Field>
                    </Grid>
                    <Grid item xs={12}>
                      <Field label="Description" placeholder="Short description of this item..." multiline minRows={3} value={itemForm.description} onChange={(value) => updateItem("description", value)} />
                    </Grid>
                  </Grid>
                </SectionCard>

                <SectionCard icon={<Inventory2 />} title="Tax information" color={WARNING}>
                  <Grid container spacing={1.5}>
                    <Grid item xs={12} md={6}>
                      <Button fullWidth variant="outlined" sx={{ height: 42, borderRadius: 1.5, borderColor: WARNING, bgcolor: alpha(WARNING, 0.08), color: WARNING, fontWeight: 900 }}>
                        Inter-state (IGST)
                      </Button>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Button fullWidth variant="outlined" sx={{ height: 42, borderRadius: 1.5, borderColor: "#e5e7eb", color: MUTED, fontWeight: 900 }}>
                        Intra-state (CGST+SGST)
                      </Button>
                    </Grid>
                    <Grid item xs={12}>
                      <Field label="IGST (%)" placeholder="e.g. 18" type="number" value={itemForm.pricing.igst} onChange={(value) => updateItem("pricing.igst", value)} />
                    </Grid>
                  </Grid>
                </SectionCard>

                <SectionCard icon={<ListAlt />} title="Inventory management" color="#0f766e">
                  <Box sx={{ p: 1.7, border: "1px solid #bbf7d0", bgcolor: "#effdf7", borderRadius: 2, mb: 2 }}>
                    <Stack direction="row" alignItems="center" spacing={1.3}>
                      <Checkbox sx={{ p: 0 }} />
                      <Box>
                        <Typography fontWeight={900}>Track stock levels</Typography>
                        <Typography variant="body2" color="#0f766e">
                          Monitor and alert on inventory thresholds
                        </Typography>
                      </Box>
                    </Stack>
                  </Box>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <Field label="Opening Stock" placeholder="e.g. 100" type="number" value={itemForm.openingStock || ""} onChange={(value) => updateItem("openingStock", value)} />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Field select label="Opening Warehouse" value={itemForm.openingWarehouse || ""} onChange={(value) => updateItem("openingWarehouse", value)} disabled={!warehouses.length}>
                        {warehouses.map((warehouse) => (
                          <MenuItem key={warehouse._id} value={warehouse._id}>
                            {warehouse.name} {warehouse.code ? `(${warehouse.code})` : ""}
                          </MenuItem>
                        ))}
                      </Field>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Field label="Low Stock Alert" placeholder="e.g. 10" type="number" value={itemForm.reorderLevel} onChange={(value) => updateItem("reorderLevel", value)} />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Field label="High Stock Limit" placeholder="e.g. 1000" type="number" value={itemForm.maxStockLevel || ""} onChange={(value) => updateItem("maxStockLevel", value)} />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Field label="Expiry Date" type="date" value={itemForm.tracking.expiryDate} onChange={(value) => updateItem("tracking.expiryDate", value)} InputLabelProps={{ shrink: true }} />
                    </Grid>
                  </Grid>
                </SectionCard>

                <SectionCard icon={<Straighten />} title="Dimensions & weight" color="#7c3aed">
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={3}>
                      <Field label="L" value={itemForm.dimensions.length} onChange={(value) => updateItem("dimensions.length", value)} />
                    </Grid>
                    <Grid item xs={12} md={3}>
                      <Field label="W" value={itemForm.dimensions.width} onChange={(value) => updateItem("dimensions.width", value)} />
                    </Grid>
                    <Grid item xs={12} md={3}>
                      <Field label="H" value={itemForm.dimensions.height} onChange={(value) => updateItem("dimensions.height", value)} />
                    </Grid>
                    <Grid item xs={12} md={3}>
                      <Field select label="Unit" value={itemForm.dimensions.unit} onChange={(value) => updateItem("dimensions.unit", value)}>
                        {["cm", "mm", "inch"].map((unit) => (
                          <MenuItem key={unit} value={unit}>
                            {unit}
                          </MenuItem>
                        ))}
                      </Field>
                    </Grid>
                    <Grid item xs={12}>
                      <Field label="Weight (kg)" placeholder="e.g. 1.5" value={itemForm.weight.value} onChange={(value) => updateItem("weight.value", value)} />
                    </Grid>
                  </Grid>
                </SectionCard>
              </Stack>
            </Grid>

            <Grid item xs={12} lg={4}>
              <Stack spacing={2}>
                <Card sx={{ ...softCard, boxShadow: "none" }}>
                  <Stack direction="row" alignItems="center" spacing={1.5} sx={{ p: 2.5 }}>
                    <Box sx={{ width: 34, height: 34, borderRadius: 2, display: "grid", placeItems: "center", bgcolor: "#f1f5f9", color: "#94a3b8" }}>
                      <ImageOutlined />
                    </Box>
                    <Typography fontWeight={900}>Item image</Typography>
                  </Stack>
                  <Divider />
                  <Box sx={{ p: 2.5 }}>
                    <Box sx={{ border: "2px dashed #d8dee8", borderRadius: 3, p: 4, textAlign: "center" }}>
                      <IconButton sx={{ border: "1px solid #e5e7eb", mb: 1 }}>
                        <ImageOutlined />
                      </IconButton>
                      <Typography fontWeight={900}>Upload item image</Typography>
                      <Typography variant="body2" color="#8a94a6" sx={{ my: 1 }}>
                        Max 2 MB - PNG, JPG, WEBP
                      </Typography>
                      {itemForm.image && (
                        <Typography variant="caption" color={MUTED} sx={{ display: "block", mb: 1 }}>
                          {itemForm.image.name}
                        </Typography>
                      )}
                      <Button component="label" variant="contained" sx={{ bgcolor: BLUE, borderRadius: 2, fontWeight: 900 }}>
                        Browse file
                        <input
                          hidden
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          onChange={(event) => updateItem("image", event.target.files?.[0] || null)}
                        />
                      </Button>
                    </Box>
                  </Box>
                </Card>

                <SectionCard icon={<Typography fontWeight={900}>Rs</Typography>} title="Pricing" color={SUCCESS}>
                  <Stack spacing={2}>
                    <Field label="Selling Price (Rs)" type="number" value={itemForm.pricing.sellingPrice} onChange={(value) => updateItem("pricing.sellingPrice", value)} />
                    <Field label="Cost Price (Rs)" type="number" value={itemForm.pricing.purchaseCost} onChange={(value) => updateItem("pricing.purchaseCost", value)} />
                    <Grid container spacing={1}>
                      <Grid item xs={4}>
                        <Field select label="Discount" value="Rs" onChange={() => {}}>
                          <MenuItem value="Rs">Rs</MenuItem>
                          <MenuItem value="%">%</MenuItem>
                        </Field>
                      </Grid>
                      <Grid item xs={8}>
                        <Field label=" " type="number" value={itemForm.discount || 0} onChange={(value) => updateItem("discount", value)} />
                      </Grid>
                    </Grid>
                  </Stack>
                </SectionCard>

                <SectionCard icon={<UploadFileOutlined />} title="Purchase info" color="#f97316">
                  <Stack spacing={2}>
                    <Field
                      select
                      label="Preferred Vendor"
                      value={itemForm.purchaseInfo.vendor || ""}
                      onChange={(value) => {
                        const vendor = vendors.find((entry) => entry._id === value);
                        updateItem("purchaseInfo.vendor", value);
                        updateItem("purchaseInfo.vendorName", vendor?.name || "");
                      }}
                      disabled={!vendors.length}
                    >
                      {vendors.map((vendor) => (
                        <MenuItem key={vendor._id} value={vendor._id}>
                          {vendor.name}
                        </MenuItem>
                      ))}
                    </Field>
                    <Field label="Sales Description" placeholder="Used on sales invoices..." multiline minRows={3} value={itemForm.salesDescription || ""} onChange={(value) => updateItem("salesDescription", value)} />
                    <Field label="Purchase Description" placeholder="Used on purchase orders..." multiline minRows={3} value={itemForm.purchaseDescription || ""} onChange={(value) => updateItem("purchaseDescription", value)} />
                  </Stack>
                </SectionCard>
              </Stack>
            </Grid>
          </Grid>
        </Box>
      </Box>
    );
  }

  if (mode === "subcategories") {
    const subcategories = (selectedCategoryForSub?.subcategories || []).filter((name) =>
      !subcategorySearch || name.toLowerCase().includes(subcategorySearch.toLowerCase()),
    );
    return (
      <Box sx={{ p: { xs: 2, md: 3.5 }, bgcolor: "#fff", minHeight: "100vh" }}>
        <Button startIcon={<ArrowBack />} onClick={() => setScreen("categories")} sx={{ mb: 3, color: MUTED }}>
          Back to Categories
        </Button>
        <Stack direction={{ xs: "column", md: "row" }} alignItems={{ xs: "stretch", md: "center" }} justifyContent="space-between" spacing={2} sx={{ mb: 3 }}>
          <Stack direction="row" alignItems="center" spacing={1.6}>
            <PageIcon icon={<ListAlt />} />
            <Box>
              <Typography variant="h3" fontWeight={900} color="#000">
                Subcategories
              </Typography>
              <Typography color={MUTED}>
                Category: <Box component="span" sx={{ color: TEXT, fontWeight: 900 }}>{selectedCategoryForSub?.category || "-"}</Box>
              </Typography>
            </Box>
          </Stack>
          <Button startIcon={<Add />} variant="contained" onClick={addSubcategory} disabled={!selectedCategoryForSub?._id} sx={{ bgcolor: INDIGO, borderRadius: 2, px: 3, py: 1.2, fontWeight: 900 }}>
            Add Subcategory
          </Button>
        </Stack>

        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} md={4}>
            <StatCard icon={<ListAlt />} label="Total Subcategories" value={selectedCategoryForSub?.subcategories?.length || 0} />
          </Grid>
          <Grid item xs={12} md={4}>
            <StatCard icon={<Inventory2 />} label="Active Subcategories" value={selectedCategoryForSub?.subcategories?.length || 0} color={SUCCESS} />
          </Grid>
          <Grid item xs={12} md={4}>
            <StatCard icon={<Search />} label="Filtered Results" value={subcategories.length} color="#7c3aed" />
          </Grid>
        </Grid>

        <TextField
          placeholder="Search subcategories by name..."
          value={subcategorySearch}
          onChange={(event) => setSubcategorySearch(event.target.value)}
          fullWidth
          InputProps={{ startAdornment: <InputAdornment position="start"><Search /></InputAdornment> }}
          sx={{ ...inputSx, mb: 3, "& .MuiOutlinedInput-root": { ...inputSx["& .MuiOutlinedInput-root"], minHeight: 56 } }}
        />

        <TableCard
          columns={["Name", "Description", "Created", "Actions"]}
          rows={subcategories.map((name) => [
            <Stack direction="row" alignItems="center" spacing={1}>
              <ListAlt color="primary" fontSize="small" />
              <Typography color={BLUE} fontWeight={900}>{name}</Typography>
            </Stack>,
            <Typography color="#94a3b8" fontStyle="italic">No description</Typography>,
            selectedCategoryForSub?.updatedAt ? new Date(selectedCategoryForSub.updatedAt).toLocaleDateString() : "-",
            <Stack direction="row" spacing={0.5} justifyContent="flex-end">
              <Tooltip title="Edit">
                <IconButton size="small" onClick={() => editSubcategory(name)} sx={{ color: BLUE }}>
                  <EditOutlined fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Delete">
                <IconButton size="small" onClick={() => deleteSubcategory(name)} sx={{ color: DANGER }}>
                  <DeleteOutline fontSize="small" />
                </IconButton>
              </Tooltip>
            </Stack>,
          ])}
          empty="No subcategories found."
        />

        <Paper sx={{ ...softCard, p: 2, mt: 3 }}>
          <Stack direction={{ xs: "column", sm: "row" }} alignItems="center" justifyContent="space-between" spacing={2}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <Typography color={MUTED}>Per page:</Typography>
              <TextField select size="small" value={10} sx={{ width: 86, ...inputSx }}>
                <MenuItem value={10}>10</MenuItem>
              </TextField>
            </Stack>
            <Typography color={MUTED}>{subcategories.length ? `1-${subcategories.length} of ${subcategories.length}` : "0 of 0"}</Typography>
            <Stack direction="row" spacing={1}>
              <Button disabled variant="outlined" sx={{ borderColor: "#e5e7eb" }}>Prev</Button>
              <Button variant="contained" sx={{ bgcolor: INDIGO }}>1</Button>
              <Button disabled variant="outlined" sx={{ borderColor: "#e5e7eb" }}>Next</Button>
            </Stack>
          </Stack>
        </Paper>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 1.5, md: 2.5 }, bgcolor: "#fff", minHeight: "100vh" }}>
      {mode === "categories" ? (
        <Stack spacing={2.5}>
          <Stack direction={{ xs: "column", md: "row" }} alignItems={{ xs: "stretch", md: "center" }} justifyContent="space-between" spacing={2}>
            <Stack direction="row" alignItems="center" spacing={1.6}>
              <PageIcon icon={<Inventory2 />} />
              <Box>
                <Typography variant="h3" fontWeight={900} color="#000">
                  Inventory Categories
                </Typography>
                <Typography color={MUTED}>Organize and manage your product categories</Typography>
              </Box>
            </Stack>
            <Button startIcon={<Add />} variant="contained" onClick={startCreateCategory} sx={{ bgcolor: INDIGO, borderRadius: 2, px: 3, py: 1.2, fontWeight: 900 }}>
              Add Category
            </Button>
          </Stack>

          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <StatCard icon={<ListAlt />} label="Total Categories" value={categoryRows.length} />
            </Grid>
            <Grid item xs={12} md={4}>
              <StatCard icon={<Inventory2 />} label="Active Categories" value={categoryRows.filter((row) => row.isActive !== false).length} color={SUCCESS} />
            </Grid>
            <Grid item xs={12} md={4}>
              <StatCard icon={<Search />} label="Filtered Results" value={categoryRows.length} color="#7c3aed" />
            </Grid>
          </Grid>

          <TextField
            placeholder="Search categories by name or description..."
            value={categorySearch}
            onChange={(event) => setCategorySearch(event.target.value)}
            fullWidth
            InputProps={{ startAdornment: <InputAdornment position="start"><Search /></InputAdornment> }}
            sx={{ ...inputSx, "& .MuiOutlinedInput-root": { ...inputSx["& .MuiOutlinedInput-root"], minHeight: 56 } }}
          />

          <TableCard
            columns={["Name", "Description", "Subcategories", "Status", "Actions"]}
            rows={categoryRows.map((entry) => [
              <Stack direction="row" alignItems="center" spacing={1}>
                <Inventory2 color="primary" fontSize="small" />
                <Typography color={BLUE} fontWeight={900}>{entry.category}</Typography>
              </Stack>,
              <Typography color={entry.description ? TEXT : "#94a3b8"} fontStyle={entry.description ? "normal" : "italic"}>
                {entry.description || "No description"}
              </Typography>,
              <Chip size="small" label={entry.subcategoryCount} sx={{ bgcolor: alpha("#c026d3", 0.12), color: "#8b5cf6", fontWeight: 900 }} />,
              <Chip size="small" label={entry.isActive === false ? "Inactive" : "Active"} sx={{ bgcolor: alpha(SUCCESS, 0.14), color: "#15803d", fontWeight: 800 }} />,
              <Tooltip title="Actions">
                <IconButton size="small" onClick={(event) => openCategoryMenu(event, entry)}>
                  <MoreVert fontSize="small" />
                </IconButton>
              </Tooltip>,
            ])}
            empty="No categories found."
          />
        </Stack>
      ) : (
        <Stack spacing={2.5}>
          <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" alignItems={{ xs: "stretch", md: "center" }} spacing={2}>
            <Stack direction="row" alignItems="center" spacing={1.6}>
              <PageIcon icon={<Inventory2 />} />
              <Box>
                <Typography variant="h3" fontWeight={900} color="#000">
                  Inventory Items
                </Typography>
                <Typography color={MUTED}>Manage your product inventory and track stock levels</Typography>
              </Box>
            </Stack>
            <Stack direction="row" spacing={1} justifyContent="flex-end">
              <Button startIcon={<Refresh />} variant="outlined" onClick={fetchAll} sx={{ borderColor: "#e5e7eb", color: "#000", fontWeight: 800 }}>Refresh</Button>
              <Button
                startIcon={<Add />}
                variant="contained"
                onClick={() => {
                  setItemForm(emptyItem);
                  setMode("create-item");
                }}
                sx={{ bgcolor: INDIGO, borderRadius: 2, fontWeight: 900 }}
              >
                Add Item
              </Button>
            </Stack>
          </Stack>

          <Grid container spacing={2}>
            <Grid item xs={12} md={3}><StatCard icon={<Inventory2 />} label="Total Items" value={summary.totalItems || items.length} /></Grid>
            <Grid item xs={12} md={3}><StatCard icon={<TrendingUp />} label="Total Value" value={formatCurrency(summary.inventoryValue)} color={SUCCESS} /></Grid>
            <Grid item xs={12} md={3}><StatCard icon={<ErrorOutline />} label="Low Stock" value={summary.lowStock || 0} color={WARNING} /></Grid>
            <Grid item xs={12} md={3}><StatCard icon={<ErrorOutline />} label="Out of Stock" value={summary.outOfStock || 0} color={DANGER} /></Grid>
          </Grid>

          <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} alignItems="center">
            <TextField
              placeholder="Search by name, SKU, HSN..."
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              fullWidth
              InputProps={{ startAdornment: <InputAdornment position="start"><Search /></InputAdornment> }}
              sx={inputSx}
            />
            <Stack direction="row" spacing={1}>
              <IconButton sx={{ border: "1px solid #e5e7eb", bgcolor: INDIGO, color: "#fff", borderRadius: 2 }}><ListAlt /></IconButton>
              <IconButton sx={{ border: "1px solid #e5e7eb", borderRadius: 2 }}><GridView /></IconButton>
              <Button startIcon={<FilterAltOutlined />} variant="outlined" sx={{ borderColor: "#e5e7eb", color: "#000", fontWeight: 900 }}>Filters</Button>
            </Stack>
          </Stack>

          <Stack direction="row" spacing={1} flexWrap="wrap">
            <Chip label="Low Stock" onClick={() => setItemFilter(itemFilter === "low" ? "" : "low")} color={itemFilter === "low" ? "warning" : "default"} variant={itemFilter === "low" ? "filled" : "outlined"} sx={{ fontWeight: 800, borderRadius: 1.5 }} />
            <Chip label="Out of Stock" onClick={() => setItemFilter(itemFilter === "out" ? "" : "out")} color={itemFilter === "out" ? "error" : "default"} variant={itemFilter === "out" ? "filled" : "outlined"} sx={{ fontWeight: 800, borderRadius: 1.5 }} />
            {categories.slice(0, 4).map((entry) => (
              <Chip
                key={entry.category}
                label={entry.category}
                onClick={() => {
                  setItemFilter(itemFilter === entry.category ? "" : entry.category);
                  setPage(1);
                }}
                color={itemFilter === entry.category ? "primary" : "default"}
                variant={itemFilter === entry.category ? "filled" : "outlined"}
                sx={{ fontWeight: 800, borderRadius: 1.5 }}
              />
            ))}
          </Stack>

          <TableCard
            columns={["", "Item", "Category", "Price", "HSN/SAC", "Unit", "Stock", "Status", "Actions"]}
            rows={visibleItems.map((item) => {
              const stock = getAvailableStock(item);
              const imageUrl = toBackendAssetUrl(item.imageUrl);
              return [
                <Checkbox size="small" />,
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <Box sx={{ width: 50, height: 42, borderRadius: 1.5, bgcolor: "#f8fafc", display: "grid", placeItems: "center", color: "#94a3b8" }}>
                    {imageUrl ? <img src={imageUrl} alt={item.itemName} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 8 }} /> : <ImageOutlined />}
                  </Box>
                  <Box>
                    <Typography fontWeight={900}>{item.itemName}</Typography>
                    <Typography variant="body2" color={MUTED}>{item.description || item.sku}</Typography>
                  </Box>
                </Stack>,
                <Stack direction="row" spacing={0.7}>
                  <Chip size="small" label={item.category || "-"} sx={{ bgcolor: alpha(BLUE, 0.12), color: BLUE }} />
                  {item.subcategory && <Chip size="small" label={item.subcategory} sx={{ bgcolor: "#f1f5f9" }} />}
                </Stack>,
                <Box>
                  <Typography fontWeight={900}>{formatCurrency(item.pricing?.sellingPrice)}</Typography>
                  <Typography variant="caption" color={MUTED}>Cost: {formatCurrency(item.pricing?.purchaseCost)}</Typography>
                </Box>,
                item.hsnSacCode || "-",
                item.unit || "pcs",
                <Typography fontWeight={900}>{stock} {item.unit || "pcs"}</Typography>,
                <Chip size="small" label={stock <= 0 ? "Out" : "Active"} sx={{ bgcolor: alpha(stock <= 0 ? DANGER : SUCCESS, 0.12), color: stock <= 0 ? DANGER : SUCCESS, fontWeight: 800 }} />,
                <Stack direction="row" spacing={0.5}>
                  <Tooltip title="View"><IconButton size="small" sx={{ color: BLUE }}><VisibilityOutlined fontSize="small" /></IconButton></Tooltip>
                  <Tooltip title="Edit"><IconButton size="small" onClick={() => startEditItem(item)} sx={{ color: BLUE }}><EditOutlined fontSize="small" /></IconButton></Tooltip>
                  <Tooltip title="Delete"><IconButton size="small" onClick={() => deleteItem(item)} sx={{ color: DANGER }}><DeleteOutline fontSize="small" /></IconButton></Tooltip>
                </Stack>,
              ];
            })}
            empty={loading ? "Loading inventory items..." : "No inventory items found."}
          />
          <Paper sx={{ ...softCard, p: 2 }}>
            <Stack direction={{ xs: "column", sm: "row" }} alignItems="center" justifyContent="space-between" spacing={2}>
              <Stack direction="row" alignItems="center" spacing={1}>
                <Typography color={MUTED}>Per page:</Typography>
                <TextField
                  select
                  size="small"
                  value={pageSize}
                  onChange={(event) => {
                    setPageSize(Number(event.target.value));
                    setPage(1);
                  }}
                  sx={{ width: 86, ...inputSx }}
                >
                  {[10, 20, 50, 100].map((size) => (
                    <MenuItem key={size} value={size}>{size}</MenuItem>
                  ))}
                </TextField>
              </Stack>
              <Typography color={MUTED}>
                {pagination.total ? `${(pagination.page - 1) * pagination.limit + 1}-${Math.min(pagination.page * pagination.limit, pagination.total)} of ${pagination.total}` : "0 of 0"}
              </Typography>
              <Stack direction="row" spacing={1}>
                <Button disabled={page <= 1} onClick={() => setPage((prev) => Math.max(prev - 1, 1))} variant="outlined" sx={{ borderColor: "#e5e7eb" }}>
                  Prev
                </Button>
                <Button variant="contained" sx={{ bgcolor: INDIGO }}>{page}</Button>
                <Button disabled={page >= pagination.pages} onClick={() => setPage((prev) => prev + 1)} variant="outlined" sx={{ borderColor: "#e5e7eb" }}>
                  Next
                </Button>
              </Stack>
            </Stack>
          </Paper>
        </Stack>
      )}

      <Menu
        anchorEl={categoryMenuAnchor}
        open={Boolean(categoryMenuAnchor)}
        onClose={closeCategoryMenu}
        PaperProps={{
          sx: {
            mt: 1,
            width: 220,
            borderRadius: 2,
            boxShadow: "0 12px 30px rgba(15,23,42,0.18)",
            border: "1px solid #e5e7eb",
          },
        }}
      >
        <MenuItem onClick={() => categoryMenuRow && viewSubcategories(categoryMenuRow)} sx={{ gap: 1.5, py: 1.2 }}>
          <VisibilityOutlined fontSize="small" />
          <Typography>View Subcategories</Typography>
        </MenuItem>
        <MenuItem onClick={() => categoryMenuRow && startEditCategory(categoryMenuRow)} sx={{ gap: 1.5, py: 1.2 }}>
          <EditOutlined fontSize="small" />
          <Typography>Edit</Typography>
        </MenuItem>
        <MenuItem onClick={() => categoryMenuRow && deleteCategory(categoryMenuRow)} sx={{ gap: 1.5, py: 1.2, color: DANGER }}>
          <DeleteOutline fontSize="small" />
          <Typography>Delete</Typography>
        </MenuItem>
      </Menu>

      <Snackbar open={toast.open} autoHideDuration={3500} onClose={() => setToast((prev) => ({ ...prev, open: false }))}>
        <Alert severity={toast.severity} variant="filled" sx={{ color: "#fff" }}>{toast.message}</Alert>
      </Snackbar>
    </Box>
  );
}

const TableCard = ({ columns, rows, empty }) => (
  <TableContainer component={Paper} sx={{ ...softCard, overflow: "hidden" }}>
    <Table>
      <TableHead sx={{ bgcolor: "#f8f8f9" }}>
        <TableRow>
          {columns.map((column) => (
            <TableCell key={column} sx={{ py: 2, color: "#596275", fontWeight: 900, textTransform: "uppercase", fontSize: 12 }}>
              {column}
            </TableCell>
          ))}
        </TableRow>
      </TableHead>
      <TableBody>
        {rows.length === 0 ? (
          <TableRow>
            <TableCell colSpan={columns.length}>
              <Typography align="center" color={MUTED} sx={{ py: 4 }}>{empty}</Typography>
            </TableCell>
          </TableRow>
        ) : (
          rows.map((row, index) => (
            <TableRow key={index} hover>
              {row.map((cell, cellIndex) => (
                <TableCell key={`${index}-${cellIndex}`} sx={{ py: 2.2 }}>
                  {cell}
                </TableCell>
              ))}
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  </TableContainer>
);

export default InventoryERP;
