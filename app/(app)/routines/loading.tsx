import { LoadingLabel, Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <>
      <LoadingLabel />
      <Skeleton className="h-4 w-20" />
      <Skeleton className="mt-3 h-8 w-3/4" />
      <div className="mt-3 grid grid-cols-2 gap-3">
        <Skeleton className="h-11" />
        <Skeleton className="h-11" />
      </div>
      {[0, 1].map((i) => (
        <div key={i} className="mt-8">
          <Skeleton className="h-6 w-28" />
          <Skeleton className="mt-3 h-72 w-full" />
        </div>
      ))}
    </>
  );
}
