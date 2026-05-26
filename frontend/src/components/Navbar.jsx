import { useState, useRef, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import useAuthStore from "../store/useAuthStore";
import useCartStore from "../store/useCartStore";

export default function Navbar() {
  const { user, logout } = useAuthStore();
  const { count } = useCartStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Search state
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchRef = useRef(null);

  const isActive = (path) => location.pathname === path;
  const close = () => { setDropdownOpen(false); setMobileOpen(false); };

  // Auto-focus search input when opened
  useEffect(() => {
    if (searchOpen) searchRef.current?.focus();
  }, [searchOpen]);

  // Close search on route change
  useEffect(() => {
    setSearchOpen(false);
    setSearchQuery("");
  }, [location.pathname]);

  const handleSearch = (e) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (!q) return;
    navigate(`/courses?search=${encodeURIComponent(q)}`);
    setSearchOpen(false);
    setSearchQuery("");
  };

  const handleSearchKey = (e) => {
    if (e.key === "Escape") { setSearchOpen(false); setSearchQuery(""); }
  };

  return (
    <nav className="sticky top-0 z-50 glass border-b border-white/[0.07]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-4">

        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 flex-shrink-0 cursor-pointer hover:opacity-85 transition-opacity">
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center font-display font-black text-white text-lg select-none">C</div>
          <span className="font-display font-black text-xl text-white hidden sm:block">CodeLearn</span>
        </Link>

        {/* Desktop Nav links */}
        <div className="hidden md:flex items-center gap-1">
          <Link to="/courses"
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isActive("/courses") ? "text-white" : "text-white/50 hover:text-white/80"}`}>
            Courses
          </Link>
          {user?.role === "admin" && (
            <Link to="/admin"
              className="px-3 py-2 rounded-lg text-sm font-medium transition-colors text-primary hover:text-primary-light flex items-center gap-1.5">
              <span className="text-xs">⚙️</span> Admin
            </Link>
          )}
        </div>

        {/* ── Expanding Search bar ── */}
        <div className="flex-1 flex items-center justify-center px-2 min-w-0">
          {searchOpen ? (
            <form
              onSubmit={handleSearch}
              className="flex items-center w-full max-w-lg gap-2 animate-fade-in"
            >
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
                  ref={searchRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleSearchKey}
                  placeholder="Search courses, topics, instructors…"
                  className="w-full bg-white/[0.06] border border-white/[0.12] rounded-xl pl-9 pr-4 py-2 text-sm text-white placeholder:text-white/30 outline-none focus:border-primary/50 focus:bg-white/[0.08] transition-all"
                />
              </div>
              <button
                type="submit"
                className="btn-primary px-4 py-2 text-sm flex-shrink-0"
                disabled={!searchQuery.trim()}
              >
                Search
              </button>
              <button
                type="button"
                onClick={() => { setSearchOpen(false); setSearchQuery(""); }}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors flex-shrink-0"
              >
                ✕
              </button>
            </form>
          ) : (
            /* Collapsed search button */
            <button
              onClick={() => setSearchOpen(true)}
              className="hidden sm:flex items-center gap-2 bg-white/[0.05] border border-white/[0.1] rounded-xl px-4 py-2 text-sm text-white/40 hover:text-white/70 hover:bg-white/[0.08] hover:border-white/20 transition-all w-full max-w-xs"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <span>Search courses…</span>
              <span className="ml-auto text-xs bg-white/10 px-1.5 py-0.5 rounded text-white/30 hidden lg:block">⌘K</span>
            </button>
          )}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2 flex-shrink-0">

          {/* Mobile search icon */}
          <button
            onClick={() => setSearchOpen(!searchOpen)}
            className="sm:hidden w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors text-white/60"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </button>

          {/* Cart icon */}
          {user && (
            <Link to="/cart"
              className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
              title="Cart">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="text-white/60">
                <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
              </svg>
              {count > 0 && (
                <span className="absolute -top-1 -right-1 w-4.5 h-4.5 bg-primary text-white text-[10px] font-bold rounded-full flex items-center justify-center min-w-[18px] min-h-[18px] px-1">
                  {count > 9 ? "9+" : count}
                </span>
              )}
            </Link>
          )}

          {user ? (
            <div className="relative">
              <button onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2.5 bg-white/5 border border-white/10 rounded-xl px-3 py-2 hover:bg-white/10 transition-colors">
                <img src={user.avatar} alt="" className="w-7 h-7 rounded-full object-cover" />
                <span className="text-sm font-medium hidden sm:block">{user.name}</span>
                <svg className="w-4 h-4 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {dropdownOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={close} />
                  <div className="absolute right-0 mt-2 w-52 bg-bg-card border border-white/10 rounded-2xl overflow-hidden shadow-2xl z-50">
                    <div className="p-3 border-b border-white/[0.07]">
                      <p className="text-sm font-semibold">{user.name}</p>
                      <p className="text-xs text-white/40 truncate">{user.email}</p>
                      <span className={`text-[10px] px-2 py-0.5 rounded-md font-semibold mt-1 inline-block ${user.role === "admin" ? "bg-red-500/15 text-red-400" : "bg-primary/15 text-primary"}`}>
                        {user.role === "admin" ? "⚙️ Admin" : "🎓 Student"}
                      </span>
                    </div>
                    <Link to="/profile" onClick={close}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-white/70 hover:bg-white/5 hover:text-white transition-colors">
                      👤 My Profile
                    </Link>
                    <Link to="/profile" onClick={close}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-white/70 hover:bg-white/5 hover:text-white transition-colors">
                      📚 My Courses
                    </Link>
                    <Link to="/cart" onClick={close}
                      className="flex items-center justify-between px-4 py-2.5 text-sm text-white/70 hover:bg-white/5 hover:text-white transition-colors">
                      <span className="flex items-center gap-2.5">🛒 Cart</span>
                      {count > 0 && <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded-full font-bold">{count}</span>}
                    </Link>
                    {user.role === "admin" && (
                      <Link to="/admin" onClick={close}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-primary hover:bg-white/5 transition-colors">
                        ⚙️ Admin Dashboard
                      </Link>
                    )}
                    <button
                      onClick={() => { logout(); close(); navigate("/"); }}
                      className="w-full text-left flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-400 hover:bg-white/5 transition-colors border-t border-white/[0.07]">
                      🚪 Sign out
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link to="/login" className="btn-ghost py-2 px-4 text-sm">Sign in</Link>
              <Link to="/register" className="btn-primary py-2 px-4 text-sm hidden sm:inline-flex">Get started</Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
