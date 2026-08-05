const { AppError } = require("../utils/errors");

function notFoundHandler(req, res) {
  return res.status(404).json({
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      message: err.message,
      ...(err.errors ? { errors: err.errors } : {}),
    });
  }

  // Prisma known request errors that slipped past the service layer
  // (e.g. a raw unique-constraint hit not pre-checked in code).
  if (err && typeof err.code === "string" && err.code.startsWith("P")) {
    if (err.code === "P2002") {
      return res.status(409).json({ message: "Unique constraint violation", meta: err.meta });
    }
    if (err.code === "P2025") {
      return res.status(404).json({ message: "Record not found" });
    }
    if (err.code === "P2003") {
      return res.status(409).json({ message: "Related record constraint violation", meta: err.meta });
    }
  }

  console.error(err);

  return res.status(500).json({ message: "Internal server error" });
}

module.exports = { notFoundHandler, errorHandler };
