<template>
  <div class="w-full max-w-sm mx-auto py-10 select-none">
    <UCard
      class="shadow-glass bg-[#111827]/70 backdrop-blur-xl border border-white/10 rounded-2xl p-2"
    >
      <template #header>
        <div class="text-center space-y-1.5">
          <div class="flex justify-center mb-2">
            <div
              class="w-12 h-12 rounded-full bg-violet-500/10 border border-violet-500/20 flex items-center justify-center"
            >
              <UIcon name="i-heroicons-key" class="text-2xl text-violet-400" />
            </div>
          </div>
          <h2 class="text-2xl font-black font-display text-white tracking-wide">
            Mot de passe oublié
          </h2>
          <p class="text-xs text-gray-400 font-medium">
            Entrez votre adresse e-mail pour recevoir un lien de réinitialisation.
          </p>
        </div>
      </template>

      <!-- Alerts -->
      <div class="mb-4">
        <UAlert
          v-if="errorMessage"
          color="red"
          variant="soft"
          icon="i-heroicons-exclamation-triangle"
          :title="errorMessage"
          :ui="{ wrapper: 'rounded-xl' }"
        />
        <UAlert
          v-if="successMessage"
          color="emerald"
          variant="soft"
          icon="i-heroicons-check-circle"
          :title="successMessage"
          :ui="{ wrapper: 'rounded-xl' }"
        />
      </div>

      <form v-if="!successMessage" @submit.prevent="sendResetEmail" class="space-y-4">
        <!-- Email Field -->
        <UFormField
          label="Adresse Email"
          name="email"
          :ui="{
            label: {
              text: 'text-xs font-bold text-gray-400 uppercase tracking-wider font-display',
            },
          }"
        >
          <UInput
            v-model="email"
            type="email"
            placeholder="you@example.com"
            icon="i-heroicons-envelope"
            required
            class="w-full"
            :ui="{ background: 'bg-white/5 border border-white/10 text-white' }"
          />
        </UFormField>

        <!-- Submit Button -->
        <UButton
          type="submit"
          color="primary"
          block
          size="md"
          :loading="loading"
          class="font-black font-display uppercase tracking-widest py-3 mt-4"
        >
          Envoyer le lien
        </UButton>
      </form>

      <template #footer>
        <div class="text-center">
          <UButton
            variant="link"
            color="primary"
            class="p-0 font-bold font-display text-xs"
            icon="i-heroicons-arrow-left"
            @click="router.push('/login')"
          >
            Retour à la connexion
          </UButton>
        </div>
      </template>
    </UCard>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";

const router = useRouter();
const config = useRuntimeConfig();
const supabase = useSupabaseClient();

const email = ref("");
const errorMessage = ref("");
const successMessage = ref("");
const loading = ref(false);

async function sendResetEmail() {
  try {
    loading.value = true;
    errorMessage.value = "";
    successMessage.value = "";

    if (!email.value) {
      errorMessage.value = "L'adresse email est requise.";
      return;
    }

    // Build the absolute redirect URL
    const rawBaseUrl = config.public.baseUrl || "http://localhost:3000";
    const baseUrl = rawBaseUrl.includes("://") ? rawBaseUrl : `https://${rawBaseUrl}`;
    const redirectToUrl = `${baseUrl}/login/resetpassword`;

    const { error } = await supabase.auth.resetPasswordForEmail(email.value, {
      redirectTo: redirectToUrl,
    });

    if (error) {
      errorMessage.value = error.message;
      return;
    }

    successMessage.value = "Un e-mail de réinitialisation a été envoyé avec succès !";
  } catch (err) {
    errorMessage.value = "Une erreur est survenue. Veuillez réessayer.";
    console.error(err);
  } finally {
    loading.value = false;
  }
}
</script>
