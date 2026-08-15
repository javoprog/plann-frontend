import confetti from "canvas-confetti";
import type { Goal } from "@/lib/types";

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export function celebrateGoalCompletion() {
  if (prefersReducedMotion()) return;
  void confetti({
    particleCount: 140,
    spread: 90,
    startVelocity: 45,
    origin: { y: 0.65 },
  });
}

export function celebrateHabitCompletion() {
  if (prefersReducedMotion()) return;
  void confetti({
    particleCount: 24,
    spread: 50,
    startVelocity: 20,
    scalar: 0.65,
    origin: { x: 0.5, y: 0.5 },
  });
}

export function celebrateNewlyCompletedGoals(
  previousGoals: Goal[],
  nextGoals: Goal[],
) {
  const previousProgress = new Map(
    previousGoals.map((goal) => [goal.id, goal.progress]),
  );
  const hasNewCompletion = nextGoals.some(
    (goal) =>
      goal.progress === 100 && (previousProgress.get(goal.id) ?? 0) < 100,
  );
  if (hasNewCompletion) celebrateGoalCompletion();
  return hasNewCompletion;
}
