import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import bcryptjs from "bcryptjs";
import { LEAGUES_DATA } from "@/lib/leagues-data";

const Y = (h: string) => `/api/img/wanfing/${h}/small.jpg`;

// All confirmed-working Yupoo jersey image hashes (diverse colors/styles)
const ALL_HASHES = [
  "67a1957f", // yellow (Brazil home)
  "a46d30a2", // blue (Italy home)
  "8df753c0", // dark blue (France home)
  "c2ba397f", // white (Germany home)
  "dacc1be8", // red/black (Flamengo)
  "de05f436", // green (Palmeiras home)
  "e9e290e9", // striped (Fluminense)
  "a575e810", // black (Atletico Mineiro)
  "e746a033", // dark navy (Brazil away)
  "ce988c93", // light (Italy away)
  "fd4f5a25", // alt blue (France away)
  "d49b60e8", // red (Flamengo alt)
  "183fe237", // dark green (Palmeiras away)
  "0bcbd5a1", // white/grey (Fluminense away)
  "50aa6463", // tricolor (Sao Paulo)
  "5efd5c41", // black/white (Vasco)
  "1c579b18", // royal blue (Cruzeiro)
  "8ba6a8be", // light blue (Cruzeiro alt)
  "5a808938", // grey (Atletico alt)
];

// FNV-1a 32-bit hash — deterministic and well-distributed
function fnv32(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h;
}

// Each product slug gets its own unique pair — no two identical slugs → same image
function pickImages(productSlug: string): [string, string] {
  const n = ALL_HASHES.length;
  const i1 = fnv32(productSlug) % n;
  const i2 = fnv32(productSlug + "|2") % n;
  const safe2 = i2 === i1 ? (i1 + 1) % n : i2;
  return [Y(ALL_HASHES[i1]), Y(ALL_HASHES[safe2])];
}

export async function POST() {
  try {
    // Create admin user if not exists
    const existingAdmin = await prisma.adminUser.findUnique({ where: { username: "admin" } });
    if (!existingAdmin) {
      const hashedPassword = await bcryptjs.hash("admin123", 10);
      await prisma.adminUser.create({
        data: { username: "admin", password: hashedPassword },
      });
    }

    // Create leagues and teams
    for (let i = 0; i < LEAGUES_DATA.length; i++) {
      const leagueData = LEAGUES_DATA[i];
      const slug = leagueData.slug;

      let league = await prisma.league.findUnique({ where: { slug } });
      if (!league) {
        league = await prisma.league.create({
          data: { name: leagueData.name, slug, order: i },
        });
      } else if (league.name !== leagueData.name) {
        league = await prisma.league.update({
          where: { slug },
          data: { name: leagueData.name },
        });
      }

      for (const teamName of leagueData.teams) {
        const teamSlug = teamName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
        const existingTeam = await prisma.team.findUnique({ where: { slug: teamSlug } });
        if (!existingTeam) {
          await prisma.team.create({
            data: { name: teamName, slug: teamSlug, leagueId: league.id },
          });
        }
      }
    }

    // Create products for ALL teams
    const teams = await prisma.team.findMany({ include: { league: true } });

    const kitVariants: { suffix: string; price: number; category: string; season: string | null }[] = [
      { suffix: "2026 Home Kit Player Version", price: 280, category: "jersey", season: "2025/26" },
      { suffix: "2026 Away Kit Player Version", price: 280, category: "jersey", season: "2025/26" },
      { suffix: "2026 Third Kit Player Version", price: 280, category: "jersey", season: "2025/26" },
      { suffix: "2026 Home Kit Fan Version", price: 220, category: "jersey", season: "2025/26" },
      { suffix: "2025/26 Full Zip Track Suit", price: 350, category: "tracksuit", season: "2025/26" },
      { suffix: "2025/26 Training Kit", price: 250, category: "training", season: "2025/26" },
    ];
    const retroVariants: { suffix: string; price: number; category: string; season: string | null }[] = [
      { suffix: "Retro Kit Long Sleeves", price: 330, category: "retro", season: null },
      { suffix: "Vintage Home Kit", price: 300, category: "retro", season: null },
    ];

    // For national teams, use "X Adidas/Nike" naming style like reference site
    const nationalLeague = teams.filter(t => t.league.slug === "national-teams");
    const clubTeams = teams.filter(t => t.league.slug !== "national-teams");

    let created = 0;

    // National teams: 3-4 products each
    for (const team of nationalLeague) {
      const brands = ["Adidas", "Nike", "Puma"];
      const brand = brands[Math.floor(Math.random() * brands.length)];
      const variants: { name: string; price: number; category: string; season: string }[] = [
        { name: `${team.name} X ${brand} 2025/26 Home Kit Player Version`, price: 280, category: "jersey", season: "2025/26" },
        { name: `${team.name} X ${brand} 2025/26 Away Kit Player Version`, price: 280, category: "jersey", season: "2025/26" },
        { name: `${team.name} X ${brand} 2025/26 Third Kit Player Version`, price: 300, category: "jersey", season: "2025/26" },
      ];
      if (Math.random() > 0.5) {
        variants.push({ name: `${team.name} X ${brand} 2026 Training Kit`, price: 250, category: "training", season: "2025/26" });
      }

      for (const v of variants) {
        const slug = v.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
        const exists = await prisma.product.findUnique({ where: { slug } });
        if (!exists) {
          await prisma.product.create({
            data: {
              name: v.name, slug, price: v.price,
              images: JSON.stringify(pickImages(slug)),
              sizes: JSON.stringify(["S", "M", "L", "XL", "XXL"]),
              teamId: team.id, category: v.category, season: v.season,
              surCommande: Math.random() > 0.7,
              featured: Math.random() > 0.85,
              bestSeller: Math.random() > 0.9,
            },
          });
          created++;
        }
      }
    }

    // Club teams: 2-5 products each
    for (const team of clubTeams) {
      const numProducts = Math.floor(Math.random() * 4) + 2;
      const allVariants = [...kitVariants];
      if (Math.random() > 0.6) allVariants.push(retroVariants[Math.floor(Math.random() * retroVariants.length)]);
      const selected = allVariants.slice(0, numProducts);

      for (const variant of selected) {
        const name = `${team.name} ${variant.suffix}`;
        const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
        const exists = await prisma.product.findUnique({ where: { slug } });
        if (!exists) {
          await prisma.product.create({
            data: {
              name, slug,
              price: variant.price + Math.floor(Math.random() * 30),
              images: JSON.stringify(pickImages(slug)),
              sizes: JSON.stringify(["S", "M", "L", "XL", "XXL"]),
              teamId: team.id, category: variant.category,
              season: variant.season,
              surCommande: Math.random() > 0.75,
              featured: Math.random() > 0.85,
              bestSeller: Math.random() > 0.9,
            },
          });
          created++;
        }
      }
    }

    // Assign correct images + featured/bestSeller flags for ALL products
    const allProducts = await prisma.product.findMany({
      select: { id: true, slug: true, team: { select: { slug: true, league: { select: { slug: true } } } } },
    });
    let patched = 0;
    for (const p of allProducts) {
      const h = fnv32(p.slug);
      const isNational = p.team.league.slug === "national-teams";
      // National teams → correct crest; clubs → empty so placeholder shows (no wrong jersey)
      const images = isNational
        ? [`/logos/national-teams/${p.team.slug}.png`]
        : [];
      await prisma.product.update({
        where: { id: p.id },
        data: {
          images: JSON.stringify(images),
          featured: h % 5 === 0,      // ~20% featured
          bestSeller: h % 7 === 0,    // ~14% best sellers
        },
      });
      patched++;
    }

    // Mark ALL products as Sur Commande
    await prisma.product.updateMany({
      data: { surCommande: true },
    });

    const stats = {
      leagues: await prisma.league.count(),
      teams: await prisma.team.count(),
      products: await prisma.product.count(),
      newProducts: created,
      patched,
    };

    return NextResponse.json({ success: true, ...stats });
  } catch (error) {
    console.error("Seed error:", error);
    return NextResponse.json({ error: "Seed failed" }, { status: 500 });
  }
}
