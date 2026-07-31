import { apiClient } from "./apiClient";

export type PlanResponse = {
  id: number;
  code: string;
  version: number;
  name: string;
  storageLimitMb?: number;
  maxUploadSizePerFileMb?: number;
  dailyTokenLimit?: number;
  maxShareLinksPerDay?: number;
  price?: number | string;
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
  adminAccess?: boolean;
};

export type VnpayCreateResponse = {
  paymentUrl?: string | null;
  orderCode?: string | null;
};

export const subscriptionApi = {
  /** GET /api/subscriptions/current */
  getCurrentSubscription: () => {
    return apiClient.get<SubscriptionResponse>(
      "/api/subscriptions/current",
    );
  },

  /** GET /api/plans */
  getActivePlans: () => {
    return apiClient.get<PlanResponse[]>("/api/plans");
  },

  /** POST /api/payments/vnpay/create */
  createVnpayPayment: (planCode: string) => {
    return apiClient.post<VnpayCreateResponse>(
      "/api/payments/vnpay/create",
      { planCode },
    );
  },
};
