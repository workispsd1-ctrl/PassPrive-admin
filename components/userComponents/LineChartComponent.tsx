
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { ResponsiveContainer } from "recharts";
import { CustomTooltip } from "./CustomTooltip";

interface LineChartProps {
  data: { month: string; users: number }[];
}

export const LineChartComponent = ({ data }: LineChartProps) => {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
        <XAxis 
          dataKey="month" 
          stroke="#666" 
          tick={{ fill: '#6b7280' }}
          tickLine={false}
        />
        <YAxis 
          stroke="#666" 
          tick={{ fill: '#6b7280' }}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip content={<CustomTooltip />} />
        <Line 
          type="monotone" 
          dataKey="users" 
          stroke="#5E189D" 
          strokeWidth={3}
          dot={{ 
            fill: '#5E189D', 
            strokeWidth: 2, 
            r: 5,
            stroke: '#ffffff',
            strokeWidth: 2
          }}
          activeDot={{ 
            r: 8, 
            stroke: '#5E189D',
            strokeWidth: 2,
            fill: '#ffffff'
          }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
};