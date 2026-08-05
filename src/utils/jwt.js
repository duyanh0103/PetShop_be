const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error(
    "JWT_SECRET is not set. Define it in your .env file before starting the server."
  );
}

function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: "1d",
  });
}

function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

module.exports = {
  signToken,
  verifyToken,
};
