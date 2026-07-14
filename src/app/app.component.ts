import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { trigger, transition, style, animate, query, stagger } from '@angular/animations';
import { effect } from '@angular/core';
import confetti from 'canvas-confetti';

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
  isShuffling = signal(false);

  // Computed signals
  currentSlot = computed(() => this.raffleService.getCurrentSlot(this.schedule()));
  nextSlot = computed(() => this.raffleService.getNextSlot(this.schedule()));
  daysRemainingInBlock = computed(() => this.raffleService.daysRemainingInBlock(this.schedule()));
  
  turnProgress = computed(() => {
    const remaining = this.daysRemainingInBlock();
    const total = 3; // Block size
    return ((total - remaining + 1) / total) * 100;
  });

  ngOnInit() {
    this.loadData();
  }

  async loadData() {
    this.teamService.loadConfig().subscribe({
      next: (config) => {
        this.configPeriods.set(config.periods);
        this.raffleService.setHolidays(config.holidays);
        
        // Pass all unique members ever mentioned in periods so local storage can load their details
        const allMembers = Array.from(new Set(config.periods.flatMap(p => p.members)));
        const saved = this.raffleService.loadFromStorage(allMembers);
        if (saved) {
          this.schedule.set(saved);
        } else {
          // Automatic sync on first enter (no confetti)
          this.syncCalendar(false);
        }
      },
      error: () => {
        this.snackBar.open('Error al cargar configuración del equipo', 'Cerrar', { duration: 3000 });
      }
    });
  }

  syncCalendar(withConfetti = true) {
    this.isShuffling.set(true);

    // Simulate "ruleta" or "loading from DB" effect
    setTimeout(() => {
      const newSchedule = this.raffleService.generateSchedule(this.configPeriods());
      this.schedule.set(newSchedule);
      this.isShuffling.set(false);
      
      if (withConfetti) {
        this.launchConfetti();
        this.snackBar.open('¡Calendario sincronizado! 🎉', 'Genial', { duration: 3000 });
      }
    }, 1500);
  }

  launchConfetti() {
    const duration = 3 * 1000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#00ff88', '#ffffff']
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#00ff88', '#ffffff']
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };
    frame();
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
    // Wait for the DOM to render the new list
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
