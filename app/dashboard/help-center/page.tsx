"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  Pencil,
  Trash2,
  Plus,
  X,
  ShieldCheck,
  Eye,
  EyeOff,
  Tag,
  ChevronDown,
  ChevronUp,
  Layers,
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

type HelpTopic = {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[] | null;
  is_published: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
};

type Template = {
  title: string;
  category: string;
  tags: string[];
  content: string;
};

const CATEGORIES = [
  "Getting Started",
  "Account & Profile",
  "Billing & Subscription",
  "Offers & Promotions",
  "Troubleshooting",
  "Security & Privacy",
  "Contact & Escalation",
] as const;

const CATEGORY_COLORS: Record<string, string> = {
  "Getting Started": "bg-emerald-100 text-emerald-700 border-emerald-200",
  "Account & Profile": "bg-blue-100 text-blue-700 border-blue-200",
  "Billing & Subscription": "bg-amber-100 text-amber-700 border-amber-200",
  "Offers & Promotions": "bg-pink-100 text-pink-700 border-pink-200",
  "Troubleshooting": "bg-orange-100 text-orange-700 border-orange-200",
  "Security & Privacy": "bg-violet-100 text-violet-700 border-violet-200",
  "Contact & Escalation": "bg-cyan-100 text-cyan-700 border-cyan-200",
};

const TEMPLATES: Template[] = [
  {
    title: "Getting Started with PassPrive",
    category: "Getting Started",
    tags: ["onboarding", "setup", "welcome"],
    content:
      "Welcome to PassPrive! Here's how to get started:\n\n1. Download the app and create your account.\n2. Complete your profile with your preferences.\n3. Browse exclusive offers tailored to you.\n4. Redeem offers at partner restaurants and stores.\n5. Track your savings in the dashboard.\n\nNeed help? Reach out to support at any time.",
  },
  {
    title: "How to Reset Your Password",
    category: "Account & Profile",
    tags: ["password", "login", "security"],
    content:
      "If you've forgotten your password:\n\n1. Tap 'Forgot Password' on the sign-in screen.\n2. Enter your registered email address.\n3. Check your inbox for a reset link (valid for 30 minutes).\n4. Click the link and create a new secure password.\n5. Log in with your new password.\n\nTip: If you don't receive the email, check your spam folder or request a new link.",
  },
  {
    title: "Subscription Plans & Billing",
    category: "Billing & Subscription",
    tags: ["billing", "subscription", "payment"],
    content:
      "PassPrive offers flexible subscription tiers:\n\n• **Basic** – Access to standard offers.\n• **Premium** – All offers + exclusive early access.\n• **Corporate** – Team plans with centralised billing.\n\nBilling cycles are monthly or annual. You can upgrade, downgrade, or cancel at any time from Account Settings. Refunds follow our 14-day money-back policy for new subscriptions.",
  },
  {
    title: "How to Redeem an Offer",
    category: "Offers & Promotions",
    tags: ["redemption", "offers", "how-to"],
    content:
      "Redeeming an offer is simple:\n\n1. Open the offer in the app.\n2. Tap 'Redeem Now' and show your screen to the staff.\n3. The merchant scans or notes your code.\n4. Enjoy your discount or benefit!\n\nEach offer has its own expiry and usage terms. Check the offer detail page for validity dates and any restrictions.",
  },
  {
    title: "Offer Not Working – Troubleshooting",
    category: "Troubleshooting",
    tags: ["error", "redemption", "fix"],
    content:
      "If your offer isn't working, try these steps:\n\n1. Ensure your app is updated to the latest version.\n2. Check that the offer hasn't expired.\n3. Confirm the merchant is a current partner.\n4. Verify your subscription is active.\n5. Restart the app and try again.\n\nIf the issue persists, use the 'Report a Problem' button on the offer page and our team will investigate within 24 hours.",
  },
  {
    title: "Data Privacy & Your Information",
    category: "Security & Privacy",
    tags: ["privacy", "GDPR", "data"],
    content:
      "Your privacy matters to us. Here's what you should know:\n\n• We collect only what's needed to deliver your personalised experience.\n• Your data is encrypted in transit and at rest.\n• We never sell your data to third parties.\n• You can export or delete your account data at any time under Settings > Privacy.\n• We comply with GDPR, PDPA, and local data protection regulations.\n\nFor full details, see our Privacy Policy in the app footer.",
  },
  {
    title: "Contact Support & Escalation",
    category: "Contact & Escalation",
    tags: ["support", "contact", "escalation"],
    content:
      "We're here to help:\n\n• **In-app chat**: Fastest response – available 24/7.\n• **Email**: support@passprive.com (response within 4 business hours).\n• **Phone**: Available for Corporate plan members.\n\nFor urgent issues (account compromised, billing error), use the in-app chat and mark as URGENT. Our team prioritises these cases.",
  },
];

const emptyForm = {
  title: "",
  content: "",
  category: CATEGORIES[0] as string,
  tags: "",
  is_published: true,
  display_order: 0,
};

export default function HelpCenterPage() {
  const [topics, setTopics] = useState<HelpTopic[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>("All");

  const [form, setForm] = useState(emptyForm);

  const parseTags = (value: string): string[] =>
    value.split(",").map((t) => t.trim()).filter(Boolean);

  const loadTopics = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabaseBrowser
        .from("help_topics")
        .select("id, title, content, category, tags, is_published, display_order, created_at, updated_at")
        .order("category", { ascending: true })
        .order("display_order", { ascending: true });

      if (error) throw error;
      setTopics((data || []) as HelpTopic[]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load help topics.";
      showToast({ title: "Error", description: msg, type: "error" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTopics();
  }, [loadTopics]);

  const allCategories = useMemo(() => {
    const existing = topics.map((t) => t.category).filter(Boolean);
    return ["All", ...Array.from(new Set([...CATEGORIES, ...existing]))];
  }, [topics]);

  const filteredTopics = useMemo(() => {
    if (filterCategory === "All") return topics;
    return topics.filter((t) => t.category === filterCategory);
  }, [topics, filterCategory]);

  const groupedTopics = useMemo(() => {
    const groups: Record<string, HelpTopic[]> = {};
    for (const topic of filteredTopics) {
      if (!groups[topic.category]) groups[topic.category] = [];
      groups[topic.category].push(topic);
    }
    return groups;
  }, [filteredTopics]);

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
  };

  const startEdit = (topic: HelpTopic) => {
    setEditingId(topic.id);
    setForm({
      title: topic.title,
      content: topic.content,
      category: topic.category,
      tags: (topic.tags || []).join(", "),
      is_published: topic.is_published,
      display_order: topic.display_order,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const applyTemplate = (template: Template) => {
    setForm({
      title: template.title,
      content: template.content,
      category: template.category,
      tags: template.tags.join(", "),
      is_published: true,
      display_order: 0,
    });
    setEditingId(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.content.trim() || !form.category.trim()) {
      showToast({ title: "Missing fields", description: "Title, category and content are required.", type: "error" });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        content: form.content.trim(),
        category: form.category.trim(),
        tags: parseTags(form.tags),
        is_published: form.is_published,
        display_order: Number(form.display_order),
      };

      if (editingId) {
        const { error } = await supabaseBrowser
          .from("help_topics")
          .update(payload)
          .eq("id", editingId);
        if (error) throw error;
        showToast({ title: "Topic updated", description: "Changes saved successfully." });
      } else {
        const { error } = await supabaseBrowser.from("help_topics").insert(payload);
        if (error) throw error;
        showToast({ title: "Topic created", description: "Help topic added successfully." });
      }

      resetForm();
      await loadTopics();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to save help topic.";
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
        .from("help_topics")
        .delete()
        .eq("id", deleteId);
      if (error) throw error;
      showToast({ title: "Deleted", description: "Help topic removed." });
      setDeleteId(null);
      await loadTopics();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to delete topic.";
      showToast({ title: "Error", description: msg, type: "error" });
    } finally {
      setDeleting(false);
    }
  };

  const togglePublish = async (topic: HelpTopic) => {
    try {
      const { error } = await supabaseBrowser
        .from("help_topics")
        .update({ is_published: !topic.is_published })
        .eq("id", topic.id);
      if (error) throw error;
      showToast({
        title: topic.is_published ? "Unpublished" : "Published",
        description: `Topic is now ${topic.is_published ? "hidden" : "visible"}.`,
      });
      await loadTopics();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to update status.";
      showToast({ title: "Error", description: msg, type: "error" });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="border-0 shadow-sm bg-gradient-to-r from-teal-50 via-white to-cyan-50">
        <CardContent className="pt-6 pb-5">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center">
              <BookOpen className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Help Topics</h1>
              <p className="text-sm text-gray-500 mt-0.5">
                {topics.length} {topics.length === 1 ? "topic" : "topics"} &middot; Industry-standard help content for your support chatbot
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Industry Templates */}
      <Card className="border border-teal-100 bg-teal-50/40">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-teal-800">
            <ShieldCheck className="h-4 w-4" />
            Industry-Standard Starter Templates
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {TEMPLATES.map((tpl) => (
              <Button
                key={tpl.title}
                variant="outline"
                size="sm"
                type="button"
                onClick={() => applyTemplate(tpl)}
                className={cn(
                  "bg-white border text-xs h-8 font-medium",
                  CATEGORY_COLORS[tpl.category] || "border-gray-200 text-gray-700"
                )}
              >
                + {tpl.title}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Form Panel */}
        <div className="lg:col-span-2">
          <Card className={cn("sticky top-4 border", editingId ? "border-teal-300 shadow-md shadow-teal-100" : "border-gray-200")}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">
                  {editingId ? "Edit Topic" : "Add Help Topic"}
                </CardTitle>
                {editingId && (
                  <Button variant="ghost" size="icon" onClick={resetForm} className="h-7 w-7 text-gray-400 hover:text-gray-600">
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
              {editingId && (
                <p className="text-xs text-teal-600 font-medium">Editing existing topic</p>
              )}
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Title *</label>
                  <Input
                    value={form.title}
                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                    placeholder="e.g. How to Reset Your Password"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Category *</label>
                  <Input
                    value={form.category}
                    onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                    list="help-categories"
                    placeholder="Select or type a category"
                  />
                  <datalist id="help-categories">
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat} />
                    ))}
                  </datalist>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Content *</label>
                  <Textarea
                    value={form.content}
                    onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
                    placeholder="Write step-by-step instructions, Q&A, or policy content..."
                    rows={8}
                  />
                  <p className="text-[11px] text-gray-400">Supports plain text and markdown-style formatting.</p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Tags</label>
                  <Input
                    value={form.tags}
                    onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
                    placeholder="billing, refund, policy (comma-separated)"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Order</label>
                    <Input
                      type="number"
                      value={form.display_order}
                      onChange={(e) => setForm((f) => ({ ...f, display_order: Number(e.target.value) }))}
                      placeholder="0"
                      min={0}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Status</label>
                    <button
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, is_published: !f.is_published }))}
                      className={cn(
                        "w-full h-9 rounded-md border px-3 text-sm font-medium flex items-center gap-2 transition-colors",
                        form.is_published
                          ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                          : "border-gray-300 bg-gray-50 text-gray-500"
                      )}
                    >
                      {form.is_published ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                      {form.is_published ? "Published" : "Draft"}
                    </button>
                  </div>
                </div>

                <div className="flex gap-2 pt-1">
                  {editingId && (
                    <Button type="button" variant="outline" onClick={resetForm} className="flex-1">
                      Cancel
                    </Button>
                  )}
                  <Button
                    disabled={saving}
                    type="submit"
                    className={cn("flex-1 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white")}
                  >
                    {saving ? "Saving..." : editingId ? "Update Topic" : (
                      <span className="flex items-center gap-2"><Plus className="h-4 w-4" /> Add Topic</span>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* List Panel */}
        <div className="lg:col-span-3 space-y-4">
          {/* Category filter */}
          <div className="flex flex-wrap gap-2">
            {allCategories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setFilterCategory(cat)}
                className={cn(
                  "text-xs px-3 py-1.5 rounded-full border font-medium transition-colors",
                  filterCategory === cat
                    ? "bg-gray-900 text-white border-gray-900"
                    : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
                )}
              >
                {cat}
                {cat !== "All" && (
                  <span className="ml-1 opacity-60">
                    ({topics.filter((t) => t.category === cat).length})
                  </span>
                )}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-24 rounded-xl bg-gray-100 animate-pulse" />
              ))}
            </div>
          ) : filteredTopics.length === 0 ? (
            <Card className="border border-gray-200">
              <CardContent className="py-12 text-center text-gray-400">
                <BookOpen className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">
                  {filterCategory === "All"
                    ? "No help topics yet. Add your first one or use a template."
                    : `No topics in "${filterCategory}" yet.`}
                </p>
              </CardContent>
            </Card>
          ) : (
            Object.entries(groupedTopics).map(([category, items]) => (
              <div key={category}>
                <div className="flex items-center gap-2 mb-2">
                  <Layers className="h-3.5 w-3.5 text-gray-400" />
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    {category}
                  </span>
                  <span className="text-xs text-gray-400">({items.length})</span>
                </div>

                <div className="space-y-2">
                  {items.map((topic) => (
                    <div
                      key={topic.id}
                      className={cn(
                        "rounded-xl border transition-all",
                        editingId === topic.id
                          ? "border-teal-300 bg-teal-50/50"
                          : "border-gray-200 bg-white hover:border-gray-300"
                      )}
                    >
                      <div className="flex items-start gap-3 p-4">
                        <button
                          type="button"
                          onClick={() => setExpandedId(expandedId === topic.id ? null : topic.id)}
                          className="flex-1 text-left min-w-0"
                        >
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge
                              variant="outline"
                              className={cn("text-[10px] h-4 py-0 border font-medium", CATEGORY_COLORS[category] || "border-gray-200 text-gray-500")}
                            >
                              {category}
                            </Badge>
                            {!topic.is_published && (
                              <Badge variant="secondary" className="text-[10px] py-0 h-4 bg-amber-100 text-amber-700 border-amber-200">
                                Draft
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm font-medium text-gray-900 mt-1 leading-snug">
                            {topic.title}
                          </p>
                          {topic.tags && topic.tags.length > 0 && (
                            <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                              <Tag className="h-3 w-3 text-gray-400" />
                              {topic.tags.map((tag) => (
                                <span key={tag} className="text-[11px] text-gray-500 bg-gray-100 rounded px-1.5 py-0.5">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </button>

                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-gray-400 hover:text-amber-600"
                            onClick={() => togglePublish(topic)}
                            title={topic.is_published ? "Unpublish" : "Publish"}
                          >
                            {topic.is_published ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-gray-400 hover:text-teal-600"
                            onClick={() => startEdit(topic)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-gray-400 hover:text-red-500"
                            onClick={() => setDeleteId(topic.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-gray-400"
                            onClick={() => setExpandedId(expandedId === topic.id ? null : topic.id)}
                          >
                            {expandedId === topic.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>

                      {expandedId === topic.id && (
                        <div className="px-4 pb-4 border-t border-gray-100 pt-3">
                          <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">
                            {topic.content}
                          </p>
                          <p className="text-xs text-gray-400 mt-3">
                            Order: {topic.display_order} &middot; Updated: {new Date(topic.updated_at).toLocaleDateString()}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Help Topic</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">
            This help topic will be permanently deleted. This action cannot be undone.
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
