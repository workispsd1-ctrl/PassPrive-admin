import { Input } from "@/components/ui/input";
import { useEffect, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search } from "lucide-react";

type SearchOnlyProps = {
  variant?: "search-only";
  searchTerm: string;
  onSearchChange: (value: string) => void;
  placeholder?: string;
};

type FullProps = {
  variant?: "full";
  searchTerm: string;
  onSearchChange: (value: string) => void;
  placeholder?: string;

  planFilter: string;
  onPlanFilterChange: (value: string) => void;

  statusFilter?: string;
  onStatusFilterChange?: (value: string) => void;
};

type SearchAndFilterProps = SearchOnlyProps | FullProps;

export const SearchAndFilter = (props: SearchAndFilterProps) => {
  const isSearchOnly = props.variant === "search-only";
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="flex flex-col sm:flex-row gap-3 items-center">
      <div className="flex-1 relative w-full">
        <Search className="absolute left-[16px] top-1/2 -translate-y-1/2 text-[#938F96] w-5 h-5" />
        <Input
          placeholder={props.placeholder ?? "Search..."}
          className="pl-[48px] pr-[16px] h-[44px] rounded-[12px] border border-gray-200 bg-[#FFFFFF] text-[14px] font-normal placeholder:!text-[#938F96] !shadow-[0px_8px_32px_0px_rgba(31,38,135,0.15)] focus-visible:ring-0 focus-visible:ring-offset-0"
          value={props.searchTerm}
          onChange={(e) => props.onSearchChange(e.target.value)}
        />
      </div>

      {!isSearchOnly && mounted && (
        <Select
          value={(props as FullProps).planFilter}
          onValueChange={(props as FullProps).onPlanFilterChange}
        >
          <SelectTrigger
            className="
              min-w-[180px] h-10 border-gray-300
              focus:ring-indigo-800 focus:border-indigo-800
              text-gray-900 placeholder:text-gray-400
              bg-white
            "
          >
            <SelectValue placeholder="All Plans" />
          </SelectTrigger>

          <SelectContent className="bg-white border border-gray-200 rounded-md shadow-lg text-gray-900">
            <SelectItem value="all">All Plans</SelectItem>
            <SelectItem value="free">Trial Run</SelectItem>
            <SelectItem value="Starter">Foundation</SelectItem>
            <SelectItem value="Momentum">Growth</SelectItem>
            <SelectItem value="Pro">Ultimate</SelectItem>
          </SelectContent>
        </Select>
      )}
    </div>
  );
};
