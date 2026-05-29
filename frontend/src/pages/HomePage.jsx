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

const TESTIMONIALS_ROW1 = [
  { name: "Ankita Sharma",   role: "SDE at Amazon",        rating: 5, text: "CodeLearn helped me crack my FAANG interview. The DSA course is unmatched!", avatar: "AS", color: "#E8471A" },
  { name: "Rohit Mehta",     role: "Freelance Dev",        rating: 5, text: "I went from zero to building full-stack apps in 3 months. Worth every rupee.", avatar: "RM", color: "#3B82F6" },
  { name: "Priya Nair",      role: "ML Engineer",          rating: 5, text: "The ML course covers everything from basics to deployment. Truly industry-grade.", avatar: "PN", color: "#10B981" },
  { name: "Karan Verma",     role: "Backend Developer",    rating: 5, text: "Python + Django course was exactly what I needed for my startup. Highly recommended!", avatar: "KV", color: "#8B5CF6" },
  { name: "Sneha Patel",     role: "Data Analyst",         rating: 5, text: "The data science roadmap is so well structured. Got placed at a top MNC after this!", avatar: "SP", color: "#F59E0B" },
  { name: "Arjun Singh",     role: "DevOps Engineer",      rating: 5, text: "Best DevOps course in India. Covered Docker, Kubernetes, CI/CD — everything!", avatar: "AS", color: "#06B6D4" },
  { name: "Meera Joshi",     role: "Frontend Developer",   rating: 5, text: "React and Next.js courses are so practical. Built 3 projects and got hired!", avatar: "MJ", color: "#EC4899" },
];

const TESTIMONIALS_ROW2 = [
  { name: "Vikram Rao",      role: "SDE-2 at Google",     rating: 5, text: "The system design course alone is worth ₹10,000. Got it for ₹999. Insane value.", avatar: "VR", color: "#E8471A" },
  { name: "Pooja Agarwal",   role: "AI Researcher",        rating: 5, text: "Best investment I made in 2024. The Gen AI course is ahead of every platform.", avatar: "PA", color: "#3B82F6" },
  { name: "Rahul Gupta",     role: "Startup Founder",      rating: 5, text: "Learned full-stack in 45 days and launched my SaaS. CodeLearn is a gem!", avatar: "RG", color: "#10B981" },
  { name: "Divya Menon",     role: "Product Manager",      rating: 5, text: "SQL and analytics course helped me transition from ops to PM. Life-changing.", avatar: "DM", color: "#8B5CF6" },
  { name: "Amit Tiwari",     role: "Cloud Architect",      rating: 5, text: "AWS course content is up-to-date and the assignments are real-world. Love it!", avatar: "AT", color: "#F59E0B" },
  { name: "Riya Sharma",     role: "Mobile Developer",     rating: 5, text: "React Native course is brilliant. Released my first app on Play Store after Week 4!", avatar: "RS", color: "#06B6D4" },
  { name: "Sachin Kumar",    role: "Cybersecurity Analyst", rating: 5, text: "The ethical hacking course is comprehensive and taught by a real industry pro.", avatar: "SK", color: "#EC4899" },
];

// ── Single testimonial card ─────────────────────────────────────────────────
function TestimonialCard({ t }) {
  return (
    <div style={{
      width: 300, flexShrink: 0, margin: "0 8px",
      background: "#111118", border: "1px solid rgba(255,255,255,0.07)",
      borderRadius: 16, padding: "20px 22px",
      cursor: "default",
      transition: "border-color 0.2s, transform 0.2s",
    }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = `${t.color}40`; e.currentTarget.style.transform = "translateY(-3px)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)"; e.currentTarget.style.transform = "translateY(0)"; }}
    >
      {/* Stars */}
      <div style={{ color: "#F59E0B", fontSize: 13, letterSpacing: 1, marginBottom: 10 }}>
        {"★".repeat(t.rating)}{"☆".repeat(5 - t.rating)}
      </div>
      {/* Quote */}
      <p style={{ fontSize: 13, color: "rgba(255,255,255,0.65)", lineHeight: 1.65, marginBottom: 16, minHeight: 60 }}>
        "{t.text}"
      </p>
      {/* Author */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{
          width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
          background: `${t.color}25`, color: t.color,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 11, fontWeight: 800, letterSpacing: 0.5,
        }}>
          {t.avatar}
        </div>
        <div>
          <p style={{ fontSize: 13, fontWeight: 600, color: "#E2E8F0", marginBottom: 1 }}>{t.name}</p>
          <p style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>{t.role}</p>
        </div>
        <div style={{ marginLeft: "auto", fontSize: 10, color: "#10B981", fontWeight: 600, background: "rgba(16,185,129,0.1)", padding: "3px 8px", borderRadius: 5 }}>
          ✓ Verified
        </div>
      </div>
    </div>
  );
}

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

      {/* ── Company Logo Marquee ── */}
      <div className="border-y border-white/[0.06] py-6 overflow-hidden bg-white/[0.015]">
        <p className="text-center text-[11px] font-semibold text-white/25 uppercase tracking-[0.2em] mb-5">
          Our students work at
        </p>
        <style>{`
          @keyframes logo-scroll {
            from { transform: translateX(0); }
            to   { transform: translateX(-50%); }
          }
          .logo-track {
            display: flex;
            width: max-content;
            animation: logo-scroll 30s linear infinite;
          }
          .logo-track:hover { animation-play-state: paused; }
        `}</style>
        <div className="logo-track">
          {[...Array(2)].map((_, pass) => (
            <div key={pass} className="flex items-center">
              {/* Google */}
              <div className="flex items-center mx-10 opacity-40 hover:opacity-75 transition-opacity duration-300 cursor-default flex-shrink-0">
                <svg height="24" viewBox="0 0 74 24" fill="white" xmlns="http://www.w3.org/2000/svg">
                  <path d="M9.24 8.19v2.46h5.88c-.18 1.38-.64 2.39-1.34 3.1-.86.86-2.2 1.8-4.54 1.8-3.62 0-6.45-2.92-6.45-6.54s2.83-6.54 6.45-6.54c1.95 0 3.38.77 4.43 1.76L15.4 2.5C13.94 1.08 11.98 0 9.24 0 4.28 0 .11 4.04.11 9s4.17 9 9.13 9c2.68 0 4.7-.88 6.28-2.52 1.62-1.62 2.13-3.91 2.13-5.75 0-.57-.04-1.1-.13-1.54H9.24zM25 6.19c-3.21 0-5.83 2.44-5.83 5.81 0 3.34 2.62 5.81 5.83 5.81s5.83-2.46 5.83-5.81c0-3.37-2.62-5.81-5.83-5.81zm0 9.33c-1.76 0-3.28-1.45-3.28-3.52 0-2.09 1.52-3.52 3.28-3.52s3.28 1.43 3.28 3.52c0 2.07-1.52 3.52-3.28 3.52zm12.72-9.33c-3.21 0-5.83 2.44-5.83 5.81 0 3.34 2.62 5.81 5.83 5.81s5.83-2.46 5.83-5.81c0-3.37-2.62-5.81-5.83-5.81zm0 9.33c-1.76 0-3.28-1.45-3.28-3.52 0-2.09 1.52-3.52 3.28-3.52s3.28 1.43 3.28 3.52c0 2.07-1.52 3.52-3.28 3.52zm15.49-8.97v.79h-.08c-.53-.63-1.55-1.19-2.84-1.19-2.7 0-5.17 2.37-5.17 5.82 0 3.43 2.47 5.79 5.17 5.79 1.29 0 2.31-.56 2.84-1.21h.08v.77c0 2.22-1.19 3.41-3.1 3.41-1.56 0-2.53-1.12-2.93-2.07l-2.22.92c.64 1.54 2.33 3.43 5.15 3.43 2.99 0 5.52-1.76 5.52-6.05V6.37h-2.42v.15zm-2.71 8.97c-1.76 0-3.22-1.47-3.22-3.52 0-2.07 1.46-3.52 3.22-3.52 1.74 0 3.1 1.45 3.1 3.52 0 2.05-1.36 3.52-3.1 3.52zM58.37.25h2.51v17.44h-2.51zM66.54 15.52c-1.3 0-2.22-.59-2.82-1.76l7.77-3.21-.26-.66c-.48-1.29-1.96-3.68-4.97-3.68-2.99 0-5.48 2.35-5.48 5.81 0 3.26 2.46 5.81 5.76 5.81 2.66 0 4.2-1.63 4.84-2.57l-1.98-1.32c-.66.96-1.56 1.58-2.86 1.58zm-.18-7.15c1.03 0 1.9.53 2.2 1.28l-5.25 2.17c0-2.44 1.73-3.45 3.05-3.45z"/>
                </svg>
              </div>
              {/* Amazon */}
              <div className="flex items-center mx-10 opacity-40 hover:opacity-75 transition-opacity duration-300 cursor-default flex-shrink-0">
                <svg height="26" viewBox="0 0 603 182" fill="white" xmlns="http://www.w3.org/2000/svg">
                  <path d="M337.7 141.3c-30.9 22.8-75.8 35-114.5 35-54.2 0-102.9-20-139.8-53.3-2.9-2.6-.3-6.2 3.2-4.2 39.8 23.2 89 37.1 139.8 37.1 34.3 0 72-7.1 106.7-21.8 5.2-2.3 9.6 3.4 4.6 7.2z"/>
                  <path d="M350.4 126.7c-4-5.1-26.3-2.4-36.3-1.2-3 .4-3.5-2.3-.8-4.2 17.8-12.5 47-8.9 50.3-4.7 3.4 4.3-1 33.5-17.6 47.5-2.6 2.1-5 1-3.9-1.8 3.8-9.4 12.3-30.5 8.3-35.6z"/>
                  <path d="M314 20.3V8.5c0-1.8 1.4-3 3-3l53.1-.1c1.7 0 3.1 1.2 3.1 3v10.1c0 1.7-1.5 4-4 7.5l-27.5 39.3c10.2-.2 21 1.3 30.2 6.5 2.1 1.2 2.6 2.9 2.8 4.6v12.7c0 1.7-1.9 3.7-3.9 2.7-16.3-8.6-38-9.5-56 .1-1.8 1-3.8-.9-3.8-2.6V57.8c0-1.9 0-5.2 2-8.1L340.3 11H317c-1.7 0-3-1.2-3-2.7zM111.2 92.5H97.7c-1.5-.1-2.7-1.3-2.9-2.7V8.7c0-1.6 1.4-2.9 3.1-2.9l13.6-.1c1.6.1 2.8 1.3 2.9 2.8v10.7h.3C118.2 9.8 124.6 5 133.6 5c9.2 0 14.9 4.8 19 14.2 3.5-9.4 11.3-14.2 19.9-14.2 6 0 12.6 2.5 16.6 8.1 4.6 6.2 3.6 15.2 3.6 23.1v53.4c0 1.6-1.4 2.9-3.1 2.9h-13.5c-1.6-.1-2.9-1.4-2.9-2.9V42.1c0-3.1.3-10.9-.4-13.8-1.1-5-4.2-6.4-8.3-6.4-3.4 0-7 2.3-8.5 6-1.4 3.7-1.3 9.8-1.3 14.2v47.4c0 1.6-1.4 2.9-3.1 2.9h-13.5c-1.6-.1-2.9-1.4-2.9-2.9V42.1c0-10-.6-24.7-8.7-24.7-8.3 0-7.9 14.4-7.9 24.7v47.4c-.1 1.6-1.5 2.9-3.2 2.9V92.5zM409.4 5c18 0 27.7 15.4 27.7 35 0 19-10.8 34-27.7 34-17.6 0-27.2-15.4-27.2-35 0-19.8 9.7-34 27.2-34zm.1 12.5c-8.9 0-9.5 12.1-9.5 19.7 0 7.6-.1 23.9 9.4 23.9 9.4 0 9.8-13 9.8-20.9 0-5.2-.2-11.5-1.9-16.4-1.4-4.3-4.2-6.3-7.8-6.3zM466 92.5h-13.4c-1.6-.1-2.9-1.4-2.9-2.9V8.6c.1-1.5 1.5-2.7 3.1-2.7h12.5c1.4.1 2.6 1 2.9 2.3v12.3h.3c3.9-10.9 9.4-16.1 19.1-16.1 6.3 0 12.4 2.3 16.4 8.6 3.7 5.9 3.7 15.7 3.7 22.8v53.9c-.2 1.5-1.6 2.7-3.1 2.7h-13.5c-1.5-.1-2.7-1.3-2.9-2.7V40.9c0-9.8.5-24.1-8.9-24.1-3.5 0-6.7 2.3-8.3 5.9-2 4.7-2.3 9.2-2.3 13.6v53.3c0 1.6-1.4 2.9-3.2 2.9H466zM264 53.1c0 6.8.2 12.5-3.3 18.5-2.8 4.9-7.2 7.9-12.2 7.9-6.8 0-10.7-5.2-10.7-12.8 0-15.1 13.5-17.8 26.2-17.8v4.2zm17.7 42.8c-1.2 1-2.8 1.1-4.1.4-5.8-4.8-6.9-7.1-10-11.7C258 94.6 249.1 97.3 237.4 97c-14.1 0-25.1-8.7-25.1-26.1 0-13.6 7.4-22.8 17.9-27.3 9.1-4 21.9-4.7 31.6-5.8v-2.2c0-3.9.3-8.6-2-12-2-3-5.9-4.3-9.3-4.3-6.3 0-12 3.3-13.3 10.1-.3 1.5-1.4 2.9-2.9 2.9L221 31c-1.5-.3-3.1-1.5-2.7-3.8C221.9 9.3 238.9 4 254.2 4c7.8 0 18 2.1 24.2 8 7.8 7.3 7 17 7 27.6v25c0 7.5 3.1 10.8 6 14.8 1 1.5 1.3 3.2 0 4.3l-9.7 8.2zM62.4 53.1c0 6.8.2 12.5-3.3 18.5-2.8 4.9-7.2 7.9-12.2 7.9-6.8 0-10.7-5.2-10.7-12.8 0-15.1 13.5-17.8 26.2-17.8v4.2zm17.7 42.8c-1.2 1-2.8 1.1-4.1.4-5.8-4.8-6.9-7.1-10-11.7C56.4 94.6 47.5 97.3 35.8 97 21.7 97 10.7 88.3 10.7 70.9c0-13.6 7.4-22.8 17.9-27.3 9.1-4 21.9-4.7 31.6-5.8v-2.2c0-3.9.3-8.6-2-12-2-3-5.9-4.3-9.3-4.3-6.3 0-12 3.3-13.3 10.1-.3 1.5-1.4 2.9-2.9 2.9L19.4 31c-1.5-.3-3.1-1.5-2.7-3.8C20.3 9.3 37.3 4 52.6 4c7.8 0 18 2.1 24.2 8 7.8 7.3 7 17 7 27.6v25c0 7.5 3.1 10.8 6 14.8 1 1.5 1.3 3.2 0 4.3l-9.7 8.2z"/>
                </svg>
              </div>
              {/* Meta */}
              <div className="flex items-center mx-10 opacity-40 hover:opacity-75 transition-opacity duration-300 cursor-default flex-shrink-0">
                <svg height="22" viewBox="0 0 400 80" fill="white" xmlns="http://www.w3.org/2000/svg">
                  <path d="M5.8 45c0 5.4 1.2 9.6 3.4 12.5 2.7 3.5 6.9 5.2 12.3 5.2 4.6 0 8.5-1.4 12.7-5.5 3.5-3.4 7-8.6 10.7-16.5l5.4-11.3C54.7 21.5 61.5 15 70.7 15c10.1 0 18.4 5.8 24.2 16.8 5.3 10.2 8.1 23.2 8.1 37.6v5.2H88V69c0-7.1-1.5-13.8-4.4-19.4-2.8-5.5-6.5-8.5-10.7-8.5-4.3 0-7.9 2.4-11.4 7.5-2.8 4.1-5.8 10.3-9 18.2L49.6 72l-.5 1.2H34.9L33.8 71C26.6 52.4 19 43.1 11.3 43.1c-4.4 0-8 2.2-10.7 6.7C.2 53.8-.6 59.4 0 65v9.6H-14V69.5c0-15.3 2.7-27.9 8-37.7 5.8-10.7 14.3-16.6 24.5-16.6 8.4 0 15.4 3.8 21.6 11.5 4.3 5.3 8.3 12.8 12.2 22.5l3.7 9.4c3.5 8.8 7.1 15 10.7 18.5 3.1 3 6.1 4.3 9.7 4.3 3.9 0 7.1-1.7 9.5-5.1 2.5-3.5 3.8-8.4 3.8-14.9V52c0-12-2.5-22.2-6.7-29.3-3.8-6.5-8.7-9.6-13.7-9.6-6.2 0-12.3 4-18.1 12-2.7 3.8-5.6 9.1-8.7 15.6L37.3 52c-4.1 8.8-7.8 14.7-11.2 18.6-4.5 5.1-9.8 7.8-16.1 7.8C1.2 78.4-5 71.7-5 59.7v-6.1H5.8V45z" transform="translate(20,0)"/>
                  <text x="130" y="62" fontFamily="system-ui,sans-serif" fontWeight="700" fontSize="52" letterSpacing="-1">Meta</text>
                </svg>
              </div>
              {/* Microsoft */}
              <div className="flex items-center gap-3 mx-10 opacity-40 hover:opacity-75 transition-opacity duration-300 cursor-default flex-shrink-0">
                <svg width="22" height="22" viewBox="0 0 23 23" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect width="11" height="11" fill="white"/>
                  <rect x="12" width="11" height="11" fill="white"/>
                  <rect y="12" width="11" height="11" fill="white"/>
                  <rect x="12" y="12" width="11" height="11" fill="white"/>
                </svg>
                <span style={{ fontFamily: "Segoe UI, sans-serif", fontSize: 20, fontWeight: 300, color: "white", letterSpacing: -0.2 }}>Microsoft</span>
              </div>
              {/* Netflix */}
              <div className="flex items-center mx-10 opacity-40 hover:opacity-75 transition-opacity duration-300 cursor-default flex-shrink-0">
                <svg height="28" viewBox="0 0 111 30" fill="white" xmlns="http://www.w3.org/2000/svg">
                  <path d="M105.06 29.18L91.46 29.19l.01-28.49 13.59-.01v28.5zM77.85 29.19L64.28 29.19V.69l13.57-.01v28.51zM91.46.69l-13.61.01v28.5l13.61-.01V.69zM0 .68h13.6l11.81 17.95L25.42.68H39l.01 28.5-13.57.01V11.75L14.56 29.19H0V.68zM51.19.68l.01 28.5-13.58.01V.68h13.57z"/>
                </svg>
              </div>
              {/* NVIDIA */}
              <div className="flex items-center mx-10 opacity-40 hover:opacity-75 transition-opacity duration-300 cursor-default flex-shrink-0">
                <span style={{ fontFamily: "sans-serif", fontSize: 22, fontWeight: 900, color: "white", letterSpacing: 2 }}>NVIDIA</span>
              </div>
              {/* Stripe */}
              <div className="flex items-center mx-10 opacity-40 hover:opacity-75 transition-opacity duration-300 cursor-default flex-shrink-0">
                <svg height="28" viewBox="0 0 60 25" fill="white" xmlns="http://www.w3.org/2000/svg">
                  <path d="M5.45 9.55C5.45 8.18 6.6 7.64 8.5 7.64c2.65 0 6.03.8 8.68 2.23V3.53C14.6 2.13 12.06 1.6 9.5 1.6 3.83 1.6 0 4.5 0 9.86c0 8.27 11.39 6.95 11.39 10.52 0 1.6-1.39 2.12-3.41 2.12-2.96 0-6.73-1.21-9.72-2.84v6.42c3.31 1.43 6.66 2.03 9.72 2.03 5.83 0 9.84-2.88 9.84-8.33-.01-8.93-11.37-7.32-11.37-10.23zm16.2-7.02L15.5 3.77V28h6.7V1.44l-.55.09zm5.03 0v26.57h6.7V1.44l-6.7.09zM40.8 7.96c2.54 0 4.14 1.14 5.07 3.2l6.23-3.62C50.16 3.78 46.55 1.6 40.82 1.6c-7.95 0-13.29 5.26-13.29 12.95 0 7.62 5.23 12.84 13.16 12.84 5.84 0 9.5-2.29 11.38-5.97l-6.23-3.52c-.95 1.9-2.54 3.04-5.07 3.04-3.64 0-6.2-2.7-6.2-6.39 0-3.74 2.56-6.59 6.23-6.59zM60 13.55c0-7.16-3.64-12.08-9.88-12.08-6.3 0-10.1 4.92-10.1 12.08 0 7.25 4.14 12 10.47 12 3.16 0 5.55-.83 7.41-2.36V17.5c-1.66 1.35-3.68 2-6.33 2-2.7 0-4.83-1.18-5.38-3.72H60v-2.23zm-13.9-2.28c.55-2.51 2.1-3.93 4.05-3.93 1.98 0 3.42 1.42 3.83 3.93h-7.88z"/>
                </svg>
              </div>
              {/* Flipkart */}
              <div className="flex items-center mx-10 opacity-40 hover:opacity-75 transition-opacity duration-300 cursor-default flex-shrink-0">
                <span style={{ fontFamily: "sans-serif", fontSize: 22, fontWeight: 700, color: "white", letterSpacing: -0.5 }}>flipkart</span>
              </div>
              {/* Uber */}
              <div className="flex items-center mx-10 opacity-40 hover:opacity-75 transition-opacity duration-300 cursor-default flex-shrink-0">
                <span style={{ fontFamily: "sans-serif", fontSize: 22, fontWeight: 900, color: "white", letterSpacing: 3, textTransform: "uppercase" }}>Uber</span>
              </div>
              {/* Adobe */}
              <div className="flex items-center mx-10 opacity-40 hover:opacity-75 transition-opacity duration-300 cursor-default flex-shrink-0">
                <svg height="24" viewBox="0 0 240 54" fill="white" xmlns="http://www.w3.org/2000/svg">
                  <path d="M98.5 0L77.6 53.5H92l4.8-12.5h19.7l4.8 12.5h14.4L114.8 0H98.5zm-1.8 30L103 13.5l6.3 16.5H96.7zM176 0h-26.2v53.5H176c15.8 0 27-10.3 27-26.8C203 9.8 191.8 0 176 0zm-.6 41.8h-11.9V11.7H175.4c9.1 0 14.8 5.6 14.8 15S184.5 41.8 175.4 41.8zM34.6 0L0 53.5h14.4l7.3-11.8H42l.4 11.8H54.5L49.3 0H34.6zm-6 30.2l10.5-17.1.6 17.1H28.6zM218.7 22c-8.7-2-11.7-3.5-11.7-7 0-3 2.8-5.2 7.7-5.2 5.1 0 10.3 2.2 14.6 5.8l8.1-8.2C231.5 3 224.4 0 214.6 0c-12.4 0-20.6 7-20.6 17.2 0 10.3 7 14.3 17.8 16.8 9 2.1 11.9 4.1 11.9 7.5 0 3.7-3.4 6-9.3 6-6.2 0-12.3-2.6-16.8-7.1l-8.2 8.2c6 6.5 14.6 9.8 24.4 9.8 14 0 22.5-7.2 22.5-18.1C236.3 29.3 229.3 24.5 218.7 22z"/>
                </svg>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Why CodeLearn ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
        <div className="text-center mb-12">
          <p className="text-xs font-bold text-primary uppercase tracking-[0.2em] mb-3">Why 1.5L+ students choose us</p>
          <h2 className="font-display font-black text-3xl sm:text-4xl mb-3">Everything you need to<br className="hidden sm:block" /> <span className="gradient-text">succeed in tech</span></h2>
          <p className="text-white/40 text-base max-w-xl mx-auto">We're not just another online platform — we're built specifically for Indian learners.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { icon: "🎬", color: "#E8471A", title: "HD Video Lessons", body: "Crystal-clear, professionally produced lectures you can watch offline on any device." },
            { icon: "🧑‍💻", color: "#3B82F6", title: "Real Projects",    body: "Build portfolio projects used in actual job interviews — not toy examples." },
            { icon: "🏆", color: "#F5B731", title: "Certificates",    body: "Earn certificates recognized by 500+ top hiring companies across India." },
            { icon: "💬", color: "#10B981", title: "Community",       body: "24/7 doubt support, peer groups, and live sessions with instructors." },
          ].map((f) => (
            <div key={f.title} className="rounded-2xl p-6 group transition-all duration-300 hover:-translate-y-1"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = `${f.color}35`; e.currentTarget.style.background = `${f.color}08`; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)"; e.currentTarget.style.background = "rgba(255,255,255,0.03)"; }}>
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl mb-4 transition-transform duration-300 group-hover:scale-110"
                style={{ background: `${f.color}18`, border: `1px solid ${f.color}30` }}>
                {f.icon}
              </div>
              <h3 className="font-display font-bold text-base text-white mb-2">{f.title}</h3>
              <p className="text-white/45 text-sm leading-relaxed">{f.body}</p>
            </div>
          ))}
        </div>

        {/* How it works */}
        <div className="mt-16">
          <p className="text-center text-xs font-bold text-white/30 uppercase tracking-[0.2em] mb-8">How it works</p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 relative">
            {/* Connector line (desktop only) */}
            <div className="hidden lg:block absolute top-8 left-[12.5%] right-[12.5%] h-px" style={{ background: "linear-gradient(90deg, transparent 0%, rgba(232,71,26,0.3) 20%, rgba(232,71,26,0.3) 80%, transparent 100%)" }} />
            {[
              { step: "01", icon: "🎯", label: "Pick a course" },
              { step: "02", icon: "📺", label: "Watch & practice" },
              { step: "03", icon: "🛠️", label: "Build real projects" },
              { step: "04", icon: "💼", label: "Get hired" },
            ].map((s) => (
              <div key={s.step} className="flex flex-col items-center text-center relative z-10">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl mb-3"
                  style={{ background: "rgba(232,71,26,0.12)", border: "2px solid rgba(232,71,26,0.25)" }}>
                  {s.icon}
                </div>
                <p className="text-[10px] font-black text-primary tracking-widest mb-1">{s.step}</p>
                <p className="text-white/70 text-sm font-semibold">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

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

      {/* ── Testimonials — infinite scrolling marquee ── */}
      <section className="border-t border-white/[0.07] bg-white/[0.02] py-16 overflow-hidden">
        <style>{`
          @keyframes marquee-left  { from { transform: translateX(0); } to { transform: translateX(-50%); } }
          @keyframes marquee-right { from { transform: translateX(-50%); } to { transform: translateX(0); } }
          .marquee-track-left  { display:flex; width:max-content; animation: marquee-left  38s linear infinite; }
          .marquee-track-right { display:flex; width:max-content; animation: marquee-right 42s linear infinite; }
          .marquee-track-left:hover,
          .marquee-track-right:hover { animation-play-state: paused; }
        `}</style>

        <div className="max-w-3xl mx-auto px-4 text-center mb-10">
          <h2 className="section-title mb-2">What our students say</h2>
          <p className="text-sm text-white/40">Real stories from 1,50,000+ learners across India</p>
        </div>

        {/* Row 1 — scrolls left */}
        <div style={{ maskImage: "linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%)" }}>
          <div className="marquee-track-left">
            {[...TESTIMONIALS_ROW1, ...TESTIMONIALS_ROW1].map((t, i) => (
              <TestimonialCard key={i} t={t} />
            ))}
          </div>
        </div>

        {/* Row 2 — scrolls right */}
        <div className="mt-4" style={{ maskImage: "linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%)" }}>
          <div className="marquee-track-right">
            {[...TESTIMONIALS_ROW2, ...TESTIMONIALS_ROW2].map((t, i) => (
              <TestimonialCard key={i} t={t} />
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
