<template>
  <div class="w-full max-w-5xl mx-auto py-2 space-y-8 select-none">
    <!-- Header Title -->
    <div class="text-center md:text-left space-y-2">
      <h2
        class="text-3xl font-black font-display tracking-tight bg-gradient-to-r from-violet-400 via-indigo-300 to-cyan-400 bg-clip-text text-transparent"
      >
        Notifications Push
      </h2>
      <p class="text-sm text-gray-400 font-medium">
        Envoyez une notification push manuelle à tous les utilisateurs abonnés. Idéal pour annoncer
        une nouveauté, un événement ou un défi spécial.
      </p>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <!-- Compose Form Card -->
      <UCard
        class="shadow-glass bg-[#111827]/70 backdrop-blur-xl border border-white/10 rounded-2xl lg:col-span-2"
      >
        <form @submit.prevent="confirmAndSend" class="space-y-5">
          <h3 class="text-lg font-black font-display text-white flex items-center">
            📣 Composer le message
          </h3>

          <UFormGroup label="Titre" name="title" class="space-y-1.5">
            <UInput
              v-model="form.title"
              placeholder="Ex: Nouveau défi disponible ! 🎉"
              color="primary"
              variant="outline"
              :maxlength="60"
              class="w-full text-white"
              required
            />
            <p class="text-[10px] text-gray-500 text-right">{{ form.title.length }}/60</p>
          </UFormGroup>

          <UFormGroup label="Message" name="body" class="space-y-1.5">
            <UTextarea
              v-model="form.body"
              placeholder="Le contenu de la notification affiché aux utilisateurs..."
              color="primary"
              variant="outline"
              :rows="3"
              :maxlength="160"
              class="w-full text-white"
              required
            />
            <p class="text-[10px] text-gray-500 text-right">{{ form.body.length }}/160</p>
          </UFormGroup>

          <UFormGroup
            label="Lien de destination (optionnel)"
            name="url"
            class="space-y-1.5"
            help="Page ouverte au clic sur la notification. Défaut : /themes"
          >
            <UInput
              v-model="form.url"
              placeholder="/themes"
              color="primary"
              variant="outline"
              class="w-full text-white"
            />
          </UFormGroup>

          <UButton
            type="submit"
            color="primary"
            block
            :loading="sending"
            :disabled="!form.title.trim() || !form.body.trim()"
            icon="i-heroicons-paper-airplane"
            class="font-bold font-display text-xs justify-center py-2.5 shadow-lg shadow-violet-600/20"
          >
            Envoyer à tous les utilisateurs
          </UButton>
        </form>
      </UCard>

      <!-- Preview + Result Card -->
      <UCard
        class="shadow-glass bg-[#111827]/70 backdrop-blur-xl border border-white/10 rounded-2xl lg:col-span-1"
      >
        <div class="space-y-4">
          <h3 class="text-lg font-black font-display text-white flex items-center">👀 Aperçu</h3>

          <!-- Notification mockup -->
          <div class="bg-white/5 border border-white/10 rounded-xl p-3 flex items-start space-x-3">
            <div
              class="w-9 h-9 rounded-lg bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-lg flex-shrink-0"
            >
              👑
            </div>
            <div class="min-w-0 flex-1">
              <p class="text-sm font-bold text-white truncate">
                {{ form.title || "Titre de la notification" }}
              </p>
              <p class="text-xs text-gray-400 break-words">
                {{ form.body || "Le contenu apparaîtra ici…" }}
              </p>
              <p class="text-[10px] text-gray-600 mt-1 truncate">
                Lazyculture · {{ form.url.trim() || "/themes" }}
              </p>
            </div>
          </div>

          <!-- Result -->
          <div
            v-if="result"
            class="rounded-xl p-3 text-xs font-semibold font-display border"
            :class="
              result.failureCount > 0
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
            "
          >
            <p class="font-black mb-1">✅ Envoi terminé</p>
            <ul class="space-y-0.5 text-gray-300 font-medium">
              <li>{{ result.recipients }} utilisateur(s) ciblé(s)</li>
              <li>{{ result.notificationsSent }} notification(s) envoyée(s)</li>
              <li v-if="result.failureCount > 0" class="text-amber-300">
                {{ result.failureCount }} échec(s)
              </li>
            </ul>
          </div>

          <p v-if="errorMsg" class="text-xs text-rose-400 font-semibold">
            {{ errorMsg }}
          </p>
        </div>
      </UCard>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from "vue";

definePageMeta({
  middleware: "admin",
});

interface BroadcastResult {
  success: boolean;
  notificationsSent: number;
  failureCount: number;
  recipients: number;
  totalSubscriptions: number;
}

const form = reactive({
  title: "",
  body: "",
  url: "",
});

const sending = ref(false);
const result = ref<BroadcastResult | null>(null);
const errorMsg = ref("");

async function confirmAndSend() {
  if (!form.title.trim() || !form.body.trim()) return;

  if (
    !confirm(
      "Confirmez-vous l'envoi de cette notification push à TOUS les utilisateurs abonnés ? Cette action est immédiate et irréversible.",
    )
  ) {
    return;
  }

  errorMsg.value = "";
  result.value = null;

  try {
    sending.value = true;
    result.value = await $fetch<BroadcastResult>("/api/admin/notifications/broadcast", {
      method: "post",
      body: {
        title: form.title.trim(),
        body: form.body.trim(),
        url: form.url.trim() || undefined,
      },
    });

    // Réinitialiser le formulaire après un envoi réussi
    form.title = "";
    form.body = "";
    form.url = "";
  } catch (error: any) {
    errorMsg.value = error?.data?.statusMessage || "Erreur lors de l'envoi des notifications push.";
  } finally {
    sending.value = false;
  }
}
</script>
