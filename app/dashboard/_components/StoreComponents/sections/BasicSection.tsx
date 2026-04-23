"use client";

import React, { useMemo } from "react";
import { Building2, Minus, Plus, Tags } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Section, Label } from "../ui";
import { ICON_INDIGO, inputClass } from "../constants";
import type { OpenSection, StoreFormState } from "../types";
import {
  getCategorySelectLabel,
  getCategorySourceEmptyLabel,
} from "@/lib/storeCategoryOptions";

export default function BasicSection({
  openSection,
  onToggle,
  preserveScroll,
  form,
  setForm,
  categoryOptions = [],
}: {
  openSection: OpenSection;
  onToggle: (id: Exclude<OpenSection, null>) => void;
  preserveScroll: (fn: () => void) => void;
  form: StoreFormState;
  setForm: React.Dispatch<React.SetStateAction<StoreFormState>>;
  categoryOptions?: string[];
}) {
  const tagsArray = useMemo(() => {
    return form.tags ? form.tags.split(",").map((v) => v.trim()).filter(Boolean) : [];
  }, [form.tags]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) =>
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const selectedCategories = useMemo(() => {
    const values = (form.category || "")
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);
    return values.filter((v) => categoryOptions.includes(v));
  }, [form.category, categoryOptions]);

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
          <Label required>Store type</Label>
          <select
            name="store_type"
            className={`${inputClass} w-full rounded-md px-3 py-2 text-sm bg-white`}
            value={form.store_type}
            onChange={handleChange}
          >
            <option value="PRODUCT">PRODUCT</option>
            <option value="SERVICE">SERVICE</option>
          </select>
        </div>

        <div>
          <Label required>Category</Label>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className="w-full justify-between bg-white border-gray-300"
              >
                {selectedCategories.length
                  ? `${selectedCategories.length} categories selected`
                  : getCategorySelectLabel(form.store_type)}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              sideOffset={6}
              className="z-[9999] w-[420px] max-w-[calc(100vw-2rem)] max-h-72 overflow-y-auto rounded-md border border-gray-300 bg-white shadow-xl"
            >
              {categoryOptions.length ? (
                categoryOptions.map((category) => (
                  <DropdownMenuCheckboxItem
                    key={category}
                    checked={selectedCategories.includes(category)}
                    onCheckedChange={(checked) => {
                      const next =
                        checked === true
                          ? selectedCategories.includes(category)
                            ? selectedCategories
                            : [...selectedCategories, category]
                          : selectedCategories.filter((item) => item !== category);

                      setForm((prev) => ({
                        ...prev,
                        category: next.join(", "),
                      }));
                    }}
                  >
                    {category}
                  </DropdownMenuCheckboxItem>
                ))
              ) : (
                <div className="px-2 py-1.5 text-sm text-muted-foreground">
                  {getCategorySourceEmptyLabel(form.store_type)}
                </div>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          {selectedCategories.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {selectedCategories.map((category) => (
                <span
                  key={category}
                  className="inline-flex items-center rounded-full border border-gray-300 bg-white px-2 py-1 text-xs"
                >
                  {category}
                </span>
              ))}
            </div>
          )}
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
