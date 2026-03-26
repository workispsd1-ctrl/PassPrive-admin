// app/dashboard/_components/Sidebar.tsx
"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { LayoutGrid } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import { Button } from "@/components/ui/button";

interface SidebarProps {
  collapsed: boolean;
  onToggle?: () => void; // Add this line
}

type MenuItem = {
  title: string;
  href: string;
  icon?: React.ComponentType<{ className?: string }>;
  iconSrc?: string;
};

export default function Sidebar({ collapsed }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const sidebarLabelClass = "text-[14px] leading-5 font-medium whitespace-nowrap";

  const isActiveRoute = (href: string) => {
    const normalizedHref = href.trim().replace(/\/$/, "");
    const normalizedPath = (pathname || "").replace(/\/$/, "");

    if (normalizedHref === "/dashboard") {
      return normalizedPath === "/dashboard";
    }

    return (
      normalizedPath === normalizedHref ||
      normalizedPath.startsWith(`${normalizedHref}/`)
    );
  };

  /** sign-out -> clear Redux -> go home */
  async function handleLogout() {
    const { error } = await supabaseBrowser.auth.signOut();
    if (error) return console.error("Sign-out failed:", error.message);
    router.push("/");
  }
  const menuItems: MenuItem[] = [
    { title: "Dashboard", href: "/dashboard", icon: LayoutGrid },
    {
      title: "Restaurants Management",
      href: "/dashboard/manage-restaurants",
      iconSrc: "/restaurant_menu.png",
    },
    {
      title: "Stores Management",
      href: "/dashboard/manage-stores",
      iconSrc: "/storefront.png",
    },
    {
      title: "Corporate Management",
      href: "/dashboard/manage-corporates",
      iconSrc: "/corporatemangement.png",
    },

    {
      title: "Bank Offers",
      href: "/dashboard/bank-offers",
      iconSrc: "/bankoffers.png",
    },
    {
      title: "Restaurant In Your PassPrive",
      href: "/dashboard/in-your-passprive",
      iconSrc: "/restaurant.png",
    },
    {
      title: "Store In Your PassPrive",
      href: "/dashboard/store-in-your-passprive",
      iconSrc: "/store_mall_directory (1).png",
    },
    {
      title: "Store Campaign",
      href: "/dashboard/store-campaign",
      iconSrc: "/campaign.png",
    },
    {
      title: "Restaurant Mood Categories",
      href: "/dashboard/mood-categories",
      iconSrc: "/menu.png",
    },
    {
      title: "Store Mood Categories",
      href: "/dashboard/store-mood-categories",
      iconSrc: "/menu.png",
    },
    { title: "Offers", href: "/dashboard/offers", iconSrc: "/bankoffers.png" },
    { title: "Spotlight", href: "/dashboard/spotlight", iconSrc: "/highlight.png" },
    { title: "User Management", href: "/dashboard/users", iconSrc: "/supervisor_account.png" },

    {
      title: "Admin Management",
      href: "/dashboard/admin",
      iconSrc: "/admin_panel_settings.png",
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
      iconSrc: "/subscriptions.png",
    },

    { title: "Promo Code", href: "/dashboard/promo-code", iconSrc: "/request_quote.png" },
    //{ title: "Contact Us", href: "/dashboard/contactus", icon: Mail },
    //{ title: "Recycle", href: "/dashboard/recycle", icon: Recycle },
  ];

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-30 flex flex-col bg-[linear-gradient(135deg,_#ECFEFF_0%,_#F3E8FF_100%)] border-r border-gray-200 transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* ────────────────── BRAND ────────────────── */}
      <div className="px-3 py-3 border-b border-gray-300 flex items-center justify-start gap-2">
        <div className="flex-shrink-0 h-10 w-10 rounded-lg overflow-hidden flex items-center justify-center">
          <Image
            src="/passprive.jpeg"
            alt="PassPrive Logo"
            width={40}
            height={40}
            className="h-full w-full object-cover"
            priority
          />
        </div>

        {!collapsed && (
          <span className="text-xl font-bold text-gray-900 tracking-tight">
            PassPrive
          </span>
        )}
      </div>

      {/* ────────────────── NAV LINKS ────────────────── */}
      <nav className="flex-1 mt-6 overflow-y-auto">
        <TooltipProvider delayDuration={80}>
          {menuItems.map(({ title, href, icon: Icon, iconSrc }) => {
            const active = isActiveRoute(href);
            return (
              <Tooltip key={href}>
                <TooltipTrigger asChild>
                  <Link
                    href={href}
                    className={cn(
                      "group mx-2 flex items-center rounded-lg px-4 py-3 transition-colors",
                      active
                        ? "rounded-[16px] bg-[linear-gradient(90deg,#5B10B5_0%,#9E69EA_100%)] text-white"
                        : "hover:bg-gray-100 text-gray-700"
                    )}
                  >
                    {iconSrc ? (
                      <Image
                        src={iconSrc}
                        alt={title}
                        width={20}
                        height={20}
                        className={cn(
                          "h-5 w-5 shrink-0 object-contain",
                          !collapsed && "mr-3",
                          active ? "brightness-0 invert" : "brightness-0"
                        )}
                      />
                    ) : Icon ? (
                      <Icon className={cn("h-5 w-5", !collapsed && "mr-3")} />
                    ) : null}
                    {!collapsed && (
                      <span className={sidebarLabelClass}>{title}</span>
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
      <div className="p-2 border-t border-gray-300">
        {collapsed ? (
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="w-full h-12 cursor-pointer text-red-600 hover:text-red-800"
                onClick={handleLogout}
              >
                <Image
                  src="/login.png"
                  alt="Log out"
                  width={20}
                  height={20}
                  className="h-5 w-5 object-contain brightness-0"
                />
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
            <Image
              src="/login.png"
              alt="Log out"
              width={20}
              height={20}
              className="mr-3 h-5 w-5 object-contain brightness-0"
            />
            <span className={sidebarLabelClass}>Log out</span>
          </Button>
        )}
      </div>
    </aside>
  );
}
