require("dotenv").config();

const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");

// Opening a connection to Neon (TLS + auth) costs about 2s, far more than a
// query. pg closes idle connections after 10s by default, so a user who paused
// briefly paid that cost again on every click; keep them open much longer.
// Dropped connections (e.g. Neon suspending) are handled by the adapter.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  idleTimeoutMillis: 5 * 60 * 1000,
  keepAlive: true,
});

const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({
  adapter,
});

module.exports = prisma;
