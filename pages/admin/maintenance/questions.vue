<template>
    <v-card flat rounded class="my-auto mx-auto pa-5" style="max-width: 1500px; min-width: 800px;">
      <v-data-table :headers="headers" :items="questions ?? []">
        <template v-slot:item.response="{ item }">
          <span>{{ getResponse(item.data) }}</span>
        </template>
        <template v-slot:item.themeNames="{ item }">
          <span>{{ getThemNames(item.data.theme) }}</span>
        </template>
        <template v-slot:[`item.actions`]="{ item }">
          <!-- <v-btn color="primary" @click="editItem(item)">Edit</v-btn>
          <v-btn color="error" @click="deleteItem(item)">Delete</v-btn> -->
        </template>
      </v-data-table>
  
      <!-- <v-dialog v-model="dialog" max-width="500px">
        <template v-slot:default="dialog">
          <v-card>
            <v-card-title>{{ formTitle }}</v-card-title>
            <v-card-text>
              <v-text-field v-model="editedItem.name" label="Name"></v-text-field>
              <v-text-field v-model="editedItem.calories" label="Calories" type="number"></v-text-field>
              <v-text-field v-model="editedItem.fat" label="Fat (g)" type="number"></v-text-field>
              <v-text-field v-model="editedItem.carbs" label="Carbs (g)" type="number"></v-text-field>
              <v-text-field v-model="editedItem.protein" label="Protein (g)" type="number"></v-text-field>
            </v-card-text>
            <v-card-actions>
              <v-btn @click="close">Cancel</v-btn>
              <v-btn @click="save">Save</v-btn>
            </v-card-actions>
          </v-card>
        </template>
      </v-dialog>
  
      <v-dialog v-model="dialogDelete" max-width="500px">
        <v-card>
          <v-card-title>Are you sure?</v-card-title>
          <v-card-actions>
            <v-btn @click="closeDelete">Cancel</v-btn>
            <v-btn color="error" @click="deleteItemConfirm">Delete</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog> -->
    </v-card>
  </template>
  
  <script setup lang="ts">
  import { ref, computed } from 'vue';
  import type { VDataTable } from 'vuetify/components'
  import type { QuestionDataDTO, QuestionDTO, QuestionPropositionDTO } from '~/models/question';
  import type { Theme, ThemeDTO } from "~/models/theme";
  type ReadonlyHeaders = VDataTable['$props']['headers']


  
  // Définition des états réactifs pour dialog, dialogDelete, editedIndex et les items
  // const dialog = ref(false);
  // const dialogDelete = ref(false);
  // const editedIndex = ref(-1);
  // const editedItem = ref<Dessert>({
  //   name: '',
  //   calories: 0,
  //   fat: 0,
  //   carbs: 0,
  //   protein: 0,
  // });
  // const defaultItem = {
  //   name: '',
  //   calories: 0,
  //   fat: 0,
  //   carbs: 0,
  //   protein: 0,
  // };
  
  const { data: questions } = await useFetch<QuestionDTO[]>("/api/question/all");
  const { data: themes } = await useFetch<Theme[]>("/api/theme/all");
  
  const headers: ReadonlyHeaders = [
    { title: 'Question', value: 'data.libelle', align: 'start', sortable: true },
    { title: 'Réponse', value: 'response'},
    { title: 'Thèmes', value: 'themeNames'},
  ];
  
  function getResponse(data: QuestionDataDTO) {
    const selectedProposition = data.propositions.find(
      (proposition: QuestionPropositionDTO) => proposition.id === data.response
    );
    return selectedProposition ? selectedProposition.value : 'No match found';
  }

  function getThemNames(slugs: string[]): string {
    const matchingThemes = themes?.value?.filter((t: ThemeDTO) => slugs.includes(t.slug));
    return matchingThemes?.map(theme => theme.name).join(',') ?? "";
  }
  // Titre dynamique du formulaire
  // const formTitle = computed(() => (editedIndex.value === -1 ? 'New Item' : 'Edit Item'));
  
  // const editItem = (item: Dessert) => {
  //   editedIndex.value = desserts.value.indexOf(item);
  //   editedItem.value = { ...item };
  //   dialog.value = true;
  // };
  
  // const deleteItem = (item: Dessert) => {
  //   editedIndex.value = desserts.value.indexOf(item);
  //   editedItem.value = { ...item };
  //   dialogDelete.value = true;
  // };
  
  // const deleteItemConfirm = () => {
  //   desserts.value.splice(editedIndex.value, 1);
  //   closeDelete();
  // };
  
  // const close = () => {
  //   dialog.value = false;
  //   editedItem.value = { ...defaultItem };
  //   editedIndex.value = -1;
  // };
  
  // const closeDelete = () => {
  //   dialogDelete.value = false;
  //   editedItem.value = { ...defaultItem };
  //   editedIndex.value = -1;
  // };
  
  // const save = () => {
  //   if (editedIndex.value > -1) {
  //     Object.assign(desserts.value[editedIndex.value], editedItem.value);
  //   } else {
  //     desserts.value.push({ ...editedItem.value });
  //   }
  //   close();
  // };
  </script>
  
  <style scoped></style>  