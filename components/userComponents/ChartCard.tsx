import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card";

interface ChartCardProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  isEmpty: boolean;
  emptyMessage?: string;
}

export const ChartCard = ({ 
  title, 
  description,
  children, 
  isEmpty, 
  emptyMessage = "No data available" 
}: ChartCardProps) => {
  return (
    <Card className="border border-gray-200 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold text-gray-900">{title}</CardTitle>
        {description && <CardDescription className="text-sm text-gray-500">{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          {isEmpty ? (
            <div className="flex flex-col items-center justify-center h-full gap-2">
              <p className="text-gray-500">{emptyMessage}</p>
            </div>
          ) : (
            children
          )}
        </div>
      </CardContent>
    </Card>
  );
};