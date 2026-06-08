import {
  Send, Bot, User, Plus, Search, MessageSquare, ThumbsUp, ThumbsDown,
  Copy, RotateCcw, Sparkles, BookOpen, Download, Bookmark, Tag,
  ChevronRight, X, Clock, ExternalLink, Trash2
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  citations?: string[];
}

interface Chat {
  id: string;
  title: string;
  preview: string;
  time: string;
  category: string;
  saved?: boolean;
}

const chatCategories = ["All", "Physics", "Math", "History", "Psychology", "Chemistry"];

const chatHistory: Chat[] = [
  { id: "1", title: "Thermodynamics Laws", preview: "Explain the second law...", time: "Today", category: "Physics", saved: true },
  { id: "2", title: "World War II Causes", preview: "What were the main causes...", time: "Today", category: "History" },
  { id: "3", title: "Calculus Integration", preview: "Help me understand integration...", time: "Yesterday", category: "Math", saved: true },
  { id: "4", title: "Neurotransmitters", preview: "Difference between serotonin...", time: "Yesterday", category: "Psychology" },
  { id: "5", title: "Organic Reactions", preview: "Explain SN1 vs SN2...", time: "Jun 3", category: "Chemistry" },
  { id: "6", title: "Quantum Mechanics Basics", preview: "Wave-particle duality...", time: "Jun 2", category: "Physics" },
];

const suggestedQuestions = [
  "Summarize the key points of this document",
  "Create 5 practice questions for me",
  "Explain the most difficult concept here",
  "What are the main themes in my notes?",
  "Compare and contrast these two ideas",
];

const mockResponses = [
  "Great question! Based on your uploaded documents, I can explain this concept thoroughly. The key principle here involves the relationship between energy states and entropy. According to the second law of thermodynamics, the total entropy of an isolated system can only increase over time.\n\n**Key Points:**\n1. Entropy always increases in spontaneous processes\n2. Heat flows from hot to cold bodies\n3. No process is 100% efficient\n\n*Source: Advanced Thermodynamics.pdf, Chapter 3*",
  "Based on your study materials, here's what you need to know:\n\nThe concept you're asking about connects several important ideas from your uploaded notes. I've cross-referenced your Physics and Math materials to give you a comprehensive answer.\n\n**Citation:** This information comes from your *Advanced Thermodynamics.pdf* (pages 45-52) and *Calculus III Problem Set.pdf*.",
];

export function AIChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content: "Hello Alex! I'm your AI Study Assistant. I've indexed all your uploaded documents. How can I help you today? You can ask me to explain concepts, summarize chapters, or create practice questions.",
      timestamp: "10:00 AM",
      citations: ["Advanced Thermodynamics.pdf", "Psychology Notes.pdf"],
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [activeCategory, setActiveCategory] = useState("All");
  const [chatSearch, setChatSearch] = useState("");
  const [activeChat, setActiveChat] = useState("1");
  const [savedOnly, setSavedOnly] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const responseIndex = useRef(0);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const filteredChats = chatHistory.filter((c) => {
    const matchSearch = c.title.toLowerCase().includes(chatSearch.toLowerCase());
    const matchCat = activeCategory === "All" || c.category === activeCategory;
    const matchSaved = !savedOnly || c.saved;
    return matchSearch && matchCat && matchSaved;
  });

  const handleSend = (e: React.FormEvent | string) => {
    if (typeof e !== "string") e.preventDefault();
    const content = typeof e === "string" ? e : inputValue;
    if (!content.trim()) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInputValue("");
    setIsTyping(true);

    setTimeout(() => {
      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: mockResponses[responseIndex.current % mockResponses.length],
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        citations: ["Advanced Thermodynamics.pdf, p.45-52"],
      };
      responseIndex.current++;
      setIsTyping(false);
      setMessages((prev) => [...prev, aiMsg]);
    }, 1800);
  };

  const exportChat = () => {
    const text = messages.map((m) => `[${m.role.toUpperCase()}]: ${m.content}`).join("\n\n");
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "chat-export.txt";
    a.click();
    toast.success("Conversation exported!");
  };

  return (
    <div className="flex h-[calc(100vh-10rem)] gap-0 bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
      {/* Sidebar */}
      <div className="w-72 shrink-0 border-r border-slate-100 flex flex-col bg-slate-50/50">
        <div className="p-4 border-b border-slate-100">
          <button
            onClick={() => { setMessages([{ id: "new", role: "assistant", content: "Starting a new conversation! What would you like to learn about today?", timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) }]); }}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors text-sm"
          >
            <Plus className="w-4 h-4" /> New Chat
          </button>
        </div>

        <div className="p-3 border-b border-slate-100">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={chatSearch}
              onChange={(e) => setChatSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-xs"
            />
          </div>
        </div>

        <div className="px-3 py-2 flex gap-1.5 overflow-x-auto border-b border-slate-100 no-scrollbar">
          {chatCategories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${activeCategory === cat ? "bg-blue-600 text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"}`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="px-3 py-2 flex items-center justify-between border-b border-slate-100">
          <span className="text-xs font-bold text-slate-500">{filteredChats.length} conversations</span>
          <button
            onClick={() => setSavedOnly(!savedOnly)}
            className={`flex items-center gap-1 text-xs font-bold transition-colors ${savedOnly ? "text-blue-600" : "text-slate-400 hover:text-slate-600"}`}
          >
            <Bookmark className="w-3 h-3" fill={savedOnly ? "currentColor" : "none"} /> Saved
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {filteredChats.map((chat) => (
            <button
              key={chat.id}
              onClick={() => setActiveChat(chat.id)}
              className={`w-full text-left p-3 rounded-xl transition-all ${activeChat === chat.id ? "bg-blue-50 border border-blue-100" : "hover:bg-white border border-transparent"}`}
            >
              <div className="flex items-start justify-between gap-1 mb-0.5">
                <span className={`text-sm font-bold truncate ${activeChat === chat.id ? "text-blue-700" : "text-slate-800"}`}>{chat.title}</span>
                {chat.saved && <Bookmark className="w-3 h-3 text-blue-500 shrink-0 mt-0.5" fill="currentColor" />}
              </div>
              <p className="text-xs text-slate-400 truncate mb-1">{chat.preview}</p>
              <div className="flex items-center gap-1.5">
                <span className="px-1.5 py-0.5 bg-slate-100 text-slate-500 text-xs rounded-md font-medium">{chat.category}</span>
                <span className="text-slate-300 text-xs">{chat.time}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Main Chat */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Chat Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-bold text-slate-900 text-sm">AI Study Assistant</p>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                <span className="text-xs text-slate-400">Ready to help · 5 docs indexed</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={exportChat} className="flex items-center gap-1.5 px-3 py-1.5 text-slate-500 hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold transition-colors">
              <Download className="w-3.5 h-3.5" /> Export
            </button>
            <button onClick={() => toast.success("Conversation saved!")} className="flex items-center gap-1.5 px-3 py-1.5 text-slate-500 hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold transition-colors">
              <Bookmark className="w-3.5 h-3.5" /> Save
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          <AnimatePresence initial={false}>
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === "assistant" ? "bg-gradient-to-br from-blue-500 to-indigo-600" : "bg-slate-200"}`}>
                  {msg.role === "assistant" ? <Bot className="w-4 h-4 text-white" /> : <User className="w-4 h-4 text-slate-600" />}
                </div>
                <div className={`max-w-[75%] ${msg.role === "user" ? "items-end" : "items-start"} flex flex-col gap-1`}>
                  <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-line ${
                    msg.role === "user"
                      ? "bg-blue-600 text-white rounded-tr-sm"
                      : "bg-slate-100 text-slate-800 rounded-tl-sm"
                  }`}>
                    {msg.content}
                  </div>
                  {msg.citations && msg.role === "assistant" && (
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {msg.citations.map((cite) => (
                        <span key={cite} className="flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-600 text-xs font-semibold rounded-lg border border-blue-100">
                          <BookOpen className="w-3 h-3" /> {cite}
                        </span>
                      ))}
                    </div>
                  )}
                  {msg.role === "assistant" && (
                    <div className="flex items-center gap-1 mt-0.5 opacity-0 hover:opacity-100 transition-opacity">
                      {[ThumbsUp, ThumbsDown, Copy, RotateCcw].map((Icon, i) => (
                        <button key={i} onClick={() => toast.success(i === 2 ? "Copied!" : "Feedback sent")} className="p-1 text-slate-300 hover:text-slate-500 transition-colors">
                          <Icon className="w-3.5 h-3.5" />
                        </button>
                      ))}
                    </div>
                  )}
                  <span className="text-xs text-slate-400">{msg.timestamp}</span>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {isTyping && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex gap-3 items-start">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div className="px-4 py-3 bg-slate-100 rounded-2xl rounded-tl-sm flex items-center gap-1">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
            </motion.div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Suggested Questions */}
        {messages.length === 1 && (
          <div className="px-6 pb-3">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Suggested questions</p>
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
              {suggestedQuestions.map((q) => (
                <button
                  key={q}
                  onClick={() => handleSend(q)}
                  className="shrink-0 px-3 py-2 bg-blue-50 text-blue-700 text-xs font-semibold rounded-xl hover:bg-blue-100 transition-colors border border-blue-100"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <div className="px-6 pb-5 shrink-0">
          <form onSubmit={handleSend} className="flex items-end gap-3 bg-slate-50 border border-slate-200 rounded-2xl p-2 focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-400 transition-all">
            <textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(e as any); } }}
              placeholder="Ask anything about your study materials..."
              rows={1}
              className="flex-1 bg-transparent text-sm text-slate-800 placeholder-slate-400 outline-none resize-none leading-relaxed max-h-32 min-h-[24px]"
            />
            <button
              type="submit"
              disabled={!inputValue.trim() || isTyping}
              className="p-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
          <p className="text-xs text-center text-slate-400 mt-2">AI may make mistakes. Always verify important information.</p>
        </div>
      </div>
    </div>
  );
}
