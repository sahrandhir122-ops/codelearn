import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import useWishlistStore from "../store/useWishlistStore";
import useCartStore from "../store/useCartStore";

const StarIcon = ({ filled }) => (
  <svg width="11" height="11" viewBox="0 0 24 24"
    fill={filled ? "#F5B731" : "none"} stroke="#F5B731" strokeWidth={2}>
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);

export default function WishlistPage() {
  const { wishlist, remove, clear } = useWishlistStore();
  const { addToCart, isInCart } = useCartStore();
  const navigate = useNavigate();

  const handleAddToCart = (course) => {
    if (isInCart(course._id)) { navigate("/cart"); return; }
    addToCart(course);
    toast.success(`Added "${course.title}" to cart!`);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display font-black text-3xl mb-1">❤️ Wishlist</h1>
          <p className="text-white/40 text-sm">
            {wishlist.length === 0
              ? "No saved courses yet"
              : `${wishlist.length} saved course${wishlist.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        {wishlist.length > 0 && (
          <button
            onClick={() => {
              if (window.confirm("Clear all saved courses?")) {
                clear();
                toast.success("Wishlist cleared");
              }
            }}
            className="text-sm text-white/40 hover:text-red-400 transition-colors"
          >
            🗑 Clear all
          </button>
        )}
      </div>

      {/* Empty state */}
      {wishlist.length === 0 ? (
        <div className="text-center py-24">
          <div className="text-6xl mb-5">🤍</div>
          <h2 className="font-display font-bold text-xl mb-3">Nothing saved yet</h2>
          <p className="text-white/40 mb-6 text-sm">
            Tap the ❤️ on any course to save it for later.
          </p>
          <Link to="/courses" className="btn-primary inline-flex">
            Browse Courses →
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {wishlist.map((course) => {
            const discount =
              course.originalPrice > course.price
                ? Math.round(
                    ((course.originalPrice - course.price) / course.originalPrice) * 100
                  )
                : 0;
            const inCart = isInCart(course._id);

            return (
              <div
                key={course._id}
                className="bg-bg-card border border-white/[0.07] rounded-2xl overflow-hidden hover:border-white/[0.12] transition-colors"
              >
                <div className="flex gap-4 p-4">
                  {/* Thumbnail */}
                  <Link to={`/courses/${course.slug}`} className="flex-shrink-0">
                    <img
                      src={
                        course.thumbnail ||
                        "https://images.unsplash.com/photo-1516116216624-53e697fedbea?w=300&q=80"
                      }
                      alt={course.title}
                      className="w-28 h-20 object-cover rounded-xl"
                    />
                  </Link>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <Link to={`/courses/${course.slug}`}>
                      <h3 className="font-display font-bold text-sm leading-snug hover:text-primary transition-colors mb-1 line-clamp-2">
                        {course.title}
                      </h3>
                    </Link>
                    <p className="text-xs text-white/40 mb-2">
                      by {course.instructorName || "Instructor"}
                    </p>

                    {/* Rating */}
                    {course.rating > 0 && (
                      <div className="flex items-center gap-1.5 mb-2">
                        <span className="text-xs font-bold text-amber-400">{course.rating}</span>
                        <div className="flex gap-0.5">
                          {[1, 2, 3, 4, 5].map((i) => (
                            <StarIcon key={i} filled={i <= Math.floor(course.rating)} />
                          ))}
                        </div>
                        <span className="text-xs text-white/30">
                          ({(course.totalStudents || 0).toLocaleString("en-IN")})
                        </span>
                      </div>
                    )}

                    {/* Badges */}
                    <div className="flex gap-1.5 flex-wrap">
                      <span className="tag text-[10px]">{course.level}</span>
                      {course.isBestseller && (
                        <span className="badge bg-accent text-black text-[10px]">Bestseller</span>
                      )}
                    </div>
                  </div>

                  {/* Right — price + actions */}
                  <div className="flex flex-col items-end justify-between flex-shrink-0 min-w-[120px]">
                    <div className="text-right mb-3">
                      <p className="font-display font-black text-xl text-white">
                        ₹{(course.price || 0).toLocaleString("en-IN")}
                      </p>
                      {discount > 0 && (
                        <div className="flex flex-col items-end">
                          <span className="text-xs text-white/30 line-through">
                            ₹{(course.originalPrice || 0).toLocaleString("en-IN")}
                          </span>
                          <span className="text-xs text-accent-green font-semibold">
                            {discount}% off
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-2 w-full">
                      <button
                        onClick={() => handleAddToCart(course)}
                        className={`text-xs font-semibold py-2 px-3 rounded-xl border transition-colors text-center ${
                          inCart
                            ? "bg-primary/15 border-primary/30 text-primary"
                            : "btn-primary"
                        }`}
                      >
                        {inCart ? "🛒 View Cart" : "Add to Cart"}
                      </button>
                      <button
                        onClick={() => {
                          remove(course._id);
                          toast.success("Removed from wishlist");
                        }}
                        className="text-[11px] text-white/30 hover:text-red-400 transition-colors text-center"
                      >
                        🗑 Remove
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
