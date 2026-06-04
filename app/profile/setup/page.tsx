import { redirect } from "next/navigation";
import { AvatarBuilder } from "@/components/avatar/AvatarBuilder";
import { defaultAvatarConfig } from "@/components/avatar/avatar-options";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/server";
import { saveProfile } from "./actions";

export default async function ProfileSetupPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login?message=Please%20sign%20in%20first");

  const [{ data: profile }, { data: avatar }] = await Promise.all([
    supabase.from("profiles").select("display_name, department, favorite_country").eq("id", data.user.id).maybeSingle(),
    supabase.from("user_avatars").select("*").eq("user_id", data.user.id).maybeSingle(),
  ]);

  return (
    <div>
      <PageHeader
        eyebrow="Profile"
        title="Build your matchday identity."
        description="Choose a display name, office team, favorite country, and avatar kit for leaderboards and rival leagues."
        badge="Supabase Auth"
      />
      <form action={saveProfile}>
        <Card className="app-panel border-border bg-transparent">
          <CardContent className="grid gap-6 p-4 sm:p-6">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="grid gap-2">
                <Label htmlFor="display_name">Display name</Label>
                <Input id="display_name" name="display_name" defaultValue={profile?.display_name ?? ""} placeholder="Danek Garcia" required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="department">Office team</Label>
                <Input id="department" name="department" defaultValue={profile?.department ?? ""} placeholder="Ops United" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="favorite_country">Favorite country</Label>
                <Input id="favorite_country" name="favorite_country" defaultValue={profile?.favorite_country ?? ""} placeholder="Canada" />
              </div>
            </div>
            <AvatarBuilder initialConfig={avatar ?? defaultAvatarConfig} />
            <Button type="submit" className="w-full sm:w-auto">
              Save profile
            </Button>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
