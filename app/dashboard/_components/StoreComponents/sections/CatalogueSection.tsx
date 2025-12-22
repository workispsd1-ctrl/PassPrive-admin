"use client";

import React from "react";
import { Minus, Package, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ICON_INDIGO, PRIMARY_BTN, PRIMARY_BTN_OUTLINE, inputClass } from "../constants";
import { ItemImagePreview, Label, Section } from "../ui";
import type { CatalogueCategoryDraft, OpenSection } from "../types";

export default function CatalogueSection({
  openSection,
  onToggle,
  preserveScroll,

  catalogueCategories,
  customCategoryTitle,
  setCustomCategoryTitle,
  customCategoryStartingFrom,
  setCustomCategoryStartingFrom,

  toggleCategoryEnabled,
  toggleCategoryExpanded,
  addCategory,
  removeCategory,
  updateCategoryField,
  addItemToCategory,
  removeItemFromCategory,
  updateItem,
}: {
  openSection: OpenSection;
  onToggle: (id: Exclude<OpenSection, null>) => void;
  preserveScroll: (fn: () => void) => void;

  catalogueCategories: CatalogueCategoryDraft[];
  customCategoryTitle: string;
  setCustomCategoryTitle: (v: string) => void;
  customCategoryStartingFrom: string;
  setCustomCategoryStartingFrom: (v: string) => void;

  toggleCategoryEnabled: (catId: string, enabled: boolean) => void;
  toggleCategoryExpanded: (catId: string) => void;
  addCategory: () => void;
  removeCategory: (catId: string) => void;
  updateCategoryField: (catId: string, key: "title" | "starting_from", value: string) => void;
  addItemToCategory: (catId: string) => void;
  removeItemFromCategory: (catId: string, itemId: string) => void;
  updateItem: (
    catId: string,
    itemId: string,
    key: "title" | "price" | "sku" | "description" | "is_available" | "imageFile",
    value: any
  ) => void;
}) {
  return (
    <Section
      id="catalogue"
      title="Catalogue (PassPrive-style)"
      subtitle="Tick categories to auto-expand and add items."
      icon={<Package size={18} />}
      openSection={openSection}
      onToggle={onToggle}
      preserveScroll={preserveScroll}
      rightIcon={<span className={ICON_INDIGO}>{openSection === "catalogue" ? <Minus size={18} /> : <Plus size={18} />}</span>}
    >
      <div className="rounded-2xl border bg-gray-50 p-4 mb-4">
        <div className="text-sm font-semibold text-gray-900">Add a new category</div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
          <Input
            className={inputClass}
            placeholder="Category title"
            value={customCategoryTitle}
            onChange={(e) => setCustomCategoryTitle(e.target.value)}
          />
          <Input
            className={inputClass}
            placeholder="Starting from (optional)"
            value={customCategoryStartingFrom}
            onChange={(e) => setCustomCategoryStartingFrom(e.target.value)}
          />
          <Button type="button" onClick={addCategory} className={PRIMARY_BTN}>
            <Plus size={16} className="mr-2" />
            Add Category
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {catalogueCategories.map((cat) => (
          <div key={cat.id} className="rounded-2xl border bg-white">
            <div className="flex items-center justify-between px-5 py-4">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  className="h-5 w-5"
                  checked={cat.enabled}
                  onChange={(e) => toggleCategoryEnabled(cat.id, e.target.checked)}
                />
                <div>
                  <div className="text-sm font-extrabold text-gray-900">
                    {cat.title || "Untitled category"}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {cat.enabled ? `${cat.items.length} item(s)` : "Disabled"}
                  </div>
                </div>
              </div>

              {cat.enabled ? (
                <button
                  type="button"
                  onClick={() => toggleCategoryExpanded(cat.id)}
                  className={[
                    "rounded-lg border px-3 py-2 text-sm font-semibold hover:bg-gray-50",
                    PRIMARY_BTN_OUTLINE,
                  ].join(" ")}
                >
                  <span className={ICON_INDIGO}>
                    {cat.expanded ? <Minus size={16} /> : <Plus size={16} />}
                  </span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => removeCategory(cat.id)}
                  className="rounded-lg border px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
                >
                  Remove
                </button>
              )}
            </div>

            {cat.enabled && cat.expanded ? (
              <div className="px-5 pb-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label required>Category title</Label>
                    <Input
                      className={inputClass}
                      value={cat.title}
                      onChange={(e) => updateCategoryField(cat.id, "title", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Starting from</Label>
                    <Input
                      className={inputClass}
                      value={cat.starting_from}
                      onChange={(e) => updateCategoryField(cat.id, "starting_from", e.target.value)}
                      placeholder="e.g. 2999"
                    />
                  </div>
                </div>

                <div className="mt-5 space-y-4">
                  {cat.items.map((it, idx) => (
                    <div key={it.id} className="rounded-2xl border bg-gray-50 p-4">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-extrabold text-gray-900">
                          Item #{idx + 1}
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          className="h-9 border-red-200 text-red-600 hover:bg-red-50"
                          onClick={() => removeItemFromCategory(cat.id, it.id)}
                        >
                          <X size={16} className="mr-2" />
                          Remove
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mt-4">
                        <div className="lg:col-span-8">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <Label required>Product title</Label>
                              <Input
                                className={inputClass}
                                value={it.title}
                                onChange={(e) => updateItem(cat.id, it.id, "title", e.target.value)}
                              />
                            </div>

                            <div>
                              <Label required>Price</Label>
                              <Input
                                className={inputClass}
                                value={it.price}
                                onChange={(e) => updateItem(cat.id, it.id, "price", e.target.value)}
                              />
                            </div>

                            <div>
                              <Label>SKU</Label>
                              <Input
                                className={inputClass}
                                value={it.sku || ""}
                                onChange={(e) => updateItem(cat.id, it.id, "sku", e.target.value)}
                              />
                            </div>

                            <div className="flex items-center gap-3 rounded-xl border bg-white px-4 py-3">
                              <input
                                type="checkbox"
                                className="h-5 w-5"
                                checked={it.is_available}
                                onChange={(e) => updateItem(cat.id, it.id, "is_available", e.target.checked)}
                              />
                              <div className="text-sm font-semibold text-gray-900">Available</div>
                            </div>

                            <div className="md:col-span-2">
                              <Label>Description</Label>
                              <Textarea
                                className={inputClass}
                                value={it.description || ""}
                                onChange={(e) => updateItem(cat.id, it.id, "description", e.target.value)}
                              />
                            </div>
                          </div>
                        </div>

                        <div className="lg:col-span-4">
                          <Label>Product image</Label>
                          <div className="rounded-2xl border bg-white p-4">
                            <Input
                              className={inputClass}
                              type="file"
                              accept="image/*"
                              onChange={(e) =>
                                updateItem(cat.id, it.id, "imageFile", e.target.files?.[0] || null)
                              }
                            />
                            <div className="mt-3">
                              <ItemImagePreview
                                file={it.imageFile}
                                onRemove={() => updateItem(cat.id, it.id, "imageFile", null)}
                                preserveScroll={preserveScroll}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  <Button type="button" onClick={() => addItemToCategory(cat.id)} className={PRIMARY_BTN}>
                    <Plus size={16} className="mr-2" />
                    Add another item
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </Section>
  );
}
