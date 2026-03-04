import { NotificationSoundType } from "@/types";

export interface SoundOptions {
  volume?: number; // 0–100, default 70
  type?: NotificationSoundType;
}

type Note = { freq: number; start: number; duration: number };

const SOUND_PRESETS: Record<NotificationSoundType, Note[]> = {
  // Two ascending tones — friendly "new order" ding
  ding: [
    { freq: 880, start: 0, duration: 0.18 },
    { freq: 1100, start: 0.2, duration: 0.22 },
  ],
  // Three-note chime — pleasant and clear
  chime: [
    { freq: 1046, start: 0, duration: 0.15 },
    { freq: 1318, start: 0.17, duration: 0.15 },
    { freq: 1568, start: 0.34, duration: 0.28 },
  ],
  // Short sharp beep sequence — urgent attention getter
  alert: [
    { freq: 1400, start: 0, duration: 0.1 },
    { freq: 1400, start: 0.15, duration: 0.1 },
    { freq: 1400, start: 0.3, duration: 0.18 },
  ],
};

/**
 * Plays a notification sound using the Web Audio API.
 * No external audio files needed.
 */
export function playNotificationSound(options: SoundOptions = {}) {
  try {
    const { volume = 70, type = "ding" } = options;
    const gainLevel = Math.min(1, Math.max(0, volume / 100)) * 0.6;
    const notes = SOUND_PRESETS[type];

    const ctx = new (
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext
    )();

    notes.forEach(({ freq, start, duration }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = type === "alert" ? "square" : "sine";
      osc.frequency.setValueAtTime(freq, ctx.currentTime + start);

      gain.gain.setValueAtTime(0, ctx.currentTime + start);
      gain.gain.linearRampToValueAtTime(
        gainLevel,
        ctx.currentTime + start + 0.01,
      );
      gain.gain.exponentialRampToValueAtTime(
        0.001,
        ctx.currentTime + start + duration,
      );

      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + start + duration);
    });

    const lastNote = notes[notes.length - 1];
    setTimeout(
      () => ctx.close(),
      (lastNote.start + lastNote.duration + 0.2) * 1000,
    );
  } catch {
    // Silently ignore if Web Audio API is unavailable
  }
}
