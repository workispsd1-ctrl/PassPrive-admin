"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "./_components/Sidebar";
import Navbar from "./_components/Navbar";
import { useAuth } from "@/store/hooks/useAuth";
import { supabaseBrowser } from "@/lib/supabaseBrowser";



const DashboardLayout = ({ children }) => {
  const pathname = usePathname();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isLargeScreen, setIsLargeScreen] = useState(false);
  const { isLoading, isAuthenticated, isAdmin } = useAuth();
  const isDashboardHome = pathname === "/dashboard";
  const sidebarExpandedWidth = 320;
  const sidebarCollapsedWidth = 84;
  const dashboardGradientClass = "bg-[#FFFFFF]";
  // Track screen width
  useEffect(() => {
    const checkScreenSize = () => {
      setIsLargeScreen(window.innerWidth >= 1024); // 1024px = Tailwind's lg
    };

    checkScreenSize();
    window.addEventListener("resize", checkScreenSize);

    return () => window.removeEventListener("resize", checkScreenSize);
  }, []);

  // Ensure sidebar is always collapsed on small screens
  useEffect(() => {
    if (!isLargeScreen) {
      setSidebarCollapsed(true);
    } else {
      setSidebarCollapsed(false);
    }
  }, [isLargeScreen]);

  useEffect(() => {
    const handleDashboardToggle = () => {
      if (isLargeScreen) {
        setSidebarCollapsed((prev) => !prev);
      }
    };

    window.addEventListener("dashboard-toggle-sidebar", handleDashboardToggle);
    return () => {
      window.removeEventListener("dashboard-toggle-sidebar", handleDashboardToggle);
    };
  }, [isLargeScreen]);

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#eef0fb]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#FF4800] border-t-transparent" />
          <p className="text-sm font-medium text-slate-500">Checking authorization...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !isAdmin) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#eef0fb]">
        <div className="text-center bg-white p-8 rounded-3xl border border-slate-200 shadow-sm max-w-sm">
          <h1 className="text-2xl font-bold text-slate-900">Unauthorized</h1>
          <p className="mt-2 text-sm text-slate-500">You do not have permission to access the superadmin panel.</p>
          <button
            onClick={() => {
              supabaseBrowser.auth.signOut().then(() => {
                window.location.href = "/sign-in";
              });
            }}
            className="mt-6 inline-flex h-10 items-center justify-center rounded-xl bg-[#FF4800] px-6 text-sm font-semibold text-white transition hover:bg-[#D43B00]"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex ${dashboardGradientClass}`}>
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => {
          if (isLargeScreen) {
            setSidebarCollapsed(!sidebarCollapsed);
          }
        }}
      />
      <div
        className="flex-1 flex flex-col overflow-hidden transition-all duration-300 ease-in-out"
        style={{
          marginLeft: sidebarCollapsed
            ? `${sidebarCollapsedWidth}px`
            : `${sidebarExpandedWidth}px`,
        }}
      >
        <Navbar
          collapsed={sidebarCollapsed}
          setCollapsed={setSidebarCollapsed}
        />
        <main
          className={`flex-1 overflow-y-auto ${dashboardGradientClass}`}
        >
          <div
            className="min-h-full px-4 py-4 sm:px-6 lg:px-8 lg:py-6"
          >
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
