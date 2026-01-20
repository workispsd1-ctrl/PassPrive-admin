"use client";

import React, { useEffect, useMemo, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

import Modal from "@/app/dashboard/_components/Modal";
import PaginationBar from "@/app/dashboard/_components/Pagination";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import { showToast } from "@/hooks/useToast";

import {
  Plus,
  Trash2,
  Info,
  Pencil,
  Upload,
  ArrowLeft,
  X,
  Eye,
  EyeOff,
  Building2,
  Users,
  BadgeCheck,
  CalendarDays,
  MapPin,
  Mail,
  Phone,
} from "lucide-react";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ||
  "http://localhost:8000";

const inputClass = "border border-gray-300 focus:border-gray-400 focus:ring-0";

async function getAccessToken() {
  const { data, error } = await supabaseBrowser.auth.getSession();
  if (error) throw error;
  const token = data.session?.access_token;
  if (!token) throw new Error("Not logged in. Please login as admin/superadmin.");
  return token;
}

function safeArray(v: any) {
  return Array.isArray(v) ? v : [];
}

function normalizeHeader(s: any) {
  return String(s || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
}

function pick(obj: any, keys: string[]) {
  for (const k of keys) {
    if (obj?.[k] != null && String(obj[k]).trim() !== "") return obj[k];
  }
  return "";
}

function formatDate(d: any) {
  if (!d) return "-";
  try {
    const date = new Date(d);
    if (Number.isNaN(date.getTime())) return String(d);
    return date.toLocaleDateString();
  } catch {
    return String(d);
  }
}

function StatusPill({ active, label }: { active: boolean; label: string }) {
  return (
    <span
      className={[
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold",
        active
          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
          : "bg-rose-50 text-rose-700 border border-rose-200",
      ].join(" ")}
    >
      <span
        className={[
          "h-1.5 w-1.5 rounded-full",
          active ? "bg-emerald-500" : "bg-rose-500",
        ].join(" ")}
      />
      {label}
    </span>
  );
}

function Chip({
  icon: Icon,
  label,
  value,
}: {
  icon: any;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2">
      <div className="rounded-lg bg-gray-50 p-2">
        <Icon className="h-4 w-4 text-gray-700" />
      </div>
      <div className="leading-tight">
        <div className="text-[11px] font-medium text-gray-500">{label}</div>
        <div className="text-sm font-semibold text-gray-900">{value}</div>
      </div>
    </div>
  );
}

function SectionTitle({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <div className="text-sm font-semibold text-gray-900">{title}</div>
        {subtitle ? <div className="mt-1 text-xs text-gray-500">{subtitle}</div> : null}
      </div>
      {right ? <div>{right}</div> : null}
    </div>
  );
}

type PlanRow = {
  id: string;
  plan_name: string;
  amount: string;
  type: string;
  sort_order: number;
};

type EmployeeRow = {
  name: string;
  email: string;
  phone: string;
  password: string;
  department?: string;
  designation?: string;
  plan?: string; // ✅ optional per-row plan name (Excel)
};

export default function CorporateDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = String((params as any)?.id || "");

  const [loading, setLoading] = useState(true);
  const [corporate, setCorporate] = useState<any>(null);

  // Employees pagination (local from jsonb)
  const [empPage, setEmpPage] = useState(1);
  const [empLimit, setEmpLimit] = useState(10);

  // modals
  const [infoEmp, setInfoEmp] = useState<any>(null);
  const [confirmDeleteEmp, setConfirmDeleteEmp] = useState<any>(null);
  const [deletingEmp, setDeletingEmp] = useState(false);

  // Add employees (single / multi)
  const [openAdd, setOpenAdd] = useState(false);
  const [creating, setCreating] = useState(false);
  const [showPasswords, setShowPasswords] = useState(false);

  // ✅ Plans + membership selection
  const [plans, setPlans] = useState<PlanRow[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [selectedPlanName, setSelectedPlanName] = useState("");
  const [membershipStart, setMembershipStart] = useState("");
  const [membershipExpiry, setMembershipExpiry] = useState("");

  const [newEmployees, setNewEmployees] = useState<EmployeeRow[]>([
    { name: "", email: "", phone: "", password: "", department: "", designation: "" },
  ]);

  // Excel upload
  const [openUpload, setOpenUpload] = useState(false);
  const [excelFileName, setExcelFileName] = useState("");
  const [excelRows, setExcelRows] = useState<EmployeeRow[]>([]);
  const [parsingExcel, setParsingExcel] = useState(false);
  const [excelError, setExcelError] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const employees = useMemo(() => {
    return safeArray(corporate?.employees).map((e: any) => ({
      role: "user",
      ...e,
    }));
  }, [corporate?.employees]);

  const totalEmpPages = useMemo(() => {
    return Math.max(1, Math.ceil(employees.length / empLimit));
  }, [employees.length, empLimit]);

  const employeesPageSlice = useMemo(() => {
    const start = (empPage - 1) * empLimit;
    const end = start + empLimit;
    return employees.slice(start, end);
  }, [employees, empPage, empLimit]);

  const fetchCorporate = async () => {
    if (!id) return;
    setLoading(true);

    const { data, error } = await supabaseBrowser
      .from("corporate")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      showToast({
        type: "error",
        title: "Failed to load corporate",
        description: error.message,
      });
      setCorporate(null);
    } else {
      setCorporate({
        ...(data || {}),
        employees: safeArray((data as any)?.employees),
      });
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchCorporate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (empPage > totalEmpPages) setEmpPage(totalEmpPages);
  }, [empPage, totalEmpPages]);

  const formatLocation = (c: any) => {
    const parts = [c?.area, c?.city].filter(Boolean);
    return parts.length ? parts.join(", ") : "-";
  };

  // ✅ Load plans from subscription table
  useEffect(() => {
    const loadPlans = async () => {
      const { data, error } = await supabaseBrowser
        .from("subscription")
        .select("id,plan_name,amount,type,sort_order")
        .order("sort_order", { ascending: true });

      if (error) {
        showToast({
          type: "error",
          title: "Failed to load plans",
          description: error.message,
        });
        setPlans([]);
        return;
      }
      setPlans((data as any) || []);
    };

    loadPlans();
  }, []);

  const validateEmployeeRow = (e: any) => {
    if (!String(e?.name || "").trim()) return "Name is required";
    if (!String(e?.email || "").trim()) return "Email is required";
    if (!String(e?.password || "").trim()) return "Password is required";
    if (String(e.password).trim().length < 6) return "Password must be at least 6 chars";
    if (!String(e?.phone || "").trim()) return "Phone is required";
    return "";
  };

  const resetMembershipPickers = () => {
    setSelectedPlanId("");
    setSelectedPlanName("");
    setMembershipStart("");
    setMembershipExpiry("");
  };

  /* -----------------------------
     BACKEND: BULK CREATE EMPLOYEES
     - sends membership + corporate fields to /auth/create-user
  ----------------------------- */
  const createEmployeesViaBackend = async (rows: EmployeeRow[]) => {
    const token = await getAccessToken();

    // Map plan_name -> plan row
    const planByName = new Map(
      plans.map((p) => [String(p.plan_name || "").toLowerCase(), p])
    );

    const usersPayload = rows.map((r) => {
      // Priority: Excel row plan name -> dropdown plan -> null
      let planName = selectedPlanName || "";
      const rowPlanName = String((r as any).plan || "").trim();
      if (rowPlanName) planName = rowPlanName;

      // If planName matches DB plan, normalize to DB plan_name (clean)
      const found = planByName.get(planName.toLowerCase());
      if (found) planName = found.plan_name;

      return {
        email: String(r.email || "").trim(),
        password: String(r.password || "").trim(),
        full_name: String(r.name || "").trim(),
        phone: String(r.phone || "").trim(),
        role: "user",

        // ✅ users table membership fields
        membership: planName ? planName : null,
        membership_tier: planName ? planName : "none",
        membership_started: membershipStart || null,
        membership_expiry: membershipExpiry || null,

        // ✅ corporate fields
        corporate_code: id,
        corporate_code_status: "approved",
      };
    });

    // Optional: require plan for creation (uncomment if needed)
    // if (!selectedPlanId && !selectedPlanName && !rows.some((r: any) => String(r.plan || "").trim())) {
    //   throw new Error("Please select a plan (or include plan column in Excel)");
    // }

    // 1) Create auth + users rows (bulk)
    const res = await fetch(`${API_BASE}/api/auth/create-user`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ users: usersPayload }),
    });

    const json = await res.json();
    if (!res.ok) throw new Error(json?.error || "Failed to create employees");

    const createdUsers = Array.isArray(json?.created) ? json.created : [];
    const failedUsers = Array.isArray(json?.failed) ? json.failed : [];

    // 2) Append to corporate.employees jsonb
    if (createdUsers.length) {
      const extraByEmail = new Map(
        rows.map((r) => [String(r.email || "").toLowerCase(), r])
      );

      const employeesPayload = createdUsers.map((u: any) => {
        const email = String(u.email || "").toLowerCase();
        const extra = extraByEmail.get(email) || ({} as any);

        return {
          user_id: u.id,
          name: u.full_name || extra.name || "",
          email: u.email,
          phone: u.phone || extra.phone || "",
          department: extra.department || null,
          designation: extra.designation || null,
          created_at: u.created_at || new Date().toISOString(),
        };
      });

      const res2 = await fetch(`${API_BASE}/api/corporates/${id}/employees`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ employees: employeesPayload }),
      });

      const json2 = await res2.json();
      if (!res2.ok) throw new Error(json2?.error || "Failed to update corporate employees");
    }

    return { created: createdUsers, failed: failedUsers };
  };

  const handleCreateEmployees = async () => {
    const cleaned = newEmployees
      .map((e) => ({
        ...e,
        name: String(e.name || "").trim(),
        email: String(e.email || "").trim(),
        phone: String(e.phone || "").trim(),
        password: String(e.password || ""),
        department: String(e.department || "").trim() || undefined,
        designation: String(e.designation || "").trim() || undefined,
      }))
      .filter((e) => e.name || e.email || e.phone || e.password);

    if (!cleaned.length) {
      showToast({ type: "error", title: "Add at least 1 employee" });
      return;
    }

    for (const row of cleaned) {
      const err = validateEmployeeRow(row);
      if (err) {
        showToast({ type: "error", title: err });
        return;
      }
    }

    // Require plan selection if no excel plan per row
    const hasAnyRowPlan = cleaned.some((r: any) => String(r.plan || "").trim());
    if (!hasAnyRowPlan && !selectedPlanId) {
      showToast({ type: "error", title: "Please select a plan" });
      return;
    }

    setCreating(true);
    try {
      const result = await createEmployeesViaBackend(cleaned);

      showToast({
        type: "success",
        title: "Employees created",
        description: `${result?.created?.length || 0} created, ${result?.failed?.length || 0} failed`,
      });

      setOpenAdd(false);
      setNewEmployees([
        { name: "", email: "", phone: "", password: "", department: "", designation: "" },
      ]);
      resetMembershipPickers();
      await fetchCorporate();
    } catch (err: any) {
      showToast({
        type: "error",
        title: "Failed to create employees",
        description: err?.message || "Something went wrong",
      });
    } finally {
      setCreating(false);
    }
  };

  /* -----------------------------
     EXCEL PARSING
     - supports optional plan / plan_name
  ----------------------------- */
  const parseExcel = async (file: File) => {
    setParsingExcel(true);
    setExcelError("");

    try {
      const XLSX = await import("xlsx");

      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });

      const sheetName = wb.SheetNames?.[0];
      if (!sheetName) throw new Error("No sheet found in this file");

      const ws = wb.Sheets[sheetName];
      const raw: any[] = XLSX.utils.sheet_to_json(ws, { defval: "" });

      const mapped: EmployeeRow[] = raw
        .map((r) => {
          const normalized: any = {};
          Object.keys(r || {}).forEach((k) => {
            normalized[normalizeHeader(k)] = (r as any)[k];
          });

          const name = String(pick(normalized, ["name", "full_name", "employee_name"])).trim();
          const email = String(pick(normalized, ["email", "mail"])).trim();
          const phone = String(pick(normalized, ["phone", "mobile", "whatsapp"])).trim();
          const password = String(pick(normalized, ["password", "pass"])).trim();

          const department = String(pick(normalized, ["department", "dept"])).trim();
          const designation = String(pick(normalized, ["designation", "title"])).trim();

          // ✅ optional plan field
          const plan = String(
            pick(normalized, ["plan", "plan_name", "membership", "membership_tier"])
          ).trim();

          return {
            name,
            email,
            phone,
            password,
            department: department || "",
            designation: designation || "",
            plan: plan || "",
          };
        })
        .filter((r) => r.name || r.email || r.phone || r.password);

      if (!mapped.length) {
        setExcelRows([]);
        setExcelError("No rows found. Check headers: name, email, phone, password (optional: plan).");
        return;
      }

      setExcelRows(mapped);
    } catch (err: any) {
      console.error(err);
      setExcelRows([]);
      setExcelError(err?.message || "Failed to parse Excel file");
    } finally {
      setParsingExcel(false);
    }
  };

  const handleUploadCreate = async () => {
    if (!excelRows.length) {
      showToast({ type: "error", title: "Upload an Excel file first" });
      return;
    }

    for (const row of excelRows) {
      const err = validateEmployeeRow(row);
      if (err) {
        showToast({ type: "error", title: "Excel validation failed", description: err });
        return;
      }
    }

    const hasAnyRowPlan = excelRows.some((r: any) => String(r.plan || "").trim());
    if (!hasAnyRowPlan && !selectedPlanId) {
      showToast({ type: "error", title: "Please select a plan (or include plan column in Excel)" });
      return;
    }

    setCreating(true);
    try {
      const result = await createEmployeesViaBackend(excelRows);

      showToast({
        type: "success",
        title: "Employees created from Excel",
        description: `${result?.created?.length || 0} created, ${result?.failed?.length || 0} failed`,
      });

      setOpenUpload(false);
      setExcelRows([]);
      setExcelFileName("");
      resetMembershipPickers();
      await fetchCorporate();
    } catch (err: any) {
      showToast({
        type: "error",
        title: "Excel import failed",
        description: err?.message || "Something went wrong",
      });
    } finally {
      setCreating(false);
    }
  };

  /* -----------------------------
     DELETE EMPLOYEE
  ----------------------------- */
  const deleteEmployeeViaBackend = async (userId: string) => {
    const token = await getAccessToken();
    const res = await fetch(`${API_BASE}/api/corporates/${id}/employees/${userId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json?.error || "Failed to remove employee");
    return json;
  };

  const handleDeleteEmployee = async () => {
    const userId = String(confirmDeleteEmp?.user_id || "");
    if (!userId) {
      showToast({ type: "error", title: "Employee user_id missing" });
      return;
    }

    setDeletingEmp(true);
    try {
      await deleteEmployeeViaBackend(userId);
      showToast({ type: "success", title: "Employee removed" });
      setConfirmDeleteEmp(null);
      await fetchCorporate();
    } catch (err: any) {
      showToast({
        type: "error",
        title: "Failed to remove employee",
        description: err?.message || "Something went wrong",
      });
    } finally {
      setDeletingEmp(false);
    }
  };

  /* -----------------------------
     UI STATES
  ----------------------------- */
  if (loading && !corporate) {
    return (
      <div className="p-6">
        <div className="animate-pulse rounded-2xl border border-gray-200 bg-white p-6">
          <div className="h-6 w-56 rounded bg-gray-200/70" />
          <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="h-14 rounded bg-gray-200/70" />
            <div className="h-14 rounded bg-gray-200/70" />
            <div className="h-14 rounded bg-gray-200/70" />
            <div className="h-14 rounded bg-gray-200/70" />
          </div>
          <div className="mt-6 h-40 rounded bg-gray-200/70" />
        </div>
      </div>
    );
  }

  if (!corporate) {
    return (
      <div className="p-6">
        <div className="rounded-2xl border border-gray-200 bg-white p-6">
          Corporate not found.
        </div>
      </div>
    );
  }

  const employeeCount = employees.length;
  const seats = Number(corporate?.seats || 0);
  const seatsLeft = Math.max(0, seats - employeeCount);

  return (
    <>
      <div className="min-h-full bg-white">
        {/* Sticky header */}
        <div className="sticky top-0 z-20 border-b border-gray-200 bg-white/90 backdrop-blur">
          <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <Button variant="outline" className="rounded-xl" onClick={() => router.back()}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>

                <div>
                  <div className="flex items-center gap-2">
                    <div className="rounded-xl bg-gray-50 p-2 border border-gray-200">
                      <Building2 className="h-5 w-5 text-gray-800" />
                    </div>
                    <div className="text-xl font-semibold text-gray-900">{corporate.name}</div>
                    <StatusPill
                      active={!!corporate.is_active}
                      label={corporate.is_active ? "Active" : "Disabled"}
                    />
                  </div>

                  <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-gray-500">
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      {formatLocation(corporate)}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Mail className="h-3.5 w-3.5" />
                      {corporate.email ?? corporate.owner_email ?? "-"}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Phone className="h-3.5 w-3.5" />
                      {corporate.phone ?? "-"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  className="rounded-xl bg-indigo-600 text-white hover:bg-indigo-700"
                  onClick={() => setOpenAdd(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Employees
                </Button>

                <Button variant="outline" className="rounded-xl" onClick={() => setOpenUpload(true)}>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Excel
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 space-y-4">
          {/* KPI chips */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <Chip icon={Users} label="Employees" value={String(employeeCount)} />
            <Chip icon={BadgeCheck} label="Plan" value={corporate.plan ?? "-"} />
            <Chip icon={CalendarDays} label="Expiry" value={formatDate(corporate.subscription_expiry)} />
            <Chip icon={Users} label="Seats left" value={String(seatsLeft)} />
          </div>

          {/* Corporate details */}
          <Card className="w-full border border-gray-200 shadow-sm rounded-2xl">
            <CardContent className="p-6 space-y-4">
              <SectionTitle
                title="Corporate details"
                subtitle="Company and subscription information for internal admin use."
              />

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Left: Info */}
                <div className="rounded-2xl border border-gray-200 bg-white p-4">
                  <div className="text-xs font-semibold uppercase text-gray-500 mb-3">Company</div>

                  <div className="space-y-2 text-sm text-gray-700">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-gray-500">Name</span>
                      <span className="font-semibold text-gray-900 text-right">{corporate.name}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-gray-500">Email</span>
                      <span className="font-medium text-gray-900 text-right">
                        {corporate.email ?? corporate.owner_email ?? "-"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-gray-500">Phone</span>
                      <span className="font-medium text-gray-900 text-right">
                        {corporate.phone ?? "-"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-gray-500">Location</span>
                      <span className="font-medium text-gray-900 text-right">
                        {formatLocation(corporate)}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 text-xs text-gray-500">
                    <span className="font-semibold text-gray-700">Address:</span>{" "}
                    {corporate.full_address ?? "-"}
                  </div>
                </div>

                {/* Middle: Subscription */}
                <div className="rounded-2xl border border-gray-200 bg-white p-4">
                  <div className="text-xs font-semibold uppercase text-gray-500 mb-3">
                    Subscription
                  </div>

                  <div className="space-y-2 text-sm text-gray-700">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-gray-500">Plan</span>
                      <span className="font-semibold text-gray-900 text-right">{corporate.plan ?? "-"}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-gray-500">Status</span>
                      <span className="font-medium text-gray-900 text-right">
                        {corporate.subscription_status ?? "-"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-gray-500">Start</span>
                      <span className="font-medium text-gray-900 text-right">
                        {formatDate(corporate.subscription_start)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-gray-500">Expiry</span>
                      <span className="font-medium text-gray-900 text-right">
                        {formatDate(corporate.subscription_expiry)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right: Seats */}
                <div className="rounded-2xl border border-gray-200 bg-white p-4">
                  <div className="text-xs font-semibold uppercase text-gray-500 mb-3">
                    Seats allocation
                  </div>

                  <div className="space-y-2 text-sm text-gray-700">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-gray-500">Total seats</span>
                      <span className="font-semibold text-gray-900 text-right">{String(seats)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-gray-500">Employees used</span>
                      <span className="font-semibold text-gray-900 text-right">
                        {String(employeeCount)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-gray-500">Seats left</span>
                      <span className="font-semibold text-gray-900 text-right">
                        {String(seatsLeft)}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-3 text-xs text-gray-600">
                    Tip: Keep seats aligned with subscription for accurate access control.
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Employees */}
          <Card className="w-full overflow-x-auto border border-gray-200 shadow-sm rounded-2xl">
            <CardContent className="p-0">
              {/* table header bar */}
              <div className="flex items-center justify-between gap-3 p-4 border-b border-gray-200">
                <div>
                  <div className="text-sm font-semibold text-gray-900">Employees</div>
                  <div className="text-xs text-gray-500">
                    Manage employees linked to this corporate.
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" className="rounded-xl" onClick={() => setOpenUpload(true)}>
                    <Upload className="h-4 w-4 mr-2" />
                    Import
                  </Button>
                  <Button
                    className="rounded-xl bg-[#DA3224] hover:bg-[#c92b20] text-white"
                    onClick={() => setOpenAdd(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add
                  </Button>
                </div>
              </div>

              <table className="w-full border-spacing-0">
                <thead className="bg-indigo-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-[12px] font-semibold text-gray-600">
                      NAME
                    </th>
                    <th className="px-4 py-3 text-left text-[12px] font-semibold text-gray-600">
                      EMAIL
                    </th>
                    <th className="px-4 py-3 text-left text-[12px] font-semibold text-gray-600">
                      PHONE
                    </th>
                    <th className="px-4 py-3 text-left text-[12px] font-semibold text-gray-600">
                      DEPARTMENT
                    </th>
                    <th className="px-4 py-3 text-left text-[12px] font-semibold text-gray-600">
                      CREATED
                    </th>
                    <th className="px-4 py-3 text-left text-[12px] font-semibold text-gray-600">
                      ACTIONS
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {employeesPageSlice.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-10">
                        <div className="flex flex-col items-center text-center">
                          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                            <Users className="h-6 w-6 text-gray-600" />
                          </div>
                          <div className="mt-3 text-sm font-semibold text-gray-900">
                            No employees found
                          </div>
                          <div className="mt-1 text-xs text-gray-500 max-w-md">
                            Add employees manually or import from Excel to grant access under this
                            corporate.
                          </div>
                          <div className="mt-4 flex gap-2">
                            <Button
                              className="rounded-xl bg-indigo-600 text-white hover:bg-indigo-700"
                              onClick={() => setOpenAdd(true)}
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              Add Employees
                            </Button>
                            <Button
                              variant="outline"
                              className="rounded-xl"
                              onClick={() => setOpenUpload(true)}
                            >
                              <Upload className="h-4 w-4 mr-2" />
                              Upload Excel
                            </Button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    employeesPageSlice.map((e: any, idx: number) => {
                      const userId = String(e.user_id || "");
                      return (
                        <tr
                          key={userId || `${e.email}-${idx}`}
                          className="border-b border-gray-200 hover:bg-gray-50 transition cursor-pointer text-gray-700 text-sm"
                          onClick={() => {
                            if (userId) router.push(`/dashboard/users/${userId}`);
                          }}
                        >
                          <td className="px-4 py-4 font-semibold text-gray-900">
                            {e.name ?? "-"}
                            <div className="mt-1 text-xs text-gray-500">{e.designation ?? ""}</div>
                          </td>
                          <td className="px-4 py-4">{e.email ?? "-"}</td>
                          <td className="px-4 py-4">{e.phone ?? "-"}</td>
                          <td className="px-4 py-4">{e.department ?? "-"}</td>
                          <td className="px-4 py-4">{formatDate(e.created_at)}</td>

                          <td className="px-4 py-4">
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={(ev) => {
                                  ev.stopPropagation();
                                  setInfoEmp(e);
                                }}
                                className="cursor-pointer"
                              >
                                <Info className="w-4 h-4" />
                              </Button>

                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={(ev) => {
                                  ev.stopPropagation();
                                  if (userId) router.push(`/dashboard/users/${userId}`);
                                }}
                                className="cursor-pointer"
                                disabled={!userId}
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>

                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={(ev) => {
                                  ev.stopPropagation();
                                  setConfirmDeleteEmp(e);
                                }}
                                className="cursor-pointer"
                                disabled={!userId}
                              >
                                <Trash2 className="w-4 h-4 text-red-500" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>

              <div className="border-t border-gray-200">
                <PaginationBar
                  page={empPage}
                  setPage={setEmpPage}
                  totalPage={totalEmpPages}
                  totalRecord={employees.length}
                  limit={empLimit}
                  setLimit={setEmpLimit}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ------------------- ADD EMPLOYEES MODAL ------------------- */}
      <Dialog
        open={openAdd}
        onOpenChange={(v) => {
          setOpenAdd(v);
          if (!v) resetMembershipPickers();
        }}
      >
        <DialogContent className="sm:max-w-4xl bg-white border-gray-300">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Add Employees
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* ✅ Plan + dates */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="md:col-span-2">
                <label className="text-xs font-semibold text-gray-600">Plan</label>
                <select
                  className="mt-1 h-10 w-full rounded-xl border border-gray-300 bg-white px-3 text-sm focus:outline-none"
                  value={selectedPlanId}
                  onChange={(e) => {
                    const pid = e.target.value;
                    setSelectedPlanId(pid);
                    const p = plans.find((x) => x.id === pid);
                    setSelectedPlanName(p?.plan_name || "");
                  }}
                >
                  <option value="">Select plan</option>
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.plan_name} • {p.type} • ₹{p.amount}
                    </option>
                  ))}
                </select>
                <div className="mt-1 text-[11px] text-gray-500">
                  Applies to all employees (unless Excel row has its own plan).
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-600">Start</label>
                <Input
                  className={inputClass}
                  type="date"
                  value={membershipStart}
                  onChange={(e) => setMembershipStart(e.target.value)}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-600">Expiry</label>
                <Input
                  className={inputClass}
                  type="date"
                  value={membershipExpiry}
                  onChange={(e) => setMembershipExpiry(e.target.value)}
                />
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                variant="outline"
                className="rounded-xl"
                onClick={() =>
                  setNewEmployees((prev) => [
                    ...prev,
                    { name: "", email: "", phone: "", password: "", department: "", designation: "" },
                  ])
                }
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Row
              </Button>
            </div>

            <div className="space-y-3 max-h-[55vh] overflow-auto pr-1">
              {newEmployees.map((row, idx) => (
                <div key={idx} className="rounded-2xl border border-gray-200 p-4 bg-white">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-sm font-semibold text-gray-900">Employee #{idx + 1}</div>

                    <div className="flex items-center gap-2">
                      {idx === 0 ? (
                        <button
                          type="button"
                          className="text-xs text-gray-500 hover:text-gray-800"
                          onClick={() => setShowPasswords((v) => !v)}
                        >
                          {showPasswords ? "Hide passwords" : "Show passwords"}
                        </button>
                      ) : null}

                      {newEmployees.length > 1 && (
                        <button
                          className="text-gray-500 hover:text-gray-800"
                          onClick={() => setNewEmployees((prev) => prev.filter((_, i) => i !== idx))}
                          type="button"
                          title="Remove row"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Input
                      className={inputClass}
                      placeholder="Full name"
                      value={row.name}
                      onChange={(e) => {
                        const v = e.target.value;
                        setNewEmployees((prev) => prev.map((p, i) => (i === idx ? { ...p, name: v } : p)));
                      }}
                    />

                    <Input
                      className={inputClass}
                      placeholder="Email"
                      value={row.email}
                      onChange={(e) => {
                        const v = e.target.value;
                        setNewEmployees((prev) =>
                          prev.map((p, i) => (i === idx ? { ...p, email: v } : p))
                        );
                      }}
                    />

                    <Input
                      className={inputClass}
                      placeholder="Phone"
                      value={row.phone}
                      onChange={(e) => {
                        const v = e.target.value;
                        setNewEmployees((prev) =>
                          prev.map((p, i) => (i === idx ? { ...p, phone: v } : p))
                        );
                      }}
                    />

                    <div className="relative">
                      <Input
                        className={`${inputClass} pr-10`}
                        placeholder="Password (min 6)"
                        type={showPasswords ? "text" : "password"}
                        value={row.password}
                        onChange={(e) => {
                          const v = e.target.value;
                          setNewEmployees((prev) =>
                            prev.map((p, i) => (i === idx ? { ...p, password: v } : p))
                          );
                        }}
                      />
                      <button
                        type="button"
                        className="absolute inset-y-0 right-3 flex items-center text-gray-400"
                        onClick={() => setShowPasswords((v) => !v)}
                        aria-label={showPasswords ? "Hide passwords" : "Show passwords"}
                      >
                        {showPasswords ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>

                    <Input
                      className={inputClass}
                      placeholder="Department (optional)"
                      value={row.department || ""}
                      onChange={(e) => {
                        const v = e.target.value;
                        setNewEmployees((prev) =>
                          prev.map((p, i) => (i === idx ? { ...p, department: v } : p))
                        );
                      }}
                    />

                    <Input
                      className={inputClass}
                      placeholder="Designation (optional)"
                      value={row.designation || ""}
                      onChange={(e) => {
                        const v = e.target.value;
                        setNewEmployees((prev) =>
                          prev.map((p, i) => (i === idx ? { ...p, designation: v } : p))
                        );
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter className="mt-2">
            <Button variant="outline" className="rounded-xl" onClick={() => setOpenAdd(false)} disabled={creating}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateEmployees}
              disabled={creating}
              className="rounded-xl bg-[#DA3224] hover:bg-[#c92b20] text-white"
            >
              {creating ? "Creating..." : "Create Employees"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ------------------- UPLOAD EXCEL MODAL ------------------- */}
      <Dialog
        open={openUpload}
        onOpenChange={(v) => {
          setOpenUpload(v);
          if (!v) {
            setExcelRows([]);
            setExcelFileName("");
            setExcelError("");
            setParsingExcel(false);
            resetMembershipPickers();
            if (fileInputRef.current) fileInputRef.current.value = "";
          }
        }}
      >
        <DialogContent className="sm:max-w-4xl bg-white border-gray-300">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Import employees from Excel
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 text-xs text-gray-600">
              Supported columns: <b>name</b>, <b>email</b>, <b>phone</b>, <b>password</b>
              (optional: department, designation, <b>plan</b>/<b>plan_name</b>)
            </div>

            {/* ✅ Plan + dates for Excel (applies when row plan missing) */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="md:col-span-2">
                <label className="text-xs font-semibold text-gray-600">Default Plan</label>
                <select
                  className="mt-1 h-10 w-full rounded-xl border border-gray-300 bg-white px-3 text-sm focus:outline-none"
                  value={selectedPlanId}
                  onChange={(e) => {
                    const pid = e.target.value;
                    setSelectedPlanId(pid);
                    const p = plans.find((x) => x.id === pid);
                    setSelectedPlanName(p?.plan_name || "");
                  }}
                >
                  <option value="">Select plan</option>
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.plan_name} • {p.type} • ₹{p.amount}
                    </option>
                  ))}
                </select>
                <div className="mt-1 text-[11px] text-gray-500">
                  Used if Excel row doesn’t have plan/plan_name.
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-600">Start</label>
                <Input
                  className={inputClass}
                  type="date"
                  value={membershipStart}
                  onChange={(e) => setMembershipStart(e.target.value)}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-600">Expiry</label>
                <Input
                  className={inputClass}
                  type="date"
                  value={membershipExpiry}
                  onChange={(e) => setMembershipExpiry(e.target.value)}
                />
              </div>
            </div>

            {/* hidden input */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;

                setExcelFileName(f.name);
                await parseExcel(f);

                e.target.value = "";
              }}
            />

            <div className="flex items-center justify-between gap-3">
              <Button type="button" variant="outline" className="rounded-xl" onClick={() => fileInputRef.current?.click()}>
                <Upload className="h-4 w-4 mr-2" />
                Choose Excel file
              </Button>

              {!!excelFileName && (
                <div className="text-xs text-gray-600">
                  Selected: <span className="font-semibold">{excelFileName}</span>
                </div>
              )}
            </div>

            {excelError ? (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                {excelError}
              </div>
            ) : null}

            {parsingExcel ? (
              <div className="text-sm text-gray-600">Parsing file...</div>
            ) : excelRows.length ? (
              <div className="rounded-2xl border border-gray-200 overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-indigo-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-[12px] font-semibold text-gray-600">NAME</th>
                      <th className="px-4 py-3 text-left text-[12px] font-semibold text-gray-600">EMAIL</th>
                      <th className="px-4 py-3 text-left text-[12px] font-semibold text-gray-600">PHONE</th>
                      <th className="px-4 py-3 text-left text-[12px] font-semibold text-gray-600">DEPT</th>
                      <th className="px-4 py-3 text-left text-[12px] font-semibold text-gray-600">DESIG</th>
                      <th className="px-4 py-3 text-left text-[12px] font-semibold text-gray-600">PLAN</th>
                    </tr>
                  </thead>

                  <tbody className="bg-white divide-y divide-gray-200">
                    {excelRows.slice(0, 12).map((r, i) => (
                      <tr key={i}>
                        <td className="px-4 py-3 text-sm text-gray-700">{r.name}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{r.email}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{r.phone}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{r.department || "-"}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{r.designation || "-"}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{(r as any).plan || selectedPlanName || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="p-3 text-xs text-gray-500">
                  Showing first {Math.min(12, excelRows.length)} of {excelRows.length} rows.
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center">
                <div className="mx-auto w-fit rounded-2xl border border-gray-200 bg-gray-50 p-4">
                  <Upload className="h-6 w-6 text-gray-600" />
                </div>
                <div className="mt-3 text-sm font-semibold text-gray-900">Upload your Excel sheet</div>
                <div className="mt-1 text-xs text-gray-500">
                  We’ll preview the first rows before creating users.
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="mt-2">
            <Button variant="outline" className="rounded-xl" onClick={() => setOpenUpload(false)} disabled={creating}>
              Cancel
            </Button>

            <Button
              onClick={handleUploadCreate}
              disabled={creating || parsingExcel || !excelRows.length}
              className="rounded-xl bg-[#DA3224] hover:bg-[#c92b20] text-white"
            >
              {creating ? "Creating..." : "Create From Excel"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ------------------- EMPLOYEE INFO MODAL ------------------- */}
      <Modal isOpen={!!infoEmp} onClose={() => setInfoEmp(null)}>
        <div className="p-6 space-y-3">
          <div className="flex items-center gap-2">
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-2">
              <Users className="h-5 w-5 text-gray-700" />
            </div>
            <div>
              <div className="text-lg font-semibold text-gray-900">{infoEmp?.name ?? "Employee"}</div>
              <div className="text-xs text-gray-500">
                {infoEmp?.designation ?? "—"} {infoEmp?.department ? `• ${infoEmp.department}` : ""}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-4 text-sm text-gray-700 space-y-2">
            <div className="flex justify-between gap-3">
              <span className="text-gray-500">Email</span>
              <span className="font-medium text-gray-900">{infoEmp?.email ?? "-"}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-gray-500">Phone</span>
              <span className="font-medium text-gray-900">{infoEmp?.phone ?? "-"}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-gray-500">User ID</span>
              <span className="font-mono text-xs text-gray-900">{infoEmp?.user_id ?? "-"}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-gray-500">Created</span>
              <span className="font-medium text-gray-900">{formatDate(infoEmp?.created_at)}</span>
            </div>
          </div>
        </div>
      </Modal>

      {/* ------------------- DELETE EMPLOYEE CONFIRM MODAL ------------------- */}
      <Modal isOpen={!!confirmDeleteEmp} onClose={() => setConfirmDeleteEmp(null)}>
        <div className="p-6">
          <div className="text-lg font-semibold text-gray-900">Remove employee?</div>
          <div className="mt-1 text-sm text-gray-600">This will unlink the employee from this corporate.</div>

          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
            This does not permanently delete the auth user unless your backend route does that.
          </div>

          <div className="mt-6 flex justify-end gap-2">
            <Button variant="outline" className="rounded-xl" onClick={() => setConfirmDeleteEmp(null)} disabled={deletingEmp}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteEmployee}
              disabled={deletingEmp}
              className="rounded-xl bg-red-700 hover:bg-red-600 text-white"
            >
              {deletingEmp ? "Removing..." : "Remove"}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
