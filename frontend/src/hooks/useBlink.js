import { useState, useEffect, useRef } from 'react'

export function useBlink({ minMs = 2500, maxMs = 5500 } = {}) {
  const [isBlinking, setIsBlinking] = useState(false)
  const timer = useRef(null)

  useEffect(() => {
    const schedule = () => {
      const wait = minMs + Math.random() * (maxMs - minMs)
      timer.current = setTimeout(() => {
        setIsBlinking(true)
        setTimeout(() => { setIsBlinking(false); schedule() }, 280)
      }, wait)
    }
    schedule()
    return () => clearTimeout(timer.current)
  }, [minMs, maxMs])

  return isBlinking
}
