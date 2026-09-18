import { dehydrate, HydrationBoundary } from "@tanstack/react-query";

import { ProsesPesananPage } from "@/components/dashboard/proses-pesanan/proses-pesanan-page";
import { getServerQueryClient } from "@/lib/api-server";
import { OutboundService } from "@/services/proses-pesanan/outbound.service";
import type { FulfillmentListParams } from "@/types/proses-pesanan/fulfillment";

const READY_PARAMS: FulfillmentListParams = {
  page: 1,
  per_page: 20,
  exclude_transit: "1",
};

const LIST_PARAMS: FulfillmentListParams = {
  page: 1,
  per_page: 20,
};

type PickingPageProps = {
  searchParams: Promise<{ sub?: string }>;
};

export default async function PickingPage({
  searchParams,
}: PickingPageProps) {
  const { sub } = await searchParams;
  const qc = getServerQueryClient();

  if (sub === "diproses") {
    await qc.prefetchQuery({
      queryKey: ["proses-pesanan", "board", "picklists", LIST_PARAMS],
      queryFn: () => OutboundService.picklists(LIST_PARAMS),
    });
  } else if (sub === "selesai") {
    await qc.prefetchQuery({
      queryKey: [
        "proses-pesanan",
        "board",
        "orders",
        "finish-pick",
        LIST_PARAMS,
      ],
      queryFn: () => OutboundService.ordersByStage("finish-pick", LIST_PARAMS),
    });
  } else {
    await qc.prefetchQuery({
      queryKey: [
        "proses-pesanan",
        "board",
        "orders",
        "ready-to-process",
        READY_PARAMS,
      ],
      queryFn: () =>
        OutboundService.ordersByStage("ready-to-process", READY_PARAMS),
    });
  }

  return (
    <HydrationBoundary state={dehydrate(qc)}>
      <ProsesPesananPage stage="picking" />
    </HydrationBoundary>
  );
}
