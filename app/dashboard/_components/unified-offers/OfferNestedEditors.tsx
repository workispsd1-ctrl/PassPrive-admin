"use client";

import * as React from "react";
import { Plus, Search, Trash2 } from "lucide-react";

import {
  CARD_NETWORKS,
  CONDITION_OPERATORS,
  CONDITION_TYPES,
  PAYMENT_FLOWS,
  PAYMENT_INSTRUMENT_TYPES,
  TARGET_TYPES,
  apiDelete,
  apiGet,
  apiPost,
  apiPut,
  getTargetLabel,
  numberOrNull,
  parseJsonInput,
  type CardNetwork,
  type EntityOption,
  type OfferBinRecord,
  type OfferConditionRecord,
  type OfferPaymentRuleRecord,
  type OfferRecord,
  type OfferRedemptionRecord,
  type OfferTargetRecord,
  type OfferUsageLimitDraft,
  type PaymentFlow,
  type PaymentInstrumentType,
  type TargetType,
} from "@/app/dashboard/_components/unified-offers/model";
import { EmptyState, PrimaryButton, SectionCard, SelectField, TextAreaField, TextField, ToggleField } from "@/app/dashboard/_components/unified-offers/ui";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { showToast } from "@/hooks/useToast";

export function OfferTargetsEditor({
  offerId,
  targets,
  onChange,
  storeOptions,
  restaurantOptions,
}: {
  offerId: string;
  targets: OfferTargetRecord[];
  onChange: (items: OfferTargetRecord[]) => void;
  storeOptions: EntityOption[];
  restaurantOptions: EntityOption[];
}) {
  const [draftType, setDraftType] = React.useState<TargetType>("ALL");
  const [draftValue, setDraftValue] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  const options =
    draftType === "STORE"
      ? storeOptions
      : draftType === "RESTAURANT"
      ? restaurantOptions
      : [];

  async function addTarget() {
    if (draftType !== "ALL" && !draftValue.trim()) {
      showToast({ title: "Target value required", description: "Choose or enter a target value.", type: "error" });
      return;
    }

    const payload: Record<string, unknown> = { target_type: draftType };
    if (draftType === "STORE") payload.store_id = draftValue;
    if (draftType === "RESTAURANT") payload.restaurant_id = draftValue;
    if (draftType === "CITY") payload.city = draftValue;
    if (draftType === "CATEGORY") payload.category = draftValue;
    if (draftType === "SUBCATEGORY") payload.subcategory = draftValue;
    if (draftType === "TAG") payload.tag = draftValue;

    try {
      setSaving(true);
      const response = await apiPost(`/api/offers/${offerId}/targets`, payload);
      const created = (response as { item?: OfferTargetRecord }).item || (response as OfferTargetRecord);
      onChange([...targets, created]);
      setDraftType("ALL");
      setDraftValue("");
      showToast({ title: "Target added", description: "Offer target saved." });
    } catch (error) {
      showToast({ title: "Failed to add target", description: error instanceof Error ? error.message : "Please try again.", type: "error" });
    } finally {
      setSaving(false);
    }
  }

  async function removeTarget(targetId: string) {
    try {
      await apiDelete(`/api/offers/${offerId}/targets/${targetId}`);
      onChange(targets.filter((item) => item.id !== targetId));
      showToast({ title: "Target removed", description: "Target deleted successfully." });
    } catch (error) {
      showToast({ title: "Failed to remove target", description: error instanceof Error ? error.message : "Please try again.", type: "error" });
    }
  }

  return (
    <SectionCard title="Targets" description="Add or remove ALL, STORE, RESTAURANT, CITY, CATEGORY, SUBCATEGORY, and TAG targeting.">
      <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)_auto] lg:items-end">
        <SelectField label="Target type" value={draftType} onValueChange={(value) => { setDraftType(value as TargetType); setDraftValue(""); }} options={TARGET_TYPES} />
        {["STORE", "RESTAURANT"].includes(draftType) ? (
          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-700">Target value</p>
            <select value={draftValue} onChange={(e) => setDraftValue(e.target.value)} className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none">
              <option value="">Select value</option>
              {options.map((option) => (
                <option key={option.id} value={option.id}>
                  {[option.name, option.city, option.area].filter(Boolean).join(" • ")}
                </option>
              ))}
            </select>
          </div>
        ) : draftType === "ALL" ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-600">No extra value needed.</div>
        ) : (
          <TextField label="Target value" value={draftValue} onChange={(e) => setDraftValue(e.target.value)} />
        )}
        <PrimaryButton busy={saving} onClick={addTarget} className="w-full lg:w-auto">
          <Plus className="mr-2 h-4 w-4" />
          Add target
        </PrimaryButton>
      </div>

      {targets.length === 0 ? (
        <EmptyState title="No targets yet" description="Add offer applicability rules here." />
      ) : (
        <div className="space-y-3">
          {targets.map((target) => (
            <div key={target.id} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
              <div>
                <p className="text-sm font-semibold text-slate-900">{target.target_type.replaceAll("_", " ")}</p>
                <p className="text-sm text-slate-600">{getTargetLabel(target)}</p>
              </div>
              <Button variant="outline" onClick={() => removeTarget(target.id)}>
                <Trash2 className="mr-2 h-4 w-4" />
                Remove
              </Button>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );
}

export function OfferConditionsEditor({
  offerId,
  conditions,
  onChange,
}: {
  offerId: string;
  conditions: OfferConditionRecord[];
  onChange: (items: OfferConditionRecord[]) => void;
}) {
  const [draft, setDraft] = React.useState({
    condition_type: "MIN_BILL_AMOUNT",
    operator: "GTE",
    condition_value: "",
    is_required: true,
    sort_order: "1",
  });

  async function saveNewCondition() {
    const parsedJson = parseJsonInput<unknown>(draft.condition_value);
    const conditionValue = parsedJson ?? numberOrNull(draft.condition_value) ?? draft.condition_value;
    try {
      const response = await apiPost(`/api/offers/${offerId}/conditions`, {
        condition_type: draft.condition_type,
        operator: draft.operator,
        condition_value: conditionValue,
        is_required: draft.is_required,
        sort_order: numberOrNull(draft.sort_order) ?? 1,
      });
      const created = (response as { item?: OfferConditionRecord }).item || (response as OfferConditionRecord);
      onChange([...conditions, created]);
      setDraft({ condition_type: "MIN_BILL_AMOUNT", operator: "GTE", condition_value: "", is_required: true, sort_order: "1" });
      showToast({ title: "Condition added", description: "Condition saved successfully." });
    } catch (error) {
      showToast({ title: "Failed to add condition", description: error instanceof Error ? error.message : "Please try again.", type: "error" });
    }
  }

  async function removeCondition(id: string) {
    try {
      await apiDelete(`/api/offers/${offerId}/conditions/${id}`);
      onChange(conditions.filter((item) => item.id !== id));
      showToast({ title: "Condition removed", description: "Condition deleted successfully." });
    } catch (error) {
      showToast({ title: "Failed to delete condition", description: error instanceof Error ? error.message : "Please try again.", type: "error" });
    }
  }

  return (
    <SectionCard title="Conditions" description="Add condition type, operator, condition value, required state, and sort order.">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <SelectField label="Condition type" value={draft.condition_type} onValueChange={(value) => setDraft((current) => ({ ...current, condition_type: value }))} options={CONDITION_TYPES} />
        <SelectField label="Operator" value={draft.operator} onValueChange={(value) => setDraft((current) => ({ ...current, operator: value }))} options={CONDITION_OPERATORS} />
        <TextField label="Sort order" type="number" value={draft.sort_order} onChange={(e) => setDraft((current) => ({ ...current, sort_order: e.target.value }))} />
        <div className="xl:col-span-2">
          <ToggleField label="Required" checked={draft.is_required} onCheckedChange={(checked) => setDraft((current) => ({ ...current, is_required: checked }))} />
        </div>
      </div>
      <TextAreaField label="Condition value" value={draft.condition_value} onChange={(e) => setDraft((current) => ({ ...current, condition_value: e.target.value }))} />
      <PrimaryButton onClick={saveNewCondition}>Save condition</PrimaryButton>

      {conditions.length === 0 ? null : (
        <div className="space-y-3">
          {conditions.map((condition) => (
            <div key={condition.id} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
              <div>
                <p className="text-sm font-semibold text-slate-900">{condition.condition_type.replaceAll("_", " ")}</p>
                <p className="text-sm text-slate-600">
                  {condition.operator} • {typeof condition.condition_value === "string" ? condition.condition_value : JSON.stringify(condition.condition_value)} • order {condition.sort_order}
                </p>
              </div>
              <Button variant="outline" onClick={() => removeCondition(condition.id)}>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );
}

export function OfferPaymentRulesEditor({
  offerId,
  rules,
  onChange,
}: {
  offerId: string;
  rules: OfferPaymentRuleRecord[];
  onChange: (items: OfferPaymentRuleRecord[]) => void;
}) {
  const [draft, setDraft] = React.useState({
    payment_flow: "ANY",
    payment_instrument_type: "CARD",
    card_network: "ANY",
    issuer_bank_name: "",
    coupon_code: "",
  });

  async function saveRule() {
    try {
      const response = await apiPost(`/api/offers/${offerId}/payment-rules`, {
        payment_flow: draft.payment_flow,
        payment_instrument_type: draft.payment_instrument_type,
        card_network: draft.card_network,
        issuer_bank_name: draft.issuer_bank_name.trim() || null,
        coupon_code: draft.coupon_code.trim() || null,
      });
      const created = (response as { item?: OfferPaymentRuleRecord }).item || (response as OfferPaymentRuleRecord);
      onChange([...rules, created]);
      setDraft({
        payment_flow: "ANY",
        payment_instrument_type: "CARD",
        card_network: "ANY",
        issuer_bank_name: "",
        coupon_code: "",
      });
      showToast({ title: "Payment rule added", description: "Payment rule saved successfully." });
    } catch (error) {
      showToast({ title: "Failed to add payment rule", description: error instanceof Error ? error.message : "Please try again.", type: "error" });
    }
  }

  async function removeRule(id: string) {
    try {
      await apiDelete(`/api/offers/${offerId}/payment-rules/${id}`);
      onChange(rules.filter((item) => item.id !== id));
      showToast({ title: "Payment rule removed", description: "Rule deleted successfully." });
    } catch (error) {
      showToast({ title: "Failed to delete payment rule", description: error instanceof Error ? error.message : "Please try again.", type: "error" });
    }
  }

  return (
    <SectionCard title="Payment Rules" description="Payment flow, instrument, card network, issuer bank, and coupon code filters.">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <SelectField label="Payment flow" value={draft.payment_flow} onValueChange={(value) => setDraft((current) => ({ ...current, payment_flow: value }))} options={PAYMENT_FLOWS} />
        <SelectField label="Payment instrument" value={draft.payment_instrument_type} onValueChange={(value) => setDraft((current) => ({ ...current, payment_instrument_type: value }))} options={PAYMENT_INSTRUMENT_TYPES} />
        <SelectField label="Card network" value={draft.card_network} onValueChange={(value) => setDraft((current) => ({ ...current, card_network: value }))} options={CARD_NETWORKS} />
        <TextField label="Issuer bank name" value={draft.issuer_bank_name} onChange={(e) => setDraft((current) => ({ ...current, issuer_bank_name: e.target.value }))} />
        <TextField label="Coupon code" value={draft.coupon_code} onChange={(e) => setDraft((current) => ({ ...current, coupon_code: e.target.value }))} />
      </div>
      <PrimaryButton onClick={saveRule}>Save payment rule</PrimaryButton>

      {rules.length === 0 ? null : (
        <div className="space-y-3">
          {rules.map((rule) => (
            <div key={rule.id} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  {rule.payment_flow || "ANY"} • {rule.payment_instrument_type || "Instrument"} • {rule.card_network || "ANY"}
                </p>
                <p className="text-sm text-slate-600">{rule.issuer_bank_name || "Any issuer"}{rule.coupon_code ? ` • ${rule.coupon_code}` : ""}</p>
              </div>
              <Button variant="outline" onClick={() => removeRule(rule.id)}>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );
}

export function OfferBinsEditor({
  offerId,
  bins,
  onChange,
}: {
  offerId: string;
  bins: OfferBinRecord[];
  onChange: (items: OfferBinRecord[]) => void;
}) {
  const [draft, setDraft] = React.useState({
    bin: "",
    card_network: "ANY",
    issuer_bank_name: "",
  });

  async function addBin() {
    if (!draft.bin.trim()) {
      showToast({ title: "BIN required", description: "Enter a BIN to save.", type: "error" });
      return;
    }

    try {
      const response = await apiPost(`/api/offers/${offerId}/bins`, {
        bin: draft.bin.trim(),
        card_network: draft.card_network,
        issuer_bank_name: draft.issuer_bank_name.trim() || null,
      });
      const created = (response as { item?: OfferBinRecord }).item || (response as OfferBinRecord);
      onChange([...bins, created]);
      setDraft({ bin: "", card_network: "ANY", issuer_bank_name: "" });
      showToast({ title: "BIN added", description: "BIN rule saved successfully." });
    } catch (error) {
      showToast({ title: "Failed to add BIN", description: error instanceof Error ? error.message : "Please try again.", type: "error" });
    }
  }

  async function removeBin(id: string) {
    try {
      await apiDelete(`/api/offers/${offerId}/bins/${id}`);
      onChange(bins.filter((item) => item.id !== id));
      showToast({ title: "BIN removed", description: "BIN rule deleted successfully." });
    } catch (error) {
      showToast({ title: "Failed to delete BIN", description: error instanceof Error ? error.message : "Please try again.", type: "error" });
    }
  }

  return (
    <SectionCard title="BINs" description="BIN management table for bank offers.">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <TextField label="BIN" value={draft.bin} onChange={(e) => setDraft((current) => ({ ...current, bin: e.target.value }))} />
        <SelectField label="Card network" value={draft.card_network} onValueChange={(value) => setDraft((current) => ({ ...current, card_network: value }))} options={CARD_NETWORKS} />
        <TextField label="Issuer bank" value={draft.issuer_bank_name} onChange={(e) => setDraft((current) => ({ ...current, issuer_bank_name: e.target.value }))} />
      </div>
      <PrimaryButton onClick={addBin}>Add BIN</PrimaryButton>

      {bins.length === 0 ? null : (
        <Table className="rounded-2xl border border-slate-200 bg-white">
          <TableHeader>
            <TableRow>
              <TableHead>BIN</TableHead>
              <TableHead>Network</TableHead>
              <TableHead>Issuer</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {bins.map((item) => (
              <TableRow key={item.id}>
                <TableCell>{item.bin || "—"}</TableCell>
                <TableCell>{item.card_network || "—"}</TableCell>
                <TableCell>{item.issuer_bank_name || "—"}</TableCell>
                <TableCell className="text-right">
                  <Button variant="outline" onClick={() => removeBin(item.id)}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </SectionCard>
  );
}

export function OfferUsageLimitsEditor({
  offerId,
  value,
  onChange,
}: {
  offerId: string;
  value: OfferUsageLimitDraft;
  onChange: (draft: OfferUsageLimitDraft) => void;
}) {
  async function saveUsageLimit() {
    try {
      await apiPut(`/api/offers/${offerId}/usage-limit`, {
        total_redemption_limit: numberOrNull(value.total_redemption_limit),
        per_user_redemption_limit: numberOrNull(value.per_user_redemption_limit),
        per_store_redemption_limit: numberOrNull(value.per_store_redemption_limit),
        per_restaurant_redemption_limit: numberOrNull(value.per_restaurant_redemption_limit),
        per_day_redemption_limit: numberOrNull(value.per_day_redemption_limit),
      });
      showToast({ title: "Usage limits saved", description: "Usage limits updated successfully." });
    } catch (error) {
      showToast({ title: "Failed to save usage limits", description: error instanceof Error ? error.message : "Please try again.", type: "error" });
    }
  }

  return (
    <SectionCard title="Usage Limits" description="Total, per-user, per-store, per-restaurant, and per-day redemption limits.">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <TextField label="Total redemption limit" type="number" value={value.total_redemption_limit} onChange={(e) => onChange({ ...value, total_redemption_limit: e.target.value })} />
        <TextField label="Per user redemption limit" type="number" value={value.per_user_redemption_limit} onChange={(e) => onChange({ ...value, per_user_redemption_limit: e.target.value })} />
        <TextField label="Per store redemption limit" type="number" value={value.per_store_redemption_limit} onChange={(e) => onChange({ ...value, per_store_redemption_limit: e.target.value })} />
        <TextField label="Per restaurant redemption limit" type="number" value={value.per_restaurant_redemption_limit} onChange={(e) => onChange({ ...value, per_restaurant_redemption_limit: e.target.value })} />
        <TextField label="Per day redemption limit" type="number" value={value.per_day_redemption_limit} onChange={(e) => onChange({ ...value, per_day_redemption_limit: e.target.value })} />
      </div>
      <PrimaryButton onClick={saveUsageLimit}>Save usage limits</PrimaryButton>
    </SectionCard>
  );
}

export function OfferApplicabilityTester({
  storeOptions,
  restaurantOptions,
}: {
  storeOptions: EntityOption[];
  restaurantOptions: EntityOption[];
}) {
  const [entityType, setEntityType] = React.useState<"store" | "restaurant">("store");
  const [entityId, setEntityId] = React.useState("");
  const [billAmount, setBillAmount] = React.useState("");
  const [paymentFlow, setPaymentFlow] = React.useState<PaymentFlow>("ANY");
  const [paymentInstrumentType, setPaymentInstrumentType] = React.useState<PaymentInstrumentType>("CARD");
  const [cardNetwork, setCardNetwork] = React.useState<CardNetwork>("ANY");
  const [issuerBankName, setIssuerBankName] = React.useState("");
  const [bin, setBin] = React.useState("");
  const [results, setResults] = React.useState<OfferRecord[]>([]);

  const options = entityType === "store" ? storeOptions : restaurantOptions;

  async function runTest() {
    if (!entityId) {
      showToast({ title: "Choose an entity", description: "Select a store or restaurant first.", type: "error" });
      return;
    }

    try {
      const endpoint = entityType === "store" ? `/api/offers/applicable/store/${entityId}` : `/api/offers/applicable/restaurant/${entityId}`;
      const payload = await apiGet(endpoint, {
        bill_amount: billAmount || undefined,
        payment_flow: paymentFlow,
        payment_instrument_type: paymentInstrumentType,
        card_network: cardNetwork,
        issuer_bank_name: issuerBankName || undefined,
        bin: bin || undefined,
      });
      setResults((Array.isArray(payload) ? payload : ((payload as { items?: OfferRecord[] }).items || [])) as OfferRecord[]);
      showToast({ title: "Applicability checked", description: "Preview results updated." });
    } catch (error) {
      showToast({ title: "Applicability test failed", description: error instanceof Error ? error.message : "Please try again.", type: "error" });
    }
  }

  return (
    <SectionCard title="Applicability Preview" description="Choose a store or restaurant, enter bill and payment info, and preview applicable offers.">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SelectField label="Entity type" value={entityType} onValueChange={(value) => { setEntityType(value as "store" | "restaurant"); setEntityId(""); }} options={["store", "restaurant"] as const} />
        <div className="space-y-2">
          <p className="text-sm font-medium text-slate-700">Entity</p>
          <select value={entityId} onChange={(e) => setEntityId(e.target.value)} className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none">
            <option value="">Select {entityType}</option>
            {options.map((option) => (
              <option key={option.id} value={option.id}>
                {[option.name, option.city, option.area].filter(Boolean).join(" • ")}
              </option>
            ))}
          </select>
        </div>
        <TextField label="Bill amount" type="number" value={billAmount} onChange={(e) => setBillAmount(e.target.value)} />
        <SelectField label="Payment flow" value={paymentFlow} onValueChange={(value) => setPaymentFlow(value as PaymentFlow)} options={PAYMENT_FLOWS} />
        <SelectField label="Payment instrument" value={paymentInstrumentType} onValueChange={(value) => setPaymentInstrumentType(value as PaymentInstrumentType)} options={PAYMENT_INSTRUMENT_TYPES} />
        <SelectField label="Card network" value={cardNetwork} onValueChange={(value) => setCardNetwork(value as CardNetwork)} options={CARD_NETWORKS} />
        <TextField label="Issuer" value={issuerBankName} onChange={(e) => setIssuerBankName(e.target.value)} />
        <TextField label="BIN" value={bin} onChange={(e) => setBin(e.target.value)} />
      </div>
      <PrimaryButton onClick={runTest}>
        <Search className="mr-2 h-4 w-4" />
        Run applicability test
      </PrimaryButton>

      {results.length === 0 ? (
        <EmptyState title="No preview results yet" description="Run the tester to see applicable offers returned by the backend." />
      ) : (
        <Table className="rounded-2xl border border-slate-200 bg-white">
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Module</TableHead>
              <TableHead>Payment flow</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {results.map((offer) => (
              <TableRow key={offer.id}>
                <TableCell>{offer.title || "Untitled offer"}</TableCell>
                <TableCell>{offer.source_type || "—"}</TableCell>
                <TableCell>{offer.offer_type || "—"}</TableCell>
                <TableCell>{offer.status || "—"}</TableCell>
                <TableCell>{offer.module || "—"}</TableCell>
                <TableCell>{offer.payment_flow || "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </SectionCard>
  );
}

export function OfferRedemptionsPanel({ redemptions }: { redemptions: OfferRedemptionRecord[] }) {
  return (
    <SectionCard title="Redemptions" description="Read-only redemption records for quick admin inspection.">
      {redemptions.length === 0 ? (
        <EmptyState title="No redemptions yet" description="Redemption records will appear here after the offer is used." />
      ) : (
        <Table className="rounded-2xl border border-slate-200 bg-white">
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Order</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Bill amount</TableHead>
              <TableHead>Discount</TableHead>
              <TableHead>Redeemed at</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {redemptions.map((row) => (
              <TableRow key={row.id}>
                <TableCell>{row.id}</TableCell>
                <TableCell>{row.user_id || "—"}</TableCell>
                <TableCell>{row.order_id || "—"}</TableCell>
                <TableCell>{row.status || "—"}</TableCell>
                <TableCell>{row.bill_amount ?? "—"}</TableCell>
                <TableCell>{row.discount_amount ?? "—"}</TableCell>
                <TableCell>{row.redeemed_at ? new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(row.redeemed_at)) : "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </SectionCard>
  );
}
