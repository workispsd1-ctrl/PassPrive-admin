"use client";

import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { showToast } from "@/hooks/useToast";
import {
  fetchXlentBookingSyncs,
  fetchXlentConfig,
  fetchXlentPointsOfSale,
  resyncXlentBooking,
  saveXlentConfig,
  validateXlentConfig,
  type XlentBookingSync,
  type XlentConfigInput,
  type XlentPointOfSale,
} from "@/lib/xlentPos";

const inputClass = "border border-gray-300 focus:border-gray-400 focus:ring-0 bg-white";

export const EMPTY_XLENT_INPUT: XlentConfigInput = {
  enabled: false,
  api_key: "",
  point_of_sale_id: null,
  point_of_sale_name: null,
};

/**
 * "Uses XL-ENT POS?" toggle, API key and point-of-sale picker.
 * Controlled; used directly by the add page and wrapped by XlentPosPanel on the edit page.
 */
export function XlentPosFields({
  value,
  onChange,
  disabled = false,
  restaurantId,
  storedKeyHint,
}: {
  value: XlentConfigInput;
  onChange: (value: XlentConfigInput) => void;
  disabled?: boolean;
  /** Lets the picker load points of sale with the stored key when no new key is typed. */
  restaurantId?: string;
  storedKeyHint?: string | null;
}) {
  const [points, setPoints] = useState<XlentPointOfSale[]>([]);
  const [loadingPoints, setLoadingPoints] = useState(false);
  const [pointsError, setPointsError] = useState<string | null>(null);

  const canUseStoredKey = Boolean(restaurantId && storedKeyHint);

  const loadPoints = async () => {
    if (!value.api_key.trim() && !canUseStoredKey) {
      setPointsError("Enter the API key first");
      return;
    }
    setLoadingPoints(true);
    setPointsError(null);
    try {
      const list = await fetchXlentPointsOfSale(
        value.api_key.trim() ? { apiKey: value.api_key } : { restaurantId }
      );
      setPoints(list);
      if (list.length === 0) {
        setPointsError("No points of sale found for this API key");
      } else if (list.length === 1 && !value.point_of_sale_id) {
        onChange({ ...value, point_of_sale_id: list[0].id, point_of_sale_name: list[0].name });
      }
    } catch (err) {
      setPoints([]);
      setPointsError(err instanceof Error ? err.message : "Could not load points of sale");
    } finally {
      setLoadingPoints(false);
    }
  };

  // Keep the currently saved point of sale selectable before the list is loaded.
  const options =
    value.point_of_sale_id && !points.some((p) => p.id === value.point_of_sale_id)
      ? [{ id: value.point_of_sale_id, name: value.point_of_sale_name || `#${value.point_of_sale_id}`, address: "" }, ...points]
      : points;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-md border border-gray-200 px-3 py-2">
        <div>
          <p className="text-sm">Uses XL-ENT POS (CashMag)</p>
          <p className="text-xs text-muted-foreground">
            PassPrive bookings are sent to the merchant&apos;s CashMag till automatically.
          </p>
        </div>
        <Switch
          checked={value.enabled}
          disabled={disabled}
          onCheckedChange={(enabled) => onChange({ ...value, enabled })}
        />
      </div>

      {value.enabled && (
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-1">
            <span className="text-xs font-medium text-muted-foreground">XL-ENT API key</span>
            <Input
              className={inputClass}
              type="password"
              autoComplete="off"
              disabled={disabled}
              placeholder={storedKeyHint ? `Saved (${storedKeyHint}) — leave blank to keep` : "Key provided by XL-ENT"}
              value={value.api_key}
              onChange={(e) => {
                setPoints([]);
                onChange({ ...value, api_key: e.target.value });
              }}
            />
          </label>

          <div className="space-y-1">
            <span className="text-xs font-medium text-muted-foreground">Point of sale</span>
            <div className="flex gap-2">
              <select
                className={`h-9 w-full rounded-md px-3 text-sm ${inputClass}`}
                disabled={disabled || options.length === 0}
                value={value.point_of_sale_id ?? ""}
                onChange={(e) => {
                  const id = Number(e.target.value) || null;
                  const match = options.find((p) => p.id === id);
                  onChange({ ...value, point_of_sale_id: id, point_of_sale_name: match?.name ?? null });
                }}
              >
                <option value="">{options.length ? "Select point of sale" : "Load points of sale →"}</option>
                {options.map((pos) => (
                  <option key={pos.id} value={pos.id}>
                    {pos.name}
                    {pos.address ? ` — ${pos.address}` : ""} (#{pos.id})
                  </option>
                ))}
              </select>
              <Button type="button" variant="outline" disabled={disabled || loadingPoints} onClick={loadPoints}>
                {loadingPoints ? "Loading..." : "Load"}
              </Button>
            </div>
            {pointsError && <p className="text-xs text-red-600">{pointsError}</p>}
          </div>
        </div>
      )}
    </div>
  );
}

const SYNC_BADGE: Record<string, string> = {
  synced: "bg-green-100 text-green-800",
  pending: "bg-amber-100 text-amber-800",
  failed: "bg-red-100 text-red-800",
  skipped: "bg-gray-100 text-gray-700",
};

/** Edit-page panel: loads and saves the XL-ENT config on its own and shows recent booking syncs. */
export function XlentPosPanel({ restaurantId, canEdit }: { restaurantId: string; canEdit: boolean }) {
  const [value, setValue] = useState<XlentConfigInput>(EMPTY_XLENT_INPUT);
  const [saved, setSaved] = useState<XlentConfigInput>(EMPTY_XLENT_INPUT);
  const [keyHint, setKeyHint] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [syncs, setSyncs] = useState<XlentBookingSync[]>([]);
  const [resyncing, setResyncing] = useState<string | null>(null);

  const loadSyncs = useCallback(async () => {
    try {
      setSyncs(await fetchXlentBookingSyncs(restaurantId));
    } catch {
      // Status list is informational only.
    }
  }, [restaurantId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const config = await fetchXlentConfig(restaurantId);
        if (cancelled) return;
        const next = {
          enabled: config.enabled,
          api_key: "",
          point_of_sale_id: config.point_of_sale_id,
          point_of_sale_name: config.point_of_sale_name,
        };
        setValue(next);
        setSaved(next);
        setKeyHint(config.api_key_hint);
        setLoadError(null);
      } catch (err) {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : "Could not load XL-ENT settings");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    void loadSyncs();
    return () => {
      cancelled = true;
    };
  }, [restaurantId, loadSyncs]);

  const dirty =
    value.enabled !== saved.enabled ||
    value.api_key.trim() !== "" ||
    value.point_of_sale_id !== saved.point_of_sale_id;

  const handleSave = async () => {
    const validationError = validateXlentConfig(value, Boolean(keyHint));
    if (validationError) {
      showToast({ type: "error", title: validationError });
      return;
    }
    setSaving(true);
    try {
      await saveXlentConfig(restaurantId, value);
      const config = await fetchXlentConfig(restaurantId);
      const next = {
        enabled: config.enabled,
        api_key: "",
        point_of_sale_id: config.point_of_sale_id,
        point_of_sale_name: config.point_of_sale_name,
      };
      setValue(next);
      setSaved(next);
      setKeyHint(config.api_key_hint);
      showToast({
        type: "success",
        title: config.enabled ? "XL-ENT connected" : "XL-ENT disabled",
        description: config.enabled ? "New bookings will be sent to CashMag." : undefined,
      });
    } catch (err) {
      showToast({
        type: "error",
        title: "Failed to save XL-ENT settings",
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleResync = async (bookingId: string) => {
    setResyncing(bookingId);
    try {
      const { booking } = await resyncXlentBooking(bookingId);
      showToast({
        type: booking?.pos_sync_status === "failed" ? "error" : "success",
        title: booking?.pos_sync_status === "synced" ? "Booking sent to CashMag" : `Sync ${booking?.pos_sync_status ?? "queued"}`,
        description: booking?.pos_sync_error ?? undefined,
      });
      await loadSyncs();
    } catch (err) {
      showToast({ type: "error", title: "Resync failed", description: err instanceof Error ? err.message : undefined });
    } finally {
      setResyncing(null);
    }
  };

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading XL-ENT settings...</p>;
  }
  if (loadError) {
    return <p className="text-sm text-red-600">{loadError}</p>;
  }

  return (
    <div className="space-y-6">
      <XlentPosFields
        value={value}
        onChange={setValue}
        disabled={!canEdit || saving}
        restaurantId={restaurantId}
        storedKeyHint={keyHint}
      />

      {canEdit && (
        <div className="flex justify-end gap-2">
          {dirty && (
            <Button type="button" variant="outline" disabled={saving} onClick={() => setValue(saved)}>
              Reset
            </Button>
          )}
          <Button type="button" disabled={!dirty || saving} onClick={handleSave}>
            {saving ? "Verifying with XL-ENT..." : "Save XL-ENT settings"}
          </Button>
        </div>
      )}

      {(saved.enabled || syncs.length > 0) && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Recent bookings sent to CashMag</h3>
            <Button type="button" variant="ghost" size="sm" onClick={() => void loadSyncs()}>
              Refresh
            </Button>
          </div>
          {syncs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No bookings synced yet.</p>
          ) : (
            <div className="overflow-x-auto rounded-md border border-gray-200">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2">Booking</th>
                    <th className="px-3 py-2">When</th>
                    <th className="px-3 py-2">Guests</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">CashMag</th>
                    <th className="px-3 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {syncs.map((b) => (
                    <tr key={b.id} className="border-t border-gray-100 align-top">
                      <td className="px-3 py-2">
                        <div className="font-medium">{b.booking_code ?? b.id.slice(0, 8)}</div>
                        <div className="text-xs text-muted-foreground">{b.customer_name}</div>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {b.booking_date} {b.booking_time?.slice(0, 5)}
                      </td>
                      <td className="px-3 py-2">{b.party_size}</td>
                      <td className="px-3 py-2">{b.status}</td>
                      <td className="px-3 py-2">
                        <span className={`rounded px-2 py-0.5 text-xs ${SYNC_BADGE[b.pos_sync_status ?? ""] ?? ""}`}>
                          {b.pos_sync_status}
                        </span>
                        {b.external_pos_reference && (
                          <div className="mt-1 text-xs text-muted-foreground">{b.external_pos_reference}</div>
                        )}
                        {b.pos_sync_error && b.pos_sync_status !== "synced" && (
                          <div className="mt-1 max-w-xs text-xs text-red-600 break-words">{b.pos_sync_error}</div>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {canEdit && b.pos_sync_status !== "synced" && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={resyncing === b.id}
                            onClick={() => void handleResync(b.id)}
                          >
                            {resyncing === b.id ? "Sending..." : "Resync"}
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
