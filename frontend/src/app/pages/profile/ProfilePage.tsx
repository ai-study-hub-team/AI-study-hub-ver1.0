import {
  User,
  Bell,
  CreditCard,
  Camera,
  CheckCircle2,
  Monitor,
  Zap,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { motion } from "motion/react";
import { userApi, UserResponse } from "../../services/userApi";
import {
  subscriptionApi,
  SubscriptionResponse,
} from "../../services/subscriptionApi";

type TabName = "Personal" | "Notifications" | "Subscription";

export function ProfilePage() {
  const [activeTab, setActiveTab] = useState<TabName>("Personal");
  const [profile, setProfile] = useState<UserResponse | null>(null);
  const [subscription, setSubscription] =
    useState<SubscriptionResponse | null>(null);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [fullName, setFullName] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const tabs = [
    { name: "Personal" as TabName, icon: User },
    { name: "Notifications" as TabName, icon: Bell },
    { name: "Subscription" as TabName, icon: CreditCard },
  ];

  const initials = useMemo(() => {
    if (!fullName) return "U";

    return fullName
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }, [fullName]);

  const roleLabel =
    profile?.role === "ADMIN" || profile?.role === "ROLE_ADMIN"
      ? "Administrator"
      : "User";

  const memberSince = profile?.createdAt
    ? new Date(profile.createdAt).getFullYear()
    : "2024";

  const planCode = subscription?.plan?.code?.toUpperCase() || "FREE";
  const subscriptionStatus = subscription?.status?.toUpperCase() || "";

  const isProPlan =
    planCode === "PRO" &&
    (subscriptionStatus === "ACTIVE" || subscriptionStatus === "VALID");

  const currentPlanName = isProPlan
    ? subscription?.plan?.name || "Pro Plan"
    : "Free Plan";

  const currentPlanLabel = isProPlan ? "PRO" : "FREE";

  const planEndDate = subscription?.endDate
    ? new Date(subscription.endDate).toLocaleDateString()
    : null;

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);

        const profileRes = await userApi.getProfile();

        setProfile(profileRes.data);
        setFullName(profileRes.data.fullName || "");

        try {
          const subscriptionRes =
            await subscriptionApi.getCurrentSubscription();

          setSubscription(subscriptionRes.data);
        } catch (subscriptionError) {
          console.warn(
            "Load subscription failed, fallback to FREE plan:",
            subscriptionError,
          );

          setSubscription(null);
        }
      } catch (error) {
        console.error("Load profile failed:", error);
        toast.error("Cannot load profile");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const handleSaveChanges = async () => {
    if (!fullName.trim()) {
      toast.error("Full name is required");
      return;
    }

    const hasPasswordChange =
      currentPassword.trim().length > 0 || newPassword.trim().length > 0;

    if (hasPasswordChange) {
      if (!currentPassword.trim()) {
        toast.error("Current password is required");
        return;
      }

      if (!newPassword.trim()) {
        toast.error("New password is required");
        return;
      }

      if (newPassword.length < 6) {
        toast.error("New password must be at least 6 characters");
        return;
      }
    }

    try {
      setSaving(true);

      const res = await userApi.updateProfile({
        fullName: fullName.trim(),
        email: profile?.email || "",
      });

      setProfile(res.data);

      if (hasPasswordChange) {
        await userApi.changePassword({
          currentPassword,
          newPassword,
        });

        setCurrentPassword("");
        setNewPassword("");
      }

      toast.success("Profile updated successfully!");
    } catch (error) {
      console.error("Save profile failed:", error);
      toast.error("Cannot save changes");
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
              onClick={() => setActiveTab(tab.name)}
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
        </div>

        <div className="flex-1 space-y-8">
          {activeTab === "Personal" && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white dark:bg-slate-900 p-8 md:p-10 rounded-[2.5rem] border border-slate-200 dark:border-slate-700 shadow-sm"
            >
              <div className="flex flex-col sm:flex-row items-center gap-8 mb-12 pb-12 border-b border-slate-100 dark:border-slate-800">
                <div className="relative group">
                  <div className="w-24 h-24 rounded-[2rem] bg-gradient-to-br from-blue-500 to-indigo-600 border-4 border-white dark:border-slate-900 shadow-xl flex items-center justify-center text-3xl font-bold text-white">
                    {initials}
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      toast.info("Avatar API chưa có trong Swagger")
                    }
                    className="absolute -bottom-2 -right-2 p-2 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 text-blue-600 hover:scale-110 transition-transform"
                  >
                    <Camera className="w-5 h-5" />
                  </button>
                </div>

                <div className="text-center sm:text-left">
                  <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white mb-1">
                    {profile?.fullName || "User"}
                  </h2>

                  <p className="text-slate-500 dark:text-slate-400 font-medium mb-4">
                    {roleLabel} • Member since {memberSince}
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
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-5 py-3.5 bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                    Document Count
                  </label>
                  <input
                    type="text"
                    value={profile?.documentCount ?? 0}
                    disabled
                    className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                    Category Count
                  </label>
                  <input
                    type="text"
                    value={profile?.categoryCount ?? 0}
                    disabled
                    className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none"
                  />
                </div>
              </div>

              <div className="mt-12 pt-12 border-t border-slate-100 dark:border-slate-800">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-8">
                  Change Password
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                      Current Password
                    </label>
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full px-5 py-3.5 bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                      New Password
                    </label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full px-5 py-3.5 bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-12 pt-12 border-t border-slate-100 dark:border-slate-800">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                  Two-Factor Authentication
                </h3>

                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 mb-8">
                  Chức năng này chưa có API trong Swagger.
                </p>

                <div className="p-6 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center gap-4">
                  <div className="w-12 h-12 bg-white dark:bg-slate-900 rounded-xl shadow-sm flex items-center justify-center text-blue-600">
                    <Monitor className="w-6 h-6" />
                  </div>

                  <div className="flex-1">
                    <p className="font-bold text-slate-900 dark:text-white text-sm">
                      Active Sessions
                    </p>

                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Chưa có API quản lý phiên đăng nhập.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-12 flex justify-end">
                <button
                  onClick={handleSaveChanges}
                  disabled={saving}
                  className="px-8 py-4 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 shadow-xl shadow-blue-500/25 transition-all disabled:opacity-60"
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </motion.div>
          )}

          {activeTab === "Notifications" && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-700 shadow-sm"
            >
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4">
                Notification Preferences
              </h3>

              <p className="text-slate-500 dark:text-slate-400 font-medium">
                Phần này hiện chưa có API trong Swagger, nên chỉ để giao diện
                demo.
              </p>
            </motion.div>
          )}

          {activeTab === "Subscription" && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white dark:bg-slate-900 p-8 md:p-12 rounded-[3rem] border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden"
            >
              <div className="relative z-10">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-6 mb-12 pb-12 border-b border-slate-100 dark:border-slate-800">
                  <div>
                    <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white mb-2">
                      Current Account
                    </h3>

                    <p className="text-slate-500 dark:text-slate-400 font-medium">
                      Role: {profile?.role || "USER"}
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
                              planEndDate ? ` until ${planEndDate}` : ""
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
                      onClick={() => {
                        window.location.href = "/app/subscription";
                      }}
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