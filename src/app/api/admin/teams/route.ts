import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import { NextRequest, NextResponse } from "next/server";

function slugify(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export async function GET() {
  const teams = await prisma.team.findMany({
    include: { league: true },
    orderBy: [{ league: { name: "asc" } }, { name: "asc" }],
  });
  return NextResponse.json(teams);
}

export async function POST(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, leagueId, logo } = await request.json();
  if (!name || !leagueId) {
    return NextResponse.json({ error: "Name and league required" }, { status: 400 });
  }

  let slug = slugify(name);
  const existing = await prisma.team.findUnique({ where: { slug } });
  if (existing) slug = `${slug}-${Date.now()}`;

  const team = await prisma.team.create({
    data: { name, slug, leagueId, logo: logo || null },
    include: { league: true },
  });

  return NextResponse.json(team, { status: 201 });
}
