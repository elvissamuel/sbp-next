"use client"

import type React from "react"

import Link from "next/link"
import Image from "next/image"
import { Menu, X, LogOut } from "lucide-react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { getCurrentUser, clearSession } from "@/lib/session"
import { toast } from "sonner"

export function MainLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [user, setUser] = useState<{ id: string; email: string; name: string | null } | null>(null)

  const handleLogout = () => {
    clearSession()
    setUser(null)
    toast.success("Logged out successfully", {
      description: "You have been signed out of your account.",
    })
    router.push("/")
  }

  useEffect(() => {
    setUser(getCurrentUser())

    // Listen for storage changes (when user signs in/out)
    const handleStorageChange = () => {
      setUser(getCurrentUser())
    }

    window.addEventListener("storage", handleStorageChange)
    // Also listen for custom event when session changes
    window.addEventListener("session-changed", handleStorageChange)

    return () => {
      window.removeEventListener("storage", handleStorageChange)
      window.removeEventListener("session-changed", handleStorageChange)
    }
  }, [])

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="border-b border-border/40">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/logo.png"
              alt="WokBook Logo"
              width={32}
              height={32}
              className="object-contain"
            />
            <span className="font-semibold text-foreground hidden sm:inline">WokBook</span>
          </Link>

          <div className="hidden md:flex items-center gap-6">
            <Link href="#features" className="text-sm text-muted-foreground hover:text-foreground transition">
              Features
            </Link>
            <Link href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition">
              Pricing
            </Link>
            <Link href="#faq" className="text-sm text-muted-foreground hover:text-foreground transition">
              FAQ
            </Link>
            {user ? (
              <>
                <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-sm font-semibold">
                  {user.email.charAt(0).toUpperCase()}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.preventDefault()
                    // This will be handled by the page component
                    window.dispatchEvent(new CustomEvent("dashboard-click"))
                  }}
                >
                  Dashboard
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleLogout}
                  className="gap-2"
                >
                  <LogOut size={16} />
                  Logout
                </Button>
              </>
            ) : (
              <>
                <Link href="/auth/signin" className="text-sm text-muted-foreground hover:text-foreground transition">
                  Sign In
                </Link>
                <Button asChild size="sm">
                  <Link href="/auth/signup">Get Started</Link>
                </Button>
              </>
            )}
          </div>

          <button className="md:hidden p-2" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </nav>

        {mobileMenuOpen && (
          <div className="md:hidden border-t border-border/40 px-4 py-4 space-y-3">
            <Link href="#features" className="block text-sm text-muted-foreground hover:text-foreground">
              Features
            </Link>
            <Link href="#pricing" className="block text-sm text-muted-foreground hover:text-foreground">
              Pricing
            </Link>
            <Link href="#faq" className="block text-sm text-muted-foreground hover:text-foreground">
              FAQ
            </Link>
            {user ? (
              <>
                <div className="flex items-center gap-2 py-2">
                  <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-sm font-semibold">
                    {user.email.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm text-muted-foreground">{user.email}</span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full"
                  onClick={(e) => {
                    e.preventDefault()
                    setMobileMenuOpen(false)
                    window.dispatchEvent(new CustomEvent("dashboard-click"))
                  }}
                >
                  Dashboard
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="w-full gap-2"
                  onClick={() => {
                    setMobileMenuOpen(false)
                    handleLogout()
                  }}
                >
                  <LogOut size={16} />
                  Logout
                </Button>
              </>
            ) : (
              <>
                <Link href="/auth/signin" className="block text-sm text-muted-foreground hover:text-foreground">
                  Sign In
                </Link>
                <Button asChild size="sm" className="w-full">
                  <Link href="/auth/signup">Get Started</Link>
                </Button>
              </>
            )}
          </div>
        )}
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-border/40 bg-card/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <h4 className="font-semibold text-foreground mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <Link href="#" className="hover:text-foreground transition">
                    Features
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-foreground transition">
                    Pricing
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-foreground transition">
                    Security
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <Link href="#" className="hover:text-foreground transition">
                    About
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-foreground transition">
                    Blog
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-foreground transition">
                    Careers
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <Link href="/terms-and-conditions" className="hover:text-foreground transition">
                    Terms
                  </Link>
                </li>
                <li>
                  <Link href="/privacy-policy" className="hover:text-foreground transition">
                    Privacy
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-4">Contact</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <a href="mailto:support@learninghub.com" className="hover:text-foreground transition">
                    support@learninghub.com
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-border/40 pt-8 text-center text-sm text-muted-foreground">
            <p>&copy; 2025 WokBook. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
