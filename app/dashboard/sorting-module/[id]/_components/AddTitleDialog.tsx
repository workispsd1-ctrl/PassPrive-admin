"use client";

import React, { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";

// Native sections the mobile app ships (PassPrive HomeContent NATIVE registry).
// Templates the app ships (HomeContent TEMPLATES registry). Keep in sync with
// the app — see SECTION_CMS.md.
const NATIVE_KEYS = [
  "foodie-frontrow",
  "offers-for-you",
  "foodie-frontrow-classic",
  "more-with-passprive",
  "shop-this-weekend",
  "family-feast",
  "new-kick-in-stores",
  "plan-your-salon-visit",
  "now-trending",
  "whats-hot",
];
// Friendly labels shown to admins. The section_key stays the stable app↔CMS
// contract; only the displayed name changes.
const NATIVE_LABELS: Record<string, string> = {
  "foodie-frontrow": "In the Limelight",
  "offers-for-you": "Offers for you",
  "foodie-frontrow-classic": "Foodie Frontrow",
};
const TEMPLATES = ["restaurant_rail"];

export type TitleRow = {
  id?: string;
  title: string;
  sort_order: number;
  section_key?: string | null;
  template?: string | null;
  data_source?: string | null;
  params?: Record<string, unknown> | null;
  style_variant?: string | null;
  title_color?: string | null;
  background?: string | null;
  enabled?: boolean;
};

export type TitlePayload = {
  title: string;
  sort_order: number;
  section_key: string | null;
  template: string | null;
  data_source: string | null;
  params: Record<string, unknown>;
  style_variant: string | null;
  title_color: string | null;
  background: string | null;
  enabled: boolean;
};

interface AddTitleDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (payload: TitlePayload) => void;
  editing?: TitleRow | null;
}

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-slate-300 focus:ring-2 focus:ring-slate-100";

export default function AddTitleDialog({ open, onClose, onSave, editing }: AddTitleDialogProps) {
  const isEditing = !!editing?.id;
  const [type, setType] = useState<"native" | "template">("native");
  const [title, setTitle] = useState("");
  const [sortOrder, setSortOrder] = useState<number | "">("");
  const [sectionKey, setSectionKey] = useState<string>(NATIVE_KEYS[0]);
  const [template, setTemplate] = useState<string>(TEMPLATES[0]);
  const [dataSource, setDataSource] = useState("restaurants");
  const [paramsText, setParamsText] = useState('{\n  "limit": 12\n}');
  const [styleVariant, setStyleVariant] = useState("");
  const [titleColor, setTitleColor] = useState("");
  const [background, setBackground] = useState("");
  const [enabled, setEnabled] = useState(true);

  // Re-seed fields whenever the dialog opens / the edited row changes.
  useEffect(() => {
    if (!open) return;
    setType(editing?.template ? "template" : "native");
    setTitle(editing?.title ?? "");
    setSortOrder(editing?.sort_order ?? "");
    setSectionKey(editing?.section_key ?? NATIVE_KEYS[0]);
    setTemplate(editing?.template ?? TEMPLATES[0]);
    setDataSource(editing?.data_source ?? "restaurants");
    setParamsText(editing?.params ? JSON.stringify(editing.params, null, 2) : '{\n  "limit": 12\n}');
    setStyleVariant(editing?.style_variant ?? "");
    setTitleColor(editing?.title_color ?? "");
    setBackground(editing?.background ?? "");
    setEnabled(editing?.enabled ?? true);
  }, [open, editing]);

  const parsedParams = useMemo(() => {
    if (type !== "template") return {};
    try {
      const v = JSON.parse(paramsText || "{}");
      return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
    } catch {
      return null;
    }
  }, [paramsText, type]);

  if (!open) return null;

  const paramsInvalid = type === "template" && parsedParams === null;

  const handleSave = () => {
    if (!title.trim() || sortOrder === "" || paramsInvalid) return;
    onSave({
      title: title.trim(),
      sort_order: Number(sortOrder),
      section_key: type === "native" ? sectionKey : null,
      template: type === "template" ? template : null,
      data_source: type === "template" ? dataSource.trim() || null : null,
      params: type === "template" ? (parsedParams as Record<string, unknown>) : {},
      style_variant: styleVariant.trim() || null,
      title_color: titleColor.trim() || null,
      background: background.trim() || null,
      enabled,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">{isEditing ? "Edit Section" : "Add Section"}</h2>
          <button
            type="button"
            title="Close"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 overflow-y-auto px-6 py-5">
          {/* Type toggle */}
          <div className="flex gap-2">
            {(["native", "template"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={`h-9 rounded-xl px-4 text-sm font-medium ${
                  type === t ? "bg-[#5800AB] text-white" : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                {t === "native" ? "Native section" : "Template section"}
              </button>
            ))}
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-gray-600">
              Title (heading shown in the app) <span className="text-red-500">*</span>
            </label>
            <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. FOODIE FRONTROW" className={inputClass} />
            {type === "native" && (
              <p className="text-[11px] text-slate-400">Leave blank to use the section&apos;s built-in heading.</p>
            )}
          </div>

          {type === "native" ? (
            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-600">Section</label>
              <select value={sectionKey} onChange={(e) => setSectionKey(e.target.value)} className={inputClass}>
                {NATIVE_KEYS.map((k) => (
                  <option key={k} value={k}>
                    {NATIVE_LABELS[k] ?? k}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-gray-600">Template</label>
                  <select value={template} onChange={(e) => setTemplate(e.target.value)} className={inputClass}>
                    {TEMPLATES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-gray-600">Data source</label>
                  <input value={dataSource} onChange={(e) => setDataSource(e.target.value)} placeholder="restaurants" className={inputClass} />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-600">Params (JSON)</label>
                <textarea
                  value={paramsText}
                  onChange={(e) => setParamsText(e.target.value)}
                  rows={4}
                  className={`${inputClass} font-mono text-xs ${paramsInvalid ? "border-red-300" : ""}`}
                />
                <p className={`text-[11px] ${paramsInvalid ? "text-red-500" : "text-slate-400"}`}>
                  {paramsInvalid ? "Invalid JSON object." : 'e.g. { "limit": 12, "city": "Mumbai", "cuisine": "Italian" }'}
                </p>
              </div>
            </>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-600">
                Sort Order <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value === "" ? "" : Number(e.target.value))}
                placeholder="e.g. 1"
                className={inputClass}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-600">Style variant (optional)</label>
              <input value={styleVariant} onChange={(e) => setStyleVariant(e.target.value)} placeholder="light / dark / accent" className={inputClass} />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-600">Title colour (optional)</label>
              <input value={titleColor} onChange={(e) => setTitleColor(e.target.value)} placeholder="#383838" className={inputClass} />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-600">Background (optional)</label>
              <input value={background} onChange={(e) => setBackground(e.target.value)} placeholder="#FFFFFF" className={inputClass} />
            </div>
          </div>

          <label className="flex items-center gap-2">
            <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} className="h-4 w-4 rounded border-slate-300" />
            <span className="text-sm text-gray-700">Visible on Home</span>
          </label>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-slate-100 px-6 py-4">
          <button type="button" onClick={onClose} className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-600 hover:bg-slate-50">
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!title.trim() || sortOrder === "" || paramsInvalid}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#5800AB] px-5 text-sm font-medium text-white shadow-[0_10px_20px_rgba(88,0,171,0.25)] hover:bg-[#4a0090] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isEditing ? "Save changes" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
