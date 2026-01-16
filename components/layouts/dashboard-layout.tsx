"use client"

import type React from "react"

import Link from "next/link"
import Image from "next/image"
import { usePathname, useRouter } from "next/navigation"
import { LogOut, Settings, User, Menu, X } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { clearSession, getPrimaryOrganization, getCurrentUser } from "@/lib/session"
import { toast } from "sonner"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

type NavItem = {
  label: string
  href: string
  adminOnly: boolean
  exactMatch?: boolean
  memberHref?: string
}

const allNavItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", adminOnly: false, exactMatch: true },
  { label: "Courses", href: "/org/course", adminOnly: false, memberHref: "/course", exactMatch: false },
  { label: "Employees", href: "/org/employee", adminOnly: true, exactMatch: false },
  { label: "Groups", href: "/org/groups", adminOnly: true, exactMatch: false },
  { label: "Settings", href: "/settings/org", adminOnly: true, exactMatch: false },
]

export function DashboardLayout({
  children,
  userEmail,
}: { children: React.ReactNode; userEmail?: string }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()

  // Get current user from session
  const currentUser = getCurrentUser()
  const user = currentUser || null
  const displayEmail = userEmail || user?.email || "user@example.com"
  const userName = user?.name || null

  // Get user's role from primary organization
  const primaryOrg = getPrimaryOrganization()
  const userRole = primaryOrg?.role || "member"
  const isAdmin = userRole === "admin"

  // Filter and transform nav items based on user role
  const navItems = allNavItems
    .filter((item) => !item.adminOnly || isAdmin)
    .map((item) => {
      // For members, use memberHref if available, otherwise use the regular href
      if (!isAdmin && item.memberHref) {
        return { ...item, href: item.memberHref }
      }
      return item
    })

  // Calculate user initials
  const getUserInitials = () => {
    if (userName) {
      const nameParts = userName.trim().split(/\s+/)
      if (nameParts.length >= 2) {
        return (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase()
      }
      return userName.substring(0, 2).toUpperCase()
    }
    // Fallback to email first letter
    return displayEmail.charAt(0).toUpperCase()
  }

  const userInitials = getUserInitials()

  const handleLogout = () => {
    clearSession()
    toast.success("Logged out successfully", {
      description: "You have been signed out of your account.",
    })
    router.push("/")
  }

  // Find the active nav item
  const activeNavItem = navItems.find((item) => {
    if (item.exactMatch) {
      return pathname === item.href
    }
    // For non-exact matches, check if pathname starts with the href
    // Also handle special cases like /classroom/course routes
    if (item.href === "/course") {
      return pathname === "/course" || pathname.startsWith("/classroom/course")
    }
    return pathname.startsWith(item.href)
  })

  // Get page title from active nav item or use pathname
  const pageTitle = activeNavItem?.label || "Dashboard"

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-card border-r border-border/40 transition-transform duration-300 ${sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}
      >
        <div className="p-6 border-b border-border/40">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/logo.png"
              alt="LearningHub Logo"
              width={32}
              height={32}
              className="object-contain"
            />
            <span className="font-semibold text-foreground">WokBook</span>
          </Link>
        </div>

        <nav className="p-4 space-y-2">
          {navItems.map((item) => {
            let isActive = false
            if (item.exactMatch) {
              isActive = pathname === item.href
            } else {
              // For courses, also match classroom routes
              if (item.href === "/course") {
                isActive = pathname === "/course" || pathname.startsWith("/classroom/course")
              } else {
                isActive = pathname.startsWith(item.href)
              }
            }
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "block px-4 py-2 rounded-md text-sm transition",
                  isActive
                    ? "bg-primary text-primary-foreground font-medium"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
                onClick={() => setSidebarOpen(false)}
              >
                {item.label}
              </Link>
            )
          })}
        </nav>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-30 bg-black/50 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col md:ml-64">
        <header className="border-b border-border/40 bg-card sticky top-0 z-20">
          <div className="px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
            <button className="md:hidden p-2 hover:bg-accent rounded-md" onClick={() => setSidebarOpen(!sidebarOpen)}>
              {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
            </button>

            <h1 className="text-lg font-semibold text-foreground flex-1 text-center md:text-left">{pageTitle}</h1>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="rounded-full">
                  <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-sm font-semibold">
                    {userInitials}
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium text-foreground">{displayEmail}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/profile" className="cursor-pointer">
                    <User size={16} className="mr-2" />
                    Profile Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/settings/billing" className="cursor-pointer">
                    <Settings size={16} className="mr-2" />
                    Billing
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
                  <LogOut size={16} className="mr-2" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="flex-1 overflow-auto">
          <div className="px-4 sm:px-6 lg:px-8 py-8">{children}</div>
        </main>
      </div>
    </div>
  )
}
