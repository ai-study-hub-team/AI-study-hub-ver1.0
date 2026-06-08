
import { useState } from "react";
import { useNavigate, NavLink } from "react-router";
import { Mail, ArrowRight, RefreshCw } from "lucide-react";
import { toast } from "sonner";

export default function VerifyResetCodePage() {
  const navigate = useNavigate();
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);

  const handleChange = (
    value: string,
    index: number
  ) => {
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);

    if (value && index < 5) {
      const nextInput = document.getElementById(
        `otp-${index + 1}`
      ) as HTMLInputElement;

      nextInput?.focus();
    }
  };

  const handleVerify = () => {
    const code = otp.join("");

    if (code.length !== 6) {
      toast.error("Please enter the 6-digit code");
      return;
    }

    // Demo code
    if (code === "123456") {
      toast.success("Code verified successfully!");
      navigate("/reset-password");
    } else {
      toast.error("Invalid verification code");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center py-12 px-6">

      <NavLink
        to="/"
        className="flex items-center gap-3 mb-10"
      >
        <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white text-2xl font-bold">
          A
        </div>

        <span className="text-3xl font-bold text-slate-900">
          AI Study Hub
        </span>
      </NavLink>

      <div className="w-20 h-20 bg-blue-100 rounded-3xl flex items-center justify-center mb-6">
        <Mail className="w-10 h-10 text-blue-600" />
      </div>

      <h1 className="text-4xl font-extrabold text-slate-900 mb-3">
        Verify Reset Code
      </h1>

      <p className="text-slate-500 text-center mb-2">
        We sent a 6-digit reset code to your email
      </p>

      <p className="font-bold text-slate-900 mb-10">
        nguyenvana@gmail.com
      </p>

      <div className="bg-white rounded-[2rem] shadow-xl p-8 w-full max-w-lg">

        <div className="flex justify-center gap-3 mb-8">
          {otp.map((digit, index) => (
            <input
              key={index}
              id={`otp-${index}`}
              type="text"
              maxLength={1}
              value={digit}
              onChange={(e) =>
                handleChange(e.target.value, index)
              }
              className="w-14 h-16 border-2 border-slate-200 rounded-2xl text-center text-2xl font-bold outline-none focus:border-blue-500"
            />
          ))}
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-xl py-3 text-center text-amber-700 mb-6">
          Demo: use code <strong>123456</strong>
        </div>

        <button
          onClick={handleVerify}
          className="w-full py-4 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
        >
          Verify Code
          <ArrowRight className="w-5 h-5" />
        </button>

        <div className="text-center mt-8">
          <p className="text-slate-500 mb-3">
            Didn't receive the code?
          </p>

          <button className="inline-flex items-center gap-2 text-blue-600 font-bold">
            <RefreshCw className="w-4 h-4" />
            Resend Code
          </button>
        </div>
      </div>
    </div>
  );
}

