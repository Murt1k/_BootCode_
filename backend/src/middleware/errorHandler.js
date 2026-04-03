module.exports = (error, _req, res, _next) => {
  const statusCode = error.statusCode || 500;
  const payload = {
    message: error.message || "Internal server error"
  };

  if (error.details) {
    payload.details = error.details;
  }

  if (process.env.NODE_ENV !== "production" && error.stack) {
    payload.stack = error.stack;
  }

  res.status(statusCode).json(payload);
};
