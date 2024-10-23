<template>
    <div class="d-flex flex-wrap">
        <v-tooltip v-for="achievement in achievementsStore.achievements">
            <template v-slot:activator="{ props }">
                <div v-bind="props" class="achievement-icon"
                    :style="userHasAchievment(achievement.id) ? 'filter: grayscale(0);' : 'filter: grayscale(1);'">
                    <img v-if="achievement?.icon" :src="achievement.icon" alt="Achievement Icon">
                    <div v-else class="achievement-icon">🏆</div>
                </div>
            </template>
            <template #default>
                <b>{{ achievement.title }}</b>
                <p>{{ achievement.description }}</p>
            </template>
        </v-tooltip>
    </div>
</template>

<script setup lang="ts">
const achievementsStore = useAchievementStore();

function userHasAchievment(achievementId: number) {
    return achievementsStore.userAchievements.some(a => a.achievementId == achievementId);
}
</script>

<style scoped>
/* Style de l'icône */
.achievement-icon {
    font-size: 35px;
    margin: 3px;
    cursor: default;
}
</style>