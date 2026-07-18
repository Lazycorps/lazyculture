<template>
  <div class="w-full max-w-5xl mx-auto py-2 space-y-8 select-none">
    <!-- Header -->
    <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
      <div class="text-center md:text-left space-y-2">
        <h2
          class="text-3xl font-black font-display tracking-tight bg-gradient-to-r from-violet-400 via-indigo-300 to-cyan-400 bg-clip-text text-transparent"
        >
          Gestion des Avatars
        </h2>
        <p class="text-sm text-gray-400 font-medium">
          Gérez le catalogue d'avatars et de cadres débloquables par les joueurs.
        </p>
      </div>
      <div class="flex flex-col sm:flex-row gap-2 self-center">
        <UButton
          color="warning"
          variant="soft"
          icon="i-heroicons-arrow-path"
          :loading="recalculating"
          class="font-black font-display text-xs px-5 py-2.5"
          @click="recalculateWallets"
        >
          Recalculer les pièces
        </UButton>
        <UButton
          color="amber"
          variant="soft"
          icon="i-heroicons-fire"
          :loading="recalculatingStreaks"
          class="font-black font-display text-xs px-5 py-2.5"
          @click="recalculateStreaks"
        >
          Recalculer les séries
        </UButton>
        <UButton
          color="primary"
          icon="i-heroicons-plus"
          class="font-black font-display text-xs px-5 py-2.5 shadow-lg shadow-violet-600/20"
          @click="openCreate"
        >
          {{ tab === "avatars" ? "Nouvel avatar" : "Nouveau cadre" }}
        </UButton>
      </div>
    </div>

    <!-- Onglets -->
    <div class="flex gap-2">
      <UButton
        :color="tab === 'avatars' ? 'primary' : 'neutral'"
        :variant="tab === 'avatars' ? 'solid' : 'soft'"
        size="sm"
        icon="i-heroicons-face-smile"
        class="font-bold font-display text-xs"
        @click="tab = 'avatars'"
      >
        Avatars ({{ avatars?.length ?? 0 }})
      </UButton>
      <UButton
        :color="tab === 'frames' ? 'primary' : 'neutral'"
        :variant="tab === 'frames' ? 'solid' : 'soft'"
        size="sm"
        icon="i-heroicons-sparkles"
        class="font-bold font-display text-xs"
        @click="tab = 'frames'"
      >
        Cadres ({{ frames?.length ?? 0 }})
      </UButton>
    </div>

    <!-- Table -->
    <UCard class="shadow-glass bg-[#111827]/70 backdrop-blur-xl border border-white/10 rounded-2xl">
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse text-sm">
          <thead>
            <tr
              class="border-b border-white/10 text-[10px] font-extrabold uppercase tracking-widest text-gray-400 font-display"
            >
              <th class="pb-3">Aperçu</th>
              <th class="pb-3">Nom</th>
              <th class="pb-3">Déblocage</th>
              <th class="pb-3 text-center">Possédé par</th>
              <th class="pb-3 text-center">Actif</th>
              <th class="pb-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-white/5 font-semibold text-gray-300 font-display">
            <tr
              v-for="item in currentList"
              :key="item.id"
              class="hover:bg-white/5 transition-colors"
            >
              <td class="py-3">
                <UserAvatar
                  :src="tab === 'avatars' ? item.imageUrl : null"
                  :frame="tab === 'frames' ? item.styleKey : null"
                  size="md"
                />
              </td>
              <td class="py-3 text-white">{{ item.name }}</td>
              <td class="py-3 text-xs">
                <span v-if="item.unlockType === 'FREE'" class="text-emerald-400">Gratuit</span>
                <span v-else-if="item.unlockType === 'COINS'" class="text-amber-400">
                  {{ item.price }} pièces
                </span>
                <span v-else class="text-violet-400">
                  Exploit : {{ item.achievement?.title ?? "?" }}
                </span>
              </td>
              <td class="py-3 text-center text-xs text-gray-400">
                {{ item._count?.owners ?? 0 }}
              </td>
              <td class="py-3 text-center">
                <UIcon
                  :name="item.enabled ? 'i-heroicons-check-circle' : 'i-heroicons-x-circle'"
                  :class="item.enabled ? 'text-emerald-400' : 'text-rose-400'"
                />
              </td>
              <td class="py-3 text-right">
                <div class="flex items-center justify-end space-x-2">
                  <UButton
                    color="primary"
                    variant="subtle"
                    size="xs"
                    icon="i-heroicons-pencil-square"
                    class="opacity-60 hover:opacity-100 transition-opacity rounded-lg"
                    @click="openEdit(item)"
                  />
                  <UButton
                    color="error"
                    variant="subtle"
                    size="xs"
                    icon="i-heroicons-trash"
                    :loading="deletingId === item.id"
                    class="opacity-60 hover:opacity-100 transition-opacity rounded-lg"
                    @click="deleteItem(item)"
                  />
                </div>
              </td>
            </tr>
          </tbody>
        </table>
        <p v-if="currentList.length === 0" class="text-sm text-gray-500 text-center py-8">
          Aucun élément dans le catalogue.
        </p>
      </div>
    </UCard>

    <!-- Modal création / édition -->
    <UModal v-model:open="modalOpen" :title="modalTitle">
      <template #body>
        <div class="space-y-4">
          <!-- Aperçu -->
          <div class="flex justify-center">
            <UserAvatar
              :src="tab === 'avatars' ? form.imageUrl || null : null"
              :frame="tab === 'frames' ? form.styleKey : null"
              size="xl"
              avatar-class="w-20 h-20"
            />
          </div>

          <UFormField label="Nom">
            <UInput v-model="form.name" placeholder="Nom affiché" class="w-full" />
          </UFormField>

          <!-- Avatar : upload d'image -->
          <UFormField v-if="tab === 'avatars'" label="Image">
            <div class="space-y-2">
              <input
                ref="fileInput"
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
                class="block w-full text-xs text-gray-400 file:mr-3 file:rounded-lg file:border-0 file:bg-violet-600/20 file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-violet-300 hover:file:bg-violet-600/30"
                @change="uploadImage"
              />
              <p v-if="uploading" class="text-xs text-violet-400">Envoi en cours...</p>
              <UInput
                v-model="form.imageUrl"
                placeholder="ou URL de l'image"
                class="w-full"
                size="sm"
              />
            </div>
          </UFormField>

          <!-- Cadre : sélection du style -->
          <UFormField v-else label="Style de cadre">
            <div class="grid grid-cols-3 gap-2">
              <button
                v-for="(style, key) in AVATAR_FRAME_STYLES"
                :key="key"
                type="button"
                class="flex flex-col items-center gap-1.5 rounded-xl border p-2 transition-colors"
                :class="
                  form.styleKey === key
                    ? 'border-violet-500/60 bg-violet-500/10'
                    : 'border-white/10 hover:bg-white/5'
                "
                @click="form.styleKey = key"
              >
                <UserAvatar :frame="key" size="sm" />
                <span class="text-[10px] font-bold text-gray-300">{{ style.label }}</span>
              </button>
            </div>
          </UFormField>

          <UFormField label="Type de déblocage">
            <USelect
              v-model="form.unlockType"
              :items="[
                { label: 'Gratuit', value: 'FREE' },
                { label: 'Pièces', value: 'COINS' },
                { label: 'Exploit', value: 'ACHIEVEMENT' },
              ]"
              class="w-full"
            />
          </UFormField>

          <UFormField v-if="form.unlockType === 'COINS'" label="Prix (pièces)">
            <UInput v-model.number="form.price" type="number" min="1" class="w-full" />
          </UFormField>

          <UFormField v-if="form.unlockType === 'ACHIEVEMENT'" label="Exploit requis">
            <USelect
              v-model="form.achievementId"
              :items="achievementItems"
              placeholder="Choisir un exploit"
              class="w-full"
            />
          </UFormField>

          <div class="flex items-center gap-6">
            <UFormField label="Ordre d'affichage">
              <UInput v-model.number="form.sortOrder" type="number" class="w-24" />
            </UFormField>
            <UFormField label="Actif">
              <USwitch v-model="form.enabled" />
            </UFormField>
          </div>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2 w-full">
          <UButton color="neutral" variant="soft" @click="modalOpen = false">Annuler</UButton>
          <UButton color="primary" :loading="saving" :disabled="!isFormValid" @click="save">
            {{ editingId ? "Enregistrer" : "Créer" }}
          </UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import { AVATAR_FRAME_STYLES } from "#shared/avatarFrames";
import { toast } from "vue3-toastify";

definePageMeta({
  middleware: "admin",
});

const tab = ref<"avatars" | "frames">("avatars");

const { data: avatars, refresh: refreshAvatars } = await useFetch<any[]>(
  "/api/admin/cosmetics/avatars",
);
const { data: frames, refresh: refreshFrames } = await useFetch<any[]>(
  "/api/admin/cosmetics/frames",
);
const { data: achievementsData } = await useFetch<any>("/api/achievement");

const currentList = computed(() =>
  tab.value === "avatars" ? (avatars.value ?? []) : (frames.value ?? []),
);

const achievementItems = computed(
  () =>
    achievementsData.value?.achivements?.map((a: any) => ({
      label: a.title,
      value: a.id,
    })) ?? [],
);

// ===== Modal =====
const modalOpen = ref(false);
const editingId = ref<number | null>(null);
const saving = ref(false);
const uploading = ref(false);
const deletingId = ref<number | null>(null);
const recalculating = ref(false);
const recalculatingStreaks = ref(false);

async function recalculateWallets() {
  if (
    !confirm(
      "Recalculer les pièces de tous les joueurs à partir de leur XP totale ?\n" +
        "Chaque joueur sera crédité de la différence entre ceil(XP/10) et ses gains déjà comptabilisés (aucune pièce n'est retirée).",
    )
  )
    return;
  recalculating.value = true;
  try {
    const result = await $fetch<{ usersCredited: number; coinsGranted: number }>(
      "/api/admin/cosmetics/recalculate-wallets",
      { method: "POST" },
    );
    toast.success(`${result.coinsGranted} pièces créditées à ${result.usersCredited} joueur(s).`);
  } catch (e: any) {
    toast.error(e?.data?.statusMessage ?? "Erreur lors du recalcul des pièces.");
  } finally {
    recalculating.value = false;
  }
}

async function recalculateStreaks() {
  if (
    !confirm(
      "Recalculer les séries d'activité et de connexion de tous les joueurs à partir de l'historique de leurs réponses ?",
    )
  )
    return;
  recalculatingStreaks.value = true;
  try {
    const result = await $fetch<{ usersStreaksRecalculated: number }>(
      "/api/admin/cosmetics/recalculate-streaks",
      { method: "POST" },
    );
    toast.success(`Séries recalculées pour ${result.usersStreaksRecalculated} joueur(s).`);
  } catch (e: any) {
    toast.error(e?.data?.statusMessage ?? "Erreur lors du recalcul des séries.");
  } finally {
    recalculatingStreaks.value = false;
  }
}

const emptyForm = () => ({
  name: "",
  imageUrl: "",
  styleKey: "neon" as string,
  unlockType: "FREE" as string,
  price: 0,
  achievementId: null as number | null,
  enabled: true,
  sortOrder: 0,
});
const form = reactive(emptyForm());

const modalTitle = computed(() => {
  const noun = tab.value === "avatars" ? "un avatar" : "un cadre";
  return editingId.value ? `Modifier ${noun}` : `Créer ${noun}`;
});

const isFormValid = computed(() => {
  if (!form.name.trim()) return false;
  if (tab.value === "avatars" && !form.imageUrl.trim()) return false;
  if (form.unlockType === "COINS" && form.price <= 0) return false;
  if (form.unlockType === "ACHIEVEMENT" && form.achievementId == null) return false;
  return true;
});

function openCreate() {
  editingId.value = null;
  Object.assign(form, emptyForm());
  modalOpen.value = true;
}

function openEdit(item: any) {
  editingId.value = item.id;
  Object.assign(form, {
    name: item.name,
    imageUrl: item.imageUrl ?? "",
    styleKey: item.styleKey ?? "neon",
    unlockType: item.unlockType,
    price: item.price,
    achievementId: item.achievementId,
    enabled: item.enabled,
    sortOrder: item.sortOrder,
  });
  modalOpen.value = true;
}

async function uploadImage(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;
  uploading.value = true;
  try {
    const formData = new FormData();
    formData.append("image", file);
    const result = await $fetch<{ success: boolean; url: string }>("/api/picture/save-avatar", {
      method: "POST",
      body: formData,
    });
    if (result?.url) {
      form.imageUrl = result.url;
    }
  } catch (e: any) {
    toast.error(e?.data?.statusMessage ?? "Erreur lors de l'envoi de l'image.");
  } finally {
    uploading.value = false;
  }
}

async function save() {
  saving.value = true;
  try {
    const base =
      tab.value === "avatars" ? "/api/admin/cosmetics/avatars" : "/api/admin/cosmetics/frames";
    const body =
      tab.value === "avatars"
        ? {
            name: form.name,
            imageUrl: form.imageUrl,
            unlockType: form.unlockType,
            price: form.price,
            achievementId: form.unlockType === "ACHIEVEMENT" ? form.achievementId : null,
            enabled: form.enabled,
            sortOrder: form.sortOrder,
          }
        : {
            name: form.name,
            styleKey: form.styleKey,
            unlockType: form.unlockType,
            price: form.price,
            achievementId: form.unlockType === "ACHIEVEMENT" ? form.achievementId : null,
            enabled: form.enabled,
            sortOrder: form.sortOrder,
          };

    if (editingId.value) {
      await $fetch(`${base}/${editingId.value}`, { method: "PUT", body });
    } else {
      await $fetch(`${base}/create`, { method: "POST", body });
    }
    modalOpen.value = false;
    await (tab.value === "avatars" ? refreshAvatars() : refreshFrames());
  } catch (e: any) {
    toast.error(e?.data?.statusMessage ?? "Erreur lors de l'enregistrement.");
  } finally {
    saving.value = false;
  }
}

async function deleteItem(item: any) {
  if (!confirm(`Supprimer définitivement "${item.name}" ?`)) return;
  deletingId.value = item.id;
  try {
    const base =
      tab.value === "avatars" ? "/api/admin/cosmetics/avatars" : "/api/admin/cosmetics/frames";
    await $fetch(`${base}/${item.id}`, { method: "DELETE" });
    await (tab.value === "avatars" ? refreshAvatars() : refreshFrames());
  } catch (e: any) {
    toast.error(e?.data?.statusMessage ?? "Erreur lors de la suppression.");
  } finally {
    deletingId.value = null;
  }
}
</script>
