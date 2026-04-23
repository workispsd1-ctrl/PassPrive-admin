"use client";

import * as React from "react";

import {
  OFFER_SOURCE_TYPES,
  OFFER_STATUSES,
  OFFER_TYPES,
  type OfferFormValues,
  type OfferSourceType,
  type PlanOption,
} from "@/app/dashboard/_components/unified-offers/model";
import { Checkbox } from "@/components/ui/checkbox";
import { SectionCard, SelectField, TextAreaField, TextField, ToggleField } from "@/app/dashboard/_components/unified-offers/ui";

type Props = {
  value: OfferFormValues;
  onChange: (next: OfferFormValues) => void;
  planOptions: PlanOption[];
};

const STATIC_TERMS_PRESETS = [
  "Valid only during the campaign period.",
  "Applicable only at participating merchants.",
  "Valid once per user during campaign period.",
  "Cannot be combined with any other offer unless explicitly stated.",
  "Not valid on taxes, service charges, packaging, delivery, or statutory levies.",
  "Offer applies only on the eligible net bill amount.",
  "Platform T&C shall apply.",
] as const;

export function OfferForm({ value, onChange, planOptions }: Props) {
  function update<K extends keyof OfferFormValues>(key: K, fieldValue: OfferFormValues[K]) {
    const next = { ...value, [key]: fieldValue };
    if (key === "source_type") {
      const sourceType = fieldValue as OfferSourceType;
      if (sourceType === "PLATFORM") {
        next.badge_text = next.badge_text || "PassPrive";
        next.badge_kind = next.badge_kind || "PASSPRIVE";
      }
      if (sourceType === "BANK" && !next.badge_text) {
        next.badge_text = next.sponsor_name || "Bank Offer";
      }
    }
    onChange(next);
  }

  const minBillTerm = React.useMemo(
    () => `Valid on final bill value of MUR ${value.min_bill_amount.trim() || "[min bill amount]"}.`,
    [value.min_bill_amount]
  );
  const termPresets = React.useMemo(() => [minBillTerm, ...STATIC_TERMS_PRESETS], [minBillTerm]);
  const termLines = React.useMemo(
    () =>
      value.terms_and_conditions
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean),
    [value.terms_and_conditions]
  );
  const previousDynamicTerms = termLines.filter((term) => term.startsWith("Valid on final bill value of MUR "));
  const normalizedTermLines = React.useMemo(() => {
    if (previousDynamicTerms.length === 0) return termLines;
    return [...termLines.filter((term) => !term.startsWith("Valid on final bill value of MUR ")), minBillTerm];
  }, [minBillTerm, previousDynamicTerms.length, termLines]);
  const selectedPresetTerms = termPresets.filter((term) => normalizedTermLines.includes(term));
  const customTerms = normalizedTermLines.filter((term) => !termPresets.includes(term)).join("\n");

  React.useEffect(() => {
    if (previousDynamicTerms.length === 0) return;
    const nextValue = [...normalizedTermLines].join("\n");
    if (nextValue !== value.terms_and_conditions) {
      onChange({ ...value, terms_and_conditions: nextValue });
    }
  }, [normalizedTermLines, onChange, previousDynamicTerms.length, value]);

  function updateTerms(nextPresets: string[], nextCustomTerms: string) {
    const extraTerms = nextCustomTerms
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    update("terms_and_conditions", [...nextPresets, ...extraTerms].join("\n"));
  }

  const isBankOffer = value.source_type === "BANK";

  return (
    <div className="space-y-6">
      <SectionCard title="Basic Details" description="Keep the main offer fields in one simple place.">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <SelectField
            label="Source type"
            value={value.source_type}
            onValueChange={(next) => update("source_type", next as OfferFormValues["source_type"])}
            options={OFFER_SOURCE_TYPES}
          />
          <SelectField
            label="Offer type"
            value={value.offer_type}
            onValueChange={(next) => update("offer_type", next as OfferFormValues["offer_type"])}
            options={OFFER_TYPES}
            hint="Uses backend-aligned values like `PERCENT_DISCOUNT`."
          />
          <SelectField
            label="Status"
            value={value.status}
            onValueChange={(next) => update("status", next as OfferFormValues["status"])}
            options={OFFER_STATUSES}
          />
          <TextField label="Priority" type="number" value={value.priority} onChange={(e) => update("priority", e.target.value)} />
          <TextField label="Currency code" value={value.currency_code} onChange={(e) => update("currency_code", e.target.value.toUpperCase())} />
          <TextField
            label="Discount value"
            type="number"
            min={1}
            step="0.01"
            value={value.Discount_value}
            onChange={(e) => update("Discount_value", e.target.value)}
            hint="Required. Must be greater than 0."
          />
          <TextField label="Min bill amount" type="number" value={value.min_bill_amount} onChange={(e) => update("min_bill_amount", e.target.value)} />
          <TextField label="Max discount amount" type="number" value={value.max_discount_amount} onChange={(e) => update("max_discount_amount", e.target.value)} />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <TextField label="Title" value={value.title} onChange={(e) => update("title", e.target.value)} />
          <TextField label="Subtitle" value={value.subtitle} onChange={(e) => update("subtitle", e.target.value)} />
          <TextField label="Badge text" value={value.badge_text} onChange={(e) => update("badge_text", e.target.value)} />
          <TextField label="Badge kind" value={value.badge_kind} onChange={(e) => update("badge_kind", e.target.value)} />
          <TextField label="Ribbon text" value={value.ribbon_text} onChange={(e) => update("ribbon_text", e.target.value)} />
          <TextField label="Sponsor name" value={value.sponsor_name} onChange={(e) => update("sponsor_name", e.target.value)} />
          {isBankOffer ? (
            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-700">Bank logo</p>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => update("logo_file", e.target.files?.[0] || null)}
                className="block h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
              />
              {value.logo_file ? <p className="text-xs text-slate-500">Selected file: {value.logo_file.name}</p> : null}
              {value.logo_url ? (
                <a href={value.logo_url} target="_blank" rel="noreferrer" className="text-xs text-cyan-700 underline">
                  Preview current logo
                </a>
              ) : null}
            </div>
          ) : null}
          <div className="md:col-span-2">
            <TextAreaField label="Description" value={value.description} onChange={(e) => update("description", e.target.value)} />
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Schedule and Terms" description="When the offer starts, when it should expire, and which standard terms apply.">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <TextField
            label="Starts on"
            type="date"
            value={value.starts_at}
            onChange={(e) => update("starts_at", e.target.value)}
            hint="Saved with the current time when you save the offer."
          />
          <TextField
            label="Ends on"
            type="date"
            value={value.ends_at}
            onChange={(e) => update("ends_at", e.target.value)}
            hint="This is saved as 11:59 PM on the selected date."
          />
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <ToggleField label="Auto apply" checked={value.is_auto_apply} onCheckedChange={(checked) => update("is_auto_apply", checked)} />
          <ToggleField label="Active" checked={value.is_active} onCheckedChange={(checked) => update("is_active", checked)} />
          <ToggleField label="Stackable" checked={value.is_stackable} onCheckedChange={(checked) => update("is_stackable", checked)} />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-3">
            <p className="text-sm font-medium text-slate-700">Terms and conditions</p>
            <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              {termPresets.map((term) => {
                const checked = selectedPresetTerms.includes(term);
                return (
                  <label key={term} className="flex items-start gap-3 text-sm text-slate-700">
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(nextChecked) => {
                        const nextTerms = nextChecked
                          ? [...selectedPresetTerms, term]
                          : selectedPresetTerms.filter((item) => item !== term);
                        updateTerms(nextTerms, customTerms);
                      }}
                    />
                    <span className="leading-5">{term}</span>
                  </label>
                );
              })}
            </div>
            <TextAreaField
              label="Additional terms"
              value={customTerms}
              onChange={(e) => updateTerms([...selectedPresetTerms], e.target.value)}
              hint="Optional extra terms, one per line."
            />
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            Loaded {planOptions.length} plans for targeting support in the nested editors.
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
