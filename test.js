const prisma = require("./src/configs/prisma");

async function main() {
    await prisma.$connect();

    console.log("Database connected!");

    await prisma.$disconnect();
}

main();