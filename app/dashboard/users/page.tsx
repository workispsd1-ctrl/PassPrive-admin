"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { LoadingSkeleton } from "@/components/userComponents/LoadingSkeleton";
import { SearchAndFilter } from "@/components/userComponents/SearchAndFilter";
import { UserTable } from "@/components/userComponents/UserTable";
import ComingSoon from "@/components/ui/coming-soon";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import PhoneInput from "react-phone-input-2";
import { showToast } from "@/hooks/useToast";
import { exportToExcel } from "@/lib/exportToExcel";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";

type Seminar = {
  fullname: string;
  email: string;
  phone: string;
};

type UserRow = {
  id: string;
  full_name?: string | null;
  email: string;
  phone?: string | null;
  role: string;
  created_at?: string | null;
  last_opened?: string | null;
  membership?: string | null;
  membership_tier?: string | null;
  membership_started?: string | null;
  membership_expiry?: string | null;
};

const ITEMS_PER_PAGE = 10;

function useDebounced<T>(value: T, ms = 350) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

function UsersPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [planFilter, setPlanFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newUser, setNewUser] = useState<Seminar>({ fullname: "", email: "", phone: "" });

  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [limit, setLimit] = useState(ITEMS_PER_PAGE);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [deleteRefresh, setDeleteRefresh] = useState<number | null>(null);

  const debouncedSearch = useDebounced(searchTerm, 350);
  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / limit)), [total, limit]);

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      setError(null);
      try {
        let query = supabaseBrowser
          .from("users")
          .select(
            "id, full_name, email, phone, role, created_at, last_opened, membership, membership_tier, membership_started, membership_expiry",
            { count: "exact" }
          )
          .eq("role", "user")
          .order("created_at", { ascending: false })
          .range((page - 1) * limit, page * limit - 1);

        if (debouncedSearch) {
          query = query.or(
            `email.ilike.%${debouncedSearch}%,full_name.ilike.%${debouncedSearch}%,phone.ilike.%${debouncedSearch}%`
          );
        }

        if (planFilter && planFilter !== "all") {
          if (planFilter.toLowerCase() === "free") {
            query = query.eq("membership_tier", "none");
          } else {
            query = query.eq("membership_tier", planFilter);
          }
        }

        const { data, error, count } = await query;
        if (error) throw error;

        setUsers((data as UserRow[]) || []);
        setTotal(count || 0);
      } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : "Failed to fetch users");
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, [page, limit, debouncedSearch, planFilter, deleteRefresh]);

  const handleExportFile = async () => {
    try {
      const { data, error } = await supabaseBrowser
        .from("users")
        .select("*")
        .eq("role", "user")
        .order("created_at", { ascending: false });
      if (error) throw error;
      await exportToExcel(data || [], "users");
    } catch {
      showToast({ title: "Error", description: "Export failed." });
    }
  };

  const [sidebarOpen, setSidebarOpen] = useState(true);

  const handleToggleSidebar = () => {
    window.dispatchEvent(new Event("dashboard-toggle-sidebar"));
    setSidebarOpen((prev) => !prev);
  };

  return (
    <>
      <div className="min-h-full w-full space-y-4">
        <div className="flex h-14 items-center justify-between">
          <div className="flex items-center">
            <button
              type="button"
              onClick={handleToggleSidebar}
              aria-label="Toggle sidebar"
              className="mr-2 rounded-md p-1 text-[#5b6473] transition hover:bg-white/70"
            >
              {sidebarOpen ? (
                <ChevronLeft className="h-5 w-5" />
              ) : (
                <ChevronRight className="h-5 w-5" />
              )}
            </button>
            <h1 className="text-[22px] font-semibold leading-[28px] tracking-[0px] text-[#000000]">User Management</h1>
          </div>
          <div className="flex items-center gap-3 text-[#1f2a37]">
            <button
              type="button"
              className="rounded-md p-1.5 transition hover:bg-white/70"
              aria-label="Download"
            >
              <Image
                src="/download.png"
                alt="Download"
                width={16}
                height={16}
                className="h-4 w-4 object-contain"
              />
            </button>
            <button
              type="button"
              className="rounded-md p-1.5 transition hover:bg-white/70"
              aria-label="Refresh"
            >
              <Image
                src="/refresh.png"
                alt="Refresh"
                width={16}
                height={16}
                className="h-4 w-4 object-contain"
              />
            </button>
            <div className="flex items-center gap-2 rounded-full bg-white/70 px-2 py-[2px]">
              <div className="h-7 w-7 rounded-full bg-[#929292]" />
              <span className="text-[14px] font-normal leading-[20px] text-[#314158]">
                Super Admin
              </span>
            </div>
          </div>
        </div>

      {/* Filters + Table */}
      <div className="min-h-full space-y-6 p-6 bg-[#FFFFFF]">
        <SearchAndFilter
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          planFilter={planFilter}
          onPlanFilterChange={setPlanFilter}
          placeholder="Search by name, email, or phone no..."

        />

        <div className="w-full overflow-x-auto bg-white rounded-lg border border-gray-200 shadow-sm">
          {loading ? (
            <div className="p-6">
              <LoadingSkeleton />
            </div>
          ) : error ? (
            <div className="p-6">
              <ComingSoon />
            </div>
          ) : (
            <UserTable
              users={users || []}
              handleExportFile={handleExportFile}
              setPage={setPage}
              page={page}
              totalPages={totalPages}
              limit={limit}
              totalRecord={total}
              setLimit={setLimit}
              setDeleteRefresh={setDeleteRefresh}
            />
          )}
        </div>
      </div>

      {/* Create user dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Create New User</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">Full Name</label>
              <Input
                value={newUser.fullname}
                onChange={(e) => setNewUser({ ...newUser, fullname: e.target.value })}
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Email</label>
              <Input
                type="email"
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                required
              />
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-600">WhatsApp Number</label>
              <PhoneInput
                country="in"
                value={newUser.phone}
                onChange={(val: string) => {
                  const finalVal = val.startsWith("+") ? val : `+${val}`;
                  setNewUser({ ...newUser, phone: finalVal });
                }}
                inputClass="!w-full !h-11 !text-sm !border !border-gray-300 !rounded-md focus:ring-2 focus:ring-primary"
                buttonClass="!border-gray-300"
                enableSearch
              />
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button
              disabled={saving}
              onClick={async () => {
                setSaving(true);
                if (!newUser.phone || !newUser.email || !newUser.fullname) {
                  setSaving(false);
                  showToast({ title: "Error", description: "All fields are required." });
                  return;
                }
                const { error } = await supabaseBrowser.from("users").insert({
                  id: crypto.randomUUID(),
                  phone: newUser.phone,
                  display_name: newUser.fullname,
                  full_name: newUser.fullname,
                  email: newUser.email,
                  role: "user",
                  created_at: new Date().toISOString(),
                });
                if (error) {
                  setSaving(false);
                  showToast({ title: "Error", description: "Save failed." });
                  return;
                }
                setDialogOpen(false);
                setNewUser({ fullname: "", email: "", phone: "" });
                setSaving(false);
                // quick refresh
                setDeleteRefresh(Date.now());
              }}
            >
              {saving ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </>
  );
}

export default UsersPage;
