import { Converter } from "opencc-js";
import { RESERVED_PROJECT_ID } from "@bsls/schema";
import { deriveSlug, disambiguate } from "@bsls/content";
import type { ProjectProposal } from "./propose.js";
import type { NotionPage } from "./read-export.js";

/**
 * Le classement, et lui seul : les relations Notion servent une dernière fois à
 * repérer les projets, puis disparaissent. Le reste de la proposition — statut,
 * version, colonnes — ne passe pas par ici.
 */

export type Hub = {
  id: string;
  /** Titre Notion de la page-pôle, tel quel : c'est par lui que passent les relations. */
  source: string;
  title: string;
  members: Set<string>;
  used: boolean;
};

const toTraditional = Converter({ from: "cn", to: "tw" });

/** Nombre de liens à partir duquel une page Notion est tenue pour un pôle. */
export const DEFAULT_HUB_THRESHOLD = 3;

/**
 * Les relations inter-pages sont l'échafaudage dont le calligraphe veut se
 * débarrasser. On ne les reconduit pas : on s'en sert une dernière fois pour
 * repérer les pages autour desquelles les autres gravitent, et proposer un
 * projet. Passé l'import, il ne reste que le champ d'appartenance.
 */
export function proposeProjects(pages: NotionPage[], threshold: number): Hub[] {
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
    .map((page) => {
      const id = disambiguate(deriveSlug(page.title), taken);
      taken.add(id);
      return {
        id,
        source: page.title,
        title: toTraditional(page.title),
        // La page-pôle n'appartient pas au projet qu'elle fait naître : elle
        // serait son propre contenant.
        members: new Set(neighbours.get(page.title) ?? []),
        used: false,
      };
    });
}

export function toProjectProposal(hub: Hub): ProjectProposal {
  return {
    id: hub.id,
    title: hub.title,
    presentation: "",
    warnings: [
      {
        field: "presentation",
        message: "facultative, à écrire ici ou plus tard ; laissée vide, le projet s'importe sans",
      },
    ],
  };
}
