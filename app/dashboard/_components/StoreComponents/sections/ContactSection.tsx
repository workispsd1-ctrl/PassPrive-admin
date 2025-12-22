"use client";

import React from "react";
import { Phone, Minus, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Section, Label } from "../ui";
import { ICON_INDIGO, inputClass } from "../constants";
import type { OpenSection, StoreFormState } from "../types";

export default function ContactSection({
  openSection,
  onToggle,
  preserveScroll,
  form,
  setForm,
}: {
  openSection: OpenSection;
  onToggle: (id: Exclude<OpenSection, null>) => void;
  preserveScroll: (fn: () => void) => void;
  form: StoreFormState;
  setForm: React.Dispatch<React.SetStateAction<StoreFormState>>;
}) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  return (
    <Section
      id="contact"
      title="Contact & Links"
      subtitle="Phone, WhatsApp, website and social profiles."
      icon={<Phone size={18} />}
      openSection={openSection}
      onToggle={onToggle}
      preserveScroll={preserveScroll}
      rightIcon={<span className={ICON_INDIGO}>{openSection === "contact" ? <Minus size={18} /> : <Plus size={18} />}</span>}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>Phone</Label>
          <Input className={inputClass} name="phone" placeholder="+230 ..." value={form.phone} onChange={handleChange} />
        </div>

        <div>
          <Label>WhatsApp</Label>
          <Input className={inputClass} name="whatsapp" placeholder="+230 ..." value={form.whatsapp} onChange={handleChange} />
        </div>

        <div>
          <Label>Email</Label>
          <Input className={inputClass} name="email" placeholder="store@email.com" value={form.email} onChange={handleChange} />
        </div>

        <div>
          <Label>Website</Label>
          <Input className={inputClass} name="website" placeholder="https://..." value={form.website} onChange={handleChange} />
        </div>

        <div>
          <Label>Instagram</Label>
          <Input className={inputClass} name="instagram" placeholder="https://instagram.com/..." value={form.instagram} onChange={handleChange} />
        </div>

        <div>
          <Label>Facebook</Label>
          <Input className={inputClass} name="facebook" placeholder="https://facebook.com/..." value={form.facebook} onChange={handleChange} />
        </div>

        <div className="md:col-span-2">
          <Label>Maps Link</Label>
          <Input className={inputClass} name="maps" placeholder="https://maps.google.com/..." value={form.maps} onChange={handleChange} />
        </div>
      </div>
    </Section>
  );
}
