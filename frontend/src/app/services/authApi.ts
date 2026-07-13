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

// Đăng ký
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

// Đăng nhập bằng email/password
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

// Đăng nhập bằng Google ID Token
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

// Xác thực email
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

// Gửi lại email xác thực
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

// Lấy user đang đăng nhập
export const getAuthMeApi = () => {
  return apiClient.get(
    "/api/auth/me",
  );
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

/**
 * Backend đã có:
 * POST /api/auth/logout
 *
 * Body:
 * {
 *   refreshToken: "..."
 * }
 */
export const logoutApi =
  async (): Promise<void> => {
    const refreshToken =
      localStorage
        .getItem("refreshToken")
        ?.trim();

    /*
     * Nếu refresh token đã mất thì vẫn cho phép
     * frontend tiếp tục xóa dữ liệu đăng nhập.
     */
    if (!refreshToken) {
      return;
    }

    await apiClient.post(
      "/api/auth/logout",
      {
        refreshToken,
      },
    );
  };

// Lấy profile
export const getMyAccountApi = () => {
  return apiClient.get(
    "/api/account/me",
  );
};

// Cập nhật profile
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

// Đổi mật khẩu
export const changePasswordApi = (data: {
  currentPassword: string;
  newPassword: string;
}) => {
  return apiClient.put(
    "/api/account/change-password",
    data,
  );
};