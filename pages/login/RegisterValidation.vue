<template>
  <v-container fluid class="fill-height d-flex justify-center align-center">
    <v-card width="450px" class="pa-10 d-flex flex-column" rounded="100">
      <v-alert type="success" class="mb-5" variant="tonal">
        <p class="mb-3">
          Thank you for signing up. <b>To activate your account</b>, please
          verify your email address by clicking the confirmation link we've sent
          to your inbox.
        </p>
        <p>
          If you haven't received the email within a few minutes, please check
          your spam or junk folder.
        </p>
      </v-alert>
      <div class="align-self-end">
        <v-btn @click="router.push('Signin')" color="primary" variant="flat"
          >Sign In</v-btn
        >
      </div>
    </v-card>
  </v-container>
</template>

<script setup lang="ts">
import { useRouter } from "vue-router";
const router = useRouter();
</script>
