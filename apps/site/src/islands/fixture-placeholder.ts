/** Rectangle uni aux proportions demandées, marqué d'un caractère : une image de fixture. */
export function placeholder(width: number, height: number, label: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}">
    <rect width="100%" height="100%" fill="#f4f1ea"/>
    <text x="50%" y="50%" font-family="serif" font-size="${Math.round(width / 8)}"
      fill="#2b2b2b" text-anchor="middle" dominant-baseline="middle">${label}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
