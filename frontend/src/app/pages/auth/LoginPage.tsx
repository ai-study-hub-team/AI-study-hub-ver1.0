import {
  NavLink,
  useNavigate,
} from "react-router";

import {
  Mail,
  Lock,
  ArrowRight,
  Eye,
  EyeOff,
} from "lucide-react";

import {
  useCallback,
  useState,
  type FormEvent,
} from "react";

import { toast } from "sonner";

import {
  googleLoginApi,
  loginApi,
  type AuthResponse,
} from "../../services/authApi";

import { GoogleSignInButton } from "../auth/GoogleSignInButton";

type JwtPayload = {
  id?: number | string;
  userId?: number | string;
  role?: string;
  roles?: string[];
  fullName?: string;
  name?: string;
  email?: string;
};

const PENDING_VERIFICATION_EMAIL_KEY =
  "pendingVerificationEmail";

const decodeJwtPayload = (
  token?: string,
): JwtPayload => {
  try {
    const encodedPayload =
      token?.split(".")[1];

    if (!encodedPayload) {
      return {};
    }

    const normalizedPayload =
      encodedPayload
        .replace(/-/g, "+")
        .replace(/_/g, "/");

    const paddedPayload =
      normalizedPayload.padEnd(
        Math.ceil(
          normalizedPayload.length / 4,
        ) * 4,
        "=",
      );

    return JSON.parse(
      atob(paddedPayload),
    ) as JwtPayload;
  } catch {
    return {};
  }
};

const clearCurrentAuthData = () => {
  localStorage.removeItem("token");
  localStorage.removeItem(
    "accessToken",
  );
  localStorage.removeItem("jwt");
  localStorage.removeItem(
    "refreshToken",
  );
  localStorage.removeItem("userId");
  localStorage.removeItem("role");
  localStorage.removeItem("email");
  localStorage.removeItem("fullName");
  localStorage.removeItem("name");
  localStorage.removeItem("user");
};

const saveAuthSession = (
  data: AuthResponse,
  fallbackEmail = "",
): string => {
  const accessToken =
    data.accessToken ||
    data.token ||
    data.jwt;

  if (!accessToken) {
    throw new Error(
      "The server did not return an access token.",
    );
  }

  const tokenPayload =
    decodeJwtPayload(accessToken);

  const userId =
    data.userId ??
    data.id ??
    data.user?.id ??
    data.user?.userId ??
    tokenPayload.userId ??
    tokenPayload.id;

  const rawRole =
    data.role ??
    data.user?.role ??
    data.user?.roles?.[0] ??
    tokenPayload.role ??
    tokenPayload.roles?.[0] ??
    "USER";

  const role = String(
    rawRole,
  ).toUpperCase();

  const fullName =
    data.fullName ??
    data.user?.fullName ??
    data.user?.name ??
    tokenPayload.fullName ??
    tokenPayload.name ??
    "";

  const userEmail =
    data.email ??
    data.user?.email ??
    tokenPayload.email ??
    fallbackEmail;

  clearCurrentAuthData();

  localStorage.setItem(
    "token",
    accessToken,
  );

  localStorage.setItem(
    "accessToken",
    accessToken,
  );

  if (data.refreshToken) {
    localStorage.setItem(
      "refreshToken",
      data.refreshToken,
    );
  }

  if (
    userId !== undefined &&
    userId !== null
  ) {
    localStorage.setItem(
      "userId",
      String(userId),
    );
  }

  localStorage.setItem(
    "role",
    role,
  );

  if (userEmail) {
    localStorage.setItem(
      "email",
      userEmail,
    );
  }

  if (fullName) {
    localStorage.setItem(
      "fullName",
      fullName,
    );
  }

  localStorage.setItem(
    "user",
    JSON.stringify({
      ...(data.user || {}),

      id:
        data.user?.id ??
        data.user?.userId ??
        userId,

      userId:
        data.user?.userId ??
        data.user?.id ??
        userId,

      email:
        data.user?.email ??
        userEmail,

      fullName:
        data.user?.fullName ??
        data.user?.name ??
        fullName,

      role:
        data.user?.role ??
        data.user?.roles?.[0] ??
        role,
    }),
  );

  sessionStorage.removeItem(
    PENDING_VERIFICATION_EMAIL_KEY,
  );

  sessionStorage.removeItem(
    "verificationResendAvailableAt",
  );

  return role;
};

const isUnverifiedEmailError = (
  message: string,
) => {
  return /not verified|unverified|verify your email|email verification|chưa xác thực|xác minh email/i.test(
    message,
  );
};

export function LoginPage() {
  const navigate = useNavigate();

  const [
    showPassword,
    setShowPassword,
  ] = useState(false);

  const [
    isLoading,
    setIsLoading,
  ] = useState(false);

  const [
    isGoogleLoading,
    setIsGoogleLoading,
  ] = useState(false);

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const navigateAfterLogin =
    useCallback(
      (role: string) => {
        if (
          role === "ADMIN" ||
          role === "ROLE_ADMIN"
        ) {
          navigate("/admin", {
            replace: true,
          });
        } else {
          navigate(
            "/app/dashboard",
            {
              replace: true,
            },
          );
        }
      },
      [navigate],
    );

  const handleLogin = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    const normalizedEmail =
      email.trim().toLowerCase();

    if (
      !normalizedEmail ||
      !password.trim()
    ) {
      toast.error(
        "Please enter email and password",
      );
      return;
    }

    setIsLoading(true);

    try {
      const response =
        await loginApi(
          normalizedEmail,
          password,
        );

      const role =
        saveAuthSession(
          response.data,
          normalizedEmail,
        );

      toast.success(
        "Login successful!",
      );

      navigateAfterLogin(role);
    } catch (error: any) {
      console.error(
        "Login error:",
        error,
      );

      const backendMessage =
        String(
          error?.response?.data
            ?.message ||
            error?.response?.data
              ?.error ||
            error?.message ||
            "Invalid email or password",
        );

      if (
        isUnverifiedEmailError(
          backendMessage,
        )
      ) {
        sessionStorage.setItem(
          PENDING_VERIFICATION_EMAIL_KEY,
          normalizedEmail,
        );

        toast.warning(
          "Your email has not been verified. Please check your inbox.",
        );

        navigate("/check-email", {
          replace: true,
          state: {
            email:
              normalizedEmail,
          },
        });

        return;
      }

      toast.error(
        backendMessage,
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleCredential =
    useCallback(
      async (
        idToken: string,
      ) => {
        setIsGoogleLoading(true);

        try {
          const response =
            await googleLoginApi(
              idToken,
            );

          const role =
            saveAuthSession(
              response.data,
            );

          toast.success(
            "Google login successful!",
          );

          navigateAfterLogin(role);
        } catch (error: any) {
          console.error(
            "Google login error:",
            error,
          );

          toast.error(
            error?.response?.data
              ?.message ||
              error?.response?.data
                ?.error ||
              error?.message ||
              "Google login failed.",
          );
        } finally {
          setIsGoogleLoading(
            false,
          );
        }
      },
      [navigateAfterLogin],
    );

  const pageBusy =
    isLoading ||
    isGoogleLoading;

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50 dark:bg-slate-950">
      <div className="max-w-md w-full">
        <div className="text-center mb-10">
          <NavLink
            to="/"
            className="inline-flex items-center gap-2 mb-8"
          >
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-xl">
              A
            </div>

            <span className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              AI Study Hub
            </span>
          </NavLink>

          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white mb-2">
            Welcome Back!
          </h1>

          <p className="text-slate-500 dark:text-slate-400">
            Sign in to continue your
            learning journey
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] shadow-xl shadow-slate-200/50 dark:shadow-slate-950/40 border border-slate-200 dark:border-slate-700">
          <form
            onSubmit={handleLogin}
            className="space-y-6"
          >
            <div>
              <label
                htmlFor="login-email"
                className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2"
              >
                Email Address
              </label>

              <div className="relative group">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 dark:text-slate-400 group-focus-within:text-blue-500 transition-colors" />

                <input
                  id="login-email"
                  type="email"
                  required
                  value={email}
                  onChange={(
                    event,
                  ) =>
                    setEmail(
                      event.target
                        .value,
                    )
                  }
                  placeholder="name@example.com"
                  autoComplete="email"
                  disabled={
                    pageBusy
                  }
                  className="w-full pl-11 pr-4 py-3 bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between mb-2">
                <label
                  htmlFor="login-password"
                  className="block text-sm font-semibold text-slate-700 dark:text-slate-300"
                >
                  Password
                </label>

                <NavLink
                  to="/forgot-password"
                  className="text-sm font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline"
                >
                  Forgot password?
                </NavLink>
              </div>

              <div className="relative group">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 dark:text-slate-400 group-focus-within:text-blue-500 transition-colors" />

                <input
                  id="login-password"
                  type={
                    showPassword
                      ? "text"
                      : "password"
                  }
                  required
                  value={password}
                  onChange={(
                    event,
                  ) =>
                    setPassword(
                      event.target
                        .value,
                    )
                  }
                  placeholder="••••••••"
                  autoComplete="current-password"
                  disabled={
                    pageBusy
                  }
                  className="w-full pl-11 pr-12 py-3 bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowPassword(
                      (
                        previous,
                      ) =>
                        !previous,
                    )
                  }
                  disabled={
                    pageBusy
                  }
                  aria-label={
                    showPassword
                      ? "Hide password"
                      : "Show password"
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors disabled:cursor-not-allowed"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={pageBusy}
              className="w-full py-3.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoading
                ? "Signing in..."
                : "Sign In"}

              {!isLoading && (
                <ArrowRight className="w-5 h-5" />
              )}
            </button>

            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200 dark:border-slate-700" />
              </div>

              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white dark:bg-slate-900 px-4 text-slate-500 dark:text-slate-400 font-semibold tracking-wider">
                  Or continue with
                </span>
              </div>
            </div>

            <GoogleSignInButton
              onCredential={
                handleGoogleCredential
              }
              disabled={pageBusy}
            />

            {isGoogleLoading && (
              <p className="text-center text-sm font-medium text-blue-600 dark:text-blue-400">
                Signing in with
                Google...
              </p>
            )}
          </form>
        </div>

        <p className="text-center mt-8 text-slate-500 dark:text-slate-400 font-medium">
          Don&apos;t have an
          account?{" "}
          <NavLink
            to="/register"
            className="text-blue-600 dark:text-blue-400 font-bold hover:text-blue-700 dark:hover:text-blue-300 hover:underline"
          >
            Sign up for free
          </NavLink>
        </p>
      </div>
    </div>
  );
}