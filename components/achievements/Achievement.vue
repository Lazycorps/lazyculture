<template>
  <div class="d-flex flex-wrap">
    <v-tooltip
      v-for="achievement in achievementsStore.achievements.filter(
        (a) => !a.hidden
      )"
    >
      <template v-slot:activator="{ props }">
        <div
          v-bind="props"
          :class="
            userHasAchievment(achievement.id)
              ? 'achievement-icon'
              : 'achievement-icon-disabled'
          "
        >
          <img
            v-if="achievement?.icon"
            :src="achievement.icon"
            alt="Achievement Icon"
          />
          <div v-else>🏆</div>
        </div>
      </template>
      <template #default>
        <b>{{ achievement.title }}</b> (+{{ achievement.xpEarned }} xp)
        <p>{{ achievement.description }}</p>
      </template>
    </v-tooltip>
  </div>
</template>

<script setup lang="ts">
const achievementsStore = useAchievementStore();

function userHasAchievment(achievementId: number) {
  return achievementsStore.userAchievements.some(
    (a) => a.achievementId == achievementId
  );
}
</script>

<style scoped lang="scss">
/* Style de l'icône */
.achievement-icon {
  width: 80px;
  height: 80px;
  font-size: 35px;
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: default;
  background-color: #323741;
  border-width: 2px;
  border-style: solid;
  border-image: linear-gradient(to right, yellow, orange) 1;
  margin: 2px;
}

.achievement-icon-disabled {
  @extend .achievement-icon;
  filter: grayscale(1);
}

.achievement-icon img,
.achievement-icon-disabled img {
  width: 80px;
  height: 80px;
  border-width: 2px;
  border-style: solid;
  border-image: linear-gradient(to right, yellow, orange) 1;
}
</style>
