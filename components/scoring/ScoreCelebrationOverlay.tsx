"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, Sparkles, Target, Trophy, X } from "lucide-react";
import {
  filterUnacknowledgedMatchScores,
  matchScoreAcknowledgementKey,
  type RecentMatchScore,
} from "@/lib/scoring/recentMatchScores";
import { pushClientNotifications, syncClientNotifications, type ClientNotification } from "@/lib/notifications/clientNotifications";

type ScoreState = {
  userId: string;
  totalPoints: number;
  todayPoints: number;
  exactScores: number;
  correctOutcomes: number;
  rank: number | null;
  rankChange: number;
  lastPointsAt: string | null;
  updatedAt: string | null;
  recentMatchScores: RecentMatchScore[];
  recentPointReleases: RecentPointRelease[];
};

type RecentPointRelease = {
  id: string;
  label: string;
  body: string;
  points: number;
  scoredAt: string | null;
  sortAt: string | null;
  href: string;
  accent: "gold" | "green" | "blue";
};

type ScoreCelebration = {
  previous: ScoreState;
  current: ScoreState;
  pointsDelta: number;
  exactDelta: number;
  correctDelta: number;
  matchScores: RecentMatchScore[];
};

const POLL_MS = 60000;
const STORAGE_PREFIX = "wc-score-state:v1";
const MATCH_ACK_PREFIX = "wc-score-match-acks:v1";
const POINT_RELEASE_ACK_PREFIX = "wc-score-release-acks:v1";

function toNumber(value: unknown) {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : 0;
}

function normalizeScoreState(payload: any): ScoreState | null {
  if (!payload?.userId) return null;
  return {
    userId: String(payload.userId),
    totalPoints: toNumber(payload.totalPoints),
    todayPoints: toNumber(payload.todayPoints),
    exactScores: toNumber(payload.exactScores),
    correctOutcomes: toNumber(payload.correctOutcomes),
    rank: payload.rank === null || payload.rank === undefined ? null : toNumber(payload.rank),
    rankChange: toNumber(payload.rankChange),
    lastPointsAt: typeof payload.lastPointsAt === "string" ? payload.lastPointsAt : null,
    updatedAt: typeof payload.updatedAt === "string" ? payload.updatedAt : null,
    recentMatchScores: normalizeRecentMatchScores(payload.recentMatchScores),
    recentPointReleases: normalizeRecentPointReleases(payload.recentPointReleases),
  };
}

function normalizeRecentMatchScores(value: unknown): RecentMatchScore[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((score): RecentMatchScore | null => {
      const matchId = toNumber((score as any)?.matchId);
      if (!matchId) return null;
      return {
        matchId,
        matchLabel: String((score as any)?.matchLabel ?? "Fixture"),
        kickoffAt: String((score as any)?.kickoffAt ?? ""),
        homeTeamName: String((score as any)?.homeTeamName ?? "Home"),
        awayTeamName: String((score as any)?.awayTeamName ?? "Away"),
        predictedScoreLabel: String((score as any)?.predictedScoreLabel ?? "--"),
        actualScoreLabel: String((score as any)?.actualScoreLabel ?? "--"),
        points: toNumber((score as any)?.points),
        exactScore: Boolean((score as any)?.exactScore),
        correctOutcome: Boolean((score as any)?.correctOutcome),
        timingMultiplier:
          (score as any)?.timingMultiplier === null || (score as any)?.timingMultiplier === undefined
            ? null
            : toNumber((score as any)?.timingMultiplier),
        scoredAt: typeof (score as any)?.scoredAt === "string" ? (score as any).scoredAt : null,
      };
    })
    .filter((score): score is RecentMatchScore => Boolean(score));
}

function normalizeRecentPointReleases(value: unknown): RecentPointRelease[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((release): RecentPointRelease | null => {
      const id = String((release as any)?.id ?? "").trim();
      const label = String((release as any)?.label ?? "").trim();
      const body = String((release as any)?.body ?? "").trim();
      const href = String((release as any)?.href ?? "/bracket");
      const accent = String((release as any)?.accent ?? "blue");
      const points = toNumber((release as any)?.points);
      if (!id || !label || !body || points <= 0 || !href.startsWith("/")) return null;
      return {
        id,
        label,
        body,
        points,
        scoredAt: typeof (release as any)?.scoredAt === "string" ? (release as any).scoredAt : null,
        sortAt: typeof (release as any)?.sortAt === "string" ? (release as any).sortAt : null,
        href,
        accent: accent === "gold" || accent === "green" || accent === "blue" ? accent : "blue",
      };
    })
    .filter((release): release is RecentPointRelease => Boolean(release));
}

function storageKey(userId: string) {
  return `${STORAGE_PREFIX}:${userId}`;
}

function matchAckStorageKey(userId: string) {
  return `${MATCH_ACK_PREFIX}:${userId}`;
}

function pointReleaseAckStorageKey(userId: string) {
  return `${POINT_RELEASE_ACK_PREFIX}:${userId}`;
}

function readBaseline(userId: string) {
  try {
    const raw = window.localStorage.getItem(storageKey(userId));
    return raw ? (JSON.parse(raw) as ScoreState) : null;
  } catch {
    return null;
  }
}

function writeBaseline(state: ScoreState) {
  try {
    window.localStorage.setItem(storageKey(state.userId), JSON.stringify(state));
  } catch {
    // localStorage can be unavailable in private or locked-down browser sessions.
  }
}

function readAcknowledgedMatchScores(userId: string) {
  try {
    const raw = window.localStorage.getItem(matchAckStorageKey(userId));
    const values = raw ? (JSON.parse(raw) as unknown) : [];
    return new Set(Array.isArray(values) ? values.map(String) : []);
  } catch {
    return new Set<string>();
  }
}

function writeAcknowledgedMatchScores(userId: string, scores: RecentMatchScore[]) {
  if (scores.length === 0) return;
  try {
    const next = readAcknowledgedMatchScores(userId);
    for (const score of scores) next.add(matchScoreAcknowledgementKey(score));
    window.localStorage.setItem(matchAckStorageKey(userId), JSON.stringify(Array.from(next).slice(-80)));
  } catch {
    // localStorage can be unavailable in private or locked-down browser sessions.
  }
}

function pointReleaseAcknowledgementKey(release: RecentPointRelease) {
  return `${release.id}:${release.points}`;
}

function readAcknowledgedPointReleases(userId: string) {
  try {
    const raw = window.localStorage.getItem(pointReleaseAckStorageKey(userId));
    const values = raw ? (JSON.parse(raw) as unknown) : [];
    return new Set(Array.isArray(values) ? values.map(String) : []);
  } catch {
    return new Set<string>();
  }
}

function writeAcknowledgedPointReleases(userId: string, releases: RecentPointRelease[]) {
  if (releases.length === 0) return;
  try {
    const next = readAcknowledgedPointReleases(userId);
    for (const release of releases) next.add(pointReleaseAcknowledgementKey(release));
    window.localStorage.setItem(pointReleaseAckStorageKey(userId), JSON.stringify(Array.from(next).slice(-80)));
  } catch {
    // localStorage can be unavailable in private or locked-down browser sessions.
  }
}

function previousFromMatchScores(current: ScoreState, scores: RecentMatchScore[], pointsDelta: number, exactDelta: number, correctDelta: number): ScoreState {
  return {
    ...current,
    totalPoints: Math.max(0, current.totalPoints - pointsDelta),
    exactScores: Math.max(0, current.exactScores - exactDelta),
    correctOutcomes: Math.max(0, current.correctOutcomes - correctDelta),
    recentMatchScores: [],
    recentPointReleases: [],
  };
}

function hasVerifiableMatchScore(score: RecentMatchScore) {
  return Boolean(score.scoredAt) && score.actualScoreLabel.trim() !== "--" && score.predictedScoreLabel.trim() !== "--";
}

function hasPositiveVerifiableMatchScore(score: RecentMatchScore) {
  return score.points > 0 && hasVerifiableMatchScore(score);
}

function hasPositivePointRelease(release: RecentPointRelease) {
  return release.points > 0 && Boolean(release.scoredAt);
}

function matchScoreNotifications(userId: string, scores: RecentMatchScore[]): ClientNotification[] {
  const verifiedScores = scores.filter(hasPositiveVerifiableMatchScore);
  return verifiedScores.map((score): ClientNotification => ({
      id: `score:${userId}:${matchScoreAcknowledgementKey(score)}`,
      kind: "score",
      title: `+${score.points} pts from ${score.matchLabel}`,
      body: `${score.homeTeamName} ${score.actualScoreLabel} ${score.awayTeamName}. Your pick ${score.predictedScoreLabel}.`,
      createdAt: score.scoredAt ?? new Date().toISOString(),
      sortAt: score.kickoffAt || score.scoredAt || undefined,
      href: "/dashboard",
      accent: score.exactScore ? "gold" : score.correctOutcome ? "green" : "blue",
    }));
}

function pointReleaseNotifications(userId: string, releases: RecentPointRelease[]): ClientNotification[] {
  return releases.filter(hasPositivePointRelease).map((release): ClientNotification => ({
    id: `score:${userId}:release:${pointReleaseAcknowledgementKey(release)}`,
    kind: "score",
    title: `+${release.points} pts from ${release.label}`,
    body: release.body,
    createdAt: release.scoredAt ?? new Date().toISOString(),
    sortAt: release.sortAt ?? release.scoredAt ?? undefined,
    href: release.href,
    accent: release.accent,
  }));
}

function syncMatchScoreNotifications(userId: string, scores: RecentMatchScore[]) {
  syncClientNotifications(matchScoreNotifications(userId, scores));
}

function pushMatchScoreNotifications(userId: string, scores: RecentMatchScore[]) {
  pushClientNotifications(matchScoreNotifications(userId, scores));
}

function syncPointReleaseNotifications(userId: string, releases: RecentPointRelease[]) {
  syncClientNotifications(pointReleaseNotifications(userId, releases));
}

function pushPointReleaseNotifications(userId: string, releases: RecentPointRelease[]) {
  pushClientNotifications(pointReleaseNotifications(userId, releases));
}

export function ScoreCelebrationOverlay() {
  const [celebration, setCelebration] = useState<ScoreCelebration | null>(null);
  const [animatedTotal, setAnimatedTotal] = useState(0);

  const checkScoreState = useCallback(async () => {
    try {
      const response = await fetch("/api/dashboard/score-state", { cache: "no-store" });
      if (!response.ok) return;
      const current = normalizeScoreState(await response.json());
      if (!current) return;

      const acknowledged = readAcknowledgedMatchScores(current.userId);
      const acknowledgedPointReleases = readAcknowledgedPointReleases(current.userId);
      const verifiedRecentScores = current.recentMatchScores.filter(hasPositiveVerifiableMatchScore);
      const verifiedPointReleases = current.recentPointReleases.filter(hasPositivePointRelease);
      syncMatchScoreNotifications(current.userId, verifiedRecentScores);
      syncPointReleaseNotifications(current.userId, verifiedPointReleases);
      const newMatchScores = filterUnacknowledgedMatchScores(verifiedRecentScores, acknowledged);
      const newPointReleases = verifiedPointReleases.filter((release) => !acknowledgedPointReleases.has(pointReleaseAcknowledgementKey(release)));
      const newMatchPoints = newMatchScores.reduce((sum, score) => sum + Math.max(0, score.points), 0);
      const newExactCount = newMatchScores.filter((score) => score.exactScore).length;
      const newCorrectCount = newMatchScores.filter((score) => score.correctOutcome).length;
      const previous = readBaseline(current.userId);
      if (!previous) {
        writeBaseline(current);
        if (newMatchScores.length > 0) {
          writeAcknowledgedMatchScores(current.userId, newMatchScores);
          pushMatchScoreNotifications(current.userId, newMatchScores);
          writeAcknowledgedPointReleases(current.userId, newPointReleases);
          pushPointReleaseNotifications(current.userId, newPointReleases);
          setCelebration({
            previous: previousFromMatchScores(current, newMatchScores, newMatchPoints, newExactCount, newCorrectCount),
            current,
            pointsDelta: newMatchPoints,
            exactDelta: newExactCount,
            correctDelta: newCorrectCount,
            matchScores: newMatchScores,
          });
        } else if (newPointReleases.length > 0) {
          writeAcknowledgedPointReleases(current.userId, newPointReleases);
          pushPointReleaseNotifications(current.userId, newPointReleases);
        }
        return;
      }

      const pointsDelta = current.totalPoints - previous.totalPoints;
      const exactDelta = current.exactScores - previous.exactScores;
      const correctDelta = current.correctOutcomes - previous.correctOutcomes;

      if (pointsDelta < 0 || exactDelta < 0 || correctDelta < 0) {
        writeBaseline(current);
        writeAcknowledgedMatchScores(current.userId, newMatchScores);
        pushMatchScoreNotifications(current.userId, newMatchScores);
        writeAcknowledgedPointReleases(current.userId, newPointReleases);
        pushPointReleaseNotifications(current.userId, newPointReleases);
        return;
      }

      if (newMatchScores.length > 0) {
        const displayPointsDelta = newMatchPoints;
        const displayExactDelta = newExactCount;
        const displayCorrectDelta = newCorrectCount;
        writeBaseline(current);
        writeAcknowledgedMatchScores(current.userId, newMatchScores);
        pushMatchScoreNotifications(current.userId, newMatchScores);
        writeAcknowledgedPointReleases(current.userId, newPointReleases);
        pushPointReleaseNotifications(current.userId, newPointReleases);
        setCelebration({
          previous: previousFromMatchScores(current, newMatchScores, displayPointsDelta, displayExactDelta, displayCorrectDelta),
          current,
          pointsDelta: displayPointsDelta,
          exactDelta: displayExactDelta,
          correctDelta: displayCorrectDelta,
          matchScores: newMatchScores,
        });
        return;
      }

      if (newPointReleases.length > 0) {
        writeBaseline(current);
        writeAcknowledgedPointReleases(current.userId, newPointReleases);
        pushPointReleaseNotifications(current.userId, newPointReleases);
        return;
      }

      writeBaseline(current);
    } catch {
      // Score celebrations should never interrupt the app if the network hiccups.
    }
  }, []);

  useEffect(() => {
    checkScoreState();
    const interval = window.setInterval(checkScoreState, POLL_MS);
    const onFocus = () => checkScoreState();
    const onVisibility = () => {
      if (document.visibilityState === "visible") checkScoreState();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("world-cup:match-pick", onFocus);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("world-cup:match-pick", onFocus);
    };
  }, [checkScoreState]);

  useEffect(() => {
    if (!celebration) return;
    const start = window.performance.now();
    const from = celebration.previous.totalPoints;
    const to = celebration.current.totalPoints;
    const duration = 950;
    let frameId = 0;

    function frame(now: number) {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setAnimatedTotal(Math.round(from + (to - from) * eased));
      if (progress < 1) frameId = window.requestAnimationFrame(frame);
    }

    setAnimatedTotal(from);
    frameId = window.requestAnimationFrame(frame);
    const closeTimer = window.setTimeout(() => setCelebration(null), 8200);
    return () => {
      window.cancelAnimationFrame(frameId);
      window.clearTimeout(closeTimer);
    };
  }, [celebration]);

  const trophyCount = useMemo(() => {
    if (!celebration) return 0;
    return Math.min(6, Math.max(3, Math.ceil(celebration.pointsDelta / 5)));
  }, [celebration]);

  if (!celebration) return null;

  return (
    <div className="score-celebration-shell" aria-live="polite">
      <div className="score-celebration-card" role="status">
        <button type="button" className="score-celebration-close" aria-label="Close score update" onClick={() => setCelebration(null)}>
          <X className="size-4" />
        </button>

        <div className="score-celebration-trophies" aria-hidden="true">
          {Array.from({ length: trophyCount }).map((_, index) => (
            <span key={index} style={{ animationDelay: `${index * 90}ms` }}>
              <Trophy className="size-5" />
            </span>
          ))}
        </div>

        <div className="score-celebration-main">
          <span className="score-celebration-kicker">
            <Sparkles className="size-4" />
            Score update
          </span>
          <h2>+{celebration.pointsDelta} pts</h2>
          <div className="score-celebration-total">
            <span>{celebration.previous.totalPoints}</span>
            <span className="score-celebration-arrow">to</span>
            <strong>{animatedTotal}</strong>
          </div>
        </div>

        <div className="score-celebration-metrics">
          <span>
            <CheckCircle2 className="size-4" />
            +{celebration.correctDelta} correct
          </span>
          <span>
            <Target className="size-4" />
            +{celebration.exactDelta} exact
          </span>
        </div>

        {celebration.matchScores.length > 0 ? (
          <div className="score-celebration-match-list">
            <p>New scored matches</p>
            {celebration.matchScores.slice(0, 4).map((score) => (
              <div key={matchScoreAcknowledgementKey(score)} className="score-celebration-match-row">
                <span>
                  <strong>
                    {score.homeTeamName} {score.actualScoreLabel} {score.awayTeamName}
                  </strong>
                  <small>
                    Your pick {score.predictedScoreLabel} / {score.matchLabel}
                  </small>
                </span>
                <b>+{score.points}</b>
              </div>
            ))}
            {celebration.matchScores.length > 4 ? <em>+{celebration.matchScores.length - 4} more scored</em> : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
