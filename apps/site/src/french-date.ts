/** `YYYY-MM-DD` lu comme un jour civil, sans glissement de fuseau : « 11 février 2026 ». */
export function frenchDate(isoDate: string): string {
  return new Date(`${isoDate}T00:00:00Z`).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}
