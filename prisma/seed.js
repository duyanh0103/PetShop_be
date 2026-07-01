const prisma = require("../src/configs/prisma");
const bcrypt = require("bcrypt");

async function main() {
  console.log("Starting seed...");

  const existingSuperAdmin = await prisma.user.findFirst({
    where: {
      role: "SUPER_ADMIN",
    },
  });

  if (existingSuperAdmin) {
    console.log("SUPER_ADMIN already exists, skipping seed.");
    return;
  }

  const hashedPassword = await bcrypt.hash("SuperAdmin@123", 10);

  const superAdmin = await prisma.user.create({
    data: {
      username: "superadmin@petshop.com",
      password: hashedPassword,
      role: "SUPER_ADMIN",
    },
  });

  console.log("SUPER_ADMIN created successfully:");
  console.log({
    id: superAdmin.id,
    username: superAdmin.username,
    role: superAdmin.role,
  });
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
