import { useState, useEffect, useRef } from 'react'

// Attach to an <audio> element ref; returns live RMS amplitude 0-1
export function useAudioAmplitude(audioRef) {
  const [amplitude, setAmplitude] = useState(0)
  const ctxRef     = useRef(null)
  const analyserRef = useRef(null)
  const rafRef     = useRef(null)

  useEffect(() => {
    const el = audioRef?.current
    if (!el) return

    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const src = ctx.createMediaElementSource(el)
    const analyser = ctx.createAnalyser()
    analyser.fftSize = 256
    src.connect(analyser)
    analyser.connect(ctx.destination)
    ctxRef.current = ctx
    analyserRef.current = analyser

    const buf = new Uint8Array(analyser.frequencyBinCount)
    const measure = () => {
      analyser.getByteTimeDomainData(buf)
      let sum = 0
      for (let i = 0; i < buf.length; i++) {
        const v = (buf[i] - 128) / 128
        sum += v * v
      }
      setAmplitude(Math.sqrt(sum / buf.length))
      rafRef.current = requestAnimationFrame(measure)
    }
    rafRef.current = requestAnimationFrame(measure)

    return () => {
      cancelAnimationFrame(rafRef.current)
      ctxRef.current?.close()
    }
  }, [audioRef])

  return amplitude
}
