/**
 * GET /api/bigquery/vendors
 * Fetches all vendors from the `Vendors` BigQuery table.
 * Caches for 5 minutes.
 */
let _cache: { data: any[], timestamp: number } | null = null
const CACHE_TTL = 300_000

export default defineEventHandler(async () => {
    if (_cache && Date.now() - _cache.timestamp < CACHE_TTL) {
        return { success: true, vendors: _cache.data }
    }

    try {
        const bq = useBigQuery()
        const { bigquery } = useRuntimeConfig()
        const dataset = bigquery.dataset || 'SWSCRMV4'

        const [rows] = await bq.query({
            query: `SELECT * FROM \`${dataset}.Vendors\` ORDER BY \`Vendor Name\``,
            location: 'US',
        })

        _cache = { data: rows, timestamp: Date.now() }
        return { success: true, vendors: rows }
    }
    catch (error: unknown) {
        const msg = error instanceof Error ? error.message : 'Unknown error'
        throw createError({ statusCode: 500, statusMessage: msg })
    }
})
