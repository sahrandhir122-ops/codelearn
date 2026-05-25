import { useState, useRef, useEffect } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { authAPI } from "../api";
import useAuthStore from "../store/useAuthStore";
import toast from "react-hot-toast";

export default function ResetPasswordPage() {
  const [params]  = useSearchParams();
  const email     = params.get("email") || "";
  const navigate  = useNavigate();
  const { setToken, fetchMe } = useAuthStore();

  const [digits,      setDigits]      = useState(["", "", "", "", "", ""]);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPwd,  setConfirmPwd]  = useState("");
  const [showPwd,     setShowPwd]     = useState(false);
  const [error,       setError]       = useState("");
  const [loading,     setLoading]     = useState(false);
  const [resending,   setResending]   = useState(false);
  const [countdown,   setCountdown]   = useState(60);
  const [success,     setSuccess]     = useState(false);
  const inputs = useRef([]);

  // Redirect if no email in URL
  useEffect(() => {
    if (!email) navigate("/forgot-password", { replace: true });
  }, [email]);

  // Countdown timer for resend
  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  // ── OTP input handlers ─────────────────────────────────────────────────────
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

  // ── Resend OTP ─────────────────────────────────────────────────────────────
  const handleResend = async () => {
    setResending(true);
    setError("");
    try {
      await authAPI.forgotPassword({ email });
      setCountdown(60);
      setDigits(["", "", "", "", "", ""]);
      inputs.current[0]?.focus();
      toast.success("New reset code sent! Check your email.");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to resend. Try again.");
    } finally {
      setResending(false);
    }
  };

  // ── Submit reset ───────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    setError("");
    const otp = digits.join("");

    if (otp.length < 6) { setError("Please enter all 6 digits of the reset code."); return; }
    if (!newPassword)   { setError("Please enter a new password."); return; }
    if (newPassword.length < 6) { setError("Password must be at least 6 characters."); return; }
    if (newPassword !== confirmPwd) { setError("Passwords don't match."); return; }

    setLoading(true);
    try {
      const { data } = await authAPI.resetPassword({ email, otp, newPassword });

      // Auto-login: store token and fetch user
      if (data.token) {
        setToken(data.token);
        await fetchMe();
      }

      setSuccess(true);
      toast.success("Password reset! Welcome back 🎉");
      setTimeout(() => navigate("/", { replace: true }), 1500);
    } catch (err) {
      setError(err.response?.data?.message || "Reset failed. Try again.");
      // Clear OTP on failure so user can re-enter
      setDigits(["", "", "", "", "", ""]);
      inputs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  // ── Password strength indicator ────────────────────────────────────────────
  const pwdStrength = (() => {
    if (!newPassword) return { level: 0, label: "", color: "" };
    let score = 0;
    if (newPassword.length >= 8)               score++;
    if (/[A-Z]/.test(newPassword))             score++;
    if (/[0-9]/.test(newPassword))             score++;
    if (/[^A-Za-z0-9]/.test(newPassword))      score++;
    if (score <= 1) return { level: 1, label: "Weak",   color: "#EF4444" };
    if (score === 2) return { level: 2, label: "Fair",   color: "#F59E0B" };
    if (score === 3) return { level: 3, label: "Good",   color: "#3B82F6" };
    return              { level: 4, label: "Strong", color: "#10B981" };
  })();

  const otp = digits.join("");

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md animate-fade-in">
        <div className="bg-bg-card border border-white/[0.1] rounded-3xl p-8 text-center">

          {/* Icon */}
          <div className="w-16 h-16 rounded-2xl bg-primary/15 border border-primary/20 flex items-center justify-center text-3xl mx-auto mb-6">
            {success ? "✅" : "🔒"}
          </div>

          <h1 className="font-display font-black text-3xl mb-2">
            {success ? "Password reset!" : "Reset your password"}
          </h1>
          <p className="text-white/40 text-sm mb-2">
            {success
              ? "You're being signed in automatically…"
              : "Enter the 6-digit code we sent to"}
          </p>
          {!success && (
            <p className="text-white font-semibold text-sm mb-8">{email}</p>
          )}

          {success ? (
            <div className="py-4">
              <div className="w-8 h-8 border-2 border-accent-green border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
          ) : (
            <>
              {/* ── OTP inputs ── */}
              <div className="flex gap-2.5 justify-center mb-6" onPaste={handlePaste}>
                {digits.map((d, i) => (
                  <input
                    key={i}
                    ref={el => (inputs.current[i] = el)}
                    className="w-12 h-14 text-center text-2xl font-bold rounded-xl border transition-all outline-none"
                    style={{
                      background:   "rgba(255,255,255,0.05)",
                      borderColor:  d ? "#E8471A" : "rgba(255,255,255,0.1)",
                      color:        "#F0EEE9",
                      boxShadow:    d ? "0 0 0 3px rgba(232,71,26,0.15)" : "none",
                    }}
                    maxLength={1}
                    value={d}
                    onChange={e => handleChange(i, e.target.value)}
                    onKeyDown={e => handleKeyDown(i, e)}
                    inputMode="numeric"
                  />
                ))}
              </div>

              {/* Resend */}
              <p className="text-sm text-white/40 mb-8">
                Didn't receive it?{" "}
                {countdown > 0 ? (
                  <span className="text-white/30">Resend in {countdown}s</span>
                ) : (
                  <button
                    onClick={handleResend}
                    disabled={resending}
                    className="text-primary font-semibold hover:text-primary-light disabled:opacity-50"
                  >
                    {resending ? "Sending…" : "Resend code"}
                  </button>
                )}
              </p>

              {/* Divider */}
              <div className="flex items-center gap-3 mb-6">
                <div className="flex-1 h-px bg-white/[0.07]" />
                <span className="text-xs text-white/30">then set new password</span>
                <div className="flex-1 h-px bg-white/[0.07]" />
              </div>

              {/* New password */}
              <div className="space-y-3 text-left mb-6">
                <div>
                  <label className="text-xs font-medium text-white/40 mb-1.5 block">New Password</label>
                  <div className="relative">
                    <input
                      className="input pr-10"
                      type={showPwd ? "text" : "password"}
                      placeholder="Min. 6 characters"
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPwd(p => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 text-sm"
                      tabIndex={-1}
                    >
                      {showPwd ? "🙈" : "👁"}
                    </button>
                  </div>
                  {/* Strength bar */}
                  {newPassword && (
                    <div className="mt-2">
                      <div className="flex gap-1 mb-1">
                        {[1,2,3,4].map(n => (
                          <div key={n} className="flex-1 h-1 rounded-full transition-all"
                            style={{ background: n <= pwdStrength.level ? pwdStrength.color : "rgba(255,255,255,0.08)" }} />
                        ))}
                      </div>
                      <p className="text-xs" style={{ color: pwdStrength.color }}>{pwdStrength.label}</p>
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-xs font-medium text-white/40 mb-1.5 block">Confirm Password</label>
                  <input
                    className="input"
                    type={showPwd ? "text" : "password"}
                    placeholder="Repeat new password"
                    value={confirmPwd}
                    onChange={e => setConfirmPwd(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") handleSubmit(); }}
                  />
                  {confirmPwd && newPassword !== confirmPwd && (
                    <p className="text-xs text-red-400 mt-1">Passwords don't match</p>
                  )}
                  {confirmPwd && newPassword === confirmPwd && (
                    <p className="text-xs text-accent-green mt-1">✓ Passwords match</p>
                  )}
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-400 mb-4 text-left">
                  {error}
                </div>
              )}

              {/* Submit */}
              <button
                onClick={handleSubmit}
                disabled={loading || otp.length < 6 || !newPassword || newPassword !== confirmPwd}
                className="btn-primary w-full justify-center py-3.5 text-base"
              >
                {loading ? "Resetting…" : "Reset Password →"}
              </button>
            </>
          )}

          <p className="text-sm text-white/40 mt-6">
            <Link to="/login" className="text-primary font-semibold hover:text-primary-light">
              ← Back to sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
