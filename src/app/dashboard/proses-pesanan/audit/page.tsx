import { PageTitle } from "@/components/dashboard/page-title";
import { OrderAuditPanel } from "@/components/dashboard/proses-pesanan/pantauan/order-audit-panel";

export default function OrderAuditPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageTitle
        title="Audit Pesanan"
        description="Periksa pesanan yang belum masuk WMS tanpa menarik ulang secara membabi buta."
        breadcrumb={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Gudang" },
          { label: "Audit Pesanan" },
        ]}
      />

      <OrderAuditPanel />
    </div>
  );
}
