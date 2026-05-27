import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import useAuthStore from "../store/useAuthStore";
import { adminAPI, courseAPI, paymentAPI, uploadAPI, couponAPI } from "../api";

// ─── Design Tokens ─────────────────────────────────────────────────────────
const T = {
  bg: "#080B14", bgCard: "#0D1120", bgCard2: "#111827",
  border: "rgba(99,179,237,0.08)", border2: "rgba(99,179,237,0.15)",
  primary: "#3B82F6", primaryGlow: "rgba(59,130,246,0.25)",
  accent: "#06B6D4", green: "#10B981", red: "#EF4444",
  amber: "#F59E0B", purple: "#8B5CF6",
  text: "#E2E8F0", textMuted: "#64748B", textDim: "#334155",
};
const fmt = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;
const fmtK = (n) => n >= 100000 ? `₹${(n / 100000).toFixed(1)}L` : n >= 1000 ? `₹${(n / 1000).toFixed(0)}K` : `₹${n}`;

// ─── Shared Sub-components ──────────────────────────────────────────────────
const StatusBadge = ({ status }) => {
  const map = {
    published: { bg: "rgba(16,185,129,0.15)", color: "#10B981", label: "Published" },
    draft: { bg: "rgba(100,116,139,0.15)", color: "#94A3B8", label: "Draft" },
    active: { bg: "rgba(16,185,129,0.15)", color: "#10B981", label: "Active" },
    banned: { bg: "rgba(239,68,68,0.15)", color: "#EF4444", label: "Banned" },
    pending: { bg: "rgba(245,158,11,0.15)", color: "#F59E0B", label: "Pending" },
    success: { bg: "rgba(16,185,129,0.15)", color: "#10B981", label: "Success" },
    failed: { bg: "rgba(239,68,68,0.15)", color: "#EF4444", label: "Failed" },
    refunded: { bg: "rgba(139,92,246,0.15)", color: "#8B5CF6", label: "Refunded" },
    approved: { bg: "rgba(16,185,129,0.15)", color: "#10B981", label: "Approved" },
    flagged: { bg: "rgba(239,68,68,0.15)", color: "#EF4444", label: "Flagged" },
    sent: { bg: "rgba(59,130,246,0.15)", color: "#3B82F6", label: "Sent" },
    instructor: { bg: "rgba(139,92,246,0.15)", color: "#8B5CF6", label: "Instructor" },
    student: { bg: "rgba(6,182,212,0.15)", color: "#06B6D4", label: "Student" },
    admin: { bg: "rgba(239,68,68,0.15)", color: "#EF4444", label: "Admin" },
  };
  const s = map[status] || map.draft;
  return (
    <span style={{ background: s.bg, color: s.color, padding: "3px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600 }}>
      {s.label}
    </span>
  );
};

const StatCard = ({ icon, label, value, sub, color = T.primary, trend }) => (
  <div style={{ background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: 16, padding: "20px 22px", position: "relative", overflow: "hidden" }}>
    <div style={{ position: "absolute", top: -20, right: -20, width: 80, height: 80, borderRadius: "50%", background: `${color}15`, filter: "blur(20px)" }} />
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
      <div style={{ width: 40, height: 40, borderRadius: 12, background: `${color}20`, border: `1px solid ${color}30`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>{icon}</div>
      {trend !== undefined && <span style={{ fontSize: 12, fontWeight: 600, color: trend >= 0 ? T.green : T.red }}>{trend >= 0 ? "↑" : "↓"} {Math.abs(trend)}%</span>}
    </div>
    <div style={{ fontSize: 26, fontWeight: 800, color: T.text, fontFamily: "Plus Jakarta Sans, sans-serif", marginBottom: 3 }}>{value}</div>
    <div style={{ fontSize: 13, color: T.textMuted }}>{label}</div>
    {sub && <div style={{ fontSize: 11, color: T.textDim, marginTop: 4 }}>{sub}</div>}
  </div>
);

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: T.bgCard2, border: `1px solid ${T.border2}`, borderRadius: 10, padding: "10px 14px" }}>
      <p style={{ color: T.textMuted, fontSize: 12, marginBottom: 4 }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color, fontSize: 14, fontWeight: 600 }}>
          {p.name === "revenue" ? fmtK(p.value) : p.value}
        </p>
      ))}
    </div>
  );
};

const Spinner = () => (
  <div style={{ display: "flex", justifyContent: "center", padding: 40 }}>
    <div style={{ width: 32, height: 32, border: `3px solid ${T.border2}`, borderTopColor: T.primary, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
  </div>
);

// ─── Dashboard Page ────────────────────────────────────────────────────────
function DashboardPage() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: () => adminAPI.getStats().then((r) => r.data.data),
    staleTime: 30_000,
  });

  const { data: monthlyData } = useQuery({
    queryKey: ["admin-monthly-revenue"],
    queryFn: () => adminAPI.getMonthlyRevenue().then((r) => r.data.data.monthly),
    staleTime: 60_000,
  });

  const { data: dailyData } = useQuery({
    queryKey: ["admin-daily-revenue"],
    queryFn: () => adminAPI.getDailyRevenue().then((r) => r.data.data.daily),
    staleTime: 60_000,
  });

  if (isLoading) return <Spinner />;

  const revenueChartData = (monthlyData || []).map((m) => ({
    month: m.month?.split(" ")[0] || m.month,
    revenue: m.revenue,
    count: m.count,
  }));

  const dailyChartData = (dailyData || []).slice(-7).map((d) => ({
    day: d.date,
    sales: d.revenue,
  }));

  return (
    <div style={{ padding: "0 0 40px" }}>
      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 28 }}>
        <StatCard icon="👥" label="Total Students" value={(stats?.totalStudents || 0).toLocaleString("en-IN")} sub={`+${stats?.newUsersToday || 0} today`} color={T.primary} />
        <StatCard icon="📚" label="Published Courses" value={stats?.totalCourses || 0} color={T.accent} />
        <StatCard icon="💰" label="Total Revenue" value={fmtK(stats?.totalRevenue || 0)} sub={`This month: ${fmtK(stats?.monthlyRevenue || 0)}`} color={T.green} />
        <StatCard icon="🎓" label="Transactions" value={(stats?.totalTransactions || 0).toLocaleString("en-IN")} sub={`This month: ${stats?.monthlyTransactions || 0}`} color={T.purple} />
      </div>

      {/* Revenue Chart */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 20, marginBottom: 20 }}>
        <div style={{ background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: 16, padding: 24 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: T.text, marginBottom: 20 }}>Monthly Revenue</h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={revenueChartData.length ? revenueChartData : [{ month: "–", revenue: 0 }]}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={T.primary} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={T.primary} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
              <XAxis dataKey="month" stroke={T.textDim} tick={{ fill: T.textMuted, fontSize: 12 }} />
              <YAxis stroke={T.textDim} tick={{ fill: T.textMuted, fontSize: 11 }} tickFormatter={(v) => `₹${v / 1000}K`} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="revenue" name="revenue" stroke={T.primary} fill="url(#revGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Recent Transactions */}
        <div style={{ background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: 16, padding: 24 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: T.text, marginBottom: 16 }}>Recent Transactions</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {(stats?.recentTransactions || []).slice(0, 5).map((t) => (
              <div key={t._id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${T.border}` }}>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: T.text, marginBottom: 2 }}>{t.user?.name || "User"}</p>
                  <p style={{ fontSize: 11, color: T.textMuted }}>{t.course?.title || "Course"}</p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: T.green }}>{fmt(t.amount)}</p>
                  <StatusBadge status={t.status} />
                </div>
              </div>
            ))}
            {(stats?.recentTransactions || []).length === 0 && (
              <p style={{ color: T.textDim, fontSize: 13 }}>No transactions yet.</p>
            )}
          </div>
        </div>
      </div>

      {/* Daily + Top Courses */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
        <div style={{ background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: 16, padding: 24 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: T.text, marginBottom: 20 }}>Daily Sales (Last 7 Days)</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={dailyChartData.length ? dailyChartData : [{ day: "–", sales: 0 }]}>
              <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
              <XAxis dataKey="day" stroke={T.textDim} tick={{ fill: T.textMuted, fontSize: 11 }} />
              <YAxis stroke={T.textDim} tick={{ fill: T.textMuted, fontSize: 11 }} tickFormatter={(v) => `₹${v / 1000}K`} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="sales" fill={T.primary} radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div style={{ background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: 16, padding: 24 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: T.text, marginBottom: 16 }}>Top Courses</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {(stats?.topCourses || []).map((c, i) => (
              <div key={c._id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "6px 0", borderBottom: `1px solid ${T.border}` }}>
                <span style={{ fontSize: 12, color: T.textDim, fontWeight: 700, width: 20 }}>#{i + 1}</span>
                <img src={c.thumbnail} alt="" style={{ width: 36, height: 26, objectFit: "cover", borderRadius: 6 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.title}</p>
                  <p style={{ fontSize: 11, color: T.textMuted }}>{c.totalStudents} students</p>
                </div>
                <span style={{ fontSize: 12, color: T.amber }}>⭐ {c.rating}</span>
              </div>
            ))}
            {(stats?.topCourses || []).length === 0 && (
              <p style={{ color: T.textDim, fontSize: 13 }}>No courses yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Courses Page ──────────────────────────────────────────────────────────
function CoursesPage({ notify }) {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editCourse, setEditCourse] = useState(null);
  const [form, setForm] = useState({ title: "", description: "Course description coming soon.", price: "", originalPrice: "", category: "Programming", level: "Beginner", thumbnail: "", tags: "", language: "English" });
  const [thumbUploading, setThumbUploading] = useState(false);

  const handleThumbFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { notify("Please select an image file.", "error"); return; }
    setThumbUploading(true);
    try {
      const fd = new FormData();
      fd.append("thumbnail", file);
      const { data } = await uploadAPI.thumbnail(fd);
      setForm((p) => ({ ...p, thumbnail: data.data.url }));
      notify("Thumbnail uploaded to Cloudinary ✅", "success");
    } catch (err) {
      notify(err.response?.data?.message || "Thumbnail upload failed.", "error");
    } finally {
      setThumbUploading(false);
    }
  };

  const { data: coursesData, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["admin-courses", search],
    queryFn: async () => {
      const r = await adminAPI.getCourses({ search: search || undefined, limit: 50 });
      console.log("[admin-courses] response:", r.data);
      return r.data.data?.courses ?? [];
    },
    staleTime: 0,          // always re-fetch when invalidated
    retry: 1,
  });

  const courses = coursesData || [];

  const publishMutation = useMutation({
    mutationFn: (id) => courseAPI.togglePublish(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-courses"] }); notify("Course status updated!", "success"); },
    onError: () => notify("Failed to update course.", "error"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => courseAPI.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-courses"] }); notify("Course deleted.", "info"); },
    onError: () => notify("Failed to delete course.", "error"),
  });

  const saveMutation = useMutation({
    mutationFn: (data) => editCourse
      ? courseAPI.update(editCourse._id, data)
      : courseAPI.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-courses"] });
      qc.invalidateQueries({ queryKey: ["home-featured"] });
      qc.invalidateQueries({ queryKey: ["courses"] });
      notify(editCourse ? "Course updated!" : "Course created!", "success");
      setShowModal(false);
      setEditCourse(null);
    },
    onError: (err) => {
      console.error("Course save error:", err);
      const msg = err.response?.data?.message
        || (err.code === "ERR_NETWORK" ? "Cannot reach server — is the backend running on port 5000?" : null)
        || err.message
        || "Save failed.";
      notify(msg, "error");
    },
  });

  const handleSave = () => {
    const title = form.title?.trim();
    if (!title)       { notify("Course title is required.", "error"); return; }
    if (!form.price)  { notify("Price is required.", "error"); return; }

    const thumb = form.thumbnail?.trim() || "";
    if (thumb.startsWith("data:")) {
      notify("Thumbnail must be a web URL (e.g. from unsplash.com), not a base64 image. Paste an https:// link.", "error");
      return;
    }

    const payload = {
      title,
      description:   form.description?.trim() || "Course description coming soon.",
      price:         Number(form.price),
      originalPrice: Number(form.originalPrice) || Number(form.price),
      category:      form.category   || "Programming",
      level:         form.level      || "Beginner",
      language:      form.language   || "English",
      thumbnail:     thumb           || undefined,
      tags:          form.tags
                       ? form.tags.split(",").map((t) => t.trim()).filter(Boolean)
                       : [],
    };
    saveMutation.mutate(payload);
  };

  const openEdit = (c) => {
    setEditCourse(c);
    setForm({
      title: c.title,
      description: c.description || "Course description coming soon.",
      price: c.price,
      originalPrice: c.originalPrice || c.price,
      category: c.category,
      level: c.level,
      thumbnail: c.thumbnail || "",
      tags: (c.tags || []).join(", "),
      language: c.language || "English",
    });
    setShowModal(true);
  };

  if (isLoading) return <Spinner />;

  if (isError) return (
    <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 16, padding: 40, textAlign: "center" }}>
      <div style={{ fontSize: 36, marginBottom: 12 }}>⚠️</div>
      <p style={{ color: T.red, fontWeight: 700, fontSize: 16, marginBottom: 8 }}>Failed to load courses</p>
      <p style={{ color: T.textMuted, fontSize: 13, marginBottom: 20 }}>
        {error?.response?.data?.message || error?.message || "Cannot reach backend — make sure it is running on port 5000"}
      </p>
      <button onClick={() => refetch()}
        style={{ background: T.primary, color: "#fff", border: "none", padding: "10px 28px", borderRadius: 10, fontSize: 14, cursor: "pointer" }}>
        Retry
      </button>
    </div>
  );

  return (
    <div>
      <div style={{ display: "flex", gap: 12, marginBottom: 24, alignItems: "center" }}>
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search courses…"
          style={{ flex: 1, background: T.bgCard, border: `1px solid ${T.border}`, color: T.text, padding: "10px 14px", borderRadius: 10, fontSize: 14, outline: "none" }} />
        <button onClick={() => refetch()} title="Refresh"
          style={{ background: T.bgCard2, border: `1px solid ${T.border}`, color: T.textMuted, padding: "10px 14px", borderRadius: 10, fontSize: 16, cursor: "pointer" }}>⟳</button>
        <button onClick={() => { setEditCourse(null); setForm({ title: "", description: "Course description coming soon.", price: "", originalPrice: "", category: "Programming", level: "Beginner", thumbnail: "", tags: "", language: "English" }); setShowModal(true); }}
          style={{ background: T.primary, color: "#fff", border: "none", padding: "10px 20px", borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>
          + Add Course
        </button>
      </div>

      <div style={{ background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: 16, overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "48px 1fr 100px 90px 100px 190px", gap: 16, padding: "12px 20px", borderBottom: `1px solid ${T.border}`, background: T.bgCard2 }}>
          {["", "Course", "Price", "Students", "Status", "Actions"].map((h) => (
            <span key={h} style={{ fontSize: 11, fontWeight: 700, color: T.textDim, textTransform: "uppercase" }}>{h}</span>
          ))}
        </div>
        {courses.length === 0 && (
          <div style={{ padding: 40, textAlign: "center", color: T.textDim }}>No courses found.</div>
        )}
        {courses.map((c, i) => (
          <div key={c._id} style={{ display: "grid", gridTemplateColumns: "48px 1fr 100px 90px 100px 190px", gap: 16, padding: "14px 20px", borderBottom: i < courses.length - 1 ? `1px solid ${T.border}` : "none", alignItems: "center" }}>
            <img src={c.thumbnail && !c.thumbnail.startsWith("data:") ? c.thumbnail : "https://placehold.co/48x34/0D1120/334155?text=📚"} alt="" style={{ width: 48, height: 34, objectFit: "cover", borderRadius: 8 }} />
            <div>
              <p style={{ fontSize: 14, fontWeight: 600, color: T.text, marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.title}</p>
              <span style={{ fontSize: 11, color: T.textDim }}>{c.category} · {c.level}</span>
            </div>
            <span style={{ fontSize: 14, color: T.text }}>₹{Number(c.price).toLocaleString("en-IN")}</span>
            <span style={{ fontSize: 14, color: T.textMuted }}>{c.totalStudents || 0}</span>
            <StatusBadge status={c.isPublished ? "published" : "draft"} />
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
              <Link to={`/builder/${c._id}`}
                style={{ background: "rgba(139,92,246,0.15)", color: T.purple, border: "none", padding: "5px 9px", borderRadius: 7, fontSize: 11, cursor: "pointer", textDecoration: "none", fontWeight: 600 }}>
                📹 Content
              </Link>
              <button onClick={() => openEdit(c)}
                style={{ background: "rgba(59,130,246,0.15)", color: T.primary, border: "none", padding: "5px 9px", borderRadius: 7, fontSize: 11, cursor: "pointer", fontWeight: 600 }}>Edit</button>
              <button onClick={() => publishMutation.mutate(c._id)}
                style={{ background: c.isPublished ? "rgba(245,158,11,0.15)" : "rgba(16,185,129,0.15)", color: c.isPublished ? T.amber : T.green, border: "none", padding: "5px 8px", borderRadius: 7, fontSize: 11, cursor: "pointer", fontWeight: 600 }}>
                {c.isPublished ? "Unpub" : "Pub"}
              </button>
              <button onClick={() => { if (window.confirm("Delete this course?")) deleteMutation.mutate(c._id); }}
                style={{ background: "rgba(239,68,68,0.15)", color: T.red, border: "none", padding: "5px 8px", borderRadius: 7, fontSize: 11, cursor: "pointer", fontWeight: 600 }}>Del</button>
            </div>
          </div>
        ))}
      </div>

      {/* Course Modal */}
      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(4px)" }}
          onClick={() => setShowModal(false)}>
          <div style={{ background: T.bgCard, border: `1px solid ${T.border2}`, borderRadius: 20, padding: 32, width: 520, maxHeight: "85vh", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: 20, fontWeight: 800, color: T.text, marginBottom: 24, fontFamily: "Plus Jakarta Sans, sans-serif" }}>
              {editCourse ? "Edit Course" : "Add New Course"}
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {/* Simple text fields */}
              {[
                ["Title *", "title", "Course title"],
                ["Price (₹) *", "price", "e.g. 1499"],
                ["Original Price (₹)", "originalPrice", "e.g. 4999"],
                ["Tags (comma-separated)", "tags", "Python, OOP, DSA"],
              ].map(([label, key, placeholder]) => (
                <div key={key}>
                  <label style={{ fontSize: 12, color: T.textMuted, display: "block", marginBottom: 6 }}>{label}</label>
                  <input
                    type={key === "price" || key === "originalPrice" ? "number" : "text"}
                    value={form[key]}
                    onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))}
                    placeholder={placeholder}
                    style={{ width: "100%", background: T.bgCard2, border: `1px solid ${T.border}`, color: T.text, padding: "10px 14px", borderRadius: 10, fontSize: 14, outline: "none", boxSizing: "border-box" }}
                  />
                </div>
              ))}

              {/* Thumbnail — file upload → Cloudinary, or paste URL */}
              <div>
                <label style={{ fontSize: 12, color: T.textMuted, display: "block", marginBottom: 6 }}>Thumbnail</label>

                {/* Preview */}
                {form.thumbnail && !form.thumbnail.startsWith("data:") && (
                  <div style={{ marginBottom: 10, position: "relative", display: "inline-block" }}>
                    <img src={form.thumbnail} alt="thumbnail preview"
                      style={{ width: 160, height: 100, objectFit: "cover", borderRadius: 10, border: `1px solid ${T.border2}`, display: "block" }} />
                    <button onClick={() => setForm((p) => ({ ...p, thumbnail: "" }))}
                      style={{ position: "absolute", top: 4, right: 4, background: "rgba(0,0,0,0.7)", border: "none", color: "#fff", borderRadius: "50%", width: 22, height: 22, cursor: "pointer", fontSize: 12, lineHeight: "22px", textAlign: "center" }}>✕</button>
                  </div>
                )}

                {/* Upload button */}
                <label style={{ display: "inline-flex", alignItems: "center", gap: 8, background: T.primary, color: "#fff", padding: "9px 16px", borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: thumbUploading ? "not-allowed" : "pointer", opacity: thumbUploading ? 0.7 : 1, marginBottom: 8 }}>
                  {thumbUploading ? "⏳ Uploading…" : "📁 Upload Image"}
                  <input type="file" accept="image/*" onChange={handleThumbFile} disabled={thumbUploading} style={{ display: "none" }} />
                </label>

                {/* OR paste URL */}
                <div style={{ fontSize: 11, color: T.textDim, marginBottom: 4 }}>— or paste an image URL —</div>
                <input
                  type="text"
                  value={form.thumbnail}
                  onChange={(e) => setForm((p) => ({ ...p, thumbnail: e.target.value }))}
                  placeholder="https://images.unsplash.com/photo-…"
                  style={{ width: "100%", background: T.bgCard2, border: `1px solid ${T.border}`, color: T.text, padding: "10px 14px", borderRadius: 10, fontSize: 13, outline: "none", boxSizing: "border-box" }}
                />
              </div>

              {/* Description */}
              <div>
                <label style={{ fontSize: 12, color: T.textMuted, display: "block", marginBottom: 6 }}>Description *</label>
                <textarea value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} rows={3}
                  style={{ width: "100%", background: T.bgCard2, border: `1px solid ${T.border}`, color: T.text, padding: "10px 14px", borderRadius: 10, fontSize: 14, outline: "none", resize: "vertical", boxSizing: "border-box" }} />
              </div>

              {/* Category / Level / Language dropdowns */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                {[
                  ["Category", "category", ["Programming", "Web Development", "AI/ML", "Design", "DevOps", "Mobile", "Data Science", "Other"]],
                  ["Level", "level", ["Beginner", "Intermediate", "Advanced"]],
                  ["Language", "language", ["English", "Hindi", "Tamil", "Telugu", "Marathi", "Bengali", "Gujarati", "Kannada", "Bilingual (Hindi+English)"]],
                ].map(([label, key, opts]) => (
                  <div key={key}>
                    <label style={{ fontSize: 12, color: T.textMuted, display: "block", marginBottom: 6 }}>{label}</label>
                    <select value={form[key]} onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))}
                      style={{ width: "100%", background: T.bgCard2, border: `1px solid ${T.border}`, color: T.text, padding: "10px 14px", borderRadius: 10, fontSize: 14, outline: "none", cursor: "pointer" }}>
                      {opts.map((o) => <option key={o} value={o} style={{ background: T.bgCard2 }}>{o}</option>)}
                    </select>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
              <button onClick={handleSave} disabled={saveMutation.isPending}
                style={{ flex: 1, background: T.primary, color: "#fff", border: "none", padding: 12, borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: "pointer", opacity: saveMutation.isPending ? 0.7 : 1 }}>
                {saveMutation.isPending ? "Saving…" : editCourse ? "Save Changes" : "Create Course"}
              </button>
              <button onClick={() => setShowModal(false)}
                style={{ flex: 1, background: T.bgCard2, color: T.textMuted, border: `1px solid ${T.border}`, padding: 12, borderRadius: 10, fontSize: 14, cursor: "pointer" }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Users Page ────────────────────────────────────────────────────────────
function UsersPage({ notify }) {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  const { data: usersData, isLoading } = useQuery({
    queryKey: ["admin-users", search, filter],
    queryFn: () => adminAPI.getUsers({ search, role: filter === "all" ? "" : filter, limit: 50 }).then((r) => r.data.data.users),
    staleTime: 30_000,
  });

  const users = usersData || [];

  const roleMutation = useMutation({
    mutationFn: ({ id, role }) => adminAPI.changeUserRole(id, role),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-users"] }); notify("Role updated!", "success"); },
    onError: () => notify("Failed to update role.", "error"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => adminAPI.deleteUser(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-users"] }); notify("User deleted.", "info"); },
    onError: () => notify("Failed to delete user.", "error"),
  });

  if (isLoading) return <Spinner />;

  return (
    <div>
      <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name or email…"
          style={{ flex: 1, background: T.bgCard, border: `1px solid ${T.border}`, color: T.text, padding: "10px 14px", borderRadius: 10, fontSize: 14, outline: "none" }} />
        {["all", "student", "instructor", "admin"].map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            style={{ background: filter === f ? T.primary : T.bgCard, color: filter === f ? "#fff" : T.textMuted, border: `1px solid ${filter === f ? T.primary : T.border}`, padding: "8px 16px", borderRadius: 10, fontSize: 13, cursor: "pointer", textTransform: "capitalize" }}>
            {f}
          </button>
        ))}
      </div>

      <div style={{ background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: 16, overflow: "hidden" }}>
        {users.length === 0 && <div style={{ padding: 40, textAlign: "center", color: T.textDim }}>No users found.</div>}
        {users.map((u, i) => (
          <div key={u._id} style={{ display: "grid", gridTemplateColumns: "44px 1fr 180px 120px 180px", gap: 16, padding: "14px 20px", borderBottom: i < users.length - 1 ? `1px solid ${T.border}` : "none", alignItems: "center" }}>
            <div style={{ width: 36, height: 36, borderRadius: "50%", background: `${T.primary}25`, color: T.primary, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, overflow: "hidden" }}>
              {u.avatar ? <img src={u.avatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : u.name?.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <p style={{ fontSize: 14, fontWeight: 600, color: T.text, marginBottom: 2 }}>{u.name}</p>
              <p style={{ fontSize: 12, color: T.textMuted }}>{u.email}</p>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <StatusBadge status={u.role} />
              {u.isVerified
                ? <span style={{ fontSize: 11, color: T.green }}>✓ Verified</span>
                : <span style={{ fontSize: 11, color: T.amber }}>⚠ Unverified</span>}
            </div>
            <span style={{ fontSize: 12, color: T.textDim }}>
              {new Date(u.createdAt).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}
            </span>
            <div style={{ display: "flex", gap: 6 }}>
              <select
                value={u.role}
                onChange={(e) => roleMutation.mutate({ id: u._id, role: e.target.value })}
                style={{ background: T.bgCard2, border: `1px solid ${T.border}`, color: T.text, padding: "4px 8px", borderRadius: 7, fontSize: 12, cursor: "pointer" }}>
                {["student", "instructor", "admin"].map((r) => <option key={r} value={r} style={{ background: T.bgCard2 }}>{r}</option>)}
              </select>
              <button onClick={() => { if (window.confirm(`Delete ${u.name}?`)) deleteMutation.mutate(u._id); }}
                style={{ background: "rgba(239,68,68,0.15)", color: T.red, border: "none", padding: "5px 8px", borderRadius: 7, fontSize: 12, cursor: "pointer" }}>Del</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Transactions Page ─────────────────────────────────────────────────────
function TransactionsPage({ notify }) {
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: txData, isLoading } = useQuery({
    queryKey: ["admin-transactions", statusFilter],
    queryFn: () => adminAPI.getAllTransactions({ status: statusFilter === "all" ? "" : statusFilter, limit: 50 }).then((r) => r.data),
    staleTime: 30_000,
  });

  const txns = txData?.data?.transactions || [];
  const totalRevenue = txData?.totalRevenue || 0;

  const exportCSV = () => {
    const rows = [["ID", "User", "Course", "Amount", "Status", "Date"]];
    txns.forEach((t) => rows.push([t._id, t.user?.name, t.course?.title, t.amount, t.status, new Date(t.createdAt).toLocaleDateString("en-IN")]));
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "transactions.csv"; a.click();
    notify("CSV exported!", "success");
  };

  if (isLoading) return <Spinner />;

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14, marginBottom: 24 }}>
        {[
          { label: "Total Revenue", value: fmt(totalRevenue), color: T.green },
          { label: "Transactions", value: txData?.total || 0, color: T.primary },
          { label: "Failed", value: txns.filter((t) => t.status === "failed").length, color: T.red },
        ].map((s) => (
          <div key={s.label} style={{ background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: 14, padding: "16px 20px" }}>
            <p style={{ fontSize: 12, color: T.textMuted, marginBottom: 6 }}>{s.label}</p>
            <p style={{ fontSize: 22, fontWeight: 800, color: s.color, fontFamily: "Plus Jakarta Sans, sans-serif" }}>{s.value}</p>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
        <div style={{ display: "flex", gap: 6, flex: 1 }}>
          {["all", "success", "pending", "failed", "refunded"].map((f) => (
            <button key={f} onClick={() => setStatusFilter(f)}
              style={{ background: statusFilter === f ? T.primary : T.bgCard, color: statusFilter === f ? "#fff" : T.textMuted, border: `1px solid ${statusFilter === f ? T.primary : T.border}`, padding: "8px 16px", borderRadius: 10, fontSize: 13, cursor: "pointer", textTransform: "capitalize" }}>
              {f}
            </button>
          ))}
        </div>
        <button onClick={exportCSV}
          style={{ background: T.bgCard, border: `1px solid ${T.border}`, color: T.text, padding: "8px 18px", borderRadius: 10, fontSize: 13, cursor: "pointer" }}>
          📥 Export CSV
        </button>
      </div>

      <div style={{ background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: 16, overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 120px 180px 100px", gap: 16, padding: "12px 20px", background: T.bgCard2, borderBottom: `1px solid ${T.border}` }}>
          {["Student", "Course", "Amount", "Date", "Status"].map((h) => (
            <span key={h} style={{ fontSize: 11, fontWeight: 700, color: T.textDim, textTransform: "uppercase" }}>{h}</span>
          ))}
        </div>
        {txns.length === 0 && <div style={{ padding: 40, textAlign: "center", color: T.textDim }}>No transactions found.</div>}
        {txns.map((t, i) => (
          <div key={t._id} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 120px 180px 100px", gap: 16, padding: "14px 20px", borderBottom: i < txns.length - 1 ? `1px solid ${T.border}` : "none", alignItems: "center" }}>
            <span style={{ fontSize: 14, color: T.text }}>{t.user?.name || "—"}</span>
            <span style={{ fontSize: 13, color: T.textMuted }}>{t.course?.title || "—"}</span>
            <span style={{ fontSize: 14, fontWeight: 600, color: t.status === "success" ? T.green : T.text }}>{fmt(t.amount)}</span>
            <span style={{ fontSize: 12, color: T.textDim }}>{new Date(t.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</span>
            <StatusBadge status={t.status} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Settings Page ─────────────────────────────────────────────────────────
function SettingsPage({ notify }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: 16, padding: 24 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: T.text, marginBottom: 16 }}>💳 Payment Gateway (Razorpay)</h3>
        <p style={{ color: T.textMuted, fontSize: 14, marginBottom: 12 }}>Configure Razorpay keys in your <code style={{ color: T.primary }}>.env</code> file on the server:</p>
        {[["RAZORPAY_KEY_ID", "rzp_test_…"], ["RAZORPAY_KEY_SECRET", "••••••••"]].map(([key, ph]) => (
          <div key={key} style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 12, color: T.textMuted, display: "block", marginBottom: 6 }}>{key}</label>
            <input readOnly placeholder={ph} style={{ width: "100%", background: T.bgCard2, border: `1px solid ${T.border}`, color: T.textMuted, padding: "10px 14px", borderRadius: 10, fontSize: 14, outline: "none", boxSizing: "border-box", fontFamily: "monospace" }} />
          </div>
        ))}
        <p style={{ fontSize: 12, color: T.textDim, marginTop: 8 }}>
          Get your keys from <a href="https://dashboard.razorpay.com/app/keys" target="_blank" rel="noopener" style={{ color: T.primary }}>dashboard.razorpay.com</a>
        </p>
      </div>

      <div style={{ background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: 16, padding: 24 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: T.text, marginBottom: 16 }}>📧 Email (Gmail SMTP)</h3>
        <p style={{ color: T.textMuted, fontSize: 14 }}>Email is configured via <code style={{ color: T.primary }}>EMAIL_USER</code> / <code style={{ color: T.primary }}>EMAIL_PASS</code> in your .env file.</p>
        <p style={{ fontSize: 12, color: T.textDim, marginTop: 8 }}>Use a Gmail App Password (not your account password). Enable 2FA first.</p>
      </div>

      <div style={{ background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: 16, padding: 24 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: T.text, marginBottom: 16 }}>🔐 OAuth Providers</h3>
        {[{ name: "Google OAuth", enabled: !!import.meta.env.VITE_API_URL }, { name: "GitHub OAuth", enabled: true }].map((p) => (
          <div key={p.name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: `1px solid ${T.border}` }}>
            <span style={{ fontSize: 14, color: T.text }}>{p.name}</span>
            <StatusBadge status={p.enabled ? "active" : "draft"} />
          </div>
        ))}
        <p style={{ fontSize: 12, color: T.textDim, marginTop: 12 }}>Configure via GOOGLE_CLIENT_ID / GITHUB_CLIENT_ID in .env</p>
      </div>
    </div>
  );
}

// ─── Analytics Page ────────────────────────────────────────────────────────
function AnalyticsPage() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: () => adminAPI.getStats().then((r) => r.data.data),
    staleTime: 30_000,
  });
  const { data: monthly = [], isLoading: mLoading } = useQuery({
    queryKey: ["admin-monthly-revenue"],
    queryFn: () => adminAPI.getMonthlyRevenue().then((r) => r.data.data.monthly),
    staleTime: 60_000,
  });
  const { data: daily = [], isLoading: dLoading } = useQuery({
    queryKey: ["admin-daily-revenue"],
    queryFn: () => adminAPI.getDailyRevenue().then((r) => r.data.data.daily),
    staleTime: 60_000,
  });
  const { data: yearly = [] } = useQuery({
    queryKey: ["admin-yearly-revenue"],
    queryFn: () => adminAPI.getYearlyRevenue().then((r) => r.data.data.yearly),
    staleTime: 120_000,
  });

  if (statsLoading || mLoading || dLoading) return <Spinner />;

  const monthlyChart = monthly.map((m) => ({
    month: m.month?.split(" ")[0] || m.month,
    revenue: m.revenue,
    orders: m.count,
  }));
  const dailyChart = daily.map((d) => ({ day: d.date, revenue: d.revenue, orders: d.count }));

  // Pie: top 5 courses by revenue (using topCourses enrolled count as proxy)
  const COLORS = [T.primary, T.accent, T.green, T.amber, T.purple];
  const pieData = (stats?.topCourses || []).slice(0, 5).map((c) => ({
    name: c.title.length > 18 ? c.title.slice(0, 18) + "…" : c.title,
    value: c.totalStudents || 0,
  }));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* KPI row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16 }}>
        <StatCard icon="💰" label="Total Revenue" value={fmtK(stats?.totalRevenue || 0)} color={T.green} />
        <StatCard icon="📅" label="This Month" value={fmtK(stats?.monthlyRevenue || 0)} sub={`${stats?.monthlyTransactions || 0} orders`} color={T.primary} />
        <StatCard icon="🗓️" label="This Year" value={fmtK(stats?.yearlyRevenue || 0)} color={T.accent} />
        <StatCard icon="📈" label="Avg Order" value={stats?.totalTransactions ? fmtK(Math.round((stats.totalRevenue || 0) / stats.totalTransactions)) : "₹0"} color={T.amber} />
      </div>

      {/* Monthly revenue */}
      <div style={{ background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: 16, padding: 24 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: T.text, marginBottom: 20 }}>Monthly Revenue (last 12 months)</h3>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={monthlyChart.length ? monthlyChart : [{ month: "–", revenue: 0 }]}>
            <defs>
              <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={T.primary} stopOpacity={1} />
                <stop offset="100%" stopColor={T.accent} stopOpacity={0.8} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
            <XAxis dataKey="month" stroke={T.textDim} tick={{ fill: T.textMuted, fontSize: 12 }} />
            <YAxis stroke={T.textDim} tick={{ fill: T.textMuted, fontSize: 11 }} tickFormatter={(v) => `₹${v / 1000}K`} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="revenue" name="revenue" fill="url(#barGrad)" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Daily revenue + pie chart */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 20 }}>
        <div style={{ background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: 16, padding: 24 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: T.text, marginBottom: 20 }}>Daily Revenue (last 30 days)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={dailyChart.length ? dailyChart : [{ day: "–", revenue: 0 }]}>
              <defs>
                <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={T.green} stopOpacity={0.35} />
                  <stop offset="95%" stopColor={T.green} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
              <XAxis dataKey="day" stroke={T.textDim} tick={{ fill: T.textMuted, fontSize: 10 }} interval="preserveStartEnd" />
              <YAxis stroke={T.textDim} tick={{ fill: T.textMuted, fontSize: 11 }} tickFormatter={(v) => `₹${v / 1000}K`} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="revenue" name="revenue" stroke={T.green} fill="url(#areaGrad)" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div style={{ background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: 16, padding: 24 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: T.text, marginBottom: 20 }}>Top Courses by Enrolments</h3>
          {pieData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={75} dataKey="value" paddingAngle={3}>
                    {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v, n) => [v + " students", n]} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 10 }}>
                {pieData.map((d, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 10, height: 10, borderRadius: 3, background: COLORS[i % COLORS.length], flexShrink: 0 }} />
                    <span style={{ fontSize: 12, color: T.textMuted, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.name}</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: T.text }}>{d.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p style={{ color: T.textDim, fontSize: 13 }}>No course data yet.</p>
          )}
        </div>
      </div>

      {/* Yearly table */}
      {yearly.length > 0 && (
        <div style={{ background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: 16, padding: 24 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: T.text, marginBottom: 16 }}>Year-over-Year Revenue</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 14 }}>
            {yearly.map((y) => (
              <div key={y.year} style={{ background: T.bgCard2, border: `1px solid ${T.border}`, borderRadius: 12, padding: "14px 16px" }}>
                <p style={{ fontSize: 12, color: T.textMuted, marginBottom: 4 }}>{y.year}</p>
                <p style={{ fontSize: 20, fontWeight: 800, color: T.green, fontFamily: "Plus Jakarta Sans, sans-serif" }}>{fmtK(y.revenue)}</p>
                <p style={{ fontSize: 11, color: T.textDim }}>{y.count} orders</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Coupons Page ──────────────────────────────────────────────────────────
const EMPTY_COUPON = { code: "", discountType: "percentage", discountValue: "", minPurchase: "0", maxDiscount: "", expiresAt: "", usageLimit: "0", description: "", isActive: true };

function CouponsPage({ notify }) {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editCoupon, setEditCoupon] = useState(null);
  const [form, setForm] = useState(EMPTY_COUPON);

  const { data: coupons = [], isLoading } = useQuery({
    queryKey: ["admin-coupons"],
    queryFn: () => couponAPI.getAll().then((r) => r.data.data.coupons),
    staleTime: 30_000,
  });

  const saveMutation = useMutation({
    mutationFn: (data) => editCoupon ? couponAPI.update(editCoupon._id, data) : couponAPI.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-coupons"] });
      notify(editCoupon ? "Coupon updated!" : "Coupon created!", "success");
      setShowModal(false); setEditCoupon(null); setForm(EMPTY_COUPON);
    },
    onError: (err) => notify(err.response?.data?.message || "Save failed.", "error"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => couponAPI.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-coupons"] }); notify("Coupon deleted.", "info"); },
    onError: () => notify("Delete failed.", "error"),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }) => couponAPI.update(id, { isActive }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-coupons"] }); notify("Status updated.", "success"); },
    onError: () => notify("Update failed.", "error"),
  });

  const openEdit = (c) => {
    setEditCoupon(c);
    setForm({
      code: c.code, discountType: c.discountType, discountValue: c.discountValue,
      minPurchase: c.minPurchase ?? 0, maxDiscount: c.maxDiscount ?? "",
      expiresAt: c.expiresAt ? new Date(c.expiresAt).toISOString().split("T")[0] : "",
      usageLimit: c.usageLimit ?? 0, description: c.description ?? "", isActive: c.isActive,
    });
    setShowModal(true);
  };

  const handleSave = () => {
    if (!form.code?.trim()) { notify("Coupon code is required.", "error"); return; }
    if (!form.discountValue && form.discountValue !== 0) { notify("Please enter a discount value.", "error"); return; }
    if (Number(form.discountValue) <= 0) { notify("Discount value must be greater than 0.", "error"); return; }
    if (form.discountType === "percentage" && Number(form.discountValue) > 100) { notify("Percentage discount cannot exceed 100.", "error"); return; }
    const payload = {
      code: form.code.trim().toUpperCase(),
      discountType: form.discountType,
      discountValue: Number(form.discountValue),
      minPurchase: Number(form.minPurchase) || 0,
      maxDiscount: form.maxDiscount ? Number(form.maxDiscount) : undefined,
      expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : undefined,
      usageLimit: Number(form.usageLimit) || 0,
      description: form.description?.trim() || undefined,
      isActive: form.isActive,
    };
    saveMutation.mutate(payload);
  };

  if (isLoading) return <Spinner />;

  const active = coupons.filter((c) => c.isActive).length;
  const totalUsed = coupons.reduce((s, c) => s + (c.usedCount || 0), 0);

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14, marginBottom: 24 }}>
        {[
          { label: "Total Coupons", value: coupons.length, color: T.primary },
          { label: "Active", value: active, color: T.green },
          { label: "Total Redemptions", value: totalUsed, color: T.amber },
        ].map((s) => (
          <div key={s.label} style={{ background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: 14, padding: "16px 20px" }}>
            <p style={{ fontSize: 12, color: T.textMuted, marginBottom: 6 }}>{s.label}</p>
            <p style={{ fontSize: 22, fontWeight: 800, color: s.color, fontFamily: "Plus Jakarta Sans, sans-serif" }}>{s.value}</p>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
        <button onClick={() => { setEditCoupon(null); setForm(EMPTY_COUPON); setShowModal(true); }}
          style={{ background: T.primary, color: "#fff", border: "none", padding: "10px 22px", borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
          + New Coupon
        </button>
      </div>

      <div style={{ background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: 16, overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "140px 110px 90px 90px 120px 80px 80px 160px", gap: 12, padding: "12px 20px", background: T.bgCard2, borderBottom: `1px solid ${T.border}` }}>
          {["Code", "Type", "Value", "Min Buy", "Expires", "Uses", "Active", "Actions"].map((h) => (
            <span key={h} style={{ fontSize: 11, fontWeight: 700, color: T.textDim, textTransform: "uppercase" }}>{h}</span>
          ))}
        </div>
        {coupons.length === 0 && <div style={{ padding: 40, textAlign: "center", color: T.textDim }}>No coupons yet. Create your first coupon!</div>}
        {coupons.map((c, i) => (
          <div key={c._id} style={{ display: "grid", gridTemplateColumns: "140px 110px 90px 90px 120px 80px 80px 160px", gap: 12, padding: "14px 20px", borderBottom: i < coupons.length - 1 ? `1px solid ${T.border}` : "none", alignItems: "center" }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: T.primary, fontFamily: "monospace", letterSpacing: 1 }}>{c.code}</span>
            <StatusBadge status={c.discountType === "percentage" ? "sent" : "pending"} />
            <span style={{ fontSize: 14, fontWeight: 600, color: T.text }}>
              {c.discountType === "percentage" ? `${c.discountValue}%` : `₹${c.discountValue}`}
              {c.discountType === "percentage" && c.maxDiscount ? <span style={{ fontSize: 10, color: T.textDim }}> (max ₹{c.maxDiscount})</span> : null}
            </span>
            <span style={{ fontSize: 13, color: T.textMuted }}>{c.minPurchase ? `₹${c.minPurchase}` : "—"}</span>
            <span style={{ fontSize: 12, color: c.expiresAt && new Date(c.expiresAt) < new Date() ? T.red : T.textMuted }}>
              {c.expiresAt ? new Date(c.expiresAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "Never"}
            </span>
            <span style={{ fontSize: 13, color: T.textMuted }}>
              {c.usedCount || 0}{c.usageLimit > 0 ? ` / ${c.usageLimit}` : ""}
            </span>
            <button onClick={() => toggleMutation.mutate({ id: c._id, isActive: !c.isActive })}
              style={{ background: c.isActive ? "rgba(16,185,129,0.15)" : "rgba(100,116,139,0.15)", color: c.isActive ? T.green : T.textMuted, border: "none", padding: "5px 10px", borderRadius: 7, fontSize: 11, cursor: "pointer", fontWeight: 600 }}>
              {c.isActive ? "Active" : "Off"}
            </button>
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={() => openEdit(c)}
                style={{ background: "rgba(59,130,246,0.15)", color: T.primary, border: "none", padding: "5px 10px", borderRadius: 7, fontSize: 11, cursor: "pointer", fontWeight: 600 }}>Edit</button>
              <button onClick={() => { if (window.confirm(`Delete coupon "${c.code}"?`)) deleteMutation.mutate(c._id); }}
                style={{ background: "rgba(239,68,68,0.15)", color: T.red, border: "none", padding: "5px 10px", borderRadius: 7, fontSize: 11, cursor: "pointer", fontWeight: 600 }}>Del</button>
            </div>
          </div>
        ))}
      </div>

      {/* Create / Edit Modal */}
      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(4px)" }}
          onClick={() => setShowModal(false)}>
          <div style={{ background: T.bgCard, border: `1px solid ${T.border2}`, borderRadius: 20, padding: 32, width: 500, maxHeight: "88vh", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: 20, fontWeight: 800, color: T.text, marginBottom: 24, fontFamily: "Plus Jakarta Sans, sans-serif" }}>
              {editCoupon ? "Edit Coupon" : "Create New Coupon"}
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {/* Code */}
              <div>
                <label style={{ fontSize: 12, color: T.textMuted, display: "block", marginBottom: 6 }}>Coupon Code *</label>
                <input value={form.code} onChange={(e) => setForm((p) => ({ ...p, code: e.target.value.toUpperCase() }))} placeholder="e.g. SAVE20"
                  style={{ width: "100%", background: T.bgCard2, border: `1px solid ${T.border}`, color: T.text, padding: "10px 14px", borderRadius: 10, fontSize: 14, outline: "none", boxSizing: "border-box", fontFamily: "monospace", letterSpacing: 2 }} />
              </div>
              {/* Type + Value */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, color: T.textMuted, display: "block", marginBottom: 6 }}>Discount Type *</label>
                  <select value={form.discountType} onChange={(e) => setForm((p) => ({ ...p, discountType: e.target.value }))}
                    style={{ width: "100%", background: T.bgCard2, border: `1px solid ${T.border}`, color: T.text, padding: "10px 14px", borderRadius: 10, fontSize: 14, outline: "none", cursor: "pointer" }}>
                    <option value="percentage">Percentage (%)</option>
                    <option value="flat">Flat Amount (₹)</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, color: T.textMuted, display: "block", marginBottom: 6 }}>Discount Value *</label>
                  <input type="number" value={form.discountValue} onChange={(e) => setForm((p) => ({ ...p, discountValue: e.target.value }))}
                    placeholder={form.discountType === "percentage" ? "e.g. 20" : "e.g. 500"} min="1"
                    style={{ width: "100%", background: T.bgCard2, border: `1px solid ${T.border}`, color: T.text, padding: "10px 14px", borderRadius: 10, fontSize: 14, outline: "none", boxSizing: "border-box" }} />
                </div>
              </div>
              {/* Min purchase + Max discount */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, color: T.textMuted, display: "block", marginBottom: 6 }}>Min Purchase (₹)</label>
                  <input type="number" value={form.minPurchase} onChange={(e) => setForm((p) => ({ ...p, minPurchase: e.target.value }))} placeholder="0" min="0"
                    style={{ width: "100%", background: T.bgCard2, border: `1px solid ${T.border}`, color: T.text, padding: "10px 14px", borderRadius: 10, fontSize: 14, outline: "none", boxSizing: "border-box" }} />
                </div>
                {form.discountType === "percentage" && (
                  <div>
                    <label style={{ fontSize: 12, color: T.textMuted, display: "block", marginBottom: 6 }}>Max Discount Cap (₹)</label>
                    <input type="number" value={form.maxDiscount} onChange={(e) => setForm((p) => ({ ...p, maxDiscount: e.target.value }))} placeholder="Optional" min="0"
                      style={{ width: "100%", background: T.bgCard2, border: `1px solid ${T.border}`, color: T.text, padding: "10px 14px", borderRadius: 10, fontSize: 14, outline: "none", boxSizing: "border-box" }} />
                  </div>
                )}
              </div>
              {/* Expiry + Usage limit */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, color: T.textMuted, display: "block", marginBottom: 6 }}>Expiry Date</label>
                  <input type="date" value={form.expiresAt} onChange={(e) => setForm((p) => ({ ...p, expiresAt: e.target.value }))}
                    style={{ width: "100%", background: T.bgCard2, border: `1px solid ${T.border}`, color: T.text, padding: "10px 14px", borderRadius: 10, fontSize: 14, outline: "none", boxSizing: "border-box", colorScheme: "dark" }} />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: T.textMuted, display: "block", marginBottom: 6 }}>Usage Limit (0 = unlimited)</label>
                  <input type="number" value={form.usageLimit} onChange={(e) => setForm((p) => ({ ...p, usageLimit: e.target.value }))} placeholder="0" min="0"
                    style={{ width: "100%", background: T.bgCard2, border: `1px solid ${T.border}`, color: T.text, padding: "10px 14px", borderRadius: 10, fontSize: 14, outline: "none", boxSizing: "border-box" }} />
                </div>
              </div>
              {/* Description */}
              <div>
                <label style={{ fontSize: 12, color: T.textMuted, display: "block", marginBottom: 6 }}>Description (shown to users)</label>
                <input value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} placeholder="e.g. 20% off on all courses this week!"
                  style={{ width: "100%", background: T.bgCard2, border: `1px solid ${T.border}`, color: T.text, padding: "10px 14px", borderRadius: 10, fontSize: 14, outline: "none", boxSizing: "border-box" }} />
              </div>
              {/* Active */}
              <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                <input type="checkbox" checked={form.isActive} onChange={(e) => setForm((p) => ({ ...p, isActive: e.target.checked }))}
                  style={{ width: 16, height: 16, accentColor: T.primary }} />
                <span style={{ fontSize: 14, color: T.text }}>Active (visible to users)</span>
              </label>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
              <button onClick={handleSave} disabled={saveMutation.isPending}
                style={{ flex: 1, background: T.primary, color: "#fff", border: "none", padding: 12, borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: "pointer", opacity: saveMutation.isPending ? 0.7 : 1 }}>
                {saveMutation.isPending ? "Saving…" : editCoupon ? "Save Changes" : "Create Coupon"}
              </button>
              <button onClick={() => setShowModal(false)}
                style={{ flex: 1, background: T.bgCard2, color: T.textMuted, border: `1px solid ${T.border}`, padding: 12, borderRadius: 10, fontSize: 14, cursor: "pointer" }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Reviews Manager Page ──────────────────────────────────────────────────
function ReviewsPage({ notify }) {
  const qc = useQueryClient();

  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ["admin-reviews"],
    queryFn: () => adminAPI.getReviews().then((r) => r.data.data.reviews),
    staleTime: 30_000,
  });

  const deleteMutation = useMutation({
    mutationFn: ({ courseId, reviewId }) => adminAPI.deleteReview(courseId, reviewId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-reviews"] }); notify("Review deleted.", "info"); },
    onError: () => notify("Delete failed.", "error"),
  });

  if (isLoading) return <Spinner />;

  const avgRating = reviews.length
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : 0;

  const Stars = ({ rating }) => (
    <span style={{ color: T.amber, fontSize: 13 }}>
      {"★".repeat(rating)}{"☆".repeat(5 - rating)}
      <span style={{ color: T.textMuted, marginLeft: 4, fontWeight: 600 }}>{rating}</span>
    </span>
  );

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14, marginBottom: 24 }}>
        {[
          { label: "Total Reviews", value: reviews.length, color: T.primary },
          { label: "Avg Rating", value: `${avgRating} ★`, color: T.amber },
          { label: "5-Star Reviews", value: reviews.filter((r) => r.rating === 5).length, color: T.green },
        ].map((s) => (
          <div key={s.label} style={{ background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: 14, padding: "16px 20px" }}>
            <p style={{ fontSize: 12, color: T.textMuted, marginBottom: 6 }}>{s.label}</p>
            <p style={{ fontSize: 22, fontWeight: 800, color: s.color, fontFamily: "Plus Jakarta Sans, sans-serif" }}>{s.value}</p>
          </div>
        ))}
      </div>

      <div style={{ background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: 16, overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 160px 100px 1fr 120px 60px", gap: 14, padding: "12px 20px", background: T.bgCard2, borderBottom: `1px solid ${T.border}` }}>
          {["Course", "Student", "Rating", "Comment", "Date", ""].map((h) => (
            <span key={h} style={{ fontSize: 11, fontWeight: 700, color: T.textDim, textTransform: "uppercase" }}>{h}</span>
          ))}
        </div>
        {reviews.length === 0 && (
          <div style={{ padding: 40, textAlign: "center", color: T.textDim }}>No reviews yet.</div>
        )}
        {reviews.map((r, i) => (
          <div key={r._id} style={{ display: "grid", gridTemplateColumns: "1fr 160px 100px 1fr 120px 60px", gap: 14, padding: "14px 20px", borderBottom: i < reviews.length - 1 ? `1px solid ${T.border}` : "none", alignItems: "center" }}>
            <span style={{ fontSize: 13, color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.courseTitle}</span>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {r.user?.avatar
                ? <img src={r.user.avatar} alt="" style={{ width: 26, height: 26, borderRadius: "50%", objectFit: "cover" }} />
                : <div style={{ width: 26, height: 26, borderRadius: "50%", background: `${T.primary}25`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: T.primary }}>{r.user?.name?.slice(0, 2).toUpperCase() || "?"}</div>}
              <span style={{ fontSize: 12, color: T.textMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.user?.name || "Anonymous"}</span>
            </div>
            <Stars rating={r.rating} />
            <span style={{ fontSize: 12, color: T.textMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.comment || <em>No comment</em>}</span>
            <span style={{ fontSize: 11, color: T.textDim }}>{new Date(r.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
            <button onClick={() => { if (window.confirm("Delete this review?")) deleteMutation.mutate({ courseId: r.courseId, reviewId: r._id }); }}
              style={{ background: "rgba(239,68,68,0.15)", color: T.red, border: "none", padding: "5px 10px", borderRadius: 7, fontSize: 11, cursor: "pointer", fontWeight: 600 }}>Del</button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Announcements Page ────────────────────────────────────────────────────
function AnnouncementsPage({ notify }) {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [lastResult, setLastResult] = useState(null);

  const handleSend = async () => {
    if (!subject.trim()) { notify("Subject is required.", "error"); return; }
    if (!message.trim()) { notify("Message is required.", "error"); return; }
    if (!window.confirm(`Send this announcement to all verified users?\n\nSubject: ${subject}`)) return;
    setSending(true);
    try {
      const res = await adminAPI.sendAnnouncement({ subject: subject.trim(), message: message.trim() });
      setLastResult(res.data);
      notify(`✅ Queued for ${res.data.data.userCount} users!`, "success");
      setSubject(""); setMessage("");
    } catch (err) {
      notify(err.response?.data?.message || "Send failed.", "error");
    } finally {
      setSending(false);
    }
  };

  const previewHtml = message
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/\n/g, "<br/>");

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 400px", gap: 20, alignItems: "start" }}>
      {/* Compose */}
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div style={{ background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: 16, padding: 24 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: T.text, marginBottom: 20, fontFamily: "Plus Jakarta Sans, sans-serif" }}>📢 Compose Announcement</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={{ fontSize: 12, color: T.textMuted, display: "block", marginBottom: 6 }}>Subject *</label>
              <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. New courses available this week!"
                style={{ width: "100%", background: T.bgCard2, border: `1px solid ${T.border}`, color: T.text, padding: "11px 14px", borderRadius: 10, fontSize: 14, outline: "none", boxSizing: "border-box" }} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: T.textMuted, display: "block", marginBottom: 6 }}>Message *</label>
              <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={10}
                placeholder={"Hi {name},\n\nWe're excited to announce...\n\nHappy Learning,\nCodeLearn Team"}
                style={{ width: "100%", background: T.bgCard2, border: `1px solid ${T.border}`, color: T.text, padding: "11px 14px", borderRadius: 10, fontSize: 14, outline: "none", resize: "vertical", boxSizing: "border-box", lineHeight: 1.6 }} />
              <p style={{ fontSize: 11, color: T.textDim, marginTop: 6 }}>Plain text — line breaks are preserved. Will be sent to all verified users.</p>
            </div>
            <button onClick={handleSend} disabled={sending}
              style={{ background: sending ? T.bgCard2 : T.primary, color: sending ? T.textMuted : "#fff", border: "none", padding: "13px 24px", borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: sending ? "not-allowed" : "pointer", transition: "background 0.2s" }}>
              {sending ? "⏳ Sending…" : "📧 Send to All Users"}
            </button>
          </div>
        </div>

        {lastResult && (
          <div style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 14, padding: 20 }}>
            <p style={{ color: T.green, fontWeight: 700, fontSize: 14, marginBottom: 4 }}>✅ Announcement Sent!</p>
            <p style={{ color: T.textMuted, fontSize: 13 }}>{lastResult.message}</p>
          </div>
        )}
      </div>

      {/* Preview */}
      <div style={{ background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: 16, padding: 24, position: "sticky", top: 20 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: T.text, marginBottom: 16 }}>Live Preview</h3>
        <div style={{ background: "#0A0A0F", borderRadius: 12, padding: 24, border: "1px solid rgba(255,255,255,0.06)" }}>
          <span style={{ fontSize: 20, fontWeight: 900, color: "#E8471A", fontFamily: "Plus Jakarta Sans, sans-serif", letterSpacing: -0.5 }}>CodeLearn</span>
          <div style={{ marginTop: 20, marginBottom: 8 }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: "#E2E8F0", marginBottom: 8 }}>📢 {subject || <em style={{ color: "#334155" }}>Subject preview…</em>}</p>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", lineHeight: 1.8 }}
              dangerouslySetInnerHTML={{ __html: previewHtml || '<em style="color:#334155">Message preview…</em>' }} />
          </div>
          <div style={{ marginTop: 20, paddingTop: 14, borderTop: "1px solid rgba(255,255,255,0.07)", fontSize: 11, color: "rgba(255,255,255,0.2)" }}>
            © {new Date().getFullYear()} CodeLearn. All rights reserved.
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Admin Dashboard ──────────────────────────────────────────────────
export default function AdminDashboard() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [activePage, setActivePage] = useState("dashboard");
  const [notifications, setNotifications] = useState([]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Redirect if not admin
  useEffect(() => {
    if (!user) { navigate("/login"); return; }
    if (user.role !== "admin") { navigate("/"); }
  }, [user]);

  const notify = (msg, type = "info") => {
    const id = Date.now();
    setNotifications((prev) => [...prev, { id, msg, type }]);
    setTimeout(() => setNotifications((prev) => prev.filter((n) => n.id !== id)), 3500);
  };

  if (!user || user.role !== "admin") return null;

  const navItems = [
    { id: "dashboard",      icon: "⊞",  label: "Dashboard" },
    { id: "courses",        icon: "📚", label: "Courses" },
    { id: "users",          icon: "👥", label: "Users" },
    { id: "transactions",   icon: "💳", label: "Transactions" },
    { id: "analytics",      icon: "📊", label: "Analytics" },
    { id: "coupons",        icon: "🎟️", label: "Coupons" },
    { id: "reviews",        icon: "⭐", label: "Reviews" },
    { id: "announcements",  icon: "📢", label: "Announcements" },
    { id: "settings",       icon: "⚙️", label: "Settings" },
  ];

  const pageMap = {
    dashboard:     <DashboardPage />,
    courses:       <CoursesPage notify={notify} />,
    users:         <UsersPage notify={notify} />,
    transactions:  <TransactionsPage notify={notify} />,
    analytics:     <AnalyticsPage />,
    coupons:       <CouponsPage notify={notify} />,
    reviews:       <ReviewsPage notify={notify} />,
    announcements: <AnnouncementsPage notify={notify} />,
    settings:      <SettingsPage notify={notify} />,
  };

  const pageTitles = {
    dashboard:     "Overview",
    courses:       "Course Management",
    users:         "User Management",
    transactions:  "Payments & Transactions",
    analytics:     "Revenue Analytics",
    coupons:       "Coupons & Discounts",
    reviews:       "Reviews Manager",
    announcements: "Announcements",
    settings:      "Settings",
  };

  const notifColors = { success: T.green, error: T.red, info: T.primary };

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: T.bg, fontFamily: "Inter, sans-serif", color: T.text }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Inter:wght@300;400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
      `}</style>

      {/* Sidebar */}
      <div style={{ width: sidebarCollapsed ? 64 : 220, background: T.bgCard, borderRight: `1px solid ${T.border}`, display: "flex", flexDirection: "column", flexShrink: 0, transition: "width 0.25s", overflow: "hidden" }}>
        <div style={{ padding: "20px 16px", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: T.primary, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 16, color: "#fff", fontFamily: "Plus Jakarta Sans, sans-serif", flexShrink: 0 }}>C</div>
          {!sidebarCollapsed && <span style={{ fontSize: 17, fontWeight: 800, color: T.text, fontFamily: "Plus Jakarta Sans, sans-serif", whiteSpace: "nowrap" }}>CodeLearn</span>}
        </div>
        <nav style={{ flex: 1, padding: "12px 8px", overflowY: "auto" }}>
          {navItems.map((item) => (
            <button key={item.id} onClick={() => setActivePage(item.id)}
              style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "10px 10px", borderRadius: 10, marginBottom: 2, background: activePage === item.id ? `${T.primary}20` : "transparent", color: activePage === item.id ? T.primary : T.textMuted, border: "none", cursor: "pointer", fontSize: 14, fontWeight: activePage === item.id ? 600 : 400, whiteSpace: "nowrap" }}>
              <span style={{ fontSize: 16, flexShrink: 0 }}>{item.icon}</span>
              {!sidebarCollapsed && item.label}
            </button>
          ))}
        </nav>
        <div style={{ padding: "16px 10px", borderTop: `1px solid ${T.border}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <img src={user.avatar} alt="" style={{ width: 34, height: 34, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
            {!sidebarCollapsed && (
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.name}</p>
                <p style={{ fontSize: 11, color: T.textMuted }}>Admin</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <header style={{ background: T.bgCard, borderBottom: `1px solid ${T.border}`, padding: "14px 28px", display: "flex", alignItems: "center", gap: 16, flexShrink: 0 }}>
          <button onClick={() => setSidebarCollapsed((p) => !p)}
            style={{ background: "none", border: "none", color: T.textMuted, fontSize: 20, cursor: "pointer" }}>☰</button>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: T.text, fontFamily: "Plus Jakarta Sans, sans-serif" }}>{pageTitles[activePage]}</h1>
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 14 }}>
            <Link to="/" style={{ background: T.bgCard2, border: `1px solid ${T.border}`, color: T.textMuted, padding: "7px 14px", borderRadius: 10, fontSize: 13, textDecoration: "none" }}>
              🏠 View Site
            </Link>
            <button onClick={() => { logout(); navigate("/"); }}
              style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: T.red, padding: "7px 14px", borderRadius: 10, fontSize: 13, cursor: "pointer" }}>
              Sign out
            </button>
          </div>
        </header>

        <main style={{ flex: 1, overflowY: "auto", padding: 28 }}>
          {pageMap[activePage]}
        </main>
      </div>

      {/* Toast notifications */}
      <div style={{ position: "fixed", top: 20, right: 20, zIndex: 9999, display: "flex", flexDirection: "column", gap: 8 }}>
        {notifications.map((n) => (
          <div key={n.id} style={{ background: T.bgCard2, borderLeft: `3px solid ${notifColors[n.type] || T.primary}`, borderRadius: 10, padding: "12px 16px", fontSize: 13, color: T.text, display: "flex", gap: 10, boxShadow: "0 4px 20px rgba(0,0,0,0.4)", animation: "slideIn 0.3s ease" }}>
            <span>{n.type === "success" ? "✅" : n.type === "error" ? "❌" : "ℹ️"}</span>
            {n.msg}
          </div>
        ))}
      </div>
    </div>
  );
}
