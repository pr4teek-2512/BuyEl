import { Skeleton } from "@/components/ui/Primitives";

export default function Loading() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <Skeleton className="size-10 rounded-full" />
        <Skeleton className="h-5 w-48" />
      </div>
      <Skeleton className="h-[40vh] w-full" />
      <Skeleton className="h-11 w-full" />
    </div>
  );
}
