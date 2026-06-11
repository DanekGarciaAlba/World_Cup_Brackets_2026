"use client";

import { EmotePlaceholderArt } from "@/components/emotes/EmotePlaceholderArt";
import type { EmoteCatalogItem } from "@/lib/emotes/emoteCatalog";
import { cn } from "@/lib/utils";

type PublicProfileAvatarProps = {
  emote: EmoteCatalogItem;
  size?: number;
  onClick?: () => void;
  className?: string;
  label?: string;
};

export function PublicProfileAvatar({ emote, size = 48, onClick, className, label = "Open public profile" }: PublicProfileAvatarProps) {
  const style = { width: Math.round(size * 1.28), height: size };
  const sharedClassName = cn(
    "relative shrink-0 overflow-visible drop-shadow-[0_10px_18px_rgba(0,0,0,.36)]",
    onClick && "cursor-pointer transition hover:brightness-110 active:scale-[0.98]",
    className,
  );
  const art = emote.thumbnailPath ? (
    <>
      <img src="/assets/profile/emote-speech-bubble-frame.png" alt="" className="absolute inset-0 h-full w-full object-contain" />
      <img
        src={emote.thumbnailPath}
        alt={emote.name}
        className="absolute left-[14%] top-[5%] h-[77%] w-[76%] object-contain drop-shadow-[0_7px_9px_rgba(0,0,0,.2)]"
      />
    </>
  ) : (
    <EmotePlaceholderArt emote={emote} selected size="sm" className="absolute left-[18%] top-[12%] h-[58%] w-[62%] rounded-lg border-0 shadow-none" />
  );

  if (onClick) {
    return (
      <button type="button" aria-label={label} onClick={onClick} className={sharedClassName} style={style}>
        {art}
      </button>
    );
  }

  return (
    <div aria-label={label} className={sharedClassName} style={style}>
      {art}
    </div>
  );
}
