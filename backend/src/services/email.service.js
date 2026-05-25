const nodemailer = require("nodemailer");

// ── Provider: Resend (HTTP API — works reliably from all cloud providers) ──────
// Set RESEND_API_KEY in env to use Resend (recommended for production).
// Falls back to Gmail SMTP if not set.

const sendEmail = async ({ to, subject, html, text }) => {
  // ── Elastic Email HTTP API (top priority) ────────────────────────────────────
  if (process.env.ELASTIC_EMAIL_API_KEY) {
    const toList = Array.isArray(to) ? to : [to];
    const payload = {
      Recipients: { To: toList },
      Content: {
        From:    process.env.EMAIL_FROM      || "sahrandhir122@gmail.com",
        ReplyTo: process.env.EMAIL_FROM      || "sahrandhir122@gmail.com",
        Subject: subject,
        Body: [
          { ContentType: "HTML", Content: html },
          { ContentType: "PlainText", Content: text || subject },
        ],
      },
    };

    const response = await fetch("https://api.elasticemail.com/v4/emails/transactional", {
      method:  "POST",
      headers: {
        "X-ElasticEmail-ApiKey": process.env.ELASTIC_EMAIL_API_KEY,
        "Content-Type":          "application/json",
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();
    if (!response.ok) {
      console.error("[email] Elastic Email error:", JSON.stringify(result));
      throw new Error(result?.Error || "Elastic Email failed");
    }
    console.log("[email] Sent via Elastic Email →", toList.join(", "));
    return result;
  }

  // ── Mailjet HTTP API ─────────────────────────────────────────────────────────
  if (process.env.MAILJET_API_KEY && process.env.MAILJET_API_SECRET) {
    const toList = Array.isArray(to)
      ? to.map((email) => ({ Email: email }))
      : [{ Email: to }];

    const payload = {
      Messages: [{
        From: {
          Email: process.env.EMAIL_FROM     || "sahrandhir122@gmail.com",
          Name:  process.env.EMAIL_FROM_NAME || "CodeLearn",
        },
        To:       toList,
        Subject:  subject,
        HTMLPart: html,
        TextPart: text || subject,
      }],
    };

    const auth = Buffer.from(
      `${process.env.MAILJET_API_KEY}:${process.env.MAILJET_API_SECRET}`
    ).toString("base64");

    const response = await fetch("https://api.mailjet.com/v3.1/send", {
      method:  "POST",
      headers: {
        "Authorization": `Basic ${auth}`,
        "Content-Type":  "application/json",
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (!response.ok || result.Messages?.[0]?.Status === "error") {
      console.error("[email] Mailjet error:", JSON.stringify(result));
      throw new Error(result.Messages?.[0]?.Errors?.[0]?.ErrorMessage || "Mailjet failed");
    }

    console.log("[email] Sent via Mailjet →", Array.isArray(to) ? to.join(", ") : to);
    return result;
  }

  // ── Brevo HTTP API ───────────────────────────────────────────────────────────
  if (process.env.BREVO_API_KEY) {
    const toList = Array.isArray(to)
      ? to.map((email) => ({ email }))
      : [{ email: to }];

    const payload = {
      sender: {
        name:  process.env.EMAIL_FROM_NAME || "CodeLearn",
        email: process.env.EMAIL_FROM      || "sahrandhir122@gmail.com",
      },
      to:          toList,
      subject,
      htmlContent: html,
      textContent: text || subject,
    };

    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method:  "POST",
      headers: {
        "accept":       "application/json",
        "api-key":      process.env.BREVO_API_KEY,
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error("[email] Brevo API error:", result);
      throw new Error(result.message || "Brevo API request failed");
    }

    console.log(
      "[email] Sent via Brevo API →",
      Array.isArray(to) ? to.join(", ") : to,
      "messageId:", result.messageId
    );
    return result;
  }

  // ── Resend API fallback ──────────────────────────────────────────────────
  if (process.env.RESEND_API_KEY) {
    const { Resend } = require("resend");
    const resend = new Resend(process.env.RESEND_API_KEY);
    const fromEmail = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";
    const fromName  = process.env.EMAIL_FROM_NAME   || "CodeLearn";
    const result = await resend.emails.send({
      from:    `${fromName} <${fromEmail}>`,
      to:      Array.isArray(to) ? to : [to],
      subject,
      html,
      text,
    });
    if (result.error) {
      console.error("[email] Resend error:", result.error);
      throw new Error(result.error.message || "Resend failed");
    }
    console.log("[email] Sent via Resend →", Array.isArray(to) ? to.join(", ") : to, "id:", result.data?.id);
    return result;
  }

  // ── Gmail SMTP fallback ──────────────────────────────────────────────────
  return getTransporter().sendMail({
    from: `"${process.env.EMAIL_FROM_NAME || "CodeLearn"}" <${process.env.EMAIL_FROM}>`,
    to,
    subject,
    html,
    text,
  });
};

// ── Singleton Gmail transporter ────────────────────────────────────────────
let _transporter = null;

const getTransporter = () => {
  if (_transporter) return _transporter;
  _transporter = nodemailer.createTransport({
    host:    process.env.EMAIL_HOST || "smtp.gmail.com",
    port:    Number(process.env.EMAIL_PORT) || 587,
    secure:  Number(process.env.EMAIL_PORT) === 465,
    family:  4, // Force IPv4 — fixes ENETUNREACH on Render
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    tls:               { rejectUnauthorized: false },
    connectionTimeout: 30_000,
    greetingTimeout:   30_000,
    socketTimeout:     30_000,
    pool:              true,
    maxConnections:    3,
  });
  return _transporter;
};

// ── Fire-and-forget helper ─────────────────────────────────────────────────
const sendEmailBg = (opts) => {
  sendEmail(opts).catch((err) =>
    console.error("[email] Background send failed:", err.message)
  );
};

// ── Shared style helpers ───────────────────────────────────────────────────
const wrap = (body) => `
  <div style="font-family:DM Sans,sans-serif;max-width:520px;margin:0 auto;background:#0A0A0F;color:#F0EEE9;padding:40px;border-radius:20px;border:1px solid rgba(255,255,255,0.07)">
    <div style="margin-bottom:24px">
      <span style="font-size:24px;font-weight:900;color:#E8471A;font-family:Syne,sans-serif;letter-spacing:-0.5px">CodeLearn</span>
    </div>
    ${body}
    <div style="margin-top:36px;padding-top:20px;border-top:1px solid rgba(255,255,255,0.07);font-size:12px;color:rgba(255,255,255,0.25);line-height:1.7">
      You received this email because you have an account at CodeLearn.<br/>
      © ${new Date().getFullYear()} CodeLearn. All rights reserved.
    </div>
  </div>`;

const btn = (href, label) =>
  `<a href="${href}" style="display:inline-block;margin-top:24px;background:#E8471A;color:#fff;padding:13px 28px;border-radius:12px;text-decoration:none;font-weight:700;font-size:14px">${label}</a>`;

// ─────────────────────────────────────────────────────────────────────────────
// OTP Email — registration verification
// ─────────────────────────────────────────────────────────────────────────────
const sendOTPEmail = (user, otp) =>
  sendEmail({
    to:      user.email,
    subject: "Your CodeLearn verification code",
    html: wrap(`
      <h2 style="font-size:22px;font-weight:800;margin-bottom:6px">Verify your email</h2>
      <p style="color:rgba(255,255,255,0.45);margin-bottom:28px">Hi ${user.name}, enter this OTP to complete your sign-up:</p>
      <div style="background:#16161F;border:1px solid rgba(255,255,255,0.08);padding:24px;border-radius:14px;text-align:center;font-size:40px;letter-spacing:14px;font-weight:900;color:#F0EEE9;margin-bottom:20px">${otp}</div>
      <p style="color:rgba(255,255,255,0.3);font-size:13px">⏱ Expires in 10 minutes. Never share this code.</p>
    `),
  });

// ─────────────────────────────────────────────────────────────────────────────
// Password Reset Email
// ─────────────────────────────────────────────────────────────────────────────
const sendPasswordResetEmail = (user, otp) =>
  sendEmail({
    to:      user.email,
    subject: "Reset your CodeLearn password",
    html: wrap(`
      <h2 style="font-size:22px;font-weight:800;margin-bottom:6px">Reset your password</h2>
      <p style="color:rgba(255,255,255,0.45);margin-bottom:28px">Hi ${user.name}, use this code to reset your CodeLearn password:</p>
      <div style="background:#16161F;border:1px solid rgba(255,255,255,0.08);padding:24px;border-radius:14px;text-align:center;font-size:40px;letter-spacing:14px;font-weight:900;color:#F0EEE9;margin-bottom:20px">${otp}</div>
      <p style="color:rgba(255,255,255,0.3);font-size:13px">⏱ Expires in 10 minutes. If you didn't request this, ignore this email — your password won't change.</p>
    `),
  });

// ─────────────────────────────────────────────────────────────────────────────
// Welcome Email — fire-and-forget
// ─────────────────────────────────────────────────────────────────────────────
const sendWelcomeEmail = (user) => {
  sendEmailBg({
    to:      user.email,
    subject: "Welcome to CodeLearn! 🎉",
    html: wrap(`
      <h2 style="font-size:22px;font-weight:800;margin-bottom:8px">Welcome aboard, ${user.name}! 🚀</h2>
      <p style="color:rgba(255,255,255,0.45);line-height:1.7">Your account is verified and ready. Explore India's top coding courses and start building your dream career today.</p>
      ${btn(`${process.env.FRONTEND_URL}/courses`, "Browse Courses →")}
    `),
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// Purchase Confirmation — fire-and-forget
// ─────────────────────────────────────────────────────────────────────────────
const sendPurchaseConfirmationEmail = (user, course, transaction) => {
  sendEmailBg({
    to:      user.email,
    subject: `✅ Enrolled: ${course.title}`,
    html: wrap(`
      <h2 style="font-size:22px;font-weight:800;margin-bottom:8px">Payment Successful! 🎉</h2>
      <p style="color:rgba(255,255,255,0.45);margin-bottom:20px">Hi ${user.name}, you're now enrolled in:</p>
      <div style="background:#16161F;border:1px solid rgba(255,255,255,0.08);padding:20px;border-radius:14px;margin-bottom:20px">
        <p style="font-size:18px;font-weight:700;margin-bottom:4px">${course.title}</p>
        <p style="color:rgba(255,255,255,0.4);font-size:13px;margin-bottom:12px">by ${course.instructorName || "CodeLearn Instructor"}</p>
        <p style="color:#2ECC71;font-size:22px;font-weight:800">₹${Number(transaction.amount).toLocaleString("en-IN")}</p>
      </div>
      <div style="font-size:12px;color:rgba(255,255,255,0.25)">
        Order ID: ${transaction.razorpayOrderId}<br/>
        Payment ID: ${transaction.razorpayPaymentId || "N/A"}
      </div>
      ${btn(`${process.env.FRONTEND_URL}/profile`, "Start Learning →")}
    `),
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// Admin Notification — fire-and-forget
// ─────────────────────────────────────────────────────────────────────────────
const sendAdminPurchaseNotification = (user, transactions) => {
  if (!process.env.EMAIL_FROM) return;

  const courseList = transactions
    .map((t) => `<li style="padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.06)">${t.course?.title || "Course"} — ₹${Number(t.amount).toLocaleString("en-IN")}</li>`)
    .join("");

  const total = transactions.reduce((s, t) => s + t.amount, 0);

  sendEmailBg({
    to:      process.env.EMAIL_FROM,
    subject: `💰 New Purchase by ${user.name}`,
    html: wrap(`
      <h2 style="font-size:20px;font-weight:800;margin-bottom:8px">New Purchase Alert</h2>
      <p style="color:rgba(255,255,255,0.45);margin-bottom:16px">
        <strong style="color:#F0EEE9">${user.name}</strong> (${user.email}) just purchased:
      </p>
      <ul style="list-style:none;padding:0;background:#16161F;border-radius:12px;padding:16px;margin-bottom:16px">
        ${courseList}
      </ul>
      <p style="font-size:18px;font-weight:700;color:#2ECC71">Total: ₹${Number(total).toLocaleString("en-IN")}</p>
      ${btn(`${process.env.FRONTEND_URL}/admin`, "View in Dashboard →")}
    `),
  });
};

module.exports = {
  sendOTPEmail,
  sendPasswordResetEmail,
  sendWelcomeEmail,
  sendPurchaseConfirmationEmail,
  sendAdminPurchaseNotification,
};
