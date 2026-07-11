import {
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Mail,
  RefreshCw,
  ArrowLeft,
  ExternalLink,
} from "lucide-react";
import {
  NavLink,
  useLocation,
} from "react-router";
import { toast } from "sonner";
import { resendVerificationApi } from "../../services/authApi";

type CheckEmailLocationState = {
  email?: string;
};

const PENDING_EMAIL_KEY = "pendingVerificationEmail";
const RESEND_AVAILABLE_AT_KEY =
  "verificationResendAvailableAt";
const RESEND_COOLDOWN_MS = 60_000;

const getRemainingSeconds = (): number => {
  const availableAt = Number(
    sessionStorage.getItem(
      RESEND_AVAILABLE_AT_KEY,
    ) || "0",
  );

  return Math.max(
    0,
    Math.ceil((availableAt - Date.now()) / 1000),
  );
};

export function CheckEmailPage() {
  const location = useLocation();

  const locationState =
    location.state as CheckEmailLocationState | null;

  const email = useMemo(() => {
    return (
      locationState?.email?.trim() ||
      sessionStorage
        .getItem(PENDING_EMAIL_KEY)
        ?.trim() ||
      ""
    );
  }, [locationState?.email]);

  const [secondsLeft, setSecondsLeft] =
    useState(getRemainingSeconds);

  const [isResending, setIsResending] =
    useState(false);

  useEffect(() => {
    if (secondsLeft <= 0) {
      return;
    }

    const timer = window.setInterval(() => {
      const remaining = getRemainingSeconds();

      setSecondsLeft(remaining);

      if (remaining <= 0) {
        window.clearInterval(timer);
      }
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [secondsLeft]);

  const startCooldown = (
    seconds = RESEND_COOLDOWN_MS / 1000,
  ) => {
    const availableAt =
      Date.now() + seconds * 1000;

    sessionStorage.setItem(
      RESEND_AVAILABLE_AT_KEY,
      String(availableAt),
    );

    setSecondsLeft(seconds);
  };

  const handleResend = async () => {
    if (!email) {
      toast.error(
        "Không tìm thấy email. Vui lòng đăng ký lại.",
      );
      return;
    }

    setIsResending(true);

    try {
      const response =
        await resendVerificationApi(email);

      if (response.data.emailVerified) {
        toast.success(
          "Email đã được xác thực. Bạn có thể đăng nhập.",
        );
        return;
      }

      startCooldown(60);

      toast.success(
        response.data.message ||
          "Đã gửi lại email xác thực.",
      );
    } catch (error: any) {
      const message = String(
        error?.response?.data?.message ||
          error?.response?.data?.error ||
          "Không thể gửi lại email xác thực.",
      );

      /*
       * Ví dụ backend trả:
       * "Please wait 42 seconds before resending"
       */
      const waitMatch = message.match(
        /wait\s+(\d+)\s+seconds/i,
      );

      if (waitMatch) {
        const waitSeconds = Number(waitMatch[1]);

        if (
          Number.isInteger(waitSeconds) &&
          waitSeconds > 0
        ) {
          startCooldown(waitSeconds);
        }
      }

      toast.error(message);
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50 dark:bg-slate-950">
      <div className="w-full max-w-md text-center">
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

        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] shadow-xl border border-slate-200 dark:border-slate-700">
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center">
            <Mail className="w-10 h-10 text-blue-600" />
          </div>

          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white mb-3">
            Kiểm tra email của bạn
          </h1>

          {email ? (
            <>
              <p className="text-slate-500 dark:text-slate-400">
                Hệ thống đã gửi đường link xác thực đến
              </p>

              <p className="mt-2 font-bold text-slate-900 dark:text-white break-all">
                {email}
              </p>
            </>
          ) : (
            <p className="text-rose-600 dark:text-rose-400">
              Không tìm thấy email đăng ký. Vui lòng
              quay lại trang đăng ký.
            </p>
          )}

          <div className="mt-6 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 text-left">
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Mở email và bấm nút{" "}
              <strong>Verify email</strong>. Hệ thống
              sẽ tự động xác thực tài khoản.
            </p>

            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Không thấy email? Hãy kiểm tra mục Spam
              hoặc Junk.
            </p>
          </div>

          <button
            type="button"
            onClick={handleResend}
            disabled={
              !email ||
              isResending ||
              secondsLeft > 0
            }
            className="mt-6 w-full py-3.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw
              className={`w-5 h-5 ${
                isResending ? "animate-spin" : ""
              }`}
            />

            {isResending
              ? "Đang gửi..."
              : secondsLeft > 0
                ? `Gửi lại sau ${secondsLeft}s`
                : "Gửi lại email xác thực"}
          </button>

          <a
            href="https://mail.google.com"
            target="_blank"
            rel="noreferrer"
            className="mt-3 w-full py-3 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-center gap-2"
          >
            Mở Gmail
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>

        <NavLink
          to="/register"
          className="mt-6 inline-flex items-center gap-2 text-blue-600 font-bold hover:underline"
        >
          <ArrowLeft className="w-4 h-4" />
          Đổi địa chỉ email
        </NavLink>
      </div>
    </div>
  );
}