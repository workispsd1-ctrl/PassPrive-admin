"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Pencil,
  Trash2,
  Image as ImageIcon,
  Video as VideoIcon,
  RefreshCw,
  Tag,
  Filter,
  Search,
} from "lucide-react";

const MODULE_BADGE = {
  global: "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
  dining: "bg-green-50 text-green-700 ring-1 ring-green-200",
  stores: "bg-purple-50 text-purple-700 ring-1 ring-purple-200",
  events: "bg-amber-50 text-amber-800 ring-1 ring-amber-200",
};

export default function SpotlightList({ onEdit }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  const [query, setQuery] = useState("");
  const [moduleFilter, setModuleFilter] = useState("all");

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/spotlight", { cache: "no-store" });
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((it) => {
      const matchesQuery =
        !q ||
        (it.title || "").toLowerCase().includes(q) ||
        (it.subtitle || "").toLowerCase().includes(q);

      const matchesModule =
        moduleFilter === "all" || it.module_type === moduleFilter;

      return matchesQuery && matchesModule;
    });
  }, [items, query, moduleFilter]);

  const handleDelete = async (id) => {
    const ok = confirm("Delete this spotlight item? This cannot be undone.");
    if (!ok) return;

    try {
      await fetch(`/api/spotlight/${id}`, { method: "DELETE" });
      fetchItems();
    } catch (e) {
      console.error(e);
      alert("Delete failed");
    }
  };

  return (
    <div className="mt-2">
      {/* Toolbar */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
          {/* Search */}
          <div className="relative w-full">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search spotlight..."
              className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          {/* Filter */}
          <div className="relative w-full">
            <Filter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <select
              value={moduleFilter}
              onChange={(e) => setModuleFilter(e.target.value)}
              className="w-full appearance-none rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-8 text-sm text-gray-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
            >
              <option value="all">All modules</option>
              <option value="global">Global</option>
              <option value="dining">Dining</option>
              <option value="stores">Stores</option>
              <option value="events">Events</option>
            </select>
          </div>
        </div>
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
            >
              <div className="h-[72px] w-[120px] rounded-xl bg-gray-100 animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-2/3 rounded bg-gray-100 animate-pulse" />
                <div className="h-3 w-1/2 rounded bg-gray-100 animate-pulse" />
                <div className="h-3 w-32 rounded bg-gray-100 animate-pulse" />
              </div>
              <div className="h-9 w-28 rounded-xl bg-gray-100 animate-pulse" />
            </div>
          ))}
        </div>
      )}

      {/* Empty */}
      {!loading && filtered.length === 0 && (
        <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center shadow-sm">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-50 ring-1 ring-gray-200">
            <Tag className="h-5 w-5 text-gray-700" />
          </div>
          <p className="text-base font-semibold text-gray-900">
            No spotlight items found
          </p>
          <p className="mt-1 text-sm text-gray-600">
            Try changing the search or module filter.
          </p>
        </div>
      )}

      {/* List */}
      {!loading && filtered.length > 0 && (
        <div className="space-y-3">
          {filtered.map((item) => {
            const badgeClass =
              MODULE_BADGE[item.module_type] ||
              "bg-gray-50 text-gray-700 ring-1 ring-gray-200";

            return (
              <div
                key={item.id}
                className="group flex flex-col gap-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition hover:shadow-md sm:flex-row sm:items-center"
              >
                {/* Thumbnail */}
                <div className="flex items-center gap-3">
                  <div className="relative h-[72px] w-[120px] overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.thumbnail_url || item.media_url}
                      alt={item.title}
                      className="h-full w-full object-cover"
                    />
                  </div>

                  {/* Media type icon */}
                  <div className="hidden sm:flex">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-50 ring-1 ring-gray-200">
                      {item.media_type === "video" ? (
                        <VideoIcon className="h-4 w-4 text-gray-700" />
                      ) : (
                        <ImageIcon className="h-4 w-4 text-gray-700" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="truncate text-sm font-semibold text-gray-900">
                      {item.title}
                    </h3>

                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${badgeClass}`}
                    >
                      {(item.module_type || "module").toUpperCase()}
                    </span>

                    <span className="inline-flex items-center rounded-full bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-700 ring-1 ring-gray-200">
                      {item.media_type === "video" ? "VIDEO" : "IMAGE"}
                    </span>
                  </div>

                  {item.subtitle ? (
                    <p className="mt-1 line-clamp-2 text-sm text-gray-600">
                      {item.subtitle}
                    </p>
                  ) : (
                    <p className="mt-1 text-sm text-gray-400">No subtitle</p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 sm:ml-auto">
                  <button
                    onClick={() => onEdit(item)}
                    className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-3 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  >
                    <Pencil className="h-4 w-4" />
                    Edit
                  </button>

                  <button
                    onClick={() => handleDelete(item.id)}
                    className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-3 py-2.5 text-sm font-semibold text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-200"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
