import {
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
} from "react-router";

import {
  BarChart2,
  CreditCard,
  FileSearch,
  FileText,
  Flag,
  Folder,
  HardDrive,
  LayoutDashboard,
  Library,
  LogOut,
  Menu,
  MessageSquare,
  Moon,
  Puzzle,
  Share2,
  ShieldCheck,
  Sun,
  Tags,
  Trash2,
  UploadCloud,
  User,
  Users,
  Zap,
} from "lucide-react";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { motion } from "motion/react";

import { useTheme } from "./ThemeProvider";
import { GlobalDocumentSearch } from "../app/components/ui/GlobalDocumentSearch";
import { NotificationBell } from "../app/components/notifications/NotificationBell";
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
  avatarUrl?: string | null;
  phone?: string | null;
};

type ProfileUpdatedDetail = {
  id?: number;
  fullName?: string;
  email?: string;
  role?: string;
  avatarUrl?: string | null;
  phone?: string | null;
};

type JwtPayload = {
  role?: string;
  roles?: string[];
  authorities?: string[];
};

const API_BASE_URL = (
  import.meta.env.VITE_API_URL ||
  "http://localhost:8080"
).replace(/\/$/, "");

const resolveAvatarUrl = (
  value?: string | null,
): string => {
  const normalizedValue =
    value?.trim() || "";

  if (!normalizedValue) {
    return "";
  }

  if (
    /^(https?:\/\/|data:|blob:)/i.test(
      normalizedValue,
    )
  ) {
    return normalizedValue;
  }

  return `${API_BASE_URL}${
    normalizedValue.startsWith("/")
      ? ""
      : "/"
  }${normalizedValue}`;
};

const appendCacheVersion = (
  url: string,
  version: number,
): string => {
  if (
    !url ||
    /^(data:|blob:)/i.test(url)
  ) {
    return url;
  }

  return `${url}${
    url.includes("?") ? "&" : "?"
  }v=${version}`;
};

const getStoredUser =
  (): StoredUser | null => {
    try {
      const rawUser =
        localStorage.getItem("user");

      if (!rawUser) {
        return null;
      }

      return JSON.parse(
        rawUser,
      ) as StoredUser;
    } catch {
      return null;
    }
  };

const decodeJwtPayload = (
  token: string,
): JwtPayload => {
  try {
    const encodedPayload =
      token.split(".")[1];

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

const getRoleFromToken =
  (): string | null => {
    const token =
      localStorage.getItem("token") ||
      localStorage.getItem(
        "accessToken",
      ) ||
      localStorage.getItem("jwt");

    if (!token) {
      return null;
    }

    const payload =
      decodeJwtPayload(token);

    return (
      payload.role ||
      payload.roles?.[0] ||
      payload.authorities?.[0] ||
      null
    );
  };

const getCurrentFullName =
  (): string => {
    const storedUser =
      getStoredUser();

    return (
      localStorage
        .getItem("fullName")
        ?.trim() ||
      storedUser?.fullName?.trim() ||
      storedUser?.name?.trim() ||
      localStorage
        .getItem("email")
        ?.trim() ||
      storedUser?.email?.trim() ||
      "User"
    );
  };

const getCurrentRole = (): string => {
  const storedUser = getStoredUser();

  return (
    localStorage
      .getItem("role")
      ?.trim() ||
    storedUser?.role?.trim() ||
    getRoleFromToken() ||
    "USER"
  );
};

const getCurrentAvatarUrl =
  (): string => {
    const storedUser =
      getStoredUser();

    return (
      storedUser?.avatarUrl?.trim() ||
      localStorage
        .getItem("avatarUrl")
        ?.trim() ||
      ""
    );
  };

const getInitials = (
  name: string,
): string => {
  const cleanName = name.trim();

  if (!cleanName) {
    return "U";
  }

  const parts = cleanName
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 1) {
    return parts[0]
      .slice(0, 2)
      .toUpperCase();
  }

  return (
    parts[0][0] +
    parts[parts.length - 1][0]
  ).toUpperCase();
};

export function DashboardLayout({
  isAdmin = false,
}: DashboardLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();

  const { theme, toggleTheme } =
    useTheme();

  const [
    isSidebarOpen,
    setIsSidebarOpen,
  ] = useState(true);

  const [
    displayName,
    setDisplayName,
  ] = useState(getCurrentFullName);

  const [
    displayRole,
    setDisplayRole,
  ] = useState(getCurrentRole);

  const [
    displayAvatarUrl,
    setDisplayAvatarUrl,
  ] = useState(getCurrentAvatarUrl);

  const [
    avatarLoadError,
    setAvatarLoadError,
  ] = useState(false);

  const [
    avatarVersion,
    setAvatarVersion,
  ] = useState(() => Date.now());

  const [
    displayPlan,
    setDisplayPlan,
  ] = useState<"Free" | "Pro">(
    "Free",
  );

  const avatarText = useMemo(
    () => getInitials(displayName),
    [displayName],
  );

  const displayAvatarSource =
    useMemo(() => {
      const resolvedUrl =
        resolveAvatarUrl(
          displayAvatarUrl,
        );

      return appendCacheVersion(
        resolvedUrl,
        avatarVersion,
      );
    }, [
      displayAvatarUrl,
      avatarVersion,
    ]);

  const isCurrentAdmin =
    useMemo(() => {
      const role = displayRole
        .trim()
        .toUpperCase();

      return (
        isAdmin ||
        role === "ADMIN" ||
        role === "ROLE_ADMIN" ||
        role === "ADMINISTRATOR"
      );
    }, [displayRole, isAdmin]);

  const roleText = useMemo(() => {
    if (isCurrentAdmin) {
      return "Administrator · Pro";
    }

    return `User · ${displayPlan}`;
  }, [
    isCurrentAdmin,
    displayPlan,
  ]);

  useEffect(() => {
    setDisplayName(
      getCurrentFullName(),
    );

    setDisplayRole(
      getCurrentRole(),
    );

    setDisplayAvatarUrl(
      getCurrentAvatarUrl(),
    );

    setAvatarLoadError(false);

    const fetchCurrentPlan =
      async (): Promise<void> => {
        if (isCurrentAdmin) {
          setDisplayPlan("Pro");
          return;
        }

        try {
          const response =
            await subscriptionApi.getCurrentSubscription();

          const code =
            response.data?.plan?.code?.toUpperCase();

          const status =
            response.data?.status?.toUpperCase();

          const activePro =
            code === "PRO" &&
            (status === "ACTIVE" ||
              status === "VALID");

          setDisplayPlan(
            activePro
              ? "Pro"
              : "Free",
          );
        } catch (error) {
          console.warn(
            "Load current plan failed, fallback to Free:",
            error,
          );

          setDisplayPlan("Free");
        }
      };

    void fetchCurrentPlan();
  }, [
    location.pathname,
    isCurrentAdmin,
  ]);

  useEffect(() => {
    const syncProfileFromStorage =
      (): void => {
        setDisplayName(
          getCurrentFullName(),
        );

        setDisplayRole(
          getCurrentRole(),
        );

        setDisplayAvatarUrl(
          getCurrentAvatarUrl(),
        );

        setAvatarVersion(
          Date.now(),
        );

        setAvatarLoadError(false);
      };

    const handleProfileUpdated = (
      event: Event,
    ): void => {
      const customEvent =
        event as CustomEvent<ProfileUpdatedDetail>;

      const updatedProfile =
        customEvent.detail;

      setDisplayName(
        updatedProfile?.fullName?.trim() ||
          getCurrentFullName(),
      );

      setDisplayRole(
        updatedProfile?.role?.trim() ||
          getCurrentRole(),
      );

      setDisplayAvatarUrl(
        updatedProfile?.avatarUrl?.trim() ||
          getCurrentAvatarUrl(),
      );

      setAvatarVersion(Date.now());
      setAvatarLoadError(false);
    };

    window.addEventListener(
      "profile-updated",
      handleProfileUpdated,
    );

    window.addEventListener(
      "storage",
      syncProfileFromStorage,
    );

    return () => {
      window.removeEventListener(
        "profile-updated",
        handleProfileUpdated,
      );

      window.removeEventListener(
        "storage",
        syncProfileFromStorage,
      );
    };
  }, []);

  const studentLinks = [
    {
      to: "/app/dashboard",
      icon: LayoutDashboard,
      label: "Dashboard",
    },
    {
      to: "/app/library",
      icon: Library,
      label: "My Library",
    },
    {
      to: "/app/folders",
      icon: Folder,
      label: "Folders",
    },
    {
      to: "/app/categories",
      icon: Tags,
      label: "Categories",
    },
    {
      to: "/app/upload",
      icon: UploadCloud,
      label: "Upload",
    },
    {
      to: "/app/trash",
      icon: Trash2,
      label: "Trash",
    },
    {
      to: "/app/my-shared-documents",
      icon: Share2,
      label: "My Shared Documents",
    },
    {
      to: "/app/shared-with-me",
      icon: Share2,
      label: "Shared With Me",
    },
    {
      to: "/app/shares",
      icon: Share2,
      label: "Shared Upload",
    },
    {
      to: "/app/chat",
      icon: MessageSquare,
      label: "AI Chat",
    },
    {
      to: "/app/summary",
      icon: FileSearch,
      label: "AI Summary",
    },
    {
      to: "/app/quiz",
      icon: Puzzle,
      label: "Quiz Generator",
    },
    {
      to: "/app/storage",
      icon: HardDrive,
      label: "Cloud Storage",
    },
    {
      to: "/app/subscription",
      icon: CreditCard,
      label: "Subscription",
    },
    {
      to: "/app/profile",
      icon: User,
      label: "Profile",
    },
  ];

  const adminLinks = [
    {
      to: "/admin",
      icon: ShieldCheck,
      label: "Overview",
    },
    {
      to: "/admin/analytics",
      icon: BarChart2,
      label: "Analytics",
    },
    {
      to: "/admin/users",
      icon: Users,
      label: "User Management",
    },
    {
      to: "/admin/documents",
      icon: FileText,
      label: "Documents",
    },
    {
      to: "/admin/reports",
      icon: Flag,
      label: "Reports",
    },
    {
      to: "/admin/subscriptions",
      icon: CreditCard,
      label: "Subscriptions",
    },
    {
      to: "/app/dashboard",
      icon: LayoutDashboard,
      label: "User View",
    },
  ];

  const links = isAdmin
    ? adminLinks
    : studentLinks;

  const isExactActive = (
    to: string,
  ): boolean => {
    if (to === "/admin") {
      return (
        location.pathname ===
        "/admin"
      );
    }

    if (to === "/app/profile") {
      return (
        location.pathname ===
          "/app/profile" ||
        location.pathname ===
          "/app/change-password"
      );
    }

    return location.pathname.startsWith(
      to,
    );
  };

  const handleLogout = (): void => {
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
    localStorage.removeItem(
      "fullName",
    );
    localStorage.removeItem("name");
    localStorage.removeItem("user");
    localStorage.removeItem(
      "avatarUrl",
    );

    sessionStorage.clear();

    navigate("/login", {
      replace: true,
    });
  };

  const handleAvatarClick =
    (): void => {
      navigate("/app/profile");
    };

  return (
    <div className="relative flex h-screen overflow-hidden bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <motion.aside
        initial={false}
        animate={{
          width: isSidebarOpen
            ? 260
            : 80,
        }}
        transition={{
          type: "spring",
          stiffness: 300,
          damping: 30,
        }}
        className="relative z-20 flex h-full flex-col border-r border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"
      >
        <div
          className={`flex h-16 shrink-0 items-center border-b border-slate-100 dark:border-slate-800 ${
            isSidebarOpen
              ? "px-4"
              : "px-2"
          }`}
        >
          <div
            className={`flex min-w-0 items-center overflow-hidden whitespace-nowrap ${
              isSidebarOpen
                ? "gap-2"
                : "gap-0"
            }`}
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white">
              <span className="text-lg font-bold">
                A
              </span>
            </div>

            {isSidebarOpen && (
              <motion.span
                initial={{
                  opacity: 0,
                }}
                animate={{
                  opacity: 1,
                }}
                className="truncate text-xl font-bold tracking-tight text-slate-800 dark:text-white"
              >
                AI Study Hub
              </motion.span>
            )}
          </div>

          <button
            type="button"
            onClick={() => {
              setIsSidebarOpen(
                (previous) =>
                  !previous,
              );
            }}
            className={`ml-auto shrink-0 rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200 ${
              isSidebarOpen
                ? "p-1.5"
                : "p-1"
            }`}
            aria-label={
              isSidebarOpen
                ? "Collapse sidebar"
                : "Expand sidebar"
            }
            title={
              isSidebarOpen
                ? "Collapse sidebar"
                : "Expand sidebar"
            }
          >
            <Menu className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-x-hidden overflow-y-auto px-3 py-5">
          {isAdmin &&
            isSidebarOpen && (
              <p className="px-3 pb-2 text-xs font-bold uppercase tracking-widest text-slate-400">
                Admin Panel
              </p>
            )}

          {links.map((link) => {
            const active =
              isExactActive(link.to);

            return (
              <NavLink
                key={link.to}
                to={link.to}
                end={
                  link.to === "/admin"
                }
                className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-200 ${
                  active
                    ? "bg-blue-600 font-medium text-white hover:bg-blue-700"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
                }`}
                title={
                  !isSidebarOpen
                    ? link.label
                    : undefined
                }
              >
                <link.icon
                  className={`h-5 w-5 shrink-0 transition-colors ${
                    active
                      ? "text-white"
                      : "text-slate-400 group-hover:text-slate-600 dark:group-hover:text-white"
                  }`}
                />

                {isSidebarOpen && (
                  <motion.span
                    initial={{
                      opacity: 0,
                    }}
                    animate={{
                      opacity: 1,
                    }}
                    className="truncate text-sm"
                  >
                    {link.label}
                  </motion.span>
                )}

                {!isSidebarOpen &&
                  link.label ===
                    "Reports" && (
                    <div className="absolute left-14 h-2 w-2 rounded-full bg-red-500" />
                  )}
              </NavLink>
            );
          })}
        </nav>

        <div className="shrink-0 space-y-2 border-t border-slate-100 p-3 dark:border-slate-800">
          {!isAdmin &&
            isCurrentAdmin && (
              <NavLink
                to="/admin"
                className="flex items-center gap-3 rounded-xl border border-blue-200 px-3 py-2.5 text-blue-600 transition-colors hover:bg-blue-50 dark:border-blue-500/30 dark:text-blue-300 dark:hover:bg-blue-500/10"
                title={
                  !isSidebarOpen
                    ? "Back to Admin Panel"
                    : undefined
                }
              >
                <ShieldCheck className="h-5 w-5 shrink-0" />

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
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-red-500 transition-colors hover:bg-red-50 dark:hover:bg-red-950/30"
            title={
              !isSidebarOpen
                ? "Log Out"
                : undefined
            }
          >
            <LogOut className="h-5 w-5 shrink-0" />

            {isSidebarOpen && (
              <span className="text-sm font-medium">
                Log Out
              </span>
            )}
          </button>
        </div>
      </motion.aside>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex h-16 shrink-0 items-center gap-4 border-b border-slate-200 bg-white px-6 dark:border-slate-800 dark:bg-slate-900">
          <GlobalDocumentSearch />

          <div className="ml-auto flex items-center gap-3">
            {!isCurrentAdmin &&
              displayPlan ===
                "Free" && (
                <NavLink
                  to="/app/subscription"
                  className="hidden items-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-3 py-1.5 text-xs font-bold text-white transition-opacity hover:opacity-90 sm:flex"
                >
                  <Zap className="h-3 w-3" />
                  Upgrade Pro
                </NavLink>
              )}

            <button
              type="button"
              onClick={toggleTheme}
              className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
              title={
                theme === "light"
                  ? "Switch to dark mode"
                  : "Switch to light mode"
              }
              aria-label={
                theme === "light"
                  ? "Switch to dark mode"
                  : "Switch to light mode"
              }
            >
              {theme === "light" ? (
                <Moon className="h-5 w-5" />
              ) : (
                <Sun className="h-5 w-5" />
              )}
            </button>

            <NotificationBell />

            <div className="h-8 w-px bg-slate-200 dark:bg-slate-700" />

            <button
              type="button"
              onClick={
                handleAvatarClick
              }
              className="flex items-center gap-3 rounded-xl p-1 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800"
              title="Open profile"
            >
              <div className="hidden text-right sm:block">
                <p className="text-sm font-medium leading-none text-slate-900 dark:text-white">
                  {displayName}
                </p>

                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {roleText}
                </p>
              </div>

              <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border-2 border-white bg-gradient-to-br from-blue-500 to-indigo-600 text-sm font-bold text-white shadow-sm dark:border-slate-900">
                {displayAvatarSource &&
                !avatarLoadError ? (
                  <img
                    key={
                      displayAvatarSource
                    }
                    src={
                      displayAvatarSource
                    }
                    alt={
                      displayName ||
                      "User avatar"
                    }
                    className="h-full w-full object-cover"
                    referrerPolicy="no-referrer"
                    onLoad={() => {
                      setAvatarLoadError(
                        false,
                      );
                    }}
                    onError={() => {
                      setAvatarLoadError(
                        true,
                      );
                    }}
                  />
                ) : (
                  avatarText
                )}
              </div>
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto bg-slate-50 p-6 dark:bg-slate-950 md:p-8">
          <div className="mx-auto max-w-7xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}