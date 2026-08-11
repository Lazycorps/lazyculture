/**
 * Placement des nœuds de la carte Brainrun (présentation pure, aucune règle de jeu).
 *
 * Le défaut corrigé ici : avec des rangées centrées et un écart fixe entre nœuds, une rangée de 2
 * nœuds occupe deux fois moins de large qu'une rangée de 4 et se ramasse au milieu — la carte prend
 * une allure de grappe compacte au lieu de longues voies qui montent. On répartit donc **chaque
 * rangée sur toute la largeur disponible**, quel que soit son nombre de nœuds, puis on fait
 * serpenter l'ensemble.
 *
 * Trois couches se cumulent :
 * 1. la répartition de base, gérée en CSS (`justify-between` sur une rangée de largeur fixe) ;
 * 2. `rowShift` — décalage de la rangée entière, qui donne le serpentement d'ensemble ;
 * 3. `nodeDrift` — dispersion individuelle, pour que les voies ne soient pas rectilignes.
 *
 * Tout est **déterministe** : dérivé d'une graine décrivant la carte, jamais de Math.random. Les
 * positions sont recalculées à chaque re-rendu (resize, changement de statut d'un nœud) et la carte
 * se réarrangerait sous les yeux du joueur ; ici elle reste figée tant que la carte ne change pas.
 */

/** Largeur occupée par une rangée, en % du conteneur. Le reste absorbe le serpentement. */
export const BRAINRUN_MAP_ROW_SPAN_PERCENT = 76;

/** Amplitude du serpentement d'une rangée, en % de la largeur d'une rangée. Somme de deux
 * sinusoïdes de périodes incommensurables : un serpentement irrégulier, pas une vague régulière. */
export const BRAINRUN_MAP_MEANDER_PERCENT = 12;

/** Dispersion individuelle d'un nœud, exprimée en **fraction de l'écart entre deux voies** — et non
 * en pixels. C'est ce qui rend la garantie de non-chevauchement indépendante de la largeur d'écran
 * et du nombre de nœuds : deux voisins ne peuvent se rapprocher que de `2 x ratio` de leur écart,
 * il en reste donc toujours `1 - 2 x ratio` (76 %) entre leurs centres. */
export const BRAINRUN_MAP_LANE_DRIFT_RATIO = 0.12;

/** Part de cette dispersion conservée par les nœuds de bord : ils longent le bord en ondulant
 * légèrement, sans s'en détacher, tandis que les nœuds centraux prennent toute l'amplitude. */
export const BRAINRUN_MAP_EDGE_DRIFT_FACTOR = 0.35;

/** Amplitude verticale (px), identique pour tous les nœuds. Doit rester bien en dessous de la
 * moitié de l'écart entre rangées (`gap-10` = 40px dans BrainrunMap.vue) : deux rangées voisines
 * peuvent se rapprocher du double de cette valeur. */
export const BRAINRUN_MAP_DRIFT_Y = 10;

export type BrainrunMapDrift = {
  /** Décalage horizontal, en % de la largeur de la rangée (appliqué via `left`, pas `translateX`,
   * dont les pourcentages se rapporteraient à la taille du nœud lui-même). */
  xPercent: number;
  /** Décalage vertical, en pixels. */
  yPx: number;
};

export type BrainrunMapLayout = {
  /** Décalage de chaque rangée entière, en % de la largeur d'une rangée, indexé par numéro de
   * rangée. Déplacer une rangée d'un bloc ne change aucun écart : jamais de collision. */
  rowShift: Map<number, number>;
  /** Dispersion de chaque nœud, indexée par `"row:col"`. */
  nodeDrift: Map<string, BrainrunMapDrift>;
};

/** Hash déterministe → [0, 1). FNV-1a, largement suffisant pour du placement décoratif. */
function hash01(seed: string): number {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return ((hash >>> 0) % 100000) / 100000;
}

/**
 * Positions de toutes les rangées et de tous les nœuds d'une carte.
 *
 * Garanties (cf. tests) :
 * - deux nœuds voisins d'une rangée conservent toujours au moins `1 - 2 x LANE_DRIFT_RATIO` de leur
 *   écart nominal, quelle que soit la largeur de la rangée ou de l'écran ;
 * - rien ne dépasse du conteneur : `ROW_SPAN + 2 x MEANDER x ROW_SPAN / 100` reste sous 100 % ;
 * - même graine ⇒ mêmes positions.
 */
export function computeBrainrunMapLayout(
  rows: { row: number; cols: number[] }[],
  seed: string,
): BrainrunMapLayout {
  const rowShift = new Map<number, number>();
  const nodeDrift = new Map<string, BrainrunMapDrift>();

  // Phases tirées de la graine : sans elles, toutes les cartes serpenteraient à l'identique.
  const phaseA = hash01(`${seed}|meander-a`) * Math.PI * 2;
  const phaseB = hash01(`${seed}|meander-b`) * Math.PI * 2;

  for (const { row, cols } of rows) {
    rowShift.set(
      row,
      (Math.sin(row * 0.62 + phaseA) * 0.62 + Math.sin(row * 1.43 + phaseB) * 0.38) *
        BRAINRUN_MAP_MEANDER_PERCENT,
    );

    const lastIndex = cols.length - 1;
    // Écart nominal entre deux voies, en % de la largeur de la rangée.
    const laneGapPercent = lastIndex <= 0 ? 0 : 100 / lastIndex;

    cols.forEach((col, index) => {
      // 0 sur les nœuds de bord, 1 au centre de la rangée.
      const centrality = lastIndex === 0 ? 0 : 1 - Math.abs((2 * index) / lastIndex - 1);
      const amplitude =
        laneGapPercent *
        BRAINRUN_MAP_LANE_DRIFT_RATIO *
        (BRAINRUN_MAP_EDGE_DRIFT_FACTOR + centrality * (1 - BRAINRUN_MAP_EDGE_DRIFT_FACTOR));
      nodeDrift.set(`${row}:${col}`, {
        xPercent: (hash01(`${seed}|x|${row}|${col}`) * 2 - 1) * amplitude,
        yPx: (hash01(`${seed}|y|${row}|${col}`) * 2 - 1) * BRAINRUN_MAP_DRIFT_Y,
      });
    });
  }

  return { rowShift, nodeDrift };
}
