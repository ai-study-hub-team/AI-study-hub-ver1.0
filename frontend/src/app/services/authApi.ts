import { apiClient } from "./apiClient";

export type AuthUser = {
  id?: number;
  userId?: number;
  email?: string;
  fullName?: string;
  name?: string;
  role?: string;
  roles?: string[];
};

export type AuthResponse = {
  accessToken?: string;
  token?: string;
  jwt?: string;
  refreshToken?: string;
  tokenType?: string;

  userId?: number;
  id?: number;
  email?: string;
  fullName?: string;
  role?: string;
  emailVerified?: boolean;

  user?: AuthUser;
};

export type EmailVerificationResponse = {
  message: string;
  email: string;
  emailVerified: boolean;
  nextAction: string;
};

export type MessageResponse = {
  message: string;
};

// Register
export const registerApi = (data: {
  fullName: string;
  email: string;
  password: string;
}) => {
  return apiClient.post<EmailVerificationResponse>(
    "/api/auth/register",
    data,
  );
};

// Login with email and password
export const loginApi = (
  email: string,
  password: string,
) => {
  return apiClient.post<AuthResponse>(
    "/api/auth/login",
    {
      email,
      password,
    },
  );
};

// Login with Google ID token
export const googleLoginApi = (
  idToken: string,
) => {
  return apiClient.post<AuthResponse>(
    "/api/auth/google",
    {
      idToken,
    },
  );
};

// Verify email
export const verifyEmailApi = (
  token: string,
) => {
  return apiClient.get<EmailVerificationResponse>(
    "/api/auth/verify-email",
    {
      params: {
        token,
      },
    },
  );
};

// Resend verification email
export const resendVerificationApi = (
  email: string,
) => {
  return apiClient.post<EmailVerificationResponse>(
    "/api/auth/resend-verification",
    {
      email,
    },
  );
};

// Request a password reset email
export const forgotPasswordApi = (
  email: string,
) => {
  return apiClient.post<MessageResponse>(
    "/api/auth/forgot-password",
    {
      email,
    },
  );
};

// Reset password using the token from the email
export const resetPasswordApi = (data: {
  token: string;
  newPassword: string;
  confirmPassword: string;
}) => {
  return apiClient.post<MessageResponse>(
    "/api/auth/reset-password",
    data,
  );
};

// Get authenticated user
export const getAuthMeApi = () => {
  return apiClient.get("/api/auth/me");
};

// Refresh access token
export const refreshTokenApi = (
  refreshToken: string,
) => {
  return apiClient.post<AuthResponse>(
    "/api/auth/refresh",
    {
      refreshToken,
    },
  );
};

// Logout
export const logoutApi = () => {
  return apiClient.post("/api/auth/logout", {
    refreshToken:
      localStorage.getItem("refreshToken"),
  });
};

// Get profile
export const getMyAccountApi = () => {
  return apiClient.get("/api/account/me");
};

// Update profile
export const updateMyAccountApi = (data: {
  fullName?: string;
  avatarUrl?: string;
  phone?: string;
  bio?: string;
}) => {
  return apiClient.put(
    "/api/account/me",
    data,
  );
};

// Change password
export const changePasswordApi = (data: {
  currentPassword: string;
  newPassword: string;
}) => {
  return apiClient.put(
    "/api/account/change-password",
    data,
  );
};