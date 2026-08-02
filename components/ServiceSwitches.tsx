"use client";

import { Switch } from "@/components/ui/switch";
import { type ServiceToggles } from "@/lib/restaurantAdmin";

type Props = {
  value: ServiceToggles;
  onChange: (next: ServiceToggles) => void;
  disabled?: boolean;
  /** Product stores sell over the counter: discoverable only, no booking, no pay bill. */
  lockToDiscoverable?: boolean;
  lockReason?: string;
};

const ROWS = [
  {
    key: "discoverable" as const,
    label: "Discoverable",
    hint: "Listed and searchable in the app. Always on.",
    locked: true,
  },
  {
    key: "booking" as const,
    label: "Book a table / service",
    hint: "Shows the booking button on the merchant's page.",
    locked: false,
  },
  {
    key: "payBill" as const,
    label: "Pay bill",
    hint: "Shows the pay-bill button and makes the merchant eligible for cashback. Needs an MDR rate.",
    locked: false,
  },
];

export default function ServiceSwitches({
  value,
  onChange,
  disabled,
  lockToDiscoverable = false,
  lockReason,
}: Props) {
  const toggles = lockToDiscoverable
    ? { discoverable: true, booking: false, payBill: false }
    : value;

  const setToggle = (key: "booking" | "payBill", next: boolean) => {
    onChange({ ...toggles, [key]: next });
  };

  return (
    <div className="space-y-2">
      {lockToDiscoverable && lockReason ? (
        <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">{lockReason}</p>
      ) : null}
      {ROWS.map((row) => (
        <div
          key={row.key}
          className="flex items-start justify-between gap-4 rounded-md border p-3"
        >
          <div>
            <p className="text-sm font-medium">{row.label}</p>
            <p className="text-xs text-muted-foreground">{row.hint}</p>
          </div>
          <Switch
            checked={toggles[row.key]}
            disabled={disabled || row.locked || (lockToDiscoverable && !row.locked)}
            onCheckedChange={(next) =>
              row.locked ? undefined : setToggle(row.key as "booking" | "payBill", next)
            }
          />
        </div>
      ))}
    </div>
  );
}
