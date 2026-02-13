"use client"

import Link from "next/link"
import { useState } from "react"
import { AuthLayout } from "@/components/layouts/auth-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function VerifyEmailPage() {
  const [loading, setLoading] = useState(false)

  const handleResend = async () => {
    setLoading(true)
    try {
      // TODO: Implement resend verification email API call
      console.log("Resending verification email...")
    } catch (err) {
      console.error("Error:", err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout>
      <Card>
        <CardHeader>
          <CardTitle>Verify Your Email</CardTitle>
          <CardDescription>Check your inbox for the verification link</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            We've sent a verification email to your address. Click the link in the email to confirm your account.
          </p>

          <div className="space-y-3">
            <Button onClick={handleResend} disabled={loading} className="w-full">
              {loading ? "Sending..." : "Resend Verification Email"}
            </Button>

            <Link href="/signin" className="block text-center text-sm text-primary hover:underline">
              Already verified? Sign In
            </Link>
          </div>
        </CardContent>
      </Card>
    </AuthLayout>
  )
}
