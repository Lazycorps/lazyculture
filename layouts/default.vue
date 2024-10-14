<template>
  <v-layout>
    <v-main class="page-content">
      <slot />
    </v-main>
    <v-bottom-navigation fixed app>
      <v-btn value="Themes" @click="router.push('/themes')" width="100">
        <v-icon>mdi-book-open-variant-outline</v-icon>

        <span>Themes</span>
      </v-btn>

      <v-btn value="Daily" @click="router.push('/series/daily')" width="100">
        <v-icon>mdi-calendar</v-icon>

        <span>Daily</span>
      </v-btn>
      <v-btn value="Ranking" @click="router.push('/ranking')" width="100">
        <v-icon>mdi-podium-gold</v-icon>
        <span>Ranking</span>
      </v-btn>
      <v-btn value="User" @click="goUserPage()" width="100">
        <v-icon>mdi-account</v-icon>

        <span>Account</span>
      </v-btn>
    </v-bottom-navigation>
  </v-layout>
</template>

<script setup lang="ts">
const router = useRouter();
function goUserPage() {
  const user = useSupabaseUser();
  if (user.value == null) router.push("/login");
  else router.push("/user/profil");
}
</script>

<style>
html,
body,
#app,
.v-application {
  height: 100%;
  margin: 0;
}

.page-content {
  height: calc(100vh - 56px);
  /* 100% de la hauteur de la page moins la hauteur de la bottom navigation */
  overflow-y: auto;
  /* Ajoute une scrollbar uniquement si nécessaire pour le contenu */
}
</style>
