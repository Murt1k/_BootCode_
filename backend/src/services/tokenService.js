const crypto = require("node:crypto");
const jwt = require("jsonwebtoken");
const env = require("../config/env");

const createAccessToken = (user) =>
  jwt.sign(
    {
      sub: user.id,
      email: user.email,
      name: user.name
    },
    env.jwtAccessSecret,
    { expiresIn: env.accessTokenExpiresIn }
  );

const createRefreshToken = (user) =>
  jwt.sign({ sub: user.id }, env.jwtRefreshSecret, {
    expiresIn: `${env.refreshTokenExpiresInDays}d`
  });

const verifyAccessToken = (token) => jwt.verify(token, env.jwtAccessSecret);
const verifyRefreshToken = (token) => jwt.verify(token, env.jwtRefreshSecret);

const hashToken = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");

const getRefreshTokenExpiryDate = () => {
  const date = new Date();
  date.setDate(date.getDate() + env.refreshTokenExpiresInDays);
  return date;
};

module.exports = {
  createAccessToken,
  createRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  hashToken,
  getRefreshTokenExpiryDate
};
