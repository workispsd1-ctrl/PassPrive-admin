"use client";

import * as React from "react";
import Link from "next/link";
import { Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";

import {
  OFFER_MODULES,
  OFFER_SOURCE_TYPES,
  OFFER_STATUSES,
  PAYMENT_FLOWS,
  apiDelete,
  apiGet,
  normalizeArrayPayload,
  type OfferRecord,
} from "@/app/dashboard/_components/unified-offers/model";
import {
  EmptyState,
  LoadingBlock,
  PrimaryButton,
  SectionCard,
  SelectField,
  StatusPill,
  TextField,
} from "@/app/dashboard/_components/unified-offers/ui";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { showToast } from "@/hooks/useToast";

function formatDateRange(offer: OfferRecord) {
  if (!offer.starts_at && !offer.ends_at) return "No schedule";
  const fmt = (value?: string | null) => (value ? new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(value)) : "Open");
  return `${fmt(offer.starts_at)} - ${fmt(offer.ends_at)}`;
}

export function UnifiedOffersPage() {
  const [offers, setOffers] = React.useState<OfferRecord[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [deleteCandidate, setDeleteCandidate] = React.useState<OfferRecord | null>(null);
  const [filters, setFilters] = React.useState({
    search: "",
    source_type: "ALL",
    module: "ALL",
    status: "ALL",
    payment_flow: "ALL",
    sponsor_name: "",
  });

  const filteredOffers = React.useMemo(
    () =>
      offers.filter((offer) => {
        if (filters.search && !(offer.title || "").toLowerCase().includes(filters.search.toLowerCase())) return false;
        if (filters.source_type !== "ALL" && offer.source_type !== filters.source_type) return false;
        if (filters.module !== "ALL" && offer.module !== filters.module) return false;
        if (filters.status !== "ALL" && offer.status !== filters.status) return false;
        if (filters.payment_flow !== "ALL" && offer.payment_flow !== filters.payment_flow) return false;
        if (filters.sponsor_name && !(offer.sponsor_name || "").toLowerCase().includes(filters.sponsor_name.toLowerCase())) return false;
        return true;
      }),
    [filters, offers]
  );

  async function loadOffers(silent = false) {
    try {
      if (silent) setRefreshing(true);
      else setLoading(true);
      const payload = await apiGet("/api/offers");
      setOffers(normalizeArrayPayload<OfferRecord>(payload));
    } catch (error) {
      showToast({ title: "Failed to load offers", description: error instanceof Error ? error.message : "Please try again.", type: "error" });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  React.useEffect(() => {
    loadOffers();
  }, []);

  async function deleteOffer() {
    if (!deleteCandidate) return;
    try {
      await apiDelete(`/api/offers/${deleteCandidate.id}`);
      setOffers((current) => current.filter((item) => item.id !== deleteCandidate.id));
      setDeleteCandidate(null);
      showToast({ title: "Offer deleted", description: "Offer deleted successfully." });
    } catch (error) {
      showToast({ title: "Failed to delete offer", description: error instanceof Error ? error.message : "Please try again.", type: "error" });
    }
  }

  const counts = {
    total: offers.length,
    active: offers.filter((offer) => offer.status === "ACTIVE").length,
    banks: offers.filter((offer) => offer.source_type === "BANK").length,
    merchants: offers.filter((offer) => offer.source_type === "MERCHANT").length,
  };

  return (
    <div className="space-y-6">
      <section className="rounded-[32px] border border-slate-200 bg-[linear-gradient(135deg,#0F172A_0%,#1E293B_55%,#155E75_100%)] px-6 py-7 text-white shadow-xl">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200">Unified Offer Engine</p>
            <h1 className="mt-3 text-3xl font-semibold">Offers</h1>
            <p className="mt-3 text-sm leading-6 text-slate-200">
              Separate from the home-banner screen. This area manages PassPrive, merchant, and bank offers with one shared admin flow.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <PrimaryButton asChild>
              <Link href="/dashboard/unified-offers/new">
                <Plus className="mr-2 h-4 w-4" />
                New offer
              </Link>
            </PrimaryButton>
            <Button variant="outline" className="h-11 rounded-xl border-white/20 bg-white/10 text-white hover:bg-white/15" onClick={() => loadOffers(true)}>
              <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-4">
          {[
            { label: "Total offers", value: counts.total },
            { label: "Active", value: counts.active },
            { label: "Bank", value: counts.banks },
            { label: "Merchant", value: counts.merchants },
          ].map((card) => (
            <div key={card.label} className="rounded-2xl border border-white/10 bg-white/8 px-4 py-4 backdrop-blur">
              <p className="text-xs uppercase tracking-[0.2em] text-cyan-100">{card.label}</p>
              <p className="mt-2 text-3xl font-semibold text-white">{card.value}</p>
            </div>
          ))}
        </div>
      </section>

      <SectionCard title="Filters" description="Search by title and filter by source type, module, status, payment flow, and sponsor.">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <TextField label="Search title" value={filters.search} onChange={(e) => setFilters((current) => ({ ...current, search: e.target.value }))} />
          <SelectField label="Source type" value={filters.source_type} onValueChange={(value) => setFilters((current) => ({ ...current, source_type: value }))} options={["ALL", ...OFFER_SOURCE_TYPES]} />
          <SelectField label="Module" value={filters.module} onValueChange={(value) => setFilters((current) => ({ ...current, module: value }))} options={["ALL", ...OFFER_MODULES]} />
          <SelectField label="Status" value={filters.status} onValueChange={(value) => setFilters((current) => ({ ...current, status: value }))} options={["ALL", ...OFFER_STATUSES]} />
          <SelectField label="Payment flow" value={filters.payment_flow} onValueChange={(value) => setFilters((current) => ({ ...current, payment_flow: value }))} options={["ALL", ...PAYMENT_FLOWS]} />
          <TextField label="Sponsor name" value={filters.sponsor_name} onChange={(e) => setFilters((current) => ({ ...current, sponsor_name: e.target.value }))} />
        </div>
      </SectionCard>

      {loading ? (
        <LoadingBlock label="Loading offers..." />
      ) : filteredOffers.length === 0 ? (
        <EmptyState title="No offers found" description="Try wider filters or create a new offer." action={<PrimaryButton asChild><Link href="/dashboard/unified-offers/new">Create offer</Link></PrimaryButton>} />
      ) : (
        <SectionCard title="Offer List" description={`${filteredOffers.length} result${filteredOffers.length === 1 ? "" : "s"} shown.`}>
          <Table className="min-w-[1100px]">
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Source type</TableHead>
                <TableHead>Badge</TableHead>
                <TableHead>Offer type</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date range</TableHead>
                <TableHead>Sponsor</TableHead>
                <TableHead>Module</TableHead>
                <TableHead>Payment flow</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOffers.map((offer) => (
                <TableRow key={offer.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium text-slate-900">{offer.title || "Untitled offer"}</p>
                      <p className="text-xs text-slate-500">{offer.owner_entity_type || "No owner"}{offer.owner_entity_id ? ` • ${offer.owner_entity_id}` : ""}</p>
                    </div>
                  </TableCell>
                  <TableCell>{offer.source_type || "—"}</TableCell>
                  <TableCell>{offer.badge_text || "—"}</TableCell>
                  <TableCell>{offer.offer_type || "—"}</TableCell>
                  <TableCell>{offer.priority ?? "—"}</TableCell>
                  <TableCell><StatusPill label={offer.status || "Unknown"} active={offer.status === "ACTIVE"} /></TableCell>
                  <TableCell>{formatDateRange(offer)}</TableCell>
                  <TableCell>{offer.sponsor_name || "—"}</TableCell>
                  <TableCell>{offer.module || "—"}</TableCell>
                  <TableCell>{offer.payment_flow || "—"}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button asChild variant="outline">
                        <Link href={`/dashboard/unified-offers/${offer.id}`}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit
                        </Link>
                      </Button>
                      <Button variant="outline" className="text-rose-600 hover:text-rose-700" onClick={() => setDeleteCandidate(offer)}>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </SectionCard>
      )}

      <AlertDialog open={Boolean(deleteCandidate)} onOpenChange={(open) => { if (!open) setDeleteCandidate(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete offer?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes {deleteCandidate?.title || "this offer"}. Use pause or archive if you only want to disable it safely.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={deleteOffer} className="bg-rose-600 hover:bg-rose-700">Delete offer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
