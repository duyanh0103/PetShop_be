const express = require("express");

const authRoute = require("../modules/auth/auth.route");
const categoryRoute = require("../modules/category/category.route");
const productRoute = require("../modules/product/product.route");

const router = express.Router();

router.use("/auth", authRoute);
router.use("/categories", categoryRoute);
router.use("/products", productRoute);

module.exports = router;
