/**
 * Vocabulaires fermés du domaine.
 *
 * Les valeurs sont stockées en pinyin sans tons ou en anglais ; l'affichage
 * français vit ici aussi, pour qu'une extension du vocabulaire ne puisse pas
 * oublier sa traduction.
 */

export const PIECE_STATUSES = [
  "idea",
  "study",
  "in-progress",
  "made",
  "finished",
  "on-hold",
  "abandoned",
] as const;
export type PieceStatus = (typeof PIECE_STATUSES)[number];

export const VARIATION_STATUSES = ["to-try", "tried", "kept", "set-aside"] as const;
export type VariationStatus = (typeof VARIATION_STATUSES)[number];

export const SCRIPTS = ["kaishu", "xingshu", "xingcao", "caoshu", "kuangcao"] as const;
export type Script = (typeof SCRIPTS)[number];

export const IMAGE_KINDS = ["work", "detail", "attempt", "context"] as const;
export type ImageKind = (typeof IMAGE_KINDS)[number];

export const CAPTURE_MODES = ["scan", "photo"] as const;
export type CaptureMode = (typeof CAPTURE_MODES)[number];

export const THEMES = ["ink", "jade", "cinnabar", "indigo"] as const;
export type Theme = (typeof THEMES)[number];

/** Les styles d'écriture sont affichés en français, jamais en pinyin. */
export const SCRIPT_LABELS: Record<Script, string> = {
  kaishu: "régulier",
  xingshu: "courant",
  xingcao: "grand courant",
  caoshu: "cursif",
  kuangcao: "cursive folle",
};

export const SCRIPT_HANZI: Record<Script, string> = {
  kaishu: "楷書",
  xingshu: "行書",
  xingcao: "行草",
  caoshu: "草書",
  kuangcao: "狂草",
};

export const PIECE_STATUS_LABELS: Record<PieceStatus, string> = {
  idea: "idée",
  study: "étude",
  "in-progress": "en cours",
  made: "encre sèche",
  finished: "achevée",
  "on-hold": "en veille",
  abandoned: "abandonnée",
};

export const VARIATION_STATUS_LABELS: Record<VariationStatus, string> = {
  "to-try": "à essayer",
  tried: "essayée",
  kept: "retenue",
  "set-aside": "écartée",
};

export const IMAGE_KIND_LABELS: Record<ImageKind, string> = {
  work: "œuvre entière",
  detail: "détail",
  attempt: "essai",
  context: "contexte",
};
