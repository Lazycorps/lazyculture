<template>
  <div
    class="max-w-5xl mx-auto bg-[#111827]/50 backdrop-blur-xl border border-white/10 rounded-3xl p-5 sm:p-8 space-y-6 shadow-glass"
  >
    <!-- En-tête -->
    <div
      class="border-b border-white/5 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
    >
      <div>
        <h3 class="text-base sm:text-lg font-black font-display text-white flex items-center gap-2">
          <UIcon name="i-heroicons-arrow-up-tray" class="text-violet-400" />
          <span>Importer un lot de questions</span>
        </h3>
        <p class="text-xs text-gray-400 font-medium mt-0.5">
          Remplissez le gabarit dans votre tableur, puis déposez-le ici. Chaque ligne devient une
          question soumise à la relecture de la communauté.
        </p>
      </div>
      <div
        class="text-[11px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-full self-start sm:self-auto flex items-center gap-1 font-display"
      >
        <span>📥 {{ maxRows }} questions maximum par import</span>
      </div>
    </div>

    <!-- 1. Thème de l'import -->
    <div class="space-y-1.5">
      <label class="text-xs font-bold font-display text-gray-300"
        >Thème de l'import <span class="text-rose-400">*</span></label
      >
      <USelectMenu
        v-model="selectedTheme"
        :items="themeOptions"
        label-key="name"
        value-key="slug"
        placeholder="Sélectionner un thème"
        size="md"
        class="w-full"
      />
      <p class="text-[11px] text-gray-500 font-medium">
        Ce thème est appliqué à <span class="text-violet-400 font-bold">toutes</span> les questions
        du fichier. La difficulté est fixée automatiquement à
        <span class="text-violet-400 font-bold">{{ defaultDifficulty }}</span> : elle n'est pas à
        renseigner dans le CSV.
      </p>
    </div>

    <!-- 2. Gabarit -->
    <div class="p-4 rounded-2xl bg-slate-950/40 border border-white/5 space-y-3">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <p class="text-xs font-bold font-display text-gray-300 flex items-center gap-1.5">
            <UIcon name="i-heroicons-document-text" class="text-violet-400" />
            <span>1. Téléchargez le gabarit</span>
          </p>
          <p class="text-[11px] text-gray-500 font-medium mt-0.5">
            Un fichier CSV pré-rempli avec deux exemples, à ouvrir dans Excel, LibreOffice ou Google
            Sheets.
          </p>
        </div>
        <UButton
          color="primary"
          variant="soft"
          size="sm"
          icon="i-heroicons-arrow-down-tray"
          class="font-bold font-display self-start"
          @click="downloadTemplate"
        >
          Télécharger le gabarit
        </UButton>
      </div>

      <div class="flex flex-wrap gap-1.5">
        <span
          v-for="col in columns"
          :key="col.key"
          :title="col.help"
          class="text-[10px] font-bold font-display px-2 py-0.5 rounded-full border"
          :class="
            col.required
              ? 'bg-violet-500/10 border-violet-500/20 text-violet-300'
              : 'bg-white/5 border-white/10 text-gray-400'
          "
        >
          {{ col.label }}<span v-if="col.required" class="text-rose-400">*</span>
        </span>
      </div>
      <p class="text-[11px] text-gray-500 font-medium">
        La colonne <span class="text-gray-300 font-bold">bonne_reponse</span> contient le numéro de
        la proposition correcte : <span class="text-gray-300 font-bold">1</span>,
        <span class="text-gray-300 font-bold">2</span>,
        <span class="text-gray-300 font-bold">3</span> ou
        <span class="text-gray-300 font-bold">4</span>. Ne modifiez ni le nom ni l'ordre des
        colonnes.
      </p>
    </div>

    <!-- 3. Dépôt du fichier -->
    <div class="space-y-2">
      <p class="text-xs font-bold font-display text-gray-300 flex items-center gap-1.5">
        <UIcon name="i-heroicons-cloud-arrow-up" class="text-violet-400" />
        <span>2. Déposez votre fichier rempli</span>
      </p>
      <div
        class="border border-dashed rounded-2xl p-6 text-center transition-all duration-200 flex flex-col items-center justify-center space-y-1.5 select-none"
        :class="
          selectedTheme
            ? 'border-white/20 cursor-pointer hover:border-violet-500/50 hover:bg-violet-600/5'
            : 'border-white/10 opacity-50 cursor-not-allowed'
        "
        @dragover.prevent
        @dragenter.prevent
        @drop.prevent="handleDrop"
        @click="selectFile"
      >
        <UIcon name="i-heroicons-table-cells" class="text-3xl text-gray-400" />
        <p class="text-xs text-gray-400 font-semibold font-display">
          {{
            selectedTheme
              ? "Déposez votre fichier .csv ici ou cliquez pour le sélectionner"
              : "Choisissez d'abord un thème pour activer l'import"
          }}
        </p>
        <p v-if="fileName" class="text-[11px] text-violet-300 font-bold font-display">
          {{ fileName }}
        </p>
        <input
          ref="fileInputRef"
          type="file"
          accept=".csv,text/csv"
          hidden
          @change="handleFileSelect"
        />
      </div>

      <p
        v-if="fileError"
        class="text-[11px] text-rose-400 font-bold font-display flex items-start gap-1.5"
      >
        <UIcon name="i-heroicons-exclamation-triangle" class="shrink-0 mt-0.5" />
        <span>{{ fileError }}</span>
      </p>
    </div>

    <!-- 4. Prévisualisation -->
    <div v-if="parsedRows.length > 0" class="space-y-3">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <p class="text-xs font-bold font-display text-gray-300 flex items-center gap-1.5">
          <UIcon name="i-heroicons-eye" class="text-violet-400" />
          <span>3. Vérifiez avant d'envoyer</span>
        </p>
        <div class="flex flex-wrap items-center gap-1.5 text-[11px] font-bold font-display">
          <span
            class="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
          >
            {{ validRows.length }} valide{{ validRows.length > 1 ? "s" : "" }}
          </span>
          <span
            v-if="invalidCount > 0"
            class="px-2 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400"
          >
            {{ invalidCount }} en erreur
          </span>
          <span
            class="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-gray-400"
            :title="selectedThemeName"
          >
            {{ selectedThemeName }} · difficulté {{ defaultDifficulty }}
          </span>
        </div>
      </div>

      <div class="rounded-2xl border border-white/10 overflow-hidden">
        <div class="overflow-x-auto max-h-[420px] overflow-y-auto">
          <table class="w-full text-left">
            <thead class="bg-slate-950/60 sticky top-0 backdrop-blur-xl">
              <tr class="text-[10px] uppercase font-black font-display text-gray-500">
                <th class="py-2 px-3 w-10">
                  <input
                    type="checkbox"
                    class="accent-violet-500 cursor-pointer"
                    :checked="allValidSelected"
                    :disabled="validRows.length === 0"
                    @change="toggleAll"
                  />
                </th>
                <th class="py-2 px-3 w-12">Ligne</th>
                <th class="py-2 px-3">Question</th>
                <th class="py-2 px-3 w-40">Bonne réponse</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="entry in parsedRows"
                :key="entry.line"
                class="border-t border-white/5 align-top"
                :class="entry.error ? 'bg-rose-500/5' : 'hover:bg-white/[0.02]'"
              >
                <td class="py-2.5 px-3">
                  <input
                    v-model="selectedLines"
                    type="checkbox"
                    :value="entry.line"
                    :disabled="!!entry.error"
                    class="accent-violet-500 cursor-pointer disabled:cursor-not-allowed disabled:opacity-30"
                  />
                </td>
                <td class="py-2.5 px-3 text-xs font-bold font-display text-gray-500">
                  {{ entry.line }}
                </td>
                <td class="py-2.5 px-3 min-w-[280px]">
                  <p class="text-xs font-bold text-white line-clamp-2" :title="entry.libelle">
                    {{ entry.libelle || "—" }}
                  </p>
                  <p
                    v-if="entry.error"
                    class="text-[11px] text-rose-400 font-bold font-display mt-1 flex items-start gap-1"
                  >
                    <UIcon name="i-heroicons-x-circle" class="shrink-0 mt-0.5" />
                    <span>{{ entry.error }}</span>
                  </p>
                  <p v-else class="text-[11px] text-gray-500 font-medium mt-0.5 line-clamp-1">
                    {{ entry.row?.propositions.map((p) => p.value).join(" · ") }}
                  </p>
                </td>
                <td class="py-2.5 px-3">
                  <span
                    v-if="entry.row"
                    class="text-[11px] font-bold font-display text-emerald-400 line-clamp-2"
                  >
                    {{ entry.row.propositions[entry.row.response]?.value }}
                  </span>
                  <span v-else class="text-[11px] text-gray-600 font-bold font-display">—</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <p class="text-[11px] text-gray-500 font-medium">
          Seules les lignes cochées seront envoyées. Les questions importées passent en relecture,
          comme celles créées une par une.
        </p>
        <div class="flex items-center gap-2 self-start sm:self-auto">
          <UButton
            color="neutral"
            variant="ghost"
            size="sm"
            class="font-bold font-display"
            @click="resetFile"
          >
            Annuler
          </UButton>
          <UButton
            color="primary"
            size="md"
            icon="i-heroicons-paper-airplane"
            class="font-bold font-display"
            :loading="importing"
            :disabled="selectedLines.length === 0 || importing"
            @click="submitImport"
          >
            Importer {{ selectedLines.length }} question{{ selectedLines.length > 1 ? "s" : "" }}
          </UButton>
        </div>
      </div>
    </div>

    <!-- 5. Compte-rendu -->
    <div v-if="importResult" class="space-y-3">
      <div
        class="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 flex items-center gap-3"
      >
        <UIcon name="i-heroicons-check-circle" class="text-2xl text-emerald-400 shrink-0" />
        <div>
          <p class="text-sm font-black font-display text-white">
            {{ importResult.importedCount }} question{{
              importResult.importedCount > 1 ? "s" : ""
            }}
            envoyée{{ importResult.importedCount > 1 ? "s" : "" }} en relecture
          </p>
          <p class="text-[11px] text-gray-400 font-medium">
            Suivez leur avancement dans l'onglet « Mes Contributions ».
          </p>
        </div>
      </div>

      <div
        v-if="rejectedResultRows.length > 0"
        class="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 space-y-2"
      >
        <p class="text-xs font-black font-display text-amber-400 flex items-center gap-1.5">
          <UIcon name="i-heroicons-exclamation-triangle" />
          <span
            >{{ rejectedResultRows.length }} ligne{{ rejectedResultRows.length > 1 ? "s" : "" }} non
            importée{{ rejectedResultRows.length > 1 ? "s" : "" }}</span
          >
        </p>
        <ul class="space-y-1">
          <li
            v-for="row in rejectedResultRows"
            :key="row.line"
            class="text-[11px] text-gray-400 font-medium"
          >
            <span class="text-gray-500 font-bold font-display">Ligne {{ row.line }}</span> —
            <span class="text-gray-300">{{ row.libelle || "(sans intitulé)" }}</span> :
            <span class="text-amber-300">{{ row.error }}</span>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { toast } from "vue3-toastify";
import {
  SUBMISSION_CSV_COLUMNS,
  SUBMISSION_CSV_DEFAULT_DIFFICULTY,
  SUBMISSION_CSV_MAX_FILE_SIZE,
  SUBMISSION_CSV_MAX_ROWS,
  SUBMISSION_CSV_REQUIRED_HEADERS,
  SUBMISSION_CSV_TEMPLATE_FILENAME,
  buildTemplateCsv,
  mapCsvRowToPayload,
} from "#shared/community/submissionCsvTemplate";
import { isBlankRow, parseCsv } from "#shared/csv/csv";
import type {
  BulkImportResultDTO,
  BulkSubmissionRowPayload,
} from "#shared/DTO/questionSubmissionDTO";

const props = defineProps<{
  themeOptions: { slug: string; name: string }[];
}>();

const emit = defineEmits<{ imported: [] }>();

/** Une ligne du fichier après parsing : soit exploitable, soit porteuse d'une erreur. */
interface ParsedEntry {
  line: number;
  libelle: string;
  row?: BulkSubmissionRowPayload;
  error?: string;
}

const columns = SUBMISSION_CSV_COLUMNS;
const maxRows = SUBMISSION_CSV_MAX_ROWS;
const defaultDifficulty = SUBMISSION_CSV_DEFAULT_DIFFICULTY;

const selectedTheme = ref("");
const fileInputRef = ref<HTMLInputElement | null>(null);
const fileName = ref("");
const fileError = ref("");
const parsedRows = ref<ParsedEntry[]>([]);
const selectedLines = ref<number[]>([]);
const importing = ref(false);
const importResult = ref<BulkImportResultDTO | null>(null);

const selectedThemeName = computed(
  () => props.themeOptions.find((t) => t.slug === selectedTheme.value)?.name || "Thème",
);
const validRows = computed(() => parsedRows.value.filter((entry) => !entry.error));
const invalidCount = computed(() => parsedRows.value.length - validRows.value.length);
const allValidSelected = computed(
  () => validRows.value.length > 0 && selectedLines.value.length === validRows.value.length,
);
const rejectedResultRows = computed(
  () => importResult.value?.rows.filter((row) => row.status === "REJECTED") ?? [],
);

function downloadTemplate() {
  const blob = new Blob([buildTemplateCsv()], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = SUBMISSION_CSV_TEMPLATE_FILENAME;
  link.click();
  URL.revokeObjectURL(url);
}

function selectFile() {
  if (!selectedTheme.value) {
    toast.error("Choisissez d'abord le thème de l'import.");
    return;
  }
  fileInputRef.value?.click();
}

function handleFileSelect(event: Event) {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (file) void readFile(file);
  // Permet de re-sélectionner le même fichier après correction.
  target.value = "";
}

function handleDrop(event: DragEvent) {
  if (!selectedTheme.value) {
    toast.error("Choisissez d'abord le thème de l'import.");
    return;
  }
  const file = event.dataTransfer?.files?.[0];
  if (file) void readFile(file);
}

async function readFile(file: File) {
  resetPreview();
  fileName.value = file.name;

  if (!/\.csv$/i.test(file.name)) {
    fileError.value = "Le fichier doit être un CSV (extension .csv).";
    return;
  }
  if (file.size > SUBMISSION_CSV_MAX_FILE_SIZE) {
    fileError.value = "Le fichier est trop volumineux (1 Mo maximum).";
    return;
  }

  let rows: string[][];
  try {
    rows = parseCsv(await file.text());
  } catch {
    fileError.value = "Le fichier n'a pas pu être lu. Vérifiez qu'il s'agit bien d'un CSV.";
    return;
  }

  if (rows.length === 0) {
    fileError.value = "Le fichier est vide.";
    return;
  }

  const headers = (rows[0] ?? []).map((h) => h.trim().toLowerCase());
  const missing = SUBMISSION_CSV_REQUIRED_HEADERS.filter((h) => !headers.includes(h));
  if (missing.length > 0) {
    fileError.value = `Colonnes manquantes dans l'en-tête : ${missing.join(", ")}. Repartez du gabarit.`;
    return;
  }

  // Les lignes vides sont ignorées, mais on conserve leur index pour que le n° affiché
  // corresponde exactement à celui du tableur.
  const dataRows = rows
    .map((cells, index) => ({ cells, line: index + 1 }))
    .slice(1)
    .filter(({ cells }) => !isBlankRow(cells));

  if (dataRows.length === 0) {
    fileError.value = "Le fichier ne contient aucune question sous la ligne d'en-tête.";
    return;
  }
  if (dataRows.length > SUBMISSION_CSV_MAX_ROWS) {
    fileError.value = `Le fichier contient ${dataRows.length} questions : le maximum est de ${SUBMISSION_CSV_MAX_ROWS} par import.`;
    return;
  }

  parsedRows.value = dataRows.map(({ cells, line }) => {
    const record: Record<string, string> = {};
    headers.forEach((header, i) => {
      record[header] = cells[i] ?? "";
    });

    const libelle = (record.libelle ?? "").trim();
    const mapped = mapCsvRowToPayload(record, line);
    return "error" in mapped
      ? { line, libelle, error: mapped.error }
      : { line, libelle, row: mapped.row };
  });

  selectedLines.value = validRows.value.map((entry) => entry.line);
}

function toggleAll(event: Event) {
  const checked = (event.target as HTMLInputElement).checked;
  selectedLines.value = checked ? validRows.value.map((entry) => entry.line) : [];
}

function resetPreview() {
  fileError.value = "";
  parsedRows.value = [];
  selectedLines.value = [];
  importResult.value = null;
}

function resetFile() {
  resetPreview();
  fileName.value = "";
}

async function submitImport() {
  if (selectedLines.value.length === 0 || importing.value) return;

  const rows = parsedRows.value
    .filter((entry) => entry.row && selectedLines.value.includes(entry.line))
    .map((entry) => entry.row as BulkSubmissionRowPayload);

  importing.value = true;
  try {
    const result = await $fetch<BulkImportResultDTO>("/api/community/submissions/bulk", {
      method: "POST",
      body: { themeSlug: selectedTheme.value, rows },
    });

    importResult.value = result;
    parsedRows.value = [];
    selectedLines.value = [];
    fileName.value = "";

    if (result.importedCount > 0) {
      toast.success(
        `${result.importedCount} question${result.importedCount > 1 ? "s" : ""} soumise${
          result.importedCount > 1 ? "s" : ""
        } à la relecture !`,
      );
      emit("imported");
    } else {
      toast.error("Aucune question n'a pu être importée. Consultez le détail ci-dessous.");
    }
  } catch (err: any) {
    toast.error(err?.data?.statusMessage || "Erreur lors de l'import du fichier.");
  } finally {
    importing.value = false;
  }
}
</script>
