import {
  Ban,
  CheckCircle2,
  Eye,
  FileText,
  MailCheck,
  MoreVertical,
  Pencil,
  Plus,
  Search,
  Users,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { toast } from "sonner";
import { PaginationControls } from "../../components/ui/PaginationControls";
import {
  adminUserActivityApi,
  type UserActivityLogResponse,
} from "../../services/adminUserActivityApi";
import { subscriptionApi, type PlanResponse } from "../../services/subscriptionApi";
import { adminManagerApi } from "../../services/adminManagerApi";
import { userApi, type UserResponse } from "../../services/userApi";

type StatusFilter = "all" | "active" | "inactive";
type RoleFilter = "all" | "USER" | "MANAGER" | "ADMIN";
type CreatedDateSort = "newest" | "oldest";

type UserView = {
  id: number;
  name: string;
  email: string;
  role: string;
  status: string;
  joinedAt: string;
  documentCount: number;
  avatar: string;
};

const STATUS_OPTIONS = ["ACTIVE", "INACTIVE"] as const;

const statusConfig: Record<string, { label: string; className: string }> = {
  active: {
    label: "Active",
    className:
      "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
  },
  inactive: {
    label: "Inactive",
    className:
      "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  },
};

function StatusBadge({ status }: { status: string }) {
  const config = statusConfig[status.toLowerCase()] ?? {
    label: status || "Unknown",
    className:
      "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  };

  return (
    <span
      className={`inline-flex rounded-lg px-2.5 py-1 text-xs font-bold ${config.className}`}
    >
      {config.label}
    </span>
  );
}

function PlanBadge({ planCode }: { planCode?: string }) {
  const code = planCode?.trim().toUpperCase();
  if (!code) {
    return <span className="text-xs font-semibold text-slate-400">Unknown</span>;
  }

  return (
    <span className="inline-flex rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">
      {code}
    </span>
  );
}

function formatDateTime(value?: string | null) {
  if (!value) return "Never";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatBytes(bytes?: number) {
  if (!bytes || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const index = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );
  return `${(bytes / 1024 ** index).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

function getAvatar(fullName: string) {
  return (fullName || "User")
    .split(" ")
    .filter(Boolean)
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 py-3 last:border-0 dark:border-slate-800">
      <span className="text-sm text-slate-500 dark:text-slate-400">{label}</span>
      <div className="max-w-[65%] text-right text-sm font-semibold text-slate-900 dark:text-white">
        {value}
      </div>
    </div>
  );
}

export function UserManagement() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [createdDateSort, setCreatedDateSort] =
    useState<CreatedDateSort>("newest");
  const [currentPage, setCurrentPage] = useState(1);
  const [openMenu, setOpenMenu] = useState<number | null>(null);
  const [users, setUsers] = useState<UserView[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewUser, setViewUser] = useState<UserResponse | null>(null);
  const [activityLogs, setActivityLogs] = useState<UserActivityLogResponse[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [editUser, setEditUser] = useState<UserResponse | null>(null);
  const [plans, setPlans] = useState<PlanResponse[]>([]);
  const [userPlans, setUserPlans] = useState<Record<number, string>>({});
  const [editForm, setEditForm] = useState({
    fullName: "",
    status: "ACTIVE",
    planCode: "",
  });
  const [showCreateManager, setShowCreateManager] = useState(false);
  const [creatingManager, setCreatingManager] = useState(false);
  const [managerForm, setManagerForm] = useState({
    fullName: "",
    email: "",
    password: "",
  });
  const pageSize = 10;

  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await userApi.getUsers();
      setUsers(
        response.data.map(
          (user) =>
            ({
              id: user.id,
              name: user.fullName || "Unnamed user",
              email: user.email,
              role: user.role,
              status: (user.status || "UNKNOWN").toLowerCase(),
              joinedAt: user.createdAt,
              documentCount: user.documentCount ?? 0,
              avatar: getAvatar(user.fullName),
            }) satisfies UserView,
        ),
      );
    } catch (error) {
      console.error("Cannot load users:", error);
      toast.error("Cannot load users.");
    } finally {
      setLoading(false);
    }
  };

  const loadPlans = async () => {
    try {
      const response = await subscriptionApi.getActivePlans();
      setPlans(response.data.filter((plan) => plan.isActive !== false));
    } catch (error) {
      console.error("Cannot load plans:", error);
      toast.error("Cannot load subscription plans.");
    }
  };

  useEffect(() => {
    void loadUsers();
    void loadPlans();
  }, []);

  const filteredUsers = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    const filtered = users.filter((user) => {
      const matchesKeyword =
        !keyword ||
        user.name.toLowerCase().includes(keyword) ||
        user.email.toLowerCase().includes(keyword);
      const matchesStatus =
        statusFilter === "all" || user.status === statusFilter;
      const matchesRole =
        roleFilter === "all" || user.role.toUpperCase() === roleFilter;
      return matchesKeyword && matchesStatus && matchesRole;
    });

    return [...filtered].sort((a, b) => {
      const aTime = new Date(a.joinedAt).getTime();
      const bTime = new Date(b.joinedAt).getTime();
      const safeATime = Number.isNaN(aTime) ? 0 : aTime;
      const safeBTime = Number.isNaN(bTime) ? 0 : bTime;
      return createdDateSort === "newest"
        ? safeBTime - safeATime
        : safeATime - safeBTime;
    });
  }, [users, search, statusFilter, roleFilter, createdDateSort]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / pageSize));
  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  useEffect(() => setCurrentPage(1), [search, statusFilter, roleFilter, createdDateSort]);
  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const stats = [
    {
      label: "Total accounts",
      value: users.length,
      icon: Users,
      className: "text-blue-600 bg-blue-50 dark:bg-blue-500/10",
    },
    {
      label: "Active",
      value: users.filter((user) => user.status === "active").length,
      icon: CheckCircle2,
      className: "text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10",
    },
    {
      label: "Inactive",
      value: users.filter((user) => user.status === "inactive").length,
      icon: Ban,
      className: "text-slate-600 bg-slate-100 dark:bg-slate-500/10",
    },
  ];

  const handleViewUser = async (id: number) => {
    setOpenMenu(null);
    setDetailLoading(true);
    setActivityLogs([]);

    try {
      const [userResult, logsResult] = await Promise.allSettled([
        userApi.getUserById(id),
        adminUserActivityApi.getUserActivities(id, 0, 10),
      ]);
      if (userResult.status === "rejected") throw userResult.reason;
      setViewUser(userResult.value.data);
      if (logsResult.status === "fulfilled") {
        setActivityLogs(logsResult.value.data.content ?? []);
      }
    } catch (error) {
      console.error("Cannot load user detail:", error);
      toast.error("Cannot load user detail.");
    } finally {
      setDetailLoading(false);
    }
  };

  const handleOpenEdit = async (id: number) => {
    setOpenMenu(null);
    try {
      const response = await userApi.getUserById(id);
      setEditUser(response.data);
      setEditForm({
        fullName: response.data.fullName || "",
        status: response.data.status?.toUpperCase() || "ACTIVE",
        planCode: userPlans[id] || "",
      });
    } catch (error) {
      console.error("Cannot load user:", error);
      toast.error("Cannot load user.");
    }
  };

  const handleCreateManager = async () => {
    const fullName = managerForm.fullName.trim();
    const email = managerForm.email.trim();

    if (!fullName || !email || !managerForm.password) {
      toast.error("Full name, email, and password are required.");
      return;
    }

    if (managerForm.password.length < 6) {
      toast.error("Password must contain at least 6 characters.");
      return;
    }

    try {
      setCreatingManager(true);
      await adminManagerApi.createManager({
        fullName,
        email,
        password: managerForm.password,
      });
      toast.success("Manager account created successfully.");
      setManagerForm({ fullName: "", email: "", password: "" });
      setShowCreateManager(false);
      await loadUsers();
    } catch (error: any) {
      console.error("Cannot create manager:", error);
      toast.error(
        error?.response?.data?.message ||
          error?.response?.data?.error ||
          "Cannot create manager account.",
      );
    } finally {
      setCreatingManager(false);
    }
  };

  const handleUpdateUser = async () => {
    if (!editUser || !editForm.fullName.trim()) {
      toast.error("Full name is required.");
      return;
    }

    try {
      await userApi.updateUser(editUser.id, {
        fullName: editForm.fullName.trim(),
      });

      const currentStatus = editUser.status?.toUpperCase() || "ACTIVE";
      if (editForm.status !== currentStatus) {
        await userApi.updateUserStatus(editUser.id, {
          status: editForm.status,
        });
      }

      if (editForm.planCode) {
        await userApi.updateUserSubscription(editUser.id, {
          planCode: editForm.planCode,
        });
        setUserPlans((current) => ({
          ...current,
          [editUser.id]: editForm.planCode,
        }));
      }

      toast.success("User updated successfully.");
      setEditUser(null);
      await loadUsers();
    } catch (error) {
      console.error("Cannot update user:", error);
      toast.error("Cannot update user.");
    }
  };

  return (
    <div className="space-y-7 bg-slate-50 dark:bg-slate-950">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">
            User Management
          </h1>
          <p className="mt-1 text-slate-500 dark:text-slate-400">
            Manage user accounts, statuses, and subscription plans.
          </p>
        </div>
        <button
          onClick={() => setShowCreateManager(true)}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          Create manager
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                  {stat.label}
                </p>
                <p className="mt-1 text-3xl font-extrabold text-slate-900 dark:text-white">
                  {stat.value}
                </p>
              </div>
              <div className={`rounded-xl p-3 ${stat.className}`}>
                <stat.icon className="h-5 w-5" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="grid gap-3 lg:grid-cols-[1fr_190px_170px_190px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by name or email..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value as StatusFilter)
            }
            className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <select
            value={roleFilter}
            onChange={(event) => setRoleFilter(event.target.value as RoleFilter)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          >
            <option value="all">All roles</option>
            <option value="USER">User</option>
            <option value="MANAGER">Manager</option>
            <option value="ADMIN">Admin</option>
          </select>
          <select
            value={createdDateSort}
            onChange={(event) =>
              setCreatedDateSort(event.target.value as CreatedDateSort)
            }
            className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          >
            <option value="newest">Newest accounts</option>
            <option value="oldest">Oldest accounts</option>
          </select>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        {loading ? (
          <div className="py-16 text-center text-sm font-semibold text-slate-500">
            Loading users...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] border-separate border-spacing-y-2">
              <thead>
                <tr className="text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-2">User</th>
                  <th className="px-4 py-2">Role</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2">Documents</th>
                  <th className="px-4 py-2">Created date</th>
                  <th className="px-4 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedUsers.map((user) => (
                  <tr
                    key={user.id}
                    className="bg-slate-50 text-sm dark:bg-slate-800/60"
                  >
                    <td className="rounded-l-xl px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-xs font-extrabold text-white">
                          {user.avatar}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white">
                            {user.name}
                          </p>
                          <p className="text-xs text-slate-500">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">
                      {user.role}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={user.status} />
                    </td>
                    <td className="px-4 py-3 font-bold text-slate-700 dark:text-slate-200">
                      {user.documentCount}
                    </td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                      {formatDate(user.joinedAt)}
                    </td>
                    <td className="rounded-r-xl px-4 py-3 text-right">
                      <div className="relative inline-block">
                        <button
                          onClick={() =>
                            setOpenMenu(openMenu === user.id ? null : user.id)
                          }
                          className="rounded-lg p-2 text-slate-500 hover:bg-white dark:hover:bg-slate-700"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </button>
                        <AnimatePresence>
                          {openMenu === user.id && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.96, y: -4 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.96, y: -4 }}
                              className="absolute right-0 top-full z-30 mt-2 w-52 rounded-xl border border-slate-200 bg-white p-1.5 text-left shadow-xl dark:border-slate-700 dark:bg-slate-900"
                            >
                              <button
                                onClick={() => void handleViewUser(user.id)}
                                className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                              >
                                <Eye className="h-4 w-4" /> View details
                              </button>
                              <button
                                onClick={() => void handleOpenEdit(user.id)}
                                className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                              >
                                <Pencil className="h-4 w-4" /> Edit account
                              </button>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredUsers.length === 0 && (
              <div className="py-16 text-center">
                <Users className="mx-auto mb-3 h-11 w-11 text-slate-300" />
                <p className="font-bold text-slate-500">No users found</p>
              </div>
            )}
          </div>
        )}
        <PaginationControls
          currentPage={currentPage}
          totalItems={filteredUsers.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
        />
      </div>

      {showCreateManager && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
                  Create manager
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Create an account with manager permissions.
                </p>
              </div>
              <button
                onClick={() => setShowCreateManager(false)}
                disabled={creatingManager}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-50 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-5 space-y-4">
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-200">
                Full name
                <input
                  value={managerForm.fullName}
                  onChange={(event) =>
                    setManagerForm((current) => ({
                      ...current,
                      fullName: event.target.value,
                    }))
                  }
                  maxLength={150}
                  autoFocus
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 font-normal outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </label>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-200">
                Email
                <input
                  type="email"
                  value={managerForm.email}
                  onChange={(event) =>
                    setManagerForm((current) => ({
                      ...current,
                      email: event.target.value,
                    }))
                  }
                  maxLength={254}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 font-normal outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </label>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-200">
                Password
                <input
                  type="password"
                  value={managerForm.password}
                  onChange={(event) =>
                    setManagerForm((current) => ({
                      ...current,
                      password: event.target.value,
                    }))
                  }
                  minLength={6}
                  maxLength={72}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 font-normal outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
                <span className="mt-1 block text-xs font-normal text-slate-500">
                  Use between 6 and 72 characters.
                </span>
              </label>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowCreateManager(false)}
                disabled={creatingManager}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold disabled:opacity-50 dark:border-slate-700 dark:text-white"
              >
                Cancel
              </button>
              <button
                onClick={() => void handleCreateManager()}
                disabled={creatingManager}
                className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {creatingManager ? "Creating..." : "Create manager"}
              </button>
            </div>
          </div>
        </div>
      )}

      {viewUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-8">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
                  Account details
                </h2>
                <p className="text-sm text-slate-500">User ID #{viewUser.id}</p>
              </div>
              <button
                onClick={() => setViewUser(null)}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {detailLoading ? (
              <div className="py-14 text-center text-sm text-slate-500">
                Loading details...
              </div>
            ) : (
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                  <h3 className="mb-2 font-bold text-slate-900 dark:text-white">
                    Account
                  </h3>
                  <DetailRow label="Full name" value={viewUser.fullName} />
                  <DetailRow label="Email" value={viewUser.email} />
                  <DetailRow label="Role" value={viewUser.role} />
                  <DetailRow
                    label="Plan"
                    value={<PlanBadge planCode={userPlans[viewUser.id]} />}
                  />
                  <DetailRow
                    label="Status"
                    value={<StatusBadge status={viewUser.status} />}
                  />
                  <DetailRow
                    label="Email verified"
                    value={
                      <span className="inline-flex items-center gap-1">
                        {viewUser.emailVerified ? (
                          <MailCheck className="h-4 w-4 text-emerald-600" />
                        ) : (
                          <Ban className="h-4 w-4 text-amber-600" />
                        )}
                        {viewUser.emailVerified ? "Verified" : "Not verified"}
                      </span>
                    }
                  />
                  <DetailRow label="Phone" value={viewUser.phone || "-"} />
                </div>
                <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                  <h3 className="mb-2 font-bold text-slate-900 dark:text-white">
                    Usage
                  </h3>
                  <DetailRow label="Documents" value={viewUser.documentCount} />
                  <DetailRow label="Categories" value={viewUser.categoryCount} />
                  <DetailRow
                    label="Storage used"
                    value={formatBytes(viewUser.totalStorageUsedBytes)}
                  />
                </div>
                <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                  <h3 className="mb-2 font-bold text-slate-900 dark:text-white">
                    Timeline
                  </h3>
                  <DetailRow
                    label="Created"
                    value={formatDateTime(viewUser.createdAt)}
                  />
                  <DetailRow
                    label="Updated"
                    value={formatDateTime(viewUser.updatedAt)}
                  />
                </div>
                <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                  <h3 className="mb-3 font-bold text-slate-900 dark:text-white">
                    Recent activity
                  </h3>
                  {activityLogs.length === 0 ? (
                    <p className="py-6 text-center text-sm text-slate-500">
                      No activity recorded.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {activityLogs.slice(0, 6).map((log) => (
                        <div key={log.id} className="flex gap-3">
                          <div className="mt-1 rounded-lg bg-blue-50 p-2 text-blue-600 dark:bg-blue-500/10">
                            <FileText className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-bold text-slate-800 dark:text-slate-200">
                              {log.action}
                            </p>
                            <p className="text-xs text-slate-500">
                              {log.targetType || "Account"} · {formatDateTime(log.createdAt)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {editUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-extrabold dark:text-white">Edit account</h2>
              <button onClick={() => setEditUser(null)}>
                <X className="h-5 w-5 text-slate-500" />
              </button>
            </div>
            <div className="mt-5 space-y-4">
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-200">
                Full name
                <input
                  value={editForm.fullName}
                  onChange={(event) =>
                    setEditForm((current) => ({
                      ...current,
                      fullName: event.target.value,
                    }))
                  }
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 font-normal outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </label>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-200">
                Email
                <input
                  value={editUser.email}
                  readOnly
                  className="mt-1 w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-100 px-3 py-2.5 font-normal text-slate-500 dark:border-slate-700 dark:bg-slate-800"
                />
              </label>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-200">
                Status
                <select
                  value={editForm.status}
                  onChange={(event) =>
                    setEditForm((current) => ({
                      ...current,
                      status: event.target.value,
                    }))
                  }
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 font-normal outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  {STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>
                      {status === "ACTIVE" ? "Active" : "Inactive"}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-200">
                Subscription plan
                <select
                  value={editForm.planCode}
                  onChange={(event) =>
                    setEditForm((current) => ({
                      ...current,
                      planCode: event.target.value,
                    }))
                  }
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 font-normal outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  <option value="">Keep current plan</option>
                  {plans.map((plan) => (
                    <option key={plan.id} value={plan.code}>
                      {plan.name || plan.code} ({plan.code})
                    </option>
                  ))}
                </select>
              </label>
              <p className="text-xs leading-5 text-slate-500">
                The current plan cannot be loaded for each user because the backend only provides an update endpoint. After a plan is changed, it is shown until the page is refreshed.
              </p>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setEditUser(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold dark:border-slate-700 dark:text-white"
              >
                Cancel
              </button>
              <button
                onClick={() => void handleUpdateUser()}
                className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700"
              >
                Save changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
