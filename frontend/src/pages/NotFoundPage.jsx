import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4 text-center">
      <div className="animate-fade-in">
        <div className="font-display font-black text-[120px] leading-none text-white/5 mb-4">404</div>
        <h1 className="font-display font-black text-3xl mb-3">Page not found</h1>
        <p className="text-white/40 mb-8">The page you're looking for doesn't exist or has been moved.</p>
        <div className="flex gap-3 justify-center">
          <Link to="/" className="btn-primary">Go Home →</Link>
          <Link to="/courses" className="btn-ghost">Browse Courses</Link>
        </div>
      </div>
    </div>
  );
}
