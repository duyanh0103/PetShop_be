const express = require("express");

const authMiddleware = require("../../middlewares/auth.middleware");
const authorize = require("../../middlewares/role.middleware");

const uploadController = require("./upload.controller");

const router = express.Router();

// Same roles that may create or edit products.
router.use(authMiddleware, authorize("SUPER_ADMIN", "ADMIN"));

router.post("/signature", (req, res, next) => uploadController.createSignature(req, res, next));

module.exports = router;
