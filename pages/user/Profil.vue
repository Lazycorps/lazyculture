<template>
  <v-card flat rounded class="mx-auto my-auto pa-5" width="350">
    <div>
      <v-card class="mx-auto ma-0" :title="username" :subtitle="`Level ${level}`">
        <template v-slot:prepend>
          <v-avatar color="blue-darken-2">
            <v-icon icon="mdi-account"></v-icon>
          </v-avatar>
        </template>
        <v-card-text>
          <v-progress-linear :model-value="xp" :max="xpMax" :min="xpMin" color="primary" height="10"
            rounded=""></v-progress-linear>
        </v-card-text>
      </v-card>

    </div>
    <div>
      <v-text-field label="Email" v-model="email" readonly></v-text-field>
    </div>
    <div>
      <v-text-field label="Username" v-model="username" :rules="[rules.required, rules.min, rules.max]"
        @update:model-value="userNameChanged = true">
        <template v-slot:append-inner>
          <v-avatar :loading="loadingUpdateUser" v-if="userNameChanged">
            <v-icon icon="mdi-floppy" @click="updateUsername"></v-icon>
          </v-avatar>
        </template>
      </v-text-field>
    </div>
    <div class="d-flex justify-end">
      <v-btn @click="signOut" :disabled="loading" prepend-icon="mdi-logout" color="red">
        Logout
      </v-btn>
    </div>
  </v-card>
</template>

<script setup lang="ts">
const supabase = useSupabaseClient();
const router = useRouter();

const loading = ref(true);
const username = ref("");
const email = ref("");
const level = ref(0);
const xp = ref(0);
const xpMin = ref(0);
const xpMax = ref(0);
const userNameChanged = ref(false);
const avatar_path = ref("");
const rules = {
  required: (v: string) => !!v || "Required.",
  min: (v: string) => v.length >= 4 || "Min 4 characters",
  max: (v: string) => v.length <= 16 || "Max 16 characters",
  email: (v: string) => /.+@.+\..+/.test(v) || "Must be a valid email",
  passwordComplexity: (v: string) =>
    /^(?=.*[A-ZÀ-ÖØ-Þ])(?=.*\d)[A-Za-zÀ-öø-ÿ\d~`!@#$%^&*()-_+={}|;:'",.<>?\\]{8,}$/.test(
      v
    ) || "Minimum eight characters, at least uppercase letter and one number:",
};
const loadingUpdateUser = ref(false);
onMounted(async () => {
  await fetchUser();
})

async function fetchUser() {
  try {
    loading.value = true;
    const userConnected = await $fetch("/api/user/current");
    username.value = userConnected?.name ?? "";
    email.value = userConnected?.email ?? "";
    level.value = userConnected?.UserProgress?.levelId ?? 1;
    xp.value = userConnected?.UserProgress?.xp ?? 0;
    xpMin.value = userConnected?.UserProgress?.level?.xp_threshold ?? 0;
    xpMax.value = userConnected?.nextLevelTreshold ?? 100;
  } finally {
    loading.value = false;
  }
}

async function updateUsername() {
  try {
    loadingUpdateUser.value = true;
    const userUpdated = await $fetch("/api/user/username", {
      method: "POST", body: {
        username: username.value
      }
    });
    username.value = userUpdated?.name ?? "";
  } finally {
    loadingUpdateUser.value = false;
  }
}

async function signOut() {
  try {
    loading.value = true;
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    router.push("/login");
  } finally {
    loading.value = false;
  }
}
</script>
