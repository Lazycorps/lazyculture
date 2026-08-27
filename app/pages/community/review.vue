<template>
  <div class="w-full max-w-4xl mx-auto py-4 px-3 sm:py-6 sm:px-4 space-y-6 select-none">
    <!-- Top Bar with Navigation & Title -->
    <div class="flex items-center justify-between border-b border-white/10 pb-4">
      <NuxtLink
        to="/"
        class="inline-flex items-center gap-2 text-xs font-bold font-display text-gray-400 hover:text-white transition-colors"
      >
        <UIcon name="i-heroicons-arrow-left" />
        <span>Retour à l'accueil</span>
      </NuxtLink>

      <div class="flex items-center gap-3">
        <NuxtLink
          to="/community"
          class="text-xs font-bold font-display text-gray-400 hover:text-white transition-colors hidden sm:inline-flex items-center gap-1"
        >
          <UIcon name="i-heroicons-light-bulb" />
          <span>L'Atelier</span>
        </NuxtLink>
        <div
          class="flex items-center gap-2 text-xs font-bold font-display text-violet-400 bg-violet-500/10 border border-violet-500/20 px-3 py-1 rounded-full"
        >
          <UIcon name="i-heroicons-scale" class="text-base" />
          <span>Arène de Relecture</span>
        </div>
      </div>
    </div>

    <!-- Verrouillage si Niveau < 3 (sauf Admin) -->
    <div
      v-if="user && userLevel < 3 && !userProfile?.admin"
      class="p-8 sm:p-12 rounded-3xl bg-[#111827]/60 border border-white/10 text-center space-y-4 max-w-xl mx-auto backdrop-blur-xl shadow-glass"
    >
      <div
        class="w-16 h-16 rounded-full bg-violet-600/10 border border-violet-500/20 flex items-center justify-center text-3xl mx-auto text-violet-400"
      >
        🔒
      </div>
      <div class="space-y-1">
        <h3 class="text-lg font-black font-display text-white">
          Niveau 3 requis pour la relecture
        </h3>
        <p class="text-xs text-gray-400 font-medium leading-relaxed">
          Vous êtes actuellement
          <span class="text-violet-400 font-bold">Niveau {{ userLevel }}</span
          >. Atteignez le niveau 3 pour participer à l'évaluation des questions de la communauté.
        </p>
      </div>
      <div class="pt-2 flex justify-center gap-3">
        <UButton to="/solo" color="primary" class="font-bold font-display" icon="i-heroicons-play">
          Faire des parties
        </UButton>
        <UButton to="/" variant="ghost" color="neutral" class="font-bold font-display">
          Accueil
        </UButton>
      </div>
    </div>

    <!-- Loading State -->
    <div v-else-if="loading" class="text-center py-20 space-y-3">
      <UIcon name="i-heroicons-arrow-path" class="text-3xl animate-spin text-violet-400 mx-auto" />
      <p class="text-xs text-gray-400 font-medium">Recherche d'une question à évaluer...</p>
    </div>

    <!-- Empty State (No questions left to review) -->
    <div
      v-else-if="!currentReview"
      class="p-10 sm:p-14 rounded-3xl bg-[#111827]/60 border border-white/10 text-center space-y-6 max-w-xl mx-auto backdrop-blur-xl shadow-glass"
    >
      <div
        class="w-20 h-20 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-4xl mx-auto text-emerald-400 shadow-neon-green"
      >
        🎉
      </div>
      <div class="space-y-2">
        <h3 class="text-xl sm:text-2xl font-black font-display text-white">
          Toutes les questions sont à jour !
        </h3>
        <p class="text-xs sm:text-sm text-gray-400 font-medium leading-relaxed">
          Il n'y a actuellement aucune question en attente de votre relecture. Merci pour votre
          précieuse contribution !
        </p>
      </div>
      <div class="pt-2 flex justify-center gap-3">
        <UButton to="/" variant="ghost" color="neutral" class="font-bold font-display">
          Retour à l'accueil
        </UButton>
        <UButton
          to="/community"
          color="primary"
          class="font-bold font-display uppercase tracking-wider px-6 py-2.5"
        >
          Proposer une question
        </UButton>
      </div>
    </div>

    <!-- Active Review Question Card -->
    <div v-else class="space-y-6">
      <!-- Author Reputation Header -->
      <div
        class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-[#111827]/60 border border-white/10 backdrop-blur-xl"
      >
        <div class="flex items-center gap-2.5 min-w-0">
          <div
            class="w-9 h-9 rounded-xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-lg text-violet-400 shrink-0"
          >
            ✍️
          </div>
          <div class="min-w-0">
            <p class="text-xs font-bold text-white font-display truncate">
              Question de <span class="text-violet-400">@{{ currentReview.authorName }}</span>
            </p>
            <p class="text-[10px] text-gray-400">
              Difficulté estimée : {{ currentReview.difficulty }} ⭐
            </p>
          </div>
        </div>

        <!-- Author Trust Score Badge if exists -->
        <div v-if="currentReview.authorTrust">
          <CommunityContributorTrustBadge
            :trust="currentReview.authorTrust"
            show-details
            size="sm"
          />
        </div>
      </div>

      <!-- Question Card (Step 1 & Step 2) -->
      <div
        class="bg-[#111827]/70 backdrop-blur-xl border border-white/10 rounded-3xl p-5 sm:p-7 space-y-6 shadow-glass"
      >
        <!-- Step 1 Instructions Banner (Before response) -->
        <div
          v-if="!revealed"
          class="flex items-center gap-2 p-3 rounded-xl bg-violet-500/10 border border-violet-500/20 text-xs text-violet-300 font-medium"
        >
          <UIcon name="i-heroicons-information-circle" class="text-base shrink-0 text-violet-400" />
          <span
            >Étape 1 : Répondez d'abord à la question en aveugle pour tester son
            intelligibilité.</span
          >
        </div>

        <!-- Question Display Component -->
        <QuestionDisplay
          :libelle="currentReview.libelle"
          :img="currentReview.img"
          :themes="currentReview.themes"
          :propositions="currentReview.propositions"
          :disabled="revealed !== null || answering"
          :selectedOptionId="selectedOptionId"
          :correctOptionId="revealed?.correctResponseId"
          :incorrectOptionId="revealed && !revealed.isCorrect ? selectedOptionId : null"
          :showCorrectIncorrectColors="revealed !== null"
          @selectOption="handleSelectOption"
        />

        <!-- Step 2: Revealed Details & Explanations -->
        <div v-if="revealed" class="space-y-4 pt-4 border-t border-white/10 animate-fade-in">
          <!-- Explanation / Anecdote box -->
          <div class="p-4 rounded-2xl bg-slate-950/60 border border-white/10 space-y-2">
            <h4
              class="text-xs font-black font-display uppercase tracking-wider text-violet-400 flex items-center gap-1.5"
            >
              <UIcon name="i-heroicons-light-bulb" /> Explication de l'auteur
            </h4>
            <p
              v-if="revealed.commentaire"
              class="text-xs text-gray-300 leading-relaxed font-medium"
            >
              {{ revealed.commentaire }}
            </p>
            <p v-else class="text-xs text-gray-500 italic">
              Aucune explication ou anecdote fournie.
            </p>

            <!-- Source Link if provided -->
            <div
              v-if="revealed.source"
              class="pt-2 border-t border-white/5 flex items-center gap-1.5 text-xs text-gray-400"
            >
              <UIcon name="i-heroicons-link" class="text-violet-400 shrink-0" />
              <span>Source :</span>
              <a
                v-if="isUrl(revealed.source)"
                :href="revealed.source"
                target="_blank"
                rel="noopener noreferrer"
                class="text-violet-400 hover:text-violet-300 underline font-medium truncate max-w-sm"
              >
                {{ revealed.source }}
              </a>
              <span v-else class="text-gray-300 font-medium truncate max-w-sm">{{
                revealed.source
              }}</span>
            </div>
          </div>

          <!-- Step 2 Action Bar (Vote Buttons) -->
          <div
            class="p-4 rounded-2xl bg-slate-900/80 border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4"
          >
            <div class="space-y-0.5 text-center sm:text-left">
              <p class="text-xs font-black font-display text-white uppercase tracking-wider">
                Étape 2 : Votre verdict sur la question
              </p>
              <p class="text-[11px] text-gray-400 font-medium">
                La question est-elle claire, vérifiée et digne d'intégrer Lazyculture ?
              </p>
            </div>

            <!-- Buttons: Refuser (avec modal) / Valider -->
            <div class="flex items-center gap-2.5 w-full sm:w-auto">
              <UButton
                color="error"
                variant="soft"
                size="lg"
                class="flex-1 sm:flex-none font-bold font-display uppercase tracking-wider text-xs px-5"
                icon="i-heroicons-hand-thumb-down"
                :disabled="voting"
                @click="showRejectModal = true"
              >
                Refuser / Signaler
              </UButton>

              <UButton
                color="primary"
                size="lg"
                class="flex-1 sm:flex-none font-black font-display uppercase tracking-wider text-xs px-6 shadow-neon"
                icon="i-heroicons-hand-thumb-up"
                :loading="voting"
                @click="submitVote('APPROVE')"
              >
                Approuver 👍
              </UButton>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal Rejet / Signalement -->
    <UModal
      v-model:open="showRejectModal"
      title="Motif du refus"
      description="Indiquez pourquoi cette question ne doit pas être intégrée en jeu pour guider l'auteur."
      :ui="{
        content:
          'sm:max-w-md bg-[#111827]/95 border border-white/10 rounded-2xl overflow-hidden text-gray-200 shadow-2xl',
      }"
    >
      <template #body>
        <div class="space-y-4">
          <!-- Reason Presets -->
          <div class="space-y-2">
            <label class="text-xs font-bold font-display text-gray-300">Raison principale</label>
            <div class="grid grid-cols-1 gap-2">
              <button
                v-for="r in rejectReasons"
                :key="r"
                type="button"
                class="p-2.5 rounded-xl text-left text-xs font-medium border transition-all"
                :class="[
                  selectedReason === r
                    ? 'bg-rose-500/15 border-rose-500/50 text-rose-300 font-bold shadow-neon-red'
                    : 'bg-white/5 border-white/5 text-gray-300 hover:border-white/15',
                ]"
                @click="selectedReason = r"
              >
                {{ r }}
              </button>
            </div>
          </div>

          <!-- Custom comment -->
          <div class="space-y-1.5">
            <label class="text-xs font-bold font-display text-gray-300"
              >Commentaire complémentaire (optionnel)</label
            >
            <UTextarea
              v-model="rejectComment"
              placeholder="Détails sur l'erreur ou suggestions..."
              :rows="2"
              class="w-full"
            />
          </div>
        </div>
      </template>

      <template #footer>
        <div class="flex justify-end gap-2 w-full">
          <UButton variant="ghost" color="neutral" @click="showRejectModal = false">
            Annuler
          </UButton>
          <UButton
            color="error"
            :loading="voting"
            class="font-bold font-display uppercase tracking-wider"
            @click="submitVote('REJECT')"
          >
            Confirmer le refus
          </UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useUserStore } from "~/stores/userStore";
import type { ReviewQuestionDTO, ReviewRevealDTO } from "#shared/DTO/questionSubmissionDTO";
import { toast } from "vue3-toastify";

useHead({
  title: "Arène de Relecture | Lazyculture",
  meta: [
    {
      name: "description",
      content: "Testez et évaluez les questions proposées par la communauté Lazyculture.",
    },
  ],
});

const user = useSupabaseUser();
const userStore = useUserStore();

const userProfile = computed(() => userStore.user);
const userLevel = computed(() => userStore.user?.UserProgress?.levelId || 1);

const loading = ref(true);
const answering = ref(false);
const voting = ref(false);

const currentReview = ref<ReviewQuestionDTO | null>(null);
const selectedOptionId = ref<number | null>(null);
const revealed = ref<ReviewRevealDTO | null>(null);

const showRejectModal = ref(false);
const selectedReason = ref("Faute d'orthographe ou de grammaire");
const rejectComment = ref("");

const rejectReasons = [
  "Faute d'orthographe ou de grammaire",
  "Réponse inexacte ou ambiguë",
  "Question déjà existante (doublon)",
  "Formulation confuse ou trompeuse",
  "Contenu inapproprié ou non pertinent",
];

function isUrl(str: string): boolean {
  try {
    return str.startsWith("http://") || str.startsWith("https://");
  } catch {
    return false;
  }
}

async function fetchNextQuestion() {
  loading.value = true;
  selectedOptionId.value = null;
  revealed.value = null;
  showRejectModal.value = false;
  rejectComment.value = "";

  try {
    const res = await $fetch<ReviewQuestionDTO | null>("/api/community/submissions/next-review");
    currentReview.value = res;
  } catch (err: any) {
    toast.error(err?.data?.statusMessage || "Erreur lors du chargement de la question.");
  } finally {
    loading.value = false;
  }
}

async function handleSelectOption(optionId: number) {
  if (revealed.value || answering.value || !currentReview.value) return;

  selectedOptionId.value = optionId;
  answering.value = true;

  try {
    const res = await $fetch<ReviewRevealDTO>("/api/community/submissions/reveal-review", {
      method: "POST",
      body: {
        submissionId: currentReview.value.submissionId,
        userResponseId: optionId,
      },
    });
    revealed.value = res;
  } catch (err: any) {
    toast.error(err?.data?.statusMessage || "Erreur lors de la vérification de la réponse.");
  } finally {
    answering.value = false;
  }
}

async function submitVote(vote: "APPROVE" | "REJECT") {
  if (!currentReview.value || voting.value) return;

  voting.value = true;
  const reason =
    vote === "REJECT"
      ? `${selectedReason.value}${rejectComment.value ? " : " + rejectComment.value.trim() : ""}`
      : undefined;

  try {
    const res = await $fetch<{
      voteRegistered: boolean;
      promotedToOfficial: boolean;
      approvalCount: number;
    }>("/api/community/submissions/vote", {
      method: "POST",
      body: {
        submissionId: currentReview.value.submissionId,
        vote,
        rejectionReason: reason,
      },
    });

    if (res.promotedToOfficial) {
      toast.success("Votre vote a permis de valider officiellement cette question en jeu ! 🎉");
    } else if (vote === "APPROVE") {
      toast.success("Vote enregistré ! Question approuvée 👍");
    } else {
      toast.info("Signalement pris en compte.");
    }

    await fetchNextQuestion();
  } catch (err: any) {
    toast.error(err?.data?.statusMessage || "Erreur lors de l'enregistrement du vote.");
  } finally {
    voting.value = false;
  }
}

onMounted(() => {
  fetchNextQuestion();
});
</script>
