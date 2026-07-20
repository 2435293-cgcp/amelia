import { useRef, useState, useEffect } from 'react'
import { MouthAnimation } from './MouthAnimation'

const MOUTH_W_RATIO = 0.19
const MOUTH_H_RATIO = 0.08

export function LiveAvatar({
  src = '/amelia-avatar.jpg',
  mouthOpen = 0,
}) {
  const containerRef = useRef(null)
  const [size, setSize] = useState({ w: 330, h: 460 })

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => {
      setSize({ w: entry.contentRect.width, h: entry.contentRect.height })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const mW = Math.max(40, Math.round(size.w * MOUTH_W_RATIO))
  const mH = Math.max(20, Math.round(size.h * MOUTH_H_RATIO))

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }}
    >
      <img
        src={src}
        alt="Kagzso"
        style={{
          width: '100%', height: '100%',
          objectFit: 'cover', objectPosition: 'top center',
          display: 'block',
        }}
      />

      <MouthAnimation
        mouthOpen={mouthOpen}
        top="52.5%"
        left="50%"
        W={mW}
        H={mH}
      />
    </div>
  )
}
