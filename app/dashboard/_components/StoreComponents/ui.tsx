"use client";

import React from "react";
import { X } from "lucide-react";
import { ICON_INDIGO } from "./constants";
import type { OpenSection } from "./types";

export function Label({
  children,
  hint,
  required,
}: {
  children: React.ReactNode;
  hint?: string;
  required?: boolean;
}) {
  return (
    <div className="mb-1">
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-gray-900">
          {children} {required ? <span className="text-red-600">*</span> : null}
        </span>
      </div>
      {hint ? <div className="text-xs text-gray-500 mt-1">{hint}</div> : null}
    </div>
  );
}

export function Switch({
  checked,
  onChange,
  label,
  hint,
  preserveScroll,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  hint?: string;
  preserveScroll: (fn: () => void) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border bg-gray-50 px-4 py-3">
      <div>
        <div className="text-sm font-semibold text-gray-900">{label}</div>
        {hint ? <div className="text-xs text-gray-500 mt-1">{hint}</div> : null}
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => preserveScroll(() => onChange(!checked))}
        className={[
          "relative inline-flex h-7 w-12 items-center rounded-full transition",
          checked ? "bg-[#DA3224]" : "bg-gray-300",
        ].join(" ")}
      >
        <span
          className={[
            "inline-block h-5 w-5 transform rounded-full bg-white transition",
            checked ? "translate-x-6" : "translate-x-1",
          ].join(" ")}
        />
      </button>
    </div>
  );
}

export function Section({
  id,
  title,
  subtitle,
  icon,
  openSection,
  onToggle,
  preserveScroll,
  children,
  rightIcon,
}: {
  id: Exclude<OpenSection, null>;
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  openSection: OpenSection;
  onToggle: (id: Exclude<OpenSection, null>) => void;
  preserveScroll: (fn: () => void) => void;
  children: React.ReactNode;
  rightIcon?: React.ReactNode;
}) {
  const open = openSection === id;

  return (
    <div className="rounded-2xl border bg-white overflow-hidden">
      <button
        type="button"
        onClick={() => preserveScroll(() => onToggle(id))}
        className="w-full flex items-center justify-between px-5 py-4"
      >
        <div className="flex items-start gap-3 text-left">
          <div className="mt-0.5 text-gray-900">{icon}</div>
          <div>
            <div className="text-[13px] font-semibold tracking-wide text-gray-900 uppercase">
              {title}
            </div>
            {subtitle ? (
              <div className="text-sm text-gray-500 mt-1">{subtitle}</div>
            ) : null}
          </div>
        </div>

        <div className={ICON_INDIGO}>{rightIcon}</div>
      </button>

      {open ? <div className="px-5 pb-5">{children}</div> : null}
    </div>
  );
}

/* ---------------------------
   PREVIEWS
--------------------------- */

export function SinglePreview({
  file,
  onRemove,
  preserveScroll,
}: {
  file: File | null;
  onRemove: () => void;
  preserveScroll: (fn: () => void) => void;
}) {
  if (!file) return null;
  const url = URL.createObjectURL(file);

  return (
    <div className="relative h-24 w-24 rounded-xl overflow-hidden border border-gray-200 mt-3">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt="preview" className="h-full w-full object-cover" />
      <button
        type="button"
        onClick={() => preserveScroll(onRemove)}
        className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1 hover:bg-black"
        aria-label="Remove"
      >
        <X size={12} />
      </button>
    </div>
  );
}

export function MediaPreview({
  file,
  kind,
  onRemove,
  preserveScroll,
}: {
  file: File | null;
  kind: "video" | "audio";
  onRemove: () => void;
  preserveScroll: (fn: () => void) => void;
}) {
  if (!file) return null;
  const url = URL.createObjectURL(file);

  return (
    <div className="mt-3 rounded-xl border bg-white p-3">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold text-gray-900">
          Selected {kind}: {file.name}
        </div>
        <button
          type="button"
          onClick={() => preserveScroll(onRemove)}
          className="rounded-full bg-black/70 p-2 text-white hover:bg-black"
          aria-label="Remove"
        >
          <X size={14} />
        </button>
      </div>

      <div className="mt-3">
        {kind === "video" ? (
          <video src={url} controls className="w-full max-h-[260px] rounded-lg" />
        ) : (
          <audio src={url} controls className="w-full" />
        )}
      </div>
    </div>
  );
}

export function ImagePreviewGrid({
  files,
  onRemove,
  preserveScroll,
}: {
  files: File[];
  onRemove: (index: number) => void;
  preserveScroll: (fn: () => void) => void;
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 mt-3">
      {files.map((file, index) => {
        const url = URL.createObjectURL(file);
        return (
          <div
            key={index}
            className="relative h-24 rounded-xl overflow-hidden border border-gray-200"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt="preview" className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => preserveScroll(() => onRemove(index))}
              className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1 hover:bg-black"
              aria-label="Remove"
            >
              <X size={12} />
            </button>
          </div>
        );
      })}
    </div>
  );
}

export function ItemImagePreview({
  file,
  onRemove,
  preserveScroll,
}: {
  file: File | null | undefined;
  onRemove: () => void;
  preserveScroll: (fn: () => void) => void;
}) {
  if (!file) return null;
  const url = URL.createObjectURL(file);

  return (
    <div className="relative h-20 w-20 rounded-xl overflow-hidden border border-gray-200">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt="item" className="h-full w-full object-cover" />
      <button
        type="button"
        onClick={() => preserveScroll(onRemove)}
        className="absolute -top-2 -right-2 bg-black/70 text-white rounded-full p-1 hover:bg-black"
        aria-label="Remove item image"
      >
        <X size={12} />
      </button>
    </div>
  );
}

export function CoverMediaPreview({
  file,
  onRemove,
  preserveScroll,
}: {
  file: File | null;
  onRemove: () => void;
  preserveScroll: (fn: () => void) => void;
}) {
  if (!file) return null;

  const url = URL.createObjectURL(file);
  const isVideo = file.type.startsWith("video/");
  const isImage = file.type.startsWith("image/");

  return (
    <div className="mt-3 rounded-xl border bg-white p-3">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold text-gray-900">
          Selected cover: {file.name}
        </div>

        <button
          type="button"
          onClick={() => preserveScroll(onRemove)}
          className="rounded-full bg-black/70 p-2 text-white hover:bg-black"
          aria-label="Remove cover"
        >
          <X size={14} />
        </button>
      </div>

      <div className="mt-3">
        {isVideo ? (
          <video
            src={url}
            controls
            className="w-full max-h-[260px] rounded-lg"
          />
        ) : isImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="cover" className="w-full rounded-lg" />
        ) : (
          <div className="text-sm text-gray-600">
            Unsupported file type: {file.type}
          </div>
        )}
      </div>
    </div>
  );
}
