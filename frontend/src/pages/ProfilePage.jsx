import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import useAuthStore from "../store/useAuthStore";
import useWishlistStore from "../store/useWishlistStore";
import { userAPI, paymentAPI } from "../api";
import Loader from "../components/Loader";

export default function ProfilePage() {
  const { user, setUser, logout } = useAuthStore();
  const { wishlist } = useWishlistStore();
  const navigate = useNavigate();
  const [tab, setTab] = useState("courses");
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState({ name: user?.name || "", bio: user?.bio || "" });
  const [saving, setSaving] = useState(false);

  // Password change state
  const [pwForm, setPwForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [pwSaving, setPwSaving] = useState(false);

  // ── Enrolled courses ────────────────────────────────────────────────────
  const { data: enrolledData, isLoading: coursesLoading } = useQuery({
    queryKey: ["enrolled-courses"],
    queryFn: () => userAPI.getEnrolledCourses().then((r) => r.data.data.courses),
    staleTime: 60_000,
  });

  // ── Watch history (for progress calculation) ────────────────────────────
  const { data: watchData } = useQuery({
    queryKey: ["watch-history"],
    queryFn: () => userAPI.getWatchHistory().then((r) => r.data.data.watchHistory),
    staleTime: 60_000,
  });
  const watchHistory = watchData || [];

  // ── Purchase history ────────────────────────────────────────────────────
  const { data: historyData, isLoading: historyLoading } = useQuery({
    queryKey: ["payment-history"],
    queryFn: () => paymentAPI.getHistory().then((r) => r.data.data.transactions),
    enabled: tab === "history",
    staleTime: 60_000,
  });

  const enrolledCourses = enrolledData || [];
  const history = historyData || [];

  // ── Save profile ────────────────────────────────────────────────────────
  const saveProfile = async () => {
    if (!form.name.trim()) { toast.error("Name cannot be empty"); return; }
    setSaving(true);
    try {
      const { data } = await userAPI.updateProfile(form);
      setUser({ ...user, ...data.data.user });
      setEditMode(false);
      toast.success("Profile updated!");
    } catch {
      toast.error("Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async () => {
    const { currentPassword, newPassword, confirmPassword } = pwForm;
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error("Please fill in all password fields.");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("New password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match.");
      return;
    }
    setPwSaving(true);
    try {
      await userAPI.changePassword({ currentPassword, newPassword });
      toast.success("Password changed successfully! 🔐");
      setPwForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to change password.");
    } finally {
      setPwSaving(false);
    }
  };

  const TABS = ["courses", "history", "settings"];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 animate-fade-in">
      {/* ── Profile Header ── */}
      <div className="bg-bg-card border border-white/[0.07] rounded-3xl p-6 mb-8 flex flex-col sm:flex-row items-start sm:items-center gap-6">
        <div className="relative flex-shrink-0">
          <img
            src={user?.avatar}
            alt=""
            className="w-20 h-20 rounded-2xl object-cover border-2 border-primary/40"
          />
          <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-accent-green border-2 border-bg" />
        </div>

        <div className="flex-1 min-w-0">
          {editMode ? (
            <div className="space-y-3">
              <input
                className="input max-w-xs"
                value={form.name}
                placeholder="Your name"
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              />
              <textarea
                className="input resize-none max-w-sm"
                rows={2}
                placeholder="Short bio…"
                value={form.bio}
                onChange={(e) => setForm((p) => ({ ...p, bio: e.target.value }))}
              />
              <div className="flex gap-2">
                <button className="btn-primary text-sm py-2" onClick={saveProfile} disabled={saving}>
                  {saving ? "Saving…" : "Save"}
                </button>
                <button
                  className="btn-ghost text-sm py-2"
                  onClick={() => { setEditMode(false); setForm({ name: user?.name || "", bio: user?.bio || "" }); }}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              <h2 className="font-display font-black text-2xl mb-1">{user?.name}</h2>
              <p className="text-white/40 text-sm mb-1">{user?.email}</p>
              {user?.bio && <p className="text-white/50 text-sm">{user.bio}</p>}
              <div className="flex items-center gap-2 mt-2">
                <span className={`text-xs px-2 py-1 rounded-full font-semibold
                  ${user?.role === "admin" ? "bg-red-500/15 text-red-400" : "bg-primary/15 text-primary"}`}>
                  {user?.role === "admin" ? "⚙️ Admin" : "🎓 Student"}
                </span>
                {user?.isVerified && (
                  <span className="text-xs px-2 py-1 rounded-full bg-accent-green/15 text-accent-green font-semibold">
                    ✓ Verified
                  </span>
                )}
              </div>
            </>
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 flex-shrink-0">
          <div className="text-center px-4">
            <div className="font-display font-black text-2xl text-primary">
              {enrolledCourses.length}
            </div>
            <div className="text-xs text-white/30">Enrolled</div>
          </div>
          <div className="text-center px-4">
            <div className="font-display font-black text-2xl text-primary">
              {history.length}
            </div>
            <div className="text-xs text-white/30">Purchases</div>
          </div>
          <div className="text-center px-4">
            <div className="font-display font-black text-2xl text-red-400">
              {wishlist.length}
            </div>
            <div className="text-xs text-white/30">Wishlist</div>
          </div>
          {!editMode && (
            <button className="btn-ghost text-sm py-2" onClick={() => setEditMode(true)}>
              ✏️ Edit Profile
            </button>
          )}
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-1 mb-8 overflow-x-auto pb-1">
        {TABS.map((t) => (
          <button
            key={t}
            className={`tab-btn capitalize flex-shrink-0 ${tab === t ? "active" : ""}`}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>

      {/* ── My Courses ── */}
      {tab === "courses" && (
        <div className="animate-fade-in">
          {coursesLoading ? (
            <div className="flex justify-center py-16"><Loader /></div>
          ) : enrolledCourses.length === 0 ? (
            <div className="text-center py-20">
              <div className="text-5xl mb-4">📚</div>
              <p className="text-white/40 mb-4">You haven't enrolled in any courses yet.</p>
              <Link to="/courses" className="btn-primary inline-flex">Browse Courses →</Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {enrolledCourses.map((course) => {
                const totalLectures = (course.sections || []).reduce(
                  (s, sec) => s + (sec.lectures?.length || 0), 0
                );
                const completedCount = watchHistory.filter(
                  (w) =>
                    (w.course?._id || w.course)?.toString() === course._id.toString() &&
                    w.progress >= 100
                ).length;
                const progressPct = totalLectures > 0
                  ? Math.min(100, Math.round((completedCount / totalLectures) * 100))
                  : 0;
                const isDone = progressPct === 100;

                return (
                  <div
                    key={course._id}
                    className="bg-bg-card border border-white/[0.07] rounded-2xl overflow-hidden hover:border-white/[0.12] transition-colors"
                  >
                    <div className="flex gap-4 p-4">
                      <img
                        src={course.thumbnail}
                        alt={course.title}
                        className="w-20 h-14 object-cover rounded-xl flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-display font-bold text-sm mb-1 truncate">
                          {course.title}
                        </h4>
                        <p className="text-xs text-white/40 mb-3">
                          {course.instructor?.name || "CodeLearn"}
                          {totalLectures > 0 && ` · ${totalLectures} lectures`}
                        </p>
                        <div className="h-1.5 bg-white/[0.07] rounded-full mb-1.5 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${progressPct}%`,
                              background: isDone
                                ? "linear-gradient(90deg,#10B981,#059669)"
                                : "linear-gradient(90deg,#E8471A,#F5B731)",
                            }}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs" style={{ color: isDone ? "#10B981" : "rgba(255,255,255,0.35)" }}>
                            {isDone ? "✓ Completed" : `${progressPct}% · ${completedCount}/${totalLectures} lectures`}
                          </span>
                          <Link
                            to={`/learn/${course._id}`}
                            className="text-xs text-primary font-semibold hover:text-primary-light"
                          >
                            {isDone ? "Review →" : "▶ Continue →"}
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Purchase History ── */}
      {tab === "history" && (
        <div className="animate-fade-in">
          {historyLoading ? (
            <div className="flex justify-center py-16"><Loader /></div>
          ) : history.length === 0 ? (
            <div className="text-center py-20">
              <div className="text-5xl mb-4">🧾</div>
              <p className="text-white/40 mb-4">No purchases yet.</p>
              <Link to="/courses" className="btn-primary inline-flex">Browse Courses →</Link>
            </div>
          ) : (
            <div className="space-y-3">
              {history.map((txn) => (
                <div
                  key={txn._id}
                  className="flex items-center gap-4 bg-bg-card border border-white/[0.07] rounded-2xl p-4"
                >
                  {txn.course?.thumbnail && (
                    <img
                      src={txn.course.thumbnail}
                      alt=""
                      className="w-16 h-12 object-cover rounded-xl flex-shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm mb-1 truncate">
                      {txn.course?.title || "Course"}
                    </p>
                    <p className="text-xs text-white/30">
                      {new Date(txn.createdAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                      {txn.razorpayOrderId && ` · ${txn.razorpayOrderId}`}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-display font-bold text-lg text-accent-green">
                      ₹{Number(txn.amount).toLocaleString("en-IN")}
                    </p>
                    <span className="badge bg-accent-green/10 text-accent-green text-[10px]">
                      Paid
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}


      {/* ── Settings ── */}
      {tab === "settings" && (
        <div className="animate-fade-in max-w-lg space-y-6">
          <div className="bg-bg-card border border-white/[0.07] rounded-2xl p-6">
            <h3 className="font-display font-bold text-lg mb-4">Account Settings</h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-white/40 mb-1.5 block">
                  Display Name
                </label>
                <input
                  className="input"
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-white/40 mb-1.5 block">
                  Bio
                </label>
                <textarea
                  className="input resize-none"
                  rows={3}
                  placeholder="Tell us about yourself…"
                  value={form.bio}
                  onChange={(e) => setForm((p) => ({ ...p, bio: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-white/40 mb-1.5 block">Email</label>
                <input
                  className="input"
                  value={user?.email}
                  disabled
                  style={{ opacity: 0.4, cursor: "not-allowed" }}
                />
                <p className="text-xs text-white/25 mt-1">Email cannot be changed.</p>
              </div>
              <button
                className="btn-primary text-sm"
                onClick={saveProfile}
                disabled={saving}
              >
                {saving ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </div>

          {/* Change Password */}
          <div className="bg-bg-card border border-white/[0.07] rounded-2xl p-6">
            <h3 className="font-display font-bold text-lg mb-1">Change Password</h3>
            <p className="text-xs text-white/30 mb-4">
              Leave blank if you signed up with Google / GitHub.
            </p>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-white/40 mb-1.5 block">Current Password</label>
                <input
                  className="input"
                  type="password"
                  placeholder="••••••••"
                  value={pwForm.currentPassword}
                  onChange={(e) => setPwForm((p) => ({ ...p, currentPassword: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-white/40 mb-1.5 block">New Password</label>
                <input
                  className="input"
                  type="password"
                  placeholder="Min 6 characters"
                  value={pwForm.newPassword}
                  onChange={(e) => setPwForm((p) => ({ ...p, newPassword: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-white/40 mb-1.5 block">Confirm New Password</label>
                <input
                  className="input"
                  type="password"
                  placeholder="Repeat new password"
                  value={pwForm.confirmPassword}
                  onChange={(e) => setPwForm((p) => ({ ...p, confirmPassword: e.target.value }))}
                />
              </div>
              <button
                className="btn-primary text-sm"
                onClick={changePassword}
                disabled={pwSaving}
              >
                {pwSaving ? "Changing…" : "🔐 Change Password"}
              </button>
            </div>
          </div>

          {/* Quick links */}
          <div className="bg-bg-card border border-white/[0.07] rounded-2xl p-5">
            <h3 className="font-display font-bold text-base mb-3">Quick Links</h3>
            <div className="space-y-2">
              <Link to="/dashboard"
                className="flex items-center gap-3 text-sm text-white/60 hover:text-white transition-colors py-1">
                📚 My Learning Dashboard
              </Link>
              <Link to="/wishlist"
                className="flex items-center gap-3 text-sm text-white/60 hover:text-white transition-colors py-1">
                ❤️ My Wishlist ({wishlist.length})
              </Link>
            </div>
          </div>

          <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-6">
            <h3 className="font-display font-bold text-lg text-red-400 mb-2">Danger Zone</h3>
            <p className="text-sm text-white/40 mb-4">
              Signing out will clear your local session.
            </p>
            <button
              className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-2 rounded-xl text-sm font-medium hover:bg-red-500/20 transition-colors"
              onClick={() => { logout(); navigate("/"); }}
            >
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
