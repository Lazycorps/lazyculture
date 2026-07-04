import type { Ref } from "vue";
import type { BrainrunBossMalusId } from "#shared/brainrunBosses";
import { BRAINRUN_BOSS_QUESTION_TIME_MS } from "#shared/brainrun";

type Proposition = { id: number; value: string; img?: string };

const SWAP_INTERVAL_MS = 4000;
const SCRAMBLE_INTERVAL_MS = 1000;
const SCRAMBLE_REVERT_MS = 700;
const SCRAMBLE_RATIO = 0.2;
const MAX_BLUR_PX = 6;
const BLUR_CLEAR_AT_MS = 3000;
const RANDOM_LETTERS = "abcdefghijklmnopqrstuvwxyz";

/**
 * Effets d'affichage des malus de boss Brainrun (shared/brainrunBosses.ts). Transforme
 * uniquement le texte/l'ordre/la présence des propositions affichées — la soumission de
 * réponse continue de reposer sur les proposition.id d'origine, jamais modifiés ici.
 */
export function useBrainrunBossMalus(options: {
  malus: Ref<BrainrunBossMalusId | undefined>;
  propositions: Ref<Proposition[]>;
  remainingMs: Ref<number>;
}) {
  const { malus, propositions, remainingMs } = options;

  const swapOrder = ref<Proposition[]>([...propositions.value]);
  const hiddenId = ref<number | null>(null);
  const scrambledValues = ref<Record<number, string>>({});
  const swapPaused = ref(false);

  let swapInterval: ReturnType<typeof setInterval> | null = null;
  let scrambleInterval: ReturnType<typeof setInterval> | null = null;
  let scrambleRevertTimeout: ReturnType<typeof setTimeout> | null = null;

  function clearTimers() {
    if (swapInterval) clearInterval(swapInterval);
    if (scrambleInterval) clearInterval(scrambleInterval);
    if (scrambleRevertTimeout) clearTimeout(scrambleRevertTimeout);
    swapInterval = null;
    scrambleInterval = null;
    scrambleRevertTimeout = null;
  }

  function swapOnce() {
    if (swapPaused.value || swapOrder.value.length < 2) return;
    const arr = [...swapOrder.value];
    const i = Math.floor(Math.random() * arr.length);
    let j = Math.floor(Math.random() * arr.length);
    while (j === i) j = Math.floor(Math.random() * arr.length);
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
    swapOrder.value = arr;
  }

  function scrambleOnce() {
    const next: Record<number, string> = {};
    for (const p of propositions.value) {
      const chars = p.value.split("");
      const letterIndexes = chars
        .map((c, i) => (/[a-zA-Z]/.test(c) ? i : -1))
        .filter((i) => i >= 0);
      const swapCount = Math.round(letterIndexes.length * SCRAMBLE_RATIO);
      const shuffled = [...letterIndexes].sort(() => Math.random() - 0.5).slice(0, swapCount);
      for (const i of shuffled) {
        chars[i] = RANDOM_LETTERS[Math.floor(Math.random() * RANDOM_LETTERS.length)]!;
      }
      next[p.id] = chars.join("");
    }
    scrambledValues.value = next;
    if (scrambleRevertTimeout) clearTimeout(scrambleRevertTimeout);
    scrambleRevertTimeout = setTimeout(() => {
      scrambledValues.value = {};
    }, SCRAMBLE_REVERT_MS);
  }

  function setupForCurrentQuestion() {
    clearTimers();
    swapOrder.value = [...propositions.value];
    hiddenId.value = null;
    scrambledValues.value = {};
    swapPaused.value = false;

    if (malus.value === "hidden_answer" && propositions.value.length > 0) {
      const pick = propositions.value[Math.floor(Math.random() * propositions.value.length)]!;
      hiddenId.value = pick.id;
    } else if (malus.value === "swap_answers") {
      swapInterval = setInterval(swapOnce, SWAP_INTERVAL_MS);
    } else if (malus.value === "scrambling_letters") {
      scrambleInterval = setInterval(scrambleOnce, SCRAMBLE_INTERVAL_MS);
    }
  }

  watch([malus, propositions], setupForCurrentQuestion, { immediate: true });
  onBeforeUnmount(clearTimers);

  const displayPropositions = computed<Proposition[]>(() => {
    const base = malus.value === "swap_answers" ? swapOrder.value : propositions.value;
    return base.map((p) => {
      if (malus.value === "hidden_answer" && p.id === hiddenId.value) {
        return { ...p, value: "???" };
      }
      if (malus.value === "scrambling_letters" && scrambledValues.value[p.id]) {
        return { ...p, value: scrambledValues.value[p.id]! };
      }
      return p;
    });
  });

  const answerBlurPx = computed(() => {
    if (malus.value !== "progressive_blur") return 0;
    if (remainingMs.value <= BLUR_CLEAR_AT_MS) return 0;
    const progress =
      (remainingMs.value - BLUR_CLEAR_AT_MS) / (BRAINRUN_BOSS_QUESTION_TIME_MS - BLUR_CLEAR_AT_MS);
    return Math.max(0, Math.min(MAX_BLUR_PX, MAX_BLUR_PX * progress));
  });

  const mirrorAnswers = computed(() => malus.value === "mirror_answers");

  return {
    displayPropositions,
    answerBlurPx,
    mirrorAnswers,
    pauseSwap: () => (swapPaused.value = true),
    resumeSwap: () => (swapPaused.value = false),
  };
}
