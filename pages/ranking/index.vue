<template>
  <v-card
    flat
    rounded
    class="my-auto mx-auto pa-5"
    style="max-width: 600px; min-width: 400px"
  >
    <v-list>
      <v-list-item
        v-for="(user, key) in users"
        :key="user.userId"
        class="mx-auto"
      >
        <template v-slot:prepend>
          <v-avatar :color="getColorByRank(key + 1)">
            {{ key + 1 }}
          </v-avatar>
        </template>
        {{ user.name ? user.name : "Anonymous" }}
        <template v-slot:append>
          <div class="mr-5" style="width: 100px; text-align: end">
            {{ user.xp }}
          </div>
          <div style="width: 50px; text-align: end">{{ user.bestAscend }}</div>
        </template>
      </v-list-item>
    </v-list>
  </v-card>
</template>

<script setup lang="ts">
const { data: users } = await useFetch("/api/ranking/top");

function getColorByRank(rank: number) {
  if (rank == 1) return "#FFD700";
  if (rank == 2) return "#C0C0C0";
  if (rank == 3) return "#CD7F32";
  return "";
}
</script>

<style scoped></style>
