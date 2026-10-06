<script setup>
import { DECK_HEAD_SCRIPT } from '~/composables/useDeck'

useHead({
  meta: [
    { name: 'viewport', content: 'width=device-width, initial-scale=1' }
  ],
  link: [
    { rel: 'icon', type: 'image/svg+xml', href: '/jester-hat.svg' },
    { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
    { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
    {
      rel: 'stylesheet',
      href: 'https://fonts.googleapis.com/css2?family=Comfortaa:wght@400;700&family=DM+Serif+Text:ital@0;1&family=Kings&display=swap'
    }
  ],
  script: [
    { innerHTML: DECK_HEAD_SCRIPT, tagPriority: 'critical' }
  ],
  htmlAttrs: {
    lang: 'en'
  }
})

const title = 'The shrinking act · Joker'
const description = 'Step right up: images and video squeezed small, right here in your browser tab.'

useSeoMeta({
  title,
  description,
  ogTitle: title,
  ogDescription: description,
  twitterCard: 'summary'
})
</script>

<template>
  <UApp>
    <NuxtPage />
  </UApp>
</template>
