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
              <UIcon name="i-heroicons-lock-closed" class="text-2xl text-violet-400" />
            </div>
          </div>
          <h2 class="text-2xl font-black font-display text-white tracking-wide">
            Nouveau mot de passe
          </h2>
          <p class="text-xs text-gray-400 font-medium">
            Réinitialisez votre mot de passe pour accéder à votre compte.
          </p>
        </div>
      </template>

      <!-- Loading state during session exchange -->
      <div v-if="!sessionReady && !sessionError" class="text-center py-8 space-y-4">
        <UIcon name="i-heroicons-arrow-path" class="text-3xl text-violet-500 animate-spin" />
        <p class="text-xs text-gray-400 font-medium">Vérification du lien de réinitialisation...</p>
      </div>

      <!-- Session Error -->
      <div v-else-if="sessionError" class="space-y-4">
        <UAlert
          color="error"
          variant="soft"
          icon="i-heroicons-exclamation-triangle"
          :title="sessionError"
          :ui="{ wrapper: 'rounded-xl' }"
        />
        <UButton
          color="primary"
          block
          size="md"
          class="font-black font-display uppercase tracking-widest py-3 mt-4"
          @click="router.push('/login/forgotpassword')"
        >
          Demander un nouveau lien
        </UButton>
      </div>

      <!-- Password Reset Form -->
      <form v-else @submit.prevent="resetPassword" class="space-y-4">
        <!-- New Password Field -->
        <UFormField
          label="Nouveau mot de passe"
          name="password"
          :ui="{
            label: 'text-xs font-bold text-gray-400 uppercase tracking-wider font-display',
          }"
        >
          <UInput
            v-model="password"
            :type="passwordType"
            placeholder="••••••••"
            icon="i-heroicons-lock-closed"
            required
            class="w-full"
            :ui="{ base: 'bg-white/5 border border-white/10 text-white' }"
          >
            <template #trailing>
              <UButton
                :icon="passwordType === 'password' ? 'i-heroicons-eye' : 'i-heroicons-eye-slash'"
                color="neutral"
                variant="ghost"
                class="hover:bg-white/5 text-gray-400"
                @click="togglePassword"
              />
            </template>
          </UInput>

          <!-- Password Checklist -->
          <div class="text-xs space-y-1.5 mt-2.5 px-1 font-semibold text-gray-400">
            <div
              class="flex items-center gap-2"
              :class="hasMinLength ? 'text-emerald-400' : 'text-gray-500'"
            >
              <UIcon
                :name="hasMinLength ? 'i-heroicons-check-circle-solid' : 'i-heroicons-x-circle'"
              />
              <span>Au moins 8 caractères</span>
            </div>
            <div
              class="flex items-center gap-2"
              :class="hasUppercase ? 'text-emerald-400' : 'text-gray-500'"
            >
              <UIcon
                :name="hasUppercase ? 'i-heroicons-check-circle-solid' : 'i-heroicons-x-circle'"
              />
              <span>Une lettre majuscule</span>
            </div>
            <div
              class="flex items-center gap-2"
              :class="hasNumber ? 'text-emerald-400' : 'text-gray-500'"
            >
              <UIcon
                :name="hasNumber ? 'i-heroicons-check-circle-solid' : 'i-heroicons-x-circle'"
              />
              <span>Un chiffre</span>
            </div>
          </div>
        </UFormField>

        <!-- Confirm Password Field -->
        <UFormField
          label="Confirmer le mot de passe"
          name="confirmPassword"
          :ui="{
            label: 'text-xs font-bold text-gray-400 uppercase tracking-wider font-display',
          }"
        >
          <UInput
            v-model="confirmPassword"
            :type="confirmPasswordType"
            placeholder="••••••••"
            icon="i-heroicons-lock-closed"
            required
            class="w-full"
            :ui="{ base: 'bg-white/5 border border-white/10 text-white' }"
          >
            <template #trailing>
              <UButton
                :icon="
                  confirmPasswordType === 'password' ? 'i-heroicons-eye' : 'i-heroicons-eye-slash'
                "
                color="neutral"
                variant="ghost"
                class="hover:bg-white/5 text-gray-400"
                @click="toggleConfirmPassword"
              />
            </template>
          </UInput>
        </UFormField>

        <!-- Alerts -->
        <div class="pt-2">
          <UAlert
            v-if="errorMessage"
            color="error"
            variant="soft"
            icon="i-heroicons-exclamation-triangle"
            :title="errorMessage"
            :ui="{ wrapper: 'rounded-xl' }"
          />
          <UAlert
            v-if="successMessage"
            color="success"
            variant="soft"
            icon="i-heroicons-check-circle"
            :title="successMessage"
            :ui="{ wrapper: 'rounded-xl' }"
          />
        </div>

        <!-- Submit Button -->
        <UButton
          v-if="!successMessage"
          type="submit"
          color="primary"
          block
          size="md"
          :loading="loading"
          class="font-black font-display uppercase tracking-widest py-3 mt-4"
        >
          Confirmer
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
import { ref, computed, onMounted } from "vue";

const route = useRoute();
const router = useRouter();
const supabase = useSupabaseClient();

const sessionReady = ref(false);
const sessionError = ref("");

const password = ref("");
const confirmPassword = ref("");

const passwordType = ref<"password" | "text">("password");
const confirmPasswordType = ref<"password" | "text">("password");

const loading = ref(false);
const errorMessage = ref("");
const successMessage = ref("");

const hasMinLength = computed(() => password.value.length >= 8);
const hasUppercase = computed(() => /[A-ZÀ-ÖØ-Þ]/.test(password.value));
const hasNumber = computed(() => /\d/.test(password.value));

function togglePassword() {
  passwordType.value = passwordType.value === "password" ? "text" : "password";
}

function toggleConfirmPassword() {
  confirmPasswordType.value = confirmPasswordType.value === "password" ? "text" : "password";
}

onMounted(async () => {
  try {
    // 1. Check if an active session already exists
    const { data: sessionData } = await supabase.auth.getSession();
    if (sessionData.session) {
      sessionReady.value = true;
      return;
    }

    // 2. Exchange code PKCE for a session
    const code = route.query.code as string | undefined;
    if (!code) {
      sessionError.value =
        "Lien de réinitialisation invalide ou expiré. Veuillez en demander un nouveau.";
      return;
    }

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.error("Exchange code error:", error);
      sessionError.value =
        "Lien de réinitialisation invalide ou expiré. Veuillez en demander un nouveau.";
      return;
    }

    sessionReady.value = true;
  } catch (err) {
    console.error("Session exchange failed:", err);
    sessionError.value =
      "Lien de réinitialisation invalide ou expiré. Veuillez en demander un nouveau.";
  }
});

async function resetPassword() {
  errorMessage.value = "";
  successMessage.value = "";

  if (!password.value || !confirmPassword.value) {
    errorMessage.value = "Tous les champs sont requis.";
    return;
  }

  if (password.value !== confirmPassword.value) {
    errorMessage.value = "Les mots de passe ne correspondent pas.";
    return;
  }

  if (!hasMinLength.value || !hasUppercase.value || !hasNumber.value) {
    errorMessage.value = "Le mot de passe ne respecte pas les critères de sécurité.";
    return;
  }

  try {
    loading.value = true;

    const { error } = await supabase.auth.updateUser({
      password: password.value,
    });

    if (error) {
      errorMessage.value = error.message;
      return;
    }

    successMessage.value = "Votre mot de passe a été réinitialisé avec succès !";

    // Redirect to login after 2 seconds
    setTimeout(() => {
      router.push("/login");
    }, 2000);
  } catch (err) {
    errorMessage.value = "Une erreur s'est produite lors de la réinitialisation.";
    console.error(err);
  } finally {
    loading.value = false;
  }
}
</script>
