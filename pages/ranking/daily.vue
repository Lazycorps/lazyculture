<template>
    <v-card flat rounded class="my-auto mx-auto pa-5" style="max-width: 600px; min-width: 400px;">
        <h2>Daily ranking</h2>
        <v-divider class="my-5"></v-divider>
        <v-list>
            <v-list-item v-for="(user, key) in users" :key="user.userId" class="mx-auto">
                <template v-slot:prepend>
                    <v-avatar :color="getColorByRank(key + 1)">
                        {{ key + 1 }}
                    </v-avatar>
                </template>
                {{ user.userName }}

                <template v-slot:append>
                    <div class="d-flex" style="text-align: end;">
                        <div class="mr-5" style="min-width: 50px;">{{ user.score }} / 10</div>
                        <div style="min-width: 90px;">{{ user.elapsedTime }} min</div>
                    </div>
                </template>
            </v-list-item>
        </v-list>
    </v-card>
</template>

<script setup lang="ts">

const { data: users } = await useFetch("/api/series/dailyRanking");

function getColorByRank(rank: number) {
    if (rank == 1) return "#FFD700";
    if (rank == 2) return "#C0C0C0";
    if (rank == 3) return "#CD7F32";
    return "";
}
</script>

<style scoped></style>