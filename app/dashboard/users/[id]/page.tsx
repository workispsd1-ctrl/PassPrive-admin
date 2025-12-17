"use client"; 

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card"; 
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import { displayValidTill } from "@/lib/dateTimeFormatter";
import PaginationBar from "../../_components/Pagination";
import { ChevronLeft, ArrowLeft } from "lucide-react";
import Link from "next/link";


interface Subscription {
  amount: string;
  basic_amount: string;
  created_at: string;
  end_date: string;
  hst_tax: string;
  id: string;
  is_active: boolean;
  start_date: string;
  status: string;
  subscription_id: string;
}

interface UserSubscription {
    id: string;
    display_name: string;
    subscription: string;
    user_subscription: Subscription[]
}

function UserSubscriptionsPage() {
  const { id:userId } = useParams();
  const router = useRouter();

  const [subscriptions, setSubscriptions] = useState<UserSubscription>();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
    const [limit, setLimit] = useState(10);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
     const totalPages = Math.ceil(total / limit);

  useEffect(() => {
    const fetchSubscriptions = async () => {
      setIsLoading(true);
      setError("");
      setSubscriptions(undefined); 

      try {
        const { data, error } = await supabaseBrowser
          .from("users")
          .select("*, user_subscription(*)", {
            count: "exact",
          })
          .eq("id", userId)
          .eq("role", "user")
          .order("created_at", { ascending: false })
          .range((page - 1) * limit, page * limit - 1);

          if (error) {
            setError(error.message);
            throw new Error(error.message);
        }
        setSubscriptions(data[0]);
        setTotal(data.reduce((total, user) => total + user.user_subscription.length, 0));
      } catch (err) {
        console.error("Error fetching subscriptions:", err);
        setError("Failed to load previous subscriptions.");
      } finally {
        setIsLoading(false);
      }
    };

    if (userId) {
      fetchSubscriptions();
    }
  }, [userId, page, limit]);

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center space-x-4 mb-6">
        <button   onClick={() => router.back()}
         
          className=""
        >
         <ArrowLeft size={20} className="text-gray-500 hover:text-blue-600 cursor-pointer" />
        </button>
        <h1 className="text-md font-semibold">

          <span className="text-blue-600">{subscriptions?.display_name}</span>
        </h1>
      </div>

      <Card className="border border-gray-200 shadow-sm">
        <CardContent className="p-0">
          {isLoading && (
            <div className="p-6 text-center text-gray-600">
              Loading subscriptions...
            </div>
          )}

          {error && (
            <div className="p-6 text-center text-red-600">Error: {error}</div>
          )}

          {!isLoading && !error && subscriptions && (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Plan
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Start Date
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      End Date
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Created At
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Status
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Amount
                    </th>
                    
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                {subscriptions.user_subscription.length === 0 ? (
                    <tr>
                        <td colSpan={8} className="p-6 text-center text-gray-600">
                            No previous subscriptions found for this user.
                        </td>
                    </tr>
                ) : (
                    subscriptions.user_subscription.map((sub) => (
                      <tr key={sub.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {subscriptions.subscription}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {displayValidTill(sub?.start_date)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {displayValidTill(sub?.end_date)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {displayValidTill(sub?.created_at)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {sub.status === 'payment_successfull' ? "Success" : "Failed"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          ${sub.amount}
                        </td>
                        
                      </tr>
                    ))
                )}
                </tbody>
              </table>
              <div className="mt-auto">
                <PaginationBar
                    page={page}
                    setPage={setPage}
                    totalPage={totalPages}
                    totalRecord={total}
                    limit={limit}
                    setLimit={setLimit}
                />
                </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default UserSubscriptionsPage;
