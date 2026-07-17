<template>
  <div class="w-full max-w-5xl mx-auto py-2 space-y-8 select-none">
    <!-- Header Title & Action Row -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div class="space-y-1">
        <h2
          class="text-3xl font-black font-display tracking-tight bg-gradient-to-r from-white via-gray-100 to-gray-400 bg-clip-text text-transparent"
        >
          Gestion des Nouveautés
        </h2>
        <p class="text-sm text-gray-400 font-medium">
          Créez, modifiez ou supprimez les actualités affichées sur la page d'accueil de
          l'application.
        </p>
      </div>

      <UButton
        color="primary"
        size="md"
        icon="i-heroicons-plus"
        class="font-black font-display uppercase tracking-wider px-6 shadow-neon"
        @click="openCreateModal"
      >
        Nouvelle annonce
      </UButton>
    </div>

    <!-- Announcements Table Card -->
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
              <th class="px-6 py-4">Icône</th>
              <th class="px-6 py-4">Titre</th>
              <th class="px-6 py-4">Tag</th>
              <th class="px-6 py-4">Statut</th>
              <th class="px-6 py-4">Date</th>
              <th class="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-white/5 text-gray-200">
            <tr
              v-for="item in announcements"
              :key="item.id"
              class="hover:bg-white/5 transition-colors group"
              :class="{ 'opacity-50': !item.enabled }"
            >
              <!-- Icon -->
              <td class="px-6 py-4">
                <div
                  class="w-10 h-10 rounded-xl bg-violet-600/10 border border-violet-500/20 flex items-center justify-center text-xl text-violet-400"
                >
                  <UIcon :name="item.icon || 'i-heroicons-megaphone'" />
                </div>
              </td>
              <!-- Title & Description -->
              <td class="px-6 py-4">
                <p class="font-bold font-display group-hover:text-violet-400 transition-colors">
                  {{ item.title }}
                </p>
                <p class="text-xs text-gray-400 line-clamp-1 max-w-sm">
                  {{ item.description }}
                </p>
              </td>
              <!-- Tag -->
              <td class="px-6 py-4">
                <span
                  class="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full border border-white/10"
                  :class="item.tagColor || 'bg-violet-500/20 text-violet-300'"
                >
                  {{ item.tag }}
                </span>
              </td>
              <!-- Status -->
              <td class="px-6 py-4">
                <span
                  v-if="item.enabled"
                  class="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
                >
                  Actif
                </span>
                <span
                  v-else
                  class="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-red-500/10 border border-red-500/20 text-red-400"
                >
                  Désactivé
                </span>
              </td>
              <!-- Date -->
              <td class="px-6 py-4 text-xs text-gray-400 font-medium">
                {{ formatDate(item.createDate) }}
              </td>
              <!-- Actions -->
              <td class="px-6 py-4 text-right space-x-1 whitespace-nowrap">
                <UButton
                  color="neutral"
                  variant="ghost"
                  icon="i-heroicons-pencil-square"
                  size="sm"
                  class="hover:bg-violet-600/20 hover:text-violet-400 rounded-lg"
                  @click="openEditModal(item)"
                />
                <UButton
                  color="error"
                  variant="ghost"
                  icon="i-heroicons-trash"
                  size="sm"
                  class="hover:bg-red-600/20 hover:text-red-400 rounded-lg"
                  @click="confirmDelete(item)"
                />
              </td>
            </tr>
            <tr v-if="!announcements || announcements.length === 0">
              <td colspan="6" class="text-center py-8 text-gray-500 font-display text-sm">
                Aucune actualité disponible. Cliquez sur "Nouvelle annonce" pour commencer.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </UCard>

    <!-- Create / Edit Modal -->
    <UModal
      :title="isEditing ? 'Modifier l\'Annonce' : 'Créer une Annonce'"
      description="Renseignez les détails de l'annonce ci-dessous."
      v-model:open="modalOpen"
      :ui="{
        content:
          'sm:max-w-md bg-[#111827]/95 border border-white/10 rounded-2xl overflow-hidden text-gray-200',
      }"
    >
      <template #body>
        <div class="space-y-4">
          <!-- Title -->
          <UFormField
            label="Titre"
            required
            :ui="{
              label: 'text-xs font-bold text-gray-400 uppercase tracking-wider font-display',
            }"
          >
            <UInput
              v-model="form.title"
              placeholder="Ex: Nouveau mode : L'Ascension !"
              class="w-full"
              :ui="{ base: 'bg-white/5 border border-white/10 text-white' }"
            />
          </UFormField>

          <!-- Description -->
          <UFormField
            label="Description"
            required
            :ui="{
              label: 'text-xs font-bold text-gray-400 uppercase tracking-wider font-display',
            }"
          >
            <UTextarea
              v-model="form.description"
              placeholder="Saisissez le texte décrivant la nouveauté..."
              rows="4"
              class="w-full"
              :ui="{ base: 'bg-white/5 border border-white/10 text-white' }"
            />
          </UFormField>

          <div class="grid grid-cols-2 gap-4">
            <!-- Tag -->
            <UFormField
              label="Tag"
              required
              :ui="{
                label: 'text-xs font-bold text-gray-400 uppercase tracking-wider font-display',
              }"
            >
              <UInput
                v-model="form.tag"
                placeholder="Ex: NOUVEAU, MAJ, SÉCU"
                class="w-full"
                :ui="{ base: 'bg-white/5 border border-white/10 text-white' }"
              />
            </UFormField>

            <!-- Tag Color -->
            <UFormField
              label="Couleur de tag"
              :ui="{
                label: 'text-xs font-bold text-gray-400 uppercase tracking-wider font-display',
              }"
            >
              <USelect v-model="form.tagColor" :items="colorPresets" class="w-full" />
            </UFormField>
          </div>

          <!-- Preview of the Tag -->
          <div class="bg-white/5 border border-white/5 rounded-xl p-3 flex flex-col gap-2">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold text-gray-400">Prévisualisation :</span>
              <span
                v-if="form.tag"
                class="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full border"
                :class="form.tagColor || 'bg-violet-500/20 text-violet-300 border-violet-500/30'"
              >
                {{ form.tag }}
              </span>
              <span v-else class="text-xs text-gray-500 italic">Entrez un tag...</span>
            </div>
            <div v-if="form.btnLabel && form.btnLink" class="flex justify-end pt-1">
              <UButton
                size="xs"
                color="primary"
                class="font-black font-display uppercase tracking-wider text-[10px] pointer-events-none"
              >
                {{ form.btnLabel }}
              </UButton>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <!-- Icon class -->
            <UFormField
              label="Icône"
              :ui="{
                label: 'text-xs font-bold text-gray-400 uppercase tracking-wider font-display',
              }"
            >
              <USelect v-model="form.icon" :items="iconPresets" class="w-full" />
            </UFormField>

            <!-- Enabled toggle -->
            <UFormField
              label="Statut"
              description="Activer l'affichage sur la page d'accueil"
              :ui="{
                label: 'text-xs font-bold text-gray-400 uppercase tracking-wider font-display',
                description: 'text-[11px] text-gray-500 font-medium',
              }"
            >
              <USwitch v-model="form.enabled" color="primary" />
            </UFormField>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <!-- Button Label -->
            <UFormField
              label="Texte du bouton (Optionnel)"
              :ui="{
                label: 'text-xs font-bold text-gray-400 uppercase tracking-wider font-display',
              }"
            >
              <UInput
                v-model="form.btnLabel"
                placeholder="Ex: Lancer, En savoir plus..."
                class="w-full"
                :ui="{ base: 'bg-white/5 border border-white/10 text-white' }"
              />
            </UFormField>

            <!-- Button Link -->
            <UFormField
              label="Lien du bouton (Optionnel)"
              :ui="{
                label: 'text-xs font-bold text-gray-400 uppercase tracking-wider font-display',
              }"
            >
              <UInput
                v-model="form.btnLink"
                placeholder="Ex: /series/speedrun"
                class="w-full"
                :ui="{ base: 'bg-white/5 border border-white/10 text-white' }"
              />
            </UFormField>
          </div>
        </div>
      </template>

      <template #footer>
        <UButton
          variant="ghost"
          color="primary"
          class="font-bold font-display uppercase tracking-wider text-xs"
          @click="closeModal"
        >
          Annuler
        </UButton>
        <UButton
          color="primary"
          class="font-black font-display uppercase tracking-widest text-xs px-6 shadow-neon"
          :disabled="!isFormValid"
          :loading="saving"
          @click="saveAnnouncement"
        >
          Enregistrer
        </UButton>
      </template>
    </UModal>

    <!-- Delete Confirmation Modal -->
    <UModal
      title="Confirmer la suppression"
      description="Cette action est irréversible."
      v-model:open="deleteModalOpen"
      :ui="{
        content:
          'sm:max-w-md bg-[#111827]/95 border border-white/10 rounded-2xl overflow-hidden text-gray-200',
      }"
    >
      <template #body>
        <div class="space-y-2">
          <p class="text-sm text-gray-300">
            Êtes-vous sûr de vouloir supprimer définitivement l'annonce suivante ?
          </p>
          <p class="text-sm font-bold text-violet-400 font-display">"{{ itemToDelete?.title }}"</p>
        </div>
      </template>

      <template #footer>
        <UButton
          variant="ghost"
          color="primary"
          class="font-bold font-display uppercase tracking-wider text-xs"
          @click="deleteModalOpen = false"
        >
          Annuler
        </UButton>
        <UButton
          color="error"
          class="font-black font-display uppercase tracking-widest text-xs px-6"
          :loading="deleting"
          @click="deleteAnnouncement"
        >
          Supprimer
        </UButton>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  middleware: "admin",
});

// Toast notifications
const toast = useToast();

// Color and Icon Presets for admin selection
const colorPresets = [
  { label: "Violet (Défaut)", value: "bg-violet-500/20 text-violet-300 border-violet-500/30" },
  { label: "Indigo (Ascension)", value: "bg-indigo-500/20 text-indigo-300 border-indigo-500/30" },
  {
    label: "Émeraude (Nouveautés/Thèmes)",
    value: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  },
  {
    label: "Ambre (Sécurité/Avertissement)",
    value: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  },
  { label: "Rose (Duels)", value: "bg-pink-500/20 text-pink-300 border-pink-500/30" },
  { label: "Rouge (Important/Royale)", value: "bg-rose-500/20 text-rose-300 border-rose-500/30" },
  { label: "Cyan (Optimisations)", value: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30" },
];

const iconPresets = [
  { label: "📣 Mégaphone / Annonce", value: "i-heroicons-megaphone" },
  { label: "⭐ Étoile / Succès", value: "i-heroicons-star" },
  { label: "🏆 Trophée / Compétition", value: "i-heroicons-trophy" },
  { label: "🛡️ Bouclier / Sécurité", value: "i-heroicons-shield-check" },
  { label: "🔥 Feu / Battle Royale", value: "i-heroicons-fire" },
  { label: "⚡ Éclair / Duel", value: "i-heroicons-bolt" },
  { label: "⏱️ Chronomètre / Speedrun", value: "i-heroicons-clock" },
  { label: "📈 Courbe montante / Ascension", value: "i-heroicons-arrow-trending-up" },
  { label: "🗺️ Carte / Aventure", value: "i-heroicons-map" },
  { label: "🧠 Cerveau / Brainrun", value: "i-heroicons-academic-cap" },
  { label: "🎁 Cadeau / Récompense", value: "i-heroicons-gift" },
  { label: "🔧 Clé / Maintenance", value: "i-heroicons-wrench" },
];

// Fetch announcements
const { data: announcements, refresh } = await useFetch<any[]>("/api/admin/announcements");

// Modal states
const modalOpen = ref(false);
const deleteModalOpen = ref(false);
const isEditing = ref(false);
const saving = ref(false);
const deleting = ref(false);

// Items holding states
const itemToDelete = ref<any | null>(null);
const editedId = ref<number | null>(null);

// Form state
const form = ref({
  title: "",
  description: "",
  tag: "",
  tagColor: "bg-violet-500/20 text-violet-300 border-violet-500/30",
  icon: "i-heroicons-megaphone",
  enabled: true,
  btnLabel: "",
  btnLink: "",
});

// Form validation
const isFormValid = computed(() => {
  return (
    form.value.title.trim() !== "" &&
    form.value.description.trim() !== "" &&
    form.value.tag.trim() !== ""
  );
});

// Reset form helper
const resetForm = () => {
  form.value = {
    title: "",
    description: "",
    tag: "",
    tagColor: "bg-violet-500/20 text-violet-300 border-violet-500/30",
    icon: "i-heroicons-megaphone",
    enabled: true,
    btnLabel: "",
    btnLink: "",
  };
  editedId.value = null;
  isEditing.value = false;
};

// Open creation modal
const openCreateModal = () => {
  resetForm();
  modalOpen.value = true;
};

// Open editing modal
const openEditModal = (item: any) => {
  form.value = {
    title: item.title,
    description: item.description,
    tag: item.tag,
    tagColor: item.tagColor,
    icon: item.icon,
    enabled: item.enabled,
    btnLabel: item.btnLabel || "",
    btnLink: item.btnLink || "",
  };
  editedId.value = item.id;
  isEditing.value = true;
  modalOpen.value = true;
};

// Close modal
const closeModal = () => {
  modalOpen.value = false;
  resetForm();
};

// Save announcement (create or update)
const saveAnnouncement = async () => {
  if (!isFormValid.value) return;

  saving.value = true;
  try {
    if (isEditing.value && editedId.value !== null) {
      await $fetch(`/api/admin/announcements/${editedId.value}`, {
        method: "PUT",
        body: form.value,
      });
      toast.add({
        title: "Annonce mise à jour",
        description: "L'annonce a été modifiée avec succès.",
        color: "green",
      });
    } else {
      await $fetch("/api/admin/announcements/create", {
        method: "POST",
        body: form.value,
      });
      toast.add({
        title: "Annonce créée",
        description: "La nouvelle annonce a été ajoutée avec succès.",
        color: "green",
      });
    }
    await refresh();
    closeModal();
  } catch (error: any) {
    console.error("Failed to save announcement:", error);
    toast.add({
      title: "Erreur",
      description: error.data?.statusMessage || "Impossible d'enregistrer l'annonce.",
      color: "red",
    });
  } finally {
    saving.value = false;
  }
};

// Confirm delete
const confirmDelete = (item: any) => {
  itemToDelete.value = item;
  deleteModalOpen.value = true;
};

// Delete announcement
const deleteAnnouncement = async () => {
  if (!itemToDelete.value) return;

  deleting.value = true;
  try {
    await $fetch(`/api/admin/announcements/${itemToDelete.value.id}`, {
      method: "DELETE",
    });
    toast.add({
      title: "Annonce supprimée",
      description: "L'annonce a été supprimée avec succès.",
      color: "green",
    });
    await refresh();
    deleteModalOpen.value = false;
    itemToDelete.value = null;
  } catch (error: any) {
    console.error("Failed to delete announcement:", error);
    toast.add({
      title: "Erreur",
      description: error.data?.statusMessage || "Impossible de supprimer l'annonce.",
      color: "red",
    });
  } finally {
    deleting.value = false;
  }
};

// Format date helper
const formatDate = (dateStr: string) => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};
</script>

<style scoped>
.shadow-neon {
  box-shadow: 0 0 15px rgba(139, 92, 246, 0.35);
}
</style>
