import { defineStore } from "pinia";
import { toast } from "vue3-toastify";
import type {
  CosmeticCatalogDTO,
  CosmeticEquipRequestDTO,
  CosmeticType,
  CosmeticUnlockRequestDTO,
} from "#shared/DTO/cosmeticDTO";

export const useCosmeticsStore = defineStore("cosmetics", {
  state: () => ({
    catalog: null as CosmeticCatalogDTO | null,
    loading: false,
    pendingId: null as string | null, // "avatar-3" pendant un unlock/equip
  }),
  getters: {
    coins: (state) => state.catalog?.coins ?? 0,
  },
  actions: {
    async fetchCatalog() {
      const { authFetch } = useAuthFetch();
      this.loading = true;
      try {
        this.catalog = await authFetch<CosmeticCatalogDTO>("/api/cosmetics/catalog");
      } catch (e) {
        console.error("Erreur lors du chargement du catalogue de cosmétiques:", e);
      } finally {
        this.loading = false;
      }
    },
    async unlock(type: CosmeticType, id: number) {
      const { authFetch } = useAuthFetch();
      this.pendingId = `${type}-${id}`;
      try {
        this.catalog = await authFetch<CosmeticCatalogDTO>("/api/cosmetics/unlock", {
          method: "POST",
          body: { type, id } satisfies CosmeticUnlockRequestDTO,
        });
        toast.success(type === "avatar" ? "Avatar débloqué !" : "Cadre débloqué !");
      } catch (e: any) {
        toast.error(e?.data?.statusMessage ?? "Impossible de débloquer cet élément.");
      } finally {
        this.pendingId = null;
      }
    },
    async equip(type: CosmeticType, id: number | null) {
      const { authFetch } = useAuthFetch();
      this.pendingId = `${type}-${id}`;
      try {
        await authFetch("/api/cosmetics/equip", {
          method: "POST",
          body: { type, id } satisfies CosmeticEquipRequestDTO,
        });
        // Mettre à jour l'état "équipé" localement puis rafraîchir l'utilisateur global
        if (this.catalog) {
          const list = type === "avatar" ? this.catalog.avatars : this.catalog.frames;
          list.forEach((item) => (item.equipped = item.id === id));
        }
        await useUserStore().fetchUser(true);
      } catch (e: any) {
        toast.error(e?.data?.statusMessage ?? "Impossible d'équiper cet élément.");
      } finally {
        this.pendingId = null;
      }
    },
  },
});
