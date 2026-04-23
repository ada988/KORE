"use client";

/**
 * Minimal browser-only reminder: schedules a single local notification
 * at the user's chosen hour. Uses setTimeout relative to next firing time.
 * Persists nothing — runs while the tab is open (PWA install gives best UX).
 */

const TIMER_KEY = "__kore_reminder_timer_id__";

export async function requestReminderPermission(): Promise<NotificationPermission> {
  if (typeof window === "undefined" || !("Notification" in window)) return "denied";
  if (Notification.permission === "granted" || Notification.permission === "denied") {
    return Notification.permission;
  }
  return Notification.requestPermission();
}

export function maybeScheduleReminder(enabled: boolean, hour: number): void {
  if (typeof window === "undefined") return;

  // Clear prior timer
  const w = window as unknown as Record<string, number | undefined>;
  if (w[TIMER_KEY] !== undefined) {
    window.clearTimeout(w[TIMER_KEY]);
    w[TIMER_KEY] = undefined;
  }

  if (!enabled) return;
  if (!("Notification" in window)) return;
  if (Notification.permission !== "granted") return;

  const now = new Date();
  const target = new Date();
  target.setHours(hour, 0, 0, 0);
  if (target.getTime() <= now.getTime()) {
    target.setDate(target.getDate() + 1);
  }

  const ms = target.getTime() - now.getTime();
  w[TIMER_KEY] = window.setTimeout(() => {
    try {
      new Notification("קוֹרֵא", {
        body: "זמן לקרוא היום — אפילו 5 דקות שומרות על הרצף.",
        tag: "kore-daily",
      });
    } catch {
      // notification failed — ignore
    }
    // re-schedule for next day
    maybeScheduleReminder(enabled, hour);
  }, ms);
}
