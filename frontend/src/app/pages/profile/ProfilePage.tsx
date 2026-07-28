import {
  AlertCircle,
  ArrowRight,
  BadgeCheck,
  CalendarDays,
  Camera,
  Check,
  Crown,
  Database,
  FileText,
  FolderOpen,
  KeyRound,
  LoaderCircle,
  Mail,
  Phone,
  RefreshCcw,
  Save,
  ShieldCheck,
  Sparkles,
  UserRound,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useNavigate } from "react-router";
import { motion } from "motion/react";
import { toast } from "sonner";

import {
  userApi,
  type UserResponse,
} from "../../services/userApi";
import {
  subscriptionApi,
  type SubscriptionResponse,
} from "../../services/subscriptionApi";

type ApiError = {
  response?: {
    data?: {
      message?: string;
      error?: string;
    };
  };
  message?: string;
};

const API_BASE_URL = (
  import.meta.env.VITE_API_URL ||
  "http://localhost:8080"
).replace(/\/$/, "");

const getErrorMessage = (
  error: unknown,
  fallbackMessage: string,
): string => {
  const apiError = error as ApiError;

  return (
    apiError.response?.data?.message ||
    apiError.response?.data?.error ||
    apiError.message ||
    fallbackMessage
  );
};

const formatDate = (
  value?: string | null,
): string => {
  if (!value) return "Not available";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  }).format(date);
};

const formatBytes = (
  value?: number | null,
): string => {
  const bytes = Number(value || 0);

  if (bytes <= 0) return "0 MB";

  const units = ["B", "KB", "MB", "GB", "TB"];
  const unitIndex = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );

  const amount = bytes / 1024 ** unitIndex;

  return `${amount.toLocaleString("en-US", {
    maximumFractionDigits: amount >= 10 ? 1 : 2,
  })} ${units[unitIndex]}`;
};

const resolveAvatarUrl = (
  value?: string | null,
): string => {
  const normalizedValue = value?.trim() || "";

  if (!normalizedValue) return "";

  if (
    /^(https?:\/\/|data:|blob:)/i.test(
      normalizedValue,
    )
  ) {
    return normalizedValue;
  }

  return `${API_BASE_URL}${
    normalizedValue.startsWith("/") ? "" : "/"
  }${normalizedValue}`;
};

const normalizeRole = (
  role?: string | null,
): string =>
  (role || "USER")
    .replace(/^ROLE_/, "")
    .toUpperCase();

const normalizeStatus = (
  status?: string | null,
): string => (status || "ACTIVE").toUpperCase();

const updateStoredProfile = (
  profile: UserResponse,
): void => {
  localStorage.setItem(
    "fullName",
    profile.fullName || "",
  );
  localStorage.setItem(
    "email",
    profile.email || "",
  );
  localStorage.setItem(
    "avatarUrl",
    profile.avatarUrl || "",
  );

  let storedUser: Record<string, unknown> = {};

  try {
    storedUser = JSON.parse(
      localStorage.getItem("user") || "{}",
    ) as Record<string, unknown>;
  } catch {
    storedUser = {};
  }

  localStorage.setItem(
    "user",
    JSON.stringify({
      ...storedUser,
      id: profile.id,
      userId: profile.id,
      fullName: profile.fullName,
      email: profile.email,
      role: profile.role,
      avatarUrl: profile.avatarUrl,
      phone: profile.phone,
    }),
  );

  window.dispatchEvent(
    new CustomEvent("profile-updated", {
      detail: profile,
    }),
  );
};

export function ProfilePage() {
  const navigate = useNavigate();
  const avatarInputRef =
    useRef<HTMLInputElement | null>(null);

  const [profile, setProfile] =
    useState<UserResponse | null>(null);
  const [subscription, setSubscription] =
    useState<SubscriptionResponse | null>(null);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] =
    useState(false);
  const [avatarLoadError, setAvatarLoadError] =
    useState(false);

  const normalizedRole = normalizeRole(profile?.role);
  const normalizedStatus = normalizeStatus(
    profile?.status,
  );
  const isAdmin = normalizedRole === "ADMIN";
  const planCode =
    subscription?.plan?.code?.toUpperCase() ||
    (isAdmin ? "PRO" : "FREE");
  const subscriptionStatus =
    subscription?.status?.toUpperCase() || "";
  const isPro =
    isAdmin ||
    subscription?.adminAccess === true ||
    (planCode === "PRO" &&
      ["ACTIVE", "VALID"].includes(
        subscriptionStatus,
      ));
  const planName = isAdmin
    ? "Administrator Pro"
    : isPro
      ? subscription?.plan?.name || "Pro Plan"
      : "Free Plan";

  const avatarSource = resolveAvatarUrl(
    profile?.avatarUrl,
  );

  const initials = useMemo(() => {
    const name = fullName.trim();

    if (!name) return "U";

    const words = name.split(/\s+/).filter(Boolean);

    if (words.length === 1) {
      return words[0].slice(0, 2).toUpperCase();
    }

    return `${words[0][0]}${
      words[words.length - 1][0]
    }`.toUpperCase();
  }, [fullName]);

  const hasChanges = useMemo(() => {
    if (!profile) return false;

    return (
      fullName.trim() !==
        (profile.fullName || "").trim() ||
      phone.trim() !== (profile.phone || "").trim()
    );
  }, [fullName, phone, profile]);

  const loadProfile = async (): Promise<void> => {
    setLoading(true);
    setLoadError("");

    const [profileResult, subscriptionResult] =
      await Promise.allSettled([
        userApi.getProfile(),
        subscriptionApi.getCurrentSubscription(),
      ]);

    if (profileResult.status === "rejected") {
      const message = getErrorMessage(
        profileResult.reason,
        "Unable to load your profile.",
      );

      setLoadError(message);
      setLoading(false);
      return;
    }

    const currentProfile = profileResult.value.data;

    setProfile(currentProfile);
    setFullName(currentProfile.fullName || "");
    setPhone(currentProfile.phone || "");
    setAvatarLoadError(false);

    if (subscriptionResult.status === "fulfilled") {
      setSubscription(subscriptionResult.value.data);
    } else {
      setSubscription(null);
      console.warn(
        "Unable to load subscription information:",
        subscriptionResult.reason,
      );
    }

    setLoading(false);
  };

  useEffect(() => {
    void loadProfile();
  }, []);

  const handleReset = (): void => {
    setFullName(profile?.fullName || "");
    setPhone(profile?.phone || "");
  };

  const handleSave = async (): Promise<void> => {
    const normalizedFullName = fullName.trim();
    const normalizedPhone = phone.trim();

    if (!normalizedFullName) {
      toast.error("Full name is required.");
      return;
    }

    if (normalizedFullName.length > 150) {
      toast.error(
        "Full name must not exceed 150 characters.",
      );
      return;
    }

    if (normalizedPhone.length > 30) {
      toast.error(
        "Phone number must not exceed 30 characters.",
      );
      return;
    }

    if (
      normalizedPhone &&
      !/^[0-9+()\-\s.]{6,30}$/.test(normalizedPhone)
    ) {
      toast.error(
        "Please enter a valid phone number.",
      );
      return;
    }

    setSaving(true);

    try {
      const response = await userApi.updateProfile({
        fullName: normalizedFullName,
        phone: normalizedPhone || null,
      });
      const updatedProfile = response.data;

      setProfile(updatedProfile);
      setFullName(updatedProfile.fullName || "");
      setPhone(updatedProfile.phone || "");
      updateStoredProfile(updatedProfile);

      toast.success(
        "Your profile has been updated.",
      );
    } catch (error) {
      toast.error(
        getErrorMessage(
          error,
          "Unable to save your changes.",
        ),
      );
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ): Promise<void> => {
    const file = event.target.files?.[0];

    event.target.value = "";

    if (!file) return;

    const allowedTypes = [
      "image/png",
      "image/jpeg",
      "image/webp",
    ];

    if (!allowedTypes.includes(file.type)) {
      toast.error(
        "Please choose a PNG, JPG, JPEG, or WEBP image.",
      );
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error(
        "Profile photos must be smaller than 5 MB.",
      );
      return;
    }

    setUploadingAvatar(true);

    try {
      const response = await userApi.updateAvatar(file);
      const updatedProfile = response.data;

      setProfile(updatedProfile);
      setAvatarLoadError(false);
      updateStoredProfile(updatedProfile);
      toast.success("Profile photo updated.");
    } catch (error) {
      toast.error(
        getErrorMessage(
          error,
          "Unable to upload your profile photo.",
        ),
      );
    } finally {
      setUploadingAvatar(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="h-52 animate-pulse rounded-[2rem] bg-slate-200 dark:bg-slate-800" />
        <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
          <div className="h-[460px] animate-pulse rounded-[2rem] bg-slate-200 dark:bg-slate-800" />
          <div className="h-[460px] animate-pulse rounded-[2rem] bg-slate-200 dark:bg-slate-800" />
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="mx-auto max-w-3xl">
        <div className="rounded-[2rem] border border-rose-200 bg-white p-10 text-center shadow-sm dark:border-rose-900/60 dark:bg-slate-900">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">
            <AlertCircle className="h-7 w-7" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white">
            Profile unavailable
          </h2>
          <p className="mx-auto mt-2 max-w-lg text-sm font-medium leading-6 text-slate-500 dark:text-slate-400">
            {loadError}
          </p>
          <button
            type="button"
            onClick={() => void loadProfile()}
            className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-700"
          >
            <RefreshCcw className="h-4 w-4" />
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-10">
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-[2.25rem] border border-blue-200/70 bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700 px-6 py-8 text-white shadow-xl shadow-blue-500/15 sm:px-9 sm:py-10 dark:border-blue-500/20"
      >
        <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-28 left-1/3 h-64 w-64 rounded-full bg-cyan-300/10 blur-3xl" />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-extrabold uppercase tracking-[0.2em] text-blue-50 backdrop-blur">
              <Sparkles className="h-3.5 w-3.5" />
              Account center
            </div>
            <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
              Profile & account
            </h1>
            <p className="mt-3 max-w-2xl text-sm font-medium leading-6 text-blue-100 sm:text-base">
              Manage your personal information, profile photo,
              security settings, and subscription access in one
              place.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <span className="inline-flex items-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-sm font-bold backdrop-blur">
              <ShieldCheck className="h-4 w-4" />
              {normalizedRole === "ADMIN"
                ? "Administrator"
                : "Member"}
            </span>
            <span className="inline-flex items-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-sm font-bold backdrop-blur">
              <Crown className="h-4 w-4" />
              {isPro ? "Pro access" : "Free access"}
            </span>
          </div>
        </div>
      </motion.section>

      <div className="grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
        <motion.aside
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="space-y-6"
        >
          <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <div className="flex flex-col items-center text-center">
              <div className="relative">
                <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-[2rem] border-4 border-white bg-gradient-to-br from-blue-500 to-violet-600 text-3xl font-black text-white shadow-xl shadow-blue-500/20 dark:border-slate-900">
                  {avatarSource && !avatarLoadError ? (
                    <img
                      key={avatarSource}
                      src={avatarSource}
                      alt={profile?.fullName || "Profile photo"}
                      className="h-full w-full object-cover"
                      referrerPolicy="no-referrer"
                      onLoad={() => setAvatarLoadError(false)}
                      onError={() => setAvatarLoadError(true)}
                    />
                  ) : (
                    initials
                  )}
                </div>

                <button
                  type="button"
                  disabled={uploadingAvatar}
                  onClick={() => avatarInputRef.current?.click()}
                  className="absolute -bottom-2 -right-2 flex h-11 w-11 items-center justify-center rounded-2xl border-4 border-white bg-blue-600 text-white shadow-lg transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-900"
                  aria-label="Upload profile photo"
                >
                  {uploadingAvatar ? (
                    <LoaderCircle className="h-5 w-5 animate-spin" />
                  ) : (
                    <Camera className="h-5 w-5" />
                  )}
                </button>

                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={(event) => void handleAvatarChange(event)}
                />
              </div>

              <h2 className="mt-5 text-xl font-black text-slate-900 dark:text-white">
                {profile?.fullName || "User"}
              </h2>
              <p className="mt-1 max-w-full truncate text-sm font-medium text-slate-500 dark:text-slate-400">
                {profile?.email}
              </p>

              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <span className="rounded-full bg-blue-50 px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">
                  {normalizedRole}
                </span>
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                  {normalizedStatus}
                </span>
              </div>

            </div>
          </section>
        </motion.aside>

        <motion.main
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-6"
        >
          <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8 dark:border-slate-700 dark:bg-slate-900">
            <div className="flex flex-col gap-3 border-b border-slate-100 pb-6 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
              <div>
                <h2 className="text-xl font-black text-slate-900 dark:text-white">
                  Personal information
                </h2>
                <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">
                  Keep your contact details accurate and up to date.
                </p>
              </div>

              {profile?.emailVerified && (
                <span className="inline-flex w-fit items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                  <BadgeCheck className="h-4 w-4" />
                  Email verified
                </span>
              )}
            </div>

            <div className="mt-7 grid gap-6 md:grid-cols-2">
              <div>
                <label
                  htmlFor="profile-full-name"
                  className="mb-2 block text-sm font-extrabold text-slate-700 dark:text-slate-300"
                >
                  Full name
                </label>
                <div className="relative">
                  <UserRound className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  <input
                    id="profile-full-name"
                    type="text"
                    value={fullName}
                    maxLength={150}
                    disabled={saving}
                    autoComplete="name"
                    onChange={(event) =>
                      setFullName(event.target.value)
                    }
                    placeholder="Enter your full name"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3.5 pl-12 pr-4 text-sm font-semibold text-slate-900 outline-none transition placeholder:font-medium placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:border-blue-400 dark:focus:bg-slate-800"
                  />
                </div>
                <p className="mt-2 text-right text-xs font-medium text-slate-400">
                  {fullName.length}/150
                </p>
              </div>

              <div>
                <label
                  htmlFor="profile-email"
                  className="mb-2 block text-sm font-extrabold text-slate-700 dark:text-slate-300"
                >
                  Email address
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  <input
                    id="profile-email"
                    type="email"
                    value={profile?.email || ""}
                    disabled
                    className="w-full cursor-not-allowed rounded-2xl border border-slate-200 bg-slate-100 py-3.5 pl-12 pr-4 text-sm font-semibold text-slate-500 outline-none dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-400"
                  />
                </div>
                <p className="mt-2 text-xs font-medium text-slate-400">
                  Your login email cannot be changed here.
                </p>
              </div>

              <div>
                <label
                  htmlFor="profile-phone"
                  className="mb-2 block text-sm font-extrabold text-slate-700 dark:text-slate-300"
                >
                  Phone number
                </label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  <input
                    id="profile-phone"
                    type="tel"
                    value={phone}
                    maxLength={30}
                    disabled={saving}
                    autoComplete="tel"
                    onChange={(event) =>
                      setPhone(event.target.value)
                    }
                    placeholder="Enter your phone number"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3.5 pl-12 pr-4 text-sm font-semibold text-slate-900 outline-none transition placeholder:font-medium placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:border-blue-400 dark:focus:bg-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-extrabold text-slate-700 dark:text-slate-300">
                  Member since
                </label>
                <div className="flex min-h-[50px] items-center gap-3 rounded-2xl border border-slate-200 bg-slate-100 px-4 text-sm font-semibold text-slate-500 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-400">
                  <CalendarDays className="h-5 w-5 text-slate-400" />
                  {formatDate(profile?.createdAt)}
                </div>
              </div>
            </div>

            <div className="mt-8 flex flex-col-reverse gap-3 border-t border-slate-100 pt-6 sm:flex-row sm:justify-end dark:border-slate-800">
              <button
                type="button"
                onClick={handleReset}
                disabled={!hasChanges || saving}
                className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Reset
              </button>
              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={!hasChanges || saving}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-blue-500/20 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
              >
                {saving ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {saving ? "Saving changes..." : "Save changes"}
              </button>
            </div>
          </section>

          <div className="grid gap-6 xl:grid-cols-2">
            <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <h3 className="mt-5 text-lg font-black text-slate-900 dark:text-white">
                Account security
              </h3>
              <p className="mt-2 text-sm font-medium leading-6 text-slate-500 dark:text-slate-400">
                Protect your account with a strong password and keep
                your sign-in information private.
              </p>
              <button
                type="button"
                onClick={() => navigate("/app/change-password")}
                className="mt-6 inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 dark:border-slate-700 dark:text-slate-200 dark:hover:border-blue-500/40 dark:hover:bg-blue-500/10 dark:hover:text-blue-300"
              >
                <KeyRound className="h-4 w-4" />
                Change password
                <ArrowRight className="h-4 w-4" />
              </button>
            </section>

            <section
              className={`relative overflow-hidden rounded-[2rem] border p-6 shadow-sm ${
                isPro
                  ? "border-violet-200 bg-gradient-to-br from-violet-600 to-indigo-700 text-white dark:border-violet-500/30"
                  : "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900"
              }`}
            >
              {isPro && (
                <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
              )}

              <div className="relative">
                <div
                  className={`flex h-11 w-11 items-center justify-center rounded-2xl ${
                    isPro
                      ? "bg-white/15 text-white"
                      : "bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-300"
                  }`}
                >
                  <Crown className="h-5 w-5" />
                </div>

                <div className="mt-5 flex items-start justify-between gap-4">
                  <div>
                    <p
                      className={`text-xs font-extrabold uppercase tracking-[0.18em] ${
                        isPro
                          ? "text-violet-100"
                          : "text-slate-400"
                      }`}
                    >
                      Current plan
                    </p>
                    <h3
                      className={`mt-1 text-xl font-black ${
                        isPro
                          ? "text-white"
                          : "text-slate-900 dark:text-white"
                      }`}
                    >
                      {planName}
                    </h3>
                  </div>

                  <span
                    className={`rounded-full px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider ${
                      isPro
                        ? "border border-white/20 bg-white/15 text-white"
                        : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                    }`}
                  >
                    {isPro ? "PRO" : "FREE"}
                  </span>
                </div>

                <p
                  className={`mt-3 text-sm font-medium leading-6 ${
                    isPro
                      ? "text-violet-100"
                      : "text-slate-500 dark:text-slate-400"
                  }`}
                >
                  {isAdmin
                    ? "Pro features are included automatically for administrator accounts. No payment or renewal is required."
                    : isPro
                      ? subscription?.endDate
                        ? `Your Pro access is active until ${formatDate(subscription.endDate)}.`
                        : "Your Pro subscription is active."
                      : "Upgrade to Pro for higher limits and premium learning features."}
                </p>

                {!isAdmin && (
                  <button
                    type="button"
                    onClick={() => navigate("/app/subscription")}
                    className={`mt-6 inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold transition ${
                      isPro
                        ? "bg-white text-violet-700 hover:bg-violet-50"
                        : "bg-violet-600 text-white hover:bg-violet-700"
                    }`}
                  >
                    {isPro
                      ? "Manage subscription"
                      : "Explore Pro"}
                    <ArrowRight className="h-4 w-4" />
                  </button>
                )}

                {isAdmin && (
                  <div className="mt-6 inline-flex items-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-sm font-bold text-white">
                    <Check className="h-4 w-4" />
                    Included with administrator access
                  </div>
                )}
              </div>
            </section>
          </div>
        </motion.main>
      </div>
    </div>
  );
}