import { useState, useRef, useEffect } from "react";
import { supportAPI } from "../api";
import useAuthStore from "../store/useAuthStore";

const BOT_AVATAR = (
  <div style={{
    width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
    background: "linear-gradient(135deg,#E8471A,#F5B731)",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 14, fontWeight: 900, color: "#fff",
  }}>C</div>
);

const GREETING = "Hi! 👋 I'm CodeLearn's AI assistant. Ask me anything about courses, payments, or account issues — I'm here to help!";

const QUICK_QUESTIONS = [
  "I can't access my course",
  "Payment failed, money deducted",
  "Video not loading",
  "How do I get my certificate?",
];

export default function SupportChat() {
  const { user } = useAuthStore();
  const [open,     setOpen]     = useState(false);
  const [input,    setInput]    = useState("");
  const [loading,  setLoading]  = useState(false);
  const [messages, setMessages] = useState([
    { role: "assistant", content: GREETING },
  ]);
  const [unread,   setUnread]   = useState(0);
  const bottomRef  = useRef(null);
  const inputRef   = useRef(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  // Focus input when opened
  useEffect(() => {
    if (open) { setTimeout(() => inputRef.current?.focus(), 120); setUnread(0); }
  }, [open]);

  const sendMessage = async (text) => {
    const msg = (text || input).trim();
    if (!msg || loading) return;
    setInput("");

    const userMsg = { role: "user", content: msg };
    setMessages((p) => [...p, userMsg]);
    setLoading(true);

    // Build history for API (exclude the greeting)
    const history = messages
      .filter((m) => !(m.role === "assistant" && m.content === GREETING))
      .map((m) => ({ role: m.role, content: m.content }));

    try {
      const { data } = await supportAPI.chat({ message: msg, history });
      const botMsg = { role: "assistant", content: data.data.reply };
      setMessages((p) => [...p, botMsg]);
      if (!open) setUnread((n) => n + 1);
    } catch (err) {
      const errMsg = {
        role: "assistant",
        content: err.response?.status === 503
          ? "AI support is not configured yet. Please email us at **support@codelearn.in** for help."
          : "Sorry, I'm having trouble right now. Please email **support@codelearn.in** and we'll help you within 24 hours.",
      };
      setMessages((p) => [...p, errMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  // Simple markdown-ish renderer: **bold**, line breaks
  const renderText = (text) => {
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) =>
      part.startsWith("**") && part.endsWith("**")
        ? <strong key={i} style={{ color: "#fff" }}>{part.slice(2, -2)}</strong>
        : <span key={i}>{part}</span>
    );
  };

  return (
    <>
      {/* ── Chat panel ── */}
      {open && (
        <div
          style={{
            position: "fixed", bottom: 84, right: 20, zIndex: 999,
            width: 360, maxWidth: "calc(100vw - 32px)",
            display: "flex", flexDirection: "column",
            borderRadius: 20, overflow: "hidden",
            background: "#0F0B22",
            border: "1px solid rgba(232,71,26,0.25)",
            boxShadow: "0 24px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)",
            animation: "chatSlideUp 0.22s cubic-bezier(.22,.68,0,1.2) forwards",
          }}
        >
          <style>{`
            @keyframes chatSlideUp {
              from { opacity:0; transform:translateY(16px) scale(0.97); }
              to   { opacity:1; transform:translateY(0)  scale(1); }
            }
            @keyframes dotBounce {
              0%,80%,100% { transform:translateY(0); }
              40%         { transform:translateY(-5px); }
            }
            .chat-scrollbar::-webkit-scrollbar { width:3px; }
            .chat-scrollbar::-webkit-scrollbar-thumb { background:rgba(255,255,255,0.1); border-radius:2px; }
          `}</style>

          {/* Header */}
          <div style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "14px 16px",
            background: "linear-gradient(135deg,rgba(232,71,26,0.18),rgba(245,183,49,0.08))",
            borderBottom: "1px solid rgba(255,255,255,0.07)",
            flexShrink: 0,
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
              background: "linear-gradient(135deg,#E8471A,#F5B731)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 16, fontWeight: 900, color: "#fff", boxShadow: "0 2px 12px rgba(232,71,26,0.4)",
            }}>C</div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: "#fff", margin: 0 }}>CodeLearn Support</p>
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#10B981" }} />
                <p style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", margin: 0 }}>AI Assistant · Online</p>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", fontSize: 18, cursor: "pointer", lineHeight: 1, padding: 4 }}
            >✕</button>
          </div>

          {/* Messages */}
          <div className="chat-scrollbar" style={{ flex: 1, overflowY: "auto", padding: "14px 12px", display: "flex", flexDirection: "column", gap: 10, maxHeight: 340 }}>
            {messages.map((m, i) => (
              <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start", flexDirection: m.role === "user" ? "row-reverse" : "row" }}>
                {m.role === "assistant" && BOT_AVATAR}
                <div style={{
                  maxWidth: "78%",
                  padding: "9px 12px",
                  borderRadius: m.role === "user" ? "16px 4px 16px 16px" : "4px 16px 16px 16px",
                  fontSize: 13, lineHeight: 1.55,
                  background: m.role === "user"
                    ? "linear-gradient(135deg,#E8471A,#c9360d)"
                    : "rgba(255,255,255,0.07)",
                  color: m.role === "user" ? "#fff" : "rgba(255,255,255,0.85)",
                  border: m.role === "user" ? "none" : "1px solid rgba(255,255,255,0.08)",
                  wordBreak: "break-word",
                }}>
                  {renderText(m.content)}
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {loading && (
              <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                {BOT_AVATAR}
                <div style={{ padding: "10px 14px", borderRadius: "4px 16px 16px 16px", background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.08)", display: "flex", gap: 4, alignItems: "center" }}>
                  {[0, 0.16, 0.32].map((delay, i) => (
                    <div key={i} style={{
                      width: 6, height: 6, borderRadius: "50%", background: "#E8471A",
                      animation: `dotBounce 1s ${delay}s infinite`,
                    }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Quick questions (only on first message) */}
          {messages.length === 1 && (
            <div style={{ padding: "0 12px 10px", display: "flex", flexWrap: "wrap", gap: 6, flexShrink: 0 }}>
              {QUICK_QUESTIONS.map((q) => (
                <button key={q} onClick={() => sendMessage(q)}
                  style={{
                    background: "rgba(232,71,26,0.1)", color: "rgba(255,255,255,0.7)",
                    border: "1px solid rgba(232,71,26,0.25)", borderRadius: 99,
                    padding: "5px 11px", fontSize: 11, cursor: "pointer", fontWeight: 500,
                    transition: "all 0.15s",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(232,71,26,0.2)"; e.currentTarget.style.color = "#fff"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(232,71,26,0.1)"; e.currentTarget.style.color = "rgba(255,255,255,0.7)"; }}
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div style={{
            display: "flex", gap: 8, padding: "10px 12px",
            borderTop: "1px solid rgba(255,255,255,0.07)",
            background: "rgba(0,0,0,0.2)", flexShrink: 0,
          }}>
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Type your message…"
              disabled={loading}
              style={{
                flex: 1, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 10, padding: "9px 12px", fontSize: 13, color: "#fff",
                outline: "none", transition: "border-color 0.2s",
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(232,71,26,0.5)"; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; }}
            />
            <button
              onClick={() => sendMessage()}
              disabled={!input.trim() || loading}
              style={{
                width: 36, height: 36, borderRadius: "50%", border: "none", flexShrink: 0,
                background: input.trim() && !loading ? "linear-gradient(135deg,#E8471A,#c9360d)" : "rgba(255,255,255,0.07)",
                color: input.trim() && !loading ? "#fff" : "rgba(255,255,255,0.3)",
                cursor: input.trim() && !loading ? "pointer" : "not-allowed",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 16, transition: "all 0.2s",
                boxShadow: input.trim() && !loading ? "0 2px 12px rgba(232,71,26,0.35)" : "none",
              }}
            >
              ↑
            </button>
          </div>
        </div>
      )}

      {/* ── Floating button ── */}
      <button
        onClick={() => setOpen((p) => !p)}
        style={{
          position: "fixed", bottom: 20, right: 20, zIndex: 1000,
          width: 56, height: 56, borderRadius: "50%", border: "none",
          background: open
            ? "rgba(255,255,255,0.1)"
            : "linear-gradient(135deg,#E8471A,#c9360d)",
          color: "#fff", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: open ? 20 : 24,
          boxShadow: open ? "none" : "0 4px 24px rgba(232,71,26,0.5), 0 0 0 4px rgba(232,71,26,0.12)",
          transition: "all 0.25s cubic-bezier(.22,.68,0,1.2)",
          transform: open ? "scale(0.92)" : "scale(1)",
        }}
        onMouseEnter={(e) => { if (!open) e.currentTarget.style.transform = "scale(1.08)"; }}
        onMouseLeave={(e) => { if (!open) e.currentTarget.style.transform = "scale(1)"; }}
        title={open ? "Close support" : "Get help"}
      >
        {open ? "✕" : "💬"}

        {/* Unread badge */}
        {!open && unread > 0 && (
          <div style={{
            position: "absolute", top: -2, right: -2,
            width: 18, height: 18, borderRadius: "50%",
            background: "#10B981", color: "#fff",
            fontSize: 10, fontWeight: 800,
            display: "flex", alignItems: "center", justifyContent: "center",
            border: "2px solid #0A0A0F",
          }}>
            {unread}
          </div>
        )}
      </button>
    </>
  );
}
