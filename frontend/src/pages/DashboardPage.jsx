import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import useAuthStore from "../store/useAuthStore";
import { userAPI } from "../api";
import Loader from "../components/Loader";

export default function DashboardPage() {
  const { user } = useAuthStore();

  const { data, isLoading } = useQuery({
    queryKey: ["enrolled-courses"],
    queryFn: () => userAPI.getEnrolledCourses().then((r) => r.data.data.courses),
    staleTime: 60_000,
  });

  const courses = data || [];

  // Stats
  const totalLectures = courses.reduce(
    (acc, c) =>
      acc + (c.sections || []).reduce((s, sec) => s + (sec.lectures?.length || 0), 0),
    0
  );

  const categories = [...new Set(courses.map((c) => c.category).filter(Boolean))];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 animate-fade-in">
      {/* ── Header ── */}
      <div className="mb-10">
        <h1 className="font-display font-black text-3xl sm:text-4xl mb-2">
          👋 Welcome back, {user?.name?.split(" ")[0]}!
        </h1>
        <p className="text-white/40 text-sm">
          Track your progress and continue where you left off.
        </p>
      </div>

      {/* ── Stats row ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
        {[
          { icon: "📚", label: "Enrolled", value: courses.length },
          { icon: "🎬", label: "Total Lectures", value: totalLectures },
          { icon: "🏷️", label: "Categories", value: categories.length },
          { icon: "🔥", label: "Active", value: courses.length > 0 ? "Yes" : "No" },
        ].map(({ icon, label, value }) => (
          <div
            key={label}
            className="bg-bg-card border border-white/[0.07] rounded-2xl p-5 text-center"
          >
            <div className="text-2xl mb-1">{icon}</div>
            <div className="font-display font-black text-2xl text-primary">{value}</div>
            <div className="text-xs text-white/30 mt-1">{label}</div>
          </div>
        ))}
      </div>

      {/* ── Enrolled Courses ── */}
      <div className="mb-6 flex items-center justify-between">
        <h2 className="font-display font-bold text-xl">My Courses</h2>
        <Link to="/courses" className="text-sm text-primary hover:text-primary-light transition-colors">
          Browse more →
        </Link>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader />
        </div>
      ) : courses.length === 0 ? (
        <div className="text-center py-24 bg-bg-card border border-white/[0.07] rounded-3xl">
          <div className="text-6xl mb-5">📖</div>
          <h2 className="font-display font-bold text-xl mb-3">No courses yet</h2>
          <p className="text-white/40 mb-6 text-sm">
            Enroll in a course to start your learning journey.
          </p>
          <Link to="/courses" className="btn-primary inline-flex">
            Browse Courses →
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {courses.map((course) => {
            const totalLecs = (course.sections || []).reduce(
              (s, sec) => s + (sec.lectures?.length || 0),
              0
            );
            return (
              <div
                key={course._id}
                className="bg-bg-card border border-white/[0.07] rounded-2xl overflow-hidden hover:border-white/[0.14] transition-all group"
              >
                {/* Thumbnail */}
                <div className="relative overflow-hidden" style={{ aspectRatio: "16/9" }}>
                  <img
                    src={
                      course.thumbnail ||
                      "https://images.unsplash.com/photo-1516116216624-53e697fedbea?w=400&q=70"
                    }
                    alt={course.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  {/* Continue overlay */}
                  <Link
                    to={`/learn/${course._id}`}
                    className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                  >
                    <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center shadow-xl">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                        <polygon points="5 3 19 12 5 21 5 3" />
                      </svg>
                    </div>
                  </Link>
                  {course.category && (
                    <span className="absolute top-3 left-3 badge bg-black/60 text-white/80 text-[10px] border border-white/10">
                      {course.category}
                    </span>
                  )}
                </div>

                <div className="p-4">
                  <h3 className="font-display font-bold text-sm leading-snug mb-1 line-clamp-2">
                    {course.title}
                  </h3>
                  <p className="text-xs text-white/40 mb-3">
                    {course.instructor?.name || course.instructorName || "CodeLearn"}
                    {totalLecs > 0 && ` · ${totalLecs} lectures`}
                  </p>

                  {/* Progress bar — placeholder (0%) until backend tracks progress */}
                  <div className="mb-3">
                    <div className="flex items-center justify-between text-xs text-white/30 mb-1">
                      <span>Progress</span>
                      <span>0%</span>
                    </div>
                    <div className="h-1.5 bg-white/[0.07] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: "0%" }}
                      />
                    </div>
                  </div>

                  <Link
                    to={`/learn/${course._id}`}
                    className="btn-primary text-xs w-full justify-center py-2.5 block text-center"
                  >
                    ▶ Continue Learning
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Quick links ── */}
      {courses.length > 0 && (
        <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { icon: "❤️", label: "Wishlist", desc: "Courses you've saved", to: "/wishlist" },
            { icon: "👤", label: "Profile", desc: "View & edit your profile", to: "/profile" },
            { icon: "🛒", label: "Cart", desc: "Your pending purchases", to: "/cart" },
          ].map(({ icon, label, desc, to }) => (
            <Link
              key={label}
              to={to}
              className="flex items-center gap-4 bg-bg-card border border-white/[0.07] rounded-2xl p-4 hover:border-white/[0.14] hover:bg-white/[0.02] transition-all"
            >
              <span className="text-2xl">{icon}</span>
              <div>
                <p className="font-semibold text-sm">{label}</p>
                <p className="text-xs text-white/40">{desc}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
