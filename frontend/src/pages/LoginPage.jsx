import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import useAuthStore from "../store/useAuthStore";

const API_URL = import.meta.env.VITE_API_URL || "/api";

const FEATURES = [
  { icon: "🚀", title: "50+ expert-led courses", sub: "Python, Web Dev, ML, DevOps & more" },
  { icon: "🎯", title: "Learn from industry pros", sub: "Taught by engineers at Google, Amazon" },
  { icon: "💰", title: "Affordable for India",    sub: "Starting at just ₹999 per course" },
  { icon: "📜", title: "Recognized certificates", sub: "Trusted by 500+ hiring companies" },
];

const AVATARS = [
  { initials: "AS", color: "#E8471A" },
  { initials: "RM", color: "#3B82F6" },
  { initials: "PN", color: "#10B981" },
  { initials: "KV", color: "#8B5CF6" },
  { initials: "SP", color: "#F59E0B" },
];

export default function LoginPage() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [showPass, setShowPass] = useState(false);
  const { login, isLoading } = useAuthStore();
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.email || !form.password) { setError("Please fill in all fields."); return; }
    const result = await login(form);
    if (result.success) navigate(params.get("redirect") || "/");
    else setError(result.message);
  };

  return (
    <div className="min-h-[calc(100vh-64px)] flex">

      {/* ── LEFT brand panel (lg+) ─────────────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-[46%] flex-col justify-between p-10 xl:p-14 relative overflow-hidden"
        style={{ background: "linear-gradient(145deg, #130800 0%, #1e0d04 45%, #12091c 100%)" }}>

        {/* Ambient glows */}
        <div className="absolute pointer-events-none" style={{ top: "15%", left: "10%", width: 320, height: 320, borderRadius: "50%", background: "radial-gradient(circle, rgba(232,71,26,0.22) 0%, transparent 70%)", filter: "blur(60px)" }} />
        <div className="absolute pointer-events-none" style={{ bottom: "20%", right: "5%", width: 220, height: 220, borderRadius: "50%", background: "radial-gradient(circle, rgba(245,183,49,0.14) 0%, transparent 70%)", filter: "blur(45px)" }} />
        <div className="absolute pointer-events-none" style={{ top: "55%", left: "5%", width: 180, height: 180, borderRadius: "50%", background: "radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 70%)", filter: "blur(40px)" }} />
        {/* Grid */}
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
            🔥 India's #1 Coding Platform
          </div>
          <h2 className="font-display font-black text-[2.6rem] xl:text-5xl text-white leading-[1.08] mb-4">
            Start your<br />
            <span className="gradient-text">coding journey</span><br />
            today.
          </h2>
          <p className="text-white/45 text-sm leading-relaxed mb-8 max-w-xs">
            Join 1,50,000+ learners building India's tech future with expert-led courses.
          </p>

          <div className="space-y-4">
            {FEATURES.map((f) => (
              <div key={f.title} className="flex items-start gap-3.5">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-base flex-shrink-0 mt-0.5"
                  style={{ background: "rgba(232,71,26,0.12)", border: "1px solid rgba(232,71,26,0.2)" }}>
                  {f.icon}
                </div>
                <div>
                  <p className="text-white/88 text-sm font-semibold leading-tight">{f.title}</p>
                  <p className="text-white/35 text-xs mt-0.5">{f.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom social proof */}
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2.5">
            <div className="flex -space-x-2.5">
              {AVATARS.map((a, i) => (
                <div key={i} className="w-8 h-8 rounded-full border-2 flex items-center justify-center text-[10px] font-black text-white flex-shrink-0"
                  style={{ background: a.color, borderColor: "#130800" }}>
                  {a.initials}
                </div>
              ))}
            </div>
            <span className="text-white/40 text-xs">+1,50,000 learners enrolled</span>
          </div>
          <div className="flex items-center gap-1.5">
            {[1,2,3,4,5].map((i) => <span key={i} style={{ color: "#F5B731", fontSize: 14 }}>★</span>)}
            <span className="text-white/35 text-xs ml-1">4.8 / 5 · 12,000+ reviews</span>
          </div>
        </div>
      </div>

      {/* ── RIGHT form panel ───────────────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-10 py-12"
        style={{ background: "linear-gradient(180deg, #0A0A0F 0%, #0e0b18 100%)" }}>
        <div className="w-full max-w-md animate-fade-in">

          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2.5 mb-8">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center font-black text-white text-lg select-none">C</div>
            <span className="font-display font-black text-xl text-white">CodeLearn</span>
          </div>

          <div className="rounded-3xl p-7 sm:p-8"
            style={{ background: "rgba(17,17,24,0.9)", border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 0 0 1px rgba(255,255,255,0.03), 0 32px 80px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)" }}>

            <div className="mb-7">
              <h1 className="font-display font-black text-2xl sm:text-[1.75rem] mb-1.5">Welcome back 👋</h1>
              <p className="text-white/40 text-sm">Sign in to continue learning</p>
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
                Continue with Google
              </a>
              <a href={`${API_URL}/auth/github`}
                className="flex items-center justify-center gap-3 w-full py-2.5 rounded-xl text-sm font-medium text-white/75 no-underline transition-all"
                style={{ border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.08)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.18)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; }}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="white">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
                Continue with GitHub
              </a>
            </div>

            <div className="flex items-center gap-3 mb-5">
              <div className="flex-1 h-px bg-white/[0.07]" />
              <span className="text-xs text-white/25">or sign in with email</span>
              <div className="flex-1 h-px bg-white/[0.07]" />
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-white/40 mb-1.5 block uppercase tracking-wide">Email</label>
                <input className="input" type="email" placeholder="you@example.com"
                  value={form.email} onChange={(e) => set("email", e.target.value)} />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-white/40 uppercase tracking-wide">Password</label>
                  <Link to="/forgot-password" className="text-xs text-primary hover:text-primary-light transition-colors">Forgot?</Link>
                </div>
                <div className="relative">
                  <input className="input pr-10" type={showPass ? "text" : "password"} placeholder="••••••••"
                    value={form.password} onChange={(e) => set("password", e.target.value)} />
                  <button type="button" onClick={() => setShowPass(p => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors text-xs">
                    {showPass ? "Hide" : "Show"}
                  </button>
                </div>
              </div>

              {error && (
                <div className="flex items-start gap-2.5 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-400">
                  <span className="mt-0.5 flex-shrink-0">⚠</span> {error}
                </div>
              )}

              <button type="submit" className="w-full justify-center py-3.5 text-sm font-bold rounded-xl text-white transition-all flex items-center gap-2 mt-1"
                disabled={isLoading}
                style={{ background: isLoading ? "rgba(232,71,26,0.6)" : "linear-gradient(135deg,#E8471A,#c9360d)", boxShadow: isLoading ? "none" : "0 4px 20px rgba(232,71,26,0.35), 0 1px 0 rgba(255,255,255,0.1) inset", cursor: isLoading ? "not-allowed" : "pointer" }}>
                {isLoading ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Signing in…</> : "Sign in →"}
              </button>
            </form>

            <p className="text-center text-sm text-white/35 mt-5">
              New to CodeLearn?{" "}
              <Link to="/register" className="text-primary font-semibold hover:text-primary-light transition-colors">
                Create free account
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
