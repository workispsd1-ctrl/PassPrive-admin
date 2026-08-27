"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Eye, EyeOff, FileText, Save } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import { showToast } from "@/hooks/useToast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type AboutContentRow = {
  id: string;
  title: string;
  content_html: string;
  is_published: boolean;
  updated_at: string;
};

const ABOUT_KEY = "passprive_about";

const TOOLBAR_ACTIONS: Array<{ label: string; command: string; value?: string }> = [
  { label: "B", command: "bold" },
  { label: "I", command: "italic" },
  { label: "U", command: "underline" },
  { label: "H2", command: "formatBlock", value: "h2" },
  { label: "H3", command: "formatBlock", value: "h3" },
  { label: "P", command: "formatBlock", value: "p" },
  { label: "• List", command: "insertUnorderedList" },
  { label: "1. List", command: "insertOrderedList" },
];

export default function AboutPage() {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const [rowId, setRowId] = useState<string | null>(null);
  const [title, setTitle] = useState("About PassPrive");
  const [contentHtml, setContentHtml] = useState("<p>Tell users what PassPrive is about.</p>");
  const [isPublished, setIsPublished] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const syncEditorHtml = useCallback((value: string) => {
    setContentHtml(value);
  }, []);

  const loadAbout = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabaseBrowser
        .from("about_content")
        .select("id, title, content_html, is_published, updated_at")
        .eq("content_key", ABOUT_KEY)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        const row = data as AboutContentRow;
        setRowId(row.id);
        setTitle(row.title || "About PassPrive");
        setContentHtml(row.content_html || "<p></p>");
        setIsPublished(row.is_published);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load About content.";
      showToast({ title: "Error", description: msg, type: "error" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAbout();
  }, [loadAbout]);

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== contentHtml) {
      editorRef.current.innerHTML = contentHtml;
    }
  }, [contentHtml]);

  const runEditorCommand = (command: string, value?: string) => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    document.execCommand(command, false, value);
    syncEditorHtml(editorRef.current.innerHTML);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmedTitle = title.trim();
    const html = (editorRef.current?.innerHTML || contentHtml).trim();

    if (!trimmedTitle) {
      showToast({ title: "Missing title", description: "Title is required.", type: "error" });
      return;
    }

    if (!html || html === "<p><br></p>" || html === "<p></p>") {
      showToast({ title: "Missing content", description: "About content is required.", type: "error" });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        content_key: ABOUT_KEY,
        title: trimmedTitle,
        content_html: html,
        is_published: isPublished,
      };

      if (rowId) {
        const { error } = await supabaseBrowser.from("about_content").update(payload).eq("id", rowId);
        if (error) throw error;
      } else {
        const { data, error } = await supabaseBrowser
          .from("about_content")
          .insert(payload)
          .select("id")
          .single();
        if (error) throw error;
        setRowId(data.id);
      }

      setContentHtml(html);
      showToast({ title: "Saved", description: "About content updated successfully." });
      await loadAbout();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to save About content.";
      showToast({ title: "Error", description: msg, type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const lastUpdatedLabel = useMemo(() => {
    if (loading) return "Loading...";
    return rowId ? "Connected to database" : "No saved record yet";
  }, [loading, rowId]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1.5 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-[#FFF7F4] flex items-center justify-center shrink-0">
            <FileText className="h-5 w-5 text-[#FF4800]" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-slate-900">About Content</h1>
            <p className="text-xs text-slate-400 mt-0.5">{lastUpdatedLabel}</p>
          </div>
        </div>
      </div>

      <Card className="border border-slate-100 bg-white shadow-sm overflow-hidden">
        <CardContent className="p-6">
          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block mb-1">Title</label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="About PassPrive"
                className="border-slate-200 focus-visible:ring-[#FF4800] focus-visible:border-[#FF4800] bg-slate-50/50 hover:bg-slate-50/80 hover:border-slate-300 transition-all rounded-xl h-11 px-4"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block mb-1">Content</label>
              <div className="rounded-xl border border-slate-200 overflow-hidden bg-white hover:border-slate-300 transition-all focus-within:border-[#FF4800] focus-within:ring-1 focus-within:ring-[#FF4800]/20">
                <div className="flex flex-wrap gap-2 border-b border-slate-100 p-2 bg-slate-50/50">
                  {TOOLBAR_ACTIONS.map((action) => (
                    <Button
                      key={`${action.command}-${action.label}`}
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 rounded-lg border-slate-200 hover:bg-white text-slate-700 font-medium hover:border-slate-300 hover:text-slate-900"
                      onClick={() => runEditorCommand(action.command, action.value)}
                    >
                      {action.label}
                    </Button>
                  ))}
                </div>
                <div
                  ref={editorRef}
                  contentEditable
                  suppressContentEditableWarning
                  onInput={(e) => syncEditorHtml((e.currentTarget as HTMLDivElement).innerHTML)}
                  className="min-h-[260px] p-4 outline-none prose prose-sm max-w-none focus:ring-0"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block mb-1">Status</label>
                <button
                  type="button"
                  onClick={() => setIsPublished(!isPublished)}
                  className={cn(
                    "w-full h-11 rounded-xl border px-4 text-sm font-medium flex items-center justify-center gap-2 transition-colors",
                    isPublished
                      ? "border-emerald-200 bg-emerald-50/50 text-emerald-700 hover:bg-emerald-50"
                      : "border-gray-200 bg-gray-50/50 text-gray-500 hover:bg-gray-50"
                  )}
                >
                  {isPublished ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  {isPublished ? "Published" : "Draft"}
                </button>
              </div>

              <div className="space-y-1.5 flex flex-col justify-end">
                <Button
                  disabled={saving || loading}
                  type="submit"
                  className="h-11 rounded-xl bg-[#FF4800] hover:bg-[#D43B00] text-white border-0 transition-colors shadow-sm px-6 font-semibold"
                >
                  <Save className="mr-2 h-4 w-4" />
                  {saving ? "Saving..." : "Save About"}
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="border border-slate-100 bg-white shadow-sm overflow-hidden">
        <CardHeader className="pb-3 border-b border-slate-100 p-6">
          <CardTitle className="text-[16px] font-semibold flex items-center gap-2 text-slate-900">
            <Eye className="h-4 w-4 text-[#FF4800]" />
            Preview
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <article className="prose prose-sm max-w-none rounded-xl border border-slate-100 bg-slate-50/30 p-5">
            <h2 className="text-xl font-bold text-slate-900 mb-4">{title || "About PassPrive"}</h2>
            <div dangerouslySetInnerHTML={{ __html: contentHtml }} className="text-slate-600 leading-relaxed" />
          </article>
        </CardContent>
      </Card>
    </div>
  );
}
