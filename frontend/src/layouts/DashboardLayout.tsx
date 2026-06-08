import { Outlet, NavLink, useLocation } from "react-router";
import {
  LayoutDashboard, FileText, Library, MessageSquare, FileSearch,
  Puzzle, User, LogOut, Bell, Search, Settings, ShieldCheck,
  Menu, Moon, Sun, HardDrive, CreditCard, Users, Flag,
  BarChart2, ScrollText, Zap
} from "lucide-react";
import { useState } from "react";
import { motion } from "motion/react";
import { useTheme } from "./ThemeProvider";

interface DashboardLayoutProps {
  isAdmin?: boolean;
}

export function DashboardLayout({ isAdmin = false }: DashboardLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();

  const studentLinks = [
    { to: "/app/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { to: "/app/documents", icon: FileText, label: "Documents" },
    { to: "/app/library", icon: Library, label: "My Library" },
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

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: isSidebarOpen ? 260 : 80 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="relative z-20 flex flex-col h-full bg-white border-r border-slate-200 shadow-sm"
      >
        {/* Logo */}
        <div className="flex items-center h-16 px-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2 overflow-hidden whitespace-nowrap">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-600 text-white shrink-0">
              <span className="font-bold text-lg">A</span>
            </div>
            {isSidebarOpen && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="font-bold text-xl text-slate-800 tracking-tight"
              >
                AI Study Hub
              </motion.span>
            )}
          </div>
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="ml-auto p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-colors shrink-0"
          >
            <Menu className="w-4 h-4" />
          </button>
        </div>

        {/* Nav Links */}
        <nav className="flex-1 px-3 py-5 space-y-1 overflow-y-auto overflow-x-hidden">
          {isAdmin && isSidebarOpen && (
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest px-3 pb-2">Admin Panel</p>
          )}
          {links.map((link) => {
            const active = isExactActive(link.to);
            return (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === "/admin"}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group
                  ${active
                    ? "bg-blue-50 text-blue-600 font-medium"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"}
                `}
                title={!isSidebarOpen ? link.label : undefined}
              >
                <link.icon className={`w-5 h-5 shrink-0 transition-colors ${active ? "text-blue-600" : "text-slate-400 group-hover:text-slate-600"}`} />
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

        {/* Bottom */}
        <div className="p-3 border-t border-slate-100 shrink-0 space-y-1">
          <NavLink
            to="/"
            className="flex items-center gap-3 px-3 py-2.5 text-red-500 hover:bg-red-50 rounded-xl transition-colors"
            title={!isSidebarOpen ? "Log Out" : undefined}
          >
            <LogOut className="w-5 h-5 shrink-0" />
            {isSidebarOpen && <span className="text-sm font-medium">Log Out</span>}
          </NavLink>
        </div>
      </motion.aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <header className="h-16 flex items-center justify-between px-6 bg-white border-b border-slate-200 shrink-0">
          <div className="flex items-center flex-1 max-w-xl">
            <div className="relative w-full group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500" />
              <input
                type="text"
                placeholder="Search documents, quizzes, or chat history..."
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Upgrade Badge for non-admin */}
            {!isAdmin && (
              <NavLink
                to="/app/subscription/upgrade"
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-bold rounded-xl hover:opacity-90 transition-opacity"
              >
                <Zap className="w-3 h-3" /> Upgrade Pro
              </NavLink>
            )}

            <button
              onClick={toggleTheme}
              className="p-2 text-slate-500 hover:bg-slate-50 rounded-lg transition-colors"
              title={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
            >
              {theme === "light" ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            </button>

            <button className="relative p-2 text-slate-500 hover:bg-slate-50 rounded-lg transition-colors">
              <Bell className="w-5 h-5" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 border-2 border-white rounded-full"></span>
            </button>

            <div className="h-8 w-px bg-slate-200"></div>

            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-slate-900 leading-none">Alex Johnson</p>
                <p className="text-xs text-slate-500 mt-1">{isAdmin ? "Administrator" : "Student · Pro"}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 border-2 border-white shadow-sm flex items-center justify-center text-white font-bold text-sm">
                AJ
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
