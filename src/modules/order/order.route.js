const express = require("express");

const authMiddleware = require("../../middlewares/auth.middleware");
const authorize = require("../../middlewares/role.middleware");

const orderController = require("./order.controller");
const { validateQuote, validateCreateOrder, validateListOrder } = require("./order.validation");

const router = express.Router();

const customerOnly = [authMiddleware, authorize("CUSTOMER")];

// Public: the cart works before login, and only exposes what the catalog already shows.
router.post("/quote", validateQuote, (req, res, next) =>
  orderController.quote(req, res, next)
);

router.post("/", customerOnly, validateCreateOrder, (req, res, next) =>
  orderController.create(req, res, next)
);

router.get("/me", customerOnly, validateListOrder, (req, res, next) =>
  orderController.listMine(req, res, next)
);

router.get("/me/:id", customerOnly, (req, res, next) =>
  orderController.getMine(req, res, next)
);

router.patch("/me/:id/cancel", customerOnly, (req, res, next) =>
  orderController.cancelMine(req, res, next)
);

module.exports = router;
