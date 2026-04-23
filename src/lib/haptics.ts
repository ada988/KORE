"use client";

/**
 * Small haptic helper gated on the global user preference.
 * Uses the Vibration API (Android) — Safari iOS does not support it,
 * so calls are silent no-ops there.
 */

const HAPTICS_KEY = "kore-haptics-enabled";
const SOUND_KEY = "kore-sound-enabled";

function hapticsOn(): boolean {
  if (typeof window === "undefined") return false;
  const raw = window.localStorage.getItem(HAPTICS_KEY);
  return raw === null ? true : raw === "1";
}

function soundOn(): boolean {
  if (typeof window === "undefined") return false;
  const raw = window.localStorage.getItem(SOUND_KEY);
  return raw === null ? false : raw === "1";
}

export function setHapticsEnabled(enabled: boolean): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(HAPTICS_KEY, enabled ? "1" : "0");
}

export function setSoundEnabled(enabled: boolean): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SOUND_KEY, enabled ? "1" : "0");
}

export function getHapticsEnabled(): boolean {
  return hapticsOn();
}

export function getSoundEnabled(): boolean {
  return soundOn();
}

export function tap(): void {
  if (!hapticsOn()) return;
  if (typeof navigator === "undefined" || !navigator.vibrate) return;
  navigator.vibrate(8);
}

export function bump(): void {
  if (!hapticsOn()) return;
  if (typeof navigator === "undefined" || !navigator.vibrate) return;
  navigator.vibrate(14);
}

export function success(): void {
  if (!hapticsOn()) return;
  if (typeof navigator === "undefined" || !navigator.vibrate) return;
  navigator.vibrate([12, 40, 12]);
}

export function error(): void {
  if (!hapticsOn()) return;
  if (typeof navigator === "undefined" || !navigator.vibrate) return;
  navigator.vibrate([30, 40, 30]);
}

let ctx: AudioContext | null = null;
function beep(freq: number, durMs: number, vol = 0.06): void {
  if (!soundOn() || typeof window === "undefined") return;
  try {
    ctx = ctx ?? new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = freq;
    osc.type = "sine";
    gain.gain.value = vol;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + durMs / 1000);
    osc.stop(ctx.currentTime + durMs / 1000);
  } catch {
    // audio context init failed — ignore
  }
}

export function tick(): void {
  beep(1200, 40, 0.04);
}

export function chime(): void {
  beep(660, 120, 0.07);
  setTimeout(() => beep(880, 120, 0.07), 120);
}
