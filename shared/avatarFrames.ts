// Catalogue des styles de cadres d'avatar.
// Les lignes AvatarFrame en base référencent une clé de ce catalogue via styleKey ;
// les visuels sont des classes CSS définies dans app/assets/styles/main.css.
export const AVATAR_FRAME_STYLES = {
  emerald: { label: "Émeraude", cssClass: "avatar-frame-emerald" },
  neon: { label: "Néon", cssClass: "avatar-frame-neon" },
  cyan: { label: "Cyan pulsant", cssClass: "avatar-frame-cyan" },
  gold: { label: "Or", cssClass: "avatar-frame-gold" },
  fire: { label: "Flammes", cssClass: "avatar-frame-fire" },
  rainbow: { label: "Arc-en-ciel", cssClass: "avatar-frame-rainbow" },
  cyber: { label: "Cyber Glitch", cssClass: "avatar-frame-cyber" },
  cosmic: { label: "Nébuleuse Cosmique", cssClass: "avatar-frame-cosmic" },
  diamond: { label: "Éclat de Diamant", cssClass: "avatar-frame-diamond" },
  abyss: { label: "Portail de l'Abysse", cssClass: "avatar-frame-abyss" },
} as const;

export type AvatarFrameStyleKey = keyof typeof AVATAR_FRAME_STYLES;

export function isAvatarFrameStyleKey(key: string): key is AvatarFrameStyleKey {
  return key in AVATAR_FRAME_STYLES;
}

export function frameCssClass(key: string | null | undefined): string {
  if (!key) return "";
  return AVATAR_FRAME_STYLES[key as AvatarFrameStyleKey]?.cssClass ?? "";
}
