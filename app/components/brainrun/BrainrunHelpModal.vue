<template>
  <UModal v-model:open="open" :ui="{ content: 'max-w-md' }">
    <template #content>
      <UCard :ui="{ body: 'p-4 sm:p-6' }">
        <template #header>
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-black font-display text-white tracking-wide">
              Comment jouer à Brainrun
            </h3>
            <UButton
              color="neutral"
              variant="ghost"
              icon="i-heroicons-x-mark-20-solid"
              class="-my-1"
              @click="open = false"
            />
          </div>
        </template>

        <div class="space-y-5">
          <p class="text-xs text-gray-400 leading-relaxed">
            Chaque acte se joue sur une carte à embranchements : choisissez votre chemin parmi
            plusieurs salles jusqu'au Boss qui termine l'acte. Le type des salles trop lointaines
            reste masqué (icône "?") tant que vous ne les avez pas atteintes — la relique Prévoyance
            permet de voir plus loin. Répondez correctement aux questions pour progresser ; une
            mauvaise réponse vous coûte un point de vie. Survivez aux 3 actes pour gagner la run !
          </p>

          <div class="space-y-2.5">
            <div
              v-for="room in rooms"
              :key="room.type"
              class="flex items-start gap-3 bg-white/5 border border-white/10 rounded-2xl p-3"
            >
              <div
                class="w-9 h-9 rounded-full bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400 text-lg shrink-0"
              >
                <UIcon :name="room.icon" />
              </div>
              <div class="min-w-0">
                <p class="text-xs font-black font-display text-white tracking-wide">
                  {{ room.label }}
                </p>
                <p class="text-[11px] text-gray-400 leading-relaxed mt-0.5">
                  {{ room.description }}
                </p>
              </div>
            </div>
          </div>

          <p class="text-[11px] text-gray-500 leading-relaxed">
            L'or gagné en combat se dépense en Boutique. À la fin de la run, l'XP et les Points de
            Savoir récoltés servent à progresser et à débloquer des talents permanents dans l'Arbre
            de talents.
          </p>
        </div>
      </UCard>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import type { BrainrunRoomType } from "#shared/brainrun";

const open = defineModel<boolean>("open", { required: true });

const rooms: { type: BrainrunRoomType; icon: string; label: string; description: string }[] = [
  {
    type: "STANDARD",
    icon: "i-heroicons-bolt",
    label: "Combat",
    description: "Affrontez un ennemi standard sur une série de questions. Rapporte or et XP.",
  },
  {
    type: "ELITE",
    icon: "i-heroicons-fire",
    label: "Elite",
    description:
      "Un ennemi plus coriace, plus de questions à enchaîner. Meilleures récompenses et un bonus (relique ou consommable) au choix à la victoire.",
  },
  {
    type: "BOSS",
    icon: "i-heroicons-shield-exclamation",
    label: "Boss",
    description:
      "Termine l'acte. Répondez vite pour infliger plus de dégâts ; chaque erreur vous coûte des PV. Bonus garanti à la victoire.",
  },
  {
    type: "REST",
    icon: "i-heroicons-heart",
    label: "Repos",
    description: "Aucune question : régénère 1 point de vie.",
  },
  {
    type: "SHOP",
    icon: "i-heroicons-shopping-bag",
    label: "Boutique",
    description: "Dépensez votre or pour acheter des reliques et des consommables.",
  },
  {
    type: "EVENT",
    icon: "i-heroicons-question-mark-circle",
    label: "Événement",
    description: "Un choix aléatoire aux effets surprises, bons ou mauvais.",
  },
];
</script>
