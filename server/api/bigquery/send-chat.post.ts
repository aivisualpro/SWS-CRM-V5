/**
 * POST /api/bigquery/send-chat
 * Inserts a new chat message into the BigQuery `Chat` table.
 */
export default defineEventHandler(async (event) => {
    const body = await readBody(event)
    const { projectId, email, message, chatId, users } = body

    if (!projectId || !email || !message) {
        throw createError({ statusCode: 400, statusMessage: 'projectId, email, and message are required' })
    }

    try {
        const dataset = useBigQueryDataset()
        const table = dataset.table('Chat')

        const msgId = `MSG${Date.now()}${Math.random().toString(36).slice(2, 8)}`
        const now = new Date().toISOString()

        const row = {
            MessageID: msgId,
            ChatID: chatId || projectId,
            'Project ID': projectId,
            Email: email,
            Chat: message,
            TimeStamp: now,
            'USA TimeStamp': now,
            Users: users || email,
            tag: '',
            Attachment: '',
            Read: '',
            'Read All': '',
            first: '',
            Reminder_Datetime: null,
            who_to_remind: '',
            Chat_Head: '',
            Secondary: '',
        }

        await table.insert([row])

        return { success: true, messageId: msgId }
    }
    catch (error: unknown) {
        const message2 = error instanceof Error ? error.message : 'Unknown error'
        throw createError({ statusCode: 500, statusMessage: `Failed to send message: ${message2}` })
    }
})
