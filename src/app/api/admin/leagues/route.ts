import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import { NextRequest, NextResponse } from "next/server";

function slugify(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export async function POST(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name } = await request.json();
  if (!name) return NextResponse.json({ error: "Name required" }, { status: 400 });

  let slug = slugify(name);
  const existing = await prisma.league.findUnique({ where: { slug } });
  if (existing) slug = `${slug}-${Date.now()}`;

  const league = await prisma.league.create({ data: { name, slug } });
  return NextResponse.json(league, { status: 201 });
}
