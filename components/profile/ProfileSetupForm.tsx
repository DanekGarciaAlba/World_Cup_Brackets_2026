import { AvatarPlaceholderCustomizer } from "@/components/avatar/AvatarPlaceholderCustomizer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { saveProfile } from "@/app/profile/setup/actions";

type ProfileSetupFormProps = {
  profile: {
    display_name: string | null;
    department: string | null;
    favorite_country: string | null;
    favorite_team_id?: number | null;
  } | null;
  avatar: {
    kit_primary_color: string | null;
    kit_secondary_color: string | null;
    kit_number?: string | null;
  } | null;
  teams: Array<{ id: number; name: string }>;
  email: string;
};

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function ProfileSetupForm({ profile, avatar, teams, email }: ProfileSetupFormProps) {
  const displayName = profile?.display_name ?? email.split("@")[0] ?? "Player";

  return (
    <form action={saveProfile}>
      <Card className="premium-card border-border bg-transparent">
        <CardContent className="grid gap-6 p-4 sm:p-6">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="grid gap-2">
              <Label htmlFor="display_name">Display name</Label>
              <Input id="display_name" name="display_name" defaultValue={displayName} required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="department">Department / team</Label>
              <Input id="department" name="department" defaultValue={profile?.department ?? ""} placeholder="Office team" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="favorite_country">Favorite country</Label>
              <Input id="favorite_country" name="favorite_country" defaultValue={profile?.favorite_country ?? ""} placeholder="Optional" />
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Favorite synced team</Label>
            <Select name="favorite_team_id" disabled={teams.length === 0} defaultValue={profile?.favorite_team_id ? String(profile.favorite_team_id) : undefined}>
              <SelectTrigger>
                <SelectValue placeholder={teams.length === 0 ? "Teams sync pending" : "Choose a team"} />
              </SelectTrigger>
              <SelectContent>
                {teams.map((team) => (
                  <SelectItem key={team.id} value={String(team.id)}>
                    {team.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <AvatarPlaceholderCustomizer
            initials={initials(displayName)}
            initialPrimary={avatar?.kit_primary_color}
            initialSecondary={avatar?.kit_secondary_color}
            initialNumber={avatar?.kit_number}
          />

          <Button type="submit" className="w-full sm:w-auto">
            Save profile
          </Button>
        </CardContent>
      </Card>
    </form>
  );
}
