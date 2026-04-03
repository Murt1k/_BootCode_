const bcrypt = require("bcrypt");
const prisma = require("../config/prisma");
const env = require("../config/env");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");
const { getRefreshCookieOptions } = require("../utils/cookieOptions");
const {
  createAccessToken,
  createRefreshToken,
  verifyRefreshToken,
  hashToken,
  getRefreshTokenExpiryDate
} = require("../services/tokenService");

const sanitizeUser = (user) => ({
  id: user.id,
  email: user.email,
  name: user.name,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt
});

const issueTokens = async (res, user) => {
  const accessToken = createAccessToken(user);
  const refreshToken = createRefreshToken(user);

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(refreshToken),
      expiresAt: getRefreshTokenExpiryDate()
    }
  });

  res.cookie(env.cookieName, refreshToken, getRefreshCookieOptions());

  return accessToken;
};

const register = asyncHandler(async (req, res) => {
  const { email, password, name } = req.body;

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    throw new ApiError(409, "User with this email already exists");
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { email, passwordHash, name }
  });

  const accessToken = await issueTokens(res, user);

  res.status(201).json({
    user: sanitizeUser(user),
    accessToken
  });
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new ApiError(401, "Invalid email or password");
  }

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatches) {
    throw new ApiError(401, "Invalid email or password");
  }

  const accessToken = await issueTokens(res, user);

  res.json({
    user: sanitizeUser(user),
    accessToken
  });
});

const refresh = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies?.[env.cookieName];
  if (!refreshToken) {
    throw new ApiError(401, "Refresh token is required");
  }

  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw new ApiError(401, "Invalid or expired refresh token");
  }

  const tokenHash = hashToken(refreshToken);
  const storedToken = await prisma.refreshToken.findFirst({
    where: {
      userId: payload.sub,
      tokenHash,
      expiresAt: { gt: new Date() }
    }
  });

  if (!storedToken) {
    throw new ApiError(401, "Refresh token not found");
  }

  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user) {
    throw new ApiError(401, "User not found");
  }

  await prisma.refreshToken.delete({ where: { id: storedToken.id } });
  const accessToken = await issueTokens(res, user);

  res.json({
    user: sanitizeUser(user),
    accessToken
  });
});

const logout = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies?.[env.cookieName];

  if (refreshToken) {
    await prisma.refreshToken.deleteMany({
      where: { tokenHash: hashToken(refreshToken) }
    });
  }

  res.clearCookie(env.cookieName, getRefreshCookieOptions());
  res.status(204).send();
});

const me = asyncHandler(async (req, res) => {
  res.json({ user: req.user });
});

module.exports = {
  register,
  login,
  refresh,
  logout,
  me
};
