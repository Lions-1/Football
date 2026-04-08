import { requireAdmin } from "@/lib/admin-auth";
import { redirect } from "next/navigation";
import AdminDashboard from "@/components/admin/AdminDashboard";

export const dynamic = "force-dynamic";

export default async function BackstagePage() {
  const admin = await requireAdmin();
  if (!admin) {
    redirect("/backstage/login");
  }
  return <AdminDashboard />;
}
