import { useState, useRef, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import useAuthStore from "../store/useAuthStore";
import { authAPI } from "../api";
import toast from "react-hot-toast";

export default function VerifyOTPPage() {
  const [params] = useSearchParams();
  const email = params.get("email") || "";
  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [countdown, setCountdown] = useState(60);
  const [resending, setResending] = useState(false);
  const { verifyOTP, isLoading } = useAuthStore();
  const navigate = useNavigate();
  const inputs = useRef([]);

  // Countdown timer
  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const handleChange = (i, val) => {
    if (!/^\d?$/.test(val)) return;
    const next = [...digits];
    next[i] = val;
    setDigits(next);
    if (val && i < 5) inputs.current[i + 1]?.focus();
  };

  const handleKeyDown = (i, e) => {
    if (e.key === "Backspace" && !digits[i] && i > 0) {
      inputs.current[i - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 6) {
      setDigits(pasted.split(""));
      inputs.current[5]?.focus();
    }
  };

  const handleSubmit = async () => {
    setError("");
    const otp = digits.join("");
    if (otp.length < 6) { setError("Enter all 6 digits."); return; }
    const result = await verifyOTP(email, otp);
    if (result.success) {
      navigate("/");
    } else {
      setError(result.message);
      setDigits(["", "", "", "", "", ""]);
      inputs.current[0]?.focus();
    }
  };

  const resendOTP = async () => {
    setResending(true);
    try {
      await authAPI.resendOTP({ email });
      setCountdown(60);
      setDigits(["", "", "", "", "", ""]);
      inputs.current[0]?.focus();
      toast.success("New OTP sent! Check your email.");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to resend OTP");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md animate-fade-in">
        <div className="bg-bg-card border border-white/[0.1] rounded-3xl p-8 text-center">
          {/* Icon */}
          <div className="w-16 h-16 rounded-2xl bg-primary/15 border border-primary/20 flex items-center justify-center text-3xl mx-auto mb-6">
            📧
          </div>

          <h1 className="font-display font-black text-3xl mb-2">Check your email</h1>
          <p className="text-white/40 text-sm mb-1">We sent a 6-digit OTP to</p>
          <p className="text-white font-semibold mb-8">{email}</p>

          {/* OTP inputs */}
          <div className="flex gap-2.5 justify-center mb-6" onPaste={handlePaste}>
            {digits.map((d, i) => (
              <input
                key={i}
                ref={(el) => (inputs.current[i] = el)}
                className="w-12 h-14 text-center text-2xl font-bold rounded-xl border transition-all outline-none"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  borderColor: d ? "#E8471A" : "rgba(255,255,255,0.1)",
                  color: "#F0EEE9",
                  boxShadow: d ? "0 0 0 3px rgba(232,71,26,0.15)" : "none",
                }}
                maxLength={1}
                value={d}
                onChange={(e) => handleChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                inputMode="numeric"
              />
            ))}
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-400 mb-4">
              {error}
            </div>
          )}

          <button
            className="btn-primary w-full justify-center py-3.5 text-base mb-4"
            onClick={handleSubmit}
            disabled={isLoading || digits.join("").length < 6}
          >
            {isLoading ? "Verifying…" : "Verify & Continue →"}
          </button>

          <p className="text-sm text-white/40">
            Didn't receive it?{" "}
            {countdown > 0 ? (
              <span className="text-white/30">Resend in {countdown}s</span>
            ) : (
              <button
                onClick={resendOTP}
                disabled={resending}
                className="text-primary font-semibold hover:text-primary-light disabled:opacity-50"
              >
                {resending ? "Sending…" : "Resend OTP"}
              </button>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
