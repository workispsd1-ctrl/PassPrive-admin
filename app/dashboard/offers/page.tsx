"use client";

import { useEffect, useState } from "react";
import axios from "axios";

type Offer = {
  id: number;
  type: string;
  media_url: string;
  is_active: boolean;
};

export default function OffersPage() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

  const loadOffers = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${backendUrl}/api/homeherooffers`);
      setOffers(res.data.offers || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOffers();
  }, []);

  return (
    <div className="p-4 min-h-full">
      {/* HEADER */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">
            Home Hero Offers
          </h1>
          <p className="text-sm text-slate-500">
            Manage banners, images and promotional offers
          </p>
        </div>

        <a
          href="/dashboard/offers/new"
          className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          + Add Offer
        </a>
      </div>

      {/* CONTENT */}
      {loading ? (
        <SkeletonTable />
      ) : offers.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center text-slate-500 border border-slate-200">
          No offers available. Create a new offer to get started.
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-100">
              <tr>
                <th className="p-4 text-left font-medium text-slate-600">ID</th>
                <th className="p-4 text-left font-medium text-slate-600">Type</th>
                <th className="p-4 text-left font-medium text-slate-600">
                  Preview
                </th>
                <th className="p-4 text-left font-medium text-slate-600">
                  Status
                </th>
                <th className="p-4 text-right font-medium text-slate-600">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>
              {offers.map((o) => (
                <tr
                  key={o.id}
                  className="border-t border-slate-200 hover:bg-slate-50"
                >
                  <td className="p-4 text-slate-700">{o.id}</td>
                  <td className="p-4 capitalize text-slate-700">{o.type}</td>

                  <td className="p-4">
                    <img
                      src={o.media_url}
                      alt="Offer"
                      className="w-28 h-16 rounded-md object-cover border border-slate-200"
                    />
                  </td>

                  <td className="p-4">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        o.is_active
                          ? "bg-green-100 text-green-700"
                          : "bg-orange-100 text-orange-700"
                      }`}
                    >
                      {o.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>

                  <td className="p-4 text-right space-x-4">
                    <a
                      href={`/admin/offers/edit/${o.id}`}
                      className="text-blue-600 hover:underline"
                    >
                      Edit
                    </a>
                    <button className="text-red-500 hover:underline">
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ---------------- Skeleton Loader ---------------- */

function SkeletonTable() {
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="p-4 space-y-4 animate-pulse">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="grid grid-cols-5 gap-4 items-center"
          >
            <div className="h-4 bg-slate-200 rounded w-12" />
            <div className="h-4 bg-slate-200 rounded w-24" />
            <div className="h-10 bg-slate-200 rounded w-28" />
            <div className="h-6 bg-slate-200 rounded w-20" />
            <div className="h-4 bg-slate-200 rounded w-24 ml-auto" />
          </div>
        ))}
      </div>
    </div>
  );
}
