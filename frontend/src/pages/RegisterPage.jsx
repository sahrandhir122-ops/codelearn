import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import useAuthStore from "../store/useAuthStore";

const API_URL = import.meta.env.VITE_API_URL || "/api";

const TRUST_BADGES = [
  { icon: "🚀", text: "50+ courses" },
  { icon: "🎓", text: "1.5L+ learners" },
  { icon: "⭐", text: "4.8 rating" },
  { icon: "💼", text: "500+ hiring partners" },
];

export default function RegisterPage() {
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "" });
  const [error, setError] = useState("");
  const [showPass, setShowPass] = useState(false);
  const { register, isLoading } = useAuthStore();
  const navigate = useNavigate();

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.name || !form.email || !form.password) { setError("Please fill in all fields."); return; }
    if (form.password.length < 6) { setError("Password must be at least 6 characters."); return; }
    if (form.password !== form.confirm) { setError("Passwords do not match."); return; }
    const result = await register({ name: form.name, email: form.email, password: form.password });
    if (result.success) navigate(`/verify-otp?email=${encodeURIComponent(form.email)}`);
    else setError(result.message);
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
  const strengthColor = ["", "#EF4444", "#F5B731", "#3B82F6", "#10B981"][strength];

  return (
    <div className="min-h-[calc(100vh-64px)] flex">

      {/* ── LEFT brand panel (lg+) ─────────────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-[46%] flex-col justify-between p-10 xl:p-14 relative overflow-hidden"
        style={{ background: "linear-gradient(145deg, #130800 0%, #1e0d04 45%, #12091c 100%)" }}>

        {/* Ambient glows */}
        <div className="absolute pointer-events-none" style={{ top: "10%", left: "15%", width: 300, height: 300, borderRadius: "50%", background: "radial-gradient(circle, rgba(232,71,26,0.2) 0%, transparent 70%)", filter: "blur(60px)" }} />
        <div className="absolute pointer-events-none" style={{ bottom: "25%", right: "10%", width: 200, height: 200, borderRadius: "50%", background: "radial-gradient(circle, rgba(245,183,49,0.15) 0%, transparent 70%)", filter: "blur(45px)" }} />
        <div className="absolute pointer-events-none" style={{ top: "60%", left: "0", width: 160, height: 160, borderRadius: "50%", background: "radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 70%)", filter: "blur(35px)" }} />
        <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.025) 1px,transparent 1px)", backgroundSize: "44px 44px" }} />

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center font-black text-white text-xl select-none">C</div>
          <span className="font-display font-black text-2xl text-white tracking-tight">CodeLearn</span>
        </div>

        {/* Center */}
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 mb-5 px-3 py-1.5 rounded-full text-xs font-semibold"
            style={{ background: "rgba(232,71,26,0.15)", color: "#FF8C5A", border: "1px solid rgba(232,71,26,0.25)" }}>
            ✨ Free to join — no credit card needed
          </div>
          <h2 className="font-display font-black text-[2.6rem] xl:text-5xl text-white leading-[1.08] mb-4">
            Your career in<br />
            <span className="gradient-text">tech starts</span><br />
            here.
          </h2>
          <p className="text-white/45 text-sm leading-relaxed mb-8 max-w-xs">
            Thousands of students have switched careers, got promoted, and built real products using CodeLearn.
          </p>

          {/* Testimonial quote */}
          <div className="rounded-2xl p-5 mb-6"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <p className="text-white/70 text-sm leading-relaxed italic mb-4">
              "I went from zero coding knowledge to landing a ₹12 LPA job in 8 months. CodeLearn's curriculum is genuinely world-class."
            </p>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-black text-white flex-shrink-0"
                style={{ background: "#10B981" }}>
                PN
              </div>
              <div>
                <p className="text-white/80 text-xs font-semibold">Priya Nair</p>
                <p className="text-white/35 text-xs">ML Engineer · Now at Razorpay</p>
              </div>
              <div className="ml-auto flex gap-0.5">
                {[1,2,3,4,5].map((i) => <span key={i} style={{ color: "#F5B731", fontSize: 12 }}>★</span>)}
              </div>
            </div>
          </div>

          {/* Trust badges */}
          <div className="grid grid-cols-2 gap-3">
            {TRUST_BADGES.map((b) => (
              <div key={b.text} className="flex items-center gap-2.5 rounded-xl px-3 py-2.5"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <span className="text-lg">{b.icon}</span>
                <span className="text-white/55 text-xs font-medium">{b.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom */}
        <div className="relative z-10">
          <div className="flex items-center gap-2">
            {[1,2,3,4,5].map((i) => <span key={i} style={{ color: "#F5B731", fontSize: 14 }}>★</span>)}
            <span className="text-white/35 text-xs ml-1">Rated 4.8/5 by 12,000+ students</span>
          </div>
        </div>
      </div>

      {/* ── RIGHT form panel ───────────────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-10 py-10"
        style={{ background: "linear-gradient(180deg, #0A0A0F 0%, #0e0b18 100%)" }}>
        <div className="w-full max-w-md animate-fade-in">

          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2.5 mb-7">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center font-black text-white text-lg select-none">C</div>
            <span className="font-display font-black text-xl text-white">CodeLearn</span>
          </div>

          <div className="rounded-3xl p-7 sm:p-8"
            style={{ background: "rgba(17,17,24,0.9)", border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 0 0 1px rgba(255,255,255,0.03), 0 32px 80px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)" }}>

            <div className="mb-6">
              <h1 className="font-display font-black text-2xl sm:text-[1.75rem] mb-1.5">Create your account 🎉</h1>
              <p className="text-white/40 text-sm">Join 1,50,000+ learners today — it's free</p>
            </div>

            {/* OAuth */}
            <div className="space-y-2.5 mb-5">
              <a href={`${API_URL}/auth/google`}
                className="flex items-center justify-center gap-3 w-full py-2.5 rounded-xl text-sm font-medium text-white/75 no-underline transition-all"
                style={{ border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.08)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.18)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; }}>
                <svg width="17" height="17" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Sign up with Google
              </a>
              <a href={`${API_URL}/auth/github`}
                className="flex items-center justify-center gap-3 w-full py-2.5 rounded-xl text-sm font-medium text-white/75 no-underline transition-all"
                style={{ border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.08)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.18)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; }}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="white">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
                Sign up with GitHub
              </a>
            </div>

            <div className="flex items-center gap-3 mb-5">
              <div className="flex-1 h-px bg-white/[0.07]" />
              <span className="text-xs text-white/25">or with email</span>
              <div className="flex-1 h-px bg-white/[0.07]" />
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-white/40 mb-1.5 block uppercase tracking-wide">Full Name</label>
                <input className="input" placeholder="Rahul Kumar"
                  value={form.name} onChange={(e) => set("name", e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-semibold text-white/40 mb-1.5 block uppercase tracking-wide">Email</label>
                <input className="input" type="email" placeholder="you@example.com"
                  value={form.email} onChange={(e) => set("email", e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-semibold text-white/40 mb-1.5 block uppercase tracking-wide">Password</label>
                <div className="relative">
                  <input className="input pr-10" type={showPass ? "text" : "password"} placeholder="Min. 6 characters"
                    value={form.password} onChange={(e) => set("password", e.target.value)} />
                  <button type="button" onClick={() => setShowPass(p => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors text-xs">
                    {showPass ? "Hide" : "Show"}
                  </button>
                </div>
                {form.password && (
                  <div className="mt-2">
                    <div className="flex gap-1 mb-1">
                      {[1,2,3,4].map((i) => (
                        <div key={i} className="flex-1 h-1 rounded-full transition-all duration-300"
                          style={{ background: i <= strength ? strengthColor : "rgba(255,255,255,0.08)" }} />
                      ))}
                    </div>
                    <p className="text-xs font-medium" style={{ color: strengthColor }}>{strengthLabel}</p>
                  </div>
                )}
              </div>
              <div>
                <label className="text-xs font-semibold text-white/40 mb-1.5 block uppercase tracking-wide">Confirm Password</label>
                <input className="input" type="password" placeholder="Re-enter password"
                  value={form.confirm} onChange={(e) => set("confirm", e.target.value)} />
                {form.confirm && form.confirm !== form.password && (
                  <p className="text-xs text-red-400 mt-1.5">Passwords don't match</p>
                )}
                {form.confirm && form.confirm === form.password && form.confirm.length >= 6 && (
                  <p className="text-xs mt-1.5" style={{ color: "#10B981" }}>✓ Passwords match</p>
                )}
              </div>

              {error && (
                <div className="flex items-start gap-2.5 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-400">
                  <span className="mt-0.5 flex-shrink-0">⚠</span> {error}
                </div>
              )}

              <p className="text-xs text-white/25 leading-relaxed pt-0.5">
                By signing up you agree to our{" "}
                <Link to="/terms" className="text-white/45 hover:text-white underline">Terms</Link> and{" "}
                <Link to="/privacy" className="text-white/45 hover:text-white underline">Privacy Policy</Link>.
              </p>

              <button type="submit" className="w-full justify-center py-3.5 text-sm font-bold rounded-xl text-white transition-all flex items-center gap-2"
                disabled={isLoading}
                style={{ background: isLoading ? "rgba(232,71,26,0.6)" : "linear-gradient(135deg,#E8471A,#c9360d)", boxShadow: isLoading ? "none" : "0 4px 20px rgba(232,71,26,0.35), 0 1px 0 rgba(255,255,255,0.1) inset", cursor: isLoading ? "not-allowed" : "pointer" }}>
                {isLoading ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Creating…</> : "Create Account →"}
              </button>
            </form>

            <p className="text-center text-sm text-white/35 mt-5">
              Already have an account?{" "}
              <Link to="/login" className="text-primary font-semibold hover:text-primary-light transition-colors">Sign in</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
