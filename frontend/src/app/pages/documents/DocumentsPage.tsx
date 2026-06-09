import {
  FileText, Search, Filter, Plus, MoreVertical, Download,
  Trash2, ExternalLink, Upload, X, File, Check, Share2,
  Flag, Heart, Clock, BarChart2, Star, Eye, Link2,
  Lock, Globe, ChevronRight, AlertTriangle
} from "lucide-react";
import { useState, useRef } from "react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "motion/react";

const documents = [
  { id: 1, name: "Advanced Thermodynamics.pdf", subject: "Physics", date: "2024-05-15", size: "4.5 MB", status: "Analyzed", views: 23, downloads: 7, favorited: false },
  { id: 2, name: "Modern European History.pdf", subject: "History", date: "2024-05-12", size: "12.2 MB", status: "Pending", views: 5, downloads: 0, favorited: true },
  { id: 3, name: "Business Ethics Final Project.docx", subject: "Management", date: "2024-05-10", size: "1.2 MB", status: "Analyzed", views: 41, downloads: 12, favorited: false },
  { id: 4, name: "Calculus III Problem Set.pdf", subject: "Math", date: "2024-05-08", size: "3.8 MB", status: "Analyzed", views: 18, downloads: 4, favorited: true },
  { id: 5, name: "Intro to Psychology Notes.pdf", subject: "Psychology", date: "2024-05-05", size: "6.5 MB", status: "Analyzed", views: 67, downloads: 20, favorited: false },
  { id: 6, name: "Organic Chemistry Chapter 8.pdf", subject: "Chemistry", date: "2024-04-28", size: "2.3 MB", status: "Analyzed", views: 9, downloads: 2, favorited: false },
];

const recentlyViewed = [
  { id: 3, name: "Business Ethics Final Project.docx", subject: "Management", viewedAt: "2 hours ago" },
  { id: 1, name: "Advanced Thermodynamics.pdf", subject: "Physics", viewedAt: "Yesterday" },
  { id: 5, name: "Intro to Psychology Notes.pdf", subject: "Psychology", viewedAt: "2 days ago" },
];

const categories = ["All", "Physics", "History", "Management", "Math", "Psychology", "Chemistry"];

const reportCategories = [
  "Copyright Violation",
  "Inappropriate Content",
  "Spam",
  "Misinformation",
  "Privacy Violation",
  "Other",
];

type Tab = "all" | "favorites" | "recent";

export function DocumentsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("all");
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [shareDoc, setShareDoc] = useState<typeof documents[0] | null>(null);
  const [reportDoc, setReportDoc] = useState<typeof documents[0] | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [uploadStep, setUploadStep] = useState(1);
  const [sharing, setSharing] = useState<"private" | "public">("private");
  const [selectedReportCat, setSelectedReportCat] = useState("");
  const [docs, setDocs] = useState(documents);
  const [openMenu, setOpenMenu] = useState<number | null>(null);

  const toggleFavorite = (id: number) => {
    setDocs((prev) => prev.map((d) => d.id === id ? { ...d, favorited: !d.favorited } : d));
  };

  const deleteDoc = (id: number) => {
    setDocs((prev) => prev.filter((d) => d.id !== id));
    toast.error("Document deleted");
    setOpenMenu(null);
  };

  const filteredDocs = docs.filter((doc) => {
    const matchSearch = doc.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchCat = selectedCategory === "All" || doc.subject === selectedCategory;
    const matchTab = activeTab === "all" ? true : activeTab === "favorites" ? doc.favorited : true;
    return matchSearch && matchCat && matchTab;
  });

  const displayDocs = activeTab === "recent"
    ? recentlyViewed
    : filteredDocs;

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-slate-100">Document Management</h1>
          <p className="text-slate-500 dark:text-slate-400">Upload, organize, and share your study materials</p>
        </div>
        <button
          onClick={() => { setIsUploadOpen(true); setUploadStep(1); }}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-500/20 transition-all"
        >
          <Upload className="w-5 h-5" /> Upload Document
        </button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Documents", value: docs.length, icon: FileText, color: "blue" },
          { label: "Favorites", value: docs.filter(d => d.favorited).length, icon: Heart, color: "red" },
          { label: "Total Views", value: docs.reduce((s, d) => s + d.views, 0), icon: Eye, color: "purple" },
          { label: "Downloads", value: docs.reduce((s, d) => s + d.downloads, 0), icon: Download, color: "emerald" },
        ].map((stat, i) => (
          <div key={i} className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
            <div className={`w-8 h-8 rounded-lg mb-2 flex items-center justify-center bg-${stat.color}-50`}>
              <stat.icon className={`w-4 h-4 text-${stat.color}-600`} />
            </div>
            <p className="text-xl font-extrabold text-slate-900 dark:text-slate-100">{stat.value}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-700 shadow-sm space-y-5">
        {/* Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-700 pb-4">
          {(["all", "favorites", "recent"] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-xl text-sm font-bold capitalize transition-all ${
                activeTab === tab ? "bg-blue-600 text-white" : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:bg-slate-800"
              }`}
            >
              {tab === "recent" ? "Recently Viewed" : tab === "favorites" ? "Favorites" : "All Documents"}
            </button>
          ))}
        </div>

        {activeTab !== "recent" && (
          <div className="flex flex-col lg:flex-row gap-4 items-center">
            <div className="relative w-full lg:max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by filename..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>
            <div className="flex items-center gap-2 overflow-x-auto w-full pb-2 lg:pb-0 no-scrollbar">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${
                    selectedCategory === cat ? "bg-blue-600 text-white" : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Table */}
        <div className="overflow-x-auto">
          {activeTab === "recent" ? (
            <div className="space-y-3">
              {recentlyViewed.map((doc) => (
                <div key={doc.id} className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl hover:bg-blue-50/30 transition-colors">
                  <div className="w-10 h-10 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-700 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-slate-400" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-slate-900 dark:text-slate-100">{doc.name}</p>
                    <p className="text-xs text-slate-400">{doc.subject} · Viewed {doc.viewedAt}</p>
                  </div>
                  <button className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors">
                    <ExternalLink className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <table className="w-full border-separate border-spacing-y-2">
              <thead>
                <tr className="text-left text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-widest">
                  <th className="px-4 py-3">Document Name</th>
                  <th className="px-4 py-3">Subject</th>
                  <th className="px-4 py-3">Date Added</th>
                  <th className="px-4 py-3">Size</th>
                  <th className="px-4 py-3">Views</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredDocs.map((doc) => (
                  <tr key={doc.id} className="bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors group">
                    <td className="px-4 py-4 rounded-l-2xl border-y border-l border-slate-100 dark:border-slate-700">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-slate-100 dark:bg-slate-700 rounded-lg flex items-center justify-center">
                          <FileText className="w-5 h-5 text-slate-400" />
                        </div>
                        <span className="font-bold text-slate-900 dark:text-slate-100 truncate max-w-[200px]">{doc.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 border-y border-slate-100 dark:border-slate-700">
                      <span className="px-3 py-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 text-xs font-bold rounded-lg uppercase">{doc.subject}</span>
                    </td>
                    <td className="px-4 py-4 border-y border-slate-100 dark:border-slate-700 text-slate-500 dark:text-slate-400 text-sm">{doc.date}</td>
                    <td className="px-4 py-4 border-y border-slate-100 dark:border-slate-700 text-slate-500 dark:text-slate-400 text-sm">{doc.size}</td>
                    <td className="px-4 py-4 border-y border-slate-100 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-sm font-semibold">{doc.views}</td>
                    <td className="px-4 py-4 border-y border-slate-100 dark:border-slate-700">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${doc.status === "Analyzed" ? "bg-emerald-500" : "bg-amber-500 animate-pulse"}`} />
                        <span className={`text-xs font-bold ${doc.status === "Analyzed" ? "text-emerald-600" : "text-amber-600"}`}>{doc.status}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 rounded-r-2xl border-y border-r border-slate-100 dark:border-slate-700 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => toggleFavorite(doc.id)}
                          className={`p-2 rounded-lg transition-all ${doc.favorited ? "text-red-500 bg-red-50" : "text-slate-300 hover:text-red-400 hover:bg-red-50 opacity-0 group-hover:opacity-100"}`}
                        >
                          <Heart className="w-4 h-4" fill={doc.favorited ? "currentColor" : "none"} />
                        </button>
                        <button
                          onClick={() => setShareDoc(doc)}
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                        >
                          <Share2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => toast.success("Downloading...")}
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <div className="relative">
                          <button
                            onClick={() => setOpenMenu(openMenu === doc.id ? null : doc.id)}
                            className="p-2 text-slate-400 hover:text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:bg-slate-700 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>
                          <AnimatePresence>
                            {openMenu === doc.id && (
                              <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: -5 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="absolute right-0 top-full mt-1 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-700 rounded-2xl shadow-xl z-20 w-40 py-2"
                              >
                                <button onClick={() => { setReportDoc(doc); setOpenMenu(null); }} className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-amber-600 hover:bg-amber-50">
                                  <Flag className="w-4 h-4" /> Report
                                </button>
                                <button onClick={() => deleteDoc(doc.id)} className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50">
                                  <Trash2 className="w-4 h-4" /> Delete
                                </button>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {activeTab !== "recent" && filteredDocs.length === 0 && (
            <div className="py-20 text-center">
              <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="w-8 h-8 text-slate-300" />
              </div>
              <h3 className="font-bold text-slate-900 dark:text-slate-100">No documents found</h3>
              <p className="text-slate-500 dark:text-slate-400">Try adjusting your search or filter</p>
            </div>
          )}
        </div>
      </div>

      {/* Upload Wizard Modal */}
      <AnimatePresence>
        {isUploadOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsUploadOpen(false)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 shadow-2xl">
              <button onClick={() => setIsUploadOpen(false)} className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:bg-slate-700 rounded-full">
                <X className="w-5 h-5" />
              </button>

              {/* Stepper */}
              <div className="flex items-center gap-2 mb-8">
                {[1, 2, 3].map((s) => (
                  <div key={s} className="flex items-center gap-2 flex-1">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-extrabold transition-all ${uploadStep >= s ? "bg-blue-600 text-white" : "bg-slate-100 dark:bg-slate-700 text-slate-400"}`}>
                      {uploadStep > s ? <Check className="w-4 h-4" /> : s}
                    </div>
                    {s < 3 && <div className={`flex-1 h-0.5 rounded-full transition-all ${uploadStep > s ? "bg-blue-600" : "bg-slate-100 dark:bg-slate-700"}`} />}
                  </div>
                ))}
              </div>

              {uploadStep === 1 && (
                <div>
                  <h2 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 mb-1">Select Files</h2>
                  <p className="text-slate-500 dark:text-slate-400 mb-6">Supported: PDF, DOCX, TXT (Max 50MB each)</p>
                  <div
                    className="border-2 border-dashed border-slate-200 dark:border-slate-600 rounded-3xl p-10 text-center hover:border-blue-400 hover:bg-blue-50/30 transition-all cursor-pointer group"
                    onClick={() => toast.success("File picker opened")}
                  >
                    <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                      <Upload className="w-7 h-7 text-blue-600" />
                    </div>
                    <p className="font-bold text-slate-900 dark:text-slate-100 mb-1">Click to upload or drag and drop</p>
                    <p className="text-slate-400 text-sm">PDF, DOCX, TXT files accepted</p>
                  </div>
                  <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center gap-3">
                    <File className="w-5 h-5 text-slate-400" />
                    <div className="flex-1">
                      <p className="text-sm font-bold">Physics_Midterm_Prep.pdf</p>
                      <div className="w-full bg-slate-200 h-1 rounded-full mt-1.5">
                        <div className="bg-blue-600 h-full rounded-full w-3/4" />
                      </div>
                    </div>
                    <span className="text-xs font-bold text-blue-600">75%</span>
                  </div>
                  <button onClick={() => setUploadStep(2)} className="mt-6 w-full py-3.5 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 transition-all">
                    Next: Set Details
                  </button>
                </div>
              )}

              {uploadStep === 2 && (
                <div>
                  <h2 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 mb-1">Document Details</h2>
                  <p className="text-slate-500 dark:text-slate-400 mb-6">Add metadata to help organize your document</p>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Document Title</label>
                      <input type="text" defaultValue="Physics Midterm Prep" className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Subject</label>
                      <select className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all">
                        <option>Physics</option>
                        <option>Mathematics</option>
                        <option>History</option>
                        <option>Chemistry</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Tags</label>
                      <input type="text" placeholder="midterm, thermodynamics, prep" className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" />
                    </div>
                  </div>
                  <div className="flex gap-3 mt-6">
                    <button onClick={() => setUploadStep(1)} className="flex-1 py-3.5 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 font-bold rounded-2xl hover:bg-slate-50 dark:bg-slate-800 transition-colors">Back</button>
                    <button onClick={() => setUploadStep(3)} className="flex-1 py-3.5 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 transition-all">Next: Sharing</button>
                  </div>
                </div>
              )}

              {uploadStep === 3 && (
                <div>
                  <h2 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 mb-1">Sharing Settings</h2>
                  <p className="text-slate-500 dark:text-slate-400 mb-6">Control who can access this document</p>
                  <div className="space-y-3 mb-6">
                    {[
                      { value: "private", icon: Lock, label: "Private", desc: "Only you can view this document" },
                      { value: "public", icon: Globe, label: "Public", desc: "Anyone with the link can view" },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setSharing(opt.value as "private" | "public")}
                        className={`w-full flex items-center gap-4 p-4 border-2 rounded-2xl transition-all text-left ${
                          sharing === opt.value ? "border-blue-500 bg-blue-50/30" : "border-slate-100 dark:border-slate-700 hover:border-slate-200 "
                        }`}
                      >
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${sharing === opt.value ? "bg-blue-100" : "bg-slate-100 dark:bg-slate-700"}`}>
                          <opt.icon className={`w-5 h-5 ${sharing === opt.value ? "text-blue-600" : "text-slate-500 dark:text-slate-400"}`} />
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 dark:text-slate-100">{opt.label}</p>
                          <p className="text-sm text-slate-500 dark:text-slate-400">{opt.desc}</p>
                        </div>
                        <div className={`ml-auto w-5 h-5 rounded-full border-2 flex items-center justify-center ${sharing === opt.value ? "border-blue-500 bg-blue-600" : "border-slate-300"}`}>
                          {sharing === opt.value && <Check className="w-3 h-3 text-white" />}
                        </div>
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => setUploadStep(2)} className="flex-1 py-3.5 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 font-bold rounded-2xl hover:bg-slate-50 dark:bg-slate-800 transition-colors">Back</button>
                    <button
                      onClick={() => {
                        toast.success("Document uploaded and AI analysis started!");
                        setIsUploadOpen(false);
                      }}
                      className="flex-1 py-3.5 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 transition-all"
                    >
                      Upload & Analyze
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Share Modal */}
      <AnimatePresence>
        {shareDoc && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShareDoc(null)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 shadow-2xl">
              <button onClick={() => setShareDoc(null)} className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:bg-slate-700 rounded-full">
                <X className="w-5 h-5" />
              </button>
              <Share2 className="w-8 h-8 text-blue-600 mb-4" />
              <h2 className="text-xl font-extrabold text-slate-900 dark:text-slate-100 mb-1">Share Document</h2>
              <p className="text-slate-500 dark:text-slate-400 text-sm mb-6 truncate">{shareDoc.name}</p>

              <div className="space-y-3 mb-6">
                {[
                  { value: "private", icon: Lock, label: "Private", desc: "Only you can access" },
                  { value: "public", icon: Globe, label: "Public Link", desc: "Anyone with the link" },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setSharing(opt.value as any)}
                    className={`w-full flex items-center gap-3 p-3.5 border-2 rounded-2xl transition-all ${sharing === opt.value ? "border-blue-500 bg-blue-50/40" : "border-slate-100 dark:border-slate-700 hover:border-slate-200 dark:hover:border-slate-600"}`}
                  >
                    <opt.icon className={`w-5 h-5 ${sharing === opt.value ? "text-blue-600" : "text-slate-400"}`} />
                    <div className="text-left">
                      <p className="font-bold text-sm text-slate-900 dark:text-slate-100">{opt.label}</p>
                      <p className="text-xs text-slate-400">{opt.desc}</p>
                    </div>
                    {sharing === opt.value && <div className="ml-auto w-4 h-4 rounded-full bg-blue-600 flex items-center justify-center"><Check className="w-2.5 h-2.5 text-white" /></div>}
                  </button>
                ))}
              </div>

              {sharing === "public" && (
                <div className="mb-5 flex items-center gap-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2.5">
                  <Link2 className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="text-sm text-slate-500 dark:text-slate-400 flex-1 truncate">https://aistudyhub.com/doc/share/abc123</span>
                  <button onClick={() => toast.success("Link copied!")} className="text-blue-600 font-bold text-sm shrink-0">Copy</button>
                </div>
              )}

              <button onClick={() => { toast.success("Sharing settings saved!"); setShareDoc(null); }} className="w-full py-3.5 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 transition-all">
                Save Settings
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Report Modal */}
      <AnimatePresence>
        {reportDoc && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setReportDoc(null)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 shadow-2xl">
              <button onClick={() => setReportDoc(null)} className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:bg-slate-700 rounded-full">
                <X className="w-5 h-5" />
              </button>
              <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center mb-4">
                <Flag className="w-6 h-6 text-red-500" />
              </div>
              <h2 className="text-xl font-extrabold text-slate-900 dark:text-slate-100 mb-1">Report Document</h2>
              <p className="text-slate-500 dark:text-slate-400 text-sm mb-6 truncate">{reportDoc.name}</p>

              <div className="space-y-2 mb-5">
                <p className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Select a reason:</p>
                {reportCategories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedReportCat(cat)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all text-left border-2 ${
                      selectedReportCat === cat ? "border-red-400 bg-red-50 text-red-700" : "border-slate-100 dark:border-slate-700 hover:border-slate-200 text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${selectedReportCat === cat ? "border-red-500 bg-red-500" : "border-slate-300"}`}>
                      {selectedReportCat === cat && <div className="w-2 h-2 bg-white dark:bg-slate-900 rounded-full" />}
                    </div>
                    {cat}
                  </button>
                ))}
              </div>

              <div className="mb-5">
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Additional details (optional)</label>
                <textarea rows={3} placeholder="Describe the issue..." className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 transition-all resize-none text-sm" />
              </div>

              <div className="flex gap-3">
                <button onClick={() => setReportDoc(null)} className="flex-1 py-3 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 font-bold rounded-2xl hover:bg-slate-50 dark:bg-slate-800 transition-colors">Cancel</button>
                <button
                  onClick={() => {
                    if (!selectedReportCat) { toast.error("Please select a reason"); return; }
                    toast.success("Report submitted. Our team will review it.");
                    setReportDoc(null);
                    setSelectedReportCat("");
                  }}
                  className="flex-1 py-3 bg-red-600 text-white font-bold rounded-2xl hover:bg-red-700 transition-all"
                >
                  Submit Report
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
