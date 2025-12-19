import { hashPassword } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { generateSlug } from "@/lib/utils"
import { sendVerificationEmail } from "@/lib/email"
// import { prisma } from "@/lib/db"
import { type NextRequest, NextResponse } from "next/server"
import { v4 as uuidv4 } from "uuid"

export async function POST(request: NextRequest) {
  try {
    const { email, password, name, organizationName, organizationId, role } = await request.json()

    // Validate required fields
    if (!email || !password || !name) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Check if this is an invite flow (has organizationId) or new org flow (has organizationName)
    const isInviteFlow = organizationId && !organizationName
    const isNewOrgFlow = organizationName && !organizationId

    if (!isInviteFlow && !isNewOrgFlow) {
      return NextResponse.json(
        { error: "Either organizationName (for new org) or organizationId (for invite) must be provided" },
        { status: 400 }
      )
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return NextResponse.json({ error: "Email already in use" }, { status: 400 })
    }

    // Hash password before transaction
    const hashedPassword = await hashPassword(password)

    // Use transaction to ensure all-or-nothing behavior
    const result = await prisma.$transaction(async (tx) => {
      // Create user within transaction
      const user = await tx.user.create({
        data: {
          email,
          password: hashedPassword,
          name,
        },
      })

      let organization

      if (isInviteFlow) {
        // Invite flow: Find the organization and add user as member
        organization = await tx.organization.findUnique({
          where: { id: organizationId },
        })

        if (!organization) {
          throw new Error("Organization not found")
        }

        // Check if user is already a member (shouldn't happen, but check anyway)
        const existingMember = await tx.organizationMember.findUnique({
          where: {
            organizationId_userId: {
              organizationId,
              userId: user.id,
            },
          },
        })

        if (!existingMember) {
          // Add user to organization with the role from invite
          await tx.organizationMember.create({
            data: {
              organizationId,
              userId: user.id,
              role: (role || "member").toLowerCase(),
            },
          })
        }
      } else {
        // New org flow: Create organization and add user as admin
        // Generate organization slug and ensure uniqueness
        let orgSlug = generateSlug(organizationName)
        let slugExists = await tx.organization.findUnique({
          where: { slug: orgSlug },
        })

        // If slug exists, append a random suffix to make it unique
        if (slugExists) {
          const randomSuffix = uuidv4().slice(0, 8)
          orgSlug = `${orgSlug}-${randomSuffix}`
        }

        // Create organization
        organization = await tx.organization.create({
          data: {
            name: organizationName,
            slug: orgSlug,
          },
        })

        // Create organization member with admin role
        await tx.organizationMember.create({
          data: {
            organizationId: organization.id,
            userId: user.id,
            role: "admin",
          },
        })
      }

      // Generate email verification token
      const verificationToken = uuidv4()
      const hashedToken = await hashPassword(verificationToken)

      // Create email verification record
      await tx.emailVerification.create({
        data: {
          userId: user.id,
          token: hashedToken,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        },
      })

      return { user, verificationToken, organization }
    })

    // Generate verification link
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BROWSER_URL || "http://localhost:3000"
    const verificationLink = `${baseUrl}/auth/verify-email/${result.user.id}/${result.verificationToken}`

    // Send verification email - if this fails, rollback everything
    console.log(`[SIGNUP] Attempting to send verification email to ${result.user.email}`)
    try {
      await sendVerificationEmail({
        email: result.user.email!,
        name: result.user.name,
        verificationLink,
      })
      console.log(`[SIGNUP SUCCESS] Verification email sent successfully to ${result.user.email}`)
    } catch (emailError: any) {
      // If email fails, delete everything created in transaction
      console.error(`[SIGNUP ERROR] Failed to send verification email to ${result.user.email}:`, emailError)
      console.error(`[SIGNUP] Rolling back user creation for ${result.user.email}`)
      
      // Clean up: delete verification record, org member, org (if new), and user
      try {
        await prisma.$transaction(async (tx) => {
          await tx.emailVerification.deleteMany({
            where: { userId: result.user.id },
          })
          
          await tx.organizationMember.deleteMany({
            where: { userId: result.user.id },
          })

          if (!isInviteFlow && result.organization) {
            await tx.organization.delete({
              where: { id: result.organization.id },
            })
          }

          await tx.user.delete({
            where: { id: result.user.id },
          })
        })
        console.log(`[SIGNUP] Successfully rolled back user creation for ${result.user.email}`)
      } catch (rollbackError) {
        console.error(`[SIGNUP ERROR] Failed to rollback user creation:`, rollbackError)
      }

      const errorMessage = emailError?.message || "Failed to send verification email"
      throw new Error(`Email sending failed: ${errorMessage}. Account creation was rolled back.`)
    }

    return NextResponse.json(
      {
        user: {
          id: result.user.id,
          email: result.user.email,
          name: result.user.name,
        },
        message: "Account created. Please verify your email.",
      },
      { status: 201 },
    )
  } catch (error: any) {
    console.error("Error during signup:", error)
    
    // Return more specific error messages
    const errorMessage = error?.message || "Failed to create account"
    
    // Handle specific transaction errors
    if (errorMessage.includes("Organization not found")) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 })
    }
    
    if (errorMessage.includes("verification email")) {
      return NextResponse.json({ error: errorMessage }, { status: 500 })
    }
    
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
