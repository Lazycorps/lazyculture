<template>
  <div v-if="isDev" class="mb-2">
    <button
      type="button"
      class="flex items-center gap-1 text-[10px] font-black font-display uppercase tracking-wider text-gray-500 hover:text-gray-300"
      @click.stop="open = !open"
    >
      <UIcon name="i-heroicons-bug-ant" />
      Debug
    </button>

    <div
      v-if="open"
      class="mt-1.5 bg-black/40 border border-white/10 rounded-xl p-2.5 space-y-2 text-[11px]"
      @click.stop
    >
      <!-- PV / Or -->
      <div class="flex items-center gap-1.5 flex-wrap">
        <span class="text-gray-500 w-6">PV</span>
        <input
          v-model.number="hp"
          type="number"
          min="1"
          class="w-12 bg-white/5 border border-white/10 rounded px-1.5 py-0.5 text-white"
        />
        <span class="text-gray-600">/</span>
        <input
          v-model.number="maxHp"
          type="number"
          min="1"
          class="w-12 bg-white/5 border border-white/10 rounded px-1.5 py-0.5 text-white"
        />
        <span class="text-gray-500 ml-2 w-6">Or</span>
        <input
          v-model.number="gold"
          type="number"
          min="0"
          class="w-16 bg-white/5 border border-white/10 rounded px-1.5 py-0.5 text-white"
        />
        <button
          type="button"
          :disabled="loading"
          class="ml-auto text-violet-400 font-black font-display uppercase tracking-wider disabled:opacity-40"
          @click="applyStats"
        >
          OK
        </button>
      </div>

      <!-- Téléportation -->
      <div class="flex items-center gap-1.5 flex-wrap pt-1 border-t border-white/5">
        <span class="text-gray-500 w-6">Acte</span>
        <input
          v-model.number="act"
          type="number"
          min="1"
          :max="totalActs"
          class="w-10 bg-white/5 border border-white/10 rounded px-1.5 py-0.5 text-white"
        />
        <span class="text-gray-500 w-10">Rangée</span>
        <input
          v-model.number="row"
          type="number"
          min="1"
          :max="roomsPerAct"
          class="w-10 bg-white/5 border border-white/10 rounded px-1.5 py-0.5 text-white"
        />
        <span class="text-gray-500 w-6">Col</span>
        <input
          v-model.number="col"
          type="number"
          min="0"
          max="2"
          class="w-10 bg-white/5 border border-white/10 rounded px-1.5 py-0.5 text-white"
        />
      </div>
      <div class="flex items-center gap-1.5 flex-wrap">
        <select
          v-model="roomType"
          class="bg-slate-800 border border-white/10 rounded px-1 py-0.5 text-white"
        >
          <option value="" class="bg-slate-900 text-white">(type actuel)</option>
          <option v-for="t in roomTypes" :key="t" :value="t" class="bg-slate-900 text-white">
            {{ t }}
          </option>
        </select>
        <select
          v-if="combatOptions.length"
          v-model="forcedCombatId"
          class="flex-1 min-w-[110px] bg-slate-800 border border-white/10 rounded px-1.5 py-0.5 text-white"
        >
          <option value="" class="bg-slate-900 text-white">(aléatoire)</option>
          <option
            v-for="o in combatOptions"
            :key="o.id"
            :value="o.id"
            class="bg-slate-900 text-white"
          >
            {{ o.name }}
          </option>
        </select>
      </div>
      <button
        type="button"
        :disabled="loading"
        class="w-full text-violet-400 font-black font-display uppercase tracking-wider py-1 disabled:opacity-40"
        @click="applyJump"
      >
        Téléporter
      </button>
      <p v-if="error" class="text-rose-400">{{ error }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import {
  BRAINRUN_TOTAL_ACTS,
  getBrainrunRoomsPerAct,
  type BrainrunRoomType,
} from "#shared/brainrun";
import { getBrainrunEnemiesByActAndTier } from "#shared/brainrunEnemies";
import { getBrainrunBossesByAct } from "#shared/brainrunBosses";

/** Panneau visible uniquement en développement (import.meta.dev, rejeté par le serveur sinon) :
 * force PV/or/téléportation pour tester une situation précise sans devoir la provoquer en jouant
 * normalement. Cf. references/debug-mode.md. */
const isDev = import.meta.dev;
const brainrun = useBrainrunSession();
const run = brainrun.run;
const loading = brainrun.loading;

const roomTypes: BrainrunRoomType[] = ["STANDARD", "ELITE", "BOSS", "REST", "SHOP", "EVENT"];
const totalActs = BRAINRUN_TOTAL_ACTS;

const open = ref(false);
const error = ref<string | null>(null);

const hp = ref(run.value?.healthPoint ?? 3);
const maxHp = ref(run.value?.maxHealthPoint ?? 3);
const gold = ref(run.value?.gold ?? 0);

const act = ref(run.value?.currentAct ?? 1);
const row = ref(run.value?.currentRow ?? 1);
const roomsPerAct = computed(() => getBrainrunRoomsPerAct(act.value));
const col = ref(0);
const roomType = ref<BrainrunRoomType | "">("");
const forcedCombatId = ref("");

/** Liste d'ennemis/boss du catalogue (shared/brainrunEnemies.ts / brainrunBosses.ts) correspondant
 * à l'acte/type choisis, pour remplacer la saisie libre d'id par un select — vide (donc masqué)
 * tant qu'un type de combat n'est pas explicitement sélectionné. */
const combatOptions = computed(() => {
  if (roomType.value === "STANDARD") {
    return getBrainrunEnemiesByActAndTier(act.value, "CLASSIC").map((e) => ({
      id: e.id,
      name: e.name,
    }));
  }
  if (roomType.value === "ELITE") {
    return getBrainrunEnemiesByActAndTier(act.value, "ELITE").map((e) => ({
      id: e.id,
      name: e.name,
    }));
  }
  if (roomType.value === "BOSS") {
    return getBrainrunBossesByAct(act.value).map((b) => ({ id: b.id, name: b.name }));
  }
  return [];
});

// Une sélection ne reste valide que pour l'acte/type qui l'ont proposée (les catalogues sont
// distincts par acte) : on la réinitialise dès que l'un des deux change pour éviter d'envoyer un
// id qui ne correspond plus aux options affichées.
watch([roomType, act], () => {
  forcedCombatId.value = "";
});

async function applyStats() {
  error.value = null;
  try {
    await brainrun.debugSetStats({
      healthPoint: hp.value,
      maxHealthPoint: maxHp.value,
      gold: gold.value,
    });
  } catch (e) {
    error.value = e instanceof Error ? e.message : "Échec de la mise à jour.";
  }
}

async function applyJump() {
  error.value = null;
  try {
    await brainrun.debugJump({
      act: act.value,
      row: row.value,
      col: col.value,
      roomType: roomType.value || undefined,
      forcedCombatId: forcedCombatId.value.trim() || undefined,
    });
  } catch (e) {
    error.value = e instanceof Error ? e.message : "Échec de la téléportation.";
  }
}
</script>
