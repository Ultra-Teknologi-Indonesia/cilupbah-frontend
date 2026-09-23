"use client";

import { useOrderCounts } from "@/hooks/pesanan/use-orders";
import {
  TAB_CONFIG,
  type OrderCountParams,
  SUB_PILL_CONFIG,
  type OrderTab,
  type SubFilter,
} from "@/types/pesanan/order";
import { PillTab, PillTabs } from "@/components/dashboard/shared/pill-tabs";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList } from "@/components/ui/tabs";

export function OrderStatusTabs({
  active,
  onChange,
  countParams,
  isFetching = false,
}: {
  active: OrderTab;
  onChange: (tab: OrderTab) => void;
  countParams?: OrderCountParams;
  isFetching?: boolean;
}) {
  const { data, isLoading } = useOrderCounts(countParams);
  const counts = data?.data;

  const zones = ["lifecycle", "problem", "admin"] as const;
  const grouped = zones.map((z) => TAB_CONFIG.filter((t) => t.zone === z));

  return (
    <Tabs value={active} onValueChange={(val) => onChange(val as OrderTab)}>
      <TabsList className="h-auto flex flex-wrap items-center gap-1.5 bg-transparent p-0 rounded-none">
        {grouped.map((tabs, zi) => (
          <div key={zi} className="contents">
            {zi > 0 && (
              <Separator orientation="vertical" className="!h-6 mx-1" />
            )}
            {tabs.map(({ key, label }) => (
              <PillTab
                key={key}
                item={{
                  key: key as OrderTab,
                  label,
                  count: counts?.[key as keyof typeof counts] ?? null,
                  countLoading: isLoading,
                }}
                active={active === key}
                isFetching={active === key && isFetching}
                onSelect={onChange}
              />
            ))}
          </div>
        ))}
      </TabsList>
    </Tabs>
  );
}

export function OrderSubStatusPills({
  active,
  subFilter,
  onSubFilterChange,
  isFetching = false,
}: {
  active: OrderTab;
  subFilter: SubFilter;
  onSubFilterChange: (sub: SubFilter) => void;
  isFetching?: boolean;
}) {
  const subPills = SUB_PILL_CONFIG[active];
  if (!subPills) return null;

  const items = [
    { key: "__all__", label: "Semua", isFetching: !subFilter && isFetching },
    ...subPills.map(({ key, label }) => ({
      key,
      label,
      isFetching: subFilter === key && isFetching,
    })),
  ];

  return (
    <PillTabs
      variant="soft"
      className="gap-1"
      active={subFilter ?? "__all__"}
      onSelect={(key) =>
        onSubFilterChange(key === "__all__" ? null : (key as SubFilter))
      }
      items={items}
    />
  );
}
