import { fetchClient } from "@/lib/api-client";
import type { ApiPaginated, ApiResponse } from "@/types/api.types";
import type {
  RawUser,
  RawRole,
  RawLoginHistory,
  User,
  Role,
  LoginHistory,
  UserFormPayload,
  UserListParams,
  LoginHistoryParams,
} from "@/types/pengaturan/user";

function mapUser(raw: RawUser): User {
  return {
    id: raw.id,
    name: raw.name,
    email: raw.email,
    roles: raw.roles,
    permissions: raw.permissions ?? [],
    nik: raw.nik,
    warehouseId: raw.warehouse_id,
    locations: (raw.locations ?? []).map((l) => ({
      locationId: l.location_id,
      locationName: l.location_name,
    })),
    avatarUrl: raw.avatar_url,
    lastLoginAt: raw.last_login_at,
  };
}

function mapLoginHistory(raw: RawLoginHistory): LoginHistory {
  return {
    id: raw.id,
    userId: raw.user_id,
    device: raw.agent_device,
    os: raw.agent_os,
    browser: raw.agent_browser,
    ipAddress: raw.ip_address,
    country: raw.location_country,
    region: raw.location_region,
    city: raw.location_city,
    createdAt: raw.created_at,
  };
}

function mapRole(raw: RawRole): Role {
  return {
    id: raw.id,
    name: raw.name,
    description: raw.description,
    usersCount: raw.users_count,
    permissions: raw.permissions,
  };
}

export const UserService = {
  lookup: async (
    params: {
      q?: string;
      search?: string;
      role?: string | string[];
      locationId?: string;
      permission?: string;
      page?: number;
      perPage?: number;
    } = {},
  ) => {
    const qs = new URLSearchParams();
    const query = params.q ?? params.search;
    if (query) qs.set("q", query);
    if (params.page) qs.set("page", String(params.page));
    if (params.perPage) qs.set("per_page", String(params.perPage));
    if (params.locationId) qs.set("location_id", params.locationId);
    if (params.permission) qs.set("permission", params.permission);
    if (params.role) {
      if (Array.isArray(params.role)) {
        qs.set("role", params.role.join(","));
      } else {
        qs.set("role", params.role);
      }
    }

    const res = await fetchClient<
      ApiPaginated<{
        id: string;
        user_id?: string;
        name: string;
        email: string;
        roles?: string[];
        avatar_url?: string | null;
        last_login?: string | null;
      }>
    >(`/users/lookup?${qs.toString()}`);

    return {
      items: (res.data ?? []).map((u) => ({
        id: u.id || u.user_id || "",
        name: u.name,
        email: u.email,
        roles: u.roles ?? [],
        permissions: [],
        nik: null,
        warehouseId: null,
        locations: [],
        avatarUrl: u.avatar_url ?? null,
        lastLoginAt: u.last_login ?? null,
      })),
      meta: res.meta,
    };
  },

  list: async (params: UserListParams = {}) => {
    const qs = new URLSearchParams();
    qs.set("page", String(params.page ?? 1));
    qs.set("per_page", String(params.perPage ?? 10));
    if (params.search) qs.set("search", params.search);
    if (params["filter[role]"]) {
      const roles = params["filter[role]"];
      if (Array.isArray(roles)) {
        roles.forEach((r) => qs.append("filter[role]", r));
      } else {
        qs.set("filter[role]", roles);
      }
    }
    if (params["filter[warehouse_id]"])
      qs.set("filter[warehouse_id]", params["filter[warehouse_id]"]);
    if (params["filter[warehouse_id_or_global]"])
      qs.set(
        "filter[warehouse_id_or_global]",
        params["filter[warehouse_id_or_global]"],
      );

    const res = await fetchClient<ApiPaginated<RawUser>>(
      `/users?${qs.toString()}`,
    );
    return {
      items: (res.data ?? []).map(mapUser),
      meta: res.meta,
    };
  },

  detail: async (id: string) => {
    const res = await fetchClient<ApiResponse<RawUser>>(`/users/${id}`);
    return mapUser(res.data);
  },

  create: async (payload: UserFormPayload) => {
    const res = await fetchClient<ApiResponse<RawUser>>("/users", {
      method: "POST",
      data: payload,
    });
    return mapUser(res.data);
  },

  update: async (id: string, payload: UserFormPayload) => {
    const res = await fetchClient<ApiResponse<RawUser>>(`/users/${id}`, {
      method: "PUT",
      data: payload,
    });
    return mapUser(res.data);
  },

  delete: async (id: string) => {
    await fetchClient<ApiResponse<null>>(`/users/${id}`, { method: "DELETE" });
  },

  bulkDelete: async (
    ids: string[],
  ): Promise<{
    deleted: string[];
    failed: { id: string; message: string }[];
  }> => {
    const res = await fetchClient<
      ApiResponse<{
        succeeded: number;
        failed: Array<{ id: string; message: string }>;
        results: Array<{ id: string; status: "success" | "failed"; message?: string }>;
      }>
    >("/users/bulk-delete", {
      method: "POST",
      data: { user_ids: ids },
    });
    return {
      deleted: (res.data?.results ?? [])
        .filter((result) => result.status === "success")
        .map((result) => result.id),
      failed: res.data?.failed ?? [],
    };
  },

  syncPermissions: async (id: string, permissions: string[]) => {
    const res = await fetchClient<ApiResponse<RawUser>>(
      `/users/${id}/permissions`,
      { method: "PUT", data: { permissions } },
    );
    return mapUser(res.data);
  },

  loginHistory: async (userId: string, params: LoginHistoryParams = {}) => {
    const qs = new URLSearchParams();
    qs.set("page", String(params.page ?? 1));
    qs.set("page_size", String(params.pageSize ?? 25));

    const res = await fetchClient<ApiPaginated<RawLoginHistory>>(
      `/users/${userId}/login-history?${qs.toString()}`,
    );
    return {
      items: (res.data ?? []).map(mapLoginHistory),
      meta: res.meta,
    };
  },

  roles: async (): Promise<Role[]> => {
    const res = await fetchClient<ApiPaginated<RawRole>>("/roles?per_page=100");
    return (res.data ?? []).map(mapRole).filter((r) => r.name !== "owner");
  },
};
