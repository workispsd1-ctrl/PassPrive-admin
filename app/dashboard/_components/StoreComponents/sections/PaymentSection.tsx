"use client";

import React from "react";
import { CreditCard, FileText, Minus, Plus, Wallet } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ICON_INDIGO, inputClass } from "../constants";
import { Label, Section } from "../ui";
import type { OpenSection, PaymentDetails } from "../types";

export default function PaymentSection({
  openSection,
  onToggle,
  preserveScroll,
  payment,
  setPayment,
}: {
  openSection: OpenSection;
  onToggle: (id: Exclude<OpenSection, null>) => void;
  preserveScroll: (fn: () => void) => void;
  payment: PaymentDetails;
  setPayment: React.Dispatch<React.SetStateAction<PaymentDetails>>;
}) {
  return (
    <Section
      id="payment"
      title="Payment & Settlement"
      subtitle="Required to settle payouts and generate invoices."
      icon={<Wallet size={18} />}
      openSection={openSection}
      onToggle={onToggle}
      preserveScroll={preserveScroll}
      rightIcon={<span className={ICON_INDIGO}>{openSection === "payment" ? <Minus size={18} /> : <Plus size={18} />}</span>}
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl border bg-gray-50 p-4">
          <div className="flex items-center gap-2 font-semibold text-gray-900">
            <FileText size={18} />
            Business & Invoicing
          </div>

          <div className="mt-4 space-y-4">
            <div>
              <Label required>Legal business name</Label>
              <Input
                className={inputClass}
                value={payment.legal_business_name}
                onChange={(e) => setPayment((p) => ({ ...p, legal_business_name: e.target.value }))}
                placeholder="e.g. Culture Circle Ltd"
              />
            </div>

            <div>
              <Label>Display name on invoice</Label>
              <Input
                className={inputClass}
                value={payment.display_name_on_invoice || ""}
                onChange={(e) => setPayment((p) => ({ ...p, display_name_on_invoice: e.target.value }))}
                placeholder="e.g. Culture Circle"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label>Currency</Label>
                <Input
                  className={inputClass}
                  value={payment.currency}
                  onChange={(e) => setPayment((p) => ({ ...p, currency: e.target.value }))}
                  placeholder="MUR"
                />
              </div>

              <div>
                <Label>Settlement cycle</Label>
                <select
                  className="w-full rounded-md border border-gray-300 px-3 h-10 text-sm"
                  value={payment.settlement_cycle}
                  onChange={(e) =>
                    setPayment((p) => ({
                      ...p,
                      settlement_cycle: e.target.value as PaymentDetails["settlement_cycle"],
                    }))
                  }
                >
                  <option value="T+0">T+0</option>
                  <option value="T+1">T+1</option>
                  <option value="T+2">T+2</option>
                  <option value="WEEKLY">Weekly</option>
                  <option value="MONTHLY">Monthly</option>
                </select>
              </div>
            </div>

            <div>
              <Label>Commission (%)</Label>
              <Input
                className={inputClass}
                value={payment.commission_percent || ""}
                onChange={(e) => setPayment((p) => ({ ...p, commission_percent: e.target.value }))}
                placeholder="e.g. 10"
              />
            </div>

            <div>
              <Label>KYC Status</Label>
              <select
                className="w-full rounded-md border border-gray-300 px-3 h-10 text-sm"
                value={payment.kyc_status}
                onChange={(e) =>
                  setPayment((p) => ({
                    ...p,
                    kyc_status: e.target.value as PaymentDetails["kyc_status"],
                  }))
                }
              >
                <option value="NOT_STARTED">Not started</option>
                <option value="PENDING">Pending</option>
                <option value="VERIFIED">Verified</option>
              </select>
            </div>

            <div>
              <Label>Notes</Label>
              <Textarea
                className={inputClass}
                value={payment.notes || ""}
                onChange={(e) => setPayment((p) => ({ ...p, notes: e.target.value }))}
                placeholder="Any settlement notes..."
              />
            </div>
          </div>
        </div>

        <div className="rounded-xl border bg-gray-50 p-4">
          <div className="flex items-center gap-2 font-semibold text-gray-900">
            <CreditCard size={18} />
            Payout Method
          </div>

          <div className="mt-4 space-y-4">
            <div>
              <Label required>Payout method</Label>
              <select
                className="w-full rounded-md border border-gray-300 px-3 h-10 text-sm"
                value={payment.payout_method}
                onChange={(e) =>
                  setPayment((p) => ({
                    ...p,
                    payout_method: e.target.value as PaymentDetails["payout_method"],
                  }))
                }
              >
                <option value="BANK_TRANSFER">Bank transfer</option>
                <option value="UPI">UPI</option>
                <option value="MANUAL">Manual settlement</option>
              </select>
            </div>

            {payment.payout_method === "BANK_TRANSFER" ? (
              <>
                <div>
                  <Label required>Beneficiary name</Label>
                  <Input
                    className={inputClass}
                    value={payment.beneficiary_name || ""}
                    onChange={(e) => setPayment((p) => ({ ...p, beneficiary_name: e.target.value }))}
                  />
                </div>

                <div>
                  <Label required>Bank name</Label>
                  <Input
                    className={inputClass}
                    value={payment.bank_name || ""}
                    onChange={(e) => setPayment((p) => ({ ...p, bank_name: e.target.value }))}
                  />
                </div>

                <div>
                  <Label required>Account number</Label>
                  <Input
                    className={inputClass}
                    value={payment.account_number || ""}
                    onChange={(e) => setPayment((p) => ({ ...p, account_number: e.target.value }))}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <Label>IFSC</Label>
                    <Input
                      className={inputClass}
                      value={payment.ifsc || ""}
                      onChange={(e) => setPayment((p) => ({ ...p, ifsc: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>IBAN</Label>
                    <Input
                      className={inputClass}
                      value={payment.iban || ""}
                      onChange={(e) => setPayment((p) => ({ ...p, iban: e.target.value }))}
                    />
                  </div>
                </div>

                <div>
                  <Label>SWIFT</Label>
                  <Input
                    className={inputClass}
                    value={payment.swift || ""}
                    onChange={(e) => setPayment((p) => ({ ...p, swift: e.target.value }))}
                  />
                </div>
              </>
            ) : null}

            {payment.payout_method === "UPI" ? (
              <div>
                <Label required>UPI ID</Label>
                <Input
                  className={inputClass}
                  value={payment.payout_upi_id || ""}
                  onChange={(e) => setPayment((p) => ({ ...p, payout_upi_id: e.target.value }))}
                  placeholder="example@upi"
                />
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </Section>
  );
}
