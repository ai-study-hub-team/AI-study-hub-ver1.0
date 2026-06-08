import { NavLink, useNavigate } from "react-router";
import { 
  Mail, 
  Lock, 
  ArrowRight, 
  Github
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export function RegisterPage() {
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      toast.success("Account created successfully!");
      navigate("/verify-email");
    }, 1000);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50">
      <div className="max-w-md w-full">
        <div className="text-center mb-10">
          <NavLink to="/" className="inline-flex items-center gap-2 mb-8">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-xl">A</div>
            <span className="text-2xl font-bold text-slate-900 tracking-tight">AI Study Hub</span>
          </NavLink>
          <h1 className="text-3xl font-extrabold text-slate-900 mb-2">Create Account</h1>
          <p className="text-slate-500">Join 10,000+ students studying smarter with AI</p>
        </div>

        <div className="bg-white p-8 rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-100">
          <form onSubmit={handleRegister} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">First Name</label>
                <input 
                  type="text" 
                  required
                  placeholder="Alex"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Last Name</label>
                <input 
                  type="text" 
                  required
                  placeholder="Johnson"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Email Address</label>
              <div className="relative group">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                <input 
                  type="email" 
                  required
                  placeholder="name@example.com"
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Password</label>
              <div className="relative group">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                <input 
                  type="password" 
                  required
                  placeholder="At least 8 characters"
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>
            </div>

            <div className="flex items-start gap-3">
              <input type="checkbox" required className="mt-1 w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
              <label className="text-sm text-slate-600">
                I agree to the <a href="#" className="text-blue-600 font-semibold hover:underline">Terms of Service</a> and <a href="#" className="text-blue-600 font-semibold hover:underline">Privacy Policy</a>.
              </label>
            </div>

            <button 
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoading ? "Creating account..." : "Create Free Account"}
              {!isLoading && <ArrowRight className="w-5 h-5" />}
            </button>
          </form>
        </div>

        <p className="text-center mt-8 text-slate-500 font-medium">
          Already have an account?{" "}
          <NavLink to="/login" className="text-blue-600 font-bold hover:underline">Log in</NavLink>
        </p>
      </div>
    </div>
  );
}
