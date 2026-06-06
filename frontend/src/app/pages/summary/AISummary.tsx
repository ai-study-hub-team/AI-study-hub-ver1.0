import {
  FileSearch, Sparkles, Download, FileText, ChevronRight, CheckCircle2,
  Brain, BookOpen, Tag, Layers, Copy, Share2, RefreshCw, Star
} from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";

const documents = [
  { id: 1, name: "Advanced Thermodynamics.pdf", subject: "Physics", pages: 84 },
  { id: 2, name: "Modern European History.pdf", subject: "History", pages: 210 },
  { id: 3, name: "Business Ethics Final Project.docx", subject: "Management", pages: 24 },
  { id: 4, name: "Intro to Psychology Notes.pdf", subject: "Psychology", pages: 112 },
];

const templates = [
  { id: "executive", label: "Executive Summary", desc: "High-level overview with key points", icon: Star },
  { id: "detailed", label: "Detailed Analysis", desc: "Comprehensive chapter-by-chapter", icon: Layers },
  { id: "bullets", label: "Bullet Points", desc: "Quick scannable key concepts", icon: CheckCircle2 },
  { id: "concepts", label: "Key Concepts", desc: "Core terminology and definitions", icon: Brain },
  { id: "study", label: "Study Guide", desc: "Formatted for exam preparation", icon: BookOpen },
];

const summaryContent = {
  executive: {
    title: "Executive Summary",
    summary: "The document provides a comprehensive analysis of advanced thermodynamic principles. It covers the fundamental laws of thermodynamics, entropy generation, and practical applications in engineering systems. The study demonstrates that energy efficiency in thermal systems depends critically on minimizing entropy production and optimizing heat transfer processes.",
    keyTakeaways: [
      "The second law of thermodynamics governs the direction of spontaneous processes",
      "Entropy always increases in isolated systems — reversible processes maintain constant entropy",
      "The Carnot efficiency (1 - Tc/Th) sets the theoretical maximum for heat engines",
      "Exergy analysis helps identify and quantify irreversibilities in real processes",
      "Combined cycle power plants achieve 55-60% efficiency by cascading thermodynamic cycles",
    ],
    keyConcepts: [
      { term: "Entropy", definition: "Measure of disorder or randomness in a thermodynamic system" },
      { term: "Exergy", definition: "Maximum useful work obtainable from a system relative to its environment" },
      { term: "Carnot Efficiency", definition: "Theoretical maximum efficiency of a heat engine operating between two temperatures" },
      { term: "Enthalpy", definition: "Total thermodynamic energy of a system including internal energy and pressure-volume work" },
      { term: "Gibbs Free Energy", definition: "Thermodynamic potential measuring maximum reversible work at constant temperature and pressure" },
    ],
    insights: [
      "The material shows strong connections to real-world engineering applications",
      "Mathematical derivations build progressively — master Chapter 2 before Chapter 4",
      "Practical examples use SI units exclusively — be prepared for unit conversion in exams",
    ],
  },
};

export function AISummary() {
  const [selectedDoc, setSelectedDoc] = useState(documents[0]);
  const [selectedTemplate, setSelectedTemplate] = useState("executive");
  const [isGenerating, setIsGenerating] = useState(false);
  const [showSummary, setShowSummary] = useState(true);

  const handleGenerate = () => {
    setIsGenerating(true);
    setShowSummary(false);
    setTimeout(() => {
      setIsGenerating(false);
      setShowSummary(true);
      toast.success("Summary generated successfully!");
    }, 2000);
  };

  const handleExport = (format: "pdf" | "docx") => {
    toast.success(`Exporting as ${format.toUpperCase()}...`);
  };

  const content = summaryContent.executive;

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900">AI Summary</h1>
          <p className="text-slate-500">Generate intelligent summaries from your study materials</p>
        </div>
        {showSummary && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleExport("pdf")}
              className="flex items-center gap-2 px-4 py-2.5 border border-slate-200 text-slate-600 font-semibold rounded-xl hover:bg-slate-50 transition-colors"
            >
              <Download className="w-4 h-4" /> PDF
            </button>
            <button
              onClick={() => handleExport("docx")}
              className="flex items-center gap-2 px-4 py-2.5 border border-slate-200 text-slate-600 font-semibold rounded-xl hover:bg-slate-50 transition-colors"
            >
              <Download className="w-4 h-4" /> DOCX
            </button>
            <button
              onClick={() => { navigator.clipboard?.writeText(content.summary); toast.success("Copied to clipboard!"); }}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-500/20 transition-all"
            >
              <Copy className="w-4 h-4" /> Copy
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Panel */}
        <div className="space-y-5">
          {/* Document Selector */}
          <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-5">
            <h2 className="text-sm font-extrabold text-slate-700 uppercase tracking-wider mb-4">Select Document</h2>
            <div className="space-y-2">
              {documents.map((doc) => (
                <button
                  key={doc.id}
                  onClick={() => setSelectedDoc(doc)}
                  className={`w-full flex items-center gap-3 p-3 rounded-2xl border-2 text-left transition-all ${
                    selectedDoc.id === doc.id ? "border-blue-500 bg-blue-50/30" : "border-transparent hover:border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <div className="w-9 h-9 bg-slate-100 rounded-xl flex items-center justify-center shrink-0">
                    <FileText className="w-4 h-4 text-slate-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900 truncate">{doc.name}</p>
                    <p className="text-xs text-slate-400">{doc.subject} · {doc.pages} pages</p>
                  </div>
                  {selectedDoc.id === doc.id && (
                    <div className="ml-auto w-4 h-4 bg-blue-600 rounded-full flex items-center justify-center shrink-0">
                      <div className="w-2 h-2 bg-white rounded-full" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Templates */}
          <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-5">
            <h2 className="text-sm font-extrabold text-slate-700 uppercase tracking-wider mb-4">Summary Template</h2>
            <div className="space-y-2">
              {templates.map((tmpl) => (
                <button
                  key={tmpl.id}
                  onClick={() => setSelectedTemplate(tmpl.id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-2xl border-2 text-left transition-all ${
                    selectedTemplate === tmpl.id ? "border-blue-500 bg-blue-50/30" : "border-transparent hover:border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${selectedTemplate === tmpl.id ? "bg-blue-100" : "bg-slate-100"}`}>
                    <tmpl.icon className={`w-4 h-4 ${selectedTemplate === tmpl.id ? "text-blue-600" : "text-slate-500"}`} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">{tmpl.label}</p>
                    <p className="text-xs text-slate-400">{tmpl.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="w-full py-4 bg-blue-600 text-white font-extrabold rounded-2xl hover:bg-blue-700 shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-70"
          >
            {isGenerating ? (
              <><RefreshCw className="w-5 h-5 animate-spin" /> Generating...</>
            ) : (
              <><Sparkles className="w-5 h-5" /> Generate Summary</>
            )}
          </button>
        </div>

        {/* Right Panel */}
        <div className="lg:col-span-2">
          <AnimatePresence mode="wait">
            {isGenerating ? (
              <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-8 flex flex-col items-center justify-center min-h-[400px]">
                <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-5">
                  <Sparkles className="w-8 h-8 text-blue-600 animate-pulse" />
                </div>
                <h3 className="text-xl font-extrabold text-slate-900 mb-2">Analyzing Document...</h3>
                <p className="text-slate-500 text-sm mb-6">AI is reading and summarizing {selectedDoc.name}</p>
                <div className="w-64 bg-slate-100 rounded-full h-2">
                  <motion.div className="bg-blue-600 h-2 rounded-full" initial={{ width: "5%" }} animate={{ width: "90%" }} transition={{ duration: 1.8, ease: "easeOut" }} />
                </div>
              </motion.div>
            ) : showSummary ? (
              <motion.div key="summary" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
                {/* Summary Header */}
                <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Sparkles className="w-4 h-4 text-blue-600" />
                        <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">{content.title}</span>
                      </div>
                      <h2 className="text-xl font-extrabold text-slate-900">{selectedDoc.name}</h2>
                      <p className="text-sm text-slate-400">{selectedDoc.subject} · {selectedDoc.pages} pages analyzed</p>
                    </div>
                    <div className="px-3 py-1.5 bg-emerald-50 text-emerald-600 text-xs font-bold rounded-xl border border-emerald-100">AI Generated</div>
                  </div>
                  <p className="text-slate-700 leading-relaxed">{content.summary}</p>
                </div>

                {/* Key Takeaways */}
                <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-6">
                  <h3 className="text-lg font-extrabold text-slate-900 mb-4 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" /> Key Takeaways
                  </h3>
                  <div className="space-y-3">
                    {content.keyTakeaways.map((point, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.08 }}
                        className="flex items-start gap-3 p-3 bg-emerald-50/50 rounded-2xl"
                      >
                        <div className="w-6 h-6 bg-emerald-100 rounded-full flex items-center justify-center shrink-0 text-emerald-600 font-extrabold text-xs mt-0.5">
                          {i + 1}
                        </div>
                        <p className="text-sm text-slate-700 leading-relaxed">{point}</p>
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Key Concepts */}
                <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-6">
                  <h3 className="text-lg font-extrabold text-slate-900 mb-4 flex items-center gap-2">
                    <Brain className="w-5 h-5 text-purple-500" /> Key Concepts & Definitions
                  </h3>
                  <div className="space-y-3">
                    {content.keyConcepts.map((concept, i) => (
                      <div key={i} className="flex gap-3 p-3 border border-slate-100 rounded-2xl hover:border-slate-200 hover:bg-slate-50 transition-all">
                        <Tag className="w-4 h-4 text-purple-500 mt-0.5 shrink-0" />
                        <div>
                          <p className="font-extrabold text-slate-900 text-sm">{concept.term}</p>
                          <p className="text-sm text-slate-500 mt-0.5">{concept.definition}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* AI Insights */}
                <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[2rem] p-6 text-white">
                  <div className="flex items-center gap-2 mb-4">
                    <Sparkles className="w-5 h-5" />
                    <h3 className="text-lg font-extrabold">AI Study Insights</h3>
                  </div>
                  <div className="space-y-3">
                    {content.insights.map((insight, i) => (
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
