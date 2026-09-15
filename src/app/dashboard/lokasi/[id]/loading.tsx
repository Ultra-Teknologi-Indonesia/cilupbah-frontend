"use client";

import {
  DetailSkeleton,
  PageHeaderSkeleton,
} from "@/components/ui/page-skeleton";

export default function Loading() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeaderSkeleton />
      <DetailSkeleton />
    </div>
  );
}
