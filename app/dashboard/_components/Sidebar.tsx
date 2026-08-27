// app/dashboard/_components/Sidebar.tsx
"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type ComponentType } from "react";
import {
  ArrowLeftRight,
  BookOpen,
  Gift,
  HelpCircle,
  Inbox,
  Info,
  LayoutGrid,
  MapPin,
  Users,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import { cn } from "@/lib/utils";

interface SidebarProps {
  collapsed: boolean;
  onToggle?: () => void;
  isLargeScreen?: boolean;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

type MenuIcon = ComponentType<{ className?: string }>;

type MenuItem = {
  title: string;
  href: string;
  icon?: MenuIcon;
  iconSrc?: string;
  exact?: boolean;
};

type MenuGroup = {
  key: string;
  title: string;
  iconSrc?: string;
  icon?: MenuIcon;
  items: MenuItem[];
};

const sidebarLabelClass =
  "text-[16px] leading-[24px] font-normal tracking-[0px] whitespace-nowrap";

const sidebarSmallLabelClass =
  "text-[13px] leading-[20px] font-normal tracking-[0px] whitespace-nowrap";

const sidebarMutedLabelClass =
  "text-[13px] leading-[20px] font-normal tracking-[0px] whitespace-nowrap";

const topLevelItems: MenuItem[] = [
  { title: "Dashboard", href: "/dashboard", iconSrc: "/Dashboard.png", exact: true },
  { title: "Banner Management", href: "/dashboard/offers", iconSrc: "/bankoffers.png" },
  { title: "PassPrive Offers", href: "/dashboard/passprive-offers", iconSrc: "/request_quote.png" },
  // { title: "Bank Offers", href: "/dashboard/bank-offers", iconSrc: "/bankoffers.png" },
  { title: "Store Campaign", href: "/dashboard/store-campaign", iconSrc: "/campaign.png" },
  // { title: "Offers", href: "/dashboard/unified-offers", iconSrc: "/request_quote.png" },
  { title: "Spotlight", href: "/dashboard/spotlight", iconSrc: "/highlight.png" },
  { title: "Editorial Collections", href: "/dashboard/editorial-collections", iconSrc: "/highlight.png" },
  { title: "Promotional Cards", href: "/dashboard/promotional-cards", iconSrc: "/highlight.png" },
  { title: "Bank Offers", href: "/dashboard/offers-for-you", iconSrc: "/request_quote.png" },
  { title: "Gift Events", href: "/dashboard/gift-events", icon: Gift },
  { title: "Subscriptions", href: "/dashboard/subscription-plans", iconSrc: "/subscriptions.png" },
  //{ title: "Promocode", href: "/dashboard/promo-code", iconSrc: "/request_quote.png" },
  { title: "Transactions", href: "/dashboard/transactions", icon: ArrowLeftRight },
  { title: "Corporate Membership", href: "/dashboard/corporate-membership", icon: Users },
  { title: "Session Sorting", href: "/dashboard/sorting-module", iconSrc: "/menu.png" },
];

const groups: MenuGroup[] = [
  {
    key: "management",
    title: "Management",
    iconSrc: "/admin_panel_settings.png",
    items: [
      { title: "Restaurant Management", href: "/dashboard/manage-restaurants", iconSrc: "/restaurant_menu.png" },
      { title: "Store Management", href: "/dashboard/manage-stores", iconSrc: "/storefront.png" },
      { title: "Tourist Place Management", href: "/dashboard/manage-tourist-places", icon: MapPin },
      //{ title: "Corporate Management", href: "/dashboard/manage-corporates", iconSrc: "/corporatemangement.png" },
      { title: "User Management", href: "/dashboard/users", iconSrc: "/supervisor_account.png" },
      { title: "Admin Management", href: "/dashboard/admin", iconSrc: "/admin_panel_settings.png" },
    ],
  },
  {
    key: "in-passprive",
    title: "In your PassPrive",
    iconSrc: "/restaurant.png",
    items: [
      { title: "Restaurant", href: "/dashboard/in-your-passprive", iconSrc: "/restaurant.png" },
      { title: "Store", href: "/dashboard/store-in-your-passprive", iconSrc: "/store_mall_directory (1).png" },
    ],
  },
  {
    key: "mood",
    title: "Mood Categories",
    iconSrc: "/menu.png",
    items: [
      { title: "Restaurant Mood Category", href: "/dashboard/mood-categories", iconSrc: "/menu.png" },
      { title: "Store Mood Category", href: "/dashboard/store-mood-categories", iconSrc: "/menu.png" },
      { title: "Service Categories", href: "/dashboard/service-categories", iconSrc: "/menu.png" },
    ],
  },
  {
    key: "support",
    title: "Support & Help",
    icon: HelpCircle,
    items: [
      { title: "Support Inbox", href: "/dashboard/support-inbox", icon: Inbox },
      { title: "FAQ", href: "/dashboard/faq", icon: HelpCircle },
      { title: "Help Topics", href: "/dashboard/help-center", icon: BookOpen },
      { title: "About", href: "/dashboard/about", icon: Info },
    ],
  },
];

function isActivePath(pathname: string, href: string, exact = false) {
  const normalizedHref = href.replace(/\/$/, "");
  const normalizedPath = pathname.replace(/\/$/, "");

  if (exact) {
    return normalizedPath === normalizedHref;
  }

  return normalizedPath === normalizedHref || normalizedPath.startsWith(`${normalizedHref}/`);
}

function iconClassName(active: boolean, collapsed: boolean) {
  return cn(
    "h-4 w-4 shrink-0 object-contain transition-transform duration-200",
    collapsed ? "" : "",
    active ? "brightness-0 invert" : "brightness-0 opacity-80"
  );
}

export default function Sidebar({
  collapsed: rawCollapsed,
  onToggle,
  isLargeScreen = true,
  mobileOpen = false,
  onMobileClose,
}: SidebarProps) {
  const collapsed = isLargeScreen ? rawCollapsed : false;
  const pathname = usePathname() || "";
  const router = useRouter();
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    management: true,
    "in-passprive": true,
    mood: true,
    support: true,
  });

  const activeGroupKeys = useMemo(
    () =>
      groups.reduce<string[]>((keys, group) => {
        if (group.items.some((item) => isActivePath(pathname, item.href, item.exact))) {
          keys.push(group.key);
        }
        return keys;
      }, []),
    [pathname]
  );

  useEffect(() => {
    if (!activeGroupKeys.length) return;

    setOpenGroups((current) => {
      const next = { ...current };
      for (const key of activeGroupKeys) {
        next[key] = true;
      }
      return next;
    });
  }, [activeGroupKeys]);

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
    //{
      //title: "Corporate Management",
      //href: "/dashboard/manage-corporates",
      //iconSrc: "/corporatemangement.png",
    //},
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
      title: "Editorial Collections",
      href: "/dashboard/editorial-collections",
      iconSrc: "/highlight.png",
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
    {
      title: "Service Categories",
      href: "/dashboard/service-categories",
      iconSrc: "/menu.png",
    },
    { title: "Home Banners", href: "/dashboard/offers", iconSrc: "/bankoffers.png" },
    // { title: "Offers", href: "/dashboard/unified-offers", iconSrc: "/bankoffers.png" },
    // { title: "Spotlight", href: "/dashboard/spotlight", iconSrc: "/highlight.png" },
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

    //{ title: "Promo Code", href: "/dashboard/promo-code", iconSrc: "/request_quote.png" },
    {
      title: "Transactions",
      href: "/dashboard/transactions",
      icon: ArrowLeftRight,
    },
    {
      title: "Support Inbox",
      href: "/dashboard/support-inbox",
      icon: Inbox,
    },
    {
      title: "FAQ",
      href: "/dashboard/faq",
      icon: HelpCircle,
    },
    {
      title: "Help Topics",
      href: "/dashboard/help-center",
      icon: BookOpen,
    },
    {
      title: "About",
      href: "/dashboard/about",
      icon: Info,
    },
    //{ title: "Contact Us", href: "/dashboard/contactus", icon: Mail },
    //{ title: "Recycle", href: "/dashboard/recycle", icon: Recycle },
  ];

  const asideWidth = isLargeScreen 
    ? (collapsed ? "w-[70px] translate-x-0" : "w-[260px] translate-x-0")
    : (mobileOpen ? "w-[260px] translate-x-0 shadow-2xl" : "w-[260px] -translate-x-full");

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-55 flex flex-col overflow-hidden border-r border-[#FFE2D6] bg-white shadow-[0_10px_30px_rgba(255, 72, 0,0.06)] transition-all duration-300 ease-out",
        asideWidth
      )}
    >
      <div
        className={cn(
          "px-4 pt-6 pb-6 w-full bg-white border-b border-[#FFE2D6] relative flex items-center justify-between",
          collapsed ? "justify-center px-0" : "pl-5"
        )}
      >
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="h-11 w-11 overflow-hidden rounded-[12px] bg-[#FF4800] flex items-center justify-center shadow-sm shrink-0">
            <Image
              src="/passprive-logo-white.png"
              alt="PassPrive Logo"
              width={26}
              height={26}
              priority
              className="h-6 w-6 object-contain shrink-0"
            />
          </div>
          {(!collapsed || !isLargeScreen) && (
            <span className="text-[20px] font-bold tracking-wide text-[#FF4800] font-[family-name:var(--font-libre-baskerville)]">
              Passprivé
            </span>
          )}
        </Link>

        {!isLargeScreen && mobileOpen && (
          <button
            type="button"
            onClick={onMobileClose}
            className="p-1.5 rounded-lg text-[#FF4800] bg-[#FFF7F4] hover:bg-white border border-[#FFE2D6] transition-colors cursor-pointer flex items-center justify-center"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-3">
        <TooltipProvider delayDuration={0}>
          <div className="space-y-1.5">
            {topLevelItems.slice(0, 1).map((item) => {
              const active = isActivePath(pathname, item.href, item.exact);

              return (
                <Tooltip key={item.href}>
                  <TooltipTrigger asChild>
                    <Link
                      href={item.href}
                      className={cn(
                        "flex h-10 items-center rounded-[12px] px-4 text-[14px] leading-[20px] font-normal tracking-[0px] transition-all duration-200",
                        collapsed ? "justify-center px-0" : "gap-3",
                        active
                          ? "bg-[linear-gradient(91.59deg,#FF4800_2.56%,#FFA680_97.05%)] text-white shadow-[0_10px_18px_rgba(255, 72, 0,0.18)]"
                          : "text-[#000000] hover:bg-[#F7F2FF]"
                      )}
                    >
                      {item.iconSrc ? (
                        <Image
                          src={item.iconSrc}
                          alt={item.title}
                          width={18}
                          height={18}
                          className={iconClassName(active, collapsed)}
                        />
                      ) : item.icon ? (
                        <item.icon className={iconClassName(active, collapsed)} />
                      ) : null}

                      {!collapsed && <span className={cn(sidebarLabelClass, active && "text-white")}>{item.title}</span>}
                    </Link>
                  </TooltipTrigger>
                  {collapsed && <TooltipContent side="right">{item.title}</TooltipContent>}
                </Tooltip>
              );
            })}

            {groups.map((group) => {
              const isOpen = openGroups[group.key];
              const groupActive = group.items.some((item) => isActivePath(pathname, item.href, item.exact));

              return (
                <div key={group.key} className="space-y-1">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={() =>
                          !collapsed &&
                          setOpenGroups((current) => ({
                            ...current,
                            [group.key]: !current[group.key],
                          }))
                        }
                        className={cn(
                          "flex h-10 w-full items-center rounded-[12px] px-4 text-[14px] leading-[20px] font-normal tracking-[0px] transition-all duration-200",
                          collapsed ? "justify-center px-0" : "justify-between gap-3",
                          groupActive
                            ? "bg-[linear-gradient(91.59deg,#FF4800_2.56%,#FFA680_97.05%)] text-white shadow-[0_10px_18px_rgba(255, 72, 0,0.18)]"
                            : "text-[#000000] hover:bg-[#F7F2FF]"
                        )}
                      >
                        <span className={cn("flex items-center", collapsed ? "justify-center" : "gap-3")}> 
                          {group.iconSrc ? (
                            <Image
                              src={group.iconSrc}
                              alt={group.title}
                              width={18}
                              height={18}
                              className={iconClassName(groupActive, collapsed)}
                            />
                          ) : group.icon ? (
                            <group.icon className={iconClassName(groupActive, collapsed)} />
                          ) : null}
                          {!collapsed && <span className={cn(sidebarLabelClass, groupActive && "text-white")}>{group.title}</span>}
                        </span>

                        {!collapsed && (
                          <Image
                            src="/expand_less.png"
                            alt="Toggle section"
                            width={16}
                            height={16}
                            className={cn(
                              "h-4 w-4 shrink-0 transition-transform duration-200",
                              isOpen ? "rotate-180" : "rotate-0"
                            )}
                          />
                        )}
                      </button>
                    </TooltipTrigger>
                    {collapsed && <TooltipContent side="right">{group.title}</TooltipContent>}
                  </Tooltip>

                  {!collapsed && isOpen && (
                    <div className="space-y-1 pl-4">
                      {group.items.map((item) => {
                        const active = isActivePath(pathname, item.href, item.exact);

                        return (
                          <Tooltip key={item.href}>
                            <TooltipTrigger asChild>
                              <Link
                                href={item.href}
                                className={cn(
                                  "flex h-9 items-center rounded-[10px] px-4 text-[14px] leading-[20px] font-normal tracking-[0px] transition-all duration-200",
                                  active
                                    ? "bg-[linear-gradient(91.59deg,#FF4800_2.56%,#FFA680_97.05%)] text-white shadow-[0_10px_18px_rgba(255, 72, 0,0.16)]"
                                    : "text-[#000000] hover:bg-[#F7F2FF]"
                                )}
                              >
                                {item.iconSrc ? (
                                  <Image
                                    src={item.iconSrc}
                                    alt={item.title}
                                    width={16}
                                    height={16}
                                    className={cn(
                                      "mr-3 h-4 w-4 shrink-0 object-contain",
                                      active ? "brightness-0 invert" : "brightness-0 opacity-80"
                                    )}
                                  />
                                ) : item.icon ? (
                                  <item.icon
                                    className={cn(
                                      "mr-3 h-4 w-4 shrink-0",
                                      active ? "brightness-0 invert" : "brightness-0 opacity-80"
                                    )}
                                  />
                                ) : (
                                  <Image
                                    src="/menu.png"
                                    alt={item.title}
                                    width={16}
                                    height={16}
                                    className={cn(
                                      "mr-3 h-4 w-4 shrink-0 object-contain",
                                      active ? "brightness-0 invert" : "brightness-0 opacity-80"
                                    )}
                                  />
                                )}
                                <span className={cn(sidebarSmallLabelClass, active && "text-white", collapsed && "hidden")}>{item.title}</span>
                              </Link>
                            </TooltipTrigger>
                            {collapsed && <TooltipContent side="right">{item.title}</TooltipContent>}
                          </Tooltip>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}

            {topLevelItems.slice(1).map((item) => {
              const active = isActivePath(pathname, item.href, item.exact);

              return (
                <Tooltip key={item.href}>
                  <TooltipTrigger asChild>
                    <Link
                      href={item.href}
                      className={cn(
                        "flex h-10 items-center rounded-[12px] px-4 text-[14px] leading-[20px] font-normal tracking-[0px] transition-all duration-200",
                        collapsed ? "justify-center px-0" : "gap-3",
                        active
                          ? "bg-[linear-gradient(91.59deg,#FF4800_2.56%,#FFA680_97.05%)] text-white shadow-[0_10px_18px_rgba(255, 72, 0,0.18)]"
                          : "text-[#000000] hover:bg-[#F7F2FF]"
                      )}
                    >
                      {item.iconSrc ? (
                        <Image
                          src={item.iconSrc}
                          alt={item.title}
                          width={18}
                          height={18}
                          className={iconClassName(active, collapsed)}
                        />
                      ) : item.icon ? (
                        <item.icon className={iconClassName(active, collapsed)} />
                      ) : null}

                      {!collapsed && <span className={cn(sidebarLabelClass, active && "text-white")}>{item.title}</span>}
                    </Link>
                  </TooltipTrigger>
                  {collapsed && <TooltipContent side="right">{item.title}</TooltipContent>}
                </Tooltip>
              );
            })}
          </div>
        </TooltipProvider>
      </nav>
    </aside>
  );
}
//redeploying
