// app/dashboard/_components/Sidebar.tsx
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Users,
  CreditCard,
  BarChart3,
  Activity,
  Settings,
  Mail,
  CalendarDays,
  LogOut,
  LayoutDashboard,
  View,
  Recycle,
  Calculator,
  FileArchive,
  Code,
  Archive,
  Video,
  Table2,
  Ampersand,
  Amphora,
  BookUser,
  History,
  Bot,
  WalletMinimal,
  FileText,
  File,
  Globe,
  Hotel,
  Store,
  Spotlight,
  BadgePercent,
} from "lucide-react";
import Image from "next/image";

import { cn } from "@/lib/utils";
import {
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import { useDispatch, useSelector } from "react-redux";
import { Button } from "@/components/ui/button";

interface SidebarProps {
  collapsed: boolean;
  onToggle?: () => void; // Add this line
}

export default function Sidebar({ collapsed }: SidebarProps) {
  const user = useSelector((state: any) => state?.admin?.user);
  const pathname = usePathname();
  const router = useRouter();
  const dispatch = useDispatch();

  /** sign-out -> clear Redux -> go home */
  async function handleLogout() {
    const { error } = await supabaseBrowser.auth.signOut();
    if (error) return console.error("Sign-out failed:", error.message);
    router.push("/");
  }
  const activePlan = user?.role == "superadmin";

  const menuItems = [
    { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    {
      title: "Restaurants Management",
      href: "/dashboard/manage-restaurants",
      icon: Hotel,
    },
    {
      title: "Stores Management",
      href: "/dashboard/manage-stores",
      icon: Store,
    },
    { title: "Offers", href: "/dashboard/offers", icon: BadgePercent },
    //{ title: "Spotlight", href: "/dashboard/spotlight", icon: Spotlight },
    { title: "User Management", href: "/dashboard/users", icon: Users },

    {
      title: "Admin Management",
      href: "/dashboard/admin",
      icon: BookUser,
    },

    //{
      //title: "Manage Subscription",
      //href: "/dashboard/subscription",
      //icon: CreditCard,
    //},

    //{ title: "Reports", href: "/dashboard/reports", icon: BarChart3 },
    {
      title: "Subscriptions",
      href: "/dashboard/subscription-plans",
      icon: WalletMinimal,
    },

    { title: "Promo Code", href: "/dashboard/promo-code", icon: Code },
    //{ title: "Contact Us", href: "/dashboard/contactus", icon: Mail },
    //{ title: "Recycle", href: "/dashboard/recycle", icon: Recycle },
  ];

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-30 flex flex-col bg-white border-r border-gray-200 transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* ────────────────── BRAND ────────────────── */}
      <div className="px-3 py-3 border-b border-gray-300 flex items-center justify-start">
        <Image
          src="/LOGO.png"
          alt="No Logo Found"
          // Show smaller logo when collapsed (desktop or mobile)
          width={collapsed ? 40 : 40}
          height={collapsed ? 40 : 40}
          className="object-contain max-h-[50px] text-[#2563EB]"
        />

        {!collapsed && (
          <span className="ml-3 text-2xl font-semibold text-gray-800">
            PassPrive
          </span>
        )}
      </div>

      {/* ────────────────── NAV LINKS ────────────────── */}
      <nav className="flex-1 mt-6 overflow-y-auto">
        <TooltipProvider delayDuration={80}>
          {menuItems.map(({ title, href, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Tooltip key={href}>
                <TooltipTrigger asChild>
                  <Link
                    href={href}
                    className={cn(
                      "group mx-2 flex items-center rounded-lg px-4 py-3 text-sm transition-colors",
                      active
                        ? "bg-[#F4F8FF] text-indigo-800 font-semibold"
                        : " hover:bg-gray-100 text-gray-700 "
                    )}
                  >
                    <Icon className={cn("h-5 w-5", !collapsed && "mr-3")} />
                    {!collapsed && (
                      <span className="font-medium text-[14px]">{title}</span>
                    )}
                  </Link>
                </TooltipTrigger>

                {collapsed && (
                  <TooltipContent
                    side="right"
                    className="bg-gray-800 text-white"
                  >
                    {title}
                  </TooltipContent>
                )}
              </Tooltip>
            );
          })}
        </TooltipProvider>
      </nav>

      {/* ────────────────── LOG-OUT ────────────────── */}
      <div className="p-2 border-t">
        {collapsed ? (
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="w-full h-12 cursor-pointer text-red-600 hover:text-red-800"
                onClick={handleLogout}
              >
                <LogOut className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Log out</TooltipContent>
          </Tooltip>
        ) : (
          <Button
            variant="ghost"
            className="w-full justify-start h-12 cursor-pointer text-red-600 hover:text-red-800"
            onClick={handleLogout}
          >
            <LogOut className="mr-3 h-5 w-5" />
            Log out
          </Button>
        )}
      </div>
    </aside>
  );
}
