const passport = require("passport");
const { Strategy: JwtStrategy, ExtractJwt } = require("passport-jwt");
const { Strategy: GoogleStrategy } = require("passport-google-oauth20");
const { Strategy: GitHubStrategy } = require("passport-github2");

const User = require("../models/User.model");

// ── JWT Strategy ───────────────────────────────────────────────────────────
const jwtOptions = {
  jwtFromRequest: ExtractJwt.fromExtractors([
    (req) => req?.cookies?.token,
    ExtractJwt.fromAuthHeaderAsBearerToken(),
  ]),
  secretOrKey: process.env.JWT_SECRET,
};

passport.use(
  new JwtStrategy(jwtOptions, async (payload, done) => {
    try {
      const user = await User.findById(payload.id).select("-passwordHash -otp");
      if (!user) return done(null, false);
      return done(null, user);
    } catch (err) {
      return done(err, false);
    }
  })
);

// ── Google OAuth Strategy ──────────────────────────────────────────────────
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL,
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          let user = await User.findOne({ "social.googleId": profile.id });
          if (!user) {
            user = await User.findOne({ email: profile.emails[0].value });
            if (user) {
              user.social.googleId = profile.id;
              user.isVerified = true;
              if (!user.avatar || user.avatar.includes("ui-avatars.com")) {
                user.avatar = profile.photos[0]?.value || user.avatar;
              }
              await user.save({ validateBeforeSave: false });
            } else {
              user = await User.create({
                name: profile.displayName,
                email: profile.emails[0].value,
                avatar: profile.photos[0]?.value,
                social: { googleId: profile.id },
                isVerified: true,
              });
            }
          }
          return done(null, user);
        } catch (err) {
          return done(err, null);
        }
      }
    )
  );
} else {
  console.warn("⚠️  Google OAuth not configured (GOOGLE_CLIENT_ID missing)");
}

// ── GitHub OAuth Strategy ──────────────────────────────────────────────────
if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
  passport.use(
    new GitHubStrategy(
      {
        clientID: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET,
        callbackURL: process.env.GITHUB_CALLBACK_URL,
        scope: ["user:email"],
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value;
          let user = await User.findOne({ "social.githubId": profile.id });
          if (!user) {
            user = email ? await User.findOne({ email }) : null;
            if (user) {
              user.social.githubId = String(profile.id);
              user.isVerified = true;
              if (!user.avatar || user.avatar.includes("ui-avatars.com")) {
                user.avatar = profile.photos?.[0]?.value || user.avatar;
              }
              await user.save({ validateBeforeSave: false });
            } else {
              user = await User.create({
                name: profile.displayName || profile.username,
                email: email || `${profile.username}@github.local`,
                avatar: profile.photos?.[0]?.value,
                social: { githubId: String(profile.id) },
                isVerified: true,
              });
            }
          }
          return done(null, user);
        } catch (err) {
          return done(err, null);
        }
      }
    )
  );
} else {
  console.warn("⚠️  GitHub OAuth not configured (GITHUB_CLIENT_ID missing)");
}

module.exports = passport;
