import { StudySession, ActiveTimerState, Subject } from '../types';

/**
 * Get local date string in YYYY-MM-DD format (respecting user's local timezone)
 */
export function getLocalDayString(dateInput?: Date | string | number): string {
  const d = dateInput ? new Date(dateInput) : new Date();
  if (isNaN(d.getTime())) return '';
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Check if a date string/timestamp represents today in user's local timezone
 */
export function isTodayLocal(dateInput?: string | Date | number): boolean {
  if (!dateInput) return false;
  const targetStr = getLocalDayString(dateInput);
  const todayStr = getLocalDayString(new Date());
  return targetStr === todayStr;
}

/**
 * Calculate the exact elapsed seconds for an active timer (focus mode only)
 */
export function calculateActiveElapsedSeconds(activeTimer?: ActiveTimerState | null): number {
  if (!activeTimer) return 0;
  if (activeTimer.mode !== 'focus') return 0;
  if (!activeTimer.totalSeconds || activeTimer.totalSeconds <= 0) return 0;

  // If we have a startTime timestamp, compute from real timestamps
  if (activeTimer.startTime) {
    const now = Date.now();
    let elapsedMs = 0;

    if (activeTimer.isPaused && activeTimer.lastPausedAt) {
      elapsedMs = activeTimer.lastPausedAt - activeTimer.startTime - (activeTimer.accumulatedPausedMs || 0);
    } else if (activeTimer.isRunning) {
      elapsedMs = now - activeTimer.startTime - (activeTimer.accumulatedPausedMs || 0);
    } else {
      // Stopped or idle
      elapsedMs = (activeTimer.totalSeconds - activeTimer.secondsLeft) * 1000;
    }

    const elapsedSec = Math.max(0, Math.floor(elapsedMs / 1000));
    return Math.min(elapsedSec, activeTimer.totalSeconds);
  }

  // Fallback to totalSeconds - secondsLeft
  const fallbackSec = activeTimer.totalSeconds - (activeTimer.secondsLeft || 0);
  return Math.max(0, Math.min(fallbackSec, activeTimer.totalSeconds));
}

/**
 * Calculate total study seconds for today (combining persisted sessions + live active timer)
 * Single Source of Truth for all study time calculations!
 */
export function getTodayStudySeconds(
  sessions: StudySession[] = [],
  activeTimer?: ActiveTimerState | null
): number {
  // 1. Sum up completed study/focus sessions from today's local date (strictly exclude break mode)
  const todayCompletedSeconds = sessions
    .filter((session) => {
      if (session.status === 'cancelled') return false;
      if (session.mode === 'break') return false; // Break time is strictly NOT counted in study goal
      const dateToCheck = session.completedAt || session.createdAt || session.startTime;
      return isTodayLocal(dateToCheck);
    })
    .reduce((sum, session) => {
      // Use durationSeconds if available, else fallback to durationMinutes * 60 (actual study time only, excluding breakMinutes)
      const secs = session.durationSeconds !== undefined
        ? session.durationSeconds
        : (session.durationMinutes || 0) * 60;
      return sum + Math.max(0, secs);
    }, 0);

  // 2. Add active timer elapsed seconds ONLY if running/paused in focus mode (break mode yields 0)
  const activeElapsed = calculateActiveElapsedSeconds(activeTimer);

  return todayCompletedSeconds + activeElapsed;
}

/**
 * Calculate total study minutes for today
 */
export function getTodayStudyMinutes(
  sessions: StudySession[] = [],
  activeTimer?: ActiveTimerState | null
): number {
  const totalSecs = getTodayStudySeconds(sessions, activeTimer);
  return totalSecs / 60;
}

/**
 * Intelligent study duration formatter
 * Examples:
 * - 0s -> "0m" or "0s"
 * - 30s -> "30s"
 * - 1m -> "1m"
 * - 1m 30s -> "1m 30s"
 * - 10m -> "10m"
 * - 1h 25m -> "1h 25m"
 * - 4h -> "4h"
 */
export function formatStudyDuration(totalSeconds: number, options?: { showSeconds?: boolean }): string {
  const secs = Math.max(0, Math.floor(totalSeconds));

  if (secs === 0) {
    return '0m';
  }

  // Less than 1 minute
  if (secs < 60) {
    return `${secs}s`;
  }

  const mins = Math.floor(secs / 60);
  const remainingSecs = secs % 60;

  // Less than 1 hour
  if (mins < 60) {
    if (remainingSecs > 0 && options?.showSeconds !== false) {
      return `${mins}m ${remainingSecs}s`;
    }
    return `${mins}m`;
  }

  // 1 hour or more
  const hours = Math.floor(mins / 60);
  const remainingMins = mins % 60;

  if (remainingMins === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${remainingMins}m`;
}

/**
 * Formatted for gauge display e.g. "1.5h" or "45m" or "30s"
 */
export function formatStudyGaugeDisplay(totalSeconds: number): string {
  const secs = Math.max(0, Math.floor(totalSeconds));
  if (secs < 60) {
    return `${secs}s`;
  }
  const mins = Math.floor(secs / 60);
  if (mins < 60) {
    return `${mins}m`;
  }
  const hours = totalSeconds / 3600;
  return `${hours.toFixed(1)}h`;
}

/**
 * Weekly study statistics for analytics and dashboard mini-bar chart
 */
export function getWeeklyStudyStats(
  sessions: StudySession[] = [],
  activeTimer?: ActiveTimerState | null
) {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const result: Array<{ date: string; day: string; mins: number; seconds: number; isToday: boolean }> = [];
  let totalSeconds = 0;

  const now = new Date();

  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = getLocalDayString(d);
    const dayName = days[d.getDay()];
    const isToday = i === 0;

    let daySecs = sessions
      .filter((s) => {
        if (s.status === 'cancelled') return false;
        if (s.mode === 'break') return false;
        const dateToCheck = s.completedAt || s.createdAt || s.startTime;
        return getLocalDayString(dateToCheck) === dateStr;
      })
      .reduce((sum, s) => {
        const secs = s.durationSeconds !== undefined ? s.durationSeconds : (s.durationMinutes || 0) * 60;
        return sum + Math.max(0, secs);
      }, 0);

    // If today, add active timer elapsed seconds
    if (isToday) {
      daySecs += calculateActiveElapsedSeconds(activeTimer);
    }

    const dayMins = Math.round((daySecs / 60) * 10) / 10;
    totalSeconds += daySecs;

    result.push({
      date: dateStr,
      day: dayName,
      mins: dayMins,
      seconds: daySecs,
      isToday,
    });
  }

  const totalMinutes = Math.round(totalSeconds / 60);
  const avgDailyMinutes = Math.round(totalMinutes / 7);

  return {
    data: result,
    totalMinutes,
    totalSeconds,
    avgDailyMinutes,
  };
}

/**
 * Subject breakdown of study time
 */
export function getSubjectStudyMap(
  subjects: Subject[] = [],
  sessions: StudySession[] = [],
  activeTimer?: ActiveTimerState | null
): Record<string, { seconds: number; minutes: number; hours: number; formatted: string }> {
  const map: Record<string, { seconds: number; minutes: number; hours: number; formatted: string }> = {};

  // Initialize for all subjects
  subjects.forEach((sub) => {
    map[sub.id] = { seconds: 0, minutes: 0, hours: 0, formatted: '0m' };
  });

  // Accumulate sessions
  sessions.forEach((s) => {
    if (s.subjectId && s.status !== 'cancelled') {
      const secs = s.durationSeconds !== undefined ? s.durationSeconds : (s.durationMinutes || 0) * 60;
      if (!map[s.subjectId]) {
        map[s.subjectId] = { seconds: 0, minutes: 0, hours: 0, formatted: '0m' };
      }
      map[s.subjectId].seconds += secs;
    }
  });

  // Add active timer if subject is tagged
  if (activeTimer && activeTimer.subjectId && activeTimer.mode === 'focus') {
    const activeSecs = calculateActiveElapsedSeconds(activeTimer);
    if (!map[activeTimer.subjectId]) {
      map[activeTimer.subjectId] = { seconds: 0, minutes: 0, hours: 0, formatted: '0m' };
    }
    map[activeTimer.subjectId].seconds += activeSecs;
  }

  // Calculate derived values
  Object.keys(map).forEach((key) => {
    const secs = map[key].seconds;
    map[key].minutes = Math.round(secs / 60);
    map[key].hours = Number((secs / 3600).toFixed(1));
    map[key].formatted = formatStudyDuration(secs);
  });

  return map;
}

/**
 * Calculate consecutive study days streak based on study sessions
 */
export function calculateStudyStreak(sessions: StudySession[] = []): number {
  const validSessions = sessions.filter(
    (s) => s.status !== 'cancelled' && s.mode !== 'break' && ((s.durationSeconds || 0) > 0 || (s.durationMinutes || 0) > 0)
  );

  if (validSessions.length === 0) return 0;

  // Set of dates with study activity in YYYY-MM-DD format
  const studyDates = new Set<string>();
  validSessions.forEach((s) => {
    const dStr = getLocalDayString(s.completedAt || s.createdAt || s.startTime);
    if (dStr) studyDates.add(dStr);
  });

  const now = new Date();
  const todayStr = getLocalDayString(now);

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = getLocalDayString(yesterday);

  // If user hasn't studied today or yesterday, streak is 0
  let currentCheck: Date | null = studyDates.has(todayStr) ? now : studyDates.has(yesterdayStr) ? yesterday : null;
  if (!currentCheck) return 0;

  let streak = 0;
  const iterDate = new Date(currentCheck);

  while (true) {
    const checkStr = getLocalDayString(iterDate);
    if (studyDates.has(checkStr)) {
      streak++;
      iterDate.setDate(iterDate.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}
