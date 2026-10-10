// Base-aware internal links. BASE_URL is '/' locally and on apex domains,
// '/<repo>/' on GitHub Pages project sites (no trailing slash — normalize).
const raw = import.meta.env.BASE_URL || '/';
export const BASE: string = raw.endsWith('/') ? raw : `${raw}/`;
export function url(path: string): string {
  return BASE + path.replace(/^\//, '');
}
