import { apiClient } from "./apiClient";

export type SharedWithMeType = "ALL" | "DOCUMENT" | "FOLDER";
export type SharedItemType = "DOCUMENT" | "FOLDER";
export type SharedPermission = "VIEW" | "DOWNLOAD" | string;
export type SharedStatus = "ACTIVE" | "REVOKED" | string;

export interface SharedWithMeItem {
  shareId: number;
  itemId: number;
  itemType: SharedItemType;
  title: string;
  ownerId: number;
  ownerName: string;
  ownerEmail: string;
  permission: SharedPermission;
  sharedAt: string;
  expiresAt?: string | null;
  status: SharedStatus;
}

export interface SharedWithMePageResponse {
  content: SharedWithMeItem[];
  pageable?: {
    pageNumber?: number;
    pageSize?: number;
  };
  totalElements: number;
  totalPages: number;
  number?: number;
  size?: number;
}

export interface GetSharedWithMeParams {
  page?: number;
  size?: number;
  type?: SharedWithMeType;
}

export const sharedWithMeApi = {
  getSharedItems: (params: GetSharedWithMeParams = {}) =>
    apiClient.get<SharedWithMePageResponse>("/api/shared-with-me", {
      params: {
        page: params.page ?? 0,
        size: params.size ?? 20,
        type: params.type ?? "ALL",
      },
    }),

  getSharedDocuments: (page = 0, size = 20) =>
    sharedWithMeApi.getSharedItems({ page, size, type: "DOCUMENT" }),

  getSharedFolders: (page = 0, size = 20) =>
    sharedWithMeApi.getSharedItems({ page, size, type: "FOLDER" }),
};
