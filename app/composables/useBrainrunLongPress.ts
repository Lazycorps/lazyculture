// Simule un "hover" tactile sur mobile pour révéler l'effet d'un consommable sans le
// consacrer immédiatement au relâchement : un appui maintenu 1,5s affiche une infobulle,
// et le clic qui suit le relâchement doit être ignoré s'il provient de cet appui long.
// Ignoré sur souris/stylet (pointerType !== "touch") car le hover natif (title) suffit déjà.
export function useBrainrunLongPress(durationMs = 1500) {
  const activeId = ref<string | null>(null);
  const timers = new Map<string, ReturnType<typeof setTimeout>>();
  const longPressed = new Set<string>();

  function clearTimer(id: string) {
    const timer = timers.get(id);
    if (timer !== undefined) {
      clearTimeout(timer);
      timers.delete(id);
    }
  }

  function onPointerDown(id: string, event: PointerEvent) {
    if (event.pointerType !== "touch") return;
    clearTimer(id);
    timers.set(
      id,
      setTimeout(() => {
        activeId.value = id;
        longPressed.add(id);
      }, durationMs),
    );
  }

  function onPointerUp(id: string) {
    clearTimer(id);
    if (activeId.value === id) activeId.value = null;
  }

  function onPointerLeave(id: string) {
    clearTimer(id);
    longPressed.delete(id);
    if (activeId.value === id) activeId.value = null;
  }

  // À appeler dans le handler de clic : renvoie true si ce clic est le relâchement d'un
  // appui long (auquel cas l'action normale, ex. "utiliser le consommable", doit être annulée).
  function consumeLongPress(id: string): boolean {
    if (longPressed.has(id)) {
      longPressed.delete(id);
      return true;
    }
    return false;
  }

  return { activeId, onPointerDown, onPointerUp, onPointerLeave, consumeLongPress };
}
