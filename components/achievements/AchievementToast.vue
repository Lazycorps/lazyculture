<template>
  <div class="achievement-notification">
    <div class="achievement-icon">
      <img
        v-if="achievement?.icon"
        :src="achievement.icon"
        alt="Achievement Icon"
      />
      <div v-else class="achievement-icon">🏆</div>
    </div>
    <div class="achievement-content">
      <p class="achievement-title">{{ achievement?.title }}</p>
      <p class="achievement-description">
        {{ achievement?.description }} (+{{ achievement?.xpEarned }} xp)
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ToastOptions } from "vue3-toastify";
import type { PropType } from "vue";
import type { UserAchievementDTO } from "~/models/DTO/achievementDTO";

const props = defineProps<{
  toastProps?: PropType<ToastOptions>;
  achievement?: UserAchievementDTO;
}>();
</script>

<style scoped>
/* Style pour la notification d'Achievement */
.achievement-notification {
  background-color: #1b1f23;
  color: #d0d4d9;
  display: flex;
  align-items: center;
}

/* Style de l'icône */
.achievement-icon {
  width: 60px;
  height: 60px;
  font-size: 35px;
  margin-right: 2px;
  display: flex;
  justify-content: center;
  align-items: center;
}

/* Style de l'icône */
.achievement-icon img {
  width: 60px;
  height: 60px;
  margin-right: 15px;
  border-radius: 5px;
  border: 2px solid #f39c12;
}

/* Contenu de l'achievement */
.achievement-content {
  /* margin: 0 5px 0 5px; */
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.achievement-title {
  font-size: 20px;
  font-weight: bold;
  margin: 0;
  color: #a9b2c1;
}

.achievement-description {
  font-size: 16px;
  color: #a9b2c1;
}
</style>
