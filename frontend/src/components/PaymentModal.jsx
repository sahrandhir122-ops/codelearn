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
  const base = `h-5 w-auto rounded transition-opacity duration-200 ${dim ? "opacity-20" : "opacity-100"}`;
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
  return (
    <svg className={base} viewBox="0 0 50 16" xmlns="http://www.w3.org/2000/svg">
      <rect width="50" height="16" rx="3" fill="#231F20"/>
      <text x="25" y="12" textAnchor="middle" fill="#FFFFFF" fontSize="7.5" fontWeight="bold" fontFamily="Arial">DISCOVER</text>
    </svg>
  );
};

const CardBrandRow = ({ activeBrand }) => (
  <div className="flex items-center gap-1.5">
    {["visa","mastercard","amex","rupay"].map((b) => (
      <CardLogo key={b} brand={b} dim={activeBrand !== null && activeBrand !== b} />
    ))}
  </div>
);

/* ── CVC icon ────────────────────────────────────────────────── */
const CvcIcon = () => (
  <svg width="26" height="18" viewBox="0 0 38 26" fill="none" xmlns="http://www.w3.org/2000/svg" className="opacity-35">
    <rect x="1" y="1" width="36" height="24" rx="4" stroke="currentColor" strokeWidth="1.5"/>
    <rect x="1" y="6" width="36" height="5" fill="currentColor" opacity="0.5"/>
    <rect x="22" y="15" width="12" height="4" rx="2" fill="currentColor"/>
    <text x="28" y="20" textAnchor="middle" fill="currentColor" fontSize="4" fontFamily="Arial">123</text>
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

/* ── Input style helper ─────────────────────────────────────── */
const inputCls = (err) =>
  `w-full bg-[#252525] border ${err ? "border-red-500/50" : "border-white/[0.10]"} ` +
  `rounded-lg px-3.5 py-2.5 text-[13px] text-white placeholder-white/20 ` +
  `focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/10 transition-all`;

/* ── Labeled field wrapper ──────────────────────────────────── */
function Field({ label, error, children }) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-[12px] font-medium text-white/55 tracking-wide">
          {label}
        </label>
      )}
      {children}
      {error && (
        <p className="text-[11px] text-red-400 flex items-center gap-1">
          <svg className="w-3 h-3 shrink-0" viewBox="0 0 12 12" fill="currentColor">
            <path d="M6 1a5 5 0 100 10A5 5 0 006 1zm-.5 2.5h1v3.5h-1V3.5zm0 4.5h1v1h-1V8z"/>
          </svg>
          {error}
        </p>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   PaymentModal Component
══════════════════════════════════════════════════════════════ */
export default function PaymentModal({ isOpen, onClose, orderData, user, description, onVerify }) {
  const [method,      setMethod]      = useState("card");   // ← card is the default
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
      setMethod("card"); setCardNumber(""); setCardName(user?.name || "");
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

  /* Card form validation */
  const validateCard = () => {
    const errs = {};
    const num = cardNumber.replace(/\s/g, "");
    if (num.length < 16)        errs.cardNumber = "Card number must be 16 digits";
    else if (!luhnOk(num))      errs.cardNumber = "Invalid card number";
    if (!cardName.trim())       errs.cardName   = "Full name is required";
    const [mm = "", yy = ""]    = (expiry || "").replace(" ", "").split("/");
    const iMonth = parseInt(mm, 10);
    const iYear  = parseInt(yy.trim(), 10);
    if (!mm || mm.length < 2 || iMonth < 1 || iMonth > 12) errs.expiry = "Invalid month";
    else if (!yy.trim() || yy.trim().length < 2)            errs.expiry = "Invalid year";
    else if (new Date(2000 + iYear, iMonth - 1) < new Date()) errs.expiry = "Card has expired";
    if (cvv.length < 3)         errs.cvv    = "CVV must be 3–4 digits";
    if (!agreed)                errs.agreed = "You must agree to the terms to continue";
    return errs;
  };

  /* ── Razorpay popup ─────────────────────────────────────────── */
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

  /* ── Direct card via Razorpay createPayment ─────────────────── */
  const handleCardPay = async () => {
    const errs = validateCard();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    if (!scriptReady) { toast.error("Payment gateway not ready, please wait."); return; }
    setBusy(true);
    try {
      const expiryClean = expiry.replace(/\s/g, "");
      const [mm, yy]    = expiryClean.split("/");
      const rzp = new window.Razorpay({ key: rzpKey });
      rzp.createPayment({
        amount:    orderData.amount,
        currency:  orderData.currency || "INR",
        order_id:  orderData.orderId,
        method:    "card",
        card: {
          number:        cardNumber.replace(/\s/g, ""),
          name:          cardName.trim(),
          expiry_month:  mm,
          expiry_year:   `20${yy.trim()}`,
          cvv,
        },
        email:   user?.email   || "",
        contact: user?.phone   || "9999999999",
      });
      rzp.on("payment.success", async (data) => {
        try {
          await onVerify({
            razorpayOrderId:   data.razorpay_order_id,
            razorpayPaymentId: data.razorpay_payment_id,
            razorpaySignature: data.razorpay_signature,
          });
          onClose();
        } catch {
          toast.error("Payment verification failed. Contact support.");
          setBusy(false);
        }
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

  /* ── Mock / test mode ───────────────────────────────────────── */
  const handleMockPay = async () => {
    // In mock mode + card view → still validate the form for UX realism
    if (method === "card") {
      const errs = validateCard();
      if (Object.keys(errs).length) { setErrors(errs); return; }
      setErrors({});
    }
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
    if (isMockMode)                 return handleMockPay();
    if (method === "card")          return handleCardPay();
    return handleRazorpayPay();
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
              CARD FORM
          ══════════════════════════════════════════════════════ */}
          {method === "card" && (
            <div className="space-y-4">

              {/* Full name */}
              <Field label="Full name" error={errors.cardName}>
                <input
                  type="text"
                  autoComplete="cc-name"
                  placeholder={user?.name || "Your full name"}
                  value={cardName}
                  onChange={(e) => setCardName(e.target.value)}
                  disabled={busy}
                  className={inputCls(errors.cardName)}
                />
              </Field>

              {/* Country */}
              <Field label="Country or region">
                <div className="relative">
                  <select
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    disabled={busy}
                    className={`${inputCls(false)} appearance-none pr-9 cursor-pointer`}
                  >
                    {COUNTRIES.map((c) => (
                      <option key={c} value={c} className="bg-[#252525]">{c}</option>
                    ))}
                  </select>
                  <svg
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/35 pointer-events-none"
                    viewBox="0 0 20 20" fill="currentColor"
                  >
                    <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd"/>
                  </svg>
                </div>
              </Field>

              {/* Address */}
              <Field label="Address line 1">
                <input
                  type="text"
                  autoComplete="street-address"
                  placeholder=""
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  disabled={busy}
                  className={inputCls(false)}
                />
              </Field>

              {/* Card number */}
              <Field label="Card number" error={errors.cardNumber}>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="cc-number"
                    placeholder="1234 1234 1234 1234"
                    value={cardNumber}
                    onChange={handleCardNumChange}
                    maxLength={19}
                    disabled={busy}
                    className={`${inputCls(errors.cardNumber)} font-mono tracking-widest pr-44`}
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                    <CardBrandRow activeBrand={brand} />
                  </div>
                </div>
              </Field>

              {/* Expiry + CVC */}
              <div className="grid grid-cols-2 gap-3">
                <Field label="Expiration date" error={errors.expiry}>
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="cc-exp"
                    placeholder="MM / YY"
                    value={expiry}
                    onChange={handleExpiryChange}
                    maxLength={7}
                    disabled={busy}
                    className={`${inputCls(errors.expiry)} font-mono`}
                  />
                </Field>
                <Field label="Security code" error={errors.cvv}>
                  <div className="relative">
                    <input
                      type="password"
                      inputMode="numeric"
                      autoComplete="cc-csc"
                      placeholder="CVC"
                      value={cvv}
                      onChange={(e) => setCvv(e.target.value.replace(/\D/g, "").slice(0, 4))}
                      maxLength={4}
                      disabled={busy}
                      className={`${inputCls(errors.cvv)} font-mono pr-9`}
                    />
                    <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-white">
                      <CvcIcon />
                    </div>
                  </div>
                </Field>
              </div>

              {/* Different name checkbox */}
              <label className="flex items-center gap-3 cursor-pointer group select-none">
                <div
                  className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-all
                    ${diffName
                      ? "bg-primary border-primary"
                      : "border-white/20 bg-white/[0.03] group-hover:border-white/35"}`}
                  onClick={() => setDiffName((v) => !v)}
                >
                  {diffName && (
                    <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 12 12">
                      <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </div>
                <span className="text-[13px] text-white/50">Use a different name on invoices</span>
              </label>

              {diffName && (
                <input
                  type="text"
                  placeholder="Invoice name"
                  value={invoiceName}
                  onChange={(e) => setInvoiceName(e.target.value)}
                  disabled={busy}
                  className={inputCls(false)}
                />
              )}

              {/* Agreement checkbox */}
              <label className="flex items-start gap-3 cursor-pointer group select-none">
                <div
                  className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 mt-0.5 transition-all
                    ${agreed
                      ? "bg-primary border-primary"
                      : `${errors.agreed ? "border-red-500/50" : "border-white/20"} bg-white/[0.03] group-hover:border-white/35`}`}
                  onClick={() => {
                    setAgreed((v) => !v);
                    if (errors.agreed) setErrors((e) => ({ ...e, agreed: undefined }));
                  }}
                >
                  {agreed && (
                    <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 12 12">
                      <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </div>
                <span className="text-[12px] text-white/45 leading-relaxed">
                  You agree that CodeLearn will charge your card in the amount above now. You can
                  manage your purchases in account settings in accordance with our{" "}
                  <a href="/terms" className="underline text-white/55 hover:text-white/80 transition-colors" target="_blank" rel="noreferrer">
                    terms
                  </a>.
                </span>
              </label>
              {errors.agreed && (
                <p className="text-[11px] text-red-400 flex items-center gap-1 -mt-2">
                  <svg className="w-3 h-3 shrink-0" viewBox="0 0 12 12" fill="currentColor">
                    <path d="M6 1a5 5 0 100 10A5 5 0 006 1zm-.5 2.5h1v3.5h-1V3.5zm0 4.5h1v1h-1V8z"/>
                  </svg>
                  {errors.agreed}
                </p>
              )}
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
            ) : isMockMode && method === "card"
              ? `Subscribe (Test · ${amountDisplay})`
              : isMockMode
              ? `🧪 Simulate Payment (${amountDisplay})`
              : !scriptReady
              ? "Loading…"
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
