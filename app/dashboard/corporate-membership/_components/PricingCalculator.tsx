"use client";

import React from "react";

interface PricingCalculatorProps {
  passType: "Black" | "Premium";
  quantity: number | "";
  discount: number | "";
}

export default function PricingCalculator({
  passType,
  quantity,
  discount,
}: PricingCalculatorProps) {
  // Constants
  const BASE_PRICE = passType === "Black" ? 7000 : 4000;
  const CASHBACK_RATE = passType === "Black" ? 0.04 : 0.02; // 4% for Black, 2% for Premium

  const qty = Number(quantity) || 0;
  const discPct = Number(discount) || 0;

  // Calculations
  const discountValue = (BASE_PRICE * discPct) / 100;
  const discountedPrice = BASE_PRICE - discountValue;
  const cashbackPerPass = discountedPrice * CASHBACK_RATE;

  const totalRetail = BASE_PRICE * qty;
  const totalDiscounted = discountedPrice * qty;
  const totalCashback = cashbackPerPass * qty;
  const totalSavings = discountValue * qty;

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "MUR",
      maximumFractionDigits: 0,
    }).format(val);
  };

  return (
    <div className="bg-[#FFFFFF] border border-gray-100 rounded-xl p-6 shadow-sm space-y-6">
      <h2 className="text-lg font-semibold text-gray-900 border-b pb-3 border-gray-100">
        Pricing Summary
      </h2>

      {qty === 0 ? (
        <div className="py-12 text-center text-gray-400">
          <p className="text-sm font-medium">No passes configured.</p>
          <p className="text-xs mt-1">Specify a quantity in the pass configuration panel to see live totals.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Individual Breakdown */}
          <div className="space-y-4">
            <div className={`p-4 rounded-lg border space-y-2 ${passType === "Black"
                ? "bg-black/[0.02] border-black/[0.05]"
                : "bg-purple-50/30 border-purple-100/60"
              }`}>
              <div className="flex justify-between items-center">
                <span className="font-semibold text-gray-900 text-sm">
                  {passType} Pass ({qty} qty)
                </span>
              </div>

              <div className="grid grid-cols-2 gap-y-1.5 text-xs text-gray-600">
                <div>Standard Price (Per):</div>
                <div className="text-right font-medium text-gray-900">{formatCurrency(BASE_PRICE)}</div>

                <div>Discount Entered:</div>
                <div className="text-right font-medium text-red-600">-{discPct}% ({formatCurrency(discountValue)})</div>

                <div className="border-t border-dashed border-gray-200 pt-1 font-semibold text-gray-900">Discounted Price:</div>
                <div className="border-t border-dashed border-gray-200 pt-1 text-right font-bold text-gray-900">{formatCurrency(discountedPrice)}</div>
              </div>
            </div>
          </div>

          {/* Grand Totals */}
          <div className="border-t pt-4 space-y-3 border-gray-100">
            <div className="flex justify-between text-xs text-gray-600">
              <span>Total Quantity:</span>
              <span className="font-medium text-gray-900">{qty} passes</span>
            </div>

            <div className="flex justify-between text-xs text-gray-600">
              <span>Standard Retail Price:</span>
              <span className="font-medium text-gray-500 line-through">{formatCurrency(totalRetail)}</span>
            </div>

            <div className="flex justify-between text-xs text-red-600">
              <span>Total Discount Savings:</span>
              <span className="font-semibold">-{formatCurrency(totalSavings)}</span>
            </div>

            <div className="pt-3 border-t border-gray-200 flex justify-between items-center">
              <span className="font-bold text-gray-900 text-base">Net Amount to Pay:</span>
              <span className="font-extrabold text-[#5800AB] text-lg">{formatCurrency(totalDiscounted)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
