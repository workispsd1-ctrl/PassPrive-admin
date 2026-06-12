import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { authorizeAdmin } from "@/app/api/support-admin/_lib";

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from("service_categories")
      .select("id,key,slug,title,light_theme_image_url,light_theme_image_path,dark_theme_image_url,dark_theme_image_path,updated_at")
      .order("title", { ascending: true });
    if (error) throw error;
    return NextResponse.json(data || []);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load service categories";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await authorizeAdmin(request);
    if (auth.error) return auth.error;

    const body = await request.json();
    const hasLightImage = Boolean(String(body.light_theme_image_url || "").trim());
    const hasDarkImage = Boolean(String(body.dark_theme_image_url || "").trim());

    if (!hasLightImage && !hasDarkImage) {
      return NextResponse.json(
        { error: "At least one image is required to create a service category" },
        { status: 400 }
      );
    }

    const record = {
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
    };

    const { data, error } = await supabaseAdmin.from("service_categories").insert(record).select().maybeSingle();
    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create service category";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
