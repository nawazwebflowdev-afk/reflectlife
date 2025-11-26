import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export const PostSkeleton = () => {
  return (
    <Card className="overflow-hidden">
      {/* Header */}
      <div className="p-4 flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="flex-1">
          <Skeleton className="h-4 w-32 mb-2" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>

      {/* Media */}
      <Skeleton className="w-full h-[400px]" />

      {/* Content */}
      <div className="p-4 space-y-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        
        {/* Actions */}
        <div className="flex gap-4 pt-2">
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-8 w-16" />
        </div>
      </div>
    </Card>
  );
};
