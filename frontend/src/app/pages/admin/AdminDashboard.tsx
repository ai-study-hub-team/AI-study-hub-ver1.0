import { 
  Users, 
  FileText, 
  Activity, 
  ShieldAlert, 
  Search, 
  MoreHorizontal, 
  ArrowUpRight, 
  ArrowDownRight,
  Database,
  Server,
  Cpu,
  Bell,
  CheckCircle2,
  AlertTriangle
} from "lucide-react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line
} from "recharts";
import { motion } from "motion/react";

const stats = [
  { label: "Total Users", value: "12,482", growth: "+14%", positive: true, icon: Users, color: "blue" },
  { label: "AI Processed Docs", value: "48,291", growth: "+22%", positive: true, icon: FileText, color: "purple" },
  { label: "System Uptime", value: "99.98%", growth: "0%", positive: true, icon: Activity, color: "emerald" },
  { label: "Support Tickets", value: "24", growth: "-5%", positive: true, icon: ShieldAlert, color: "amber" },
];

const usageData = [
  { name: '00:00', users: 400, load: 240 },
  { name: '04:00', users: 200, load: 150 },
  { name: '08:00', users: 800, load: 500 },
  { name: '12:00', users: 1200, load: 900 },
  { name: '16:00', users: 1500, load: 1100 },
  { name: '20:00', users: 1300, load: 950 },
];

export function AdminDashboard() {
  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">Admin Dashboard</h1>
          <p className="text-slate-500 dark:text-slate-400">System monitoring and user management</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 rounded-xl border border-emerald-100 dark:border-emerald-500/30">
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
          <span className="text-xs font-bold uppercase tracking-widest">System Healthy</span>
        </div>
      </div>

      {/* Stats Grid */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, idx) => (
          <motion.div 
            key={idx}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm"
          >
            <div className="flex items-start justify-between mb-4">
              <div className={`w-12 h-12 rounded-xl bg-${stat.color}-50 dark:bg-slate-800 text-${stat.color}-600 flex items-center justify-center`}>
                <stat.icon className="w-6 h-6" />
              </div>
              <div className={`flex items-center gap-1 text-xs font-bold ${stat.positive ? 'text-emerald-500' : 'text-red-500'}`}>
                {stat.positive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                {stat.growth}
              </div>
            </div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">{stat.label}</p>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{stat.value}</h3>
          </motion.div>
        ))}
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Chart */}
        <section className="lg:col-span-2 bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">Platform Traffic</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">Concurrent users vs Server load</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Users</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-purple-400 rounded-full"></div>
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Load</span>
              </div>
            </div>
          </div>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={usageData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Line type="monotone" dataKey="users" stroke="#2563EB" strokeWidth={3} dot={false} />
                <Line type="monotone" dataKey="load" stroke="#A855F7" strokeWidth={3} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* System Health */}
        <section className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-sm space-y-8">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">System Monitoring</h3>
          
          <div className="space-y-6">
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                  <span className="font-bold text-slate-700 dark:text-slate-300">Database Storage</span>
                </div>
                <span className="font-bold text-slate-900 dark:text-white">74%</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                <div className="bg-blue-600 h-full w-[74%]" />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                  <span className="font-bold text-slate-700 dark:text-slate-300">AI Inference Load</span>
                </div>
                <span className="font-bold text-slate-900 dark:text-white">42%</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                <div className="bg-purple-500 h-full w-[42%]" />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Server className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                  <span className="font-bold text-slate-700 dark:text-slate-300">Memory Usage</span>
                </div>
                <span className="font-bold text-slate-900 dark:text-white">18%</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                <div className="bg-emerald-500 h-full w-[18%]" />
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
            <h4 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-4">Incidents</h4>
            <div className="space-y-4">
              <div className="flex gap-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl">
                <div className="w-8 h-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white">API Gateway Resolved</p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">2 hours ago • Duration: 14m</p>
                </div>
              </div>
              <div className="flex gap-4 p-4 bg-amber-50 dark:bg-amber-500/10 rounded-2xl border border-amber-100 dark:border-amber-500/30">
                <div className="w-8 h-8 bg-white dark:bg-slate-900 border border-amber-100 dark:border-amber-500/30 rounded-lg flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white">Storage Warning</p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">Node 4-B approaching 85% capacity</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* User Management Table */}
      <section className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">Recent User Activity</h3>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 dark:text-slate-400" />
            <input 
              type="text" 
              placeholder="Search users..."
              className="pl-10 pr-4 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-xl text-sm outline-none"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-widest border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
                <th className="px-4 py-4">User</th>
                <th className="px-4 py-4">Plan</th>
                <th className="px-4 py-4">Status</th>
                <th className="px-4 py-4">Last Active</th>
                <th className="px-4 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {[
                { name: "Alex Johnson", email: "alex.j@example.com", plan: "Pro", status: "Active", active: "2 mins ago" },
                { name: "Sarah Miller", email: "smiller@university.edu", plan: "Basic", status: "Inactive", active: "1 day ago" },
                { name: "David Chen", email: "d.chen@gmail.com", plan: "Pro", status: "Active", active: "1 hour ago" },
                { name: "Emma Wilson", email: "emma.w@school.org", plan: "Basic", status: "Active", active: "15 mins ago" },
              ].map((user, idx) => (
                <tr key={idx} className="group bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center font-bold text-slate-500 dark:text-slate-400 text-sm">
                        {user.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white text-sm">{user.name}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span className={`px-3 py-1 text-[10px] font-bold uppercase tracking-widest rounded-lg ${user.plan === 'Pro' ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-300' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'}`}>
                      {user.plan}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      <div className={`w-1.5 h-1.5 rounded-full ${user.status === 'Active' ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`}></div>
                      <span className={`text-xs font-bold ${user.status === 'Active' ? 'text-slate-700 dark:text-slate-300' : 'text-slate-500 dark:text-slate-400'}`}>{user.status}</span>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-xs font-medium text-slate-500 dark:text-slate-400">{user.active}</td>
                  <td className="px-4 py-4 text-right">
                    <button className="p-2 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                      <MoreHorizontal className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
