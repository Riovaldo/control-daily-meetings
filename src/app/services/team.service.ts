import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';

export interface PeriodConfig {
  startDate: string;
  members: string[];
}

export interface TeamConfig {
  periods: PeriodConfig[];
  holidays: string[];
}

@Injectable({ providedIn: 'root' })
export class TeamService {
  private http = inject(HttpClient);

  /** Loads the entire config from assets/team-config.json. */
  loadConfig(): Observable<TeamConfig> {
    return this.http.get<TeamConfig>('assets/team-config.json');
  }
}
