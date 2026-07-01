const express = require("express");

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

module.exports = router;