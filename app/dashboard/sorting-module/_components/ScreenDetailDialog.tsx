"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";

export interface TitleItem {
  id: string;
  title: string;
  sortLabel: string;
}

export interface Screen {
  id: string;
  name: string;
  titles: TitleItem[];
}

interface ScreenDetailDialogProps {
  screen: Screen | null;
  onClose: () => void;
  onUpdate: (updated: Screen) => void;
}

export default function ScreenDetailDialog({ screen, onClose, onUpdate }: ScreenDetailDialogProps) {
  const [title, setTitle] = useState("");
  const [sortLabel, setSortLabel] = useState("");

  if (!screen) return null;

  const handleAdd = () => {
    if (!title.trim() || !sortLabel.trim()) return;
    const newItem: TitleItem = {
      id: crypto.randomUUID(),
      title: title.trim(),
      sortLabel: sortLabel.trim(),
    };
    onUpdate({ ...screen, titles: [...screen.titles, newItem] });
    setTitle("");
    setSortLabel("");
  };

  const handleDelete = (id: string) => {
    onUpdate({ ...screen, titles: screen.titles.filter((t) => t.id !== id) });
  };

  const handleClose = () => {
    setTitle("");
    setSortLabel("");
    onClose();
  };

  return (
    <Dialog open={!!screen} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="sm:max-w-lg bg-white border-gray-200">
        <DialogHeader>
          <DialogTitle className="text-gray-900 text-lg font-semibold">
            {screen.name}
          </DialogTitle>
          <p className="text-xs text-gray-500 mt-0.5">Manage titles and sort labels for this screen</p>
        </DialogHeader>

        {/* Add new title form */}
        <div className="space-y-3 border border-dashed border-[#5800AB]/30 rounded-xl p-4 bg-[#5800AB]/[0.02]">
          <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Add Title</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-gray-600">
                Title <span className="text-red-500">*</span>
              </Label>
              <Input
                placeholder="e.g. Restaurants"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="border border-gray-200 focus:border-[#5800AB] focus:ring-0 focus-visible:ring-0 rounded-lg text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-gray-600">
                Sort Label <span className="text-red-500">*</span>
              </Label>
              <Input
                placeholder="e.g. A-Z"
                value={sortLabel}
                onChange={(e) => setSortLabel(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                className="border border-gray-200 focus:border-[#5800AB] focus:ring-0 focus-visible:ring-0 rounded-lg text-sm"
              />
            </div>
          </div>
          <Button
            onClick={handleAdd}
            disabled={!title.trim() || !sortLabel.trim()}
            className="w-full bg-[#5800AB] hover:bg-[#450087] text-white disabled:bg-gray-300 rounded-lg flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add
          </Button>
        </div>

        {/* Titles list */}
        {screen.titles.length > 0 ? (
          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Titles ({screen.titles.length})
            </p>
            {screen.titles.map((item, idx) => (
              <div
                key={item.id}
                className="flex items-center justify-between px-4 py-3 rounded-lg border border-gray-100 bg-gray-50/60 hover:bg-gray-50 transition"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-400 font-mono w-5">{idx + 1}.</span>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{item.title}</p>
                    <p className="text-xs text-[#5800AB] font-medium">{item.sortLabel}</p>
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(item.id)}
                  className="text-gray-400 hover:text-red-500 transition p-1 rounded"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-sm text-gray-400 py-4">
            No titles added yet. Use the form above to add one.
          </p>
        )}

        <div className="flex justify-end pt-2">
          <Button
            onClick={handleClose}
            className="bg-[#5800AB] hover:bg-[#450087] text-white rounded-lg"
          >
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
