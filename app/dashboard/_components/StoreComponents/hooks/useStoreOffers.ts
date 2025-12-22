"use client";

import { useState } from "react";
import type { DiscountType, StoreOfferDraft } from "../types";
import { uid } from "../utils";

function typeLabel(t: DiscountType) {
  if (t === "PASSPRIVE_PASS") return "PassPrive Pass";
  if (t === "IN_STORE") return "In-store";
  if (t === "BANK_BENEFIT") return "Bank benefits";
  return "Coupon";
}

export function useStoreOffers(preserveScroll: (fn: () => void) => void) {
  const [offers, setOffers] = useState<StoreOfferDraft[]>([
    {
      id: uid("offer"),
      enabled: false,
      type: "PASSPRIVE_PASS",
      title: "PassPrive Pass: 10% off",
      subtitle: "Only for Pass members",
      badge_text: "PassPrive Pass",
      value_type: "PERCENT",
      percent: "10",
      flat_amount: "",
      currency: "MUR",
      min_bill: "",
      max_discount: "",
      start_at: "",
      end_at: "",
      requires_pass: true,
      pass_tiers: "Gold, Platinum",
      coupon_code: "",
      stackable: false,
      terms: "",
      expanded: false,
    },
  ]);

  const addOffer = (preset?: DiscountType) => {
    const type: DiscountType = preset || "IN_STORE";
    const isPass = type === "PASSPRIVE_PASS";
    const isCoupon = type === "COUPON";
    const isBank = type === "BANK_BENEFIT";

    preserveScroll(() => {
      setOffers((prev) => [
        ...prev.map((o) => ({ ...o, expanded: false })),
        {
          id: uid("offer"),
          enabled: true,
          type,
          title:
            type === "IN_STORE"
              ? "In-store: 10% off"
              : type === "PASSPRIVE_PASS"
              ? "PassPrive Pass: 15% off"
              : type === "BANK_BENEFIT"
              ? "Bank benefits: 10% off"
              : "Coupon: SAVE10",

          subtitle:
            type === "PASSPRIVE_PASS"
              ? "Only for Pass members"
              : type === "BANK_BENEFIT"
              ? "Only for eligible card holders"
              : type === "COUPON"
              ? "Apply code at checkout"
              : "",

          badge_text: isPass
            ? "PassPrive Pass"
            : isBank
            ? "Bank benefits"
            : isCoupon
            ? "Coupon"
            : "In-store",

          value_type: "PERCENT",
          percent: "10",
          flat_amount: "",
          currency: "MUR",
          min_bill: "",
          max_discount: "",
          start_at: "",
          end_at: "",
          requires_pass: isPass ? true : false,
          pass_tiers: isPass ? "Gold, Platinum" : "",
          coupon_code: isCoupon ? "SAVE10" : "",
          stackable: false,
          terms: "",
          expanded: true,
        },
      ]);
    });
  };

  const removeOffer = (id: string) => {
    preserveScroll(() => setOffers((prev) => prev.filter((o) => o.id !== id)));
  };

  const toggleOfferExpanded = (id: string) => {
    preserveScroll(() => {
      setOffers((prev) =>
        prev.map((o) =>
          o.id === id ? { ...o, expanded: !o.expanded } : { ...o, expanded: false }
        )
      );
    });
  };

  const updateOffer = (id: string, patch: Partial<StoreOfferDraft>) => {
    preserveScroll(() => {
      setOffers((prev) => prev.map((o) => (o.id === id ? { ...o, ...patch } : o)));
    });
  };

  return {
    offers,
    setOffers,
    addOffer,
    removeOffer,
    toggleOfferExpanded,
    updateOffer,
    typeLabel,
  };
}
