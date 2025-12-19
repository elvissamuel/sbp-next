import { MainLayout } from "@/components/layouts/main-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function TermsAndConditionsPage() {
  return (
    <MainLayout>
      <div className="py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold mb-8">Terms and Conditions</h1>

          <div className="space-y-6 text-muted-foreground">
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="text-lg">1. Agreement to Terms</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-3">
                <p>
                  By accessing and using this website, you accept and agree to be bound by the terms and provision of
                  this agreement.
                </p>
                <p>If you do not agree to abide by the above, please do not use this service.</p>
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="text-lg">2. Use License</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-3">
                <p>
                  Permission is granted to temporarily download one copy of the materials (information or software) on
                  LearningHub's website for personal, non-commercial transitory viewing only.
                </p>
                <p>This is the grant of a license, not a transfer of title, and under this license you may not:</p>
                <ul className="list-disc list-inside space-y-2 ml-2">
                  <li>Modifying or copying the materials</li>
                  <li>Using the materials for any commercial purpose</li>
                  <li>Attempting to decompile or reverse engineer any software contained on the website</li>
                  <li>Removing any copyright or other proprietary notations from the materials</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="text-lg">3. Disclaimer</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-3">
                <p>
                  The materials on LearningHub's website are provided on an 'as is' basis. LearningHub makes no
                  warranties, expressed or implied, and hereby disclaims and negates all other warranties including,
                  without limitation, implied warranties or conditions of merchantability, fitness for a particular
                  purpose, or non-infringement of intellectual property or other violation of rights.
                </p>
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="text-lg">4. Limitations</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-3">
                <p>
                  In no event shall LearningHub or its suppliers be liable for any damages (including, without
                  limitation, damages for loss of data or profit, or due to business interruption) arising out of the
                  use or inability to use the materials on LearningHub's website.
                </p>
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="text-lg">5. Accuracy of Materials</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-3">
                <p>
                  The materials appearing on LearningHub's website could include technical, typographical, or
                  photographic errors. LearningHub does not warrant that any of the materials on its website are
                  accurate, complete, or current.
                </p>
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="text-lg">6. Links</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-3">
                <p>
                  LearningHub has not reviewed all of the sites linked to its website and is not responsible for the
                  contents of any such linked site. The inclusion of any link does not imply endorsement by LearningHub
                  of the site.
                </p>
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="text-lg">7. Modifications</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-3">
                <p>
                  LearningHub may revise these terms of service for its website at any time without notice. By using
                  this website, you are agreeing to be bound by the then current version of these terms of service.
                </p>
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="text-lg">8. Governing Law</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-3">
                <p>
                  These terms and conditions are governed by and construed in accordance with the laws of [Your
                  Country/State] and you irrevocably submit to the exclusive jurisdiction of the courts located in that
                  location.
                </p>
              </CardContent>
            </Card>
          </div>

          <p className="text-center text-sm text-muted-foreground mt-12">
            Last updated: {new Date().toLocaleDateString()}
          </p>
        </div>
      </div>
    </MainLayout>
  )
}
