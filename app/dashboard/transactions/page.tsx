"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ExternalLink,
  RefreshCcw,
  Search,
} from "lucide-react";

import { supabaseBrowser } from "@/lib/supabaseBrowser";
import { showToast } from "@/hooks/useToast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type PaymentSource = "store" | "restaurant";

type PaymentRow = {
  sourceType: PaymentSource;
  sourceId: string;
  legalBusinessName: string | null;
  displayNameOnInvoice: string | null;
  payoutMethod: string | null;
  beneficiaryName: string | null;
  bankName: string | null;
  accountNumber: string | null;
  ifsc: string | null;
  iban: string | null;
  swift: string | null;
  payoutUpiId: string | null;
  settlementCycle: string | null;
  commissionPercent: number | string | null;
  currency: string | null;
  taxIdLabel: string | null;
  taxIdValue: string | null;
  billingEmail: string | null;
  billingPhone: string | null;
  kycStatus: string | null;
  notes: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  paymentDetails: Record<string, unknown> | null;
};

const SOURCE_LABELS: Record<PaymentSource, string> = {
  store: "Store Payment",
  restaurant: "Restaurant Payment",
};

function formatDateTime(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatCommission(value: number | string | null) {
  if (value === null || value === undefined || value === "") return "—";
  const numericValue = typeof value === "number" ? value : Number(value);
  if (Number.isNaN(numericValue)) return "—";
  return `${numericValue.toFixed(numericValue % 1 === 0 ? 0 : 2)}%`;
}

function formatText(value: string | null | undefined) {
  return value && value.trim().length > 0 ? value : "—";
}

function getBusinessName(row: PaymentRow) {
  return row.legalBusinessName?.trim() || row.displayNameOnInvoice?.trim() || row.sourceId;
}

function getPayoutSummary(row: PaymentRow) {
  if (row.payoutMethod === "UPI") {
    return row.payoutUpiId ? `UPI: ${row.payoutUpiId}` : "UPI";
  }

  if (row.payoutMethod === "BANK_TRANSFER") {
    const bankParts = [row.bankName, row.accountNumber, row.ifsc, row.iban, row.swift].filter(Boolean);
    return bankParts.length > 0 ? bankParts.join(" • ") : "Bank transfer";
  }

  if (row.payoutMethod === "MANUAL") {
    return row.notes ? `Manual: ${row.notes}` : "Manual payout";
  }

  return formatText(row.payoutMethod);
}

function getSourceAccent(sourceType: PaymentSource) {
  return sourceType === "store"
    ? {
        badge: "border-sky-200 bg-sky-50 text-sky-700",
        gradient: "from-sky-50 via-white to-cyan-50",
      }
    : {
        badge: "border-violet-200 bg-violet-50 text-violet-700",
        gradient: "from-violet-50 via-white to-fuchsia-50",
      };
}

function getSourcePath(row: PaymentRow) {
  return row.sourceType === "store"
    ? `/dashboard/manage-stores/${row.sourceId}`
    : `/dashboard/manage-restaurants/${row.sourceId}`;
}

function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card className="border-white/70 bg-white/80 shadow-sm backdrop-blur">
      <CardContent className="p-4">
        <div className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">{label}</div>
        <div className="mt-2 text-2xl font-semibold text-slate-900">{value}</div>
        {hint ? <div className="mt-1 text-sm text-slate-500">{hint}</div> : null}
      </CardContent>
    </Card>
  );
}

function TransactionsSkeleton() {
  return (
    <div className="overflow-hidden rounded-[16px] border border-slate-200/80 bg-white/75 shadow-[0_2px_14px_rgba(15,23,42,0.07)]">
      <div className="h-12 animate-pulse border-b border-slate-100 bg-slate-50/80" />
      {Array.from({ length: 8 }).map((_, index) => (
        <div key={index} className="h-20 animate-pulse border-b border-slate-100 bg-white" />
      ))}
    </div>
  );
}

export default function TransactionsPage() {
  const [rows, setRows] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<string>("all");
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    const loadTransactions = async () => {
      setLoading(true);

      const [storeResult, restaurantResult] = await Promise.all([
        supabaseBrowser.from("store_payment_details").select("*").order("updated_at", { ascending: false }),
        supabaseBrowser.from("restaurant_payment_details").select("*").order("updated_at", { ascending: false }),
      ]);

      const nextRows: PaymentRow[] = [];

      if (storeResult.error) {
        showToast({
          type: "error",
          title: "Failed to load store payments",
          description: storeResult.error.message,
        });
      } else {
        nextRows.push(
          ...(storeResult.data || []).map((item: any) => ({
            sourceType: "store" as const,
            sourceId: item.store_id,
            legalBusinessName: item.legal_business_name,
            displayNameOnInvoice: item.display_name_on_invoice,
            payoutMethod: item.payout_method,
            beneficiaryName: item.beneficiary_name,
            bankName: item.bank_name,
            accountNumber: item.account_number,
            ifsc: item.ifsc,
            iban: item.iban,
            swift: item.swift,
            payoutUpiId: item.payout_upi_id,
            settlementCycle: item.settlement_cycle,
            commissionPercent: item.commission_percent,
            currency: item.currency,
            taxIdLabel: item.tax_id_label,
            taxIdValue: item.tax_id_value,
            billingEmail: item.billing_email,
            billingPhone: item.billing_phone,
            kycStatus: item.kyc_status,
            notes: item.notes,
            createdAt: item.created_at,
            updatedAt: item.updated_at,
            paymentDetails: item.payment_details || {},
          }))
        );
      }

      if (restaurantResult.error) {
        showToast({
          type: "error",
          title: "Failed to load restaurant payments",
          description: restaurantResult.error.message,
        });
      } else {
        nextRows.push(
          ...(restaurantResult.data || []).map((item: any) => ({
            sourceType: "restaurant" as const,
            sourceId: item.restaurant_id,
            legalBusinessName: item.legal_business_name,
            displayNameOnInvoice: item.display_name_on_invoice,
            payoutMethod: item.payout_method,
            beneficiaryName: item.beneficiary_name,
            bankName: item.bank_name,
            accountNumber: item.account_number,
            ifsc: item.ifsc,
            iban: item.iban,
            swift: item.swift,
            payoutUpiId: item.payout_upi_id,
            settlementCycle: item.settlement_cycle,
            commissionPercent: item.commission_percent,
            currency: item.currency,
            taxIdLabel: item.tax_id_label,
            taxIdValue: item.tax_id_value,
            billingEmail: item.billing_email,
            billingPhone: item.billing_phone,
            kycStatus: item.kyc_status,
            notes: item.notes,
            createdAt: item.created_at,
            updatedAt: item.updated_at,
            paymentDetails: item.payment_details || {},
          }))
        );
      }

      nextRows.sort((left, right) => {
        const leftTime = new Date(left.updatedAt || left.createdAt || 0).getTime();
        const rightTime = new Date(right.updatedAt || right.createdAt || 0).getTime();
        return rightTime - leftTime;
      });

      setRows(nextRows);
      setLoading(false);
    };

    void loadTransactions();
  }, [refreshToken]);

  const filteredRows = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return rows.filter((row) => {
      const matchesTab = activeTab === "all" || row.sourceType === activeTab;
      if (!matchesTab) return false;

      if (!normalizedSearch) return true;

      const haystack = [
        row.legalBusinessName,
        row.displayNameOnInvoice,
        row.sourceId,
        row.payoutMethod,
        row.settlementCycle,
        row.kycStatus,
        row.billingEmail,
        row.billingPhone,
        row.bankName,
        row.accountNumber,
        row.ifsc,
        row.iban,
        row.swift,
        row.payoutUpiId,
        row.notes,
        row.currency,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedSearch);
    });
  }, [rows, activeTab, searchTerm]);

  const summary = useMemo(() => {
    const verified = rows.filter((row) => (row.kycStatus || "").toUpperCase() === "VERIFIED").length;
    const pending = rows.filter((row) => (row.kycStatus || "").toUpperCase() === "PENDING").length;
    const stores = rows.filter((row) => row.sourceType === "store").length;
    const restaurants = rows.filter((row) => row.sourceType === "restaurant").length;

    return { verified, pending, stores, restaurants };
  }, [rows]);

  return (
    <div className="min-h-full bg-[linear-gradient(135deg,_#ECFEFF_0%,_#F3E8FF_100%)]">
      <div className="mx-auto flex min-h-full w-full max-w-[1360px] flex-col px-4 py-4 sm:px-5 lg:px-6">
        <Card
          className="overflow-hidden rounded-[18px] border border-slate-200/70 shadow-[0_18px_50px_rgba(15,23,42,0.08)] backdrop-blur-sm"
          style={{
            background:
              "linear-gradient(310.35deg, rgba(255, 255, 255, 0.42) 4.07%, rgba(255, 255, 255, 0.32) 48.73%, rgba(255, 255, 255, 0.22) 100%)",
          }}
        >
          <CardContent className="space-y-4 px-4 py-4 sm:px-5">
            <div className="grid gap-4 md:grid-cols-4">
              <StatCard label="Total transactions" value={String(rows.length)} hint="Combined store and restaurant payment profiles" />
              <StatCard label="Store payments" value={String(summary.stores)} />
              <StatCard label="Restaurant payments" value={String(summary.restaurants)} />
              <StatCard label="KYC verified" value={String(summary.verified)} hint={`${summary.pending} pending review`} />
            </div>

            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="relative w-full lg:max-w-md">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search by business name, payout method, email, phone, or bank info"
                  className="h-10 rounded-xl border-slate-200 bg-white pl-10 text-sm shadow-[0_1px_0_rgba(15,23,42,0.02)] placeholder:text-slate-400"
                />
              </div>

              <div className="flex items-center gap-3">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full lg:w-auto">
                  <TabsList className="grid h-11 w-full grid-cols-3 rounded-xl bg-slate-100 p-1 lg:w-[360px]">
                    <TabsTrigger value="all" className="rounded-lg data-[state=active]:bg-white">
                      All
                    </TabsTrigger>
                    <TabsTrigger value="store" className="rounded-lg data-[state=active]:bg-white">
                      Stores
                    </TabsTrigger>
                    <TabsTrigger value="restaurant" className="rounded-lg data-[state=active]:bg-white">
                      Restaurants
                    </TabsTrigger>
                  </TabsList>
                </Tabs>

                <Button className="h-10 rounded-2xl bg-[#5800AB] px-5 text-sm text-white shadow-[0_10px_20px_rgba(88,0,171,0.25)] hover:bg-[#4a0090]" onClick={() => setRefreshToken((value) => value + 1)}>
                  <RefreshCcw className="mr-2 h-4 w-4" />
                  Refresh
                </Button>
              </div>
            </div>

            {loading ? (
              <TransactionsSkeleton />
            ) : filteredRows.length === 0 ? (
              <div className="rounded-[16px] border border-dashed border-slate-200 bg-white px-6 py-16 text-center">
                <p className="text-sm font-medium text-slate-900">No payment records found</p>
                <p className="mt-2 text-sm text-slate-500">Try changing the search or switching to another payment source.</p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-[16px] border border-slate-200/80 bg-white/75 shadow-[0_2px_14px_rgba(15,23,42,0.07)]">
                <div className="overflow-x-auto">
                  <Table className="min-w-[1500px] table-fixed">
                    <TableHeader>
                      <TableRow className="border-slate-100 hover:bg-transparent">
                        <TableHead className="w-[170px] px-4 py-4">Type</TableHead>
                        <TableHead className="w-[280px] px-4 py-4 pr-8">Business</TableHead>
                        <TableHead className="w-[360px] px-4 py-4 pr-10">Payout</TableHead>
                        <TableHead className="w-[180px] px-4 py-4 pl-8">Settlement</TableHead>
                        <TableHead className="px-4 py-4">KYC</TableHead>
                        <TableHead className="px-4 py-4">Commission</TableHead>
                        <TableHead className="px-4 py-4">Updated</TableHead>
                        <TableHead className="px-4 py-4 text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>

                    <TableBody>
                      {filteredRows.map((row) => {
                        const accent = getSourceAccent(row.sourceType);

                        return (
                          <TableRow key={`${row.sourceType}-${row.sourceId}`} className="border-slate-100">
                            <TableCell className="w-[170px] whitespace-normal px-4 py-4 align-top">
                              <Badge
                                variant="outline"
                                className={`rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.18em] ${accent.badge}`}
                              >
                                {SOURCE_LABELS[row.sourceType]}
                              </Badge>
                              <div className="mt-2 break-all text-xs leading-5 text-slate-500">{row.sourceId}</div>
                            </TableCell>

                            <TableCell className="w-[280px] whitespace-normal px-4 py-4 pr-8 align-top">
                              <div className="space-y-1">
                                <div className="break-words text-[15px] font-medium leading-6 text-slate-900">
                                  {getBusinessName(row)}
                                </div>
                                <div className="break-words text-sm leading-5 text-slate-500">
                                  {formatText(row.displayNameOnInvoice)}
                                </div>
                                <div className="break-words text-xs leading-5 text-slate-400">
                                  {formatText(row.billingEmail)}{row.billingPhone ? ` • ${row.billingPhone}` : ""}
                                </div>
                              </div>
                            </TableCell>

                            <TableCell className="w-[360px] whitespace-normal px-4 py-4 pr-10 align-top">
                              <div className="space-y-1">
                                <div className="font-medium text-slate-900">{formatText(row.payoutMethod)}</div>
                                <div className="max-w-[320px] break-words text-sm leading-6 text-slate-500">
                                  {getPayoutSummary(row)}
                                </div>
                                {row.beneficiaryName ? (
                                  <div className="text-xs text-slate-400">Beneficiary: {row.beneficiaryName}</div>
                                ) : null}
                              </div>
                            </TableCell>

                            <TableCell className="w-[180px] whitespace-normal px-4 py-4 pl-8 align-top">
                              <div className="space-y-1">
                                <div className="font-medium text-slate-900">{formatText(row.settlementCycle)}</div>
                                <div className="break-words text-xs text-slate-400">Currency: {formatText(row.currency)}</div>
                                {row.taxIdLabel || row.taxIdValue ? (
                                  <div className="break-words text-xs text-slate-400">
                                    {formatText(row.taxIdLabel)}: {formatText(row.taxIdValue)}
                                  </div>
                                ) : null}
                              </div>
                            </TableCell>

                            <TableCell className="px-4 py-4 align-top">
                              <Badge
                                variant="outline"
                                className={cn(
                                  "rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.18em]",
                                  row.kycStatus === "VERIFIED"
                                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                    : row.kycStatus === "PENDING"
                                      ? "border-amber-200 bg-amber-50 text-amber-700"
                                      : "border-slate-200 bg-slate-50 text-slate-600"
                                )}
                              >
                                {formatText(row.kycStatus)}
                              </Badge>
                            </TableCell>

                            <TableCell className="px-4 py-4 align-top text-slate-700">
                              {formatCommission(row.commissionPercent)}
                            </TableCell>

                            <TableCell className="px-4 py-4 align-top text-sm text-slate-600">
                              {formatDateTime(row.updatedAt || row.createdAt)}
                            </TableCell>

                            <TableCell className="px-4 py-4 align-top text-right">
                              <Button asChild variant="ghost" className="rounded-full hover:bg-slate-100">
                                <Link href={getSourcePath(row)}>
                                  Open
                                  <ExternalLink className="ml-2 h-4 w-4" />
                                </Link>
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}