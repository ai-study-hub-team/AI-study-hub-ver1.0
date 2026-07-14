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

export type RegisterPayload = {
  fullName: string;
  email: string;
  password: string;
};

export type UpdateMyAccountPayload = {
  fullName?: string;
  avatarUrl?: string;
  phone?: string;
  bio?: string;
};

export type ChangePasswordPayload = {
  currentPassword: string;
  newPassword: string;
};

// Register a new account.
export const registerApi = (data: RegisterPayload) => {
  return apiClient.post<EmailVerificationResponse>(
    "/api/auth/register",
    data,
  );
};

// Sign in with email and password.
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

// Sign in with a Google ID token.
export const googleLoginApi = (idToken: string) => {
  return apiClient.post<AuthResponse>(
    "/api/auth/google",
    {
      idToken,
    },
  );
};

// Verify an email address.
export const verifyEmailApi = (token: string) => {
  return apiClient.get<EmailVerificationResponse>(
    "/api/auth/verify-email",
    {
      params: { token },
    },
  );
};

// Resend the verification email.
export const resendVerificationApi = (email: string) => {
  return apiClient.post<EmailVerificationResponse>(
    "/api/auth/resend-verification",
    {
      email,
    },
  );
};

// Get the currently authenticated user.
export const getAuthMeApi = () => {
  return apiClient.get("/api/auth/me");
};

// Refresh the access token.
export const refreshTokenApi = (refreshToken: string) => {
  return apiClient.post<AuthResponse>(
    "/api/auth/refresh",
    {
      refreshToken,
    },
  );
};

// Sign out and invalidate the refresh token.
export const logoutApi = () => {
  return apiClient.post("/api/auth/logout", {
    refreshToken: localStorage.getItem("refreshToken"),
  });
};

// Get the current user's account profile.
export const getMyAccountApi = () => {
  return apiClient.get("/api/account/me");
};

// Update the current user's account profile.
export const updateMyAccountApi = (
  data: UpdateMyAccountPayload,
) => {
  return apiClient.put("/api/account/me", data);
};

// Change the current user's password.
export const changePasswordApi = (
  data: ChangePasswordPayload,
) => {
  return apiClient.put(
    "/api/account/change-password",
    data,
  );
};