// Changes the SUPER_ADMIN login email and password.
//
//   ADMIN_EMAIL=new@mail.com ADMIN_PASSWORD='...' npm run admin:update
//   ... npm run admin:update -- --dry-run   (validate + show the target, write nothing)
//
// The new email becomes both `email` and `username`, so either works at login.
// If there are several SUPER_ADMIN accounts, set ADMIN_CURRENT to the
// username/email of the one to change.
const bcrypt = require("bcrypt");
const { z } = require("zod");

const prisma = require("../src/configs/prisma");

const inputSchema = z.object({
  email: z
    .string({ error: "ADMIN_EMAIL is required" })
    .trim()
    .toLowerCase()
    .pipe(z.email("ADMIN_EMAIL is not a valid email")),
  password: z
    .string({ error: "ADMIN_PASSWORD is required" })
    .min(12, "ADMIN_PASSWORD must be at least 12 characters")
    .max(100, "ADMIN_PASSWORD must be at most 100 characters")
    .refine((value) => /[a-z]/.test(value) && /[A-Z]/.test(value) && /\d/.test(value), {
      message: "ADMIN_PASSWORD must contain lowercase, uppercase and a digit",
    }),
});

async function findTarget(current) {
  if (current) {
    const user = await prisma.user.findFirst({
      where: { OR: [{ username: current }, { email: current.toLowerCase() }] },
    });
    if (!user || user.role !== "SUPER_ADMIN") {
      throw new Error(`No SUPER_ADMIN matches ADMIN_CURRENT="${current}".`);
    }
    return user;
  }

  const admins = await prisma.user.findMany({ where: { role: "SUPER_ADMIN" } });
  if (admins.length === 0) throw new Error("No SUPER_ADMIN exists. Run `npm run seed:admin` first.");
  if (admins.length > 1) {
    throw new Error(
      `Found ${admins.length} SUPER_ADMIN accounts (${admins.map((a) => a.username).join(", ")}). Set ADMIN_CURRENT.`
    );
  }
  return admins[0];
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");

  const parsed = inputSchema.safeParse({
    email: process.env.ADMIN_EMAIL,
    password: process.env.ADMIN_PASSWORD,
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((issue) => issue.message).join("; "));
  }
  const { email, password } = parsed.data;

  const target = await findTarget(process.env.ADMIN_CURRENT);

  const conflict = await prisma.user.findFirst({
    where: { id: { not: target.id }, OR: [{ username: email }, { email }] },
  });
  if (conflict) throw new Error(`"${email}" is already used by another account.`);

  console.log(`Target: ${target.username} (id ${target.id}) -> ${email}`);

  if (dryRun) {
    console.log("--dry-run: nothing written.");
    return;
  }

  await prisma.user.update({
    where: { id: target.id },
    data: {
      username: email,
      email,
      password: await bcrypt.hash(password, 10),
    },
  });

  console.log("SUPER_ADMIN updated. Log in with the new email and password.");
}

main()
  .catch((error) => {
    console.error("Update failed:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
