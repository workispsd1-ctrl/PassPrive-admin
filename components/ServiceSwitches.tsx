"use client";

import { Switch } from "@/components/ui/switch";
import {
  serviceLevelToToggles,
  togglesToServiceLevel,
  type ServiceLevel,
} from "@/lib/restaurantAdmin";

type Props = {
  value: ServiceLevel;
  onChange: (next: ServiceLevel) => void;
  disabled?: boolean;
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

export default function ServiceSwitches({ value, onChange, disabled }: Props) {
  const toggles = serviceLevelToToggles(value);

  const setToggle = (key: "booking" | "payBill", next: boolean) => {
    // Pay bill implies booking; turning booking off turns pay bill off with it.
    const updated =
      key === "payBill"
        ? { ...toggles, payBill: next, booking: next ? true : toggles.booking }
        : { ...toggles, booking: next, payBill: next ? toggles.payBill : false };

    onChange(togglesToServiceLevel(updated));
  };

  return (
    <div className="space-y-2">
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
            disabled={disabled || row.locked}
            onCheckedChange={(next) =>
              row.locked ? undefined : setToggle(row.key as "booking" | "payBill", next)
            }
          />
        </div>
      ))}
    </div>
  );
}
