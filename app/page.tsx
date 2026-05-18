"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import Loader from '@/app/(auth)/callback/loading'

export default function Index() {
  const router = useRouter();

  useEffect(() => {
    const checkUser = async () => {
      const { data } = await supabaseBrowser.auth.getUser();

      if (data.user) {
        router.replace("/dashboard");
      } else {
        router.replace("/sign-in");
      }
    };

    checkUser();
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#eef0fb] px-4 py-8">
      <Loader />
    </div>
  );
}
