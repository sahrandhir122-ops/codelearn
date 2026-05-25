# CodeLearn — Full Stack Course Selling Platform

A complete, production-ready course selling platform with Student Frontend, Admin Dashboard, and REST API Backend.

## 🚀 Quick Start

```bash
# 1. Backend
cd backend
cp .env.example .env        # fill in your values
npm install
npm run seed                # creates admin + sample data
npm run dev                 # http://localhost:5000

# 2. Frontend + Admin (same app)
cd frontend
cp .env.example .env        # fill in your values
npm install
npm run dev                 # http://localhost:5173
```

## 🔐 Login Credentials

| Role      | Email                      | Password      |
|-----------|----------------------------|---------------|
| Admin     | admin@codelearn.in         | Admin@1234    |
| Student   | student@codelearn.in       | Student@1234  |
| Instructor| rohan@codelearn.in         | Test@1234     |

## 🌐 URLs

| Page              | URL                                    |
|-------------------|----------------------------------------|
| Homepage          | http://localhost:5173                  |
| Student Login     | http://localhost:5173/login            |
| Admin Dashboard   | http://localhost:5173/admin            |
| API Health        | http://localhost:5000/health           |

## 📁 Project Structure

```
codelearn/
├── frontend/                    # React + Vite + TailwindCSS
│   └── src/
│       ├── pages/
│       │   ├── HomePage.jsx         # Landing page with courses
│       │   ├── CoursesPage.jsx      # Browse all courses
│       │   ├── CourseDetailPage.jsx # Course detail + enroll
│       │   ├── LoginPage.jsx        # Student login
│       │   ├── RegisterPage.jsx     # Student signup
│       │   ├── VerifyOTPPage.jsx    # Email OTP verification
│       │   ├── ProfilePage.jsx      # Student profile + history
│       │   └── AdminDashboard.jsx   # FULL ADMIN DASHBOARD
│       ├── components/
│       │   ├── Navbar.jsx           # Top navigation
│       │   ├── Footer.jsx           # Site footer
│       │   ├── CourseCard.jsx       # Reusable course card
│       │   ├── StripePayment.jsx    # Payment modal
│       │   ├── Modal.jsx            # Reusable modal
│       │   └── Loader.jsx           # Loading spinner
│       ├── hooks/
│       │   └── usePayment.js        # Payment logic hook
│       ├── store/
│       │   └── useAuthStore.js      # Zustand auth state
│       └── api/
│           ├── axios.js             # Axios instance
│           └── index.js             # All API functions
│
└── backend/                     # Node.js + Express + MongoDB
    └── src/
        ├── config/
        │   ├── db.js                # MongoDB connection
        │   ├── redis.js             # Redis connection
        │   └── passport.js          # OAuth strategies
        ├── models/
        │   ├── User.model.js        # User schema
        │   ├── Course.model.js      # Course schema
        │   ├── Transaction.model.js # Payment schema
        │   └── Comment.model.js     # Comment schema
        ├── controllers/
        │   ├── auth.controller.js   # Register/Login/OAuth/OTP
        │   ├── course.controller.js # CRUD + enrollment
        │   ├── payment.controller.js# Stripe payment
        │   ├── user.controller.js   # Profile + watch history
        │   ├── comment.controller.js# Comments + moderation
        │   └── admin.controller.js  # Admin stats + management
        ├── routes/                  # All route definitions
        ├── middleware/              # Auth, errors, rate limits
        ├── services/
        │   └── email.service.js     # OTP + confirmation emails
        └── utils/
            ├── AppError.js          # Custom error class
            ├── jwt.js               # JWT helpers
            └── seed.js              # Database seeder
```

## ✨ Features

### Student Frontend
- Browse and search courses
- Course detail with syllabus, reviews, comments
- Register/Login with email + OTP verification
- Google & GitHub OAuth
- Stripe payment integration
- Profile page with enrolled courses + purchase history

### Admin Dashboard (http://localhost:5173/admin)
- Secure login (separate from student login)
- Overview with revenue charts, enrollments, top courses
- Course management (add/edit/delete/publish)
- User management (ban/unban/approve instructors)
- Transaction history with CSV export
- Comment moderation (approve/delete flagged)
- Email notifications & announcements
- Settings (payment keys, OAuth, branding, database)

### Backend API
- JWT + OAuth authentication
- Role-based access (admin/instructor/student)
- Rate limiting & security headers
- Email OTP verification
- Stripe payment verification
- Watch history tracking

## 🛠️ Tech Stack

| Layer     | Tech                              |
|-----------|-----------------------------------|
| Frontend  | React 18, Vite, TailwindCSS       |
| State     | Zustand (persisted)               |
| Charts    | Recharts                          |
| Backend   | Node.js, Express 4                |
| Database  | MongoDB (Mongoose)                |
| Cache     | Redis (Upstash)                   |
| Auth      | JWT, Passport.js, bcrypt          |
| Payment   | Stripe                            |
| Email     | Nodemailer (Gmail SMTP)           |
| Deploy    | Vercel (frontend) + Railway (backend)|

## 🚀 Deploy to Production

```bash
# Push to GitHub
git init && git add . && git commit -m "CodeLearn v1.0"
git remote add origin https://github.com/YOUR_USERNAME/codelearn.git
git push -u origin main

# Frontend → Vercel (vercel.com)
# Root directory: frontend
# Add env vars: VITE_API_URL, VITE_STRIPE_PUBLISHABLE_KEY

# Backend → Railway (railway.app)
# Root directory: backend
# Add all .env variables in Variables tab
```
