import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import crypto from "crypto";

const HMAC_SECRET = process.env.ADMIN_SECRET || "mebutik-admin-secret-2025-change-in-production";

export function signSession(adminId: string): string {
  const payload = `${adminId}.${Date.now()}`;
  const sig = crypto.createHmac("sha256", HMAC_SECRET).update(payload).digest("hex");
  return `${payload}.${sig}`;
}

export function verifySession(token: string): string | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [adminId, ts, sig] = parts;
  const expected = crypto.createHmac("sha256", HMAC_SECRET).update(`${adminId}.${ts}`).digest("hex");
  if (sig !== expected) return null;
  // Session expires after 7 days
  const age = Date.now() - parseInt(ts);
  if (isNaN(age) || age > 7 * 24 * 60 * 60 * 1000) return null;
  return adminId;
}

export async function requireAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_session")?.value;
  if (!token) return null;

  // Support both new signed tokens and legacy raw IDs
  const adminId = token.includes(".") ? verifySession(token) : token;
  if (!adminId) return null;

  const admin = await prisma.adminUser.findUnique({ where: { id: adminId } });
  return admin;
}
