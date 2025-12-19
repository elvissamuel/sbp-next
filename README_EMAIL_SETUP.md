# Email Setup with Resend

This project uses [Resend](https://resend.com) for sending invitation emails.

## Setup Instructions

### 1. Create a Resend Account

1. Go to [https://resend.com](https://resend.com)
2. Sign up for a free account
3. Verify your email address

### 2. Get Your API Key

1. After logging in, go to the [API Keys](https://resend.com/api-keys) section
2. Click "Create API Key"
3. Give it a name (e.g., "Next.js App")
4. Copy the API key (you won't be able to see it again)

### 3. Set Up Domain (Optional but Recommended)

**For Production:**
1. Go to [Domains](https://resend.com/domains) in Resend
2. Add your domain
3. Add the required DNS records to verify your domain
4. Once verified, update `RESEND_FROM_EMAIL` in your `.env` file

**For Development:**
You can use the default Resend test email: `onboarding@resend.dev`

### 4. Configure Environment Variables

Add these to your `.env` file (or `.env.local`):

```env
# Resend API Key
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxx

# Email sender (use your verified domain for production)
RESEND_FROM_EMAIL=noreply@yourdomain.com

# Base URL for invitation links
NEXT_PUBLIC_BROWSER_URL=http://localhost:3000
```

For production, set:
```env
NEXT_PUBLIC_BROWSER_URL=https://yourdomain.com
```

### 5. Install Resend Package

Install the Resend package:

```bash
npm install resend
```

## Free Tier Limits

- **3,000 emails/month** for free
- Perfect for development and small to medium applications
- No credit card required

## How It Works

1. When you invite a team member:
   - An email is sent to the invitee
   - The email contains a signup link with their email pre-filled
   - The email field is locked on the signup page

2. The invitee clicks the link:
   - They're taken to the signup page
   - Their email is pre-filled and cannot be edited
   - They complete registration and are automatically added to the organization

## Testing

To test email sending:
1. Make sure `RESEND_API_KEY` is set in your `.env` file
2. Invite a team member from the Employee page
3. Check the recipient's inbox (and spam folder)

## Troubleshooting

**Emails not sending?**
- Check that `RESEND_API_KEY` is set correctly
- Verify the API key is active in Resend dashboard
- Check server logs for error messages
- Make sure you haven't exceeded the free tier limit

**Email goes to spam?**
- Verify your domain in Resend
- Use a verified domain email address in `RESEND_FROM_EMAIL`
- Add SPF and DKIM records to your domain DNS

## Alternative Email Services

If you prefer other services:

- **SendGrid**: Free tier (100 emails/day)
- **Mailgun**: Free tier (5,000 emails/month)
- **Postmark**: Free tier (100 emails/month)

To switch, update the `lib/email.ts` file with your preferred service's SDK.

