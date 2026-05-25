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

/** Luhn algorithm — validates card number */
function luhnOk(num) {
  const digits = num.replace(/\D/g, "").split("").reverse().map(Number);
  const sum = digits.reduce((acc, d, i) => {
    if (i % 2 !== 0) { d *= 2; if (d > 9) d -= 9; }
    return acc + d;
  }, 0);
  return sum % 10 === 0;
}

/** Detect card brand from first digits */
function detectBrand(num) {
  const n = num.replace(/\D/g, "");
  if (/^4/.test(n))               return "visa";
  if (/^5[1-5]|^2[2-7]/.test(n)) return "mastercard";
  if (/^6/.test(n))               return "rupay";
  if (/^3[47]/.test(n))           return "amex";
  return null;
}

/* ── Card Brand SVG Logos ──────────────────────────────────────── */
const CardLogo = ({ brand, dim = false }) => {
  const base = `h-6 w-auto rounded transition-opacity ${dim ? "opacity-25" : "opacity-100"}`;

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
  // Discover placeholder
  return (
    <svg className={base} viewBox="0 0 50 16" xmlns="http://www.w3.org/2000/svg">
      <rect width="50" height="16" rx="3" fill="#231F20"/>
      <text x="25" y="12" textAnchor="middle" fill="#FFFFFF" fontSize="7.5" fontWeight="bold" fontFamily="Arial">DISCOVER</text>
    </svg>
  );
};

/* ── All four brand logos shown in card field (like Stripe) ──── */
const CardBrandRow = ({ activeBrand }) => (
  <div className="flex items-center gap-1">
    {["visa","mastercard","amex","rupay"].map((b) => (
      <CardLogo key={b} brand={b} dim={activeBrand !== null && activeBrand !== b} />
    ))}
  </div>
);

/* ── CVC icon ────────────────────────────────────────────────── */
const CvcIcon = () => (
  <svg width="28" height="20" viewBox="0 0 38 26" fill="none" xmlns="http://www.w3.org/2000/svg" className="opacity-40">
    <rect x="1" y="1" width="36" height="24" rx="4" stroke="currentColor" strokeWidth="1.5"/>
    <rect x="1" y="6" width="36" height="5" fill="currentColor" opacity="0.5"/>
    <rect x="22" y="15" width="12" height="4" rx="2" fill="currentColor"/>
  </svg>
);

/* ── Countries List ─────────────────────────────────────────── */
const COUNTRIES = [
  "Afghanistan","Albania","Algeria","Argentina","Australia","Austria","Bangladesh",
  "Belgium","Brazil","Canada","Chile","China","Colombia","Croatia","Czech Republic",
  "Denmark","Egypt","Finland","France","Germany","Ghana","Greece","Hungary","India",
  "Indonesia","Iran","Iraq","Ireland","Israel","Italy","Japan","Jordan","Kenya",
  "Malaysia","Mexico","Morocco","Nepal","Netherlands","New Zealand","Nigeria","Norway",
  "Pakistan","Peru","Philippines","Poland","Portugal","Romania","Russia","Saudi Arabia",
  "Singapore","South Africa","South Korea","Spain","Sri Lanka","Sweden","Switzerland",
  "Thailand","Turkey","UAE","Ukraine","United Kingdom","United States","Vietnam",
];

/* ── Input Field wrapper ────────────────────────────────────── */
function Field({ label, error, children }) {
  return (
    <div>
      {label && <label className="block text-sm font-medium text-white/70 mb-1.5">{label}</label>}
      {children}
      {error && <p className="text-xs text-red-400 mt-1.5 flex items-center gap-1"><span>⚠</span>{error}</p>}
    </div>
  );
}

const inputCls = (err) =>
  `w-full bg-[#2a2a2a] border ${err ? "border-red-500/60" : "border-white/[0.12]"} ` +
  `rounded-lg px-3.5 py-2.5 text-sm text-white placeholder-white/25 ` +
  `focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/30 transition`;

/* ── PaymentModal ───────────────────────────────────────────────── */
export default function PaymentModal({ isOpen, onClose, orderData, user, description, onVerify }) {
  const [method,      setMethod]      = useState("razorpay");
  const [cardNumber,  setCardNumber]  = useState("");
  const [cardName,    setCardName]    = useState("");
  const [country,     setCountry]     = useState("India");
  const [address,     setAddress]     = useState("");
  const [expiry,      setExpiry]      = useState("");
  const [cvv,         setCvv]         = useState("");
  const [diffName,    setDiffName]    = useState(false);
  const [invoiceName, setInvoiceName] = useState("");
  const [agreed,      setAgreed]      = useState(false);
  const [errors,      setErrors]      = useState({});
  const [busy,        setBusy]        = useState(false);
  const [scriptReady, setScriptReady] = useState(false);

  useEffect(() => {
    if (isOpen) loadRazorpayScript().then(setScriptReady);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setMethod("razorpay"); setCardNumber(""); setCardName(user?.name || "");
      setCountry("India"); setAddress(""); setExpiry(""); setCvv("");
      setDiffName(false); setInvoiceName(""); setAgreed(false);
      setErrors({}); setBusy(false);
    } else {
      setCardName(user?.name || "");
    }
  }, [isOpen, user]);

  if (!isOpen || !orderData) return null;

  const brand        = detectBrand(cardNumber);
  const amountInRs   = orderData.amount / 100;
  const amountDisplay = `₹${amountInRs.toLocaleString("en-IN")}`;
  const rzpKey       = orderData.keyId || import.meta.env.VITE_RAZORPAY_KEY_ID;
  const isMockMode   = orderData.mockMode === true || orderData.keyId === "mock_key";

  /* Card number formatting */
  const handleCardNumChange = (e) => {
    const raw = e.target.value.replace(/\D/g, "").slice(0, 16);
    setCardNumber(raw.replace(/(.{4})(?=.)/g, "$1 "));
  };

  /* Expiry formatting */
  const handleExpiryChange = (e) => {
    const raw = e.target.value.replace(/\D/g, "").slice(0, 4);
    if (raw.length > 2) setExpiry(`${raw.slice(0, 2)} / ${raw.slice(2)}`);
    else setExpiry(raw);
  };

  /* Validation */
  const validateCard = () => {
    const errs = {};
    const num = cardNumber.replace(/\s/g, "");
    if (num.length < 16)       errs.cardNumber = "Card number must be 16 digits";
    else if (!luhnOk(num))     errs.cardNumber = "Invalid card number";
    if (!cardName.trim())      errs.cardName   = "Full name is required";
    const [mm = "", yy = ""]   = (expiry || "").replace(" ", "").split("/");
    const iMonth = parseInt(mm, 10);
    const iYear  = parseInt(yy.trim(), 10);
    if (!mm || mm.length < 2 || iMonth < 1 || iMonth > 12) errs.expiry = "Invalid month";
    else if (!yy.trim() || yy.trim().length < 2)            errs.expiry = "Invalid year";
    else if (new Date(2000 + iYear, iMonth - 1) < new Date()) errs.expiry = "Card has expired";
    if (cvv.length < 3)        errs.cvv    = "CVV must be 3–4 digits";
    if (!agreed)               errs.agreed = "You must agree to the terms to continue";
    return errs;
  };

  /* Razorpay popup */
  const handleRazorpayPay = () => {
    if (!scriptReady) { toast.error("Payment gateway not ready, please wait."); return; }
    setBusy(true);
    const options = {
      key: rzpKey, amount: orderData.amount,
      currency: orderData.currency || "INR", order_id: orderData.orderId,
      name: "CodeLearn", description, image: "/logo.png",
      prefill: { name: user?.name || "", email: user?.email || "", contact: user?.phone || "" },
      theme: { color: "#E8471A" },
      handler: async (response) => {
        try {
          await onVerify({ razorpayOrderId: response.razorpay_order_id,
            razorpayPaymentId: response.razorpay_payment_id,
            razorpaySignature: response.razorpay_signature });
          onClose();
        } catch { toast.error("Payment verification failed. Contact support."); setBusy(false); }
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

  /* Direct card via Razorpay API */
  const handleCardPay = async () => {
    const errs = validateCard();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    if (!scriptReady) { toast.error("Payment gateway not ready, please wait."); return; }
    setBusy(true);
    try {
      const expiryClean = expiry.replace(/\s/g, "");
      const [mm, yy] = expiryClean.split("/");
      const rzp = new window.Razorpay({ key: rzpKey });
      rzp.createPayment({
        amount: orderData.amount, currency: orderData.currency || "INR",
        order_id: orderData.orderId, method: "card",
        card: { number: cardNumber.replace(/\s/g, ""), name: cardName.trim(),
          expiry_month: mm, expiry_year: `20${yy.trim()}`, cvv },
        email: user?.email || "", contact: user?.phone || "9999999999",
      });
      rzp.on("payment.success", async (data) => {
        try {
          await onVerify({ razorpayOrderId: data.razorpay_order_id,
            razorpayPaymentId: data.razorpay_payment_id,
            razorpaySignature: data.razorpay_signature });
          onClose();
        } catch { toast.error("Payment verification failed. Contact support."); setBusy(false); }
      });
      rzp.on("payment.error", (resp) => {
        toast.error(resp.error?.description || "Card payment failed. Please check your details.");
        setBusy(false);
      });
    } catch {
      toast.error("Failed to process card payment. Try Razorpay instead.");
      setBusy(false);
    }
  };

  /* Mock/test mode */
  const handleMockPay = async () => {
    setBusy(true);
    try {
      await onVerify({ razorpayOrderId: orderData.orderId,
        razorpayPaymentId: `mock_pay_${Date.now()}`,
        razorpaySignature: `mock_sig_${Date.now()}` });
      onClose();
    } catch { toast.error("Test payment failed. Check backend logs."); setBusy(false); }
  };

  const handlePay = () => {
    if (busy) return;
    if (isMockMode)                  handleMockPay();
    else if (method === "razorpay")  handleRazorpayPay();
    else                             handleCardPay();
  };

  /* ── Render ── */
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm"
           onClick={() => { if (!busy) onClose(); }} />

      <div className="relative w-full max-w-[440px] bg-[#1c1c1c] border border-white/[0.10] rounded-2xl shadow-2xl animate-fade-in overflow-hidden">

        {/* ── Header ── */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-white/[0.07]">
          <div className="flex-1 min-w-0 pr-4">
            <h2 className="font-display font-bold text-lg leading-tight">Complete Purchase</h2>
            <p className="text-white/40 text-sm mt-0.5 truncate">{description}</p>
          </div>
          {!busy && (
            <button onClick={onClose}
              className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors text-xl">
              ✕
            </button>
          )}
        </div>

        {/* ── Amount Banner ── */}
        <div className="px-6 py-3 bg-primary/[0.08] border-b border-white/[0.07] flex items-center justify-between">
          <span className="text-sm text-white/50">Total payable</span>
          <span className="font-display font-black text-2xl text-white">{amountDisplay}</span>
        </div>

        <div className="px-6 pt-5 pb-6 overflow-y-auto max-h-[calc(100vh-200px)]">

          {/* ── TEST MODE BANNER ── */}
          {isMockMode && (
            <div className="mb-4 px-4 py-3 rounded-xl border border-amber-400/30 bg-amber-400/[0.08] flex items-start gap-3">
              <span className="text-lg mt-0.5">🧪</span>
              <div>
                <p className="text-sm font-semibold text-amber-400">Test Mode — No real payment</p>
                <p className="text-xs text-amber-400/70 mt-0.5 leading-relaxed">
                  Razorpay keys not configured. Any payment below will simulate enrollment without charging.
                </p>
              </div>
            </div>
          )}

          {/* ── Method Tabs ── */}
          <div className="flex rounded-xl overflow-hidden border border-white/[0.10] mb-5">
            {[
              { id: "razorpay", label: "Razorpay", icon: "🏦" },
              { id: "card",     label: "Card",      icon: "💳" },
            ].map((m) => (
              <button key={m.id} disabled={busy} onClick={() => setMethod(m.id)}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold transition-all
                  ${method === m.id ? "bg-primary text-white" : "bg-white/[0.04] text-white/50 hover:text-white/80 hover:bg-white/[0.07]"}
                  disabled:opacity-50 disabled:pointer-events-none`}>
                <span>{m.icon}</span>{m.label}
              </button>
            ))}
          </div>

          {/* ── Razorpay info panel ── */}
          {method === "razorpay" && (
            <div className="mb-4 p-4 bg-white/[0.03] rounded-xl border border-white/[0.07]">
              <p className="text-sm text-white/60 leading-relaxed">
                Click <strong className="text-white/90">Pay Now</strong> to open the Razorpay secure
                checkout — UPI, Wallets, Net Banking, Cards and more.
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                {["Google Pay","PhonePe","Paytm","BHIM UPI","Visa","Mastercard","RuPay"].map((p) => (
                  <span key={p} className="text-[10px] bg-white/[0.06] px-2 py-1 rounded-md text-white/40">{p}</span>
                ))}
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════
              CARD FORM — Stripe-style
          ══════════════════════════════════════════════════════ */}
          {method === "card" && (
            <div className="space-y-4">

              {/* Payment method label */}
              <p className="text-xs font-semibold text-white/35 uppercase tracking-widest -mb-1">
                Payment method
              </p>

              {/* Full name */}
              <Field label="Full name" error={errors.cardName}>
                <input type="text" autoComplete="cc-name"
                  placeholder={user?.name || "Your full name"}
                  value={cardName}
                  onChange={(e) => setCardName(e.target.value)}
                  disabled={busy}
                  className={inputCls(errors.cardName)} />
              </Field>

              {/* Country */}
              <Field label="Country or region">
                <div className="relative">
                  <select value={country} onChange={(e) => setCountry(e.target.value)}
                    disabled={busy}
                    className={`${inputCls(false)} appearance-none pr-9 cursor-pointer`}>
                    {COUNTRIES.map((c) => (
                      <option key={c} value={c} className="bg-[#2a2a2a]">{c}</option>
                    ))}
                  </select>
                  {/* Chevron */}
                  <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none"
                    viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd"/>
                  </svg>
                </div>
              </Field>

              {/* Address */}
              <Field label="Address line 1">
                <input type="text" autoComplete="street-address"
                  placeholder=""
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  disabled={busy}
                  className={inputCls(false)} />
              </Field>

              {/* Card Number — full width with brand logos */}
              <Field label="Card number" error={errors.cardNumber}>
                <div className="relative">
                  <input type="text" inputMode="numeric" autoComplete="cc-number"
                    placeholder="1234 1234 1234 1234"
                    value={cardNumber}
                    onChange={handleCardNumChange}
                    maxLength={19} disabled={busy}
                    className={`${inputCls(errors.cardNumber)} font-mono tracking-widest pr-44`}
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                    <CardBrandRow activeBrand={brand} />
                  </div>
                </div>
              </Field>

              {/* Expiry + CVC side by side */}
              <div className="grid grid-cols-2 gap-3">
                <Field label="Expiration date" error={errors.expiry}>
                  <input type="text" inputMode="numeric" autoComplete="cc-exp"
                    placeholder="MM / YY"
                    value={expiry}
                    onChange={handleExpiryChange}
                    maxLength={7} disabled={busy}
                    className={`${inputCls(errors.expiry)} font-mono`} />
                </Field>

                <Field label="Security code" error={errors.cvv}>
                  <div className="relative">
                    <input type="password" inputMode="numeric" autoComplete="cc-csc"
                      placeholder="CVC"
                      value={cvv}
                      onChange={(e) => setCvv(e.target.value.replace(/\D/g, "").slice(0, 4))}
                      maxLength={4} disabled={busy}
                      className={`${inputCls(errors.cvv)} font-mono pr-10`} />
                    <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-white">
                      <CvcIcon />
                    </div>
                  </div>
                </Field>
              </div>

              {/* Different name on invoices */}
              <label className="flex items-center gap-3 cursor-pointer group">
                <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors
                  ${diffName ? "bg-primary border-primary" : "border-white/25 bg-white/[0.04] group-hover:border-white/40"}`}
                  onClick={() => setDiffName((v) => !v)}>
                  {diffName && (
                    <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 12 12">
                      <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </div>
                <span className="text-sm text-white/60 select-none">Use a different name on invoices</span>
                <input type="checkbox" className="hidden" checked={diffName} onChange={() => {}} />
              </label>

              {diffName && (
                <input type="text" placeholder="Invoice name"
                  value={invoiceName}
                  onChange={(e) => setInvoiceName(e.target.value)}
                  disabled={busy}
                  className={`${inputCls(false)} mt-1`} />
              )}

              {/* Terms agreement */}
              <label className={`flex items-start gap-3 cursor-pointer group mt-1 ${errors.agreed ? "pb-0" : ""}`}>
                <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors
                  ${agreed ? "bg-primary border-primary" : `${errors.agreed ? "border-red-500/60" : "border-white/25"} bg-white/[0.04] group-hover:border-white/40`}`}
                  onClick={() => { setAgreed((v) => !v); if (errors.agreed) setErrors((e) => ({ ...e, agreed: undefined })); }}>
                  {agreed && (
                    <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 12 12">
                      <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </div>
                <span className="text-xs text-white/50 leading-relaxed select-none">
                  You agree that CodeLearn will charge your card in the amount above. You can manage
                  your purchases in account settings. View our{" "}
                  <a href="/terms" className="underline text-white/60 hover:text-white" target="_blank">terms</a>.
                </span>
                <input type="checkbox" className="hidden" checked={agreed} onChange={() => {}} />
              </label>
              {errors.agreed && <p className="text-xs text-red-400 -mt-2 flex items-center gap-1"><span>⚠</span>{errors.agreed}</p>}

              {/* Secure note */}
              <p className="flex items-center gap-2 text-xs text-white/25 bg-white/[0.02] px-3 py-2.5 rounded-xl border border-white/[0.05]">
                <span className="text-base">🔐</span>
                Your card details are encrypted end-to-end by Razorpay and never stored on our servers.
              </p>
            </div>
          )}

          {/* ── CTA Button ── */}
          <button
            onClick={handlePay}
            disabled={busy || (!isMockMode && !scriptReady)}
            className={`w-full justify-center py-3.5 text-base font-semibold rounded-xl mt-5 transition-all
              ${isMockMode && method === "razorpay"
                ? "border-2 border-amber-400/50 text-amber-300 bg-amber-400/10 hover:bg-amber-400/20"
                : "bg-primary text-white hover:bg-primary/90 active:scale-[0.99]"}
              disabled:opacity-50 disabled:pointer-events-none`}>
            {busy ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"/>
                  <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="4" className="opacity-75"/>
                </svg>
                Processing…
              </span>
            ) : method === "card" ? "Subscribe"
              : isMockMode ? `🧪 Simulate Payment (${amountDisplay})`
              : !scriptReady ? "Loading payment gateway…"
              : `Pay ${amountDisplay} →`}
          </button>

          <p className="text-center text-xs text-white/20 mt-3">
            🔒 Payments secured by Razorpay · 256-bit TLS encryption
          </p>
        </div>
      </div>
    </div>
  );
}
