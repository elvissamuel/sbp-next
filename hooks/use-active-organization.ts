"use client"

import { useEffect, useState } from "react"
import { getPrimaryOrganization, getUserOrganizations, type UserSession } from "@/lib/session"

const SYSTEM_ORG_SLUG = "system-default-courses"

export function useActiveOrganization() {
  const [organizations, setOrganizations] = useState<UserSession["organizations"]>([])
  const [activeOrganization, setActiveOrganization] = useState<UserSession["organizations"][0] | null>(null)
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    const sync = () => {
      setOrganizations(getUserOrganizations().filter((org) => org.slug !== SYSTEM_ORG_SLUG))
      setActiveOrganization(getPrimaryOrganization())
      setIsReady(true)
    }

    sync()
    window.addEventListener("session-changed", sync)
    return () => window.removeEventListener("session-changed", sync)
  }, [])

  return { organizations, activeOrganization, isReady }
}
