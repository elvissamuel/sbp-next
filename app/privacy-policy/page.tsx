import { MainLayout } from "@/components/layouts/main-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function PrivacyPolicyPage() {
  return (
    <MainLayout>
      <div className="py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold mb-8">Privacy Policy</h1>

          <div className="space-y-6 text-muted-foreground">
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="text-lg">1. Introduction</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-3">
                <p>
                  LearningHub ("we", "us", "our" or "Company") operates the website. This page informs you of our
                  policies regarding the collection, use, and disclosure of personal data when you use our service.
                </p>
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="text-lg">2. Information Collection and Use</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-3">
                <p>
                  We collect several different types of information for various purposes to provide and improve our
                  service to you.
                </p>
                <h4 className="font-semibold mt-4">Types of Data Collected:</h4>
                <ul className="list-disc list-inside space-y-2 ml-2">
                  <li>Email address</li>
                  <li>First name and last name</li>
                  <li>Phone number</li>
                  <li>Address, State, Province, ZIP/Postal code, City</li>
                  <li>Cookies and Usage Data</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="text-lg">3. Use of Data</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-3">
                <p>LearningHub uses the collected data for various purposes:</p>
                <ul className="list-disc list-inside space-y-2 ml-2">
                  <li>To provide and maintain our service</li>
                  <li>To notify you about changes to our service</li>
                  <li>To provide customer support</li>
                  <li>To gather analysis or valuable information for improvement</li>
                  <li>To monitor the usage of our service</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="text-lg">4. Security of Data</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-3">
                <p>
                  The security of your data is important to us but remember that no method of transmission over the
                  Internet or method of electronic storage is 100% secure. While we strive to use commercially
                  acceptable means to protect your Personal Data, we cannot guarantee its absolute security.
                </p>
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="text-lg">5. Changes to This Privacy Policy</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-3">
                <p>
                  We may update our Privacy Policy from time to time. We will notify you of any changes by posting the
                  new Privacy Policy on this page.
                </p>
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="text-lg">6. Contact Us</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-3">
                <p>If you have any questions about this Privacy Policy, please contact us:</p>
                <p>Email: privacy@learninghub.com</p>
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
