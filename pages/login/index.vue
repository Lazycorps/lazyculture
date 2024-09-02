<template>
  <v-container fluid class="fill-height d-flex justify-center align-center">
    <v-card width="450px" class="pa-10 d-flex flex-column" rounded="100">
      <v-card-title>Sign In </v-card-title>
      <v-text-field v-model="email" label="Email"></v-text-field>
      <v-text-field
        :type="passwordType"
        label="Password"
        v-model="password"
        append-inner-icon="mdi-eye"
        @click:append-inner="
          passwordType == 'password'
            ? (passwordType = 'text')
            : (passwordType = 'password')
        "
      />
      <!-- <v-alert
        type="warning"
        class="mb-5"
        variant="tonal"
        v-if="errorValidationEmail"
      >
        Email Not Verified. Check your inbox for the verification email sent to
        you or
        <a @click="sendValidation" href="#" variant="text"
          >resend validation email</a
        >.
      </v-alert> -->
      <v-alert type="error" class="mb-5" variant="tonal" v-if="displayError">
        {{ displayError }}
      </v-alert>
      <v-alert
        type="success"
        class="mb-5"
        variant="tonal"
        v-if="successMessage"
      >
        {{ successMessage }}
      </v-alert>
      <div class="align-self-end">
        <v-btn
          @click="router.push('/login/register')"
          class="mr-5"
          color="primary"
          variant="text"
          >register</v-btn
        >
        <v-btn @click="signIn" color="primary" variant="flat">Sign In</v-btn>
      </div>
    </v-card>
  </v-container>
</template>

<script setup lang="ts">
const supabase = useSupabaseClient();
const router = useRouter();
const route = useRoute();

const passwordType = ref<"password" | "text">("password");
const email = ref("");
const password = ref("");

const successMessage = ref("");
const displayError = ref("");

// onMounted(() => {
//   const mode = route.query.mode;
//   if (!route.query?.oobCode) return;
//   if (mode == "verifyEmail") handleVerifyEmail(route.query.oobCode.toString());
// });

async function signIn() {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.value,
      password: password.value,
    });
    if (error) displayError.value = error.message;
    else {
      await $fetch("/api/user/create", {
        method: "post",
        body: {
          id: data.user.id,
          name: "",
          slug: "",
        },
      });
      router.push("/");
    }
  } catch (err: any) {
    displayError.value = "Invalid email or password.";
  }
}
</script>
