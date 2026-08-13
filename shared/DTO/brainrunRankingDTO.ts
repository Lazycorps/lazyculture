export class BrainrunRankingDTO {
  userId: string = "";
  name: string = "";
  avatarUrl: string | null = null;
  frameStyleKey: string | null = null;
  /** Meilleur acte atteint (1..3). */
  bestAct: number = 1;
  /** Meilleure rangée atteinte dans bestAct. */
  bestRow: number = 1;
  /** Plus haute Érudition à laquelle le joueur a gagné une run — critère de tri principal du
   * classement ; -1 s'il n'a jamais gagné (cf. shared/brainrunErudition.ts). */
  bestWonErudition: number = -1;
  /** true si le joueur a déjà battu le Boss de l'acte 3 (niveau « Victoire »). */
  isVictory: boolean = false;
  /** Nombre de fois où l'acte 3 a été terminé. */
  victoryCount: number = 0;
  /** Nombre total de runs terminées (WON + LOST + ABANDONED, hors debug). */
  totalRuns: number = 0;
}
