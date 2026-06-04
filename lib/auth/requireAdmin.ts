import "server-only";
import { adminEmails } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/auth/requireUser";

export async function requireAdmin() {
  const claims = await requireUser();
  const email = typeof claims.email === "string" ? claims.email.toLowerCase() : "";
  const allowed = adminEmails();

  if (allowed.includes(email)) {
    return claims;
  }

  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const admin = createAdminClient();
    const { data } = await admin.from("profiles").select("role").eq("id", claims.sub).maybeSingle();
    if (data?.role === "admin") return claims;
  }

  throw new Error("Admin access required");
}
