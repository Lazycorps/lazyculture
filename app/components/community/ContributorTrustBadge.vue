<template>
  <div v-if="trust" class="inline-flex items-center gap-1.5 flex-wrap">
    <!-- Main Badge -->
    <span
      class="inline-flex items-center gap-1 font-bold font-display uppercase tracking-wider rounded-full border px-2.5 py-0.5 transition-transform"
      :class="[
        badgeClasses,
        size === 'sm' ? 'text-[10px]' : size === 'lg' ? 'text-xs px-3 py-1' : 'text-[11px]',
      ]"
    >
      <span class="text-xs">{{ tierIcon }}</span>
      <span>{{ trust.tierLabel }}</span>
      <span v-if="trust.totalSubmitted > 0 && trust.approvalRate !== undefined" class="opacity-75">
        ({{ trust.approvalRate }}%)
      </span>
    </span>

    <!-- Optional Detail Stats (e.g. in review header or profile) -->
    <span
      v-if="showDetails"
      class="text-[11px] text-gray-400 font-medium inline-flex items-center gap-2"
    >
      <span>•</span>
      <span
        ><strong>{{ trust.totalApproved }}</strong> validée{{
          trust.totalApproved > 1 ? "s" : ""
        }}</span
      >
      <span
        v-if="trust.totalRoyaltiesEarned > 0"
        class="text-amber-400 font-bold flex items-center gap-0.5"
      >
        <span>•</span>
        <span>{{ trust.totalRoyaltiesEarned }} 🪙</span>
      </span>
    </span>
  </div>
</template>

<script setup lang="ts">
import type { ContributorTrustScoreDTO } from "#shared/DTO/questionSubmissionDTO";

const props = withDefaults(
  defineProps<{
    trust: ContributorTrustScoreDTO | null | undefined;
    showDetails?: boolean;
    size?: "sm" | "md" | "lg";
  }>(),
  {
    showDetails: false,
    size: "sm",
  },
);

const tierIcon = computed(() => {
  switch (props.trust?.trustTier) {
    case "ELITE":
      return "💎";
    case "RELIABLE":
      return "🟢";
    case "NEWBIE":
      return "🔰";
    case "WATCH":
      return "⚠️";
    default:
      return "✍️";
  }
});

const badgeClasses = computed(() => {
  switch (props.trust?.trustTier) {
    case "ELITE":
      return "bg-amber-500/15 border-amber-500/30 text-amber-300 shadow-neon-amber";
    case "RELIABLE":
      return "bg-emerald-500/15 border-emerald-500/30 text-emerald-300 shadow-neon-green";
    case "NEWBIE":
      return "bg-sky-500/15 border-sky-500/30 text-sky-300";
    case "WATCH":
      return "bg-orange-500/15 border-orange-500/30 text-orange-300";
    default:
      return "bg-violet-500/15 border-violet-500/30 text-violet-300";
  }
});
</script>
