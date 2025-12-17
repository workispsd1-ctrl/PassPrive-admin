"use client";

import { useEffect, useState } from "react";
import axios from "axios";

export default function OffersPage() {
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

  const loadOffers = async () => {
    setLoading(true);
    const res = await axios.get(`${backendUrl}/api/homeherooffers`);
    setOffers(res.data.offers || []);
    setLoading(false);
  };

  useEffect(() => {
    loadOffers();
  }, []);

  return (
    <div>
      <h1 className="text-3xl font-semibold mb-6">🎁 Home Hero Offers</h1>

      <a
        href="/admin/offers/new"
        className="px-4 py-2 bg-blue-600 rounded-md hover:bg-blue-700"
      >
        + Add New Offer
      </a>

      {/* LIST */}
      <div className="mt-6">
        {loading ? (
          <p>Loading...</p>
        ) : (
          <table className="w-full border-collapse border border-gray-700">
            <thead>
              <tr className="bg-[#1A1A1A]">
                <th className="border border-gray-700 p-3">ID</th>
                <th className="border border-gray-700 p-3">Type</th>
                <th className="border border-gray-700 p-3">Media</th>
                <th className="border border-gray-700 p-3">Status</th>
                <th className="border border-gray-700 p-3">Actions</th>
              </tr>
            </thead>

            <tbody>
              {offers.map((o: any) => (
                <tr key={o.id} className="text-center">
                  <td className="border border-gray-700 p-3">{o.id}</td>
                  <td className="border border-gray-700 p-3">{o.type}</td>
                  <td className="border border-gray-700 p-3">
                    <img src={o.media_url} className="w-32 h-20 object-cover mx-auto" />
                  </td>
                  <td className="border border-gray-700 p-3">
                    {o.is_active ? "Active" : "Inactive"}
                  </td>
                  <td className="border border-gray-700 p-3">
                    <a href={`/admin/offers/edit/${o.id}`} className="text-blue-400 mr-4">
                      Edit
                    </a>
                    <button className="text-red-400">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
