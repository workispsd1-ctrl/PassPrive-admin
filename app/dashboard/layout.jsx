"use client";
import { useEffect, useState } from "react";
import Sidebar from "./_components/Sidebar";
import Navbar from "./_components/Navbar";
import { useAuth } from "@/store/hooks/useAuth";



const DashboardLayout = ({ children }) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [isLargeScreen, setIsLargeScreen] = useState(false);
  const { isLoading, isAuthenticated, isAdmin } = useAuth();
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
    <div className="min-h-screen bg-white flex">
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
        <Navbar
          collapsed={sidebarCollapsed}
          setCollapsed={setSidebarCollapsed}
        />
        <main className="flex-1 p-6 overflow-y-auto bg-white">{children}</main>
      </div>
    </div>
  );
};

export default DashboardLayout;
