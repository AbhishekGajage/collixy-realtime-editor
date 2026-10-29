// config/passport.js — Passport strategies (GitHub OAuth via passport-github2)
const passport = require('passport');
const GitHubStrategy = require('passport-github2').Strategy;
const User = require('../models/User');

// ========== GITHUB STRATEGY ==========
// Only register the strategy if credentials are available (avoids crash on deploy)
if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
  passport.use(
    new GitHubStrategy(
      {
        clientID: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET,
        callbackURL: process.env.GITHUB_REDIRECT_URI,
        scope: ['user:email'],
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          console.log('🐙 GitHub OAuth callback — profile:', {
            id: profile.id,
            username: profile.username,
            displayName: profile.displayName,
            emails: profile.emails,
            photos: profile.photos,
          });

          const githubId = profile.id;
          // GitHub may return multiple emails; pick the primary verified one
          const email =
            profile.emails?.find((e) => e.primary && e.verified)?.value ||
            profile.emails?.[0]?.value ||
            `${profile.username}@users.noreply.github.com`;

          const avatar = profile.photos?.[0]?.value || '';
          const displayName = profile.displayName || profile.username;

          // Check if user already exists by githubId or email
          let user = await User.findOne({
            $or: [{ githubId }, { email: email.toLowerCase() }],
          });

          if (user) {
            console.log('✅ Existing user found:', user.email);

            // Link GitHub account if not already linked
            const updateData = {
              lastActive: new Date(),
              isVerified: true,
            };
            if (!user.githubId) updateData.githubId = githubId;
            if (avatar && !user.avatar) updateData.avatar = avatar;

            await User.updateOne({ _id: user._id }, { $set: updateData });
            user = await User.findById(user._id);
          } else {
            console.log('🆕 Creating new user from GitHub...');

            // Generate a unique username
            let username = profile.username || displayName.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
            username = username.substring(0, 25);
            let counter = 1;
            while (await User.findOne({ username })) {
              username = `${username.substring(0, 22)}${counter}`;
              counter++;
            }

            const result = await User.create(
              [
                {
                  username,
                  email: email.toLowerCase(),
                  githubId,
                  avatar: avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`,
                  isVerified: true,
                  lastActive: new Date(),
                  settings: {
                    theme: 'system',
                    editor: {
                      fontSize: 14,
                      tabSize: 2,
                      lineNumbers: true,
                      wordWrap: false,
                      autoComplete: true,
                    },
                  },
                },
              ],
              { validateBeforeSave: false }
            );
            user = result[0];
            console.log('✅ New user created:', user.email);
          }

          return done(null, user);
        } catch (error) {
          console.error('❌ GitHub strategy error:', error);
          return done(error, null);
        }
      }
    )
  );
} else {
  console.warn('⚠️  GitHub OAuth credentials not found — GitHub login will be unavailable');
}

// Serialize / Deserialize (required by Passport but we use JWT, not sessions)
passport.serializeUser((user, done) => done(null, user._id));
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

module.exports = passport;
