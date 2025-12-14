import posthog from 'posthog-js'

export function initPosthog() {
  posthog.init('phc_Cm3b0nTADveo8e0cvpndWC70jwIUqWpG4tvWxL5uK4K', {
    api_host: 'https://p.luoling.moe',
    defaults: '2025-05-24',
    person_profiles: 'identified_only', // or 'always' to create profiles for anonymous users as well
  })
}
