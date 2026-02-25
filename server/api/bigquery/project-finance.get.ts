/**
 * GET /api/bigquery/project-finance
 * Fetches project finance records from BigQuery `ProjectFinance` table.
 * Optionally filter by projectId query param.
 * Caches results for 5 minutes.
 */

let _cache: { data: any[], timestamp: number } | null = null
const CACHE_TTL = 300_000 // 5 minutes

export default defineEventHandler(async (event) => {
    const query = getQuery(event)
    const projectId = (query.projectId as string || '').trim()

    try {
        // Return cached data if fresh and no filter
        if (!projectId && _cache && Date.now() - _cache.timestamp < CACHE_TTL) {
            return { success: true, count: _cache.data.length, finance: _cache.data, cached: true }
        }

        let sql = 'SELECT * FROM `appsheet-417200.SWSCRMV4.ProjectFinance`'
        if (projectId) {
            sql += ` WHERE \`Project ID\` = '${projectId.replace(/'/g, "\\'")}'`
        }
        sql += ' ORDER BY `TimeStamp` DESC'

        const rows = await queryBigQuery(sql)

        // Cache unfiltered results
        if (!projectId) {
            _cache = { data: rows, timestamp: Date.now() }
        }

        return {
            success: true,
            count: rows.length,
            finance: rows,
        }
    }
    catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        throw createError({
            statusCode: 500,
            statusMessage: `Failed to fetch project finance: ${message}`,
        })
    }
})
