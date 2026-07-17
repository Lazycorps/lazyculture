import type {
  QuestionSeriesDTO,
  QuestionSeriesResponseDTO,
  QuestionSeriesResponseData,
} from "../series";

export type SpeedrunSurvivalResponseData = QuestionSeriesResponseData & {
  seriesType: "speedrun_survival";
  ended: boolean;
  score: number;
  penalties: number; // in seconds
  nextQuestion: number;
  answeredQuestionIds: number[];
};

export type UserSpeedrunSurvivalDTO = {
  series: QuestionSeriesDTO;
  userResponse:
    | (QuestionSeriesResponseDTO & {
        data: SpeedrunSurvivalResponseData;
      })
    | null;
};

export type SpeedrunSurvivalRankingDTO = {
  userId: string;
  userName: string;
  score: number;
  avatarUrl: string | null;
  frameStyleKey: string | null;
  rank: number;
};

export type SpeedrunSprintResponseData = QuestionSeriesResponseData & {
  seriesType: "speedrun_sprint";
  ended: boolean;
  score: number; // target correct answers (e.g. 20)
  penalties: number; // in seconds (+5s per wrong answer)
  nextQuestion: number;
  answeredQuestionIds: number[];
};

export type UserSpeedrunSprintDTO = {
  series: QuestionSeriesDTO;
  userResponse:
    | (QuestionSeriesResponseDTO & {
        data: SpeedrunSprintResponseData;
      })
    | null;
};

export type SpeedrunSprintRankingDTO = {
  userId: string;
  userName: string;
  elapsedTimeMs: number; // total time in ms, including penalties
  avatarUrl: string | null;
  frameStyleKey: string | null;
  rank: number;
};
