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
  try {
    if (!process.env.RESEND_API_KEY) {
      console.warn("RESEND_API_KEY not set. Email will not be sent.")
      return
    }

    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev",
      to: data.email,
      subject: `You've been invited to join ${data.organizationName}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Organization Invitation</title>
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background-color: #f9fafb; padding: 30px; border-radius: 8px;">
              <h1 style="color: #111827; margin-bottom: 20px;">You've been invited!</h1>
              <p style="font-size: 16px; margin-bottom: 20px;">
                You've been invited to join <strong>${data.organizationName}</strong> as a team member.
              </p>
              <p style="font-size: 16px; margin-bottom: 30px;">
                Click the button below to create your account and get started:
              </p>
              <div style="text-align: center; margin-bottom: 30px;">
                <a href="${data.inviteLink}" 
                   style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">
                  Accept Invitation & Sign Up
                </a>
              </div>
              <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">
                Or copy and paste this link into your browser:<br>
                <a href="${data.inviteLink}" style="color: #2563eb; word-break: break-all;">${data.inviteLink}</a>
              </p>
              <p style="font-size: 14px; color: #6b7280; margin-top: 20px;">
                If you didn't expect this invitation, you can safely ignore this email.
              </p>
            </div>
          </body>
        </html>
      `,
      text: `
You've been invited to join ${data.organizationName} as a team member.

Click the link below to create your account and get started:
${data.inviteLink}

If you didn't expect this invitation, you can safely ignore this email.
      `.trim(),
    })

    console.log(`Invitation email sent to ${data.email}`)
  } catch (error) {
    console.error("Error sending invitation email:", error)
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
