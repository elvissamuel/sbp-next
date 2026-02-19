import { Resend } from "resend"

// Initialize Resend (use environment variable for API key)
const resend = new Resend(process.env.RESEND_API_KEY)

export interface InviteEmailData {
  email: string
  organizationName: string
  inviteLink: string
}

export interface VerificationEmailData {
  email: string
  name: string | null
  verificationLink: string
}

/**
 * Send an invitation email to a new team member
 */
export async function sendInviteEmail(data: InviteEmailData): Promise<void> {
  // Check if API key is set
  if (!process.env.RESEND_API_KEY) {
    const error = "RESEND_API_KEY not set. Email cannot be sent."
    console.error(`[EMAIL ERROR] ${error}`)
    console.error(`[EMAIL ERROR] Email configuration check failed`)
    return
  }

  try {
    const fromEmail = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev"
    console.log(`[EMAIL] Attempting to send invitation email to ${data.email}`)
    console.log(`[EMAIL] From: ${fromEmail}`)
    console.log(`[EMAIL] To: ${data.email}`)
    console.log(`[EMAIL] Organization: ${data.organizationName}`)
    console.log(`[EMAIL] Invite link: ${data.inviteLink}`)
    console.log(`[EMAIL] RESEND_API_KEY exists: ${!!process.env.RESEND_API_KEY}`)
    console.log(`[EMAIL] RESEND_API_KEY length: ${process.env.RESEND_API_KEY?.length || 0}`)

    // Extract domain from fromEmail for reply-to
    const replyToEmail = fromEmail.includes("@") 
      ? fromEmail.replace(/^[^@]+@/, `noreply@${fromEmail.split("@")[1]}`)
      : fromEmail

    const emailPayload = {
      from: fromEmail,
      to: data.email,
      replyTo: replyToEmail,
      subject: `Join ${data.organizationName} - Team Invitation`,
      html: `
        <!DOCTYPE html>
        <html lang="en">
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
            <title>Team Invitation - ${data.organizationName}</title>
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333333; background-color: #f5f5f5; margin: 0; padding: 0;">
            <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f5f5f5; padding: 20px;">
              <tr>
                <td align="center" style="padding: 20px 0;">
                  <table role="presentation" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 8px; border: 1px solid #e5e7eb; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);">
                    <tr>
                      <td style="padding: 40px 30px; text-align: center; border-bottom: 1px solid #e5e7eb;">
                        <h1 style="color: #111827; margin: 0; font-size: 24px; font-weight: 600;">Team Invitation</h1>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 30px;">
                        <p style="font-size: 16px; margin: 0 0 20px 0; color: #374151;">
                          Hello,
                        </p>
                        <p style="font-size: 16px; margin: 0 0 20px 0; color: #374151;">
                          You have been invited to join <strong style="color: #111827;">${data.organizationName}</strong> as a team member.
                        </p>
                        <p style="font-size: 16px; margin: 0 0 30px 0; color: #374151;">
                          Click the button below to create your account and get started:
                        </p>
                        <table role="presentation" style="width: 100%; margin: 30px 0;">
                          <tr>
                            <td align="center" style="padding: 0;">
                              <a href="${data.inviteLink}" 
                                 style="background-color: #2563eb; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600; font-size: 16px;">
                                Accept Invitation & Sign Up
                              </a>
                            </td>
                          </tr>
                        </table>
                        <p style="font-size: 14px; color: #6b7280; margin: 30px 0 0 0; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                          Or copy and paste this link into your browser:<br>
                          <a href="${data.inviteLink}" style="color: #2563eb; word-break: break-all; text-decoration: underline;">${data.inviteLink}</a>
                        </p>
                        <p style="font-size: 14px; color: #6b7280; margin: 20px 0 0 0;">
                          If you did not expect this invitation, you can safely ignore this email.
                        </p>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 20px 30px; background-color: #f9fafb; border-top: 1px solid #e5e7eb; text-align: center;">
                        <p style="font-size: 12px; color: #9ca3af; margin: 0;">
                          This is an automated message. Please do not reply to this email.
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
        </html>
      `,
      text: `
Team Invitation - ${data.organizationName}

Hello,

You have been invited to join ${data.organizationName} as a team member.

Click the link below to create your account and get started:

${data.inviteLink}

If you did not expect this invitation, you can safely ignore this email.

This is an automated message. Please do not reply to this email.
      `.trim(),
      headers: {
        "X-Entity-Ref-ID": `invite-${Date.now()}`,
        "List-Unsubscribe": `<${data.inviteLink}?unsubscribe=true>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
    }

    console.log(`[EMAIL] Sending email via Resend API...`)
    const response = await resend.emails.send(emailPayload)

    if (response.error) {
      const errorMessage = `Resend API returned an error: ${JSON.stringify(response.error, null, 2)}`
      console.error(`[EMAIL ERROR] ${errorMessage}`)
      console.error(`[EMAIL ERROR] Error type: ${typeof response.error}`)
      console.error(`[EMAIL ERROR] Error details:`, response.error)
      // Don't throw - email sending failure shouldn't break the invite flow
      return
    }

    console.log(`[EMAIL SUCCESS] Invitation email sent to ${data.email}`)
    console.log(`[EMAIL] Email ID: ${response.data?.id || "N/A"}`)
    console.log(`[EMAIL] Full response:`, JSON.stringify(response.data, null, 2))
  } catch (error: any) {
    console.error(`[EMAIL ERROR] Exception caught while sending invitation email to ${data.email}:`)
    console.error(`[EMAIL ERROR] Error type: ${error?.constructor?.name || typeof error}`)
    console.error(`[EMAIL ERROR] Error message: ${error?.message || "Unknown error"}`)
    if (error instanceof Error && error.stack) {
      console.error(`[EMAIL ERROR] Error stack:`, error.stack)
    }
    console.error(`[EMAIL ERROR] Full error object:`, JSON.stringify(error, Object.getOwnPropertyNames(error), 2))
    if (error?.response) {
      console.error(`[EMAIL ERROR] Error response:`, JSON.stringify(error.response, null, 2))
    }
    if (error?.request) {
      console.error(`[EMAIL ERROR] Error request:`, JSON.stringify(error.request, null, 2))
    }
    // Don't throw - email sending failure shouldn't break the invite flow
    // In production, you might want to log this to an error tracking service
  }
}

/**
 * Send an email verification email to a new user
 */
export async function sendVerificationEmail(data: VerificationEmailData): Promise<void> {
  // Check if API key is set
  if (!process.env.RESEND_API_KEY) {
    const error = "RESEND_API_KEY not set. Email cannot be sent."
    console.error(`[EMAIL ERROR] ${error}`)
    throw new Error(error)
  }

  try {
    const fromEmail = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev"
    console.log(`[EMAIL] Attempting to send verification email to ${data.email} from ${fromEmail}`)
    console.log(`[EMAIL] Verification link: ${data.verificationLink}`)

    const response = await resend.emails.send({
      from: fromEmail,
      to: data.email,
      subject: "Verify your email address",
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Verify Your Email</title>
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background-color: #f9fafb; padding: 30px; border-radius: 8px;">
              <h1 style="color: #111827; margin-bottom: 20px;">Verify your email address</h1>
              <p style="font-size: 16px; margin-bottom: 20px;">
                Hi ${data.name || "there"},
              </p>
              <p style="font-size: 16px; margin-bottom: 20px;">
                Thank you for signing up! Please verify your email address by clicking the button below:
              </p>
              <div style="text-align: center; margin-bottom: 30px;">
                <a href="${data.verificationLink}" 
                   style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">
                  Verify Email Address
                </a>
              </div>
              <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">
                Or copy and paste this link into your browser:<br>
                <a href="${data.verificationLink}" style="color: #2563eb; word-break: break-all;">${data.verificationLink}</a>
              </p>
              <p style="font-size: 14px; color: #6b7280; margin-top: 20px;">
                This link will expire in 24 hours. If you didn't create an account, you can safely ignore this email.
              </p>
            </div>
          </body>
        </html>
      `,
      text: `
Hi ${data.name || "there"},

Thank you for signing up! Please verify your email address by clicking the link below:

${data.verificationLink}

This link will expire in 24 hours. If you didn't create an account, you can safely ignore this email.
      `.trim(),
    })

    if (response.error) {
      const error = `Failed to send email: ${JSON.stringify(response.error)}`
      console.error(`[EMAIL ERROR] ${error}`)
      throw new Error(error)
    }

    console.log(`[EMAIL SUCCESS] Verification email sent to ${data.email}`)
    console.log(`[EMAIL] Email ID: ${response.data?.id || "N/A"}`)
  } catch (error: any) {
    console.error(`[EMAIL ERROR] Error sending verification email to ${data.email}:`, error)
    // Re-throw the error so the calling function can handle it
    throw error
  }
}
