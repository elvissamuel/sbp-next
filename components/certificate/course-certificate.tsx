"use client"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Download, Loader2 } from "lucide-react"
import { certificatePalette, downloadCertificatePdf, drawCertificate, type CertificateContent } from "@/lib/draw-certificate"

const FONT_STYLESHEET_ID = "certificate-google-fonts"
const FONT_STYLESHEET_HREF =
  "https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700&family=Cormorant+Garamond:wght@500;600;700&family=Great+Vibes&display=swap"

const certificateFonts = {
  display: "Cinzel",
  body: '"Cormorant Garamond"',
  script: '"Great Vibes"',
}

function ensureCertificateFonts() {
  const existing = document.getElementById(FONT_STYLESHEET_ID)
  if (existing) return Promise.resolve()

  return new Promise<void>((resolve, reject) => {
    const link = document.createElement("link")
    link.id = FONT_STYLESHEET_ID
    link.rel = "stylesheet"
    link.href = FONT_STYLESHEET_HREF
    link.onload = () => resolve()
    link.onerror = () => reject(new Error("Could not load certificate fonts"))
    document.head.appendChild(link)
  })
}

export function CourseCertificate({
  certificate,
  fileName,
}: {
  certificate: CertificateContent
  fileName: string
}) {
  const colors = certificatePalette(certificate)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [ready, setReady] = useState(false)
  const [downloading, setDownloading] = useState(false)

  useEffect(() => {
    let cancelled = false
    const paint = async () => {
      await ensureCertificateFonts()
      const fonts = certificateFonts
      await Promise.all([
        document.fonts.load(`700 92px ${fonts.display}`),
        document.fonts.load(`600 36px ${fonts.display}`),
        document.fonts.load(`500 28px ${fonts.body}`),
        document.fonts.load(`600 28px ${fonts.body}`),
        document.fonts.load(`700 28px ${fonts.body}`),
        document.fonts.load(`400 64px ${fonts.script}`),
      ])
      if (cancelled || !canvasRef.current) return
      drawCertificate(canvasRef.current, certificate, fonts)
      setReady(true)
    }
    setReady(false)
    void paint()
    return () => {
      cancelled = true
    }
  }, [certificate])

  const download = async () => {
    if (!canvasRef.current) return
    setDownloading(true)
    try {
      await downloadCertificatePdf(canvasRef.current, fileName)
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-md border shadow-sm" style={{ borderColor: colors.brand, backgroundColor: colors.paper }}>
        <canvas ref={canvasRef} className="h-auto w-full" />
      </div>
      <Button
        onClick={download}
        disabled={!ready || downloading}
        className="bg-[#01402E] hover:bg-[#01402E]/90 text-white"
      >
        {downloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
        Download certificate
      </Button>
    </div>
  )
}
