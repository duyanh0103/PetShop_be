const express = require("express");

const authMiddleware = require("../../middlewares/auth.middleware");
const authorize = require("../../middlewares/role.middleware");

const authController = require("./auth.controller");
const { validateRegister, validateLogin } = require("./auth.validation");

const router = express.Router();

router.post("/register", validateRegister, (req, res, next) =>
  authController.register(req, res, next)
);

router.post("/login", validateLogin, (req, res, next) =>
  authController.login(req, res, next)
);

router.get("/me", authMiddleware, (req, res, next) =>
  authController.getCurrentUser(req, res, next)
);

router.get(
  "/admin",
  authMiddleware,
  authorize("ADMIN", "SUPER_ADMIN"),
  (req, res) => {
    res.json({
      message: "Welcome Admin",
      user: req.user,
    });
  }
);

module.exports = router;
