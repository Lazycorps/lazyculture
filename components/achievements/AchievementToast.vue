<template>
    <div class="achievement-notification">
        <div class="achievement-icon">
            <img v-if="achievement?.icon" :src="achievement.icon" alt="Achievement Icon">
            <div v-else class="achievement-icon">🏆</div>
        </div>
        <div class="achievement-content">
            <p class="achievement-title">{{ achievement?.title }}</p>
            <p class="achievement-description">{{ achievement?.description }}</p>
            <!-- <p class="achievement-xp">+{{ achievement?.xpEarned }} xp</p> -->
        </div>
    </div>
</template>

<script setup lang="ts">
import type { ToastOptions } from 'vue3-toastify';
import type { PropType } from 'vue';
import type { UserAchievementDTO } from '~/models/DTO/achievementDTO';

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
/* .achievement-icon img {
    width: 50px;
    height: 50px;
    margin-right: 15px;
    border-radius: 5px;
    border: 2px solid #f39c12;
} */

/* Style de l'icône */
.achievement-icon {
    font-size: 35px;
    margin-right: 5px;
}

/* Contenu de l'achievement */
.achievement-content {
    margin: 0 5px 0 5px;
    display: flex;
    flex-direction: column;
}

.achievement-title {
    font-size: 22px;
    font-weight: bold;
    margin: 0;
    color: #a9b2c1;
    /* Couleur dorée pour le titre */
}

.achievement-description {
    font-size: 16px;
    margin: 5px 0 10px 0;
    color: #a9b2c1;
    /* Gris clair pour la description */
}

/* .achievement-xp {
    font-size: 16px;
    font-weight: bold;
    color: #6fcf97;
    /* Vert clair pour la valeur d'XP 
}

*/
</style>