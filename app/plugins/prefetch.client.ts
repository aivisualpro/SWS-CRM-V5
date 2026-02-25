/**
 * Prefetch plugin — fires on app startup (client only).
 * Loads all shared BigQuery data into useDashboardStore so the dashboard
 * and every other page renders instantly without loading spinners.
 */
export default defineNuxtPlugin(() => {
    if (import.meta.client) {
        const { init } = useDashboardStore()
        init()
    }
})
