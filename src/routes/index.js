const express = require("express");

const authRoute = require("../modules/auth/auth.route");
const categoryRoute = require("../modules/category/category.route");
const productRoute = require("../modules/product/product.route");
const publicRoute = require("../modules/public/public.route");

const router = express.Router();

// Liveness probe for the hosting platform (Render healthCheckPath).
router.get("/health", (req, res) => res.status(200).json({ status: "ok" }));

router.use("/public", publicRoute);
router.use("/auth", authRoute);
router.use("/categories", categoryRoute);
router.use("/products", productRoute);

module.exports = router;
