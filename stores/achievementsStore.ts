import { defineStore } from "pinia";
import type {
  AchievementDTO,
  UserAchievementDTO,
} from "~/models/DTO/achievementDTO";
import { toast, type ToastOptions } from "vue3-toastify";
import AchievementToast from "~/components/achievements/AchievementToast.vue";

export const useAchievementStore = defineStore("achivements", {
  state: () => ({
    achievements: [] as AchievementDTO[],
    userAchievements: [] as UserAchievementDTO[],
  }),
  actions: {
    async loadData() {
      const result = await $fetch("/api/achievement");
      this.achievements = result?.achivements ?? [];
      this.userAchievements = result?.userAchievements ?? [];
    },
    async answerQuestion() {
      const result = await $fetch("/api/achievement/answer");
      result?.forEach((a) => {
        this.userAchievements.push(a);
        this.notify(a);
      });
    },
    async answerDailyQuestion() {
      const result = await $fetch("/api/achievement/daily");
      result?.forEach((a) => {
        this.userAchievements.push(a);
        this.notify(a);
      });
    },
    async answerAscentQuestion() {
      const result = await $fetch("/api/achievement/ascent");
      result?.forEach((a) => {
        this.userAchievements.push(a);
        this.notify(a);
      });
    },
    notify(achievement: UserAchievementDTO) {
      toast(({ toastProps }) => h(AchievementToast, { achievement }), {
        closeOnClick: false,
        autoClose: 4000,
        limit: 1,
        position: toast.POSITION.TOP_RIGHT,
        transition: toast.TRANSITIONS.SLIDE,
        closeButton: false,
        toastStyle: {
          margin: "0px",
          padding: "0px",
          background: "black",
        },
      } as ToastOptions);
    },
  },
});
