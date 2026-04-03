const prisma = require("../config/prisma");
const ApiError = require("../utils/ApiError");
const { verifyAccessToken } = require("../services/tokenService");

const authMiddleware = async (req, _res, next) => {
  try {
    const header = req.headers.authorization || "";
    const [type, token] = header.split(" ");

    if (type !== "Bearer" || !token) {
      throw new ApiError(401, "Authorization token is required");
    }

    const payload = verifyAccessToken(token);
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, name: true, createdAt: true, updatedAt: true }
    });

    if (!user) {
      throw new ApiError(401, "User not found");
    }

    req.user = user;
    next();
  } catch (error) {
    next(error.statusCode ? error : new ApiError(401, "Invalid or expired access token"));
  }
};

module.exports = authMiddleware;
