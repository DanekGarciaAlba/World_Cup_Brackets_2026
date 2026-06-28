"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Info, Newspaper, X } from "lucide-react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const NEWS_READ_KEY = "wc-news-center-read:v1";

const newsItems = [
  {
    title: "Bracket audits are now available",
    body: "Open your bracket to review group and Top 8 point audits without changing saved picks.",
    href: "/bracket",
    label: "Open bracket",
  },
  {
    title: "Knockout pick timing now maxes at 48 hours",
    body: "Round of 32 and later fixture picks no longer need a 7-day runway for the best timing multiplier.",
    href: "/picks",
    label: "Open picks",
  },
  {
    title: "Pick Points guide now has stage tabs",
    body: "The guide explains group, Round of 32, Round of 16, quarter-final, semi-final, and final timing separately.",
    href: "/picks",
    label: "Review guide",
  },
] as const;

function readNewsSeen() {
  try {
    return window.localStorage.getItem(NEWS_READ_KEY) === "seen";
  } catch {
    return false;
  }
}

function writeNewsSeen() {
  try {
    window.localStorage.setItem(NEWS_READ_KEY, "seen");
  } catch {
    // News read state is cosmetic; never block app navigation.
  }
}

export function NewsCenterButton() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [seen, setSeen] = useState(true);

  useEffect(() => {
    setMounted(true);
    setSeen(readNewsSeen());
  }, []);

  function openNews() {
    const nextOpen = !open;
    setOpen(nextOpen);
    if (nextOpen) {
      writeNewsSeen();
      setSeen(true);
    }
  }

  return (
    <>
      <Button
        size="icon"
        variant="secondary"
        aria-label="News"
        aria-expanded={open}
        onClick={openNews}
        className={cn("relative", !seen && "border-trophy-gold/35 bg-trophy-gold/12 text-white")}
      >
        <Newspaper className="size-4" />
        {!seen ? (
          <span className="absolute -right-1 -top-1 grid size-5 place-items-center rounded-full bg-trophy-gold text-[10px] font-black text-[#11131c]">
            {newsItems.length}
          </span>
        ) : null}
      </Button>

      {mounted && open
        ? createPortal(
            <div className="fixed inset-0 z-[70]">
              <button type="button" aria-label="Close news overlay" onClick={() => setOpen(false)} className="absolute inset-0 bg-[#020713]/28 backdrop-blur-[1px] md:bg-transparent md:backdrop-blur-0" />
              <div className="fixed left-3 right-3 top-20 max-h-[calc(100dvh-6rem)] overflow-hidden rounded-2xl border border-white/12 bg-[#071126]/98 text-left shadow-[0_28px_90px_rgba(0,0,0,.5),inset_0_1px_0_rgba(255,255,255,.08)] backdrop-blur-xl md:left-auto md:right-8 md:w-[min(92vw,27rem)]">
                <div className="flex items-start justify-between gap-3 border-b border-white/10 p-3">
                  <span className="min-w-0">
                    <p className="text-[0.68rem] font-black uppercase tracking-[0.14em] text-electric">News</p>
                    <h2 className="mt-1 text-lg font-black text-white">App updates and fixes</h2>
                  </span>
                  <button
                    type="button"
                    aria-label="Close news"
                    onClick={() => setOpen(false)}
                    className="grid size-9 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.055] text-white/70 transition hover:border-white/18 hover:bg-white/[0.09] hover:text-white"
                  >
                    <X className="size-4" />
                  </button>
                </div>
                <div className="max-h-[calc(100dvh-12rem)] space-y-2 overflow-y-auto p-2 scrollbar-soft md:max-h-[24rem]">
                  {newsItems.map((item) => (
                    <Link
                      key={item.title}
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className="block rounded-xl border border-white/10 bg-white/[0.045] p-3 transition hover:border-trophy-gold/25 hover:bg-trophy-gold/[0.08]"
                    >
                      <span className="flex min-w-0 items-start gap-2">
                        <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg border border-trophy-gold/24 bg-trophy-gold/10 text-trophy-gold">
                          <Info className="size-4" />
                        </span>
                        <span className="min-w-0">
                          <strong className="block text-sm font-black text-white">{item.title}</strong>
                          <small className="mt-1 block text-xs font-semibold leading-5 text-muted-foreground">{item.body}</small>
                          <span className="mt-2 inline-flex items-center gap-1 text-[0.68rem] font-black uppercase tracking-[0.1em] text-trophy-gold">
                            {item.label}
                            <ArrowRight className="size-3.5" />
                          </span>
                        </span>
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
