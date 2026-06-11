export type MascotStreakInput = {
  matchId: number;
  kickoffAt: string;
  predictedHomeScore: number;
  predictedAwayScore: number;
  actualHomeScore: number;
  actualAwayScore: number;
};

function outcome(homeScore: number, awayScore: number) {
  if (homeScore > awayScore) return "home";
  if (awayScore > homeScore) return "away";
  return "draw";
}

export function calculateCorrectOutcomeStreaks(inputs: MascotStreakInput[]) {
  const orderedInputs = [...inputs].sort((a, b) => {
    const byKickoff = new Date(a.kickoffAt).getTime() - new Date(b.kickoffAt).getTime();
    return byKickoff || a.matchId - b.matchId;
  });

  let currentCorrectStreak = 0;
  let bestCorrectStreak = 0;

  for (const input of orderedInputs) {
    const predictedOutcome = outcome(input.predictedHomeScore, input.predictedAwayScore);
    const actualOutcome = outcome(input.actualHomeScore, input.actualAwayScore);

    currentCorrectStreak = predictedOutcome === actualOutcome ? currentCorrectStreak + 1 : 0;
    bestCorrectStreak = Math.max(bestCorrectStreak, currentCorrectStreak);
  }

  return { currentCorrectStreak, bestCorrectStreak };
}
