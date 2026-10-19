import { supabaseBrowser } from "@/lib/supabaseBrowser";

const API_BASE =
  process.env.NEXT_PUBLIC_BACKEND_URL?.replace(/\/$/, "") ||
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ||
  "http://localhost:8000";

export type AccessUser = { id: string; full_name: string | null; email: string | null };
export type BranchRow = { id: string; name: string; area: string | null; city: string | null; is_active: boolean };
export type RestaurantAccess = {
  master: AccessUser | null;
  branches: BranchRow[];
  branchAdmins: AccessUser[];
};

async function accessToken() {
  const { data } = await supabaseBrowser.auth.getSession();
  const token = data?.session?.access_token;
  if (!token) throw new Error("Please sign in again.");
  return token;
}

export async function createLogin(input: { email: string; password: string; full_name: string; role: string; phone?: string }) {
  const res = await fetch(`${API_BASE}/api/auth/create-user`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${await accessToken()}` },
    body: JSON.stringify(input),
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) throw new Error(json?.error || "Failed to create the login.");
  return json.user as { id: string; email: string; role: string };
}

export async function findMasterByEmail(email: string): Promise<AccessUser> {
  const { data, error } = await supabaseBrowser
    .from("users")
    .select("id, full_name, email, role")
    .ilike("email", email.trim().replace(/[\\%_]/g, (c) => `\\${c}`))
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("No account found with that email.");
  if (String(data.role || "").toLowerCase() !== "restaurantpartner") {
    throw new Error("That account is not a restaurant master (restaurantpartner) login.");
  }
  return { id: data.id, full_name: data.full_name, email: data.email };
}

export async function fetchRestaurantAccess(restaurantId: string): Promise<RestaurantAccess> {
  const { data: restaurant, error } = await supabaseBrowser
    .from("restaurants")
    .select("owner_user_id")
    .eq("id", restaurantId)
    .maybeSingle();
  if (error) throw error;
  const ownerId = restaurant?.owner_user_id as string | null;

  const [masterRes, branchesRes, staffRes] = await Promise.all([
    ownerId
      ? supabaseBrowser.from("users").select("id, full_name, email").eq("id", ownerId).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    ownerId
      ? supabaseBrowser
          .from("restaurants")
          .select("id, name, area, city, is_active")
          .eq("owner_user_id", ownerId)
          .order("created_at", { ascending: true })
      : Promise.resolve({ data: [], error: null }),
    supabaseBrowser
      .from("restaurant_staff")
      .select("user_id")
      .eq("restaurant_id", restaurantId)
      .eq("role", "restaurant_admin"),
  ]);
  for (const r of [masterRes, branchesRes, staffRes]) if (r.error) throw r.error;

  // restaurant_staff.user_id references auth.users, so PostgREST can't embed public.users; look them up separately.
  const adminIds = (staffRes.data || []).map((row: { user_id: string }) => row.user_id);
  let branchAdmins: AccessUser[] = [];
  if (adminIds.length) {
    const { data, error: usersError } = await supabaseBrowser
      .from("users")
      .select("id, full_name, email")
      .in("id", adminIds);
    if (usersError) throw usersError;
    branchAdmins = (data as AccessUser[]) || [];
  }

  return {
    master: (masterRes.data as AccessUser | null) ?? null,
    branches: (branchesRes.data as BranchRow[]) || [],
    branchAdmins,
  };
}

export async function setRestaurantMaster(restaurantId: string, masterId: string) {
  const { error } = await supabaseBrowser.from("restaurants").update({ owner_user_id: masterId }).eq("id", restaurantId);
  if (error) throw error;
}

export async function addBranchAdmin(
  restaurantId: string,
  input: { full_name: string; email: string; password: string; phone?: string },
) {
  const user = await createLogin({ ...input, email: input.email.trim().toLowerCase(), role: "restaurant_admin" });
  const { error } = await supabaseBrowser
    .from("restaurant_staff")
    .insert({ restaurant_id: restaurantId, user_id: user.id, role: "restaurant_admin" });
  if (error) throw error;
  return user;
}

export async function removeBranchAdmin(restaurantId: string, userId: string) {
  const { error } = await supabaseBrowser
    .from("restaurant_staff")
    .delete()
    .eq("restaurant_id", restaurantId)
    .eq("user_id", userId)
    .eq("role", "restaurant_admin");
  if (error) throw error;
}
