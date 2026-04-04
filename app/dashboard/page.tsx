"use client";

import React, { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";

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
  const [sidebarOpen, setSidebarOpen] = useState(true);

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
          .not("membership", "is", null);

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
        let totalRevenue = 0;
        const { data: transactionData } = await supabaseBrowser
          .from("payment_sessions")
          .select("amount_major")
          .eq("status", "VERIFIED_SUCCESS");

        (transactionData as any[] | null)?.forEach((transaction) => {
          totalRevenue += parseAmount(transaction.amount_major);
        });

        setRevenueINR(totalRevenue);

        /* MONTHLY MEMBERSHIPS */
        const { data: monthlyData } = await supabaseBrowser
          .from("users")
          .select("membership_started")
          .not("membership", "is", null)
          .not("membership_started", "is", null);

        const counts = Array(12).fill(0);
        const now = new Date();
        (monthlyData as any[] | null)?.forEach((row) => {
          const startedAt = new Date(row.membership_started);
          const monthDiff =
            (now.getFullYear() - startedAt.getFullYear()) * 12 +
            (now.getMonth() - startedAt.getMonth());

          if (monthDiff >= 0 && monthDiff < 12) {
            counts[11 - monthDiff] += 1;
          }
        });

        const monthNow = now.getMonth();
        setMonthlyCounts(counts);
        setMonthlyLabels([
          ...MONTHS.slice(monthNow + 1),
          ...MONTHS.slice(0, monthNow + 1),
        ]);

        /* FINAL STATS */
        const nextStats: Stats = {
          totalUsers: usersCount || 0,
          activeSubscribers: activeCount || 0,
          totalRestaurants: restaurantsCount || 0,
          totalStores: storesCount || 0,
          totalRevenue,
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
          borderRadius: 8,
          maxBarThickness: 48,
          backgroundColor: (context: any) => {
            const chart = context.chart;
            const { ctx, chartArea } = chart as {
              ctx: CanvasRenderingContext2D;
              chartArea?: ChartArea;
            };
            if (!chartArea) return "#5800AB4D";
            const gradient = ctx.createLinearGradient(
              0,
              chartArea.top,
              0,
              chartArea.bottom
            );
            gradient.addColorStop(0, "#5800AB4D");
            gradient.addColorStop(1, "#5800AB1A");
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
          borderColor: "#5800AB",
          borderWidth: 2,
          tension: 0.35,
          pointRadius: 0,
          pointHoverRadius: 3,
          backgroundColor: (context: any) => {
            const chart = context.chart;
            const { ctx, chartArea } = chart as {
              ctx: CanvasRenderingContext2D;
              chartArea?: ChartArea;
            };
            if (!chartArea) return "#5800AB4D";
            const gradient = ctx.createLinearGradient(
              0,
              chartArea.top,
              0,
              chartArea.bottom
            );
            gradient.addColorStop(0, "#5800AB4D");
            gradient.addColorStop(1, "#5800AB00");
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

  const monthlyChartData = useMemo(() => {
    return {
      labels: monthlyLabels,
      datasets: [
        {
          label: "Memberships",
          data: monthlyCounts,
          fill: true as const,
          borderColor: "#5800AB",
          borderWidth: 2,
          tension: 0.35,
          pointRadius: 0,
          pointHoverRadius: 3,
          backgroundColor: (context: any) => {
            const chart = context.chart;
            const { ctx, chartArea } = chart as {
              ctx: CanvasRenderingContext2D;
              chartArea?: ChartArea;
            };
            if (!chartArea) return "#5800AB4D";
            const gradient = ctx.createLinearGradient(
              0,
              chartArea.top,
              0,
              chartArea.bottom
            );
            gradient.addColorStop(0, "#5800AB4D");
            gradient.addColorStop(1, "#5800AB00");
            return gradient;
          },
        },
      ],
    };
  }, [monthlyLabels, monthlyCounts]);

  const handleToggleSidebar = () => {
    window.dispatchEvent(new Event("dashboard-toggle-sidebar"));
    setSidebarOpen((prev) => !prev);
  };

  return (
    <div className="min-h-full w-full bg-[linear-gradient(135deg,_#ECFEFF_0%,_#F3E8FF_100%)] p-1 md:p-2">
      {loading ? (
        <DashboardSkeleton />
      ) : (
        <div className="space-y-4">
          <div className="flex h-14 items-center justify-between">
            <div className="flex items-center">
              <button
                type="button"
                onClick={handleToggleSidebar}
                aria-label="Toggle sidebar"
                className="mr-2 rounded-md p-1 text-[#5b6473] transition hover:bg-white/70"
              >
                {sidebarOpen ? (
                  <ChevronLeft className="h-5 w-5" />
                ) : (
                  <ChevronRight className="h-5 w-5" />
                )}
              </button>
              <h1 className="text-[20px] font-normal leading-[32px] text-[#1D293D]">Dashboard - Super Admin</h1>
            </div>
            <div className="flex items-center gap-3 text-[#1f2a37]">
              <button
                type="button"
                className="rounded-md p-1.5 transition hover:bg-white/70"
                aria-label="Download"
              >
                <Image
                  src="/download.png"
                  alt="Download"
                  width={16}
                  height={16}
                  className="h-4 w-4 object-contain"
                />
              </button>
              <button
                type="button"
                className="rounded-md p-1.5 transition hover:bg-white/70"
                aria-label="Refresh"
              >
                <Image
                  src="/refresh.png"
                  alt="Refresh"
                  width={16}
                  height={16}
                  className="h-4 w-4 object-contain"
                />
              </button>
              <div className="flex items-center gap-2 rounded-full bg-white/70 px-2 py-[2px]">
                <div className="h-7 w-7 rounded-full bg-[#929292]" />
                <span className="text-[14px] font-normal leading-[20px] text-[#314158]">
                  Super Admin
                </span>
              </div>
            </div>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <KPI
              iconSrc="/dashboardusers.png"
              label="Total Users"
              value={stats.totalUsers}
            />
            <KPI
              iconSrc="/dashboardrestaurents.png"
              label="Restaurants"
              value={stats.totalRestaurants}
            />
            <KPI
              iconSrc="/dashboardstore.png"
              label="Stores"
              value={stats.totalStores}
            />
            <KPI
              iconSrc="/qr_code_scanner.png"
              label="Active Subs"
              value={stats.activeSubscribers}
            />
            <KPI
              iconSrc="/attach_money.png"
              label="Revenue (MUR)"
              value={new Intl.NumberFormat("en-MU", {
                style: "currency",
                currency: "MUR",
                maximumFractionDigits: 2,
              }).format(revenueINR)}
            />
          </div>

          {/* MONTHLY CHART */}
          <div className="flex flex-col gap-4 lg:flex-row lg:items-stretch">
            <div className="flex h-[460px] min-w-0 flex-col rounded-2xl border border-[#FFFFFF99] bg-[linear-gradient(180deg,rgba(255,255,255,0.40)_0%,rgba(255,255,255,0.30)_50%,rgba(255,255,255,0.20)_100%)] p-4 shadow-sm lg:basis-[68.5%]">
              <div className="flex items-start justify-between p-4 pb-0">
                <div>
                  <h3 className="text-[16px] font-medium leading-6 text-[#1D293D]">Memberships</h3>
                  <p className="text-[12px] font-normal leading-4 text-[#45556C]">Last 12 months by membership date</p>
                </div>
                <button className="text-[12px] font-medium leading-4 text-[#1D1B20] hover:underline">View all statistic</button>
              </div>

              <div className="h-[349px] p-3">
                <Line
                  data={monthlyChartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                      y: {
                        beginAtZero: true,
                        suggestedMax: 50,
                        ticks: {
                          precision: 0,
                          stepSize: 10,
                          color: "#94A3B8",
                          font: { size: 11, weight: 400 },
                        },
                        grid: { color: "#E7ECF4" },
                        border: { display: false },
                      },
                      x: {
                        ticks: { color: "#94A3B8", font: { size: 11, weight: 400 } },
                        grid: { display: false },
                        border: { color: "#E7ECF4" },
                      },
                    },
                  }}
                />
              </div>
            </div>

            {/* RIGHT COLUMN */}
            <div className="flex h-[460px] w-full flex-col rounded-2xl border border-[#FFFFFF99] bg-[linear-gradient(180deg,rgba(255,255,255,0.40)_0%,rgba(255,255,255,0.30)_50%,rgba(255,255,255,0.20)_100%)] p-4 shadow-sm lg:basis-[31.5%]">
              <div className="mb-1 flex items-center justify-between">
                <h3 className="text-[16px] font-medium leading-6 text-[#1D293D]">Overview</h3>
                <button className="text-[12px] font-medium leading-4 text-[#1D1B20] hover:underline">View all</button>
              </div>
              <MiniStat label="Conversion Rate" value={conversionRate} />
              <MiniStat
                label="Total Revenue"
                value={new Intl.NumberFormat("en-MU", {
                  style: "currency",
                  currency: "MUR",
                  maximumFractionDigits: 2,
                }).format(stats.totalRevenue)}
              />
              <MiniStat label="Restaurants" value={stats.totalRestaurants} />
              <MiniStat label="Stores" value={stats.totalStores} />
            </div>
          </div>

          {/* WEEKLY TRENDS */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* Restaurants Weekly */}
            <div className="h-[400px] rounded-2xl border border-[#FFFFFF99] bg-[linear-gradient(180deg,rgba(255,255,255,0.40)_0%,rgba(255,255,255,0.30)_50%,rgba(255,255,255,0.20)_100%)] p-4 shadow-sm">
              <div className="mb-2 flex items-start justify-between">
                <div>
                  <h3 className="text-[16px] font-medium leading-6 text-[#1D293D]">New Restaurants</h3>
                  <p className="text-[12px] font-normal leading-4 text-[#45556C]">Per week growth</p>
                </div>
                <button className="text-[12px] font-medium leading-4 text-[#1D1B20] hover:underline">View all</button>
              </div>
              <div className="h-[310px]">
                <Bar
                  data={restaurantChartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                      y: {
                        beginAtZero: true,
                        suggestedMax: 50,
                        ticks: {
                          precision: 0,
                          stepSize: 10,
                          color: "#94A3B8",
                          font: { size: 11, weight: 400 },
                        },
                        grid: { color: "#E7ECF4" },
                        border: { display: false },
                      },
                      x: {
                        ticks: { color: "#94A3B8", font: { size: 11, weight: 400 } },
                        grid: { display: false },
                        border: { color: "#E7ECF4" },
                      },
                    },
                  }}
                />
              </div>
            </div>

            {/* Stores Weekly */}
            <div className="h-[400px] rounded-2xl border border-[#FFFFFF99] bg-[linear-gradient(180deg,rgba(255,255,255,0.40)_0%,rgba(255,255,255,0.30)_50%,rgba(255,255,255,0.20)_100%)] p-4 shadow-sm">
              <div className="mb-2 flex items-start justify-between">
                <div>
                  <h3 className="text-[16px] font-medium leading-6 text-[#1D293D]">New Stores</h3>
                  <p className="text-[12px] font-normal leading-4 text-[#45556C]">Per week growth</p>
                </div>
                <button className="text-[12px] font-medium leading-4 text-[#1D1B20] hover:underline">View all</button>
              </div>
              <div className="h-[310px]">
                <Line
                  data={storeChartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                      y: {
                        beginAtZero: true,
                        suggestedMax: 50,
                        ticks: {
                          precision: 0,
                          stepSize: 10,
                          color: "#94A3B8",
                          font: { size: 11, weight: 400 },
                        },
                        grid: { color: "#E7ECF4" },
                        border: { display: false },
                      },
                      x: {
                        ticks: { color: "#94A3B8", font: { size: 11, weight: 400 } },
                        grid: { display: false },
                        border: { color: "#E7ECF4" },
                      },
                    },
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
  iconSrc,
  label,
  value,
}: {
  iconSrc: string;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="h-[90px] rounded-2xl border border-white/60 border-l-4 border-l-[#5800AB] bg-[linear-gradient(180deg,rgba(255,255,255,0.4)_0%,rgba(255,255,255,0.3)_50%,rgba(255,255,255,0.2)_100%)] px-4 py-3 shadow-sm">
      <div className="flex h-full items-center gap-5">
        <Image
          src={iconSrc}
          alt={label}
          width={38}
          height={38}
          className="h-[38px] w-[38px] shrink-0 object-contain"
        />
        <div>
          <div className="text-[12px] font-normal leading-4 text-[#45556C]">{label}</div>
          <div className="text-[24px] font-normal leading-8 text-[#0F172B]">{value}</div>
        </div>
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-[2px]">
      <span className="text-[12px] font-normal leading-4 text-[#45556C]">{label}</span>
      <span className="text-[14px] font-normal leading-5 text-[#0F172B]">{value}</span>
    </div>
  );
}
