const express = require("express");

const authMiddleware = require("../../middlewares/auth.middleware");
const authorize = require("../../middlewares/role.middleware");

const productController = require("./product.controller");
const {
  validateCreateProduct,
  validateUpdateProduct,
  validateUpdateStatus,
  validateListProduct,
  validateNextSku,
} = require("./product.validation");

const router = express.Router();

const canManageProduct = authorize("SUPER_ADMIN", "ADMIN");

// Read endpoints: any authenticated user (dashboard staff, future storefront) can browse products.
router.get("/", authMiddleware, validateListProduct, (req, res, next) =>
  productController.list(req, res, next)
);

// Declared before "/:id" so "next-sku" is not read as a product id.
router.get("/next-sku", authMiddleware, canManageProduct, validateNextSku, (req, res, next) =>
  productController.nextSku(req, res, next)
);

router.get("/:id", authMiddleware, (req, res, next) =>
  productController.getById(req, res, next)
);

// Write endpoints: restricted to ADMIN / SUPER_ADMIN per role matrix.
router.post(
  "/",
  authMiddleware,
  canManageProduct,
  validateCreateProduct,
  (req, res, next) => productController.create(req, res, next)
);

router.put(
  "/:id",
  authMiddleware,
  canManageProduct,
  validateUpdateProduct,
  (req, res, next) => productController.update(req, res, next)
);

router.patch(
  "/:id/status",
  authMiddleware,
  canManageProduct,
  validateUpdateStatus,
  (req, res, next) => productController.updateStatus(req, res, next)
);

router.delete("/:id", authMiddleware, canManageProduct, (req, res, next) =>
  productController.remove(req, res, next)
);

module.exports = router;
