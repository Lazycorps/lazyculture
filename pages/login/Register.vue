<template>
  <div class="w-full max-w-sm mx-auto py-10 select-none">
    <UCard
      class="shadow-glass bg-[#111827]/70 backdrop-blur-xl border border-white/10 rounded-2xl p-2"
    >
      <template #header>
        <div class="text-center space-y-1.5">
          <h2 class="text-2xl font-black font-display text-white tracking-wide">Créer un compte</h2>
          <p class="text-xs text-gray-400 font-medium">
            Rejoignez Lazyculture pour sauvegarder vos scores !
          </p>
        </div>
      </template>

      <form @submit.prevent="register" class="space-y-4">
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
            placeholder="nom@exemple.com"
            icon="i-heroicons-envelope"
            required
            class="w-full"
            :ui="{ background: 'bg-white/5 border border-white/10 text-white' }"
          />
        </UFormField>

        <!-- Password Field with eye toggle -->
        <UFormField
          label="Mot de passe"
          name="password"
          :ui="{
            label: {
              text: 'text-xs font-bold text-gray-400 uppercase tracking-wider font-display',
            },
          }"
        >
          <UInput
            v-model="password"
            :type="passwordType"
            placeholder="Min 8 caractères, 1 Maj, 1 Chiffre"
            icon="i-heroicons-lock-closed"
            required
            class="w-full"
            :ui="{ background: 'bg-white/5 border border-white/10 text-white' }"
          >
            <template #trailing>
              <UButton
                :icon="passwordType === 'password' ? 'i-heroicons-eye' : 'i-heroicons-eye-slash'"
                color="gray"
                variant="ghost"
                class="hover:bg-white/5 text-gray-400"
                @click="togglePassword"
              />
            </template>
          </UInput>
        </UFormField>

        <!-- Validation Error Message Alert -->
        <div class="pt-2" v-if="errorDisplay">
          <UAlert
            color="red"
            variant="soft"
            icon="i-heroicons-exclamation-triangle"
            :title="errorDisplay"
            :ui="{ wrapper: 'rounded-xl' }"
          />
        </div>

        <!-- Action Row -->
        <div class="flex items-center justify-between pt-4 gap-3">
          <UButton
            variant="ghost"
            color="primary"
            class="text-xs font-bold font-display"
            @click="router.push('/login')"
          >
            Se connecter
          </UButton>
          <UButton
            type="submit"
            color="primary"
            size="md"
            :loading="loading"
            class="font-black font-display uppercase tracking-widest px-6"
          >
            S'enregistrer
          </UButton>
        </div>
      </form>
    </UCard>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
const router = useRouter();

const passwordType = ref<"password" | "text">("password");
const email = ref("");
const password = ref("");
const errorDisplay = ref("");
const loading = ref(false);

function togglePassword() {
  passwordType.value = passwordType.value === "password" ? "text" : "password";
}

async function register() {
  errorDisplay.value = "";

  // Validation Rules
  if (!email.value || !password.value) {
    errorDisplay.value = "L'adresse email et le mot de passe sont requis.";
    return;
  }
  if (!/.+@.+\..+/.test(email.value)) {
    errorDisplay.value = "Adresse email invalide.";
    return;
  }
  if (
    !/^(?=.*[A-ZÀ-ÖØ-Þ])(?=.*\d)[A-Za-zÀ-öø-ÿ\d~`!@#$%^&*()-_+={}|;:'",.<>?\\]{8,}$/.test(
      password.value,
    )
  ) {
    errorDisplay.value =
      "Le mot de passe doit faire au moins 8 caractères et contenir au moins une lettre majuscule et un chiffre.";
    return;
  }

  try {
    loading.value = true;
    const supabase = useSupabaseClient();
    const { data, error } = await supabase.auth.signUp({
      email: email.value,
      password: password.value,
    });
    if (error) {
      errorDisplay.value = error.message;
    } else {
      router.push("/login/registerValidation");
    }
  } catch (err: any) {
    errorDisplay.value = "Une erreur est survenue lors de l'inscription.";
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
/* Custom overrides if needed */
</style>
