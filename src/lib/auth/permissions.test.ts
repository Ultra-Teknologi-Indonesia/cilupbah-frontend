import { describe, expect, it } from "vitest";

import {
  hasPermission,
  permissionRequirements,
  viewPermissionForAction,
} from "@/lib/auth/permissions";
import { permissionForPath } from "@/components/dashboard/sidebar/nav-data";

describe("permission hierarchy", () => {
  it("requires the resource view permission for standard actions", () => {
    expect(viewPermissionForAction("edit-pesanan")).toBe("view-pesanan");
    expect(permissionRequirements("edit-pesanan")).toEqual([
      "view-pesanan",
      "edit-pesanan",
    ]);
    expect(hasPermission(new Set(["edit-pesanan"]), "edit-pesanan")).toBe(
      false,
    );
    expect(
      hasPermission(new Set(["view-pesanan", "edit-pesanan"]), "edit-pesanan"),
    ).toBe(true);
  });

  it("supports non-standard action names through explicit mappings", () => {
    expect(viewPermissionForAction("approve-revaluasi-stok")).toBe(
      "view-revaluasi-stok",
    );
    expect(permissionRequirements("view-pesanan")).toEqual(["view-pesanan"]);
  });
});

describe("dashboard route permissions", () => {
  it("uses the specific permission for sensitive child routes", () => {
    expect(permissionForPath("/dashboard/produk/123/edit")).toBe("edit-produk");
    expect(permissionForPath("/dashboard/barang-masuk/retur/123")).toBe(
      "view-retur-penjualan",
    );
    expect(permissionForPath("/dashboard/laporan/hpp")).toBe(
      "view-laporan-hpp",
    );
  });

  it("does not silently allow an unmapped dashboard route", () => {
    expect(permissionForPath("/dashboard/route-yang-tidak-terdaftar")).toBe(
      undefined,
    );
  });
});
