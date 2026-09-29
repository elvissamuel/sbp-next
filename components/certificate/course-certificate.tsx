"use client"

import { useEffect, useRef, useState } from "react"
import { Cinzel, Cormorant_Garamond, Great_Vibes } from "next/font/google"
import { Button } from "@/components/ui/button"
import { Download, Loader2 } from "lucide-react"
import { certificatePalette, downloadCertificatePdf, drawCertificate, type CertificateContent } from "@/lib/draw-certificate"

const display = Cinzel({ subsets: ["latin"], weight: ["600", "700"] })
const body = Cormorant_Garamond({ subsets: ["latin"], weight: ["500", "600", "700"] })
const script = Great_Vibes({ subsets: ["latin"], weight: "400" })

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
      const fonts = {
        display: display.style.fontFamily,
        body: body.style.fontFamily,
        script: script.style.fontFamily,
      }
      await Promise.all([
        document.fonts.load(`700 92px ${fonts.display}`),
        document.fonts.load(`500 28px ${fonts.body}`),
        document.fonts.load(`64px ${fonts.script}`),
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
      <div className="sr-only" aria-hidden>
        <span className={display.className}>Certificate</span>
        <span className={body.className}>Certificate</span>
        <span className={script.className}>Certificate</span>
      </div>
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
