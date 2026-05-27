import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import useAuthStore from "../store/useAuthStore";
import useCartStore from "../store/useCartStore";
import useWishlistStore from "../store/useWishlistStore";

const StarIcon = ({ filled }) => (
  <svg width="12" height="12" viewBox="0 0 24 24"
    fill={filled ? "#F5B731" : "none"} stroke="#F5B731" strokeWidth={2}>
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);

export default function CourseCard({ course }) {
  const { user } = useAuthStore();
  const { addToCart, isInCart } = useCartStore();
  const { toggle, isWishlisted } = useWishlistStore();
  const navigate = useNavigate();

  const isEnrolled = user?.enrolledCourses?.some(
    (id) => (id?._id || id)?.toString() === course._id?.toString()
  );
  const inCart = isInCart(course._id);
  const wishlisted = isWishlisted(course._id);

  const handleWishlist = (e) => {
    e.preventDefault();
    if (!user) { navigate("/login"); return; }
    const added = toggle(course);
    toast(added ? "❤️ Saved to wishlist" : "💔 Removed from wishlist", {
      duration: 1800,
      style: { background: "#1a1a2e", color: "#fff", fontSize: "13px" },
    });
  };
  const discount = course.originalPrice > course.price
    ? Math.round(((course.originalPrice - course.price) / course.originalPrice) * 100)
    : 0;

  const handleCart = (e) => {
    e.preventDefault();
    if (!user) { navigate("/login"); return; }
    if (inCart) { navigate("/cart"); return; }
    addToCart(course);
  };

  return (
    <div className="card group flex flex-col">
      {/* Thumbnail */}
      <Link to={`/courses/${course.slug}`} className="block relative overflow-hidden" style={{ aspectRatio: "16/9" }}>
        <img
          src={course.thumbnail || "https://images.unsplash.com/photo-1516116216624-53e697fedbea?w=600&q=80"}
          alt={course.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        {course.isBestseller && (
          <span className="badge absolute top-3 left-3 bg-accent text-black text-[10px]">Bestseller</span>
        )}
        <span className="badge absolute top-3 right-3 bg-black/60 text-white/80 text-[10px] border border-white/10">
          {course.level}
        </span>
        {/* Wishlist heart */}
        <button
          onClick={handleWishlist}
          title={wishlisted ? "Remove from wishlist" : "Save to wishlist"}
          className="absolute bottom-3 right-3 w-8 h-8 flex items-center justify-center rounded-full bg-black/60 hover:bg-black/80 transition-all shadow-lg"
        >
          <svg width="15" height="15" viewBox="0 0 24 24"
            fill={wishlisted ? "#ef4444" : "none"}
            stroke={wishlisted ? "#ef4444" : "rgba(255,255,255,0.7)"}
            strokeWidth={2.2}
          >
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
        </button>
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <div className="w-14 h-14 rounded-full bg-primary/90 flex items-center justify-center">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
          </div>
        </div>
      </Link>

      {/* Content */}
      <div className="p-4 flex flex-col flex-1">
        <div className="flex flex-wrap gap-1.5 mb-3">
          {(course.tags || []).slice(0, 3).map((t) => <span key={t} className="tag">{t}</span>)}
        </div>

        <Link to={`/courses/${course.slug}`}>
          <h3 className="font-display font-bold text-[15px] leading-snug text-white/90 hover:text-white transition-colors mb-1.5 line-clamp-2">
            {course.title}
          </h3>
        </Link>
        <p className="text-xs text-white/40 mb-3">by {course.instructorName || "Instructor"}</p>

        {/* Rating */}
        <div className="flex items-center gap-2 mb-3">
          <span className="text-accent font-bold text-sm">{course.rating || "—"}</span>
          <div className="flex gap-0.5">
            {[1,2,3,4,5].map((i) => <StarIcon key={i} filled={i <= Math.floor(course.rating || 0)} />)}
          </div>
          <span className="text-xs text-white/30">({(course.totalStudents || 0).toLocaleString("en-IN")})</span>
        </div>

        {/* Meta */}
        <div className="flex gap-4 mb-4">
          {course.totalLectures > 0 && (
            <span className="text-xs text-white/40 flex items-center gap-1">📹 {course.totalLectures} lectures</span>
          )}
          {course.totalDuration > 0 && (
            <span className="text-xs text-white/40 flex items-center gap-1">⏱ {Math.round(course.totalDuration / 3600)}h</span>
          )}
        </div>

        {/* Price + CTA */}
        <div className="mt-auto pt-3 border-t border-white/[0.07]">
          <div className="flex items-baseline gap-2 mb-3">
            <span className="font-display font-black text-xl text-white">₹{(course.price || 0).toLocaleString("en-IN")}</span>
            {discount > 0 && (
              <>
                <span className="text-xs text-white/30 line-through">₹{(course.originalPrice || 0).toLocaleString("en-IN")}</span>
                <span className="text-xs text-accent-green font-semibold">{discount}% off</span>
              </>
            )}
          </div>

          {isEnrolled ? (
            <Link to={`/courses/${course.slug}`}
              className="block text-center text-xs font-semibold text-accent-green bg-accent-green/10 border border-accent-green/20 px-3 py-2 rounded-lg hover:bg-accent-green/20 transition-colors">
              ▶ Continue Learning
            </Link>
          ) : (
            <div className="flex gap-2">
              <Link to={`/courses/${course.slug}`}
                className="flex-1 btn-primary text-xs justify-center py-2">
                Buy Now
              </Link>
              <button
                onClick={handleCart}
                title={inCart ? "Go to Cart" : "Add to Cart"}
                className="w-9 h-9 flex items-center justify-center rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors text-white/60 hover:text-white flex-shrink-0"
              >
                {inCart ? "🛒" : "+🛒"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
