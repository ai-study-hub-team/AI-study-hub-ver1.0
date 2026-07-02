import { apiClient } from "./apiClient";

export type SharedResourceType = "DOCUMENT" | "FOLDER" | string;
export type SharedPermission = "VIEW" | "EDIT" | "COMMENT" | string;
export type SharedStatus = "ACTIVE" | "REVOKED" | "EXPIRED" | string;

export interface SharedWithMeItem {
  shareId: number;
  resourceId: number;
  resourceType: SharedResourceType;
  title: string;
  name: string;
  ownerId: number;
  ownerName: string;
  ownerEmail: string;
  permission: SharedPermission;
  sharedAt: string;
  expiresAt?: string;
  status: SharedStatus;
}

export const sharedWithMeApi = {
  getSharedItems: () =>
    apiClient.get<SharedWithMeItem[]>("/api/shared"),

  getSharedFolders: () =>
    apiClient.get<SharedWithMeItem[]>("/api/shared/folders"),

  getSharedDocuments: () =>
    apiClient.get<SharedWithMeItem[]>("/api/shared/documents"),
};