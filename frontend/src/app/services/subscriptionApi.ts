import { apiClient } from "./apiClient";

export type PlanResponse = {
  id: number;
  code: string;
  name: string;
  storageLimitMb?: number;
  maxUploadSizePerFileMb?: number;
  dailyTokenLimit?: number;
  price?: number;
  description?: string;
  allowImageUpload?: boolean;
  allowDocumentUpload?: boolean;
  allowVideoUpload?: boolean;
  allowAudioUpload?: boolean;
  isActive?: boolean;
};

export type SubscriptionResponse = {
  plan?: PlanResponse | null;
  startDate?: string | null;
  endDate?: string | null;
  status?: string | null;
};

export const subscriptionApi = {
  getCurrentSubscription: () => {
    return apiClient.get<SubscriptionResponse>("/api/subscriptions/current");
  },
};