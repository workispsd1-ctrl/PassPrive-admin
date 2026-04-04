import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";
import { useDispatch, useSelector } from "react-redux";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import { usePathname } from "next/navigation";
import { exportToExcel } from "@/lib/exportToExcel";
import { showToast } from "@/hooks/useToast";
import { useEffect, useState } from "react";
import { exportDashboardToExcel } from "@/lib/exportDashboard";
import { RootState } from "@/store/store";

interface NavbarProps {
  sidebarCollapsed?: boolean;
  setSidebarCollapsed?: (collapsed: boolean) => void;
  setSidebarOpen?: (open: boolean) => void;
  collapsed?: boolean;
  setCollapsed?: (collapsed: boolean) => void;
}

const pathName: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/dashboard/bank-offers": "Bank Offers Manager",
  "/dashboard/users": "User Management",
  "/dashboard/manage-restaurants": "Restaurant Management",
  "/dashboard/manage-stores": "Stores Management",
  "/dashboard/offers": "Banner Management",
  "/dashboard/passprive-offers": "PassPrive Offers",
  "/dashboard/passprive-offers/new": "Create PassPrive Offer",
  "/dashboard/manage-restaurants/add": " Add Restaurant",
  "/dashboard/spotlight": "Spotlight Management",
  "/dashboard/users/[id]": "User Subscription",
  "/dashboard/subscription": "Manage Subscription",
  "/dashboard/reports": "Reports",
  "/dashboard/promo-code": "Promo Code",
  "/dashboard/settings": "Settings",
  "/dashboard/contactus": "Contact Us",
  "/dashboard/recycle": "Recycle",
  "/dashboard/admin": "Admin Management",
  "/dashboard/users/[id]/edit": "Edit User Details",
  "/dashboard/subscription-plans": "Subscription Plans",
  "/dashboard/users/[id]/leads": "Edit Leads",
  "/dashboard/leads": "Leads",
  "/dashboard/invoices": "Invoices",
  "/dashboard/webhook": "Webhook",
  "/dashboard/offers/new": "Add Home Hero Offer",
  "/dashboard/manage-corporates": "Corporate Management",
  "/dashboard/store-campaign": "Store Campaign",
  "/dashboard/in-your-passprive": "Restaurant In Your PassPrive",
  "/dashboard/store-in-your-passprive": "Store In Your PassPrive",
  "/dashboard/unified-offers": "Offers",
  "/dashboard/unified-offers/new": "Create Offer",
  "/dashboard/unified-offers/[id]": "Edit Offer",
  "/dashboard/mood-categories": "Restaurant Mood Categories",
  "/dashboard/store-mood-categories": "Store Mood Categories",
  "/dashboard/transactions": "Transactions",
  "/dashboard/editorial-collections": "Editorial Collections",
  "/dashboard/editorial-collections/[id]": "Editorial Collection",
};

const pathDescription: Record<string, string> = {
  "/dashboard/bank-offers": "Create and manage promotional offers",
  "/dashboard/in-your-passprive": "Manage the restaurant cards and linked venues shown in the Dine In home section.",
  "/dashboard/store-in-your-passprive": "Manage the store cards and linked stores shown in the Stores home section.",
  "/dashboard/store-campaign": "Create and manage store home campaigns and the stores attached to each section.",
  "/dashboard/unified-offers": "Create, edit, and manage PassPrive, bank, and merchant offers in one workspace.",
  "/dashboard/unified-offers/new": "Set up a new offer with rules, schedule, and targeting.",
  "/dashboard/transactions": "View store and restaurant payment details in a single workspace.",
  "/dashboard/mood-categories": "Create, edit, and organize restaurant category cards shown in the app.",
  "/dashboard/store-mood-categories": "Create, edit, and organize store category cards shown in the app.",
  "/dashboard/editorial-collections": "Create and manage editorial collections shown in the app.",
};

const Navbar = ({ setCollapsed, collapsed }: NavbarProps) => {
  const dispatch = useDispatch();
  const pathname = usePathname();
  const isBankOffersPage = pathname === "/dashboard/bank-offers";
  const navbarDescription = pathDescription[pathname] || null;
  const [seminarId, setSeminarId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    const id = localStorage.getItem("seminarId");
    setSeminarId(id);
  }, []);

  const handleRefresh = () => {
    window.location.reload();
  };

  const handleExportUserFile = async () => {
    try {
      const { data, error, count } = await supabaseBrowser
        .from("users")
        .select("*", { count: "exact" })
        .eq("role", "user")
        .order("created_at", { ascending: false });
      if (error) {
        throw new Error("Something went wrong!");
      }
      await exportToExcel(data, "users");
    } catch (error) {
      showToast({
        title: "Error",
        description: "Something went wrong!",
      });
    }
  };
  const handleExportAdminFile = async () => {
    try {
      const { data, error, count } = await supabaseBrowser
        .from("users")
        .select("*", { count: "exact" })
        .neq("role", "user") // 👈 exclude normal users
        .order("created_at", { ascending: false });

      if (error) throw new Error("Something went wrong!");

      await exportToExcel(data, "admins");
    } catch (error) {
      showToast({
        title: "Error",
        description: "Something went wrong!",
      });
    }
  };

  const handleExportSubscriptionFile = async () => {
    try {
      const { data, error, count } = await supabaseBrowser
        .from("user_subscription")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false });

      if (error) {
        throw new Error("Something went wrong!");
      }

      await exportToExcel(data, "subscription");
    } catch (error) {
      showToast({
        title: "Error",
        description: "Something went wrong!",
      });
    }
  };

  const handleExportRecycleBinFile = async () => {
    try {
      const { data, error, count } = await supabaseBrowser
        .from("recycle_bin")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false });

      if (error) {
        throw new Error("Something went wrong!");
      }

      await exportToExcel(data, "recycle_bin");
    } catch (error) {
      showToast({
        title: "Error",
        description: "Something went wrong while exporting recycle bin data!",
      });
    }
  };

  const handleExportInvoiceFile = async () => {
    try {
      const { data, error, count } = await supabaseBrowser
        .from("invoice")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false });
      if (error) {
        throw new Error("Something went wrong!");
      }
      await exportToExcel(data, "invoices");
    } catch (error) {
      showToast({
        title: "Error",
        description: "Something went wrong!",
      });
    }
  };

  useEffect(() => {
    const fetchUserRole = async () => {
      const {
        data: { user },
      } = await supabaseBrowser.auth.getUser();

      if (user) {
        const { data, error } = await supabaseBrowser
          .from("users")
          .select("role")
          .eq("id", user.id)
          .single();

        if (!error && data?.role) {
          setUserRole(data.role);
        }
      }
    };

    fetchUserRole();
  }, []);

  const handleExportContactUsFile = async () => {
    try {
      const { data, error, count } = await supabaseBrowser
        .from("contact_us_messages")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false });
      if (error) {
        throw new Error("Something went wrong!");
      }
      await exportToExcel(data, "contact_inquiries");
    } catch (error) {
      showToast({
        title: "Error",
        description: "Something went wrong!",
      });
    }
  };

  const handleExporSeminartSignupFile = async (
    seminarId: string,
    tab: string
  ) => {
    try {
      if (tab == "signup") {
        const { data, error } = await supabaseBrowser
          .from("seminar_signup")
          .select("* ,seminars(*)", { count: "exact" })
          .eq("seminar_id", seminarId)
          .order("created_at", { ascending: false });

        if (error) {
          throw new Error("Something went wrong!");
        }

        await exportToExcel(data, "saminar_signup");
      } else {
        const { data, error } = await supabaseBrowser
          .from("seminar_registration")
          .select("* ,seminars(*)", { count: "exact" })
          .eq("saminarId", seminarId)
          .order("created_at", { ascending: false });

        if (error) {
          throw new Error("Something went wrong!");
        }
        await exportToExcel(data, "saminar_registration");
      }
    } catch (error) {
      showToast({
        title: "Error",
        description: "Something went wrong!",
      });
    }
  };

  const handleExporSeminartFile = async () => {
    try {
      const { data, error, count } = await supabaseBrowser
        .from("seminars")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false });
      if (error) {
        throw new Error("Something went wrong!");
      }
      await exportToExcel(data, "saminars");
    } catch (error) {
      showToast({
        title: "Error",
        description: "Something went wrong!",
      });
    }
  };

  const handleExporVipTiertFile = async () => {
    try {
      const { data, error, count } = await supabaseBrowser
        .from("vip_tiers")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false });
      if (error) {
        throw new Error("Something went wrong!");
      }
      await exportToExcel(data, "viptiers");
    } catch (error) {
      showToast({
        title: "Error",
        description: "Something went wrong!",
      });
    }
  };

  const handleExportSignUpFile = async () => {
    try {
      const { data, error, count } = await supabaseBrowser
        .from("seminar_signup")
        .select("* ,seminars(*)", { count: "exact" })
        .eq("seminar_id", seminarId)
        .order("created_at", { ascending: false });
      if (error) {
        throw new Error("Something went wrong!");
      }
      await exportToExcel(data, "saminar_signup");
    } catch (error) {
      showToast({
        title: "Error",
        description: "Something went wrong!",
      });
    }
  };

  const handleExportRegistrationFile = async () => {
    try {
      const { data, error, count } = await supabaseBrowser
        .from("seminar_registration")
        .select("*", { count: "exact" })
        .eq("saminarId", seminarId)
        .order("created_at", { ascending: false });
      if (error) {
        throw new Error("Something went wrong!");
      }
      await exportToExcel(data, "saminar_registration");
    } catch (error) {
      showToast({
        title: "Error",
        description: "Something went wrong!",
      });
    }
  };

  const handleExportToolFile = async () => {
    try {
      const { data, error, count } = await supabaseBrowser
        .from("details")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false });
      if (error) {
        throw new Error("Something went wrong!");
      }
      await exportToExcel(data, "invoices");
    } catch (error) {
      showToast({
        title: "Error",
        description: "Something went wrong!",
      });
    }
  };

  // New handler for exporting reports
  const handleExportReports = async () => {
    try {
      const { data, error } = await supabaseBrowser
        .from("cron_reports")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) {
        throw new Error("Something went wrong fetching reports!");
      }
      // Prepare the data for export by flattening the JSON objects
      const flattenedData = data.map((report) => ({
        id: report.id,
        name: report.name,
        type: report.type,
        date_range: report.data.date_range,
        total_count: report.data.total_count,
        created_at: report.created_at,
      }));
      await exportToExcel(flattenedData, "cron_reports");
      showToast({
        title: "Success",
        description: "Reports exported successfully!",
      });
    } catch (error) {
      console.error("Export failed:", error);
      showToast({
        title: "Error",
        description: "Something went wrong while exporting reports!",
      });
    }
  };

  const stats = useSelector((state: RootState) => state.dashboard);
  const tab = useSelector((state: RootState) => state.dashboard.SeminarTabName);

  const handleExport = async () => {
    if (pathname === "/dashboard") {
      return await exportDashboardToExcel(stats);
    } else if (pathname === "/dashboard/users") {
      return await handleExportUserFile();
    } else if (pathname === "/dashboard/subscription") {
      await handleExportSubscriptionFile();
    } else if (pathname === "/dashboard/admin") {
      return await handleExportAdminFile();
    } else if (pathname === "/dashboard/invoices") {
      await handleExportInvoiceFile();
    } else if (pathname === "/dashboard/contactus") {
      await handleExportContactUsFile();
    } else if (pathname === "/dashboard/seminar") {
      await handleExporSeminartFile();
    } else if (pathname === "/dashboard/viptier") {
      await handleExporVipTiertFile();
    } else if (pathname === "/dashboard/details") {
      await handleExportToolFile();
    } else if (pathname === "/dashboard/recycle") {
      await handleExportRecycleBinFile();
    } else if (pathname === "/dashboard/details") {
      const codeType = localStorage.getItem("subRoute");
      if (codeType === "registration") {
        await handleExportRegistrationFile();
      } else {
        await handleExportSignUpFile();
      }
    } else if (pathname === "/dashboard/reports") {
      await handleExportReports();
    }
  };

  const roleLabel = "Super Admin";

  return (
    <header
      className={`flex justify-between bg-[linear-gradient(135deg,_#ECFEFF_0%,_#F3E8FF_100%)] px-6 ${
        navbarDescription ? "h-20 items-start py-4" : "h-14 items-center"
      }`}
    >
      <div className="flex items-center">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed?.(!collapsed)}
          className="mr-2 rounded-md p-1 text-[#5b6473] transition hover:bg-slate-200/40"
        >
          {collapsed ? (
            <ChevronRight className="h-5 w-5" />
          ) : (
            <ChevronLeft className="h-5 w-5" />
          )}
        </Button>
        <div>
          <span className="text-[20px] font-normal leading-[32px] text-[#1D293D]">
            {(() => {
              let title = pathName[pathname] || "";

              // Handle User Subscription page
              if (
                pathname.startsWith("/dashboard/users/") &&
                pathname.split("/").length === 4
              ) {
                title = pathName["/dashboard/users/[id]"];
              }

              // Handle Edit User page
              if (
                pathname.startsWith("/dashboard/users/") &&
                pathname.endsWith("/edit")
              ) {
                title = pathName["/dashboard/users/[id]/edit"];
              }
              if (
                pathname.startsWith("/dashboard/users/") &&
                pathname.endsWith("/leads")
              ) {
                title = pathName["/dashboard/users/[id]/leads"];
              }

              if (
                pathname.startsWith("/dashboard/editorial-collections/") &&
                pathname.split("/").length === 4
              ) {
                title = pathName["/dashboard/editorial-collections/[id]"];
              }

              if (
                pathname.startsWith("/dashboard/unified-offers/") &&
                pathname.split("/").length === 4 &&
                !pathname.endsWith("/new")
              ) {
                title = pathName["/dashboard/unified-offers/[id]"];
              }

              if (pathname === "/dashboard") {
                return `${title} - Super Admin`;
              }
              // Handle Store Details page
              if (
                pathname.startsWith("/dashboard/manage-stores/") &&
                pathname.split("/").length === 4
              ) {
                title = "Store Details";
              }

              // Handle Restaurant Details page (if you want similar)
              if (
                pathname.startsWith("/dashboard/manage-restaurants/") &&
                pathname.split("/").length === 4
              ) {
                title = "Restaurant Details";
              }

              return title;
            })()}
          </span>
          {navbarDescription ? <p className="text-sm leading-5 text-[#667085]">{navbarDescription}</p> : null}
        </div>
      </div>

      <div className="flex items-center gap-3 text-[#1f2a37]">
        {pathName[pathname] !== "Training Videos" && (
          <button
            type="button"
            onClick={handleExport}
            className="rounded-md p-1.5 transition hover:bg-slate-200/40"
            aria-label="Export"
          >
            <Image
              src="/download.png"
              alt="Download"
              width={16}
              height={16}
              className="h-4 w-4 object-contain"
            />
          </button>
        )}
        <button
          type="button"
          onClick={handleRefresh}
          className="rounded-md p-1.5 transition hover:bg-slate-200/40"
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
        <div className="flex items-center gap-2 rounded-full border border-[#D0D5DD] bg-transparent px-2 py-[2px]">
          <div className="h-7 w-7 rounded-full bg-[#929292]" />
          <span className="text-[14px] font-normal leading-[20px] text-[#314158]">
            {roleLabel}
          </span>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
