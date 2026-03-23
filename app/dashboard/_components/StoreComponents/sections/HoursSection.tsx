"use client";

import React from "react";
import { Clock3, Minus, Plus } from "lucide-react";
import { DAYS, HOUR_OPTIONS, ICON_INDIGO } from "../constants";
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
      <div className="space-y-3 rounded-xl border bg-white p-4">
        {DAYS.map((day) => {
          const dayHours = openingHours[day] || { open: "", close: "", closed: false };

          return (
            <div key={day} className="rounded-md border border-gray-200 p-3 space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-gray-900">{day}</div>
                <label className="flex items-center gap-2 text-sm text-gray-600">
                  <input
                    type="checkbox"
                    checked={!!dayHours.closed}
                    onChange={(e) =>
                      preserveScroll(() =>
                        setOpeningHours((prev) => ({
                          ...prev,
                          [day]: {
                            ...prev[day],
                            closed: e.target.checked,
                            open: e.target.checked ? "" : (prev[day]?.open || ""),
                            close: e.target.checked ? "" : (prev[day]?.close || ""),
                          },
                        }))
                      )
                    }
                    className="h-4 w-4"
                  />
                  <span>Closed</span>
                </label>
              </div>

              {!dayHours.closed && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <select
                    className="border rounded-md px-3 py-2 text-sm bg-white"
                    value={dayHours.open || ""}
                    onChange={(e) =>
                      preserveScroll(() =>
                        setOpeningHours((prev) => ({
                          ...prev,
                          [day]: { ...prev[day], open: e.target.value },
                        }))
                      )
                    }
                  >
                    <option value="">Open</option>
                    {HOUR_OPTIONS.map((t) => (
                      <option key={`${day}-open-${t}`} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>

                  <select
                    className="border rounded-md px-3 py-2 text-sm bg-white"
                    value={dayHours.close || ""}
                    onChange={(e) =>
                      preserveScroll(() =>
                        setOpeningHours((prev) => ({
                          ...prev,
                          [day]: { ...prev[day], close: e.target.value },
                        }))
                      )
                    }
                  >
                    <option value="">Close</option>
                    {HOUR_OPTIONS.map((t) => (
                      <option key={`${day}-close-${t}`} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Section>
  );
}
