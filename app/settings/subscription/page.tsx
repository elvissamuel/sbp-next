"use client"

import { DashboardLayout } from "@/components/layouts/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Check } from "lucide-react"

export default function SubscriptionPage() {
  const plans = [
    {
      name: "Starter",
      price: "$29",
      description: "Perfect for individuals",
      current: false,
      features: ["Up to 5 courses", "100 students", "AI content generation", "Basic analytics"],
    },
    {
      name: "Professional",
      price: "$79",
      description: "For growing teams",
      current: true,
      features: [
        "Unlimited courses",
        "1000 students",
        "AI content generation",
        "Advanced analytics",
        "Team collaboration",
      ],
    },
    {
      name: "Enterprise",
      price: "Custom",
      description: "For large organizations",
      current: false,
      features: ["Everything in Professional", "Unlimited students", "Dedicated support", "Custom integrations"],
    },
  ]

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Subscription Plans</h1>
          <p className="text-muted-foreground">Choose the perfect plan for your needs</p>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          {plans.map((plan) => (
            <Card key={plan.name} className={`border-border/50 ${plan.current ? "border-primary" : ""}`}>
              <CardHeader>
                <div className="flex items-start justify-between mb-2">
                  <CardTitle>{plan.name}</CardTitle>
                  {plan.current && <Badge>Current Plan</Badge>}
                </div>
                <CardDescription>{plan.description}</CardDescription>
                <div className="pt-4">
                  <span className="text-3xl font-bold text-foreground">{plan.price}</span>
                  {plan.price !== "Custom" && <span className="text-muted-foreground">/month</span>}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex gap-2 text-sm">
                      <Check size={16} className="text-primary flex-shrink-0 mt-0.5" />
                      <span className="text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button className="w-full" variant={plan.current ? "outline" : "default"} disabled={plan.current}>
                  {plan.current ? "Current Plan" : "Upgrade"}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="border-border/50">
          <CardHeader>
            <CardTitle>Next Billing Date</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">Your subscription will renew on February 15, 2025</p>
            <Button variant="outline">Cancel Subscription</Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
