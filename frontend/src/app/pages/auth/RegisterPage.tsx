import { NavLink, useNavigate } from "react-router";
import {
  Mail,
  Lock,
  ArrowRight,
  Eye,
  EyeOff,
} from "lucide-react";
import {
  useState,
  type FormEvent,
} from "react";
import { toast } from "sonner";
import { registerApi } from "../../services/authApi";

const PENDING_EMAIL_KEY = "pendingVerificationEmail";
const RESEND_AVAILABLE_AT_KEY =
  "verificationResendAvailableAt";

export function RegisterPage() {
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] =
    useState(false);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleRegister = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    const normalizedEmail = email
      .trim()
      .toLowerCase();

    const fullName =
      `${firstName.trim()} ${lastName.trim()}`.trim();

    if (
      !firstName.trim() ||
      !lastName.trim() ||
      !normalizedEmail ||
      !password
    ) {
      toast.error("Vui lòng nhập đầy đủ thông tin.");
      return;
    }

    if (password.length < 6) {
      toast.error(
        "Mật khẩu phải có ít nhất 6 ký tự.",
      );
      return;
    }

    setIsLoading(true);

    try {
      const response = await registerApi({
        fullName,
        email: normalizedEmail,
        password,
      });

      const verificationEmail =
        response.data.email || normalizedEmail;

      /*
       * API register không trả JWT.
       * Chỉ lưu email tạm trong sessionStorage để
       * sử dụng tại trang gửi lại email.
       */
      sessionStorage.setItem(
        PENDING_EMAIL_KEY,
        verificationEmail,
      );

      // Backend có cooldown 60 giây.
      sessionStorage.setItem(
        RESEND_AVAILABLE_AT_KEY,
        String(Date.now() + 60_000),
      );

      toast.success(
        response.data.message ||
          "Đăng ký thành công. Hãy kiểm tra email.",
      );

      navigate("/check-email", {
        replace: true,
        state: {
          email: verificationEmail,
        },
      });
    } catch (error: any) {
      console.error("Register error:", error);

      const message =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        "Không thể đăng ký tài khoản.";

      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

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
            Create Account
          </h1>

          <p className="text-slate-500 dark:text-slate-400">
            Create an account and verify your email
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] shadow-xl shadow-slate-200/50 dark:shadow-slate-950/40 border border-slate-200 dark:border-slate-700">
          <form
            onSubmit={handleRegister}
            className="space-y-6"
          >
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  First Name
                </label>

                <input
                  type="text"
                  required
                  value={firstName}
                  onChange={(event) =>
                    setFirstName(event.target.value)
                  }
                  placeholder="Alex"
                  autoComplete="given-name"
                  className="w-full px-4 py-3 bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 placeholder:text-slate-400 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Last Name
                </label>

                <input
                  type="text"
                  required
                  value={lastName}
                  onChange={(event) =>
                    setLastName(event.target.value)
                  }
                  placeholder="Johnson"
                  autoComplete="family-name"
                  className="w-full px-4 py-3 bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 placeholder:text-slate-400 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Email Address
              </label>

              <div className="relative group">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-blue-500" />

                <input
                  type="email"
                  required
                  value={email}
                  onChange={(event) =>
                    setEmail(event.target.value)
                  }
                  placeholder="name@example.com"
                  autoComplete="email"
                  className="w-full pl-11 pr-4 py-3 bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 placeholder:text-slate-400 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Password
              </label>

              <div className="relative group">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-blue-500" />

                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(event) =>
                    setPassword(event.target.value)
                  }
                  placeholder="At least 6 characters"
                  autoComplete="new-password"
                  className="w-full pl-11 pr-12 py-3 bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 placeholder:text-slate-400 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowPassword((previous) => !previous)
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-500 hover:text-blue-600"
                  aria-label={
                    showPassword
                      ? "Hide password"
                      : "Show password"
                  }
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <input
                id="accept-terms"
                type="checkbox"
                required
                className="mt-1 w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />

              <label
                htmlFor="accept-terms"
                className="text-sm text-slate-700 dark:text-slate-300"
              >
                I agree to the{" "}
                <a
                  href="#"
                  className="text-blue-600 font-semibold hover:underline"
                >
                  Terms of Service
                </a>{" "}
                and{" "}
                <a
                  href="#"
                  className="text-blue-600 font-semibold hover:underline"
                >
                  Privacy Policy
                </a>
                .
              </label>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoading
                ? "Creating account..."
                : "Create Free Account"}

              {!isLoading && (
                <ArrowRight className="w-5 h-5" />
              )}
            </button>
          </form>
        </div>

        <p className="text-center mt-8 text-slate-500 dark:text-slate-400 font-medium">
          Already have an account?{" "}
          <NavLink
            to="/login"
            className="text-blue-600 font-bold hover:underline"
          >
            Log in
          </NavLink>
        </p>
      </div>
    </div>
  );
}