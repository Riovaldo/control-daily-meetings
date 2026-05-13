import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';

interface TeamConfig {
  startDate: string;
  members: string[];
  holidays: string[];
}

@Injectable({ providedIn: 'root' })
export class TeamService {
  private http = inject(HttpClient);

  /** Loads the entire config from assets/team-config.json. */
  loadConfig(): Observable<TeamConfig> {
    return this.http.get<TeamConfig>('assets/team-config.json');
  }

  /** Backwards compatibility for members only. */
  loadMembers(): Observable<string[]> {
    return this.loadConfig().pipe(map(cfg => cfg.members));
  }
}
