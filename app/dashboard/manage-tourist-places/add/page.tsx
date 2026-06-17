"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Upload, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { showToast } from "@/hooks/useToast";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

const inputClass = "border border-gray-300 focus:border-gray-400 focus:ring-0 rounded-xl";

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

async function buildUniqueSlug(baseValue: string) {
  const normalizedBase = slugify(baseValue) || `tourist-${Date.now()}`;
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const candidate = attempt === 0 ? normalizedBase : `${normalizedBase}-${attempt + 1}`;
    const { data, error } = await supabaseBrowser
      .from("tourist_places")
      .select("id")
      .eq("slug", candidate)
      .maybeSingle();

    if (error) throw error;
    if (!data) return candidate;
  }
  return `${normalizedBase}-${Date.now()}`;
}

export default function AddTouristPlacePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);

  const [openingHours, setOpeningHours] = useState([
    { day_of_week: 1, name: "Monday", open_time: "09:00", close_time: "17:00", is_closed: false },
    { day_of_week: 2, name: "Tuesday", open_time: "09:00", close_time: "17:00", is_closed: false },
    { day_of_week: 3, name: "Wednesday", open_time: "09:00", close_time: "17:00", is_closed: false },
    { day_of_week: 4, name: "Thursday", open_time: "09:00", close_time: "17:00", is_closed: false },
    { day_of_week: 5, name: "Friday", open_time: "09:00", close_time: "17:00", is_closed: false },
    { day_of_week: 6, name: "Saturday", open_time: "09:00", close_time: "17:00", is_closed: false },
    { day_of_week: 0, name: "Sunday", open_time: "09:00", close_time: "17:00", is_closed: true },
  ]);

  const [form, setForm] = useState({
    place_name: "",
    slug: "",
    description: "",
    phone: "",
    country: "Mauritius",
    location_name: "",
    city: "",
    area: "",
    full_address: "",
    latitude: "",
    longitude: "",
    payment_option: "free",
    price: "0.00",
    rating: "5.0",
    reviews_count: "0",
    is_active: true,
    booking_enabled: true,
    advance_booking_days: "30",
    modification_available: false,
    modification_cutoff_minutes: "",
    cancellation_available: false,
    cancellation_cutoff_minutes: "",
    is_advertised: false,
    ad_priority: "",
    ad_badge_text: "",
    ad_starts_at: "",
    ad_ends_at: "",
    booking_terms: "",
  });

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    setForm(prev => ({
      ...prev,
      place_name: name,
      slug: slugify(name),
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCoverFile(file);
      setCoverPreview(URL.createObjectURL(file));
    }
  };

  const removeCoverImage = () => {
    setCoverFile(null);
    setCoverPreview(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.place_name) {
      showToast({ type: "error", title: "Name is required" });
      return;
    }

    setLoading(true);
    try {
      // 1. Generate unique slug
      const finalSlug = await buildUniqueSlug(form.slug || form.place_name);

      // 2. Generate UUID for the record so we can use it for storage path
      const placeId = crypto.randomUUID();

      // 3. Upload cover image to Supabase Storage if selected
      let finalPictureId: string | null = null;
      if (coverFile) {
        const ext = coverFile.name.split(".").pop() || "jpg";
        const random = Math.random().toString(36).slice(2, 9);
        const path = `cover/${placeId}/${Date.now()}-${random}.${ext}`;

        const { error: uploadError } = await supabaseBrowser.storage
          .from("tourist-images")
          .upload(path, coverFile);

        if (uploadError) throw uploadError;
        finalPictureId = path;
      }

      // 4. Parse arrays and numbers
      const parsedPrice = parseFloat(form.price) || 0;
      const parsedRating = parseFloat(form.rating) || 5.0;
      const parsedReviewsCount = parseInt(form.reviews_count, 10) || 0;
      const parsedLat = form.latitude ? parseFloat(form.latitude) : null;
      const parsedLng = form.longitude ? parseFloat(form.longitude) : null;

      const parsedAdvBooking = parseInt(form.advance_booking_days, 10) || 30;
      const parsedModCutoff = form.modification_cutoff_minutes ? parseInt(form.modification_cutoff_minutes, 10) : null;
      const parsedCanCutoff = form.cancellation_cutoff_minutes ? parseInt(form.cancellation_cutoff_minutes, 10) : null;

      const parsedAdPriority = form.ad_priority ? parseInt(form.ad_priority, 10) : null;
      const parsedAdStarts = form.ad_starts_at ? new Date(form.ad_starts_at).toISOString() : null;
      const parsedAdEnds = form.ad_ends_at ? new Date(form.ad_ends_at).toISOString() : null;

      const parsedBookingTerms = form.booking_terms
        .split(/\r?\n/)
        .map(term => term.trim())
        .filter(Boolean);

      // 5. Insert record
      const { error: insertError } = await supabaseBrowser
        .from("tourist_places")
        .insert({
          id: placeId,
          place_name: form.place_name,
          slug: finalSlug,
          description: form.description || null,
          phone: form.phone || null,
          country: form.country,
          location_name: form.location_name || null,
          city: form.city || null,
          area: form.area || null,
          full_address: form.full_address || null,
          latitude: parsedLat,
          longitude: parsedLng,
          payment_option: form.payment_option,
          price: parsedPrice,
          rating: parsedRating,
          reviews_count: parsedReviewsCount,
          picture_id: finalPictureId,
          is_active: form.is_active,
          booking_enabled: form.booking_enabled,
          advance_booking_days: parsedAdvBooking,
          modification_available: form.modification_available,
          modification_cutoff_minutes: parsedModCutoff,
          cancellation_available: form.cancellation_available,
          cancellation_cutoff_minutes: parsedCanCutoff,
          is_advertised: form.is_advertised,
          ad_priority: parsedAdPriority,
          ad_badge_text: form.ad_badge_text || null,
          ad_starts_at: parsedAdStarts,
          ad_ends_at: parsedAdEnds,
          booking_terms: parsedBookingTerms,
        });

      if (insertError) throw insertError;

      // 6. Insert opening hours
      const openingHoursPayload = openingHours.map(oh => ({
        tourist_place_id: placeId,
        day_of_week: oh.day_of_week,
        open_time: oh.is_closed ? null : `${oh.open_time}:00`,
        close_time: oh.is_closed ? null : `${oh.close_time}:00`,
        is_closed: oh.is_closed,
      }));

      const { error: hoursInsertError } = await supabaseBrowser
        .from("tourist_place_opening_hours")
        .insert(openingHoursPayload);

      if (hoursInsertError) throw hoursInsertError;

      showToast({ type: "success", title: "Tourist Place Created Successfully" });
      router.push("/dashboard/manage-tourist-places");
    } catch (error: any) {
      showToast({
        type: "error",
        title: "Creation failed",
        description: error.message || "Failed to create tourist place.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full cursor-pointer">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#000]">Add Tourist Place</h1>
          <p className="text-sm text-gray-500">Create a new tourist destination card manually.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Section 1: Basic Info */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-6">
          <h2 className="text-lg font-semibold text-gray-900 border-b border-gray-100 pb-3">Basic Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2 col-span-2 md:col-span-1">
              <label className="text-sm font-semibold text-gray-700">Place Name *</label>
              <Input
                placeholder="E.g. Chamarel Seven Coloured Earth"
                value={form.place_name}
                onChange={handleNameChange}
                className={inputClass}
                required
              />
            </div>

            <div className="space-y-2 col-span-2 md:col-span-1">
              <label className="text-sm font-semibold text-gray-700">Custom URL Slug</label>
              <Input
                placeholder="e.g. chamarel-seven-coloured-earth"
                value={form.slug}
                onChange={(e) => setForm(prev => ({ ...prev, slug: slugify(e.target.value) }))}
                className={inputClass}
              />
            </div>

            <div className="space-y-2 col-span-2">
              <label className="text-sm font-semibold text-gray-700">Description</label>
              <Textarea
                placeholder="Write an engaging description about the tourist destination..."
                value={form.description}
                onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                className="min-h-[120px] rounded-xl border border-gray-300 focus:border-gray-400 focus:ring-0"
              />
            </div>

            <div className="space-y-2 col-span-2 md:col-span-1">
              <label className="text-sm font-semibold text-gray-700">Phone</label>
              <Input
                placeholder="E.g. +230 483 4200"
                value={form.phone}
                onChange={(e) => setForm(prev => ({ ...prev, phone: e.target.value }))}
                className={inputClass}
              />
            </div>

            <div className="space-y-2 col-span-2 md:col-span-1">
              <label className="text-sm font-semibold text-gray-700">Country</label>
              <Input
                placeholder="Mauritius"
                value={form.country}
                onChange={(e) => setForm(prev => ({ ...prev, country: e.target.value }))}
                className={inputClass}
              />
            </div>
          </div>
        </div>

        {/* Section 2: Location Details */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-6">
          <h2 className="text-lg font-semibold text-gray-900 border-b border-gray-100 pb-3">Location Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2 col-span-2">
              <label className="text-sm font-semibold text-gray-700">Display Location Name</label>
              <Input
                placeholder="E.g. Chamarel, Black River, Mauritius"
                value={form.location_name}
                onChange={(e) => setForm(prev => ({ ...prev, location_name: e.target.value }))}
                className={inputClass}
              />
            </div>

            <div className="space-y-2 col-span-2 md:col-span-1">
              <label className="text-sm font-semibold text-gray-700">City</label>
              <Input
                placeholder="E.g. Black River"
                value={form.city}
                onChange={(e) => setForm(prev => ({ ...prev, city: e.target.value }))}
                className={inputClass}
              />
            </div>

            <div className="space-y-2 col-span-2 md:col-span-1">
              <label className="text-sm font-semibold text-gray-700">Area</label>
              <Input
                placeholder="E.g. Chamarel"
                value={form.area}
                onChange={(e) => setForm(prev => ({ ...prev, area: e.target.value }))}
                className={inputClass}
              />
            </div>

            <div className="space-y-2 col-span-2">
              <label className="text-sm font-semibold text-gray-700">Full Address</label>
              <Textarea
                placeholder="E.g. Chamarel Road, Chamarel, Mauritius"
                value={form.full_address}
                onChange={(e) => setForm(prev => ({ ...prev, full_address: e.target.value }))}
                className="min-h-[80px] rounded-xl border border-gray-300 focus:border-gray-400 focus:ring-0"
              />
            </div>

            <div className="space-y-2 col-span-2 md:col-span-1">
              <label className="text-sm font-semibold text-gray-700">Latitude</label>
              <Input
                type="number"
                step="0.000001"
                placeholder="E.g. -20.4402"
                value={form.latitude}
                onChange={(e) => setForm(prev => ({ ...prev, latitude: e.target.value }))}
                className={inputClass}
              />
            </div>

            <div className="space-y-2 col-span-2 md:col-span-1">
              <label className="text-sm font-semibold text-gray-700">Longitude</label>
              <Input
                type="number"
                step="0.000001"
                placeholder="E.g. 57.3776"
                value={form.longitude}
                onChange={(e) => setForm(prev => ({ ...prev, longitude: e.target.value }))}
                className={inputClass}
              />
            </div>
          </div>
        </div>

        {/* Section: Opening Hours */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-6">
          <h2 className="text-lg font-semibold text-gray-900 border-b border-gray-100 pb-3">Opening Hours</h2>
          <div className="space-y-4">
            {openingHours.map((oh, index) => (
              <div key={oh.day_of_week} className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-3 rounded-xl border border-gray-100 hover:bg-gray-50/50 transition">
                <span className="font-semibold text-gray-700 w-28">{oh.name}</span>
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">Closed</span>
                    <Switch
                      checked={oh.is_closed}
                      onCheckedChange={(checked) => {
                        setOpeningHours(prev =>
                          prev.map((item, idx) =>
                            idx === index ? { ...item, is_closed: checked } : item
                          )
                        );
                      }}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">Open</span>
                    <input
                      type="time"
                      value={oh.open_time}
                      onChange={(e) => {
                        setOpeningHours(prev =>
                          prev.map((item, idx) =>
                            idx === index ? { ...item, open_time: e.target.value } : item
                          )
                        );
                      }}
                      disabled={oh.is_closed}
                      className="border border-gray-300 focus:border-gray-400 focus:ring-0 rounded-lg px-2 py-1 text-sm disabled:opacity-50 disabled:bg-gray-100"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">Close</span>
                    <input
                      type="time"
                      value={oh.close_time}
                      onChange={(e) => {
                        setOpeningHours(prev =>
                          prev.map((item, idx) =>
                            idx === index ? { ...item, close_time: e.target.value } : item
                          )
                        );
                      }}
                      disabled={oh.is_closed}
                      className="border border-gray-300 focus:border-gray-400 focus:ring-0 rounded-lg px-2 py-1 text-sm disabled:opacity-50 disabled:bg-gray-100"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Section 3: Pricing & Booking */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-6">
          <h2 className="text-lg font-semibold text-gray-900 border-b border-gray-100 pb-3">Pricing & Booking Preferences</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2 col-span-2 md:col-span-1">
              <label className="text-sm font-semibold text-gray-700">Payment Option</label>
              <select
                value={form.payment_option}
                onChange={(e) => setForm(prev => ({ ...prev, payment_option: e.target.value }))}
                className="w-full h-10 border border-gray-300 focus:border-gray-400 focus:ring-0 rounded-xl px-3 text-sm bg-white cursor-pointer"
              >
                <option value="free">Free Entry</option>
                <option value="ips">IPS</option>
                <option value="card">Credit Card/Debit Card</option>
                <option value="mopay">Mopay</option>
                <option value="mopay_place">Mopay Place</option>
              </select>
            </div>

            <div className="space-y-2 col-span-2 md:col-span-1">
              <label className="text-sm font-semibold text-gray-700">Price ($)</label>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={form.price}
                onChange={(e) => setForm(prev => ({ ...prev, price: e.target.value }))}
                className={inputClass}
                disabled={form.payment_option === "free"}
              />
            </div>

            <div className="flex items-center justify-between col-span-2 border-t border-gray-50 pt-4">
              <div>
                <span className="text-sm font-semibold text-gray-900 block">Booking Enabled</span>
                <span className="text-xs text-gray-500">Allow users to register visits or book tickets.</span>
              </div>
              <Switch
                checked={form.booking_enabled}
                onCheckedChange={(checked) => setForm(prev => ({ ...prev, booking_enabled: checked }))}
              />
            </div>

            <div className="space-y-2 col-span-2 md:col-span-1">
              <label className="text-sm font-semibold text-gray-700">Advance Booking Days</label>
              <Input
                type="number"
                placeholder="30"
                value={form.advance_booking_days}
                onChange={(e) => setForm(prev => ({ ...prev, advance_booking_days: e.target.value }))}
                className={inputClass}
                disabled={!form.booking_enabled}
              />
            </div>

            <div className="col-span-2 border-t border-gray-50 pt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Modification Preferences */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-semibold text-gray-900 block">Modification Available</span>
                    <span className="text-xs text-gray-500">Allows customer to modify their booking.</span>
                  </div>
                  <Switch
                    checked={form.modification_available}
                    onCheckedChange={(checked) => setForm(prev => ({ ...prev, modification_available: checked }))}
                  />
                </div>
                {form.modification_available && (
                  <div className="space-y-2">
                    <label className="text-sm text-gray-700">Modification Cutoff Minutes</label>
                    <Input
                      type="number"
                      placeholder="E.g. 1440 (24 hours)"
                      value={form.modification_cutoff_minutes}
                      onChange={(e) => setForm(prev => ({ ...prev, modification_cutoff_minutes: e.target.value }))}
                      className={inputClass}
                    />
                  </div>
                )}
              </div>

              {/* Cancellation Preferences */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-semibold text-gray-900 block">Cancellation Available</span>
                    <span className="text-xs text-gray-500">Allows customer to cancel booking.</span>
                  </div>
                  <Switch
                    checked={form.cancellation_available}
                    onCheckedChange={(checked) => setForm(prev => ({ ...prev, cancellation_available: checked }))}
                  />
                </div>
                {form.cancellation_available && (
                  <div className="space-y-2">
                    <label className="text-sm text-gray-700">Cancellation Cutoff Minutes</label>
                    <Input
                      type="number"
                      placeholder="E.g. 1440 (24 hours)"
                      value={form.cancellation_cutoff_minutes}
                      onChange={(e) => setForm(prev => ({ ...prev, cancellation_cutoff_minutes: e.target.value }))}
                      className={inputClass}
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2 col-span-2 border-t border-gray-50 pt-4">
              <label className="text-sm font-semibold text-gray-700">Booking Terms & Conditions (One per line)</label>
              <Textarea
                placeholder="Enter booking requirements or terms..."
                value={form.booking_terms}
                onChange={(e) => setForm(prev => ({ ...prev, booking_terms: e.target.value }))}
                className="min-h-[80px] rounded-xl border border-gray-300 focus:border-gray-400 focus:ring-0"
              />
            </div>
          </div>
        </div>

        {/* Section 4: Metrics */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-6">
          <h2 className="text-lg font-semibold text-gray-900 border-b border-gray-100 pb-3">Metrics & Ratings</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2 col-span-2 md:col-span-1">
              <label className="text-sm font-semibold text-gray-700">Initial Rating (0.0 - 5.0)</label>
              <Input
                type="number"
                step="0.1"
                min="0"
                max="5"
                placeholder="5.0"
                value={form.rating}
                onChange={(e) => setForm(prev => ({ ...prev, rating: e.target.value }))}
                className={inputClass}
              />
            </div>

            <div className="space-y-2 col-span-2 md:col-span-1">
              <label className="text-sm font-semibold text-gray-700">Reviews Count</label>
              <Input
                type="number"
                placeholder="0"
                value={form.reviews_count}
                onChange={(e) => setForm(prev => ({ ...prev, reviews_count: e.target.value }))}
                className={inputClass}
              />
            </div>
          </div>
        </div>

        {/* Section 5: Advertising details */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-6">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Advertising & Promotion</h2>
              <p className="text-xs text-gray-500">Show this place at the top of recommendations.</p>
            </div>
            <Switch
              checked={form.is_advertised}
              onCheckedChange={(checked) => setForm(prev => ({ ...prev, is_advertised: checked }))}
            />
          </div>

          {form.is_advertised && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2 col-span-2 md:col-span-1">
                <label className="text-sm font-semibold text-gray-700">Ad Priority *</label>
                <Input
                  type="number"
                  placeholder="E.g. 1 (higher numbers show first)"
                  value={form.ad_priority}
                  onChange={(e) => setForm(prev => ({ ...prev, ad_priority: e.target.value }))}
                  className={inputClass}
                  required
                />
              </div>

              <div className="space-y-2 col-span-2 md:col-span-1">
                <label className="text-sm font-semibold text-gray-700">Ad Badge Text</label>
                <Input
                  placeholder="E.g. Popular, Featured"
                  value={form.ad_badge_text}
                  onChange={(e) => setForm(prev => ({ ...prev, ad_badge_text: e.target.value }))}
                  className={inputClass}
                />
              </div>

              <div className="space-y-2 col-span-2 md:col-span-1">
                <label className="text-sm font-semibold text-gray-700">Ad Starts At</label>
                <Input
                  type="datetime-local"
                  value={form.ad_starts_at}
                  onChange={(e) => setForm(prev => ({ ...prev, ad_starts_at: e.target.value }))}
                  className={inputClass}
                />
              </div>

              <div className="space-y-2 col-span-2 md:col-span-1">
                <label className="text-sm font-semibold text-gray-700">Ad Ends At</label>
                <Input
                  type="datetime-local"
                  value={form.ad_ends_at}
                  onChange={(e) => setForm(prev => ({ ...prev, ad_ends_at: e.target.value }))}
                  className={inputClass}
                />
              </div>
            </div>
          )}
        </div>

        {/* Section 6: Image Upload */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-6">
          <h2 className="text-lg font-semibold text-gray-900 border-b border-gray-100 pb-3">Cover Image</h2>
          <div className="space-y-4">
            {coverPreview ? (
              <div className="relative h-60 w-full md:w-96 rounded-xl overflow-hidden bg-gray-50 border border-gray-200">
                <img src={coverPreview} alt="Cover Preview" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={removeCoverImage}
                  className="absolute top-3 right-3 bg-black/60 hover:bg-black/80 text-white rounded-full p-1.5 transition cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="flex justify-center rounded-xl border-2 border-dashed border-gray-300 px-6 pt-5 pb-6">
                <div className="space-y-1 text-center">
                  <Upload className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="flex text-sm text-gray-600">
                    <label className="relative cursor-pointer rounded-md bg-white font-semibold text-[#5800AB] focus-within:outline-none focus-within:ring-2 focus-within:ring-[#5800AB] focus-within:ring-offset-2 hover:text-[#4a0090]">
                      <span>Upload cover image</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="sr-only"
                      />
                    </label>
                  </div>
                  <p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Section 7: Status & Submit */}
        <div className="flex items-center justify-between bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-6">
            <div>
              <span className="text-sm font-semibold text-gray-900 block">Is Active</span>
              <span className="text-xs text-gray-500">Active places are visible to mobile application users.</span>
            </div>
            <Switch
              checked={form.is_active}
              onCheckedChange={(checked) => setForm(prev => ({ ...prev, is_active: checked }))}
            />
          </div>

          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={() => router.back()} disabled={loading} className="rounded-xl cursor-pointer">
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="bg-[#5800AB] text-white hover:bg-[#4a0090] rounded-xl cursor-pointer">
              {loading ? "Creating..." : "Create Tourist Place"}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
