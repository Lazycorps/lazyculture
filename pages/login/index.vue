<template>
  <div class="w-full max-w-sm mx-auto py-10 select-none">
    <UCard
      class="shadow-glass bg-[#111827]/70 backdrop-blur-xl border border-white/10 rounded-2xl p-2"
    >
      <template #header>
        <div class="text-center space-y-1.5">
          <h2 class="text-2xl font-black font-display text-white tracking-wide">Connexion</h2>
          <p class="text-xs text-gray-400 font-medium">
            Entrez vos accès pour continuer sur Lazyculture
          </p>
        </div>
      </template>

      <form @submit.prevent="signIn" class="space-y-4">
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

        <!-- Password Field with view toggle -->
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
            placeholder="••••••••"
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
          <div class="flex justify-end mt-1 px-1">
            <NuxtLink
              to="/login/forgotpassword"
              class="text-[10px] font-bold font-display text-violet-400 hover:text-violet-300 hover:underline transition-colors"
            >
              Mot de passe oublié ?
            </NuxtLink>
          </div>
        </UFormField>

        <!-- Alerts -->
        <div class="pt-2">
          <UAlert
            v-if="displayError"
            color="red"
            variant="soft"
            icon="i-heroicons-exclamation-triangle"
            :title="displayError"
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

        <!-- Action Row -->
        <div class="flex items-center justify-between pt-4 gap-3">
          <UButton
            variant="ghost"
            color="primary"
            class="text-xs font-bold font-display"
            @click="router.push('/login/register')"
          >
            S'inscrire
          </UButton>
          <UButton
            type="submit"
            color="primary"
            size="md"
            :loading="loading"
            class="font-black font-display uppercase tracking-widest px-6"
          >
            Se connecter
          </UButton>
        </div>
      </form>
    </UCard>
  </div>
</template>

<script setup lang="ts">
const supabase = useSupabaseClient();
const router = useRouter();

const passwordType = ref<"password" | "text">("password");
const email = ref("");
const password = ref("");
const loading = ref(false);

const successMessage = ref("");
const displayError = ref("");

function togglePassword() {
  passwordType.value = passwordType.value === "password" ? "text" : "password";
}

async function signIn() {
  displayError.value = "";
  successMessage.value = "";
  if (!email.value || !password.value) {
    displayError.value = "L'adresse email et le mot de passe sont requis.";
    return;
  }
  try {
    loading.value = true;
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.value,
      password: password.value,
    });
    if (error) {
      displayError.value = error.message;
    } else if (data?.user) {
      const token = data.session?.access_token;
      await $fetch("/api/user/create", {
        method: "post",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: {
          id: data.user.id,
          name: "",
          slug: "",
        },
      });
      router.push("/");
    }
  } catch (err: any) {
    displayError.value = "Identifiants invalides.";
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
/* Custom overrides if needed */
</style>
