const express = require("express");

const publicController = require("./public.controller");
const { validateListPublicProduct } = require("./public.validation");

const router = express.Router();

// Storefront catalog: no authentication, only active records are exposed.
router.get("/categories", (req, res, next) =>
  publicController.listCategories(req, res, next)
);

router.get("/products", validateListPublicProduct, (req, res, next) =>
  publicController.listProducts(req, res, next)
);

router.get("/products/:id", (req, res, next) =>
  publicController.getProductById(req, res, next)
);

module.exports = router;
