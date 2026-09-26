import { PageTitle } from "@/components/dashboard/page-title";
import { OrderRecoveryCenter } from "@/components/dashboard/proses-pesanan/pantauan/order-recovery-center";

export default function OrderAuditPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageTitle
        title="Pantauan dan Perbaikan Pesanan"
        description="Temukan pesanan bermasalah, periksa resi, dan siapkan label langsung dari satu halaman."
        breadcrumb={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Gudang" },
          { label: "Pantauan dan Perbaikan Pesanan" },
        ]}
      />

      <OrderRecoveryCenter />
    </div>
  );
}
