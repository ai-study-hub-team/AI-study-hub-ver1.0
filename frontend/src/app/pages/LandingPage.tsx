import { NavLink } from "react-router";
import {
  ArrowRight,
  BookOpen,
  BrainCircuit,
  CheckCircle2,
  FileText,
  Github,
  MessageSquare,
  Sparkles,
  Star,
  Zap,
  Twitter,
  Linkedin,
  Facebook,
  Moon,
  Sun
} from "lucide-react";
import { motion } from "motion/react";
import { useTheme } from "../../layouts/ThemeProvider";

export function LandingPage() {
  const { theme, toggleTheme } = useTheme();
  const features = [
    {
      icon: BrainCircuit,
      title: "AI Document Summarization",
      description: "Upload any document and get a comprehensive summary in seconds. Save hours of reading time.",
      color: "blue"
    },
    {
      icon: MessageSquare,
      title: "Interactive AI Chatbot",
      description: "Chat with your study materials. Ask questions, clarify concepts, and get instant explanations.",
      color: "purple"
    },
    {
      icon: Zap,
      title: "Instant Quiz Generation",
      description: "Convert your notes into practice quizzes automatically to test your knowledge and retention.",
      color: "amber"
    },
    {
      icon: FileText,
      title: "Smart Document Management",
      description: "Organize your study materials in a centralized cloud library with powerful search and filters.",
      color: "emerald"
    }
  ];

  const testimonials = [
    {
      name: "Sarah Jenkins",
      role: "Medical Student",
      avatar: "SJ",
      content: "AI Study Hub has transformed how I tackle massive textbooks. The summaries are spot on and save me so much time."
    },
    {
      name: "David Chen",
      role: "Computer Science Major",
      avatar: "DC",
      content: "The quiz generator is a game changer for exam prep. It picks out the key concepts perfectly."
    },
    {
      name: "Emma Wilson",
      role: "Law Student",
      avatar: "EW",
      content: "Chatting with my case studies helps me understand complex legal principles much faster than just reading."
    }
  ];

  return (
    <div className="bg-white dark:bg-slate-950">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-700">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold">A</div>
            <span className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">AI Study Hub</span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium transition-colors">Features</a>
            <a href="#how-it-works" className="text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium transition-colors">How it Works</a>
            <a href="#pricing" className="text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium transition-colors">Pricing</a>
            <a href="#faq" className="text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium transition-colors">FAQ</a>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
            >
              {theme === "light" ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            </button>
            <NavLink to="/login" className="px-5 py-2.5 text-slate-900 dark:text-white font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
              Log in
            </NavLink>
            <NavLink to="/register" className="px-6 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-500/20 transition-all">
              Sign up
            </NavLink>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-40 pb-24 overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-full text-sm font-semibold mb-6">
              <Sparkles className="w-4 h-4" />
              <span>AI-Powered Learning for Students</span>
            </div>
            <h1 className="text-5xl md:text-6xl font-extrabold text-slate-900 dark:text-white leading-[1.1] mb-6">
              Study Smarter, <br />
              <span className="text-blue-600">Not Harder</span> with AI
            </h1>
            <p className="text-xl text-slate-700 dark:text-slate-300 mb-8 max-w-lg leading-relaxed">
              The all-in-one platform to summarize documents, generate quizzes, and chat with your study materials. Maximize your academic performance.
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <NavLink to="/register" className="w-full sm:w-auto px-8 py-4 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 shadow-xl shadow-blue-500/25 flex items-center justify-center gap-2 transition-all">
                Get Started for Free <ArrowRight className="w-5 h-5" />
              </NavLink>
              <button className="w-full sm:w-auto px-8 py-4 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold rounded-2xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center gap-2 transition-all">
                Watch Demo
              </button>
            </div>
            <div className="mt-10 flex items-center gap-6">
              <div className="flex -space-x-3">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="w-10 h-10 rounded-full border-2 border-white dark:border-slate-950 bg-slate-200 dark:bg-slate-700" />
                ))}
              </div>
              <div>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map(i => <Star key={i} className="w-4 h-4 text-amber-400 fill-amber-400" />)}
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">Trusted by 10,000+ students worldwide</p>
              </div>
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative"
          >
            <div className="absolute -top-20 -right-20 w-80 h-80 bg-blue-400/10 rounded-full blur-3xl"></div>
            <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-purple-400/10 rounded-full blur-3xl"></div>
            <div className="relative bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 p-4 overflow-hidden">
               <img 
                src="https://images.unsplash.com/photo-1738003667850-a2fb736e31b3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb2Rlcm4lMjBhaSUyMGVkdWNhdGlvbiUyMHN0dWR5JTIwbGlicmFyeSUyMHN0dWRlbnQlMjBsZWFybmluZyUyMHBsYXRmb3JtfGVufDF8fHx8MTc4MDU1MTg3M3ww&ixlib=rb-4.1.0&q=80&w=1080"
                alt="AI Study Platform Interface"
                className="rounded-2xl w-full object-cover aspect-[4/3]"
               />
               {/* Floating elements */}
               <div className="absolute top-10 -left-10 bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 animate-bounce duration-[3000ms]">
                 <div className="flex items-center gap-3">
                   <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center text-green-600">
                     <CheckCircle2 className="w-6 h-6" />
                   </div>
                   <div>
                     <p className="text-sm font-bold text-slate-900 dark:text-white">Quiz Generated!</p>
                     <p className="text-xs text-slate-500 dark:text-slate-400">20 practice questions ready</p>
                   </div>
                 </div>
               </div>
               <div className="absolute bottom-10 -right-10 bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 animate-pulse">
                 <div className="flex items-center gap-3">
                   <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600">
                     <MessageSquare className="w-6 h-6" />
                   </div>
                   <div>
                     <p className="text-sm font-bold text-slate-900 dark:text-white">AI Chatting...</p>
                     <p className="text-xs text-slate-500 dark:text-slate-400">Explaining Chapter 4</p>
                   </div>
                 </div>
               </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-slate-50 dark:bg-slate-900">
        <div className="max-w-7xl mx-auto px-6 text-center mb-16">
          <h2 className="text-blue-600 font-bold tracking-wider uppercase text-sm mb-4">Core Features</h2>
          <h3 className="text-4xl font-extrabold text-slate-900 dark:text-white mb-6">Everything You Need to Excel</h3>
          <p className="text-xl text-slate-700 dark:text-slate-300 max-w-2xl mx-auto">
            Powerful AI tools designed specifically for students and academic researchers.
          </p>
        </div>
        <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, idx) => (
            <motion.div 
              key={idx}
              whileHover={{ y: -5 }}
              className="bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md transition-all"
            >
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 bg-${feature.color}-50 dark:bg-slate-800 text-${feature.color}-600`}>
                <feature.icon className="w-8 h-8" />
              </div>
              <h4 className="text-xl font-bold text-slate-900 dark:text-white mb-4">{feature.title}</h4>
              <p className="text-slate-700 dark:text-slate-300 leading-relaxed">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* How it Works */}
      <section id="how-it-works" className="py-24 bg-white dark:bg-slate-950">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-blue-600 font-bold tracking-wider uppercase text-sm mb-4">How it Works</h2>
              <h3 className="text-4xl font-extrabold text-slate-900 dark:text-white mb-12">Learn Faster in 3 Simple Steps</h3>
              
              <div className="space-y-8">
                {[
                  { step: "01", title: "Upload Documents", text: "Drag and drop your PDFs, Word docs, or images of your notes." },
                  { step: "02", title: "AI Analysis", text: "Our AI instantly analyzes the content, identifies key concepts, and summarizes." },
                  { step: "03", title: "Study & Interact", text: "Ask questions, take practice quizzes, and master the material." }
                ].map((item, idx) => (
                  <div key={idx} className="flex gap-6">
                    <div className="text-4xl font-black text-slate-200 dark:text-slate-700 leading-none">{item.step}</div>
                    <div>
                      <h4 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{item.title}</h4>
                      <p className="text-slate-700 dark:text-slate-300">{item.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-blue-600 rounded-[3rem] p-12 text-white relative overflow-hidden">
               <div className="relative z-10">
                 <BookOpen className="w-16 h-16 mb-8 text-blue-200" />
                 <h4 className="text-3xl font-bold mb-6">Revolutionizing Education with Artificial Intelligence</h4>
                 <p className="text-blue-100 text-lg mb-8 leading-relaxed">
                   Join thousands of students who have already increased their study efficiency by over 40% using our AI tools.
                 </p>
                 <NavLink to="/register" className="inline-flex items-center gap-2 px-8 py-4 bg-white text-blue-600 font-bold rounded-2xl hover:bg-blue-50 transition-colors">
                   Get Started <ArrowRight className="w-5 h-5" />
                 </NavLink>
               </div>
               <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-white/10 rounded-full blur-3xl"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 bg-slate-50 dark:bg-slate-900">
        <div className="max-w-7xl mx-auto px-6 text-center mb-16">
          <h2 className="text-blue-600 font-bold tracking-wider uppercase text-sm mb-4">Pricing Plans</h2>
          <h3 className="text-4xl font-extrabold text-slate-900 dark:text-white mb-6">Choose Your Study Path</h3>
          <p className="text-xl text-slate-700 dark:text-slate-300 max-w-2xl mx-auto">Free for casual learners, Pro for serious students.</p>
        </div>
        <div className="max-w-5xl mx-auto px-6 grid md:grid-cols-2 gap-8">
          {/* Basic Plan */}
          <div className="bg-white dark:bg-slate-900 p-10 rounded-[2.5rem] shadow-sm border border-slate-200 dark:border-slate-700">
            <h4 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Basic</h4>
            <p className="text-slate-500 dark:text-slate-400 mb-6">Perfect for trying out AI Study Hub</p>
            <div className="text-4xl font-black text-slate-900 dark:text-white mb-8">$0 <span className="text-lg font-medium text-slate-500 dark:text-slate-400">/mo</span></div>
            <ul className="space-y-4 mb-10 text-slate-700 dark:text-slate-300">
              <li className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-emerald-500" /> 5 Document uploads / month</li>
              <li className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-emerald-500" /> 10 AI Chat queries / day</li>
              <li className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-emerald-500" /> Basic summarization</li>
              <li className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-emerald-500" /> Email support</li>
            </ul>
            <NavLink to="/register" className="block w-full text-center py-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
              Get Started
            </NavLink>
          </div>
          {/* Pro Plan */}
          <div className="bg-white dark:bg-slate-900 p-10 rounded-[2.5rem] shadow-xl border-2 border-blue-600 relative overflow-hidden">
            <div className="absolute top-8 right-8 px-3 py-1 bg-blue-600 text-white text-xs font-bold rounded-full uppercase tracking-widest">Most Popular</div>
            <h4 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Pro</h4>
            <p className="text-slate-500 dark:text-slate-400 mb-6">For students who want to excel</p>
            <div className="text-4xl font-black text-slate-900 dark:text-white mb-8">$12 <span className="text-lg font-medium text-slate-500 dark:text-slate-400">/mo</span></div>
            <ul className="space-y-4 mb-10 text-slate-700 dark:text-slate-300">
              <li className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-emerald-500" /> Unlimited uploads</li>
              <li className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-emerald-500" /> Unlimited AI Chat</li>
              <li className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-emerald-500" /> Advanced Quiz Generation</li>
              <li className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-emerald-500" /> Export Summaries & Quizzes</li>
              <li className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-emerald-500" /> Priority 24/7 Support</li>
            </ul>
            <NavLink to="/register" className="block w-full text-center py-4 rounded-2xl bg-blue-600 font-bold text-white hover:bg-blue-700 shadow-lg shadow-blue-500/30 transition-all">
              Start 14-Day Free Trial
            </NavLink>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 dark:bg-slate-950 text-slate-400 dark:text-slate-400 py-20">
        <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-4 gap-12 mb-16">
          <div className="col-span-1 md:col-span-1">
            <div className="flex items-center gap-2 text-white mb-6">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">A</div>
              <span className="text-xl font-bold tracking-tight">AI Study Hub</span>
            </div>
            <p className="mb-6 leading-relaxed">
              Empowering students worldwide with cutting-edge AI technology to achieve academic excellence.
            </p>
            <div className="flex gap-4">
              <Twitter className="w-5 h-5 hover:text-white dark:hover:text-blue-400 cursor-pointer transition-colors" />
              <Linkedin className="w-5 h-5 hover:text-white dark:hover:text-blue-400 cursor-pointer transition-colors" />
              <Github className="w-5 h-5 hover:text-white dark:hover:text-blue-400 cursor-pointer transition-colors" />
              <Facebook className="w-5 h-5 hover:text-white dark:hover:text-blue-400 cursor-pointer transition-colors" />
            </div>
          </div>
          <div>
            <h5 className="text-white font-bold mb-6">Platform</h5>
            <ul className="space-y-4">
              <li><a href="#" className="hover:text-white dark:hover:text-blue-400 transition-colors">AI Summarizer</a></li>
              <li><a href="#" className="hover:text-white dark:hover:text-blue-400 transition-colors">Quiz Generator</a></li>
              <li><a href="#" className="hover:text-white dark:hover:text-blue-400 transition-colors">Chat with PDF</a></li>
              <li><a href="#" className="hover:text-white dark:hover:text-blue-400 transition-colors">Mobile App</a></li>
            </ul>
          </div>
          <div>
            <h5 className="text-white font-bold mb-6">Company</h5>
            <ul className="space-y-4">
              <li><a href="#" className="hover:text-white dark:hover:text-blue-400 transition-colors">About Us</a></li>
              <li><a href="#" className="hover:text-white dark:hover:text-blue-400 transition-colors">Careers</a></li>
              <li><a href="#" className="hover:text-white dark:hover:text-blue-400 transition-colors">Blog</a></li>
              <li><a href="#" className="hover:text-white dark:hover:text-blue-400 transition-colors">Privacy Policy</a></li>
            </ul>
          </div>
          <div>
            <h5 className="text-white font-bold mb-6">Stay Updated</h5>
            <p className="mb-4">Get the latest study tips and AI updates.</p>
            <div className="flex gap-2">
              <input 
                type="email" 
                placeholder="Enter email" 
                className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 w-full focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
              />
              <button className="bg-blue-600 text-white p-3 rounded-xl hover:bg-blue-700 transition-colors">
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-6 pt-8 border-t border-slate-800 dark:border-slate-700 flex flex-col md:row items-center justify-between gap-6">
          <p className="text-sm">© 2026 AI Study Hub. All rights reserved.</p>
          <div className="flex gap-8 text-sm">
            <a href="#" className="hover:text-white dark:hover:text-blue-400">Terms</a>
            <a href="#" className="hover:text-white dark:hover:text-blue-400">Privacy</a>
            <a href="#" className="hover:text-white dark:hover:text-blue-400">Cookies</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
