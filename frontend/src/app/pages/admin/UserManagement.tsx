import {
  Users, Search, Filter, MoreVertical, UserX, Trash2,
  CheckCircle2, XCircle, Clock, Eye, Mail, ChevronDown,
  ArrowUpRight, ArrowDownRight, Download, Plus
} from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";

const allUsers = [
  { id: 1, name: "Alex Johnson", email: "alex.johnson@example.com", plan: "Pro", status: "active", joined: "Jan 12, 2024", docs: 47, lastActive: "2 hours ago", avatar: "AJ" },
  { id: 2, name: "Sarah Chen", email: "sarah.chen@example.com", plan: "Free", status: "active", joined: "Feb 3, 2024", docs: 12, lastActive: "1 day ago", avatar: "SC" },
  { id: 3, name: "Marcus Williams", email: "marcus.w@example.com", plan: "Pro", status: "suspended", joined: "Dec 20, 2023", docs: 89, lastActive: "3 days ago", avatar: "MW" },
  { id: 4, name: "Priya Patel", email: "priya.patel@example.com", plan: "Free", status: "active", joined: "Mar 5, 2024", docs: 8, lastActive: "5 hours ago", avatar: "PP" },
  { id: 5, name: "James O'Brien", email: "james.obrien@example.com", plan: "Enterprise", status: "active", joined: "Nov 14, 2023", docs: 203, lastActive: "30 minutes ago", avatar: "JO" },
  { id: 6, name: "Yuki Tanaka", email: "yuki.tanaka@example.com", plan: "Pro", status: "pending", joined: "Jun 1, 2024", docs: 0, lastActive: "Just now", avatar: "YT" },
  { id: 7, name: "Emma Rodriguez", email: "emma.r@example.com", plan: "Free", status: "active", joined: "Apr 18, 2024", docs: 23, lastActive: "2 days ago", avatar: "ER" },
  { id: 8, name: "David Kim", email: "david.kim@example.com", plan: "Pro", status: "suspended", joined: "Jan 30, 2024", docs: 67, lastActive: "1 week ago", avatar: "DK" },
];

type Status = "all" | "active" | "suspended" | "pending";

const StatusBadge = ({ status }: { status: string }) => {
  const config: Record<string, { label: string; className: string }> = {
    active: { label: "Active", className: "bg-emerald-50 text-emerald-600" },
    suspended: { label: "Suspended", className: "bg-red-50 text-red-600" },
    pending: { label: "Pending", className: "bg-amber-50 text-amber-600" },
  };
  const { label, className } = config[status] || { label: status, className: "bg-slate-50 text-slate-500" };
  return <span className={`px-2.5 py-1 text-xs font-bold rounded-lg ${className}`}>{label}</span>;
};

const PlanBadge = ({ plan }: { plan: string }) => {
  const colors: Record<string, string> = {
    Free: "bg-slate-100 text-slate-600",
    Pro: "bg-blue-50 text-blue-600",
    Enterprise: "bg-purple-50 text-purple-600",
  };
  return <span className={`px-2.5 py-1 text-xs font-bold rounded-lg ${colors[plan] || ""}`}>{plan}</span>;
};

export function UserManagement() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<Status>("all");
  const [openMenu, setOpenMenu] = useState<number | null>(null);
  const [users, setUsers] = useState(allUsers);

  const filtered = users.filter((u) => {
    const matchSearch = u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || u.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const suspendUser = (id: number) => {
    setUsers((prev) => prev.map((u) => u.id === id ? { ...u, status: u.status === "suspended" ? "active" : "suspended" } : u));
    const user = users.find((u) => u.id === id);
    toast.success(`${user?.name} ${user?.status === "suspended" ? "reactivated" : "suspended"}`);
    setOpenMenu(null);
  };

  const deleteUser = (id: number) => {
    const user = users.find((u) => u.id === id);
    setUsers((prev) => prev.filter((u) => u.id !== id));
    toast.error(`${user?.name} deleted permanently`);
    setOpenMenu(null);
  };

  const statCounts = {
    total: users.length,
    active: users.filter((u) => u.status === "active").length,
    suspended: users.filter((u) => u.status === "suspended").length,
    pending: users.filter((u) => u.status === "pending").length,
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900">User Management</h1>
          <p className="text-slate-500">Manage all registered users and their accounts</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => toast.success("Exporting user list...")}
            className="flex items-center gap-2 px-4 py-2.5 border border-slate-200 text-slate-600 font-semibold rounded-xl hover:bg-slate-50 transition-colors"
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
        {[
          { label: "Total Users", value: statCounts.total, icon: Users, color: "blue" },
          { label: "Active", value: statCounts.active, icon: CheckCircle2, color: "emerald" },
          { label: "Suspended", value: statCounts.suspended, icon: XCircle, color: "red" },
          { label: "Pending", value: statCounts.pending, icon: Clock, color: "amber" },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
            <div className={`w-10 h-10 rounded-xl mb-3 flex items-center justify-center bg-${stat.color}-50`}>
              <stat.icon className={`w-5 h-5 text-${stat.color}-600`} />
            </div>
            <p className="text-2xl font-extrabold text-slate-900">{stat.value}</p>
            <p className="text-sm text-slate-500">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-6">
        <div className="flex flex-col lg:flex-row gap-4 items-center mb-6">
          <div className="relative w-full lg:max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>
          <div className="flex items-center gap-2 overflow-x-auto">
            {(["all", "active", "suspended", "pending"] as Status[]).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap capitalize transition-all ${
                  statusFilter === s ? "bg-blue-600 text-white" : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                }`}
              >
                {s === "all" ? "All Users" : s}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full border-separate border-spacing-y-2">
            <thead>
              <tr className="text-left text-slate-400 text-xs font-bold uppercase tracking-widest">
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
                    className="group bg-white hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-4 py-3 rounded-l-2xl">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-extrabold shrink-0">
                          {user.avatar}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 text-sm">{user.name}</p>
                          <p className="text-xs text-slate-400">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3"><PlanBadge plan={user.plan} /></td>
                    <td className="px-4 py-3"><StatusBadge status={user.status} /></td>
                    <td className="px-4 py-3 text-sm font-bold text-slate-700">{user.docs}</td>
                    <td className="px-4 py-3 text-sm text-slate-500">{user.lastActive}</td>
                    <td className="px-4 py-3 text-sm text-slate-500">{user.joined}</td>
                    <td className="px-4 py-3 rounded-r-2xl text-right">
                      <div className="relative inline-block">
                        <button
                          onClick={() => setOpenMenu(openMenu === user.id ? null : user.id)}
                          className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                        <AnimatePresence>
                          {openMenu === user.id && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.95, y: -5 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.95, y: -5 }}
                              className="absolute right-0 top-full mt-1 bg-white border border-slate-100 rounded-2xl shadow-xl z-20 w-48 py-2 overflow-hidden"
                            >
                              <button
                                onClick={() => { toast.success(`Viewing ${user.name}'s profile`); setOpenMenu(null); }}
                                className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                              >
                                <Eye className="w-4 h-4" /> View Profile
                              </button>
                              <button
                                onClick={() => { toast.success(`Email sent to ${user.email}`); setOpenMenu(null); }}
                                className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                              >
                                <Mail className="w-4 h-4" /> Send Email
                              </button>
                              <button
                                onClick={() => suspendUser(user.id)}
                                className={`flex items-center gap-2 w-full px-4 py-2.5 text-sm transition-colors ${
                                  user.status === "suspended"
                                    ? "text-emerald-600 hover:bg-emerald-50"
                                    : "text-amber-600 hover:bg-amber-50"
                                }`}
                              >
                                <UserX className="w-4 h-4" />
                                {user.status === "suspended" ? "Reactivate" : "Suspend"}
                              </button>
                              <div className="mx-4 my-1 border-t border-slate-100" />
                              <button
                                onClick={() => deleteUser(user.id)}
                                className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
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
              <Users className="w-12 h-12 text-slate-200 mx-auto mb-3" />
              <p className="font-bold text-slate-500">No users found</p>
              <p className="text-sm text-slate-400">Try adjusting your search or filter</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
