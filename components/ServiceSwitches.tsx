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
  promoted?: boolean;
  onPromotedChange?: (next: boolean) => void;
  cashbackEnabled?: boolean;
  onCashbackChange?: (next: boolean) => void;
  dealsEnabled?: boolean;
  onDealsChange?: (next: boolean) => void;
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
  promoted,
  onPromotedChange,
  cashbackEnabled = true,
  onCashbackChange,
  dealsEnabled = true,
  onDealsChange,
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
      {onCashbackChange ? (
        <div className="flex items-start justify-between gap-4 rounded-md border p-3">
          <div>
            <p className="text-sm font-medium">Cashback</p>
            <p className="text-xs text-muted-foreground">On for every merchant by default. Turn off to stop all cashback here: receipt uploads, pay bill and cashback badges.</p>
          </div>
          <Switch
            checked={cashbackEnabled}
            disabled={disabled}
            onCheckedChange={onCashbackChange}
          />
        </div>
      ) : null}
      {onDealsChange ? (
        <div className="flex items-start justify-between gap-4 rounded-md border p-3">
          <div>
            <p className="text-sm font-medium">Deals</p>
            <p className="text-xs text-muted-foreground">Shows this merchant in the app&apos;s Deals mode with its offers and member deals. Turn off to hide them and block redemption; saved deals are kept.</p>
          </div>
          <Switch
            checked={dealsEnabled}
            disabled={disabled}
            onCheckedChange={onDealsChange}
          />
        </div>
      ) : null}
      {onPromotedChange ? (
        <div className="flex items-start justify-between gap-4 rounded-md border p-3">
          <div>
            <p className="text-sm font-medium">PassPrive Promoted</p>
            <p className="text-xs text-muted-foreground">Shows the PassPrive Promoted badge on this merchant&apos;s cards instead of the cashback badge.</p>
          </div>
          <Switch
            checked={!!promoted}
            disabled={disabled}
            onCheckedChange={onPromotedChange}
          />
        </div>
      ) : null}
    </div>
  );
}
