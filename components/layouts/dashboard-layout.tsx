"use client"

import type React from "react"

import Link from "next/link"
import Image from "next/image"
import { usePathname, useRouter } from "next/navigation"
import { Bell, ChevronDown, LogOut, Menu, Settings, User, X } from "lucide-react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { clearSession, getPrimaryOrganization, getCurrentUser } from "@/lib/session"
import { toast } from "sonner"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { getUserFullName, getUserInitials } from "@/lib/utils/user"

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
  { label: "Departments", href: "/org/departments", adminOnly: true, exactMatch: false },
  // { label: "Levels", href: "/org/levels", adminOnly: true, exactMatch: false },
  { label: "Permissions", href: "/org/permissions", adminOnly: true, exactMatch: false },
  { label: "Settings", href: "/settings/org", adminOnly: true, exactMatch: false },
]

export function DashboardLayout({
  children,
  userEmail,
}: { children: React.ReactNode; userEmail?: string }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  const [user, setUser] = useState<{ id: string; email: string; firstName: string | null; lastName: string | null; name: string | null } | null>(null)
  const [userRole, setUserRole] = useState<string>("member")
  const pathname = usePathname()
  const router = useRouter()

  // Load user and role data on client side only to avoid hydration mismatch
  useEffect(() => {
    setIsMounted(true)
    const currentUser = getCurrentUser()
    const primaryOrg = getPrimaryOrganization()
    setUser(currentUser)
    setUserRole(primaryOrg?.role || "member")
  }, [])

  const displayEmail = userEmail || user?.email || "user@example.com"
  const userFullName = getUserFullName(user?.firstName, user?.lastName, user?.name)
  const isAdmin = userRole === "admin" || userRole === "superadmin"
  const isSuperAdmin = userRole === "superadmin"

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
  const userInitials = getUserInitials(user?.firstName, user?.lastName, displayEmail, user?.name)

  const handleLogout = () => {
    clearSession()
    toast.success("Logged out successfully", {
      description: "You have been signed out of your account.",
    })
    router.push("/")
  }

  // Find the active nav item (only after mount to avoid hydration mismatch)
  const activeNavItem = isMounted
    ? navItems.find((item) => {
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
    : null

  // Get page title from active nav item or use pathname
  const pageTitle = activeNavItem?.label || "Dashboard"

  return (
    <div className="min-h-screen bg-white">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-56 bg-white border-r border-[#65B32E]/20 transition-transform duration-300 ${sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}
      >
        <div className="p-6 border-b border-[#65B32E]/20">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/Seplat-logo.jpg"
              alt="LearningHub Logo"
              width={32}
              height={32}
              className="object-contain"
            />
            {/* <span className="font-semibold text-[#65B32E]">WokBook</span> */}
          </Link>
        </div>

        <nav className="p-4 space-y-2">
          {navItems.map((item) => {
            // Only calculate active state after mount to avoid hydration mismatch
            let isActive = false
            if (isMounted) {
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
            }
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "block px-4 py-2 rounded-md text-sm transition",
                  isActive
                    ? "bg-[#01402E] text-white font-medium"
                    : "text-muted-foreground hover:bg-[#01402E]/10 hover:text-[#01402E]"
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
        <header className="border-b border-[#65B32E]/20 bg-white sticky top-0 z-20">
          <div className="px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-1">
              <button
                className="md:hidden p-2 hover:bg-[#65B32E]/10 rounded-md text-[#65B32E]"
                onClick={() => setSidebarOpen(!sidebarOpen)}
              >
                {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
              </button>

              <div className="max-w-[260px] w-full">
                <Input
                  placeholder="Search"
                  className="h-8 rounded-sm bg-white border border-border/50 focus-visible:ring-0 focus-visible:ring-offset-0"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:bg-muted"
                aria-label="Notifications"
              >
                <Bell size={16} />
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 px-2 rounded-sm hover:bg-muted">
                    <div className="w-7 h-7 bg-[#65B32E] rounded-full flex items-center justify-center text-white text-xs font-semibold">
                      {userInitials}
                    </div>
                    <span className="ml-2 text-sm text-foreground hidden sm:inline">{userFullName}</span>
                    <ChevronDown size={14} className="ml-1 text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-white border border-[#65B32E]/20">
                  <div className="px-2 py-1.5">
                    <p className="text-sm font-medium text-[#65B32E]">{displayEmail}</p>
                  </div>
                  <DropdownMenuSeparator className="bg-[#65B32E]/20" />
                  <DropdownMenuItem asChild className="hover:bg-[#65B32E]/10 focus:bg-[#65B32E]/10">
                    <Link href="/profile" className="cursor-pointer text-foreground">
                      <User size={16} className="mr-2 text-[#65B32E]" />
                      Profile Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="hover:bg-[#65B32E]/10 focus:bg-[#65B32E]/10">
                    <Link href="/settings/billing" className="cursor-pointer text-foreground">
                      <Settings size={16} className="mr-2 text-[#65B32E]" />
                      Billing
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-[#65B32E]/20" />
                  <DropdownMenuItem onClick={handleLogout} className="cursor-pointer hover:bg-[#DE1915]/10 focus:bg-[#DE1915]/10 text-[#DE1915]">
                    <LogOut size={16} className="mr-2" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto bg-white">
          <div className="px-4 sm:px-6 lg:px-8 py-8">{children}</div>
        </main>
      </div>
    </div>
  )
}
