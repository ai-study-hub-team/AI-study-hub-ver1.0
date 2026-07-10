import {
  Sparkles,
  Download,
  FileText,
  ChevronRight,
  CheckCircle2,
  Brain,
  Tag,
  Copy,
  RefreshCw,
  History,
  Share2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { documentApi } from "../../services/documentApi";
import {
  generateSummaryApi,
  getSummaryByDocumentApi,
  getSummariesApi,
  type SummaryType,
} from "../../services/aiApi";
import { getCurrentUserId } from "../../services/apiClient";
import { useCreatePublicLink } from "../../hooks/useCreatePublicLink";

const DISPLAY_LIMIT = 6;

const defaultSummary = {
  title: "AI Summary",
  documentTitle: "",
  summaryText: "Click Generate Summary to create an AI summary for this document.",
  keyTakeaways: [] as string[],
  keyConcepts: [] as { term: string; definition: string }[],
  insights: [] as string[],
};

export function AISummaryPage() {
  const [view, setView] = useState<"summary" | "history">("summary");
  const [documents, setDocuments] = useState<any[]>([]);
  const [showAllDocuments, setShowAllDocuments] = useState(false);

  const [selectedDoc, setSelectedDoc] = useState<any>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [summaryData, setSummaryData] = useState<any>(defaultSummary);
  const [summaryHistory, setSummaryHistory] = useState<any[]>([]);

  const [summaryType, setSummaryType] = useState<SummaryType>("SHORT");
  const { createAndCopyPublicLink, loadingDocumentId } =
    useCreatePublicLink();

  const visibleDocuments = showAllDocuments
    ? documents
    : documents.slice(0, DISPLAY_LIMIT);

  const hiddenDocumentCount = Math.max(documents.length - DISPLAY_LIMIT, 0);

const summaryTypeOptions: { value: SummaryType; label: string; desc: string }[] = [
  {
    value: "SHORT",
    label: "Short",
    desc: "Quick and concise summary",
  },
  {
    value: "DETAILED",
    label: "Detailed",
    desc: "Longer summary with more explanation",
  },
  {
    value: "BULLET_POINTS",
    label: "Bullet Points",
    desc: "Main ideas in bullet format",
  },
];

  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        const userId = getCurrentUserId();

        if (!userId) {
          toast.error("Please login again.");
          return;
        }

        const data = await documentApi.getAllDocumentsForSelect(userId);
        setDocuments(data);

        if (data.length > 0) {
          setSelectedDoc(data[0]);
        }
      } catch (error: any) {
        console.error("Load documents failed:", error);
        toast.error(
          error?.response?.data?.message ||
            error?.response?.data?.error ||
            "Cannot load uploaded documents",
        );
      }
    };

    fetchDocuments();
  }, []);

  const handleSelectDocument = async (doc: any) => {
    const userId = getCurrentUserId();

    if (!userId) {
      toast.error("Please login again.");
      return;
    }

    setSelectedDoc(doc);
    setShowSummary(false);
    setSummaryData(defaultSummary);
    setView("summary");

    try {
      const res = await getSummaryByDocumentApi(doc.id, userId);

      const summaries = Array.isArray(res.data)
        ? res.data
        : res.data
          ? [res.data]
          : [];

      if (summaries.length > 0) {
        setSummaryData(summaries[0]);
        setShowSummary(true);
      }
    } catch {
      console.log("No summary found for this document");
    }
  };

  const fetchSummaryHistory = async () => {
    const userId = getCurrentUserId();

    if (!userId) {
      toast.error("Please login again.");
      return;
    }

    try {
      const res = await getSummariesApi(userId);

      setSummaryHistory(res.data || []);
      setView("history");
    } catch (error: any) {
      console.error("Load summary history failed:", error);
      toast.error(
        error?.response?.data?.message ||
          error?.response?.data?.error ||
          "Cannot load summary history",
      );
    }
  };

  const handleGenerate = async () => {
    const userId = getCurrentUserId();

    if (!userId) {
      toast.error("Please login again.");
      return;
    }

    if (!selectedDoc) {
      toast.error("Please select a document first");
      return;
    }

    const processStatus = selectedDoc.processStatus || selectedDoc.aiStatus;

    if (processStatus && processStatus !== "PROCESSED") {
      toast.error(
        "This document is not processed yet. Please wait until AI Status is PROCESSED.",
      );
      return;
    }

    setIsGenerating(true);
    setShowSummary(false);
    setView("summary");

    try {
      const res = await generateSummaryApi(userId, selectedDoc.id, summaryType);

      setSummaryData(res.data);
      setShowSummary(true);

      toast.success("Summary generated successfully!");
    } catch (error: any) {
      console.error("Generate summary failed:", error);

      toast.error(
        error?.response?.data?.message ||
          error?.response?.data?.error ||
          "Generate summary failed",
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    const text = summaryData?.summaryText || "";
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `${
      summaryData?.documentTitle || selectedDoc?.name || "summary"
    }.txt`;
    a.click();

    URL.revokeObjectURL(url);
    toast.success("Summary downloaded!");
  };

  const handleCopy = () => {
    navigator.clipboard?.writeText(summaryData?.summaryText || "");
    toast.success("Copied to clipboard!");
  };

  const openHistoryItem = (summary: any) => {
    setSummaryData(summary);
    setShowSummary(true);
    setView("summary");
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">
            AI Summary
          </h1>
          <p className="text-slate-500 dark:text-slate-400">
            Generate intelligent summaries from your study materials
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchSummaryHistory}
            className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-semibold rounded-xl"
          >
            <History className="w-4 h-4" />
            History
          </button>

          {showSummary && (
            <>
              <button
                onClick={handleDownload}
                className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-semibold rounded-xl"
              >
                <Download className="w-4 h-4" />
                Download
              </button>

              <button
                onClick={handleCopy}
                className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white font-bold rounded-xl"
              >
                <Copy className="w-4 h-4" />
                Copy
              </button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-5">
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-sm p-5">
            <h2 className="text-sm font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-4">
              Select Document
            </h2>

            <div className="space-y-2">
              {documents.length === 0 ? (
                <p className="text-sm text-slate-500">
                  No uploaded documents found.
                </p>
              ) : (
                <>
                  {visibleDocuments.map((doc) => {
                    const docName =
                      doc.name || doc.title || doc.fileName || "Untitled";

                    const processStatus = doc.processStatus || doc.aiStatus;
                    const isProcessed =
                      !processStatus || processStatus === "PROCESSED";

                    return (
                      <div
                        key={doc.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => handleSelectDocument(doc)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            handleSelectDocument(doc);
                          }
                        }}
                        className={`w-full flex items-center gap-3 p-3 rounded-2xl border-2 text-left transition-all ${
                          selectedDoc?.id === doc.id
                            ? "border-blue-500 bg-blue-50/30 dark:bg-blue-500/10"
                            : "border-transparent hover:border-slate-200 dark:hover:border-slate-700"
                        }`}
                      >
                        <div className="w-9 h-9 bg-slate-50 dark:bg-slate-800 rounded-xl flex items-center justify-center">
                          <FileText className="w-4 h-4 text-slate-500" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                            {docName}
                          </p>

                          {processStatus && (
                            <p
                              className={`text-[11px] font-semibold ${
                                isProcessed
                                  ? "text-emerald-600"
                                  : "text-amber-600"
                              }`}
                            >
                              AI Status: {processStatus}
                            </p>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            createAndCopyPublicLink(doc.id);
                          }}
                          disabled={loadingDocumentId === doc.id}
                          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-60 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-blue-300"
                          title="Share document"
                          aria-label="Share document"
                        >
                          <Share2
                            className={`h-4 w-4 ${
                              loadingDocumentId === doc.id
                                ? "animate-pulse"
                                : ""
                            }`}
                          />
                        </button>
                      </div>
                    );
                  })}

                  {documents.length > DISPLAY_LIMIT && (
                    <button
                      type="button"
                      onClick={() => setShowAllDocuments(!showAllDocuments)}
                      className="w-full mt-3 py-3 rounded-2xl border border-dashed border-blue-300 text-blue-600 font-semibold hover:bg-blue-50 dark:hover:bg-blue-950/30 transition"
                    >
                      {showAllDocuments
                        ? "Thu gọn"
                        : `Xem thêm`}
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-sm p-5">
            <h2 className="text-sm font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-4">
              Summary Type
            </h2>

            <div className="space-y-2">
              {summaryTypeOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setSummaryType(option.value)}
                  className={`w-full p-3 rounded-2xl border-2 text-left transition-all ${
                    summaryType === option.value
                      ? "border-blue-500 bg-blue-50/30 dark:bg-blue-500/10"
                      : "border-transparent hover:border-slate-200 dark:hover:border-slate-700"
                  }`}
                >
                  <p className="text-sm font-extrabold text-slate-900 dark:text-white">
                    {option.label}
                  </p>
                  <p className="text-xs text-slate-500">{option.desc}</p>
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={isGenerating || !selectedDoc}
            className="w-full py-4 bg-blue-600 text-white font-extrabold rounded-2xl hover:bg-blue-700 flex items-center justify-center gap-2 disabled:opacity-70"
          >
            {isGenerating ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                Generate Summary
              </>
            )}
          </button>
        </div>

        <div className="lg:col-span-2">
          {view === "history" ? (
            <div className="space-y-4">
              {summaryHistory.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-700 p-8 text-center">
                  <p className="text-slate-500">No summary history found.</p>
                </div>
              ) : (
                summaryHistory.map((s) => (
                  <button
                    key={s.summaryId || s.id}
                    onClick={() => openHistoryItem(s)}
                    className="w-full text-left bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-blue-500 transition-all"
                  >
                    <p className="font-bold text-slate-900 dark:text-white">
                      {s.documentTitle || "Untitled Document"}
                    </p>
                    <p className="text-sm text-slate-500">
                      {s.summaryType} · {s.createdAt}
                    </p>
                  </button>
                ))
              )}
            </div>
          ) : (
            <AnimatePresence mode="wait">
              {isGenerating ? (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-sm p-8 flex flex-col items-center justify-center min-h-[400px]"
                >
                  <Sparkles className="w-8 h-8 text-blue-600 animate-pulse mb-5" />
                  <h3 className="text-xl font-extrabold text-slate-900 dark:text-white mb-2">
                    Analyzing Document...
                  </h3>
                  <p className="text-slate-500 dark:text-slate-400 text-sm">
                    AI is reading and summarizing{" "}
                    {selectedDoc?.name || selectedDoc?.title}
                  </p>
                </motion.div>
              ) : showSummary && selectedDoc ? (
                <motion.div
                  key="summary"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-5"
                >
                  <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-sm p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Sparkles className="w-4 h-4 text-blue-600" />
                          <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">
                            {summaryData.summaryType || "AI Summary"}
                          </span>
                        </div>

                        <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
                          {summaryData.documentTitle ||
                            selectedDoc.name ||
                            selectedDoc.title}
                        </h2>
                      </div>

                      <div className="px-3 py-1.5 bg-emerald-50 text-emerald-600 text-xs font-bold rounded-xl">
                        AI Generated
                      </div>
                    </div>

                    <div className="text-slate-700 dark:text-slate-300 leading-relaxed">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          p: ({ children }) => (
                            <p className="mb-3 text-slate-700 dark:text-slate-300">
                              {children}
                            </p>
                          ),
                          strong: ({ children }) => (
                            <strong className="font-extrabold text-slate-900 dark:text-white">
                              {children}
                            </strong>
                          ),
                          ul: ({ children }) => (
                            <ul className="list-disc pl-6 space-y-2 mb-4">
                              {children}
                            </ul>
                          ),
                          ol: ({ children }) => (
                            <ol className="list-decimal pl-6 space-y-2 mb-4">
                              {children}
                            </ol>
                          ),
                          li: ({ children }) => (
                            <li className="text-slate-700 dark:text-slate-300">
                              {children}
                            </li>
                          ),
                          code: ({ children }) => (
                            <code className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400 text-sm">
                              {children}
                            </code>
                          ),
                        }}
                      >
                        {summaryData.summaryText || ""}
                      </ReactMarkdown>
                    </div>
                  </div>

                  {summaryData.keyTakeaways?.length > 0 && (
                    <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-sm p-6">
                      <h3 className="text-lg font-extrabold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                        Key Takeaways
                      </h3>

                      {summaryData.keyTakeaways.map(
                        (point: string, i: number) => (
                          <div
                            key={i}
                            className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl mb-3"
                          >
                            <div className="w-6 h-6 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 font-extrabold text-xs">
                              {i + 1}
                            </div>
                            <p className="text-sm text-slate-700 dark:text-slate-300">
                              {point}
                            </p>
                          </div>
                        ),
                      )}
                    </div>
                  )}

                  {summaryData.keyConcepts?.length > 0 && (
                    <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-sm p-6">
                      <h3 className="text-lg font-extrabold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                        <Brain className="w-5 h-5 text-purple-500" />
                        Key Concepts & Definitions
                      </h3>

                      {summaryData.keyConcepts.map(
                        (concept: any, i: number) => (
                          <div
                            key={i}
                            className="flex gap-3 p-3 border border-slate-200 dark:border-slate-700 rounded-2xl mb-3"
                          >
                            <Tag className="w-4 h-4 text-purple-500 mt-0.5" />
                            <div>
                              <p className="font-extrabold text-slate-900 dark:text-white text-sm">
                                {concept.term}
                              </p>
                              <p className="text-sm text-slate-500">
                                {concept.definition}
                              </p>
                            </div>
                          </div>
                        ),
                      )}
                    </div>
                  )}

                  {summaryData.insights?.length > 0 && (
                    <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[2rem] p-6 text-white">
                      <div className="flex items-center gap-2 mb-4">
                        <Sparkles className="w-5 h-5" />
                        <h3 className="text-lg font-extrabold">
                          AI Study Insights
                        </h3>
                      </div>

                      {summaryData.insights.map(
                        (insight: string, i: number) => (
                          <div
                            key={i}
                            className="flex items-start gap-3 p-3 bg-white/10 rounded-2xl mb-3"
                          >
                            <ChevronRight className="w-4 h-4 mt-0.5" />
                            <p className="text-sm">{insight}</p>
                          </div>
                        ),
                      )}
                    </div>
                  )}
                </motion.div>
              ) : (
                <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-sm p-8 flex flex-col items-center justify-center min-h-[400px] text-center">
                  <Sparkles className="w-10 h-10 text-blue-600 mb-4" />
                  <h3 className="text-xl font-extrabold text-slate-900 dark:text-white mb-2">
                    Ready to generate summary
                  </h3>
                  <p className="text-slate-500 dark:text-slate-400 text-sm">
                    Select a document, choose summary type, and click Generate
                    Summary.
                  </p>
                </div>
              )}
            </AnimatePresence>
          )}
        </div>
      </div>
    </div>
  );
}
