import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import useAuthStore from "../store/useAuthStore";

const API_URL = import.meta.env.VITE_API_URL || "/api";

export default function RegisterPage() {
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "" });
  const [error, setError] = useState("");
  const { register, isLoading } = useAuthStore();
  const navigate = useNavigate();

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.name || !form.email || !form.password) {
      setError("Please fill in all fields.");
      return;
    }
    if (form.password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (form.password !== form.confirm) {
      setError("Passwords do not match.");
      return;
    }
    const result = await register({ name: form.name, email: form.email, password: form.password });
    if (result.success) {
      navigate(`/verify-otp?email=${encodeURIComponent(form.email)}`);
    } else {
      setError(result.message);
    }
  };

  const strength = (() => {
    const p = form.password;
    if (!p) return 0;
    let s = 0;
    if (p.length >= 6) s++;
    if (/[A-Z]/.test(p)) s++;
    if (/[0-9]/.test(p)) s++;
    if (/[^A-Za-z0-9]/.test(p)) s++;
    return s;
  })();

  const strengthLabel = ["", "Weak", "Fair", "Good", "Strong"][strength];
  const strengthColor = ["", "#EF4444", "#F5B731", "#3B82F6", "#2ECC71"][strength];

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md animate-fade-in">
        <div className="bg-bg-card border border-white/[0.1] rounded-3xl p-8">
          <div className="mb-8">
            <h1 className="font-display font-black text-3xl mb-2">Create account</h1>
            <p className="text-white/40 text-sm">Join 1,50,000+ learners today</p>
          </div>

          {/* OAuth */}
          <div className="space-y-3 mb-6">
            {[
              { icon: "🔵", label: "Sign up with Google", href: `${API_URL}/auth/google` },
              { icon: "⬛", label: "Sign up with GitHub", href: `${API_URL}/auth/github` },
            ].map((o) => (
              <a key={o.label} href={o.href}
                className="btn-ghost w-full justify-center py-3 text-sm no-underline">
                <span>{o.icon}</span> {o.label}
              </a>
            ))}
          </div>

          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-px bg-white/[0.07]" />
            <span className="text-xs text-white/30">or with email</span>
            <div className="flex-1 h-px bg-white/[0.07]" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-white/40 mb-1.5 block">Full Name</label>
              <input className="input" placeholder="Rahul Kumar"
                value={form.name} onChange={(e) => set("name", e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-white/40 mb-1.5 block">Email</label>
              <input className="input" type="email" placeholder="you@example.com"
                value={form.email} onChange={(e) => set("email", e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-white/40 mb-1.5 block">Password</label>
              <input className="input" type="password" placeholder="Min. 6 characters"
                value={form.password} onChange={(e) => set("password", e.target.value)} />
              {form.password && (
                <div className="mt-2">
                  <div className="flex gap-1 mb-1">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="flex-1 h-1 rounded-full transition-colors"
                        style={{ background: i <= strength ? strengthColor : "rgba(255,255,255,0.08)" }} />
                    ))}
                  </div>
                  <p className="text-xs" style={{ color: strengthColor }}>{strengthLabel}</p>
                </div>
              )}
            </div>
            <div>
              <label className="text-xs font-medium text-white/40 mb-1.5 block">Confirm Password</label>
              <input className="input" type="password" placeholder="Re-enter password"
                value={form.confirm} onChange={(e) => set("confirm", e.target.value)} />
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-400">
                {error}
              </div>
            )}

            <p className="text-xs text-white/30 leading-relaxed">
              By creating an account you agree to our{" "}
              <Link to="/terms" className="text-white/50 hover:text-white underline">Terms</Link> and{" "}
              <Link to="/privacy" className="text-white/50 hover:text-white underline">Privacy Policy</Link>.
            </p>

            <button type="submit" className="btn-primary w-full justify-center py-3.5 text-base"
              disabled={isLoading}>
              {isLoading ? "Creating account…" : "Create Account →"}
            </button>
          </form>

          <p className="text-center text-sm text-white/40 mt-6">
            Already have an account?{" "}
            <Link to="/login" className="text-primary font-semibold hover:text-primary-light">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
