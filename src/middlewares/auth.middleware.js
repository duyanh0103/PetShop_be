const authRepository = require("../modules/auth/auth.repository");
const { verifyToken } = require("../utils/jwt");

async function authMiddleware(req, res, next) {
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

  let decoded;

  try {
    decoded = verifyToken(token);
  } catch (error) {
    return res.status(401).json({
      message: "Token không hợp lệ hoặc đã hết hạn",
    });
  }

  // A token stays valid for a day, so locks and role changes are read from the
  // database. A failure here is a server error, it must not log the user out.
  try {
    const user = await authRepository.findById(decoded.id);

    if (!user) {
      return res.status(401).json({
        message: "Token không hợp lệ hoặc đã hết hạn",
      });
    }

    if (user.isActive === false) {
      return res.status(401).json({
        message: "Tài khoản đã bị khoá",
      });
    }

    req.user = { ...decoded, role: user.role }; // 🔥 attach user to request

    return next();
  } catch (error) {
    return next(error);
  }
}

module.exports = authMiddleware;
