import { defineStore } from "pinia";

export interface DBUser {
  id: string;
  name: string;
  slug: string;
  createDate: string;
  updateDate: string;
  email?: string;
  nextLevelTreshold: number;
  UserProgress?: {
    levelId: number;
    xp: number;
    level: {
      id: number;
      xp_threshold: number;
    };
  };
  brRank?: {
    points: number;
    wins: number;
    gamesPlayed: number;
    rankInfo: any;
  };
}

export const useUserStore = defineStore("user", {
  state: () => ({
    user: null as DBUser | null,
    loading: false,
    loaded: false,
  }),
  getters: {
    isLoggedIn: (state) => !!state.user,
    userId: (state) => state.user?.id || "",
    username: (state) => state.user?.name || "",
    level: (state) => state.user?.UserProgress?.levelId || 1,
    xp: (state) => state.user?.UserProgress?.xp || 0,
    xpThreshold: (state) => state.user?.UserProgress?.level?.xp_threshold || 0,
    nextLevelTreshold: (state) => state.user?.nextLevelTreshold || 100,
    xpProgress: (state) => {
      if (!state.user) return 0;
      const current = state.user.UserProgress?.xp ?? 0;
      const min = state.user.UserProgress?.level?.xp_threshold ?? 0;
      const max = state.user.nextLevelTreshold ?? 100;
      const diff = max - min;
      if (diff <= 0) return 0;
      return ((current - min) / diff) * 100;
    },
  },
  actions: {
    async fetchUser(force = false) {
      if (this.loaded && !force) return;
      this.loading = true;
      try {
        const supabase = useSupabaseClient();
        const {
          data: { session },
        } = await supabase.auth.getSession();
        const token = session?.access_token;

        const data = await $fetch<any>("/api/user/current", {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (data) {
          this.user = data;
          this.loaded = true;
        } else {
          this.user = null;
          this.loaded = false;
        }
      } catch (e) {
        console.error("Failed to fetch user in store:", e);
        this.user = null;
        this.loaded = false;
      } finally {
        this.loading = false;
      }
    },
    clearUser() {
      this.user = null;
      this.loaded = false;
    },
  },
});
