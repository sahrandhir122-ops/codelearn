import { useState } from "react";
import { paymentAPI } from "../api";
import useAuthStore from "../store/useAuthStore";
import toast from "react-hot-toast";

// NOTE: Install with: npm install @stripe/stripe-js @stripe/react-stripe-js
// For now this is a standalone card form that calls the backend directly

export default function StripePayment({ course, onClose, onSuccess }) {
  const { user, enrollCourse } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); // 1=form, 2=success
  const [form, setForm] = useState({ card: "", expiry: "", cvv: "", name: "" });
  const [error, setError] = useState("");

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const discount = course ? Math.round(((course.originalPrice - course.price) / course.originalPrice) * 100) : 0;

  const handlePay = async () => {
    setError("");
    if (!form.card || !form.expiry || !form.cvv || !form.name) {
      setError("Please fill in all card details.");
      return;
    }
    setLoading(true);
    try {
      // Simulate payment success for demo
      // In production: integrate Stripe.js confirmCardPayment here
      await new Promise(r => setTimeout(r, 1500));
      enrollCourse && enrollCourse(course._id);
      setStep(2);
      setTimeout(() => {
        onSuccess && onSuccess();
        toast.success(`🎉 Enrolled in ${course.title}!`);
      }, 1800);
    } catch (err) {
      setError(err.response?.data?.message || "Payment failed. Please try again.");
      setLoading(false);
    }
  };

  if (!course) return null;

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, backdropFilter: "blur(6px)" }}
      onClick={onClose}
    >
      <div
        style={{ background: "#111118", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 24, padding: 32, width: "100%", maxWidth: 440, position: "relative" }}
        onClick={e => e.stopPropagation()}
      >
        <button onClick={onClose} style={{ position: "absolute", top: 16, right: 16, background: "none", color: "rgba(255,255,255,0.4)", fontSize: 22, border: "none", cursor: "pointer" }}>×</button>

        {step === 1 ? (
          <>
            <div style={{ marginBottom: 24 }}>
              <h2 style={{ fontSize: 22, fontWeight: 800, fontFamily: "Syne, sans-serif", marginBottom: 4, color: "#F0EEE9" }}>Complete Purchase</h2>
              <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 14 }}>You're enrolling in {course.title}</p>
            </div>

            {/* Order summary */}
            <div style={{ background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.2)", borderRadius: 12, padding: 16, marginBottom: 20 }}>
              <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12 }}>
                <img src={course.thumbnail} alt="" style={{ width: 60, height: 42, objectFit: "cover", borderRadius: 8 }} />
                <div>
                  <p style={{ fontSize: 14, fontWeight: 600, color: "#F0EEE9" }}>{course.title}</p>
                  <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>{course.instructorName}</p>
                </div>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                  <span style={{ fontSize: 22, fontWeight: 800, fontFamily: "Syne, sans-serif", color: "#F0EEE9" }}>₹{course.price?.toLocaleString("en-IN")}</span>
                  <span style={{ fontSize: 13, color: "rgba(255,255,255,0.3)", textDecoration: "line-through" }}>₹{course.originalPrice?.toLocaleString("en-IN")}</span>
                </div>
                <span style={{ fontSize: 12, color: "#2ECC71", fontWeight: 600 }}>{discount}% off</span>
              </div>
            </div>

            {/* Card form */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 16 }}>
              <div>
                <label style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", display: "block", marginBottom: 6 }}>Card Number</label>
                <input
                  placeholder="4242 4242 4242 4242"
                  value={form.card}
                  onChange={e => set("card", e.target.value.replace(/\s/g, "").replace(/(.{4})/g, "$1 ").trim().slice(0, 19))}
                  style={{ width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#F0EEE9", padding: "11px 14px", borderRadius: 10, fontSize: 14, outline: "none", boxSizing: "border-box", fontFamily: "monospace", letterSpacing: 2 }}
                />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                <div>
                  <label style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", display: "block", marginBottom: 6 }}>Expiry</label>
                  <input placeholder="MM/YY" maxLength={5} value={form.expiry} onChange={e => set("expiry", e.target.value)}
                    style={{ width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#F0EEE9", padding: "11px 14px", borderRadius: 10, fontSize: 14, outline: "none", boxSizing: "border-box" }} />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", display: "block", marginBottom: 6 }}>CVV</label>
                  <input type="password" placeholder="•••" maxLength={4} value={form.cvv} onChange={e => set("cvv", e.target.value)}
                    style={{ width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#F0EEE9", padding: "11px 14px", borderRadius: 10, fontSize: 14, outline: "none", boxSizing: "border-box" }} />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", display: "block", marginBottom: 6 }}>Name</label>
                  <input placeholder="Full Name" value={form.name} onChange={e => set("name", e.target.value)}
                    style={{ width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#F0EEE9", padding: "11px 14px", borderRadius: 10, fontSize: 14, outline: "none", boxSizing: "border-box" }} />
                </div>
              </div>
            </div>

            {/* Test card hint */}
            <div style={{ background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.15)", borderRadius: 8, padding: "8px 12px", marginBottom: 14, fontSize: 12, color: "rgba(255,255,255,0.4)" }}>
              🧪 Test: <strong style={{ color: "#F0EEE9" }}>4242 4242 4242 4242</strong> · 12/28 · 123
            </div>

            {error && (
              <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 10, padding: "10px 14px", marginBottom: 14, fontSize: 13, color: "#EF4444" }}>{error}</div>
            )}

            <button onClick={handlePay} disabled={loading}
              style={{ width: "100%", background: "#3B82F6", color: "#fff", border: "none", borderRadius: 12, padding: 14, fontSize: 15, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1, fontFamily: "DM Sans, sans-serif", marginBottom: 10 }}>
              {loading ? "Processing…" : `Pay ₹${course.price?.toLocaleString("en-IN")} →`}
            </button>
            <button onClick={onClose}
              style={{ width: "100%", background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: 12, fontSize: 14, cursor: "pointer", fontFamily: "DM Sans, sans-serif" }}>
              Cancel
            </button>
            <p style={{ textAlign: "center", fontSize: 11, color: "rgba(255,255,255,0.2)", marginTop: 12 }}>🔒 Secured by Stripe · 256-bit SSL</p>
          </>
        ) : (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <div style={{ width: 72, height: 72, borderRadius: "50%", background: "rgba(46,204,113,0.15)", border: "2px solid #2ECC71", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", fontSize: 32 }}>✓</div>
            <h2 style={{ fontSize: 24, fontWeight: 800, fontFamily: "Syne, sans-serif", marginBottom: 8, color: "#F0EEE9" }}>Payment Successful!</h2>
            <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 14 }}>You're now enrolled in <strong style={{ color: "#F0EEE9" }}>{course.title}</strong></p>
            <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 12, marginTop: 8 }}>Redirecting…</p>
          </div>
        )}
      </div>
    </div>
  );
}
