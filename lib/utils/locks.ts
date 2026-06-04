type LockableMatch = {
  kickoff_at: string | Date;
  status?: string | null;
};

export function isMatchLocked(match: LockableMatch, now = new Date()) {
  const kickoff = new Date(match.kickoff_at);
  const status = (match.status || "").toLowerCase();
  return kickoff <= now || ["live", "in_play", "halftime", "finished", "postponed", "cancelled"].includes(status);
}

export function canRevealPrediction(match: LockableMatch, now = new Date()) {
  return isMatchLocked(match, now);
}

export async function canEditPrediction(_userId: string, match: LockableMatch, now = new Date()) {
  return !isMatchLocked(match, now);
}
