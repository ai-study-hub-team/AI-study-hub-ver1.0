import {
  Users,
  Search,
  MoreVertical,
  UserX,
  Trash2,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  Mail,
  Download,
  Plus,
  Pencil,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import { userApi, type UserResponse } from "../../services/userApi";

type Status = "all" | "active" | "suspended" | "inactive";

type UserView = {
  id: number;
  name: string;
  email: string;
  plan: "Free" | "Pro";
  status: string;
  joined: string;
  docs: number;
  lastActive: string;
  avatar: string;
  role: string;
};

const StatusBadge = ({ status }: { status: string }) => {
  const normalizedStatus = status.toLowerCase();

  const config: Record<string, { label: string; className: string }> = {
    active: {
      label: "Active",
      className:
        "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
    },
    inactive: {
      label: "Inactive",
      className:
        "bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-300",
    },
    suspended: {
      label: "Suspended",
      className: "bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-300",
    },
    pending: {
      label: "Pending",
      className:
        "bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-300",
    },
  };

  const { label, className } = config[normalizedStatus] || {
    label: status,
    className:
      "bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400",
  };

  return (
    <span className={`px-2.5 py-1 text-xs font-bold rounded-lg ${className}`}>
      {label}
    </span>
  );
};

const PlanBadge = ({ plan }: { plan: "Free" | "Pro" }) => {
  const colors: Record<"Free" | "Pro", string> = {
    Free: "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300",
    Pro: "bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-300",
  };

  return (
    <span
      className={`px-2.5 py-1 text-xs font-bold rounded-lg ${colors[plan]}`}
    >
      {plan}
    </span>
  );
};

export function UserManagement() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<Status>("all");
  const [openMenu, setOpenMenu] = useState<number | null>(null);
  const [users, setUsers] = useState<UserView[]>([]);
  const [loading, setLoading] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [viewUser, setViewUser] = useState<UserResponse | null>(null);
  const [editUser, setEditUser] = useState<UserResponse | null>(null);
  const [editForm, setEditForm] = useState({
    fullName: "",
    email: "",
    role: "",
    status: "",
  });

  const getAvatar = (fullName: string) => {
    if (!fullName) return "U";

    return fullName
      .split(" ")
      .map((word) => word[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "-";

    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const mapUserResponseToView = (user: UserResponse): UserView => {
    return {
      id: user.id,
      name: user.fullName,
      email: user.email,
      plan: "Free",
      status: user.status.toLowerCase(),
      joined: formatDate(user.createdAt),
      docs: user.documentCount ?? 0,
      lastActive: "-",
      avatar: getAvatar(user.fullName),
      role: user.role,
    };
  };

  const loadUsers = async () => {
    try {
      setLoading(true);

      const response = await userApi.getUsers();
      const mappedUsers = response.data.map(mapUserResponseToView);

      setUsers(mappedUsers);
    } catch (error) {
      console.error(error);
      toast.error("Cannot load users.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);
  const deletingUser = users.find((user) => user.id === deleteId);
  const filtered = useMemo(() => {
    return users.filter((u) => {
      const keyword = search.toLowerCase();

      const matchSearch =
        u.name.toLowerCase().includes(keyword) ||
        u.email.toLowerCase().includes(keyword);

      const matchStatus = statusFilter === "all" || u.status === statusFilter;

      return matchSearch && matchStatus;
    });
  }, [users, search, statusFilter]);

  const suspendUser = async (id: number) => {
    const user = users.find((u) => u.id === id);
    if (!user) return;

    const nextStatus = user.status === "suspended" ? "ACTIVE" : "SUSPENDED";

    try {
      await userApi.updateUserStatus(id, {
        status: nextStatus,
      });

      toast.success(
        `${user.name} ${
          user.status === "suspended" ? "reactivated" : "suspended"
        }`,
      );

      setOpenMenu(null);
      await loadUsers();
    } catch (error) {
      console.error(error);
      toast.error("Cannot update user status.");
    }
  };
  const deleteUser = async (id: number): Promise<boolean> => {
    const user = users.find((u) => u.id === id);
    if (!user) return false;

    try {
      await userApi.deleteUser(id);

      setUsers((current) => current.filter((u) => u.id !== id));

      toast.success(`${user.name} deleted successfully.`);
      return true;
    } catch (error) {
      console.error("Cannot delete user:", error);
      toast.error("Cannot delete user.");
      return false;
    }
  };

  const handleViewUser = async (id: number) => {
    try {
      const response = await userApi.getUserById(id);

      setViewUser(response.data);
      setOpenMenu(null);
    } catch (error) {
      console.error("Cannot load user detail:", error);
      toast.error("Cannot load user detail.");
    }
  };

  const handleOpenEditUser = async (id: number) => {
    try {
      const response = await userApi.getUserById(id);
      const user = response.data;

      setEditUser(user);
      setEditForm({
        fullName: user.fullName || "",
        email: user.email || "",
        role: user.role || "",
        status: user.status || "",
      });

      setOpenMenu(null);
    } catch (error) {
      console.error("Cannot load user for edit:", error);
      toast.error("Cannot load user for edit.");
    }
  };

  const handleUpdateUser = async (): Promise<boolean> => {
    if (!editUser) return false;

    try {
      await userApi.updateUser(editUser.id, {
        fullName: editForm.fullName,
        email: editForm.email,
        role: editForm.role,
        status: editForm.status,
      });

      toast.success("User updated successfully.");
      await loadUsers();

      return true;
    } catch (error) {
      console.error("Cannot update user:", error);
      toast.error("Cannot update user.");
      return false;
    }
  };

  const statCounts = {
    total: users.length,
    active: users.filter((u) => u.status === "active").length,
    suspended: users.filter((u) => u.status === "suspended").length,
    inactive: users.filter((u) => u.status === "inactive").length,
  };

  const stats = [
    {
      label: "Total Users",
      value: statCounts.total,
      icon: Users,
      iconBoxClass: "bg-blue-50 dark:bg-slate-800",
      iconClass: "text-blue-600",
    },
    {
      label: "Active",
      value: statCounts.active,
      icon: CheckCircle2,
      iconBoxClass: "bg-emerald-50 dark:bg-slate-800",
      iconClass: "text-emerald-600",
    },
    {
      label: "Suspended",
      value: statCounts.suspended,
      icon: XCircle,
      iconBoxClass: "bg-red-50 dark:bg-slate-800",
      iconClass: "text-red-600",
    },
    {
      label: "Inactive",
      value: statCounts.inactive,
      icon: Clock,
      iconBoxClass: "bg-amber-50 dark:bg-slate-800",
      iconClass: "text-amber-600",
    },
  ];

  return (
    <div className="space-y-8 bg-slate-50 dark:bg-slate-950">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">
            User Management
          </h1>
          <p className="text-slate-500 dark:text-slate-400">
            Manage all registered users and their accounts
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => toast.success("Exporting user list...")}
            className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-semibold rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <Download className="w-4 h-4" /> Export
          </button>

          <button
            onClick={() => toast.success("Invite user dialog opened")}
            className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-500/20 transition-all"
          >
            <Plus className="w-4 h-4" /> Invite User
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        {stats.map((stat, i) => (
          <div
            key={i}
            className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm"
          >
            <div
              className={`w-10 h-10 rounded-xl mb-3 flex items-center justify-center ${stat.iconBoxClass}`}
            >
              <stat.icon className={`w-5 h-5 ${stat.iconClass}`} />
            </div>

            <p className="text-2xl font-extrabold text-slate-900 dark:text-white">
              {stat.value}
            </p>

            <p className="text-sm text-slate-500 dark:text-slate-400">
              {stat.label}
            </p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-sm p-6">
        <div className="flex flex-col lg:flex-row gap-4 items-center mb-6">
          <div className="relative w-full lg:max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 dark:text-slate-400" />

            <input
              type="text"
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto">
            {(["all", "active", "suspended", "inactive"] as Status[]).map(
              (s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap capitalize transition-all ${
                    statusFilter === s
                      ? "bg-blue-600 text-white hover:bg-blue-700"
                      : "bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  {s === "all" ? "All Users" : s}
                </button>
              ),
            )}
          </div>
        </div>

        {loading ? (
          <div className="py-16 text-center">
            <p className="font-bold text-slate-500 dark:text-slate-400">
              Loading users...
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-separate border-spacing-y-2">
              <thead>
                <tr className="text-left text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-widest bg-slate-50 dark:bg-slate-800">
                  <th className="px-4 py-2">User</th>
                  <th className="px-4 py-2">Plan</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2">Documents</th>
                  <th className="px-4 py-2">Last Active</th>
                  <th className="px-4 py-2">Joined</th>
                  <th className="px-4 py-2 text-right">Actions</th>
                </tr>
              </thead>

              <tbody>
                <AnimatePresence>
                  {filtered.map((user) => (
                    <motion.tr
                      key={user.id}
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="group bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                    >
                      <td className="px-4 py-3 rounded-l-2xl">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-extrabold shrink-0">
                            {user.avatar}
                          </div>

                          <div>
                            <p className="font-bold text-slate-900 dark:text-white text-sm">
                              {user.name}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              {user.email}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <PlanBadge plan={user.plan} />
                      </td>

                      <td className="px-4 py-3">
                        <StatusBadge status={user.status} />
                      </td>

                      <td className="px-4 py-3 text-sm font-bold text-slate-700 dark:text-slate-300">
                        {user.docs}
                      </td>

                      <td className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">
                        {user.lastActive}
                      </td>

                      <td className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">
                        {user.joined}
                      </td>

                      <td className="px-4 py-3 rounded-r-2xl text-right">
                        <div className="relative inline-block">
                          <button
                            onClick={() =>
                              setOpenMenu(openMenu === user.id ? null : user.id)
                            }
                            className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>

                          <AnimatePresence>
                            {openMenu === user.id && (
                              <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: -5 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: -5 }}
                                className="absolute right-0 top-full mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl z-20 w-48 py-2 overflow-hidden"
                              >
                                <button
                                  onClick={() => handleViewUser(user.id)}
                                  className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                >
                                  <Eye className="w-4 h-4" /> View Profile
                                </button>
                                <button
                                  onClick={() => handleOpenEditUser(user.id)}
                                  className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                >
                                  <Pencil className="w-4 h-4" /> Edit User
                                </button>
                                <button
                                  onClick={() => {
                                    toast.success(
                                      `Email sent to ${user.email}`,
                                    );
                                    setOpenMenu(null);
                                  }}
                                  className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                >
                                  <Mail className="w-4 h-4" /> Send Email
                                </button>

                                <button
                                  onClick={() => suspendUser(user.id)}
                                  className={`flex items-center gap-2 w-full px-4 py-2.5 text-sm transition-colors ${
                                    user.status === "suspended"
                                      ? "text-emerald-600 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-500/10"
                                      : "text-amber-600 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-500/10"
                                  }`}
                                >
                                  <UserX className="w-4 h-4" />
                                  {user.status === "suspended"
                                    ? "Reactivate"
                                    : "Suspend"}
                                </button>

                                <div className="mx-4 my-1 border-t border-slate-200 dark:border-slate-700" />

                                <button
                                  onClick={() => {
                                    setDeleteId(user.id);
                                    setOpenMenu(null);
                                  }}
                                  className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-red-600 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                                >
                                  <Trash2 className="w-4 h-4" /> Delete User
                                </button>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>

            {filtered.length === 0 && (
              <div className="py-16 text-center">
                <Users className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                <p className="font-bold text-slate-500 dark:text-slate-400">
                  No users found
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Try adjusting your search or filter
                </p>
              </div>
            )}
          </div>
        )}
      </div>
      {viewUser !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-700 dark:bg-slate-900">
            <h2 className="text-xl font-extrabold text-slate-950 dark:text-white">
              User Profile
            </h2>

            <div className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-slate-500">ID</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {viewUser.id}
                </span>
              </div>

              <div className="flex justify-between gap-4">
                <span className="text-slate-500">Full Name</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {viewUser.fullName}
                </span>
              </div>

              <div className="flex justify-between gap-4">
                <span className="text-slate-500">Email</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {viewUser.email}
                </span>
              </div>

              <div className="flex justify-between gap-4">
                <span className="text-slate-500">Role</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {viewUser.role}
                </span>
              </div>

              <div className="flex justify-between gap-4">
                <span className="text-slate-500">Status</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {viewUser.status}
                </span>
              </div>

              <div className="flex justify-between gap-4">
                <span className="text-slate-500">Documents</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {viewUser.documentCount}
                </span>
              </div>

              <div className="flex justify-between gap-4">
                <span className="text-slate-500">Categories</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {viewUser.categoryCount}
                </span>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setViewUser(null)}
                className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      {editUser !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-700 dark:bg-slate-900">
            <h2 className="text-xl font-extrabold text-slate-950 dark:text-white">
              Edit User
            </h2>

            <div className="mt-4 space-y-4">
              <div>
                <label className="text-sm font-bold text-slate-700 dark:text-slate-200">
                  Full Name
                </label>
                <input
                  value={editForm.fullName}
                  onChange={(e) =>
                    setEditForm((current) => ({
                      ...current,
                      fullName: e.target.value,
                    }))
                  }
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="text-sm font-bold text-slate-700 dark:text-slate-200">
                  Email
                </label>
                <input
                  value={editForm.email}
                  onChange={(e) =>
                    setEditForm((current) => ({
                      ...current,
                      email: e.target.value,
                    }))
                  }
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="text-sm font-bold text-slate-700 dark:text-slate-200">
                  Role
                </label>
                <select
                  value={editForm.role}
                  onChange={(e) =>
                    setEditForm((current) => ({
                      ...current,
                      role: e.target.value,
                    }))
                  }
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  <option value="USER">USER</option>
                  <option value="ADMIN">ADMIN</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-bold text-slate-700 dark:text-slate-200">
                  Status
                </label>
                <select
                  value={editForm.status}
                  onChange={(e) =>
                    setEditForm((current) => ({
                      ...current,
                      status: e.target.value,
                    }))
                  }
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                  <option value="SUSPENDED">SUSPENDED</option>
                </select>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setEditUser(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Cancel
              </button>

              <button
                onClick={async () => {
                  const success = await handleUpdateUser();

                  if (success) {
                    setEditUser(null);
                  }
                }}
                className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
      {deleteId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-700 dark:bg-slate-900">
            <h2 className="text-xl font-extrabold text-slate-950 dark:text-white">
              Delete User
            </h2>

            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Are you sure you want to delete{" "}
              <span className="font-bold text-slate-900 dark:text-white">
                {deletingUser?.name || "this user"}
              </span>
              ? This action cannot be undone.
            </p>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setDeleteId(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Cancel
              </button>

              <button
                onClick={async () => {
                  if (deleteId === null) return;

                  const success = await deleteUser(deleteId);

                  if (success) {
                    setDeleteId(null);
                  }
                }}
                className="rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
