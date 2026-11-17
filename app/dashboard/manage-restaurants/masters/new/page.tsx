"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { showToast } from "@/hooks/useToast";
import {
  ensureMaster,
  fetchMasterBranches,
  findMasterByEmail,
  loginRoleForEmail,
  searchRestaurantsToAttach,
  setRestaurantMaster,
  type AccessUser,
  type BranchRow,
} from "@/lib/restaurantAccess";

const inputClass = "border border-gray-300 focus:border-gray-400 focus:ring-0 bg-white";

type Candidate = BranchRow & { owner_user_id: string | null };

export default function NewMasterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [checkedEmail, setCheckedEmail] = useState("");
  const [existing, setExisting] = useState<AccessUser | null>(null);
  const [existingBranches, setExistingBranches] = useState<BranchRow[]>([]);
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Candidate[]>([]);
  const [selected, setSelected] = useState<Candidate[]>([]);
  const [busy, setBusy] = useState(false);

  const normalized = email.trim().toLowerCase();
  const checked = normalized !== "" && normalized === checkedEmail;

  const checkEmail = async () => {
    if (!normalized) return;
    setBusy(true);
    try {
      const role = await loginRoleForEmail(normalized);
      if (role) {
        const master = await findMasterByEmail(normalized);
        setExisting(master);
        setExistingBranches(await fetchMasterBranches(master.id));
      } else {
        setExisting(null);
        setExistingBranches([]);
      }
      setCheckedEmail(normalized);
    } catch (error: unknown) {
      setCheckedEmail("");
      showToast({ type: "error", title: "Can't use this email", description: error instanceof Error ? error.message : "" });
    } finally {
      setBusy(false);
    }
  };

  const search = async () => {
    try {
      const rows = await searchRestaurantsToAttach(query, existing?.id);
      setResults(rows.filter((r) => !selected.some((s) => s.id === r.id)));
    } catch (error: unknown) {
      showToast({ type: "error", title: "Search failed", description: error instanceof Error ? error.message : "" });
    }
  };

  const pick = (row: Candidate) => {
    setSelected((prev) => [...prev, row]);
    setResults((prev) => prev.filter((r) => r.id !== row.id));
  };

  const save = async () => {
    if (!checked) {
      showToast({ type: "error", title: "Check the master email first" });
      return;
    }
    if (!existing && (!name.trim() || password.length < 8)) {
      showToast({ type: "error", title: "A new master needs a name and an 8+ character password" });
      return;
    }
    if (existing && selected.length === 0) {
      showToast({ type: "error", title: "Select at least one restaurant to add as a branch" });
      return;
    }
    const taken = selected.filter((r) => r.owner_user_id && r.owner_user_id !== existing?.id);
    if (taken.length && !window.confirm(`${taken.map((r) => r.name).join(", ")} already belong to another master. Move them to ${normalized}?`)) {
      return;
    }
    setBusy(true);
    try {
      const master = await ensureMaster({ full_name: name.trim(), email: normalized, password });
      for (const row of selected) {
        await setRestaurantMaster(row.id, master.id);
      }
      showToast({
        type: "success",
        title: master.existing ? "Branches added to the existing master" : "Master created",
        description: `${selected.length} branch${selected.length === 1 ? "" : "es"} linked.`,
      });
      const first = selected[0]?.id || existingBranches[0]?.id;
      router.push(
        first
          ? `/dashboard/manage-restaurants/${first}`
          : `/dashboard/manage-restaurants/add?master=${encodeURIComponent(normalized)}`,
      );
    } catch (error: unknown) {
      showToast({ type: "error", title: "Could not save", description: error instanceof Error ? error.message : "" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-8 pb-16 pt-2">
      <div className="flex items-center gap-2">
        <Link href="/dashboard/manage-restaurants" className="rounded-md p-1 hover:bg-gray-100">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-semibold">Add master &amp; branches</h1>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-medium uppercase text-muted-foreground">Master login</h2>
        <p className="text-xs text-muted-foreground">
          The master (brand owner) sees and manages every branch from one partner login. If the email already has a
          master login, it is reused.
        </p>
        <div className="flex gap-2">
          <Input
            className={inputClass}
            type="email"
            autoComplete="off"
            placeholder="Master login email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void checkEmail();
              }
            }}
          />
          <Button type="button" variant="outline" disabled={busy || !normalized} onClick={checkEmail}>
            Check
          </Button>
        </div>

        {checked && existing && (
          <div className="rounded-md border p-3 text-sm">
            <p>
              Existing master: <span className="font-medium">{existing.full_name || "Unnamed"}</span>{" "}
              <span className="text-muted-foreground">{existing.email}</span>
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {existingBranches.length
                ? `Current branches: ${existingBranches.map((b) => b.name).join(", ")}`
                : "No branches yet."}
            </p>
          </div>
        )}

        {checked && !existing && (
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            <Input className={inputClass} placeholder="Master name" value={name} onChange={(e) => setName(e.target.value)} />
            <Input
              className={inputClass}
              type="password"
              autoComplete="new-password"
              placeholder="Password (min 8)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium uppercase text-muted-foreground">Branches</h2>
        <div className="flex gap-2">
          <Input
            className={inputClass}
            placeholder="Search restaurants by name"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void search();
              }
            }}
          />
          <Button type="button" variant="outline" disabled={query.trim().length < 2} onClick={search}>
            Search
          </Button>
        </div>

        {results.length > 0 && (
          <ul className="divide-y rounded-md border">
            {results.map((r) => (
              <li key={r.id} className="flex items-center justify-between px-3 py-2 text-sm">
                <span>
                  {r.name}
                  <span className="text-muted-foreground">{r.area || r.city ? ` · ${r.area || r.city}` : ""}</span>
                  {r.owner_user_id && <span className="ml-2 text-xs text-amber-700">has another master</span>}
                </span>
                <Button type="button" size="sm" variant="outline" onClick={() => pick(r)}>
                  Select
                </Button>
              </li>
            ))}
          </ul>
        )}

        {selected.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {selected.map((r) => (
              <span key={r.id} className="inline-flex items-center gap-1 rounded-full border bg-gray-50 px-3 py-1 text-sm">
                {r.name}
                <button
                  type="button"
                  aria-label={`Remove ${r.name}`}
                  className="rounded-full p-0.5 hover:bg-gray-200"
                  onClick={() => setSelected((prev) => prev.filter((s) => s.id !== r.id))}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </span>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">No branches selected yet.</p>
        )}

        <p className="text-xs text-muted-foreground">
          Restaurant not listed yet?{" "}
          <Link
            className="underline"
            href={checked ? `/dashboard/manage-restaurants/add?master=${encodeURIComponent(normalized)}` : "/dashboard/manage-restaurants/add"}
          >
            Add it as a new restaurant
          </Link>{" "}
          {checked && existing ? "under this master." : "(save the master first to add it straight under them)."}
        </p>
      </section>

      <div className="flex justify-end">
        <Button type="button" disabled={busy || !checked} onClick={save}>
          {busy ? "Saving..." : existing ? "Add selected branches" : "Create master"}
        </Button>
      </div>
    </div>
  );
}
