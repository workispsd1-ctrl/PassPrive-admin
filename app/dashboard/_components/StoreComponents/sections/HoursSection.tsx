"use client";

import React from "react";
import { Clock3, Minus, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { DAYS, ICON_INDIGO, inputClass } from "../constants";
import { Section } from "../ui";
import type { DayHours, OpenSection } from "../types";

export default function HoursSection({
  openSection,
  onToggle,
  preserveScroll,
  openingHours,
  setOpeningHours,
}: {
  openSection: OpenSection;
  onToggle: (id: Exclude<OpenSection, null>) => void;
  preserveScroll: (fn: () => void) => void;
  openingHours: Record<string, DayHours>;
  setOpeningHours: React.Dispatch<React.SetStateAction<Record<string, DayHours>>>;
}) {
  return (
    <Section
      id="hours"
      title="Opening Hours"
      subtitle="Weekly schedule used for Open/Closed logic."
      icon={<Clock3 size={18} />}
      openSection={openSection}
      onToggle={onToggle}
      preserveScroll={preserveScroll}
      rightIcon={<span className={ICON_INDIGO}>{openSection === "hours" ? <Minus size={18} /> : <Plus size={18} />}</span>}
    >
      <div className="rounded-xl border bg-white overflow-hidden">
        <div className="grid grid-cols-12 px-4 py-3 bg-gray-50 border-b text-xs font-semibold text-gray-600 uppercase">
          <div className="col-span-3">Day</div>
          <div className="col-span-2">Closed</div>
          <div className="col-span-3">Open</div>
          <div className="col-span-3">Close</div>
          <div className="col-span-1"></div>
        </div>

        {DAYS.map((day) => (
          <div
            key={day}
            className="grid grid-cols-12 gap-3 px-4 py-3 border-b last:border-b-0 items-center"
          >
            <div className="col-span-3 text-sm font-semibold text-gray-900">{day}</div>

            <div className="col-span-2 flex items-center gap-2">
              <input
                type="checkbox"
                checked={!!openingHours[day].closed}
                onChange={(e) =>
                  preserveScroll(() =>
                    setOpeningHours((prev) => ({
                      ...prev,
                      [day]: {
                        ...prev[day],
                        closed: e.target.checked,
                        open: e.target.checked ? "" : prev[day].open,
                        close: e.target.checked ? "" : prev[day].close,
                      },
                    }))
                  )
                }
                className="h-4 w-4"
              />
              <span className="text-sm text-gray-600">Closed</span>
            </div>

            <div className="col-span-3">
              <Input
                className={inputClass}
                type="time"
                value={openingHours[day].open}
                disabled={!!openingHours[day].closed}
                onChange={(e) =>
                  preserveScroll(() =>
                    setOpeningHours((prev) => ({
                      ...prev,
                      [day]: { ...prev[day], open: e.target.value },
                    }))
                  )
                }
              />
            </div>

            <div className="col-span-3">
              <Input
                className={inputClass}
                type="time"
                value={openingHours[day].close}
                disabled={!!openingHours[day].closed}
                onChange={(e) =>
                  preserveScroll(() =>
                    setOpeningHours((prev) => ({
                      ...prev,
                      [day]: { ...prev[day], close: e.target.value },
                    }))
                  )
                }
              />
            </div>

            <div className="col-span-1" />
          </div>
        ))}
      </div>
    </Section>
  );
}
