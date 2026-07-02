import { apiClient } from "./apiClient";

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
};