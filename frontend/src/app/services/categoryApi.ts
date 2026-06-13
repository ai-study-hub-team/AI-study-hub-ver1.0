import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8080",
});

export interface CategoryResponse {
  id: number;
  name: string;
  description: string;
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

  createCategory(data: CategoryRequest) {
    return api.post<CategoryResponse>("/api/categories", data);
  },

  updateCategory(id: number, data: CategoryRequest) {
    return api.put<CategoryResponse>(`/api/categories/${id}`, data);
  },

  deleteCategory(id: number) {
    return api.delete(`/api/categories/${id}`);
  },
};