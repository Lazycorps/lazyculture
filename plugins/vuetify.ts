import "@mdi/font/css/materialdesignicons.css";
import { createVuetify } from "vuetify";
import { VSnackbarQueue } from "vuetify/labs/VSnackbarQueue";
import "vuetify/styles";

export default defineNuxtPlugin((app) => {
  const vuetify = createVuetify({
    components: {
      VSnackbarQueue,
    },
    theme: {
      defaultTheme: "dark",
    },
  });
  app.vueApp.use(vuetify);
});
