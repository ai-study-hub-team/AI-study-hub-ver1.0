import { apiClient as api } from "./apiClient";

export interface CategoryResponse {
  id: number;
  name: string;
  description?: string | null;
  userId: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface CategoryRequest {
  name: string;
  description?: string;
  userId: number;
}

export const categoryApi = {
  getCategories() {
    return api.get<CategoryResponse[]>("/api/categories");
  },

  getCategoryById(id: number) {
    return api.get<CategoryResponse>(`/api/categories/${id}`);
  },

  createCategory(data: CategoryRequest) {
    return api.post<CategoryResponse>("/api/categories", data);
  },

  updateCategory(id: number, data: CategoryRequest) {
    return api.put<CategoryResponse>(`/api/categories/${id}`, data);
  },

  deleteCategory(id: number) {
    return api.delete<void>(`/api/categories/${id}`);
  },
};