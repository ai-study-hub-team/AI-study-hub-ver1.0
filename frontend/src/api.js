import axios from 'axios';

// Since Vite proxies /api to http://localhost:8080, we can use /api as baseURL.
// This completely avoids CORS errors in local development.
const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

export const categoryApi = {
  getAll: () => api.get('/categories').then(res => res.data),
  getById: (id) => api.get(`/categories/${id}`).then(res => res.data),
  create: (data) => api.post('/categories', data).then(res => res.data),
  update: (id, data) => api.put(`/categories/${id}`, data).then(res => res.data),
  delete: (id) => api.delete(`/categories/${id}`).then(res => res.data),
};

export const documentApi = {
  getAll: (page = 0, size = 10) => 
    api.get(`/documents?page=${page}&size=${size}`).then(res => res.data),
  getById: (id) => api.get(`/documents/${id}`).then(res => res.data),
  upload: (formData) => api.post('/documents/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  }).then(res => res.data),
  update: (id, data) => api.put(`/documents/${id}`, data).then(res => res.data),
  delete: (id) => api.delete(`/documents/${id}`).then(res => res.data),
  search: (keyword, page = 0, size = 10) => 
    api.get(`/documents/search?keyword=${encodeURIComponent(keyword)}&page=${page}&size=${size}`).then(res => res.data),
};

export default api;
