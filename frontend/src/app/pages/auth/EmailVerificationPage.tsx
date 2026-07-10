import {
  useEffect,
  useRef,
  useState,
} from "react";
import {
  ArrowRight,
  CheckCircle2,
  LoaderCircle,
  MailWarning,
} from "lucide-react";
import {
  NavLink,
  useNavigate,
  useSearchParams,
} from "react-router";
import { verifyEmailApi } from "../../services/authApi";

type VerificationStatus =
  | "verifying"
  | "success"
  | "error";

export function EmailVerificationPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  /*
   * React StrictMode có thể gọi effect hai lần
   * trong môi trường development.
   */
  const requestStarted = useRef(false);

  const [status, setStatus] =
    useState<VerificationStatus>("verifying");

  const [message, setMessage] = useState(
    "Đang xác thực email của bạn...",
  );

  useEffect(() => {
    if (requestStarted.current) {
      return;
    }

    requestStarted.current = true;

    const token =
      searchParams.get("token")?.trim();

    if (!token) {
      setStatus("error");
      setMessage(
        "Đường link xác thực không chứa token.",
      );
      return;
    }

    let redirectTimer: number | undefined;

    const verifyEmail = async () => {
      try {
        const response =
          await verifyEmailApi(token);

        const verifiedEmail =
          response.data.email?.trim();

        if (verifiedEmail) {
          sessionStorage.setItem(
            "pendingVerificationEmail",
            verifiedEmail,
          );
        }

        sessionStorage.removeItem(
          "verificationResendAvailableAt",
        );

        setStatus("success");

        setMessage(
          response.data.message ||
            "Xác thực email thành công.",
        );

        redirectTimer = window.setTimeout(() => {
          navigate("/verify-email-success", {
            replace: true,
            state: {
              email: verifiedEmail,
              message: response.data.message,
            },
          });
        }, 1200);
      } catch (error: any) {
        setStatus("error");

        setMessage(
          error?.response?.data?.message ||
            error?.response?.data?.error ||
            "Không thể xác thực email. Đường link có thể đã hết hạn hoặc không hợp lệ.",
        );
      }
    };

    void verifyEmail();

    return () => {
      if (redirectTimer) {
        window.clearTimeout(redirectTimer);
      }
    };
  }, [navigate, searchParams]);

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
          {status === "verifying" && (
            <>
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center">
                <LoaderCircle className="w-10 h-10 text-blue-600 animate-spin" />
              </div>

              <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white mb-3">
                Đang xác thực email
              </h1>
            </>
          )}

          {status === "success" && (
            <>
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center">
                <CheckCircle2 className="w-10 h-10 text-emerald-600" />
              </div>

              <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white mb-3">
                Xác thực thành công
              </h1>
            </>
          )}

          {status === "error" && (
            <>
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center">
                <MailWarning className="w-10 h-10 text-rose-600" />
              </div>

              <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white mb-3">
                Xác thực thất bại
              </h1>
            </>
          )}

          <p
            className={`leading-6 ${
              status === "error"
                ? "text-rose-600 dark:text-rose-400"
                : "text-slate-500 dark:text-slate-400"
            }`}
          >
            {message}
          </p>

          {status === "success" && (
            <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
              Đang chuyển sang trang đăng nhập...
            </p>
          )}

          {status === "error" && (
            <div className="mt-6 space-y-3">
              <NavLink
                to="/check-email"
                className="w-full py-3.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 flex items-center justify-center gap-2"
              >
                Gửi lại email xác thực
                <ArrowRight className="w-5 h-5" />
              </NavLink>

              <NavLink
                to="/register"
                className="w-full py-3 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-center"
              >
                Quay lại đăng ký
              </NavLink>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}