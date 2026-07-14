import { apiClient } from "./apiClient";

export type TodayTokenUsageResponse = {
  total: number;
  chat: number;
  summarize: number;
  quiz: number;
};

export const tokenUsageApi = {
  /** GET /api/token-usage/today */
  getTodayUsage: () => {
    return apiClient.get<TodayTokenUsageResponse>(
      "/api/token-usage/today",
    );
  },
};