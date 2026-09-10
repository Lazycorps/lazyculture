export interface DailySeriesRankingDTO {
  userId: string;
  userName: string;
  score: number;
  elapsedTime: string;
  avatarUrl: string | null;
  frameStyleKey: string | null;
}

export interface DailySeriesDayDTO {
  id: number;
  title: string;
  date: string; // Format "YYYY-MM-DD"
}

export interface DailyTimelineItemDTO {
  id: number;
  title: string;
  date: string; // Format "YYYY-MM-DD"
  shortDay: string; // ex. "Jeu 10" ou "Aujourd'hui"
  userRank: number | null;
  userScore: number | null;
  userTime: string | null;
  totalParticipants: number;
}

export interface MonthlyTimelineItemDTO {
  monthKey: string; // Format "YYYY-MM"
  shortMonth: string; // ex. "Sep 26"
  monthLabel: string; // ex. "Septembre 2026"
  userRank: number | null;
  userPoints: number | null;
  firstPlaces: number;
  secondPlaces: number;
  thirdPlaces: number;
  totalParticipants: number;
}

export interface DailyCalendarDayDTO {
  date: string; // Format "YYYY-MM-DD"
  dayNumber: number;
  hasSeries: boolean;
  seriesId: number | null;
  seriesTitle: string | null;
  userRank: number | null;
  userScore: number | null;
  totalParticipants: number;
}
