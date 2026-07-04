<template>
  <div class="w-full max-w-xl mx-auto py-2 select-none">
    <UCard
      class="shadow-glass bg-[#111827]/70 backdrop-blur-xl border border-white/10 rounded-2xl"
      :ui="{ body: 'p-2' }"
    >
      <!-- Non-authenticated user view -->
      <template v-if="!user">
        <div class="text-center py-10 px-6 space-y-6">
          <div
            class="w-16 h-16 rounded-full bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-3xl text-violet-400 mx-auto animate-pulse"
          >
            🧠
          </div>
          <div class="space-y-2">
            <h2 class="text-2xl font-black font-display text-white tracking-wide">Brainrun</h2>
            <p class="text-sm text-gray-400 max-w-sm mx-auto">
              Grimpez les 3 actes, affrontez les Elites et les Boss, et survivez le plus loin
              possible. Connectez-vous pour jouer !
            </p>
          </div>
          <UButton
            to="/login"
            color="primary"
            size="lg"
            block
            icon="i-heroicons-key"
            class="font-extrabold uppercase font-display tracking-wider py-3"
          >
            Se connecter et jouer
          </UButton>
        </div>
      </template>

      <!-- Authenticated player view -->
      <template v-else>
        <!-- Lobby : point d'entrée par défaut (solde de PS, lancer/reprendre une run, accès aux
             talents) — la run elle-même ne s'affiche qu'une fois "Nouvelle run"/"Reprendre" cliqué. -->
        <BrainrunLobby
          v-if="view === 'lobby'"
          :run="run"
          :meta-progress="meta.metaProgress.value"
          :loading="loading"
          @start="handleStartNewRun"
          @resume="view = 'run'"
        />

        <template v-else>
          <!-- Game Header (Act/Room progress, HP hearts, gold) -->
          <div class="flex justify-between items-center mb-4">
            <div class="flex items-center gap-2">
              <h2
                class="text-xl font-black font-display text-white tracking-wide flex items-center"
              >
                <UIcon
                  name="i-heroicons-bolt-solid"
                  class="mr-2 text-violet-400 text-2xl animate-pulse"
                />
                Acte {{ run?.currentAct ?? 1 }}
              </h2>
              <span
                class="text-xs font-bold font-display text-gray-400 bg-white/5 border border-white/10 rounded-full px-2 py-0.5"
              >
                {{ run?.currentSequence ?? 1 }} / {{ roomsPerAct }}
              </span>
            </div>

            <div class="flex items-center space-x-3">
              <div class="flex items-center text-amber-400 font-black font-display text-sm">
                <UIcon name="i-heroicons-currency-dollar" class="mr-0.5" />
                {{ run?.gold ?? 0 }}
              </div>
              <div class="flex items-center">
                <UIcon
                  v-for="hp in run?.maxHealthPoint ?? 3"
                  :key="hp"
                  name="i-heroicons-heart-solid"
                  class="text-2xl transition-all duration-300 ml-1"
                  :class="
                    hp > (run?.healthPoint ?? 0)
                      ? 'text-slate-700'
                      : 'text-rose-500 animate-heart-pulse'
                  "
                />
              </div>
            </div>
          </div>

          <!-- Reliques possédées (gauche) et emplacements de consommables (droite, 3 slots fixes,
             remplis de gauche à droite au fur et à mesure des objets obtenus). -->
          <div class="flex items-center justify-between gap-2 mt-2">
            <div class="flex flex-wrap gap-1.5">
              <div
                v-for="relic in ownedRelics"
                :key="relic.id"
                :title="`${relic.name} — ${relic.description}`"
                class="w-7 h-7 rounded-full bg-violet-500/10 border border-violet-500/30 flex items-center justify-center text-violet-400 text-sm"
              >
                <UIcon :name="relic.icon" />
              </div>
            </div>
            <div class="flex items-center gap-1.5">
              <div
                v-for="(consumable, index) in consumableSlots"
                :key="consumable?.id ?? `empty-${index}`"
                :title="consumable ? `${consumable.name} — ${consumable.description}` : undefined"
                class="relative w-7 h-7 rounded-full flex items-center justify-center text-sm"
                :class="
                  consumable
                    ? 'bg-amber-500/10 border border-amber-500/30 text-amber-400'
                    : 'bg-white/5 border border-dashed border-white/10'
                "
              >
                <UIcon v-if="consumable" :name="consumable.icon" />
                <span
                  v-if="consumable && consumable.count > 1"
                  class="absolute -bottom-1 -right-1 text-[9px] font-black font-display bg-slate-900 border border-white/10 rounded-full w-3.5 h-3.5 flex items-center justify-center text-white"
                >
                  {{ consumable.count }}
                </span>
              </div>
            </div>
          </div>

          <!-- Combat de boss : remplace le séparateur habituel par la barre de PV du boss +
             les dégâts qu'infligerait une réponse correcte à cet instant (décroissants). -->
          <div v-if="isBossRoom" class="flex items-center gap-2 mt-3">
            <UIcon name="i-heroicons-shield-exclamation" class="text-rose-400 text-base shrink-0" />
            <div
              class="flex-1 h-2.5 bg-slate-950/80 rounded-full border border-white/5 overflow-hidden shadow-inner"
            >
              <div
                class="h-full bg-gradient-to-r from-rose-600 to-orange-500 rounded-full transition-all duration-500"
                :style="{ width: `${bossHealthPercent}%` }"
              ></div>
            </div>
            <span class="text-[11px] font-bold text-gray-400 font-display shrink-0">
              {{ bossHealthPoint }}/{{ bossMaxHealthPoint }}
            </span>
            <span
              v-if="currentRoom?.status === 'ACTIVE'"
              class="flex items-center gap-0.5 text-xs font-black font-display shrink-0 tabular-nums"
              :class="potentialDamage > 0 ? 'text-amber-400' : 'text-rose-400 animate-pulse'"
            >
              <UIcon name="i-heroicons-bolt" />
              -{{ potentialDamage }}
            </span>
          </div>
          <!-- Identité de l'ennemi Standard/Elite affronté (nom uniquement, pas de barre de PV). -->
          <div
            v-else-if="currentEnemyName && currentRoom?.status === 'ACTIVE'"
            class="flex items-center justify-center gap-1.5 mt-3 mb-1"
          >
            <UIcon name="i-heroicons-sparkles" class="text-violet-400 text-sm shrink-0" />
            <span class="text-xs font-black font-display text-gray-300 tracking-wide">
              {{ currentEnemyName }}
            </span>
          </div>
          <hr v-else class="border-white/5 my-3" />

          <!-- Run active : choix ponctuel, question en cours, ou état de chargement.
             holdOnFeedback maintient cet écran tant que BrainrunQuestionRunner affiche encore
             le feedback de la dernière question (correct/incorrect), même si côté serveur la
             salle est déjà CLEARED/FAILED — la transition n'a lieu qu'au clic sur "Continuer". -->
          <template v-if="isRunActive || holdOnFeedback">
            <div :class="isBossRoom ? 'pt-2 pb-4' : 'py-4'">
              <!-- Boutique -->
              <BrainrunShop
                v-if="currentRoom?.type === 'SHOP' && currentRoom.status === 'ACTIVE'"
                :offers="currentRoom.offers ?? []"
                :gold="run?.gold ?? 0"
                :loading="loading"
                @buy="(index: number) => brainrun.buyShopItem(index)"
                @leave="brainrun.leaveShop()"
              />

              <!-- Événement -->
              <BrainrunEvent
                v-else-if="currentRoom?.type === 'EVENT' && currentRoom.status === 'ACTIVE'"
                :event-id="currentRoom.eventId"
                :loading="loading"
                @choose="(index: number) => brainrun.resolveEvent(index)"
              />

              <!-- Écran de choix -->
              <div v-else-if="awaitingChoice" class="space-y-3">
                <p
                  class="text-center text-xs font-bold text-gray-400 uppercase tracking-wider font-display mb-4"
                >
                  Choisissez la prochaine salle
                </p>
                <UButton
                  v-for="option in currentChoiceTypes"
                  :key="option"
                  size="lg"
                  block
                  variant="soft"
                  :loading="loading"
                  class="font-black font-display uppercase tracking-wide py-3.5 justify-start"
                  @click="selectChoice(option)"
                >
                  <UIcon :name="roomTypeIcon(option)" class="mr-2 text-lg" />
                  {{ roomTypeLabel(option) }}
                </UButton>
              </div>

              <!-- Question en cours -->
              <BrainrunQuestionRunner
                v-else-if="currentQuestion || holdOnFeedback"
                :question="currentQuestion"
              />

              <!-- Récap de fin de salle (or gagné, PV perdus) -->
              <div v-else-if="roomRecap && !showBonusStep" class="text-center py-8 px-6 space-y-6">
                <div
                  class="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-3xl mx-auto"
                >
                  <UIcon :name="roomTypeIcon(roomRecap.type)" class="text-emerald-400" />
                </div>
                <div class="space-y-1">
                  <h3 class="text-lg font-black font-display text-white tracking-wide">
                    {{
                      roomRecap.enemyName
                        ? `${roomRecap.enemyName} vaincu`
                        : `${roomTypeLabel(roomRecap.type)} terminée`
                    }}
                  </h3>
                </div>
                <div class="grid grid-cols-2 gap-3 w-full max-w-sm mx-auto">
                  <div class="bg-white/5 border border-white/10 rounded-2xl p-3 text-center">
                    <p class="text-xl font-black font-display text-amber-400">
                      +{{ roomRecap.goldEarned }}
                    </p>
                    <p
                      class="text-[9px] font-bold text-gray-500 uppercase tracking-wider font-display mt-0.5"
                    >
                      Or gagné
                    </p>
                  </div>
                  <div class="bg-white/5 border border-white/10 rounded-2xl p-3 text-center">
                    <p
                      class="text-xl font-black font-display"
                      :class="roomRecap.heartsLost > 0 ? 'text-rose-400' : 'text-emerald-400'"
                    >
                      {{
                        roomRecap.heartsLost > 0
                          ? `-${roomRecap.heartsLost}`
                          : roomRecap.healed
                            ? "+1"
                            : "0"
                      }}
                    </p>
                    <p
                      class="text-[9px] font-bold text-gray-500 uppercase tracking-wider font-display mt-0.5"
                    >
                      {{ roomRecap.healed ? "PV regagnés" : "PV perdus" }}
                    </p>
                  </div>
                </div>
                <UButton
                  size="lg"
                  color="primary"
                  block
                  :loading="loading"
                  class="font-black font-display uppercase tracking-widest py-3.5 max-w-sm mx-auto"
                  @click="handleRecapContinue"
                >
                  Continuer
                </UButton>
              </div>

              <!-- Bonus post-combat (Elite/Boss uniquement) -->
              <BrainrunBonusSelect
                v-else-if="showBonusStep"
                :offers="currentRoom?.offers ?? []"
                :loading="loading"
                @pick="handleBonusPick"
                @skip="handleBonusSkip"
              />

              <div v-else class="text-center py-10">
                <UIcon name="i-heroicons-arrow-path" class="animate-spin text-2xl text-gray-500" />
              </div>
            </div>
          </template>

          <!-- Fin de run (victoire ou défaite) -->
          <template v-else-if="run">
            <div class="text-center py-4 md:py-6 px-4 space-y-4 flex flex-col items-center">
              <div class="relative">
                <div
                  class="absolute inset-0 blur-xl rounded-full scale-125"
                  :class="run.status === 'WON' ? 'bg-amber-500/20' : 'bg-rose-500/20'"
                ></div>
                <div
                  class="relative w-16 h-16 rounded-full flex items-center justify-center text-3xl border"
                  :class="
                    run.status === 'WON'
                      ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                      : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                  "
                >
                  {{ run.status === "WON" ? "🏆" : "💀" }}
                </div>
              </div>

              <div class="space-y-1">
                <h3 class="text-xl font-black font-display text-white tracking-wide">
                  {{ run.status === "WON" ? "Run terminée !" : "Run échouée" }}
                </h3>
                <p class="text-xs text-gray-400 max-w-sm">
                  {{
                    run.status === "WON"
                      ? "Bravo, vous avez survécu aux 3 actes de Brainrun !"
                      : "Vous avez épuisé tous vos points de vie. Retentez votre chance !"
                  }}
                </p>
              </div>

              <div class="grid grid-cols-3 gap-3 w-full max-w-sm pt-2">
                <div class="bg-white/5 border border-white/10 rounded-2xl p-3 text-center">
                  <p class="text-xl font-black font-display text-amber-400">{{ run.gold }}</p>
                  <p
                    class="text-[9px] font-bold text-gray-500 uppercase tracking-wider font-display mt-0.5"
                  >
                    Or récolté
                  </p>
                </div>
                <div class="bg-white/5 border border-white/10 rounded-2xl p-3 text-center">
                  <p class="text-xl font-black font-display text-amber-400">
                    +{{ run.xpEarned ?? 0 }} XP
                  </p>
                  <p
                    class="text-[9px] font-bold text-gray-500 uppercase tracking-wider font-display mt-0.5"
                  >
                    Expérience
                  </p>
                </div>
                <div class="bg-white/5 border border-white/10 rounded-2xl p-3 text-center">
                  <p class="text-xl font-black font-display text-violet-400">
                    +{{ run.knowledgePointsEarned ?? 0 }}
                  </p>
                  <p
                    class="text-[9px] font-bold text-gray-500 uppercase tracking-wider font-display mt-0.5"
                  >
                    Points de Savoir
                  </p>
                </div>
              </div>

              <div class="pt-3 w-full max-w-sm">
                <UButton
                  size="lg"
                  color="primary"
                  block
                  icon="i-heroicons-home"
                  class="font-black font-display uppercase tracking-widest py-3.5"
                  @click="backToLobby"
                >
                  Retour au lobby
                </UButton>
              </div>
            </div>
          </template>
        </template>
      </template>
    </UCard>
  </div>
</template>

<script setup lang="ts">
import {
  BRAINRUN_BOSS_QUESTION_TIME_MS,
  BRAINRUN_ROOMS_PER_ACT,
  brainrunPotentialBossDamage,
  type BrainrunRoomType,
} from "#shared/brainrun";
import {
  BRAINRUN_CONSUMABLES,
  BRAINRUN_RELICS,
  type BrainrunConsumableId,
  type BrainrunRelicId,
} from "#shared/brainrunItems";
import { getBrainrunEnemyById } from "#shared/brainrunEnemies";
import { useUserStore } from "~/stores/userStore";

const userStore = useUserStore();
await userStore.fetchUser();
const user = computed(() => userStore.user);

const brainrun = useBrainrunSession();
const meta = useBrainrunMeta();
const showBottomNav = useState("showBottomNav", () => true);
// Piloté par BrainrunQuestionRunner : reste à true tant qu'il affiche encore le feedback
// de la dernière question d'une salle, pour ne pas basculer vers le récap/l'écran de fin
// tant que le joueur n'a pas cliqué sur "Continuer".
const holdOnFeedback = useState("brainrun-hold-on-feedback", () => false);
// true entre le récap de fin de salle Elite/Boss et la résolution du bonus (relique/consommable).
const showBonusStep = ref(false);
// Le Lobby est le point d'entrée par défaut : la run ne s'affiche qu'après "Nouvelle run"/"Reprendre".
const view = ref<"lobby" | "run">("lobby");

const roomsPerAct = BRAINRUN_ROOMS_PER_ACT;

if (user.value) {
  await Promise.all([brainrun.fetchCurrent(), meta.fetchMeta()]);
}

const run = brainrun.run;
const currentQuestion = brainrun.currentQuestion;
const currentRoom = brainrun.currentRoom;
const awaitingChoice = brainrun.awaitingChoice;
const loading = brainrun.loading;
const isRunActive = brainrun.isRunActive;
const currentChoiceTypes = computed(() => currentRoom.value?.choiceTypes ?? []);

// Barre de PV du boss + dégâts potentiels (remplace le séparateur habituel pendant un combat
// de boss) : le décompte est celui tenu par BrainrunQuestionRunner, partagé via useState.
const isBossRoom = computed(() => currentRoom.value?.type === "BOSS");
// Nom de l'ennemi Standard/Elite affronté (Boss non concerné, cf. shared/brainrunEnemies.ts).
const currentEnemyName = computed(
  () => getBrainrunEnemyById(currentRoom.value?.enemyId)?.name ?? null,
);
const bossHealthPoint = computed(() => currentRoom.value?.bossHealthPoint ?? 0);
const bossMaxHealthPoint = computed(() => currentRoom.value?.bossMaxHealthPoint ?? 1);
const bossHealthPercent = computed(() =>
  Math.max(0, Math.min(100, (bossHealthPoint.value / bossMaxHealthPoint.value) * 100)),
);
const bossRemainingMs = useState(
  "brainrun-boss-remaining-ms",
  () => BRAINRUN_BOSS_QUESTION_TIME_MS,
);
const potentialDamage = computed(() =>
  brainrunPotentialBossDamage(BRAINRUN_BOSS_QUESTION_TIME_MS - bossRemainingMs.value),
);

const roomRecap = computed(() => {
  const room = brainrun.currentRoom.value;
  if (!room || room.status !== "CLEARED" || !room.type) return null;
  const heartsLost = room.responses.reduce((sum, r) => sum + (r.hpLoss ?? 0), 0);
  return {
    type: room.type,
    goldEarned: room.goldEarned,
    heartsLost,
    healed: room.type === "REST",
    enemyName: getBrainrunEnemyById(room.enemyId)?.name ?? null,
  };
});

const ownedRelics = computed(() =>
  (run.value?.relics ?? []).map((id) => BRAINRUN_RELICS[id as BrainrunRelicId]),
);

// Icônes seules (max 3, une par type possédé) alignées à droite sur la même ligne que les
// reliques ; les boutons d'usage pendant une question restent dans BrainrunQuestionRunner.
const ownedConsumables = computed(() => {
  const consumables = run.value?.consumables ?? {};
  return (Object.keys(BRAINRUN_CONSUMABLES) as BrainrunConsumableId[])
    .filter((id) => (consumables[id] ?? 0) > 0)
    .map((id) => ({ ...BRAINRUN_CONSUMABLES[id], count: consumables[id]! }))
    .slice(0, 3);
});

const CONSUMABLE_SLOT_COUNT = 3;
// 3 emplacements fixes (même taille que l'icône finale) : vides tant qu'aucun objet ne les
// occupe, remplis de gauche à droite au fur et à mesure des nouveaux objets obtenus.
const consumableSlots = computed(() =>
  Array.from({ length: CONSUMABLE_SLOT_COUNT }, (_, i) => ownedConsumables.value[i] ?? null),
);

watch(
  () =>
    view.value === "run" && isRunActive.value && !awaitingChoice.value && !!currentQuestion.value,
  (inQuestion) => {
    showBottomNav.value = !inQuestion;
  },
  { immediate: true },
);

onBeforeUnmount(() => {
  showBottomNav.value = true;
});

async function handleStartNewRun() {
  await brainrun.startNewRun();
  view.value = "run";
}

function backToLobby() {
  view.value = "lobby";
  meta.fetchMeta();
}

async function selectChoice(option: BrainrunRoomType) {
  await brainrun.chooseOption(option);
}

/** "Continuer" du récap : bascule vers l'écran de bonus si la salle Elite/Boss en propose un
 * non résolu, sinon avance directement vers la salle suivante. */
async function handleRecapContinue() {
  if (currentRoom.value?.offersRequireChoice && !currentRoom.value.offersResolved) {
    showBonusStep.value = true;
    return;
  }
  await brainrun.acknowledgeRoom();
}

async function handleBonusPick(id: string) {
  await brainrun.resolveBonus(id);
  showBonusStep.value = false;
  await brainrun.acknowledgeRoom();
}

async function handleBonusSkip() {
  await brainrun.resolveBonus("SKIP");
  showBonusStep.value = false;
  await brainrun.acknowledgeRoom();
}

function roomTypeLabel(type: BrainrunRoomType): string {
  switch (type) {
    case "STANDARD":
      return "Combat";
    case "ELITE":
      return "Elite";
    case "BOSS":
      return "Boss";
    case "REST":
      return "Repos (+1 PV)";
    case "SHOP":
      return "Boutique";
    case "EVENT":
      return "Événement";
  }
}

function roomTypeIcon(type: BrainrunRoomType): string {
  switch (type) {
    case "STANDARD":
      return "i-heroicons-bolt";
    case "ELITE":
      return "i-heroicons-fire";
    case "BOSS":
      return "i-heroicons-shield-exclamation";
    case "REST":
      return "i-heroicons-heart";
    case "SHOP":
      return "i-heroicons-shopping-bag";
    case "EVENT":
      return "i-heroicons-question-mark-circle";
  }
}
</script>

<style scoped>
/* Page-specific styles if any */
</style>
