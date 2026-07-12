import { apiClient } from "./apiClient";

export type PlanResponse = {
  id: number;
  code: string;
  name: string;
  storageLimitMb?: number;
  maxUploadSizePerFileMb?: number;
  dailyTokenLimit?: number;
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