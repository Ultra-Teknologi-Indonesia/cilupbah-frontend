const ACTION_PREFIXES = [
  "create-",
  "edit-",
  "delete-",
  "export-",
  "import-",
] as const;

const ACTION_VIEW_OVERRIDES: Record<string, string> = {
  "approve-revaluasi-stok": "view-revaluasi-stok",
  "receive-transaksi-pembelian": "view-transaksi-pembelian",
  "force-logout-user": "view-user",
  "hide-product": "view-produk",
  "merge-product": "view-product-merge",
  "unmerge-product": "view-product-merge",
  "auto-merge-product": "view-product-merge",
};

export type PermissionRequirement = string | string[] | { all: string[] };

export function viewPermissionForAction(
  permission: string,
): string | undefined {
  const override = ACTION_VIEW_OVERRIDES[permission];
  if (override) return override;

  const prefix = ACTION_PREFIXES.find((candidate) =>
    permission.startsWith(candidate),
  );
  return prefix ? `view-${permission.slice(prefix.length)}` : undefined;
}

export function permissionRequirements(permission: string): string[] {
  const viewPermission = viewPermissionForAction(permission);
  return viewPermission && viewPermission !== permission
    ? [viewPermission, permission]
    : [permission];
}

export function hasPermission(
  granted: ReadonlySet<string>,
  permission: string,
  isOwner = false,
): boolean {
  return (
    isOwner ||
    permissionRequirements(permission).every((required) =>
      granted.has(required),
    )
  );
}
