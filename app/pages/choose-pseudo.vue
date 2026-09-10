<template>
  <div class="w-full max-w-md mx-auto py-12 px-4 select-none">
    <UCard
      class="shadow-glass bg-[#111827]/80 backdrop-blur-2xl border border-white/10 rounded-2xl p-4 sm:p-6"
    >
      <template #header>
        <div class="text-center space-y-3">
          <div
            class="w-16 h-16 mx-auto rounded-2xl bg-primary-500/10 border border-primary-500/20 flex items-center justify-center text-3xl shadow-glow"
          >
            🦥
          </div>
          <div class="space-y-1">
            <h1 class="text-2xl font-black font-display text-white tracking-wide">
              Bienvenue sur Lazyculture !
            </h1>
            <p class="text-xs sm:text-sm text-gray-400 font-medium leading-relaxed">
              Pour participer aux quiz, duels et classements, veuillez choisir votre pseudonyme de
              joueur.
            </p>
          </div>
        </div>
      </template>

      <form @submit.prevent="submitPseudo" class="space-y-5">
        <!-- Pseudo Input -->
        <UFormField
          label="Votre Pseudonyme"
          name="username"
          :ui="{
            label: 'text-xs font-bold text-gray-400 uppercase tracking-wider font-display',
          }"
        >
          <UInput
            v-model="username"
            type="text"
            placeholder="Ex: SuperQuizzer"
            icon="i-heroicons-user"
            size="lg"
            required
            autocomplete="off"
            class="w-full"
            :ui="{ base: 'bg-white/5 border border-white/10 text-white' }"
          />
        </UFormField>

        <!-- Rules reminder -->
        <div
          class="bg-white/5 border border-white/5 rounded-xl p-3 text-xs text-gray-400 space-y-1"
        >
          <p class="font-bold text-gray-300">Règles du pseudonyme :</p>
          <ul class="list-disc list-inside space-y-0.5 text-[11px] text-gray-400">
            <li>Entre 4 et 16 caractères</li>
            <li>Lettres, chiffres, tirets et underscores autorisés</li>
            <li>Premier choix gratuit pour votre compte</li>
          </ul>
        </div>

        <!-- Validation Error Message Alert -->
        <div v-if="errorDisplay">
          <UAlert
            color="error"
            variant="soft"
            icon="i-heroicons-exclamation-triangle"
            :title="errorDisplay"
            :ui="{ wrapper: 'rounded-xl' }"
          />
        </div>

        <!-- Submit Button -->
        <div class="pt-2">
          <UButton
            type="submit"
            color="primary"
            block
            size="lg"
            :loading="loading"
            :disabled="loading"
            class="font-black font-display uppercase tracking-widest py-3 text-sm"
          >
            Commencer l'aventure
          </UButton>
        </div>
      </form>
    </UCard>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";
import { validateUsername } from "#shared/user";
import { useUserStore } from "~/stores/userStore";
import { useAuthFetch } from "~/composables/useAuthFetch";

const router = useRouter();
const user = useSupabaseUser();
const userStore = useUserStore();
const { authFetch } = useAuthFetch();
const toast = useToast();
const showBottomNav = useState("showBottomNav", () => true);

const username = ref("");
const errorDisplay = ref("");
const loading = ref(false);

onMounted(async () => {
  showBottomNav.value = false;

  // S'il n'y a pas d'utilisateur connecté -> redirection vers la page de connexion
  if (!user.value) {
    router.replace("/login");
    return;
  }

  // S'assurer que le profil est chargé
  await userStore.fetchUser();

  // Si l'utilisateur a déjà un pseudo -> redirection vers l'accueil
  if (userStore.username && userStore.username.trim() !== "") {
    router.replace("/");
    return;
  }

  // Pré-remplissage avec une suggestion éventuelle des métadonnées
  const suggested =
    user.value.user_metadata?.lazyculture_username ||
    user.value.user_metadata?.username ||
    user.value.user_metadata?.full_name;

  if (typeof suggested === "string" && suggested.trim()) {
    username.value = suggested.trim();
  }
});

onUnmounted(() => {
  showBottomNav.value = true;
});

async function submitPseudo() {
  errorDisplay.value = "";

  const validation = validateUsername(username.value);
  if (!validation.valid) {
    errorDisplay.value = validation.error || "Pseudonyme invalide.";
    return;
  }

  try {
    loading.value = true;

    // Vérification de disponibilité au moment du clic
    const checkRes = await $fetch<{ available: boolean; message?: string }>(
      "/api/user/check-username",
      {
        params: { username: validation.trimmed },
      },
    ).catch(() => null);

    if (checkRes && !checkRes.available) {
      errorDisplay.value =
        checkRes.message || "Ce pseudonyme est déjà utilisé par un autre joueur.";
      return;
    }

    const updatedUser = await authFetch<any>("/api/user/username", {
      method: "POST",
      body: {
        username: validation.trimmed,
      },
    });

    if (userStore.user) {
      userStore.user.name = updatedUser?.name || validation.trimmed;
      userStore.user.slug = updatedUser?.slug || "";
    } else {
      await userStore.fetchUser(true);
    }

    toast.add({
      title: "Bienvenue !",
      description: `Votre pseudonyme "${validation.trimmed}" a été configuré avec succès.`,
      color: "success",
    });

    router.replace("/");
  } catch (err: any) {
    errorDisplay.value =
      err?.data?.statusMessage ||
      err?.message ||
      "Une erreur est survenue lors de l'enregistrement du pseudonyme.";
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.shadow-glow {
  box-shadow: 0 0 25px -5px rgba(99, 102, 241, 0.3);
}
</style>
