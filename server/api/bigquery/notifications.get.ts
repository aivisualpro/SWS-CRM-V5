/**
 * GET /api/bigquery/notifications
 * Fetches notifications from the `Notifications` BigQuery table.
 * Supports optional `limit` query param (default 500).
 * Caches for 2 minutes.
 */
let _cache: { data: any[], timestamp: number } | null = null
const CACHE_TTL = 120_000

export default defineEventHandler(async (event) => {
    const query = getQuery(event)
    const limit = Math.min(Number(query.limit) || 500, 2000)

    if (_cache && Date.now() - _cache.timestamp < CACHE_TTL) {
        return { success: true, notifications: _cache.data.slice(0, limit) }
    }

    try {
        const bq = useBigQuery()
        const { bigquery } = useRuntimeConfig()
        const dataset = bigquery.dataset || 'SWSCRMV4'

        const [rows] = await bq.query({
            query: `SELECT * FROM \`${dataset}.Notifications\` ORDER BY \`USA TimeStamp\` DESC LIMIT 2000`,
            location: 'US',
        })

        _cache = { data: rows, timestamp: Date.now() }
        return { success: true, notifications: rows.slice(0, limit) }
    }
    catch (error: unknown) {
        const msg = error instanceof Error ? error.message : 'Unknown error'
        throw createError({ statusCode: 500, statusMessage: msg })
    }
})
