import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { courseAPI } from "../api";
import CourseCard from "../components/CourseCard";
import Loader from "../components/Loader";

const CATEGORIES = ["All", "Programming", "Web Development", "AI/ML", "DevOps", "Design", "Mobile", "Data Science"];
const LEVELS = ["All Levels", "Beginner", "Intermediate", "Advanced"];
const SORT_OPTIONS = [
  { value: "popular", label: "Most Popular" },
  { value: "newest", label: "Newest First" },
  { value: "rating", label: "Highest Rated" },
  { value: "price-low", label: "Price: Low → High" },
  { value: "price-high", label: "Price: High → Low" },
];

export default function CoursesPage() {
  const [urlParams] = useSearchParams();
  const [search, setSearch] = useState(urlParams.get("search") || "");
  const [category, setCategory] = useState(urlParams.get("category") || "");
  const [level, setLevel] = useState("");
  const [sort, setSort] = useState("popular");
  const [page, setPage] = useState(1);

  // Sync when navbar search pushes a new ?search= param
  useEffect(() => {
    const s = urlParams.get("search") || "";
    setSearch(s);
    setPage(1);
  }, [urlParams.get("search")]);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["courses", category, level, sort, search, page],
    queryFn: () =>
      courseAPI.getAll({
        category: category || undefined,
        level: level || undefined,
        sort,
        search: search || undefined,
        page,
        limit: 12,
      }).then((r) => r.data),
    staleTime: 60_000,
    placeholderData: (prev) => prev,
  });

  const courses = data?.data?.courses || [];
  const total = data?.total || 0;
  const totalPages = data?.pages || 1;

  const clearFilters = () => { setCategory(""); setLevel(""); setSearch(""); setSort("popular"); setPage(1); };
  const hasFilters = category || level || search;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 animate-fade-in">
      {/* Header */}
      <div className="mb-10">
        <h1 className="font-display font-black text-4xl mb-2">All Courses</h1>
        <p className="text-white/40">
          {isLoading ? "Loading…" : `${total} expert-led courses`}
        </p>
      </div>

      {/* Search + Sort bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-8">
        {/* Search with button */}
        <div className="flex flex-1 gap-2">
          <div className="relative flex-1">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none"
              width="15" height="15" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth={2.5}
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              className="input pl-9 w-full"
              placeholder="Search by title, instructor, or topic…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              onKeyDown={(e) => { if (e.key === "Enter") setPage(1); }}
            />
            {search && (
              <button
                onClick={() => { setSearch(""); setPage(1); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
              >
                ✕
              </button>
            )}
          </div>
          <button
            onClick={() => setPage(1)}
            className="btn-primary px-5 py-2.5 text-sm flex-shrink-0 flex items-center gap-1.5"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            Search
          </button>
        </div>
        <select
          className="input sm:w-52 cursor-pointer"
          value={sort}
          onChange={(e) => { setSort(e.target.value); setPage(1); }}
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value} style={{ background: "#111118" }}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {/* Mobile filter pills — full width above the grid */}
      <div className="lg:hidden flex gap-2 flex-wrap mb-5 overflow-x-auto pb-1">
        {CATEGORIES.map((cat) => (
          <button key={cat}
            onClick={() => { setCategory(cat === "All" ? "" : cat); setPage(1); }}
            className={`tab-btn text-xs flex-shrink-0 ${(cat === "All" ? !category : category === cat) ? "active" : ""}`}>
            {cat}
          </button>
        ))}
        {LEVELS.filter(l => l !== "All Levels").map((lv) => (
          <button key={lv}
            onClick={() => { setLevel(level === lv ? "" : lv); setPage(1); }}
            className={`tab-btn text-xs flex-shrink-0 ${level === lv ? "active" : ""}`}>
            {lv}
          </button>
        ))}
        {hasFilters && (
          <button onClick={clearFilters}
            className="tab-btn text-xs flex-shrink-0 text-red-400 border-red-400/30">
            ✕ Clear
          </button>
        )}
      </div>

      <div className="flex gap-8">
        {/* Sidebar filters — desktop only */}
        <aside className="w-52 flex-shrink-0 hidden lg:block">
          <div className="sticky top-24 space-y-6">
            <div>
              <h3 className="text-xs font-semibold text-white/30 uppercase tracking-widest mb-3">Category</h3>
              <div className="space-y-1">
                {CATEGORIES.map((cat) => (
                  <button key={cat}
                    onClick={() => { setCategory(cat === "All" ? "" : cat); setPage(1); }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${(cat === "All" ? !category : category === cat) ? "bg-primary/15 text-primary font-medium" : "text-white/50 hover:text-white/80 hover:bg-white/5"}`}>
                    {cat}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-xs font-semibold text-white/30 uppercase tracking-widest mb-3">Level</h3>
              <div className="space-y-1">
                {LEVELS.map((lv) => (
                  <button key={lv}
                    onClick={() => { setLevel(lv === "All Levels" ? "" : lv); setPage(1); }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${(lv === "All Levels" ? !level : level === lv) ? "bg-primary/15 text-primary font-medium" : "text-white/50 hover:text-white/80 hover:bg-white/5"}`}>
                    {lv}
                  </button>
                ))}
              </div>
            </div>
            {hasFilters && (
              <button onClick={clearFilters}
                className="w-full text-xs text-white/40 hover:text-white/70 underline transition-colors">
                Clear all filters
              </button>
            )}
          </div>
        </aside>

        {/* Course grid */}
        <div className="flex-1 min-w-0">
          {isLoading ? (
            <div className="flex justify-center py-20"><Loader /></div>
          ) : isError ? (
            <div className="text-center py-20">
              <div className="text-4xl mb-4">⚠️</div>
              <p className="text-white/40">Failed to load courses. Check your connection.</p>
              <p className="text-white/25 text-sm mt-2">Make sure the backend server is running on port 5000.</p>
            </div>
          ) : courses.length === 0 ? (
            <div className="text-center py-20">
              <div className="text-5xl mb-4">📭</div>
              <p className="text-white/40 text-lg mb-2">No courses found</p>
              <p className="text-white/30 text-sm">Try adjusting your filters</p>
              {hasFilters && (
                <button onClick={clearFilters} className="btn-ghost mt-4 text-sm inline-flex">
                  Clear Filters
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-5">
                <p className="text-sm text-white/40">
                  <span className="text-white font-medium">{courses.length}</span> of{" "}
                  <span className="text-white font-medium">{total}</span> courses
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {courses.map((course) => (
                  <CourseCard key={course._id} course={course} />
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center gap-2 mt-10">
                  <button disabled={page === 1} onClick={() => setPage((p) => p - 1)}
                    className="btn-ghost px-4 py-2 text-sm disabled:opacity-40">
                    ← Prev
                  </button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map((p) => (
                      <button key={p} onClick={() => setPage(p)}
                        className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${page === p ? "bg-primary text-white" : "text-white/50 hover:bg-white/10"}`}>
                        {p}
                      </button>
                    ))}
                  </div>
                  <button disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}
                    className="btn-ghost px-4 py-2 text-sm disabled:opacity-40">
                    Next →
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
