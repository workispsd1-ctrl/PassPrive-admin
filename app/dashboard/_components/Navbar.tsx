import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, RefreshCw, Download } from "lucide-react";
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

const pathName: any = {
  "/dashboard": "Dashboard",
  "/dashboard/users": "User Management",
  "/dashboard/manage-restaurants": "Restaurant Management",
  "/dashboard/manage-stores": "Stores Management",
  "/dashboard/offers": "Offer Management",
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
  "/dashboard/offers/new": "Add New Offer",
  "/dashboard/manage-corporates": "Corporate Management",
};

const Navbar = ({ setCollapsed, collapsed }: NavbarProps) => {
  const dispatch = useDispatch();
  const pathname = usePathname();
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

  return (
    <header className="h-[74px] bg-white border-b border-gray-200 flex items-center justify-between px-6">
      <div className="flex items-center space-x-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed?.(!collapsed)}
          className="h-10 w-8 text-gray-600 hover:text-indigo-800 cursor-pointer"
        >
          {collapsed ? (
            <ChevronRight className="h-6 w-6" />
          ) : (
            <ChevronLeft className="h-6 w-6" />
          )}
        </Button>
        <span className="lg:text-lg md:text-md text-sm font-bold text-gray-800">
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

            if (pathname === "/dashboard" && userRole) {
              return `${title} - ${
                userRole.charAt(0).toUpperCase() + userRole.slice(1)
              }`;
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
      </div>

      <div className="flex items-center space-x-2">
        {pathName[pathname] !== "Training Videos" && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleExport}
            className="cursor-pointer text-gray-600 hover:text-gray-900"
            aria-label="Export"
          >
            <Download className="w-5 h-5" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRefresh}
          className="cursor-pointer text-gray-600 hover:text-gray-900"
          aria-label="Refresh"
        >
          <RefreshCw className="w-5 h-5" />
        </Button>
      </div>
    </header>
  );
};

export default Navbar;
