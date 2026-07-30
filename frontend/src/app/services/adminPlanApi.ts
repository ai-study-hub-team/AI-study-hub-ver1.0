import { apiClient } from "./apiClient";

export interface PlanResponse {
  id: number;
  code: string;
  version: number;
  name: string;
  storageLimitMb: number;
  maxUploadSizePerFileMb: number;
  dailyTokenLimit: number;
  price: number;
  durationDays?: number | null;
  description?: string | null;
  allowImageUpload: boolean;
  allowDocumentUpload: boolean;
  allowVideoUpload: boolean;
  allowAudioUpload: boolean;
  isActive: boolean;
}

export interface AdminPlanPayload {
  code: string;
  name: string;
  storageLimitMb: number;
  maxUploadSizePerFileMb: number;
  dailyTokenLimit: number;
  price: number;
  durationDays?: number | null;
  description?: string | null;
  allowImageUpload: boolean;
  allowDocumentUpload: boolean;
  allowVideoUpload: boolean;
  allowAudioUpload: boolean;
  isActive: boolean;
}

export const adminPlanApi = {
  getPlans: () => apiClient.get<PlanResponse[]>("/api/admin/plans"),
  getPlan: (id: number) => apiClient.get<PlanResponse>(`/api/admin/plans/${id}`),
  createPlan: (payload: AdminPlanPayload) => apiClient.post<PlanResponse>("/api/admin/plans", payload),
  updatePlan: (id: number, payload: AdminPlanPayload) => apiClient.put<PlanResponse>(`/api/admin/plans/${id}`, payload),
  deletePlan: (id: number) => apiClient.delete(`/api/admin/plans/${id}`),
};
