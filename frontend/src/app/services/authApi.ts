import axios from "axios";

const API_BASE = "http://localhost:8080/api";

// Chỉ giữ nếu backend có thật API login
export const loginApi = (email: string, password: string) => {
  return axios.post(`${API_BASE}/auth/login`, {
    email,
    password,
  });
};

const getAuthHeader = () => ({
  headers: {
    Authorization: `Bearer ${localStorage.getItem("token")}`,
  },
});

// Profile
export const getMyAccountApi = () => {
  return axios.get(`${API_BASE}/account/me`, getAuthHeader());
};

export const updateMyAccountApi = (data: any) => {
  return axios.put(
    `${API_BASE}/account/me`,
    data,
    getAuthHeader()
  );
};

// Change Password
export const changePasswordApi = (data: {
  oldPassword: string;
  newPassword: string;
}) => {
  return axios.put(
    `${API_BASE}/account/change-password`,
    data,
    getAuthHeader()
  );
};