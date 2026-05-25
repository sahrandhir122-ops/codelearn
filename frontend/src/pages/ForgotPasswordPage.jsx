import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { authAPI } from "../api";
import toast from "react-hot-toast";

export default function ForgotPasswordPage() {
  const [email,    setEmail]    = useState("");
  const [loading,  setLoading]  = useState(false);
  const [sent,     setSent]     = useState(false);
  const [error,    setError]    = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!email.trim()) { setError("Please enter your email address."); return; }

    setLoading(true);
    try {
      await authAPI.forgotPassword({ email: email.trim().toLowerCase() });
      setSent(true);
      toast.success("Reset code sent! Check your inbox.");
      // Short delay then navigate so user sees the success state briefly
      setTimeout(() => navigate(`/reset-password?email=${encodeURIComponent(email.trim().toLowerCase())}`), 1500);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to send reset code. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md animate-fade-in">
        <div className="bg-bg-card border border-white/[0.1] rounded-3xl p-8 text-center">

          {/* Icon */}
          <div className="w-16 h-16 rounded-2xl bg-primary/15 border border-primary/20 flex items-center justify-center text-3xl mx-auto mb-6">
            🔑
          </div>

          <h1 className="font-display font-black text-3xl mb-2">Forgot password?</h1>
          <p className="text-white/40 text-sm mb-8">
            Enter your email and we'll send you a 6-digit code to reset your password.
          </p>

          {sent ? (
            <div className="bg-accent-green/10 border border-accent-green/20 rounded-2xl px-6 py-5 text-center">
              <div className="text-3xl mb-3">📬</div>
              <p className="text-accent-green font-semibold text-sm">Reset code sent!</p>
              <p className="text-white/40 text-xs mt-1">Redirecting you to enter the code…</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 text-left">
              <div>
                <label className="text-xs font-medium text-white/40 mb-1.5 block">Email address</label>
                <input
                  className="input"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoFocus
                />
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-400">
                  {error}
                </div>
              )}

              <button
                type="submit"
                className="btn-primary w-full justify-center py-3.5 text-base"
                disabled={loading}
              >
                {loading ? "Sending…" : "Send Reset Code →"}
              </button>
            </form>
          )}

          <p className="text-sm text-white/40 mt-6">
            Remember it?{" "}
            <Link to="/login" className="text-primary font-semibold hover:text-primary-light">
              Back to sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
