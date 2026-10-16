"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

export default function NfcTagCard({ kind, merchantId }: { kind: "restaurant" | "store"; merchantId: string }) {
  const [token, setToken] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let active = true;
    supabaseBrowser
      .from("merchant_nfc_tags")
      .select("token")
      .eq(kind === "store" ? "store_id" : "restaurant_id", merchantId)
      .maybeSingle()
      .then(({ data }) => {
        if (active) setToken((data as { token?: string } | null)?.token ?? null);
      });
    return () => {
      active = false;
    };
  }, [kind, merchantId]);

  const link = token || "";

  const copy = async () => {
    if (!link) return;
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const regenerate = async () => {
    if (!window.confirm("Regenerate the NFC tag code? Stickers written with the old code will stop working until they are re-written.")) return;
    setBusy(true);
    const { data, error } = await supabaseBrowser.rpc("rotate_merchant_nfc_tag", { p_kind: kind, p_id: merchantId });
    setBusy(false);
    if (error) {
      window.alert(error.message);
      return;
    }
    setToken(typeof data === "string" ? data : null);
  };

  return (
    <div className="space-y-2 rounded-md border border-orange-200 bg-orange-50 p-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-800">NFC redeem tag</span>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={copy} disabled={!link}>
            {copied ? "Copied" : "Copy code"}
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={regenerate} disabled={busy}>
            Regenerate
          </Button>
        </div>
      </div>
      <code className="block break-all rounded bg-white px-2 py-1 text-xs text-gray-700">{link || "Generating…"}</code>
      <ol className="list-decimal space-y-0.5 pl-4 text-xs text-gray-600">
        <li>Install the free “NFC Tools” app on your phone and open the Write tab.</li>
        <li>Tap Add a record → Text, paste this code and tap OK.</li>
        <li>Tap Write, then hold the phone on a blank NTAG213/215 sticker until it says Write complete.</li>
        <li>Stick it at the counter. Members open Redeem Deal in PassPrivé, tap “Tap here” and hold their phone on it.</li>
      </ol>
    </div>
  );
}
