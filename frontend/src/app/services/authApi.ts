import { apiClient } from "./apiClient";

// Đăng ký
export const registerApi = (data: {
  fullName: string;
  email: string;
  password: string;
}) => {
  return apiClient.post("/api/auth/register", data);
};

// Đăng nhập
export const loginApi = (email: string, password: string) => {
  return apiClient.post("/api/auth/login", {
    email,
    password,
  });
};

// Lấy user đang đăng nhập
export const getAuthMeApi = () => {
  return apiClient.get("/api/auth/me");
};

// Làm mới token
export const refreshTokenApi = (refreshToken: string) => {
  return apiClient.post("/api/auth/refresh", {
    refreshToken,
  });
};

// Đăng xuất
export const logoutApi = () => {
  return apiClient.post("/api/auth/logout", {
    refreshToken: localStorage.getItem("refreshToken"),
  });
};

// Profile
export const getMyAccountApi = () => {
  return apiClient.get("/api/account/me");
};

export const updateMyAccountApi = (data: any) => {
  return apiClient.put("/api/account/me", data);
};

// Đổi mật khẩu
export const changePasswordApi = (data: {
  currentPassword: string;
  newPassword: string;
}) => {
  return apiClient.put("/api/account/change-password", data);
};