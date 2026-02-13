"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { AuthLayout } from "@/components/layouts/auth-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"

export default function VerifyEmailCallbackPage() {
  const params = useParams()
  const router = useRouter()
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading")

  useEffect(() => {
    const verify = async () => {
      try {
        const userId = params.id as string
        const token = params.hash as string
        
        if (!userId || !token) {
          setStatus("error")
          return
        }

        const response = await fetch("/api/auth/verify-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, token }),
        })

        const data = await response.json()

        if (response.ok) {
          setStatus("success")
          setTimeout(() => router.push("/auth/signin"), 3000)
        } else {
          setStatus("error")
        }
      } catch (err) {
        console.error("Error verifying email:", err)
        setStatus("error")
      }
    }

    verify()
  }, [params, router])

  return (
    <AuthLayout>
      <Card>
        <CardHeader>
          <CardTitle>
            {status === "loading" && "Verifying Email"}
            {status === "success" && "Email Verified"}
            {status === "error" && "Verification Failed"}
          </CardTitle>
          <CardDescription>
            {status === "loading" && "Please wait..."}
            {status === "success" && "Your email has been verified"}
            {status === "error" && "We could not verify your email"}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          {status === "loading" && <Spinner className="w-8 h-8" />}
          {status === "success" && <p className="text-sm text-muted-foreground">Redirecting to sign in...</p>}
          {status === "error" && <p className="text-sm text-destructive">Please try again or contact support.</p>}
        </CardContent>
      </Card>
    </AuthLayout>
  )
}
