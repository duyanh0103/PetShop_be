const express = require("express");

const authMiddleware = require("../../middlewares/auth.middleware");
const authorize = require("../../middlewares/role.middleware");

const dashboardController = require("./dashboard.controller");

const router = express.Router();

router.use(authMiddleware, authorize("SUPER_ADMIN", "ADMIN", "STAFF"));

router.get("/summary", (req, res, next) =>
  dashboardController.getSummary(req, res, next)
);

module.exports = router;
