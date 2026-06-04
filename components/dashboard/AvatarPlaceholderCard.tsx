import { AvatarCard } from "@/components/avatar/AvatarCard";
import type { AvatarSummary } from "@/lib/data/worldCupData";

export function AvatarPlaceholderCard({ avatar }: { avatar: AvatarSummary | null }) {
  return (
    <AvatarCard
      initials={avatar?.initials ?? null}
      kitPrimary={avatar?.kitPrimary ?? "#101a38"}
      kitSecondary={avatar?.kitSecondary ?? "#d8ad4c"}
      kitNumber={avatar?.kitNumber ?? "26"}
    />
  );
}
