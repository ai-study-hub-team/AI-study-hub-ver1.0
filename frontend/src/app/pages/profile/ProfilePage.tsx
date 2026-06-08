import { 
  User, 
  Mail, 
  Lock, 
  Bell, 
  Shield, 
  CreditCard, 
  LogOut, 
  Camera, 
  CheckCircle2,
  ChevronRight,
  Globe,
  Monitor
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { motion } from "motion/react";

export function ProfilePage() {
  const [activeTab, setActiveTab] = useState('Personal');

  const tabs = [
    { name: 'Personal', icon: User },
    { name: 'Security', icon: Lock },
    { name: 'Notifications', icon: Bell },
    { name: 'Subscription', icon: CreditCard },
  ];

  const handleSave = () => {
    toast.success("Profile updated successfully!");
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar Nav */}
        <div className="w-full md:w-64 shrink-0 space-y-2">
          {tabs.map((tab) => (
            <button
              key={tab.name}
              onClick={() => setActiveTab(tab.name)}
              className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl font-bold transition-all ${
                activeTab === tab.name 
                  ? "bg-white text-blue-600 shadow-sm border border-slate-100" 
                  : "text-slate-500 hover:bg-white/50"
              }`}
            >
              <tab.icon className="w-5 h-5" />
              {tab.name}
            </button>
          ))}
          <div className="pt-4 mt-4 border-t border-slate-200">
            <button className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl font-bold text-red-500 hover:bg-red-50 transition-all">
              <LogOut className="w-5 h-5" />
              Log Out
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 space-y-8">
          {activeTab === 'Personal' && (
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white p-8 md:p-10 rounded-[2.5rem] border border-slate-100 shadow-sm"
            >
              <div className="flex flex-col sm:flex-row items-center gap-8 mb-12 pb-12 border-b border-slate-50">
                <div className="relative group">
                  <div className="w-24 h-24 rounded-[2rem] bg-gradient-to-br from-blue-500 to-indigo-600 border-4 border-white shadow-xl flex items-center justify-center text-3xl font-bold text-white">
                    AJ
                  </div>
                  <button className="absolute -bottom-2 -right-2 p-2 bg-white rounded-xl shadow-lg border border-slate-100 text-blue-600 hover:scale-110 transition-transform">
                    <Camera className="w-5 h-5" />
                  </button>
                </div>
                <div className="text-center sm:text-left">
                  <h2 className="text-2xl font-extrabold text-slate-900 mb-1">Alex Johnson</h2>
                  <p className="text-slate-500 font-medium mb-4">Medical Student • Member since May 2024</p>
                  <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                    <span className="px-3 py-1 bg-blue-50 text-blue-600 text-[10px] font-bold uppercase tracking-widest rounded-lg">Pro Account</span>
                    <span className="px-3 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-bold uppercase tracking-widest rounded-lg">Verified Student</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">First Name</label>
                    <input 
                      type="text" 
                      defaultValue="Alex"
                      className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Email Address</label>
                    <input 
                      type="email" 
                      defaultValue="alex.johnson@example.com"
                      className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    />
                  </div>
                </div>
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Last Name</label>
                    <input 
                      type="text" 
                      defaultValue="Johnson"
                      className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Preferred Language</label>
                    <select className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all">
                      <option>English (US)</option>
                      <option>Spanish</option>
                      <option>French</option>
                      <option>German</option>
                    </select>
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-bold text-slate-700 mb-2">Bio</label>
                  <textarea 
                    rows={4}
                    placeholder="Tell us about your studies..."
                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none"
                  ></textarea>
                </div>
              </div>

              <div className="mt-12 flex justify-end">
                <button 
                  onClick={handleSave}
                  className="px-8 py-4 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 shadow-xl shadow-blue-500/25 transition-all"
                >
                  Save Changes
                </button>
              </div>
            </motion.div>
          )}

          {activeTab === 'Security' && (
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-8"
            >
              <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
                <h3 className="text-xl font-bold text-slate-900 mb-8">Change Password</h3>
                <div className="grid gap-6 max-w-md">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Current Password</label>
                    <input 
                      type="password" 
                      className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">New Password</label>
                    <input 
                      type="password" 
                      className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    />
                  </div>
                  <button className="w-full py-4 bg-slate-900 text-white font-bold rounded-2xl hover:bg-slate-800 transition-all">
                    Update Password
                  </button>
                </div>
              </div>

              <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">Two-Factor Authentication</h3>
                    <p className="text-sm text-slate-500 mt-1">Add an extra layer of security to your account</p>
                  </div>
                  <div className="w-14 h-7 bg-slate-200 rounded-full relative cursor-pointer">
                    <div className="absolute left-1 top-1 w-5 h-5 bg-white rounded-full transition-all"></div>
                  </div>
                </div>
                <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-4">
                  <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-blue-600">
                    <Monitor className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-slate-900 text-sm">Active Sessions</p>
                    <p className="text-xs text-slate-500">Currently logged in from 2 devices</p>
                  </div>
                  <button className="text-sm font-bold text-blue-600 hover:underline">Manage</button>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'Notifications' && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm"
            >
              <h3 className="text-xl font-bold text-slate-900 mb-8">Notification Preferences</h3>
              <div className="space-y-8">
                {[
                  { title: "Email Notifications", desc: "Receive email updates about your account", enabled: true },
                  { title: "AI Summary Alerts", desc: "Get notified when a document has been analyzed", enabled: true },
                  { title: "Quiz Reminders", desc: "Reminder to review materials with spaced repetition", enabled: false },
                  { title: "Weekly Progress Report", desc: "Receive a summary of your study activity", enabled: true },
                  { title: "Marketing & Updates", desc: "Learn about new features and promotions", enabled: false },
                ].map((pref, idx) => (
                  <div key={idx} className="flex items-center justify-between py-4 border-b border-slate-50 last:border-0">
                    <div>
                      <p className="font-bold text-slate-900">{pref.title}</p>
                      <p className="text-sm text-slate-500 mt-1">{pref.desc}</p>
                    </div>
                    <div className={`w-14 h-7 rounded-full relative cursor-pointer transition-colors ${pref.enabled ? 'bg-blue-600' : 'bg-slate-200'}`}>
                      <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all ${pref.enabled ? 'left-8' : 'left-1'}`}></div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'Subscription' && (
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white p-8 md:p-12 rounded-[3rem] border border-slate-100 shadow-sm relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50 rounded-full blur-3xl -mr-32 -mt-32 opacity-50"></div>
              
              <div className="relative z-10">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-6 mb-12 pb-12 border-b border-slate-50">
                  <div>
                    <h3 className="text-2xl font-extrabold text-slate-900 mb-2">Pro Plan</h3>
                    <p className="text-slate-500 font-medium">Billed annually • $120/year</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-4 py-1.5 bg-emerald-50 text-emerald-600 text-xs font-bold rounded-full uppercase tracking-widest border border-emerald-100 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4" /> Active
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-12 mb-12">
                  <div>
                    <h4 className="font-bold text-slate-900 mb-6">Plan Benefits</h4>
                    <ul className="space-y-4">
                      {[
                        "Unlimited Document Uploads",
                        "Priority AI Processing",
                        "Advanced Quiz Generation",
                        "Multi-device Sync",
                        "24/7 Priority Support"
                      ].map((benefit, i) => (
                        <li key={i} className="flex items-center gap-3 text-slate-600 text-sm font-medium">
                          <CheckCircle2 className="w-5 h-5 text-blue-500" /> {benefit}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="p-8 bg-slate-50 rounded-[2rem] border border-slate-100">
                    <h4 className="font-bold text-slate-900 mb-6">Payment Method</h4>
                    <div className="flex items-center gap-4 mb-8">
                      <div className="w-12 h-8 bg-white border border-slate-200 rounded flex items-center justify-center font-bold text-slate-900 text-xs">VISA</div>
                      <div>
                        <p className="text-sm font-bold text-slate-900">•••• 4242</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Expires 12/26</p>
                      </div>
                      <button className="ml-auto text-sm font-bold text-blue-600 hover:underline">Edit</button>
                    </div>
                    <button className="w-full py-4 text-sm font-bold text-red-500 border border-red-100 rounded-xl hover:bg-red-50 transition-colors">
                      Cancel Subscription
                    </button>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-6 bg-blue-600 rounded-3xl text-white">
                  <div>
                    <h4 className="font-bold">Next Billing Date</h4>
                    <p className="text-blue-100 text-sm">December 15, 2026</p>
                  </div>
                  <button className="px-6 py-3 bg-white text-blue-600 font-bold rounded-xl hover:bg-blue-50 transition-colors">
                    View Billing History
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
