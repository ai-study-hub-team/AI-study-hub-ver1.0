import {
  FileText,
  Clock,
  Sparkles,
  ArrowUpRight,
  MoreHorizontal,
  ChevronRight,
  Plus,
  BookOpen,
  BrainCircuit,
  Puzzle,
  FileSearch,
  CheckCircle2,
  MessageSquare
} from "lucide-react";
import { motion } from "motion/react";
import { useNavigate } from "react-router";
import {
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from "recharts";

const data = [
  { name: 'Mon', hours: 2.5 },
  { name: 'Tue', hours: 4.2 },
  { name: 'Wed', hours: 3.8 },
  { name: 'Thu', hours: 5.1 },
  { name: 'Fri', hours: 2.9 },
  { name: 'Sat', hours: 1.5 },
  { name: 'Sun', hours: 0.8 },
];

const activityData = [
  { day: '01', study: 400 },
  { day: '05', study: 300 },
  { day: '10', study: 600 },
  { day: '15', study: 800 },
  { day: '20', study: 500 },
  { day: '25', study: 700 },
  { day: '30', study: 900 },
];

export function StudentDashboard() {
  const navigate = useNavigate();

  const stats = [
    { label: "Total Documents", value: "24", icon: FileText, color: "blue" },
    { label: "AI Summaries", value: "18", icon: FileSearch, color: "purple" },
    { label: "Quizzes Taken", value: "42", icon: Puzzle, color: "amber" },
    { label: "Study Streak", value: "12 Days", icon: Clock, color: "emerald" },
  ];

  const recentDocs = [
    { name: "Introduction to Neurobiology.pdf", date: "2 hours ago", size: "4.2 MB", type: "PDF" },
    { name: "Global Economics 101 Notes.docx", date: "5 hours ago", size: "1.8 MB", type: "DOCX" },
    { name: "Organic Chemistry Revision.pdf", date: "Yesterday", size: "12.5 MB", type: "PDF" },
    { name: "Medieval History Seminar.pdf", date: "2 days ago", size: "3.1 MB", type: "PDF" },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <section className="relative overflow-hidden bg-blue-600 rounded-[2rem] p-8 md:p-12 text-white">
        <div className="relative z-10 max-w-2xl">
          <h1 className="text-3xl md:text-4xl font-extrabold mb-4">Good morning, Alex! 👋</h1>
          <p className="text-blue-100 text-lg mb-8 leading-relaxed">
            Ready to continue your learning? You have 3 new documents to review and a suggested quiz based on your biology notes.
          </p>
          <div className="flex flex-wrap gap-4">
            <button
              onClick={() => navigate('/app/documents')}
              className="px-6 py-3 bg-white text-blue-600 font-bold rounded-xl hover:bg-blue-50 transition-colors flex items-center gap-2"
            >
              <Plus className="w-5 h-5" /> Upload Document
            </button>
            <button
              onClick={() => navigate('/app/library')}
              className="px-6 py-3 bg-blue-500/30 text-white font-bold rounded-xl border border-white/20 hover:bg-blue-500/50 transition-colors"
            >
              View Activity
            </button>
          </div>
        </div>
        <div className="absolute top-0 right-0 w-1/3 h-full hidden lg:flex items-center justify-center opacity-20">
          <Sparkles className="w-48 h-48 rotate-12" />
        </div>
        <div className="absolute -bottom-20 -right-20 w-80 h-80 dark:bg-slate-900/10 rounded-full blur-3xl"></div>
      </section>

      {/* Stats Grid */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, idx) => (
          <motion.div 
            key={idx}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm"
          >
            <div className={`w-12 h-12 rounded-xl bg-${stat.color}-50 text-${stat.color}-600 flex items-center justify-center mb-4`}>
              <stat.icon className="w-6 h-6" />
            </div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">{stat.label}</p>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{stat.value}</h3>
          </motion.div>
        ))}
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Study Activity Chart */}
        <section className="lg:col-span-2 bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">Study Activity</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">Hours spent studying this week</p>
            </div>
            <select className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option>Last 7 Days</option>
              <option>Last 30 Days</option>
            </select>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563EB" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#2563EB" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Area type="monotone" dataKey="hours" stroke="#2563EB" strokeWidth={3} fillOpacity={1} fill="url(#colorHours)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Quick Actions / AI Insights */}
        <section className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm">
          <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-6">Quick Actions</h3>
          <div className="space-y-4">
            <button
              onClick={() => navigate('/app/summary')}
              className="w-full flex items-center gap-4 p-4 rounded-xl border border-slate-100 dark:border-slate-800 hover:bg-slate-50 hover:border-blue-200 transition-all group"
            >
              <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center shrink-0">
                <BrainCircuit className="w-5 h-5" />
              </div>
              <div className="text-left">
                <p className="font-bold text-slate-900 dark:text-slate-100">Summarize PDF</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Get key points instantly</p>
              </div>
              <ChevronRight className="w-4 h-4 ml-auto text-slate-400 group-hover:text-blue-500" />
            </button>
            <button
              onClick={() => navigate('/app/quiz')}
              className="w-full flex items-center gap-4 p-4 rounded-xl border border-slate-100 dark:border-slate-800 hover:bg-slate-50 hover:border-purple-200 transition-all group"
            >
              <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-lg flex items-center justify-center shrink-0">
                <Puzzle className="w-5 h-5" />
              </div>
              <div className="text-left">
                <p className="font-bold text-slate-900 dark:text-slate-100">Create Quiz</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Test your knowledge</p>
              </div>
              <ChevronRight className="w-4 h-4 ml-auto text-slate-400 group-hover:text-purple-500" />
            </button>
            <button
              onClick={() => navigate('/app/chat')}
              className="w-full flex items-center gap-4 p-4 rounded-xl border border-slate-100 dark:border-slate-800 hover:bg-slate-50 hover:border-amber-200 transition-all group"
            >
              <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-lg flex items-center justify-center shrink-0">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div className="text-left">
                <p className="font-bold text-slate-900 dark:text-slate-100">Ask AI Hub</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Get help with subjects</p>
              </div>
              <ChevronRight className="w-4 h-4 ml-auto text-slate-400 group-hover:text-amber-500" />
            </button>
          </div>

          <div className="mt-8 p-6 bg-white dark:bg-slate-900 rounded-2xl text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <p className="font-bold">AI Tip</p>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              You haven't reviewed "Global Economics" in 3 days. Spaced repetition study suggests a quick review today would be beneficial!
            </p>
          </div>
        </section>
      </div>

      {/* Recent Documents */}
      <section className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] border  border-slate-100 dark:border-slate-800shadow-sm">
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">Recent Documents</h3>
          <button
            onClick={() => navigate('/app/documents')}
            className="text-blue-600 font-bold flex items-center gap-1 hover:underline"
          >
            View All <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {recentDocs.map((doc, idx) => (
            <div key={idx} className="group p-5 bg-slate-50 rounded-2xl border border-transparent hover:border-blue-200 hover:bg-white dark:bg-slate-900 transition-all cursor-pointer">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 bg-white dark:bg-slate-900 rounded-xl shadow-sm flex items-center justify-center">
                  <FileText className="w-6 h-6 text-slate-400" />
                </div>
                <button className="text-slate-400 hover:text-slate-600">
                  <MoreHorizontal className="w-5 h-5" />
                </button>
              </div>
              <h4 className="font-bold text-slate-900 dark:text-slate-100 truncate mb-1">{doc.name}</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">{doc.date} • {doc.size}</p>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider bg-white dark:bg-slate-900 px-2 py-0.5 rounded border border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400">{doc.type}</span>
                <ArrowUpRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500 transition-colors" />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
