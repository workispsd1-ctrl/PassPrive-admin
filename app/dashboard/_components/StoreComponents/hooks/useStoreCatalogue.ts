"use client";

import { useState } from "react";
import type { CatalogueCategoryDraft } from "../types";
import { DEFAULT_CATALOGUE_PRESETS } from "../constants";
import { uid } from "../utils";

export function useStoreCatalogue(preserveScroll: (fn: () => void) => void) {
  const [catalogueCategories, setCatalogueCategories] = useState<CatalogueCategoryDraft[]>(
    () =>
      DEFAULT_CATALOGUE_PRESETS.map((p) => ({
        id: uid("cat"),
        enabled: false,
        title: p.title,
        starting_from: p.starting_from,
        items: [],
        expanded: false,
      }))
  );

  const [customCategoryTitle, setCustomCategoryTitle] = useState("");
  const [customCategoryStartingFrom, setCustomCategoryStartingFrom] = useState("");

  const toggleCategoryEnabled = (catId: string, enabled: boolean) => {
    preserveScroll(() => {
      setCatalogueCategories((prev) =>
        prev.map((c) =>
          c.id === catId
            ? {
                ...c,
                enabled,
                expanded: enabled ? true : false,
                items:
                  enabled && c.items.length === 0
                    ? [
                        {
                          id: uid("item"),
                          title: "",
                          price: "",
                          sku: "",
                          description: "",
                          is_available: true,
                          imageFile: null,
                          imageUrl: null,
                        },
                      ]
                    : enabled
                    ? c.items
                    : [],
              }
            : c
        )
      );
    });
  };

  const toggleCategoryExpanded = (catId: string) => {
    preserveScroll(() => {
      setCatalogueCategories((prev) =>
        prev.map((c) => (c.id === catId ? { ...c, expanded: !c.expanded } : c))
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
          items: [
            {
              id: uid("item"),
              title: "",
              price: "",
              sku: "",
              description: "",
              is_available: true,
              imageFile: null,
              imageUrl: null,
            },
          ],
          expanded: true,
        },
        ...prev,
      ]);

      setCustomCategoryTitle("");
      setCustomCategoryStartingFrom("");
    });
  };

  const removeCategory = (catId: string) => {
    preserveScroll(() => {
      setCatalogueCategories((prev) => prev.filter((c) => c.id !== catId));
    });
  };

  const updateCategoryField = (
    catId: string,
    key: "title" | "starting_from",
    value: string
  ) => {
    preserveScroll(() => {
      setCatalogueCategories((prev) =>
        prev.map((c) => (c.id === catId ? { ...c, [key]: value } : c))
      );
    });
  };

  const addItemToCategory = (catId: string) => {
    preserveScroll(() => {
      setCatalogueCategories((prev) =>
        prev.map((c) =>
          c.id === catId
            ? {
                ...c,
                items: [
                  ...c.items,
                  {
                    id: uid("item"),
                    title: "",
                    price: "",
                    sku: "",
                    description: "",
                    is_available: true,
                    imageFile: null,
                    imageUrl: null,
                  },
                ],
                expanded: true,
              }
            : c
        )
      );
    });
  };

  const removeItemFromCategory = (catId: string, itemId: string) => {
    preserveScroll(() => {
      setCatalogueCategories((prev) =>
        prev.map((c) =>
          c.id === catId ? { ...c, items: c.items.filter((it) => it.id !== itemId) } : c
        )
      );
    });
  };

  const updateItem = (
    catId: string,
    itemId: string,
    key: "title" | "price" | "sku" | "description" | "is_available" | "imageFile",
    value: any
  ) => {
    preserveScroll(() => {
      setCatalogueCategories((prev) =>
        prev.map((c) =>
          c.id === catId
            ? {
                ...c,
                items: c.items.map((it) => (it.id === itemId ? { ...it, [key]: value } : it)),
              }
            : c
        )
      );
    });
  };

  return {
    catalogueCategories,
    setCatalogueCategories,
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
  };
}
