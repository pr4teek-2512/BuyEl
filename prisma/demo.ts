import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

/**
 * Demo and load data.
 *
 *   npm run db:demo            adds roughly 5,000 listings across 40 colleges
 *   npm run db:demo -- --clean removes everything this script created
 *
 * Every row it writes is tagged, so the clean up cannot touch real data.
 * Nothing here sends an SMS or spends a credit.
 */

const TAG = "demo-";
const COLLEGE_COUNT = 40;
const LISTINGS_PER_COLLEGE = 125;

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const COLLEGE_NAMES = [
  "Indian Institute of Technology Delhi",
  "Indian Institute of Technology Bombay",
  "Indian Institute of Technology Madras",
  "Indian Institute of Technology Kanpur",
  "Indian Institute of Technology Kharagpur",
  "National Institute of Technology Trichy",
  "National Institute of Technology Surathkal",
  "Birla Institute of Technology and Science Pilani",
  "Vellore Institute of Technology",
  "Manipal Institute of Technology",
  "Netaji Subhas University of Technology",
  "Indraprastha Institute of Information Technology Delhi",
  "Jadavpur University",
  "Anna University",
  "Savitribai Phule Pune University",
  "University of Mumbai",
  "University of Calcutta",
  "Banaras Hindu University",
  "Aligarh Muslim University",
  "Jamia Millia Islamia",
];

const COURSE_NAMES = [
  "Data Structures CS201",
  "Algorithms CS301",
  "Operating Systems CS302",
  "Database Management CS303",
  "Computer Networks CS304",
  "Machine Learning CS401",
  "Thermodynamics ME204",
  "Fluid Mechanics ME205",
  "Structural Analysis CE301",
  "Microprocessors EC305",
  "Signals and Systems EC202",
  "Engineering Mathematics MA101",
  "Discrete Mathematics MA201",
  "Organic Chemistry CH203",
  "Financial Accounting CM101",
];

function normalize(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function abbreviate(name: string) {
  return name
    .split(/\s+/)
    .filter((word) => !["of", "and", "the"].includes(word.toLowerCase()))
    .map((word) => word[0])
    .join("")
    .slice(0, 6)
    .toUpperCase();
}

async function clean() {
  // Demo sellers are the only users named exactly "Demo".
  const sellers = await prisma.user.findMany({
    where: { name: "Demo", isTestAccount: true },
    select: { id: true },
  });

  const sellerIds = sellers.map((seller) => seller.id);

  const listings = await prisma.listing.deleteMany({
    where: { OR: [{ id: { startsWith: TAG } }, { sellerId: { in: sellerIds } }] },
  });
  const users = await prisma.user.deleteMany({ where: { id: { in: sellerIds } } });
  const courses = await prisma.course.deleteMany({ where: { id: { startsWith: TAG } } });
  const colleges = await prisma.college.deleteMany({ where: { id: { startsWith: TAG } } });

  console.log(
    `Removed ${listings.count} listings, ${users.count} demo sellers, ${courses.count} courses, ${colleges.count} colleges.`,
  );
}

async function seed() {
  const now = Date.now();

  console.log("Creating colleges and courses...");

  const colleges = [];
  for (let index = 0; index < COLLEGE_COUNT; index += 1) {
    const base = COLLEGE_NAMES[index % COLLEGE_NAMES.length];
    const name = index < COLLEGE_NAMES.length ? base : `${base} Campus ${index}`;

    colleges.push(
      await prisma.college.upsert({
        where: { normalizedName: normalize(name) },
        create: {
          id: `${TAG}college-${index}`,
          name,
          abbreviation: abbreviate(name),
          normalizedName: normalize(name),
        },
        update: {},
      }),
    );
  }

  const courses = [];
  for (const [index, name] of COURSE_NAMES.entries()) {
    const existing = await prisma.course.findFirst({ where: { normalizedName: normalize(name) } });
    courses.push(
      existing ??
        (await prisma.course.create({
          data: { id: `${TAG}course-${index}`, name, normalizedName: normalize(name) },
        })),
    );
  }

  console.log("Creating demo sellers...");

  const sellers = [];
  for (let index = 0; index < 50; index += 1) {
    const phone = `+910000${String(100000 + index)}`;
    const college = colleges[index % colleges.length];

    sellers.push(
      await prisma.user.upsert({
        where: { phone },
        create: {
          phone,
          name: "Demo",
          lastName: `Seller ${index}`,
          graduationYear: 2027,
          collegeId: college.id,
          collegeText: college.name,
          branchText: "Computer Science and Engineering",
          isTestAccount: true,
        },
        update: {},
      }),
    );
  }

  console.log(`Creating ${COLLEGE_COUNT * LISTINGS_PER_COLLEGE} listings...`);

  let created = 0;
  for (const [collegeIndex, college] of colleges.entries()) {
    const rows = [];

    for (let index = 0; index < LISTINGS_PER_COLLEGE; index += 1) {
      const course = courses[(collegeIndex + index) % courses.length];
      const seller = sellers[(collegeIndex * 7 + index) % sellers.length];
      const ageMinutes = (collegeIndex * LISTINGS_PER_COLLEGE + index) * 7;

      // Roughly one listing in twelve is boosted, which mirrors a busy feed.
      const boosted = index % 12 === 0;

      rows.push({
        id: `${TAG}listing-${collegeIndex}-${index}`,
        sellerId: seller.id,
        courseId: course.id,
        courseText: course.name,
        collegeId: college.id,
        collegeText: college.name,
        price: 199 + (index % 12) * 50,
        status: index % 17 === 0 ? ("closed" as const) : ("active" as const),
        isBoosted: boosted,
        boostExpiresAt: boosted ? new Date(now + 7 * 24 * 60 * 60 * 1000) : null,
        boostOrderKey: boosted ? new Date(now - index * 60_000) : null,
        normalOrderKey: new Date(now - ageMinutes * 60_000),
        distinctBuyerChatCount: index % 5,
      });
    }

    const result = await prisma.listing.createMany({ data: rows, skipDuplicates: true });
    created += result.count;
  }

  console.log(`Done. ${created} listings created.`);
}

async function main() {
  if (process.argv.includes("--clean")) {
    await clean();
    return;
  }

  await seed();
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
