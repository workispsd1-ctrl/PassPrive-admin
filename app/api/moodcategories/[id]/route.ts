import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { authorizeAdmin } from "@/app/api/support-admin/_lib";

const TABLE = "restaurant_mood_categories";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await authorizeAdmin(request);
    if (auth.error) return auth.error;
    const body = await request.json();
    const { id } = await params;
    const { data, error } = await supabaseAdmin
      .from(TABLE)
      .update({
        key: body.key,
        slug: body.slug,
        title: body.title,
        light_theme_image_url: body.light_theme_image_url ?? null,
        light_theme_image_path: body.light_theme_image_path ?? null,
        dark_theme_image_url: body.dark_theme_image_url ?? null,
        dark_theme_image_path: body.dark_theme_image_path ?? null,
        sort_order: body.sort_order ?? 100,
        is_active: body.is_active ?? true,
        selection_type: body.selection_type ?? "MULTI",
      })
      .eq("id", id)
      .select()
      .maybeSingle();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update mood category";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await authorizeAdmin(request);
    if (auth.error) return auth.error;
    const { id } = await params;
    const { error } = await supabaseAdmin.from(TABLE).delete().eq("id", id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to delete mood category";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
