"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { useParams } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { DashboardLayout } from "@/components/layouts/dashboard-layout"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CourseCertificate } from "@/components/certificate/course-certificate"
import { getCourseCertificate } from "@/lib/api-calls"
import { getCurrentUser } from "@/lib/session"
import { Loader2 } from "lucide-react"

export default function CourseCompletedPage() {
  const params = useParams()
  const slug = params.slug as string
  const [userId, setUserId] = useState<string | null>(null)
  const [sessionReady, setSessionReady] = useState(false)

  useEffect(() => {
    setUserId(getCurrentUser()?.id || null)
    setSessionReady(true)
  }, [])

  const { data, isLoading } = useQuery({
    queryKey: ["course-certificate", slug, userId],
    queryFn: () => getCourseCertificate(slug, userId || ""),
    enabled: sessionReady && !!slug && !!userId,
  })

  const certificate = data?.data
  const message = data?.error && "message" in data.error ? data.error.message : null
  const certificateContent = useMemo(() => {
    if (!certificate) return null
    return {
      organizationName: certificate.organizationName,
      themePrimaryColor: certificate.themePrimaryColor,
      themeSecondaryColor: certificate.themeSecondaryColor,
      courseTitle: certificate.courseTitle,
      studentName: certificate.studentName,
      completedAt: new Date(certificate.completedAt),
      signatures: certificate.signatures,
    }
  }, [certificate])

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-5xl space-y-6 bg-white">
        {!sessionReady || (userId && isLoading) ? (
          <div className="flex min-h-[400px] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : certificateContent ? (
          <>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Course completed</h1>
              <p className="text-muted-foreground">
                {certificateContent.studentName} has completed {certificateContent.courseTitle}. Download the certificate below.
              </p>
            </div>
            <CourseCertificate
              certificate={certificateContent}
              fileName={`${certificateContent.courseTitle.replace(/[^\w]+/g, "-").replace(/^-|-$/g, "") || "course"}-certificate.pdf`}
            />
            <Button variant="outline" asChild>
              <Link href={`/classroom/course/${slug}`}>Back to course</Link>
            </Button>
          </>
        ) : (
          <Card className="border-border/50 bg-white">
            <CardContent className="pt-6">
              <p className="text-muted-foreground">
                {userId ? message || "Your certificate is available after you complete this course." : "Sign in to view your certificate."}
              </p>
              <Button variant="outline" asChild className="mt-4">
                <Link href={userId ? `/classroom/course/${slug}` : "/dashboard"}>
                  {userId ? "Back to course" : "Back to dashboard"}
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  )
}
