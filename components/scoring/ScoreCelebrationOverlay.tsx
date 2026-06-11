"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, Sparkles, Target, Trophy, X } from "lucide-react";
import {
  filterUnacknowledgedMatchScores,
  matchScoreAcknowledgementKey,
  type RecentMatchScore,
} from "@/lib/scoring/recentMatchScores";

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

function storageKey(userId: string) {
  return `${STORAGE_PREFIX}:${userId}`;
}

function matchAckStorageKey(userId: string) {
  return `${MATCH_ACK_PREFIX}:${userId}`;
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

function previousFromMatchScores(current: ScoreState, scores: RecentMatchScore[], pointsDelta: number, exactDelta: number, correctDelta: number): ScoreState {
  return {
    ...current,
    totalPoints: Math.max(0, current.totalPoints - pointsDelta),
    exactScores: Math.max(0, current.exactScores - exactDelta),
    correctOutcomes: Math.max(0, current.correctOutcomes - correctDelta),
    recentMatchScores: [],
  };
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
      const newMatchScores = filterUnacknowledgedMatchScores(current.recentMatchScores, acknowledged);
      const newMatchPoints = newMatchScores.reduce((sum, score) => sum + Math.max(0, score.points), 0);
      const newExactCount = newMatchScores.filter((score) => score.exactScore).length;
      const newCorrectCount = newMatchScores.filter((score) => score.correctOutcome).length;
      const previous = readBaseline(current.userId);
      if (!previous) {
        writeBaseline(current);
        if (newMatchScores.length > 0) {
          writeAcknowledgedMatchScores(current.userId, newMatchScores);
          setCelebration({
            previous: previousFromMatchScores(current, newMatchScores, newMatchPoints, newExactCount, newCorrectCount),
            current,
            pointsDelta: newMatchPoints,
            exactDelta: newExactCount,
            correctDelta: newCorrectCount,
            matchScores: newMatchScores,
          });
        }
        return;
      }

      const pointsDelta = current.totalPoints - previous.totalPoints;
      const exactDelta = current.exactScores - previous.exactScores;
      const correctDelta = current.correctOutcomes - previous.correctOutcomes;

      if (pointsDelta < 0 || exactDelta < 0 || correctDelta < 0) {
        writeBaseline(current);
        writeAcknowledgedMatchScores(current.userId, newMatchScores);
        return;
      }

      const displayPointsDelta = Math.max(0, pointsDelta, newMatchPoints);
      const displayExactDelta = Math.max(0, exactDelta, newExactCount);
      const displayCorrectDelta = Math.max(0, correctDelta, newCorrectCount);
      const displayPrevious =
        displayPointsDelta > pointsDelta || displayExactDelta > exactDelta || displayCorrectDelta > correctDelta
          ? previousFromMatchScores(current, newMatchScores, displayPointsDelta, displayExactDelta, displayCorrectDelta)
          : previous;

      if (displayPointsDelta > 0 || displayExactDelta > 0 || displayCorrectDelta > 0 || newMatchScores.length > 0) {
        writeBaseline(current);
        writeAcknowledgedMatchScores(current.userId, newMatchScores);
        setCelebration({
          previous: displayPrevious,
          current,
          pointsDelta: displayPointsDelta,
          exactDelta: displayExactDelta,
          correctDelta: displayCorrectDelta,
          matchScores: newMatchScores,
        });
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
