import { useState, useRef, useEffect } from "react";
import { supportAPI } from "../api";
import useAuthStore from "../store/useAuthStore";

const STORAGE_KEY = "cl_support_ticket";

const BOT_AVATAR = (
  <div style={{ width:28, height:28, borderRadius:"50%", flexShrink:0,
    background:"linear-gradient(135deg,#E8471A,#F5B731)",
    display:"flex", alignItems:"center", justifyContent:"center",
    fontSize:13, fontWeight:900, color:"#fff" }}>C</div>
);

const ADMIN_AVATAR = (
  <div style={{ width:28, height:28, borderRadius:"50%", flexShrink:0,
    background:"rgba(99,102,241,0.3)", border:"1px solid rgba(99,102,241,0.5)",
    display:"flex", alignItems:"center", justifyContent:"center",
    fontSize:13 }}>👤</div>
);

const GREETING = "Hi! 👋 I'm CodeLearn's AI assistant. Ask me anything about courses, payments, or account issues — I'm here to help!";

const QUICK_QUESTIONS = [
  "I can't access my course",
  "Payment failed, money deducted",
  "Video not loading",
  "How do I get my certificate?",
];

function timeAgo(date) {
  const s = Math.floor((Date.now() - new Date(date)) / 1000);
  if (s < 60)   return "just now";
  if (s < 3600) return `${Math.floor(s/60)}m ago`;
  if (s < 86400) return `${Math.floor(s/3600)}h ago`;
  return new Date(date).toLocaleDateString("en-IN", { day:"numeric", month:"short" });
}

const STATUS_COLOR = { open:"#F59E0B", in_progress:"#3B82F6", resolved:"#10B981" };
const STATUS_LABEL = { open:"Open", in_progress:"In Progress", resolved:"Resolved" };

function renderText(text) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((p, i) =>
    p.startsWith("**") && p.endsWith("**")
      ? <strong key={i} style={{ color:"#fff" }}>{p.slice(2,-2)}</strong>
      : <span key={i}>{p}</span>
  );
}

export default function SupportChat() {
  const { user } = useAuthStore();

  const [open,      setOpen]      = useState(false);
  const [input,     setInput]     = useState("");
  const [loading,   setLoading]   = useState(false);
  const [ticketId,  setTicketId]  = useState(() => localStorage.getItem(STORAGE_KEY) || null);
  const [status,    setStatus]    = useState("open");
  const [unread,    setUnread]    = useState(0);
  const [fetching,  setFetching]  = useState(false);
  const [messages,  setMessages]  = useState([
    { role:"assistant", content:GREETING, isAI:true, _id:"greeting" },
  ]);

  const bottomRef = useRef(null);
  const inputRef  = useRef(null);

  // Load existing ticket on mount
  useEffect(() => {
    if (!ticketId) return;
    setFetching(true);
    supportAPI.getTicket(ticketId)
      .then(({ data }) => {
        const t = data.data.ticket;
        if (t.messages?.length) {
          setMessages(t.messages);
          setStatus(t.status);
        }
      })
      .catch(() => {
        // Ticket not found or expired — start fresh
        localStorage.removeItem(STORAGE_KEY);
        setTicketId(null);
      })
      .finally(() => setFetching(false));
  }, []);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:"smooth" }); }, [messages, open]);
  useEffect(() => {
    if (open) { setTimeout(() => inputRef.current?.focus(), 120); setUnread(0); }
  }, [open]);

  const sendMessage = async (text) => {
    const msg = (text || input).trim();
    if (!msg || loading) return;
    setInput("");

    const userMsg = { role:"user", content:msg, isAI:false, _id: Date.now()+"u" };
    setMessages(p => [...p, userMsg]);
    setLoading(true);

    try {
      const { data } = await supportAPI.chat({
        message:    msg,
        ticketId:   ticketId || undefined,
        guestEmail: !user ? undefined : undefined,
        guestName:  !user ? undefined : undefined,
      });

      // Persist ticket ID
      if (data.data.ticketId && !ticketId) {
        setTicketId(data.data.ticketId);
        localStorage.setItem(STORAGE_KEY, data.data.ticketId);
      }

      if (data.data.reply) {
        const botMsg = { role:"assistant", content:data.data.reply, isAI:true, _id: Date.now()+"b" };
        setMessages(p => [...p, botMsg]);
        if (!open) setUnread(n => n + 1);
      }
    } catch (err) {
      const errText = err.response?.status === 503
        ? "AI support is temporarily unavailable. Please email **support@codelearn.in** for help."
        : "Something went wrong. Please email **support@codelearn.in** and we'll help within 24 hours.";
      setMessages(p => [...p, { role:"assistant", content:errText, isAI:true, _id: Date.now()+"e" }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const startNew = () => {
    localStorage.removeItem(STORAGE_KEY);
    setTicketId(null);
    setMessages([{ role:"assistant", content:GREETING, isAI:true, _id:"greeting" }]);
    setStatus("open");
  };

  const isResolved = status === "resolved";

  return (
    <>
      <style>{`
        @keyframes chatSlideUp {
          from { opacity:0; transform:translateY(16px) scale(0.97); }
          to   { opacity:1; transform:translateY(0) scale(1); }
        }
        @keyframes dotBounce {
          0%,80%,100% { transform:translateY(0); }
          40%         { transform:translateY(-5px); }
        }
        .cl-chat-scroll::-webkit-scrollbar { width:3px; }
        .cl-chat-scroll::-webkit-scrollbar-thumb { background:rgba(255,255,255,0.1); border-radius:2px; }
      `}</style>

      {/* ── Chat panel ── */}
      {open && (
        <div style={{
          position:"fixed", bottom:84, right:20, zIndex:999,
          width:370, maxWidth:"calc(100vw - 24px)",
          display:"flex", flexDirection:"column",
          borderRadius:20, overflow:"hidden",
          background:"#0F0B22",
          border:"1px solid rgba(232,71,26,0.22)",
          boxShadow:"0 24px 80px rgba(0,0,0,0.65), 0 0 0 1px rgba(255,255,255,0.04)",
          animation:"chatSlideUp 0.22s cubic-bezier(.22,.68,0,1.2) forwards",
          maxHeight:"calc(100vh - 120px)",
        }}>

          {/* Header */}
          <div style={{
            display:"flex", alignItems:"center", gap:10, padding:"13px 14px",
            background:"linear-gradient(135deg,rgba(232,71,26,0.18),rgba(245,183,49,0.06))",
            borderBottom:"1px solid rgba(255,255,255,0.07)", flexShrink:0,
          }}>
            <div style={{
              width:36, height:36, borderRadius:"50%", flexShrink:0,
              background:"linear-gradient(135deg,#E8471A,#F5B731)",
              display:"flex", alignItems:"center", justifyContent:"center",
              fontSize:16, fontWeight:900, color:"#fff",
              boxShadow:"0 2px 12px rgba(232,71,26,0.4)",
            }}>C</div>
            <div style={{ flex:1 }}>
              <p style={{ fontSize:13, fontWeight:700, color:"#fff", margin:0 }}>CodeLearn Support</p>
              <div style={{ display:"flex", alignItems:"center", gap:6, marginTop:2, flexWrap:"wrap" }}>
                <div style={{ display:"flex", alignItems:"center", gap:4 }}>
                  <div style={{ width:6, height:6, borderRadius:"50%", background:"#10B981" }} />
                  <span style={{ fontSize:10, color:"rgba(255,255,255,0.4)" }}>AI Assistant</span>
                </div>
                {ticketId && (
                  <span style={{
                    fontSize:10, padding:"1px 7px", borderRadius:99, fontWeight:600,
                    background:`${STATUS_COLOR[status]}18`,
                    color: STATUS_COLOR[status],
                    border:`1px solid ${STATUS_COLOR[status]}30`,
                  }}>
                    {STATUS_LABEL[status]}
                  </span>
                )}
              </div>
            </div>
            <div style={{ display:"flex", gap:4 }}>
              {ticketId && (
                <button onClick={startNew} title="New conversation"
                  style={{ background:"rgba(255,255,255,0.07)", border:"none", color:"rgba(255,255,255,0.5)", fontSize:12, cursor:"pointer", borderRadius:7, padding:"4px 8px", fontWeight:600 }}>
                  + New
                </button>
              )}
              <button onClick={() => setOpen(false)}
                style={{ background:"none", border:"none", color:"rgba(255,255,255,0.4)", fontSize:18, cursor:"pointer", lineHeight:1, padding:4 }}>✕</button>
            </div>
          </div>

          {/* Ticket ID badge */}
          {ticketId && (
            <div style={{ background:"rgba(255,255,255,0.03)", padding:"6px 14px", borderBottom:"1px solid rgba(255,255,255,0.05)", flexShrink:0 }}>
              <span style={{ fontSize:10, color:"rgba(255,255,255,0.3)", fontFamily:"monospace" }}>
                Ticket #{ticketId.slice(-8).toUpperCase()}
              </span>
            </div>
          )}

          {/* Messages */}
          <div className="cl-chat-scroll" style={{ flex:1, overflowY:"auto", padding:"12px 10px", display:"flex", flexDirection:"column", gap:10 }}>
            {fetching ? (
              <div style={{ textAlign:"center", padding:20, color:"rgba(255,255,255,0.3)", fontSize:12 }}>Loading conversation…</div>
            ) : (
              messages.map((m, i) => {
                const isUser  = m.role === "user";
                const isAdmin = m.role === "admin";
                return (
                  <div key={m._id || i} style={{ display:"flex", gap:8, alignItems:"flex-start", flexDirection:isUser ? "row-reverse" : "row" }}>
                    {!isUser && (isAdmin ? ADMIN_AVATAR : BOT_AVATAR)}
                    <div style={{ maxWidth:"80%", display:"flex", flexDirection:"column", alignItems:isUser ? "flex-end" : "flex-start" }}>
                      {isAdmin && (
                        <span style={{ fontSize:9, color:"rgba(99,102,241,0.8)", marginBottom:2, fontWeight:700 }}>
                          {m.adminName || "Support Team"}
                        </span>
                      )}
                      <div style={{
                        padding:"9px 12px", wordBreak:"break-word", fontSize:13, lineHeight:1.55,
                        borderRadius: isUser ? "16px 4px 16px 16px" : "4px 16px 16px 16px",
                        background: isUser
                          ? "linear-gradient(135deg,#E8471A,#c9360d)"
                          : isAdmin
                          ? "rgba(99,102,241,0.15)"
                          : "rgba(255,255,255,0.07)",
                        color: isUser ? "#fff" : "rgba(255,255,255,0.85)",
                        border: isUser ? "none" : isAdmin ? "1px solid rgba(99,102,241,0.3)" : "1px solid rgba(255,255,255,0.08)",
                      }}>
                        {renderText(m.content)}
                      </div>
                      {m.createdAt && (
                        <span style={{ fontSize:9, color:"rgba(255,255,255,0.2)", marginTop:3 }}>{timeAgo(m.createdAt)}</span>
                      )}
                    </div>
                  </div>
                );
              })
            )}

            {/* Typing indicator */}
            {loading && (
              <div style={{ display:"flex", gap:8, alignItems:"flex-start" }}>
                {BOT_AVATAR}
                <div style={{ padding:"10px 14px", borderRadius:"4px 16px 16px 16px", background:"rgba(255,255,255,0.07)", border:"1px solid rgba(255,255,255,0.08)", display:"flex", gap:4, alignItems:"center" }}>
                  {[0,0.16,0.32].map((d,i) => (
                    <div key={i} style={{ width:6, height:6, borderRadius:"50%", background:"#E8471A", animation:`dotBounce 1s ${d}s infinite` }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Quick questions (only before first user message) */}
          {messages.filter(m => m.role === "user").length === 0 && !fetching && (
            <div style={{ padding:"0 10px 10px", display:"flex", flexWrap:"wrap", gap:5, flexShrink:0 }}>
              {QUICK_QUESTIONS.map(q => (
                <button key={q} onClick={() => sendMessage(q)}
                  style={{ background:"rgba(232,71,26,0.1)", color:"rgba(255,255,255,0.7)", border:"1px solid rgba(232,71,26,0.25)", borderRadius:99, padding:"5px 10px", fontSize:11, cursor:"pointer", fontWeight:500 }}
                  onMouseEnter={e => { e.currentTarget.style.background="rgba(232,71,26,0.2)"; e.currentTarget.style.color="#fff"; }}
                  onMouseLeave={e => { e.currentTarget.style.background="rgba(232,71,26,0.1)"; e.currentTarget.style.color="rgba(255,255,255,0.7)"; }}>
                  {q}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          {!isResolved ? (
            <div style={{ display:"flex", gap:8, padding:"10px 10px", borderTop:"1px solid rgba(255,255,255,0.07)", background:"rgba(0,0,0,0.2)", flexShrink:0 }}>
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder="Type your message…"
                disabled={loading}
                rows={1}
                style={{ flex:1, background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:10, padding:"9px 12px", fontSize:13, color:"#fff", outline:"none", resize:"none", lineHeight:1.4, fontFamily:"inherit" }}
                onFocus={e => { e.currentTarget.style.borderColor="rgba(232,71,26,0.5)"; }}
                onBlur={e => { e.currentTarget.style.borderColor="rgba(255,255,255,0.1)"; }}
              />
              <button onClick={() => sendMessage()} disabled={!input.trim() || loading}
                style={{ width:36, height:36, borderRadius:"50%", border:"none", flexShrink:0, cursor: input.trim() && !loading ? "pointer" : "not-allowed",
                  background: input.trim() && !loading ? "linear-gradient(135deg,#E8471A,#c9360d)" : "rgba(255,255,255,0.07)",
                  color: input.trim() && !loading ? "#fff" : "rgba(255,255,255,0.3)",
                  display:"flex", alignItems:"center", justifyContent:"center", fontSize:16,
                  boxShadow: input.trim() && !loading ? "0 2px 12px rgba(232,71,26,0.35)" : "none",
                }}>↑</button>
            </div>
          ) : (
            <div style={{ padding:"12px 14px", borderTop:"1px solid rgba(255,255,255,0.07)", textAlign:"center", flexShrink:0 }}>
              <p style={{ fontSize:12, color:"#10B981", marginBottom:8 }}>✓ This ticket has been resolved</p>
              <button onClick={startNew}
                style={{ background:"rgba(232,71,26,0.15)", color:"#E8471A", border:"1px solid rgba(232,71,26,0.3)", borderRadius:10, padding:"7px 18px", fontSize:12, cursor:"pointer", fontWeight:600 }}>
                Start New Conversation
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Floating button ── */}
      <button
        onClick={() => setOpen(p => !p)}
        title={open ? "Close support" : "Get help"}
        style={{
          position:"fixed", bottom:20, right:20, zIndex:1000,
          width:56, height:56, borderRadius:"50%", border:"none",
          background: open ? "rgba(255,255,255,0.1)" : "linear-gradient(135deg,#E8471A,#c9360d)",
          color:"#fff", cursor:"pointer",
          display:"flex", alignItems:"center", justifyContent:"center",
          fontSize: open ? 20 : 24,
          boxShadow: open ? "none" : "0 4px 24px rgba(232,71,26,0.5), 0 0 0 4px rgba(232,71,26,0.12)",
          transition:"all 0.25s cubic-bezier(.22,.68,0,1.2)",
          transform: open ? "scale(0.92)" : "scale(1)",
        }}
        onMouseEnter={e => { if (!open) e.currentTarget.style.transform="scale(1.08)"; }}
        onMouseLeave={e => { if (!open) e.currentTarget.style.transform=open ? "scale(0.92)" : "scale(1)"; }}
      >
        {open ? "✕" : "💬"}
        {!open && unread > 0 && (
          <div style={{ position:"absolute", top:-2, right:-2, width:18, height:18, borderRadius:"50%", background:"#10B981", color:"#fff", fontSize:10, fontWeight:800, display:"flex", alignItems:"center", justifyContent:"center", border:"2px solid #0A0A0F" }}>
            {unread}
          </div>
        )}
      </button>
    </>
  );
}
