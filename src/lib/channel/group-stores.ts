import type {
  Channel,
  ChannelCode,
  ChannelGroup,
  ConnectedStore,
  RawConnectedStore,
} from "@/types/channel";

export const CHANNEL_CATALOG: Channel[] = [
  { id: "ch-tiktok", code: "tiktok", name: "TikTok", connectable: true },
  { id: "ch-shopee", code: "shopee", name: "Shopee", connectable: true },
  { id: "ch-lazada", code: "lazada", name: "Lazada", connectable: true },
  {
    id: "ch-woocommerce",
    code: "woocommerce",
    name: "WooCommerce",
    connectable: true,
  },
  { id: "ch-blibli", code: "blibli", name: "Blibli", connectable: false },
];

const DISPLAY_NAME: Record<string, string> = {
  tiktok: "TikTok",
  shopee: "Shopee",
  lazada: "Lazada",
  woocommerce: "WooCommerce",
  tokopedia: "TikTok",
  blibli: "Blibli",
};

function groupCode(code: ChannelCode): ChannelCode {
  return code === "tokopedia" ? "tiktok" : code;
}

function mapStore(raw: RawConnectedStore): ConnectedStore {
  const code = (raw.channel?.code ?? "unknown") as ChannelCode;
  return {
    id: raw.id,
    shopId: raw.shop_id,
    shopName: raw.shop_name,
    channel: { code, name: raw.channel?.name ?? code },
    isActive: raw.is_active,
    ordersEnabled: raw.order_sync_enabled,
    isShadowMode: raw.is_shadow_mode ?? false,
    catalogPullEnabled: raw.catalog_pull_enabled ?? true,
    catalogPushEnabled: raw.catalog_push_enabled ?? true,
    stockPushEnabled: raw.stock_push_enabled ?? false,
    pricePushEnabled: raw.price_push_enabled ?? false,
    fulfillmentPushEnabled: raw.fulfillment_push_enabled ?? true,
    handoverMethod: raw.handover_method ?? "dropoff",
    integration: raw.integration ?? { status: "normal" },
    orderSync: raw.order_sync ?? { status: "pending" },
    lastOrderSyncedAt: raw.last_order_synced_at ?? null,
    connectedAt: raw.created_at,
  };
}

export interface GroupedStores {
  groups: ChannelGroup[];
  available: Channel[];
}

export function groupStores(raws: RawConnectedStore[]): GroupedStores {
  const byGroup = new Map<string, ConnectedStore[]>();

  for (const raw of raws) {
    const store = mapStore(raw);
    const key = groupCode(store.channel.code);
    const list = byGroup.get(key) ?? [];
    list.push(store);
    byGroup.set(key, list);
  }

  const orderedCodes = [
    ...CHANNEL_CATALOG.map((c) => c.code),
    ...Array.from(byGroup.keys()).filter(
      (c) => !CHANNEL_CATALOG.some((cat) => cat.code === c),
    ),
  ];

  const groups: ChannelGroup[] = [];
  for (const code of orderedCodes) {
    const stores = byGroup.get(code);
    if (!stores || stores.length === 0) continue;
    groups.push({
      id: `grp-${code}`,
      code,
      name: DISPLAY_NAME[code] ?? code,
      connectable:
        code === "tiktok" ||
        code === "lazada" ||
        code === "shopee" ||
        code === "woocommerce",
      stores,
    });
  }

  const available = CHANNEL_CATALOG.filter((c) => !byGroup.has(c.code));

  return { groups, available };
}
