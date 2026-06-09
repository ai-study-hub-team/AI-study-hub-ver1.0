import { NavLink, useNavigate } from "react-router";
import { CheckCircle2, ArrowRight, Mail, BookOpen, Zap } from "lucide-react";
import { motion } from "motion/react";

export function VerifyEmailSuccessPage() {
  const navigate = useNavigate();

  const features = [
    { icon: BookOpen, label: "Access all study materials", color: "blue" },
    { icon: Zap, label: "AI-powered summaries & chat", color: "purple" },
    { icon: Mail, label: "Email notifications enabled", color: "emerald" },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50 dark:bg-slate-950">
      <div className="max-w-md w-full text-center">
        <NavLink to="/" className="inline-flex items-center gap-2 mb-10">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-xl">A</div>
          <span className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">AI Study Hub</span>
        </NavLink>

        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 20 }}
          className="mb-8"
        >
          <div className="relative w-24 h-24 mx-auto mb-6">
            <div className="absolute inset-0 bg-emerald-100 dark:bg-emerald-500/20 rounded-full animate-ping opacity-30"></div>
            <div className="relative w-24 h-24 bg-emerald-50 dark:bg-emerald-500/10 rounded-full flex items-center justify-center border-4 border-emerald-100 dark:border-emerald-500/30">
              <CheckCircle2 className="w-12 h-12 text-emerald-500" />
            </div>
          </div>

          <h1 className="text-4xl font-extrabold text-slate-900 dark:text-white mb-3">Email Verified!</h1>
          <p className="text-slate-500 dark:text-slate-400 text-lg">Your account is now fully activated and ready to use.</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] shadow-xl shadow-slate-200/50 dark:shadow-slate-950/40 border border-slate-200 dark:border-slate-700 mb-8"
        >
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-5">You now have access to:</h2>
          <div className="space-y-3">
            {features.map((feat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.1 }}
                className={`flex items-center gap-3 p-3 bg-${feat.color}-50 dark:bg-slate-800 rounded-xl`}
              >
                <div className={`w-8 h-8 bg-${feat.color}-100 dark:bg-slate-900 rounded-lg flex items-center justify-center`}>
                  <feat.icon className={`w-4 h-4 text-${feat.color}-600`} />
                </div>
                <span className="font-semibold text-slate-700 dark:text-slate-300">{feat.label}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>

       <button
            onClick={() => navigate("/login")}
            className="w-full max-w-xl py-5 bg-blue-600 text-white text-2xl font-bold rounded-2xl shadow-lg shadow-blue-500/30 hover:bg-blue-700 transition-all flex items-center justify-center gap-3"
>
              Go to Login
             <ArrowRight className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
}
