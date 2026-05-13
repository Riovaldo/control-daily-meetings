import { Pipe, PipeTransform } from '@angular/core';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

/**
 * Formats a business-day date range like:
 * "Lun 13 — Mié 15 de Mayo"
 */
@Pipe({
  name: 'workdayRange',
  standalone: true,
  pure: true
})
export class WorkdayRangePipe implements PipeTransform {
  transform(start: Date | string, end: Date | string): string {
    const s = new Date(start);
    const e = new Date(end);
    const startStr = format(s, "EEE d", { locale: es });
    const endStr   = format(e, "EEE d 'de' MMMM", { locale: es });
    return `${this.cap(startStr)} — ${this.cap(endStr)}`;
  }

  private cap(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}
