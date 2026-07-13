import {
  NavLink,
  useNavigate,
  useSearchParams,
} from "react-router";

import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Link2Off,
  Lock,
  ShieldCheck,
} from "lucide-react";

import {
  useMemo,
  useState,
  type FormEvent,
} from "react";

import { motion } from "motion/react";
import { toast } from "sonner";

import {
  resetPasswordApi,
} from "../../services/authApi";

type PasswordStrengthBarProps = {
  password: string;
};

const getErrorMessage = (
  error: unknown,
): string => {
  if (
    typeof error === "object" &&
    error !== null &&
    "response" in error
  ) {
    const response = (
      error as {
        response?: {
          data?: {
            message?: string;
            error?: string;
          };
        };
      }
    ).response;

    return (
      response?.data?.message ||
      response?.data?.error ||
      "The password reset link is invalid or expired."
    );
  }

  return "The password reset link is invalid or expired.";
};

function PasswordStrengthBar({
  password,
}: PasswordStrengthBarProps) {
  const strength = useMemo(() => {
    let score = 0;

    if (password.length >= 8) {
      score += 1;
    }

    if (/[A-Z]/.test(password)) {
      score += 1;
    }

    if (/[0-9]/.test(password)) {
      score += 1;
    }

    if (/[^A-Za-z0-9]/.test(password)) {
      score += 1;
    }

    return score;
  }, [password]);

  const labels = [
    "",
    "Weak",
    "Fair",
    "Good",
    "Strong",
  ];

  const colors = [
    "",
    "bg-red-500",
    "bg-amber-500",
    "bg-blue-500",
    "bg-emerald-500",
  ];

  const textColors = [
    "",
    "text-red-500",
    "text-amber-500",
    "text-blue-500",
    "text-emerald-500",
  ];

  if (!password) {
    return null;
  }

  return (
    <div className="mt-2">
      <div className="mb-1 flex gap-1">
        {[1, 2, 3, 4].map(
          (item) => (
            <div
              key={item}
              className={`h-1.5 flex-1 rounded-full transition-all ${
                item <= strength
                  ? colors[strength]
                  : "bg-slate-200 dark:bg-slate-700"
              }`}
            />
          ),
        )}
      </div>

      <p
        className={`text-xs font-semibold ${textColors[strength]}`}
      >
        {labels[strength]} password
      </p>
    </div>
  );
}

export function ResetPasswordPage() {
  const navigate = useNavigate();

  const [
    searchParams,
  ] = useSearchParams();

  const token =
    searchParams.get("token")?.trim() ||
    "";

  const [
    showPassword,
    setShowPassword,
  ] = useState(false);

  const [
    showConfirm,
    setShowConfirm,
  ] = useState(false);

  const [
    password,
    setPassword,
  ] = useState("");

  const [
    confirmPassword,
    setConfirmPassword,
  ] = useState("");

  const [
    isLoading,
    setIsLoading,
  ] = useState(false);

  const [
    success,
    setSuccess,
  ] = useState(false);

  const requirements = useMemo(
    () => [
      {
        label: "At least 8 characters",
        met: password.length >= 8,
      },
      {
        label: "One uppercase letter",
        met: /[A-Z]/.test(password),
      },
      {
        label: "One number",
        met: /[0-9]/.test(password),
      },
      {
        label: "One special character",
        met: /[^A-Za-z0-9]/.test(
          password,
        ),
      },
    ],
    [password],
  );

  const allRequirementsMet =
    requirements.every(
      (requirement) =>
        requirement.met,
    );

  const passwordsMatch =
    Boolean(confirmPassword) &&
    password === confirmPassword;

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> => {
    event.preventDefault();

    if (!token) {
      toast.error(
        "The password reset link is invalid or missing.",
      );
      return;
    }

    if (
      password !== confirmPassword
    ) {
      toast.error(
        "Passwords do not match.",
      );
      return;
    }

    if (!allRequirementsMet) {
      toast.error(
        "Your password does not meet all requirements.",
      );
      return;
    }

    try {
      setIsLoading(true);

      const response =
        await resetPasswordApi({
          token,
          newPassword: password,
          confirmPassword,
        });

      setSuccess(true);

      toast.success(
        response.data?.message ||
          "Your password has been reset successfully.",
      );

      window.setTimeout(() => {
        navigate("/login", {
          replace: true,
        });
      }, 2000);
    } catch (error) {
      console.error(
        "Reset password failed:",
        error,
      );

      toast.error(
        getErrorMessage(error),
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6 dark:bg-slate-950">
        <motion.div
          initial={{
            opacity: 0,
            scale: 0.95,
          }}
          animate={{
            opacity: 1,
            scale: 1,
          }}
          className="w-full max-w-md rounded-[2rem] border border-red-200 bg-white p-8 text-center shadow-xl dark:border-red-500/30 dark:bg-slate-900"
        >
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-red-50 dark:bg-red-500/10">
            <Link2Off className="h-10 w-10 text-red-500" />
          </div>

          <h1 className="mb-3 text-3xl font-extrabold text-slate-900 dark:text-white">
            Invalid reset link
          </h1>

          <p className="mb-8 text-slate-500 dark:text-slate-400">
            This password reset link is missing or invalid. Request
            a new link to continue.
          </p>

          <NavLink
            to="/forgot-password"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-bold text-white transition-colors hover:bg-blue-700"
          >
            Request a New Link
            <ArrowRight className="h-5 w-5" />
          </NavLink>
        </motion.div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6 dark:bg-slate-950">
        <motion.div
          initial={{
            opacity: 0,
            scale: 0.95,
          }}
          animate={{
            opacity: 1,
            scale: 1,
          }}
          className="w-full max-w-md text-center"
        >
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-500/10">
            <CheckCircle2 className="h-10 w-10 text-emerald-500" />
          </div>

          <h1 className="mb-3 text-3xl font-extrabold text-slate-900 dark:text-white">
            Password Reset
          </h1>

          <p className="mb-8 text-slate-500 dark:text-slate-400">
            Your password has been updated successfully. Redirecting
            you to the login page.
          </p>

          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6 dark:bg-slate-950">
      <div className="w-full max-w-md">
        <div className="mb-10 text-center">
          <NavLink
            to="/"
            className="mb-8 inline-flex items-center gap-2"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-xl font-bold text-white">
              A
            </div>

            <span className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              AI Study Hub
            </span>
          </NavLink>

          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 dark:bg-blue-500/10">
            <ShieldCheck className="h-8 w-8 text-blue-600" />
          </div>

          <h1 className="mb-2 text-3xl font-extrabold text-slate-900 dark:text-white">
            Set New Password
          </h1>

          <p className="text-slate-500 dark:text-slate-400">
            Create a strong password for your account.
          </p>
        </div>

        <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-xl shadow-slate-200/50 dark:border-slate-700 dark:bg-slate-900 dark:shadow-slate-950/40">
          <form
            onSubmit={handleSubmit}
            className="space-y-6"
          >
            <div>
              <label
                htmlFor="new-password"
                className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300"
              >
                New Password
              </label>

              <div className="group relative">
                <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500 transition-colors group-focus-within:text-blue-500 dark:text-slate-400" />

                <input
                  id="new-password"
                  type={
                    showPassword
                      ? "text"
                      : "password"
                  }
                  required
                  minLength={8}
                  maxLength={72}
                  autoComplete="new-password"
                  value={password}
                  onChange={(event) =>
                    setPassword(
                      event.target.value,
                    )
                  }
                  placeholder="Create a strong password"
                  disabled={isLoading}
                  className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-12 text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-70 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-500"
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowPassword(
                      (previous) =>
                        !previous,
                    )
                  }
                  disabled={isLoading}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-slate-500 transition-colors hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-60 dark:text-slate-400 dark:hover:text-blue-400"
                  aria-label={
                    showPassword
                      ? "Hide password"
                      : "Show password"
                  }
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>

              <PasswordStrengthBar
                password={password}
              />
            </div>

            <div>
              <label
                htmlFor="confirm-password"
                className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300"
              >
                Confirm Password
              </label>

              <div className="group relative">
                <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500 transition-colors group-focus-within:text-blue-500 dark:text-slate-400" />

                <input
                  id="confirm-password"
                  type={
                    showConfirm
                      ? "text"
                      : "password"
                  }
                  required
                  minLength={8}
                  maxLength={72}
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(event) =>
                    setConfirmPassword(
                      event.target.value,
                    )
                  }
                  placeholder="Confirm your password"
                  disabled={isLoading}
                  className={`w-full rounded-xl border bg-white py-3 pl-11 pr-12 text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:ring-2 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-500 ${
                    confirmPassword &&
                    password !==
                      confirmPassword
                      ? "border-red-300 focus:border-red-500 focus:ring-red-500/20 dark:border-red-500/50"
                      : "border-slate-200 focus:border-blue-500 focus:ring-blue-500/20 dark:border-slate-700"
                  }`}
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowConfirm(
                      (previous) =>
                        !previous,
                    )
                  }
                  disabled={isLoading}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-slate-500 transition-colors hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-60 dark:text-slate-400 dark:hover:text-blue-400"
                  aria-label={
                    showConfirm
                      ? "Hide confirmation password"
                      : "Show confirmation password"
                  }
                >
                  {showConfirm ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>

              {confirmPassword &&
                password !==
                  confirmPassword && (
                  <p className="mt-1.5 text-xs font-semibold text-red-500">
                    Passwords do not match.
                  </p>
                )}
            </div>

            <div className="space-y-2 rounded-2xl bg-slate-50 p-4 dark:bg-slate-800">
              <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Password Requirements
              </p>

              {requirements.map(
                (requirement) => (
                  <div
                    key={
                      requirement.label
                    }
                    className="flex items-center gap-2"
                  >
                    <div
                      className={`flex h-4 w-4 items-center justify-center rounded-full transition-all ${
                        requirement.met
                          ? "bg-emerald-500"
                          : "bg-slate-200 dark:bg-slate-700"
                      }`}
                    >
                      {requirement.met && (
                        <CheckCircle2 className="h-3 w-3 text-white" />
                      )}
                    </div>

                    <span
                      className={`text-xs font-medium ${
                        requirement.met
                          ? "text-emerald-600 dark:text-emerald-300"
                          : "text-slate-500 dark:text-slate-400"
                      }`}
                    >
                      {
                        requirement.label
                      }
                    </span>
                  </div>
                ),
              )}
            </div>

            <button
              type="submit"
              disabled={
                isLoading ||
                !allRequirementsMet ||
                !passwordsMatch
              }
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3.5 font-bold text-white shadow-lg shadow-blue-500/20 transition-all hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading
                ? "Resetting..."
                : "Reset Password"}

              {!isLoading && (
                <ArrowRight className="h-5 w-5" />
              )}
            </button>
          </form>
        </div>

        <div className="mt-8 text-center">
          <NavLink
            to="/login"
            className="inline-flex items-center gap-2 font-medium text-slate-500 transition-colors hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Login
          </NavLink>
        </div>
      </div>
    </div>
  );
}