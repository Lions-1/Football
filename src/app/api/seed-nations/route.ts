import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { LEAGUES_DATA } from "@/lib/leagues-data";

export async function DELETE() {
  const league = await prisma.league.findUnique({ where: { slug: "national-teams" } });
  if (!league) return NextResponse.json({ deleted: 0 });
  const teams = await prisma.team.findMany({ where: { leagueId: league.id }, select: { id: true } });
  const teamIds = teams.map((t) => t.id);
  const { count } = await prisma.product.deleteMany({ where: { teamId: { in: teamIds } } });
  return NextResponse.json({ success: true, deleted: count });
}

export async function POST() {
  const ntData = LEAGUES_DATA.find((l) => l.slug === "national-teams");
  if (!ntData) return NextResponse.json({ error: "No national-teams league in data" }, { status: 500 });

  let league = await prisma.league.findUnique({ where: { slug: "national-teams" } });
  if (!league) {
    league = await prisma.league.create({ data: { name: ntData.name, slug: "national-teams", order: 99 } });
  }

  const existing = await prisma.team.findMany({ where: { leagueId: league.id }, select: { slug: true } });
  const existingSlugs = new Set(existing.map((t) => t.slug));

  const toCreate = ntData.teams
    .map((name) => ({
      name,
      slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
      leagueId: league!.id,
    }))
    .filter((t) => !existingSlugs.has(t.slug));

  if (toCreate.length > 0) {
    await prisma.team.createMany({ data: toCreate, skipDuplicates: true });
  }

  return NextResponse.json({ success: true, created: toCreate.length, total: existing.length + toCreate.length });
}
