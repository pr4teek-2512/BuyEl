import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { seedBranches } from "./data/branches";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

function normalizeName(input: string): string {
  return input.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Every page an employee account can be scoped to. */
const ADMIN_PAGES = [
  "dashboard",
  "master_lists",
  "payment_platforms",
  "plans",
  "payments",
  "users",
  "listings",
  "user_access",
];

async function seedBranchList() {
  let created = 0;
  for (const branch of seedBranches) {
    const normalizedName = normalizeName(branch.name);
    const result = await prisma.branch.upsert({
      where: { normalizedName },
      create: { name: branch.name, level: branch.level, normalizedName },
      update: {},
    });
    if (result) created += 1;
  }
  console.log(`Branches in master list: ${created}`);
}

async function seedOwner() {
  const username = process.env.ADMIN_OWNER_USERNAME ?? "prateekchauhan";
  const password = process.env.ADMIN_OWNER_PASSWORD ?? "Prateek@2512";
  const name = process.env.ADMIN_OWNER_NAME ?? "Prateek Chauhan";

  const owner = await prisma.adminUser.upsert({
    where: { username },
    create: {
      username,
      name,
      role: "owner",
      passwordHash: await bcrypt.hash(password, 12),
    },
    update: { role: "owner", isActive: true },
  });

  for (const pageKey of ADMIN_PAGES) {
    await prisma.adminPermission.upsert({
      where: { adminUserId_pageKey: { adminUserId: owner.id, pageKey } },
      create: { adminUserId: owner.id, pageKey, canView: true, canEdit: true },
      update: { canView: true, canEdit: true },
    });
  }

  console.log(`Owner admin ready: ${username}`);
}

async function seedPaymentPlatforms() {
  const platforms = [
    { name: "Google Pay", utrTerm: "UPI transaction ID", appTxnTerm: "Google transaction ID", sortOrder: 1 },
    { name: "PhonePe", utrTerm: "UTR", appTxnTerm: "Transaction ID", sortOrder: 2 },
    { name: "Paytm", utrTerm: "UPI Ref. No.", appTxnTerm: "Order ID", sortOrder: 3 },
    { name: "Others", utrTerm: "UTR number", appTxnTerm: "App transaction ID", sortOrder: 4 },
  ];

  for (const platform of platforms) {
    await prisma.paymentPlatform.upsert({
      where: { name: platform.name },
      create: platform,
      update: {},
    });
  }

  console.log(`Payment platforms ready: ${platforms.length}`);
}

async function main() {
  await seedBranchList();
  await seedOwner();
  await seedPaymentPlatforms();
  console.log(
    "Colleges and courses are intentionally left empty. They grow from user submissions.",
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
