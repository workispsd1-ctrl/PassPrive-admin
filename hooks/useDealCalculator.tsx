import { useState, useEffect, useCallback } from "react";
import { DealData, dealVal } from "@/lib/data";
import { useAppDispatch } from "@/store/hooks";
import { useSelector } from "react-redux";
import { selectCurrentUser } from "@/store/reducers/userSlice";
import { showToast } from "@/hooks/useToast";
import { addDeal } from "@/store/actions/dealActions";
import { getSubscriptionDetails } from "@/lib/data";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

export const useDealCalculator = () => {
  const [dealData, setDealData] = useState<DealData>({ ...dealVal });
  const [totalSold, setTotalSold] = useState(0);
  const [totalDeductions, setTotalDeductions] = useState(0);
  const [profit, setProfit] = useState(0);
  const [commission, setCommission] = useState(0);
  const [token, setToken] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const fetchToken = async () => {
      const {
        data: { session },
      } = await supabaseBrowser.auth.getSession();

      if (session?.access_token) {
        setToken(session.access_token);
      }
      if (session?.user?.id) {
        setUserId(session.user.id);
      }
    };

    fetchToken();
  }, []);

  const dispatch = useAppDispatch();
  const user = useSelector(selectCurrentUser);

  const subscriptionDetails = getSubscriptionDetails(
    user?.subscriptionPlan || "basic"
  );
  const commissionRate = subscriptionDetails.rate;


  const calculateDeal = useCallback(() => {
    const sold = calculateTotalSold(dealData);
    const deductions = calculateTotalDeductions(dealData);
    const totalValue = sold-deductions;

 const calculatedProfit = commissionRate !== 0 ? totalValue / commissionRate : 0;



    const calculatedCommission = calculatedProfit / commissionRate

    setTotalSold(sold);
    setTotalDeductions(deductions);
    setProfit(calculatedProfit);
    setCommission(calculatedCommission);
  }, [dealData, commissionRate]);

  useEffect(() => {
    calculateDeal();
  }, [calculateDeal]);

  const handleInputChange = (field: keyof DealData, value: string | number) => {
    setDealData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const resetCalculator = () => {
    setDealData({ ...dealVal });
  };

  const addToInvoice = async () => {
    if (!token) {
      console.error("Token is missing. Cannot proceed.");
      return;
    }

    dispatch(addDeal({ dealData, profit, commission, token, userId }))
      .unwrap()
      .then(() => {
        showToast({
          title: "Success",
          description: "Deal submitted successfully!",
        });
        resetCalculator();
      })
      .catch((err) => {
        console.error("Error submitting deal:", err);
        showToast({
          title: "Error",
          description: "Failed to submit deal.",
          type: "error",
        });
      });
  };

  return {
    dealData,
    totalSold,
    totalDeductions,
    profit,
    commission,
    commissionRate,
    handleInputChange,
    resetCalculator,
    addToInvoice,
    calculateDeal,
  };
};

// Utility functions for calculations
const calculateTotalSold = (dealData: DealData): number => {
  return (
    dealData.salesPrice +
    dealData.warrantySold +
    dealData.gapSold +
    dealData.additionalFee +
    dealData.adminFee +
    dealData.reserve
  );
};


const calculateTotalDeductions = (dealData: DealData): number => {
  {/*console.log("Vehicle Cost", dealData.vehicleCost)
   console.log("Safety Cost", dealData.safetyCost)
    console.log("Lot Pack", dealData.lotPack)
     console.log("Warranty Cost", dealData.warrantyCost)
      console.log("Gap Cost", dealData.gapCost)
       console.log("Fee Cost", dealData.feeCost)
        console.log("Admin Cost", dealData.adminCost)
         console.log(" liewOwed", dealData.lienOwed)
          console.log("Referral", dealData.referral)
           console.log("Miscallaneous", dealData.miscellaneous) */}
  return (
    dealData.vehicleCost +
    dealData.safetyCost +
    dealData.lotPack +
    dealData.warrantyCost +
    dealData.gapCost +
    dealData.feeCost +
    dealData.adminCost +
    dealData.lienOwed +
    dealData.referral +
    dealData.miscellaneous
  );
};
