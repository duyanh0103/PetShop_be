const express = require("express");

const authMiddleware = require("../../middlewares/auth.middleware");
const authorize = require("../../middlewares/role.middleware");

const customerController = require("./customer.controller");
const { validateListCustomer, validateUpdateCustomerStatus } = require("./customer.validation");

const router = express.Router();

router.use(authMiddleware, authorize("SUPER_ADMIN", "ADMIN"));

router.get("/", validateListCustomer, (req, res, next) =>
  customerController.list(req, res, next)
);

router.get("/:id", (req, res, next) =>
  customerController.getById(req, res, next)
);

router.patch("/:id/status", validateUpdateCustomerStatus, (req, res, next) =>
  customerController.updateStatus(req, res, next)
);

module.exports = router;
