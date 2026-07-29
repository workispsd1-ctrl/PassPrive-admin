"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { showToast } from "@/hooks/useToast";
import MallForm from "../_components/MallForm";
import { createMall, emptyMall, type MallRecord } from "@/lib/mallAdmin";

export default function AddMallPage() {
  const router = useRouter();
  const [mall, setMall] = useState<Partial<MallRecord>>(emptyMall());
  const [saving, setSaving] = useState(false);

  const onChange = (patch: Partial<MallRecord>) => setMall((prev) => ({ ...prev, ...patch }));

  const save = async () => {
    if (!String(mall.name || "").trim()) {
      showToast({ type: "error", title: "Mall name is required" });
      return;
    }
    setSaving(true);
    try {
      const id = await createMall(mall);
      showToast({ type: "success", title: "Mall created", description: "Now add the stores available in this mall." });
      router.push(`/dashboard/manage-malls/${id}`);
    } catch (err) {
      showToast({ type: "error", title: "Create failed", description: (err as Error)?.message });
      setSaving(false);
    }
  };

  return (
    <div className="p-4 md:p-6">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push("/dashboard/manage-stores")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-semibold text-gray-900">Add Mall</h1>
        </div>
        <Button onClick={save} disabled={saving} className="gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Create Mall
        </Button>
      </div>

      <MallForm value={mall} onChange={onChange} disabled={saving} />

      <p className="mt-4 text-xs text-gray-500">Stores can be added to the mall after it&apos;s created.</p>
    </div>
  );
}
