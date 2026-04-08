import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");
  const teamSlug = searchParams.get("team");
  const leagueSlug = searchParams.get("league");
  const surCommande = searchParams.get("surCommande");
  const featured = searchParams.get("featured");
  const bestSeller = searchParams.get("bestSeller");
  const search = searchParams.get("q");
  const limit = parseInt(searchParams.get("limit") || "50");
  const page = parseInt(searchParams.get("page") || "1");

  const where: Record<string, unknown> = {};

  if (category) where.category = category;
  if (surCommande === "true") where.surCommande = true;
  if (featured === "true") where.featured = true;
  if (bestSeller === "true") where.bestSeller = true;
  if (teamSlug) where.team = { slug: teamSlug };
  if (leagueSlug) where.team = { league: { slug: leagueSlug } };
  if (search) {
    where.OR = [
      { name: { contains: search } },
      { team: { name: { contains: search } } },
      { team: { league: { name: { contains: search } } } },
    ];
  }

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: { team: { include: { league: true } } },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: (page - 1) * limit,
    }),
    prisma.product.count({ where }),
  ]);

  return NextResponse.json({ products, total, page, totalPages: Math.ceil(total / limit) });
}
