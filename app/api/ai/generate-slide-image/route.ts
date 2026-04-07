import { type NextRequest, NextResponse } from "next/server"
import { SLIDE_IMAGE_AI_HEIGHT, SLIDE_IMAGE_AI_WIDTH } from "@/lib/slide-presentation"

export const runtime = "nodejs"

type Body = {
  prompt?: string
  width?: number
  height?: number
}

function stripDataUrlPrefix(base64: string) {
  return base64.replace(/^data:[^;]+;base64,/, "")
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function isHex64(s: string) {
  return /^[a-f0-9]{64}$/i.test(s)
}

async function fetchAsBase64(url: string) {
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`Failed to fetch image: ${res.status}`)
  }
  const arrayBuffer = await res.arrayBuffer()
  const contentType = res.headers.get("content-type") || "image/png"
  const imageBase64 = Buffer.from(arrayBuffer).toString("base64")
  return { imageBase64, contentType }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Body
    const prompt = (body.prompt || "").trim()

    const width = SLIDE_IMAGE_AI_WIDTH
    const height = SLIDE_IMAGE_AI_HEIGHT

    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 })
    }

    // 1) Replicate (recommended). Configure:
    // - REPLICATE_API_TOKEN
    // - REPLICATE_MODEL_VERSION: either "owner/name" OR "owner/name:version" OR a 64-char version id
    const replicateToken = process.env.REPLICATE_API_TOKEN
    const replicateModelVersion = process.env.REPLICATE_MODEL_VERSION
    if (replicateToken && replicateModelVersion) {
      let versionId = ""

      if (isHex64(replicateModelVersion)) {
        versionId = replicateModelVersion
      } else if (replicateModelVersion.includes(":")) {
        // Some configs use owner/name:version
        const maybeVersion = replicateModelVersion.split(":").pop() || ""
        if (isHex64(maybeVersion)) {
          versionId = maybeVersion
        }
      }

      if (!versionId) {
        // Resolve latest version id from owner/name
        const [owner, name] = replicateModelVersion.split(":")[0].split("/")
        if (!owner || !name) {
          return NextResponse.json(
            {
              error:
                'Invalid REPLICATE_MODEL_VERSION. Use "owner/name" or a 64-char version id.',
            },
            { status: 500 }
          )
        }

        const modelRes = await fetch(`https://api.replicate.com/v1/models/${owner}/${name}`, {
          headers: {
            Authorization: `Token ${replicateToken}`,
          },
        })
        const modelData = await modelRes.json().catch(() => null)
        if (!modelRes.ok) {
          return NextResponse.json(
            { error: modelData?.detail || "Failed to resolve Replicate model version" },
            { status: modelRes.status }
          )
        }

        versionId = modelData?.latest_version?.id
        if (!versionId) {
          return NextResponse.json({ error: "Replicate model has no latest version" }, { status: 500 })
        }
      }

      // Create prediction
      const createRes = await fetch("https://api.replicate.com/v1/predictions", {
        method: "POST",
        headers: {
          Authorization: `Token ${replicateToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          version: versionId,
          input: {
            prompt,
            width,
            height,
          },
        }),
      })

      const created = await createRes.json().catch(() => null)
      if (!createRes.ok) {
        return NextResponse.json(
          { error: created?.detail || created?.error || "Replicate prediction create failed" },
          { status: createRes.status }
        )
      }

      const predictionId = created?.id
      if (!predictionId) {
        return NextResponse.json({ error: "Replicate returned no prediction id" }, { status: 500 })
      }

      // Poll
      const maxWaitMs = 90_000
      const startedAt = Date.now()
      let last = created

      while (Date.now() - startedAt < maxWaitMs) {
        const status = last?.status
        if (status === "succeeded") break
        if (status === "failed" || status === "canceled") {
          return NextResponse.json(
            { error: last?.error || "Replicate prediction failed" },
            { status: 500 }
          )
        }
        await sleep(1500)

        const pollRes = await fetch(`https://api.replicate.com/v1/predictions/${predictionId}`, {
          headers: { Authorization: `Token ${replicateToken}` },
        })
        last = await pollRes.json().catch(() => null)
        if (!pollRes.ok) {
          return NextResponse.json(
            { error: last?.detail || "Failed to poll Replicate prediction" },
            { status: pollRes.status }
          )
        }
      }

      if (last?.status !== "succeeded") {
        return NextResponse.json({ error: "Timed out waiting for image generation" }, { status: 504 })
      }

      // Replicate output is commonly a URL string or an array of URLs.
      const out = last?.output
      const firstUrl =
        typeof out === "string" ? out : Array.isArray(out) ? out[0] : out?.[0] || out?.url

      if (typeof firstUrl === "string" && firstUrl.startsWith("http")) {
        const { imageBase64, contentType } = await fetchAsBase64(firstUrl)
        return NextResponse.json({ imageBase64, contentType })
      }

      // Some models return base64 directly
      const imageBase64 = stripDataUrlPrefix(typeof out === "string" ? out : out?.imageBase64 || "")
      if (imageBase64) {
        return NextResponse.json({ imageBase64, contentType: "image/png" })
      }

      return NextResponse.json({ error: "Replicate returned no usable image output" }, { status: 500 })
    }

    // 2) Custom "nano banana" provider (optional). Expectation: it returns JSON with { imageBase64, contentType? }.
    const nanoBananaUrl = process.env.NANO_BANANA_API_URL
    const nanoBananaKey = process.env.NANO_BANANA_API_KEY
    if (nanoBananaUrl) {
      const res = await fetch(nanoBananaUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(nanoBananaKey ? { Authorization: `Bearer ${nanoBananaKey}` } : {}),
        },
        body: JSON.stringify({
          prompt,
          width,
          height,
        }),
      })

      const data = await res.json().catch(() => null)
      if (!res.ok) {
        return NextResponse.json(
          { error: data?.error || "Image generation failed" },
          { status: res.status }
        )
      }

      const imageBase64 = stripDataUrlPrefix(data?.imageBase64 || "")
      const contentType = data?.contentType || "image/png"
      if (!imageBase64) {
        return NextResponse.json({ error: "Provider returned no image" }, { status: 500 })
      }

      return NextResponse.json({ imageBase64, contentType })
    }

    // 3) Fallback: HuggingFace Inference API (requires HUGGINGFACE_API_KEY).
    const hfKey = process.env.HUGGINGFACE_API_KEY
    if (!hfKey) {
      return NextResponse.json(
        {
          error:
            "No image provider configured. Set REPLICATE_API_TOKEN + REPLICATE_MODEL_VERSION, or NANO_BANANA_API_URL, or HUGGINGFACE_API_KEY.",
        },
        { status: 500 }
      )
    }

    const model = process.env.HUGGINGFACE_IMAGE_MODEL || "stabilityai/stable-diffusion-xl-base-1.0"
    const hfRes = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${hfKey}`,
        "Content-Type": "application/json",
        Accept: "image/png",
      },
      body: JSON.stringify({
        inputs: prompt,
      }),
    })

    if (!hfRes.ok) {
      const text = await hfRes.text().catch(() => "")
      return NextResponse.json(
        { error: text || "HuggingFace image generation failed" },
        { status: hfRes.status }
      )
    }

    const { imageBase64, contentType } = await (async () => {
      const arrayBuffer = await hfRes.arrayBuffer()
      return {
        imageBase64: Buffer.from(arrayBuffer).toString("base64"),
        contentType: hfRes.headers.get("content-type") || "image/png",
      }
    })()

    return NextResponse.json({ imageBase64, contentType })
  } catch (error) {
    console.error("Error generating slide image:", error)
    return NextResponse.json({ error: "Failed to generate slide image" }, { status: 500 })
  }
}

