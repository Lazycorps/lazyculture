import type { QuestionSeriesData, QuestionSeriesDTO, QuestionSeriesResponseData, QuestionSeriesResponseDTO } from "../series";

export type UserAscentSeriesDTO = {
  series: QuestionSeriesDTO;
  userResponse: QuestionSeriesAscensionResponse;
};

export type QuestionSeriesAscensionData = QuestionSeriesData & {
  healthPoint: number;
};

export type QuestionSeriesAscensionResponse = QuestionSeriesResponseDTO & {
  data: QuestionSeriesAscensionResponseData;
};

export type QuestionSeriesAscensionResponseData = QuestionSeriesResponseData & {
  ended: boolean;
  healthPoint: number;
};
