import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { ProfileSetupForm } from "@/components/profile/ProfileSetupForm";
import { getTeamsForProfile } from "@/lib/data/worldCupData";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function ProfileSetupPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login?message=Please%20sign%20in%20first");

  const [{ data: profile }, { data: avatar }, teams] = await Promise.all([
    supabase.from("profiles").select("display_name, department, favorite_country, favorite_team_id").eq("id", data.user.id).maybeSingle(),
    supabase.from("user_avatars").select("*").eq("user_id", data.user.id).maybeSingle(),
    getTeamsForProfile(),
  ]);

  return (
    <div>
      <PageHeader
        eyebrow="Profile"
        title="Build your matchday identity."
        description="Choose a display name, office team, favorite country, and avatar kit for leaderboards and rival leagues."
        badge="Supabase Auth"
      />
      <ProfileSetupForm profile={profile} avatar={avatar} teams={teams} email={data.user.email ?? ""} />
    </div>
  );
}
