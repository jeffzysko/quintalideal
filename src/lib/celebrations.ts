import confetti from 'canvas-confetti';

/** Trigger haptic feedback if available */
export function haptic(style: 'light' | 'medium' | 'heavy' = 'medium') {
  if (!('vibrate' in navigator)) return;
  const patterns: Record<string, number[]> = {
    light: [10],
    medium: [20],
    heavy: [30, 10, 30],
  };
  navigator.vibrate(patterns[style] ?? [20]);
}

/** Fire a celebration confetti burst */
export function fireConfetti() {
  const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

  confetti({ ...defaults, particleCount: 50, origin: { x: 0.3, y: 0.6 } });
  confetti({ ...defaults, particleCount: 50, origin: { x: 0.7, y: 0.6 } });

  setTimeout(() => {
    confetti({ ...defaults, particleCount: 30, origin: { x: 0.5, y: 0.4 } });
  }, 250);
}

/** Small confetti for minor wins */
export function fireConfettiSmall() {
  confetti({
    particleCount: 25,
    spread: 50,
    origin: { x: 0.5, y: 0.7 },
    startVelocity: 20,
    ticks: 40,
    zIndex: 9999,
  });
}
