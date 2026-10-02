export default defineNuxtConfig({
  modules: [
    '@nuxt/eslint',
    '@nuxt/ui'
  ],

  compatibilityDate: '2025-01-01',

  css: ['~/assets/css/flume-theme.css'],

  // Static/edge build target for Cloudflare Pages — this is what makes the
  // deploy work at all. It's also *why* server/api/compress-*.ts can't run
  // here: this preset doesn't ship a Node runtime, so those routes are
  // effectively dead code once deployed. Safe to delete them, or keep as a
  // local-dev-only fallback — just don't rely on them in production.
  nitro: {
    preset: 'cloudflare_pages',
  },

  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs'
      }
    }
  },

  runtimeConfig: {
    public: {
      // Overridden per-environment — see .env.example. Falls back to the
      // local Express server for `npm run dev`.
      apiBase: 'http://localhost:8787',
    },
  },
})
