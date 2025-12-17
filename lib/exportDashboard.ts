import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { toast } from "sonner";

export const exportDashboardToExcel = async (stats: any) => {
  try {
    const statsSheetData = [
      [
        "Total Users",
        "Active Subscribers",
        "Total Revenue",
        "Users:Subscribers Ratio",
      ],
      [stats.totalUsers, stats.activeSubscribers, stats.totalRevenue, `${stats.totalUsers}:${stats.activeSubscribers}`],
    ];

    const wb = XLSX.utils.book_new();
    const statsSheet = XLSX.utils.aoa_to_sheet(statsSheetData);
    XLSX.utils.book_append_sheet(wb, statsSheet, "Dashboard Stats");

    // Add a note about the chart instead of trying to capture it
    const noteSheet = XLSX.utils.aoa_to_sheet([
      ["Chart Information"],
      ["Note: Chart visualization is available in the dashboard"],
      ["Please refer to the dashboard for visual representation of the data"],
    ]);
    XLSX.utils.book_append_sheet(wb, noteSheet, "Chart Note");

    const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    saveAs(
      new Blob([wbout], { type: "application/octet-stream" }),
      "dashboard_stats.xlsx"
    );

    toast.success("Dashboard stats exported successfully!");
  } catch (err) {
    toast.error("Export failed. Please try again later.");
    console.error("Export failed:", err);
  }
};
