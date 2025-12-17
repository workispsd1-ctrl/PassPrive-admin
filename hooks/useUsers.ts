// hooks/useUsers.ts
import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

export function useUsers() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUsers = async () => {
      const { data, error } = await supabaseBrowser
        .from("users")
        .select("*")
        .order("updated_at", { ascending: false });

      if (error) {
        console.error("Failed to fetch users:", error);
        setError(error.message);
      } else {
        setUsers(data || []);
      }

      setLoading(false);
    };

    fetchUsers();
  }, []);

  return { users, loading, error };
}
