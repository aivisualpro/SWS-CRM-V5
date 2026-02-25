export default defineEventHandler(async (event) => {
    try {
        const body = await readBody(event)

        if (!body.projectId) {
            throw createError({ statusCode: 400, statusMessage: 'Project ID is required' })
        }

        const escape = (v: string) => (v || '').replace(/'/g, "\\'")

        const sql = `DELETE FROM \`appsheet-417200.SWSCRMV4.Projects\` WHERE \`Project ID\` = '${escape(body.projectId)}'`

        await queryBigQuery(sql)
        return { success: true, message: 'Project deleted successfully' }
    }
    catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        throw createError({ statusCode: 500, statusMessage: `Failed to delete project: ${message}` })
    }
})
