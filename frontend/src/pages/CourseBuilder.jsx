import { useState, useRef, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { courseAPI, uploadAPI } from "../api";

// ── File type icon ───────────────────────────────────────────────────────────
function fileIcon(type) {
  if (!type) return "📎";
  if (type === "zip" || type === "rar" || type === "7z") return "🗜️";
  if (type === "pdf") return "📄";
  if (["doc","docx"].includes(type)) return "📝";
  if (["xls","xlsx"].includes(type)) return "📊";
  if (["ppt","pptx"].includes(type)) return "📑";
  if (["js","ts","py","java","cpp","html","css"].includes(type)) return "💻";
  return "📎";
}
function fmtBytes(b) {
  if (!b) return "";
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b/1024).toFixed(1)} KB`;
  return `${(b/1024/1024).toFixed(1)} MB`;
}
import { isOneDriveUrl, isOneDriveEmbedUrl, toOneDriveEmbedUrl } from "../components/VideoPlayer";

// ─── Design tokens — Purple theme (matches AdminDashboard) ─────────────────
const T = {
  bg: "#08051A", bgCard: "#0F0B28", bgCard2: "#170F35",
  border: "rgba(139,92,246,0.12)", border2: "rgba(139,92,246,0.28)",
  primary: "#7C3AED", green: "#10B981", red: "#EF4444",
  amber: "#F59E0B", purple: "#A855F7",
  text: "#E2E8F0", textMuted: "#94A3B8", textDim: "#3D2A6B",
};

const fmtDuration = (s) => {
  if (!s) return "0:00";
  const m = Math.floor(s / 60);
  const sec = String(s % 60).padStart(2, "0");
  return `${m}:${sec}`;
};

const btn = (color = T.primary) => ({
  background: `${color}20`, color, border: `1px solid ${color}30`,
  padding: "6px 14px", borderRadius: 8, fontSize: 13, cursor: "pointer",
  fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 6,
});

// ─── Video Uploader ─────────────────────────────────────────────────────────
// Uploads DIRECTLY from browser → Cloudinary using chunked upload (50 MB/chunk)
// Chunked upload handles large files (750 MB+) reliably — avoids single-request drops
const CLOUD_NAME    = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
const CHUNK_SIZE    = 50 * 1024 * 1024; // 50 MB per chunk

/** Upload one chunk; returns parsed Cloudinary response on success */
function uploadChunk(chunk, file, chunkStart, chunkEnd, totalSize, uniqueId) {
  return new Promise((resolve, reject) => {
    const fd = new FormData();
    fd.append("file",          new Blob([chunk], { type: file.type }), file.name);
    fd.append("upload_preset", UPLOAD_PRESET);
    fd.append("folder",        "codelearn/videos");

    const xhr = new XMLHttpRequest();
    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve({ xhr, data: JSON.parse(xhr.responseText) });
      } else {
        try {
          const err = JSON.parse(xhr.responseText);
          reject(new Error(err.error?.message || `Upload failed (HTTP ${xhr.status})`));
        } catch {
          reject(new Error(`Upload failed (HTTP ${xhr.status})`));
        }
      }
    });
    xhr.addEventListener("error", () => reject(new Error("Network error — check your connection.")));
    xhr.addEventListener("abort", () => reject(new Error("Upload cancelled.")));
    xhr.open("POST", `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/video/upload`);
    xhr.setRequestHeader("X-Unique-Upload-Id", uniqueId);
    xhr.setRequestHeader("Content-Range",      `bytes ${chunkStart}-${chunkEnd - 1}/${totalSize}`);
    xhr.send(fd);
    resolve._xhr = xhr; // expose for progress tracking
  });
}

function VideoUploader({ onUploaded, existingUrl }) {
  const [progress,   setProgress]   = useState(0);
  const [phase,      setPhase]      = useState("idle"); // "idle"|"uploading"|"done"
  const [chunkInfo,  setChunkInfo]  = useState("");     // "Chunk 3 / 15"
  const [dragging,   setDragging]   = useState(false);
  const inputRef    = useRef();
  const abortedRef  = useRef(false);

  const upload = useCallback(async (file) => {
    if (!file) return;
    if (!file.type.startsWith("video/")) {
      toast.error("Please select a video file (mp4, webm, etc.)"); return;
    }
    if (file.size > 2 * 1024 * 1024 * 1024) {
      toast.error("File too large — maximum 2 GB."); return;
    }
    if (!CLOUD_NAME || !UPLOAD_PRESET) {
      toast.error("Cloudinary upload preset not configured. Add VITE_CLOUDINARY_UPLOAD_PRESET to Vercel env vars.");
      return;
    }

    abortedRef.current = false;
    setPhase("uploading");
    setProgress(0);
    setChunkInfo("");

    const totalSize  = file.size;
    const numChunks  = Math.ceil(totalSize / CHUNK_SIZE);
    const uniqueId   = `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

    try {
      let lastResult = null;

      for (let i = 0; i < numChunks; i++) {
        if (abortedRef.current) throw new Error("Upload cancelled.");

        const chunkStart = i * CHUNK_SIZE;
        const chunkEnd   = Math.min(chunkStart + CHUNK_SIZE, totalSize);
        const chunk      = file.slice(chunkStart, chunkEnd);

        setChunkInfo(numChunks > 1 ? `Part ${i + 1} / ${numChunks}` : "");

        // Upload this chunk; track per-chunk XHR progress for the progress bar
        lastResult = await new Promise((resolve, reject) => {
          const fd = new FormData();
          fd.append("file",          new Blob([chunk], { type: file.type }), file.name);
          fd.append("upload_preset", UPLOAD_PRESET);
          fd.append("folder",        "codelearn/videos");

          const xhr = new XMLHttpRequest();

          xhr.upload.addEventListener("progress", (e) => {
            if (e.lengthComputable) {
              const bytesDone = chunkStart + e.loaded;
              setProgress(Math.min(99, Math.round((bytesDone / totalSize) * 100)));
            }
          });

          xhr.addEventListener("load", () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve(JSON.parse(xhr.responseText));
            } else {
              try {
                const err = JSON.parse(xhr.responseText);
                reject(new Error(err.error?.message || `HTTP ${xhr.status}`));
              } catch {
                reject(new Error(`Upload failed (HTTP ${xhr.status})`));
              }
            }
          });
          xhr.addEventListener("error", () => reject(new Error("Network error — check your connection and try again.")));
          xhr.addEventListener("abort", () => reject(new Error("Upload cancelled.")));

          xhr.open("POST", `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/video/upload`);
          xhr.setRequestHeader("X-Unique-Upload-Id", uniqueId);
          xhr.setRequestHeader("Content-Range",      `bytes ${chunkStart}-${chunkEnd - 1}/${totalSize}`);
          xhr.send(fd);
        });
      }

      setProgress(100);
      setPhase("done");
      setChunkInfo("");
      onUploaded(lastResult.secure_url, Math.round(file.size / 1024 / 1024));
      toast.success("✅ Video uploaded successfully!");
    } catch (err) {
      setPhase("idle");
      setProgress(0);
      setChunkInfo("");
      if (!abortedRef.current) toast.error(err.message || "Upload failed.");
    }
  }, [onUploaded]);

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    upload(e.dataTransfer.files[0]);
  };

  const uploading = phase === "uploading";

  return (
    <div>
      {existingUrl ? (
        <div style={{ background: T.bgCard2, border: `1px solid ${T.border2}`, borderRadius: 12, overflow: "hidden", marginBottom: 8 }}>
          <video
            src={existingUrl}
            controls
            style={{ width: "100%", maxHeight: 200, display: "block", background: "#000" }}
          />
          <div style={{ padding: "8px 12px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 12, color: T.green }}>✅ Video ready</span>
            <button
              onClick={() => { if (!uploading) inputRef.current?.click(); }}
              style={{ ...btn(T.amber), fontSize: 11, padding: "4px 10px" }}>
              Replace
            </button>
          </div>
        </div>
      ) : (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => !uploading && inputRef.current?.click()}
          style={{
            border: `2px dashed ${dragging ? T.primary : uploading ? T.green : T.border2}`,
            borderRadius: 12, padding: "32px 20px", textAlign: "center",
            cursor: uploading ? "default" : "pointer",
            background: dragging ? `${T.primary}08` : T.bgCard2,
            transition: "all 0.2s",
            marginBottom: 8,
          }}
        >
          {uploading ? (
            <div>
              <div style={{ fontSize: 28, marginBottom: 8 }}>☁️</div>
              <p style={{ color: T.text, fontSize: 14, fontWeight: 600, marginBottom: 2 }}>
                Uploading… {progress}%
                {chunkInfo && <span style={{ color: T.textMuted, fontWeight: 400, fontSize: 12 }}> · {chunkInfo}</span>}
              </p>
              <p style={{ color: T.textMuted, fontSize: 12, marginBottom: 10 }}>
                Please wait — do not close this window
              </p>
              <div style={{ background: T.border2, borderRadius: 99, height: 8, width: "100%", overflow: "hidden" }}>
                <div style={{
                  width: `${progress}%`, height: "100%",
                  background: `linear-gradient(90deg, ${T.primary}, ${T.green})`,
                  borderRadius: 99, transition: "width 0.3s ease",
                }} />
              </div>
              <p style={{ color: T.textDim, fontSize: 11, marginTop: 8 }}>{progress}% complete</p>
            </div>
          ) : (
            <div>
              <div style={{ fontSize: 36, marginBottom: 8 }}>🎬</div>
              <p style={{ color: T.text, fontSize: 14, fontWeight: 600, marginBottom: 4 }}>
                Drop video here or click to upload
              </p>
              <p style={{ color: T.textMuted, fontSize: 12 }}>MP4, WebM, MOV · Max 2 GB · Direct to Cloudinary</p>
            </div>
          )}
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="video/*"
        style={{ display: "none" }}
        onChange={(e) => upload(e.target.files[0])}
      />
    </div>
  );
}

// ─── Lecture Form Modal ─────────────────────────────────────────────────────
function LectureModal({ lecture, sectionId, courseId, onClose, onSaved }) {
  const [form, setForm] = useState({
    title:       lecture?.title       || "",
    description: lecture?.description || "",
    videoUrl:    lecture?.videoUrl    || "",
    duration:    lecture?.duration    || 0,
    isFree:      lecture?.isFree      || false,
  });
  const [saving,         setSaving]         = useState(false);
  const [resources,      setResources]      = useState(lecture?.resources || []);
  const [resUploading,   setResUploading]   = useState(false);
  const [resProgress,    setResProgress]    = useState(0);
  const resInputRef = useRef();

  const handleSave = async () => {
    if (!form.title.trim()) { toast.error("Lecture title is required."); return; }
    setSaving(true);
    try {
      if (lecture?._id) {
        const { data } = await courseAPI.updateLecture(courseId, sectionId, lecture._id, form);
        onSaved(data.data.sections);
      } else {
        const { data } = await courseAPI.addLecture(courseId, sectionId, form);
        onSaved(data.data.sections);
      }
      toast.success(lecture?._id ? "Lecture updated!" : "Lecture added!");
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save lecture.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
      onClick={onClose}>
      <div style={{ background: T.bgCard, border: `1px solid ${T.border2}`, borderRadius: 20, padding: 28, width: "100%", maxWidth: 560, maxHeight: "90vh", overflowY: "auto" }}
        onClick={(e) => e.stopPropagation()}>
        <h3 style={{ fontSize: 18, fontWeight: 800, color: T.text, marginBottom: 20 }}>
          {lecture?._id ? "Edit Lecture" : "Add Lecture"}
        </h3>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={{ fontSize: 12, color: T.textMuted, display: "block", marginBottom: 6 }}>Lecture Title *</label>
            <input value={form.title} onChange={(e) => setForm(p => ({ ...p, title: e.target.value }))} placeholder="e.g. Introduction to Python"
              style={{ width: "100%", background: T.bgCard2, border: `1px solid ${T.border}`, color: T.text, padding: "10px 14px", borderRadius: 10, fontSize: 14, outline: "none", boxSizing: "border-box" }} />
          </div>

          <div>
            <label style={{ fontSize: 12, color: T.textMuted, display: "block", marginBottom: 6 }}>Description</label>
            <textarea value={form.description} onChange={(e) => setForm(p => ({ ...p, description: e.target.value }))} rows={2}
              placeholder="Brief description of what's covered in this lecture"
              style={{ width: "100%", background: T.bgCard2, border: `1px solid ${T.border}`, color: T.text, padding: "10px 14px", borderRadius: 10, fontSize: 14, outline: "none", resize: "vertical", boxSizing: "border-box" }} />
          </div>

          {/* ── Video Source — smart dual mode ── */}
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <label style={{ fontSize: 12, color: T.textMuted }}>Lecture Video</label>
              {/* Badge showing recommended source based on isFree */}
              <span style={{
                fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 99,
                background: form.isFree ? "rgba(239,68,68,0.15)" : `${T.primary}22`,
                color: form.isFree ? "#F87171" : T.purple,
              }}>
{form.isFree ? "▶ Free → YouTube Unlisted" : "🔒 Paid → YouTube Unlisted (recommended)"}
              </span>
            </div>

            {form.isFree ? (
              /* ── FREE LECTURE: YouTube ── */
              <div style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 12, padding: 14 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
                  <span style={{ fontSize: 18 }}>▶️</span>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 700, color: "#F87171" }}>YouTube Unlisted video</p>
                    <p style={{ fontSize: 11, color: T.textMuted }}>Upload to YouTube → Set as Unlisted → Paste link below</p>
                  </div>
                </div>
                <input
                  value={form.videoUrl}
                  onChange={(e) => setForm(p => ({ ...p, videoUrl: e.target.value }))}
                  placeholder="https://youtu.be/xxxx  or  https://youtube.com/watch?v=xxxx"
                  style={{ width: "100%", background: T.bgCard2, border: `1px solid rgba(239,68,68,0.25)`, color: T.text, padding: "10px 14px", borderRadius: 8, fontSize: 13, outline: "none", boxSizing: "border-box" }}
                />
                {/* URL status */}
                {form.videoUrl && (form.videoUrl.includes("youtube.com") || form.videoUrl.includes("youtu.be")) && (
                  <p style={{ fontSize: 11, color: T.green, marginTop: 6, display: "flex", alignItems: "center", gap: 4 }}>
                    ✅ YouTube URL detected — will use YouTube's player
                  </p>
                )}
                {form.videoUrl && !form.videoUrl.includes("youtube.com") && !form.videoUrl.includes("youtu.be") && (
                  <p style={{ fontSize: 11, color: T.amber, marginTop: 6 }}>
                    ⚠ This doesn't look like a YouTube URL. Free lectures should use YouTube Unlisted.
                  </p>
                )}
                <div style={{ marginTop: 10, padding: "8px 10px", background: T.bgCard2, borderRadius: 8, fontSize: 11, color: T.textMuted, lineHeight: 1.7 }}>
                  <strong style={{ color: T.text }}>How to get an Unlisted YouTube link:</strong><br />
                  1. Upload video on YouTube Studio<br />
                  2. Set Visibility → <strong style={{ color: "#F87171" }}>Unlisted</strong> (not Private or Public)<br />
                  3. Copy the video URL and paste above
                </div>
              </div>
            ) : (
              /* ── PAID LECTURE ── */
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>

                {/* ── YouTube Unlisted — PRIMARY recommended ── */}
                <div style={{ background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.28)", borderRadius: 12, padding: 14 }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
                    <span style={{ fontSize: 20 }}>▶️</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <p style={{ fontSize: 13, fontWeight: 700, color: "#F87171", margin: 0 }}>YouTube Unlisted</p>
                        <span style={{ fontSize: 10, fontWeight: 700, background: "rgba(239,68,68,0.2)", color: "#F87171", padding: "2px 8px", borderRadius: 99 }}>⭐ RECOMMENDED</span>
                      </div>
                      <p style={{ fontSize: 11, color: T.textMuted, margin: 0 }}>No download button • No "Open in browser" • Free • Unlimited storage</p>
                    </div>
                  </div>
                  <input
                    value={form.videoUrl}
                    onChange={(e) => {
                      let val = e.target.value.trim();
                      const srcMatch = val.match(/src=["']([^"']+)["']/);
                      if (srcMatch) val = srcMatch[1];
                      const hrefMatch = val.match(/href=["']([^"']+)["']/);
                      if (hrefMatch) val = hrefMatch[1];
                      try {
                        const u = new URL(val);
                        u.searchParams.delete("width");
                        u.searchParams.delete("height");
                        val = u.toString();
                      } catch (_) {}
                      setForm(p => ({ ...p, videoUrl: val }));
                    }}
                    placeholder="https://youtu.be/xxxx  or  https://youtube.com/watch?v=xxxx"
                    style={{ width: "100%", background: T.bgCard2, border: "1px solid rgba(239,68,68,0.25)", color: T.text, padding: "10px 14px", borderRadius: 8, fontSize: 13, outline: "none", boxSizing: "border-box" }}
                  />
                  {/* URL status */}
                  {(() => {
                    const v = form.videoUrl;
                    if (!v) return null;
                    const isYT      = v.includes("youtube.com") || v.includes("youtu.be");
                    const isGD      = v.includes("drive.google.com");
                    const isODEmbed = isOneDriveEmbedUrl(v);
                    const isOD      = !isODEmbed && isOneDriveUrl(v);
                    const hasHTML   = v.startsWith("<");
                    if (hasHTML) return <p style={{ fontSize: 11, color: T.amber, marginTop: 6 }}>⚠ You pasted HTML — extract just the URL from <code>src="..."</code>.</p>;
                    if (isYT)    return <p style={{ fontSize: 11, color: T.green,  marginTop: 6 }}>✅ YouTube URL detected — will use YouTube's player</p>;
                    if (isGD)    return <p style={{ fontSize: 11, color: T.green,  marginTop: 6 }}>✅ Google Drive URL detected</p>;
                    if (isODEmbed) return <p style={{ fontSize: 11, color: T.green, marginTop: 6 }}>✅ OneDrive embed URL detected</p>;
                    if (isOD)    return <p style={{ fontSize: 11, color: T.amber,  marginTop: 6 }}>⚠ OneDrive share link won't work — use the Embed URL (see OneDrive section below).</p>;
                    if (v.length > 5) return <p style={{ fontSize: 11, color: T.amber, marginTop: 6 }}>⚠ Paste a YouTube Unlisted, Google Drive, or OneDrive embed URL.</p>;
                    return null;
                  })()}
                  <div style={{ marginTop: 10, padding: "8px 12px", background: T.bgCard2, borderRadius: 8, fontSize: 11, color: T.textMuted, lineHeight: 1.8 }}>
                    <strong style={{ color: "#F87171" }}>How to upload to YouTube as Unlisted:</strong><br />
                    1. Go to <strong style={{ color: "#F87171" }}>studio.youtube.com</strong> → Upload video<br />
                    2. In Details → Visibility → select <strong style={{ color: "#F87171" }}>Unlisted</strong><br />
                    3. Publish → copy the <code style={{ color: "#F87171", background: "rgba(239,68,68,0.08)", padding: "1px 4px", borderRadius: 3 }}>youtu.be/…</code> URL → paste above ✅
                  </div>
                </div>

                {/* ── Divider ── */}
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ flex: 1, height: 1, background: T.border }} />
                  <span style={{ fontSize: 10, color: T.textMuted }}>or use other sources</span>
                  <div style={{ flex: 1, height: 1, background: T.border }} />
                </div>

                {/* ── Other sources: OneDrive + Google Drive ── */}
                <div style={{ padding: "10px 12px", background: T.bgCard2, borderRadius: 10, fontSize: 11, color: T.textMuted, lineHeight: 1.9 }}>
                  <strong style={{ color: "#60A5FA", fontSize: 10.5 }}>📁 Google Drive (15 GB free):</strong><br />
                  <span>Share as <strong style={{ color: "#60A5FA" }}>Anyone with link → Viewer</strong> → paste Drive URL</span><br />
                  <strong style={{ color: T.purple, fontSize: 10.5 }}>☁️ OneDrive (your 100 GB):</strong><br />
                  <span>Right-click video → <strong style={{ color: T.purple }}>Embed</strong> → <strong style={{ color: T.purple }}>Generate</strong> → copy the <code style={{ color: T.purple, background: "rgba(139,92,246,0.1)", padding: "1px 4px", borderRadius: 3 }}>1drv.ms/v/c/…</code> URL (no <code style={{ color: T.purple }}>?e=</code> at the end)</span>
                </div>

              </div>
            )}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, color: T.textMuted, display: "block", marginBottom: 6 }}>Duration (seconds)</label>
              <input type="number" value={form.duration} onChange={(e) => setForm(p => ({ ...p, duration: Number(e.target.value) }))} min={0}
                style={{ width: "100%", background: T.bgCard2, border: `1px solid ${T.border}`, color: T.text, padding: "10px 14px", borderRadius: 10, fontSize: 14, outline: "none", boxSizing: "border-box" }} />
            </div>
            <div style={{ display: "flex", alignItems: "flex-end", paddingBottom: 2 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                <div
                  onClick={() => setForm(p => ({ ...p, isFree: !p.isFree }))}
                  style={{
                    width: 40, height: 22, borderRadius: 99, position: "relative", cursor: "pointer",
                    background: form.isFree ? T.green : T.border2, transition: "background 0.2s",
                    flexShrink: 0,
                  }}
                >
                  <div style={{
                    position: "absolute", top: 3, left: form.isFree ? "calc(100% - 19px)" : 3,
                    width: 16, height: 16, borderRadius: "50%", background: "#fff",
                    transition: "left 0.2s",
                  }} />
                </div>
                <div>
                  <p style={{ fontSize: 13, color: T.text, fontWeight: 600 }}>Free Preview</p>
                  <p style={{ fontSize: 11, color: T.textMuted }}>Visible without purchase</p>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* ── Resources (ZIP / PDF / etc.) — only shown when editing existing lecture ── */}
        {lecture?._id && (
          <div style={{ marginTop: 20, padding: "14px", background: T.bgCard2, borderRadius: 12, border: `1px solid ${T.border}` }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, color: T.text, margin: 0 }}>📎 Lecture Resources</p>
                <p style={{ fontSize: 11, color: T.textMuted, margin: 0 }}>ZIP files, PDFs, code — students can download these</p>
              </div>
              <button
                onClick={() => resInputRef.current?.click()}
                disabled={resUploading}
                style={{ ...btn(T.primary), opacity: resUploading ? 0.6 : 1, fontSize: 12, padding: "5px 12px" }}>
                {resUploading ? `Uploading ${resProgress}%…` : "+ Add File"}
              </button>
              <input ref={resInputRef} type="file" style={{ display: "none" }}
                accept=".zip,.rar,.7z,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.js,.ts,.py,.html,.css,.json,.md,.mp3"
                onChange={async (e) => {
                  const file = e.target.files[0];
                  if (!file) return;
                  setResUploading(true); setResProgress(0);
                  try {
                    const fd = new FormData();
                    fd.append("file", file);
                    const { data: up } = await uploadAPI.resource(fd, setResProgress);
                    const { data: saved } = await courseAPI.addResource(
                      courseId, sectionId, lecture._id,
                      { name: up.data.name, url: up.data.url, type: up.data.type, size: up.data.size }
                    );
                    const updatedLec = saved.data.sections
                      .flatMap(s => s.lectures)
                      .find(l => l._id === lecture._id);
                    setResources(updatedLec?.resources || []);
                    onSaved(saved.data.sections);
                    toast.success(`✅ "${up.data.name}" uploaded!`);
                  } catch (err) {
                    toast.error(err.response?.data?.message || "Upload failed.");
                  } finally {
                    setResUploading(false);
                    e.target.value = "";
                  }
                }}
              />
            </div>

            {/* Resource list */}
            {resources.length === 0 ? (
              <p style={{ fontSize: 11, color: T.textMuted, textAlign: "center", padding: "10px 0" }}>
                No files yet — click "+ Add File" to attach a ZIP, PDF, or code file
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {resources.map((r) => (
                  <div key={r._id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", background: T.bgCard, borderRadius: 8, border: `1px solid ${T.border}` }}>
                    <span style={{ fontSize: 18 }}>{fileIcon(r.type)}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 12, color: T.text, fontWeight: 600, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.name}</p>
                      <p style={{ fontSize: 10, color: T.textMuted, margin: 0 }}>{r.type?.toUpperCase()} {r.size ? `· ${fmtBytes(r.size)}` : ""}</p>
                    </div>
                    <a href={r.url} target="_blank" rel="noopener noreferrer"
                      style={{ fontSize: 11, color: T.primary, textDecoration: "none", fontWeight: 600 }}>↗ View</a>
                    <button
                      onClick={async () => {
                        if (!window.confirm(`Delete "${r.name}"?`)) return;
                        try {
                          const { data } = await courseAPI.deleteResource(courseId, sectionId, lecture._id, r._id);
                          const updatedLec = data.data.sections.flatMap(s => s.lectures).find(l => l._id === lecture._id);
                          setResources(updatedLec?.resources || []);
                          onSaved(data.data.sections);
                          toast.success("Resource deleted.");
                        } catch { toast.error("Failed to delete."); }
                      }}
                      style={{ background: "rgba(239,68,68,0.1)", color: T.red, border: "none", borderRadius: 6, padding: "3px 8px", fontSize: 11, cursor: "pointer", fontWeight: 700 }}>
                      Del
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        {!lecture?._id && (
          <p style={{ fontSize: 11, color: T.textMuted, marginTop: 10, textAlign: "center" }}>
            💡 Save the lecture first, then re-open it to attach resource files
          </p>
        )}

        <div style={{ display: "flex", gap: 10, marginTop: 22 }}>
          <button onClick={handleSave} disabled={saving}
            style={{ flex: 1, background: T.primary, color: "#fff", border: "none", padding: "12px", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer", opacity: saving ? 0.7 : 1 }}>
            {saving ? "Saving…" : lecture?._id ? "Save Changes" : "Add Lecture"}
          </button>
          <button onClick={onClose}
            style={{ flex: 1, background: T.bgCard2, color: T.textMuted, border: `1px solid ${T.border}`, padding: "12px", borderRadius: 10, fontSize: 14, cursor: "pointer" }}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Section Card ───────────────────────────────────────────────────────────
function SectionCard({ section, courseId, onUpdate }) {
  const [expanded,      setExpanded]      = useState(true);
  const [editingTitle,  setEditingTitle]  = useState(false);
  const [title,         setTitle]         = useState(section.title);
  const [lectureModal,  setLectureModal]  = useState(null); // null | "new" | lectureObj

  const saveTitle = async () => {
    if (!title.trim() || title === section.title) { setEditingTitle(false); return; }
    try {
      const { data } = await courseAPI.updateSection(courseId, section._id, { title: title.trim() });
      onUpdate(data.data.sections);
      setEditingTitle(false);
    } catch {
      toast.error("Failed to update section title.");
    }
  };

  const deleteSection = async () => {
    if (!window.confirm(`Delete section "${section.title}" and all its lectures?`)) return;
    try {
      const { data } = await courseAPI.deleteSection(courseId, section._id);
      onUpdate(data.data.sections);
      toast.success("Section deleted.");
    } catch {
      toast.error("Failed to delete section.");
    }
  };

  const deleteLecture = async (lid) => {
    if (!window.confirm("Delete this lecture?")) return;
    try {
      const { data } = await courseAPI.deleteLecture(courseId, section._id, lid);
      onUpdate(data.data.sections);
      toast.success("Lecture deleted.");
    } catch {
      toast.error("Failed to delete lecture.");
    }
  };

  const totalDuration = (section.lectures || []).reduce((s, l) => s + (l.duration || 0), 0);

  return (
    <>
      {lectureModal && (
        <LectureModal
          lecture={lectureModal === "new" ? null : lectureModal}
          sectionId={section._id}
          courseId={courseId}
          onClose={() => setLectureModal(null)}
          onSaved={onUpdate}
        />
      )}

      <div style={{ background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: 14, overflow: "hidden", marginBottom: 12 }}>
        {/* Section header */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 16px", background: T.bgCard2, borderBottom: expanded ? `1px solid ${T.border}` : "none" }}>
          <button onClick={() => setExpanded(p => !p)}
            style={{ background: "none", border: "none", color: T.textMuted, fontSize: 18, cursor: "pointer", lineHeight: 1, flexShrink: 0 }}>
            {expanded ? "▾" : "▸"}
          </button>

          {editingTitle ? (
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={saveTitle}
              onKeyDown={(e) => { if (e.key === "Enter") saveTitle(); if (e.key === "Escape") setEditingTitle(false); }}
              style={{ flex: 1, background: T.bgCard, border: `1px solid ${T.primary}`, color: T.text, padding: "6px 10px", borderRadius: 8, fontSize: 15, fontWeight: 700, outline: "none" }}
            />
          ) : (
            <span
              style={{ flex: 1, fontSize: 15, fontWeight: 700, color: T.text, cursor: "pointer" }}
              onDoubleClick={() => setEditingTitle(true)}
            >
              {section.title}
            </span>
          )}

          <span style={{ fontSize: 12, color: T.textMuted, whiteSpace: "nowrap" }}>
            {(section.lectures || []).length} lectures · {fmtDuration(totalDuration)}
          </span>

          <button onClick={() => setEditingTitle(true)} title="Rename section"
            style={{ background: "none", border: "none", color: T.textMuted, fontSize: 16, cursor: "pointer", padding: "0 4px" }}>✏️</button>
          <button onClick={deleteSection} title="Delete section"
            style={{ background: "none", border: "none", color: T.red, fontSize: 16, cursor: "pointer", padding: "0 4px" }}>🗑️</button>
        </div>

        {/* Lectures list */}
        {expanded && (
          <div style={{ padding: "8px 16px 14px" }}>
            {(section.lectures || []).length === 0 && (
              <p style={{ color: T.textDim, fontSize: 13, padding: "12px 0", textAlign: "center" }}>
                No lectures yet — click "+ Add Lecture" below
              </p>
            )}
            {(section.lectures || [])
              .slice()
              .sort((a, b) => a.order - b.order)
              .map((lec, i) => (
                <div key={lec._id}
                  style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 10, background: T.bgCard2, border: `1px solid ${T.border}`, marginBottom: 6 }}>
                  <span style={{ fontSize: 12, color: T.textDim, fontWeight: 700, width: 22, flexShrink: 0 }}>{i + 1}</span>

                  <span style={{ fontSize: 16, flexShrink: 0 }}>
                    {lec.videoUrl ? "🎬" : "📝"}
                  </span>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 14, fontWeight: 600, color: T.text, margin: 0 }}>{lec.title}</p>
                    <div style={{ display: "flex", gap: 8, marginTop: 2, flexWrap: "wrap" }}>
                      {lec.duration > 0 && (
                        <span style={{ fontSize: 11, color: T.textMuted }}>⏱ {fmtDuration(lec.duration)}</span>
                      )}
                      {lec.isFree && (
                        <span style={{ fontSize: 11, color: T.green, background: `${T.green}18`, padding: "1px 8px", borderRadius: 99 }}>Free</span>
                      )}
                      {!lec.videoUrl && (
                        <span style={{ fontSize: 11, color: T.amber }}>⚠ No video</span>
                      )}
                    </div>
                  </div>

                  <button onClick={() => setLectureModal(lec)} style={{ ...btn(T.primary), padding: "5px 10px", fontSize: 12 }}>Edit</button>
                  <button onClick={() => deleteLecture(lec._id)} style={{ ...btn(T.red), padding: "5px 10px", fontSize: 12 }}>Del</button>
                </div>
              ))}

            <button
              onClick={() => setLectureModal("new")}
              style={{ marginTop: 8, width: "100%", background: "none", border: `1px dashed ${T.border2}`, color: T.primary, padding: "9px", borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              + Add Lecture
            </button>
          </div>
        )}
      </div>
    </>
  );
}

// ─── Main CourseBuilder Page ─────────────────────────────────────────────────
export default function CourseBuilder() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [sections, setSections] = useState(null);
  const [addingSection, setAddingSection] = useState(false);
  const [newSectionTitle, setNewSectionTitle] = useState("");

  const { data: course, isLoading, isError, error } = useQuery({
    queryKey: ["builder", id],
    queryFn: () => courseAPI.getBuilder(id).then((r) => r.data.data.course),
    staleTime: 30_000,
  });

  // Initialise local sections once the server data arrives
  if (course && sections === null) setSections(course.sections || []);

  // keep local sections in sync with server when first loaded
  const displaySections = sections ?? (course?.sections || []);

  const handleUpdate = (newSections) => setSections(newSections);

  const handleAddSection = async () => {
    if (!newSectionTitle.trim()) { toast.error("Enter a section title."); return; }
    try {
      const { data: res } = await courseAPI.addSection(id, { title: newSectionTitle.trim() });
      setSections(res.data.sections);
      setNewSectionTitle("");
      setAddingSection(false);
      toast.success("Section added!");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to add section.");
    }
  };

  if (isLoading) return (
    <div style={{ minHeight: "100vh", background: T.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: 36, height: 36, border: `3px solid ${T.border2}`, borderTopColor: T.primary, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  if (isError) return (
    <div style={{ minHeight: "100vh", background: T.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: T.text, gap: 12 }}>
      <span style={{ fontSize: 48 }}>⚠️</span>
      <p>{error?.response?.data?.message || "Failed to load course."}</p>
      <button onClick={() => navigate(-1)} style={{ ...btn(T.primary), padding: "10px 24px" }}>← Go Back</button>
    </div>
  );

  const totalLectures = displaySections.reduce((s, sec) => s + (sec.lectures?.length || 0), 0);
  const totalDuration = displaySections.reduce(
    (s, sec) => s + (sec.lectures || []).reduce((ls, l) => ls + (l.duration || 0), 0), 0
  );

  return (
    <div style={{ minHeight: "100vh", background: T.bg, color: T.text, fontFamily: "Inter, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Inter:wght@300;400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      {/* Header */}
      <div style={{ background: T.bgCard, borderBottom: `1px solid ${T.border}`, padding: "14px 28px", display: "flex", alignItems: "center", gap: 16, position: "sticky", top: 0, zIndex: 50 }}>
        <button onClick={() => navigate("/admin")}
          style={{ background: "none", border: "none", color: T.textMuted, fontSize: 20, cursor: "pointer" }}>←</button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 11, color: T.textMuted, textTransform: "uppercase", letterSpacing: 1 }}>Course Builder</p>
          <h1 style={{ fontSize: 17, fontWeight: 800, color: T.text, fontFamily: "Plus Jakarta Sans, sans-serif", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {course?.title}
          </h1>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ fontSize: 12, color: T.textMuted }}>
            {displaySections.length} sections · {totalLectures} lectures · {fmtDuration(totalDuration)}
          </span>
          <span style={{
            background: course?.isPublished ? `${T.green}20` : `${T.amber}20`,
            color: course?.isPublished ? T.green : T.amber,
            padding: "4px 10px", borderRadius: 99, fontSize: 12, fontWeight: 600,
          }}>
            {course?.isPublished ? "Published" : "Draft"}
          </span>
          <Link to={`/courses/${course?.slug}`} target="_blank"
            style={{ ...btn(T.primary), textDecoration: "none", fontSize: 12, padding: "6px 14px" }}>
            👁 Preview
          </Link>
        </div>
      </div>

      {/* Main content */}
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "32px 20px" }}>

        {/* Course Info Card */}
        <div style={{ background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: 16, padding: "16px 20px", marginBottom: 28, display: "flex", gap: 16, alignItems: "center" }}>
          {course?.thumbnail && (
            <img src={course.thumbnail} alt="" style={{ width: 72, height: 50, objectFit: "cover", borderRadius: 8, flexShrink: 0 }} />
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: T.text }}>{course?.title}</p>
            <p style={{ fontSize: 12, color: T.textMuted, marginTop: 2 }}>{course?.category} · {course?.level} · {course?.language}</p>
          </div>
          <Link to={`/admin`}
            style={{ ...btn(T.textMuted), textDecoration: "none", fontSize: 12 }}>
            Edit Details
          </Link>
        </div>

        {/* Sections header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: T.text, fontFamily: "Plus Jakarta Sans, sans-serif" }}>
            Course Content
          </h2>
          <button onClick={() => setAddingSection(true)}
            style={{ background: T.primary, color: "#fff", border: "none", padding: "9px 18px", borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
            + Add Section
          </button>
        </div>

        {/* Add section input */}
        {addingSection && (
          <div style={{ background: T.bgCard, border: `1px solid ${T.primary}40`, borderRadius: 14, padding: 16, marginBottom: 12, display: "flex", gap: 10 }}>
            <input
              autoFocus
              value={newSectionTitle}
              onChange={(e) => setNewSectionTitle(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleAddSection(); if (e.key === "Escape") setAddingSection(false); }}
              placeholder="Section title (e.g. Getting Started)"
              style={{ flex: 1, background: T.bgCard2, border: `1px solid ${T.border}`, color: T.text, padding: "10px 14px", borderRadius: 10, fontSize: 14, outline: "none" }}
            />
            <button onClick={handleAddSection}
              style={{ background: T.primary, color: "#fff", border: "none", padding: "10px 18px", borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
              Add
            </button>
            <button onClick={() => setAddingSection(false)}
              style={{ background: T.bgCard2, color: T.textMuted, border: `1px solid ${T.border}`, padding: "10px 14px", borderRadius: 10, fontSize: 14, cursor: "pointer" }}>
              Cancel
            </button>
          </div>
        )}

        {/* Empty state */}
        {displaySections.length === 0 && !addingSection && (
          <div style={{ textAlign: "center", padding: "60px 20px", background: T.bgCard, border: `1px dashed ${T.border2}`, borderRadius: 16 }}>
            <div style={{ fontSize: 52, marginBottom: 16 }}>📚</div>
            <p style={{ fontSize: 16, fontWeight: 700, color: T.text, marginBottom: 8 }}>No sections yet</p>
            <p style={{ fontSize: 13, color: T.textMuted, marginBottom: 20 }}>
              Add your first section to start building the course curriculum.
            </p>
            <button onClick={() => setAddingSection(true)}
              style={{ background: T.primary, color: "#fff", border: "none", padding: "11px 24px", borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
              + Add First Section
            </button>
          </div>
        )}

        {/* Sections */}
        {displaySections
          .slice()
          .sort((a, b) => a.order - b.order)
          .map((sec) => (
            <SectionCard
              key={sec._id}
              section={sec}
              courseId={id}
              onUpdate={handleUpdate}
            />
          ))}

        {/* Tips */}
        {totalLectures > 0 && (
          <div style={{ marginTop: 28, background: `${T.primary}08`, border: `1px solid ${T.primary}20`, borderRadius: 14, padding: "16px 20px" }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: T.primary, marginBottom: 8 }}>💡 Tips</p>
            <ul style={{ fontSize: 12, color: T.textMuted, lineHeight: 1.8, paddingLeft: 16 }}>
              <li>Mark 1–2 lectures as <strong>Free Preview</strong> so students can try before buying</li>
              <li>Double-click a section title to rename it</li>
              <li>Add duration (seconds) so students can plan their time</li>
              <li>Go to <strong>Admin → Courses</strong> and click <strong>Pub</strong> when ready</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
