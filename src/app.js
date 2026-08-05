const express = require("express");
const cors = require("cors");

const routes = require("./routes");
const { notFoundHandler, errorHandler } = require("./middlewares/error.middleware");

const app = express();

// FE (Vite) chạy port khác BE -> cần bật CORS. Danh sách origin đọc từ env,
// tách bởi dấu phẩy; mặc định cho phép các port dev phổ biến của Vite/CRA.
const allowedOrigins = (
  process.env.CORS_ORIGIN || "http://localhost:5173,http://localhost:3001"
)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);

app.use(express.json());

app.use("/api", routes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;