const { PrismaClient } = require("@prisma/client");

// Prefer Neon-specific env var if present, otherwise fall back to DATABASE_URL
const runtimeUrl = process.env.DATABASE_URL_NEON || process.env.DATABASE_URL;

const clientOptions = {};
if (runtimeUrl) {
	clientOptions.adapter = { url: runtimeUrl };
}

const prisma = new PrismaClient(clientOptions);

module.exports = prisma;

