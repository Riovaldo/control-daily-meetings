import { Injectable } from '@angular/core';
import seedrandom from 'seedrandom';
import { format, addMonths, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  DailySlot, Schedule, TeamMember,
  SerializedSchedule, SerializedSlot
} from '../models/schedule.model';
import {
  nextBusinessDay, blockEndDate, addBusinessDays,
  businessDaysBetween, memberColor, getInitials,
  seededShuffle, stringHash
} from '../utils/date-utils';

const STORAGE_KEY = 'daily-schedule';
const BLOCK_SIZE = 3; // business days per turn

@Injectable({ providedIn: 'root' })
export class RaffleService {
  private holidays: string[] = [];

  setHolidays(holidays: string[]) {
    this.holidays = holidays;
  }

  // ──────────────────────────────────────────────
  // TeamMember builder
  // ──────────────────────────────────────────────
  buildMember(name: string): TeamMember {
    return {
      name,
      initials: getInitials(name),
      color: memberColor(name)
    };
  }

  // ──────────────────────────────────────────────
  // Schedule generation
  // ──────────────────────────────────────────────

  /**
   * Generates a 3-month schedule starting from a fixed startDate.
   * Uses a seeded shuffle so all users get the same result.
   */
  generateSchedule(memberNames: string[], configStart: string): Schedule {
    // Parse YYYY-MM-DD as local date to avoid timezone shifts
    const [year, month, day] = configStart.split('-').map(Number);
    const startDate = nextBusinessDay(new Date(year, month - 1, day), this.holidays);
    const endDate = addMonths(startDate, 3);
    const members: TeamMember[] = memberNames.map(n => this.buildMember(n));

    // Seed based on the config start date so the shuffle is always the same for that start
    const seed = configStart;
    const rng = seedrandom(seed);
    
    let shuffled = this.shuffleWithRng(members, rng);

    const slots: DailySlot[] = [];
    let cursor = startDate;
    let poolIndex = 0;
    let lastMemberName = '';

    while (cursor <= endDate) {
      // Avoid consecutive same person
      let member = shuffled[poolIndex % shuffled.length];
      if (member.name === lastMemberName && shuffled.length > 1) {
        poolIndex++;
        member = shuffled[poolIndex % shuffled.length];
      }

      // Re-shuffle at pool wrap to add variety
      if (poolIndex % shuffled.length === 0 && poolIndex > 0) {
        shuffled = this.shuffleWithRng(members, rng);
      }

      const blockEnd = blockEndDate(cursor, BLOCK_SIZE, this.holidays);
      const actualEnd = blockEnd <= endDate ? blockEnd : endDate;

      slots.push({
        index: slots.length + 1,
        start: new Date(cursor),
        end: new Date(actualEnd),
        member,
        status: this.computeStatus(cursor, actualEnd)
      });

      lastMemberName = member.name;
      poolIndex++;
      cursor = nextBusinessDay(addBusinessDays(actualEnd, 1, this.holidays), this.holidays);
    }

    const schedule: Schedule = { slots, generatedAt: new Date().toISOString() };
    this.saveToStorage(schedule);
    return schedule;
  }

  /** Recomputes slot statuses (call on app load). */
  refreshStatuses(schedule: Schedule): Schedule {
    const today = startOfDay(new Date());
    schedule.slots.forEach(slot => {
      slot.status = this.computeStatus(slot.start, slot.end);
    });
    return schedule;
  }

  private computeStatus(start: Date, end: Date): 'past' | 'current' | 'upcoming' {
    const today = startOfDay(new Date());
    if (end < today) return 'past';
    if (start <= today && today <= end) return 'current';
    return 'upcoming';
  }

  // ──────────────────────────────────────────────
  // Enable / disable logic
  // ──────────────────────────────────────────────

  /**
   * Returns true if the raffle button should be enabled.
   * Enabled when: no schedule exists OR ≤ 2 business days left in last slot.
   */
  canGenerate(schedule: Schedule | null): boolean {
    if (!schedule || schedule.slots.length === 0) return true;
    const lastSlot = schedule.slots[schedule.slots.length - 1];
    const today = startOfDay(new Date());
    // Business days remaining in last slot (inclusive of today if in slot)
    const remaining = businessDaysBetween(today, lastSlot.end, this.holidays);
    return remaining <= 2;
  }

  /**
   * Returns number of business days until button becomes available.
   * Returns 0 when already available.
   */
  daysUntilEnabled(schedule: Schedule | null): number {
    if (!schedule || this.canGenerate(schedule)) return 0;
    const lastSlot = schedule.slots[schedule.slots.length - 1];
    const today = startOfDay(new Date());
    const remaining = businessDaysBetween(today, lastSlot.end, this.holidays);
    return Math.max(0, remaining - 2);
  }

  /** Business days between two dates (start exclusive, end inclusive). */
  businessDaysBetween(start: Date, end: Date): number {
    return businessDaysBetween(start, end, this.holidays);
  }

  // ──────────────────────────────────────────────
  // Current / next block helpers
  // ──────────────────────────────────────────────

  getCurrentSlot(schedule: Schedule | null): DailySlot | null {
    if (!schedule) return null;
    return schedule.slots.find(s => s.status === 'current') ?? null;
  }

  getNextSlot(schedule: Schedule | null): DailySlot | null {
    if (!schedule) return null;
    const upcoming = schedule.slots.filter(s => s.status === 'upcoming');
    return upcoming[0] ?? null;
  }

  /** Business days remaining in the current block (from today, inclusive). */
  daysRemainingInBlock(schedule: Schedule | null): number {
    const current = this.getCurrentSlot(schedule);
    if (!current) return 0;
    const today = startOfDay(new Date());
    return businessDaysBetween(today, current.end, this.holidays) + 1; // +1 for today
  }

  // ──────────────────────────────────────────────
  // localStorage persistence
  // ──────────────────────────────────────────────

  saveToStorage(schedule: Schedule): void {
    const serialized: SerializedSchedule = {
      generatedAt: schedule.generatedAt,
      slots: schedule.slots.map(s => ({
        index: s.index,
        start: s.start.toISOString(),
        end: s.end.toISOString(),
        memberName: s.member.name
      }))
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(serialized));
  }

  loadFromStorage(memberNames: string[]): Schedule | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const data: SerializedSchedule = JSON.parse(raw);
      const memberMap = new Map(
        memberNames.map(n => [n, this.buildMember(n)])
      );
      const slots: DailySlot[] = data.slots.map((s: SerializedSlot) => ({
        index: s.index,
        start: new Date(s.start),
        end: new Date(s.end),
        member: memberMap.get(s.memberName) ?? this.buildMember(s.memberName),
        status: 'upcoming' as const
      }));
      const schedule: Schedule = { slots, generatedAt: data.generatedAt };
      return this.refreshStatuses(schedule);
    } catch {
      return null;
    }
  }

  clearStorage(): void {
    localStorage.removeItem(STORAGE_KEY);
  }

  // ──────────────────────────────────────────────
  // Formatting helpers (used in template)
  // ──────────────────────────────────────────────

  formatDateRange(start: Date, end: Date): string {
    const s = format(start, "EEE d", { locale: es });
    const e = format(end, "EEE d 'de' MMMM", { locale: es });
    return `${this.capitalize(s)} — ${this.capitalize(e)}`;
  }

  formatMonth(date: Date): string {
    return this.capitalize(format(date, 'MMMM yyyy', { locale: es }));
  }

  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  private shuffleWithRng<T>(arr: T[], rng: seedrandom.PRNG): T[] {
    const result = [...arr];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }
}
