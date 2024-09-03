<template>
   <v-card v-for="theme in themes" class="theme-tile" outlined>
      <!-- Image de l'en-tête -->
      <v-img :src="image" height="200px"></v-img>

      <!-- Contenu de la tuile -->
      <v-card-title>{{ theme.name }}</v-card-title>
      <!-- <v-card-subtitle>{{ subtitle }}</v-card-subtitle> -->

      <!-- Barre de progression -->
      <v-card-actions>
         <v-progress-linear :value="progress" color="primary" height="10" class="mb-2"></v-progress-linear>
         <div class="text-caption">{{ progress }}% completed</div>
      </v-card-actions>

      <!-- Bouton d'action -->
      <v-card-actions>
         <v-btn color="primary" @click="router.push('/themes/' + theme.slug)">
            Start Quiz
         </v-btn>
      </v-card-actions>
   </v-card>
</template>

<script setup>
const { data: themes } = await useFetch("/api/theme/all");
const router = useRouter();
const progress = ref(5)
</script>

<style scoped>
.theme-tile {
   max-width: 300px;
   margin: 10px;
}
</style>