<template>
  <UModal v-model:open="open" :ui="{ content: 'max-w-md' }">
    <template #content>
      <UCard :ui="{ body: 'p-4 sm:p-6 max-h-[70vh] overflow-y-auto' }">
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
            plusieurs salles jusqu'au Boss qui termine l'acte. Le type de toutes les salles est
            toujours visible — avec la relique Prévoyance, cliquez un nœud de combat pour voir les
            thèmes de son ennemi avant de vous y engager. Répondez correctement aux questions pour
            progresser ; une mauvaise réponse vous coûte un point de vie. Survivez aux 3 actes pour
            gagner la run !
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
                <UIcon :name="roomTypeIcon(room.type)" />
              </div>
              <div class="min-w-0">
                <p class="text-xs font-black font-display text-white tracking-wide">
                  {{ roomTypeLabel(room.type) }}
                </p>
                <p class="text-[11px] text-gray-400 leading-relaxed mt-0.5">
                  {{ room.description }}
                </p>
              </div>
            </div>
          </div>

          <p class="text-[11px] text-gray-500 leading-relaxed">
            L'or gagné en combat se dépense en Librairie : dépensez-le sans regret, il ne compte pas
            dans vos gains de fin de run. Les Points de Savoir récompensent vos bonnes réponses
            (davantage si les questions sont difficiles), l'étage atteint et chaque Boss vaincu ;
            ils débloquent des talents permanents dans l'Arbre de talents.
          </p>
        </div>
      </UCard>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import type { BrainrunRoomType } from "#shared/brainrun";
import { BRAINRUN_REST_HEAL } from "#shared/brainrunErudition";

const open = defineModel<boolean>("open", { required: true });

// Icônes/libellés partagés avec la carte et sa légende (cf. useBrainrunRoomTypeDisplay).
const { roomTypeLabel, roomTypeIcon } = useBrainrunRoomTypeDisplay();

const rooms: { type: BrainrunRoomType; description: string }[] = [
  {
    type: "STANDARD",
    description: "Affrontez un ennemi standard sur une série de questions. Rapporte or et XP.",
  },
  {
    type: "ELITE",
    description:
      "Un ennemi plus coriace, plus de questions à enchaîner. Meilleures récompenses et un bonus (relique ou consommable) au choix à la victoire.",
  },
  {
    type: "BOSS",
    description:
      "Termine l'acte. Répondez vite pour infliger plus de dégâts ; chaque erreur vous coûte des PV. Bonus garanti à la victoire.",
  },
  {
    type: "REST",
    // Montant tiré de la même constante que le serveur (il était affiché "1" alors que le repos
    // rend 2 PV) ; l'Érudition IV le réduit, d'où la précision.
    description: `Aucune question : reposez-vous pour regagner ${BRAINRUN_REST_HEAL} points de vie (moins à haute Érudition), ou bannissez un thème pour le reste de la run (même règle que la relique Purge Thématique).`,
  },
  {
    type: "SHOP",
    description: "Dépensez votre or pour acheter des reliques et des consommables.",
  },
  {
    type: "EVENT",
    description: "Un choix aléatoire aux effets surprises, bons ou mauvais.",
  },
];
</script>
