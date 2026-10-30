const { AppError } = require("../utils/errors");

function notFoundHandler(req, res) {
  return res.status(404).json({
    message: `Không tìm thấy đường dẫn: ${req.method} ${req.originalUrl}`,
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
      return res.status(409).json({ message: "Dữ liệu đã tồn tại (vi phạm ràng buộc duy nhất)", meta: err.meta });
    }
    if (err.code === "P2025") {
      return res.status(404).json({ message: "Không tìm thấy dữ liệu" });
    }
    if (err.code === "P2003") {
      return res.status(409).json({ message: "Dữ liệu đang được sử dụng bởi bản ghi khác", meta: err.meta });
    }
  }

  console.error(err);

  return res.status(500).json({ message: "Lỗi hệ thống, vui lòng thử lại sau" });
}

module.exports = { notFoundHandler, errorHandler };
