import "@mdi/font/css/materialdesignicons.css";
import { createVuetify } from "vuetify";
import "vuetify/styles";

export default defineNuxtPlugin((app) => {
  const vuetify = createVuetify({
    theme: {
      defaultTheme: "dark",
    },
  });
  app.vueApp.use(vuetify);
});
