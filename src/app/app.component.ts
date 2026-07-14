import { Component, OnInit, signal, computed, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { trigger, transition, style, animate, query, stagger } from '@angular/animations';

import { TeamService, PeriodConfig } from './services/team.service';
import { RaffleService } from './services/raffle.service';
import { Schedule, DailySlot } from './models/schedule.model';
import { WorkdayRangePipe } from './pipes/workday-range.pipe';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    HttpClientModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatSnackBarModule,
    MatProgressBarModule,
    WorkdayRangePipe
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  animations: [
    trigger('listAnimation', [
      transition('* <=> *', [
        query(':enter', [
          style({ opacity: 0, transform: 'translateY(20px)' }),
          stagger('50ms', [
            animate('300ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
          ])
        ], { optional: true })
      ])
    ]),
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('500ms ease-in', style({ opacity: 1 }))
      ])
    ])
  ]
})
export class AppComponent implements OnInit {
  private teamService = inject(TeamService);
  private raffleService = inject(RaffleService);
  private snackBar = inject(MatSnackBar);

  constructor() {
    // Auto-scroll to active slot when schedule changes
    effect(() => {
      const currentSched = this.schedule();
      if (currentSched) {
        this.scrollToActive();
      }
    });
  }

  // Signals for state management
  configPeriods = signal<PeriodConfig[]>([]);
  schedule = signal<Schedule | null>(null);
  isLoading = signal(true);

  // Computed signals
  currentSlot = computed(() => this.raffleService.getCurrentSlot(this.schedule()));
  nextSlot = computed(() => this.raffleService.getNextSlot(this.schedule()));
  daysRemainingInBlock = computed(() => this.raffleService.daysRemainingInBlock(this.schedule()));

  turnProgress = computed(() => {
    const remaining = this.daysRemainingInBlock();
    const total = 3;
    return ((total - remaining + 1) / total) * 100;
  });

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.teamService.loadConfig().subscribe({
      next: (config) => {
        this.configPeriods.set(config.periods);
        this.raffleService.setHolidays(config.holidays);
        // Always recalculate on every page load — fully stateless
        const schedule = this.raffleService.generateSchedule(config.periods);
        this.schedule.set(schedule);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
        this.snackBar.open('Error al cargar configuración del equipo', 'Cerrar', { duration: 3000 });
      }
    });
  }

  copyResponsible() {
    const current = this.currentSlot();
    if (current) {
      navigator.clipboard.writeText(current.member.name).then(() => {
        this.snackBar.open(`Copiado: ${current.member.name}`, 'OK', { duration: 2000 });
      });
    }
  }

  scrollToActive() {
    setTimeout(() => {
      const activeElement = document.getElementById('active-slot');
      if (activeElement) {
        activeElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 500);
  }

  getGroupedSlots() {
    const slots = this.schedule()?.slots || [];
    const groups: { month: string, slots: DailySlot[] }[] = [];

    slots.forEach(slot => {
      const month = this.raffleService.formatMonth(slot.start);
      let group = groups.find(g => g.month === month);
      if (!group) {
        group = { month, slots: [] };
        groups.push(group);
      }
      group.slots.push(slot);
    });

    return groups;
  }
}
