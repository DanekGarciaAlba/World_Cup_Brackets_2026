import { AvatarPlaceholder } from "@/components/avatar/AvatarPlaceholder";

type AvatarSlotProps = {
  initials?: string | null;
  label?: string;
  sublabel?: string;
  kitPrimary?: string | null;
  kitSecondary?: string | null;
  kitNumber?: string | null;
};

export function AvatarSlot({ initials, label, sublabel, kitPrimary, kitSecondary, kitNumber }: AvatarSlotProps) {
  return (
    <div className="flex items-center gap-3">
      <AvatarPlaceholder initials={initials} kitPrimary={kitPrimary} kitSecondary={kitSecondary} kitNumber={kitNumber} size="sm" />
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold">{label ?? "Player"}</p>
        {sublabel ? <p className="truncate text-xs text-muted-foreground">{sublabel}</p> : null}
      </div>
    </div>
  );
}
