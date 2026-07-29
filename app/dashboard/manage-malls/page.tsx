"use client";

import { useRouter } from "next/navigation";
import { Plus, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import MallList from "./_components/MallList";

export default function ManageMallsPage() {
  const router = useRouter();
  return (
    <div className="p-4 md:p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Building2 className="h-6 w-6 text-gray-700" />
          <h1 className="text-xl font-semibold text-gray-900">Malls</h1>
        </div>
        <Button onClick={() => router.push("/dashboard/manage-malls/add")} className="gap-2">
          <Plus className="h-4 w-4" /> Add Mall
        </Button>
      </div>
      <MallList />
    </div>
  );
}
