import { Check, Zap, ArrowRight, ArrowLeft, CreditCard, Lock } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import { useNavigate } from "react-router";

const proFeatures = [
  "100 GB Cloud Storage",
  "Unlimited AI Questions",
  "Unlimited Document Uploads",
  "Priority AI Processing",
  "Advanced Analytics",
  "Export to PDF & DOCX",
  "Citation References",
  "Priority Support",
];

export function UpgradePlanPage() {
  const [billing, setBilling] = useState<"monthly" | "annual">("monthly");
  const [isProcessing, setIsProcessing] = useState(false);
  const [step, setStep] = useState<"plan" | "payment" | "success">("plan");
  const navigate = useNavigate();

  const price = billing === "monthly" ? 19 : 15;
  const total = billing === "annual" ? price * 12 : price;

  const handleUpgrade = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setStep("success");
    }, 2000);
  };

  if (step === "success") {
    return (
      <div className="space-y-8">
        <div className="max-w-lg mx-auto text-center py-16">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 200 }}>
            <div className="w-24 h-24 bg-emerald-50 dark:bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-emerald-100 dark:border-emerald-500/30">
              <Check className="w-12 h-12 text-emerald-500" />
            </div>
          </motion.div>
          <h1 className="text-4xl font-extrabold text-slate-900 dark:text-white mb-3">Welcome to Pro!</h1>
          <p className="text-slate-500 dark:text-slate-400 text-lg mb-8">Your account has been upgraded. Enjoy unlimited AI-powered studying!</p>
          <button
            onClick={() => navigate("/app/dashboard")}
            className="px-8 py-4 bg-blue-600 text-white font-extrabold rounded-2xl hover:bg-blue-700 shadow-lg shadow-blue-500/20 transition-all flex items-center gap-2 mx-auto"
          >
            Go to Dashboard <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate("/app/subscription")}
          className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">Upgrade to Pro</h1>
          <p className="text-slate-500 dark:text-slate-400">Unlock unlimited AI studying power</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-5xl">
        {/* Plan Summary */}
        <div className="space-y-5">
          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[2rem] p-8 text-white">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-extrabold">Pro Plan</h2>
                <p className="text-white/70 text-sm">Everything you need to ace your studies</p>
              </div>
            </div>

            {/* Billing Toggle */}
            <div className="flex items-center gap-2 bg-white/10 rounded-2xl p-1.5 mb-6">
              <button
                onClick={() => setBilling("monthly")}
                className={`flex-1 py-2 rounded-xl font-bold text-sm transition-all ${billing === "monthly" ? "bg-white text-blue-600" : "text-white/70"}`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBilling("annual")}
                className={`flex-1 py-2 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${billing === "annual" ? "bg-white text-blue-600" : "text-white/70"}`}
              >
                Annual
                <span className={`px-2 py-0.5 text-xs rounded-lg font-bold ${billing === "annual" ? "bg-blue-600 text-white" : "bg-emerald-400/30 text-emerald-200"}`}>-20%</span>
              </button>
            </div>

            <div className="flex items-end gap-2 mb-1">
              <span className="text-5xl font-extrabold">${price}</span>
              <span className="text-white/70 mb-2">/month</span>
            </div>
            {billing === "annual" && (
              <p className="text-white/60 text-sm mb-4">Billed annually (${total}/year)</p>
            )}
            {billing === "monthly" && (
              <p className="text-white/60 text-sm mb-4">Billed monthly. Cancel anytime.</p>
            )}

            <div className="space-y-2.5">
              {proFeatures.map((feat) => (
                <div key={feat} className="flex items-center gap-2.5">
                  <div className="w-5 h-5 bg-white/20 rounded-full flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3" />
                  </div>
                  <span className="text-sm text-white/90">{feat}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-100 dark:border-amber-500/30 rounded-2xl p-4 flex items-center gap-3">
            <Zap className="w-5 h-5 text-amber-500 shrink-0" />
            <p className="text-sm text-amber-700 dark:text-amber-300 font-medium">
              Start with a <span className="font-extrabold">14-day free trial</span>. No charge until Jul 20, 2024.
            </p>
          </div>
        </div>

        {/* Payment Form */}
        <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-sm p-8">
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white mb-6">Payment Details</h2>

          <div className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Cardholder Name</label>
              <input
                type="text"
                placeholder="Alex Johnson"
                defaultValue="Alex Johnson"
                className="w-full px-4 py-3 bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Card Number</label>
              <div className="relative">
                <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 dark:text-slate-400" />
                <input
                  type="text"
                  placeholder="4242 4242 4242 4242"
                  className="w-full pl-11 pr-4 py-3 bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Expiry</label>
                <input
                  type="text"
                  placeholder="MM / YY"
                  className="w-full px-4 py-3 bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">CVC</label>
                <input
                  type="text"
                  placeholder="123"
                  className="w-full px-4 py-3 bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>
            </div>

            <div className="border-t border-slate-100 dark:border-slate-800 pt-5">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-slate-500 dark:text-slate-400">Pro Plan ({billing})</span>
                <span className="font-bold text-slate-900 dark:text-white">${price}.00</span>
              </div>
              {billing === "annual" && (
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-slate-500 dark:text-slate-400">Annual savings</span>
                  <span className="font-bold text-emerald-600">-${(19 - price) * 12}.00</span>
                </div>
              )}
              <div className="flex justify-between font-extrabold text-slate-900 dark:text-white text-lg border-t border-slate-100 dark:border-slate-800 pt-3">
                <span>Due Today</span>
                <span>$0.00 (Trial)</span>
              </div>
            </div>

            <button
              onClick={handleUpgrade}
              disabled={isProcessing}
              className="w-full py-4 bg-blue-600 text-white font-extrabold rounded-2xl hover:bg-blue-700 shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-70"
            >
              {isProcessing ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>Start 14-Day Free Trial <ArrowRight className="w-5 h-5" /></>
              )}
            </button>

            <div className="flex items-center justify-center gap-2 text-slate-500 dark:text-slate-400">
              <Lock className="w-4 h-4" />
              <span className="text-xs font-medium">256-bit SSL secured payment</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
