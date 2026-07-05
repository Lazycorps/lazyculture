<template>
  <!-- Équipé : cliquer déséquipe -->
  <UButton
    v-if="item.equipped"
    color="primary"
    variant="solid"
    size="xs"
    block
    :loading="pending"
    icon="i-heroicons-check"
    @click="emit('equip')"
  >
    Équipé
  </UButton>

  <!-- Possédé mais non équipé -->
  <UButton
    v-else-if="item.owned"
    color="primary"
    variant="outline"
    size="xs"
    block
    :loading="pending"
    @click="emit('equip')"
  >
    Équiper
  </UButton>

  <!-- Gratuit, pas encore réclamé -->
  <UButton
    v-else-if="item.unlockType === 'FREE'"
    color="success"
    variant="soft"
    size="xs"
    block
    :loading="pending"
    @click="emit('unlock')"
  >
    Débloquer
  </UButton>

  <!-- Achat en pièces -->
  <UButton
    v-else-if="item.unlockType === 'COINS'"
    color="warning"
    variant="soft"
    size="xs"
    block
    :loading="pending"
    :disabled="coins < item.price"
    icon="i-heroicons-circle-stack"
    @click="emit('unlock')"
  >
    {{ item.price }}
  </UButton>

  <!-- Lié à un exploit : réclamable si l'exploit est débloqué -->
  <UButton
    v-else-if="item.achievementUnlocked"
    color="success"
    variant="soft"
    size="xs"
    block
    :loading="pending"
    icon="i-heroicons-trophy"
    @click="emit('unlock')"
  >
    Réclamer
  </UButton>
  <UButton
    v-else
    color="neutral"
    variant="soft"
    size="xs"
    block
    disabled
    icon="i-heroicons-lock-closed"
    :title="item.achievementTitle ? `Exploit : ${item.achievementTitle}` : 'Exploit requis'"
  >
    <span class="truncate">{{ item.achievementTitle || "Exploit requis" }}</span>
  </UButton>
</template>

<script setup lang="ts">
import type { AvatarFrameItemDTO, AvatarItemDTO, CosmeticType } from "#shared/DTO/cosmeticDTO";

defineProps<{
  item: AvatarItemDTO | AvatarFrameItemDTO;
  type: CosmeticType;
  coins: number;
  pending: boolean;
}>();

const emit = defineEmits<{
  unlock: [];
  equip: [];
}>();
</script>
