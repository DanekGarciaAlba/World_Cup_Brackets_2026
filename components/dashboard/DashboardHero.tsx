import Image from "next/image";
import Link from "next/link";
import { CalendarClock, ChevronRight, Goal, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

export function DashboardHero() {
  return (
    <section className="app-panel relative mb-6 overflow-hidden rounded-lg p-4 sm:p-6 lg:p-8">
      <div className="absolute inset-y-0 right-0 hidden w-[48%] lg:block">
        <Image
          src="/stadium-dashboard-concept.png"
          alt=""
          fill
          priority
          sizes="48vw"
          className="object-cover opacity-75"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#081728] via-[#081728]/40 to-transparent" />
      </div>
      <div className="relative z-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_400px]">
        <div className="max-w-3xl">
          <div className="mb-6 grid max-w-xl grid-cols-1 gap-2 sm:grid-cols-3">
            <StatPill icon={CalendarClock} label="Season" value="2026" />
            <StatPill icon={Goal} label="Live data" value="Ready" />
            <StatPill icon={ShieldCheck} label="Pool type" value="Free" />
          </div>
          <h2 className="text-balance text-[clamp(2.15rem,5.2vw,5.4rem)] font-semibold leading-[0.92] tracking-normal">
            Predict the tournament before the office does.
          </h2>
          <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
            Make fixture picks, rank group finishers, build a knockout path, and climb the office leaderboard. Points only,
            with no odds, wagers, deposits, or payouts anywhere in the app.
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link href="/picks">
                Make picks
                <ChevronRight className="size-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="secondary">
              <Link href="/profile/setup">Build profile</Link>
            </Button>
          </div>
        </div>
        <div className="grid gap-3 lg:content-end">
          <div className="rounded-lg border border-border bg-background/70 p-4">
            <p className="text-sm font-medium">Lock rules</p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Fixture picks lock at kickoff using server time. Group and bracket locks stay configurable from admin.
            </p>
          </div>
          <div className="rounded-lg border border-primary/25 bg-primary/10 p-4">
            <p className="text-sm font-medium text-primary">Allowed API usage</p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Fixtures, livescore, standings, teams, and events only. Betting and prediction endpoints stay out.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function StatPill({ icon: Icon, label, value }: { icon: typeof CalendarClock; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-background/55 p-3">
      <Icon className="mb-3 size-4 text-primary" />
      <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold">{value}</p>
    </div>
  );
}
