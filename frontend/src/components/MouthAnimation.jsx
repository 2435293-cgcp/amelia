import { useRef, useEffect } from 'react'

function draw(ctx, amp, W, H) {
  ctx.clearRect(0, 0, W, H)
  if (amp < 0.010) return

  const cx       = W / 2
  const cy       = H * 0.50
  const mw       = W  * 0.66
  const halfOpen = amp * H * 0.38
  const ulBot    = cy - halfOpen
  const llTop    = cy + halfOpen
  const ulTop    = ulBot - H * 0.33
  const llBot    = llTop + H * 0.40

  ctx.globalAlpha = Math.min(0.94, amp * 5.2)

  // ── Soft shadow beneath lips ──────────────────────────────────────────────
  const sg = ctx.createRadialGradient(cx, cy + H * 0.10, 0, cx, cy + H * 0.08, mw * 0.72)
  sg.addColorStop(0, 'rgba(0,0,0,0.22)')
  sg.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.beginPath()
  ctx.ellipse(cx, cy + H * 0.08, mw * 0.72, H * 0.12, 0, 0, Math.PI * 2)
  ctx.fillStyle = sg; ctx.fill()

  // ── Oral cavity ───────────────────────────────────────────────────────────
  if (halfOpen > 0.22) {
    const cg = ctx.createRadialGradient(cx, cy - halfOpen * 0.15, 0, cx, cy, mw * 0.78)
    cg.addColorStop(0,    'rgba(3,0,0,1)')
    cg.addColorStop(0.40, 'rgba(14,3,3,0.97)')
    cg.addColorStop(0.75, 'rgba(38,9,6,0.72)')
    cg.addColorStop(1,    'rgba(60,18,12,0.05)')
    ctx.beginPath()
    ctx.ellipse(cx, cy, mw * 0.74, Math.max(halfOpen * 0.96, 0.5), 0, 0, Math.PI * 2)
    ctx.fillStyle = cg; ctx.fill()

    // ── Teeth ─────────────────────────────────────────────────────────────
    if (halfOpen > 1.0) {
      const tH = Math.min(halfOpen * 0.60, H * 0.22)
      ctx.save()
      ctx.beginPath()
      ctx.ellipse(cx, cy, mw * 0.74, Math.max(halfOpen * 0.96, 0.5), 0, 0, Math.PI * 2)
      ctx.clip()
      // Top teeth shape
      ctx.beginPath()
      ctx.ellipse(cx, ulBot + tH * 0.32, mw * 0.54, tH * 0.74, 0, 0, Math.PI)
      const tg = ctx.createLinearGradient(cx, ulBot, cx, ulBot + tH)
      tg.addColorStop(0,    'rgba(253,250,247,0.97)')
      tg.addColorStop(0.50, 'rgba(232,226,220,0.85)')
      tg.addColorStop(1,    'rgba(198,190,183,0.40)')
      ctx.fillStyle = tg; ctx.fill()
      // Tooth dividers
      for (let t = -1; t <= 1; t++) {
        ctx.beginPath()
        ctx.moveTo(cx + t * mw * 0.18, ulBot + 1)
        ctx.lineTo(cx + t * mw * 0.18, ulBot + tH * 0.66)
        ctx.strokeStyle = 'rgba(150,140,133,0.15)'
        ctx.lineWidth = 0.7; ctx.stroke()
      }
      ctx.restore()
    }
  }

  // ── Upper lip ─────────────────────────────────────────────────────────────
  ctx.beginPath()
  ctx.moveTo(cx - mw * 0.52, ulBot + H * 0.012)
  ctx.bezierCurveTo(                                    // left arch
    cx - mw * 0.36, ulBot - H * 0.030,
    cx - mw * 0.19, ulTop + H * 0.038,
    cx - mw * 0.058, ulTop + H * 0.010,
  )
  ctx.bezierCurveTo(                                    // Cupid's bow dip
    cx - mw * 0.012, ulTop + H * 0.075,
    cx + mw * 0.012, ulTop + H * 0.075,
    cx + mw * 0.058, ulTop + H * 0.010,
  )
  ctx.bezierCurveTo(                                    // right arch
    cx + mw * 0.19, ulTop + H * 0.038,
    cx + mw * 0.36, ulBot - H * 0.030,
    cx + mw * 0.52, ulBot + H * 0.012,
  )
  ctx.bezierCurveTo(                                    // bottom close
    cx + mw * 0.27, ulBot - H * 0.052,
    cx - mw * 0.27, ulBot - H * 0.052,
    cx - mw * 0.52, ulBot + H * 0.012,
  )
  ctx.closePath()
  const ulg = ctx.createLinearGradient(cx, ulTop, cx, ulBot)
  ulg.addColorStop(0,   '#e0708a')
  ulg.addColorStop(0.5, '#cc5070')
  ulg.addColorStop(1,   '#b03c5c')
  ctx.fillStyle = ulg; ctx.fill()

  // Cupid's bow highlight
  ctx.beginPath()
  ctx.moveTo(cx - mw * 0.21, ulTop + H * 0.092)
  ctx.quadraticCurveTo(cx, ulTop + H * 0.024, cx + mw * 0.21, ulTop + H * 0.092)
  ctx.strokeStyle = 'rgba(255,220,235,0.40)'; ctx.lineWidth = 0.9
  ctx.lineCap = 'round'; ctx.stroke()

  // ── Lower lip ─────────────────────────────────────────────────────────────
  ctx.beginPath()
  ctx.moveTo(cx - mw * 0.52, llTop - H * 0.010)
  ctx.bezierCurveTo(
    cx - mw * 0.28, llTop + H * 0.030,
    cx - mw * 0.08, llBot + H * 0.018,
    cx,             llBot + H * 0.024,
  )
  ctx.bezierCurveTo(
    cx + mw * 0.08, llBot + H * 0.018,
    cx + mw * 0.28, llTop + H * 0.030,
    cx + mw * 0.52, llTop - H * 0.010,
  )
  ctx.bezierCurveTo(
    cx + mw * 0.20, llTop - H * 0.020,
    cx - mw * 0.20, llTop - H * 0.020,
    cx - mw * 0.52, llTop - H * 0.010,
  )
  ctx.closePath()
  const llg = ctx.createLinearGradient(cx, llTop, cx, llBot)
  llg.addColorStop(0,   '#f08098')
  llg.addColorStop(0.4, '#e06880')
  llg.addColorStop(1,   '#c85068')
  ctx.fillStyle = llg; ctx.fill()

  // Lower lip main shine
  ctx.beginPath()
  ctx.ellipse(cx, llTop + (llBot - llTop) * 0.36, mw * 0.26, H * 0.036, 0, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(255,220,235,0.45)'; ctx.fill()

  // Secondary shimmer
  ctx.beginPath()
  ctx.ellipse(cx - mw * 0.09, llTop + (llBot - llTop) * 0.28, mw * 0.10, H * 0.019, 0, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(255,235,245,0.30)'; ctx.fill()

  // ── Lip seam ──────────────────────────────────────────────────────────────
  ctx.beginPath()
  ctx.moveTo(cx - mw * 0.50, cy)
  ctx.quadraticCurveTo(cx, cy + Math.min(halfOpen * 0.055, 1.8), cx + mw * 0.50, cy)
  ctx.strokeStyle = halfOpen < 1.5 ? 'rgba(80,20,40,0.50)' : 'rgba(60,10,28,0.18)'
  ctx.lineWidth = 0.88; ctx.lineCap = 'round'; ctx.stroke()

  // Corner dots
  ;[cx - mw * 0.52, cx + mw * 0.52].forEach(x => {
    ctx.beginPath(); ctx.arc(x, cy, 1.25, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(80,20,40,0.42)'; ctx.fill()
  })

  ctx.globalAlpha = 1
}

export function MouthAnimation({ mouthOpen = 0, W = 84, H = 52, top = '65%', left = '50%' }) {
  const canvasRef = useRef(null)
  const smoothRef = useRef(0)
  const velRef    = useRef(0)
  const targetRef = useRef(0)

  useEffect(() => { targetRef.current = mouthOpen }, [mouthOpen])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let raf
    const tick = () => {
      velRef.current    += (targetRef.current - smoothRef.current) * 0.24
      velRef.current    *= 0.66
      smoothRef.current  = Math.max(0, smoothRef.current + velRef.current)
      draw(ctx, smoothRef.current, W, H)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [W, H])

  return (
    <canvas ref={canvasRef} width={W} height={H} style={{
      position: 'absolute', top, left,
      transform: 'translate(-50%, -50%)',
      pointerEvents: 'none', zIndex: 4,
    }}/>
  )
}
