import { 
  Library, 
  Search, 
  Grid, 
  List, 
  FolderPlus, 
  Star, 
  Clock, 
  MoreHorizontal,
  FileText,
  ChevronRight,
  Filter,
  Bookmark
} from "lucide-react";
import { useState } from "react";
import { motion } from "motion/react";

export function MyLibrary() {
  const [view, setView] = useState<'grid' | 'list'>('grid');

  const collections = [
    { name: "Final Exams Prep", count: 12, color: "blue" },
    { name: "Biology Research", count: 5, color: "emerald" },
    { name: "Eco 101 Materials", count: 8, color: "purple" },
    { name: "Drafts & Notes", count: 3, color: "amber" },
  ];

  const documents = [
    { name: "Cellular Respiration Summary.pdf", folder: "Biology Research", date: "2 days ago", fav: true },
    { name: "Keynesian Theory Notes.docx", folder: "Eco 101 Materials", date: "Yesterday", fav: false },
    { name: "Physics Lab Report Template.pdf", folder: "Drafts & Notes", date: "5 hours ago", fav: true },
    { name: "World History Timeline.pdf", folder: "Final Exams Prep", date: "1 week ago", fav: false },
    { name: "Anatomy Study Guide.pdf", folder: "Biology Research", date: "3 days ago", fav: true },
    { name: "Macroeconomics Quiz.pdf", folder: "Eco 101 Materials", date: "4 days ago", fav: false },
  ];

  return (
    <div className="space-y-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900">My Library</h1>
          <p className="text-slate-500">Your personalized knowledge base</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-slate-100 p-1 rounded-xl">
            <button 
              onClick={() => setView('grid')}
              className={`p-2 rounded-lg transition-all ${view === 'grid' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400'}`}
            >
              <Grid className="w-5 h-5" />
            </button>
            <button 
              onClick={() => setView('list')}
              className={`p-2 rounded-lg transition-all ${view === 'list' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400'}`}
            >
              <List className="w-5 h-5" />
            </button>
          </div>
          <button className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-500/20 transition-all">
            <FolderPlus className="w-5 h-5" /> New Collection
          </button>
        </div>
      </div>

      {/* Collections Section */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-slate-900">Collections</h2>
          <button className="text-sm font-bold text-blue-600 hover:underline">View All</button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {collections.map((col, idx) => (
            <motion.div 
              key={idx}
              whileHover={{ y: -5 }}
              className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm group cursor-pointer"
            >
              <div className={`w-14 h-14 rounded-2xl bg-${col.color}-50 text-${col.color}-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                <Library className="w-7 h-7" />
              </div>
              <h3 className="font-bold text-slate-900 mb-1">{col.name}</h3>
              <p className="text-sm text-slate-500">{col.count} items</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Documents Section */}
      <section>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-6">
            <button className="text-lg font-bold text-slate-900 border-b-2 border-blue-600 pb-1">All Files</button>
            <button className="text-lg font-bold text-slate-400 hover:text-slate-600 pb-1 flex items-center gap-2">
              <Star className="w-5 h-5" /> Favorites
            </button>
            <button className="text-lg font-bold text-slate-400 hover:text-slate-600 pb-1 flex items-center gap-2">
              <Clock className="w-5 h-5" /> Recent
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Filter library..."
              className="w-full md:w-64 pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
        </div>

        {view === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {documents.map((doc, idx) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm group"
              >
                <div className="flex items-start justify-between mb-6">
                  <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center group-hover:bg-blue-50 transition-colors">
                    <FileText className="w-6 h-6 text-slate-400 group-hover:text-blue-500 transition-colors" />
                  </div>
                  <div className="flex items-center gap-2">
                    <button className={`p-1.5 rounded-lg transition-colors ${doc.fav ? 'text-amber-400' : 'text-slate-300 hover:text-slate-500'}`}>
                      <Star className={`w-5 h-5 ${doc.fav ? 'fill-amber-400' : ''}`} />
                    </button>
                    <button className="p-1.5 text-slate-300 hover:text-slate-500 rounded-lg">
                      <MoreHorizontal className="w-5 h-5" />
                    </button>
                  </div>
                </div>
                <h4 className="font-bold text-slate-900 truncate mb-2">{doc.name}</h4>
                <div className="flex items-center justify-between mt-auto pt-4 border-t border-slate-50">
                  <div className="flex items-center gap-2">
                    <Bookmark className="w-3 h-3 text-slate-400" />
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{doc.folder}</span>
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{doc.date}</span>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
            {documents.map((doc, idx) => (
              <div key={idx} className={`p-4 flex items-center justify-between hover:bg-slate-50 transition-colors ${idx !== documents.length - 1 ? 'border-b border-slate-50' : ''}`}>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-slate-50 rounded-lg flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5 text-slate-400" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">{doc.name}</h4>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{doc.folder}</p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest hidden md:block">{doc.date}</span>
                  <div className="flex items-center gap-2">
                    <button className={`p-2 rounded-lg ${doc.fav ? 'text-amber-400' : 'text-slate-300'}`}>
                      <Star className={`w-4 h-4 ${doc.fav ? 'fill-amber-400' : ''}`} />
                    </button>
                    <button className="p-2 text-slate-300 hover:text-slate-500">
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
