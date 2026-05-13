import { isWeekend, addDays, format } from 'date-fns';

/**
 * Returns true if the given date falls on a weekday (Mon–Fri)
 * and is NOT in the holidays list.
 */
export function isBusinessDay(date: Date, holidays: string[] = []): boolean {
  if (isWeekend(date)) return false;
  const iso = format(date, 'yyyy-MM-dd');
  return !holidays.includes(iso);
}

/**
 * Returns the next business day on or after the given date.
 */
export function nextBusinessDay(date: Date, holidays: string[] = []): Date {
  let d = new Date(date);
  while (!isBusinessDay(d, holidays)) {
    d = addDays(d, 1);
  }
  return d;
}

/**
 * Adds `n` business days to `date` (skips Sat/Sun and holidays).
 */
export function addBusinessDays(date: Date, n: number, holidays: string[] = []): Date {
  let d = new Date(date);
  let remaining = n;
  while (remaining > 0) {
    d = addDays(d, 1);
    if (isBusinessDay(d, holidays)) remaining--;
  }
  return d;
}

/**
 * Counts business days from `start` (exclusive) to `end` (inclusive).
 */
export function businessDaysBetween(start: Date, end: Date, holidays: string[] = []): number {
  let count = 0;
  let d = new Date(start);
  d = addDays(d, 1); // exclusive of start
  while (d <= end) {
    if (isBusinessDay(d, holidays)) count++;
    d = addDays(d, 1);
  }
  return count;
}

/**
 * Counts business days from `start` (inclusive) to `end` (inclusive).
 */
export function businessDaysBetweenInclusive(start: Date, end: Date, holidays: string[] = []): number {
  let count = 0;
  let d = new Date(start);
  while (d <= end) {
    if (isBusinessDay(d, holidays)) count++;
    d = addDays(d, 1);
  }
  return count;
}

/**
 * Returns the end date (inclusive) of a block of `blockSize` business days
 * starting from `start` (inclusive).
 */
export function blockEndDate(start: Date, blockSize: number, holidays: string[] = []): Date {
  let d = new Date(start);
  let counted = isBusinessDay(d, holidays) ? 1 : 0;
  while (counted < blockSize) {
    d = addDays(d, 1);
    if (isBusinessDay(d, holidays)) counted++;
  }
  return d;
}

/**
 * Generates a deterministic hash number from a string.
 */
export function stringHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

/**
 * Returns a deterministic HSL color string based on a name.
 */
export function memberColor(name: string): string {
  const hue = stringHash(name) % 360;
  return `hsl(${hue}, 70%, 60%)`;
}

/**
 * Returns the initials (up to 2 letters) from a full name.
 */
export function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() ?? '')
    .join('');
}

/**
 * Seeded pseudo-random number generator (Mulberry32).
 */
export function mulberry32(seed: number): () => number {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Fisher-Yates shuffle using a seeded RNG.
 */
export function seededShuffle<T>(arr: T[], seed: number): T[] {
  const result = [...arr];
  const rng = mulberry32(seed);
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
