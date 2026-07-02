import { apiClient } from "./apiClient";

export type VnpayCreateResponse = {
  paymentUrl: string;
  orderCode?: string | null;
};

export type PaymentHistoryResponse = {
  orderCode: string;
  amount: number | string;
  provider: string;
  status: "PENDING" | "SUCCESS" | "FAILED" | "CANCELLED" | string;
  transactionNo?: string | null;
  paymentTime?: string | null;
  failureReason?: string | null;

  planCode?: string | null;
  planName?: string | null;
  planPrice?: number | string | null;
  purchasedDays?: number | null;

  createdAt?: string | null;
};

export const createVnpayPaymentApi = (planCode: string = "PRO") => {
  return apiClient.post<VnpayCreateResponse>("/api/payments/vnpay/create", {
    planCode,
  });
};

export const getPaymentHistoryApi = () => {
  return apiClient.get<PaymentHistoryResponse[]>("/api/payments/history");
};

export const getPaymentStatusApi = (orderCode: string) => {
  return apiClient.get(`/api/payments/${orderCode}`);
};