"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  STAGE_CONFIG,
  type FulfillmentStage,
} from "@/types/proses-pesanan/fulfillment";
import { usePermissions } from "@/hooks/auth/use-permissions";

const STAGE_PERMISSION: Record<FulfillmentStage, string> = {
  pantauan: "view-picking",
  picking: "view-picking",
  packing: "view-packing",
  shipping: "view-pengiriman",
  delivered: "view-pengiriman",
  done: "view-pengiriman",
};

function activeStage(pathname: string): FulfillmentStage {
  for (const { key } of STAGE_CONFIG) {
    if (pathname.includes(`/proses-pesanan/${key}`)) return key;
  }
  return "picking";
}

export function StageTabs() {
  const pathname = usePathname();
  const active = activeStage(pathname);
  const { can } = usePermissions();

  return (
    <Tabs value={active}>
      <TabsList variant="glass" className="max-w-full overflow-x-auto">
        {STAGE_CONFIG.filter(({ key }) => can(STAGE_PERMISSION[key])).map(
          ({ key, label }) => (
            <TabsTrigger key={key} value={key} asChild>
              <Link href={`/dashboard/proses-pesanan/${key}`} prefetch={false}>
                {label}
              </Link>
            </TabsTrigger>
          ),
        )}
      </TabsList>
    </Tabs>
  );
}
