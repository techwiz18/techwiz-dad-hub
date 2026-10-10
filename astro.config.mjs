import { defineConfig } from 'astro/config';

// https://astro.build/config
// Base path for assets/links. GitHub Pages serves project sites from a
// subpath (e.g. /techwiz-dad-hub), while an apex domain serves from /.
// Set SITE_BASE=/techwiz-dad-hub in the Pages workflow; leave unset locally
// and when deploying to techwiz.dad directly.
const base = process.env.SITE_BASE ?? '/';

export default defineConfig({
  site: 'https://techwiz.dad',
  base,
  output: 'static',
});
