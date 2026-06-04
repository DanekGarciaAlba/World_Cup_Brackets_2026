import "server-only";
import { adminEmails } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/auth/requireUser";

export async function requireAdmin() {
  const user = await requireUser();
  const email = typeof user.email === "string" ? user.email.toLowerCase() : "";
  const allowed = adminEmails();

  if (allowed.includes(email)) {
    return user;
  }

  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const admin = createAdminClient();
    const { data } = await admin.from("profiles").select("role").eq("id", user.id).maybeSingle();
    if (data?.role === "admin") return user;
  }

  throw new Error("Admin access required");
}
