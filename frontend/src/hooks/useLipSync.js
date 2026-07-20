import { useState, useEffect, useRef } from 'react'

/**
 * Converts raw mouthOpen (0-1) + viseme phoneme into a smooth
 * mouth shape index + a continuous open amount for parametric rendering.
 *
 * Shape indices:
 *   0 = closed
 *   1 = slight  (b/m/p – barely parted)
 *   2 = medium  (a/h   – natural open)
 *   3 = wide    (ah    – fully open, teeth visible)
 *   4 = smile   (e/i/ee – wide, flat)
 */
export function useLipSync(mouthOpen = 0, viseme = 2) {
  const [shape, setShape]           = useState(0)
  const [openAmount, setOpenAmount] = useState(0)
  const smoothRef = useRef(0)
  const rafRef    = useRef(null)

  // Smooth the raw amplitude with exponential decay
  useEffect(() => {
    const target = Math.min(1, Math.max(0, mouthOpen))

    const tick = () => {
      const diff = target - smoothRef.current
      smoothRef.current += diff * 0.22          // smoothing factor
      setOpenAmount(smoothRef.current)
      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [mouthOpen])

  // Map smoothed amplitude + viseme → discrete shape
  useEffect(() => {
    const amp = openAmount
    if (amp < 0.03) {
      setShape(0)
    } else if (viseme === 1) {
      setShape(4)                 // e/i/ee → smile
    } else if (viseme === 0) {
      setShape(1)                 // b/m/p  → barely open
    } else if (amp < 0.20) {
      setShape(1)
    } else if (amp < 0.44) {
      setShape(2)
    } else {
      setShape(3)
    }
  }, [openAmount, viseme])

  return { shape, openAmount }
}
