import {
  ArrowLeft,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";
import {
  useMemo,
  useState,
  type FormEvent,
} from "react";
import { useNavigate } from "react-router";
import { motion } from "motion/react";
import { toast } from "sonner";

import { userApi } from "../../services/userApi";

type ApiError = {
  response?: {
    data?: {
      message?: string;
      error?: string;
    };
  };
  message?: string;
};

const getErrorMessage = (
  error: unknown,
  fallbackMessage: string,
) => {
  const apiError = error as ApiError;

  return (
    apiError?.response?.data?.message ||
    apiError?.response?.data?.error ||
    apiError?.message ||
    fallbackMessage
  );
};

export function ChangePasswordPage() {
  const navigate = useNavigate();

  const [currentPassword, setCurrentPassword] =
    useState("");

  const [newPassword, setNewPassword] =
    useState("");

  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [
    showCurrentPassword,
    setShowCurrentPassword,
  ] = useState(false);

  const [
    showNewPassword,
    setShowNewPassword,
  ] = useState(false);

  const [
    showConfirmPassword,
    setShowConfirmPassword,
  ] = useState(false);

  const [saving, setSaving] = useState(false);

  const passwordRequirements = useMemo(
    () => [
      {
        label: "At least 8 characters",
        valid: newPassword.length >= 8,
      },
      {
        label: "Contains an uppercase letter",
        valid: /[A-Z]/.test(newPassword),
      },
      {
        label: "Contains a number",
        valid: /\d/.test(newPassword),
      },
      {
        label: "Contains a special character",
        valid: /[^A-Za-z0-9]/.test(
          newPassword,
        ),
      },
    ],
    [newPassword],
  );

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (!currentPassword.trim()) {
      toast.error(
        "Current password is required",
      );
      return;
    }

    if (!newPassword) {
      toast.error("New password is required");
      return;
    }

    if (
      passwordRequirements.some(
        (requirement) =>
          !requirement.valid,
      )
    ) {
      toast.error(
        "New password does not meet the requirements",
      );
      return;
    }

    if (currentPassword === newPassword) {
      toast.error(
        "New password must be different from current password",
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error(
        "Password confirmation does not match",
      );
      return;
    }

    setSaving(true);

    try {
      await userApi.changePassword({
        currentPassword,
        newPassword,
      });

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      toast.success(
        "Password changed successfully!",
      );

      navigate("/app/profile", {
        replace: true,
      });
    } catch (error) {
      console.error(
        "Change password failed:",
        error,
      );

      toast.error(
        getErrorMessage(
          error,
          "Cannot change password",
        ),
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <button
        type="button"
        onClick={() =>
          navigate("/app/profile")
        }
        className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Profile
      </button>

      <motion.div
        initial={{
          opacity: 0,
          y: 20,
        }}
        animate={{
          opacity: 1,
          y: 0,
        }}
        className="bg-white dark:bg-slate-900 p-8 md:p-10 rounded-[2.5rem] border border-slate-200 dark:border-slate-700 shadow-sm"
      >
        <div className="flex items-start gap-5 pb-8 mb-8 border-b border-slate-100 dark:border-slate-800">
          <div className="w-14 h-14 shrink-0 rounded-2xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400">
            <KeyRound className="w-7 h-7" />
          </div>

          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">
              Change Password
            </h1>

            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Update your account password to
              keep your account secure.
            </p>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-7"
        >
          <div>
            <label
              htmlFor="current-password"
              className="block mb-2 text-sm font-bold text-slate-700 dark:text-slate-300"
            >
              Current Password
            </label>

            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />

              <input
                id="current-password"
                type={
                  showCurrentPassword
                    ? "text"
                    : "password"
                }
                value={currentPassword}
                onChange={(event) =>
                  setCurrentPassword(
                    event.target.value,
                  )
                }
                disabled={saving}
                autoComplete="current-password"
                placeholder="Enter current password"
                className="w-full pl-12 pr-12 py-3.5 bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all disabled:opacity-60"
              />

              <button
                type="button"
                onClick={() =>
                  setShowCurrentPassword(
                    (previous) => !previous,
                  )
                }
                disabled={saving}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600"
                aria-label={
                  showCurrentPassword
                    ? "Hide current password"
                    : "Show current password"
                }
              >
                {showCurrentPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          <div>
            <label
              htmlFor="new-password"
              className="block mb-2 text-sm font-bold text-slate-700 dark:text-slate-300"
            >
              New Password
            </label>

            <div className="relative">
              <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />

              <input
                id="new-password"
                type={
                  showNewPassword
                    ? "text"
                    : "password"
                }
                value={newPassword}
                onChange={(event) =>
                  setNewPassword(
                    event.target.value,
                  )
                }
                disabled={saving}
                autoComplete="new-password"
                placeholder="Enter new password"
                className="w-full pl-12 pr-12 py-3.5 bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all disabled:opacity-60"
              />

              <button
                type="button"
                onClick={() =>
                  setShowNewPassword(
                    (previous) => !previous,
                  )
                }
                disabled={saving}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600"
                aria-label={
                  showNewPassword
                    ? "Hide new password"
                    : "Show new password"
                }
              >
                {showNewPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          <div>
            <label
              htmlFor="confirm-password"
              className="block mb-2 text-sm font-bold text-slate-700 dark:text-slate-300"
            >
              Confirm New Password
            </label>

            <div className="relative">
              <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />

              <input
                id="confirm-password"
                type={
                  showConfirmPassword
                    ? "text"
                    : "password"
                }
                value={confirmPassword}
                onChange={(event) =>
                  setConfirmPassword(
                    event.target.value,
                  )
                }
                disabled={saving}
                autoComplete="new-password"
                placeholder="Enter new password again"
                className="w-full pl-12 pr-12 py-3.5 bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all disabled:opacity-60"
              />

              <button
                type="button"
                onClick={() =>
                  setShowConfirmPassword(
                    (previous) => !previous,
                  )
                }
                disabled={saving}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600"
                aria-label={
                  showConfirmPassword
                    ? "Hide password confirmation"
                    : "Show password confirmation"
                }
              >
                {showConfirmPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          <div className="p-5 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
            <p className="text-sm font-bold text-slate-900 dark:text-white mb-3">
              Password requirements
            </p>

            <div className="space-y-2">
              {passwordRequirements.map(
                (requirement) => (
                  <div
                    key={requirement.label}
                    className="flex items-center gap-2"
                  >
                    <CheckCircle2
                      className={`w-4 h-4 ${
                        requirement.valid
                          ? "text-emerald-500"
                          : "text-slate-300 dark:text-slate-600"
                      }`}
                    />

                    <span
                      className={`text-sm ${
                        requirement.valid
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-slate-500 dark:text-slate-400"
                      }`}
                    >
                      {requirement.label}
                    </span>
                  </div>
                ),
              )}
            </div>
          </div>

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-5">
            <button
              type="button"
              onClick={() =>
                navigate("/app/profile")
              }
              disabled={saving}
              className="px-7 py-3.5 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-60"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
              className="px-7 py-3.5 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 shadow-lg shadow-blue-500/20 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {saving
                ? "Changing Password..."
                : "Change Password"}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}