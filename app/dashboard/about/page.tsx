"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Eye, FileText, Save } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import { showToast } from "@/hooks/useToast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

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
      <Card className="border-0 shadow-sm bg-gradient-to-r from-cyan-50 via-white to-teal-50">
        <CardContent className="pt-6 pb-5">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-cyan-600 to-teal-600 flex items-center justify-center">
              <FileText className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">About Content</h1>
              <p className="text-sm text-gray-500 mt-0.5">{lastUpdatedLabel}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border border-gray-200 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Edit About PassPrive</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Title</label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="About PassPrive" />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Content</label>
              <div className="rounded-xl border border-gray-200 overflow-hidden bg-white">
                <div className="flex flex-wrap gap-2 border-b border-gray-200 p-2">
                  {TOOLBAR_ACTIONS.map((action) => (
                    <Button
                      key={`${action.command}-${action.label}`}
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8"
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
                  className="min-h-[260px] p-4 outline-none prose prose-sm max-w-none"
                />
              </div>
            </div>

            <label className="inline-flex items-center gap-2 text-sm font-medium text-gray-700">
              <input
                type="checkbox"
                checked={isPublished}
                onChange={(e) => setIsPublished(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              Published
            </label>

            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit" disabled={saving || loading}>
                <Save className="mr-2 h-4 w-4" />
                {saving ? "Saving..." : "Save About"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="border border-gray-200 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Preview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <article className="prose prose-sm max-w-none rounded-xl border border-gray-200 bg-gray-50 p-4">
            <h1>{title || "About PassPrive"}</h1>
            <div dangerouslySetInnerHTML={{ __html: contentHtml }} />
          </article>
        </CardContent>
      </Card>
    </div>
  );
}
