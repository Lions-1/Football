import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import bcryptjs from "bcryptjs";
import { signSession } from "@/lib/admin-auth";

export async function POST(request: NextRequest) {
  const { username, password } = await request.json();

  if (!username || !password) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const admin = await prisma.adminUser.findUnique({ where: { username } });
  if (!admin) {
    // Constant-time response to prevent user enumeration
    await bcryptjs.hash("dummy", 10);
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const valid = await bcryptjs.compare(password, admin.password);
  if (!valid) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const token = signSession(admin.id);

  const response = NextResponse.json({ success: true, username: admin.username });
  response.cookies.set("admin_session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });

  return response;
}
