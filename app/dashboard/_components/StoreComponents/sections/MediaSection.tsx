"use client";

import React from "react";
import { BadgeCheck, Images, Minus, Plus, Video } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Section,
  SinglePreview,
  ImagePreviewGrid,
  Label,
  CoverMediaPreview,
} from "../ui";
import { ICON_INDIGO, inputClass } from "../constants";
import type { OpenSection } from "../types";

export default function MediaSection({
  openSection,
  onToggle,
  preserveScroll,

  logoFile,
  setLogoFile,

  coverMediaFile,
  setCoverMediaFile,

  galleryFiles,
  setGalleryFiles,
}: {
  openSection: OpenSection;
  onToggle: (id: Exclude<OpenSection, null>) => void;
  preserveScroll: (fn: () => void) => void;

  logoFile: File | null;
  setLogoFile: (f: File | null) => void;

  coverMediaFile: File | null;
  setCoverMediaFile: (f: File | null) => void;

  galleryFiles: File[];
  setGalleryFiles: (files: File[]) => void;
}) {
  const isOpen = openSection === "media";

  return (
    <Section
      id="media"
      title="Media"
      subtitle="Logo, cover (video/image), gallery."
      icon={<Images size={18} />}
      openSection={openSection}
      onToggle={onToggle}
      preserveScroll={preserveScroll}
      rightIcon={
        <span className={ICON_INDIGO}>
          {isOpen ? <Minus size={18} /> : <Plus size={18} />}
        </span>
      }
    >
      <div className="grid grid-cols-1 gap-6">
        {/* LOGO */}
        <div className="rounded-xl border bg-gray-50 p-4">
          <div className="flex items-center gap-2 font-semibold text-gray-900">
            <BadgeCheck size={18} />
            Logo
          </div>

          <div className="mt-3">
            <Input
              className={inputClass}
              type="file"
              accept="image/*"
              onChange={(e) =>
                preserveScroll(() => setLogoFile(e.target.files?.[0] || null))
              }
            />
            <SinglePreview
              file={logoFile}
              onRemove={() => setLogoFile(null)}
              preserveScroll={preserveScroll}
            />
          </div>
        </div>

        {/* COVER MEDIA (VIDEO OR IMAGE) */}
        <div className="rounded-xl border bg-gray-50 p-4">
          <div className="flex items-center gap-2 font-semibold text-gray-900">
            <Video size={18} />
            Cover Media (Video or Image)
          </div>

          <div className="mt-3 rounded-xl border bg-white p-4">
            <div className="mb-2">
              <Label hint="Upload either a short cover video or a cover image.">
                Cover file
              </Label>
            </div>

            <Input
              className={inputClass}
              type="file"
              accept="video/*,image/*"
              onChange={(e) => {
                const f = e.target.files?.[0] || null;
                preserveScroll(() => setCoverMediaFile(f));
              }}
            />

            <div className="mt-3">
              <CoverMediaPreview
                file={coverMediaFile}
                onRemove={() => setCoverMediaFile(null)}
                preserveScroll={preserveScroll}
              />
            </div>
          </div>
        </div>

        {/* GALLERY */}
        <div className="rounded-xl border bg-gray-50 p-4">
          <div className="flex items-center gap-2 font-semibold text-gray-900">
            <Images size={18} />
            Gallery
          </div>

          <div className="mt-3">
            <Input
              className={inputClass}
              type="file"
              multiple
              accept="image/*"
              onChange={(e) =>
                preserveScroll(() =>
                  setGalleryFiles([...galleryFiles, ...(e.target.files || [])])
                )
              }
            />

            <ImagePreviewGrid
              files={galleryFiles}
              onRemove={(i) =>
                setGalleryFiles(galleryFiles.filter((_, idx) => idx !== i))
              }
              preserveScroll={preserveScroll}
            />
          </div>
        </div>
      </div>
    </Section>
  );
}
