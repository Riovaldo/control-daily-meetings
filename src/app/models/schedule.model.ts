export interface TeamMember {
  name: string;
  initials: string;
  color: string; // deterministic HSL color based on name hash
}

export interface DailySlot {
  index: number;        // turn number (1-based)
  start: Date;          // first business day of block
  end: Date;            // last business day of block (inclusive)
  member: TeamMember;
  status: 'past' | 'current' | 'upcoming';
}

export interface Schedule {
  slots: DailySlot[];
  generatedAt: string;  // ISO string for serialization
}

export interface SerializedSlot {
  index: number;
  start: string;
  end: string;
  memberName: string;
}

export interface SerializedSchedule {
  slots: SerializedSlot[];
  generatedAt: string;
}
