<template>
  <div class="w-full max-w-xl mx-auto py-2 select-none">
    <UCard class="shadow-glass bg-[#111827]/70 backdrop-blur-xl border border-white/10 rounded-2xl">
      <!-- Non-authenticated user view -->
      <template v-if="!user">
        <div class="text-center py-10 px-6 space-y-6">
          <div
            class="w-16 h-16 rounded-full bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-3xl text-violet-400 mx-auto animate-pulse"
          >
            🔒
          </div>
          <div class="space-y-2">
            <h2 class="text-2xl font-black font-display text-white tracking-wide">
              Mode Battle Royale
            </h2>
            <p class="text-sm text-gray-400 max-w-sm mx-auto">
              Mesurez-vous à d'autres joueurs en direct ! Le dernier survivant l'emporte.
              Connectez-vous pour entrer dans l'arène.
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
        <!-- Joining state loader -->
        <div v-if="joining" class="text-center py-12 px-6 space-y-4">
          <div
            class="w-12 h-12 rounded-full border-t-2 border-violet-500 border-r-2 border-transparent animate-spin mx-auto"
          ></div>
          <p
            class="text-sm font-bold text-violet-400 uppercase tracking-widest animate-pulse font-display"
          >
            Entrée dans l'arène...
          </p>
        </div>

        <!-- Initial Start Game Screen -->
        <div v-else-if="!matchId" class="py-6 px-4 space-y-6 flex flex-col items-center">
          <!-- Banner for Resume active game if available -->
          <div
            v-if="session.recoverableMatchId.value"
            class="w-full max-w-md bg-gradient-to-r from-amber-500/10 to-violet-500/10 border border-amber-500/30 rounded-2xl p-4 shadow-lg text-center space-y-3"
          >
            <div class="text-amber-400 text-2xl animate-bounce">⚡</div>
            <div class="space-y-1">
              <h3 class="text-sm font-black font-display text-white uppercase tracking-wider">
                Partie en cours
              </h3>
              <p class="text-xs text-gray-400">
                Vous avez une partie de Battle Royale en cours d'exécution.
              </p>
            </div>
            <UButton
              color="warning"
              size="md"
              block
              icon="i-heroicons-arrow-right-circle"
              class="font-black uppercase font-display tracking-wider py-2.5"
              @click="session.connect(session.recoverableMatchId.value, user?.id || '')"
            >
              Reprendre la partie
            </UButton>
          </div>

          <!-- Logo/Intro Section -->
          <div class="text-center space-y-2">
            <div
              class="w-16 h-16 rounded-full bg-gradient-to-tr from-violet-600 to-cyan-500 flex items-center justify-center text-3xl text-white mx-auto shadow-[0_0_20px_rgba(139,92,246,0.5)] animate-pulse"
            >
              ⚔️
            </div>
            <h2 class="text-2xl font-black font-display text-white tracking-wide">BATTLE ROYALE</h2>
            <p class="text-xs text-gray-400 max-w-sm mx-auto leading-relaxed">
              Chaque joueur commence avec 3 vies. Les questions deviennent plus difficiles et le
              temps de réponse diminue à chaque round ! Serez-vous le dernier survivant ?
            </p>
          </div>

          <!-- Actions -->
          <div class="w-full max-w-md">
            <UButton
              color="primary"
              size="lg"
              block
              icon="i-heroicons-plus-circle"
              class="font-black uppercase font-display tracking-wider py-3.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500"
              @click="joinArena('create')"
            >
              Créer un nouveau salon
            </UButton>
          </div>

          <!-- Lobbies list section -->
          <div
            class="w-full max-w-md bg-white/5 border border-white/10 rounded-2xl p-4 shadow-glass space-y-3"
          >
            <div
              class="flex justify-between items-center text-xs font-bold text-gray-400 uppercase tracking-wider pb-2 border-b border-white/5"
            >
              <span class="flex items-center space-x-1.5">
                <span>Salons en attente</span>
                <span
                  v-if="loadingLobbies"
                  class="w-3 h-3 border-2 border-violet-500 border-r-transparent rounded-full animate-spin"
                ></span>
              </span>
              <UButton
                variant="ghost"
                icon="i-heroicons-arrow-path"
                size="xs"
                color="neutral"
                class="hover:text-white"
                @click="fetchLobbies"
              />
            </div>

            <div v-if="lobbies.length === 0" class="text-center py-8 px-4 space-y-2">
              <div class="text-2xl text-gray-500">📡</div>
              <p class="text-xs text-gray-400">Aucun salon en attente pour le moment.</p>
              <p class="text-[10px] text-gray-500">Créez-en un pour lancer une partie !</p>
            </div>

            <div
              v-else
              class="grid grid-cols-1 gap-3 max-h-64 overflow-y-auto pr-1 custom-scrollbar w-full"
            >
              <div
                v-for="lobby in lobbies"
                :key="lobby.matchId"
                class="flex flex-col p-3 rounded-xl bg-slate-900/50 border border-white/5 hover:border-white/15 hover:bg-slate-900/70 transition-all space-y-2"
              >
                <div class="flex items-center justify-between">
                  <div class="flex items-center space-x-2">
                    <span class="text-sm font-bold text-white">
                      {{
                        lobby.players[0]
                          ? `Salon de ${lobby.players[0].name}`
                          : `Salon #${lobby.matchId.slice(0, 4)}`
                      }}
                    </span>
                    <span
                      class="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-violet-500/10 border border-violet-500/20 text-violet-400"
                    >
                      {{ lobby.playersCount }} Joueur{{ lobby.playersCount > 1 ? "s" : "" }}
                    </span>
                  </div>

                  <UButton
                    color="primary"
                    size="xs"
                    icon="i-heroicons-arrow-right-on-rectangle"
                    class="font-bold tracking-wider px-3"
                    @click="joinArena('join', lobby.matchId)"
                  >
                    Rejoindre
                  </UButton>
                </div>

                <!-- Players badges -->
                <div class="flex flex-wrap gap-1">
                  <span
                    v-for="p in lobby.players"
                    :key="p.userId"
                    class="text-[9px] px-2 py-0.5 rounded-full bg-white/5 border border-white/5 text-gray-300 flex items-center space-x-1"
                  >
                    <span
                      class="w-1.5 h-1.5 rounded-full bg-emerald-500"
                      :class="{ 'bg-slate-500': !p.isOnline }"
                    ></span>
                    <span>{{ p.name }}</span>
                    <span v-if="p.isReady" class="text-emerald-400 text-[8px] font-bold">✓</span>
                  </span>
                </div>

                <!-- Countdown status if active -->
                <div
                  v-if="lobby.isCountdownRunning"
                  class="flex items-center space-x-1.5 text-[10px] text-cyan-400 font-medium bg-cyan-500/5 border border-cyan-500/10 rounded px-2 py-1 w-fit"
                >
                  <span class="animate-pulse">⏳ Lancement dans {{ lobby.countdown }}s</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Active game states -->
        <div v-else class="py-2">
          <!-- 1. Lobby Waiting State -->
          <LobbyView
            v-if="status === 'WAITING'"
            :players="players"
            :countdown="countdown"
            :is-countdown-running="isCountdownRunning"
            :my-user-id="user.id"
            @toggle-ready="handleToggleReady"
          />

          <!-- 2. Active Game State -->
          <GameView
            v-else-if="status === 'PLAYING'"
            :question="currentQuestion"
            :duration="currentQuestionDuration"
            :endTime="currentQuestionEndTime"
            :myLives="myLives"
            :players="players"
            :responded="responded"
            :selectedOptionId="selectedOptionId"
            :isSpectator="isSpectator"
            :round="currentRound"
            :answersCount="answersCount"
            :aliveCount="aliveCount"
            @submit-answer="submitAnswer"
          />

          <!-- 3. Final Scoreboard Podium State -->
          <PodiumView
            v-else-if="status === 'FINISHED'"
            :winnerId="winnerId"
            :winnerName="winnerName"
            :standings="standings"
            :myUserId="user.id"
          />

          <!-- 4. Round Results Overlay (displays correction after round timeout) -->
          <SpectatorOverlay
            v-if="showRoundResults && lastRoundResults && currentQuestion"
            :round="currentRound"
            :correctAnswerId="lastRoundResults.correctAnswerId"
            :commentaire="lastRoundResults.commentaire"
            :results="lastRoundResults.results"
            :question="currentQuestion"
            :myUserId="user.id"
          />
        </div>
      </template>
    </UCard>
  </div>
</template>

<script setup lang="ts">
import LobbyView from "~/components/battle-royale/LobbyView.vue";
import GameView from "~/components/battle-royale/GameView.vue";
import PodiumView from "~/components/battle-royale/PodiumView.vue";
import SpectatorOverlay from "~/components/battle-royale/SpectatorOverlay.vue";
import { useBattleRoyaleSession } from "~/composables/useBattleRoyaleSession";

const supabase = useSupabaseClient();
const {
  data: { user },
} = await supabase.auth.getUser();

const session = useBattleRoyaleSession();

// Mappage réactif avec la session globale
const matchId = session.matchId;
const status = session.status;
const players = session.players;
const countdown = session.countdown;
const isCountdownRunning = session.isCountdownRunning;
const myLives = session.myLives;
const isSpectator = session.isSpectator;
const currentRound = session.currentRound;
const currentQuestion = session.currentQuestion;
const currentQuestionDuration = session.currentQuestionDuration;
const currentQuestionEndTime = session.currentQuestionEndTime;
const responded = session.responded;
const selectedOptionId = session.selectedOptionId;
const answersCount = session.answersCount;
const aliveCount = session.aliveCount;
const showRoundResults = session.showRoundResults;
const lastRoundResults = session.lastRoundResults;
const winnerId = session.winnerId;
const winnerName = session.winnerName;
const standings = session.standings;

const joining = ref(false);
const lobbies = ref<any[]>([]);
const loadingLobbies = ref(false);
let lobbyPollInterval: any = null;

async function fetchLobbies() {
  try {
    loadingLobbies.value = true;
    const data = await $fetch<any[]>("/api/battle-royale/lobbies");
    lobbies.value = data || [];
  } catch (e) {
    console.error("Erreur lors de la récupération des salons :", e);
  } finally {
    loadingLobbies.value = false;
  }
}

function startLobbyPolling() {
  stopLobbyPolling();
  fetchLobbies();
  lobbyPollInterval = setInterval(fetchLobbies, 5000);
}

function stopLobbyPolling() {
  if (lobbyPollInterval) {
    clearInterval(lobbyPollInterval);
    lobbyPollInterval = null;
  }
}

onMounted(async () => {
  if (user) {
    await session.checkActiveSession();
    // Si l'utilisateur n'est pas déjà dans un salon actif et qu'aucun salon n'est récupérable
    if (!session.matchId.value && !session.recoverableMatchId.value) {
      startLobbyPolling();
    }
  }
});

onBeforeUnmount(() => {
  stopLobbyPolling();
});

async function joinArena(action: "create" | "join", targetMatchId?: string) {
  try {
    joining.value = true;
    stopLobbyPolling();

    // 1. Envoyer la requête POST pour rejoindre le lobby
    const result = await $fetch<any>("/api/battle-royale/join", {
      method: "post",
      body: {
        action,
        matchId: targetMatchId,
      },
    });

    // 2. Établir la connexion SSE globale
    if (user) {
      session.connect(result.matchId, user.id);
    }
  } catch (e: any) {
    console.error("Échec lors de l'entrée dans l'arène :", e);
    // En cas d'échec, relancer le polling
    startLobbyPolling();
  } finally {
    joining.value = false;
  }
}

async function submitAnswer(optionId: number) {
  if (responded.value || isSpectator.value) return;

  selectedOptionId.value = optionId;
  responded.value = true;

  try {
    await $fetch("/api/battle-royale/submit", {
      method: "post",
      body: {
        matchId: matchId.value,
        propositionId: optionId,
      },
    });
  } catch (e) {
    console.error("Erreur lors de l'envoi de la réponse :", e);
    responded.value = false;
    selectedOptionId.value = null;
  }
}

async function handleToggleReady(isReady: boolean) {
  try {
    await $fetch("/api/battle-royale/ready", {
      method: "post",
      body: {
        matchId: matchId.value,
        isReady,
      },
    });
  } catch (e) {
    console.error("Erreur lors de la modification du statut prêt :", e);
  }
}
</script>

<style scoped>
/* Page transition styles */
</style>
