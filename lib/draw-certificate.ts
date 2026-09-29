export type CertificateSignature = {
  name: string
  title: string
}

export type CertificateContent = {
  organizationName: string
  courseTitle: string
  studentName: string
  completedAt: Date
  signatures: CertificateSignature[]
  themePrimaryColor?: string | null
  themeSecondaryColor?: string | null
}

type CertificatePalette = {
  brand: string
  accent: string
  ink: string
  paper: string
}

const DEFAULT_BRAND = "#01402E"

function normalizeHex(value?: string | null) {
  if (!value) return null
  const match = value.trim().match(/^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/)
  if (!match) return null
  const hex = match[1]
  const full = hex.length === 3 ? hex.split("").map((char) => char + char).join("") : hex
  return `#${full.toUpperCase()}`
}

function mixWithWhite(hex: string, whiteAmount: number) {
  const num = parseInt(hex.slice(1), 16)
  const mix = (channel: number) => Math.round(channel + (255 - channel) * whiteAmount).toString(16).padStart(2, "0")
  return `#${mix((num >> 16) & 255)}${mix((num >> 8) & 255)}${mix(num & 255)}`
}

function isLight(hex: string) {
  const num = parseInt(hex.slice(1), 16)
  const luminance = (0.299 * ((num >> 16) & 255) + 0.587 * ((num >> 8) & 255) + 0.114 * (num & 255)) / 255
  return luminance > 0.75
}

export function certificatePalette(content: Pick<CertificateContent, "themePrimaryColor" | "themeSecondaryColor">): CertificatePalette {
  const primary = normalizeHex(content.themePrimaryColor)
  const secondary = normalizeHex(content.themeSecondaryColor)
  const brand = primary && !isLight(primary) ? primary : DEFAULT_BRAND
  const accent = secondary && !isLight(secondary) ? secondary : brand
  return {
    brand,
    accent,
    ink: "#1C1228",
    paper: mixWithWhite(brand, 0.94),
  }
}

export type CertificateFonts = {
  display: string
  body: string
  script: string
}

const WIDTH = 1584
const HEIGHT = 1224

function centerText(ctx: CanvasRenderingContext2D, text: string, y: number) {
  const width = ctx.measureText(text).width
  ctx.fillText(text, (WIDTH - width) / 2, y)
}

function fitFont(ctx: CanvasRenderingContext2D, text: string, family: string, weight: string, maxWidth: number, maxSize: number, minSize: number) {
  let size = maxSize
  while (size > minSize) {
    ctx.font = `${weight} ${size}px ${family}`
    if (ctx.measureText(text).width <= maxWidth) return size
    size -= 2
  }
  ctx.font = `${weight} ${minSize}px ${family}`
  return minSize
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const words = text.split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let line = ""
  for (const word of words) {
    const next = line ? `${line} ${word}` : word
    if (line && ctx.measureText(next).width > maxWidth) {
      lines.push(line)
      line = word
    } else {
      line = next
    }
  }
  if (line) lines.push(line)
  return lines.slice(0, 3)
}

function drawLattice(ctx: CanvasRenderingContext2D, color: string) {
  const x = 42
  const y = 42
  const w = WIDTH - 84
  const h = HEIGHT - 84
  const band = 28
  ctx.save()
  ctx.strokeStyle = color
  ctx.lineWidth = 4
  ctx.strokeRect(x, y, w, h)
  ctx.strokeRect(x + band, y + band, w - band * 2, h - band * 2)
  ctx.lineWidth = 1.6
  const step = 18

  for (let i = x + 8; i < x + w - 8; i += step) {
    ctx.beginPath()
    ctx.moveTo(i, y + 2)
    ctx.lineTo(i + step / 2, y + band - 2)
    ctx.lineTo(i + step, y + 2)
    ctx.moveTo(i, y + h - 2)
    ctx.lineTo(i + step / 2, y + h - band + 2)
    ctx.lineTo(i + step, y + h - 2)
    ctx.stroke()
  }

  for (let i = y + 8; i < y + h - 8; i += step) {
    ctx.beginPath()
    ctx.moveTo(x + 2, i)
    ctx.lineTo(x + band - 2, i + step / 2)
    ctx.lineTo(x + 2, i + step)
    ctx.moveTo(x + w - 2, i)
    ctx.lineTo(x + w - band + 2, i + step / 2)
    ctx.lineTo(x + w - 2, i + step)
    ctx.stroke()
  }
  ctx.restore()
}

function drawTeardrop(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number, rotation: number) {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(rotation)
  ctx.scale(scale, scale)
  ctx.beginPath()
  ctx.moveTo(0, -46)
  ctx.bezierCurveTo(30, -18, 28, 24, 0, 48)
  ctx.bezierCurveTo(-28, 24, -30, -18, 0, -46)
  ctx.fill()
  ctx.restore()
}

function drawFlourish(ctx: CanvasRenderingContext2D, x: number, y: number, rotation: number, color: string) {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(rotation)
  ctx.fillStyle = color
  ctx.strokeStyle = color
  drawTeardrop(ctx, 78, 58, 1, -0.55)
  drawTeardrop(ctx, 42, 108, 0.82, 0.35)
  drawTeardrop(ctx, 118, 28, 0.62, -1.15)
  ctx.beginPath()
  ctx.arc(28, 42, 7, 0, Math.PI * 2)
  ctx.arc(132, 86, 5.5, 0, Math.PI * 2)
  ctx.fill()
  ctx.lineWidth = 5
  ctx.lineCap = "round"
  ctx.beginPath()
  ctx.moveTo(18, 18)
  ctx.quadraticCurveTo(70, 0, 96, 62)
  ctx.stroke()
  ctx.restore()
}

function drawDivider(ctx: CanvasRenderingContext2D, y: number, color: string) {
  const mid = WIDTH / 2
  ctx.save()
  ctx.strokeStyle = color
  ctx.fillStyle = color
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(mid - 150, y)
  ctx.lineTo(mid - 28, y)
  ctx.moveTo(mid + 28, y)
  ctx.lineTo(mid + 150, y)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(mid, y - 8)
  ctx.lineTo(mid + 8, y)
  ctx.lineTo(mid, y + 8)
  ctx.lineTo(mid - 8, y)
  ctx.closePath()
  ctx.fill()
  ctx.beginPath()
  ctx.arc(mid - 18, y, 2.5, 0, Math.PI * 2)
  ctx.arc(mid + 18, y, 2.5, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

function drawSignature(ctx: CanvasRenderingContext2D, signature: CertificateSignature, x: number, y: number, fonts: CertificateFonts, color: string, ink: string) {
  const lineWidth = 280
  ctx.save()
  ctx.fillStyle = color
  ctx.textAlign = "center"
  const scriptSize = fitFont(ctx, signature.name, fonts.script, "400", 300, 58, 28)
  ctx.font = `400 ${scriptSize}px ${fonts.script}`
  ctx.fillText(signature.name, x, y - 8)
  ctx.strokeStyle = color
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(x - lineWidth / 2, y + 16)
  ctx.lineTo(x + lineWidth / 2, y + 16)
  ctx.stroke()
  ctx.fillStyle = ink
  ctx.font = `22px ${fonts.body}`
  ctx.fillText(signature.title, x, y + 48)
  ctx.restore()
}

export function drawCertificate(canvas: HTMLCanvasElement, content: CertificateContent, fonts: CertificateFonts) {
  const ctx = canvas.getContext("2d")
  if (!ctx) return
  const colors = certificatePalette(content)
  canvas.width = WIDTH
  canvas.height = HEIGHT

  ctx.fillStyle = colors.paper
  ctx.fillRect(0, 0, WIDTH, HEIGHT)
  drawLattice(ctx, colors.brand)
  drawFlourish(ctx, 118, 118, 0, colors.brand)
  drawFlourish(ctx, WIDTH - 118, 118, Math.PI / 2, colors.brand)
  drawFlourish(ctx, WIDTH - 118, HEIGHT - 118, Math.PI, colors.brand)
  drawFlourish(ctx, 118, HEIGHT - 118, -Math.PI / 2, colors.brand)

  const org = content.organizationName.trim() || "Organization"
  ctx.fillStyle = colors.brand
  ctx.textAlign = "left"
  const orgSize = fitFont(ctx, org.toUpperCase(), fonts.display, "700", 760, 28, 16)
  ctx.font = `700 ${orgSize}px ${fonts.display}`
  const orgWidth = ctx.measureText(org.toUpperCase()).width
  const orgX = (WIDTH - (orgWidth + 36)) / 2
  ctx.fillRect(orgX, 168, 16, 16)
  ctx.textBaseline = "middle"
  ctx.fillText(org.toUpperCase(), orgX + 28, 176)
  ctx.textBaseline = "alphabetic"
  ctx.textAlign = "left"

  ctx.fillStyle = colors.ink
  ctx.font = `700 92px ${fonts.display}`
  centerText(ctx, "CERTIFICATE", 310)
  ctx.font = `600 36px ${fonts.display}`
  ctx.fillStyle = colors.accent
  centerText(ctx, "OF COMPLETION", 362)
  drawDivider(ctx, 410, colors.accent)

  ctx.fillStyle = colors.ink
  ctx.font = `600 32px ${fonts.display}`
  centerText(ctx, "This is to certify that", 490)

  const studentSize = fitFont(ctx, content.studentName, fonts.display, "700", 980, 68, 32)
  ctx.font = `700 ${studentSize}px ${fonts.display}`
  ctx.fillStyle = colors.brand
  centerText(ctx, content.studentName, 575)

  ctx.fillStyle = colors.ink
  ctx.font = `600 32px ${fonts.display}`
  centerText(ctx, "has successfully completed", 650)

  ctx.font = `700 40px ${fonts.display}`
  const titleLines = wrapText(ctx, content.courseTitle, 980)
  titleLines.forEach((line, index) => {
    centerText(ctx, line, 720 + index * 48)
  })

  const dateLabel = content.completedAt.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  })
  const signatures = content.signatures.slice(0, 2)
  const columns = 1 + signatures.length
  const gap = WIDTH / (columns + 1)

  ctx.save()
  ctx.textAlign = "center"
  ctx.fillStyle = colors.brand
  ctx.font = `600 28px ${fonts.display}`
  ctx.fillText(dateLabel, gap, 980)
  ctx.strokeStyle = colors.brand
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(gap - 140, 996)
  ctx.lineTo(gap + 140, 996)
  ctx.stroke()
  ctx.fillStyle = colors.ink
  ctx.font = `22px ${fonts.body}`
  ctx.fillText("Date", gap, 1030)
  ctx.restore()

  signatures.forEach((signature, index) => {
    drawSignature(ctx, signature, gap * (index + 2), 980, fonts, colors.brand, colors.ink)
  })
}

export async function downloadCertificatePdf(canvas: HTMLCanvasElement, fileName: string) {
  const { jsPDF } = await import("jspdf")
  const pdf = new jsPDF({ orientation: "landscape", unit: "pt", format: "letter" })
  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, pageWidth, pageHeight)
  pdf.save(fileName)
}
