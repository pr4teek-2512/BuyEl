import { Skeleton } from "@/components/ui/Primitives";

export default function Loading() {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton className="h-8 w-32" />
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-80 w-full" />
      <Skeleton className="h-32 w-full" />
    </div>
  );
}
