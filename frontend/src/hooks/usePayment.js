import { useState } from "react";
import toast from "react-hot-toast";
import { paymentAPI } from "../api";
import useAuthStore from "../store/useAuthStore";
import useCartStore from "../store/useCartStore";

/**
 * Loads the Razorpay checkout script once and returns a promise.
 */
const loadRazorpayScript = () =>
  new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

/**
 * Opens the Razorpay checkout popup and returns true on payment success.
 * @param {object} orderData   – { orderId, amount, currency, keyId }
 * @param {object} user        – logged-in user object
 * @param {string} description – order description
 * @param {function} onVerify  – async fn called with razorpay response; should call verify API
 */
const openRazorpayCheckout = (orderData, user, description, onVerify) =>
  new Promise((resolve) => {
    const options = {
      key: orderData.keyId || import.meta.env.VITE_RAZORPAY_KEY_ID,
      amount: orderData.amount,          // already in paise
      currency: orderData.currency || "INR",
      order_id: orderData.orderId,
      name: "CodeLearn",
      description,
      image: "/logo.png",
      prefill: {
        name: user?.name || "",
        email: user?.email || "",
        contact: user?.phone || "",
      },
      theme: { color: "#E8471A" },
      handler: async (response) => {
        try {
          await onVerify({
            razorpayOrderId: response.razorpay_order_id,
            razorpayPaymentId: response.razorpay_payment_id,
            razorpaySignature: response.razorpay_signature,
          });
          resolve(true);
        } catch {
          resolve(false);
        }
      },
      modal: {
        ondismiss: () => resolve(false),
        escape: true,
      },
    };

    const rzp = new window.Razorpay(options);
    rzp.on("payment.failed", (response) => {
      toast.error(`Payment failed: ${response.error.description}`);
      resolve(false);
    });
    rzp.open();
  });

// ─────────────────────────────────────────────────────────────────────────────
// Hook: single-course purchase
// ─────────────────────────────────────────────────────────────────────────────
const usePayment = () => {
  const [loading, setLoading] = useState(false);
  const { user, enrollCourse } = useAuthStore();

  const initiatePurchase = async (course) => {
    if (!user) {
      toast.error("Please sign in to purchase this course.");
      return false;
    }

    const scriptLoaded = await loadRazorpayScript();
    if (!scriptLoaded) {
      toast.error("Failed to load payment gateway. Check your internet connection.");
      return false;
    }

    setLoading(true);
    try {
      // 1. Create order on backend
      const { data } = await paymentAPI.createOrder(course._id);
      const orderData = data.data; // { orderId, amount, currency, keyId, courseName }

      // 2. Open Razorpay checkout
      const success = await openRazorpayCheckout(
        orderData,
        user,
        course.title,
        async (razorpayResp) => {
          // 3. Verify on backend
          const verifyRes = await paymentAPI.verify(razorpayResp);
          if (verifyRes.data.status === "success") {
            enrollCourse(course._id);
            toast.success(`🎉 Enrolled in ${course.title}!`);
          }
        }
      );

      return success;
    } catch (err) {
      const msg = err.response?.data?.message || "Payment initiation failed. Try again.";
      toast.error(msg);
      return false;
    } finally {
      setLoading(false);
    }
  };

  return { initiatePurchase, loading };
};

// ─────────────────────────────────────────────────────────────────────────────
// Hook: cart checkout (multiple courses)
// ─────────────────────────────────────────────────────────────────────────────
export const useCartPayment = () => {
  const [loading, setLoading] = useState(false);
  const { user, enrollCourse } = useAuthStore();
  const { clearCart } = useCartStore();

  const initiateCartCheckout = async (courseIds) => {
    if (!user) {
      toast.error("Please sign in to checkout.");
      return false;
    }
    if (!courseIds || courseIds.length === 0) {
      toast.error("Your cart is empty.");
      return false;
    }

    const scriptLoaded = await loadRazorpayScript();
    if (!scriptLoaded) {
      toast.error("Failed to load payment gateway.");
      return false;
    }

    setLoading(true);
    try {
      // 1. Create cart order on backend
      const { data } = await paymentAPI.cartCheckout(courseIds);
      const orderData = data.data; // { orderId, amount, currency, keyId, courses, totalAmount }

      const description =
        orderData.courses.length === 1
          ? orderData.courses[0].title
          : `${orderData.courses.length} courses`;

      // 2. Open Razorpay checkout
      const success = await openRazorpayCheckout(
        orderData,
        user,
        description,
        async (razorpayResp) => {
          // 3. Verify on backend
          const verifyRes = await paymentAPI.verify(razorpayResp);
          if (verifyRes.data.status === "success") {
            // Enroll in each course locally
            const enrolledIds = verifyRes.data.data?.enrolledCourseIds || courseIds;
            enrolledIds.forEach((id) => enrollCourse(id));
            clearCart();
            toast.success(`🎉 Enrolled in ${orderData.courses.length} course(s)!`);
          }
        }
      );

      return success;
    } catch (err) {
      const msg = err.response?.data?.message || "Checkout failed. Try again.";
      toast.error(msg);
      return false;
    } finally {
      setLoading(false);
    }
  };

  return { initiateCartCheckout, loading };
};

export default usePayment;
