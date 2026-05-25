require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../models/User.model");
const Course = require("../models/Course.model");

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    // Clear existing data
    await User.deleteMany({});
    await Course.deleteMany({});
    console.log("🧹 Cleared existing data");

    // Create admin
    const admin = await User.create({
      name: "Admin",
      email: "admin@codelearn.in",
      passwordHash: "Admin@1234",
      role: "admin",
      isVerified: true,
      avatar: "https://ui-avatars.com/api/?name=Admin&background=3B82F6&color=fff",
    });
    console.log("👤 Admin created: admin@codelearn.in / Admin@1234");

    // Create instructors
    const instructors = await User.insertMany([
      { name: "Rohan Verma", email: "rohan@codelearn.in", passwordHash: "Test@1234", role: "instructor", isVerified: true },
      { name: "Priya Kapoor", email: "priya@codelearn.in", passwordHash: "Test@1234", role: "instructor", isVerified: true },
      { name: "Dr. Arjun Mehta", email: "arjun@codelearn.in", passwordHash: "Test@1234", role: "instructor", isVerified: true },
    ]);
    console.log("👨‍🏫 Instructors created");

    // Create sample student
    const student = await User.create({
      name: "Demo Student",
      email: "student@codelearn.in",
      passwordHash: "Student@1234",
      role: "student",
      isVerified: true,
      avatar: "https://ui-avatars.com/api/?name=Demo+Student&background=06B6D4&color=fff",
    });
    console.log("👨‍🎓 Student created: student@codelearn.in / Student@1234");

    // Create courses with real MongoDB IDs
    const courses = await Course.insertMany([
      {
        _id: new mongoose.Types.ObjectId("64a1b2c3d4e5f6789012341"),
        title: "Complete Python Bootcamp",
        slug: "python-bootcamp",
        description: "Master Python from absolute zero to professional hero. Build real-world projects.",
        instructor: instructors[0]._id,
        instructorName: "Rohan Verma",
        price: 1499,
        originalPrice: 4999,
        category: "Programming",
        level: "Beginner",
        tags: ["Python", "OOP", "DSA"],
        thumbnail: "https://images.unsplash.com/photo-1526379879527-8559ecfcaec0?w=600&q=80",
        rating: 4.8,
        totalStudents: 42300,
        isPublished: true,
        isFeatured: true,
        isBestseller: true,
        sections: [{
          title: "Python Fundamentals",
          order: 1,
          lectures: [
            { title: "Introduction to Python", duration: 1200, isFree: true, order: 1 },
            { title: "Variables & Data Types", duration: 900, isFree: true, order: 2 },
            { title: "Functions & Modules", duration: 1500, isFree: false, order: 3 },
          ]
        }],
      },
      {
        _id: new mongoose.Types.ObjectId("64a1b2c3d4e5f6789012342"),
        title: "Full Stack Web Dev with React",
        slug: "fullstack-react",
        description: "Build production-grade web apps with React, Node.js, Express, and MongoDB.",
        instructor: instructors[1]._id,
        instructorName: "Priya Kapoor",
        price: 1999,
        originalPrice: 5999,
        category: "Web Development",
        level: "Intermediate",
        tags: ["React", "Node.js", "MongoDB"],
        thumbnail: "https://images.unsplash.com/photo-1627398242454-45a1465c2479?w=600&q=80",
        rating: 4.9,
        totalStudents: 38100,
        isPublished: true,
        isFeatured: true,
        isBestseller: false,
        sections: [{
          title: "React Fundamentals",
          order: 1,
          lectures: [
            { title: "JSX & Components", duration: 1200, isFree: true, order: 1 },
            { title: "State & Props", duration: 900, isFree: false, order: 2 },
          ]
        }],
      },
      {
        _id: new mongoose.Types.ObjectId("64a1b2c3d4e5f6789012343"),
        title: "Machine Learning A-Z",
        slug: "machine-learning",
        description: "From regression to deep learning. Build 20+ real ML models.",
        instructor: instructors[2]._id,
        instructorName: "Dr. Arjun Mehta",
        price: 2499,
        originalPrice: 6999,
        category: "AI/ML",
        level: "Advanced",
        tags: ["Python", "TensorFlow", "scikit-learn"],
        thumbnail: "https://images.unsplash.com/photo-1677442135703-1787eea5ce01?w=600&q=80",
        rating: 4.7,
        totalStudents: 29500,
        isPublished: true,
        isFeatured: true,
        isBestseller: true,
        sections: [{
          title: "ML Foundations",
          order: 1,
          lectures: [
            { title: "What is Machine Learning?", duration: 900, isFree: true, order: 1 },
            { title: "Linear Regression", duration: 1800, isFree: false, order: 2 },
          ]
        }],
      },
    ]);
    console.log("📚 Courses created:", courses.length);

    console.log("\n🎉 Seed complete! Login credentials:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("Admin:    admin@codelearn.in    / Admin@1234");
    console.log("Student:  student@codelearn.in  / Student@1234");
    console.log("Instructor: rohan@codelearn.in  / Test@1234");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    process.exit(0);
  } catch (err) {
    console.error("❌ Seed failed:", err.message);
    process.exit(1);
  }
};

seed();
