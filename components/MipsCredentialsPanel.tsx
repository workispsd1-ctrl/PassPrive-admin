"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { showToast } from "@/hooks/useToast";
import {
  fetchMipsCredentials,
  removeMipsCredentials,
  saveMipsCredentials,
  type MerchantKind,
  type MipsCredentialsStatus,
} from "@/lib/mipsCredentials";

const inputClass = "border border-gray-300 focus:border-gray-400 focus:ring-0 bg-white";

export default function MipsCredentialsPanel({
  kind,
  merchantId,
  canEdit = true,
}: {
  kind: MerchantKind;
  merchantId: string;
  canEdit?: boolean;
}) {
  const [status, setStatus] = useState<MipsCredentialsStatus | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [idMerchant, setIdMerchant] = useState("");
  const [appId, setAppId] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchMipsCredentials(kind, merchantId)
      .then((s) => !cancelled && setStatus(s))
      .catch((err) => !cancelled && setLoadError(err instanceof Error ? err.message : "Could not load MiPS settings"));
    return () => {
      cancelled = true;
    };
  }, [kind, merchantId]);

  const run = async (action: () => Promise<MipsCredentialsStatus>, success: string) => {
    setBusy(true);
    try {
      setStatus(await action());
      setIdMerchant("");
      setAppId("");
      showToast({ type: "success", title: success });
    } catch (err) {
      showToast({ type: "error", title: "MiPS settings not saved", description: err instanceof Error ? err.message : undefined });
    } finally {
      setBusy(false);
    }
  };

  const handleSave = () => {
    if (!idMerchant.trim() || !appId.trim()) {
      showToast({ type: "error", title: "Enter both the Merchant ID and the App ID" });
      return;
    }
    void run(() => saveMipsCredentials(kind, merchantId, idMerchant, appId), "MiPS credentials saved");
  };

  const handleRemove = () => {
    if (!window.confirm("Remove this merchant's MiPS IDs? Payments will use the default PassPrive MiPS account.")) return;
    void run(() => removeMipsCredentials(kind, merchantId), "MiPS credentials removed");
  };

  if (loadError) return <p className="text-sm text-red-600">{loadError}</p>;
  if (!status) return <p className="text-sm text-muted-foreground">Loading MiPS settings...</p>;

  return (
    <div className="space-y-4">
      <div className="rounded-md border border-gray-200 px-3 py-2 text-sm">
        {status.configured ? (
          <>
            <p>
              Payments use this merchant&apos;s own MiPS account — Merchant ID {status.id_merchant_hint}, App ID{" "}
              {status.app_id_hint}.
            </p>
            <p className="text-xs text-muted-foreground">Stored encrypted. Saved values are never shown again.</p>
          </>
        ) : (
          <p className="text-muted-foreground">
            No merchant-specific MiPS IDs. Payments use the default PassPrive MiPS account.
          </p>
        )}
      </div>

      {canEdit && (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-1">
              <span className="text-xs font-medium text-muted-foreground">MiPS Merchant ID (id_merchant)</span>
              <Input
                className={inputClass}
                type="password"
                autoComplete="off"
                disabled={busy}
                placeholder={status.configured ? "Enter to replace" : "Provided by MiPS"}
                value={idMerchant}
                onChange={(e) => setIdMerchant(e.target.value)}
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs font-medium text-muted-foreground">MiPS App ID (id_entity)</span>
              <Input
                className={inputClass}
                type="password"
                autoComplete="off"
                disabled={busy}
                placeholder={status.configured ? "Enter to replace" : "Provided by MiPS"}
                value={appId}
                onChange={(e) => setAppId(e.target.value)}
              />
            </label>
          </div>
          <div className="flex justify-end gap-2">
            {status.configured && (
              <Button type="button" variant="outline" disabled={busy} onClick={handleRemove}>
                Remove
              </Button>
            )}
            <Button type="button" disabled={busy || !idMerchant.trim() || !appId.trim()} onClick={handleSave}>
              {busy ? "Saving..." : status.configured ? "Replace MiPS IDs" : "Save MiPS IDs"}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
