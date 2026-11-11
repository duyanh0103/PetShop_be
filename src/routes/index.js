const express = require("express");

const authRoute = require("../modules/auth/auth.route");
const categoryRoute = require("../modules/category/category.route");
const productRoute = require("../modules/product/product.route");
const publicRoute = require("../modules/public/public.route");
const orderRoute = require("../modules/order/order.route");
const adminOrderRoute = require("../modules/order/order.admin.route");
const customerRoute = require("../modules/customer/customer.route");
const dashboardRoute = require("../modules/dashboard/dashboard.route");
const uploadRoute = require("../modules/upload/upload.route");

const router = express.Router();

// Liveness probe for the hosting platform (Render healthCheckPath).
router.get("/health", (req, res) => res.status(200).json({ status: "ok" }));

router.use("/public", publicRoute);
router.use("/auth", authRoute);
router.use("/categories", categoryRoute);
router.use("/products", productRoute);
router.use("/orders", orderRoute);
router.use("/admin/orders", adminOrderRoute);
router.use("/admin/customers", customerRoute);
router.use("/admin/dashboard", dashboardRoute);
router.use("/admin/uploads", uploadRoute);

module.exports = router;
