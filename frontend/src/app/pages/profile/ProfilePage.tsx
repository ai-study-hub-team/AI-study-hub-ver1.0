import {
  User,
  CreditCard,
  Camera,
  CheckCircle2,
  Zap,
  Mail,
  Phone,
  Image,
  KeyRound,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useState,
} from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { motion } from "motion/react";

import {
  userApi,
  type UserResponse,
} from "../../services/userApi";

import {
  subscriptionApi,
  type SubscriptionResponse,
} from "../../services/subscriptionApi";

type TabName =
  | "Personal"
  | "Subscription";

type ApiError = {
  response?: {
    data?: {
      message?: string;
      error?: string;
    };
  };
  message?: string;
};

const isUrlValue = (value: string): boolean => {
  return /^(https?:\/\/|www\.)/i.test(value.trim());
};

const getSafeFullName = (
  value?: string | null,
): string => {
  const normalizedValue = value?.trim() || "";

  if (!normalizedValue || isUrlValue(normalizedValue)) {
    return "";
  }

  return normalizedValue;
};

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

const updateStoredProfile = (
  profile: UserResponse,
) => {
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

  try {
    const storedUser = JSON.parse(
      localStorage.getItem("user") || "{}",
    );

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
  } catch {
    localStorage.setItem(
      "user",
      JSON.stringify({
        id: profile.id,
        userId: profile.id,
        fullName: profile.fullName,
        email: profile.email,
        role: profile.role,
        avatarUrl: profile.avatarUrl,
        phone: profile.phone,
      }),
    );
  }

  window.dispatchEvent(
    new CustomEvent("profile-updated", {
      detail: profile,
    }),
  );
};

export function ProfilePage() {
  const navigate = useNavigate();

  const [activeTab, setActiveTab] =
    useState<TabName>("Personal");

  const [profile, setProfile] =
    useState<UserResponse | null>(null);

  const [subscription, setSubscription] =
    useState<SubscriptionResponse | null>(
      null,
    );

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [fullName, setFullName] =
    useState("");

  const [phone, setPhone] =
    useState("");

  const [avatarUrl, setAvatarUrl] =
    useState("");

  const [
    avatarLoadError,
    setAvatarLoadError,
  ] = useState(false);

  const tabs = [
    {
      name: "Personal" as TabName,
      icon: User,
    },

    {
      name: "Subscription" as TabName,
      icon: CreditCard,
    },
  ];

  const initials = useMemo(() => {
    const normalizedName = fullName.trim();

    if (!normalizedName) {
      return "U";
    }

    const nameParts = normalizedName
      .split(/\s+/)
      .filter(Boolean);

    if (nameParts.length === 1) {
      return nameParts[0]
        .slice(0, 2)
        .toUpperCase();
    }

    return (
      nameParts[0][0] +
      nameParts[nameParts.length - 1][0]
    ).toUpperCase();
  }, [fullName]);

  const roleLabel =
    profile?.role === "ADMIN" ||
    profile?.role === "ROLE_ADMIN"
      ? "Administrator"
      : "User";

  const memberSince = profile?.createdAt
    ? new Date(
        profile.createdAt,
      ).getFullYear()
    : new Date().getFullYear();

  const planCode =
    subscription?.plan?.code?.toUpperCase() ||
    "FREE";

  const subscriptionStatus =
    subscription?.status?.toUpperCase() ||
    "";

  const isProPlan =
    planCode === "PRO" &&
    (subscriptionStatus === "ACTIVE" ||
      subscriptionStatus === "VALID");

  const currentPlanName = isProPlan
    ? subscription?.plan?.name || "Pro Plan"
    : "Free Plan";

  const currentPlanLabel = isProPlan
    ? "PRO"
    : "FREE";

  const planEndDate =
    subscription?.endDate
      ? new Date(
          subscription.endDate,
        ).toLocaleDateString()
      : null;

  useEffect(() => {
    let active = true;

    const fetchProfile = async () => {
      setLoading(true);

      try {
        const profileResponse =
          await userApi.getProfile();

        if (!active) {
          return;
        }

        const currentProfile =
          profileResponse.data;

        setProfile(currentProfile);

        /*
         * Nếu dữ liệu cũ bị lưu nhầm URL vào fullName,
         * không hiển thị URL đó trong ô Full Name.
         */
        setFullName(
          getSafeFullName(
            currentProfile.fullName,
          ),
        );

        setPhone(
          currentProfile.phone || "",
        );

        setAvatarUrl(
          currentProfile.avatarUrl || "",
        );

        setAvatarLoadError(false);

        try {
          const subscriptionResponse =
            await subscriptionApi.getCurrentSubscription();

          if (active) {
            setSubscription(
              subscriptionResponse.data,
            );
          }
        } catch (subscriptionError) {
          console.warn(
            "Load subscription failed. Using Free plan:",
            subscriptionError,
          );

          if (active) {
            setSubscription(null);
          }
        }
      } catch (error) {
        console.error(
          "Load profile failed:",
          error,
        );

        toast.error(
          getErrorMessage(
            error,
            "Cannot load profile",
          ),
        );
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void fetchProfile();

    return () => {
      active = false;
    };
  }, []);

  const handleSaveChanges = async () => {
    const normalizedFullName =
      fullName.trim();

    const normalizedPhone =
      phone.trim();

    const normalizedAvatarUrl =
      avatarUrl.trim();

    if (!normalizedFullName) {
      toast.error(
        "Full name is required",
      );
      return;
    }

    if (isUrlValue(normalizedFullName)) {
      toast.error(
        "Full name cannot be an image URL",
      );
      return;
    }

    if (normalizedFullName.length > 100) {
      toast.error(
        "Full name must not exceed 100 characters",
      );
      return;
    }

    if (
      normalizedAvatarUrl &&
      !/^https?:\/\//i.test(
        normalizedAvatarUrl,
      )
    ) {
      toast.error(
        "Avatar URL must start with http:// or https://",
      );
      return;
    }

    setSaving(true);

    try {
      const profileResponse =
        await userApi.updateProfile({
          fullName: normalizedFullName,
          phone:
            normalizedPhone || null,
          avatarUrl:
            normalizedAvatarUrl || null,
        });

      const updatedProfile =
        profileResponse.data;

      setProfile(updatedProfile);

      setFullName(
        getSafeFullName(
          updatedProfile.fullName,
        ),
      );

      setPhone(
        updatedProfile.phone || "",
      );

      setAvatarUrl(
        updatedProfile.avatarUrl || "",
      );

      setAvatarLoadError(false);

      updateStoredProfile(
        updatedProfile,
      );

      toast.success(
        "Profile updated successfully!",
      );
    } catch (error) {
      console.error(
        "Save profile failed:",
        error,
      );

      toast.error(
        getErrorMessage(
          error,
          "Cannot save changes",
        ),
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto">
        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-700">
          <p className="text-slate-500 dark:text-slate-400 font-semibold">
            Loading profile...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row gap-8">
        <div className="w-full md:w-64 shrink-0 space-y-2">
          {tabs.map((tab) => (
            <button
              key={tab.name}
              type="button"
              onClick={() =>
                setActiveTab(tab.name)
              }
              className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl font-bold transition-all ${
                activeTab === tab.name
                  ? "bg-white dark:bg-slate-900 text-blue-600 shadow-sm border border-slate-200 dark:border-slate-700"
                  : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              <tab.icon className="w-5 h-5" />
              {tab.name}
            </button>
          ))}

          <button
            type="button"
            onClick={() =>
              navigate(
                "/app/change-password",
              )
            }
            className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-blue-600 dark:hover:text-blue-400 transition-all"
          >
            <KeyRound className="w-5 h-5" />
            Change Password
          </button>
        </div>

        <div className="flex-1 space-y-8">
          {activeTab === "Personal" && (
            <motion.div
              initial={{
                opacity: 0,
                x: 20,
              }}
              animate={{
                opacity: 1,
                x: 0,
              }}
              className="bg-white dark:bg-slate-900 p-8 md:p-10 rounded-[2.5rem] border border-slate-200 dark:border-slate-700 shadow-sm"
            >
              <div className="flex flex-col sm:flex-row items-center gap-8 mb-12 pb-12 border-b border-slate-100 dark:border-slate-800">
                <div className="relative group">
                  <div className="w-24 h-24 overflow-hidden rounded-[2rem] bg-gradient-to-br from-blue-500 to-indigo-600 border-4 border-white dark:border-slate-900 shadow-xl flex items-center justify-center text-3xl font-bold text-white">
                    {avatarUrl &&
                    !avatarLoadError ? (
                      <img
                        key={avatarUrl}
                        src={avatarUrl}
                        alt={
                          fullName ||
                          "User avatar"
                        }
                        className="w-full h-full object-cover"
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
                      initials
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      toast.info(
                        "Paste a direct image URL into the Avatar URL field.",
                      )
                    }
                    className="absolute -bottom-2 -right-2 p-2 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 text-blue-600 hover:scale-110 transition-transform"
                    aria-label="Change avatar"
                  >
                    <Camera className="w-5 h-5" />
                  </button>
                </div>

                <div className="text-center sm:text-left">
                  <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white mb-1">
                    {fullName || "User"}
                  </h2>

                  <p className="text-slate-500 dark:text-slate-400 font-medium mb-4">
                    {roleLabel} • Member since{" "}
                    {memberSince}
                  </p>

                  <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                    <span className="px-3 py-1 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-300 text-[10px] font-bold uppercase tracking-widest rounded-lg">
                      {profile?.role || "USER"}
                    </span>

                    <span className="px-3 py-1 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 text-[10px] font-bold uppercase tracking-widest rounded-lg">
                      {profile?.status || "ACTIVE"}
                    </span>

                    <span
                      className={`px-3 py-1 text-[10px] font-bold uppercase tracking-widest rounded-lg ${
                        isProPlan
                          ? "bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-300"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                      }`}
                    >
                      {currentPlanLabel} PLAN
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                <div>
                  <label
                    htmlFor="profile-full-name"
                    className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2"
                  >
                    Full Name
                  </label>

                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />

                    <input
                      id="profile-full-name"
                      type="text"
                      value={fullName}
                      onChange={(event) => {
                        setFullName(
                          event.target.value,
                        );
                      }}
                      disabled={saving}
                      placeholder="Enter your full name"
                      autoComplete="name"
                      className="w-full pl-12 pr-5 py-3.5 bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all disabled:opacity-60"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="profile-email"
                    className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2"
                  >
                    Email Address
                  </label>

                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />

                    <input
                      id="profile-email"
                      type="email"
                      value={
                        profile?.email || ""
                      }
                      disabled
                      className="w-full pl-12 pr-5 py-3.5 bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none cursor-not-allowed"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="profile-phone"
                    className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2"
                  >
                    Phone Number
                  </label>

                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />

                    <input
                      id="profile-phone"
                      type="tel"
                      value={phone}
                      onChange={(event) => {
                        setPhone(
                          event.target.value,
                        );
                      }}
                      disabled={saving}
                      placeholder="0900000000"
                      autoComplete="tel"
                      className="w-full pl-12 pr-5 py-3.5 bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all disabled:opacity-60"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="profile-avatar"
                    className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2"
                  >
                    Avatar URL
                  </label>

                  <div className="relative">
                    <Image className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />

                    <input
                      id="profile-avatar"
                      type="url"
                      value={avatarUrl}
                      onChange={(event) => {
                        setAvatarUrl(
                          event.target.value,
                        );

                        setAvatarLoadError(false);
                      }}
                      disabled={saving}
                      placeholder="https://example.com/avatar.png"
                      className="w-full pl-12 pr-5 py-3.5 bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all disabled:opacity-60"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                    Document Count
                  </label>

                  <input
                    type="text"
                    value={
                      profile?.documentCount ?? 0
                    }
                    disabled
                    className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                    Category Count
                  </label>

                  <input
                    type="text"
                    value={
                      profile?.categoryCount ?? 0
                    }
                    disabled
                    className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="mt-12 flex justify-end">
                <button
                  type="button"
                  onClick={handleSaveChanges}
                  disabled={saving}
                  className="px-8 py-4 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 shadow-xl shadow-blue-500/25 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {saving
                    ? "Saving..."
                    : "Save Changes"}
                </button>
              </div>
            </motion.div>
          )}

          {activeTab === "Subscription" && (
            <motion.div
              initial={{
                opacity: 0,
                x: 20,
              }}
              animate={{
                opacity: 1,
                x: 0,
              }}
              className="bg-white dark:bg-slate-900 p-8 md:p-12 rounded-[3rem] border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden"
            >
              <div className="relative z-10">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-6 mb-12 pb-12 border-b border-slate-100 dark:border-slate-800">
                  <div>
                    <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white mb-2">
                      Current Account
                    </h3>

                    <p className="text-slate-500 dark:text-slate-400 font-medium">
                      Role:{" "}
                      {profile?.role || "USER"}
                    </p>
                  </div>

                  <span className="px-4 py-1.5 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 text-xs font-bold rounded-full uppercase tracking-widest border border-emerald-100 dark:border-emerald-500/30 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    {profile?.status || "ACTIVE"}
                  </span>
                </div>

                <div
                  className={`p-6 rounded-3xl text-white ${
                    isProPlan
                      ? "bg-gradient-to-r from-violet-600 to-indigo-600"
                      : "bg-gradient-to-r from-slate-700 to-slate-900"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-widest opacity-80 mb-2">
                        Current Plan
                      </p>

                      <h4 className="text-2xl font-extrabold">
                        {currentPlanName}
                      </h4>

                      <p className="text-sm opacity-80 mt-1">
                        {isProPlan
                          ? `Your Pro plan is active${
                              planEndDate
                                ? ` until ${planEndDate}`
                                : ""
                            }.`
                          : "You are currently using the Free plan."}
                      </p>
                    </div>

                    <span className="w-fit px-4 py-2 rounded-full bg-white/15 border border-white/20 text-xs font-extrabold tracking-widest">
                      {currentPlanLabel}
                    </span>
                  </div>

                  {!isProPlan && (
                    <button
                      type="button"
                      onClick={() =>
                        navigate(
                          "/app/subscription",
                        )
                      }
                      className="mt-6 inline-flex items-center gap-2 px-5 py-3 bg-white text-slate-900 font-bold rounded-2xl hover:bg-slate-100 transition-all"
                    >
                      <Zap className="w-4 h-4" />
                      Upgrade to Pro
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}