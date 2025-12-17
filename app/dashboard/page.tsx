"use client";
import React, { useEffect, useState, useMemo, useRef } from "react";
import {
  Users,
  Hotel,
  Store,
  Coins,
  BarChart3,
  Building2,
} from "lucide-react";

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
} from "chart.js";

import { Bar, Line } from "react-chartjs-2";

import { supabaseBrowser } from "@/lib/supabaseBrowser";
import { AppDispatch } from "@/store/store";
import { useDispatch } from "react-redux";
import { setDashboardStats } from "@/store/features/dashboard/dashboardSlice";
import { LoadingSkeleton } from "@/components/userComponents/LoadingSkeleton";

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
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

export default function AdminDashboard() {
  const dispatch = useDispatch<AppDispatch>();
  const [loading, setLoading] = useState(true);

  const [stats, setStats] = useState<any>({
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

  const restaurantRef = useRef<any>(null);
  const storeRef = useRef<any>(null);

  const parseAmount = (raw: any) => {
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
  const computeWeeklyCounts = (rows: any[], weeks = 6) => {
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

        setWeeklyRestaurants(computeWeeklyCounts(rdata || []));
        setWeeklyStores(computeWeeklyCounts(sdata || []));

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

        invoiceData?.forEach((inv: any) => {
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
        (monthlyData || []).forEach((row) => {
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
        setStats({
          totalUsers: usersCount || 0,
          activeSubscribers: activeCount || 0,
          totalRestaurants: restaurantsCount || 0,
          totalStores: storesCount || 0,
          totalRevenue: totalINR,
        });

      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const weeklyLabels = ["W1", "W2", "W3", "W4", "W5", "W6"];

  /* ----------------------------------------------------------------------------- */
  /* RESTAURANT WEEKLY CHART DATA (useMemo) */
  /* ----------------------------------------------------------------------------- */
  const restaurantChartData = useMemo(() => {
    if (!restaurantRef.current) return { labels: weeklyLabels, datasets: [] };

    const ctx = restaurantRef.current.ctx;
    const gradient = ctx.createLinearGradient(0, 0, 0, 260);
    gradient.addColorStop(0, "#DA322444");
    gradient.addColorStop(1, "#DA322400");

    return {
      labels: weeklyLabels,
      datasets: [
        {
          label: "Restaurants",
          data: weeklyRestaurants,
          fill: true,
          borderColor: "#DA3224",
          backgroundColor: gradient,
          tension: 0.4,
          borderWidth: 2,
          pointRadius: 5,
        },
      ],
    };
  }, [weeklyRestaurants]);

  /* ----------------------------------------------------------------------------- */
  /* STORE WEEKLY CHART DATA (useMemo) */
  /* ----------------------------------------------------------------------------- */
  const storeChartData = useMemo(() => {
    if (!storeRef.current) return { labels: weeklyLabels, datasets: [] };

    const ctx = storeRef.current.ctx;
    const gradient = ctx.createLinearGradient(0, 0, 0, 260);
    gradient.addColorStop(0, "#3F6DF255");
    gradient.addColorStop(1, "#3F6DF200");

    return {
      labels: weeklyLabels,
      datasets: [
        {
          label: "Stores",
          data: weeklyStores,
          fill: true,
          borderColor: "#3F6DF2",
          backgroundColor: gradient,
          tension: 0.4,
          borderWidth: 2,
          pointRadius: 5,
        },
      ],
    };
  }, [weeklyStores]);

  const ratio =
    stats.totalUsers > 0
      ? `${stats.activeSubscribers}:${stats.totalUsers}`
      : "0:0";

  return (
    <div className="min-h-full w-full">
      {loading ? (
        <LoadingSkeleton />
      ) : (
        <div className="space-y-6">

          {/* HEADER */}
          <div className="flex items-start justify-between">
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <KPI icon={<Users />} label="Total Users" value={stats.totalUsers} tone="indigo" />
            <KPI icon={<Hotel />} label="Restaurants" value={stats.totalRestaurants} tone="violet" />
            <KPI icon={<Store />} label="Stores" value={stats.totalStores} tone="purple" />
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
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white rounded-xl border border-indigo-200 shadow-sm">
              <div className="p-4 border-b">
                <h3 className="font-semibold text-gray-800">Subscriptions / Month</h3>
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
                    scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
                  }}
                />
              </div>
            </div>

            {/* RIGHT COLUMN */}
            <div className="bg-white rounded-xl border border-indigo-200 shadow-sm p-4 space-y-3">
              <MiniStat label="Conversion Rate" value={`${((stats.activeSubscribers / stats.totalUsers) * 100).toFixed(1)}%`} />
              <MiniStat label="Total Revenue" value={new Intl.NumberFormat("en-IN").format(stats.totalRevenue)} />
              <MiniStat label="Restaurants" value={stats.totalRestaurants} />
              <MiniStat label="Stores" value={stats.totalStores} />
            </div>
          </div>

          {/* WEEKLY TRENDS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* Restaurants Weekly */}
            <div className="bg-white rounded-xl border shadow p-4">
              <h3 className="font-semibold text-gray-800 mb-2">
                New Restaurants per Week
              </h3>
              <div className="h-[260px]">
                <Line
                  ref={restaurantRef}
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
            <div className="bg-white rounded-xl border shadow p-4">
              <h3 className="font-semibold text-gray-800 mb-2">
                New Stores per Week
              </h3>
              <div className="h-[260px]">
                <Line
                  ref={storeRef}
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

/* -------------------------- UI COMPONENTS -------------------------- */

function KPI({ icon, label, value, tone, extra }: any) {
  const toneMap: Record<string, string> = {
    indigo: "from-indigo-50 to-white border-indigo-200 text-indigo-800",
    violet: "from-violet-50 to-white border-violet-200 text-violet-800",
    purple: "from-purple-50 to-white border-purple-200 text-purple-800",
    emerald: "from-emerald-50 to-white border-emerald-200 text-emerald-800",
    amber: "from-amber-50 to-white border-amber-200 text-amber-800",
  };

  return (
    <div className={`rounded-xl border shadow-sm p-4 bg-gradient-to-br ${toneMap[tone]}`}>
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

function MiniStat({ label, value }: any) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-indigo-100 px-3 py-2">
      <span className="text-sm text-gray-600">{label}</span>
      <span className="text-sm font-semibold text-gray-900">{value}</span>
    </div>
  );
}

function Chip({ text }: any) {
  return (
    <div className="flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold text-gray-700">
      {text}
    </div>
  );
}
