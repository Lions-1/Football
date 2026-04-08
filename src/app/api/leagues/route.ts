import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const leagues = await prisma.league.findMany({
    orderBy: { order: "asc" },
    include: {
      teams: {
        orderBy: { name: "asc" },
        select: { id: true, name: true, slug: true },
      },
    },
  });
  return NextResponse.json(leagues);
}
