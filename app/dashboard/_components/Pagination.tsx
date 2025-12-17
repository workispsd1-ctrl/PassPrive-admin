// components/Pagination.tsx
"use client";
import { ChevronLeft, ChevronRight } from "lucide-react";

type Pagination = {
  totalRecord: number;
  totalPage: number;
  page: number;
  limit: number;
  setLimit?: React.Dispatch<React.SetStateAction<number>>;
  setPage?: React.Dispatch<React.SetStateAction<number>>;
};

export default function PaginationBar({
  totalRecord,
  totalPage,
  page,
  limit,
  setLimit,
  setPage,
}: Pagination) {
  return (
    <div className="w-full flex justify-end px-4 py-2 bg-[#f3f7fc] text-sm text-gray-700">
      <div className="flex items-center space-x-4">
        <div className="whitespace-nowrap lg:flex gap-2 md:flex hidden">
          <span className="font-medium">Total</span>{" "}
          <span className="text-indigo-600 font-semibold">
            {totalRecord || 0}
          </span>{" "}
          records |{" "}
          <span className="font-semibold">
            {page || 1} of {totalPage || 1} Pages
          </span>
        </div>

        {/* Prev Arrow */}
        {page > 1 && (
          <button
            onClick={() => setPage && setPage(page - 1)}
            className="cursor-pointer w-8 h-8 flex items-center justify-center rounded hover:bg-gray-200 transition"
          >
            <ChevronLeft className="h-4 w-4 text-gray-600" />
          </button>
        )}

        {/* Current Page Number */}
        <div className="w-8 h-8 flex items-center justify-center rounded bg-indigo-600 text-white font-semibold">
          {page || 1}
        </div>

        {/* Next Arrow */}
        <button
          disabled={!totalPage || page == totalPage}
          onClick={() => setPage && setPage(page + 1)}
          className="cursor-pointer w-8 h-8 flex items-center justify-center rounded hover:bg-gray-200 transition"
        >
          <ChevronRight className="h-4 w-4 text-gray-600" />
        </button>

        {/* Page Size Dropdown */}
        <div className="flex items-center space-x-1">
          <span className="text-gray-600 font-medium">Page Size:</span>
          <select
  disabled={!totalPage}
  value={limit === totalRecord ? "all" : limit}
  onChange={(e) => {
    const value = e.target.value === "all" ? totalRecord : Number(e.target.value);
    if (setLimit) setLimit(value);
    if (setPage) setPage(1);
  }}
  className="cursor-pointer text-indigo-600 font-semibold bg-transparent focus:outline-none"
>
  <option value={10}>10</option>
  <option value={20}>20</option>
  <option value={30}>30</option>
  <option value={50}>50</option>
  <option value={100}>100</option>
  <option value={500}>500</option>
  <option value="all">All</option>
</select>
        </div>
      </div>
    </div>
  );
}
