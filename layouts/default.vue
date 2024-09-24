<template>
  <v-layout>
      <v-main>
        <slot />
      </v-main>
      <v-bottom-navigation>
        <v-btn value="Themes" @click="router.push('/themes')" width="110">
          <v-icon>mdi-book-open-variant-outline</v-icon>

          <span>Themes</span>
        </v-btn>

        <v-btn value="Random" @click="router.push('/')" width="110">
          <v-icon>mdi-dice-5</v-icon>

          <span>Random</span>
        </v-btn>

        <v-btn value="User" @click="goUserPage()" width="110">
          <v-icon>mdi-account</v-icon>

          <span>My account</span>
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
