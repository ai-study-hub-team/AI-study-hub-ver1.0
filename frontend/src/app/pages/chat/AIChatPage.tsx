import { 
  ArrowUp, 
  BookOpen, 
  FileImage, 
  Globe, 
  GraduationCap, 
  History, 
  MessageSquare, 
  MicOff, 
  Search,
  Sparkles,
  X,
  Plus,
  LayoutGrid,
  List,
  ChevronDown
} from "lucide-react";
import { useState } from "react";
// Import hook điều hướng từ react-router
import { useNavigate } from "react-router";

const suggestions = [
  { 
    title: "Walk through calculus problem", 
    icon: <GraduationCap className="w-5 h-5 text-violet-500" />
  },
  { 
    title: "Practice Spanish conversation", 
    icon: <MessageSquare className="w-5 h-5 text-blue-500" />
  },
  { 
    title: "Summarize this chapter", 
    icon: <BookOpen className="w-5 h-5 text-yellow-500" />
  },
  { 
    title: "Explain photosynthesis in simple terms", 
    icon: <BookOpen className="w-5 h-5 text-emerald-500" />
  },
];

// Danh sách tài liệu mẫu hiển thị trong modal
const mockMaterials = [
  { title: "Impacts of Climate Change", type: "Climate" },
  { title: "Climate Models and Projections", type: "Models" },
  { title: "Climate Proxies and Paleoclimatology", type: "Proxies" },
  { title: "Energy Balance and Greenhouse Effect", type: "Energy" },
];

export function AIChatPage() {
  const [message, setMessage] = useState("");
  const [isOpenHistory, setIsOpenHistory] = useState(false);
  const [isOpenMaterials, setIsOpenMaterials] = useState(false);
  
  // Khởi tạo hàm điều hướng navigate
  const navigate = useNavigate();

  const handleSend = () => {
    if (!message.trim()) return;
    console.log("User message:", message);
    setMessage("");
  };

  return (
    <div className="h-screen overflow-hidden bg-slate-50/50 dark:bg-slate-950 text-slate-900 dark:text-white flex flex-col font-sans relative">
      
      {/* 1. Top Bar */}
      <div className="h-14 flex items-center justify-between px-6 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 shrink-0">
        <div className="flex items-center gap-3 text-sm z-40">
          <button className="font-semibold text-blue-600 hover:underline">
            My First Study Set
          </button>
          <span className="text-slate-300 dark:text-slate-700">›</span>
          
          <button className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 hover:text-blue-600 transition font-medium">
            <Sparkles className="w-4 h-4 text-sky-500" /> New Chat
          </button>

          {/* Chat History Popover */}
          <div className="relative">
            <button 
              onClick={() => setIsOpenHistory(!isOpenHistory)}
              className={`flex items-center gap-1.5 transition font-medium px-2 py-1 rounded-md ${
                isOpenHistory 
                  ? "text-blue-600 bg-slate-100 dark:bg-slate-800" 
                  : "text-slate-600 dark:text-slate-300 hover:text-blue-600"
              }`}
            >
              <History className="w-4 h-4" /> History
            </button>

            {isOpenHistory && (
              <div className="absolute left-0 mt-2 w-72 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-xl p-4 flex flex-col gap-4 animate-in fade-in slide-in-from-top-2 duration-150 z-50">
                <h3 className="font-bold text-slate-800 dark:text-slate-200 text-[15px]">
                  Chat History
                </h3>
                <div className="relative w-full">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder="Search" 
                    className="w-full pl-9 pr-3 py-1.5 text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg outline-none placeholder:text-slate-400 focus:border-blue-500 transition"
                  />
                </div>
                <div className="flex flex-col items-center justify-center py-6 text-center">
                  <span className="text-sm font-medium text-slate-400 dark:text-slate-500">
                    No sessions found
                  </span>
                </div>
                <button 
                  onClick={() => setIsOpenHistory(false)}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm py-2 px-4 rounded-xl flex items-center justify-center gap-1.5 transition shadow-sm"
                >
                  <span className="text-lg leading-none">+</span> New Chat
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. Main Content Area */}
      <div className="flex-1 flex flex-col items-center justify-center max-w-4xl w-full mx-auto px-6 pb-6 gap-5">
        
        {/* Bot Avatar & Header */}
        <div className="flex flex-col items-center text-center">
          <h1 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-100 mb-1">
            Hello, User
          </h1>
        </div>

        {/* Grid Card Tips */}
        <div className="grid grid-cols-2 gap-3 w-full max-w-3xl">
          {suggestions.map((item, index) => (
            <button
              key={index}
              className="h-[68px] rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/50 border border-slate-200 dark:border-slate-800 overflow-hidden transition-all text-left flex justify-between items-stretch group shadow-sm"
            >
              <div className="flex items-center px-5 flex-1 min-w-0">
                <p className="font-semibold text-slate-700 dark:text-slate-200 text-sm md:text-[14px] leading-snug line-clamp-2">
                  {item.title}
                </p>
              </div>
              <div className="w-14 flex items-center justify-center bg-slate-50/60 dark:bg-slate-800 border-l border-slate-100 dark:border-slate-800 shrink-0 group-hover:bg-slate-100/80 dark:group-hover:bg-slate-700/50 transition">
                {item.icon}
              </div>
            </button>
          ))}
        </div>

        {/* View More Buttons */}
        <div className="flex items-center gap-3 text-xs text-slate-400 dark:text-slate-500 font-medium">
          <button className="hover:text-blue-600 transition">View More</button>
          <span>•</span>
          <button className="hover:text-blue-600 transition">View Previous Chat Sessions</button>
        </div>

        {/* Skillsets & Scenarios */}
        <div className="flex items-center gap-2.5">
          <button className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold hover:bg-slate-50 transition text-slate-600 dark:text-slate-300 shadow-sm">
            Personalities & Skillsets
          </button>
          <button className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold hover:bg-slate-50 transition text-slate-600 dark:text-slate-300 shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Scenarios
          </button>
        </div>

        {/* 3. Khung Chat */}
        <div className="w-full max-w-3xl mt-1">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm p-4 flex flex-col justify-between min-h-[120px]">
            
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Ask your AI tutor anything..."
              rows={2}
              className="w-full resize-none outline-none bg-transparent text-sm placeholder:text-slate-400 dark:text-white px-1 py-1"
            />
            
            <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-50 dark:border-slate-800/60 w-full">
              <div className="flex items-center gap-3.5 text-slate-400 dark:text-slate-500">
                <button className="hover:text-slate-600 dark:hover:text-slate-300 transition flex items-center justify-center">
                  <FileImage className="w-4 h-4" />
                </button>
                <button className="hover:text-slate-600 dark:hover:text-slate-300 transition flex items-center justify-center">
                  <Globe className="w-4 h-4" />
                </button>
                <button className="hover:text-slate-600 dark:hover:text-slate-300 transition flex items-center justify-center">
                  <GraduationCap className="w-4 h-4" />
                </button>
                
                <button 
                  onClick={() => setIsOpenMaterials(true)}
                  className="px-2.5 py-1 rounded-md border border-slate-200 text-slate-500 dark:text-slate-400 text-[11px] font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 bg-slate-50 dark:bg-slate-900 transition flex items-center gap-1.5 select-none h-6"
                >
                  <span>📝</span> 0 materials
                </button>
              </div>
              
              <div className="flex items-center gap-3.5">
                <button className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition flex items-center justify-center">
                  <MicOff className="w-4 h-4" />
                </button>
                <button
                  onClick={handleSend}
                  className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 transition shadow-sm active:scale-95 shrink-0"
                >
                  <ArrowUp className="w-4 h-4 stroke-[2.5]" />
                </button>
              </div>
            </div>

          </div>
        </div>

      </div>

      {/* ================= MODAL HIỂN THỊ SELECT MATERIALS ================= */}
      {isOpenMaterials && (
        <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px] z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-4xl shadow-2xl flex flex-col overflow-hidden max-h-[85vh] animate-in zoom-in-95 duration-200 border border-slate-100 dark:border-slate-800">
            
            {/* Header Modal */}
            <div className="flex items-center justify-between px-6 pt-5 pb-3">
              <div>
                <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Select Materials</h2>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Select materials to use for the chat.</p>
              </div>
              
              <div className="flex items-center gap-3">
                <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition">
                  <span className="w-4 h-4 bg-amber-100 text-amber-700 rounded flex items-center justify-center text-[10px]">🗂️</span>
                  My First Study Set
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>
                <button 
                  onClick={() => setIsOpenMaterials(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Toolbar */}
            <div className="px-6 py-2 flex items-center justify-between gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Search materials..." 
                  className="w-full pl-9 pr-4 py-1.5 text-sm bg-transparent border border-slate-200 dark:border-slate-800 rounded-lg outline-none placeholder:text-slate-400 focus:border-blue-500 transition"
                />
              </div>
              
              <div className="flex items-center gap-2">
                <div className="flex items-center border border-slate-200 dark:border-slate-800 rounded-lg p-0.5 bg-slate-50/50 dark:bg-slate-800">
                  <button className="p-1 rounded bg-white dark:bg-slate-700 shadow-sm text-slate-700 dark:text-white">
                    <LayoutGrid className="w-4 h-4" />
                  </button>
                  <button className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                    <List className="w-4 h-4" />
                  </button>
                </div>
                <button className="px-3 py-1.5 text-xs font-semibold text-blue-600 border border-blue-200 hover:bg-blue-50/50 rounded-xl transition">
                  Select All
                </button>
              </div>
            </div>

            {/* Materials Grid */}
            <div className="flex-1 overflow-y-auto p-6 grid grid-cols-4 gap-4">
              
              {/* CẬP NHẬT: Card Upload New Material với viền nét đứt màu xanh dương và hiệu ứng hover đồng bộ */}
              <button 
                onClick={() => navigate("/app/upload")} 
                className="border-2 border-dashed border-blue-400 rounded-xl flex flex-col items-center justify-center p-4 gap-3 bg-white hover:bg-blue-50/50 dark:bg-slate-900 dark:hover:bg-blue-950/20 transition group text-center min-h-[160px]"
              >
                <div className="w-12 h-12 rounded-full border border-blue-400 flex items-center justify-center text-blue-500 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/30 transition">
                  <Plus className="w-6 h-6 stroke-[2.5]" />
                </div>
                <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                  Upload New Material
                </span>
              </button>

              {/* Loop mock materials */}
              {mockMaterials.map((mat, i) => (
                <div 
                  key={i} 
                  className="border border-slate-200 dark:border-slate-800 rounded-xl flex flex-col overflow-hidden bg-white dark:bg-slate-900 shadow-sm hover:shadow transition group relative cursor-pointer"
                >
                  <div className="flex-1 p-4 bg-slate-50/40 dark:bg-slate-800/40 flex flex-col gap-1.5 border-b border-slate-100 dark:border-slate-800">
                    <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300 tracking-tight line-clamp-2 uppercase">
                      {mat.title}
                    </div>
                    <p className="text-[9px] text-slate-400 dark:text-slate-500 leading-normal line-clamp-4 select-none">
                      This section delves into the multifaceted consequences of human-induced climate change, focusing on its primary manifestations and differential impacts across regions. We will explore how rising global temperatures...
                    </p>
                  </div>
                  <div className="h-10 px-3 flex items-center gap-2 bg-white dark:bg-slate-900">
                    <span className="text-blue-500 text-sm">📝</span>
                    <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300 truncate flex-1">
                      {mat.title}
                    </span>
                  </div>
                </div>
              ))}

            </div>

            {/* Footer Modal */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex justify-end bg-white dark:bg-slate-900">
              <button 
                onClick={() => setIsOpenMaterials(false)}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-2 px-6 rounded-xl transition shadow-sm active:scale-95"
              >
                Confirm Selection
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}