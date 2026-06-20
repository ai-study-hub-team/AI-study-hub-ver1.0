import {
  FileText,
  Search,
  MoreVertical,
  Download,
  Trash2,
  ExternalLink,
  Upload,
  X,
  Check,
  Share2,
  Flag,
  Heart,
  Clock,
  Link2,
  Lock,
  Globe,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { motion, AnimatePresence } from "motion/react";
import {
  aiStatusMeta,
  documentStatusMeta,
} from "../../constants/documentStatus";
import type { AiStatus, DocumentStatus } from "../../constants/documentStatus";
import { documentApi } from "../../services/documentApi";

interface DocumentItem {
  id: number;
  name: string;
  category: string;
  date: string;
  size: string;
  documentStatus: DocumentStatus;
  aiStatus: AiStatus;
  views: number;
  downloads: number;
  favorited: boolean;
}


const reportCategories = [
  "Copyright Violation",
  "Inappropriate Content",
  "Spam",
  "Misinformation",
  "Privacy Violation",
  "Other",
];

type Tab = "all" | "favorites" | "recent";

const formatFileSize = (bytes: number) => {
  if (!bytes) return "0 KB";

  const mb = bytes / 1024 / 1024;

  if (mb >= 1) {
    return `${mb.toFixed(1)} MB`;
  }

  return `${(bytes / 1024).toFixed(1)} KB`;
};

const mapAiStatus = (processStatus: string): AiStatus => {
  if (processStatus === "PROCESSED") return "PROCESSED";
  if (processStatus === "PROCESSING") return "PROCESSING";
  if (processStatus === "FAILED") return "FAILED";
  return "UPLOADED";
};

const mapDocumentStatus = (status: string): DocumentStatus => {
  if (status === "DELETED") return "DELETED";
  return "ACTIVE";
};

export function DocumentsPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>("all");
  const [shareDoc, setShareDoc] = useState<DocumentItem | null>(null);

const [reportDoc, setReportDoc] = useState<DocumentItem | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sharing, setSharing] = useState<"private" | "public">("private");
  const [selectedReportCat, setSelectedReportCat] = useState("");
  const [docs, setDocs] = useState<DocumentItem[]>([]);
  const recentlyViewed = docs
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 3)
    .map((doc) => ({
  id: doc.id,
  name: doc.name,
  category: doc.category,
  viewedAt: doc.date,
}));
  const [isLoading, setIsLoading] = useState(false);
  const [openMenu, setOpenMenu] = useState<number | null>(null);

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    try {
      setIsLoading(true);

      const response = await documentApi.getDocuments({
        page: 0,
        size: 20,
      });

      const mappedDocs: DocumentItem[] = response.data.content.map((doc) => ({
        id: doc.id,
        name: doc.originalName || doc.fileName || doc.title,
        category: doc.categoryName || "Uncategorized",
        date: doc.createdAt?.slice(0, 10) || "",
        size: formatFileSize(doc.fileSize),
        documentStatus: mapDocumentStatus(doc.status),
        aiStatus: mapAiStatus(doc.processStatus),
        views: 0,
        downloads: 0,
        favorited: false,
      }));

      setDocs(mappedDocs);
    } catch (error) {
      toast.error("Cannot load documents.");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleFavorite = (id: number) => {
    setDocs((prev) =>
      prev.map((d) => (d.id === id ? { ...d, favorited: !d.favorited } : d)),
    );
  };

  const deleteDoc = async (id: number) => {
    try {
      await documentApi.deleteDocument(id);

      setDocs((prev) => prev.filter((d) => d.id !== id));
      toast.success("Document deleted");
    } catch (error) {
      toast.error("Cannot delete document.");
    } finally {
      setOpenMenu(null);
    }
  };

  const filteredDocs = docs.filter((doc) => {
    const matchSearch = doc.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchTab =
      activeTab === "all"
        ? true
        : activeTab === "favorites"
          ? doc.favorited
          : true;
    return matchSearch && matchTab;
  });

  const displayDocs = activeTab === "recent" ? recentlyViewed : filteredDocs;

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-slate-100">
            Document Management
          </h1>
          <p className="text-slate-500 dark:text-slate-400">
            Upload, organize, and share your study materials
          </p>
        </div>
        <button
          onClick={() => navigate("/app/upload")}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-500/20 transition-all"
        >
          <Upload className="w-5 h-5" /> Upload Document
        </button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Total Documents",
            value: docs.length,
            icon: FileText,
            color: "blue",
          },
          {
            label: "Favorites",
            value: docs.filter((d) => d.favorited).length,
            icon: Heart,
            color: "red",
          },
        ].map((stat, i) => (
          <div
            key={i}
            className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm"
          >
            <div
              className={`w-8 h-8 rounded-lg mb-2 flex items-center justify-center bg-${stat.color}-50`}
            >
              <stat.icon className={`w-4 h-4 text-${stat.color}-600`} />
            </div>
            <p className="text-xl font-extrabold text-slate-900 dark:text-slate-100">
              {stat.value}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {stat.label}
            </p>
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
                activeTab === tab
                  ? "bg-blue-600 text-white"
                  : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:bg-slate-800"
              }`}
            >
              {tab === "recent"
                ? "Recently Viewed"
                : tab === "favorites"
                  ? "Favorites"
                  : "All Documents"}
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
          </div>
        )}

        {/* Table */}
        <div className="overflow-x-auto">
          {activeTab === "recent" ? (
            <div className="space-y-3">
              {recentlyViewed.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl hover:bg-blue-50/30 transition-colors"
                >
                  <div className="w-10 h-10 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-700 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-slate-400" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-slate-900 dark:text-slate-100">
                      {doc.name}
                    </p>
                    <p className="text-xs text-slate-400">
                      {doc.category} · Viewed {doc.viewedAt}
                    </p>
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
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Date Added</th>
                  <th className="px-4 py-3">Size</th>
                  <th className="px-4 py-3">Views</th>
                  <th className="px-4 py-3">Upload Status</th>
                  <th className="px-4 py-3">AI Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredDocs.map((doc) => {
                  const documentStatus = documentStatusMeta[doc.documentStatus];
                  const aiStatus = aiStatusMeta[doc.aiStatus];

                  return (
                    <tr
                      key={doc.id}
                      className="bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors group"
                    >
                      <td className="px-4 py-4 rounded-l-2xl border-y border-l border-slate-100 dark:border-slate-700">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-slate-100 dark:bg-slate-700 rounded-lg flex items-center justify-center">
                            <FileText className="w-5 h-5 text-slate-400" />
                          </div>
                          <span className="font-bold text-slate-900 dark:text-slate-100 truncate max-w-[200px]">
                            {doc.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4 border-y border-slate-100 dark:border-slate-700">
                        <span className="px-3 py-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 text-xs font-bold rounded-lg uppercase">
                          {doc.category}
                        </span>
                      </td>
                      <td className="px-4 py-4 border-y border-slate-100 dark:border-slate-700 text-slate-500 dark:text-slate-400 text-sm">
                        {doc.date}
                      </td>
                      <td className="px-4 py-4 border-y border-slate-100 dark:border-slate-700 text-slate-500 dark:text-slate-400 text-sm">
                        {doc.size}
                      </td>
                      <td className="px-4 py-4 border-y border-slate-100 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-sm font-semibold">
                        {doc.views}
                      </td>
                      <td className="px-4 py-4 border-y border-slate-100 dark:border-slate-700">
                        <span
                          className={`inline-flex w-fit items-center gap-1.5 rounded-full px-2 py-1 text-[11px] font-extrabold ring-1 ${documentStatus.badgeClass}`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${documentStatus.dotClass}`}
                          />
                          {documentStatus.label}
                        </span>
                      </td>
                      <td className="px-4 py-4 border-y border-slate-100 dark:border-slate-700">
                        <span
                          className={`inline-flex w-fit items-center gap-1.5 rounded-full px-2 py-1 text-[11px] font-extrabold ring-1 ${aiStatus.badgeClass}`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${aiStatus.dotClass}`}
                          />
                          {aiStatus.label}
                        </span>
                      </td>
                      <td className="px-4 py-4 rounded-r-2xl border-y border-r border-slate-100 dark:border-slate-700 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => toggleFavorite(doc.id)}
                            className={`p-2 rounded-lg transition-all ${doc.favorited ? "text-red-500 bg-red-50" : "text-slate-300 hover:text-red-400 hover:bg-red-50 opacity-0 group-hover:opacity-100"}`}
                          >
                            <Heart
                              className="w-4 h-4"
                              fill={doc.favorited ? "currentColor" : "none"}
                            />
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
                              onClick={() =>
                                setOpenMenu(openMenu === doc.id ? null : doc.id)
                              }
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
                                  <button
                                    onClick={() => {
                                      setReportDoc(doc);
                                      setOpenMenu(null);
                                    }}
                                    className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-amber-600 hover:bg-amber-50"
                                  >
                                    <Flag className="w-4 h-4" /> Report
                                  </button>
                                  <button
                                    onClick={() => deleteDoc(doc.id)}
                                    className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50"
                                  >
                                    <Trash2 className="w-4 h-4" /> Delete
                                  </button>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Share Modal */}
      <AnimatePresence>
        {shareDoc && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShareDoc(null)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 shadow-2xl"
            >
              <button
                onClick={() => setShareDoc(null)}
                className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:bg-slate-700 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
              <Share2 className="w-8 h-8 text-blue-600 mb-4" />
              <h2 className="text-xl font-extrabold text-slate-900 dark:text-slate-100 mb-1">
                Share Document
              </h2>
              <p className="text-slate-500 dark:text-slate-400 text-sm mb-6 truncate">
                {shareDoc.name}
              </p>

              <div className="space-y-3 mb-6">
                {[
                  {
                    value: "private",
                    icon: Lock,
                    label: "Private",
                    desc: "Only you can access",
                  },
                  {
                    value: "public",
                    icon: Globe,
                    label: "Public Link",
                    desc: "Anyone with the link",
                  },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setSharing(opt.value as any)}
                    className={`w-full flex items-center gap-3 p-3.5 border-2 rounded-2xl transition-all ${sharing === opt.value ? "border-blue-500 bg-blue-50/40" : "border-slate-100 dark:border-slate-700 hover:border-slate-200 dark:hover:border-slate-600"}`}
                  >
                    <opt.icon
                      className={`w-5 h-5 ${sharing === opt.value ? "text-blue-600" : "text-slate-400"}`}
                    />
                    <div className="text-left">
                      <p className="font-bold text-sm text-slate-900 dark:text-slate-100">
                        {opt.label}
                      </p>
                      <p className="text-xs text-slate-400">{opt.desc}</p>
                    </div>
                    {sharing === opt.value && (
                      <div className="ml-auto w-4 h-4 rounded-full bg-blue-600 flex items-center justify-center">
                        <Check className="w-2.5 h-2.5 text-white" />
                      </div>
                    )}
                  </button>
                ))}
              </div>

              {sharing === "public" && (
                <div className="mb-5 flex items-center gap-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2.5">
                  <Link2 className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="text-sm text-slate-500 dark:text-slate-400 flex-1 truncate">
                    https://aistudyhub.com/doc/share/abc123
                  </span>
                  <button
                    onClick={() => toast.success("Link copied!")}
                    className="text-blue-600 font-bold text-sm shrink-0"
                  >
                    Copy
                  </button>
                </div>
              )}

              <button
                onClick={() => {
                  toast.success("Sharing settings saved!");
                  setShareDoc(null);
                }}
                className="w-full py-3.5 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 transition-all"
              >
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
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setReportDoc(null)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 shadow-2xl"
            >
              <button
                onClick={() => setReportDoc(null)}
                className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:bg-slate-700 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center mb-4">
                <Flag className="w-6 h-6 text-red-500" />
              </div>
              <h2 className="text-xl font-extrabold text-slate-900 dark:text-slate-100 mb-1">
                Report Document
              </h2>
              <p className="text-slate-500 dark:text-slate-400 text-sm mb-6 truncate">
                {reportDoc.name}
              </p>

              <div className="space-y-2 mb-5">
                <p className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                  Select a reason:
                </p>
                {reportCategories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedReportCat(cat)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all text-left border-2 ${
                      selectedReportCat === cat
                        ? "border-red-400 bg-red-50 text-red-700"
                        : "border-slate-100 dark:border-slate-700 hover:border-slate-200 text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${selectedReportCat === cat ? "border-red-500 bg-red-500" : "border-slate-300"}`}
                    >
                      {selectedReportCat === cat && (
                        <div className="w-2 h-2 bg-white dark:bg-slate-900 rounded-full" />
                      )}
                    </div>
                    {cat}
                  </button>
                ))}
              </div>

              <div className="mb-5">
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Additional details (optional)
                </label>
                <textarea
                  rows={3}
                  placeholder="Describe the issue..."
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 transition-all resize-none text-sm"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setReportDoc(null)}
                  className="flex-1 py-3 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 font-bold rounded-2xl hover:bg-slate-50 dark:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (!selectedReportCat) {
                      toast.error("Please select a reason");
                      return;
                    }
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
