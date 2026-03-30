"use client";

import { useMemo, useState } from "react";

import {
  DEFAULT_PRODUCT_CATALOGUE_PRESETS,
  DEFAULT_SERVICE_CATALOGUE_PRESETS,
} from "../constants";
import type { CatalogueCategoryDraft, CatalogueItemDraft } from "../types";
import { uid } from "../utils";

type StoreType = "PRODUCT" | "SERVICE";

function createEmptyItem(storeType: StoreType): CatalogueItemDraft {
  return {
    id: uid("item"),
    title: "",
    price: "",
    sku: "",
    description: "",
    is_available: true,
    sort_order: "0",
    item_type: storeType,
    is_billable: storeType === "PRODUCT",
    duration_minutes: "",
    supports_slot_booking: false,
    imageFile: null,
    imageUrl: null,
  };
}

function getPresetSource(storeType: StoreType) {
  return storeType === "SERVICE"
    ? DEFAULT_SERVICE_CATALOGUE_PRESETS
    : DEFAULT_PRODUCT_CATALOGUE_PRESETS;
}

function createPresetCategories(storeType: StoreType): CatalogueCategoryDraft[] {
  return getPresetSource(storeType).map((preset, index) => ({
    id: uid("cat"),
    enabled: false,
    title: preset.title,
    starting_from: preset.starting_from,
    sort_order: String(index),
    items: [],
    expanded: false,
  }));
}

export function useStoreCatalogue(
  preserveScroll: (fn: () => void) => void,
  storeType: StoreType
) {
  const [catalogueCategories, setCatalogueCategories] = useState<CatalogueCategoryDraft[]>(
    () => createPresetCategories(storeType)
  );
  const [customCategoryTitle, setCustomCategoryTitle] = useState("");
  const [customCategoryStartingFrom, setCustomCategoryStartingFrom] = useState("");
  const [customCategorySortOrder, setCustomCategorySortOrder] = useState("");
  const [deletedCategoryIds, setDeletedCategoryIds] = useState<string[]>([]);
  const [deletedItemIds, setDeletedItemIds] = useState<string[]>([]);

  const sortedCategories = useMemo(
    () =>
      [...catalogueCategories].sort(
        (a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0)
      ),
    [catalogueCategories]
  );

  const replaceCatalogue = (categories: CatalogueCategoryDraft[]) => {
    setCatalogueCategories(categories);
    setDeletedCategoryIds([]);
    setDeletedItemIds([]);
  };

  const resetForStoreType = () => {
    setCatalogueCategories(createPresetCategories(storeType));
    setDeletedCategoryIds([]);
    setDeletedItemIds([]);
  };

  const toggleCategoryEnabled = (catId: string, enabled: boolean) => {
    preserveScroll(() => {
      setCatalogueCategories((prev) =>
        prev.map((category) =>
          category.id === catId
            ? {
                ...category,
                enabled,
                expanded: enabled ? true : false,
                items:
                  enabled && category.items.length === 0
                    ? [createEmptyItem(storeType)]
                    : enabled
                    ? category.items
                    : [],
              }
            : category
        )
      );
    });
  };

  const toggleCategoryExpanded = (catId: string) => {
    preserveScroll(() => {
      setCatalogueCategories((prev) =>
        prev.map((category) =>
          category.id === catId ? { ...category, expanded: !category.expanded } : category
        )
      );
    });
  };

  const addCategory = () => {
    const title = customCategoryTitle.trim();
    if (!title) return;

    preserveScroll(() => {
      setCatalogueCategories((prev) => [
        {
          id: uid("cat"),
          enabled: true,
          title,
          starting_from: customCategoryStartingFrom.trim(),
          sort_order: customCategorySortOrder.trim() || String(prev.length),
          items: [createEmptyItem(storeType)],
          expanded: true,
        },
        ...prev,
      ]);
      setCustomCategoryTitle("");
      setCustomCategoryStartingFrom("");
      setCustomCategorySortOrder("");
    });
  };

  const removeCategory = (catId: string) => {
    preserveScroll(() => {
      setCatalogueCategories((prev) => {
        const category = prev.find((entry) => entry.id === catId);
        if (category?.persistedId) {
          setDeletedCategoryIds((current) => [...current, category.persistedId!]);
        }

        if (category?.items?.length) {
          const itemIds = category.items
            .map((item) => item.persistedId)
            .filter((value): value is string => Boolean(value));
          if (itemIds.length) {
            setDeletedItemIds((current) => [...current, ...itemIds]);
          }
        }

        return prev.filter((entry) => entry.id !== catId);
      });
    });
  };

  const updateCategoryField = (
    catId: string,
    key: "title" | "starting_from" | "sort_order",
    value: string
  ) => {
    preserveScroll(() => {
      setCatalogueCategories((prev) =>
        prev.map((category) =>
          category.id === catId ? { ...category, [key]: value } : category
        )
      );
    });
  };

  const addItemToCategory = (catId: string) => {
    preserveScroll(() => {
      setCatalogueCategories((prev) =>
        prev.map((category) =>
          category.id === catId
            ? {
                ...category,
                items: [
                  ...category.items,
                  createEmptyItem(storeType),
                ],
                expanded: true,
              }
            : category
        )
      );
    });
  };

  const removeItemFromCategory = (catId: string, itemId: string) => {
    preserveScroll(() => {
      setCatalogueCategories((prev) =>
        prev.map((category) => {
          if (category.id !== catId) return category;
          const item = category.items.find((entry) => entry.id === itemId);
          if (item?.persistedId) {
            setDeletedItemIds((current) => [...current, item.persistedId!]);
          }

          return {
            ...category,
            items: category.items.filter((entry) => entry.id !== itemId),
          };
        })
      );
    });
  };

  const updateItem = (
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
  ) => {
    preserveScroll(() => {
      setCatalogueCategories((prev) =>
        prev.map((category) =>
          category.id === catId
            ? {
                ...category,
                items: category.items.map((item) =>
                  item.id === itemId
                    ? {
                        ...item,
                        [key]: value,
                        ...(key === "supports_slot_booking" && value === false
                          ? { duration_minutes: item.duration_minutes }
                          : {}),
                      }
                    : item
                ),
              }
            : category
        )
      );
    });
  };

  const clearDeletedTracking = () => {
    setDeletedCategoryIds([]);
    setDeletedItemIds([]);
  };

  return {
    catalogueCategories: sortedCategories,
    setCatalogueCategories,
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
    replaceCatalogue,
    resetForStoreType,
    deletedCategoryIds,
    deletedItemIds,
    clearDeletedTracking,
  };
}
