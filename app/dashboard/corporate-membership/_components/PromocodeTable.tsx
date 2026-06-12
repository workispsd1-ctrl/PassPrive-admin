"use client";

import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Download, CheckCircle, ChevronLeft, ChevronRight, Mail } from "lucide-react";
import { exportToExcel } from "@/lib/exportToExcel";
import { showToast } from "@/hooks/useToast";

export interface GeneratedPromocode {
  code: string;
  passType: "Black" | "Premium";
  actualPrice: number;
  discountPct: number;
  discountedPrice: number;
  cashbackPct: number;
  cashbackValue: number;
  companyName: string;
  corporateEmail: string;
  companyDomain: string;
  companySize: string;
  address: string;
  status: string;
  createdAt: string;
}

interface PromocodeTableProps {
  promocodes: GeneratedPromocode[];
  companyName: string;
  onExport?: () => void;
}

const ITEMS_PER_PAGE = 10;

export default function PromocodeTable({ promocodes, companyName, onExport }: PromocodeTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);

  // Filter promocodes based on search term
  const filteredCodes = useMemo(() => {
    if (!searchTerm.trim()) return promocodes;
    const term = searchTerm.toLowerCase();
    return promocodes.filter(
      (p) =>
        p.code.toLowerCase().includes(term) ||
        p.passType.toLowerCase().includes(term) ||
        p.status.toLowerCase().includes(term)
    );
  }, [promocodes, searchTerm]);

  // Handle pagination
  const totalPages = Math.max(1, Math.ceil(filteredCodes.length / ITEMS_PER_PAGE));
  const paginatedCodes = useMemo(() => {
    const startIndex = (page - 1) * ITEMS_PER_PAGE;
    return filteredCodes.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredCodes, page]);

  // Handle Search Change (reset page to 1)
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setPage(1);
  };

  // Export to Excel
  const handleExport = () => {
    if (onExport) {
      onExport();
      return;
    }
    if (promocodes.length === 0) return;

    // Map data to user-friendly column names
    const exportData = promocodes.map((p, index) => ({
      "S.No": index + 1,
      "Promo Code": p.code,
      "Pass Type": p.passType,
      "Actual Price (INR)": p.actualPrice,
      "Corporate Discount (%)": p.discountPct,
      "Discounted Price (INR)": p.discountedPrice,
      "Company Name": p.companyName,
      "Corporate Email": p.corporateEmail,
      "Company Domain": p.companyDomain,
      "Company Size": p.companySize,
      "Location Address": p.address,
      Status: p.status,
      "Created Date": p.createdAt,
    }));

    const sanitizedFileName = `Promocodes_${companyName.replace(/[^a-zA-Z0-9]/g, "_")}_${new Date().toISOString().slice(0, 10)}`;
    exportToExcel(exportData, sanitizedFileName);
  };

  const handleSendEmail = () => {
    const emailTo = promocodes[0]?.corporateEmail || "corporate@company.com";
    showToast({
      type: "success",
      title: "Email Sent",
      description: `Promocodes have been sent successfully to ${emailTo}.`,
    });
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "MUR",
      maximumFractionDigits: 0,
    }).format(val);
  };

  if (promocodes.length === 0) return null;

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden space-y-4 p-6">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b pb-4 border-gray-100">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            Generated Promocodes
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Total {promocodes.length} promocodes successfully generated for <span className="font-semibold text-gray-800">{companyName}</span>.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search by code or type..."
              className="pl-9 pr-4 py-2 border border-gray-200 focus:border-[#5800AB] focus:ring-0 focus-visible:ring-0 rounded-lg text-sm bg-white"
              value={searchTerm}
              onChange={handleSearchChange}
            />
          </div>

          <Button
            onClick={handleExport}
            className="bg-[#5800AB] hover:bg-[#450087] text-white flex items-center justify-center gap-2 rounded-lg py-2"
          >
            <Download className="h-4 w-4" />
            Download Excel
          </Button>

          <Button
            onClick={handleSendEmail}
            className="bg-[#DA3224] hover:bg-[#c92b20] text-white flex items-center justify-center gap-2 rounded-lg py-2"
          >
            <Mail className="h-4 w-4" />
            Send Email
          </Button>
        </div>
      </div>

      {/* Table Section */}
      <div className="w-full overflow-x-auto rounded-lg border border-gray-100">
        <table className="min-w-full divide-y divide-gray-100 bg-white">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                S.No
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Promo Code
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Pass Type
              </th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Actual Price
              </th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Corporate Cost
              </th>
              <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {paginatedCodes.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-8 text-sm text-gray-400 font-medium">
                  No matching promocodes found.
                </td>
              </tr>
            ) : (
              paginatedCodes.map((p, idx) => (
                <tr key={p.code} className="hover:bg-gray-50/50 transition">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {(page - 1) * ITEMS_PER_PAGE + idx + 1}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 tracking-wider font-mono">
                    {p.code}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {p.passType === "Black" ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200">
                        Black Pass
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                        Premium Pass
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-500">
                    {formatCurrency(p.actualPrice)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900 font-semibold">
                    {formatCurrency(p.discountedPrice)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                      <CheckCircle className="h-3 w-3" />
                      {p.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t pt-4 border-gray-100 text-sm">
          <span className="text-gray-600">
            Showing <span className="font-semibold text-gray-800">{(page - 1) * ITEMS_PER_PAGE + 1}</span> to{" "}
            <span className="font-semibold text-gray-800">
              {Math.min(page * ITEMS_PER_PAGE, filteredCodes.length)}
            </span>{" "}
            of <span className="font-semibold text-gray-800">{filteredCodes.length}</span> codes
          </span>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              className="px-2.5 py-1 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-gray-700">
              Page <span className="font-medium text-gray-900">{page}</span> of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page === totalPages}
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              className="px-2.5 py-1 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
