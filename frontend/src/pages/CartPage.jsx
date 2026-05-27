import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import useCartStore from "../store/useCartStore";
import useAuthStore from "../store/useAuthStore";
import { paymentAPI } from "../api";
import Loader from "../components/Loader";
import PaymentModal from "../components/PaymentModal";

export default function CartPage() {
  const navigate = useNavigate();
  const { user, enrollCourse } = useAuthStore();
  const { items, count, totalPrice, isLoading, fetchCart, removeFromCart, clearCart } = useCartStore();
  const [payModal, setPayModal]     = useState({ open: false, orderData: null });
  const [orderLoading, setOrderLoading] = useState(false);

  // Fetch server-side cart when authenticated
  useEffect(() => {
    if (user) fetchCart();
  }, [user]);

  const totalOriginalPrice = items.reduce(
    (s, i) => s + (i.course?.originalPrice || i.course?.price || 0), 0
  );
  const savings = totalOriginalPrice - totalPrice;
  const discountPct = totalOriginalPrice > 0
    ? Math.round((savings / totalOriginalPrice) * 100)
    : 0;

  const handleCheckout = async () => {
    if (!user) { navigate("/login"); return; }
    const courseIds = items.map((i) => i.course?._id || i.course).filter(Boolean);
    if (!courseIds.length) { toast.error("Your cart is empty."); return; }
    setOrderLoading(true);
    try {
      const { data } = await paymentAPI.cartCheckout(courseIds);
      setPayModal({ open: true, orderData: data.data });
    } catch (err) {
      toast.error(err.response?.data?.message || "Checkout failed. Try again.");
    } finally {
      setOrderLoading(false);
    }
  };

  const handleVerifyPayment = async (razorpayResp) => {
    try {
      const verifyRes = await paymentAPI.verify(razorpayResp);
      if (verifyRes.data.status === "success") {
        const enrolledIds = verifyRes.data.data?.enrolledCourseIds
          || items.map((i) => i.course?._id || i.course).filter(Boolean);
        enrolledIds.forEach((id) => enrollCourse(id));
        clearCart();
        const n = enrolledIds.length;
        toast.success(`🎉 Enrolled in ${n} course${n !== 1 ? "s" : ""}!`);
        setTimeout(() => navigate("/profile"), 1200);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Payment verification failed. Please contact support.");
    }
  };

  const cartDescription =
    count === 1
      ? items[0]?.course?.title || "1 course"
      : `${count} courses`;

  if (isLoading) return <div className="flex justify-center py-32"><Loader /></div>;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 animate-fade-in">
      {/* ── Payment Modal ── */}
      <PaymentModal
        isOpen={payModal.open}
        onClose={() => setPayModal({ open: false, orderData: null })}
        orderData={payModal.orderData}
        user={user}
        description={cartDescription}
        onVerify={handleVerifyPayment}
      />
      <h1 className="font-display font-black text-3xl mb-8">
        🛒 Your Cart
        {count > 0 && (
          <span className="ml-3 text-base font-normal text-white/40">
            ({count} {count === 1 ? "course" : "courses"})
          </span>
        )}
      </h1>

      {count === 0 ? (
        /* ── Empty State ── */
        <div className="text-center py-24">
          <div className="text-6xl mb-6">🛒</div>
          <h2 className="font-display font-bold text-2xl mb-3">Your cart is empty</h2>
          <p className="text-white/40 mb-8">
            Browse our courses and add the ones you love.
          </p>
          <Link to="/courses" className="btn-primary inline-flex">
            Browse Courses →
          </Link>
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-8">
          {/* ── Cart Items ── */}
          <div className="flex-1 space-y-4">
            {items.map((item) => {
              const course = item.course;
              if (!course) return null;
              const courseId = course._id || course;
              const discount = course.originalPrice
                ? Math.round(((course.originalPrice - course.price) / course.originalPrice) * 100)
                : 0;

              return (
                <div
                  key={courseId}
                  className="flex gap-4 bg-bg-card border border-white/[0.07] rounded-2xl p-4 hover:border-white/[0.12] transition-colors"
                >
                  {/* Thumbnail */}
                  {course.thumbnail ? (
                    <img
                      src={course.thumbnail}
                      alt={course.title}
                      className="w-28 h-20 object-cover rounded-xl flex-shrink-0"
                    />
                  ) : (
                    <div className="w-28 h-20 bg-white/[0.05] rounded-xl flex-shrink-0 flex items-center justify-center text-3xl">
                      📚
                    </div>
                  )}

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <Link
                      to={`/courses/${course.slug}`}
                      className="font-display font-bold text-base hover:text-primary transition-colors line-clamp-2 block mb-1"
                    >
                      {course.title}
                    </Link>
                    <p className="text-xs text-white/40 mb-2">
                      {course.instructorName}
                      {course.level && ` · ${course.level}`}
                    </p>
                    {course.rating > 0 && (
                      <span className="text-xs text-amber-400 font-semibold">
                        ⭐ {course.rating}
                      </span>
                    )}
                  </div>

                  {/* Price + Remove */}
                  <div className="flex flex-col items-end justify-between flex-shrink-0">
                    <button
                      onClick={() => removeFromCart(courseId)}
                      className="text-white/30 hover:text-red-400 transition-colors text-sm"
                      title="Remove"
                    >
                      ✕
                    </button>
                    <div className="text-right">
                      <p className="font-display font-black text-lg">
                        ₹{course.price?.toLocaleString("en-IN")}
                      </p>
                      {discount > 0 && (
                        <div className="flex items-center gap-1.5 justify-end">
                          <span className="text-xs text-white/30 line-through">
                            ₹{course.originalPrice?.toLocaleString("en-IN")}
                          </span>
                          <span className="text-xs text-accent-green font-semibold">
                            {discount}% off
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── Order Summary ── */}
          <div className="lg:w-80 flex-shrink-0">
            <div className="bg-bg-card border border-white/[0.07] rounded-3xl p-6 sticky top-24">
              <h2 className="font-display font-bold text-lg mb-5">Order Summary</h2>

              <div className="space-y-3 mb-5 text-sm">
                <div className="flex justify-between text-white/60">
                  <span>Subtotal ({count} courses)</span>
                  <span>₹{totalOriginalPrice.toLocaleString("en-IN")}</span>
                </div>
                {savings > 0 && (
                  <div className="flex justify-between text-accent-green">
                    <span>Discount</span>
                    <span>−₹{savings.toLocaleString("en-IN")}</span>
                  </div>
                )}
                <div className="border-t border-white/[0.07] pt-3 flex justify-between font-bold text-base">
                  <span>Total</span>
                  <span className="font-display text-xl">
                    ₹{totalPrice.toLocaleString("en-IN")}
                  </span>
                </div>
              </div>

              {discountPct > 0 && (
                <div className="bg-accent-green/10 border border-accent-green/20 rounded-xl px-3 py-2 mb-4 text-sm text-accent-green font-medium text-center">
                  🔥 You save {discountPct}% on this order!
                </div>
              )}

              <button
                onClick={handleCheckout}
                disabled={orderLoading || count === 0}
                className="btn-primary w-full justify-center py-4 text-base mb-3"
              >
                {orderLoading ? "Preparing…" : `Pay ₹${totalPrice.toLocaleString("en-IN")} →`}
              </button>

              <p className="text-center text-xs text-white/25 mt-3">
                🔒 Secured by Razorpay · 256-bit SSL
              </p>

              <div className="mt-5 pt-4 border-t border-white/[0.07] space-y-2">
                <p className="text-xs font-semibold text-white/30 uppercase tracking-widest mb-3">
                  What you get
                </p>
                {[
                  ["♾️", "Lifetime access"],
                  ["📱", "Mobile & desktop access"],
                  ["💬", "Community support"],
                ].map(([icon, text]) => (
                  <div key={text} className="flex items-center gap-2 text-xs text-white/40">
                    <span>{icon}</span>
                    <span>{text}</span>
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
