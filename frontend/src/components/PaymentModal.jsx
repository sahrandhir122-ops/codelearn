import { useState, useEffect } from "react";
import toast from "react-hot-toast";

/* ── Utilities ──────────────────────────────────────────────────── */
const loadRazorpayScript = () =>
  new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });

/* ── Card Brand SVG Logos ──────────────────────────────────────── */
const CardLogo = ({ brand }) => {
  const base = "h-6 w-auto rounded";
  if (brand === "visa") return (
    <svg className={base} viewBox="0 0 50 16" xmlns="http://www.w3.org/2000/svg">
      <rect width="50" height="16" rx="3" fill="#1A1F71"/>
      <text x="25" y="12" textAnchor="middle" fill="#FFFFFF" fontSize="10" fontWeight="bold" fontFamily="Arial">VISA</text>
    </svg>
  );
  if (brand === "mastercard") return (
    <svg className={base} viewBox="0 0 38 24" xmlns="http://www.w3.org/2000/svg">
      <rect width="38" height="24" rx="3" fill="#252525"/>
      <circle cx="14" cy="12" r="8" fill="#EB001B"/>
      <circle cx="24" cy="12" r="8" fill="#F79E1B"/>
      <path d="M19 6.8A8 8 0 0 1 22.2 12 8 8 0 0 1 19 17.2 8 8 0 0 1 15.8 12 8 8 0 0 1 19 6.8z" fill="#FF5F00"/>
    </svg>
  );
  if (brand === "amex") return (
    <svg className={base} viewBox="0 0 50 16" xmlns="http://www.w3.org/2000/svg">
      <rect width="50" height="16" rx="3" fill="#007BC1"/>
      <text x="25" y="12" textAnchor="middle" fill="#FFFFFF" fontSize="7" fontWeight="bold" fontFamily="Arial">AMERICAN EXPRESS</text>
    </svg>
  );
  if (brand === "rupay") return (
    <svg className={base} viewBox="0 0 50 16" xmlns="http://www.w3.org/2000/svg">
      <rect width="50" height="16" rx="3" fill="#1e7b34"/>
      <text x="25" y="12" textAnchor="middle" fill="#FFFFFF" fontSize="9" fontWeight="bold" fontFamily="Arial">RuPay</text>
    </svg>
  );
  return null;
};

/* ══════════════════════════════════════════════════════════════
   PaymentModal Component
══════════════════════════════════════════════════════════════ */
export default function PaymentModal({ isOpen, onClose, orderData, user, description, onVerify }) {
  const [method,      setMethod]      = useState("card");
  const [busy,        setBusy]        = useState(false);
  const [scriptReady, setScriptReady] = useState(false);

  useEffect(() => {
    if (isOpen) loadRazorpayScript().then(setScriptReady);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setMethod("card");
      setBusy(false);
    }
  }, [isOpen]);

  if (!isOpen || !orderData) return null;

  const amountInRs    = orderData.amount / 100;
  const amountDisplay = `₹${amountInRs.toLocaleString("en-IN")}`;
  const rzpKey        = orderData.keyId || import.meta.env.VITE_RAZORPAY_KEY_ID;
  const isMockMode    = orderData.mockMode === true || orderData.keyId === "mock_key";

  /* ── Razorpay popup (handles Card, UPI, Wallet, Netbanking) ── */
  const handleRazorpayPay = (preferCard = false) => {
    if (!scriptReady) { toast.error("Payment gateway not ready, please wait."); return; }
    setBusy(true);
    const options = {
      key: rzpKey, amount: orderData.amount,
      currency: orderData.currency || "INR", order_id: orderData.orderId,
      name: "CodeLearn", description, image: "/logo.png",
      prefill: { name: user?.name || "", email: user?.email || "", contact: user?.phone || "" },
      theme: { color: "#E8471A" },
      // When coming from the Card tab, open Razorpay directly on the Card screen
      ...(preferCard && {
        config: {
          display: {
            preferences: { show_default_blocks: false },
            blocks: { card: { name: "Pay by Card", instruments: [{ method: "card" }] } },
            sequence: ["block.card"],
          },
        },
      }),
      handler: async (response) => {
        try {
          await onVerify({
            razorpayOrderId:   response.razorpay_order_id,
            razorpayPaymentId: response.razorpay_payment_id,
            razorpaySignature: response.razorpay_signature,
          });
          onClose();
        } catch {
          toast.error("Payment verification failed. Contact support.");
          setBusy(false);
        }
      },
      modal: { ondismiss: () => setBusy(false), escape: true },
    };
    const rzp = new window.Razorpay(options);
    rzp.on("payment.failed", (resp) => {
      toast.error(`Payment failed: ${resp.error?.description || "Unknown error"}`);
      setBusy(false);
    });
    rzp.open();
  };

  /* ── Mock / test mode ───────────────────────────────────────── */
  const handleMockPay = async () => {
    setBusy(true);
    try {
      await onVerify({
        razorpayOrderId:   orderData.orderId,
        razorpayPaymentId: `mock_pay_${Date.now()}`,
        razorpaySignature: `mock_sig_${Date.now()}`,
      });
      onClose();
    } catch {
      toast.error("Test payment failed. Check backend logs.");
      setBusy(false);
    }
  };

  /* ── Master handler ─────────────────────────────────────────── */
  const handlePay = () => {
    if (busy) return;
    if (isMockMode)        return handleMockPay();
    if (method === "card") return handleRazorpayPay(true);   // open Razorpay on Card screen
    return handleRazorpayPay(false);
  };

  /* ══════════════════════════════════════════════════════════════
     RENDER
  ══════════════════════════════════════════════════════════════ */
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/75 backdrop-blur-sm"
        onClick={() => { if (!busy) onClose(); }}
      />

      <div className="relative w-full max-w-[440px] bg-[#1a1a1a] border border-white/[0.09] rounded-2xl shadow-2xl overflow-hidden animate-fade-in">

        {/* ── Close button ── */}
        {!busy && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 w-7 h-7 flex items-center justify-center rounded-full text-white/30 hover:text-white/60 hover:bg-white/[0.08] transition-all text-lg"
          >
            ✕
          </button>
        )}

        {/* ── Scrollable body ── */}
        <div className="px-7 pt-6 pb-7 overflow-y-auto max-h-[calc(100vh-60px)]">

          {/* ── Mock mode banner ── */}
          {isMockMode && (
            <div className="mb-5 px-4 py-3 rounded-xl border border-amber-400/25 bg-amber-400/[0.07] flex items-start gap-3">
              <span className="text-base mt-0.5">🧪</span>
              <div>
                <p className="text-sm font-semibold text-amber-400 leading-tight">Test Mode — No real charge</p>
                <p className="text-xs text-amber-400/60 mt-0.5 leading-relaxed">
                  Razorpay keys not configured. Fill the form and click Subscribe — enrollment will be simulated.
                </p>
              </div>
            </div>
          )}

          {/* ── Header ── */}
          <h2 className="text-[17px] font-bold text-white mb-1 leading-snug">Payment method</h2>
          <p className="text-[12px] text-white/35 mb-5 leading-relaxed">
            {description} · <span className="text-white/55 font-semibold">{amountDisplay}</span>
          </p>

          {/* ── Method toggle ── */}
          <div className="flex rounded-xl border border-white/[0.09] overflow-hidden mb-5">
            {[
              { id: "card",     label: "Credit / Debit Card", icon: "💳" },
              { id: "razorpay", label: "Razorpay / UPI",      icon: "⚡" },
            ].map((m) => (
              <button
                key={m.id}
                disabled={busy}
                onClick={() => setMethod(m.id)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[12.5px] font-semibold transition-all
                  ${method === m.id
                    ? "bg-white/[0.10] text-white"
                    : "bg-transparent text-white/35 hover:text-white/60 hover:bg-white/[0.05]"}
                  disabled:opacity-40 disabled:pointer-events-none`}
              >
                <span className="text-sm">{m.icon}</span>{m.label}
              </button>
            ))}
          </div>

          {/* ══════════════════════════════════════════════════════
              CARD PANEL — opens Razorpay on the Card screen
          ══════════════════════════════════════════════════════ */}
          {method === "card" && (
            <div className="space-y-4">
              <div className="p-4 bg-white/[0.03] rounded-xl border border-white/[0.07]">
                <p className="text-[13px] text-white/70 font-semibold mb-1">Pay securely with your card</p>
                <p className="text-[12px] text-white/45 leading-relaxed mb-3">
                  Click <strong className="text-white/65">Subscribe</strong> to open Razorpay's secure
                  card checkout — your card details are entered directly in Razorpay's encrypted form.
                </p>
                {/* Card brand logos */}
                <div className="flex items-center gap-2">
                  {["visa", "mastercard", "amex", "rupay"].map((b) => (
                    <CardLogo key={b} brand={b} />
                  ))}
                </div>
              </div>
              <div className="flex items-start gap-2 px-1">
                <span className="text-green-400 text-sm mt-0.5">✓</span>
                <p className="text-[11px] text-white/30 leading-relaxed">
                  256-bit TLS encryption · Card details never touch CodeLearn's servers · Powered by Razorpay
                </p>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════
              RAZORPAY PANEL
          ══════════════════════════════════════════════════════ */}
          {method === "razorpay" && (
            <div className="space-y-4">
              <div className="p-4 bg-white/[0.03] rounded-xl border border-white/[0.07]">
                <p className="text-[13px] text-white/55 leading-relaxed">
                  Click <strong className="text-white/80">Subscribe</strong> to open the Razorpay secure
                  checkout — supports UPI, Wallets, Net Banking, Cards and more.
                </p>
                <div className="flex flex-wrap gap-2 mt-3">
                  {["Google Pay","PhonePe","Paytm","BHIM UPI","Visa","Mastercard","RuPay"].map((p) => (
                    <span key={p} className="text-[10px] bg-white/[0.06] px-2 py-1 rounded-md text-white/35 font-medium">{p}</span>
                  ))}
                </div>
              </div>
              <p className="text-[11px] text-white/25 leading-relaxed">
                Total: <strong className="text-white/45">{amountDisplay}</strong> · Secured by Razorpay 256-bit TLS encryption
              </p>
            </div>
          )}

          {/* ── Subscribe / Pay button ── */}
          <button
            onClick={handlePay}
            disabled={busy || (!isMockMode && !scriptReady)}
            className="w-full mt-5 py-3 text-[14px] font-semibold rounded-xl transition-all
              bg-[#3a3a3a] hover:bg-[#444444] active:scale-[0.99] text-white/90
              disabled:opacity-40 disabled:pointer-events-none shadow-sm"
          >
            {busy ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"/>
                  <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="4" className="opacity-75"/>
                </svg>
                Processing…
              </span>
            ) : isMockMode
              ? `🧪 Simulate Payment (${amountDisplay})`
              : !scriptReady
              ? "Loading…"
              : method === "card"
              ? `Pay with Card — ${amountDisplay}`
              : "Subscribe"
            }
          </button>

          {/* Secure note */}
          <p className="flex items-center justify-center gap-1.5 text-[11px] text-white/20 mt-3">
            <span>🔒</span> Payments secured by Razorpay · 256-bit TLS
          </p>
        </div>
      </div>
    </div>
  );
}
