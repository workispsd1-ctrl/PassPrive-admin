"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import { showToast } from "@/hooks/useToast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type ClaimStatus = "submitted" | "under_review" | "approved" | "rejected";

interface ReceiptClaim {
  id: string;
  user_id: string;
  restaurant_id: string | null;
  image_path: string;
  bill_amount: string | null;
  currency_code: string;
  purchase_date: string | null;
  status: ClaimStatus;
  reward_amount: string | null;
  reward_percent: string | null;
  rejection_reason: string | null;
  amount_source: string | null;
  receipt_number: string | null;
  ocr_text: string | null;
  submitted_at: string;
  reviewed_at: string | null;
  restaurants?: { name: string | null } | null;
  users?: { name: string | null; email: string | null } | null;
}

const QUEUES: { key: string; label: string; statuses: ClaimStatus[] }[] = [
  { key: "pending", label: "Needs review", statuses: ["submitted", "under_review"] },
  { key: "approved", label: "Approved", statuses: ["approved"] },
  { key: "rejected", label: "Rejected", statuses: ["rejected"] },
];

const REJECT_REASONS = [
  "Receipt is blurry",
  "This receipt is from a different merchant",
  "Total amount is not visible",
  "Receipt date is outside the deal period",
  "Duplicate of a receipt already claimed",
];

const SELECT =
  "id, user_id, restaurant_id, image_path, bill_amount, currency_code, purchase_date, status, reward_amount, reward_percent, rejection_reason, amount_source, receipt_number, ocr_text, submitted_at, reviewed_at, restaurants(name), users(name, email)";

function money(amount: string | null, currency = "MUR") {
  if (amount === null || amount === undefined) return "—";
  const value = Number(amount);
  if (!Number.isFinite(value)) return "—";
  return `${currency} ${value.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
}

function stamp(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
}

export default function ReceiptClaimsPage() {
  const supabase = supabaseBrowser;
  const [queue, setQueue] = useState(QUEUES[0]);
  const [claims, setClaims] = useState<ReceiptClaim[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const [amounts, setAmounts] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("receipt_claims")
      .select(SELECT)
      .in("status", queue.statuses)
      .order("submitted_at", { ascending: queue.key === "pending" })
      .limit(100);
    setLoading(false);
    if (error) {
      showToast({ title: "Could not load claims", description: error.message, type: "error" });
      return;
    }
    const rows = (data || []) as unknown as ReceiptClaim[];
    setClaims(rows);

    const signed: Record<string, string> = {};
    await Promise.all(
      rows.map(async (claim) => {
        const { data: file } = await supabase.storage
          .from("receipts")
          .createSignedUrl(claim.image_path, 3600);
        if (file?.signedUrl) signed[claim.id] = file.signedUrl;
      })
    );
    setPreviews(signed);
  }, [supabase, queue]);

  useEffect(() => {
    load();
  }, [load]);

  const decide = useCallback(
    async (claim: ReceiptClaim, status: ClaimStatus, reason?: string) => {
      setBusyId(claim.id);
      const patch: Record<string, unknown> = {
        status,
        reviewed_at: new Date().toISOString(),
        rejection_reason: status === "rejected" ? reason || "Receipt could not be verified" : null,
      };
      const typed = amounts[claim.id];
      if (status === "approved" && typed !== undefined && typed !== "") {
        patch.bill_amount = Number(typed);
        patch.amount_source = "staff";
      }
      const { error } = await supabase.from("receipt_claims").update(patch).eq("id", claim.id);
      setBusyId(null);
      if (error) {
        showToast({ title: "Could not save", description: error.message, type: "error" });
        return;
      }
      showToast({
        type: "success",
        title: status === "approved" ? "Claim approved" : "Claim rejected",
        description:
          status === "approved"
            ? "Privé Credits have been credited to the member."
            : reason || "The member can upload a clearer photo.",
      });
      load();
    },
    [supabase, amounts, load]
  );

  const counts = useMemo(() => claims.length, [claims]);

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Receipt claims</h1>
          <p className="text-sm text-gray-500">
            Receipts members uploaded after revealing a deal. Approving credits the member
            automatically — the reward is priced from their membership tier.
          </p>
        </div>
        <Button variant="outline" onClick={load} disabled={loading}>
          {loading ? "Loading…" : "Refresh"}
        </Button>
      </div>

      <div className="flex gap-2">
        {QUEUES.map((entry) => (
          <button
            key={entry.key}
            onClick={() => setQueue(entry)}
            className={`rounded-full px-4 py-1.5 text-sm ${
              entry.key === queue.key
                ? "bg-gray-900 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {entry.label}
          </button>
        ))}
        <span className="self-center text-sm text-gray-400">{counts} claim(s)</span>
      </div>

      {!loading && !claims.length ? (
        <p className="rounded-md border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500">
          Nothing in this queue.
        </p>
      ) : null}

      <div className="space-y-4">
        {claims.map((claim) => {
          const pending = claim.status === "submitted" || claim.status === "under_review";
          return (
            <div key={claim.id} className="grid gap-4 rounded-lg border border-gray-200 p-4 md:grid-cols-[220px_1fr]">
              <div className="relative h-[280px] w-full overflow-hidden rounded-md bg-gray-100">
                {previews[claim.id] ? (
                  <Image
                    src={previews[claim.id]}
                    alt="Receipt"
                    fill
                    unoptimized
                    className="object-contain"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-gray-400">
                    No preview
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="text-lg font-semibold text-gray-900">
                    {claim.restaurants?.name || "Unknown merchant"}
                  </span>
                  <span className="text-sm text-gray-500">
                    {claim.users?.name || claim.users?.email || claim.user_id.slice(0, 8)}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      claim.status === "approved"
                        ? "bg-green-100 text-green-700"
                        : claim.status === "rejected"
                        ? "bg-red-100 text-red-700"
                        : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {claim.status.replace("_", " ")}
                  </span>
                </div>

                <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm md:grid-cols-4">
                  <div>
                    <dt className="text-gray-500">Bill amount</dt>
                    <dd className="font-medium text-gray-900">
                      {money(claim.bill_amount, claim.currency_code)}
                      {claim.amount_source ? (
                        <span className="ml-1 text-xs text-gray-400">({claim.amount_source})</span>
                      ) : null}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-gray-500">Reward</dt>
                    <dd className="font-medium text-gray-900">
                      {claim.reward_amount ? `${claim.reward_amount} credits` : "—"}
                      {claim.reward_percent ? (
                        <span className="ml-1 text-xs text-gray-400">({claim.reward_percent}%)</span>
                      ) : null}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-gray-500">Bill number</dt>
                    <dd className="font-medium text-gray-900">{claim.receipt_number || "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-gray-500">Submitted</dt>
                    <dd className="font-medium text-gray-900">{stamp(claim.submitted_at)}</dd>
                  </div>
                </dl>

                {claim.rejection_reason ? (
                  <p className="text-sm text-red-600">Reason: {claim.rejection_reason}</p>
                ) : null}

                {claim.ocr_text ? (
                  <details className="text-xs text-gray-500">
                    <summary className="cursor-pointer">Scanned text</summary>
                    <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap rounded bg-gray-50 p-2">
                      {claim.ocr_text}
                    </pre>
                  </details>
                ) : null}

                {pending ? (
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <Input
                      className="h-9 w-40"
                      placeholder="Correct amount"
                      inputMode="decimal"
                      value={amounts[claim.id] ?? (claim.bill_amount ?? "")}
                      onChange={(event) =>
                        setAmounts((current) => ({ ...current, [claim.id]: event.target.value }))
                      }
                    />
                    <Button
                      onClick={() => decide(claim, "approved")}
                      disabled={busyId === claim.id}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      Approve &amp; credit
                    </Button>
                    <select
                      className="h-9 rounded-md border border-gray-300 px-2 text-sm"
                      defaultValue=""
                      onChange={(event) => {
                        if (!event.target.value) return;
                        decide(claim, "rejected", event.target.value);
                        event.target.value = "";
                      }}
                      disabled={busyId === claim.id}
                    >
                      <option value="">Reject with reason…</option>
                      {REJECT_REASONS.map((reason) => (
                        <option key={reason} value={reason}>
                          {reason}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <p className="text-xs text-gray-400">Reviewed {stamp(claim.reviewed_at)}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
