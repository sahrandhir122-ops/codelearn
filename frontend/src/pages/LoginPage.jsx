import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import useAuthStore from "../store/useAuthStore";

const API_URL = import.meta.env.VITE_API_URL || "/api";

export default function LoginPage() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const { login, isLoading } = useAuthStore();
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.email || !form.password) {
      setError("Please fill in all fields.");
      return;
    }
    const result = await login(form);
    if (result.success) {
      navigate(params.get("redirect") || "/");
    } else {
      setError(result.message);
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md animate-fade-in">
        {/* Card */}
        <div className="bg-bg-card border border-white/[0.1] rounded-3xl p-8">
          <div className="mb-8">
            <h1 className="font-display font-black text-3xl mb-2">Welcome back</h1>
            <p className="text-white/40 text-sm">Sign in to access your courses</p>
          </div>

          {/* OAuth */}
          <div className="space-y-3 mb-6">
            {[
              { icon: "🔵", label: "Continue with Google", href: `${API_URL}/auth/google` },
              { icon: "⬛", label: "Continue with GitHub", href: `${API_URL}/auth/github` },
              { icon: "🍎", label: "Continue with Apple", href: "#" },
            ].map((o) => (
              <a key={o.label} href={o.href}
                className="btn-ghost w-full justify-center py-3 text-sm no-underline">
                <span className="text-base">{o.icon}</span> {o.label}
              </a>
            ))}
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-px bg-white/[0.07]" />
            <span className="text-xs text-white/30">or sign in with email</span>
            <div className="flex-1 h-px bg-white/[0.07]" />
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-white/40 mb-1.5 block">Email</label>
              <input className="input" type="email" placeholder="you@example.com"
                value={form.email} onChange={(e) => set("email", e.target.value)} />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-white/40">Password</label>
                <Link to="/forgot-password" className="text-xs text-primary hover:text-primary-light">
                  Forgot password?
                </Link>
              </div>
              <input className="input" type="password" placeholder="••••••••"
                value={form.password} onChange={(e) => set("password", e.target.value)} />
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-400">
                {error}
              </div>
            )}

            <button type="submit" className="btn-primary w-full justify-center py-3.5 text-base mt-2"
              disabled={isLoading}>
              {isLoading ? "Signing in…" : "Sign in →"}
            </button>
          </form>

          <p className="text-center text-sm text-white/40 mt-6">
            New to CodeLearn?{" "}
            <Link to="/register" className="text-primary font-semibold hover:text-primary-light">
              Create account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
