type ThemeInput = {
  themePrimaryColor?: string | null
  themeSecondaryColor?: string | null
  themeAccentColor?: string | null
}

const DEFAULT_PRIMARY = "#01402E"
const DEFAULT_SECONDARY = "#65B32E"
const DEFAULT_ACCENT = "#DE1915"

function hexToRgb(hex: string): string {
  const normalized = hex.replace("#", "")
  const full = normalized.length === 3
    ? normalized.split("").map((char) => char + char).join("")
    : normalized

  const num = parseInt(full, 16)
  if (Number.isNaN(num)) {
    return "1 64 46"
  }

  const r = (num >> 16) & 255
  const g = (num >> 8) & 255
  const b = num & 255
  return `${r} ${g} ${b}`
}

export function applyOrganizationTheme(theme?: ThemeInput) {
  if (typeof document === "undefined") return

  const root = document.documentElement
  const computedStyles = getComputedStyle(root)

  const currentPrimary = root.style.getPropertyValue("--org-primary").trim() || computedStyles.getPropertyValue("--org-primary").trim()
  const currentSecondary = root.style.getPropertyValue("--org-secondary").trim() || computedStyles.getPropertyValue("--org-secondary").trim()
  const currentAccent = root.style.getPropertyValue("--org-accent").trim() || computedStyles.getPropertyValue("--org-accent").trim()

  const primary = theme?.themePrimaryColor || currentPrimary || DEFAULT_PRIMARY
  const secondary = theme?.themeSecondaryColor || currentSecondary || DEFAULT_SECONDARY
  const accent = theme?.themeAccentColor || currentAccent || DEFAULT_ACCENT

  root.style.setProperty("--org-primary", primary)
  root.style.setProperty("--org-secondary", secondary)
  root.style.setProperty("--org-accent", accent)

  root.style.setProperty("--org-primary-rgb", hexToRgb(primary))
  root.style.setProperty("--org-secondary-rgb", hexToRgb(secondary))
  root.style.setProperty("--org-accent-rgb", hexToRgb(accent))

  // Keep design token colors aligned with org branding
  root.style.setProperty("--primary", primary)
  root.style.setProperty("--ring", primary)
  root.style.setProperty("--sidebar-primary", primary)
  root.style.setProperty("--accent", secondary)
  root.style.setProperty("--sidebar-accent", secondary)
}
