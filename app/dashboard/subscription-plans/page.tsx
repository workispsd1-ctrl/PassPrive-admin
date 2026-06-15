"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import { Plus } from "lucide-react";
import { showToast } from "@/hooks/useToast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const ITEMS_PER_PAGE = 10;

interface SubscriptionPlan {
  id: string;
  plan_name: string;
  amount: string;
  type: string;
  product_id: string;
  price_id: string;
  sort_order: number;
}

const TYPE_LABELS: Record<string, string> = {
  "1year": "1 year",
};

const TYPE_OPTIONS = [
  { value: "1year", label: "1 year" },
];

interface PartnerPlan {
  id: string;
  plan_name: string;
  amount: string;
  type: string;
  billing_cycle: string;
  product_id: string;
  price_id: string;
  sort_order: number;
}

const PARTNER_TYPE_LABELS: Record<string, string> = {
  Verified: "Verified",
  Preferred: "Preferred",
};

const PARTNER_TYPE_OPTIONS = [
  { value: "Verified", label: "Verified" },
  { value: "Preferred", label: "Preferred" },
];

const BILLING_CYCLE_OPTIONS = [
  { value: "monthly", label: "Monthly" },
  { value: "flat", label: "Flat (groups 3+ outlets)" },
];

const PARTNER_DEFAULT_FEES: Record<string, string> = {
  Verified: "1000",
  Preferred: "1000",
};

type Tab = "customer" | "partner";

export default function SubscriptionPlansPage() {
  const [activeTab, setActiveTab] = useState<Tab>("customer");

  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [planDialogOpen, setPlanDialogOpen] = useState(false);
  const [deletePlanDialogOpen, setDeletePlanDialogOpen] = useState(false);
  const [planToDelete, setPlanToDelete] = useState<SubscriptionPlan | null>(null);

  const [partnerPlans, setPartnerPlans] = useState<PartnerPlan[]>([]);
  const [loadingPartner, setLoadingPartner] = useState(false);
  const [editingPartner, setEditingPartner] = useState<PartnerPlan | null>(null);
  const [partnerDialogOpen, setPartnerDialogOpen] = useState(false);
  const [deletePartnerDialogOpen, setDeletePartnerDialogOpen] = useState(false);
  const [partnerToDelete, setPartnerToDelete] = useState<PartnerPlan | null>(null);

  const fetchPlans = async () => {
    setLoadingPlans(true);
    const { data, error } = await supabaseBrowser
      .from("subscription")
      .select("id, plan_name, amount, type, product_id, price_id, sort_order")
      .order("sort_order", { ascending: true });
    if (error) {
      console.error(error);
      showToast({ title: "error", description: "Failed to load customer plans" });
    } else {
      setPlans((data || []) as SubscriptionPlan[]);
    }
    setLoadingPlans(false);
  };

  const fetchPartnerPlans = async () => {
    setLoadingPartner(true);
    const { data, error } = await supabaseBrowser
      .from("partner_subscription")
      .select("id, plan_name, amount, type, billing_cycle, product_id, price_id, sort_order")
      .order("sort_order", { ascending: true });
    if (error) {
      console.error(error);
      showToast({ title: "error", description: "Failed to load partner plans" });
    } else {
      setPartnerPlans((data || []) as PartnerPlan[]);
    }
    setLoadingPartner(false);
  };

  useEffect(() => { fetchPlans(); }, []);
  useEffect(() => { if (activeTab === "partner") fetchPartnerPlans(); }, [activeTab]);

  const handleDeletePlan = async () => {
    if (!planToDelete) return;
    const { error } = await supabaseBrowser.from("subscription").delete().eq("id", planToDelete.id);
    if (error) {
      console.error("[CustomerPlan] delete error", error);
      showToast({ title: "error", description: error.message || "Delete failed" });
    } else {
      showToast({ title: "success", description: "Plan deleted" });
      fetchPlans();
    }
    setDeletePlanDialogOpen(false);
    setPlanToDelete(null);
  };

  const handleSavePlan = async (plan: SubscriptionPlan) => {
    const payload = {
      plan_name: plan.plan_name,
      amount: plan.amount ?? "",
      type: plan.type,
      product_id: plan.product_id ?? "",
      price_id: plan.price_id ?? "",
      sort_order: plan.sort_order ?? 0,
    };
    const { error } = plan.id
      ? await supabaseBrowser.from("subscription").update(payload).eq("id", plan.id)
      : await supabaseBrowser.from("subscription").insert([payload]);
    if (error) {
      console.error("[CustomerPlan] save error", error);
      showToast({ title: "error", description: error.message || "Save failed" });
    } else {
      showToast({ title: "success", description: "Plan saved" });
      setEditingPlan(null);
      setPlanDialogOpen(false);
      fetchPlans();
    }
  };

  const handleDeletePartner = async () => {
    if (!partnerToDelete) return;
    const { error } = await supabaseBrowser
      .from("partner_subscription")
      .delete()
      .eq("id", partnerToDelete.id);
    if (error) {
      console.error("[PartnerPlan] delete error", error);
      showToast({ title: "error", description: error.message || "Delete failed" });
    } else {
      showToast({ title: "success", description: "Partner plan deleted" });
      fetchPartnerPlans();
    }
    setDeletePartnerDialogOpen(false);
    setPartnerToDelete(null);
  };

  const handleSavePartner = async (plan: PartnerPlan) => {
    const payload = {
      plan_name: plan.plan_name,
      amount: plan.amount ?? "",
      type: plan.type,
      billing_cycle: plan.billing_cycle ?? "monthly",
      product_id: plan.product_id ?? "",
      price_id: plan.price_id ?? "",
      sort_order: plan.sort_order ?? 0,
    };
    const { error } = plan.id
      ? await supabaseBrowser.from("partner_subscription").update(payload).eq("id", plan.id)
      : await supabaseBrowser.from("partner_subscription").insert([payload]);
    if (error) {
      console.error("[PartnerPlan] save error", error);
      showToast({ title: "error", description: error.message || "Save failed" });
    } else {
      showToast({ title: "success", description: "Partner plan saved" });
      setEditingPartner(null);
      setPartnerDialogOpen(false);
      fetchPartnerPlans();
    }
  };

  const loading = activeTab === "customer" ? loadingPlans : loadingPartner;

  return (
    <main className="min-h-full">
      <div className="min-h-full space-y-6 p-6 bg-[linear-gradient(135deg,_#ECFEFF_0%,_#F3E8FF_100%)]">

        <div className="flex gap-2 border-b border-gray-200">
          <button
            type="button"
            onClick={() => setActiveTab("customer")}
            className={`px-5 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "customer"
                ? "border-[#5800AB] text-[#5800AB]"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            Customer Plans
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("partner")}
            className={`px-5 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "partner"
                ? "border-[#5800AB] text-[#5800AB]"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            Partner Plans
          </button>
        </div>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: ITEMS_PER_PAGE }).map((_, i) => (
              <div key={i} className="h-10 bg-gray-100 animate-pulse rounded-md" />
            ))}
          </div>
        ) : activeTab === "customer" ? (
          /* ── Customer Plans Table ── */
          <div className="w-full overflow-x-auto bg-white rounded-lg border border-gray-200 shadow-sm">
            <table className="w-full text-sm text-left border-collapse">
              <thead className="bg-white">
                <tr className="border-b border-gray-200">
                  <th className="px-6 py-3 text-left text-[12px] font-semibold text-[#1D293D]">Plan Name</th>
                  <th className="px-6 py-3 text-left text-[12px] font-semibold text-[#1D293D]">Amount (₹)</th>
                  <th className="px-6 py-3 text-left text-[12px] font-semibold text-[#1D293D]">Duration</th>
                  <th className="px-6 py-3 text-left text-[12px] font-semibold text-[#1D293D]">Product ID</th>
                  <th className="px-6 py-3 text-left text-[12px] font-semibold text-[#1D293D]">Price ID</th>
                  <th className="px-6 py-3 text-left text-[12px] font-semibold text-[#1D293D]">Sort</th>
                  <th className="px-6 py-3 text-right text-[12px] font-semibold text-[#1D293D]">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-[linear-gradient(135deg,_#ECFEFF_0%,_#F3E8FF_100%)]">
                {plans.map((plan, idx) => (
                  <tr key={plan.id} className={`border-b border-gray-200 hover:bg-white/20 transition text-sm ${idx !== plans.length - 1 ? "border-b" : ""}`}>
                    <td className="px-6 py-3 font-medium text-[#1D293D]">{plan.plan_name}</td>
                    <td className="px-6 py-3 text-[#5b6473]">₹{plan.amount || "0"}</td>
                    <td className="px-6 py-3 text-[#5b6473]">{TYPE_LABELS[plan.type] ?? plan.type}</td>
                    <td className="px-6 py-3 text-[#5b6473]">{plan.product_id}</td>
                    <td className="px-6 py-3 text-[#5b6473]">{plan.price_id}</td>
                    <td className="px-6 py-3 text-[#5b6473]">{plan.sort_order}</td>
                    <td className="px-6 py-3 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <button type="button" title="Edit plan" onClick={() => { setEditingPlan(plan); setPlanDialogOpen(true); }} className="cursor-pointer p-0 h-auto">
                          <Image src="/edit.png" alt="Edit" width={16} height={16} className="w-4 h-4" />
                        </button>
                        <button type="button" title="Delete plan" onClick={() => { setPlanToDelete(plan); setDeletePlanDialogOpen(true); }} className="cursor-pointer p-0 h-auto">
                          <Image src="/delete.png" alt="Delete" width={16} height={16} className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {plans.length === 0 && (
                  <tr><td colSpan={7} className="text-center py-6 text-gray-500">No customer plans found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          /* ── Partner Plans Table ── */
          <div className="w-full overflow-x-auto bg-white rounded-lg border border-gray-200 shadow-sm">
            <table className="w-full text-sm text-left border-collapse">
              <thead className="bg-white">
                <tr className="border-b border-gray-200">
                  <th className="px-6 py-3 text-left text-[12px] font-semibold text-[#1D293D]">Plan Name</th>
                  <th className="px-6 py-3 text-left text-[12px] font-semibold text-[#1D293D]">Amount (MUR)</th>
                  <th className="px-6 py-3 text-left text-[12px] font-semibold text-[#1D293D]">Type</th>
                  <th className="px-6 py-3 text-left text-[12px] font-semibold text-[#1D293D]">Billing Cycle</th>
                  <th className="px-6 py-3 text-left text-[12px] font-semibold text-[#1D293D]">Product ID</th>
                  <th className="px-6 py-3 text-left text-[12px] font-semibold text-[#1D293D]">Price ID</th>
                  <th className="px-6 py-3 text-left text-[12px] font-semibold text-[#1D293D]">Sort</th>
                  <th className="px-6 py-3 text-right text-[12px] font-semibold text-[#1D293D]">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-[linear-gradient(135deg,_#ECFEFF_0%,_#F3E8FF_100%)]">
                {partnerPlans.map((plan, idx) => (
                  <tr key={plan.id} className={`border-b border-gray-200 hover:bg-white/20 transition text-sm ${idx !== partnerPlans.length - 1 ? "border-b" : ""}`}>
                    <td className="px-6 py-3 font-medium text-[#1D293D]">{plan.plan_name}</td>
                    <td className="px-6 py-3 text-[#5b6473]">MUR {plan.amount || "0"}</td>
                    <td className="px-6 py-3">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        plan.type === "Preferred" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"
                      }`}>
                        {PARTNER_TYPE_LABELS[plan.type] ?? plan.type}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-[#5b6473] capitalize">{plan.billing_cycle || "monthly"}</td>
                    <td className="px-6 py-3 text-[#5b6473]">{plan.product_id}</td>
                    <td className="px-6 py-3 text-[#5b6473]">{plan.price_id}</td>
                    <td className="px-6 py-3 text-[#5b6473]">{plan.sort_order}</td>
                    <td className="px-6 py-3 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <button type="button" title="Edit partner plan" onClick={() => { setEditingPartner(plan); setPartnerDialogOpen(true); }} className="cursor-pointer p-0 h-auto">
                          <Image src="/edit.png" alt="Edit" width={16} height={16} className="w-4 h-4" />
                        </button>
                        <button type="button" title="Delete partner plan" onClick={() => { setPartnerToDelete(plan); setDeletePartnerDialogOpen(true); }} className="cursor-pointer p-0 h-auto">
                          <Image src="/delete.png" alt="Delete" width={16} height={16} className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {partnerPlans.length === 0 && (
                  <tr><td colSpan={8} className="text-center py-6 text-gray-500">No partner plans found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Button
        onClick={() => {
          if (activeTab === "customer") {
            setEditingPlan({ id: "", plan_name: "", amount: "", type: "month", product_id: "", price_id: "", sort_order: (plans?.length || 0) + 1 });
            setPlanDialogOpen(true);
          } else {
            setEditingPartner({ id: "", plan_name: "", amount: PARTNER_DEFAULT_FEES["Verified"], type: "Verified", billing_cycle: "monthly", product_id: "", price_id: "", sort_order: (partnerPlans?.length || 0) + 1 });
            setPartnerDialogOpen(true);
          }
        }}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full bg-[#5800AB] text-white shadow-lg hover:bg-[#4a0090]"
      >
        <Plus className="h-6 w-6" />
      </Button>

      <Dialog open={planDialogOpen} onOpenChange={setPlanDialogOpen}>
        <DialogContent className="bg-white border-gray-300">
          <DialogHeader>
            <DialogTitle>{editingPlan?.id ? "Edit Customer Plan" : "Add Customer Plan"}</DialogTitle>
          </DialogHeader>
          {editingPlan && (
            <div className="grid gap-4 py-4">
              <Input placeholder="Plan Name" value={editingPlan.plan_name} onChange={(e) => setEditingPlan({ ...editingPlan, plan_name: e.target.value })} />
              <Input type="text" placeholder="Amount in INR (e.g. 3999)" value={editingPlan.amount} onChange={(e) => setEditingPlan({ ...editingPlan, amount: e.target.value })} />
              <div className="space-y-1">
                <label htmlFor="plan_type" className="text-xs font-medium text-gray-600">Duration</label>
                <select id="plan_type" value={editingPlan.type} onChange={(e) => setEditingPlan({ ...editingPlan, type: e.target.value })} className="w-full border rounded px-3 py-2 text-sm">
                  {TYPE_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
              </div>
              <Input placeholder="Product ID" value={editingPlan.product_id} onChange={(e) => setEditingPlan({ ...editingPlan, product_id: e.target.value })} />
              <Input placeholder="Price ID" value={editingPlan.price_id} onChange={(e) => setEditingPlan({ ...editingPlan, price_id: e.target.value })} />
              <Input type="number" placeholder="Sort Order" value={editingPlan.sort_order} onChange={(e) => setEditingPlan({ ...editingPlan, sort_order: Number(e.target.value) })} />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPlanDialogOpen(false)} className="bg-gray-500 hover:bg-gray-600 text-white">Cancel</Button>
            <Button onClick={() => editingPlan && handleSavePlan(editingPlan)} className="bg-[#5800AB] hover:bg-[#4a0090] text-white">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deletePlanDialogOpen} onOpenChange={setDeletePlanDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete Plan</DialogTitle></DialogHeader>
          <p className="text-sm text-gray-600">Are you sure you want to delete <span className="font-semibold">{planToDelete?.plan_name || "this plan"}</span>? This action cannot be undone.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletePlanDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeletePlan} className="bg-red-600 hover:bg-red-700">Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={partnerDialogOpen} onOpenChange={setPartnerDialogOpen}>
        <DialogContent className="bg-white border-gray-300">
          <DialogHeader>
            <DialogTitle>{editingPartner?.id ? "Edit Partner Plan" : "Add Partner Plan"}</DialogTitle>
          </DialogHeader>
          {editingPartner && (
            <div className="grid gap-4 py-4">
              <Input
                placeholder="Plan Name (e.g. Verified Standard)"
                value={editingPartner.plan_name}
                onChange={(e) => setEditingPartner({ ...editingPartner, plan_name: e.target.value })}
              />
              <Input
                type="text"
                placeholder="Amount in MUR (e.g. 1000)"
                value={editingPartner.amount}
                onChange={(e) => setEditingPartner({ ...editingPartner, amount: e.target.value })}
              />
              <div className="space-y-1">
                <label htmlFor="partner_type" className="text-xs font-medium text-gray-600">Type</label>
                <select
                  id="partner_type"
                  value={editingPartner.type}
                  onChange={(e) => setEditingPartner({
                    ...editingPartner,
                    type: e.target.value,
                    amount: PARTNER_DEFAULT_FEES[e.target.value] ?? editingPartner.amount,
                  })}
                  className="w-full border rounded px-3 py-2 text-sm"
                >
                  {PARTNER_TYPE_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label htmlFor="partner_billing_cycle" className="text-xs font-medium text-gray-600">Billing Cycle</label>
                <select
                  id="partner_billing_cycle"
                  value={editingPartner.billing_cycle}
                  onChange={(e) => setEditingPartner({ ...editingPartner, billing_cycle: e.target.value })}
                  className="w-full border rounded px-3 py-2 text-sm"
                >
                  {BILLING_CYCLE_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
              </div>
              <Input
                placeholder="Product ID"
                value={editingPartner.product_id}
                onChange={(e) => setEditingPartner({ ...editingPartner, product_id: e.target.value })}
              />
              <Input
                placeholder="Price ID"
                value={editingPartner.price_id}
                onChange={(e) => setEditingPartner({ ...editingPartner, price_id: e.target.value })}
              />
              <Input
                type="number"
                placeholder="Sort Order"
                value={editingPartner.sort_order}
                onChange={(e) => setEditingPartner({ ...editingPartner, sort_order: Number(e.target.value) })}
              />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPartnerDialogOpen(false)} className="bg-gray-500 hover:bg-gray-600 text-white">Cancel</Button>
            <Button onClick={() => editingPartner && handleSavePartner(editingPartner)} className="bg-[#5800AB] hover:bg-[#4a0090] text-white">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deletePartnerDialogOpen} onOpenChange={setDeletePartnerDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete Partner Plan</DialogTitle></DialogHeader>
          <p className="text-sm text-gray-600">Are you sure you want to delete <span className="font-semibold">{partnerToDelete?.plan_name || "this plan"}</span>? This action cannot be undone.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletePartnerDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeletePartner} className="bg-red-600 hover:bg-red-700">Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
