// components/charts/CustomTooltip.tsx
import { TooltipProps } from "recharts";

export const CustomTooltip = ({ active, payload, label }: TooltipProps<any, any>) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-4 shadow-lg rounded-lg border border-gray-200">
        <p className="font-semibold text-gray-800">{label}</p>
        <p className="text-[#5E189D]">
          Users: <span className="font-bold">{payload[0].value}</span>
        </p>
      </div>
    );
  }
  return null;
};