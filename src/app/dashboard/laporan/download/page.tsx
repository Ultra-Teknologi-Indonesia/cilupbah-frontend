import { PageTitle } from "@/components/dashboard/page-title";
import { DownloadReportView } from "@/components/dashboard/laporan/download-report-view";

export default function DownloadReportPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageTitle
        title="Download Report"
        description="Lihat status export dan unduh ulang report yang sudah selesai."
        breadcrumb={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Laporan" },
          { label: "Download Report" },
        ]}
      />
      <DownloadReportView />
    </div>
  );
}
