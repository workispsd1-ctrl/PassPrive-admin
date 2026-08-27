"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import {
  HelpCircle,
  Pencil,
  Trash2,
  Plus,
  X,
  ChevronDown,
  ChevronUp,
  Tag,
  Eye,
  EyeOff,
} from "lucide-react";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { showToast } from "@/hooks/useToast";
import { cn } from "@/lib/utils";

type FaqItem = {
  id: string;
  question: string;
  answer: string;
  tags: string[] | null;
  is_published: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
};

const emptyForm = {
  question: "",
  answer: "",
  tags: "",
  is_published: true,
  display_order: 0,
};

export default function FaqPage() {
  const [faqs, setFaqs] = useState<FaqItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const parseTags = (value: string): string[] =>
    value.split(",").map((t) => t.trim()).filter(Boolean);

  const loadFaqs = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabaseBrowser
        .from("faq_entries")
        .select("id, question, answer, tags, is_published, display_order, created_at, updated_at")
        .order("display_order", { ascending: true })
        .order("updated_at", { ascending: false });

      if (error) throw error;
      setFaqs((data || []) as FaqItem[]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load FAQs.";
      showToast({ title: "Error", description: msg, type: "error" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFaqs();
  }, [loadFaqs]);

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
  };

  const startEdit = (faq: FaqItem) => {
    setEditingId(faq.id);
    setForm({
      question: faq.question,
      answer: faq.answer,
      tags: (faq.tags || []).join(", "),
      is_published: faq.is_published,
      display_order: faq.display_order,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.question.trim() || !form.answer.trim()) {
      showToast({ title: "Missing fields", description: "Question and answer are required.", type: "error" });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        question: form.question.trim(),
        answer: form.answer.trim(),
        tags: parseTags(form.tags),
        is_published: form.is_published,
        display_order: Number(form.display_order),
      };

      if (editingId) {
        const { error } = await supabaseBrowser
          .from("faq_entries")
          .update(payload)
          .eq("id", editingId);
        if (error) throw error;
        showToast({ title: "FAQ updated", description: "Changes saved successfully." });
      } else {
        const { error } = await supabaseBrowser.from("faq_entries").insert(payload);
        if (error) throw error;
        showToast({ title: "FAQ created", description: "New FAQ entry added." });
      }

      resetForm();
      await loadFaqs();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to save FAQ.";
      showToast({ title: "Error", description: msg, type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      const { error } = await supabaseBrowser
        .from("faq_entries")
        .delete()
        .eq("id", deleteId);
      if (error) throw error;
      showToast({ title: "Deleted", description: "FAQ entry removed." });
      setDeleteId(null);
      await loadFaqs();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to delete FAQ.";
      showToast({ title: "Error", description: msg, type: "error" });
    } finally {
      setDeleting(false);
    }
  };

  const togglePublish = async (faq: FaqItem) => {
    try {
      const { error } = await supabaseBrowser
        .from("faq_entries")
        .update({ is_published: !faq.is_published })
        .eq("id", faq.id);
      if (error) throw error;
      showToast({
        title: faq.is_published ? "Unpublished" : "Published",
        description: `FAQ is now ${faq.is_published ? "hidden" : "visible"}.`,
      });
      await loadFaqs();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to update status.";
      showToast({ title: "Error", description: msg, type: "error" });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-1.5 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-[#FFF7F4] flex items-center justify-center shrink-0">
            <HelpCircle className="h-5 w-5 text-[#FF4800]" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-slate-900">FAQ Manager</h1>
            <p className="text-xs text-slate-400 mt-0.5">
              {faqs.length} {faqs.length === 1 ? "entry" : "entries"} &middot; Create, edit and manage frequently asked questions
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Form Panel */}
        <div className="lg:col-span-2">
          <Card className={cn("sticky top-4 border border-slate-200 rounded-2xl shadow-sm bg-white overflow-hidden", editingId && "border-[#FFA680] shadow-[#FFA680]/10 shadow-md")}>
            <CardContent className="p-6 space-y-5">
              <div className="border-b border-slate-100 pb-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-semibold text-slate-950">
                    {editingId ? "Edit FAQ" : "Add New FAQ"}
                  </h3>
                  {editingId && (
                    <Button variant="ghost" size="icon" onClick={resetForm} className="h-7 w-7 text-gray-400 hover:text-gray-600 rounded-lg">
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                {editingId ? (
                  <p className="text-xs text-[#FF4800] font-medium mt-1">Editing existing entry</p>
                ) : (
                  <p className="text-xs text-slate-500 mt-1">Create a new question and answer pair</p>
                )}
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block mb-1">Question *</label>
                  <Input
                    value={form.question}
                    onChange={(e) => setForm((f) => ({ ...f, question: e.target.value }))}
                    placeholder="e.g. How do I reset my password?"
                    className="border-slate-200 focus-visible:ring-[#FF4800] focus-visible:border-[#FF4800] bg-slate-50/50 hover:bg-slate-50/80 hover:border-slate-300 transition-all rounded-xl h-11 px-4"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block mb-1">Answer *</label>
                  <Textarea
                    value={form.answer}
                    onChange={(e) => setForm((f) => ({ ...f, answer: e.target.value }))}
                    placeholder="Write a clear, concise answer..."
                    rows={6}
                    className="border-slate-200 focus-visible:ring-[#FF4800] focus-visible:border-[#FF4800] bg-slate-50/50 hover:bg-slate-50/80 hover:border-slate-300 transition-all rounded-xl p-4 min-h-[140px]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block mb-1">Tags</label>
                  <Input
                    value={form.tags}
                    onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
                    placeholder="password, login, account (comma-separated)"
                    className="border-slate-200 focus-visible:ring-[#FF4800] focus-visible:border-[#FF4800] bg-slate-50/50 hover:bg-slate-50/80 hover:border-slate-300 transition-all rounded-xl h-11 px-4"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block mb-1">Order</label>
                    <Input
                      type="number"
                      value={form.display_order}
                      onChange={(e) => setForm((f) => ({ ...f, display_order: Number(e.target.value) }))}
                      placeholder="0"
                      min={0}
                      className="border-slate-200 focus-visible:ring-[#FF4800] focus-visible:border-[#FF4800] bg-slate-50/50 hover:bg-slate-50/80 hover:border-slate-300 transition-all rounded-xl h-11 px-4"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block mb-1">Status</label>
                    <button
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, is_published: !f.is_published }))}
                      className={cn(
                        "w-full h-11 rounded-xl border px-4 text-sm font-medium flex items-center justify-center gap-2 transition-colors",
                        form.is_published
                          ? "border-emerald-200 bg-emerald-50/50 text-emerald-700 hover:bg-emerald-50"
                          : "border-gray-200 bg-gray-50/50 text-gray-500 hover:bg-gray-50"
                      )}
                    >
                      {form.is_published ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                      {form.is_published ? "Published" : "Draft"}
                    </button>
                  </div>
                </div>

                <div className="flex gap-2 pt-1">
                  {editingId && (
                    <Button type="button" variant="outline" onClick={resetForm} className="flex-1 h-11 rounded-xl border-slate-200 hover:bg-slate-50">
                      Cancel
                    </Button>
                  )}
                  <Button
                    disabled={saving}
                    type="submit"
                    className={cn("flex-1 h-11 rounded-xl bg-[#FF4800] hover:bg-[#D43B00] text-white border-0 transition-colors shadow-sm")}
                  >
                    {saving ? "Saving..." : editingId ? "Update FAQ" : (
                      <span className="flex items-center justify-center gap-2"><Plus className="h-4 w-4" /> Add FAQ</span>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* List Panel */}
        <div className="lg:col-span-3">
          <Card className="border border-slate-200 rounded-2xl shadow-sm bg-white overflow-hidden">
            <CardContent className="p-6 space-y-5">
              <div className="border-b border-slate-100 pb-4">
                <h3 className="text-base font-semibold text-slate-950">All FAQs</h3>
              </div>
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-16 rounded-xl bg-gray-100 animate-pulse" />
                  ))}
                </div>
              ) : faqs.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <HelpCircle className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No FAQs yet. Add your first one.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {faqs.map((faq) => (
                    <div
                      key={faq.id}
                      className={cn(
                        "rounded-xl border transition-all",
                        editingId === faq.id
                          ? "border-[#FFA680] bg-[#FFF7F4]/50"
                          : "border-gray-200 bg-white hover:border-gray-300"
                      )}
                    >
                      {/* Row header */}
                      <div className="flex items-start gap-3 p-4">
                        <button
                          type="button"
                          onClick={() => setExpandedId(expandedId === faq.id ? null : faq.id)}
                          className="flex-1 text-left min-w-0"
                        >
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-medium text-gray-900 leading-snug">
                              {faq.question}
                            </p>
                            {!faq.is_published && (
                              <Badge variant="secondary" className="text-[10px] py-0 h-4 bg-amber-100 text-amber-700 border-amber-200">
                                Draft
                              </Badge>
                            )}
                          </div>
                          {faq.tags && faq.tags.length > 0 && (
                            <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                              <Tag className="h-3 w-3 text-gray-400" />
                              {faq.tags.map((tag) => (
                                <span key={tag} className="text-[11px] text-gray-500 bg-gray-100 rounded px-1.5 py-0.5">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </button>

                        {/* Actions */}
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-gray-400 hover:text-amber-600"
                            onClick={() => togglePublish(faq)}
                            title={faq.is_published ? "Unpublish" : "Publish"}
                          >
                            {faq.is_published ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-gray-400 hover:text-[#FF4800]"
                            onClick={() => startEdit(faq)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-gray-400 hover:text-red-500"
                            onClick={() => setDeleteId(faq.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-gray-400"
                            onClick={() => setExpandedId(expandedId === faq.id ? null : faq.id)}
                          >
                            {expandedId === faq.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>

                      {/* Expanded answer */}
                      {expandedId === faq.id && (
                        <div className="px-4 pb-4 border-t border-gray-100 pt-3">
                          <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">
                            {faq.answer}
                          </p>
                          <p className="text-xs text-gray-400 mt-3">
                            Order: {faq.display_order} &middot; Updated: {new Date(faq.updated_at).toLocaleDateString()}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete FAQ</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">
            This FAQ entry will be permanently deleted. This action cannot be undone.
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleting}
              onClick={handleDelete}
            >
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
