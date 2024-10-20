<template>
    <v-layout>
        <v-navigation-drawer width="200" permanent>
            <v-list>
                <v-list-item-group>
                    <v-list-item>
                        <v-list-item-content>
                            <v-list-item-title class="menu-item highlight">Maintenance</v-list-item-title>
                        </v-list-item-content>
                    </v-list-item>

                    <v-list-item @click="router.push('/admin/maintenance/questions')" class="menu-item">
                        <template v-slot:prepend>
                            <v-icon>mdi-help-circle</v-icon>
                        </template>
                        <v-list-item-content>
                            <v-list-item-title>Questions</v-list-item-title>
                        </v-list-item-content>
                    </v-list-item>

                    <v-list-item @click="router.push('/admin')" class="menu-item">
                        <template v-slot:prepend>
                            <v-icon>mdi-book-open-variant-outline</v-icon>
                        </template>
                        <v-list-item-content>
                            <v-list-item-title>Themes</v-list-item-title>
                        </v-list-item-content>
                    </v-list-item>

                    <!-- Menu Imports sans trait en dessous et même style que Maintenance -->
                    <v-list-item>
                        <v-list-item-content>
                            <v-list-item-title class="menu-item highlight">Imports</v-list-item-title>
                        </v-list-item-content>
                    </v-list-item>

                    <!-- JSON sous Imports -->
                    <v-list-item @click="router.push('/admin/importquestions')" class="menu-item">
                        <template v-slot:prepend>
                            <v-icon>mdi-file-import</v-icon>
                        </template>
                        <v-list-item-content>
                            <v-list-item-title>JSON</v-list-item-title>
                        </v-list-item-content>
                    </v-list-item>
                    <v-list-item class="menu-item border-bottom">
                        <v-list-item-content>
                            <v-list-item-title></v-list-item-title>
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
    overflow-y: auto;
}

.headline {
    padding: 16px;
    text-align: left;
    /* Aligne le texte à gauche */
}

.highlight {
    font-weight: bold;
    /* Met en gras */
    color: #1976D2;
    /* Change la couleur si nécessaire */
}

.menu-item {
    border-bottom: 1px solid #E0E0E0;
    /* Ajoute une bordure en bas pour Questions et Themes */
    padding: 12px 16px;
    /* Ajuste le remplissage pour les éléments de menu */
}

.menu-item:last-child {
    border-bottom: none;
    /* Enlève la bordure du dernier élément */
}

.menu-item.highlight {
    border-bottom: none;
    /* Enlève la bordure pour Imports */
}
</style>
