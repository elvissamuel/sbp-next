"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Slider } from "@/components/ui/slider"
import { Label } from "@/components/ui/label"
import {
  Play,
  Pause,
  Square,
  Volume2,
  Gauge,
  Settings,
  VolumeX,
} from "lucide-react"
import { useTextToSpeech } from "@/hooks/use-text-to-speech"
import { cn } from "@/lib/utils"

interface TextToSpeechProps {
  text: string
  className?: string
  compact?: boolean
}

export function TextToSpeech({ text, className, compact = false }: TextToSpeechProps) {
  const {
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
    setVoice,
    setRate,
    setVolume,
    setPitch,
  } = useTextToSpeech()

  const [showSettings, setShowSettings] = useState(false)

  if (!isSupported) {
    return (
      <div className={cn("text-sm text-muted-foreground", className)}>
        Text-to-speech is not supported in your browser.
      </div>
    )
  }

  const handlePlayPause = () => {
    if (isPlaying && !isPaused) {
      pause()
    } else if (isPaused) {
      resume()
    } else {
      play(text)
    }
  }

  if (compact) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <Button
          size="sm"
          variant="outline"
          onClick={handlePlayPause}
          disabled={!text}
          className="border-[#65B32E]/30 text-[#65B32E] hover:bg-[#65B32E]/10"
          aria-label={isPlaying && !isPaused ? "Pause" : "Play"}
        >
          {isPlaying && !isPaused ? (
            <Pause size={16} className="mr-1" />
          ) : (
            <Play size={16} className="mr-1" />
          )}
          {isPlaying && !isPaused ? "Pause" : "Play"}
        </Button>
        {isPlaying && (
          <Button
            size="sm"
            variant="outline"
            onClick={stop}
            className="border-[#DE1915]/30 text-[#DE1915] hover:bg-[#DE1915]/10"
            aria-label="Stop"
          >
            <Square size={16} />
          </Button>
        )}
        <DropdownMenu open={showSettings} onOpenChange={setShowSettings}>
          <DropdownMenuTrigger asChild>
            <Button
              size="sm"
              variant="outline"
              className="border-[#65B32E]/30 text-[#65B32E] hover:bg-[#65B32E]/10"
            >
              <Settings size={16} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64 bg-white border-[#65B32E]/20">
            <DropdownMenuLabel className="text-[#65B32E]">Voice Settings</DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-[#65B32E]/20" />
            
            <div className="px-2 py-2 space-y-4">
              {/* Voice Selection */}
              <div className="space-y-2">
                <Label className="text-xs text-[#65B32E]">Voice</Label>
                <select
                  value={selectedVoice?.name || ""}
                  onChange={(e) => {
                    const voice = voices.find((v) => v.name === e.target.value)
                    setVoice(voice || null)
                  }}
                  className="w-full text-xs border border-[#65B32E]/30 rounded-md px-2 py-1 bg-white focus:border-[#65B32E] focus:outline-none"
                >
                  {voices.map((voice) => (
                    <option key={voice.name} value={voice.name}>
                      {voice.name} {voice.lang}
                    </option>
                  ))}
                </select>
              </div>

              {/* Speed */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-[#65B32E]">Speed</Label>
                  <span className="text-xs text-muted-foreground">{rate.toFixed(1)}x</span>
                </div>
                <Slider
                  value={[rate]}
                  onValueChange={([value]) => setRate(value)}
                  min={0.5}
                  max={2}
                  step={0.1}
                  className="w-full"
                />
              </div>

              {/* Volume */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-[#65B32E]">Volume</Label>
                  <span className="text-xs text-muted-foreground">{Math.round(volume * 100)}%</span>
                </div>
                <Slider
                  value={[volume]}
                  onValueChange={([value]) => setVolume(value)}
                  min={0}
                  max={1}
                  step={0.1}
                  className="w-full"
                />
              </div>

              {/* Pitch */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-[#65B32E]">Pitch</Label>
                  <span className="text-xs text-muted-foreground">{pitch.toFixed(1)}</span>
                </div>
                <Slider
                  value={[pitch]}
                  onValueChange={([value]) => setPitch(value)}
                  min={0.5}
                  max={2}
                  step={0.1}
                  className="w-full"
                />
              </div>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    )
  }

  return (
    <div className={cn("flex flex-col gap-4 p-4 bg-white border border-[#65B32E]/20 rounded-lg", className)}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[#65B32E]">Text to Speech</h3>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={handlePlayPause}
            disabled={!text}
            className="bg-[#65B32E] hover:bg-[#65B32E]/90 text-white"
            aria-label={isPlaying && !isPaused ? "Pause" : "Play"}
          >
            {isPlaying && !isPaused ? (
              <>
                <Pause size={16} className="mr-2" />
                Pause
              </>
            ) : (
              <>
                <Play size={16} className="mr-2" />
                Play
              </>
            )}
          </Button>
          {isPlaying && (
            <Button
              size="sm"
              onClick={stop}
              variant="outline"
              className="border-[#DE1915]/30 text-[#DE1915] hover:bg-[#DE1915]/10"
              aria-label="Stop"
            >
              <Square size={16} className="mr-2" />
              Stop
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-4">
        {/* Voice Selection */}
        <div className="space-y-2">
          <Label className="text-sm text-[#65B32E]">Voice</Label>
          <select
            value={selectedVoice?.name || ""}
            onChange={(e) => {
              const voice = voices.find((v) => v.name === e.target.value)
              setVoice(voice || null)
            }}
            className="w-full text-sm border border-[#65B32E]/30 rounded-md px-3 py-2 bg-white focus:border-[#65B32E] focus:outline-none"
          >
            {voices.map((voice) => (
              <option key={voice.name} value={voice.name}>
                {voice.name} {voice.lang}
              </option>
            ))}
          </select>
        </div>

        {/* Speed */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm text-[#65B32E] flex items-center gap-2">
              <Gauge size={14} />
              Speed
            </Label>
            <span className="text-sm text-muted-foreground">{rate.toFixed(1)}x</span>
          </div>
          <Slider
            value={[rate]}
            onValueChange={([value]) => setRate(value)}
            min={0.5}
            max={2}
            step={0.1}
            className="w-full"
          />
        </div>

        {/* Volume */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm text-[#65B32E] flex items-center gap-2">
              {volume > 0 ? <Volume2 size={14} /> : <VolumeX size={14} />}
              Volume
            </Label>
            <span className="text-sm text-muted-foreground">{Math.round(volume * 100)}%</span>
          </div>
          <Slider
            value={[volume]}
            onValueChange={([value]) => setVolume(value)}
            min={0}
            max={1}
            step={0.1}
            className="w-full"
          />
        </div>

        {/* Pitch */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm text-[#65B32E]">Pitch</Label>
            <span className="text-sm text-muted-foreground">{pitch.toFixed(1)}</span>
          </div>
          <Slider
            value={[pitch]}
            onValueChange={([value]) => setPitch(value)}
            min={0.5}
            max={2}
            step={0.1}
            className="w-full"
          />
        </div>
      </div>
    </div>
  )
}

