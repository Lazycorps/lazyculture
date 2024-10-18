<template>
    <v-layout>
        <v-navigation-drawer app width="200" permanent>
            <v-list>
                <v-list-item-group>
                    <v-list-item>
                        <v-list-item-content>
                            <v-list-item-title class="headline">Maintenance</v-list-item-title>
                        </v-list-item-content>
                    </v-list-item>

                    <v-list-item horizontal @click="router.push('admin/maintenance/questions')">
                        <template v-slot:prepend>
                            <v-icon>mdi-help-circle</v-icon>
                        </template>

                        <v-list-item-content>
                            <v-list-item-title>Questions</v-list-item-title>
                        </v-list-item-content>
                    </v-list-item>

                    <v-list-item @click="router.push('/themes')">
                        <template v-slot:prepend>
                            <v-icon>mdi-book-open-variant-outline</v-icon>
                        </template>
                        <v-list-item-content>
                            <v-list-item-title>Themes</v-list-item-title>
                        </v-list-item-content>
                    </v-list-item>

                    <v-list-item @click="router.push('/admin/importquestions')">
                        <template v-slot:prepend>
                            <v-icon>mdi-import</v-icon>
                        </template>
                        <v-list-item-content>
                            <v-list-item-title>Imports</v-list-item-title>
                        </v-list-item-content>
                    </v-list-item>
                </v-list-item-group>
            </v-list>
        </v-navigation-drawer>

        <v-main class="page-content">
            <slot />
        </v-main>
    </v-layout>
</template>

<script setup lang="ts">
const router = useRouter();
</script>

<style>
html,
body,
#app,
.v-application {
    height: 100%;
    margin: 0;
}

.page-content {
    height: 100vh;
    /* 100% de la hauteur de la page */
    overflow-y: auto;
    /* Ajoute une scrollbar uniquement si nécessaire pour le contenu */
}

.headline {
    padding: 16px;
    /* Optionnel : ajustez le remplissage pour le titre */
}
</style>