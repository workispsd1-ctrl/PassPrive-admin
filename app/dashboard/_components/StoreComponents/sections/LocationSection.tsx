"use client";

import React from "react";
import { MapPin, Minus, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Section, Label } from "../ui";
import { ICON_INDIGO, inputClass } from "../constants";
import type { OpenSection, StoreFormState } from "../types";

export default function LocationSection({
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
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  return (
    <Section
      id="location"
      title="Location"
      subtitle="Address, city, coordinates & Place ID."
      icon={<MapPin size={18} />}
      openSection={openSection}
      onToggle={onToggle}
      preserveScroll={preserveScroll}
      rightIcon={<span className={ICON_INDIGO}>{openSection === "location" ? <Minus size={18} /> : <Plus size={18} />}</span>}
    >
      <div className="grid grid-cols-1 gap-4">
        <div>
          <Label>Location name</Label>
          <Input className={inputClass} name="location_name" placeholder="e.g. Bagatelle Mall" value={form.location_name} onChange={handleChange} />
        </div>

        <div>
          <Label>Address line 1</Label>
          <Textarea className={inputClass} name="address_line1" placeholder="Street, building..." value={form.address_line1} onChange={handleChange} />
        </div>

        <div>
          <Label>Address line 2</Label>
          <Textarea className={inputClass} name="address_line2" placeholder="Landmark, shop no..." value={form.address_line2} onChange={handleChange} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label>City</Label>
            <Input className={inputClass} name="city" placeholder="Port Louis" value={form.city} onChange={handleChange} />
          </div>
          <div>
            <Label required>Region</Label>
            <Input className={inputClass} name="region" placeholder="Plaines Wilhems" value={form.region} onChange={handleChange} />
          </div>
          <div>
            <Label required>Postal code</Label>
            <Input className={inputClass} name="postal_code" placeholder="xxxx" value={form.postal_code} onChange={handleChange} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label>Latitude</Label>
            <Input className={inputClass} name="lat" placeholder="-20.12345" value={form.lat} onChange={handleChange} />
          </div>
          <div>
            <Label>Longitude</Label>
            <Input className={inputClass} name="lng" placeholder="57.12345" value={form.lng} onChange={handleChange} />
          </div>
          <div>
            <Label>Google Place ID</Label>
            <Input className={inputClass} name="google_place_id" placeholder="ChIJ..." value={form.google_place_id} onChange={handleChange} />
          </div>
        </div>
      </div>
    </Section>
  );
}
