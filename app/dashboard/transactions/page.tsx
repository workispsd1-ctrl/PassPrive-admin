"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ExternalLink, RefreshCcw, Search } from "lucide-react";

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
type PaymentSessionRow = {
  id: string;
  sourceType: PaymentSource;
  sourceId: string;
  paymentProvider: string;
  paymentContext: "BOOKING" | "BILL_PAYMENT";
  contextReferenceId: string | null;
  userId: string;
  merchantTrace: string;
  merchantApplicationId: string;
  trackingId: string;
  amountMajor: number;
  amountMinor: number;
  currencyCode: string;
  discountAmount: number;
  cashbackAmount: number;
  originalAmount: number;
  status: string;
  gatewayStatus: string | null;
  gatewayResultCode: string | null;
  gatewayResultDescription: string | null;
  transactionIndex: string | null;
  authorizationCode: string | null;
  bankReference: string | null;
  verifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

const SOURCE_LABELS: Record<PaymentSource, string> = {
  store: "Store",
  restaurant: "Restaurant",
};

function formatDateTime(value: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatAmount(value: number, currencyCode: string) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: currencyCode || "MUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatText(value: string | null | undefined) {
  return value && value.trim().length > 0 ? value : "-";
}

function toLocalDateKey(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getTransactionDate(row: PaymentSessionRow) {
  return row.createdAt || row.updatedAt || row.verifiedAt;
}

function getSourceAccent(sourceType: PaymentSource) {
  return sourceType === "store"
    ? "border-sky-200 bg-sky-50 text-sky-700"
    : "border-violet-200 bg-violet-50 text-violet-700";
}

function getSourcePath(row: PaymentSessionRow) {
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
  const [rows, setRows] = useState<PaymentSessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<string>("all");
  const [selectedDate, setSelectedDate] = useState(() => toLocalDateKey(new Date()));
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    const loadTransactions = async () => {
      setLoading(true);

      const { data, error } = await supabaseBrowser
        .from("payment_sessions")
        .select("*")
        .in("status", ["PENDING", "VERIFIED_SUCCESS"])
        .order("updated_at", { ascending: false });

      if (error) {
        showToast({
          type: "error",
          title: "Failed to load payment sessions",
          description: error.message,
        });
        setRows([]);
        setLoading(false);
        return;
      }

      const nextRows: PaymentSessionRow[] = (data || [])
        .filter((item: any) => Boolean(item.store_id || item.restaurant_id))
        .map((item: any) => {
          const sourceType: PaymentSource = item.store_id ? "store" : "restaurant";
          const sourceId = item.store_id || item.restaurant_id;

          return {
            id: item.id,
            sourceType,
            sourceId,
            paymentProvider: item.payment_provider,
            paymentContext: item.payment_context,
            contextReferenceId: item.context_reference_id,
            userId: item.user_id,
            merchantTrace: item.merchant_trace,
            merchantApplicationId: item.merchant_application_id,
            trackingId: item.tracking_id,
            amountMajor: Number(item.amount_major || 0),
            amountMinor: Number(item.amount_minor || 0),
            currencyCode: item.currency_code || "MUR",
            discountAmount: Number(item.discount_amount || 0),
            cashbackAmount: Number(item.cashback_amount || 0),
            originalAmount: Number(item.original_amount || 0),
            status: item.status,
            gatewayStatus: item.gateway_status,
            gatewayResultCode: item.gateway_result_code,
            gatewayResultDescription: item.gateway_result_description,
            transactionIndex: item.transaction_index,
            authorizationCode: item.authorization_code,
            bankReference: item.bank_reference,
            verifiedAt: item.verified_at,
            createdAt: item.created_at,
            updatedAt: item.updated_at,
          };
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

      const transactionDate = getTransactionDate(row);
      const parsedDate = transactionDate ? new Date(transactionDate) : null;
      if (!parsedDate || Number.isNaN(parsedDate.getTime())) return false;
      const rowDateKey = toLocalDateKey(parsedDate);

      if (rowDateKey !== selectedDate) return false;

      if (!normalizedSearch) return true;

      const haystack = [
        row.sourceId,
        row.paymentProvider,
        row.paymentContext,
        row.status,
        row.gatewayStatus,
        row.gatewayResultCode,
        row.gatewayResultDescription,
        row.merchantTrace,
        row.merchantApplicationId,
        row.trackingId,
        row.bankReference,
        row.authorizationCode,
        row.transactionIndex,
        row.userId,
        row.contextReferenceId,
        row.currencyCode,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedSearch);
    });
  }, [rows, activeTab, selectedDate, searchTerm]);

  const summary = useMemo(() => {
    const stores = filteredRows.filter((row) => row.sourceType === "store").length;
    const restaurants = filteredRows.filter((row) => row.sourceType === "restaurant").length;
    const totalVerifiedAmount = filteredRows
      .filter((row) => row.status === "VERIFIED_SUCCESS")
      .reduce((total, row) => total + row.amountMajor, 0);

    return { stores, restaurants, totalVerifiedAmount };
  }, [filteredRows]);

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
              <StatCard label="Total transactions" value={String(filteredRows.length)} hint="Filtered by selected date" />
              <StatCard label="Store transactions" value={String(summary.stores)} />
              <StatCard label="Restaurant transactions" value={String(summary.restaurants)} />
              <StatCard
                label="Total amount"
                value={formatAmount(summary.totalVerifiedAmount, "MUR")}
              />
            </div>

            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="relative w-full lg:max-w-md">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search by trace, tracking, status, gateway, context, or source"
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

                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(event) => setSelectedDate(event.target.value || toLocalDateKey(new Date()))}
                  className="h-10 min-w-[160px] rounded-xl border-slate-200 bg-white text-sm"
                />

                <Button
                  className="h-10 rounded-2xl bg-[#5800AB] px-5 text-sm text-white shadow-[0_10px_20px_rgba(88,0,171,0.25)] hover:bg-[#4a0090]"
                  onClick={() => setRefreshToken((value) => value + 1)}
                >
                  <RefreshCcw className="mr-2 h-4 w-4" />
                  Refresh
                </Button>
              </div>
            </div>

            {loading ? (
              <TransactionsSkeleton />
            ) : filteredRows.length === 0 ? (
              <div className="rounded-[16px] border border-dashed border-slate-200 bg-white px-6 py-16 text-center">
                <p className="text-sm font-medium text-slate-900">No payment sessions found</p>
                <p className="mt-2 text-sm text-slate-500">Try changing the search or switching source tabs.</p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-[16px] border border-slate-200/80 bg-white/75 shadow-[0_2px_14px_rgba(15,23,42,0.07)]">
                <div className="overflow-x-auto">
                  <Table className="min-w-[1500px] table-fixed">
                    <TableHeader>
                      <TableRow className="border-slate-100 hover:bg-transparent">
                        <TableHead className="w-[130px] px-4 py-4">Type</TableHead>
                        <TableHead className="w-[220px] px-4 py-4">Session</TableHead>
                        <TableHead className="w-[280px] px-4 py-4">Amounts</TableHead>
                        <TableHead className="w-[180px] px-4 py-4">Status</TableHead>
                        <TableHead className="w-[290px] px-4 py-4">Gateway</TableHead>
                        <TableHead className="w-[210px] px-4 py-4">Timeline</TableHead>
                        <TableHead className="w-[150px] px-4 py-4 text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>

                    <TableBody>
                      {filteredRows.map((row) => (
                        <TableRow key={row.id} className="border-slate-100">
                          <TableCell className="w-[130px] whitespace-normal px-4 py-4 align-top">
                            <Badge
                              variant="outline"
                              className={`rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.18em] ${getSourceAccent(row.sourceType)}`}
                            >
                              {SOURCE_LABELS[row.sourceType]}
                            </Badge>
                            <div className="mt-2 break-all text-xs leading-5 text-slate-500">{row.sourceId}</div>
                          </TableCell>

                          <TableCell className="w-[220px] whitespace-normal px-4 py-4 align-top">
                            <div className="space-y-1">
                              <div className="text-[13px] font-medium text-slate-900">{formatText(row.paymentContext)}</div>
                              <div className="text-xs text-slate-500">Track: {row.trackingId}</div>
                              <div className="break-all text-xs text-slate-500">Trace: {row.merchantTrace}</div>
                              <div className="break-all text-xs text-slate-400">Ref: {formatText(row.contextReferenceId)}</div>
                            </div>
                          </TableCell>

                          <TableCell className="w-[280px] whitespace-normal px-4 py-4 align-top">
                            <div className="space-y-1">
                              <div className="font-medium text-slate-900">{formatAmount(row.amountMajor, row.currencyCode)}</div>
                              <div className="text-xs text-slate-500">
                                Original: {formatAmount(row.originalAmount, row.currencyCode)}
                              </div>
                              <div className="text-xs text-slate-500">
                                Discount: {formatAmount(row.discountAmount, row.currencyCode)} | Cashback: {formatAmount(row.cashbackAmount, row.currencyCode)}
                              </div>
                              <div className="text-xs text-slate-400">Minor: {row.amountMinor} {row.currencyCode}</div>
                            </div>
                          </TableCell>

                          <TableCell className="w-[180px] px-4 py-4 align-top">
                            <div className="space-y-2">
                              <Badge
                                variant="outline"
                                className={cn(
                                  "rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.18em]",
                                  row.status === "VERIFIED_SUCCESS"
                                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                    : row.status === "PENDING"
                                      ? "border-amber-200 bg-amber-50 text-amber-700"
                                      : "border-slate-200 bg-slate-50 text-slate-600"
                                )}
                              >
                                {formatText(row.status)}
                              </Badge>
                              <div className="text-xs text-slate-500">Provider: {formatText(row.paymentProvider)}</div>
                            </div>
                          </TableCell>

                          <TableCell className="w-[290px] whitespace-normal px-4 py-4 align-top">
                            <div className="space-y-1 text-xs text-slate-500">
                              <div>Status: {formatText(row.gatewayStatus)}</div>
                              <div>Code: {formatText(row.gatewayResultCode)}</div>
                              <div className="break-words">Description: {formatText(row.gatewayResultDescription)}</div>
                              <div>Txn Index: {formatText(row.transactionIndex)}</div>
                              <div>Auth: {formatText(row.authorizationCode)}</div>
                              <div className="break-all">Bank Ref: {formatText(row.bankReference)}</div>
                            </div>
                          </TableCell>

                          <TableCell className="w-[210px] whitespace-normal px-4 py-4 align-top text-xs text-slate-600">
                            <div>Created: {formatDateTime(row.createdAt)}</div>
                            <div className="mt-1">Updated: {formatDateTime(row.updatedAt)}</div>
                            <div className="mt-1">Verified: {formatDateTime(row.verifiedAt)}</div>
                          </TableCell>

                          <TableCell className="w-[150px] px-4 py-4 align-top text-right">
                            <Button asChild variant="ghost" className="rounded-full hover:bg-slate-100">
                              <Link href={getSourcePath(row)}>
                                Open
                                <ExternalLink className="ml-2 h-4 w-4" />
                              </Link>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
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
