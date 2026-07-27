import { apiClient } from "./apiClient";
import type { SharePermission } from "./documentShareApi";

export interface FolderResponse {
  id: number;
  name: string;
  description: string;
  userId: number;
  parentFolderId: number | null;
  parentFolderName: string | null;
  documentCount: number;
  childFolderCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface FolderRequest {
  name: string;
  description?: string;
  userId: number;
  parentFolderId?: number | null;
}

export interface ShareFolderRequest {
  emails: string[];
  permission: SharePermission;
  expiresAt?: string | null;
}

export interface ShareFolderResponse {
  message: string;
  sharedEmails: string[];
  alreadySharedEmails: string[];
  notFoundEmails: string[];
}

export interface FolderShareResponse {
  shareId: number;
  userId: number;
  fullName: string;
  email: string;
  permission: SharePermission | string;
  status: string;
  sharedAt?: string;
  createdAt?: string;
  expiresAt?: string | null;
}

export const folderApi = {
  getFolders: (userId: number) => {
    return apiClient.get<FolderResponse[]>("/api/folders", {
      params: { userId },
    });
  },

  getFolderById: (id: number, userId: number) => {
    return apiClient.get<FolderResponse>(`/api/folders/${id}`, {
      params: { userId },
    });
  },

  getFolderDocuments: (folderId: number) => {
    return apiClient.get(`/api/folders/${folderId}/documents`);
  },

  getSharedFolderDocuments: (folderId: number) => {
    // Backend applies owner/share/management access checks on this endpoint.
    return apiClient.get(`/api/folders/${folderId}/documents`);
  },

  createFolder: (data: FolderRequest) => {
    return apiClient.post<FolderResponse>("/api/folders", data);
  },

  updateFolder: (id: number, data: FolderRequest) => {
    return apiClient.put<FolderResponse>(`/api/folders/${id}`, data);
  },

  deleteFolder: (id: number, userId: number) => {
    return apiClient.delete(`/api/folders/${id}`, {
      params: { userId },
    });
  },

  shareFolder: (folderId: number, data: ShareFolderRequest) => {
    return apiClient.post<ShareFolderResponse>(
      `/api/folders/${folderId}/shares`,
      data,
    );
  },

  getFolderShares: (folderId: number) => {
    return apiClient.get<FolderShareResponse[]>(
      `/api/folders/${folderId}/shares`,
    );
  },

  revokeFolderShare: (folderId: number, targetUserId: number) => {
    return apiClient.delete<void>(
      `/api/folders/${folderId}/shares/${targetUserId}`,
    );
  },
};
