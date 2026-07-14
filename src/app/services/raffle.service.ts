import { Injectable } from '@angular/core';
import seedrandom from 'seedrandom';
import { format, addMonths, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { Schedule, DailySlot, TeamMember, SerializedSchedule, SerializedSlot } from '../models/schedule.model';
import { PeriodConfig } from './team.service';
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
   * Generates a 3-month schedule from 'today' based on historical periods.
   * Uses a seeded shuffle per period so all users get the same result.
   */
  generateSchedule(periods: PeriodConfig[]): Schedule {
    const today = startOfDay(new Date());
    const overallEndDate = addMonths(today, 3);
    const slots: DailySlot[] = [];

    // Ensure periods are sorted by startDate ascending
    const sortedPeriods = [...periods].sort((a, b) => a.startDate.localeCompare(b.startDate));

    for (let i = 0; i < sortedPeriods.length; i++) {
      const period = sortedPeriods[i];
      const [year, month, day] = period.startDate.split('-').map(Number);
      const epochStart = nextBusinessDay(new Date(year, month - 1, day), this.holidays);

      let nextEpochStart: Date | null = null;
      if (sortedPeriods[i + 1]) {
        const [ny, nm, nd] = sortedPeriods[i + 1].startDate.split('-').map(Number);
        nextEpochStart = new Date(ny, nm - 1, nd); // Not snapping to business day to ensure sharp cutoff
      }

      // If this period starts after our 3-month future window, stop.
      if (epochStart > overallEndDate) break;

      const members: TeamMember[] = period.members.map(n => this.buildMember(n));
      const seed = period.startDate;
      const rng = seedrandom(seed);
      let shuffled = this.shuffleWithRng(members, rng);

      // Determine where to start generating for this epoch
      let cursor = epochStart;
      if (slots.length > 0) {
        const lastSlotEnd = slots[slots.length - 1].end;
        const nextAvail = nextBusinessDay(addBusinessDays(lastSlotEnd, 1, this.holidays), this.holidays);
        if (nextAvail > cursor) {
          cursor = nextAvail;
        }
      }

      let poolIndex = 0;
      let lastMemberName = '';

      while (cursor <= overallEndDate) {
        // If we reached the next period's start date, stop generating for this period
        if (nextEpochStart && cursor >= nextEpochStart) {
          break;
        }

        let member = shuffled[poolIndex % shuffled.length];
        if (member.name === lastMemberName && shuffled.length > 1) {
          poolIndex++;
          member = shuffled[poolIndex % shuffled.length];
        }

        if (poolIndex % shuffled.length === 0 && poolIndex > 0) {
          shuffled = this.shuffleWithRng(members, rng);
        }

        const blockEnd = blockEndDate(cursor, BLOCK_SIZE, this.holidays);
        // Do not cap blockEnd by nextEpochStart to allow 3-day blocks to finish naturally
        // But do cap it by overallEndDate
        const actualEnd = blockEnd <= overallEndDate ? blockEnd : overallEndDate;

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
    }

    const schedule: Schedule = { slots, generatedAt: new Date().toISOString() };
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
