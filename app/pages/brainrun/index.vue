<template>
  <div
    class="w-full max-w-xl mx-auto py-2 select-none"
    @click="
      openedRelicId = null;
      openedConsumableSlot = null;
    "
  >
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
          <BrainrunDebugPanel />

          <!-- Rappel visible tant que la run a été touchée par le debug (cf. run.isDebugRun) :
             aucun XP/pièce/Point de Savoir ne sera gagné, ne compte pas dans les achievements. -->
          <p
            v-if="run?.isDebugRun"
            class="text-center text-[10px] font-black font-display uppercase tracking-wider text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-full py-1 mb-2"
          >
            Run de debug — aucun gain persistant
          </p>

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
                {{ run?.currentRow ?? 1 }} / {{ roomsPerAct }}
              </span>
            </div>

            <div class="flex items-center space-x-3">
              <div class="flex items-center text-amber-400 font-black font-display text-sm">
                <UIcon name="i-heroicons-currency-dollar" class="mr-0.5" />
                {{ run?.gold ?? 0 }}
              </div>
              <!-- Grille 4 colonnes : tient sur une ligne jusqu'à 4 Pv max (cas courant), passe
                   automatiquement sur une 2e ligne au-delà (jusqu'à 8, relique Cœur Supplémentaire) —
                   pas de logique conditionnelle, la grille gère seule le retour à la ligne. -->
              <div class="grid grid-cols-4 gap-0.5 ml-1">
                <UIcon
                  v-for="hp in run?.maxHealthPoint ?? 3"
                  :key="hp"
                  name="i-heroicons-heart-solid"
                  class="text-lg transition-all duration-300"
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
             5 avec la relique Sac à Dos — chaque exemplaire prend son propre emplacement, remplis
             de gauche à droite au fur et à mesure des objets obtenus, sans compteur x2/x3).
             Seul un emplacement occupé a une action au clic (bouton "Jeter" dans l'infobulle) —
             l'usage d'un consommable pendant une question passe par un bouton dédié dans
             BrainrunQuestionRunner. -->
          <div class="flex items-center justify-between gap-2 mt-2">
            <div class="flex flex-wrap gap-1.5">
              <div v-for="relic in ownedRelics" :key="relic.id" class="relative">
                <button
                  type="button"
                  :title="`${relic.name} — ${relic.description}`"
                  class="w-7 h-7 rounded-full bg-violet-500/10 border border-violet-500/30 flex items-center justify-center text-violet-400 text-sm"
                  @click.stop="openedRelicId = openedRelicId === relic.id ? null : relic.id"
                >
                  <UIcon :name="relic.icon" />
                </button>
                <div
                  v-if="openedRelicId === relic.id"
                  class="absolute z-20 top-full left-0 mt-2 w-48 bg-slate-900 border border-violet-500/30 rounded-xl p-2.5 shadow-xl text-left"
                >
                  <p class="text-[11px] font-black font-display text-white tracking-wide">
                    {{ relic.name }}
                  </p>
                  <p class="text-[10px] text-gray-400 leading-snug mt-0.5">
                    {{ relic.description }}
                  </p>
                </div>
              </div>
            </div>
            <div class="flex items-center gap-1.5 flex-wrap justify-end">
              <div
                v-for="(consumable, index) in consumableSlots"
                :key="index"
                :title="consumable ? `${consumable.name} — ${consumable.description}` : undefined"
                class="relative w-7 h-7 rounded-full flex items-center justify-center text-sm"
                :class="
                  consumable
                    ? 'bg-amber-500/10 border border-amber-500/30 text-amber-400'
                    : 'bg-white/5 border border-dashed border-white/10'
                "
                @click.stop="
                  consumable &&
                  (openedConsumableSlot = openedConsumableSlot === index ? null : index)
                "
              >
                <UIcon v-if="consumable" :name="consumable.icon" />
                <div
                  v-if="consumable && openedConsumableSlot === index"
                  class="absolute z-20 top-full right-0 mt-2 w-48 bg-slate-900 border border-amber-500/30 rounded-xl p-2.5 shadow-xl text-left space-y-2"
                >
                  <div>
                    <p class="text-[11px] font-black font-display text-white tracking-wide">
                      {{ consumable.name }}
                    </p>
                    <p class="text-[10px] text-gray-400 leading-snug mt-0.5">
                      {{ consumable.description }}
                    </p>
                  </div>
                  <button
                    type="button"
                    class="w-full text-[10px] font-black font-display uppercase tracking-wider text-rose-400 bg-rose-500/10 border border-rose-500/30 rounded-lg py-1.5 hover:bg-rose-500/20"
                    @click.stop="handleDiscardConsumable(consumable.id)"
                  >
                    Jeter
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Combat de boss : remplace le séparateur habituel par le nom du boss, sa barre de
             PV + les dégâts qu'infligerait une réponse correcte à cet instant (décroissants). -->
          <div v-if="isBossRoom" class="mt-3">
            <div v-if="currentBossName" class="flex items-center justify-center gap-1.5 mb-1.5">
              <UIcon name="i-heroicons-sparkles" class="text-rose-400 text-sm shrink-0" />
              <span class="text-xs font-black font-display text-gray-300 tracking-wide">
                {{ currentBossName }}
              </span>
            </div>
            <p
              v-if="bossRevivedFlash"
              class="text-center text-xs font-black font-display text-amber-400 uppercase tracking-wide mb-1.5 animate-pulse"
            >
              {{ currentBossName }} se relève !
            </p>
            <div class="flex items-center gap-2">
              <UIcon
                name="i-heroicons-shield-exclamation"
                class="text-rose-400 text-base shrink-0"
              />
              <div
                class="flex-1 h-2.5 bg-slate-950/80 rounded-full border border-white/5 overflow-hidden shadow-inner"
              >
                <div
                  class="h-full rounded-full transition-all duration-500"
                  :class="
                    bossRevivedFlash
                      ? 'bg-gradient-to-r from-amber-500 to-amber-300 animate-pulse'
                      : 'bg-gradient-to-r from-rose-600 to-orange-500'
                  "
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
              <!-- Relique Purge Thématique : bloque tout le reste tant que le thème à bannir
                   n'est pas choisi (cf. run.pendingThemeBanChoice côté serveur). -->
              <div v-if="pendingThemeBan" class="text-center py-6 px-2 space-y-5">
                <div class="space-y-1">
                  <h3 class="text-lg font-black font-display text-white tracking-wide">
                    Purge Thématique
                  </h3>
                  <p class="text-xs text-gray-400">
                    Choisissez un thème à bannir pour le reste de la run.
                  </p>
                </div>
                <div class="grid grid-cols-2 gap-2">
                  <button
                    v-for="theme in run?.availableThemesToBan ?? []"
                    :key="theme"
                    type="button"
                    :disabled="loading"
                    class="bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl p-3 text-xs font-black font-display text-white tracking-wide capitalize disabled:opacity-50"
                    @click="handleThemeBanPick(theme)"
                  >
                    {{ themeLabel(theme) }}
                  </button>
                </div>
              </div>

              <!-- Bibliothèque : se reposer (+1 PV) ou bannir un thème pour le reste de la run
                   (même règle que la relique Purge Thématique, cf. run.availableThemesToBan). -->
              <div
                v-else-if="currentRoom?.type === 'REST' && currentRoom.status === 'ACTIVE'"
                class="text-center py-6 px-2 space-y-5"
              >
                <template v-if="restBanMode">
                  <div class="space-y-1">
                    <h3 class="text-lg font-black font-display text-white tracking-wide">
                      Bannir un thème
                    </h3>
                    <p class="text-xs text-gray-400">
                      Choisissez un thème à bannir pour le reste de la run.
                    </p>
                  </div>
                  <div class="grid grid-cols-2 gap-2">
                    <button
                      v-for="theme in run?.availableThemesToBan ?? []"
                      :key="theme"
                      type="button"
                      :disabled="loading"
                      class="bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl p-3 text-xs font-black font-display text-white tracking-wide capitalize disabled:opacity-50"
                      @click="handleRestBanPick(theme)"
                    >
                      {{ themeLabel(theme) }}
                    </button>
                  </div>
                  <UButton
                    variant="ghost"
                    size="sm"
                    :disabled="loading"
                    class="font-bold font-display"
                    @click="restBanMode = false"
                  >
                    Retour
                  </UButton>
                </template>
                <template v-else>
                  <div
                    class="w-14 h-14 rounded-xl bg-sky-600/10 border border-sky-500/20 flex items-center justify-center text-3xl mx-auto"
                  >
                    <UIcon name="i-heroicons-building-library" class="text-sky-400" />
                  </div>
                  <div class="space-y-1">
                    <h3 class="text-lg font-black font-display text-white tracking-wide">
                      Bibliothèque
                    </h3>
                    <p class="text-xs text-gray-400 max-w-xs mx-auto">
                      Reposez-vous pour regagner un point de vie, ou bannissez un thème pour le
                      reste de la run.
                    </p>
                  </div>
                  <div class="grid grid-cols-1 gap-2 max-w-xs mx-auto">
                    <UButton
                      size="lg"
                      color="primary"
                      block
                      icon="i-heroicons-heart"
                      :loading="loading"
                      class="font-black font-display uppercase tracking-widest py-3"
                      @click="handleRestHeal"
                    >
                      Se reposer (+1 PV)
                    </UButton>
                    <UButton
                      size="lg"
                      variant="soft"
                      block
                      icon="i-heroicons-no-symbol"
                      :disabled="loading"
                      class="font-black font-display uppercase tracking-widest py-3"
                      @click="restBanMode = true"
                    >
                      Bannir un thème
                    </UButton>
                  </div>
                </template>
              </div>

              <!-- Librairie -->
              <BrainrunShop
                v-else-if="currentRoom?.type === 'SHOP' && currentRoom.status === 'ACTIVE'"
                :offers="currentRoom.offers ?? []"
                :gold="run?.gold ?? 0"
                :loading="loading"
                :consumables-full="consumableInventoryFull"
                @buy="(index: number) => brainrun.buyShopItem(index)"
                @leave="brainrun.leaveShop()"
              />

              <!-- Événement : reste affiché une fois CLEARED pour montrer le résultat (texte +
                   bouton Continuer) à la place du récap générique or/PV, cf. roomRecap ci-dessous
                   qui exclut désormais les salles EVENT. -->
              <BrainrunEvent
                v-else-if="
                  currentRoom?.type === 'EVENT' &&
                  (currentRoom.status === 'ACTIVE' || currentRoom.status === 'CLEARED')
                "
                :event-id="currentRoom.eventId"
                :status="currentRoom.status"
                :outcome="currentRoom.eventOutcome"
                :loading="loading"
                :gold="run?.gold ?? 0"
                @choose="(index: number) => brainrun.resolveEvent(index)"
                @continue="brainrun.acknowledgeRoom()"
              />

              <!-- Carte de l'acte : le joueur choisit vers quel nœud avancer. Les nœuds masqués
                   (type inconnu) sont révélés en les atteignant, ou à l'avance grâce à la
                   relique Prévoyance. -->
              <div v-else-if="awaitingChoice">
                <p
                  class="text-center text-xs font-bold text-gray-400 uppercase tracking-wider font-display mb-1"
                >
                  Choisissez votre chemin
                </p>
                <BrainrunMap
                  :map-nodes="mapNodes"
                  :current-row="run?.currentRow ?? 1"
                  :candidate-cols="candidateCols"
                  :loading="loading"
                  @select-node="selectNode"
                />
              </div>

              <!-- Transition d'entrée en combat (Standard/Elite/Boss) : présente l'adversaire,
                   bloquante, avant que la question ne devienne interactive. -->
              <BrainrunCombatIntro
                v-else-if="combatIntroType"
                :type="combatIntroType"
                :name="combatIntroName"
                @done="handleCombatIntroDone"
              />

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
                <div
                  v-if="roomRecap.bannedTheme"
                  class="bg-white/5 border border-white/10 rounded-2xl p-4 w-full max-w-sm mx-auto"
                >
                  <p class="text-lg font-black font-display text-white capitalize">
                    {{ themeLabel(roomRecap.bannedTheme) }}
                  </p>
                  <p
                    class="text-[9px] font-bold text-gray-500 uppercase tracking-wider font-display mt-0.5"
                  >
                    Thème banni pour le reste de la run
                  </p>
                </div>
                <div v-else class="grid grid-cols-2 gap-3 w-full max-w-sm mx-auto">
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
                  <div
                    class="bg-white/5 border border-white/10 rounded-2xl p-3 text-center transition-shadow"
                    :class="
                      roomRecap.specializationHealed
                        ? 'ring-2 ring-emerald-400/70 animate-pulse'
                        : ''
                    "
                  >
                    <p
                      class="text-xl font-black font-display"
                      :class="roomRecap.netHeartsChange < 0 ? 'text-rose-400' : 'text-emerald-400'"
                    >
                      {{
                        roomRecap.netHeartsChange > 0
                          ? `+${roomRecap.netHeartsChange}`
                          : roomRecap.netHeartsChange
                      }}
                    </p>
                    <p
                      class="text-[9px] font-bold text-gray-500 uppercase tracking-wider font-display mt-0.5"
                    >
                      {{
                        roomRecap.netHeartsChange > 0
                          ? "PV regagnés"
                          : roomRecap.netHeartsChange < 0
                            ? "PV perdus"
                            : "PV stables"
                      }}
                    </p>
                    <p
                      v-if="roomRecap.specializationHealed"
                      class="text-[9px] font-bold text-emerald-400 font-display mt-0.5"
                    >
                      Spécialisation !
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
                :consumables-full="consumableInventoryFull"
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
                  <p class="text-xl font-black font-display text-amber-400">
                    +{{ run.coinsEarned }}
                  </p>
                  <p
                    class="text-[9px] font-bold text-gray-500 uppercase tracking-wider font-display mt-0.5"
                  >
                    Pièces gagnées
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
} from "#shared/brainrun";
import {
  BRAINRUN_CONSUMABLES,
  BRAINRUN_RELICS,
  type BrainrunConsumableId,
  type BrainrunRelicId,
} from "#shared/brainrunItems";
import { getBrainrunEnemyById } from "#shared/brainrunEnemies";
import { getBrainrunBossById } from "#shared/brainrunBosses";
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
// Bibliothèque : bascule vers la grille de thèmes tant que le joueur n'a pas choisi de bannir.
const restBanMode = ref(false);
// Suivi local du choix fait dans la Bibliothèque (repos ou bannissement), pour adapter le récap
// de fin de salle juste après résolution — la salle CLEARED seule ne permet pas de distinguer
// les deux cas côté serveur.
const lastRestChoice = ref<"HEAL" | "BAN_THEME" | null>(null);
const lastBannedTheme = ref<string | null>(null);
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
const mapNodes = brainrun.mapNodes;
const candidateCols = brainrun.candidateCols;
const loading = brainrun.loading;
const isRunActive = brainrun.isRunActive;
// Relique Purge Thématique : bloque l'écran courant tant que le thème à bannir n'est pas choisi.
const pendingThemeBan = computed(() => run.value?.pendingThemeBanChoice ?? false);

// Barre de PV du boss + dégâts potentiels (remplace le séparateur habituel pendant un combat
// de boss) : le décompte est celui tenu par BrainrunQuestionRunner, partagé via useState.
const isBossRoom = computed(() => currentRoom.value?.type === "BOSS");
// Nom de l'ennemi Standard/Elite affronté (Boss non concerné, cf. shared/brainrunEnemies.ts).
const currentEnemyName = computed(
  () => getBrainrunEnemyById(currentRoom.value?.enemyId)?.name ?? null,
);
const currentBossName = computed(
  () => getBrainrunBossById(currentRoom.value?.bossId)?.name ?? null,
);

// Transition d'entrée en combat (BrainrunCombatIntro) : affichée une fois par salle, tant que
// celle-ci vient de s'activer (aucune réponse encore soumise) et que son intro n'a pas déjà
// été fermée. Dérivé de l'état serveur plutôt que d'un flag "déjà vue" séparé : responses.length
// repasse naturellement à >0 dès la 1re réponse, donc jamais rejouée après un rechargement en
// cours de combat.
const introDismissedRoomId = ref<number | null>(null);
const combatIntroType = computed(() => {
  const room = currentRoom.value;
  if (!room || room.status !== "ACTIVE") return null;
  if (room.type !== "STANDARD" && room.type !== "ELITE" && room.type !== "BOSS") return null;
  if (room.responses.length > 0) return null;
  if (introDismissedRoomId.value === room.id) return null;
  return room.type;
});
const combatIntroName = computed(() => currentEnemyName.value ?? currentBossName.value ?? "");

async function handleCombatIntroDone() {
  const room = currentRoom.value;
  if (!room) return;
  introDismissedRoomId.value = room.id;
  // Le chrono du combat de boss ne démarre qu'ici (cf. BrainrunService.chooseNode qui ne fixe
  // plus questionStartedAt à l'activation de la salle) : sans ça, l'intro grignoterait le temps
  // de réponse imparti à la 1re question.
  if (room.type === "BOSS" && !room.questionDeadline) {
    await brainrun.readyNextBossQuestion();
  }
}

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
// Résurrection du Phoenix (malus "phoenix_revive") : signalée par BrainrunQuestionRunner
// pendant la courte pause avant l'affichage de la question suivante (cf. nextQuestion()).
const bossRevivedFlash = useState("brainrun-boss-revived-flash", () => false);

const roomRecap = computed(() => {
  const room = brainrun.currentRoom.value;
  // Les salles EVENT ont leur propre écran de résultat (BrainrunEvent.vue), pas le récap
  // générique or/PV.
  if (!room || room.status !== "CLEARED" || !room.type || room.type === "EVENT") return null;
  const heartsLost = room.responses.reduce((sum, r) => sum + (r.hpLoss ?? 0), 0);
  // Relique Spécialisation : soin de fin de combat, signalé sur la dernière réponse (cf.
  // BrainrunService.submitAnswer) — distinct du repos à la Bibliothèque (lastRestChoice).
  const specializationHealed = room.responses.some((r) => r.healthRegenerated);
  const restHealed = room.type === "REST" && lastRestChoice.value === "HEAL";
  return {
    type: room.type,
    goldEarned: room.goldEarned,
    heartsLost,
    healed: specializationHealed || restHealed,
    specializationHealed,
    netHeartsChange: (specializationHealed ? 1 : 0) + (restHealed ? 1 : 0) - heartsLost,
    bannedTheme:
      room.type === "REST" && lastRestChoice.value === "BAN_THEME" ? lastBannedTheme.value : null,
    enemyName:
      getBrainrunEnemyById(room.enemyId)?.name ?? getBrainrunBossById(room.bossId)?.name ?? null,
  };
});

const ownedRelics = computed(() =>
  (run.value?.relics ?? []).map((id) => BRAINRUN_RELICS[id as BrainrunRelicId]),
);

// Infobulle relique/consommable ouverte par tap ; refermée par un tap sur elle-même ou ailleurs
// dans la carte. Les reliques n'ont pas d'action au clic ; un emplacement de consommable occupé
// gagne un bouton "Jeter" (l'usage pendant une question passe par un bouton dédié dans
// BrainrunQuestionRunner), donc pas besoin d'appui long ici.
const openedRelicId = ref<BrainrunRelicId | null>(null);
// Index d'emplacement plutôt que id de consommable : 2 emplacements peuvent porter le même id
// depuis que les exemplaires identiques ne se stackent plus (cf. ownedConsumableUnits).
const openedConsumableSlot = ref<number | null>(null);

// Chaque exemplaire possédé prend son propre emplacement (plus de compteur x2/x3) : on répète
// l'id autant de fois que son compteur, dans l'ordre d'acquisition (grantConsumable n'affecte
// une clé qu'à sa première obtention, ce qui préserve cet ordre dans l'objet consumables).
const ownedConsumableUnits = computed(() => {
  const consumables = run.value?.consumables ?? {};
  const units: BrainrunConsumableId[] = [];
  (Object.keys(consumables) as BrainrunConsumableId[]).forEach((id) => {
    for (let i = 0; i < (consumables[id] ?? 0); i++) units.push(id);
  });
  return units;
});

// Emplacements fixes (3 de base, 5 avec la relique Sac à Dos, cf. run.maxConsumables) : vides
// tant qu'aucun objet ne les occupe, remplis de gauche à droite au fur et à mesure des nouveaux
// objets obtenus — les emplacements déjà occupés restent alignés à gauche quand le plafond
// augmente, les nouveaux emplacements vides n'apparaissent qu'à droite.
const consumableSlots = computed(() => {
  const maxSlots = run.value?.maxConsumables ?? 3;
  return Array.from({ length: maxSlots }, (_, i) => {
    const id = ownedConsumableUnits.value[i];
    return id ? BRAINRUN_CONSUMABLES[id] : null;
  });
});

async function handleDiscardConsumable(type: BrainrunConsumableId) {
  openedConsumableSlot.value = null;
  await brainrun.discardConsumable(type);
}

// Boutique/bonus post-combat : désactive la prise d'un consommable quand l'inventaire est déjà
// plein, pour ne pas faire dépenser de l'or (ou perdre le bonus) pour rien — cf.
// BrainrunService.buyShopItem/resolveBonus qui refusent aussi côté serveur.
const consumableInventoryFull = computed(
  () => ownedConsumableUnits.value.length >= (run.value?.maxConsumables ?? 3),
);

// Masquée sur toute la durée d'une run active (map, question, repos, boutique, récap...),
// pas seulement pendant l'affichage d'une question : sinon la barre réapparaît entre deux
// salles et peut masquer le bouton "Continuer" du récap ou d'autres actions en bas d'écran
// (même logique que les autres modes de jeu, cf. isGameActive dans series/ascent.vue).
watch(
  () => view.value === "run" && (isRunActive.value || holdOnFeedback.value),
  (inRun) => {
    showBottomNav.value = !inRun;
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

async function selectNode(col: number) {
  restBanMode.value = false;
  lastRestChoice.value = null;
  lastBannedTheme.value = null;
  await brainrun.chooseNode(col);
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
  // Purge Thématique : le choix du thème à bannir doit être résolu avant d'avancer la salle
  // (acknowledgeRoom le refuserait tant que pendingThemeBanChoice est vrai).
  if (run.value?.pendingThemeBanChoice) return;
  await brainrun.acknowledgeRoom();
}

async function handleBonusSkip() {
  await brainrun.resolveBonus("SKIP");
  showBonusStep.value = false;
  await brainrun.acknowledgeRoom();
}

async function handleThemeBanPick(theme: string) {
  await brainrun.resolveThemeBan(theme);
  // La relique peut avoir été obtenue en pleine Boutique (salle encore ACTIVE, pas de salle à
  // valider) : n'avancer que si une salle CLEARED attendait ce choix pour continuer.
  if (currentRoom.value?.status === "CLEARED") {
    await brainrun.acknowledgeRoom();
  }
}

async function handleRestHeal() {
  lastRestChoice.value = "HEAL";
  await brainrun.resolveRest("HEAL");
}

async function handleRestBanPick(theme: string) {
  lastRestChoice.value = "BAN_THEME";
  lastBannedTheme.value = theme;
  restBanMode.value = false;
  await brainrun.resolveRest("BAN_THEME", theme);
}

function themeLabel(theme: string): string {
  return theme.replace(/[-_]/g, " ");
}

const { roomTypeLabel, roomTypeIcon } = useBrainrunRoomTypeDisplay();
</script>

<style scoped>
/* Page-specific styles if any */
</style>
