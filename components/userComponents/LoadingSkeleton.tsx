import { Skeleton } from "@/components/ui/skeleton";

export const LoadingSkeleton = () => {
  return (
    <div className="overflow-x-auto overflow-y-hidden rounded-[12px] border border-[#EDEFF3] mb-4">
      <table className="w-full min-w-[1200px] table-fixed border-collapse bg-white">
        <colgroup>
          <col className="w-[15%]" />
          <col className="w-[10%]" />
          <col className="w-[18%]" />
          <col className="w-[8%]" />
          <col className="w-[13%]" />
          <col className="w-[11%]" />
          <col className="w-[13%]" />
          <col className="w-[12%]" />
        </colgroup>
        <thead>
          <tr className="h-[44px] border-b border-[#EDEFF3] bg-[#FAFAFB]">
            <th className="px-4 py-3 text-left text-[12px] font-semibold uppercase tracking-[0.6px] text-[#6B7280]">Name</th>
            <th className="px-4 py-3 text-left text-[12px] font-semibold uppercase tracking-[0.6px] text-[#6B7280]">Phone</th>
            <th className="px-4 py-3 text-left text-[12px] font-semibold uppercase tracking-[0.6px] text-[#6B7280]">Email</th>
            <th className="px-4 py-3 text-left text-[12px] font-semibold uppercase tracking-[0.6px] text-[#6B7280]">Plan</th>
            <th className="px-4 py-3 text-left text-[12px] font-semibold uppercase tracking-[0.6px] text-[#6B7280]">Subscription Date</th>
            <th className="px-4 py-3 text-left text-[12px] font-semibold uppercase tracking-[0.6px] text-[#6B7280]">Join Date</th>
            <th className="px-4 py-3 text-left text-[12px] font-semibold uppercase tracking-[0.6px] text-[#6B7280]">Last Opened</th>
            <th className="px-4 py-3 text-right text-[12px] font-semibold uppercase tracking-[0.6px] text-[#6B7280]">Actions</th>
          </tr>
        </thead>
        <tbody className="bg-white">
          {Array.from({ length: 8 }).map((_, i) => (
            <tr key={i} className="h-[80px] border-b border-[#F1F2F5] last:border-b-0">
              <td className="px-4 py-4">
                <Skeleton className="h-4 w-28" />
              </td>
              <td className="px-4 py-4">
                <Skeleton className="h-4 w-24" />
              </td>
              <td className="px-4 py-4">
                <Skeleton className="h-4 w-36" />
              </td>
              <td className="px-4 py-4">
                <Skeleton className="h-6 w-14 rounded-full" />
              </td>
              <td className="px-4 py-4">
                <Skeleton className="h-4 w-28" />
              </td>
              <td className="px-4 py-4">
                <Skeleton className="h-4 w-24" />
              </td>
              <td className="px-4 py-4">
                <Skeleton className="h-4 w-28" />
              </td>
              <td className="px-4 py-4">
                <div className="flex justify-end gap-1">
                  <Skeleton className="h-8 w-8 rounded-md" />
                  <Skeleton className="h-8 w-8 rounded-md" />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};