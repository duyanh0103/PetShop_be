const { verifyToken } = require("../utils/jwt");

function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        message: "Không tìm thấy token xác thực",
      });
    }

    // format: Bearer <token>
    const token = authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        message: "Định dạng token không hợp lệ",
      });
    }

    const decoded = verifyToken(token);

    req.user = decoded; // 🔥 attach user to request

    next();
  } catch (error) {
    return res.status(401).json({
      message: "Token không hợp lệ hoặc đã hết hạn",
    });
  }
}

module.exports = authMiddleware;