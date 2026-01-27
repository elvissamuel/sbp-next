"use client"

import type React from "react"

import { useRouter } from "next/navigation"
import Link from "next/link"
import { useState, useEffect } from "react"
import { useMutation } from "@tanstack/react-query"
import { signIn } from "@/lib/api-calls"
import { setSession } from "@/lib/session"
import { AuthLayout } from "@/components/layouts/auth-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Eye, EyeOff } from "lucide-react"

export default function SignInPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    rememberMe: false,
  })
  const [error, setError] = useState("")
  const [showPassword, setShowPassword] = useState(false)

  const signInMutation = useMutation({
    mutationFn: signIn,
    onSuccess: (response) => {
      if (response.data) {
        // Store full session with organizations
        setSession({
          user: response.data.user,
          organizations: response.data.organizations.map((org: any) => ({
            ...org,
            joinedAt: new Date(org.joinedAt).toISOString(),
          })),
        })

        // Also store user for backward compatibility
        localStorage.setItem("user", JSON.stringify(response.data.user))

        if (formData.rememberMe) {
          localStorage.setItem("rememberMe", "true")
        }

        // Dispatch event to notify layout of session change
        window.dispatchEvent(new Event("session-changed"))

        // Redirect to landing page
        router.push("/")
      } else if (response.error) {
        // Handle API errors
        const errorMessage = response.error.message
        setError(errorMessage || "Invalid email or password")
      } else if (response.validationErrors && response.validationErrors.length > 0) {
        // Handle validation errors
        setError(response.validationErrors[0].message)
      }
    },
    onError: (error) => {
      console.error("Sign in error:", error)
      setError("Failed to sign in. Please try again.")
    },
  })

  // Handle email verification requirement
  useEffect(() => {
    if (signInMutation.data?.error) {
      const errorMessage = signInMutation.data.error.message
      // Check if error indicates email verification is required
      // This would ideally come from a custom field in the error response
      if (errorMessage?.toLowerCase().includes("verify your email")) {
        // Note: To properly handle this, you'd need to modify handleApiCalls 
        // to preserve additional fields like userId from error responses
        // For now, just show the error message
        setError(errorMessage)
      }
    }
  }, [signInMutation.data])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, type, value, checked } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    signInMutation.mutate({
      email: formData.email,
      password: formData.password,
    })
  }

  return (
    <AuthLayout>
      <Card>
        <CardHeader>
          <CardTitle>Sign In</CardTitle>
          <CardDescription>Welcome back! Please sign in to your account</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="you@example.com"
                value={formData.email}
                onChange={handleChange}
                required
                disabled={signInMutation.isPending}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  disabled={signInMutation.isPending}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="rememberMe"
                  name="rememberMe"
                  checked={formData.rememberMe}
                  onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, rememberMe: !!checked }))}
                />
                <Label htmlFor="rememberMe" className="text-sm font-normal cursor-pointer">
                  Remember me
                </Label>
              </div>
              <Link href="/auth/forgot-password" className="text-sm text-primary hover:underline">
                Forgot password?
              </Link>
            </div>

            <Button type="submit" className="w-full" disabled={signInMutation.isPending}>
              {signInMutation.isPending ? "Signing in..." : "Sign In"}
            </Button>
          </form>

          <div className="mt-4 text-center text-sm">
            <span className="text-muted-foreground">Don't have an account? </span>
            <Link href="/auth/signup" className="text-primary hover:underline font-medium">
              Sign Up
            </Link>
          </div>
        </CardContent>
      </Card>
    </AuthLayout>
  )
}
