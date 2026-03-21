// Custom notification sound generator for the service worker
// Creates a pleasant two-tone chime using Web Audio API

function playNotificationChime() {
  try {
    const ctx = new AudioContext();
    const now = ctx.currentTime;

    // First tone - bright ping
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(880, now); // A5
    gain1.gain.setValueAtTime(0.2, now);
    gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
    osc1.start(now);
    osc1.stop(now + 0.3);

    // Second tone - resolution
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1174.66, now + 0.15); // D6
    gain2.gain.setValueAtTime(0, now);
    gain2.gain.setValueAtTime(0.18, now + 0.15);
    gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
    osc2.start(now + 0.15);
    osc2.stop(now + 0.5);

    // Third tone - sparkle
    const osc3 = ctx.createOscillator();
    const gain3 = ctx.createGain();
    osc3.connect(gain3);
    gain3.connect(ctx.destination);
    osc3.type = 'sine';
    osc3.frequency.setValueAtTime(1318.51, now + 0.28); // E6
    gain3.gain.setValueAtTime(0, now);
    gain3.gain.setValueAtTime(0.12, now + 0.28);
    gain3.gain.exponentialRampToValueAtTime(0.01, now + 0.6);
    osc3.start(now + 0.28);
    osc3.stop(now + 0.6);

    osc3.onended = () => ctx.close();
  } catch {
    // Audio not available
  }
}

// Export for use in main thread
if (typeof window !== 'undefined') {
  window.__playNotificationChime = playNotificationChime;
}
