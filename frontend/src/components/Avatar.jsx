/**
 * Avatar.jsx
 * Complete SVG avatar for Amelia AI — friendly, human-like, flat illustration style.
 *
 * Exports:
 *   AnimatedFace  — main avatar component (used by App.jsx)
 *
 * Props:
 *   mouthOpen   0-1     live amplitude from audio
 *   viseme      0-4     phoneme group
 *   status      string  idle | listening | thinking | speaking
 *   portrait    bool    crop to portrait (top portion) when true
 */
import { EyeBlink }  from './EyeBlink'
import { Nose }      from './Nose'
import { LipSync }   from './LipSync'

// ─── Status glow colour ────────────────────────────────────────────────────
function statusColor(status) {
  switch (status) {
    case 'listening': return '#ef4444'
    case 'thinking':  return '#f59e0b'
    case 'speaking':  return '#a855f7'
    default:          return '#6040c0'
  }
}

// ─── SVG gradient / filter defs ────────────────────────────────────────────
function Defs() {
  return (
    <defs>
      {/* Backgrounds */}
      <radialGradient id="bgG" cx="50%" cy="30%" r="70%">
        <stop offset="0%"   stopColor="#12102a" />
        <stop offset="60%"  stopColor="#07060e" />
        <stop offset="100%" stopColor="#020208" />
      </radialGradient>

      {/* Skin */}
      <radialGradient id="skinG" cx="38%" cy="18%" r="74%">
        <stop offset="0%"   stopColor="#fde8d0" />
        <stop offset="35%"  stopColor="#f8cfa0" />
        <stop offset="70%"  stopColor="#eeaa72" />
        <stop offset="100%" stopColor="#d8904c" />
      </radialGradient>
      <radialGradient id="neckG" cx="40%" cy="10%" r="65%">
        <stop offset="0%"   stopColor="#f5d0a0" />
        <stop offset="100%" stopColor="#d89060" />
      </radialGradient>

      {/* Hair */}
      <radialGradient id="hairG" cx="44%" cy="5%" r="68%">
        <stop offset="0%"   stopColor="#4a2a12" />
        <stop offset="42%"  stopColor="#1e0e04" />
        <stop offset="100%" stopColor="#080402" />
      </radialGradient>
      <linearGradient id="hairShineG" x1="20%" y1="0%" x2="80%" y2="100%">
        <stop offset="0%"   stopColor="rgba(255,210,140,0.18)" />
        <stop offset="100%" stopColor="rgba(255,210,140,0)" />
      </linearGradient>

      {/* Iris */}
      <radialGradient id="irisG" cx="28%" cy="22%" r="72%">
        <stop offset="0%"   stopColor="#b8dff8" />
        <stop offset="28%"  stopColor="#5aaad8" />
        <stop offset="60%"  stopColor="#2268a8" />
        <stop offset="100%" stopColor="#0a1e3a" />
      </radialGradient>

      {/* Suit */}
      <linearGradient id="suitG" x1="0%" y1="0%" x2="10%" y2="100%">
        <stop offset="0%"   stopColor="#1a1840" />
        <stop offset="100%" stopColor="#060610" />
      </linearGradient>

      {/* Lips */}
      <linearGradient id="ulipG" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%"   stopColor="#c07880" />
        <stop offset="50%"  stopColor="#aa6268" />
        <stop offset="100%" stopColor="#985060" />
      </linearGradient>
      <linearGradient id="llipG" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%"   stopColor="#d08888" />
        <stop offset="50%"  stopColor="#bc7272" />
        <stop offset="100%" stopColor="#a06062" />
      </linearGradient>

      {/* Filters */}
      <filter id="bl2"><feGaussianBlur stdDeviation="2" /></filter>
      <filter id="bl5"><feGaussianBlur stdDeviation="5" /></filter>
      <filter id="bl8"><feGaussianBlur stdDeviation="8" /></filter>
    </defs>
  )
}

// ─── Background scene ───────────────────────────────────────────────────────
function Background() {
  return (
    <>
      <rect width="300" height="380" fill="url(#bgG)" />
      <ellipse cx="150" cy="200" rx="130" ry="155"
        fill="#201050" opacity="0.30" filter="url(#bl8)" />
    </>
  )
}

// ─── Clothing / body ────────────────────────────────────────────────────────
function Body() {
  return (
    <g id="body">
      {/* Suit body */}
      <path d="M -30 380 Q 48 308 118 272 Q 136 262 150 260 Q 164 262 182 272 Q 252 308 330 380 Z"
        fill="url(#suitG)" />
      {/* Shoulder highlights */}
      <path d="M -30 380 Q 48 308 118 272 L 130 280 Q 58 315 -10 380 Z"
        fill="rgba(90,80,200,0.07)" />
      <path d="M 330 380 Q 252 308 182 272 L 170 280 Q 242 315 310 380 Z"
        fill="rgba(90,80,200,0.07)" />
      {/* Collar */}
      <path d="M 128 260 L 144 310 L 150 322 L 156 310 L 172 260"
        fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="1" />
      {/* Shirt */}
      <ellipse cx="150" cy="278" rx="15" ry="10" fill="#e8eeff" opacity="0.88" />
      {/* Tie / pendant */}
      <path d="M 146 260 L 148 295 L 150 305 L 152 295 L 154 260 Q 152 264 150 263 Q 148 264 146 260 Z"
        fill="#7c3aed" opacity="0.88" />
      <circle cx="150" cy="264" r="3.5" fill="#a78bfa" opacity="0.9" />
    </g>
  )
}

// ─── Neck ───────────────────────────────────────────────────────────────────
function Neck() {
  return (
    <g id="neck">
      <path d="M 132 228 Q 130 246 129 260 L 171 260 Q 170 246 168 228 Z"
        fill="url(#neckG)" />
      {/* Side shadows */}
      <ellipse cx="132" cy="244" rx="7"  ry="30" fill="#b07040" opacity="0.16" />
      <ellipse cx="168" cy="244" rx="7"  ry="30" fill="#b07040" opacity="0.16" />
      {/* Collarbone */}
      <path d="M 122 258 Q 150 250 178 258"
        fill="none" stroke="rgba(155,95,45,0.18)" strokeWidth="1.5" />
    </g>
  )
}

// ─── Ears ───────────────────────────────────────────────────────────────────
function Ears() {
  return (
    <g id="ears">
      <ellipse cx="64"  cy="190" rx="8"  ry="13" fill="#f0be80" />
      <ellipse cx="64"  cy="190" rx="4.5" ry="8"  fill="#d8a060" opacity="0.5" />
      <ellipse cx="236" cy="190" rx="8"  ry="13" fill="#f0be80" />
      <ellipse cx="236" cy="190" rx="4.5" ry="8"  fill="#d8a060" opacity="0.5" />
      {/* Ear studs */}
      <circle cx="64"  cy="200" r="2.5" fill="#a78bfa" opacity="0.9" />
      <circle cx="236" cy="200" r="2.5" fill="#a78bfa" opacity="0.9" />
    </g>
  )
}

// ─── Face base ──────────────────────────────────────────────────────────────
function FaceBase() {
  return (
    <g id="face-base">
      {/* Soft drop shadow */}
      <ellipse cx="150" cy="205" rx="88" ry="110"
        fill="rgba(0,0,0,0.28)" filter="url(#bl5)" />
      {/* Main face oval */}
      <ellipse cx="150" cy="190" rx="86" ry="106" fill="url(#skinG)" />

      {/* Forehead highlight */}
      <ellipse cx="144" cy="120" rx="50" ry="28"
        fill="rgba(255,255,255,0.12)" filter="url(#bl2)" />
      {/* Cheek blush L */}
      <ellipse cx="100" cy="210" rx="24" ry="16"
        fill="rgba(255,140,100,0.12)" filter="url(#bl5)" />
      {/* Cheek blush R */}
      <ellipse cx="200" cy="210" rx="24" ry="16"
        fill="rgba(255,140,100,0.12)" filter="url(#bl5)" />
      {/* Temple shadows */}
      <ellipse cx="70"  cy="188" rx="14" ry="60" fill="#a07040" opacity="0.10" />
      <ellipse cx="230" cy="188" rx="14" ry="60" fill="#a07040" opacity="0.10" />
      {/* Jaw / chin shadow */}
      <ellipse cx="150" cy="292" rx="52" ry="8"
        fill="#a06030" opacity="0.11" />
    </g>
  )
}

// ─── Hair ───────────────────────────────────────────────────────────────────
function Hair() {
  return (
    <g id="hair">
      {/* Back layer (behind face) */}
      <ellipse cx="150" cy="145" rx="95" ry="88" fill="url(#hairG)" />
      {/* Side strands */}
      <ellipse cx="60"  cy="196" rx="18" ry="52" fill="#140802" opacity="0.9" />
      <ellipse cx="240" cy="196" rx="18" ry="52" fill="#140802" opacity="0.9" />

      {/* Front hair cap (over forehead) */}
      <path d={`
        M 65  192
        C 62  150 70 108  86 84
        C 102  60 128  46 150  44
        C 172  46 198  60 214  84
        C 230 108 238 150 235 192
        C 238 160 244 100 230  66
        C 212  24 184   8 150   8
        C 116   8  88  24  70  66
        C 56 100  62 160  65 192 Z
      `} fill="url(#hairG)" />

      {/* Top shine */}
      <path d="M 120 20 Q 150  8 180 18"
        fill="none" stroke="rgba(255,175,70,0.22)"
        strokeWidth="9" strokeLinecap="round" />

      {/* Shine overlay (left side) */}
      <path d={`
        M 65 192 C 62 150 70 108 86 84
        C 102 60 128 46 150 44
        L 150 8 C 116 8 88 24 70 66
        C 56 100 62 160 65 192 Z
      `} fill="url(#hairShineG)" />

      {/* Headband */}
      <path d="M 65 174 Q 72 140  92 114 Q 118 82 150 78 Q 182 82 208 114 Q 228 140 235 174"
        fill="none" stroke="#1e1e4a" strokeWidth="20" strokeLinecap="round" />
      <path d="M 66 173 Q 73 140  93 115 Q 119 83 150 79 Q 181 83 207 115 Q 227 140 234 173"
        fill="none" stroke="#2a2a6a" strokeWidth="9" strokeLinecap="round" opacity="0.7" />
      {/* Headband highlight */}
      <path d="M 68 171 Q 76 138  96 113 Q 122 80 150 76 Q 178 80 204 113 Q 224 138 232 171"
        fill="none" stroke="rgba(120,120,220,0.28)"
        strokeWidth="2.5" strokeLinecap="round" />
    </g>
  )
}

// ─── Main export ────────────────────────────────────────────────────────────
export function AnimatedFace({
  mouthOpen = 0,
  viseme    = 2,
  status    = 'idle',
  portrait  = false,
}) {
  const sc = statusColor(status)

  return (
    <svg
      viewBox={portrait ? '30 60 240 290' : '0 0 300 380'}
      style={{
        width: '100%', height: '100%',
        display: 'block',
        background: portrait ? 'transparent' : '#04030b',
      }}
      preserveAspectRatio="xMidYMid meet"
    >
      <Defs />

      {!portrait && <Background />}

      {/* ── Body, neck, ears (behind face) ── */}
      <Body />
      <Neck />
      <Ears />

      {/* ── Hair back layer ── */}
      <Hair />

      {/* ── Face base + shading ── */}
      <FaceBase />

      {/* ── Nose ── */}
      <Nose cx={150} cy={212} />

      {/* ── Eyes (with blinking via EyeBlink) ── */}
      <EyeBlink irisColor="url(#irisG)" />

      {/* ── Mouth (animated via LipSync) ── */}
      <LipSync mouthOpen={mouthOpen} viseme={viseme} />

      {/* ── Status glow ring ── */}
      {status !== 'idle' && (
        <>
          <ellipse cx="150" cy="192" rx="102" ry="126"
            fill="none" stroke={sc} strokeWidth="2.5"
            opacity="0.32" filter="url(#bl2)" />
          <ellipse cx="150" cy="192" rx="116" ry="142"
            fill="none" stroke={sc} strokeWidth="1"
            opacity="0.14" />
        </>
      )}
    </svg>
  )
}

// ─── Canvas-based overlays kept for backwards compatibility ─────────────────
// (MouthOverlay / EyeOverlay used by older code; kept but not used by AnimatedFace)
import { useEffect as uE, useRef as uR } from 'react'

function drawBlink(ctx, blink, W, H) {
  ctx.clearRect(0, 0, W, H)
  if (blink < 0.015) return
  const lx = W * 0.27, rx = W * 0.73
  const ey = H * 0.50, erx = W * 0.138, ery = H * 0.46
  ;[lx, rx].forEach(ex => {
    const top  = ey - ery
    const lidY = top + ery * 2 * blink
    ctx.save()
    ctx.beginPath()
    ctx.ellipse(ex, ey, erx, ery, 0, 0, Math.PI * 2)
    ctx.clip()
    const g = ctx.createLinearGradient(ex, top, ex, ey + ery)
    g.addColorStop(0,    '#EDBE96')
    g.addColorStop(0.65, '#E4AE82')
    g.addColorStop(1,    '#D89E72')
    ctx.fillStyle = g
    ctx.fillRect(ex - erx - 1, top - 1, erx * 2 + 2, lidY - top + 2)
    ctx.restore()
    if (blink > 0.08) {
      ctx.beginPath()
      ctx.moveTo(ex - erx * 0.82, lidY)
      ctx.quadraticCurveTo(ex, lidY - 4, ex + erx * 0.82, lidY)
      ctx.strokeStyle = `rgba(18,8,4,${Math.min(1, blink * 4)})`
      ctx.lineWidth = 2.8; ctx.lineCap = 'round'; ctx.stroke()
    }
  })
}

export function EyeOverlay() {
  const canvasRef = uR(null)
  const blinkRef  = uR(0)
  const rafRef    = uR(null)
  const W = 220, H = 62

  uE(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let phase = 'open', phaseMs = 0, nextBlinkMs = 2000, last = performance.now()
    const tick = (now) => {
      const dt = Math.min(now - last, 50); last = now
      phaseMs += dt; nextBlinkMs -= dt
      let target = 0
      if (phase === 'open') {
        if (nextBlinkMs <= 0) { phase = 'closing'; phaseMs = 0; nextBlinkMs = 3000 + Math.random() * 3000 }
      } else if (phase === 'closing') {
        target = Math.min(1, phaseMs / 80)
        if (target >= 1) { phase = 'closed'; phaseMs = 0 }
      } else if (phase === 'closed') {
        target = 1
        if (phaseMs > 55) { phase = 'opening'; phaseMs = 0 }
      } else {
        target = Math.max(0, 1 - phaseMs / 110)
        if (target <= 0) { phase = 'open'; phaseMs = 0 }
      }
      blinkRef.current += (target - blinkRef.current) * 0.45
      drawBlink(ctx, blinkRef.current, W, H)
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [])

  return (
    <canvas ref={canvasRef} width={W} height={H}
      style={{ position: 'absolute', left: '50%', top: '36%',
               transform: 'translate(-50%, -50%)', pointerEvents: 'none' }}
    />
  )
}

export function MouthOverlay({ mouthOpen = 0, viseme = 2 }) {
  const canvasRef = uR(null)
  const smoothRef = uR(0)
  const targetRef = uR(0)
  const visemeRef = uR(viseme)
  const rafRef    = uR(null)
  const W = 100, H = 64

  uE(() => { targetRef.current = Math.min(1, mouthOpen * 3) }, [mouthOpen])
  uE(() => { visemeRef.current = viseme }, [viseme])

  uE(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const tick = () => {
      smoothRef.current += (targetRef.current - smoothRef.current) * 0.20
      ctx.clearRect(0, 0, W, H)
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [])

  return (
    <canvas ref={canvasRef} width={W} height={H}
      style={{ position: 'absolute', left: '50%', top: '60%',
               transform: 'translate(-50%, -50%)', pointerEvents: 'none' }}
    />
  )
}
