import type { BrainrunMetaProgressDTO } from "#shared/brainrun";
import type { BrainrunTalentId } from "#shared/brainrunTalents";

/** Progression metagame Brainrun (Points de Savoir + talents débloqués), persistante entre les runs. */
export const useBrainrunMeta = () => {
  const metaProgress = useState<BrainrunMetaProgressDTO | null>("brainrun-meta", () => null);
  const loading = useState<boolean>("brainrun-meta-loading", () => false);

  async function fetchMeta() {
    const { authFetch } = useAuthFetch();
    loading.value = true;
    try {
      metaProgress.value = await authFetch<BrainrunMetaProgressDTO>("/api/brainrun/meta");
    } catch (e) {
      console.error("Failed to fetch brainrun meta progress:", e);
    } finally {
      loading.value = false;
    }
  }

  async function unlockTalent(talentId: BrainrunTalentId) {
    const { authFetch } = useAuthFetch();
    loading.value = true;
    try {
      metaProgress.value = await authFetch<BrainrunMetaProgressDTO>("/api/brainrun/talent-unlock", {
        method: "post",
        body: { talentId },
      });
    } finally {
      loading.value = false;
    }
  }

  return { metaProgress, loading, fetchMeta, unlockTalent };
};
