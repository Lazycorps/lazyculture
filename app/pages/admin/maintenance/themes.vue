<template>
  <div class="w-full max-w-5xl mx-auto py-2 space-y-8 select-none">
    <!-- Header Title & Action Row -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div class="space-y-1">
        <h2
          class="text-3xl font-black font-display tracking-tight bg-gradient-to-r from-white via-gray-100 to-gray-400 bg-clip-text text-transparent"
        >
          Gestion des Thèmes
        </h2>
        <p class="text-sm text-gray-400 font-medium">
          Créez, modifiez ou organisez les thèmes et catégories de l'application.
        </p>
      </div>

      <UButton
        color="primary"
        size="md"
        icon="i-heroicons-plus"
        class="font-black font-display uppercase tracking-wider px-6 shadow-neon"
        @click="editItem(defaultItem)"
      >
        Nouveau Thème
      </UButton>
    </div>

    <!-- Themes Table Card -->
    <UCard
      class="shadow-glass bg-[#111827]/70 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden"
      :ui="{ body: 'p-0' }"
    >
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr
              class="border-b border-white/10 bg-white/5 text-gray-400 font-display font-bold text-xs uppercase tracking-wider"
            >
              <th class="px-6 py-4">Image</th>
              <th class="px-6 py-4">Nom</th>
              <th class="px-6 py-4">Slug</th>
              <th class="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-white/5 text-gray-200">
            <tr
              v-for="item in themes ?? []"
              :key="item.id"
              class="hover:bg-white/5 transition-colors group"
            >
              <!-- Thumbnail Image -->
              <td class="px-6 py-4">
                <div
                  class="w-12 h-12 rounded-xl overflow-hidden border border-white/10 bg-slate-950/80 flex items-center justify-center"
                >
                  <img
                    v-if="item.picture"
                    :src="item.picture"
                    :alt="item.name"
                    class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-200"
                  />
                  <span v-else class="text-xs text-gray-500 font-display">Aucune</span>
                </div>
              </td>
              <!-- Name -->
              <td
                class="px-6 py-4 font-bold font-display group-hover:text-violet-400 transition-colors"
              >
                {{ item.name }}
              </td>
              <!-- Slug -->
              <td class="px-6 py-4 font-mono text-xs text-gray-400">
                {{ item.slug }}
              </td>
              <!-- Actions -->
              <td class="px-6 py-4 text-right">
                <UButton
                  color="neutral"
                  variant="ghost"
                  icon="i-heroicons-pencil-square"
                  size="sm"
                  class="hover:bg-violet-600/20 hover:text-violet-400 rounded-lg"
                  @click="editItem(item)"
                />
              </td>
            </tr>
            <tr v-if="!themes || themes.length === 0">
              <td colspan="4" class="text-center py-10 text-gray-500 font-medium">
                Aucun thème trouvé.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </UCard>

    <!-- Theme Modal Dialog -->
    <UModal v-model:open="dialog">
      <template #content>
        <div
          class="p-6 bg-[#111827] border border-white/10 rounded-2xl shadow-glass space-y-6 text-gray-200"
        >
          <!-- Title -->
          <div>
            <h3 class="text-xl font-black font-display text-white tracking-wide">
              {{ formTitle }}
            </h3>
            <p class="text-xs text-gray-400 mt-1">Renseignez les détails du thème ci-dessous.</p>
          </div>

          <div class="space-y-4">
            <!-- Nom Field -->
            <UFormField
              label="Nom du Thème"
              :ui="{
                label: 'text-xs font-bold text-gray-400 uppercase tracking-wider font-display',
              }"
            >
              <UInput
                v-model="editedItem.name"
                placeholder="Ex: Culture Générale"
                class="w-full"
                :ui="{ base: 'bg-white/5 border border-white/10 text-white' }"
              />
            </UFormField>

            <!-- Slug Field -->
            <UFormField
              label="Slug (identifiant unique)"
              :ui="{
                label: 'text-xs font-bold text-gray-400 uppercase tracking-wider font-display',
              }"
            >
              <UInput
                v-model="editedItem.slug"
                placeholder="Ex: culture_generale"
                class="w-full"
                :ui="{ base: 'bg-white/5 border border-white/10 text-white font-mono' }"
              />
            </UFormField>

            <!-- Picture URL Field -->
            <UFormField
              label="URL de l'image"
              :ui="{
                label: 'text-xs font-bold text-gray-400 uppercase tracking-wider font-display',
              }"
            >
              <UInput
                v-model="editedItem.picture"
                placeholder="Ex: https://image.com/pic.jpg"
                class="w-full"
                :ui="{ base: 'bg-white/5 border border-white/10 text-white' }"
              />
            </UFormField>

            <!-- Drag and drop zone -->
            <div class="space-y-2">
              <p class="text-xs font-bold text-gray-400 uppercase tracking-wider font-display">
                Téléverser une image
              </p>
              <div
                class="drop-zone border-2 border-dashed border-white/20 rounded-xl p-6 text-center cursor-pointer hover:border-violet-500/50 hover:bg-violet-600/5 transition-all duration-200 flex flex-col items-center justify-center space-y-2 select-none"
                @dragover.prevent
                @dragenter.prevent
                @drop.prevent="handleDrop"
                @click="selectFile"
              >
                <UIcon
                  name="i-heroicons-cloud-arrow-up"
                  class="text-3xl text-gray-400 animate-pulse"
                />
                <p class="text-xs text-gray-400 font-semibold font-display">
                  Déposez une image ici ou cliquez pour en sélectionner une
                </p>
                <input
                  type="file"
                  accept="image/*"
                  @change="handleFileSelect"
                  ref="fileInput"
                  hidden
                />
              </div>

              <!-- Real-time upload preview -->
              <div
                v-if="previewUrl || editedItem.picture"
                class="flex flex-col items-center p-3 rounded-xl border border-white/5 bg-slate-950/40 relative group overflow-hidden w-full max-h-48"
              >
                <img
                  :src="previewUrl || editedItem.picture"
                  alt="Image Preview"
                  class="max-h-32 max-w-full object-contain rounded-lg"
                />
                <p class="text-[10px] text-gray-500 font-bold truncate mt-2 max-w-xs font-display">
                  {{ file?.name || "Image actuelle du thème" }}
                </p>
              </div>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex items-center justify-end space-x-3 pt-4 border-t border-white/5">
            <UButton
              variant="ghost"
              color="primary"
              class="font-bold font-display uppercase tracking-wider text-xs"
              @click="cancel"
            >
              Annuler
            </UButton>
            <UButton
              color="primary"
              class="font-black font-display uppercase tracking-widest text-xs px-6 shadow-neon"
              :disabled="isSaveDisabled"
              @click="save"
            >
              Sauvegarder
            </UButton>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  middleware: "admin",
});

import { ref, computed } from "vue";
import type { Theme } from "#shared/theme";

const { data: themes } = (await useFetch<Theme[]>("/api/theme/all")) ?? [];
const dialog = ref(false);
const editedIndex = ref(-1);
const editedItem = ref<Theme>({
  id: 0,
  createDate: new Date(),
  updateDate: new Date(),
  userCreate: "",
  userUpdate: "",
  name: "",
  slug: "",
  picture: "",
});
const defaultItem = {
  id: 0,
  createDate: new Date(),
  updateDate: new Date(),
  userCreate: "",
  userUpdate: "",
  name: "",
  slug: "",
  picture: "",
};

let initialItemState = { ...defaultItem };
const formTitle = computed(() =>
  editedIndex.value === -1 ? "Nouveau thème" : `Thème #${editedItem.value.id}`,
);

function editItem(item: Theme) {
  editedIndex.value = themes?.value?.indexOf(item) ?? -1;
  initialItemState = { ...item }; // Sauvegarde l'état initial
  editedItem.value = { ...item };
  dialog.value = true;
}

function close() {
  dialog.value = false;
  editedItem.value = { ...defaultItem };
  editedIndex.value = -1;
}

const cancel = () => {
  editedItem.value = { ...initialItemState };
  previewUrl.value = null;
  file.value = null;
  close();
};

const isSaveDisabled = computed(() => {
  const nameValid = editedItem.value.name.trim() !== "";
  const slugValid = editedItem.value.slug.trim() !== "";
  const pictureValid = editedItem.value.picture.trim() !== "" || file.value !== null;

  return !(nameValid && slugValid && pictureValid);
});

async function save() {
  if (file.value) {
    const formData = new FormData();
    formData.append("image", file.value);

    const data = (await $fetch("/api/picture/save", {
      method: "POST",
      body: formData,
    })) as { success: boolean; url: string };

    if (data.success) {
      editedItem.value.picture = data.url;
    }
  }

  if (editedIndex.value > -1) {
    if (themes?.value) {
      themes.value[editedIndex.value] = await $fetch("/api/theme/update", {
        method: "put",
        body: { ...editedItem.value },
      });
    }
  } else {
    const newTheme = await $fetch<Theme>("/api/theme/create", {
      method: "post",
      body: { ...editedItem.value },
    });
    themes?.value?.push(newTheme);
  }
  file.value = null;
  previewUrl.value = null;
  close();
}

const file = ref<File | null>(null);
const previewUrl = ref<string | null>(null);
const fileInput = ref<HTMLInputElement | null>(null);

const handleFileSelect = (event: Event) => {
  const input = event.target as HTMLInputElement;
  const selectedFile = input.files?.[0];

  if (selectedFile && selectedFile.type.startsWith("image/")) {
    file.value = selectedFile;
    previewUrl.value = URL.createObjectURL(selectedFile);
  }
};

const handleDrop = (event: DragEvent) => {
  const droppedFile = event.dataTransfer?.files[0];

  if (droppedFile && droppedFile.type.startsWith("image/")) {
    file.value = droppedFile;
    previewUrl.value = URL.createObjectURL(droppedFile);
  }
};

const selectFile = () => {
  if (fileInput.value) {
    fileInput.value.click();
  }
};
</script>

<style scoped>
/* Page-specific overrides */
</style>
