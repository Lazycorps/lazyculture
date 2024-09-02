<template>
  {{ user ? user.email : "" }}
  <v-card flat rounded class="mx-auto my-auto pa-5">
    <Question></Question>
  </v-card>
</template>
<script setup>
const user = useSupabaseUser();
</script>
