import { h } from "vue";
import { toast, type ToastOptions } from "vue3-toastify";
import QuestCompletedToast from "~/components/series/QuestCompletedToast.vue";
import { useUserStore } from "~/stores/userStore";

export interface CompletedQuestToastData {
  id: number;
  category: "SHORT" | "LONG";
  questType: string;
  title: string;
  description: string;
  targetTheme?: string | null;
  themeName?: string | null;
  coinsEarned: number;
  questStreak: number;
}

export function useQuestToast() {
  const userStore = useUserStore();

  function notifyQuestCompleted(quest: CompletedQuestToastData) {
    if (!quest) return;

    // Déclenche le son de succès
    try {
      const { playSound } = useAudio();
      playSound("response-success");
    } catch {
      // Ignorer si le contexte audio n'est pas prêt
    }

    // Affiche la notification Toast stylisée
    toast(() => h(QuestCompletedToast, { quest }), {
      closeOnClick: false,
      autoClose: 5000,
      limit: 2,
      position: toast.POSITION.TOP_RIGHT,
      transition: toast.TRANSITIONS.SLIDE,
      closeButton: false,
      toastStyle: {
        margin: "0px",
        padding: "0px",
        background: "transparent",
        boxShadow: "none",
      },
    } as ToastOptions);

    // Actualise immédiatement le solde de pièces du joueur
    userStore.fetchUser(true).catch(console.error);
  }

  function handleCompletedQuests(completedQuests?: CompletedQuestToastData[]) {
    if (!completedQuests || !Array.isArray(completedQuests)) return;
    for (const quest of completedQuests) {
      notifyQuestCompleted(quest);
    }
  }

  return {
    notifyQuestCompleted,
    handleCompletedQuests,
  };
}
