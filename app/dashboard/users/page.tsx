"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
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
import { Plus, Download, Users } from "lucide-react";

type Seminar = {
  fullname: string;
  email: string;
  phone: string;
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
  const [planFilter, setPlanFilter] = useState("");   // optional, if you store plan on users.subscription
  const [statusFilter, setStatusFilter] = useState(""); // optional, if you store status on users.status
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newUser, setNewUser] = useState<Seminar>({ fullname: "", email: "", phone: "" });

  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [limit, setLimit] = useState(ITEMS_PER_PAGE);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [deleteRefresh, setDeleteRefresh] = useState<any>(null);

  const debouncedSearch = useDebounced(searchTerm, 350);
  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / limit)), [total, limit]);

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      setError(null);
      try {
        let query = supabaseBrowser
          .from("users")
          .select("*", { count: "exact" })
          .eq("role", "user")
          .order("created_at", { ascending: false })
          .range((page - 1) * limit, page * limit - 1);

        if (debouncedSearch) {
          query = query.or(
            `email.ilike.%${debouncedSearch}%,display_name.ilike.%${debouncedSearch}%,phone.ilike.%${debouncedSearch}%`
          );
        }

        // These two are optional—only apply if your users table actually has those columns.
        if (statusFilter && statusFilter !== "all") query = query.eq("status", statusFilter);
        if (planFilter && planFilter !== "all") query = query.eq("subscription", planFilter);

        const { data, error, count } = await query;
        if (error) throw error;

        setUsers(data || []);
        setTotal(count || 0);
      } catch (err: any) {
        console.error(err);
        setError(err?.message || "Failed to fetch users");
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, [page, limit, debouncedSearch, planFilter, statusFilter, deleteRefresh]);

  const handleExportFile = async () => {
    try {
      const { data, error } = await supabaseBrowser
        .from("users")
        .select("*")
        .eq("role", "user")
        .order("created_at", { ascending: false });
      if (error) throw error;
      await exportToExcel(data || [], "users");
    } catch (err) {
      showToast({ title: "Error", description: "Export failed." });
    }
  };

  return (
    <>

      {/* Filters + Table */}
      <div className="space-y-4">
        <SearchAndFilter
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          planFilter={planFilter}
          onPlanFilterChange={setPlanFilter}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
        />

        <Card className="border border-gray-200 shadow-sm w-full overflow-x-auto">
          <CardContent className="p-0">
            {loading ? (
              <div className="p-4">
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
          </CardContent>
        </Card>
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
                onChange={(val: any) => {
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
    </>
  );
}

export default UsersPage;
