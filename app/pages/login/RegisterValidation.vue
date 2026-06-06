<template>
  <div class="w-full max-w-sm mx-auto py-10 select-none">
    <UCard
      class="shadow-glass bg-[#111827]/70 backdrop-blur-xl border border-white/10 rounded-2xl p-2 text-center"
    >
      <template #header>
        <div class="flex flex-col items-center space-y-3">
          <div
            class="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-2xl text-emerald-400"
          >
            ✉️
          </div>
          <h2 class="text-xl font-black font-display text-white tracking-wide">
            Vérifiez vos e-mails
          </h2>
        </div>
      </template>

      <div class="space-y-4 text-sm text-gray-300 font-medium leading-relaxed p-2">
        <p>
          Merci pour votre inscription ! <b>Pour activer votre compte</b>, veuillez cliquer sur le
          lien de confirmation envoyé à votre adresse e-mail.
        </p>
        <p class="text-xs text-gray-400">
          Si vous ne recevez pas l'e-mail dans quelques minutes, veuillez vérifier vos courriers
          indésirables (spams).
        </p>
      </div>

      <template #footer>
        <div class="pt-2">
          <UButton
            color="primary"
            block
            size="md"
            icon="i-heroicons-arrow-left-on-rectangle"
            class="font-black font-display uppercase tracking-widest py-3"
            @click="router.push('/login')"
          >
            Se connecter
          </UButton>
        </div>
      </template>
    </UCard>
  </div>
</template>

<script setup lang="ts">
const router = useRouter();
</script>

<style scoped>
/* Scoped modifications if needed */
</style>
