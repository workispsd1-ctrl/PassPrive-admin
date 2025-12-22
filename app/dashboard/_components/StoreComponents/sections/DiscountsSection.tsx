"use client";

import React from "react";
import { Minus, Percent, Plus, Ticket, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ICON_INDIGO, PRIMARY_BTN, PRIMARY_BTN_OUTLINE, inputClass } from "../constants";
import { Label, Section, Switch } from "../ui";
import type { DiscountType, DiscountValueType, OpenSection, StoreOfferDraft } from "../types";

export default function DiscountsSection({
  openSection,
  onToggle,
  preserveScroll,
  offers,
  addOffer,
  removeOffer,
  toggleOfferExpanded,
  updateOffer,
  typeLabel,
}: {
  openSection: OpenSection;
  onToggle: (id: Exclude<OpenSection, null>) => void;
  preserveScroll: (fn: () => void) => void;

  offers: StoreOfferDraft[];
  addOffer: (preset?: DiscountType) => void;
  removeOffer: (id: string) => void;
  toggleOfferExpanded: (id: string) => void;
  updateOffer: (id: string, patch: Partial<StoreOfferDraft>) => void;
  typeLabel: (t: DiscountType) => string;
}) {
  return (
    <Section
      id="discounts"
      title="Offers & Discounts"
      subtitle="In-store discount, PassPrive Pass discounts, bank benefits, coupons."
      icon={<Percent size={18} />}
      openSection={openSection}
      onToggle={onToggle}
      preserveScroll={preserveScroll}
      rightIcon={<span className={ICON_INDIGO}>{openSection === "discounts" ? <Minus size={18} /> : <Plus size={18} />}</span>}
    >
      <div className="flex flex-col gap-3">
        <div className="rounded-2xl border bg-gray-50 p-4">
          <div className="text-sm font-semibold text-gray-900">Quick add</div>
          <div className="text-xs text-gray-500 mt-1">
            Add multiple rules. Your app can display these under the Offers section.
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Button type="button" className={PRIMARY_BTN} onClick={() => addOffer("IN_STORE")}>
              <Plus size={16} className="mr-2" />
              In-store Discount
            </Button>

            <Button
              type="button"
              variant="outline"
              className={PRIMARY_BTN_OUTLINE}
              onClick={() => addOffer("PASSPRIVE_PASS")}
            >
              <Plus size={16} className="mr-2" />
              PassPrive Pass Discount
            </Button>

            <Button
              type="button"
              variant="outline"
              className={PRIMARY_BTN_OUTLINE}
              onClick={() => addOffer("BANK_BENEFIT")}
            >
              <Plus size={16} className="mr-2" />
              Bank Benefits
            </Button>

            <Button
              type="button"
              variant="outline"
              className={PRIMARY_BTN_OUTLINE}
              onClick={() => addOffer("COUPON")}
            >
              <Ticket size={16} className="mr-2" />
              Coupon Code
            </Button>
          </div>
        </div>

        <div className="space-y-3">
          {offers.map((o, idx) => (
            <div key={o.id} className="rounded-2xl border bg-white">
              <div className="flex items-center justify-between px-5 py-4">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    className="h-5 w-5"
                    checked={o.enabled}
                    onChange={(e) => updateOffer(o.id, { enabled: e.target.checked })}
                  />
                  <div>
                    <div className="text-sm font-extrabold text-gray-900">
                      {o.title || `Offer #${idx + 1}`}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {typeLabel(o.type)} • {o.enabled ? "Enabled" : "Disabled"}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => toggleOfferExpanded(o.id)}
                    className={[
                      "rounded-lg border px-3 py-2 text-sm font-semibold hover:bg-gray-50",
                      PRIMARY_BTN_OUTLINE,
                      "text-indigo-700",
                    ].join(" ")}
                    title={o.expanded ? "Collapse" : "Expand"}
                  >
                    <span className={ICON_INDIGO}>
                      {o.expanded ? <Minus size={16} /> : <Plus size={16} />}
                    </span>
                  </button>

                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 border-red-200 text-red-600 hover:bg-red-50"
                    onClick={() => removeOffer(o.id)}
                  >
                    <X size={16} className="mr-2" />
                    Remove
                  </Button>
                </div>
              </div>

              {o.expanded ? (
                <div className="px-5 pb-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label required>Type</Label>
                      <select
                        className="w-full rounded-md border border-gray-300 px-3 h-10 text-sm"
                        value={o.type}
                        onChange={(e) => {
                          const type = e.target.value as DiscountType;
                          updateOffer(o.id, {
                            type,
                            requires_pass: type === "PASSPRIVE_PASS",
                            coupon_code: type === "COUPON" ? "SAVE10" : "",
                            badge_text:
                              type === "PASSPRIVE_PASS"
                                ? "PassPrive Pass"
                                : type === "BANK_BENEFIT"
                                ? "Bank benefits"
                                : type === "COUPON"
                                ? "Coupon"
                                : "In-store",
                          });
                        }}
                      >
                        <option value="IN_STORE">In-store Discount</option>
                        <option value="PASSPRIVE_PASS">PassPrive Pass / Passport</option>
                        <option value="BANK_BENEFIT">Bank Benefits</option>
                        <option value="COUPON">Coupon Code</option>
                      </select>
                    </div>

                    <div>
                      <Label required>Title</Label>
                      <Input
                        className={inputClass}
                        value={o.title}
                        onChange={(e) => updateOffer(o.id, { title: e.target.value })}
                        placeholder="e.g. PassPrive Pass: 15% off"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <Label>Subtitle</Label>
                      <Input
                        className={inputClass}
                        value={o.subtitle || ""}
                        onChange={(e) => updateOffer(o.id, { subtitle: e.target.value })}
                        placeholder="e.g. Only for pass members"
                      />
                    </div>

                    <div>
                      <Label>Badge text</Label>
                      <Input
                        className={inputClass}
                        value={o.badge_text || ""}
                        onChange={(e) => updateOffer(o.id, { badge_text: e.target.value })}
                        placeholder="e.g. PassPrive Pass"
                      />
                    </div>

                    <div>
                      <Label>Value type</Label>
                      <select
                        className="w-full rounded-md border border-gray-300 px-3 h-10 text-sm"
                        value={o.value_type}
                        onChange={(e) =>
                          updateOffer(o.id, {
                            value_type: e.target.value as DiscountValueType,
                          })
                        }
                      >
                        <option value="PERCENT">Percentage</option>
                        <option value="FLAT">Flat Amount</option>
                      </select>
                    </div>

                    {o.value_type === "PERCENT" ? (
                      <div>
                        <Label required>Percent (0-100)</Label>
                        <Input
                          className={inputClass}
                          value={o.percent || ""}
                          onChange={(e) => updateOffer(o.id, { percent: e.target.value })}
                          placeholder="10"
                        />
                      </div>
                    ) : (
                      <div>
                        <Label required>Flat amount</Label>
                        <Input
                          className={inputClass}
                          value={o.flat_amount || ""}
                          onChange={(e) => updateOffer(o.id, { flat_amount: e.target.value })}
                          placeholder="200"
                        />
                      </div>
                    )}

                    <div>
                      <Label>Currency</Label>
                      <Input
                        className={inputClass}
                        value={o.currency || "MUR"}
                        onChange={(e) => updateOffer(o.id, { currency: e.target.value })}
                        placeholder="MUR"
                      />
                    </div>

                    <div>
                      <Label>Min bill</Label>
                      <Input
                        className={inputClass}
                        value={o.min_bill || ""}
                        onChange={(e) => updateOffer(o.id, { min_bill: e.target.value })}
                        placeholder="Optional"
                      />
                    </div>

                    <div>
                      <Label>Max discount</Label>
                      <Input
                        className={inputClass}
                        value={o.max_discount || ""}
                        onChange={(e) => updateOffer(o.id, { max_discount: e.target.value })}
                        placeholder="Optional"
                      />
                    </div>

                    <div>
                      <Label>Start date</Label>
                      <Input
                        className={inputClass}
                        type="date"
                        value={o.start_at || ""}
                        onChange={(e) => updateOffer(o.id, { start_at: e.target.value })}
                      />
                    </div>

                    <div>
                      <Label>End date</Label>
                      <Input
                        className={inputClass}
                        type="date"
                        value={o.end_at || ""}
                        onChange={(e) => updateOffer(o.id, { end_at: e.target.value })}
                      />
                    </div>

                    {o.type === "PASSPRIVE_PASS" ? (
                      <>
                        <div className="md:col-span-2">
                          <Switch
                            checked={!!o.requires_pass}
                            onChange={(v) => updateOffer(o.id, { requires_pass: v })}
                            label="Requires PassPrive Pass"
                            hint="If ON, show only to pass members."
                            preserveScroll={preserveScroll}
                          />
                        </div>

                        <div className="md:col-span-2">
                          <Label hint="Comma separated. e.g. Gold, Platinum">Pass tiers</Label>
                          <Input
                            className={inputClass}
                            value={o.pass_tiers || ""}
                            onChange={(e) => updateOffer(o.id, { pass_tiers: e.target.value })}
                            placeholder="Gold, Platinum"
                          />
                        </div>
                      </>
                    ) : null}

                    {o.type === "COUPON" ? (
                      <div className="md:col-span-2">
                        <Label required>Coupon code</Label>
                        <Input
                          className={inputClass}
                          value={o.coupon_code || ""}
                          onChange={(e) => updateOffer(o.id, { coupon_code: e.target.value })}
                          placeholder="SAVE10"
                        />
                      </div>
                    ) : null}

                    <div className="md:col-span-2">
                      <Switch
                        checked={!!o.stackable}
                        onChange={(v) => updateOffer(o.id, { stackable: v })}
                        label="Stackable"
                        hint="If ON, this offer can combine with others."
                        preserveScroll={preserveScroll}
                      />
                    </div>

                    <div className="md:col-span-2">
                      <Label>Terms</Label>
                      <Textarea
                        className={inputClass}
                        value={o.terms || ""}
                        onChange={(e) => updateOffer(o.id, { terms: e.target.value })}
                        placeholder="Any exclusions, timing restrictions, required proof..."
                      />
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </Section>
  );
}
