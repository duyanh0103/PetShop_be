const express = require("express");

const authRoute = require("./modules/auth/auth.route");

const app = express();

app.use(express.json());

app.use("/api/auth", authRoute);

module.exports = app;