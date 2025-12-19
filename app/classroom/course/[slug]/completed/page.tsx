"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import { DashboardLayout } from "@/components/layouts/dashboard-layout"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle2 } from "lucide-react"

export default function CourseCompletedPage() {
  const params = useParams()
  const slug = params.slug as string

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto">
        <Card className="border-border/50 text-center">
          <CardContent className="pt-12 pb-8">
            <CheckCircle2 size={64} className="text-green-600 mx-auto mb-6" />
            <h1 className="text-4xl font-bold text-foreground mb-2">Course Completed!</h1>
            <p className="text-muted-foreground mb-8">Congratulations on finishing Web Development Fundamentals</p>

            <div className="grid md:grid-cols-3 gap-4 mb-8">
              <div className="p-4 bg-accent rounded-lg">
                <p className="text-sm text-muted-foreground">Total Time</p>
                <p className="text-2xl font-bold text-foreground">12 hours 45 min</p>
              </div>
              <div className="p-4 bg-accent rounded-lg">
                <p className="text-sm text-muted-foreground">Quiz Score</p>
                <p className="text-2xl font-bold text-foreground">92%</p>
              </div>
              <div className="p-4 bg-accent rounded-lg">
                <p className="text-sm text-muted-foreground">Lessons</p>
                <p className="text-2xl font-bold text-foreground">12/12</p>
              </div>
            </div>

            <p className="text-muted-foreground mb-8">
              You've successfully completed all lessons and quizzes. Download your certificate to showcase your
              achievement.
            </p>

            <div className="flex gap-3">
              <Button asChild className="flex-1">
                <Link href="/dashboard">Back to Dashboard</Link>
              </Button>
              <Button variant="outline" className="flex-1 bg-transparent">
                Download Certificate
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
