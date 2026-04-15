"use client";

import * as React from "react";
import Link from "next/link";
import { Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";

import {
  OFFER_MODULES,
  OFFER_SOURCE_TYPES,
  OFFER_STATUSES,
  PAYMENT_FLOWS,
  deleteOfferDirect,
  listOffersDirect,
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
import { Card, CardContent } from "@/components/ui/card";
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
      setOffers(await listOffersDirect());
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
      await deleteOfferDirect(deleteCandidate.id);
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
    <div className="space-y-8">
      <Card
        className="overflow-hidden rounded-[18px] border border-slate-200/70 shadow-[0_18px_50px_rgba(15,23,42,0.08)] backdrop-blur-sm"
        style={{
          background:
            "linear-gradient(310.35deg, rgba(255, 255, 255, 0.42) 4.07%, rgba(255, 255, 255, 0.32) 48.73%, rgba(255, 255, 255, 0.22) 100%)",
        }}
      >
        <CardContent className="space-y-4 px-4 py-4 sm:px-5">
          <div className="flex flex-wrap justify-end gap-3">
            <PrimaryButton asChild className="h-10 rounded-2xl bg-[#5800AB] px-5 text-sm shadow-[0_10px_20px_rgba(88,0,171,0.25)] hover:bg-[#4a0090]">
              <Link href="/dashboard/unified-offers/new">
                <Plus className="mr-2 h-4 w-4" />
                New offer
              </Link>
            </PrimaryButton>
            <Button
              variant="outline"
              className="h-10 rounded-2xl border-slate-200 bg-white px-5 text-sm"
              onClick={() => loadOffers(true)}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            {[
              { label: "Total offers", value: counts.total },
              { label: "Active", value: counts.active },
              { label: "Bank", value: counts.banks },
              { label: "Merchant", value: counts.merchants },
            ].map((card) => (
              <Card key={card.label} className="border-white/70 bg-white/80 shadow-sm backdrop-blur">
                <CardContent className="p-4">
                  <div className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">{card.label}</div>
                  <div className="mt-2 text-3xl font-semibold text-slate-900">{card.value}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

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
