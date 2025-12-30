"use client"

import type React from "react"

import Link from "next/link"
import Image from "next/image"

export function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="px-4 py-6 border-b border-border/40">
        {/* <Link href="/" className="flex items-center gap-2 w-fit">
          <div className="w-8 h-8 bg-primary rounded-md flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-sm">LMS</span>
          </div>
          <span className="font-semibold text-foreground">LearningHub</span>
        </Link> */}
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
      </div>

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">{children}</div>
      </div>

      <div className="border-t border-border/40 bg-card/50 px-4 py-6 text-center text-sm text-muted-foreground">
        <p>&copy; 2025 LearningHub. All rights reserved.</p>
      </div>
    </div>
  )
}
