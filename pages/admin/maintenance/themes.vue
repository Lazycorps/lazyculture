<template>
  <v-card flat rounded class="my-auto mx-auto pa-5" style="max-width: 1500px; min-width: 800px;">
    <v-data-table :headers="headers" :items="themes ?? []" :items-per-page="10" fixed-header height="100%"
      style="max-height: 650px;" class="fill-width">
      <template v-slot:top>
        <v-toolbar class="pt-4 pl-4">
          <v-spacer></v-spacer>
          <v-btn icon @click="editItem(defaultItem)" :disabled="false" class="rounded-circle mr-2 ml-2 mb-4"
            style="background-color: green; color: white;">
            <v-icon>mdi-plus</v-icon>
          </v-btn>
        </v-toolbar>
      </template>
      <template v-slot:item.actions="{ item }">
        <v-icon class="me-2" size="small" @click="editItem(item)">
          mdi-pencil
        </v-icon>
      </template>
    </v-data-table>
    <v-dialog v-model="dialog" max-width="800px">
      <v-card>
        <v-card-title>{{ formTitle }}</v-card-title>
        <v-card-text>
          <v-text-field v-model="editedItem.name" label="Nom" density="compact" />
          <v-text-field v-model="editedItem.slug" label="slug" density="compact" />
          <v-text-field v-model="editedItem.picture" label="URL de l'image" density="compact" />

          <div>
            <div class="drop-zone" @dragover.prevent @dragenter.prevent @drop.prevent="handleDrop" @click="selectFile">
              <p>Déposez une image ici ou cliquez pour en sélectionner une</p>
              <input type="file" accept="image/*" @change="handleFileSelect" ref="fileInput" hidden />
            </div>
            <div v-if="previewUrl || editedItem.picture" class="image-preview">
              <img :src="previewUrl || editedItem.picture" alt="Image Preview" />
              <p>{{ file?.name || 'Image actuelle' }}</p>
            </div>
          </div>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn @click="cancel" class="mr-2">Annuler</v-btn>
          <v-btn @click="save" :disabled="isSaveDisabled">Sauvegarder</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-card>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import type { VDataTable } from 'vuetify/components';
import type { Theme } from "~/models/theme";
type ReadonlyHeaders = VDataTable['$props']['headers'];

const { data: themes } = await useFetch<Theme[]>("/api/theme/all") ?? [];
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
const formTitle = computed(() => (editedIndex.value === -1 ? 'Nouveau thème' : `Thème ${editedItem.value.id}`));
const headers: ReadonlyHeaders = [
  { title: 'Nom', value: 'name', align: 'start', sortable: true },
  { title: 'Slug', value: 'slug' },
  { title: 'Catégorie', value: '' },
  { title: 'Actions', value: 'actions' },
];

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
  const pictureValid = editedItem.value.picture.trim() !== "" || file.value !== null ;

  return !(nameValid && slugValid && pictureValid);
});

async function save() {
  if (file.value) {
    const formData = new FormData();
    formData.append('image', file.value);

    const data = await $fetch('/api/picture/save', {
      method: 'POST',
      body: formData,
    }) as { success: boolean, url: string };

    if (data.success) {
      editedItem.value.picture = data.url;
    }
  }

  if (editedIndex.value > -1) {
    Object.assign(themes?.value ? [editedIndex.value] : defaultItem, editedItem.value);
    themes?.value?[editedIndex.value] = await $fetch("/api/theme/update", {
      method: "put",
      body: { ...editedItem.value },
    }): editedItem.value;
  } else {
    editedItem.value = await $fetch("/api/theme/create", {
      method: "post",
      body: { ...editedItem.value },
    });
    themes?.value?.push({ ...editedItem.value });
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

  if (selectedFile && selectedFile.type.startsWith('image/')) {
    file.value = selectedFile;
    previewUrl.value = URL.createObjectURL(selectedFile);
  }
};

const handleDrop = (event: DragEvent) => {
  const droppedFile = event.dataTransfer?.files[0];

  if (droppedFile && droppedFile.type.startsWith('image/')) {
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
.drop-zone {
  border: 2px dashed #ccc;
  padding: 20px;
  text-align: center;
  cursor: pointer;
}

.drop-zone:hover {
  border-color: #aaa;
}

.image-preview {
  margin-top: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.image-preview img {
  max-width: 200px;
  max-height: 200px;
  object-fit: contain;
  /* Permet de conserver les proportions de l'image */
  padding: 5px;
}
</style>