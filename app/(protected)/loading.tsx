import { Skeleton } from "@/components/ui/skeleton";

export default function ProtectedLoading() {
  return (
    <div
      className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 p-4 sm:p-6"
      aria-busy="true"
      aria-label="Loading"
    >
      <Skeleton className="h-6 w-40 rounded" />
      <Skeleton className="h-4 w-64 max-w-full rounded" />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-[76px] rounded-lg border" />
        ))}
      </div>
      <Skeleton className="h-48 rounded-lg border" />
    </div>
  );
}
