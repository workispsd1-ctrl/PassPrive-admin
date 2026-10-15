"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { showToast } from "@/hooks/useToast";
import {
  addBranchAdmin,
  fetchRestaurantAccess,
  findMasterByEmail,
  removeBranchAdmin,
  setRestaurantMaster,
  type RestaurantAccess,
} from "@/lib/restaurantAccess";

const inputClass = "border border-gray-300 focus:border-gray-400 focus:ring-0 bg-white";

export default function RestaurantAccessPanel({ restaurantId }: { restaurantId: string }) {
  const [access, setAccess] = useState<RestaurantAccess | null>(null);
  const [masterEmail, setMasterEmail] = useState("");
  const [admin, setAdmin] = useState({ full_name: "", email: "", password: "" });
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setAccess(await fetchRestaurantAccess(restaurantId));
    } catch (error: unknown) {
      showToast({ type: "error", title: "Failed to load access", description: error instanceof Error ? error.message : "" });
    }
  }, [restaurantId]);

  useEffect(() => {
    void load();
  }, [load]);

  const run = async (task: () => Promise<unknown>, success: string) => {
    setBusy(true);
    try {
      await task();
      showToast({ type: "success", title: success });
      await load();
      return true;
    } catch (error: unknown) {
      showToast({ type: "error", title: "Could not save", description: error instanceof Error ? error.message : "" });
      return false;
    } finally {
      setBusy(false);
    }
  };

  const assignMaster = async () => {
    const ok = await run(async () => {
      const master = await findMasterByEmail(masterEmail);
      await setRestaurantMaster(restaurantId, master.id);
    }, "Master account updated");
    if (ok) setMasterEmail("");
  };

  const createBranchAdmin = async () => {
    if (!admin.full_name.trim() || !admin.email.trim() || admin.password.length < 8) {
      showToast({ type: "error", title: "Name, email and an 8+ character password are required" });
      return;
    }
    const ok = await run(() => addBranchAdmin(restaurantId, admin), "Branch partner login created");
    if (ok) setAdmin({ full_name: "", email: "", password: "" });
  };

  if (!access) return <p className="text-sm text-muted-foreground">Loading access...</p>;

  const siblings = access.branches.filter((b) => b.id !== restaurantId);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="text-sm font-medium">Master account</p>
        <p className="text-xs text-muted-foreground">
          The master (brand owner) manages every branch below from one partner login.
        </p>
        <div className="rounded-md border p-3 text-sm">
          {access.master ? (
            <>
              <span className="font-medium">{access.master.full_name || "Unnamed"}</span>{" "}
              <span className="text-muted-foreground">{access.master.email}</span>
            </>
          ) : (
            <span className="text-muted-foreground">No master assigned</span>
          )}
        </div>
        <div className="flex gap-2">
          <Input
            className={inputClass}
            type="email"
            placeholder="Move to another master: their login email"
            value={masterEmail}
            onChange={(e) => setMasterEmail(e.target.value)}
          />
          <Button type="button" variant="outline" disabled={busy || !masterEmail.trim()} onClick={assignMaster}>
            Assign master
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">Other branches of this master ({siblings.length})</p>
        {siblings.length ? (
          <ul className="divide-y rounded-md border">
            {siblings.map((b) => (
              <li key={b.id} className="flex items-center justify-between px-3 py-2 text-sm">
                <span>
                  {b.name}
                  <span className="text-muted-foreground">{b.area || b.city ? ` · ${b.area || b.city}` : ""}</span>
                </span>
                <Link className="text-xs font-medium underline" href={`/dashboard/manage-restaurants/${b.id}`}>
                  Open
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-muted-foreground">This is the master&apos;s only restaurant.</p>
        )}
        <Link
          className="inline-block text-xs font-medium underline"
          href={access.master?.email ? `/dashboard/manage-restaurants/add?master=${encodeURIComponent(access.master.email)}` : "/dashboard/manage-restaurants/add"}
        >
          Add another branch for this master
        </Link>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">Branch partner logins</p>
        <p className="text-xs text-muted-foreground">
          A branch partner manages only this branch: offers, deals, menu, bookings, staff and settings.
        </p>
        {access.branchAdmins.length ? (
          <ul className="divide-y rounded-md border">
            {access.branchAdmins.map((u) => (
              <li key={u.id} className="flex items-center justify-between px-3 py-2 text-sm">
                <span>
                  {u.full_name || "Unnamed"} <span className="text-muted-foreground">{u.email}</span>
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={busy}
                  onClick={() => run(() => removeBranchAdmin(restaurantId, u.id), "Branch partner removed")}
                >
                  Remove
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-muted-foreground">No branch partner yet. The master manages this branch.</p>
        )}
        <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
          <Input className={inputClass} placeholder="Full name" value={admin.full_name} onChange={(e) => setAdmin({ ...admin, full_name: e.target.value })} />
          <Input className={inputClass} type="email" placeholder="Login email" value={admin.email} onChange={(e) => setAdmin({ ...admin, email: e.target.value })} />
          <Input className={inputClass} type="password" placeholder="Password (min 8)" value={admin.password} onChange={(e) => setAdmin({ ...admin, password: e.target.value })} />
          <Button type="button" disabled={busy} onClick={createBranchAdmin}>
            Add branch partner
          </Button>
        </div>
      </div>
    </div>
  );
}
