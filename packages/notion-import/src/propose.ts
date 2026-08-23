import { Converter } from "opencc-js";
import {
  RESERVED_PROJECT_ID,
  THEMES,
  type PieceStatus,
  type Script,
  type Theme,
  type VariationStatus,
} from "@bsls/schema";
import { deriveSlug, disambiguate } from "./slug.js";
import type { NotionPage } from "./read-export.js";

/**
 * Ce que l'agent propose, et que le calligraphe arbitre. Chaque avertissement
 * désigne un champ du plan : c'est une invitation à corriger, pas une erreur.
 */
export type ImportWarning = { field: string; message: string };

export type ProposedImage = {
  /** Nom du fichier une fois rangé auprès de la pièce. */
  file: string;
  /** Chemin du fichier dans l'export. */
  source: string;
  featured: boolean;
};

export type ProposedVariation = {
  id: string;
  script: Script;
  status: VariationStatus;
  images: ProposedImage[];
};

export type ProposedVersion = {
  id: "v1";
  date: string;
  format: string;
  columns: string[];
  intention?: string;
};

export type PieceProposal = {
  slug: string;
  /** Titre en traditionnel : c'est lui la source de vérité. */
  title: string;
  status: PieceStatus;
  projects: string[];
  published: boolean;
  version: ProposedVersion;
  variations: ProposedVariation[];
  /** Contexte Notion, montré pour arbitrer. Rien de tout cela n'est écrit dans le contenu. */
  notion: { title: string; status: string; url: string; relations: string[] };
  warnings: ImportWarning[];
};

export type ProjectProposal = {
  id: string;
  title: string;
  presentation: string;
  theme: Theme;
  warnings: ImportWarning[];
};

export type ImportPlan = {
  projects: ProjectProposal[];
  pieces: PieceProposal[];
};

export type ProposeOptions = {
  /** Date de repli, passée plutôt que lue : la proposition reste pure. */
  today: string;
  /** Nombre de liens à partir duquel une page Notion est tenue pour un pôle. */
  hubThreshold?: number;
};

const toTraditional = Converter({ from: "cn", to: "tw" });

/**
 * L'état Notion n'est pas un statut du schéma : la correspondance est un
 * jugement, posé ici une fois pour toutes et corrigible pièce par pièce.
 */
const STATUS_BY_NOTION_STATE: Record<string, PieceStatus> = {
  brute: "idea",
  préparée: "study",
  "en cours": "in-progress",
  mouvementée: "made",
  "cadre imprimé": "finished",
};

/** Les états dont la traduction est plausible mais discutable. */
const ARGUABLE_STATES: Record<string, PieceStatus> = {
  "à refaire": "in-progress",
};

const DEFAULT_STATUS: PieceStatus = "idea";
const DEFAULT_SCRIPT: Script = "xingshu";
const DEFAULT_VARIATION_STATUS: VariationStatus = "tried";
const UNSPECIFIED_FORMAT = "à préciser";
const DEFAULT_HUB_THRESHOLD = 3;
/** Au-delà, une ligne est plus vraisemblablement une note qu'une colonne. */
const LONG_COLUMN = 30;

/**
 * Propose, page par page, une pièce du schéma : classement, statut, version
 * initiale. Fonction pure — elle ne lit ni n'écrit le disque, et tout ce
 * qu'elle ne sait pas trancher devient un avertissement à arbitrer.
 */
export function proposeImport(pages: NotionPage[], options: ProposeOptions): ImportPlan {
  const projects = proposeProjects(pages, options.hubThreshold ?? DEFAULT_HUB_THRESHOLD);
  const taken = new Set<string>();

  const pieces = pages.map((page) => proposePiece(page, projects, taken, options));

  return { projects: projects.filter((project) => project.used).map(toProjectProposal), pieces };
}

type Hub = { id: string; title: string; theme: Theme; members: Set<string>; used: boolean };

function proposePiece(
  page: NotionPage,
  hubs: Hub[],
  taken: Set<string>,
  options: ProposeOptions,
): PieceProposal {
  const warnings: ImportWarning[] = [];

  const title = traditionalize(page.title, "title", warnings);
  const slug = proposeSlug(title, taken, warnings);
  taken.add(slug);

  return {
    slug,
    title,
    status: proposeStatus(page.status, warnings),
    projects: hubs
      .filter((hub) => hub.members.has(page.title))
      .map((hub) => {
        hub.used = true;
        return hub.id;
      }),
    published: false,
    version: proposeVersion(page, warnings, options),
    variations: proposeVariations(page, warnings),
    notion: {
      title: page.title,
      status: page.status,
      url: page.url,
      relations: page.relations,
    },
    warnings,
  };
}

function proposeSlug(title: string, taken: Set<string>, warnings: ImportWarning[]): string {
  const derived = deriveSlug(title);
  const slug = disambiguate(derived, taken);

  if (slug !== derived) {
    warnings.push({
      field: "slug",
      message: `${derived} est déjà pris : un slug publié ne changera plus, celui-ci est à relire`,
    });
  }
  if (derived === "sans-titre") {
    warnings.push({ field: "slug", message: "aucun pinyin n'a pu être dérivé du titre" });
  }

  return slug;
}

function proposeStatus(state: string, warnings: ImportWarning[]): PieceStatus {
  const key = state.trim().toLowerCase();

  const mapped = STATUS_BY_NOTION_STATE[key];
  if (mapped) return mapped;

  const arguable = ARGUABLE_STATES[key];
  if (arguable) {
    warnings.push({
      field: "status",
      message: `« ${state} » n'a pas d'équivalent net dans le schéma : ${arguable} proposé`,
    });
    return arguable;
  }

  warnings.push({
    field: "status",
    message:
      key === ""
        ? `aucun état Notion : ${DEFAULT_STATUS} proposé`
        : `état Notion inconnu « ${state} » : ${DEFAULT_STATUS} proposé`,
  });
  return DEFAULT_STATUS;
}

function proposeVersion(
  page: NotionPage,
  warnings: ImportWarning[],
  options: ProposeOptions,
): ProposedVersion {
  const date = page.createdAt ?? page.editedAt ?? options.today;
  if (!page.createdAt && !page.editedAt) {
    warnings.push({
      field: "version.date",
      message: `aucune date dans l'export : ${options.today} proposé`,
    });
  }

  const format = page.format === "" ? UNSPECIFIED_FORMAT : page.format;
  if (page.format === "") {
    warnings.push({ field: "version.format", message: "aucun format dans l'export" });
  }

  return {
    id: "v1",
    date,
    format,
    columns: proposeColumns(page.text, warnings),
    ...(page.body === "" ? {} : { intention: page.body }),
  };
}

/** Une ligne du texte Notion, une colonne de la calligraphie. */
function proposeColumns(text: string, warnings: ImportWarning[]): string[] {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line !== "");

  return lines.map((line, index) => {
    const column = traditionalize(line, `version.columns.${index}`, warnings);
    if (/[A-Za-zÀ-ÿ]/.test(column)) {
      warnings.push({
        field: "version.columns",
        message: `« ${truncate(column)} » ressemble à une note plutôt qu'à une colonne`,
      });
    } else if (column.length > LONG_COLUMN) {
      warnings.push({
        field: "version.columns",
        message: `« ${truncate(column)} » est bien long pour une colonne : à découper ?`,
      });
    }
    return column;
  });
}

/**
 * Le traditionnel est la source de vérité, or Notion mêle les deux écritures.
 * Toute conversion est signalée : c'est une réécriture du texte du calligraphe.
 */
function traditionalize(text: string, field: string, warnings: ImportWarning[]): string {
  const converted = toTraditional(text);
  if (converted !== text) {
    warnings.push({
      field,
      message: `converti du simplifié au traditionnel : « ${truncate(text)} » → « ${truncate(converted)} »`,
    });
  }
  return converted;
}

/**
 * Une page n'a qu'une variation, et seulement si elle porte des images : le
 * style d'écriture ne se lit pas dans l'export, il est proposé pour être corrigé.
 */
function proposeVariations(page: NotionPage, warnings: ImportWarning[]): ProposedVariation[] {
  if (page.attachments.length === 0) return [];

  warnings.push({
    field: "variations.0.script",
    message: `le style ne figure pas dans l'export : ${DEFAULT_SCRIPT} proposé`,
  });

  return [
    {
      id: "v1a",
      script: DEFAULT_SCRIPT,
      status: DEFAULT_VARIATION_STATUS,
      images: page.attachments.map((source, index) => ({
        file: `v1a-${String(index + 1).padStart(2, "0")}.jpg`,
        source,
        featured: index === 0,
      })),
    },
  ];
}

/* -------------------------------------------------------------------------- */
/* Classement : les relations Notion deviennent des projets                    */
/* -------------------------------------------------------------------------- */

/**
 * Les relations inter-pages sont l'échafaudage dont le calligraphe veut se
 * débarrasser. On ne les reconduit pas : on s'en sert une dernière fois pour
 * repérer les pages autour desquelles les autres gravitent, et proposer un
 * projet. Passé l'import, il ne reste que le champ d'appartenance.
 */
function proposeProjects(pages: NotionPage[], threshold: number): Hub[] {
  const neighbours = new Map<string, Set<string>>();
  const titles = new Set(pages.map((page) => page.title));

  const link = (from: string, to: string) => {
    if (!titles.has(from) || !titles.has(to) || from === to) return;
    (neighbours.get(from) ?? neighbours.set(from, new Set()).get(from)!).add(to);
  };

  for (const page of pages) {
    for (const related of page.relations) {
      link(page.title, related);
      link(related, page.title);
    }
  }

  const taken = new Set<string>([RESERVED_PROJECT_ID]);

  return pages
    .filter((page) => (neighbours.get(page.title)?.size ?? 0) >= threshold)
    .map((page, index) => {
      const id = disambiguate(deriveSlug(page.title), taken);
      taken.add(id);
      return {
        id,
        title: toTraditional(page.title),
        members: new Set([page.title, ...(neighbours.get(page.title) ?? [])]),
        used: false,
        theme: THEMES[index % THEMES.length]!,
      };
    });
}

function toProjectProposal(hub: Hub): ProjectProposal {
  return {
    id: hub.id,
    title: hub.title,
    presentation: "",
    theme: hub.theme,
    warnings: [
      {
        field: "presentation",
        message: "à écrire : un projet sans présentation ne sera pas importé",
      },
    ],
  };
}

function truncate(text: string): string {
  return text.length <= 24 ? text : `${text.slice(0, 24)}…`;
}
