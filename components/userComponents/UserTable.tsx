// components/users/UserTable.tsx
import {
  JSXElementConstructor,
  ReactElement,
  ReactNode,
  ReactPortal,
  useState,
} from "react";
import { format, parseISO } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  Download,
  FileText,
  History,
  Ban,
  CheckCircle,
  File,
} from "lucide-react";
import Modal from "@/app/dashboard/_components/Modal";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import { exportToExcel } from "@/lib/exportToExcel";
import { showToast } from "@/hooks/useToast";
import PaginationBar from "@/app/dashboard/_components/Pagination";
import { displayValidTill } from "@/lib/dateTimeFormatter";
import { toast } from "sonner";
import Link from "next/link";
interface User {
  id: string;
  display_name?: string;
  email: string;
  phone?: string;
  status?: string;
  subscription?: string;
  created_at: string;
  user_subscription?: UserSubscription[];
  full_name?: string;
  last_opened?: string | null;
  membership?: string | null;
  membership_tier?: string | null;
  // Added new property to the User interface
  fb_chatbot_user_blocked?: boolean;
}
interface UserSubscription {
  created_at: string;
  end_date: string;
  start_date: string;
}
interface UserTableProps {
  users: User[];
  setPage: React.Dispatch<React.SetStateAction<number>>;
  totalPages: number;
  page: number;
  handleExportFile: any;
  totalRecord: number;
  limit: number;
  setLimit?: React.Dispatch<React.SetStateAction<number>>;
  setDeleteRefresh?: React.Dispatch<React.SetStateAction<any>>;
}
export const UserTable = ({
  users,
  setPage,
  totalPages,
  page,
  handleExportFile,
  totalRecord,
  limit,
  setLimit,
  setDeleteRefresh,
}: UserTableProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isOpenDeleted, setIsOpenDeleted] = useState(false);
  const [rowData, setRowData] = useState<any>(null);
  const [selectedData, setSelectedData] = useState<any>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const formatStartDateIST = (d?: string | null) => {
    if (!d) return "-";
    const dt = new Date(d);
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "long",
      day: "2-digit",
      weekday: "long",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }).formatToParts(dt);

    const map: Record<string, string> = {};
    parts.forEach((p) => {
      if (p.type !== "literal") map[p.type] = p.value;
    });

    const month = map.month || "";
    const day = map.day || "";
    const year = map.year || "";
    const weekday = map.weekday || "";
    const hour = map.hour || "";
    const minute = map.minute || "";
    const dayPeriodRaw = (map.dayPeriod || "").toLowerCase();
    const dayPeriod = dayPeriodRaw === "pm" ? "p.m." : "a.m.";

    return `${month} ${day}, ${year} ${weekday} ${hour}:${minute} ${dayPeriod}`;
  };

  const handleRefresh = () => {
    setPage(1);
    if (setDeleteRefresh) {
      setDeleteRefresh(Math.random());
    }
  };
  const handleUserDetails = async (user: User) => {
    console.log(user, "userssss");
    setSelectedData(user);

    console.log("user data", user);
    setIsOpen(true);
  };
  // Toggles the block status of a user
  const handleToggleBlockUser = async (userId: string, isBlocked: boolean) => {
    const newBlockStatus = !isBlocked;
    const { error } = await supabaseBrowser
      .from("users")
      .update({ fb_chatbot_user_blocked: newBlockStatus })
      .eq("id", userId);
    if (error) {
      toast.error(`Error ${newBlockStatus ? "blocking" : "unblocking"} user`);
    } else {
      toast.success(
        `User ${newBlockStatus ? "blocked" : "unblocked"} successfully!`
      );
      handleRefresh();
    }
  };

  const handleDeleteUser = async () => {
    if (!rowData) return;
    try {
      setLoading(true);
      const res = await fetch("/api/delete-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: rowData.id }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to delete user");
        return;
      }

      toast.success("User deleted successfully!");
      handleRefresh();
      setIsConfirmOpen(false);
      setRowData(null);
    } catch (err: any) {
      toast.error(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const formatToIndia = (iso?: string | null) => {
    if (!iso) return "-";
    try {
      return new Date(iso).toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
        weekday: "long",
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    } catch {
      return "-";
    }
  };

  return (
    <>
      <div className="overflow-x-auto">
        {/* <div className="flex justify-end mb-4">
          <button
            onClick={() => handleExportFile()}
            className="cursor-pointer bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition flex items-center gap-2"
          >
            <Download size={16} />
            Export
          </button>
        </div> */}
        <table className="w-full border-collapse">
          <thead className="bg-white">
            <tr className="border-b border-gray-200 ">
              <th className="text-left py-3 lg:px-6 md:px-6 px-6 font-semibold text-[#1D293D] text-[12px]">
                NAME
              </th>
              <th className="text-left py-3 lg:px-6 md:px-6 px-6 font-semibold text-[#1D293D] text-[12px]">
                PHONE
              </th>
              <th className="text-left py-3 lg:px-6 md:px-6 px-6 font-semibold text-[#1D293D] text-[12px]">
                EMAIL
              </th>
              <th className="text-left py-3 lg:px-6 md:px-6 px-6 font-semibold text-[#1D293D] text-[12px]">
                PLAN
              </th>
              <th className="text-left py-3 lg:px-6 md:px-6 px-6 font-semibold text-[#1D293D] text-[12px]">
                SUBSCRIPTION DATE
              </th>
              <th className="text-left py-3 lg:px-6 md:px-6 px-6 font-semibold text-[#1D293D] text-[12px]">
                JOIN DATE
              </th>
              <th className="text-left py-3 lg:px-6 md:px-6 px-6 font-semibold text-[#1D293D] text-[12px]">
                LAST OPENED
              </th>
              <th className="text-left py-3 lg:px-6 md:px-6 px-6 font-semibold text-[#1D293D] text-[12px]">
                ACTIONS
              </th>
            </tr>
          </thead>
          <tbody className="bg-[linear-gradient(135deg,_#ECFEFF_0%,_#F3E8FF_100%)]">
            {users.length > 0 ? (
              users.map((user, idx) => (
                <tr
                  key={user.id}
                  className={`border-b border-gray-200 hover:bg-white/20 transition-colors lg:text-md md:text-md text-sm ${
                    idx !== users.length - 1 ? "border-b" : ""
                  }`}
                >
                  <td className="py-3 px-6 text-[#1D293D] font-medium">{user.full_name || user.display_name || "-"}</td>
                  <td className="py-3 px-6 text-center text-[#5b6473]">
                    {user.phone ?? "-"}
                  </td>
                  <td className="py-3 px-6 text-[#5b6473]">{user.email}</td>
                  <td className="py-3 px-6">
                    <StatusBadge status={user.membership_tier || user.membership || "none"} />
                  </td>
                  <td className="py-3 px-6 text-[#5b6473]">
                    {(user.user_subscription?.length ?? 0) > 0
                      ? formatStartDateIST(
                          user.user_subscription[0]?.start_date ??
                            user.user_subscription[0]?.created_at
                        )
                      : "-"}
                  </td>
                  <td className="py-3 px-6 text-[#5b6473]">
                    {/* {format(parseISO(user.created_at), "MMM dd, yyyy")} */}
                    {displayValidTill(user.created_at, user.created_at)}
                  </td>
                  <td className="py-4 px-6 text-[#5b6473]">
                    {formatToIndia(user.last_opened)}
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="cursor-pointer p-0 h-auto hover:bg-transparent"
                        onClick={() => {
                          setIsConfirmOpen(true);
                          setRowData(user);
                        }}
                      >
                        <Image
                          src="/delete.png"
                          alt="Delete"
                          width={16}
                          height={16}
                          className="w-4 h-4"
                        />
                      </Button>
                      <button
                        onClick={() => {
                          handleUserDetails(user);
                        }}
                        className="cursor-pointer p-0"
                      >
                        <Image
                          src="/view.png"
                          alt="View"
                          width={16}
                          height={16}
                          className="w-4 h-4"
                        />
                      </button>
                      <Link href={`/dashboard/users/${user.id}/edit`}>
                        <button className="cursor-pointer p-0">
                          <Image
                            src="/edit.png"
                            alt="Edit"
                            width={16}
                            height={16}
                            className="w-4 h-4"
                          />
                        </button>
                      </Link>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={8} className="h-[20vh]">
                  <div className="flex flex-col justify-center items-center h-full text-gray-900">
                    <FileText className="w-16 h-16 text-gray-400 mb-4" />
                    <h2 className="text-2xl font-semibold mb-2">No Data Found</h2>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <div className="mt-auto">
          <PaginationBar
            page={page}
            setPage={setPage}
            totalPage={totalPages}
            totalRecord={totalRecord}
            limit={limit}
            setLimit={setLimit}
          />
        </div>
      </div>

      <Modal isOpen={isConfirmOpen} onClose={() => setIsConfirmOpen(false)}>
        <h2 className="text-lg font-semibold mb-2">Are you sure?</h2>
        <p className="text-sm text-gray-600 mb-4">
          This action cannot be undone.
        </p>
        <div className="flex justify-end gap-2">
          <Button
            variant="secondary"
            onClick={() => setIsConfirmOpen(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDeleteUser}
            disabled={loading}
          >
            {loading ? "Deleting..." : "Delete"}
          </Button>
        </div>
      </Modal>

      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)}>
        <div className="max-w-md max-h-[90vh] overflow-y-auto mx-auto bg-white p-6">
          {/* Header */}
          <div className="flex justify-between items-center border-b pb-4 mb-4">
            <h2 className="text-2xl font-semibold text-gray-800">
              {selectedData?.full_name || selectedData?.display_name || "User"}
            </h2>
            <span
              className={`text-[12px] font-semibold px-3 py-1 rounded-full ${
                selectedData?.membership_tier !== "none"
                  ? "bg-green-100 text-green-700"
                  : "bg-gray-200 text-gray-700"
              }`}
            >
              {selectedData?.membership_tier || "none"}
            </span>
          </div>

          {/* User Details */}
          <div className="space-y-3 text-sm text-black">
            {/* BASIC INFO */}
            <div className="flex justify-between">
              <span className="font-semibold text-gray-600">Full Name:</span>
              <span>{selectedData?.full_name || selectedData?.display_name || "-"}</span>
            </div>

            <div className="flex justify-between">
              <span className="font-semibold text-gray-600">Email:</span>
              <span>{selectedData?.email || "-"}</span>
            </div>

            <div className="flex justify-between">
              <span className="font-semibold text-gray-600">Phone:</span>
              <span>{selectedData?.phone || "-"}</span>
            </div>

            <div className="flex justify-between">
              <span className="font-semibold text-gray-600">Role:</span>
              <span>{selectedData?.role || "-"}</span>
            </div>

            {/* PERSONAL */}
            <div className="flex justify-between">
              <span className="font-semibold text-gray-600">Gender:</span>
              <span>{selectedData?.gender || "-"}</span>
            </div>

            <div className="flex justify-between">
              <span className="font-semibold text-gray-600">Date of Birth:</span>
              <span>{selectedData?.dob || "-"}</span>
            </div>

            {/* LOCATION */}
            <div className="flex justify-between">
              <span className="font-semibold text-gray-600">
                Default Address:
              </span>
              <span className="break-all">
                {selectedData?.default_address || "-"}
              </span>
            </div>

            {/* TIMESTAMPS */}
            <div className="flex justify-between">
              <span className="font-semibold text-gray-600">Last Opened:</span>
              <span>
                {selectedData?.last_opened
                  ? formatToIndia(selectedData.last_opened)
                  : "-"}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="font-semibold text-gray-600">Last Login:</span>
              <span>
                {selectedData?.last_login
                  ? formatToIndia(selectedData.last_login)
                  : "-"}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="font-semibold text-gray-600">Created At:</span>
              <span>
                {selectedData?.created_at
                  ? formatToIndia(selectedData.created_at)
                  : "-"}
              </span>
            </div>

            {/* MEMBERSHIP */}
            <div className="flex justify-between">
              <span className="font-semibold text-gray-600">Membership:</span>
              <span>{selectedData?.membership || "Free"}</span>
            </div>

            <div className="flex justify-between">
              <span className="font-semibold text-gray-600">
                Membership Tier:
              </span>
              <span>{selectedData?.membership_tier || "none"}</span>
            </div>

            <div className="flex justify-between">
              <span className="font-semibold text-gray-600">
                Membership Start:
              </span>
              <span>{selectedData?.membership_started || "-"}</span>
            </div>

            <div className="flex justify-between">
              <span className="font-semibold text-gray-600">
                Membership Expiry:
              </span>
              <span>{selectedData?.membership_expiry || "-"}</span>
            </div>

            {/* BUSINESS */}
            <div className="flex justify-between">
              <span className="font-semibold text-gray-600">Business Name:</span>
              <span>{selectedData?.business_name || "-"}</span>
            </div>

            <div className="flex justify-between">
              <span className="font-semibold text-gray-600">
                Business Address:
              </span>
              <span className="break-all">
                {selectedData?.business_address || "-"}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="font-semibold text-gray-600">GST Number:</span>
              <span>{selectedData?.gst_number || "-"}</span>
            </div>

            {/* KYC */}
            <div className="flex justify-between">
              <span className="font-semibold text-gray-600">KYC Verified:</span>
              <span>{selectedData?.kyc_verified ? "Yes" : "No"}</span>
            </div>

            {/* REFERRALS */}
            <div className="flex justify-between">
              <span className="font-semibold text-gray-600">Referral Code:</span>
              <span>{selectedData?.referral_code || "-"}</span>
            </div>

            <div className="flex justify-between">
              <span className="font-semibold text-gray-600">Referred By:</span>
              <span>{selectedData?.referred_by || "-"}</span>
            </div>

            {/* CORPORATE */}
            <div className="flex justify-between">
              <span className="font-semibold text-gray-600">Corporate Code:</span>
              <span>{selectedData?.corporate_code || "-"}</span>
            </div>

            <div className="flex justify-between">
              <span className="font-semibold text-gray-600">
                Corporate Status:
              </span>
              <span>{selectedData?.corporate_code_status || "-"}</span>
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
};
const PlanBadge = ({ plan }: { plan?: string }) => {
  const planValue = plan || "Free";
  const getVariantAndClass = () => {
    switch (planValue.toLowerCase()) {
      case "enterprise":
        return {
          variant: "default" as const,
          className: "bg-[#5E189D] hover:bg-[#4A1278]",
        };
      case "professional":
        return {
          variant: "secondary" as const,
          className: "bg-purple-100 text-purple-800 hover:bg-purple-200",
        };
      default:
        return { variant: "outline" as const, className: "" };
    }
  };
  const { variant, className } = getVariantAndClass();
  return (
    <Badge variant={variant} className={className}>
      {planValue}
    </Badge>
  );
};
const StatusBadge = ({ status }: { status?: string }) => {
  const value = status?.trim().toLowerCase() || "none";

  const map: Record<string, string> = {
    active: "bg-green-100 text-green-700",
    canceled: "bg-red-100 text-red-600",
    past_due: "bg-yellow-100 text-yellow-700",
    unpaid: "bg-yellow-100 text-yellow-700",
    none: "bg-gray-200 text-gray-700",
    free: "bg-gray-200 text-gray-700",
  };

  const labelMap: Record<string, string> = {
    active: "Active",
    canceled: "Canceled",
    past_due: "Past Due",
    unpaid: "Unpaid",
    none: "None",
    free: "Free",
  };

  return (
    <span
      className={`px-2 py-1 rounded-full text-[12px] font-semibold ${
        map[value] ?? "bg-gray-200 text-gray-700"
      }`}
    >
      {labelMap[value] ?? value}
    </span>
  );
};
