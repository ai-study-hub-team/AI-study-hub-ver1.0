import {
  Sparkles,
  Download,
  FileText,
  ChevronRight,
  CheckCircle2,
  Brain,
  BookOpen,
  Tag,
  Layers,
  Copy,
  RefreshCw,
  Star,
} from "lucide-react";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import { documentApi } from "../../services/documentApi";

const templates = [
  { id: "executive", label: "Executive Summary", desc: "High-level overview with key points", icon: Star },
  { id: "detailed", label: "Detailed Analysis", desc: "Comprehensive chapter-by-chapter", icon: Layers },
  { id: "bullets", label: "Bullet Points", desc: "Quick scannable key concepts", icon: CheckCircle2 },
  { id: "concepts", label: "Key Concepts", desc: "Core terminology and definitions", icon: Brain },
  { id: "study", label: "Study Guide", desc: "Formatted for exam preparation", icon: BookOpen },
];

const summaryContent = {
  title: "Executive Summary",
  summary:
    "This is a sample AI summary. Later, this content should be replaced by the real AI summary API response.",
  keyTakeaways: [
    "The selected document was loaded from your uploaded files.",
    "AI Summary page now uses documents from backend API.",
    "You can select any uploaded document from the left panel.",
  ],
  keyConcepts: [
    { term: "Document", definition: "A file uploaded by user to the system." },
    { term: "AI Summary", definition: "A generated summary based on selected document content." },
  ],
  insights: [
    "Next step: connect this page to real summary API.",
    "Make sure uploaded documents are processed before generating summary.",
  ],
};

export function AISummaryPage() {
  const [documents, setDocuments] = useState<any[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<any>(null);
  const [selectedTemplate, setSelectedTemplate] = useState("executive");
  const [isGenerating, setIsGenerating] = useState(false);
  const [showSummary, setShowSummary] = useState(true);

  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        const data = await documentApi.getAllDocumentsForSelect();
        setDocuments(data);

        if (data.length > 0) {
          setSelectedDoc(data[0]);
        }
      } catch (error) {
        console.error("Load documents failed:", error);
        toast.error("Cannot load uploaded documents");
      }
    };

    fetchDocuments();
  }, []);

  const handleGenerate = () => {
    if (!selectedDoc) {
      toast.error("Please select a document first");
      return;
    }

    setIsGenerating(true);
    setShowSummary(false);

    setTimeout(() => {
      setIsGenerating(false);
      setShowSummary(true);
      toast.success("Summary generated successfully!");
    }, 2000);
  };

  const handleDownload = () => {
    toast.success("Downloading summary...");
  };

  const handleCopy = () => {
    navigator.clipboard?.writeText(summaryContent.summary);
    toast.success("Copied to clipboard!");
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

        {showSummary && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-semibold rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <Download className="w-4 h-4" />
              Download
            </button>

            <button
              onClick={handleCopy}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-500/20 transition-all"
            >
              <Copy className="w-4 h-4" />
              Copy
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-5">
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-sm p-5">
            <h2 className="text-sm font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-4">
              Select Document
            </h2>

            <div className="space-y-2">
              {documents.length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  No uploaded documents found.
                </p>
              ) : (
                documents.map((doc) => (
                  <button
                    key={doc.id}
                    onClick={() => setSelectedDoc(doc)}
                    className={`w-full flex items-center gap-3 p-3 rounded-2xl border-2 text-left transition-all ${
                      selectedDoc?.id === doc.id
                        ? "border-blue-500 bg-blue-50/30 dark:bg-blue-500/10"
                        : "border-transparent hover:border-slate-200 dark:hover:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                    }`}
                  >
                    <div className="w-9 h-9 bg-slate-50 dark:bg-slate-800 rounded-xl flex items-center justify-center shrink-0">
                      <FileText className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                    </div>

                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                        {doc.name}
                      </p>
                    </div>

                    {selectedDoc?.id === doc.id && (
                      <div className="ml-auto w-4 h-4 bg-blue-600 rounded-full flex items-center justify-center shrink-0">
                        <div className="w-2 h-2 bg-white rounded-full" />
                      </div>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={isGenerating || !selectedDoc}
            className="w-full py-4 bg-blue-600 text-white font-extrabold rounded-2xl hover:bg-blue-700 shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-70"
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
                <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">
                  AI is reading and summarizing {selectedDoc?.name}
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
                          {summaryContent.title}
                        </span>
                      </div>

                      <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
                        {selectedDoc.name}
                      </h2>                    
                    </div>

                    <div className="px-3 py-1.5 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 text-xs font-bold rounded-xl border border-emerald-100 dark:border-emerald-500/30">
                      AI Generated
                    </div>
                  </div>

                  <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                    {summaryContent.summary}
                  </p>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-sm p-6">
                  <h3 className="text-lg font-extrabold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    Key Takeaways
                  </h3>

                  <div className="space-y-3">
                    {summaryContent.keyTakeaways.map((point, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl"
                      >
                        <div className="w-6 h-6 bg-emerald-100 dark:bg-emerald-500/20 rounded-full flex items-center justify-center shrink-0 text-emerald-600 dark:text-emerald-300 font-extrabold text-xs mt-0.5">
                          {i + 1}
                        </div>
                        <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                          {point}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-sm p-6">
                  <h3 className="text-lg font-extrabold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                    <Brain className="w-5 h-5 text-purple-500" />
                    Key Concepts & Definitions
                  </h3>

                  <div className="space-y-3">
                    {summaryContent.keyConcepts.map((concept, i) => (
                      <div
                        key={i}
                        className="flex gap-3 p-3 border border-slate-200 dark:border-slate-700 rounded-2xl"
                      >
                        <Tag className="w-4 h-4 text-purple-500 mt-0.5 shrink-0" />
                        <div>
                          <p className="font-extrabold text-slate-900 dark:text-white text-sm">
                            {concept.term}
                          </p>
                          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                            {concept.definition}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[2rem] p-6 text-white">
                  <div className="flex items-center gap-2 mb-4">
                    <Sparkles className="w-5 h-5" />
                    <h3 className="text-lg font-extrabold">AI Study Insights</h3>
                  </div>

                  <div className="space-y-3">
                    {summaryContent.insights.map((insight, i) => (
                      <div key={i} className="flex items-start gap-3 p-3 bg-white/10 rounded-2xl">
                        <ChevronRight className="w-4 h-4 mt-0.5 shrink-0 opacity-70" />
                        <p className="text-sm opacity-90">{insight}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}