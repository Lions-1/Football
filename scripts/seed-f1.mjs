/**
 * Seeds F1 team products with real 2025-season car photos from Wikimedia Commons
 * plus official team logos. Creates 2 products per team (Team T-Shirt + Team Cap)
 * so every F1 team card on the homepage has actual imagery.
 */

import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

// slug → { name, carImage, logoImage }
const F1_DATA = {
  "red-bull-racing": {
    name: "Red Bull Racing",
    car: "https://upload.wikimedia.org/wikipedia/commons/3/3f/2025_Japan_GP_-_Red_Bull_-_Max_Verstappen_-_FP1.jpg",
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a4/Red_Bull_Racing_-_2021_Logo.svg/500px-Red_Bull_Racing_-_2021_Logo.svg.png",
  },
  "ferrari": {
    name: "Scuderia Ferrari",
    car: "https://upload.wikimedia.org/wikipedia/commons/b/b8/2025_Japan_GP_-_Ferrari_-_Lewis_Hamilton_-_FP1.jpg",
    logo: "https://upload.wikimedia.org/wikipedia/en/thumb/d/df/Scuderia_Ferrari_HP_logo_24.svg/500px-Scuderia_Ferrari_HP_logo_24.svg.png",
  },
  "mercedes-amg-f1": {
    name: "Mercedes-AMG Petronas",
    car: "https://upload.wikimedia.org/wikipedia/commons/f/f3/2025_Singapore_GP_-_Mercedes_-_George_Russell_-_FP1.jpg",
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/f/fb/Mercedes_AMG_Petronas_F1_Logo.svg/500px-Mercedes_AMG_Petronas_F1_Logo.svg.png",
  },
  "mclaren-f1": {
    name: "McLaren Racing",
    car: "https://upload.wikimedia.org/wikipedia/commons/6/64/2025_Japan_GP_-_McLaren_-_Lando_Norris_-_FP1.jpg",
    logo: "https://upload.wikimedia.org/wikipedia/en/thumb/e/e5/McLaren_F1_logo.svg/500px-McLaren_F1_logo.svg.png",
  },
  "alpine-f1": {
    name: "BWT Alpine F1",
    car: "https://upload.wikimedia.org/wikipedia/commons/a/ae/FIA_F1_Austria_2025_Nr._10_Gasly.jpg",
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7e/Alpine_F1_Team_Logo.svg/500px-Alpine_F1_Team_Logo.svg.png",
  },
  "aston-martin-f1": {
    name: "Aston Martin Aramco",
    car: "https://upload.wikimedia.org/wikipedia/commons/3/33/2025_Japan_GP_-_Aston_Martin_-_Fernando_Alonso_-_FP1.jpg",
    logo: "https://upload.wikimedia.org/wikipedia/en/thumb/1/15/Aston_Martin_Aramco_2024_logo.png/500px-Aston_Martin_Aramco_2024_logo.png",
  },
  "williams-f1": {
    name: "Williams Racing",
    car: "https://upload.wikimedia.org/wikipedia/commons/2/2e/2025_Japan_GP_-_Williams_-_Carlos_Sainz_-_FP1.jpg",
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/12/Atlassian_Williams_F1_Team_logo.svg/500px-Atlassian_Williams_F1_Team_logo.svg.png",
  },
  "rb-f1": {
    name: "Visa Cash App Racing Bulls",
    car: "https://upload.wikimedia.org/wikipedia/commons/8/86/2025_ImolaGP_Yuki_Tsunoda.jpg",
    logo: "https://upload.wikimedia.org/wikipedia/en/thumb/2/2b/VCARB_F1_logo.svg/500px-VCARB_F1_logo.svg.png",
  },
  "kick-sauber": {
    name: "Stake F1 Team Kick Sauber",
    car: "https://upload.wikimedia.org/wikipedia/commons/c/c2/2025_Japan_GP_-_Sauber_-_Gabriel_Bortoleto_-_FP2.jpg",
    logo: "https://upload.wikimedia.org/wikipedia/commons/9/94/Logo_sauber_2023.jpg",
  },
  "haas-f1": {
    name: "MoneyGram Haas F1",
    car: "https://upload.wikimedia.org/wikipedia/commons/f/f8/FIA_F1_Austria_2025_Nr._87_Bearman.jpg",
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/18/TGR_Haas_F1_Team_Logo_%282026%29.svg/500px-TGR_Haas_F1_Team_Logo_%282026%29.svg.png",
  },
};

const SKUS = [
  { suffix: "team-polo-2025",    title: "Team Polo Shirt 2025",      price: 249, category: "jersey" },
  { suffix: "team-cap-2025",     title: "Team Cap 2025",             price: 149, category: "jersey" },
  { suffix: "team-hoodie-2025",  title: "Team Hoodie 2025",          price: 349, category: "tracksuit" },
];

function slugify(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

async function main() {
  console.log("Seeding F1 products from Wikipedia imagery…\n");

  // Ensure F1 league exists
  let f1League = await prisma.league.findUnique({ where: { slug: "f1" } });
  if (!f1League) {
    f1League = await prisma.league.create({
      data: { name: "F1 2025", slug: "f1", order: 99 },
    });
    console.log("  Created F1 league");
  }

  let created = 0, updated = 0;

  for (const [teamSlug, team] of Object.entries(F1_DATA)) {
    // Ensure team exists
    let dbTeam = await prisma.team.findUnique({ where: { slug: teamSlug } });
    if (!dbTeam) {
      dbTeam = await prisma.team.create({
        data: {
          name: team.name,
          slug: teamSlug,
          logo: team.logo,
          leagueId: f1League.id,
        },
      });
      console.log(`  + team ${teamSlug}`);
    } else if (!dbTeam.logo) {
      await prisma.team.update({ where: { id: dbTeam.id }, data: { logo: team.logo } });
    }

    for (const sku of SKUS) {
      const name = `${team.name} ${sku.title}`;
      const slug = slugify(`${teamSlug}-${sku.suffix}`);
      const images = JSON.stringify([team.car, team.logo]);
      const sizes = JSON.stringify(sku.suffix.includes("cap") ? ["One Size"] : ["S", "M", "L", "XL", "XXL"]);

      const existing = await prisma.product.findUnique({ where: { slug } });
      if (existing) {
        await prisma.product.update({
          where: { id: existing.id },
          data: { images, sizes, price: sku.price },
        });
        updated++;
      } else {
        await prisma.product.create({
          data: {
            name,
            slug,
            price: sku.price,
            images,
            sizes,
            teamId: dbTeam.id,
            category: sku.category,
            season: "2025",
            surCommande: true,
            featured: sku.suffix === "team-polo-2025",
            bestSeller: sku.suffix === "team-polo-2025" && ["red-bull-racing", "ferrari", "mclaren-f1"].includes(teamSlug),
          },
        });
        created++;
      }
    }
    console.log(`  ✓ ${team.name}`);
  }

  console.log(`\nDone! Created: ${created}, Updated: ${updated}`);
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
