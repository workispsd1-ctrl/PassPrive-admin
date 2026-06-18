"use client";

import { useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import { showToast } from "@/hooks/useToast";

// Native sections the mobile app ships (HomeContent NATIVE registry). Keep this
// list in sync with the app. See SECTION_CMS.md.
const NATIVE_KEYS = [
  "foodie-frontrow",
  "more-with-passprive",
  "shop-this-weekend",
  "family-feast",
  "new-kick-in-stores",
  "plan-your-salon-visit",
  "now-trending",
  "whats-hot",
];

// Templates the app ships (HomeContent TEMPLATES registry).
const TEMPLATES = ["restaurant_rail"];

const inputClass =
  "h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-slate-300 focus:ring-2 focus:ring-slate-100";

export default function HomeSectionForm({ screen, editingItem, onCancel, onDone }) {
  const isEditing = !!editingItem;

  const [type, setType] = useState(editingItem?.template ? "template" : "native");
  const [title, setTitle] = useState(editingItem?.title ?? "");
  const [sectionKey, setSectionKey] = useState(editingItem?.section_key ?? NATIVE_KEYS[0]);
  const [template, setTemplate] = useState(editingItem?.template ?? TEMPLATES[0]);
  const [dataSource, setDataSource] = useState(editingItem?.data_source ?? "restaurants");
  const [paramsText, setParamsText] = useState(
    editingItem?.params ? JSON.stringify(editingItem.params, null, 2) : '{\n  "limit": 12\n}'
  );
  const [styleVariant, setStyleVariant] = useState(editingItem?.style_variant ?? "");
  const [titleColor, setTitleColor] = useState(editingItem?.title_color ?? "");
  const [background, setBackground] = useState(editingItem?.background ?? "");
  const [sortOrder, setSortOrder] = useState(
    editingItem?.sort_order != null ? String(editingItem.sort_order) : ""
  );
  const [enabled, setEnabled] = useState(editingItem?.enabled ?? true);
  const [saving, setSaving] = useState(false);

  const parsedParams = useMemo(() => {
    if (type !== "template") return {};
    try {
      const v = JSON.parse(paramsText || "{}");
      return v && typeof v === "object" && !Array.isArray(v) ? v : null;
    } catch {
      return null;
    }
  }, [paramsText, type]);

  const paramsInvalid = type === "template" && parsedParams === null;

  const handleSave = async () => {
    if (!screen?.id) {
      showToast({ type: "error", title: "Pick a screen first" });
      return;
    }
    if (!title.trim() && type === "template") {
      showToast({ type: "error", title: "Title is required for a template section" });
      return;
    }
    if (paramsInvalid) {
      showToast({ type: "error", title: "Params must be valid JSON (an object)" });
      return;
    }

    setSaving(true);
    try {
      // New rows append to the end unless an explicit order is given.
      let order = sortOrder === "" ? null : Number(sortOrder);
      if (order == null && !isEditing) {
        const { data: maxRow } = await supabaseBrowser
          .from("session_sorting_titles")
          .select("sort_order")
          .eq("screen_id", screen.id)
          .order("sort_order", { ascending: false })
          .limit(1)
          .maybeSingle();
        order = (maxRow?.sort_order ?? 0) + 1;
      }

      const payload = {
        screen_id: screen.id,
        title: title.trim() || null,
        section_key: type === "native" ? sectionKey : null,
        template: type === "template" ? template : null,
        data_source: type === "template" ? dataSource.trim() || null : null,
        params: type === "template" ? parsedParams : {},
        style_variant: styleVariant.trim() || null,
        title_color: titleColor.trim() || null,
        background: background.trim() || null,
        enabled,
        ...(order != null ? { sort_order: order } : {}),
      };

      const res = isEditing
        ? await supabaseBrowser.from("session_sorting_titles").update(payload).eq("id", editingItem.id)
        : await supabaseBrowser.from("session_sorting_titles").insert(payload);

      if (res.error) {
        showToast({ type: "error", title: "Save failed", description: res.error.message });
        return;
      }
      showToast({ type: "success", title: isEditing ? "Section updated" : "Section added" });
      onDone();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Type toggle */}
      <div className="flex gap-2">
        {["native", "template"].map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setType(t)}
            className={`h-9 rounded-xl px-4 text-sm font-medium ${
              type === t
                ? "bg-[#5800AB] text-white"
                : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            {t === "native" ? "Native section" : "Template section"}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label className="mb-1.5 block text-sm text-slate-600">Title (heading)</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. FOODIE FRONTROW" />
          {type === "native" && (
            <p className="mt-1 text-xs text-slate-400">Leave blank to use the section&apos;s built-in heading.</p>
          )}
        </div>

        {type === "native" ? (
          <div>
            <Label className="mb-1.5 block text-sm text-slate-600">Section</Label>
            <select value={sectionKey} onChange={(e) => setSectionKey(e.target.value)} className={inputClass}>
              {NATIVE_KEYS.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <>
            <div>
              <Label className="mb-1.5 block text-sm text-slate-600">Template</Label>
              <select value={template} onChange={(e) => setTemplate(e.target.value)} className={inputClass}>
                {TEMPLATES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label className="mb-1.5 block text-sm text-slate-600">Data source</Label>
              <Input value={dataSource} onChange={(e) => setDataSource(e.target.value)} placeholder="restaurants" />
            </div>
            <div className="sm:col-span-2">
              <Label className="mb-1.5 block text-sm text-slate-600">Params (JSON)</Label>
              <Textarea
                value={paramsText}
                onChange={(e) => setParamsText(e.target.value)}
                rows={5}
                className={paramsInvalid ? "border-red-300 font-mono text-xs" : "font-mono text-xs"}
              />
              <p className={`mt-1 text-xs ${paramsInvalid ? "text-red-500" : "text-slate-400"}`}>
                {paramsInvalid
                  ? "Invalid JSON object."
                  : "e.g. { \"limit\": 12, \"city\": \"Mumbai\", \"cuisine\": \"Italian\" }"}
              </p>
            </div>
          </>
        )}

        <div>
          <Label className="mb-1.5 block text-sm text-slate-600">Order (optional)</Label>
          <Input
            type="number"
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            placeholder="auto (append)"
          />
        </div>
        <div>
          <Label className="mb-1.5 block text-sm text-slate-600">Style variant (optional)</Label>
          <Input value={styleVariant} onChange={(e) => setStyleVariant(e.target.value)} placeholder="light / dark / accent" />
        </div>
        <div>
          <Label className="mb-1.5 block text-sm text-slate-600">Title colour (optional)</Label>
          <Input value={titleColor} onChange={(e) => setTitleColor(e.target.value)} placeholder="#383838" />
        </div>
        <div>
          <Label className="mb-1.5 block text-sm text-slate-600">Background (optional)</Label>
          <Input value={background} onChange={(e) => setBackground(e.target.value)} placeholder="#FFFFFF" />
        </div>

        <div className="sm:col-span-2 flex items-center gap-2">
          <input
            id="enabled"
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300"
          />
          <Label htmlFor="enabled" className="text-sm text-slate-600">
            Visible on Home
          </Label>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Button variant="outline" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={saving} className="bg-[#5800AB] hover:bg-[#4a0090]">
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isEditing ? "Save changes" : "Add section"}
        </Button>
      </div>
    </div>
  );
}
