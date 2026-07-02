const { verifyToken } = require("../utils/jwt");

function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        message: "No token provided",
      });
    }

    // format: Bearer <token>
    const token = authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        message: "Invalid token format",
      });
    }

    const decoded = verifyToken(token);

    req.user = decoded; // 🔥 attach user to request

    next();
  } catch (error) {
    return res.status(401).json({
      message: "Unauthorized - invalid token",
    });
  }
}

module.exports = authMiddleware;