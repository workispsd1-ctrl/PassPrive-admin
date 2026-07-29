"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { showToast } from "@/hooks/useToast";
import MallForm from "../_components/MallForm";
import MallStoresManager from "../_components/MallStoresManager";
import { fetchMallById, updateMall, deleteMall, type MallRecord } from "@/lib/mallAdmin";

export default function EditMallPage() {
  const router = useRouter();
  const params = useParams();
  const id = String(params?.id || "");

  const [mall, setMall] = useState<Partial<MallRecord> | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await fetchMallById(id);
        if (!active) return;
        if (!data) {
          showToast({ type: "error", title: "Mall not found" });
          router.push("/dashboard/manage-stores");
          return;
        }
        setMall(data);
      } catch (err) {
        showToast({ type: "error", title: "Failed to load mall", description: (err as Error)?.message });
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [id, router]);

  const onChange = (patch: Partial<MallRecord>) => setMall((prev) => ({ ...(prev || {}), ...patch }));

  const save = async () => {
    if (!mall || !String(mall.name || "").trim()) {
      showToast({ type: "error", title: "Mall name is required" });
      return;
    }
    setSaving(true);
    try {
      await updateMall(id, mall);
      showToast({ type: "success", title: "Mall updated" });
    } catch (err) {
      showToast({ type: "error", title: "Update failed", description: (err as Error)?.message });
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async () => {
    if (!confirm(`Delete "${mall?.name}"? This also removes its store links.`)) return;
    try {
      await deleteMall(id);
      showToast({ type: "success", title: "Mall deleted" });
      router.push("/dashboard/manage-stores");
    } catch (err) {
      showToast({ type: "error", title: "Delete failed", description: (err as Error)?.message });
    }
  };

  if (loading || !mall) {
    return (
      <div className="flex h-64 items-center justify-center text-gray-500">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading mall…
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push("/dashboard/manage-stores")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="truncate text-xl font-semibold text-gray-900">{mall.name || "Edit Mall"}</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="gap-2 text-red-600 hover:text-red-700" onClick={onDelete}>
            <Trash2 className="h-4 w-4" /> Delete
          </Button>
          <Button onClick={save} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Changes
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        <MallForm value={mall} onChange={onChange} disabled={saving} />
        <MallStoresManager mallId={id} />
      </div>
    </div>
  );
}
