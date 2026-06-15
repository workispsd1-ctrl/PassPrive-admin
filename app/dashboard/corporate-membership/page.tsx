"use client";

import React, { useState, useEffect, useCallback } from "react";
import { showToast } from "@/hooks/useToast";
import CorporateForm from "./_components/CorporateForm";
import PromocodeTable, { GeneratedPromocode } from "./_components/PromocodeTable";
import { exportToExcel } from "@/lib/exportToExcel";

export default function CorporateMembershipPage() {
  // Corporate Form State
  const [email, setEmail] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [address, setAddress] = useState("");
  const [companyDetails, setCompanyDetails] = useState("");
  const [companyDomain, setCompanyDomain] = useState("");
  const [companySize, setCompanySize] = useState("");

  // Pass Config State
  const [passType, setPassType] = useState<"Black" | "Premium">("Black");
  const [quantity, setQuantity] = useState<number | "">("");
  const [discount, setDiscount] = useState<number | "">("");

  // UI state for generated codes
  const [generatedCodes, setGeneratedCodes] = useState<GeneratedPromocode[]>([]);
  const [lastGeneratedCompanyName, setLastGeneratedCompanyName] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  // Helper function to generate unique promo codes
  const generateRandomSuffix = (length = 5) => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let suffix = "";
    for (let i = 0; i < length; i++) {
      suffix += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return suffix;
  };

  const getCleanCompanyCode = (name: string) => {
    const clean = name.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
    return clean.slice(0, 4) || "CORP";
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!companyName.trim()) {
      showToast({ type: "error", title: "Corporate company name is required" });
      return;
    }
    if (!email.trim()) {
      showToast({ type: "error", title: "Corporate email address is required" });
      return;
    }
    if (!address.trim()) {
      showToast({ type: "error", title: "Located address is required" });
      return;
    }

    const qty = Number(quantity) || 0;
    if (qty <= 0) {
      showToast({
        type: "error",
        title: "Pass quantity required",
        description: "Please specify a quantity of 1 or more to generate passes.",
      });
      return;
    }

    setIsGenerating(true);

    // Simulate generation delay for nice UX micro-animation
    setTimeout(() => {
      const discPct = Number(discount) || 0;
      const companyCode = getCleanCompanyCode(companyName);
      const codesList: GeneratedPromocode[] = [];

      const nowStr = new Date().toLocaleString("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
      });

      const basePrice = passType === "Black" ? 7000 : 4000;
      const cashbackRate = passType === "Black" ? 0.04 : 0.02;
      const typeCode = passType === "Black" ? "BLK" : "PRM";

      for (let i = 1; i <= qty; i++) {
        const discValue = (basePrice * discPct) / 100;
        const discounted = basePrice - discValue;
        const cashbackVal = discounted * cashbackRate;

        codesList.push({
          code: `${companyCode}-${typeCode}-${generateRandomSuffix()}`,
          passType: passType,
          actualPrice: basePrice,
          discountPct: discPct,
          discountedPrice: discounted,
          cashbackPct: cashbackRate * 100,
          cashbackValue: cashbackVal,
          companyName: companyName.trim(),
          corporateEmail: email.trim(),
          companyDomain: companyDomain.trim(),
          companySize: companySize.trim(),
          address: address.trim(),
          status: "Unused",
          createdAt: nowStr,
        });
      }

      setGeneratedCodes(codesList);
      setLastGeneratedCompanyName(companyName.trim());
      setIsGenerating(false);

      showToast({
        type: "success",
        title: "Promocodes Generated",
        description: `Successfully generated ${codesList.length} ${passType} passes for ${companyName}.`,
      });
    }, 800);
  };

  const handleExport = useCallback(() => {
    if (generatedCodes.length === 0) {
      showToast({
        type: "error",
        title: "No promocodes to export",
        description: "Please generate promocodes first.",
      });
      return;
    }

    const exportData = generatedCodes.map((p, index) => ({
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

    const sanitizedFileName = `Promocodes_${lastGeneratedCompanyName.replace(/[^a-zA-Z0-9]/g, "_")}_${new Date().toISOString().slice(0, 10)}`;
    exportToExcel(exportData, sanitizedFileName);
  }, [generatedCodes, lastGeneratedCompanyName]);

  useEffect(() => {
    const handleGlobalExport = () => {
      handleExport();
    };
    window.addEventListener("export-corporate-promocodes", handleGlobalExport);
    return () => {
      window.removeEventListener("export-corporate-promocodes", handleGlobalExport);
    };
  }, [handleExport]);

  return (
    <div className="min-h-full w-full space-y-6 p-6">
      <div className="max-w-6xl space-y-6">
        {/* Form Container */}
        <CorporateForm
          email={email}
          setEmail={setEmail}
          companyName={companyName}
          setCompanyName={setCompanyName}
          address={address}
          setAddress={setAddress}
          companyDetails={companyDetails}
          setCompanyDetails={setCompanyDetails}
          companyDomain={companyDomain}
          setCompanyDomain={setCompanyDomain}
          companySize={companySize}
          setCompanySize={setCompanySize}
          passType={passType}
          setPassType={setPassType}
          quantity={quantity}
          setQuantity={setQuantity}
          discount={discount}
          setDiscount={setDiscount}
          onSubmit={handleSubmit}
          isGenerating={isGenerating}
        />

        {/* Promocodes Table Section */}
        <PromocodeTable
          promocodes={generatedCodes}
          companyName={lastGeneratedCompanyName}
          onExport={handleExport}
        />
      </div>
    </div>
  );
}
