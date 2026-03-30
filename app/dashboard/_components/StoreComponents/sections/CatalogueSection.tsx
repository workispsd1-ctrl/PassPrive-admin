"use client";

import React, { useMemo, useState } from "react";
import {
  Clock3,
  Eye,
  EyeOff,
  Minus,
  Package,
  Plus,
  ShoppingBag,
  Ticket,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ICON_INDIGO, PRIMARY_BTN, PRIMARY_BTN_OUTLINE, inputClass } from "../constants";
import { Label, Section } from "../ui";
import type { CatalogueCategoryDraft, OpenSection } from "../types";

type StoreType = "PRODUCT" | "SERVICE";

function CatalogueImagePreview({
  file,
  imageUrl,
  onRemoveFile,
}: {
  file?: File | null;
  imageUrl?: string | null;
  onRemoveFile: () => void;
}) {
  const src = file ? URL.createObjectURL(file) : imageUrl || null;
  if (!src) return null;

  return (
    <div className="relative h-20 w-20 overflow-hidden rounded-xl border border-gray-200">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="Catalogue item" className="h-full w-full object-cover" />
      {file ? (
        <button
          type="button"
          onClick={onRemoveFile}
          className="absolute -top-2 -right-2 rounded-full bg-black/80 p-1 text-white"
          aria-label="Remove file"
        >
          <X size={12} />
        </button>
      ) : null}
    </div>
  );
}

export default function CatalogueSection({
  openSection,
  onToggle,
  preserveScroll,
  storeType,
  catalogueCategories,
  customCategoryTitle,
  setCustomCategoryTitle,
  customCategoryStartingFrom,
  setCustomCategoryStartingFrom,
  customCategorySortOrder,
  setCustomCategorySortOrder,
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
  storeType: StoreType;
  catalogueCategories: CatalogueCategoryDraft[];
  customCategoryTitle: string;
  setCustomCategoryTitle: (value: string) => void;
  customCategoryStartingFrom: string;
  setCustomCategoryStartingFrom: (value: string) => void;
  customCategorySortOrder: string;
  setCustomCategorySortOrder: (value: string) => void;
  toggleCategoryEnabled: (catId: string, enabled: boolean) => void;
  toggleCategoryExpanded: (catId: string) => void;
  addCategory: () => void;
  removeCategory: (catId: string) => void;
  updateCategoryField: (
    catId: string,
    key: "title" | "starting_from" | "sort_order",
    value: string
  ) => void;
  addItemToCategory: (catId: string) => void;
  removeItemFromCategory: (catId: string, itemId: string) => void;
  updateItem: (
    catId: string,
    itemId: string,
    key:
      | "title"
      | "price"
      | "sku"
      | "description"
      | "is_available"
      | "imageFile"
      | "imageUrl"
      | "sort_order"
      | "item_type"
      | "is_billable"
      | "duration_minutes"
      | "supports_slot_booking",
    value: string | boolean | File | null
  ) => void;
}) {
  const [previewMode, setPreviewMode] = useState(false);

  const sectionTitle = storeType === "SERVICE" ? "Services" : "Catalogue";
  const sectionSubtitle =
    storeType === "SERVICE"
      ? "Manage service categories, billability, slot booking, and duration."
      : "Manage catalogue categories and product-style items.";
  const categoryLabel = storeType === "SERVICE" ? "Service category" : "Catalogue category";
  const itemLabel = storeType === "SERVICE" ? "Service item" : "Catalogue item";

  const enabledCategories = useMemo(
    () => catalogueCategories.filter((category) => category.enabled),
    [catalogueCategories]
  );

  return (
    <Section
      id="catalogue"
      title={sectionTitle}
      subtitle={sectionSubtitle}
      icon={storeType === "SERVICE" ? <Ticket size={18} /> : <Package size={18} />}
      openSection={openSection}
      onToggle={onToggle}
      preserveScroll={preserveScroll}
      rightIcon={
        <span className={ICON_INDIGO}>
          {openSection === "catalogue" ? <Minus size={18} /> : <Plus size={18} />}
        </span>
      }
    >
      <div className="mb-4 rounded-2xl border bg-gray-50 p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="text-sm font-semibold text-gray-900">
              Add {categoryLabel.toLowerCase()}
            </div>
            <div className="text-xs text-gray-500">
              Create structured categories first, then attach {itemLabel.toLowerCase()}s.
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            className={PRIMARY_BTN_OUTLINE}
            onClick={() => setPreviewMode((current) => !current)}
          >
            {previewMode ? <EyeOff size={16} className="mr-2" /> : <Eye size={16} className="mr-2" />}
            {previewMode ? "Hide Preview" : "Preview Store Details"}
          </Button>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-4">
          <Input
            className={inputClass}
            placeholder={`${categoryLabel} title`}
            value={customCategoryTitle}
            onChange={(event) => setCustomCategoryTitle(event.target.value)}
          />
          <Input
            className={inputClass}
            placeholder="Starting from"
            value={customCategoryStartingFrom}
            onChange={(event) => setCustomCategoryStartingFrom(event.target.value)}
          />
          <Input
            className={inputClass}
            placeholder="Sort order"
            value={customCategorySortOrder}
            onChange={(event) => setCustomCategorySortOrder(event.target.value)}
          />
          <Button type="button" onClick={addCategory} className={PRIMARY_BTN}>
            <Plus size={16} className="mr-2" />
            Add Category
          </Button>
        </div>
      </div>

      {previewMode ? (
        <StorePreview storeType={storeType} categories={enabledCategories} />
      ) : null}

      <div className="space-y-3">
        {catalogueCategories.map((category) => (
          <div key={category.id} className="overflow-hidden rounded-2xl border bg-white">
            <div className="flex items-center justify-between px-5 py-4">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  className="h-5 w-5"
                  checked={category.enabled}
                  onChange={(event) =>
                    toggleCategoryEnabled(category.id, event.target.checked)
                  }
                />
                <div>
                  <div className="text-sm font-extrabold text-gray-900">
                    {category.title || `Untitled ${categoryLabel.toLowerCase()}`}
                  </div>
                  <div className="mt-0.5 text-xs text-gray-500">
                    {category.enabled
                      ? `${category.items.length} ${itemLabel.toLowerCase()}(s)`
                      : "Disabled"}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {category.enabled ? (
                  <button
                    type="button"
                    onClick={() => toggleCategoryExpanded(category.id)}
                    className={[
                      "rounded-lg border px-3 py-2 text-sm font-semibold hover:bg-gray-50",
                      PRIMARY_BTN_OUTLINE,
                    ].join(" ")}
                  >
                    <span className={ICON_INDIGO}>
                      {category.expanded ? <Minus size={16} /> : <Plus size={16} />}
                    </span>
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => removeCategory(category.id)}
                  className="rounded-lg border px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
                >
                  Remove
                </button>
              </div>
            </div>

            {category.enabled && category.expanded ? (
              <div className="px-5 pb-5">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div>
                    <Label required>{categoryLabel} title</Label>
                    <Input
                      className={inputClass}
                      value={category.title}
                      onChange={(event) =>
                        updateCategoryField(category.id, "title", event.target.value)
                      }
                    />
                  </div>
                  <div>
                    <Label>Starting from</Label>
                    <Input
                      className={inputClass}
                      value={category.starting_from}
                      onChange={(event) =>
                        updateCategoryField(category.id, "starting_from", event.target.value)
                      }
                      placeholder="e.g. 299"
                    />
                  </div>
                  <div>
                    <Label>Sort order</Label>
                    <Input
                      className={inputClass}
                      value={category.sort_order}
                      onChange={(event) =>
                        updateCategoryField(category.id, "sort_order", event.target.value)
                      }
                      placeholder="0"
                    />
                  </div>
                </div>

                <div className="mt-5 space-y-4">
                  {category.items
                    .slice()
                    .sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0))
                    .map((item, index) => (
                      <div key={item.id} className="rounded-2xl border bg-gray-50 p-4">
                        <div className="flex items-center justify-between">
                          <div className="text-sm font-extrabold text-gray-900">
                            {itemLabel} #{index + 1}
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            className="h-9 border-red-200 text-red-600 hover:bg-red-50"
                            onClick={() => removeItemFromCategory(category.id, item.id)}
                          >
                            <X size={16} className="mr-2" />
                            Remove
                          </Button>
                        </div>

                        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-12">
                          <div className="space-y-4 lg:col-span-8">
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                              <div>
                                <Label required>
                                  {storeType === "SERVICE" ? "Service title" : "Product title"}
                                </Label>
                                <Input
                                  className={inputClass}
                                  value={item.title}
                                  onChange={(event) =>
                                    updateItem(category.id, item.id, "title", event.target.value)
                                  }
                                />
                              </div>

                              <div>
                                <Label>SKU</Label>
                                <Input
                                  className={inputClass}
                                  value={item.sku || ""}
                                  onChange={(event) =>
                                    updateItem(category.id, item.id, "sku", event.target.value)
                                  }
                                />
                              </div>

                              <div>
                                <Label hint={item.is_billable ? "Required when billable is enabled." : undefined}>
                                  Price
                                </Label>
                                <Input
                                  className={inputClass}
                                  value={item.price}
                                  onChange={(event) =>
                                    updateItem(category.id, item.id, "price", event.target.value)
                                  }
                                  placeholder={item.is_billable ? "Required" : "Optional"}
                                />
                              </div>

                              <div>
                                <Label>Sort order</Label>
                                <Input
                                  className={inputClass}
                                  value={item.sort_order}
                                  onChange={(event) =>
                                    updateItem(category.id, item.id, "sort_order", event.target.value)
                                  }
                                  placeholder="0"
                                />
                              </div>

                              <div className="md:col-span-2">
                                <Label>Description</Label>
                                <Textarea
                                  className={inputClass}
                                  value={item.description || ""}
                                  onChange={(event) =>
                                    updateItem(category.id, item.id, "description", event.target.value)
                                  }
                                />
                              </div>

                              <div className="md:col-span-2">
                                <Label>Image URL</Label>
                                <Input
                                  className={inputClass}
                                  value={item.imageUrl || ""}
                                  onChange={(event) =>
                                    updateItem(category.id, item.id, "imageUrl", event.target.value)
                                  }
                                  placeholder="https://..."
                                />
                              </div>

                              <div className="rounded-xl border bg-white px-4 py-3">
                                <label className="flex items-center gap-3 text-sm font-semibold text-gray-900">
                                  <input
                                    type="checkbox"
                                    className="h-5 w-5"
                                    checked={item.is_available}
                                    onChange={(event) =>
                                      updateItem(
                                        category.id,
                                        item.id,
                                        "is_available",
                                        event.target.checked
                                      )
                                    }
                                  />
                                  Available
                                </label>
                              </div>

                              <div className="rounded-xl border bg-white px-4 py-3">
                                <label className="flex items-center gap-3 text-sm font-semibold text-gray-900">
                                  <input
                                    type="checkbox"
                                    className="h-5 w-5"
                                    checked={item.is_billable}
                                    onChange={(event) =>
                                      updateItem(
                                        category.id,
                                        item.id,
                                        "is_billable",
                                        event.target.checked
                                      )
                                    }
                                  />
                                  Billable
                                </label>
                              </div>
                            </div>

                            <div
                              className={[
                                "grid gap-4 rounded-2xl border p-4",
                                storeType === "SERVICE"
                                  ? "border-indigo-200 bg-indigo-50/50 md:grid-cols-3"
                                  : "border-gray-200 bg-white md:grid-cols-3",
                              ].join(" ")}
                            >
                              <div>
                                <Label>Item type</Label>
                                <select
                                  className={`${inputClass} w-full rounded-md px-3 py-2 text-sm`}
                                  value={item.item_type}
                                  onChange={(event) =>
                                    updateItem(category.id, item.id, "item_type", event.target.value)
                                  }
                                >
                                  <option value="PRODUCT">PRODUCT</option>
                                  <option value="SERVICE">SERVICE</option>
                                </select>
                              </div>

                              <div className="rounded-xl border bg-white px-4 py-3">
                                <label className="flex items-center gap-3 text-sm font-semibold text-gray-900">
                                  <input
                                    type="checkbox"
                                    className="h-5 w-5"
                                    checked={item.supports_slot_booking}
                                    onChange={(event) =>
                                      updateItem(
                                        category.id,
                                        item.id,
                                        "supports_slot_booking",
                                        event.target.checked
                                      )
                                    }
                                  />
                                  Supports slot booking
                                </label>
                              </div>

                              <div>
                                <Label
                                  hint={
                                    item.supports_slot_booking
                                      ? "Required when slot booking is enabled."
                                      : undefined
                                  }
                                >
                                  Duration (minutes)
                                </Label>
                                <Input
                                  className={inputClass}
                                  value={item.duration_minutes}
                                  onChange={(event) =>
                                    updateItem(
                                      category.id,
                                      item.id,
                                      "duration_minutes",
                                      event.target.value
                                    )
                                  }
                                  placeholder={item.supports_slot_booking ? "Required" : "Optional"}
                                />
                              </div>
                            </div>
                          </div>

                          <div className="space-y-3 lg:col-span-4">
                            <Label>{storeType === "SERVICE" ? "Service image" : "Product image"}</Label>
                            <div className="rounded-2xl border bg-white p-4">
                              <Input
                                className={inputClass}
                                type="file"
                                accept="image/*"
                                onChange={(event) =>
                                  updateItem(
                                    category.id,
                                    item.id,
                                    "imageFile",
                                    event.target.files?.[0] || null
                                  )
                                }
                              />
                              <div className="mt-3">
                                <CatalogueImagePreview
                                  file={item.imageFile}
                                  imageUrl={item.imageUrl}
                                  onRemoveFile={() =>
                                    updateItem(category.id, item.id, "imageFile", null)
                                  }
                                />
                              </div>
                              {storeType === "SERVICE" ? (
                                <div className="mt-4 space-y-2 text-xs text-gray-500">
                                  <div className="flex items-center gap-2">
                                    <Clock3 size={14} />
                                    Duration, billing, and slot support are shown prominently in
                                    service previews.
                                  </div>
                                </div>
                              ) : (
                                <div className="mt-4 space-y-2 text-xs text-gray-500">
                                  <div className="flex items-center gap-2">
                                    <ShoppingBag size={14} />
                                    Catalogue preview prioritizes card imagery and quick browsing.
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}

                  <Button
                    type="button"
                    onClick={() => addItemToCategory(category.id)}
                    className={PRIMARY_BTN}
                  >
                    <Plus size={16} className="mr-2" />
                    Add {storeType === "SERVICE" ? "Service" : "Item"}
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

function StorePreview({
  storeType,
  categories,
}: {
  storeType: StoreType;
  categories: CatalogueCategoryDraft[];
}) {
  if (!categories.length) {
    return (
      <div className="mb-4 rounded-2xl border border-dashed bg-gray-50 px-4 py-8 text-center text-sm text-gray-500">
        Enable at least one category to preview how this will appear on Store Details.
      </div>
    );
  }

  return (
    <div className="mb-4 rounded-2xl border bg-white p-4">
      <div className="mb-4 text-sm font-semibold text-gray-900">
        {storeType === "SERVICE" ? "Service Preview" : "Catalogue Preview"}
      </div>

      <div className="space-y-5">
        {categories
          .slice()
          .sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0))
          .map((category) => (
            <div key={category.id}>
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-gray-900">{category.title}</div>
                  {category.starting_from ? (
                    <div className="text-xs text-gray-500">
                      Starting from {category.starting_from}
                    </div>
                  ) : null}
                </div>
              </div>

              {storeType === "SERVICE" ? (
                <div className="space-y-3">
                  {category.items.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-2xl border border-gray-200 bg-gray-50 p-4"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="text-sm font-semibold text-gray-900">{item.title}</div>
                          {item.description ? (
                            <div className="mt-1 text-sm text-gray-500">{item.description}</div>
                          ) : null}
                          <div className="mt-3 flex flex-wrap gap-2">
                            <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-gray-700">
                              {item.is_available ? "Available" : "Unavailable"}
                            </span>
                            <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-gray-700">
                              {item.supports_slot_booking ? "Slot bookable" : "No slots"}
                            </span>
                            <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-gray-700">
                              {item.is_billable ? "Billable" : "Non-billable"}
                            </span>
                            {item.duration_minutes ? (
                              <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-gray-700">
                                {item.duration_minutes} mins
                              </span>
                            ) : null}
                          </div>
                        </div>
                        <div className="text-right">
                          {item.price ? (
                            <div className="text-sm font-semibold text-gray-900">
                              {item.price}
                            </div>
                          ) : null}
                          <div className="mt-3 flex gap-2">
                            <button
                              type="button"
                              className="rounded-lg border border-indigo-200 bg-white px-3 py-2 text-xs font-semibold text-indigo-700"
                            >
                              {item.supports_slot_booking ? "Book Slot" : "View"}
                            </button>
                            {item.is_billable ? (
                              <button
                                type="button"
                                className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white"
                              >
                                Pay
                              </button>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {category.items.map((item) => (
                    <div
                      key={item.id}
                      className="overflow-hidden rounded-2xl border border-gray-200 bg-gray-50"
                    >
                      <div className="aspect-[4/3] bg-gray-100">
                        {item.imageFile || item.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={item.imageFile ? URL.createObjectURL(item.imageFile) : item.imageUrl || ""}
                            alt={item.title}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-xs text-gray-400">
                            No image
                          </div>
                        )}
                      </div>
                      <div className="p-4">
                        <div className="text-sm font-semibold text-gray-900">{item.title}</div>
                        {item.description ? (
                          <div className="mt-1 text-sm text-gray-500">{item.description}</div>
                        ) : null}
                        <div className="mt-3 flex items-center justify-between">
                          <div className="text-sm font-semibold text-gray-900">
                            {item.price || "-"}
                          </div>
                          <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-gray-700">
                            {item.is_available ? "Available" : "Unavailable"}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
      </div>
    </div>
  );
}
