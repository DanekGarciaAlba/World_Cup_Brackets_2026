"use client";

import confetti from "canvas-confetti";

export function fireExactScoreConfetti() {
  void confetti({
    particleCount: 90,
    spread: 58,
    origin: { y: 0.76 },
    colors: ["#35e0a1", "#62b5ff", "#f7c948", "#ffffff"],
    disableForReducedMotion: true,
  });
}
