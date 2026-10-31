require("dotenv").config();

const app = require("./app");

const PORT = process.env.PORT || 3000;

// Express 5 passes listen errors (e.g. EADDRINUSE) to this callback instead of throwing.
app.listen(PORT, (error) => {
    if (error) {
        console.error(
            error.code === "EADDRINUSE"
                ? `Cổng ${PORT} đang được dùng bởi process khác (có thể là một BE đang chạy ở terminal khác).`
                : error
        );
        process.exit(1);
    }

    console.log(`Server running at http://localhost:${PORT}`);
});