import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { CustomTooltip } from "./CustomTooltip";

const COLORS = [
  '#7e22ce', '#9333ea', '#a855f7', '#c084fc', 
  '#d8b4fe', '#e9d5ff', '#f3e8ff', '#faf5ff'
];

interface PieChartProps {
  data: { plan: string; count: number }[];
}

export const PieChartComponent = ({ data }: PieChartProps) => {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          outerRadius={80}
          fill="#8884d8"
          dataKey="count"
          nameKey="plan"
          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend 
          layout="vertical" 
          verticalAlign="middle" 
          align="right"
          wrapperStyle={{
            paddingLeft: '20px'
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
};