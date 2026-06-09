import {
  HardDrive, Upload, FileText, Image, Film, Archive, Trash2,
  Settings, ChevronRight, Plus, X, CheckCircle2, Clock, AlertCircle
} from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import { RadialBarChart, RadialBar, PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

const fileCategories = [
  { name: "PDFs", size: "3.2 GB", count: 47, color: "#EF4444", pct: 36 },
  { name: "Documents", size: "1.8 GB", count: 23, color: "#8B5CF6", pct: 20 },
  { name: "Images", size: "1.2 GB", count: 89, color: "#10B981", pct: 13 },
  { name: "Videos", size: "2.0 GB", count: 8, color: "#F59E0B", pct: 22 },
  { name: "Other", size: "0.8 GB", count: 31, color: "#6B7280", pct: 9 },
];

const uploadQueue = [
  { id: 1, name: "Quantum_Mechanics_Notes.pdf", size: "4.2 MB", status: "uploading", progress: 68 },
  { id: 2, name: "Data_Structures_Lecture_12.pdf", size: "2.1 MB", status: "processing", progress: 100 },
  { id: 3, name: "Organic_Chemistry_Ch8.pdf", size: "5.8 MB", status: "queued", progress: 0 },
  { id: 4, name: "AI_Ethics_Essay.docx", size: "0.8 MB", status: "done", progress: 100 },
];

const recentFiles = [
  { id: 1, name: "Advanced Thermodynamics.pdf", type: "pdf", size: "4.5 MB", modified: "2 hours ago" },
  { id: 2, name: "History of Computing.pdf", type: "pdf", size: "8.2 MB", modified: "Yesterday" },
  { id: 3, name: "Research Photo Dataset", type: "image", size: "234 MB", modified: "2 days ago" },
  { id: 4, name: "Physics Lab Video.mp4", type: "video", size: "1.2 GB", modified: "3 days ago" },
  { id: 5, name: "Project Archive.zip", type: "archive", size: "156 MB", modified: "1 week ago" },
];

const USED_GB = 9.0;
const TOTAL_GB = 100.0;
const PCT = Math.round((USED_GB / TOTAL_GB) * 100);

const pieData = fileCategories.map((f) => ({ name: f.name, value: f.pct, fill: f.color }));

const StatusIcon = ({ status }: { status: string }) => {
  if (status === "done") return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
  if (status === "uploading") return <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />;
  if (status === "processing") return <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />;
  return <Clock className="w-4 h-4 text-slate-500 dark:text-slate-400" />;
};

const FileTypeIcon = ({ type }: { type: string }) => {
  const map: Record<string, { icon: React.ElementType; color: string }> = {
    pdf: { icon: FileText, color: "text-red-500 dark:text-red-300 bg-red-50 dark:bg-red-500/10" },
    image: { icon: Image, color: "text-emerald-500 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-500/10" },
    video: { icon: Film, color: "text-amber-500 dark:text-amber-300 bg-amber-50 dark:bg-amber-500/10" },
    archive: { icon: Archive, color: "text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800" },
  };
  const { icon: Icon, color } = map[type] || { icon: FileText, color: "text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800" };
  return (
    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
      <Icon className="w-5 h-5" />
    </div>
  );
};

export function StorageDashboard() {
  const [activeQueue, setActiveQueue] = useState(uploadQueue);

  const removeFromQueue = (id: number) => {
    setActiveQueue((prev) => prev.filter((q) => q.id !== id));
    toast.success("Removed from queue");
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">Cloud Storage</h1>
          <p className="text-slate-500 dark:text-slate-400">Manage your files, storage quota, and uploads</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => toast.success("Storage settings opened")}
            className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-semibold rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <Settings className="w-4 h-4" /> Settings
          </button>
          <button
            onClick={() => toast.success("Upload dialog opened")}
            className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-500/20 transition-all"
          >
            <Upload className="w-4 h-4" /> Upload Files
          </button>
        </div>
      </div>

      {/* Storage Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quota Gauge */}
        <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-sm p-6 flex flex-col items-center">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4 self-start">Storage Quota</h2>
          <div className="relative w-48 h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={[{ value: PCT }, { value: 100 - PCT }]}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  startAngle={90}
                  endAngle={-270}
                  dataKey="value"
                  strokeWidth={0}
                >
                  <Cell fill="#2563EB" />
                  <Cell fill="#F1F5F9" />
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-extrabold text-slate-900 dark:text-white">{PCT}%</span>
              <span className="text-xs text-slate-500 dark:text-slate-400">used</span>
            </div>
          </div>
          <div className="mt-4 text-center">
            <p className="text-2xl font-extrabold text-slate-900 dark:text-white">{USED_GB} GB</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">of {TOTAL_GB} GB used</p>
          </div>
          <div className="w-full mt-6 bg-slate-50 dark:bg-slate-800 rounded-xl p-3 border border-slate-100 dark:border-slate-800">
            <div className="flex justify-between text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">
              <span>Free</span>
              <span className="text-emerald-600">{(TOTAL_GB - USED_GB).toFixed(1)} GB available</span>
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
              <div className="bg-blue-600 h-2 rounded-full transition-all" style={{ width: `${PCT}%` }} />
            </div>
          </div>
        </div>

        {/* File Categories */}
        <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-sm p-6">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-5">By File Type</h2>
          <div className="space-y-3">
            {fileCategories.map((cat) => (
              <div key={cat.name} className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-semibold text-slate-700 dark:text-slate-300 truncate">{cat.name}</span>
                    <span className="text-slate-500 dark:text-slate-400 ml-2 shrink-0">{cat.size}</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5">
                    <div className="h-1.5 rounded-full transition-all" style={{ width: `${cat.pct}%`, backgroundColor: cat.color }} />
                  </div>
                </div>
                <span className="text-xs text-slate-500 dark:text-slate-400 w-6 text-right shrink-0">{cat.count}</span>
              </div>
            ))}
          </div>
          <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <span className="text-sm text-slate-500 dark:text-slate-400">198 total files</span>
            <button className="text-sm font-bold text-blue-600 hover:underline flex items-center gap-1">
              View all <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Upload Queue */}
        <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-sm p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Upload Queue</h2>
            <span className="px-2.5 py-0.5 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-300 text-xs font-bold rounded-lg">{activeQueue.filter(q => q.status !== "done").length} pending</span>
          </div>
          <div className="space-y-3">
            <AnimatePresence>
              {activeQueue.map((item) => (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl"
                >
                  <StatusIcon status={item.status} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 truncate">{item.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 bg-slate-200 dark:bg-slate-700 rounded-full h-1">
                        <div
                          className={`h-1 rounded-full transition-all ${
                            item.status === "done" ? "bg-emerald-500" : item.status === "processing" ? "bg-purple-500" : "bg-blue-600"
                          }`}
                          style={{ width: `${item.progress}%` }}
                        />
                      </div>
                      <span className="text-xs text-slate-500 dark:text-slate-400 shrink-0">{item.size}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => removeFromQueue(item.id)}
                    className="p-1 text-slate-500 dark:text-slate-400 hover:text-red-500 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
            {activeQueue.length === 0 && (
              <div className="py-8 text-center text-slate-500 dark:text-slate-400">
                <Upload className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No uploads in queue</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Files */}
      <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-sm p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Recent Files</h2>
          <button className="text-sm font-bold text-blue-600 hover:underline flex items-center gap-1">
            Browse all <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-separate border-spacing-y-2">
            <thead>
              <tr className="text-left text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-widest">
                <th className="px-4 py-2">Name</th>
                <th className="px-4 py-2">Size</th>
                <th className="px-4 py-2">Modified</th>
                <th className="px-4 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {recentFiles.map((file) => (
                <tr key={file.id} className="group hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                  <td className="px-4 py-3 rounded-l-2xl">
                    <div className="flex items-center gap-3">
                      <FileTypeIcon type={file.type} />
                      <span className="font-semibold text-slate-700 dark:text-slate-300">{file.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">{file.size}</td>
                  <td className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">{file.modified}</td>
                  <td className="px-4 py-3 rounded-r-2xl text-right">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => toast.success(`Downloading ${file.name}`)}
                        className="p-2 text-slate-500 dark:text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition-all"
                      >
                        <Upload className="w-4 h-4 rotate-180" />
                      </button>
                      <button
                        onClick={() => toast.error(`${file.name} deleted`)}
                        className="p-2 text-slate-500 dark:text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Upgrade Banner */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-[2rem] p-8 text-white flex flex-col md:flex-row items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <HardDrive className="w-5 h-5" />
            <span className="text-sm font-bold uppercase tracking-wider opacity-80">Storage Alert</span>
          </div>
          <h3 className="text-2xl font-extrabold mb-1">You're using {PCT}% of your storage</h3>
          <p className="opacity-80">Upgrade to Pro for 100GB storage and unlimited AI usage</p>
        </div>
        <button
          onClick={() => toast.success("Redirecting to upgrade page...")}
          className="shrink-0 px-8 py-3.5 bg-white text-blue-600 font-extrabold rounded-2xl hover:bg-blue-50 transition-colors shadow-xl"
        >
          Upgrade to Pro
        </button>
      </div>
    </div>
  );
}
