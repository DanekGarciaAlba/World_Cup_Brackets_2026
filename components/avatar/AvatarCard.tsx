import { Shirt } from "lucide-react";
import { AvatarPlaceholder } from "@/components/avatar/AvatarPlaceholder";
import { Button } from "@/components/ui/button";
import Link from "next/link";

type AvatarCardProps = {
  initials?: string | null;
  kitPrimary?: string | null;
  kitSecondary?: string | null;
  kitNumber?: string | null;
};

export function AvatarCard({ initials, kitPrimary, kitSecondary, kitNumber }: AvatarCardProps) {
  return (
    <section className="premium-card stadium-card min-h-[282px] p-5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-electric">Your avatar</p>
        <Shirt className="size-5 text-trophy-gold" />
      </div>
      <div className="mt-6 grid place-items-center">
        <AvatarPlaceholder
          initials={initials}
          kitPrimary={kitPrimary}
          kitSecondary={kitSecondary}
          kitNumber={kitNumber}
          size="lg"
        />
      </div>
      <Button asChild variant="secondary" className="mt-6 w-full">
        <Link href="/profile/setup">Edit profile</Link>
      </Button>
    </section>
  );
}
