const prisma = require("../src/configs/prisma");
const bcrypt = require("bcrypt");
const { slugify } = require("../src/utils/slug.util");

const CATEGORIES = [
  {
    name: "Thức ăn cho chó",
    description: "Thức ăn khô, ướt, snack dành cho chó mọi lứa tuổi",
    products: [
      { sku: "DOG-FOOD-001", name: "Hạt khô Royal Canin 3kg", price: 350000, quantity: 40 },
      { sku: "DOG-FOOD-002", name: "Pate chó Pedigree gói 100g", price: 25000, quantity: 120 },
    ],
  },
  {
    name: "Thức ăn cho mèo",
    description: "Thức ăn khô, ướt, snack dành cho mèo mọi lứa tuổi",
    products: [
      { sku: "CAT-FOOD-001", name: "Hạt khô Whiskas 3kg", price: 320000, quantity: 35 },
      { sku: "CAT-FOOD-002", name: "Pate mèo Me-O gói 80g", price: 18000, quantity: 150 },
    ],
  },
  {
    name: "Đồ chơi thú cưng",
    description: "Đồ chơi vận động, gặm nhấm cho chó mèo",
    products: [
      { sku: "TOY-001", name: "Bóng cao su gai chống mòn", price: 45000, quantity: 60 },
      { sku: "TOY-002", name: "Chuột nhồi bông cho mèo", price: 30000, quantity: 80 },
    ],
  },
  {
    name: "Phụ kiện",
    description: "Vòng cổ, dây dắt, bát ăn, chuồng, nệm nằm",
    products: [
      { sku: "ACC-001", name: "Dây dắt chó phản quang 1.2m", price: 65000, quantity: 50 },
      { sku: "ACC-002", name: "Bát ăn inox chống trượt", price: 40000, quantity: 70 },
    ],
  },
];

async function seedSuperAdmin() {
  const existingSuperAdmin = await prisma.user.findFirst({
    where: { role: "SUPER_ADMIN" },
  });

  if (existingSuperAdmin) {
    console.log("SUPER_ADMIN already exists, skipping.");
    return;
  }

  const username = process.env.SEED_SUPER_ADMIN_USERNAME || "superadmin@petshop.com";
  const password = process.env.SEED_SUPER_ADMIN_PASSWORD || "SuperAdmin@123";

  if (!process.env.SEED_SUPER_ADMIN_PASSWORD) {
    if (process.argv.includes("--admin-only")) {
      throw new Error("SEED_SUPER_ADMIN_PASSWORD is required with --admin-only (production seed).");
    }
    console.warn("SEED_SUPER_ADMIN_PASSWORD is not set, using the default dev password.");
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const superAdmin = await prisma.user.create({
    data: {
      username,
      password: hashedPassword,
      role: "SUPER_ADMIN",
    },
  });

  console.log("SUPER_ADMIN created:", {
    id: superAdmin.id,
    username: superAdmin.username,
    role: superAdmin.role,
  });
}

async function seedCatalog() {
  for (const [index, categoryData] of CATEGORIES.entries()) {
    const slug = slugify(categoryData.name);

    const category = await prisma.category.upsert({
      where: { slug },
      update: {},
      create: {
        name: categoryData.name,
        slug,
        description: categoryData.description,
        isActive: true,
        sortOrder: index,
      },
    });

    console.log(`Category ready: ${category.name} (${category.slug})`);

    for (const productData of categoryData.products) {
      const product = await prisma.product.upsert({
        where: { sku: productData.sku },
        update: {},
        create: {
          name: productData.name,
          sku: productData.sku,
          price: productData.price,
          quantity: productData.quantity,
          categoryId: category.id,
        },
      });

      console.log(`  Product ready: ${product.name} (${product.sku})`);
    }
  }
}

async function main() {
  console.log("Starting seed...");

  await seedSuperAdmin();

  // Production only needs the SUPER_ADMIN account, never the sample catalog.
  if (process.argv.includes("--admin-only")) {
    console.log("--admin-only: skipping sample catalog.");
  } else {
    await seedCatalog();
  }

  console.log("Seed finished.");
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
