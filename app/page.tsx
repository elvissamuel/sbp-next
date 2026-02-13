"use client"

import Link from "next/link"
import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { MainLayout } from "@/components/layouts/main-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BookOpen, Users, Zap, BarChart3, Loader2 } from "lucide-react"
import { getCurrentUser, getPrimaryOrganization } from "@/lib/session"
import { toast } from "sonner"

function HomeContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [processingPlan, setProcessingPlan] = useState<string | null>(null)

  // Handle dashboard button click
  useEffect(() => {
    const handleDashboardClick = async () => {
      const user = getCurrentUser()
      const organization = getPrimaryOrganization()

      if (!user || !organization) {
        router.push("/auth/signin")
        return
      }

      try {
        // Check if user has an active subscription
        const response = await fetch(`/api/subscriptions/check?organizationId=${organization.id}`)
        const data = await response.json()

        if (data.hasSubscription && data.subscription?.status === "active") {
          // Has active subscription, go to dashboard
          router.push("/dashboard")
        } else {
          // No subscription, redirect to pricing section
          router.push("/#pricing")
          // Scroll to pricing section after a brief delay
          setTimeout(() => {
            const pricingSection = document.getElementById("pricing")
            if (pricingSection) {
              pricingSection.scrollIntoView({ behavior: "smooth" })
            }
          }, 100)
        }
      } catch (error) {
        console.error("Error checking subscription:", error)
        // On error, redirect to pricing
        router.push("/#pricing")
      }
    }

    window.addEventListener("dashboard-click", handleDashboardClick)
    return () => {
      window.removeEventListener("dashboard-click", handleDashboardClick)
    }
  }, [router])

  // Handle payment callback
  useEffect(() => {
    const paymentStatus = searchParams.get("payment")
    if (paymentStatus === "success") {
      const planName = sessionStorage.getItem("pendingPlan") || "subscription"
      toast.success("Subscription activated!", {
        description: `Your ${planName} plan has been successfully activated.`,
      })
      sessionStorage.removeItem("pendingPaymentRef")
      sessionStorage.removeItem("pendingPlan")
      // Redirect to dashboard now that subscription is active
      router.push("/dashboard")
    } else if (paymentStatus === "cancelled") {
      toast.info("Payment cancelled", {
        description: "You can try again anytime.",
      })
      sessionStorage.removeItem("pendingPaymentRef")
      sessionStorage.removeItem("pendingPlan")
    } else if (paymentStatus === "failed" || paymentStatus === "error") {
      toast.error("Payment failed", {
        description: "Please try again or contact support if the issue persists.",
      })
      sessionStorage.removeItem("pendingPaymentRef")
      sessionStorage.removeItem("pendingPlan")
    }
  }, [searchParams, router])

  const handlePlanClick = async (planName: string, amount: number | null) => {
    // Check if user is logged in
    const user = getCurrentUser()
    const organization = getPrimaryOrganization()

    if (!user) {
      // User not logged in, redirect to signup
      toast.info("Please sign up to continue", {
        description: "You need to create an account before subscribing to a plan.",
      })
      router.push("/auth/signup")
      return
    }

    if (!organization) {
      toast.error("Organization required", {
        description: "You need to be part of an organization to subscribe.",
      })
      return
    }

    if (!amount) {
      // Custom plan - contact support or handle differently
      toast.info("Contact support for custom pricing", {
        description: "Please contact us for enterprise pricing options.",
      })
      return
    }

    try {
      setProcessingPlan(planName)

      // Initialize subscription payment
      const response = await fetch("/api/subscriptions/initialize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: user.id,
          organizationId: organization.id,
          plan: planName.toLowerCase(),
          amount: amount,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to initialize payment")
      }

      // Store reference in sessionStorage for verification after redirect
      sessionStorage.setItem("pendingPaymentRef", data.reference)
      sessionStorage.setItem("pendingPlan", planName)

      // Redirect to Paystack payment page
      window.location.href = data.authorizationUrl
    } catch (error: any) {
      console.error("Error initializing payment:", error)
      toast.error("Failed to start payment", {
        description: error.message || "Please try again later.",
      })
      setProcessingPlan(null)
    }
  }

  return (
    <MainLayout>
      {/* Hero Section */}
      <section className="py-20 px-4 h-[90vh]">
        <div className="max-w-4xl mx-auto text-center space-y-6 pt-10">
          <h1 className="text-5xl font-bold tracking-tight text-foreground">Learn Smarter with WokBook</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            The modern platform for creating, sharing, and mastering courses. Powered by AI-generated content and
            intelligent analytics.
          </p>
          <div className="flex gap-4 justify-center pt-4">
            <Button asChild size="lg">
              <Link href="/auth/signup">Get Started Free</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="#features">Learn More</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 bg-card/50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">Powerful Features</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Everything you need to create and manage online courses
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <Card className="border-border/50">
              <CardHeader>
                <Zap className="w-8 h-8 text-primary mb-2" />
                <CardTitle>AI-Powered Content</CardTitle>
                <CardDescription>Generate lessons and quizzes instantly with AI</CardDescription>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Create comprehensive course content in seconds. Our AI generates well-structured lessons and engaging
                quizzes tailored to your subject matter.
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardHeader>
                <Users className="w-8 h-8 text-primary mb-2" />
                <CardTitle>Team Collaboration</CardTitle>
                <CardDescription>Manage teams and assign roles easily</CardDescription>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Invite instructors and administrators to your organization. Control permissions and manage your team
                with granular role-based access.
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardHeader>
                <BarChart3 className="w-8 h-8 text-primary mb-2" />
                <CardTitle>Analytics & Insights</CardTitle>
                <CardDescription>Track student progress and performance</CardDescription>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Get detailed insights into student performance with leaderboards, quiz scores, and completion rates.
                Make data-driven improvements.
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardHeader>
                <BookOpen className="w-8 h-8 text-primary mb-2" />
                <CardTitle>Course Templates</CardTitle>
                <CardDescription>Start with pre-built course templates</CardDescription>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Choose from professionally designed course templates. Customize them to your needs or create courses
                from scratch.
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">Simple Pricing</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">Choose the perfect plan for your needs</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                name: "Starter",
                price: "₦50,000",
                amount: 50000,
                description: "Perfect for individuals",
                features: ["Up to 5 courses", "100 students", "AI content generation", "Basic analytics"],
              },
              {
                name: "Professional",
                price: "₦120,000",
                amount: 120000,
                description: "For growing teams",
                features: [
                  "Unlimited courses",
                  "1000 students",
                  "AI content generation",
                  "Advanced analytics",
                  "Team collaboration",
                ],
                featured: true,
              },
              {
                name: "Enterprise",
                price: "Custom",
                amount: null,
                description: "For large organizations",
                features: [
                  "Everything in Professional",
                  "Unlimited students",
                  "Dedicated support",
                  "Custom integrations",
                ],
              },
            ].map((plan) => (
              <Card key={plan.name} className={`border-border/50 ${plan.featured ? "border-primary" : ""}`}>
                <CardHeader>
                  <CardTitle>{plan.name}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                  <div className="pt-4">
                    <span className="text-3xl font-bold text-foreground">{plan.price}</span>
                    {plan.amount && <span className="text-muted-foreground">/month</span>}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex gap-2">
                        <span className="text-primary">✓</span>
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Button
                    className="w-full"
                    variant={plan.featured ? "default" : "outline"}
                    onClick={() => handlePlanClick(plan.name, plan.amount)}
                    disabled={processingPlan === plan.name}
                  >
                    {processingPlan === plan.name ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      "Get Started"
                    )}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-20 px-4 bg-card/50">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">Frequently Asked Questions</h2>
          </div>

          <div className="space-y-4">
            {[
              {
                q: "Can I create unlimited courses?",
                a: "Yes, on our Professional and Enterprise plans. The Starter plan supports up to 5 courses.",
              },
              {
                q: "How does the AI content generation work?",
                a: "Simply provide a topic or course outline, and our AI will generate comprehensive lessons and quizzes in seconds.",
              },
              {
                q: "Can I invite team members?",
                a: "Invite instructors and administrators with specific permissions for your organization.",
              },
              {
                q: "What payment methods do you accept?",
                a: "We accept all major payment methods through Paystack, including credit cards and mobile money.",
              },
            ].map((faq, i) => (
              <Card key={i} className="border-border/50">
                <CardHeader>
                  <CardTitle className="text-base">{faq.q}</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">{faq.a}</CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </MainLayout>
  )
}

export default function Home() {
  return (
    <Suspense fallback={
      <MainLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-sm text-muted-foreground">Loading...</div>
        </div>
      </MainLayout>
    }>
      <HomeContent />
    </Suspense>
  )
}
