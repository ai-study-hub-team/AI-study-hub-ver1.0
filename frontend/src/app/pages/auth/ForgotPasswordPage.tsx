import { NavLink, useNavigate } from "react-router";
import { Mail, ArrowRight, ArrowLeft, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";

export function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [email, setEmail] = useState("");
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
  e.preventDefault();
  setIsLoading(true);

  setTimeout(() => {
    setIsLoading(false);
    setEmailSent(true);

    toast.success("Verification code sent to your email!");

    navigate("/verify-reset-code");
  }, 1500);
};

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50">
      <div className="max-w-md w-full">
        <div className="text-center mb-10">
          <NavLink to="/" className="inline-flex items-center gap-2 mb-8">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-xl">A</div>
            <span className="text-2xl font-bold text-slate-900 tracking-tight">AI Study Hub</span>
          </NavLink>
        </div>

        <AnimatePresence mode="wait">
          {!emailSent ? (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
                  <Mail className="w-8 h-8 text-blue-600" />
                </div>
                <h1 className="text-3xl font-extrabold text-slate-900 mb-2">Forgot Password?</h1>
                <p className="text-slate-500">No worries. Enter your email and we'll send you a reset link.</p>
              </div>

              <div className="bg-white p-8 rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-100">
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Email Address</label>
                    <div className="relative group">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="name@example.com"
                        className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {isLoading ? "Sending..." : "Send Reset Link"}
                    {!isLoading && <ArrowRight className="w-5 h-5" />}
                  </button>
                </form>
              </div>

              <div className="text-center mt-8">
                <NavLink to="/login" className="inline-flex items-center gap-2 text-slate-500 font-medium hover:text-slate-700 transition-colors">
                  <ArrowLeft className="w-4 h-4" /> Back to Login
                </NavLink>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center"
            >
              <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-10 h-10 text-emerald-500" />
              </div>
              <h1 className="text-3xl font-extrabold text-slate-900 mb-3">Check your inbox!</h1>
              <p className="text-slate-500 mb-2">We sent a password reset link to</p>
              <p className="font-bold text-slate-900 mb-8">{email}</p>

              <div className="bg-white p-8 rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-100 text-left mb-8">
                <p className="text-sm text-slate-500 mb-4">Didn't receive the email? Check your spam folder or:</p>
                <button
                  onClick={() => {
                    toast.success("Email resent successfully!");
                  }}
                  className="w-full py-3.5 border border-blue-200 text-blue-600 font-bold rounded-xl hover:bg-blue-50 transition-all flex items-center justify-center gap-2"
                >
                  <Mail className="w-5 h-5" /> Resend Email
                </button>
              </div>

              <NavLink to="/login" className="inline-flex items-center gap-2 text-slate-500 font-medium hover:text-slate-700 transition-colors">
                <ArrowLeft className="w-4 h-4" /> Back to Login
              </NavLink>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
