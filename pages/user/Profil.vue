<template>
  <v-card flat rounded class="mx-auto my-auto pa-5" width="350">
    <form class="form-widget" @submit.prevent="updateProfile">
      <div>
        <v-text-field
          label="Email"
          v-model="user.email"
          readonly
        ></v-text-field>
      </div>
      <div>
        <v-text-field label="Username" v-model="user.username"></v-text-field>
      </div>
      <div class="d-flex justify-end">
        <v-btn
          @click="signOut"
          :disabled="loading"
          prepend-icon="mdi-logout"
          color="red"
          class="mr-5"
        >
          Logout
        </v-btn>
        <v-btn
          type="submit"
          :disabled="loading"
          color="primary"
          prepend-icon="mdi-floppy"
          >Save</v-btn
        >
      </div>
    </form>
  </v-card>
</template>

<script setup>
const supabase = useSupabaseClient();
const router = useRouter();
const user = useSupabaseUser();

const loading = ref(true);
const username = ref("");
const avatar_path = ref("");

const { data } = await supabase
  .from("profiles")
  .select(`username, website, avatar_url`)
  .eq("id", user.value.id)
  .single();

if (data) {
  username.value = data.username;
  website.value = data.website;
  avatar_path.value = data.avatar_url;
}

loading.value = false;

async function updateProfile() {
  try {
    loading.value = true;
    const user = useSupabaseUser();

    const updates = {
      id: user.value.id,
      username: username.value,
      avatar_url: avatar_path.value,
      updated_at: new Date(),
    };

    const { error } = await supabase.from("profiles").upsert(updates, {
      returning: "minimal", // Don't return the value after inserting
    });
    if (error) throw error;
  } catch (error) {
    alert(error.message);
  } finally {
    loading.value = false;
  }
}

async function signOut() {
  try {
    loading.value = true;
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    router.push("/login");
    user.value = null;
  } catch (error) {
    alert(error.message);
  } finally {
    loading.value = false;
  }
}
</script>
