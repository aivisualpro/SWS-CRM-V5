import { google } from 'googleapis'

export default defineEventHandler(async (event) => {
  const { drive } = useRuntimeConfig()
  const query = getQuery(event)
  const code = query.code as string

  if (!code) {
    throw createError({ statusCode: 400, statusMessage: 'Missing authorization code' })
  }

  // Build redirect URI to match what was used in the initial auth request
  const host = getRequestHeader(event, 'host') || 'localhost:3000'
  const protocol = getRequestHeader(event, 'x-forwarded-proto') || (host.startsWith('localhost') ? 'http' : 'https')
  const redirectUri = `${protocol}://${host}/api/auth/callback`

  const oauth2Client = new google.auth.OAuth2(drive.clientId, drive.clientSecret, redirectUri)

  try {
    // Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(code)
    oauth2Client.setCredentials(tokens)

    // Fetch user profile
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client })
    const { data: profile } = await oauth2.userinfo.get()

    if (!profile.id || !profile.email) {
      throw createError({ statusCode: 400, statusMessage: 'Could not retrieve Google profile' })
    }

    const googleId = profile.id
    const email = profile.email
    const name = profile.name || ''
    const picture = profile.picture || ''

    // ── Check if user exists in the Users table ──
    const checkSql = `SELECT Email FROM \`appsheet-417200.SWSCRMV4.Users\` WHERE LOWER(Email) = LOWER(@email) LIMIT 1`
    const existingRows = await queryBigQuery(checkSql, { email })

    if (existingRows.length === 0) {
      // User NOT in the system — redirect back to login with an error
      const errorMsg = encodeURIComponent(email)
      return sendRedirect(event, `/login?error=unauthorized&email=${errorMsg}`)
    }

    // ── User exists — update Status = TRUE ──
    const updateSql = `
      UPDATE \`appsheet-417200.SWSCRMV4.Users\`
      SET Status = TRUE
      WHERE LOWER(Email) = LOWER(@email)
    `
    await queryBigQuery(updateSql, { email })

    // ── Set auth cookie ──
    setCookie(event, 'auth_user', JSON.stringify({
      googleId,
      email,
      name,
      picture,
    }), {
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: '/',
      sameSite: 'lax',
      httpOnly: false, // readable by client JS
    })

    // Redirect to dashboard
    return sendRedirect(event, '/')
  }
  catch (error: unknown) {
    console.error('[Auth Callback Error]', error)
    const message = error instanceof Error ? error.message : 'Authentication failed'
    throw createError({ statusCode: 500, statusMessage: message })
  }
})
