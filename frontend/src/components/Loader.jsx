export default function Loader({ size = 40, text = "" }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16">
      <div
        style={{
          width: size,
          height: size,
          border: "3px solid rgba(255,255,255,0.08)",
          borderTopColor: "#E8471A",
          borderRadius: "50%",
          animation: "spin 0.7s linear infinite",
        }}
      />
      {text && <p className="text-sm text-white/40">{text}</p>}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
