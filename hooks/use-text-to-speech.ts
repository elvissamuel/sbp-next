"use client"

import { useState, useEffect, useRef, useCallback } from "react"

export interface TextToSpeechOptions {
  rate?: number // 0.1 to 10
  pitch?: number // 0 to 2
  volume?: number // 0 to 1
  voice?: SpeechSynthesisVoice | null
  lang?: string
}

export interface UseTextToSpeechReturn {
  isSupported: boolean
  isPlaying: boolean
  isPaused: boolean
  voices: SpeechSynthesisVoice[]
  selectedVoice: SpeechSynthesisVoice | null
  rate: number
  volume: number
  pitch: number
  play: (text: string) => void
  pause: () => void
  resume: () => void
  stop: () => void
  setVoice: (voice: SpeechSynthesisVoice | null) => void
  setRate: (rate: number) => void
  setVolume: (volume: number) => void
  setPitch: (pitch: number) => void
}

const STORAGE_KEY = "text-to-speech-preferences"

const defaultOptions: Required<TextToSpeechOptions> = {
  rate: 1,
  pitch: 1,
  volume: 1,
  voice: null,
  lang: "en-US",
}

// Load preferences from localStorage
const loadPreferences = (): Partial<TextToSpeechOptions> => {
  if (typeof window === "undefined") return {}
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      return {
        rate: parsed.rate ?? defaultOptions.rate,
        pitch: parsed.pitch ?? defaultOptions.pitch,
        volume: parsed.volume ?? defaultOptions.volume,
        lang: parsed.lang ?? defaultOptions.lang,
      }
    }
  } catch (error) {
    console.error("Failed to load TTS preferences:", error)
  }
  return {}
}

// Save preferences to localStorage
const savePreferences = (options: Partial<TextToSpeechOptions>) => {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(options))
  } catch (error) {
    console.error("Failed to save TTS preferences:", error)
  }
}

export function useTextToSpeech(): UseTextToSpeechReturn {
  const [isSupported, setIsSupported] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null)
  const [rate, setRate] = useState(defaultOptions.rate)
  const [volume, setVolume] = useState(defaultOptions.volume)
  const [pitch, setPitch] = useState(defaultOptions.pitch)

  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)
  const synthRef = useRef<SpeechSynthesis | null>(null)

  // Initialize and check support
  useEffect(() => {
    if (typeof window === "undefined") return

    const synth = window.speechSynthesis
    synthRef.current = synth

    if ("speechSynthesis" in window) {
      setIsSupported(true)

      // Load preferences
      const prefs = loadPreferences()
      if (prefs.rate) setRate(prefs.rate)
      if (prefs.pitch) setPitch(prefs.pitch)
      if (prefs.volume) setVolume(prefs.volume)

      // Load voices (may need to wait for voiceschanged event)
      const loadVoices = () => {
        const availableVoices = synth.getVoices()
        setVoices(availableVoices)

        // Try to restore selected voice from preferences
        if (prefs.voice && availableVoices.length > 0) {
          const storedVoice = availableVoices.find(
            (v) => v.name === prefs.voice || v.voiceURI === prefs.voice
          )
          if (storedVoice) {
            setSelectedVoice(storedVoice)
          } else {
            // Fallback to default voice
            const defaultVoice = availableVoices.find((v) => v.default) || availableVoices[0]
            setSelectedVoice(defaultVoice)
          }
        } else if (availableVoices.length > 0) {
          const defaultVoice = availableVoices.find((v) => v.default) || availableVoices[0]
          setSelectedVoice(defaultVoice)
        }
      }

      loadVoices()
      synth.addEventListener("voiceschanged", loadVoices)

      return () => {
        synth.removeEventListener("voiceschanged", loadVoices)
        // Cleanup: stop any ongoing speech
        synth.cancel()
      }
    }
  }, [])

  // Handle visibility change (pause when tab is hidden)
  useEffect(() => {
    if (!isSupported) return

    const handleVisibilityChange = () => {
      if (document.hidden && isPlaying && !isPaused) {
        pause()
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange)
    }
  }, [isSupported, isPlaying, isPaused])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (synthRef.current) {
        synthRef.current.cancel()
      }
    }
  }, [])

  // Process text: clean markdown and extract readable content
  const processText = useCallback((text: string): string => {
    if (!text) return ""

    // Remove markdown headers but keep text
    let processed = text
      .replace(/^#+\s+/gm, "") // Remove # headers
      .replace(/\*\*(.*?)\*\*/g, "$1") // Remove bold
      .replace(/\*(.*?)\*/g, "$1") // Remove italic
      .replace(/`([^`]+)`/g, "$1") // Remove inline code
      .replace(/```[\s\S]*?```/g, "[Code block]") // Replace code blocks
      .replace(/\[([^\]]+)\]\([^\)]+\)/g, "$1") // Remove markdown links but keep text
      .replace(/^\s*[-*+]\s+/gm, "") // Remove list markers
      .replace(/\n{3,}/g, "\n\n") // Normalize multiple newlines
      .trim()

    return processed
  }, [])

  const play = useCallback(
    (text: string) => {
      if (!isSupported || !synthRef.current) {
        console.warn("Text-to-speech is not supported")
        return
      }

      // Stop any ongoing speech
      synthRef.current.cancel()

      const processedText = processText(text)
      if (!processedText) {
        console.warn("No text to speak")
        return
      }

      const utterance = new SpeechSynthesisUtterance(processedText)
      utteranceRef.current = utterance

      // Set options
      utterance.rate = rate
      utterance.pitch = pitch
      utterance.volume = volume
      if (selectedVoice) {
        utterance.voice = selectedVoice
      }

      // Event handlers
      utterance.onstart = () => {
        setIsPlaying(true)
        setIsPaused(false)
      }

      utterance.onend = () => {
        setIsPlaying(false)
        setIsPaused(false)
        utteranceRef.current = null
      }

      utterance.onerror = (event) => {
        console.error("Speech synthesis error:", event.error)
        setIsPlaying(false)
        setIsPaused(false)
        utteranceRef.current = null
      }

      utterance.onpause = () => {
        setIsPaused(true)
      }

      utterance.onresume = () => {
        setIsPaused(false)
      }

      synthRef.current.speak(utterance)
    },
    [isSupported, rate, pitch, volume, selectedVoice, processText]
  )

  const pause = useCallback(() => {
    if (synthRef.current && isPlaying) {
      synthRef.current.pause()
      setIsPaused(true)
    }
  }, [isPlaying])

  const resume = useCallback(() => {
    if (synthRef.current && isPaused) {
      synthRef.current.resume()
      setIsPaused(false)
    }
  }, [isPaused])

  const stop = useCallback(() => {
    if (synthRef.current) {
      synthRef.current.cancel()
      setIsPlaying(false)
      setIsPaused(false)
      utteranceRef.current = null
    }
  }, [])

  const handleSetVoice = useCallback((voice: SpeechSynthesisVoice | null) => {
    setSelectedVoice(voice)
    savePreferences({ voice: voice?.name || voice?.voiceURI || null })
  }, [])

  const handleSetRate = useCallback((newRate: number) => {
    setRate(newRate)
    savePreferences({ rate: newRate })
  }, [])

  const handleSetVolume = useCallback((newVolume: number) => {
    setVolume(newVolume)
    savePreferences({ volume: newVolume })
  }, [])

  const handleSetPitch = useCallback((newPitch: number) => {
    setPitch(newPitch)
    savePreferences({ pitch: newPitch })
  }, [])

  return {
    isSupported,
    isPlaying,
    isPaused,
    voices,
    selectedVoice,
    rate,
    volume,
    pitch,
    play,
    pause,
    resume,
    stop,
    setVoice: handleSetVoice,
    setRate: handleSetRate,
    setVolume: handleSetVolume,
    setPitch: handleSetPitch,
  }
}

