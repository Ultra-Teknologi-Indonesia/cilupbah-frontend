"use client";

import * as React from "react";

import { Combobox } from "@/components/ui/combobox";
import { useLocations } from "@/hooks/manajemen-rak/use-locations";

interface LocationMultiComboboxProps {
  value: string[];
  onChange: (value: string[]) => void;
  className?: string;
  disabled?: boolean;
  autoSelectSingle?: boolean;
}

export function LocationMultiCombobox({
  value,
  onChange,
  className,
  disabled = false,
  autoSelectSingle = true,
}: LocationMultiComboboxProps) {
  const { data, isLoading } = useLocations({ perPage: 100 });

  const options = React.useMemo(
    () =>
      (data?.items ?? [])
        .filter((l) => l.isWarehouse)
        .map((l) => ({ value: l.id, label: l.locationName })),
    [data],
  );

  React.useEffect(() => {
    if (
      !autoSelectSingle ||
      isLoading ||
      value.length > 0 ||
      options.length !== 1
    ) {
      return;
    }

    onChange([options[0].value]);
  }, [autoSelectSingle, isLoading, onChange, options, value.length]);

  return (
    <Combobox
      multiple
      wrap
      options={options}
      value={value}
      onChange={onChange}
      loading={isLoading}
      placeholder="Semua lokasi"
      searchPlaceholder="Cari lokasi…"
      emptyText="Lokasi tidak ditemukan."
      className={className}
      disabled={disabled}
    />
  );
}
