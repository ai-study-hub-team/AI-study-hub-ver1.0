import { Outlet, NavLink, useLocation, useNavigate } from "react-router";
import {
  LayoutDashboard,
  FileText,
  Library,
  MessageSquare,
  FileSearch,
  Puzzle,
  User,
  LogOut,
  Bell,
  ShieldCheck,
  Menu,
  Moon,
  Sun,
  HardDrive,
  CreditCard,
  Users,
  Flag,
  BarChart2,
  Zap,
  UploadCloud,
  Folder,
  Trash2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { useTheme } from "./ThemeProvider";
import Chatbot3D from "../app/components/ui/Chatbot3D";
import { GlobalDocumentSearch } from "../app/components/ui/GlobalDocumentSearch";
import { subscriptionApi } from "../app/services/subscriptionApi";

interface DashboardLayoutProps {
  isAdmin?: boolean;
}

type StoredUser = {
  id?: number;
  userId?: number;
  fullName?: string;
  name?: string;
  email?: string;
  role?: string;
};

const getStoredUser = (): StoredUser | null => {
  try {
    const rawUser = localStorage.getItem("user");
    if (!rawUser) return null;
    return JSON.parse(rawUser);
  } catch {
    return null;
  }
};

const getRoleFromToken = (): string | null => {
  try {
    const token =
      localStorage.getItem("token") ||
      localStorage.getItem("accessToken") ||
      localStorage.getItem("jwt");

    const encodedPayload = token?.split(".")[1];
    if (!encodedPayload) return null;

    const payload = JSON.parse(
      atob(encodedPayload.replace(/-/g, "+").replace(/_/g, "/")),
    ) as {
      role?: string;
      roles?: string[];
      authorities?: string[];
    };

    return payload.role || payload.roles?.[0] || payload.authorities?.[0] || null;
  } catch {
    return null;
  }
};

const getCurrentFullName = () => {
  const storedUser = getStoredUser();

  return (
    localStorage.getItem("fullName") ||
    storedUser?.fullName ||
    storedUser?.name ||
    localStorage.getItem("email") ||
    storedUser?.email ||
    "User"
  );
};

const getCurrentRole = () => {
  const storedUser = getStoredUser();

  return (
    localStorage.getItem("role") ||
    storedUser?.role ||
    getRoleFromToken() ||
    "STUDENT"
  );
};

const getInitials = (name: string) => {
  const cleanName = name.trim();
  if (!cleanName) return "U";

  const parts = cleanName.split(/\s+/);

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return parts
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
};

export function DashboardLayout({ isAdmin = false }: DashboardLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [displayName, setDisplayName] = useState(getCurrentFullName());
  const [displayRole, setDisplayRole] = useState(getCurrentRole());
  const [displayPlan, setDisplayPlan] = useState<"Free" | "Pro">("Free");

  const location = useLocation();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  const avatarText = useMemo(() => {
    return getInitials(displayName);
  }, [displayName]);

  const isCurrentAdmin = useMemo(() => {
    const role = displayRole?.trim().toUpperCase();

    return (
      isAdmin ||
      role === "ADMIN" ||
      role === "ROLE_ADMIN" ||
      role === "ADMINISTRATOR"
    );
  }, [displayRole, isAdmin]);

  const roleText = useMemo(() => {
    if (isCurrentAdmin) return "Administrator";
    return `User · ${displayPlan}`;
  }, [isCurrentAdmin, displayPlan]);

  useEffect(() => {
    setDisplayName(getCurrentFullName());
    setDisplayRole(getCurrentRole());

    const fetchCurrentPlan = async () => {
      if (isAdmin) {
        setDisplayPlan("Pro");
        return;
      }

      try {
        const res = await subscriptionApi.getCurrentSubscription();

        const code = res.data?.plan?.code?.toUpperCase();
        const status = res.data?.status?.toUpperCase();

        const isActivePro =
          code === "PRO" && (status === "ACTIVE" || status === "VALID");

        setDisplayPlan(isActivePro ? "Pro" : "Free");
      } catch (error) {
        console.warn("Load current plan failed, fallback to Free:", error);
        setDisplayPlan("Free");
      }
    };

    fetchCurrentPlan();
  }, [location.pathname, isAdmin]);

  const studentLinks = [
    { to: "/app/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { to: "/app/categories", icon: Folder, label: "Categories" },
    { to: "/app/upload", icon: UploadCloud, label: "Upload" },
    { to: "/app/library", icon: Library, label: "My Library" },
    { to: "/app/trash", icon: Trash2, label: "Trash" },
    { to: "/app/chat", icon: MessageSquare, label: "AI Chat" },
    { to: "/app/summary", icon: FileSearch, label: "AI Summary" },
    { to: "/app/quiz", icon: Puzzle, label: "Quiz Generator" },
    { to: "/app/storage", icon: HardDrive, label: "Cloud Storage" },
    { to: "/app/subscription", icon: CreditCard, label: "Subscription" },
    { to: "/app/profile", icon: User, label: "Profile" },
  ];

  const adminLinks = [
    { to: "/admin", icon: ShieldCheck, label: "Overview" },
    { to: "/admin/analytics", icon: BarChart2, label: "Analytics" },
    { to: "/admin/users", icon: Users, label: "User Management" },
    { to: "/admin/documents", icon: FileText, label: "Documents" },
    { to: "/admin/reports", icon: Flag, label: "Reports" },
    { to: "/admin/subscriptions", icon: CreditCard, label: "Subscriptions" },
    { to: "/app/dashboard", icon: LayoutDashboard, label: "User View" },
  ];

  const links = isAdmin ? adminLinks : studentLinks;

  const isExactActive = (to: string) => {
    if (to === "/admin") return location.pathname === "/admin";
    return location.pathname.startsWith(to);
  };

  const handleLogout = () => {
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

    navigate("/login");
  };

  return (
    <div className="relative flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <motion.aside
        initial={false}
        animate={{ width: isSidebarOpen ? 260 : 80 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="relative z-20 flex flex-col h-full bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 shadow-sm"
      >
        <div className="flex items-center h-16 px-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-2 overflow-hidden whitespace-nowrap">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-600 text-white shrink-0">
              <span className="font-bold text-lg">A</span>
            </div>

            {isSidebarOpen && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="font-bold text-xl text-slate-800 dark:text-white tracking-tight"
              >
                AI Study Hub
              </motion.span>
            )}
          </div>

          <button
            type="button"
            onClick={() => setIsSidebarOpen((prev) => !prev)}
            className="ml-auto p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors shrink-0"
          >
            <Menu className="w-4 h-4" />
          </button>
        </div>

        <nav className="flex-1 px-3 py-5 space-y-1 overflow-y-auto overflow-x-hidden">
          {isAdmin && isSidebarOpen && (
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest px-3 pb-2">
              Admin Panel
            </p>
          )}

          {links.map((link) => {
            const active = isExactActive(link.to);

            return (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === "/admin"}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group ${
                  active
                    ? "bg-blue-600 text-white font-medium hover:bg-blue-700"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
                }`}
                title={!isSidebarOpen ? link.label : undefined}
              >
                <link.icon
                  className={`w-5 h-5 shrink-0 transition-colors ${
                    active
                      ? "text-white"
                      : "text-slate-400 group-hover:text-slate-600 dark:group-hover:text-white"
                  }`}
                />

                {isSidebarOpen && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="truncate text-sm"
                  >
                    {link.label}
                  </motion.span>
                )}

                {!isSidebarOpen && link.label === "Reports" && (
                  <div className="absolute left-14 w-2 h-2 bg-red-500 rounded-full" />
                )}
              </NavLink>
            );
          })}
        </nav>

        <div className="p-3 border-t border-slate-100 dark:border-slate-800 shrink-0 space-y-2">
          {!isAdmin && isCurrentAdmin && (
            <NavLink
              to="/admin"
              className="flex items-center gap-3 px-3 py-2.5 text-blue-600 dark:text-blue-300 border border-blue-200 dark:border-blue-500/30 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-xl transition-colors"
              title={!isSidebarOpen ? "Back to Admin Panel" : undefined}
            >
              <ShieldCheck className="w-5 h-5 shrink-0" />

              {isSidebarOpen && (
                <span className="text-sm font-semibold">
                  Back to Admin Panel
                </span>
              )}
            </NavLink>
          )}

          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl transition-colors"
            title={!isSidebarOpen ? "Log Out" : undefined}
          >
            <LogOut className="w-5 h-5 shrink-0" />

            {isSidebarOpen && (
              <span className="text-sm font-medium">Log Out</span>
            )}
          </button>
        </div>
      </motion.aside>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-16 flex items-center gap-4 px-6 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <GlobalDocumentSearch />

          <div className="ml-auto flex items-center gap-3">
            {!isCurrentAdmin && displayPlan === "Free" && (
              <NavLink
                to="/app/subscription/upgrade"
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-bold rounded-xl hover:opacity-90 transition-opacity"
              >
                <Zap className="w-3 h-3" />
                Upgrade Pro
              </NavLink>
            )}

            <button
              type="button"
              onClick={toggleTheme}
              className="p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              title={
                theme === "light"
                  ? "Switch to dark mode"
                  : "Switch to light mode"
              }
            >
              {theme === "light" ? (
                <Moon className="w-5 h-5" />
              ) : (
                <Sun className="w-5 h-5" />
              )}
            </button>

            <button
              type="button"
              className="relative p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              <Bell className="w-5 h-5" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 border-2 border-white dark:border-slate-900 rounded-full" />
            </button>

            <div className="h-8 w-px bg-slate-200 dark:bg-slate-700" />

            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-slate-900 dark:text-white leading-none">
                  {displayName}
                </p>

                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {roleText}
                </p>
              </div>

              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 border-2 border-white dark:border-slate-900 shadow-sm flex items-center justify-center text-white font-bold text-sm">
                {avatarText}
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6 md:p-8 bg-slate-50 dark:bg-slate-950">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>

      {!isAdmin && (
  <div className="fixed bottom-3 right-3 z-[9999]">
    <div className="relative w-[140px] h-[110px]">
      <div className="absolute bottom-0 right-0 w-[85px] h-[85px]">
        <Chatbot3D />
      </div>
    </div>
  </div>
)}
    </div>
  );
}