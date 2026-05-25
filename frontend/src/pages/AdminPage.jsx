import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { adminAPI } from "../api";
import Loader from "../components/Loader";
import toast from "react-hot-toast";

const MOCK_STATS = {
  totalUsers: 42380,
  totalCourses: 6,
  totalRevenue: 3840000,
  totalTransactions: 2560,
  newUsersToday: 38,
  topCourses: [
    { title: "Complete Python Bootcamp", totalStudents: 42300, rating: 4.8, thumbnail: "https://images.unsplash.com/photo-1526379879527-8559ecfcaec0?w=100&q=80" },
    { title: "Full Stack Web Dev", totalStudents: 38100, rating: 4.9, thumbnail: "https://images.unsplash.com/photo-1627398242454-45a1465c2479?w=100&q=80" },
    { title: "Machine Learning A–Z", totalStudents: 29500, rating: 4.7, thumbnail: "https://images.unsplash.com/photo-1677442135703-1787eea5ce01?w=100&q=80" },
  ],
  recentTransactions: [
    { user: { name: "Priya S.", email: "priya@example.com" }, course: { title: "Python Bootcamp" }, amount: 1499, createdAt: "2026-05-24" },
    { user: { name: "Arjun M.", email: "arjun@example.com" }, course: { title: "Full Stack React" }, amount: 1999, createdAt: "2026-05-23" },
    { user: { name: "Sneha K.", email: "sneha@example.com" }, course: { title: "Machine Learning" }, amount: 2499, createdAt: "2026-05-22" },
    { user: { name: "Rahul V.", email: "rahul@example.com" }, course: { title: "DevOps & Cloud" }, amount: 2199, createdAt: "2026-05-21" },
    { user: { name: "Ananya R.", email: "ananya@example.com" }, course: { title: "UI/UX Design" }, amount: 1299, createdAt: "2026-05-20" },
  ],
};

const MOCK_USERS = [
  { _id: "u1", name: "Priya Sharma", email: "priya@example.com", role: "student", isVerified: true, createdAt: "2026-04-10" },
  { _id: "u2", name: "Arjun Mehta", email: "arjun@example.com", role: "student", isVerified: true, createdAt: "2026-04-12" },
  { _id: "u3", name: "Rohan Verma", email: "rohan@example.com", role: "instructor", isVerified: true, createdAt: "2026-03-01" },
  { _id: "u4", name: "Divya K.", email: "divya@example.com", role: "student", isVerified: false, createdAt: "2026-05-20" },
];

const MONTHLY_REVENUE = [
  { month: "Jan", revenue: 210000 },
  { month: "Feb", revenue: 280000 },
  { month: "Mar", revenue: 350000 },
  { month: "Apr", revenue: 480000 },
  { month: "May", revenue: 620000 },
];

const StatCard = ({ label, value, sub, color = "#E8471A" }) => (
  <div className="bg-bg-card2 border border-white/[0.07] rounded-2xl p-6 relative overflow-hidden">
    <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-10"
      style={{ background: color }} />
    <p className="text-xs font-medium text-white/30 uppercase tracking-widest mb-3">{label}</p>
    <p className="font-display font-black text-3xl mb-1" style={{ color }}>{value}</p>
    <p className="text-xs text-white/30">{sub}</p>
  </div>
);

export default function AdminPage() {
  const [tab, setTab] = useState("overview");
  const stats = MOCK_STATS;
  const maxRevenue = Math.max(...MONTHLY_REVENUE.map((m) => m.revenue));

  const TABS = ["overview", "courses", "users", "transactions", "analytics"];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display font-black text-3xl mb-1">Admin Dashboard</h1>
          <p className="text-white/40 text-sm">Manage your platform</p>
        </div>
        <button className="btn-primary text-sm">+ Add Course</button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 flex-wrap mb-8">
        {TABS.map((t) => (
          <button key={t} className={`tab-btn capitalize ${tab === t ? "active" : ""}`}
            onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>

      {/* ── Overview ── */}
      {tab === "overview" && (
        <div className="animate-fade-in space-y-8">
          {/* Stats grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Total Revenue" value={`₹${(stats.totalRevenue / 100000).toFixed(1)}L`} sub="+23% from last month" color="#2ECC71" />
            <StatCard label="Total Students" value={stats.totalUsers.toLocaleString("en-IN")} sub={`+${stats.newUsersToday} today`} color="#E8471A" />
            <StatCard label="Courses" value={stats.totalCourses} sub="Across 5 categories" color="#3B82F6" />
            <StatCard label="Transactions" value={stats.totalTransactions.toLocaleString()} sub="All time" color="#F5B731" />
          </div>

          {/* Top courses + Recent transactions */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-bg-card border border-white/[0.07] rounded-2xl p-6">
              <h3 className="font-display font-bold text-lg mb-4">Top Courses</h3>
              <div className="space-y-4">
                {stats.topCourses.map((c, i) => (
                  <div key={c.title} className="flex items-center gap-3">
                    <span className="text-sm font-bold text-white/20 w-4">{i + 1}</span>
                    <img src={c.thumbnail} alt="" className="w-12 h-9 object-cover rounded-lg flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{c.title}</p>
                      <p className="text-xs text-white/30">{c.totalStudents.toLocaleString()} students · ⭐ {c.rating}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-bg-card border border-white/[0.07] rounded-2xl p-6">
              <h3 className="font-display font-bold text-lg mb-4">Recent Transactions</h3>
              <div className="space-y-3">
                {stats.recentTransactions.slice(0, 5).map((t, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-white/[0.05] last:border-0">
                    <div>
                      <p className="text-sm font-medium">{t.user.name}</p>
                      <p className="text-xs text-white/30">{t.course.title}</p>
                    </div>
                    <span className="text-sm font-bold text-accent-green">₹{t.amount.toLocaleString("en-IN")}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Courses ── */}
      {tab === "courses" && (
        <div className="animate-fade-in bg-bg-card border border-white/[0.07] rounded-2xl overflow-hidden">
          <div className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-4 px-5 py-3 border-b border-white/[0.07] text-xs font-semibold text-white/30 uppercase tracking-wider">
            {["Course", "Students", "Revenue", "Rating", "Actions"].map((h) => <span key={h}>{h}</span>)}
          </div>
          {[
            { title: "Complete Python Bootcamp", thumbnail: "https://images.unsplash.com/photo-1526379879527-8559ecfcaec0?w=100&q=80", students: 42300, revenue: 63328700, rating: 4.8 },
            { title: "Full Stack Web Dev", thumbnail: "https://images.unsplash.com/photo-1627398242454-45a1465c2479?w=100&q=80", students: 38100, revenue: 76183900, rating: 4.9 },
            { title: "Machine Learning A–Z", thumbnail: "https://images.unsplash.com/photo-1677442135703-1787eea5ce01?w=100&q=80", students: 29500, revenue: 73752500, rating: 4.7 },
          ].map((c, i) => (
            <div key={i} className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-4 px-5 py-4 border-b border-white/[0.05] last:border-0 items-center">
              <div className="flex items-center gap-3">
                <img src={c.thumbnail} alt="" className="w-12 h-9 object-cover rounded-lg flex-shrink-0" />
                <span className="text-sm font-medium">{c.title}</span>
              </div>
              <span className="text-sm text-white/60">{c.students.toLocaleString()}</span>
              <span className="text-sm text-accent-green font-medium">₹{(c.revenue / 100000).toFixed(1)}L</span>
              <span className="text-sm">⭐ {c.rating}</span>
              <div className="flex gap-2">
                <button className="bg-accent-blue/15 text-accent-blue border-0 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer hover:bg-accent-blue/25 transition-colors">Edit</button>
                <button className="bg-red-500/15 text-red-400 border-0 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer hover:bg-red-500/25 transition-colors">Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Users ── */}
      {tab === "users" && (
        <div className="animate-fade-in space-y-4">
          <input className="input max-w-sm" placeholder="Search users…" />
          <div className="bg-bg-card border border-white/[0.07] rounded-2xl overflow-hidden">
            <div className="grid grid-cols-[2fr_1fr_1fr_1fr] gap-4 px-5 py-3 border-b border-white/[0.07] text-xs font-semibold text-white/30 uppercase tracking-wider">
              {["User", "Role", "Status", "Joined"].map((h) => <span key={h}>{h}</span>)}
            </div>
            {MOCK_USERS.map((u) => (
              <div key={u._id} className="grid grid-cols-[2fr_1fr_1fr_1fr] gap-4 px-5 py-4 border-b border-white/[0.05] last:border-0 items-center">
                <div>
                  <p className="text-sm font-medium">{u.name}</p>
                  <p className="text-xs text-white/30">{u.email}</p>
                </div>
                <span className={`badge text-[10px] w-fit ${u.role === "admin" ? "bg-primary/15 text-primary" : u.role === "instructor" ? "bg-accent-blue/15 text-accent-blue" : "bg-white/[0.07] text-white/50"}`}>
                  {u.role}
                </span>
                <span className={`badge text-[10px] w-fit ${u.isVerified ? "bg-accent-green/15 text-accent-green" : "bg-yellow-500/15 text-yellow-400"}`}>
                  {u.isVerified ? "Verified" : "Pending"}
                </span>
                <span className="text-xs text-white/30">
                  {new Date(u.createdAt).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Transactions ── */}
      {tab === "transactions" && (
        <div className="animate-fade-in bg-bg-card border border-white/[0.07] rounded-2xl overflow-hidden">
          <div className="grid grid-cols-[auto_2fr_1fr_1fr_1fr] gap-4 px-5 py-3 border-b border-white/[0.07] text-xs font-semibold text-white/30 uppercase tracking-wider">
            {["ID", "Course", "Student", "Amount", "Date"].map((h) => <span key={h}>{h}</span>)}
          </div>
          {stats.recentTransactions.map((t, i) => (
            <div key={i} className="grid grid-cols-[auto_2fr_1fr_1fr_1fr] gap-4 px-5 py-4 border-b border-white/[0.05] last:border-0 items-center">
              <span className="text-xs text-white/30 font-mono">#{1000 + i}</span>
              <span className="text-sm">{t.course.title}</span>
              <span className="text-sm text-white/60">{t.user.name}</span>
              <span className="text-sm font-bold text-accent-green">₹{t.amount.toLocaleString("en-IN")}</span>
              <span className="text-xs text-white/30">
                {new Date(t.createdAt).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* ── Analytics ── */}
      {tab === "analytics" && (
        <div className="animate-fade-in space-y-6">
          <div className="bg-bg-card border border-white/[0.07] rounded-2xl p-6">
            <h3 className="font-display font-bold text-lg mb-6">Monthly Revenue</h3>
            <div className="flex items-end gap-3 h-48">
              {MONTHLY_REVENUE.map((m) => (
                <div key={m.month} className="flex-1 flex flex-col items-center gap-2">
                  <span className="text-xs text-white/40 font-medium">
                    ₹{(m.revenue / 1000).toFixed(0)}K
                  </span>
                  <div className="w-full rounded-t-lg transition-all"
                    style={{
                      height: `${(m.revenue / maxRevenue) * 140}px`,
                      background: `linear-gradient(180deg, #E8471A, #C93A12)`,
                      minHeight: 8,
                    }} />
                  <span className="text-xs text-white/40">{m.month}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-bg-card border border-white/[0.07] rounded-2xl p-6">
              <h3 className="font-display font-bold text-lg mb-4">Course Completion Rates</h3>
              <div className="space-y-4">
                {[
                  { label: "Python Bootcamp", pct: 78 },
                  { label: "Full Stack React", pct: 65 },
                  { label: "Machine Learning", pct: 52 },
                  { label: "UI/UX Design", pct: 45 },
                  { label: "DevOps & Cloud", pct: 38 },
                ].map((item) => (
                  <div key={item.label}>
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className="text-white/60 text-xs">{item.label}</span>
                      <span className="text-primary font-semibold text-xs">{item.pct}%</span>
                    </div>
                    <div className="h-1.5 bg-white/[0.07] rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${item.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-bg-card border border-white/[0.07] rounded-2xl p-6">
              <h3 className="font-display font-bold text-lg mb-4">Category Distribution</h3>
              <div className="space-y-3">
                {[
                  { label: "Programming", pct: 45, color: "#E8471A" },
                  { label: "Web Development", pct: 25, color: "#3B82F6" },
                  { label: "AI/ML", pct: 15, color: "#F5B731" },
                  { label: "Design", pct: 10, color: "#2ECC71" },
                  { label: "DevOps", pct: 5, color: "#A855F7" },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: item.color }} />
                    <span className="text-xs text-white/60 flex-1">{item.label}</span>
                    <span className="text-xs font-semibold text-white/80">{item.pct}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
