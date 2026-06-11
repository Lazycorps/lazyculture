import { ref } from "vue";

const activeAudios = ref<HTMLAudioElement[]>([]);

export function useAudio() {
  const isMuted = useState("audio-muted", () => false);

  const playSound = (soundName: string, loop = false) => {
    if (typeof window === "undefined" || isMuted.value) return null;
    try {
      const audio = new Audio(`/sounds/${soundName}.mp3`);
      audio.loop = loop;
      audio.play().catch((err) => {
        console.warn(`Could not play sound ${soundName}:`, err);
      });
      activeAudios.value.push(audio);
      audio.onended = () => {
        activeAudios.value = activeAudios.value.filter((a) => a !== audio);
      };
      return audio;
    } catch (e) {
      console.warn("Audio element initialization failed:", e);
      return null;
    }
  };

  const stopSound = (soundName: string) => {
    activeAudios.value = activeAudios.value.filter((audio) => {
      if (audio.src.includes(`/sounds/${soundName}.mp3`)) {
        try {
          audio.pause();
          audio.currentTime = 0;
        } catch (e) {
          console.warn(`Error stopping audio ${soundName}:`, e);
        }
        return false;
      }
      return true;
    });
  };

  const stopAllSounds = () => {
    activeAudios.value.forEach((audio) => {
      try {
        audio.pause();
        audio.currentTime = 0;
      } catch (e) {
        console.warn("Error stopping audio:", e);
      }
    });
    activeAudios.value = [];
  };

  return {
    playSound,
    stopSound,
    stopAllSounds,
    isMuted,
  };
}
