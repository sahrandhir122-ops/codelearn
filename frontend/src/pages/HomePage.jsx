import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { courseAPI } from "../api";
import CourseCard from "../components/CourseCard";
import Loader from "../components/Loader";
import useAuthStore from "../store/useAuthStore";

const CATEGORIES = ["All", "Programming", "Web Development", "AI/ML", "DevOps", "Design"];

const STATS = [
  { value: "1.5L+", label: "Students" },
  { value: "50+",   label: "Courses"  },
  { value: "4.8★",  label: "Avg Rating" },
  { value: "95%",   label: "Placement" },
];

const TESTIMONIALS = [
  { name: "Ankita Sharma", role: "SDE at Amazon",   text: "CodeLearn helped me crack my FAANG interview. The DSA course is unmatched!", avatar: "AS" },
  { name: "Rohit Mehta",   role: "Freelance Dev",   text: "I went from zero to building full-stack apps in 3 months. Worth every rupee.", avatar: "RM" },
  { name: "Priya Nair",    role: "ML Engineer",     text: "The ML course covers everything from basics to deployment. Truly industry-grade.", avatar: "PN" },
];

// ── Skeleton card shown while loading ──────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="card animate-pulse">
      <div className="bg-white/[0.06] rounded-xl" style={{ aspectRatio: "16/9" }} />
      <div className="p-4 space-y-3">
        <div className="flex gap-2">
          <div className="h-5 w-16 bg-white/[0.06] rounded-full" />
          <div className="h-5 w-12 bg-white/[0.06] rounded-full" />
        </div>
        <div className="h-4 bg-white/[0.06] rounded w-4/5" />
        <div className="h-4 bg-white/[0.06] rounded w-3/5" />
        <div className="h-3 bg-white/[0.06] rounded w-1/3 mt-2" />
        <div className="h-10 bg-white/[0.06] rounded-xl mt-4" />
      </div>
    </div>
  );
}

export default function HomePage() {
  const [category, setCategory] = useState("All");
  const [search, setSearch]     = useState("");
  const { user } = useAuthStore();

  // ── Featured / popular courses (top 3) ─────────────────────────────────
  const { data: featuredData, isLoading: featLoading } = useQuery({
    queryKey: ["home-featured"],
    queryFn: () =>
      courseAPI.getAll({ sort: "popular", limit: 3 }).then((r) => r.data),
    staleTime: 5 * 60_000,
  });

  // ── Browse grid (category + search) ────────────────────────────────────
  const { data: browseData, isLoading: browseLoading } = useQuery({
    queryKey: ["home-browse", category, search],
    queryFn: () =>
      courseAPI
        .getAll({
          category: category !== "All" ? category : undefined,
          search:   search   || undefined,
          sort:     "popular",
          limit:    6,
        })
        .then((r) => r.data),
    staleTime: 60_000,
    placeholderData: (prev) => prev,
  });

  const featuredCourses = featuredData?.data?.courses || [];
  const browseCourses   = browseData?.data?.courses   || [];
  const browseTotal     = browseData?.total            || 0;

  return (
    <div className="animate-fade-in">

      {/* ── Hero ── */}
      <section className="relative overflow-hidden px-4 pt-20 pb-16 text-center">
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] rounded-full pointer-events-none"
          style={{ background: "radial-gradient(ellipse, rgba(232,71,26,0.14) 0%, transparent 70%)", filter: "blur(40px)" }}
        />

        <div className="relative max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-2 mb-8 text-sm text-primary font-semibold">
            🔥 1,50,000+ learners · India's fastest growing platform
          </div>

          <h1 className="font-display font-black text-5xl sm:text-6xl md:text-7xl leading-[1.05] mb-6 tracking-tight">
            Learn to code.{" "}
            <span className="gradient-text block">Build your future.</span>
          </h1>

          <p className="text-lg text-white/50 leading-relaxed max-w-xl mx-auto mb-10">
            Industry-led courses in Python, Web Dev, ML, and more — taught by professionals,
            at prices built for India.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link to="/courses" className="btn-primary px-8 py-4 text-base w-full sm:w-auto justify-center">
              Explore Courses →
            </Link>
            <button className="btn-ghost px-8 py-4 text-base w-full sm:w-auto justify-center">
              ▶ Watch Demo
            </button>
          </div>

          {/* Stats */}
          <div className="flex items-center justify-center gap-8 mt-14 flex-wrap">
            {STATS.map((s) => (
              <div key={s.label} className="text-center">
                <div className="font-display font-black text-3xl text-white mb-1">{s.value}</div>
                <div className="text-xs text-white/30 uppercase tracking-widest">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Trust bar ── */}
      <div className="border-y border-white/[0.07] py-5 overflow-hidden bg-white/[0.02]">
        <div className="flex gap-12 items-center justify-center flex-wrap px-8">
          {["Google", "Amazon", "Microsoft", "Flipkart", "Swiggy", "Razorpay", "Zerodha", "Meesho"].map((co) => (
            <span key={co} className="text-sm font-semibold text-white/20 tracking-widest uppercase whitespace-nowrap">
              {co}
            </span>
          ))}
        </div>
        <p className="text-center text-xs text-white/20 mt-3">Our students work at</p>
      </div>

      {/* ── Featured Courses ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="section-title mb-1">Featured Courses</h2>
            <p className="text-sm text-white/40">Handpicked by our instructors</p>
          </div>
          <Link to="/courses" className="text-sm text-primary font-semibold hover:text-primary-light transition-colors">
            View all →
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {featLoading
            ? [1, 2, 3].map((n) => <SkeletonCard key={n} />)
            : featuredCourses.length > 0
              ? featuredCourses.map((c) => <CourseCard key={c._id} course={c} />)
              : (
                <div className="col-span-3 text-center py-12 text-white/40">
                  No courses yet — add some from the Admin Dashboard.
                </div>
              )
          }
        </div>
      </section>

      {/* ── Browse All Courses ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-16">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="section-title mb-1">All Courses</h2>
            <p className="text-sm text-white/40">
              {browseLoading ? "Loading…" : `${browseTotal} courses available`}
            </p>
          </div>
          <div className="w-full sm:w-72">
            <input
              className="input"
              placeholder="Search courses or instructors…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Category pills */}
        <div className="flex gap-2 flex-wrap mb-8">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`tab-btn ${category === cat ? "active" : ""}`}
            >
              {cat}
            </button>
          ))}
        </div>

        {browseLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3, 4, 5, 6].map((n) => <SkeletonCard key={n} />)}
          </div>
        ) : browseCourses.length > 0 ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {browseCourses.map((c) => <CourseCard key={c._id} course={c} />)}
            </div>
            {browseTotal > 6 && (
              <div className="text-center mt-10">
                <Link to={`/courses${category !== "All" ? `?category=${encodeURIComponent(category)}` : ""}`}
                  className="btn-ghost px-8 py-3 inline-flex">
                  Browse all {browseTotal} courses →
                </Link>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">🔍</div>
            <p className="text-white/40 mb-4">No courses match your search.</p>
            <button onClick={() => { setSearch(""); setCategory("All"); }}
              className="btn-ghost text-sm inline-flex">
              Clear filters
            </button>
          </div>
        )}
      </section>

      {/* ── Testimonials ── */}
      <section className="border-t border-white/[0.07] bg-white/[0.02] py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <h2 className="section-title text-center mb-2">What our students say</h2>
          <p className="text-center text-sm text-white/40 mb-10">Real stories from real learners</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {TESTIMONIALS.map((t) => (
              <div key={t.name} className="bg-bg-card border border-white/[0.07] rounded-2xl p-6">
                <p className="text-sm text-white/60 leading-relaxed mb-5">"{t.text}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/20 text-primary font-bold text-sm flex items-center justify-center flex-shrink-0">
                    {t.avatar}
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{t.name}</p>
                    <p className="text-xs text-white/40">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <section className="py-20 px-4 text-center"
        style={{ background: "linear-gradient(135deg, rgba(232,71,26,0.12) 0%, rgba(245,183,49,0.06) 100%)" }}>
        <h2 className="font-display font-black text-4xl mb-4">Ready to level up your skills?</h2>
        <p className="text-white/50 text-lg mb-8 max-w-lg mx-auto">
          Join 1,50,000+ learners building India's tech future with CodeLearn.
        </p>
        <Link
          to={user ? "/courses" : "/register"}
          className="btn-primary px-10 py-4 text-base inline-flex"
        >
          {user ? "Browse Courses →" : "Get Started Free →"}
        </Link>
      </section>

    </div>
  );
}
