import {
  FileText, Search, Edit2, Trash2, Eye, Download,
  MoreVertical, CheckCircle2, Clock, AlertTriangle,
  Filter, Plus, ExternalLink
} from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";

const allDocuments = [
  { id: 1, name: "Advanced Thermodynamics.pdf", owner: "Alex Johnson", subject: "Physics", size: "4.5 MB", status: "analyzed", uploaded: "Jun 5, 2024", downloads: 12, views: 89 },
  { id: 2, name: "Modern European History.pdf", owner: "Sarah Chen", subject: "History", size: "12.2 MB", status: "pending", uploaded: "Jun 4, 2024", downloads: 0, views: 3 },
  { id: 3, name: "Business Ethics Final Project.docx", owner: "Marcus Williams", subject: "Management", size: "1.2 MB", status: "analyzed", uploaded: "Jun 3, 2024", downloads: 34, views: 156 },
  { id: 4, name: "Calculus III Problem Set.pdf", owner: "Priya Patel", subject: "Math", size: "3.8 MB", status: "analyzed", uploaded: "Jun 2, 2024", downloads: 8, views: 47 },
  { id: 5, name: "Intro to Psychology Notes.pdf", owner: "James O'Brien", subject: "Psychology", size: "6.5 MB", status: "flagged", uploaded: "Jun 1, 2024", downloads: 5, views: 23 },
  { id: 6, name: "Organic Chemistry Lab Report.pdf", owner: "Yuki Tanaka", subject: "Chemistry", size: "2.1 MB", status: "analyzed", uploaded: "May 31, 2024", downloads: 2, views: 11 },
  { id: 7, name: "Machine Learning Basics.pdf", owner: "Emma Rodriguez", subject: "CS", size: "8.7 MB", status: "analyzed", uploaded: "May 30, 2024", downloads: 67, views: 320 },
  { id: 8, name: "Ancient Greek Philosophy.docx", owner: "David Kim", subject: "Philosophy", size: "0.9 MB", status: "flagged", uploaded: "May 28, 2024", downloads: 0, views: 4 },
];

const subjects = ["All", "Physics", "History", "Management", "Math", "Psychology", "Chemistry", "CS", "Philosophy"];

const StatusBadge = ({ status }: { status: string }) => {
  const config: Record<string, { label: string; className: string }> = {
    analyzed: { label: "Analyzed", className: "bg-emerald-50 text-emerald-600" },
    pending: { label: "Pending", className: "bg-amber-50 text-amber-600" },
    flagged: { label: "Flagged", className: "bg-red-50 text-red-600" },
  };
  const { label, className } = config[status] || { label: status, className: "bg-slate-50 text-slate-500" };
  return <span className={`px-2.5 py-1 text-xs font-bold rounded-lg ${className}`}>{label}</span>;
};

export function DocumentAdmin() {
  const [search, setSearch] = useState("");
  const [subject, setSubject] = useState("All");
  const [docs, setDocs] = useState(allDocuments);
  const [openMenu, setOpenMenu] = useState<number | null>(null);

  const filtered = docs.filter((d) => {
    const matchSearch = d.name.toLowerCase().includes(search.toLowerCase()) || d.owner.toLowerCase().includes(search.toLowerCase());
    const matchSubject = subject === "All" || d.subject === subject;
    return matchSearch && matchSubject;
  });

  const deleteDoc = (id: number) => {
    const doc = docs.find((d) => d.id === id);
    setDocs((prev) => prev.filter((d) => d.id !== id));
    toast.error(`"${doc?.name}" deleted`);
    setOpenMenu(null);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900">Document Management</h1>
          <p className="text-slate-500">View, manage, and moderate all platform documents</p>
        </div>
        <div className="flex items-center gap-2">
          {[
            { label: "Total", value: docs.length, color: "slate" },
            { label: "Analyzed", value: docs.filter(d => d.status === "analyzed").length, color: "emerald" },
            { label: "Pending", value: docs.filter(d => d.status === "pending").length, color: "amber" },
            { label: "Flagged", value: docs.filter(d => d.status === "flagged").length, color: "red" },
          ].map((s) => (
            <div key={s.label} className={`px-3 py-1.5 bg-${s.color}-50 text-${s.color}-600 rounded-xl border border-${s.color}-100`}>
              <span className="text-xs font-bold">{s.label}: </span>
              <span className="text-sm font-extrabold">{s.value}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-6 space-y-5">
        <div className="flex flex-col lg:flex-row gap-4 items-center">
          <div className="relative w-full lg:max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by filename or owner..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>
          <div className="flex items-center gap-2 overflow-x-auto">
            {subjects.slice(0, 6).map((s) => (
              <button
                key={s}
                onClick={() => setSubject(s)}
                className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  subject === s ? "bg-blue-600 text-white" : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-separate border-spacing-y-2">
            <thead>
              <tr className="text-left text-slate-400 text-xs font-bold uppercase tracking-widest">
                <th className="px-4 py-2">Document</th>
                <th className="px-4 py-2">Owner</th>
                <th className="px-4 py-2">Subject</th>
                <th className="px-4 py-2">Size</th>
                <th className="px-4 py-2">Views</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Uploaded</th>
                <th className="px-4 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {filtered.map((doc) => (
                  <motion.tr
                    key={doc.id}
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="group bg-white hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-4 py-3 rounded-l-2xl">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center shrink-0">
                          <FileText className="w-4 h-4 text-slate-400" />
                        </div>
                        <span className="font-semibold text-slate-800 text-sm truncate max-w-[180px]">{doc.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">{doc.owner}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs font-bold rounded-lg">{doc.subject}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-500">{doc.size}</td>
                    <td className="px-4 py-3 text-sm text-slate-700 font-semibold">{doc.views}</td>
                    <td className="px-4 py-3"><StatusBadge status={doc.status} /></td>
                    <td className="px-4 py-3 text-sm text-slate-500">{doc.uploaded}</td>
                    <td className="px-4 py-3 rounded-r-2xl text-right">
                      <div className="relative inline-block">
                        <button
                          onClick={() => setOpenMenu(openMenu === doc.id ? null : doc.id)}
                          className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                        <AnimatePresence>
                          {openMenu === doc.id && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.95, y: -5 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.95, y: -5 }}
                              className="absolute right-0 top-full mt-1 bg-white border border-slate-100 rounded-2xl shadow-xl z-20 w-44 py-2"
                            >
                              <button onClick={() => { toast.success("Opening document preview..."); setOpenMenu(null); }} className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50">
                                <Eye className="w-4 h-4" /> Preview
                              </button>
                              <button onClick={() => { toast.success("Downloading document..."); setOpenMenu(null); }} className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50">
                                <Download className="w-4 h-4" /> Download
                              </button>
                              <button onClick={() => { toast.success("Edit metadata opened"); setOpenMenu(null); }} className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50">
                                <Edit2 className="w-4 h-4" /> Edit
                              </button>
                              <div className="mx-4 my-1 border-t border-slate-100" />
                              <button onClick={() => deleteDoc(doc.id)} className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50">
                                <Trash2 className="w-4 h-4" /> Delete
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
              <FileText className="w-12 h-12 text-slate-200 mx-auto mb-3" />
              <p className="font-bold text-slate-500">No documents found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
