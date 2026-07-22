import {
  NavLink,
} from "react-router";

import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Mail,
} from "lucide-react";

import {
  useState,
  type FormEvent,
} from "react";

import {
  AnimatePresence,
  motion,
} from "motion/react";

import { toast } from "sonner";

import {
  forgotPasswordApi,
} from "../../services/authApi";

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
      "Unable to send the password reset email."
    );
  }

  return "Unable to send the password reset email.";
};

export function ForgotPasswordPage() {
  const [
    isLoading,
    setIsLoading,
  ] = useState(false);

  const [
    emailSent,
    setEmailSent,
  ] = useState(false);

  const [
    email,
    setEmail,
  ] = useState("");

  const sendResetEmail =
    async (): Promise<void> => {
      const normalizedEmail =
        email.trim().toLowerCase();

      if (!normalizedEmail) {
        toast.error(
          "Please enter your email address.",
        );
        return;
      }

      try {
        setIsLoading(true);

        const response =
          await forgotPasswordApi(
            normalizedEmail,
          );

        setEmail(
          normalizedEmail,
        );

        setEmailSent(true);

        toast.success(
          response.data?.message ||
            "A password reset link has been sent to your email.",
        );
      } catch (error) {
        console.error(
          "Forgot password request failed:",
          error,
        );

        toast.error(
          getErrorMessage(error),
        );
      } finally {
        setIsLoading(false);
      }
    };

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> => {
    event.preventDefault();
    await sendResetEmail();
  };

  const handleResend =
    async (): Promise<void> => {
      await sendResetEmail();
    };

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
        </div>

        <AnimatePresence mode="wait">
          {!emailSent ? (
            <motion.div
              key="forgot-password-form"
              initial={{
                opacity: 0,
                y: 20,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              exit={{
                opacity: 0,
                y: -20,
              }}
            >
              <div className="mb-8 text-center">
                <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 dark:bg-blue-500/10">
                  <Mail className="h-8 w-8 text-blue-600" />
                </div>

                <h1 className="mb-2 text-3xl font-extrabold text-slate-900 dark:text-white">
                  Forgot Password?
                </h1>

                <p className="text-slate-500 dark:text-slate-400">
                  Enter your email address and we will send you a
                  password reset link.
                </p>
              </div>

              <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-xl shadow-slate-200/50 dark:border-slate-700 dark:bg-slate-900 dark:shadow-slate-950/40">
                <form
                  onSubmit={handleSubmit}
                  className="space-y-6"
                >
                  <div>
                    <label
                      htmlFor="forgot-password-email"
                      className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300"
                    >
                      Email Address
                    </label>

                    <div className="group relative">
                      <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500 transition-colors group-focus-within:text-blue-500 dark:text-slate-400" />

                      <input
                        id="forgot-password-email"
                        type="email"
                        required
                        autoComplete="email"
                        value={email}
                        onChange={(event) =>
                          setEmail(
                            event.target.value,
                          )
                        }
                        placeholder="name@example.com"
                        disabled={isLoading}
                        className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-70 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-500"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={
                      isLoading ||
                      !email.trim()
                    }
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3.5 font-bold text-white shadow-lg shadow-blue-500/20 transition-all hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {isLoading
                      ? "Sending..."
                      : "Send Reset Link"}

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
            </motion.div>
          ) : (
            <motion.div
              key="forgot-password-success"
              initial={{
                opacity: 0,
                scale: 0.95,
              }}
              animate={{
                opacity: 1,
                scale: 1,
              }}
              className="text-center"
            >
              <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-500/10">
                <CheckCircle2 className="h-10 w-10 text-emerald-500" />
              </div>

              <h1 className="mb-3 text-3xl font-extrabold text-slate-900 dark:text-white">
                Check your inbox
              </h1>

              <p className="mb-2 text-slate-500 dark:text-slate-400">
                We sent a password reset link to
              </p>

              <p className="mb-8 break-all font-bold text-slate-900 dark:text-white">
                {email}
              </p>

              <div className="mb-8 rounded-[2rem] border border-slate-200 bg-white p-8 text-left shadow-xl shadow-slate-200/50 dark:border-slate-700 dark:bg-slate-900 dark:shadow-slate-950/40">
                <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
                  The link may take a few minutes to arrive. Check
                  your spam folder if you cannot find it.
                </p>

                <button
                  type="button"
                  onClick={() => {
                    void handleResend();
                  }}
                  disabled={isLoading}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-3.5 font-bold text-blue-600 transition-all hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-70 dark:border-slate-700 dark:bg-slate-800 dark:text-blue-400 dark:hover:bg-slate-700"
                >
                  <Mail className="h-5 w-5" />

                  {isLoading
                    ? "Sending..."
                    : "Resend Email"}
                </button>
              </div>

              <div className="flex flex-col items-center gap-4">
                <button
                  type="button"
                  onClick={() =>
                    setEmailSent(false)
                  }
                  disabled={isLoading}
                  className="font-semibold text-blue-600 transition-colors hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-60 dark:text-blue-400"
                >
                  Use another email address
                </button>

                <NavLink
                  to="/login"
                  className="inline-flex items-center gap-2 font-medium text-slate-500 transition-colors hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to Login
                </NavLink>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}