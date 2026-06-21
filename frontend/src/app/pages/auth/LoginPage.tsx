import { NavLink, useNavigate } from "react-router";
import { FcGoogle } from "react-icons/fc";
import { Mail, Lock, ArrowRight, Eye, EyeOff } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { loginApi } from "../../services/authApi";

type JwtPayload = {
  id?: number | string;
  userId?: number | string;
  role?: string;
  roles?: string[];
  fullName?: string;
  name?: string;
  email?: string;
};

const decodeJwtPayload = (token?: string): JwtPayload => {
  try {
    const encodedPayload = token?.split(".")[1];

    if (!encodedPayload) return {};

    return JSON.parse(
      atob(encodedPayload.replace(/-/g, "+").replace(/_/g, "/")),
    ) as JwtPayload;
  } catch {
    return {};
  }
};

export function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const navigate = useNavigate();

  const handleLogin = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!email.trim() || !password.trim()) {
      toast.error("Please enter email and password");
      return;
    }

    setIsLoading(true);

    try {
      const res = await loginApi(email, password);

      console.log("Login response:", res.data);

      const accessToken =
        res.data.accessToken ||
        res.data.token ||
        res.data.jwt;
      const tokenPayload = decodeJwtPayload(accessToken);

      const refreshToken = res.data.refreshToken;

      const userId =
        res.data.userId ||
        res.data.id ||
        res.data.user?.id ||
        res.data.user?.userId ||
        tokenPayload.id ||
        tokenPayload.userId;

      const role =
        res.data.role ||
        res.data.user?.role ||
        res.data.user?.roles?.[0] ||
        tokenPayload.role ||
        tokenPayload.roles?.[0];

      const fullName =
        res.data.fullName ||
        res.data.user?.fullName ||
        res.data.user?.name ||
        tokenPayload.fullName ||
        tokenPayload.name ||
        "";

      const userEmail =
        res.data.email ||
        res.data.user?.email ||
        tokenPayload.email ||
        email;

      localStorage.removeItem("token");
      localStorage.removeItem("accessToken");
      localStorage.removeItem("jwt");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("userId");
      localStorage.removeItem("role");
      localStorage.removeItem("email");
      localStorage.removeItem("fullName");
      localStorage.removeItem("name");
      localStorage.removeItem("user");

      if (accessToken) {
        localStorage.setItem("token", accessToken);
        localStorage.setItem("accessToken", accessToken);
      }

      if (refreshToken) {
        localStorage.setItem("refreshToken", refreshToken);
      }

      if (userId) {
        localStorage.setItem("userId", String(userId));
      }

      if (role) {
        localStorage.setItem("role", role);
      }

      if (userEmail) {
        localStorage.setItem("email", userEmail);
      }

      if (fullName) {
        localStorage.setItem("fullName", fullName);
      }

      localStorage.setItem(
        "user",
        JSON.stringify(
          res.data.user
            ? {
                ...res.data.user,
                id: res.data.user.id ?? res.data.user.userId ?? userId,
                email: res.data.user.email ?? userEmail,
                fullName:
                  res.data.user.fullName ?? res.data.user.name ?? fullName,
                role: res.data.user.role ?? res.data.user.roles?.[0] ?? role,
              }
            : {
                id: userId,
                email: userEmail,
                fullName,
                role,
              },
        ),
      );

      toast.success("Login successful!");

      if (role === "ADMIN" || role === "ROLE_ADMIN") {
        navigate("/admin");
      } else {
        navigate("/app/dashboard");
      }
    } catch (error: any) {
      console.error("Login error:", error);

      toast.error(
        error?.response?.data?.message ||
          error?.response?.data?.error ||
          "Invalid email or password"
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50 dark:bg-slate-950">
      <div className="max-w-md w-full">
        <div className="text-center mb-10">
          <NavLink to="/" className="inline-flex items-center gap-2 mb-8">
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
            Sign in to continue your learning journey
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] shadow-xl shadow-slate-200/50 dark:shadow-slate-950/40 border border-slate-200 dark:border-slate-700">
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Email Address
              </label>

              <div className="relative group">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 dark:text-slate-400 group-focus-within:text-blue-500 transition-colors" />

                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full pl-11 pr-4 py-3 bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between mb-2">
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Password
                </label>

                <NavLink
                  to="/forgot-password"
                  className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                >
                  Forgot password?
                </NavLink>
              </div>

              <div className="relative group">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 dark:text-slate-400 group-focus-within:text-blue-500 transition-colors" />

                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-11 pr-12 py-3 bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
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
              disabled={isLoading}
              className="w-full py-3.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoading ? "Signing in..." : "Sign In"}
              {!isLoading && <ArrowRight className="w-5 h-5" />}
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

            <button
              type="button"
              className="w-full flex items-center justify-center gap-3 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors font-semibold text-slate-900 dark:text-white"
            >
              <FcGoogle className="w-5 h-5" />
              Continue with Google
            </button>
          </form>
        </div>

        <p className="text-center mt-8 text-slate-500 dark:text-slate-400 font-medium">
          Don&apos;t have an account?{" "}
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
