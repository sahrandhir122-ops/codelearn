import { useState, useRef, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { courseAPI, uploadAPI } from "../api";

// ─── Design tokens (same palette as AdminDashboard) ────────────────────────
const T = {
  bg: "#080B14", bgCard: "#0D1120", bgCard2: "#111827",
  border: "rgba(99,179,237,0.08)", border2: "rgba(99,179,237,0.18)",
  primary: "#3B82F6", green: "#10B981", red: "#EF4444",
  amber: "#F59E0B", purple: "#8B5CF6",
  text: "#E2E8F0", textMuted: "#64748B", textDim: "#334155",
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
// Uploads DIRECTLY from browser → Cloudinary (bypasses server memory limits)
const CLOUD_NAME     = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET  = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

function VideoUploader({ onUploaded, existingUrl }) {
  const [progress, setProgress] = useState(0);
  const [phase,    setPhase]    = useState("idle"); // "idle"|"uploading"|"done"
  const [dragging, setDragging] = useState(false);
  const inputRef  = useRef();
  const xhrRef    = useRef(null); // keep XHR so we can abort

  const upload = useCallback(async (file) => {
    if (!file) return;
    if (!file.type.startsWith("video/")) {
      toast.error("Please select a video file (mp4, webm, etc.)");
      return;
    }
    if (file.size > 2 * 1024 * 1024 * 1024) {
      toast.error("File too large — maximum 2 GB.");
      return;
    }
    if (!CLOUD_NAME || !UPLOAD_PRESET) {
      toast.error("Cloudinary not configured. Check VITE_CLOUDINARY_CLOUD_NAME in .env");
      return;
    }

    setPhase("uploading");
    setProgress(0);

    const fd = new FormData();
    fd.append("file",           file);
    fd.append("upload_preset",  UPLOAD_PRESET);
    fd.append("folder",         "codelearn/videos");

    try {
      // Use native XHR so we get real upload-to-Cloudinary progress
      const url = await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhrRef.current = xhr;

        xhr.upload.addEventListener("progress", (e) => {
          if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100));
        });

        xhr.addEventListener("load", () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            const res = JSON.parse(xhr.responseText);
            resolve(res.secure_url);
          } else {
            try {
              const err = JSON.parse(xhr.responseText);
              reject(new Error(err.error?.message || "Upload failed"));
            } catch {
              reject(new Error(`Upload failed (HTTP ${xhr.status})`));
            }
          }
        });

        xhr.addEventListener("error",  () => reject(new Error("Network error during upload.")));
        xhr.addEventListener("abort",  () => reject(new Error("Upload cancelled.")));

        xhr.open("POST", `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/video/upload`);
        xhr.send(fd);
      });

      setPhase("done");
      onUploaded(url, Math.round(file.size / 1024 / 1024));
      toast.success("✅ Video uploaded successfully!");
    } catch (err) {
      setPhase("idle");
      setProgress(0);
      toast.error(err.message || "Upload failed.");
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
              <p style={{ color: T.text, fontSize: 14, fontWeight: 600, marginBottom: 4 }}>
                Uploading to Cloudinary… {progress}%
              </p>
              <p style={{ color: T.textMuted, fontSize: 12, marginBottom: 10 }}>
                Please wait — do not close this window
              </p>
              <div style={{ background: T.border2, borderRadius: 99, height: 8, width: "100%", overflow: "hidden" }}>
                <div style={{
                  width: `${progress}%`, height: "100%",
                  background: `linear-gradient(90deg, ${T.primary}, ${T.green})`,
                  borderRadius: 99, transition: "width 0.4s ease",
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
  const [saving, setSaving] = useState(false);

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

          {/* Video Upload */}
          <div>
            <label style={{ fontSize: 12, color: T.textMuted, display: "block", marginBottom: 8 }}>Lecture Video</label>
            <VideoUploader
              existingUrl={form.videoUrl}
              onUploaded={(url) => setForm(p => ({ ...p, videoUrl: url }))}
            />
            {/* Or paste URL manually */}
            <input
              value={form.videoUrl}
              onChange={(e) => setForm(p => ({ ...p, videoUrl: e.target.value }))}
              placeholder="Or paste video URL directly…"
              style={{ width: "100%", background: T.bgCard2, border: `1px solid ${T.border}`, color: T.text, padding: "8px 14px", borderRadius: 8, fontSize: 13, outline: "none", boxSizing: "border-box", marginTop: 8 }}
            />
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
    <div style={{ minHeight: "100vh", background: T.bg, color: T.text, fontFamily: "DM Sans, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600&display=swap');
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
          <h1 style={{ fontSize: 17, fontWeight: 800, color: T.text, fontFamily: "Syne, sans-serif", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
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
          <h2 style={{ fontSize: 18, fontWeight: 800, color: T.text, fontFamily: "Syne, sans-serif" }}>
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
