"use client";

import {
  useInfiniteQuery,
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";

import { UserService } from "@/services/pengaturan/user.service";
import type {
  UserListParams,
  UserFormPayload,
  LoginHistoryParams,
} from "@/types/pengaturan/user";

export const userKeys = {
  all: ["pengaturan", "pengguna"] as const,
  list: (params: UserListParams) => [...userKeys.all, "list", params] as const,
  detail: (id: string) => [...userKeys.all, "detail", id] as const,
  loginHistory: (id: string, params: LoginHistoryParams) =>
    [...userKeys.all, "login-history", id, params] as const,
  roles: ["pengaturan", "roles"] as const,
};

export function useUsers(params: UserListParams = {}) {
  return useQuery({
    queryKey: userKeys.list(params),
    queryFn: () => UserService.list(params),
    staleTime: 30 * 1000,
  });
}

export function useUserLookup(
  params: {
    q?: string;
    search?: string;
    role?: string | string[];
    locationId?: string;
    permission?: string;
    page?: number;
    perPage?: number;
  } = {},
  enabled = true,
) {
  return useQuery({
    queryKey: ["pengaturan", "pengguna", "lookup", params],
    queryFn: () => UserService.lookup(params),
    enabled,
    staleTime: 30 * 1000,
  });
}

export function useInfiniteUserLookup(
  params: {
    q?: string;
    locationId?: string;
    permission?: string;
    perPage?: number;
  } = {},
  enabled = true,
) {
  return useInfiniteQuery({
    queryKey: ["pengaturan", "pengguna", "lookup-infinite", params],
    queryFn: ({ pageParam }) =>
      UserService.lookup({
        ...params,
        page: pageParam,
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const meta = lastPage.meta;
      return meta.current_page < meta.last_page
        ? meta.current_page + 1
        : undefined;
    },
    enabled,
    staleTime: 30 * 1000,
  });
}

export function useUserDetail(id: string) {
  return useQuery({
    queryKey: userKeys.detail(id),
    queryFn: () => UserService.detail(id),
    enabled: !!id,
  });
}

export function useLoginHistory(
  userId: string,
  params: LoginHistoryParams = {},
) {
  return useQuery({
    queryKey: userKeys.loginHistory(userId, params),
    queryFn: () => UserService.loginHistory(userId, params),
    enabled: !!userId,
  });
}

export function useRoles() {
  return useQuery({
    queryKey: userKeys.roles,
    queryFn: () => UserService.roles(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: UserFormPayload) => UserService.create(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: userKeys.all }),
  });
}

export function useUpdateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UserFormPayload }) =>
      UserService.update(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: userKeys.all }),
  });
}

export function useDeleteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => UserService.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: userKeys.all }),
  });
}

export function useBulkDeleteUsers() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) => UserService.bulkDelete(ids),
    onSuccess: () => qc.invalidateQueries({ queryKey: userKeys.all }),
  });
}

export function useSyncUserPermissions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, permissions }: { id: string; permissions: string[] }) =>
      UserService.syncPermissions(id, permissions),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: userKeys.detail(id) });
      qc.invalidateQueries({ queryKey: userKeys.all });
    },
  });
}
