"use client";

import React, { useMemo } from "react";
import { Building2, Minus, Plus, Tags } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Section, Label } from "../ui";
import { ICON_INDIGO, inputClass } from "../constants";
import type { OpenSection, StoreFormState } from "../types";

export default function BasicSection({
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
  const tagsArray = useMemo(() => {
    return form.tags ? form.tags.split(",").map((v) => v.trim()).filter(Boolean) : [];
  }, [form.tags]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  return (
    <Section
      id="basic"
      title="Basic Information"
      subtitle="Name, category, tags, description."
      icon={<Building2 size={18} />}
      openSection={openSection}
      onToggle={onToggle}
      preserveScroll={preserveScroll}
      rightIcon={<span className={ICON_INDIGO}>{openSection === "basic" ? <Minus size={18} /> : <Plus size={18} />}</span>}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label required>Store name</Label>
          <Input
            className={inputClass}
            name="name"
            placeholder="e.g. Culture Circle"
            value={form.name}
            onChange={handleChange}
          />
        </div>

        <div>
          <Label required>Category</Label>
          <Input
            className={inputClass}
            name="category"
            placeholder="e.g. Fashion, Supermarket, Electronics"
            value={form.category}
            onChange={handleChange}
          />
        </div>

        <div>
          <Label>Subcategory</Label>
          <Input
            className={inputClass}
            name="subcategory"
            placeholder="e.g. Footwear"
            value={form.subcategory}
            onChange={handleChange}
          />
        </div>

        <div className="md:col-span-2">
          <Label hint="Comma separated tags. Example: bank benefits, premium, offers">
            Tags
          </Label>
          <Textarea
            className={inputClass}
            name="tags"
            placeholder="e.g. bank benefits, premium, offers"
            value={form.tags}
            onChange={handleChange}
          />
          {tagsArray.length ? (
            <div className="flex flex-wrap gap-2 mt-3">
              {tagsArray.map((t) => (
                <div
                  key={t}
                  className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold text-gray-700 bg-white"
                >
                  <Tags size={14} />
                  {t}
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <div className="md:col-span-2">
          <Label>Description / About</Label>
          <Textarea
            className={inputClass}
            name="description"
            placeholder="Write a premium brand description..."
            value={form.description}
            onChange={handleChange}
          />
        </div>
      </div>
    </Section>
  );
}
