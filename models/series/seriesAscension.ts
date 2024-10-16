import type { QuestionSeriesData, QuestionSeriesResponseData } from "../series";

export type QuestionSeriesAscensionData = QuestionSeriesData & {
  healthPoint: number;
};

export type QuestionSeriesAscensionResponseData = QuestionSeriesResponseData & {
  ended: boolean;
  healthPoint: number;
};
