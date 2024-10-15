import prisma from "~/lib/prisma";
import { QuestionSeriesResponseData } from "~/models/series";

type DailySeriesRankingDTO = {
  userId: string;
  userName: string;
  score: number;
  elapsedTime: string;
};

export default defineEventHandler(async (event) => {
  const lastSeries = await prisma.questionSeries.findFirst({
    orderBy: {
      id: "desc",
    },
    select: {
      id: true,
    },
  });
  if (!lastSeries) return;

  let usersResponses = await prisma.questionSeriesResponse.findMany({
    where: { seriesId: lastSeries.id },
    include: { user: true },
  });

  const ranking = usersResponses.sort((a, b) => {
    const aData = a.data as any as QuestionSeriesResponseData;
    const bData = b.data as any as QuestionSeriesResponseData;
    if (aData.score < bData.score) return 1;
    if (aData.score > bData.score) return -1;
    // Si les noms sont égaux, comparer les âges
    const elapsedA = a.updateDate.getTime() - a.createDate.getTime();
    const elapsedB = b.updateDate.getTime() - b.createDate.getTime();
    if (elapsedA < elapsedB) return -1;
    if (elapsedA > elapsedB) return 1;
    return 0;
  });

  return ranking.map((r) => {
    const data = r.data as any as QuestionSeriesResponseData;
    return {
      userId: r.userId,
      userName: r.user.name ?? "Anonymous",
      score: data.score,
      elapsedTime: millisToMinutesAndSeconds(
        r.updateDate.getTime() - r.createDate.getTime()
      ),
    } as DailySeriesRankingDTO;
  });
});

function millisToMinutesAndSeconds(millis: number) {
  var minutes = Math.floor(millis / 60000);
  var seconds = +((millis % 60000) / 1000).toFixed(0);
  return minutes + ":" + (seconds < 10 ? "0" : "") + seconds;
}
