export type StoredUser = {
  id?: number;
  userId?: number;
  email?: string;
  fullName?: string;
  name?: string;
  role?: string;
};

export const getStoredUser = (): StoredUser | null => {
  try {
    const rawUser = localStorage.getItem("user");

    if (!rawUser) {
      return null;
    }

    return JSON.parse(rawUser) as StoredUser;
  } catch {
    return null;
  }
};

export const getCurrentUserId = (): number | null => {
  const storedUser = getStoredUser();
  const storedUserId = Number(storedUser?.id ?? storedUser?.userId);

  if (!Number.isNaN(storedUserId) && storedUserId > 0) {
    return storedUserId;
  }

  const token =
    localStorage.getItem("token") ||
    localStorage.getItem("accessToken") ||
    localStorage.getItem("jwt");

  if (!token) {
    return null;
  }

  try {
    const encodedPayload = token.split(".")[1];

    if (!encodedPayload) {
      return null;
    }

    const payload = JSON.parse(
      atob(encodedPayload.replace(/-/g, "+").replace(/_/g, "/")),
    ) as {
      id?: number;
      userId?: number;
      sub?: string;
    };

    const tokenUserId = Number(payload.userId ?? payload.id);

    if (!Number.isNaN(tokenUserId) && tokenUserId > 0) {
      return tokenUserId;
    }

    return null;
  } catch {
    return null;
  }
};

export const clearAuthStorage = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("accessToken");
  localStorage.removeItem("jwt");
  localStorage.removeItem("user");
  localStorage.removeItem("role");
  localStorage.removeItem("fullName");
  localStorage.removeItem("name");
};