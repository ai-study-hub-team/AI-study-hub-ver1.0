import { NavLink, useNavigate } from "react-router";
import { Mail, ArrowRight, RefreshCw } from "lucide-react";
import { useState, useRef } from "react";
import { motion } from "motion/react";
import { toast } from "sonner";

export function EmailVerificationPage() {
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [isLoading, setIsLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);
  const navigate = useNavigate();

  const handleChange = (index: number, value: string) => {
    if (!/^[0-9]*$/.test(value)) return;
    const newCode = [...code];
    newCode[index] = value.slice(-1);
    setCode(newCode);
    if (value && index < 5) {
      inputs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 6) {
      setCode(pasted.split(""));
      inputs.current[5]?.focus();
    }
  };

  const handleVerify = () => {
    const fullCode = code.join("");
    if (fullCode.length < 6) {
      toast.error("Please enter the complete 6-digit code");
      return;
    }
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      if (fullCode === "123456") {
        navigate("/verify-email-success");
      } else {
        toast.error("Invalid code. Use 123456 for demo.");
      }
    }, 1500);
  };

  const handleResend = () => {
    setResending(true);
    setTimeout(() => {
      setResending(false);
      toast.success("New verification code sent!");
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
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
              <Mail className="w-8 h-8 text-blue-600" />
            </div>
            <h1 className="text-3xl font-extrabold text-slate-900 mb-2">Verify Your Email</h1>
            <p className="text-slate-500">We sent a 6-digit code to</p>
            <p className="font-bold text-slate-900 mt-1">alex.johnson@example.com</p>
          </motion.div>
        </div>

        <div className="bg-white p-8 rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-100">
          <div className="flex justify-center gap-3 mb-8" onPaste={handlePaste}>
            {code.map((digit, i) => (
              <input
                key={i}
                ref={(el) => { inputs.current[i] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                className={`w-12 h-14 text-center text-2xl font-extrabold border-2 rounded-2xl outline-none transition-all ${
                  digit
                    ? "border-blue-500 bg-blue-50 text-blue-600"
                    : "border-slate-200 bg-slate-50 text-slate-900 focus:border-blue-500 focus:bg-blue-50/30"
                }`}
              />
            ))}
          </div>

          <div className="bg-amber-50 border border-amber-100 rounded-2xl p-3 mb-6">
            <p className="text-xs text-amber-700 font-medium text-center">Demo: use code <span className="font-extrabold">123456</span></p>
          </div>

          <button
            onClick={handleVerify}
            disabled={isLoading || code.join("").length < 6}
            className="w-full py-3.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? "Verifying..." : "Verify Email"}
            {!isLoading && <ArrowRight className="w-5 h-5" />}
          </button>

          <div className="mt-6 text-center">
            <p className="text-sm text-slate-500 mb-3">Didn't receive the code?</p>
            <button
              onClick={handleResend}
              disabled={resending}
              className="inline-flex items-center gap-2 text-blue-600 font-bold hover:text-blue-700 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${resending ? "animate-spin" : ""}`} />
              {resending ? "Sending..." : "Resend Code"}
            </button>
          </div>
        </div>

        <p className="text-center mt-6 text-sm text-slate-500">
          Wrong email?{" "}
          <NavLink to="/register" className="text-blue-600 font-bold hover:underline">Change email address</NavLink>
        </p>
      </div>
    </div>
  );
}
