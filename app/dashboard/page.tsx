"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Users, Hotel, Store, Coins } from "lucide-react";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Filler,
  Title,
  Tooltip,
  Legend,
  ChartArea,
} from "chart.js";

import { Bar, Line } from "react-chartjs-2";

import { supabaseBrowser } from "@/lib/supabaseBrowser";
import type { AppDispatch } from "@/store/store";
import { useDispatch } from "react-redux";
import { setDashboardStats } from "@/store/features/dashboard/dashboardSlice";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Filler,
  Title,
  Tooltip,
  Legend
);

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const WEEKLY_LABELS = ["W1", "W2", "W3", "W4", "W5", "W6"] as const;

type Stats = {
  totalUsers: number;
  activeSubscribers: number;
  totalRestaurants: number;
  totalStores: number;
  totalRevenue: number;
};

export default function AdminDashboard() {
  const dispatch = useDispatch<AppDispatch>();
  const [loading, setLoading] = useState(true);

  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    activeSubscribers: 0,
    totalRestaurants: 0,
    totalStores: 0,
    totalRevenue: 0,
  });

  const [revenueINR, setRevenueINR] = useState<number>(0);
  const [weeklyRestaurants, setWeeklyRestaurants] = useState<number[]>([]);
  const [weeklyStores, setWeeklyStores] = useState<number[]>([]);
  const [monthlyLabels, setMonthlyLabels] = useState<string[]>([]);
  const [monthlyCounts, setMonthlyCounts] = useState<number[]>([]);

  const parseAmount = (raw: unknown) => {
    if (!raw) return 0;
    if (typeof raw === "number") return raw;

    let s = String(raw).trim();
    s = s.replace(/\((.*)\)/, "-$1");
    s = s.replace(/[^0-9.\-]/g, "");
    return parseFloat(s) || 0;
  };

  /* ----------------------------------------------------------------------------- */
  /* WEEKLY COUNT CALCULATOR */
  /* ----------------------------------------------------------------------------- */
  const computeWeeklyCounts = (
    rows: Array<{ created_at: string }>,
    weeks = 6
  ) => {
    const res = new Array(weeks).fill(0);
    const now = new Date();

    rows.forEach((row) => {
      const diffWeeks =
        (now.getTime() - new Date(row.created_at).getTime()) /
        (1000 * 60 * 60 * 24 * 7);

      const index = Math.floor(diffWeeks);
      if (index >= 0 && index < weeks) {
        res[weeks - 1 - index] += 1;
      }
    });

    return res;
  };

  /* ----------------------------------------------------------------------------- */
  /* LOAD ALL DATA */
  /* ----------------------------------------------------------------------------- */
  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);

        /* USERS */
        const { count: usersCount } = await supabaseBrowser
          .from("users")
          .select("id", { count: "exact", head: true });

        /* ACTIVE SUBSCRIBERS */
        const { count: activeCount } = await supabaseBrowser
          .from("users")
          .select("id", { count: "exact", head: true })
          .not("subscription", "is", null);

        /* RESTAURANTS & STORES */
        const { data: rdata } = await supabaseBrowser
          .from("restaurants")
          .select("created_at");

        const { data: sdata } = await supabaseBrowser
          .from("stores")
          .select("created_at");

        setWeeklyRestaurants(computeWeeklyCounts((rdata as any[]) || []));
        setWeeklyStores(computeWeeklyCounts((sdata as any[]) || []));

        const { count: restaurantsCount } = await supabaseBrowser
          .from("restaurants")
          .select("id", { count: "exact", head: true });

        const { count: storesCount } = await supabaseBrowser
          .from("stores")
          .select("id", { count: "exact", head: true });

        /* REVENUE */
        let totalINR = 0;
        const { data: invoiceData } = await supabaseBrowser
          .from("invoice")
          .select("amount, payment_provider");

        (invoiceData as any[] | null)?.forEach((inv) => {
          const amt = parseAmount(inv.amount);
          if (inv.payment_provider === "razorpay") totalINR += amt;
        });

        setRevenueINR(totalINR);

        /* MONTHLY SUBSCRIPTIONS */
        const year = new Date().getFullYear();
        const { data: monthlyData } = await supabaseBrowser
          .from("user_subscription")
          .select("created_at")
          .eq("status", "payment_successful")
          .gte("created_at", `${year}-01-01T00:00:00Z`)
          .lte("created_at", `${year}-12-31T23:59:59Z`);

        const counts = Array(12).fill(0);
        (monthlyData as any[] | null)?.forEach((row) => {
          const m = new Date(row.created_at).getMonth();
          counts[m] += 1;
        });

        const monthNow = new Date().getMonth();
        setMonthlyCounts([
          ...counts.slice(monthNow),
          ...counts.slice(0, monthNow),
        ]);
        setMonthlyLabels([
          ...MONTHS.slice(monthNow),
          ...MONTHS.slice(0, monthNow),
        ]);

        /* FINAL STATS */
        const nextStats: Stats = {
          totalUsers: usersCount || 0,
          activeSubscribers: activeCount || 0,
          totalRestaurants: restaurantsCount || 0,
          totalStores: storesCount || 0,
          totalRevenue: totalINR,
        };

        setStats(nextStats);
        dispatch(setDashboardStats(nextStats as any));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [dispatch]);

  /* ----------------------------------------------------------------------------- */
  /* CHART DATA — FIXED (NO REFS, SCRIPTABLE GRADIENT) */
  /* ----------------------------------------------------------------------------- */
  const restaurantChartData = useMemo(() => {
    return {
      labels: [...WEEKLY_LABELS],
      datasets: [
        {
          label: "Restaurants",
          data: weeklyRestaurants,
          fill: true as const,
          borderColor: "#DA3224",
          borderWidth: 2,
          tension: 0.4,
          pointRadius: 5,
          backgroundColor: (context: any) => {
            const chart = context.chart;
            const { ctx, chartArea } = chart as {
              ctx: CanvasRenderingContext2D;
              chartArea?: ChartArea;
            };
            if (!chartArea) return "#DA322422";
            const gradient = ctx.createLinearGradient(
              0,
              chartArea.top,
              0,
              chartArea.bottom
            );
            gradient.addColorStop(0, "#DA322444");
            gradient.addColorStop(1, "#DA322400");
            return gradient;
          },
        },
      ],
    };
  }, [weeklyRestaurants]);

  const storeChartData = useMemo(() => {
    return {
      labels: [...WEEKLY_LABELS],
      datasets: [
        {
          label: "Stores",
          data: weeklyStores,
          fill: true as const,
          borderColor: "#3F6DF2",
          borderWidth: 2,
          tension: 0.4,
          pointRadius: 5,
          backgroundColor: (context: any) => {
            const chart = context.chart;
            const { ctx, chartArea } = chart as {
              ctx: CanvasRenderingContext2D;
              chartArea?: ChartArea;
            };
            if (!chartArea) return "#3F6DF222";
            const gradient = ctx.createLinearGradient(
              0,
              chartArea.top,
              0,
              chartArea.bottom
            );
            gradient.addColorStop(0, "#3F6DF255");
            gradient.addColorStop(1, "#3F6DF200");
            return gradient;
          },
        },
      ],
    };
  }, [weeklyStores]);

  const conversionRate =
    stats.totalUsers > 0
      ? `${((stats.activeSubscribers / stats.totalUsers) * 100).toFixed(1)}%`
      : "0.0%";

  return (
    <div className="min-h-full w-full">
      {loading ? (
        <DashboardSkeleton />
      ) : (
        <div className="space-y-6">
          {/* KPIs */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
            <KPI
              icon={<Users />}
              label="Total Users"
              value={stats.totalUsers}
              tone="indigo"
            />
            <KPI
              icon={<Hotel />}
              label="Restaurants"
              value={stats.totalRestaurants}
              tone="violet"
            />
            <KPI
              icon={<Store />}
              label="Stores"
              value={stats.totalStores}
              tone="purple"
            />
            <KPI
              icon={<Users />}
              label="Active Subs"
              value={stats.activeSubscribers}
              tone="emerald"
            />
            <KPI
              icon={<Coins />}
              label="Revenue (INR)"
              value={new Intl.NumberFormat("en-IN").format(revenueINR)}
              tone="amber"
            />
          </div>

          {/* MONTHLY CHART */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="rounded-xl border border-indigo-200 bg-white shadow-sm lg:col-span-2">
              <div className="border-b border-gray-300 p-4">
                <h3 className="font-semibold text-gray-800">
                  Subscriptions / Month
                </h3>
                <p className="text-xs text-gray-500">Last 12 months</p>
              </div>

              <div className="h-80 p-3">
                <Bar
                  data={{
                    labels: monthlyLabels,
                    datasets: [
                      {
                        label: "Subscriptions",
                        data: monthlyCounts,
                        backgroundColor: "#4F46E5",
                        borderRadius: 6,
                        maxBarThickness: 28,
                      },
                    ],
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                      y: { beginAtZero: true, ticks: { precision: 0 } },
                    },
                  }}
                />
              </div>
            </div>

            {/* RIGHT COLUMN */}
            <div className="space-y-3 rounded-xl border border-indigo-200 bg-white p-4 shadow-sm">
              <MiniStat label="Conversion Rate" value={conversionRate} />
              <MiniStat
                label="Total Revenue"
                value={new Intl.NumberFormat("en-IN").format(stats.totalRevenue)}
              />
              <MiniStat label="Restaurants" value={stats.totalRestaurants} />
              <MiniStat label="Stores" value={stats.totalStores} />
            </div>
          </div>

          {/* WEEKLY TRENDS */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* Restaurants Weekly */}
            <div className="rounded-xl border border-gray-300 bg-white p-4 shadow">
              <h3 className="mb-2 font-semibold text-gray-800">
                New Restaurants per Week
              </h3>
              <div className="h-[260px]">
                <Line
                  data={restaurantChartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                  }}
                />
              </div>
            </div>

            {/* Stores Weekly */}
            <div className="rounded-xl border border-gray-300 bg-white p-4 shadow">
              <h3 className="mb-2 font-semibold text-gray-800">
                New Stores per Week
              </h3>
              <div className="h-[260px]">
                <Line
                  data={storeChartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* -------------------------- SKELETON (ONLY FOR LOADING) -------------------------- */

function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded-lg bg-gray-200/70 ${className}`} />
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* KPI skeletons */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Skeleton className="h-8 w-8 rounded-lg" />
                <Skeleton className="h-4 w-24" />
              </div>
              <Skeleton className="h-4 w-10" />
            </div>
            <div className="mt-3">
              <Skeleton className="h-7 w-24" />
            </div>
          </div>
        ))}
      </div>

      {/* charts row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm lg:col-span-2">
          <div className="border-b border-gray-200 p-4">
            <Skeleton className="h-5 w-44" />
            <Skeleton className="mt-2 h-3 w-28" />
          </div>
          <div className="h-80 p-4">
            <Skeleton className="h-full w-full rounded-xl" />
          </div>
        </div>

        <div className="space-y-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2"
            >
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>
      </div>

      {/* weekly charts */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
          >
            <Skeleton className="mb-3 h-5 w-52" />
            <Skeleton className="h-[260px] w-full rounded-xl" />
          </div>
        ))}
      </div>
    </div>
  );
}

/* -------------------------- UI COMPONENTS -------------------------- */

function KPI({
  icon,
  label,
  value,
  tone,
  extra,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  tone: "indigo" | "violet" | "purple" | "emerald" | "amber";
  extra?: React.ReactNode;
}) {
  const toneMap: Record<string, string> = {
    indigo: "from-indigo-50 to-white border-indigo-200 text-indigo-800",
    violet: "from-violet-50 to-white border-violet-200 text-violet-800",
    purple: "from-purple-50 to-white border-purple-200 text-purple-800",
    emerald: "from-emerald-50 to-white border-emerald-200 text-emerald-800",
    amber: "from-amber-50 to-white border-amber-200 text-amber-800",
  };

  return (
    <div
      className={`rounded-xl border bg-gradient-to-br p-4 shadow-sm ${toneMap[tone]}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold">
          {icon}
          <span className="text-gray-600">{label}</span>
        </div>
        {extra}
      </div>
      <div className="mt-2 text-2xl font-bold">{value}</div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-indigo-100 px-3 py-2">
      <span className="text-sm text-gray-600">{label}</span>
      <span className="text-sm font-semibold text-gray-900">{value}</span>
    </div>
  );
}
