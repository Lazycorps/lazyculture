import { describe, it, expect } from "vite-plus/test";
import {
  BRAINRUN_MAP_DRIFT_Y,
  BRAINRUN_MAP_EDGE_DRIFT_FACTOR,
  BRAINRUN_MAP_LANE_DRIFT_RATIO,
  BRAINRUN_MAP_MEANDER_PERCENT,
  BRAINRUN_MAP_ROW_SPAN_PERCENT,
  computeBrainrunMapLayout,
} from "./brainrunMapLayout";

/** Silhouettes représentatives (cf. pickBrainrunMidFloorWidths) : rangée Neutre seule, rangées
 * étroites et rangées larges. */
const SILHOUETTES = [
  [1, 3, 2, 3, 4, 4, 3, 2, 3, 1],
  [3, 4, 3, 2, 2, 2, 3, 3, 1],
  [1, 3, 3, 4, 4, 3, 3, 3, 3, 1],
];

const toRows = (widths: number[]) =>
  widths.map((width, idx) => ({
    row: idx + 1,
    cols: Array.from({ length: width }, (_, col) => col),
  }));

describe("computeBrainrunMapLayout", () => {
  it("never lets two neighbours in a row overlap, whatever the row width", () => {
    for (const widths of SILHOUETTES) {
      const rows = toRows(widths);
      for (let seed = 0; seed < 200; seed++) {
        const { nodeDrift } = computeBrainrunMapLayout(rows, `seed-${seed}`);
        for (const { row, cols } of rows) {
          if (cols.length < 2) continue;
          // Écart nominal entre deux voies, en % de la largeur de la rangée.
          const laneGap = 100 / (cols.length - 1);
          for (let i = 1; i < cols.length; i++) {
            const left = nodeDrift.get(`${row}:${cols[i - 1]}`)!;
            const right = nodeDrift.get(`${row}:${cols[i]}`)!;
            const actual = laneGap + (right.xPercent - left.xPercent);
            // La dispersion est bornée en fraction de l'écart : il en reste toujours (1 - 2r).
            expect(actual).toBeGreaterThanOrEqual(
              laneGap * (1 - 2 * BRAINRUN_MAP_LANE_DRIFT_RATIO) - 1e-9,
            );
          }
        }
      }
    }
  });

  it("keeps the whole map inside its container", () => {
    // Largeur d'une rangée + serpentement maximal des deux côtés, ramenés en % du conteneur.
    const meanderPercentOfContainer =
      (BRAINRUN_MAP_MEANDER_PERCENT * BRAINRUN_MAP_ROW_SPAN_PERCENT) / 100;
    expect(BRAINRUN_MAP_ROW_SPAN_PERCENT + 2 * meanderPercentOfContainer).toBeLessThanOrEqual(100);

    const rows = toRows(SILHOUETTES[0]!);
    for (let seed = 0; seed < 200; seed++) {
      const { rowShift } = computeBrainrunMapLayout(rows, `seed-${seed}`);
      for (const shift of rowShift.values()) {
        expect(Math.abs(shift)).toBeLessThanOrEqual(BRAINRUN_MAP_MEANDER_PERCENT + 1e-9);
      }
    }
  });

  it("spreads every row over the full width, whatever its node count", () => {
    // Garantie portée par le CSS (justify-between sur une largeur fixe) : ce test verrouille le
    // fait que la dispersion ne peut pas la défaire — un nœud de bord reste près de son bord.
    const rows = toRows([2, 4]);
    for (let seed = 0; seed < 200; seed++) {
      const { nodeDrift } = computeBrainrunMapLayout(rows, `seed-${seed}`);
      // Rangée de 2 : voies à 0 % et 100 % de la largeur ; la dérive de bord reste marginale.
      const maxEdgeDrift = 100 * BRAINRUN_MAP_LANE_DRIFT_RATIO * BRAINRUN_MAP_EDGE_DRIFT_FACTOR;
      expect(Math.abs(nodeDrift.get("1:0")!.xPercent)).toBeLessThanOrEqual(maxEdgeDrift + 1e-9);
      expect(Math.abs(nodeDrift.get("1:1")!.xPercent)).toBeLessThanOrEqual(maxEdgeDrift + 1e-9);
    }
  });

  it("moves edge nodes less than central ones, on average", () => {
    const rows = [{ row: 1, cols: [0, 1, 2, 3] }];
    let edgeTotal = 0;
    let centreTotal = 0;
    for (let seed = 0; seed < 400; seed++) {
      const { nodeDrift } = computeBrainrunMapLayout(rows, `seed-${seed}`);
      edgeTotal +=
        Math.abs(nodeDrift.get("1:0")!.xPercent) + Math.abs(nodeDrift.get("1:3")!.xPercent);
      centreTotal +=
        Math.abs(nodeDrift.get("1:1")!.xPercent) + Math.abs(nodeDrift.get("1:2")!.xPercent);
    }
    expect(centreTotal).toBeGreaterThan(edgeTotal);
  });

  it("stays within the declared vertical amplitude", () => {
    const rows = toRows(SILHOUETTES[0]!);
    for (let seed = 0; seed < 200; seed++) {
      const { nodeDrift } = computeBrainrunMapLayout(rows, `seed-${seed}`);
      for (const drift of nodeDrift.values()) {
        expect(Math.abs(drift.yPx)).toBeLessThanOrEqual(BRAINRUN_MAP_DRIFT_Y);
      }
    }
  });

  it("meanders rather than drifting one way, and differs from one map to the next", () => {
    const rows = toRows(SILHOUETTES[0]!);
    const shifts = [...computeBrainrunMapLayout(rows, "carte-A").rowShift.values()];
    // Un vrai serpentement change de sens en montant, il ne penche pas d'un seul côté.
    expect(Math.min(...shifts)).toBeLessThan(0);
    expect(Math.max(...shifts)).toBeGreaterThan(0);

    expect(computeBrainrunMapLayout(rows, "carte-A")).toEqual(
      computeBrainrunMapLayout(rows, "carte-A"),
    );
    expect([...computeBrainrunMapLayout(rows, "carte-B").rowShift.values()]).not.toEqual(shifts);
  });
});
