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
