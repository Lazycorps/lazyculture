<template>
  <div class="w-full max-w-6xl mx-auto py-2 space-y-8 select-none">
    <!-- Header Title -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div class="space-y-1">
        <h2
          class="text-3xl font-black font-display tracking-tight bg-gradient-to-r from-violet-400 via-indigo-300 to-cyan-400 bg-clip-text text-transparent"
        >
          Modération des Soumissions
        </h2>
        <p class="text-sm text-gray-400 font-medium">
          Validez, modifiez ou arbitrez les questions proposées par la communauté.
        </p>
      </div>

      <div class="flex items-center gap-2">
        <UButton
          color="neutral"
          variant="ghost"
          icon="i-heroicons-arrow-path"
          :loading="loading"
          @click="fetchSubmissions"
        >
          Actualiser
        </UButton>
      </div>
    </div>

    <!-- Stats & Filters Bar -->
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <button
        v-for="f in statusFilters"
        :key="f.id"
        class="p-4 rounded-2xl border text-left transition-all"
        :class="[
          selectedStatus === f.id
            ? 'bg-violet-600/20 border-violet-500/50 shadow-neon'
            : 'bg-[#111827]/60 border-white/10 hover:border-white/20',
        ]"
        @click="selectedStatus = f.id"
      >
        <p class="text-[10px] uppercase font-bold text-gray-400 font-display">{{ f.label }}</p>
        <p class="text-2xl font-black text-white font-display mt-0.5">{{ countByStatus(f.id) }}</p>
      </button>
    </div>

    <!-- Search Input -->
    <div class="bg-[#111827]/70 backdrop-blur-xl border border-white/10 rounded-2xl p-4">
      <UInput
        v-model="searchQuery"
        placeholder="Rechercher par libellé, auteur ou thème..."
        icon="i-heroicons-magnifying-glass"
        size="md"
        class="w-full"
      />
    </div>

    <!-- Submissions Table / Cards -->
    <div v-if="loading" class="text-center py-16 text-gray-400">
      <UIcon name="i-heroicons-arrow-path" class="text-2xl animate-spin mx-auto mb-2" />
      <p class="text-xs">Chargement des soumissions...</p>
    </div>

    <div
      v-else-if="filteredSubmissions.length === 0"
      class="p-12 text-center bg-[#111827]/40 border border-white/10 rounded-2xl text-gray-400"
    >
      <p class="text-sm font-bold font-display">Aucune soumission trouvée.</p>
    </div>

    <div v-else class="space-y-4">
      <div
        v-for="sub in filteredSubmissions"
        :key="sub.id"
        class="p-5 rounded-3xl border bg-[#111827]/60 backdrop-blur-xl space-y-4 transition-all"
        :class="[
          sub.status === 'APPROVED'
            ? 'border-emerald-500/20'
            : sub.status === 'REJECTED'
              ? 'border-rose-500/20'
              : 'border-white/10 shadow-glass',
        ]"
      >
        <!-- Top Row: Author + Status + Votes -->
        <div
          class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-3"
        >
          <div class="flex items-center gap-3 flex-wrap">
            <span class="text-xs font-bold text-white font-display">
              Auteur : <span class="text-violet-400">@{{ sub.userName }}</span>
            </span>

            <CommunityContributorTrustBadge
              v-if="sub.authorTrust"
              :trust="sub.authorTrust"
              show-details
              size="sm"
            />
          </div>

          <div class="flex items-center gap-2">
            <span
              class="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase font-display"
              :class="[
                sub.status === 'APPROVED'
                  ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                  : sub.status === 'REJECTED'
                    ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                    : 'bg-amber-500/15 text-amber-300 border border-amber-500/30',
              ]"
            >
              {{
                sub.status === "APPROVED"
                  ? "Validée"
                  : sub.status === "REJECTED"
                    ? "Refusée"
                    : `En attente (${sub.approvalCount}/3 👍)`
              }}
            </span>
            <span class="text-[10px] text-gray-500">{{ formatDate(sub.createDate) }}</span>
          </div>
        </div>

        <!-- Question Libelle -->
        <div class="space-y-1">
          <div class="flex items-center gap-2 flex-wrap">
            <span
              v-for="t in sub.themes"
              :key="t"
              class="text-[9px] font-extrabold uppercase font-display bg-violet-500/10 border border-violet-500/20 text-violet-400 px-2 py-0.5 rounded-full"
            >
              {{ t }}
            </span>
            <span class="text-[10px] text-gray-400 font-bold font-display"
              >Diff. {{ sub.difficulty }} ⭐</span
            >
          </div>
          <h4 class="text-base sm:text-lg font-black font-display text-white leading-snug">
            {{ sub.data.libelle }}
          </h4>
        </div>

        <!-- Propositions Grid -->
        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
          <div
            v-for="prop in sub.data.propositions"
            :key="prop.id"
            class="p-2.5 rounded-xl text-xs font-medium border"
            :class="[
              prop.id === sub.data.response
                ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300 font-bold'
                : 'bg-slate-950/40 border-white/5 text-gray-400',
            ]"
          >
            <span v-if="prop.id === sub.data.response" class="mr-1">✓</span>
            <span>{{ prop.value }}</span>
          </div>
        </div>

        <!-- Explanations & Source -->
        <div
          v-if="sub.data.commentaire || sub.source"
          class="p-3 rounded-2xl bg-slate-950/50 border border-white/5 space-y-1 text-xs text-gray-300"
        >
          <p v-if="sub.data.commentaire">
            <strong class="text-violet-400">Explication :</strong> {{ sub.data.commentaire }}
          </p>
          <p v-if="sub.source">
            <strong class="text-gray-400">Source :</strong>
            <a :href="sub.source" target="_blank" class="text-violet-400 underline">{{
              sub.source
            }}</a>
          </p>
        </div>

        <!-- Admin Actions (Only for PENDING or to edit) -->
        <div class="flex items-center justify-end gap-2 pt-2 border-t border-white/5">
          <UButton
            v-if="sub.status === 'PENDING'"
            color="success"
            size="sm"
            icon="i-heroicons-check"
            class="font-bold font-display uppercase tracking-wider shadow-neon-green"
            :loading="actionLoading === sub.id"
            @click="adminAction(sub.id, 'APPROVE')"
          >
            Valider (1 clic)
          </UButton>
          <UButton
            v-if="sub.status === 'PENDING'"
            color="error"
            variant="soft"
            size="sm"
            icon="i-heroicons-x-mark"
            class="font-bold font-display uppercase tracking-wider"
            :disabled="actionLoading === sub.id"
            @click="openRejectModal(sub)"
          >
            Refuser
          </UButton>
        </div>
      </div>
    </div>

    <!-- Reject Modal -->
    <UModal
      v-model:open="showRejectModal"
      :ui="{
        content:
          'sm:max-w-md bg-[#111827]/95 border border-white/10 rounded-2xl overflow-hidden text-gray-200',
      }"
    >
      <template #body>
        <div class="space-y-4 py-2">
          <h3 class="text-base font-black font-display text-white">Refuser la soumission</h3>
          <p class="text-xs text-gray-400">
            Indiquez la raison du rejet qui sera notifiée à l'auteur.
          </p>
          <UInput v-model="rejectionReason" placeholder="Raison du rejet..." class="w-full" />
          <div class="flex justify-end gap-2 pt-2">
            <UButton variant="ghost" color="neutral" @click="showRejectModal = false"
              >Annuler</UButton
            >
            <UButton color="error" class="font-bold font-display" @click="confirmReject"
              >Confirmer le rejet</UButton
            >
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import type { QuestionSubmissionDTO } from "#shared/DTO/questionSubmissionDTO";
import { toast } from "vue3-toastify";

definePageMeta({
  layout: "admin",
  middleware: "admin",
});

useHead({
  title: "Admin - Modération Soumissions | Lazyculture",
});

const submissions = ref<QuestionSubmissionDTO[]>([]);
const loading = ref(true);
const actionLoading = ref<number | null>(null);
const searchQuery = ref("");
const selectedStatus = ref<string>("ALL");

const showRejectModal = ref(false);
const rejectingSub = ref<QuestionSubmissionDTO | null>(null);
const rejectionReason = ref("");

const statusFilters = [
  { id: "ALL", label: "Toutes" },
  { id: "PENDING", label: "En Attente" },
  { id: "APPROVED", label: "Validées" },
  { id: "REJECTED", label: "Refusées" },
];

function countByStatus(status: string): number {
  if (status === "ALL") return submissions.value.length;
  return submissions.value.filter((s) => s.status === status).length;
}

const filteredSubmissions = computed(() => {
  return submissions.value.filter((sub) => {
    if (selectedStatus.value !== "ALL" && sub.status !== selectedStatus.value) {
      return false;
    }
    if (searchQuery.value.trim()) {
      const q = searchQuery.value.toLowerCase();
      const matchLibelle = sub.data.libelle.toLowerCase().includes(q);
      const matchAuthor = (sub.userName || "").toLowerCase().includes(q);
      const matchTheme = sub.themes.some((t) => t.toLowerCase().includes(q));
      if (!matchLibelle && !matchAuthor && !matchTheme) return false;
    }
    return true;
  });
});

function formatDate(dateStr: string | Date): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
  } catch {
    return "";
  }
}

async function fetchSubmissions() {
  loading.value = true;
  try {
    const data = await $fetch<QuestionSubmissionDTO[]>("/api/admin/submissions");
    submissions.value = data;
  } catch (err: any) {
    toast.error(err?.data?.statusMessage || "Erreur chargement soumissions admin.");
  } finally {
    loading.value = false;
  }
}

async function adminAction(submissionId: number, action: "APPROVE" | "REJECT", reason?: string) {
  actionLoading.value = submissionId;
  try {
    await $fetch(`/api/admin/submissions/${submissionId}/review`, {
      method: "POST",
      body: {
        action,
        rejectionReason: reason,
      },
    });

    toast.success(
      action === "APPROVE" ? "Question validée et intégrée en jeu !" : "Soumission rejetée.",
    );
    await fetchSubmissions();
  } catch (err: any) {
    toast.error(err?.data?.statusMessage || "Erreur lors de l'action admin.");
  } finally {
    actionLoading.value = null;
  }
}

function openRejectModal(sub: QuestionSubmissionDTO) {
  rejectingSub.value = sub;
  rejectionReason.value = "Non conforme aux critères de sélection.";
  showRejectModal.value = true;
}

async function confirmReject() {
  if (!rejectingSub.value) return;
  showRejectModal.value = false;
  await adminAction(rejectingSub.value.id, "REJECT", rejectionReason.value);
}

onMounted(() => {
  fetchSubmissions();
});
</script>
