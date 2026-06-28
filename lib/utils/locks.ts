type LockableMatch = {
  kickoff_at: string | Date;
  status?: string | null;
};

export function isMatchLocked(match: LockableMatch, now = new Date()) {
  const status = (match.status || "").toLowerCase();
  if (["live", "in_play", "halftime", "finished", "postponed", "cancelled"].includes(status)) return true;
  const kickoff = new Date(match.kickoff_at).getTime();
  if (!Number.isFinite(kickoff)) return true;
  return kickoff <= now.getTime();
}

export function canRevealPrediction(match: LockableMatch, now = new Date()) {
  const kickoff = new Date(match.kickoff_at).getTime();
  if (!Number.isFinite(kickoff)) return false;
  return kickoff <= now.getTime();
}

export async function canEditPrediction(_userId: string, match: LockableMatch, now = new Date()) {
  return !isMatchLocked(match, now);
}
