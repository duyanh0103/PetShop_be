const express = require("express");

const authMiddleware = require("../../middlewares/auth.middleware");
const authorize = require("../../middlewares/role.middleware");

const categoryController = require("./category.controller");
const {
  validateCreateCategory,
  validateUpdateCategory,
  validateUpdateStatus,
  validateListCategory,
} = require("./category.validation");

const router = express.Router();

const canManageCategory = authorize("SUPER_ADMIN", "ADMIN");

// Read endpoints: any authenticated user (dashboard staff, future storefront) can browse categories.
router.get("/", authMiddleware, validateListCategory, (req, res, next) =>
  categoryController.list(req, res, next)
);

router.get("/:id", authMiddleware, (req, res, next) =>
  categoryController.getById(req, res, next)
);

// Write endpoints: restricted to ADMIN / SUPER_ADMIN per role matrix.
router.post(
  "/",
  authMiddleware,
  canManageCategory,
  validateCreateCategory,
  (req, res, next) => categoryController.create(req, res, next)
);

router.put(
  "/:id",
  authMiddleware,
  canManageCategory,
  validateUpdateCategory,
  (req, res, next) => categoryController.update(req, res, next)
);

router.patch(
  "/:id/status",
  authMiddleware,
  canManageCategory,
  validateUpdateStatus,
  (req, res, next) => categoryController.updateStatus(req, res, next)
);

router.delete("/:id", authMiddleware, canManageCategory, (req, res, next) =>
  categoryController.remove(req, res, next)
);

module.exports = router;
