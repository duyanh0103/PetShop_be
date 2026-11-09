const express = require("express");

const authMiddleware = require("../../middlewares/auth.middleware");
const authorize = require("../../middlewares/role.middleware");

const orderController = require("./order.controller");
const { validateListAdminOrder, validateUpdateOrderStatus } = require("./order.validation");

const router = express.Router();

router.use(authMiddleware, authorize("SUPER_ADMIN", "ADMIN", "STAFF"));

router.get("/", validateListAdminOrder, (req, res, next) =>
  orderController.listAdmin(req, res, next)
);

router.get("/:id", (req, res, next) =>
  orderController.getAdmin(req, res, next)
);

router.patch("/:id/status", validateUpdateOrderStatus, (req, res, next) =>
  orderController.updateStatusAdmin(req, res, next)
);

module.exports = router;
