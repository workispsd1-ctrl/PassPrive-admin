"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import Link from "next/link";

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

export default function EditUserForm({ user }: { user: User }) {
  const router = useRouter();
  const clean = (v: any) => (v === null || v === undefined ? "" : v);

  const [formData, setFormData] = useState<User>({
    ...user,
    full_name: clean(user.full_name),
    phone: clean(user.phone),
    gender: clean(user.gender),
    dob: clean(user.dob),
    default_address: clean(user.default_address),
    business_name: clean(user.business_name),
    business_address: clean(user.business_address),
    gst_number: clean(user.gst_number),
    promo_code_used: clean(user.promo_code_used),
    corporate_code: clean(user.corporate_code),
    corporate_code_status: clean(user.corporate_code_status),
    membership: clean(user.membership),
    membership_tier: clean(user.membership_tier),
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const toDT = (iso?: string | null) =>
      iso ? new Date(iso).toISOString().slice(0, 16) : "";
    const toDate = (iso?: string | null) =>
      iso ? new Date(iso).toISOString().slice(0, 10) : "";

    setFormData((prev) => ({
      ...prev,
      dob: toDate(user.dob),
      last_opened: toDT(user.last_opened),
      last_login: toDT(user.last_login),
      membership_started: toDT(user.membership_started),
      membership_expiry: toDT(user.membership_expiry),
      otp_expires_at: toDT(user.otp_expires_at),
      account_locked_until: toDT(user.account_locked_until),
    }));
  }, [user]);

  const handleChange = (e: any) => {
    const { name, value } = e.target;
    setFormData((p) => ({ ...p, [name]: value }));
  };

  const handleCheckbox = (field: keyof User) => {
    setFormData((p) => ({ ...p, [field]: !(p[field] as boolean) }));
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setLoading(true);

    const iso = (v: string | null) =>
      !v ? null : new Date(v).toISOString();

    const payload = {
      ...formData,
      dob: iso(formData.dob),
      last_opened: iso(formData.last_opened),
      last_login: iso(formData.last_login),
      membership_started: iso(formData.membership_started),
      membership_expiry: iso(formData.membership_expiry),
      otp_expires_at: iso(formData.otp_expires_at),
      account_locked_until: iso(formData.account_locked_until),
    };

    const { error } = await supabaseBrowser
      .from("users")
      .update(payload)
      .eq("id", user.id);

    setLoading(false);

    if (error) return alert(error.message);

    router.push("/dashboard/users");
    router.refresh();
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white p-4 grid grid-cols-2 gap-4"
    >
      {/* BASIC */}
      <InputField label="Full Name" name="full_name" value={formData.full_name} onChange={handleChange} />
      <InputField label="Email" name="email" value={formData.email ?? ""} onChange={handleChange} />
      <InputField label="Phone" name="phone" value={formData.phone ?? ""} onChange={handleChange} />
      <InputField label="Role" name="role" value={formData.role ?? ""} onChange={handleChange} />

      {/* PROFILE */}
      <InputField label="Profile Image URL" name="profile_image" value={formData.profile_image ?? ""} onChange={handleChange} />

      {/* PERSONAL */}
      <InputField label="Gender" name="gender" value={formData.gender ?? ""} onChange={handleChange} />
      <InputField type="date" label="Date of Birth" name="dob" value={formData.dob ?? ""} onChange={handleChange} />

      {/* ADDRESS */}
      <InputField label="Default Address" name="default_address" value={formData.default_address ?? ""} onChange={handleChange} />
      <InputField type="number" label="Latitude" name="default_lat" value={formData.default_lat ?? ""} onChange={handleChange} />
      <InputField type="number" label="Longitude" name="default_lng" value={formData.default_lng ?? ""} onChange={handleChange} />

      {/* DEVICE */}
      <InputField label="App Version" name="app_version" value={formData.app_version ?? ""} onChange={handleChange} />
      <InputField label="Device Type" name="device_type" value={formData.device_type ?? ""} onChange={handleChange} />
      <InputField label="Device Model" name="device_model" value={formData.device_model ?? ""} onChange={handleChange} />
      <InputField label="Device OS" name="device_os" value={formData.device_os ?? ""} onChange={handleChange} />

      {/* DATES */}
      <InputField type="datetime-local" label="Last Opened" name="last_opened" value={formData.last_opened ?? ""} onChange={handleChange} />
      <InputField type="datetime-local" label="Last Login" name="last_login" value={formData.last_login ?? ""} onChange={handleChange} />

      {/* NOTIFICATIONS */}
      <SwitchField label="Notifications Enabled" checked={formData.notifications_enabled ?? false} onChange={() => handleCheckbox("notifications_enabled")} />
      <InputField label="FCM Token" name="fcm_token" value={formData.fcm_token ?? ""} onChange={handleChange} />

      {/* REFERRALS */}
      <InputField label="Referral Code" name="referral_code" value={formData.referral_code ?? ""} onChange={handleChange} />
      <InputField label="Referred By" name="referred_by" value={formData.referred_by ?? ""} onChange={handleChange} />
      <InputField type="number" label="Referral Bonus" name="referral_bonus" value={formData.referral_bonus ?? ""} onChange={handleChange} />

      {/* KYC */}
      <SwitchField label="KYC Verified" checked={formData.kyc_verified ?? false} onChange={() => handleCheckbox("kyc_verified")} />
      <InputField label="KYC Document URL" name="kyc_doc_url" value={formData.kyc_doc_url ?? ""} onChange={handleChange} />

      {/* BUSINESS */}
      <InputField label="Business Name" name="business_name" value={formData.business_name ?? ""} onChange={handleChange} />
      <InputField label="Business Address" name="business_address" value={formData.business_address ?? ""} onChange={handleChange} />
      <InputField label="GST Number" name="gst_number" value={formData.gst_number ?? ""} onChange={handleChange} />

      {/* OTP */}
      <InputField label="OTP Code" name="otp_code" value={formData.otp_code ?? ""} onChange={handleChange} />
      <InputField type="datetime-local" label="OTP Expires At" name="otp_expires_at" value={formData.otp_expires_at ?? ""} onChange={handleChange} />
      <InputField type="number" label="Failed Login Attempts" name="failed_login_attempts" value={formData.failed_login_attempts ?? ""} onChange={handleChange} />
      <InputField type="datetime-local" label="Account Locked Until" name="account_locked_until" value={formData.account_locked_until ?? ""} onChange={handleChange} />

      {/* VEG MODE */}
      <SwitchField label="Veg Mode" checked={formData.veg_mode ?? false} onChange={() => handleCheckbox("veg_mode")} />

      {/* MEMBERSHIP */}
      <InputField label="Membership" name="membership" value={formData.membership ?? ""} onChange={handleChange} />
      <InputField label="Membership Tier" name="membership_tier" value={formData.membership_tier ?? ""} onChange={handleChange} />
      <InputField type="datetime-local" label="Membership Started" name="membership_started" value={formData.membership_started ?? ""} onChange={handleChange} />
      <InputField type="datetime-local" label="Membership Expiry" name="membership_expiry" value={formData.membership_expiry ?? ""} onChange={handleChange} />

      {/* PROMO + CORPORATE */}
      <InputField label="Promo Code Used" name="promo_code_used" value={formData.promo_code_used ?? ""} onChange={handleChange} />
      <InputField label="Corporate Code" name="corporate_code" value={formData.corporate_code ?? ""} onChange={handleChange} />
      <InputField label="Corporate Code Status" name="corporate_code_status" value={formData.corporate_code_status ?? ""} onChange={handleChange} />

      {/* FOOTER BUTTONS */}
      <div className="col-span-2 flex gap-4 mt-4">
        <Link
          href={`/dashboard/users/${user.id}`}
          className="w-48 py-2 px-3 rounded-lg text-white bg-indigo-800"
        >
          Previous Subscriptions
        </Link>

        <button
          type="submit"
          disabled={loading}
          className="w-48 bg-indigo-800 text-white py-2 px-3 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
        >
          {loading ? "Updating..." : "Update User"}
        </button>
      </div>
    </form>
  );
}

/* ---- Helper Components (Same UI) ---- */

function InputField({ label, name, value, onChange, type = "text" }: any) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700">
        {label}
      </label>
      <Input
        type={type}
        name={name}
        value={value ?? ""}
        onChange={onChange}
        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-800 focus:ring-indigo-800 sm:text-sm"
      />
    </div>
  );
}

function SwitchField({ label, checked, onChange }: any) {
  return (
    <div className="flex items-center gap-2">
      <Switch checked={checked} onCheckedChange={onChange} />
      <label className="text-sm font-semibold text-gray-700">{label}</label>
    </div>
  );
}
