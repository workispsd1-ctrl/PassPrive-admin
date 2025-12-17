"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useSelector } from "react-redux";
import { useAppDispatch } from "./hook";
import { verifyUser } from "@/store/features/admin/adminSlice";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

interface RootState {
  admin: {
    status: "idle" | "loading" | "succeeded" | "failed";
    isAdmin: boolean;
  };
}

export function useAuth() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const pathname = usePathname(); // ← Get current path
  const { status, isAdmin } = useSelector((s: RootState) => s.admin);

  // Get new token and dispatch verifyUser only once
  useEffect(() => {
    (async () => {
      const { data } = await supabaseBrowser.auth.getSession();
      const token = data.session?.access_token;
      await dispatch(verifyUser(token));
    })();
  }, [dispatch]);

  // Conditional redirect based on current path
  useEffect(() => {
    if (status === "loading") return;

    const onSignInPage = pathname === "/sign-in";
    const onDashboard = pathname.startsWith("/dashboard");

    if (status === "succeeded") {
      if (isAdmin && !onDashboard) {
        router.replace("/dashboard");
      } else if (!isAdmin && onSignInPage) {
        router.replace("/");
      }
    } else if (status === "failed" && !onSignInPage) {
      router.replace("/sign-in");
    }
  }, [status, isAdmin, pathname, router]);

  return {
    isLoading: status === "loading",
    isAuthenticated: status === "succeeded",
    isAdmin,
  };
}
