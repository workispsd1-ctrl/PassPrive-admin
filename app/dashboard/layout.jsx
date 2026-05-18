"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "./_components/Sidebar";
import Navbar from "./_components/Navbar";
import { useAuth } from "@/store/hooks/useAuth";



const DashboardLayout = ({ children }) => {
  const pathname = usePathname();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [isLargeScreen, setIsLargeScreen] = useState(false);
  const { isLoading, isAuthenticated, isAdmin } = useAuth();
  const isDashboardHome = pathname === "/dashboard";
  const dashboardGradientClass =
    "bg-[linear-gradient(135deg,_#ECFEFF_0%,_#F3E8FF_100%)]";
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

  // if (isLoading) {
  //   return <Loader />;
  // }

  // if (!isAuthenticated || !isAdmin) {
  //   return (
  //     <div className="flex h-screen w-full items-center justify-center">
  //       <div className="text-center">
  //         <h1 className="text-2xl font-bold">Unauthorized</h1>
  //         <p>You don&apos;t have permission to access this page</p>
  //       </div>
  //     </div>
  //   );
  // }

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
        className={`flex-1 flex flex-col overflow-hidden transition-all duration-300 ease-in-out ${
          sidebarCollapsed ? "ml-16" : "ml-64"
        }`}
      >
        {!isDashboardHome && (
          <Navbar
            collapsed={sidebarCollapsed}
            setCollapsed={setSidebarCollapsed}
          />
        )}
        <main
          className={`flex-1 overflow-y-auto ${dashboardGradientClass}`}
        >
          <div
            className={
              isDashboardHome
                ? "min-h-full px-3 py-3 md:px-4 md:py-4"
                : "min-h-full px-4 py-4 sm:px-6 lg:px-8 lg:py-6"
            }
          >
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
