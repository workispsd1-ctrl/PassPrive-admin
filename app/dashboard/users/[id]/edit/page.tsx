"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { supabaseBrowser } from "@/lib/supabaseBrowser";

import EditUserForm from "./EditUserForm";

type User = {
  id: string;
  created_at: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  role: string | null;
  profile_image: string | null;
  gender: string | null;
  dob: string | null;
  default_address: string | null;
  default_lat: number | null;
  default_lng: number | null;
  app_version: string | null;
  device_type: string | null;
  device_model: string | null;
  device_os: string | null;
  last_opened: string | null;
  last_login: string | null;
  fcm_token: string | null;
  notifications_enabled: boolean | null;
  referral_code: string | null;
  referred_by: string | null;
  referral_bonus: number | null;
  kyc_verified: boolean | null;
  kyc_doc_url: string | null;
  business_name: string | null;
  business_address: string | null;
  gst_number: string | null;
  otp_code: string | null;
  otp_expires_at: string | null;
  failed_login_attempts: number | null;
  account_locked_until: string | null;
  veg_mode: boolean | null;
  membership: string | null;
  membership_tier: string | null;
  membership_started: string | null;
  membership_expiry: string | null;
  promo_code_used: string | null;
  corporate_code: string | null;
  corporate_code_status: string | null;
};

export default function EditUserPage() {
  const params = useParams<{ id: string }>();
  const userId = typeof params?.id === "string" ? params.id : "";

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      if (!userId) {
        setError("Missing user id");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      const { data, error } = await supabaseBrowser
        .from("users")
        .select("*")
        .eq("id", userId)
        .single();

      if (error || !data) {
        setError(error?.message || "User not found");
        setUser(null);
        setLoading(false);
        return;
      }

      setUser(data as User);
      setLoading(false);
    };

    fetchUser();
  }, [userId]);

  return (
    <div className="mx-auto py-2">
      <div className="flex items-center gap-2 mb-6">
        <Link href="/dashboard/users">
          <ArrowLeft
            size={20}
            className="text-gray-500 hover:text-blue-600 cursor-pointer"
          />
        </Link>
      </div>

      {loading ? (
        <div className="rounded-lg border border-gray-200 bg-white p-6 text-sm text-gray-600">
          Loading user details...
        </div>
      ) : error ? (
        <div className="rounded-lg border border-red-200 bg-white p-6 text-sm text-red-600">
          {error}
        </div>
      ) : user ? (
        <EditUserForm user={user} />
      ) : null}
    </div>
  );
}
