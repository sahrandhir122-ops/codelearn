import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="bg-bg-card border-t border-white/[0.07] mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link to="/" className="flex items-center gap-2.5 mb-4">
              <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center font-display font-black text-white text-lg">C</div>
              <span className="font-display font-black text-xl text-white">CodeLearn</span>
            </Link>
            <p className="text-sm text-white/40 leading-relaxed mb-4">
              India's premier coding education platform. Learn, build, and launch your tech career.
            </p>
            <div className="flex gap-3">
              {["𝕏", "📘", "▶", "💼"].map((icon, i) => (
                <button key={i} className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-sm hover:bg-white/10 transition-colors">
                  {icon}
                </button>
              ))}
            </div>
          </div>

          {/* Links */}
          {[
            {
              title: "Platform",
              links: [
                { label: "All Courses", path: "/courses" },
                { label: "Roadmaps", path: "/roadmaps" },
                { label: "Blog", path: "/blog" },
                { label: "Community", path: "/community" },
              ],
            },
            {
              title: "Company",
              links: [
                { label: "About Us", path: "/about" },
                { label: "Careers", path: "/careers" },
                { label: "Press", path: "/press" },
                { label: "Contact", path: "/contact" },
              ],
            },
            {
              title: "Legal",
              links: [
                { label: "Privacy Policy", path: "/privacy" },
                { label: "Terms of Service", path: "/terms" },
                { label: "Refund Policy", path: "/refund" },
                { label: "Sitemap", path: "/sitemap" },
              ],
            },
          ].map((col) => (
            <div key={col.title}>
              <h4 className="text-xs font-semibold text-white/30 uppercase tracking-widest mb-4">
                {col.title}
              </h4>
              <ul className="space-y-3">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link to={link.path} className="text-sm text-white/50 hover:text-white/80 transition-colors">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-white/[0.07] pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-white/30">© 2026 CodeLearn Technologies Pvt. Ltd. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <p className="text-xs text-white/30">Made with ❤️ in India 🇮🇳</p>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-accent-green animate-pulse" />
              <span className="text-xs text-white/30">All systems operational</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
