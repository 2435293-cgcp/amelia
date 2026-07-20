import { createContext, useContext, useRef, useState, useCallback } from 'react'

const SpeechCtx = createContext(null)

// Provides { mouthOpen, isPlaying, play, stop } to children via context
export function SpeechController({ children }) {
  const [mouthOpen,  setMouthOpen]  = useState(0)
  const [isPlaying,  setIsPlaying]  = useState(false)
  const ctxRef      = useRef(null)
  const analyserRef = useRef(null)
  const sourceRef   = useRef(null)
  const rafRef      = useRef(null)

  const stop = useCallback(() => {
    cancelAnimationFrame(rafRef.current)
    sourceRef.current?.stop()
    setMouthOpen(0)
    setIsPlaying(false)
  }, [])

  const play = useCallback(async (audioBuffer) => {
    stop()
    if (!ctxRef.current || ctxRef.current.state === 'closed') {
      ctxRef.current = new (window.AudioContext || window.webkitAudioContext)()
    }
    const ctx = ctxRef.current
    if (ctx.state === 'suspended') await ctx.resume()

    const analyser = ctx.createAnalyser()
    analyser.fftSize = 256
    analyserRef.current = analyser

    const src = ctx.createBufferSource()
    src.buffer = audioBuffer
    src.connect(analyser)
    analyser.connect(ctx.destination)
    sourceRef.current = src

    const data = new Uint8Array(analyser.frequencyBinCount)
    const measure = () => {
      analyser.getByteTimeDomainData(data)
      let sum = 0
      for (let i = 0; i < data.length; i++) {
        const v = (data[i] - 128) / 128
        sum += v * v
      }
      setMouthOpen(Math.sqrt(sum / data.length))
      rafRef.current = requestAnimationFrame(measure)
    }

    src.onended = stop
    src.start()
    setIsPlaying(true)
    rafRef.current = requestAnimationFrame(measure)
  }, [stop])

  return (
    <SpeechCtx.Provider value={{ mouthOpen, isPlaying, play, stop }}>
      {children}
    </SpeechCtx.Provider>
  )
}

export const useSpeech = () => useContext(SpeechCtx)
