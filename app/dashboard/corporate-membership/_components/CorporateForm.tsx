"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface CorporateFormProps {
  email: string;
  setEmail: (val: string) => void;
  companyName: string;
  setCompanyName: (val: string) => void;
  address: string;
  setAddress: (val: string) => void;
  companyDetails: string;
  setCompanyDetails: (val: string) => void;
  companyDomain: string;
  setCompanyDomain: (val: string) => void;
  companySize: string;
  setCompanySize: (val: string) => void;
  passType: "Black" | "Premium";
  setPassType: (val: "Black" | "Premium") => void;
  quantity: number | "";
  setQuantity: (val: number | "") => void;
  discount: number | "";
  setDiscount: (val: number | "") => void;
  onSubmit: (e: React.FormEvent) => void;
  isGenerating: boolean;
}

export default function CorporateForm({
  email,
  setEmail,
  companyName,
  setCompanyName,
  address,
  setAddress,
  companyDetails,
  setCompanyDetails,
  companyDomain,
  setCompanyDomain,
  companySize,
  setCompanySize,
  passType,
  setPassType,
  quantity,
  setQuantity,
  discount,
  setDiscount,
  onSubmit,
  isGenerating,
}: CorporateFormProps) {
  const inputClass = "border border-gray-200 focus:border-[#5800AB] focus:ring-0 focus-visible:ring-0 rounded-lg text-black bg-white";

  // Calculations for inline preview
  const basePrice = passType === "Black" ? 7000 : 4000;
  const cashbackRate = passType === "Black" ? 0.04 : 0.02;
  const discPct = Number(discount) || 0;
  const qtyVal = Number(quantity) || 0;

  const discountVal = (basePrice * discPct) / 100;
  const discountedPrice = basePrice - discountVal;
  const cashbackPerPass = discountedPrice * cashbackRate;
  const totalCashback = cashbackPerPass * qtyVal;

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "MUR",
      maximumFractionDigits: 0,
    }).format(val);
  };

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm space-y-4">
        <h2 className="text-lg font-semibold text-gray-900 border-b pb-3 border-gray-100">
          Corporate Information
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="companyName" className="text-[14px] font-medium text-gray-700">
              Corporate Company Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="companyName"
              type="text"
              placeholder="e.g. Google India"
              className={inputClass}
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="corporateEmail" className="text-[14px] font-medium text-gray-700">
              Corporate Email Address <span className="text-red-500">*</span>
            </Label>
            <Input
              id="corporateEmail"
              type="email"
              placeholder="e.g. admin@company.com"
              className={inputClass}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="companyDomain" className="text-[14px] font-medium text-gray-700">
              Company Domain
            </Label>
            <Input
              id="companyDomain"
              type="text"
              placeholder="e.g. Technology, Finance, google.com"
              className={inputClass}
              value={companyDomain}
              onChange={(e) => setCompanyDomain(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="companySize" className="text-[14px] font-medium text-gray-700">
              Size of the Company
            </Label>
            <Input
              id="companySize"
              type="text"
              placeholder="e.g. 50-200 employees"
              className={inputClass}
              value={companySize}
              onChange={(e) => setCompanySize(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="address" className="text-[14px] font-medium text-gray-700">
            Address (Where it is located) <span className="text-red-500">*</span>
          </Label>
          <Input
            id="address"
            type="text"
            placeholder="e.g. Block C, DLF Cyber City, Gurugram, India"
            className={inputClass}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            required
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="companyDetails" className="text-[14px] font-medium text-gray-700">
            Company Details
          </Label>
          <Textarea
            id="companyDetails"
            placeholder="Describe the company domain, size, or specific requirements..."
            className={`${inputClass} min-h-[90px] resize-y`}
            value={companyDetails}
            onChange={(e) => setCompanyDetails(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm space-y-4">
        <h2 className="text-lg font-semibold text-gray-900 border-b pb-3 border-gray-100">
          Pass Configuration
        </h2>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Dropdown for selecting Pass Type */}
            <div className="space-y-1.5">
              <Label htmlFor="passType" className="text-[14px] font-medium text-gray-700">
                Select Pass Type <span className="text-red-500">*</span>
              </Label>
              <select
                id="passType"
                className="w-full rounded-lg border border-gray-200 px-3 h-10 text-sm bg-white text-black focus:border-[#5800AB] focus:ring-0 focus-visible:ring-0"
                value={passType}
                onChange={(e) => setPassType(e.target.value as "Black" | "Premium")}
              >
                <option value="Black">Black Pass (MUR 7,000)</option>
                <option value="Premium">Premium Pass (MUR 4,000)</option>
              </select>
            </div>

            {/* Quantity Input */}
            <div className="space-y-1.5">
              <Label htmlFor="quantity" className="text-[14px] font-medium text-gray-700">
                Quantity Required <span className="text-red-500">*</span>
              </Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                placeholder="e.g. 50"
                className={inputClass}
                value={quantity}
                onChange={(e) => {
                  const v = e.target.value;
                  setQuantity(v === "" ? "" : Math.max(1, parseInt(v) || 1));
                }}
                required
              />
            </div>

            {/* Discount Input */}
            <div className="space-y-1.5">
              <Label htmlFor="discount" className="text-[14px] font-medium text-gray-700">
                Discount (%)
              </Label>
              <Input
                id="discount"
                type="number"
                min="0"
                max="100"
                placeholder="e.g. 15"
                className={inputClass}
                value={discount}
                onChange={(e) => {
                  const v = e.target.value;
                  setDiscount(v === "" ? "" : Math.min(100, Math.max(0, parseFloat(v) || 0)));
                }}
              />
            </div>
          </div>

          {/* Dynamic inline cashback and price information */}
          <div className="p-4 rounded-xl border border-dashed border-[#5800AB]/30 bg-[#5800AB]/[0.02] space-y-3">
            <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
              <span className={`h-2.5 w-2.5 rounded-full ${passType === "Black" ? "bg-black" : "bg-purple-600"}`} />
              Live Pricing & Cashback Breakdown
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
              <div className="space-y-0.5">
                <span className="text-gray-500 font-medium">Standard Price</span>
                <p className="text-sm font-bold text-gray-800">{formatCurrency(basePrice)}</p>
              </div>
              <div className="space-y-0.5">
                <span className="text-gray-500 font-medium">Discounted Price</span>
                <p className="text-sm font-bold text-gray-900">{formatCurrency(discountedPrice)}</p>
              </div>
              <div className="space-y-0.5">
                <span className="text-gray-500 font-medium">Cashback Percentage</span>
                <p className="text-sm font-bold text-[#5800AB]">{(cashbackRate * 100)}% Cashback</p>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-4 flex justify-end">
          <button
            type="submit"
            disabled={isGenerating || !quantity}
            className="w-full md:w-auto px-6 py-3 bg-[#5800AB] hover:bg-[#450087] disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium rounded-xl transition duration-150 shadow-sm flex items-center justify-center gap-2"
          >
            {isGenerating ? "Generating..." : "Proceed & Generate Promocodes"}
          </button>
        </div>
      </div>
    </form>
  );
}
