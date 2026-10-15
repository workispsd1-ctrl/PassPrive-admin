"use client";

import { Input } from "@/components/ui/input";
import { brnError, normaliseBrn, type AuthorisedContact } from "@/lib/merchantContacts";

export type BusinessRegistration = AuthorisedContact & {
  brn: string;
  registered_name: string;
};

const inputClass = "border border-gray-300 focus:border-gray-400 focus:ring-0 bg-white";

function Labelled({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-sm font-medium">{label}</span>
      {children}
      {hint ? <span className="text-xs text-muted-foreground">{hint}</span> : null}
    </label>
  );
}

export default function BusinessRegistrationFields({
  value,
  onChange,
  disabled = false,
}: {
  value: BusinessRegistration;
  onChange: (next: BusinessRegistration) => void;
  disabled?: boolean;
}) {
  const set = (patch: Partial<BusinessRegistration>) => onChange({ ...value, ...patch });
  const brnProblem = brnError(value.brn);

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <Labelled label="BRN (Business Registration Number)" hint={brnProblem ?? "As issued by the Corporate and Business Registration Department"}>
        <Input
          className={`${inputClass} ${brnProblem ? "border-red-400" : ""}`}
          disabled={disabled}
          placeholder="e.g. C07012345"
          value={value.brn}
          onChange={(e) => set({ brn: normaliseBrn(e.target.value) })}
        />
      </Labelled>
      <Labelled label="Registered name" hint="Legal company name, as printed on bills">
        <Input className={inputClass} disabled={disabled} placeholder="e.g. Capt Holdings Ltd" value={value.registered_name} onChange={(e) => set({ registered_name: e.target.value })} />
      </Labelled>
      <Labelled label="Authorised contact name" hint="Private: visible to PassPrivé staff and this merchant only">
        <Input className={inputClass} disabled={disabled} placeholder="Full name" value={value.authorised_contact_name} onChange={(e) => set({ authorised_contact_name: e.target.value })} />
      </Labelled>
      <Labelled label="Authorised contact phone">
        <Input className={inputClass} disabled={disabled} type="tel" placeholder="+230 5xxx xxxx" value={value.authorised_contact_phone} onChange={(e) => set({ authorised_contact_phone: e.target.value })} />
      </Labelled>
      <Labelled label="Authorised contact email">
        <Input className={inputClass} disabled={disabled} type="email" placeholder="name@company.mu" value={value.authorised_contact_email} onChange={(e) => set({ authorised_contact_email: e.target.value })} />
      </Labelled>
    </div>
  );
}
