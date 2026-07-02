const express = require("express");
const authorize = require("../../middlewares/role.middleware");

const authController = require("./auth.controller");
const {
  validateRegister,
  validateLogin,
} = require("./auth.validation");

const router = express.Router();

router.post("/register", validateRegister, (req, res) =>
  authController.register(req, res)
);

router.post("/login", validateLogin, (req, res) =>
  authController.login(req, res)
);
const authMiddleware = require("../../middlewares/auth.middleware");

// router.get("/me", authMiddleware, (req, res) => {
//   res.json({
//     message: "OK",
//     user: req.user,
//   });
// });


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
router.get(
    "/me",
    authMiddleware,
    (req, res) => authController.getCurrentUser(req, res)
);
module.exports = router;