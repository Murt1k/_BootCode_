const env = require("../config/env");

const getRefreshCookieOptions = () => ({
  httpOnly: true,
  secure: env.nodeEnv === "production",
  sameSite: env.nodeEnv === "production" ? "none" : "lax",
  maxAge: env.refreshTokenExpiresInDays * 24 * 60 * 60 * 1000,
  path: "/auth"
});

module.exports = { getRefreshCookieOptions };
