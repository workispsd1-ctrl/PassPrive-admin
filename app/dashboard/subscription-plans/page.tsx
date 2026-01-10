"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import { Pencil, Trash2, Plus } from "lucide-react";
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
  amount: string; // ✅ single amount (INR) stored as text/varchar in DB
  type: string;   // "2" | "week" | "10days" | "15days" | "20days" | "month" | "2months" | "3months"
  product_id: string;
  price_id: string;
  sort_order: number;
}

// map stored type -> friendly label for the table
const TYPE_LABELS: Record<string, string> = {
  "2": "2 days",
  week: "1 week",
  "10days": "10 days",
  "15days": "15 days",
  "20days": "20 days",
  month: "1 month",
  "2months": "2 months",
  "3months": "3 months",
};

const TYPE_OPTIONS = [
  { value: "2", label: "2 days" },
  { value: "week", label: "1 week" },
  { value: "10days", label: "10 days" },
  { value: "15days", label: "15 days" },
  { value: "20days", label: "20 days" },
  { value: "month", label: "1 month" },
  { value: "2months", label: "2 months" },
  { value: "3months", label: "3 months" },
];

export default function SubscriptionPlansPage() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Delete modal state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [planToDelete, setPlanToDelete] = useState<SubscriptionPlan | null>(null);

  // ✅ fetch plans
  const fetchPlans = async () => {
    setLoading(true);

    const { data, error } = await supabaseBrowser
      .from("subscription")
      .select("id, plan_name, amount, type, product_id, price_id, sort_order")
      .order("sort_order", { ascending: true });

    if (error) {
      console.error(error);
      showToast({ title: "error", description: "Failed to load plans" });
    } else {
      setPlans((data || []) as SubscriptionPlan[]);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  // ✅ delete plan
  const handleDelete = async () => {
    if (!planToDelete) return;

    const { error } = await supabaseBrowser
      .from("subscription")
      .delete()
      .eq("id", planToDelete.id);

    if (error) {
      console.error(error);
      showToast({ title: "error", description: "Delete failed" });
    } else {
      showToast({ title: "success", description: "Plan deleted" });
      fetchPlans();
    }

    setDeleteDialogOpen(false);
    setPlanToDelete(null);
  };

  // ✅ save (insert or update)
  const handleSave = async (plan: SubscriptionPlan) => {
    const payload = {
      plan_name: plan.plan_name,
      amount: plan.amount ?? "",
      type: plan.type,
      product_id: plan.product_id ?? "",
      price_id: plan.price_id ?? "",
      sort_order: plan.sort_order ?? 0,
    };

    const result = plan.id
      ? await supabaseBrowser.from("subscription").update(payload).eq("id", plan.id)
      : await supabaseBrowser.from("subscription").insert([payload]);

    if ((result as any).error) {
      console.error((result as any).error);
      showToast({ title: "error", description: "Save failed" });
    } else {
      showToast({ title: "success", description: "Plan saved" });
      setEditingPlan(null);
      setDialogOpen(false);
      fetchPlans();
    }
  };

  return (
    <main className="min-h-full">
      <div className="flex items-center justify-between mb-6">
        <div></div>
        <Button
          onClick={() => {
            setEditingPlan({
              id: "",
              plan_name: "",
              amount: "",
              type: "month",
              product_id: "",
              price_id: "",
              sort_order: (plans?.length || 0) + 1,
            });
            setDialogOpen(true);
          }}
          className="bg-blue-600 text-white"
        >
          <Plus size={18} /> Add Plan
        </Button>
      </div>

      {loading ? (
        <main className="min-h-screen p-4">
          <div className="space-y-3">
            {Array.from({ length: ITEMS_PER_PAGE }).map((_, i) => (
              <div key={i} className="h-10 bg-gray-100 animate-pulse rounded-md" />
            ))}
          </div>
        </main>
      ) : (
        <div className="overflow-x-auto bg-white rounded-lg shadow">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-700">
              <tr>
                <th className="px-4 py-3">Plan Name</th>
                <th className="px-4 py-3">Amount (₹)</th>
                <th className="px-4 py-3">Duration</th>
                <th className="px-4 py-3">Product ID</th>
                <th className="px-4 py-3">Price ID</th>
                <th className="px-4 py-3">Sort</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>

            <tbody>
              {plans.map((plan) => (
                <tr key={plan.id} className="border-b last:border-none hover:bg-gray-50">
                  <td className="px-4 py-3">{plan.plan_name}</td>
                  <td className="px-4 py-3">₹{plan.amount || "0"}</td>
                  <td className="px-4 py-3">{TYPE_LABELS[plan.type] ?? plan.type}</td>
                  <td className="px-4 py-3">{plan.product_id}</td>
                  <td className="px-4 py-3">{plan.price_id}</td>
                  <td className="px-4 py-3">{plan.sort_order}</td>

                  <td className="px-4 py-3 text-right flex gap-2 justify-end">
                    <button
                      onClick={() => {
                        setEditingPlan(plan);
                        setDialogOpen(true);
                      }}
                      className="p-2"
                    >
                      <Pencil size={16} />
                    </button>

                    <button
                      onClick={() => {
                        setPlanToDelete(plan);
                        setDeleteDialogOpen(true);
                      }}
                      className="p-2 text-red-700"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}

              {plans.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-6 text-gray-500">
                    No subscription plans found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ✅ Dialog for add/edit */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-white border-gray-300">
          <DialogHeader>
            <DialogTitle>{editingPlan?.id ? "Edit Plan" : "Add Plan"}</DialogTitle>
          </DialogHeader>

          {editingPlan && (
            <div className="grid gap-4 py-4">
              <Input
                type="text"
                value={editingPlan.plan_name}
                onChange={(e) => setEditingPlan({ ...editingPlan, plan_name: e.target.value })}
                placeholder="Plan Name"
              />

              {/* ✅ Single amount */}
              <Input
                type="text"
                value={editingPlan.amount}
                onChange={(e) => setEditingPlan({ ...editingPlan, amount: e.target.value })}
                placeholder="Amount in INR (e.g., 3999)"
              />

              {/* Duration / type */}
              <select
                value={editingPlan.type}
                onChange={(e) => setEditingPlan({ ...editingPlan, type: e.target.value })}
                className="border rounded px-3 py-2"
              >
                {TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>

              <Input
                type="text"
                value={editingPlan.product_id}
                onChange={(e) => setEditingPlan({ ...editingPlan, product_id: e.target.value })}
                placeholder="Product ID"
              />

              <Input
                type="text"
                value={editingPlan.price_id}
                onChange={(e) => setEditingPlan({ ...editingPlan, price_id: e.target.value })}
                placeholder="Price ID"
              />

              <Input
                type="number"
                value={editingPlan.sort_order}
                onChange={(e) =>
                  setEditingPlan({ ...editingPlan, sort_order: Number(e.target.value) })
                }
                placeholder="Sort Order"
              />
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="bg-red-500 hover:bg-red-600 text-white">
              Cancel
            </Button>
            <Button onClick={() => editingPlan && handleSave(editingPlan)} className="bg-blue-600 hover:bg-blue-700 text-white">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ✅ Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Plan</DialogTitle>
          </DialogHeader>

          <p className="text-sm text-gray-600">
            Are you sure you want to delete{" "}
            <span className="font-semibold">{planToDelete?.plan_name || "this plan"}</span>
            ? This action cannot be undone.
          </p>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
