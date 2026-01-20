"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SearchAndFilter } from "@/components/userComponents/SearchAndFilter";
import ComingSoon from "@/components/ui/coming-soon";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import { showToast } from "@/hooks/useToast";
import { Plus, EyeOff, Eye, Trash2, Info, Pencil } from "lucide-react";

import Modal from "@/app/dashboard/_components/Modal";
import PaginationBar from "@/app/dashboard/_components/Pagination";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const ITEMS_PER_PAGE = 10;
const inputClass = "border border-gray-300 focus:border-gray-400 focus:ring-0";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ||
  "http://localhost:8000";

function useDebounced<T>(value: T, ms = 350) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

/* -------------------------- SKELETON (LOADING ONLY) -------------------------- */

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-gray-200/70 ${className}`} />;
}

function CorporatesTableSkeleton() {
  return (
    <div className="p-4">
      <div className="mb-4 flex items-center justify-between">
        <Skeleton className="h-5 w-44" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-28 rounded-xl" />
          <Skeleton className="h-9 w-24 rounded-xl" />
        </div>
      </div>

      <div className="grid grid-cols-12 gap-3 border-b border-gray-100 pb-3">
        <Skeleton className="col-span-4 h-4 w-28" />
        <Skeleton className="col-span-3 h-4 w-24" />
        <Skeleton className="col-span-3 h-4 w-20" />
        <Skeleton className="col-span-2 h-4 w-20" />
      </div>

      <div className="mt-3 space-y-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="grid grid-cols-12 items-center gap-3 rounded-xl border border-gray-100 bg-white p-3"
          >
            <div className="col-span-4 space-y-2">
              <Skeleton className="h-4 w-44" />
              <Skeleton className="h-3 w-28" />
            </div>
            <div className="col-span-3">
              <Skeleton className="h-4 w-40" />
            </div>
            <div className="col-span-3">
              <Skeleton className="h-4 w-28" />
            </div>
            <div className="col-span-2">
              <Skeleton className="h-4 w-20" />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-5 flex items-center justify-between">
        <Skeleton className="h-4 w-40" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-24 rounded-xl" />
          <Skeleton className="h-9 w-24 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

/* -------------------------- TYPES -------------------------- */

type CorporateRow = {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  city?: string | null;
  area?: string | null;
  full_address?: string | null;

  owner_user_id: string;
  owner_email?: string | null;

  // keep optional if your table still has it
  plan?: string | null;

  is_active: boolean;
  created_at: string;
};

async function getAccessToken() {
  const { data, error } = await supabaseBrowser.auth.getSession();
  if (error) throw error;
  const token = data.session?.access_token;
  if (!token) throw new Error("Not logged in. Please login as admin/superadmin.");
  return token;
}

/* -------------------------- API HELPERS -------------------------- */

// 1) Create corporate-admin Auth user via /api/auth/create-user
async function createAuthUserViaBackend(payload: {
  email: string;
  password: string;
  full_name?: string;
  phone?: string;
  role: string; // "corporateadmin"
}) {
  const token = await getAccessToken();

  const res = await fetch(`${API_BASE}/api/auth/create-user`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  const json = await res.json();
  if (!res.ok) throw new Error(json?.error || "Failed to create auth user");

  const userId = json?.user?.id;
  const email = json?.user?.email || payload.email;

  if (!userId) throw new Error("User id missing from /api/auth/create-user response");
  return { id: userId as string, email: email as string };
}

// 2) Create corporate row via /api/corporates (NO auth creation here)
async function createCorporateViaBackend(payload: any) {
  const token = await getAccessToken();

  const res = await fetch(`${API_BASE}/api/corporates`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  const json = await res.json();
  if (!res.ok) throw new Error(json?.error || "Failed to create corporate");
  return json.corporate;
}

export default function CorporatePage() {
  const router = useRouter();

  const [searchTerm, setSearchTerm] = useState("");
  const [corporates, setCorporates] = useState<CorporateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(ITEMS_PER_PAGE);
  const [refresh, setRefresh] = useState<any>(null);

  const debouncedSearch = useDebounced(searchTerm);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(total / limit)),
    [total, limit]
  );

  /* -------------------------- CREATE MODAL -------------------------- */

  const [openCreate, setOpenCreate] = useState(false);
  const [creating, setCreating] = useState(false);

  const [corporateEmail, setCorporateEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [form, setForm] = useState({
    name: "",
    phone: "",
    city: "",
    area: "",
    full_address: "",
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => setForm({ ...form, [e.target.name]: e.target.value });

  const resetCreateForm = () => {
    setCorporateEmail("");
    setPassword("");
    setShowPassword(false);
    setForm({
      name: "",
      phone: "",
      city: "",
      area: "",
      full_address: "",
    });
  };

  const handleCreateCorporate = async () => {
    if (!form.name.trim()) {
      showToast({ type: "error", title: "Corporate name is required" });
      return;
    }
    if (!corporateEmail || !password) {
      showToast({ type: "error", title: "Corporate email & password are required" });
      return;
    }
    if (password.length < 6) {
      showToast({ type: "error", title: "Password must be at least 6 characters" });
      return;
    }

    setCreating(true);
    try {
      // ✅ STEP 1: create Auth user via /api/auth/create-user (also should insert into public.users with role corporateadmin)
      const authUser = await createAuthUserViaBackend({
        email: corporateEmail.trim(),
        password,
        full_name: form.name.trim(),
        phone: form.phone || undefined,
        role: "corporateadmin",
      });

      // ✅ STEP 2: create corporate row via /api/corporates (only basic details + link)
      await createCorporateViaBackend({
        name: form.name.trim(),
        phone: form.phone || null,
        email: corporateEmail.trim(),

        city: form.city || null,
        area: form.area || null,
        full_address: form.full_address || null,

        owner_user_id: authUser.id,
        owner_email: authUser.email,

        // optional defaults if your backend/table expects these
        is_active: true,
      });

      showToast({
        type: "success",
        title: "Corporate created",
        description:
          "Login created via /api/auth/create-user and corporate saved via /api/corporates.",
      });

      setOpenCreate(false);
      resetCreateForm();
      setPage(1);
      setRefresh(Date.now());
    } catch (err: any) {
      console.error(err);
      showToast({
        type: "error",
        title: "Failed to create corporate",
        description:
          err?.message ||
          "Auth user might be created but corporate insert failed. Add cleanup/rollback if needed.",
      });
    } finally {
      setCreating(false);
    }
  };

  /* -------------------------- FETCH CORPORATES -------------------------- */

  useEffect(() => {
    const fetchCorporates = async () => {
      setLoading(true);

      let query = supabaseBrowser
        .from("corporate")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .range((page - 1) * limit, page * limit - 1);

      if (debouncedSearch) {
        query = query.or(
          `name.ilike.%${debouncedSearch}%,city.ilike.%${debouncedSearch}%,area.ilike.%${debouncedSearch}%,email.ilike.%${debouncedSearch}%,owner_email.ilike.%${debouncedSearch}%`
        );
      }

      const { data, error, count } = await query;

      if (error) {
        showToast({
          type: "error",
          title: "Failed to load corporates",
          description: error.message,
        });
        setCorporates([]);
        setTotal(0);
      } else {
        setCorporates((data as any) || []);
        setTotal(count || 0);
      }

      setLoading(false);
    };

    fetchCorporates();
  }, [page, limit, debouncedSearch, refresh]);

  return (
    <>
      <div className="space-y-4">
        <SearchAndFilter
          searchTerm={searchTerm}
          onSearchChange={(v) => {
            setSearchTerm(v);
            setPage(1);
          }}
          variant="search-only"
          placeholder="Search corporates by name, city, or area..."
        />

        <Card className="w-full overflow-x-auto border border-gray-200 shadow-sm">
          <CardContent className="p-0">
            {loading ? (
              <CorporatesTableSkeleton />
            ) : corporates.length === 0 ? (
              <div className="p-6">
                <ComingSoon />
              </div>
            ) : (
              <CorporateTable
                corporates={corporates}
                page={page}
                totalPages={totalPages}
                totalRecord={total}
                limit={limit}
                setPage={setPage}
                setLimit={setLimit}
                setRefresh={setRefresh}
                onRowClick={(id) => {
                  if (!id) return;
                  router.push(`/dashboard/manage-corporates/${id}`);
                }}
              />
            )}
          </CardContent>
        </Card>
      </div>

      <Button
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full bg-indigo-600 text-white shadow-lg hover:bg-indigo-700"
        onClick={() => setOpenCreate(true)}
      >
        <Plus className="h-6 w-6" />
      </Button>

      <Dialog
        open={openCreate}
        onOpenChange={(v) => {
          setOpenCreate(v);
          if (!v) resetCreateForm();
        }}
      >
        <DialogContent className="sm:max-w-2xl bg-white border-gray-300">
          <DialogHeader>
            <DialogTitle>Create Corporate</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            <section className="space-y-3">
              <p className="text-xs font-medium uppercase text-gray-500">Corporate Details</p>

              <Input
                className={inputClass}
                name="name"
                placeholder="Corporate name"
                value={form.name}
                onChange={handleChange}
              />

              <div className="grid grid-cols-2 gap-3">
                <Input
                  className={inputClass}
                  name="phone"
                  placeholder="Phone"
                  value={form.phone}
                  onChange={handleChange}
                />
                <Input
                  className={inputClass}
                  type="email"
                  placeholder="Corporate email (login email)"
                  value={corporateEmail}
                  onChange={(e) => setCorporateEmail(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Input
                  className={inputClass}
                  name="city"
                  placeholder="City"
                  value={form.city}
                  onChange={handleChange}
                />
                <Input
                  className={inputClass}
                  name="area"
                  placeholder="Area"
                  value={form.area}
                  onChange={handleChange}
                />
              </div>

              <Textarea
                className={inputClass}
                name="full_address"
                placeholder="Full address"
                value={form.full_address}
                onChange={handleChange}
              />
            </section>

            <section className="space-y-3">
              <p className="text-xs font-medium uppercase text-gray-500">Login Password</p>

              <div className="relative">
                <Input
                  className="pr-10 border border-gray-300 focus:border-gray-400 focus:ring-0"
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-3 flex items-center text-gray-400"
                  onClick={() => setShowPassword((v) => !v)}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              <p className="text-xs text-gray-500">
                Step 1 creates login via <code>/api/auth/create-user</code>. Step 2 saves corporate
                via <code>/api/corporates</code>.
              </p>
            </section>
          </div>

          <DialogFooter className="mt-2">
            <Button
              variant="outline"
              onClick={() => {
                setOpenCreate(false);
                resetCreateForm();
              }}
              disabled={creating}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateCorporate}
              disabled={creating}
              className="bg-[#DA3224] hover:bg-[#c92b20] text-white"
            >
              {creating ? "Creating..." : "Create Corporate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/* -----------------------------------------------------------------------------
   CorporateTable (unchanged)
----------------------------------------------------------------------------- */

function CorporateTable({
  corporates,
  page,
  totalPages,
  totalRecord,
  limit,
  setPage,
  setLimit,
  setRefresh,
  onRowClick,
}: {
  corporates: CorporateRow[];
  page: number;
  totalPages: number;
  totalRecord: number;
  limit: number;
  setPage: React.Dispatch<React.SetStateAction<number>>;
  setLimit: React.Dispatch<React.SetStateAction<number>>;
  setRefresh: (v: any) => void;
  onRowClick?: (id: string) => void;
}) {
  const router = useRouter();

  const [selected, setSelected] = useState<CorporateRow | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<CorporateRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const formatLocation = (c: CorporateRow) => {
    const parts = [c.area, c.city].filter(Boolean);
    return parts.length ? parts.join(", ") : "-";
  };

  const handleDelete = async () => {
    if (!confirmDelete?.id) {
      showToast({ type: "error", title: "Invalid corporate selected" });
      return;
    }

    setDeleting(true);

    const { error } = await supabaseBrowser
      .from("corporate")
      .delete()
      .eq("id", confirmDelete.id);

    if (error) {
      showToast({ type: "error", title: "Delete failed", description: error.message });
    } else {
      showToast({ type: "success", title: "Corporate deleted" });
      setRefresh(Date.now());
    }

    setDeleting(false);
    setConfirmDelete(null);
  };

  return (
    <>
      <table className="w-full border-spacing-0">
        <thead className="bg-indigo-100">
          <tr>
            <th className="px-4 py-3 text-left text-[12px] font-semibold text-gray-600">NAME</th>
            <th className="px-4 py-3 text-left text-[12px] font-semibold text-gray-600">LOCATION</th>
            <th className="px-4 py-3 text-left text-[12px] font-semibold text-gray-600">EMAIL</th>
            <th className="px-4 py-3 text-left text-[12px] font-semibold text-gray-600">PLAN</th>
            <th className="px-4 py-3 text-left text-[12px] font-semibold text-gray-600">STATUS</th>
            <th className="px-4 py-3 text-left text-[12px] font-semibold text-gray-600">ACTIONS</th>
          </tr>
        </thead>

        <tbody>
          {corporates.map((c) => {
            if (!c.id) return null;

            return (
              <tr
                key={c.id}
                className="border-b border-gray-300 hover:bg-gray-50 transition cursor-pointer text-gray-600 text-sm"
                onClick={() => onRowClick?.(c.id)}
              >
                <td className="px-4 py-4 font-medium">{c.name}</td>
                <td className="px-4 py-4">{formatLocation(c)}</td>
                <td className="px-4 py-4">{c.email ?? c.owner_email ?? "-"}</td>
                <td className="px-4 py-4">{c.plan ?? "-"}</td>
                <td className="px-4 py-4">
                  {c.is_active === false ? (
                    <span className="text-xs font-semibold text-red-600">Disabled</span>
                  ) : (
                    <span className="text-xs font-semibold text-green-700">Active</span>
                  )}
                </td>

                <td className="px-4 py-4">
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelected(c);
                      }}
                    >
                      <Info className="w-4 h-4" />
                    </Button>

                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/dashboard/corporate/${c.id}`);
                      }}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>

                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfirmDelete(c);
                      }}
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <PaginationBar
        page={page}
        setPage={setPage}
        totalPage={totalPages}
        totalRecord={totalRecord}
        limit={limit}
        setLimit={setLimit}
      />

      <Modal isOpen={!!selected} onClose={() => setSelected(null)}>
        <div className="p-6 space-y-2">
          <h2 className="text-xl font-semibold">{selected?.name}</h2>
          <p><b>Email:</b> {selected?.email ?? selected?.owner_email ?? "-"}</p>
          <p><b>Phone:</b> {selected?.phone || "-"}</p>
          <p><b>Location:</b> {selected ? formatLocation(selected) : "-"}</p>
          <p><b>Full Address:</b> {selected?.full_address || "-"}</p>
          <p><b>Plan:</b> {selected?.plan || "-"}</p>
          <p><b>Status:</b> {selected?.is_active === false ? "Disabled" : "Active"}</p>
        </div>
      </Modal>

      <Modal isOpen={!!confirmDelete} onClose={() => setConfirmDelete(null)}>
        <h2 className="text-lg font-semibold mb-4">Delete corporate?</h2>
        <div className="flex justify-end gap-2">
          <Button
            variant="secondary"
            onClick={() => setConfirmDelete(null)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={deleting}
            className="bg-red-700 hover:bg-red-600 text-white"
          >
            {deleting ? "Deleting..." : "Delete"}
          </Button>
        </div>
      </Modal>
    </>
  );
}
